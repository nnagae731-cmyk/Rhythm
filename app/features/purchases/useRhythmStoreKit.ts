import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { ErrorCode, getActiveSubscriptions as getActiveSubscriptionsDirect, getAvailablePurchases as getAvailablePurchasesDirect, type Product, type ProductSubscription, type Purchase, useIAP } from 'expo-iap';
import { PremiumPlan, STORE_PRODUCT_IDS } from './storeProducts';

export type StoreProduct = {
  displayPrice: string;
  periodLabel: string;
  amount?: number;
  currency?: string;
};

export type StoreKitStatus = 'loading' | 'ready' | 'unavailable';

type PendingPurchase = {
  resolve: (success: boolean) => void;
};

function productToDisplay(product: Product | ProductSubscription | undefined, periodLabel: string): StoreProduct | undefined {
  if (!product) return undefined;
  return {
    displayPrice: product.displayPrice,
    periodLabel,
    amount: typeof product.price === 'number' ? product.price : undefined,
    currency: product.currency,
  };
}

function isSuccessfulPurchase(purchase: Purchase): boolean {
  return purchase.purchaseState === 'purchased' || purchase.purchaseState === 'restored';
}

/**
 * StoreKit/OpenIAP bridge for the existing Premium UI. The hook deliberately
 * keeps entitlement state sourced from StoreKit and only persists the
 * separate Design Customize flag after a verified purchase event.
 */
export function useRhythmStoreKit({
  onPremiumEntitlement,
  onDesignCustomizeEntitlement,
}: {
  onPremiumEntitlement: (active: boolean) => void;
  onDesignCustomizeEntitlement: (active: boolean) => void;
}) {
  const [status, setStatus] = useState<StoreKitStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [entitlementsResolved, setEntitlementsResolved] = useState(false);
  const pendingPurchaseRef = useRef<PendingPurchase | undefined>(undefined);

  const handlePurchaseSuccess = useCallback(async (purchase: Purchase) => {
    if (!isSuccessfulPurchase(purchase)) return;
    const productId = purchase.productId;
    const isPremium = productId === STORE_PRODUCT_IDS.premiumMonthly || productId === STORE_PRODUCT_IDS.premiumAnnual;
    const isDesign = productId === STORE_PRODUCT_IDS.designCustomize;
    try {
      // Both subscriptions and the non-consumable are finished only after the
      // StoreKit purchase event has arrived. No reward is granted on cancel or
      // on a request that never produces a successful transaction.
      await finishTransaction({ purchase, isConsumable: false });
      if (isPremium) onPremiumEntitlement(true);
      if (isDesign) onDesignCustomizeEntitlement(true);
      pendingPurchaseRef.current?.resolve(isPremium || isDesign);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '購入を完了できませんでした。');
      pendingPurchaseRef.current?.resolve(false);
    } finally {
      pendingPurchaseRef.current = undefined;
    }
  }, [onDesignCustomizeEntitlement, onPremiumEntitlement]);

  const handlePurchaseError = useCallback((error: { code?: ErrorCode; message?: string }) => {
    // User cancellation is an expected outcome and should not be rendered as
    // a red purchase failure.
    if (error.code !== ErrorCode.UserCancelled) {
      setErrorMessage(error.message || '購入を完了できませんでした。');
    }
    pendingPurchaseRef.current?.resolve(false);
    pendingPurchaseRef.current = undefined;
  }, []);

  const {
    connected,
    products,
    subscriptions,
    availablePurchases,
    activeSubscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases: refreshAvailablePurchases,
    getActiveSubscriptions: refreshActiveSubscriptions,
  } = useIAP({ onPurchaseSuccess: handlePurchaseSuccess, onPurchaseError: handlePurchaseError });

  useEffect(() => {
    if (!__DEV__) return;
    [...subscriptions, ...products].forEach((product) => {
      console.log('[StoreKit] product', {
        productId: product.id,
        displayPrice: product.displayPrice,
        price: product.price,
        currency: product.currency,
      });
    });
  }, [products, subscriptions]);

  const premiumIds = useMemo(() => [STORE_PRODUCT_IDS.premiumMonthly, STORE_PRODUCT_IDS.premiumAnnual].filter(Boolean), []);
  const designIds = useMemo(() => [STORE_PRODUCT_IDS.designCustomize].filter(Boolean), []);

  useEffect(() => {
    if (!connected) return;
    if (premiumIds.length === 0 && designIds.length === 0) {
      setStatus('unavailable');
      setEntitlementsResolved(true);
      return;
    }
    let cancelled = false;
    setStatus('loading');
    const productQueries = [
      ...(premiumIds.length > 0 ? [fetchProducts({ skus: premiumIds, type: 'subs' })] : []),
      ...(designIds.length > 0 ? [fetchProducts({ skus: designIds, type: 'in-app' })] : []),
      refreshAvailablePurchases(),
      ...(premiumIds.length > 0 ? [refreshActiveSubscriptions(premiumIds)] : []),
    ];
    void Promise.all(productQueries).then(() => {
      if (!cancelled) {
        setStatus('ready');
        setEntitlementsResolved(true);
      }
    }).catch((error) => {
      if (!cancelled) {
        setStatus('unavailable');
        setEntitlementsResolved(true);
        setErrorMessage(error instanceof Error ? error.message : 'App Storeの商品情報を取得できませんでした。');
      }
    });
    return () => { cancelled = true; };
  }, [connected, designIds, fetchProducts, premiumIds, refreshActiveSubscriptions, refreshAvailablePurchases]);

  useEffect(() => {
    const activePremium = activeSubscriptions.some((item) => premiumIds.includes(item.productId) && item.isActive);
    const restoredDesign = availablePurchases.some((item) => item.productId === STORE_PRODUCT_IDS.designCustomize && isSuccessfulPurchase(item));
    onPremiumEntitlement(activePremium);
    onDesignCustomizeEntitlement(restoredDesign);
  }, [activeSubscriptions, availablePurchases, onDesignCustomizeEntitlement, onPremiumEntitlement, premiumIds]);

  const purchasePremium = useCallback((plan: PremiumPlan): Promise<boolean> => {
    const productId = plan === 'annual' ? STORE_PRODUCT_IDS.premiumAnnual : STORE_PRODUCT_IDS.premiumMonthly;
    if (!productId || !connected) {
      setErrorMessage('App Storeの商品情報を取得できませんでした。');
      return Promise.resolve(false);
    }
    setErrorMessage(undefined);
    return new Promise((resolve) => {
      pendingPurchaseRef.current = { resolve };
      void requestPurchase({
        request: Platform.OS === 'ios' ? { apple: { sku: productId } } : { google: { skus: [productId] } },
        type: 'subs',
      }).catch((error) => handlePurchaseError({ code: error?.code, message: error instanceof Error ? error.message : undefined }));
    });
  }, [connected, handlePurchaseError, requestPurchase]);

  const purchaseDesignCustomize = useCallback((): Promise<boolean> => {
    const productId = STORE_PRODUCT_IDS.designCustomize;
    if (!productId || !connected) {
      setErrorMessage('App Storeの商品情報を取得できませんでした。');
      return Promise.resolve(false);
    }
    setErrorMessage(undefined);
    return new Promise((resolve) => {
      pendingPurchaseRef.current = { resolve };
      void requestPurchase({
        request: Platform.OS === 'ios' ? { apple: { sku: productId } } : { google: { skus: [productId] } },
        type: 'in-app',
      }).catch((error) => handlePurchaseError({ code: error?.code, message: error instanceof Error ? error.message : undefined }));
    });
  }, [connected, handlePurchaseError, requestPurchase]);

  const restore = useCallback(async (): Promise<{ premium: boolean; designCustomize: boolean }> => {
    if (!connected) return { premium: false, designCustomize: false };
    setErrorMessage(undefined);
    try {
      const [available, active] = await Promise.all([
        getAvailablePurchasesDirect(),
        premiumIds.length > 0 ? getActiveSubscriptionsDirect(premiumIds) : Promise.resolve([]),
      ]);
      await refreshAvailablePurchases();
      if (premiumIds.length > 0) await refreshActiveSubscriptions(premiumIds);
      const premium = premiumIds.length > 0 && active.some((item) => premiumIds.includes(item.productId) && item.isActive);
      const designCustomize = available.some((item) => item.productId === STORE_PRODUCT_IDS.designCustomize && isSuccessfulPurchase(item));
      onPremiumEntitlement(premium);
      onDesignCustomizeEntitlement(designCustomize);
      return { premium, designCustomize };
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '購入を復元できませんでした。');
      return { premium: false, designCustomize: false };
    }
  }, [connected, onDesignCustomizeEntitlement, onPremiumEntitlement, premiumIds, refreshActiveSubscriptions, refreshAvailablePurchases]);

  const mappedProducts = useMemo(() => ({
    monthly: productToDisplay(subscriptions.find((product) => product.id === STORE_PRODUCT_IDS.premiumMonthly), '月額'),
    annual: productToDisplay(subscriptions.find((product) => product.id === STORE_PRODUCT_IDS.premiumAnnual), '年額'),
  }), [subscriptions]);
  const designProduct = useMemo(
    () => productToDisplay(products.find((product) => product.id === STORE_PRODUCT_IDS.designCustomize), '買い切り'),
    [products],
  );

  return {
    status,
    entitlementsResolved,
    products: mappedProducts,
    designProduct,
    errorMessage,
    purchasePremium,
    purchaseDesignCustomize,
    restore,
    configured: premiumIds.length === 2 && designIds.length === 1,
    premiumConfigured: premiumIds.length === 2,
    designConfigured: designIds.length === 1,
  };
}
