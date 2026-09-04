import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { ErrorCode, fetchProducts as fetchProductsDirect, getActiveSubscriptions as getActiveSubscriptionsDirect, getAvailablePurchases as getAvailablePurchasesDirect, getStorefront, type Product, type ProductSubscription, type Purchase, useIAP } from 'expo-iap';
import { PremiumPlan, STORE_PRODUCT_IDS } from './storeProducts';

export type StoreProduct = {
  displayPrice: string;
  periodLabel: string;
  amount?: number;
  currency?: string;
};

export type StoreKitStatus = 'loading' | 'ready' | 'unavailable';

export type StorePurchaseResult = {
  success: boolean;
  error?: string;
};

type PendingPurchase = {
  resolve: (result: StorePurchaseResult) => void;
};

export type PremiumTrialStarted = {
  productId: string;
  trialEndAt: number;
  displayPrice?: string;
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
 * StoreKit exposes the end of an introductory free-trial offer on the
 * purchase event.  It is intentionally not inferred from the plan name or a
 * hard-coded seven-day period: restored/renewed purchases do not reliably
 * identify whether their expiration is still the introductory offer.
 */
function getFreeTrialEndAt(purchase: Purchase): number | undefined {
  if (Platform.OS !== 'ios') return undefined;
  const iosPurchase = purchase as Purchase & {
    expirationDateIOS?: number | null;
    offerIOS?: { paymentMode?: string | null } | null;
  };
  const endAt = iosPurchase.expirationDateIOS;
  if (iosPurchase.offerIOS?.paymentMode !== 'free-trial' || typeof endAt !== 'number' || !Number.isFinite(endAt) || endAt <= Date.now()) {
    return undefined;
  }
  return endAt;
}

/**
 * StoreKit/OpenIAP bridge for the existing Premium UI. The hook deliberately
 * keeps entitlement state sourced from StoreKit and only persists the
 * separate Design Customize flag after a verified purchase event.
 */
export function useRhythmStoreKit({
  onPremiumEntitlement,
  onDesignCustomizeEntitlement,
  onPremiumTrialStarted,
}: {
  onPremiumEntitlement: (active: boolean) => void;
  onDesignCustomizeEntitlement: (active: boolean) => void;
  onPremiumTrialStarted?: (trial: PremiumTrialStarted) => void;
}) {
  const [status, setStatus] = useState<StoreKitStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [entitlementsResolved, setEntitlementsResolved] = useState(false);
  const [premiumEntitlementResolved, setPremiumEntitlementResolved] = useState(false);
  const [designEntitlementResolved, setDesignEntitlementResolved] = useState(false);
  const [premiumTrialEndAt, setPremiumTrialEndAt] = useState<number>();
  const pendingPurchaseRef = useRef<PendingPurchase | undefined>(undefined);
  const subscriptionsRef = useRef<ProductSubscription[]>([]);
  const productsRef = useRef<Product[]>([]);

  const handlePurchaseSuccess = useCallback(async (purchase: Purchase) => {
    const purchaseIOS = purchase as Purchase & {
      expirationDateIOS?: number | null;
      offerIOS?: { paymentMode?: string | null } | null;
    };
    if (__DEV__) console.log('[StoreKit] purchase success detail', {
      productId: purchase.productId,
      purchaseState: purchase.purchaseState,
      offerIOS: purchaseIOS.offerIOS,
      paymentMode: purchaseIOS.offerIOS?.paymentMode,
      expirationDateIOS: purchaseIOS.expirationDateIOS,
    });
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
      // The introductory offer belongs to the monthly SKU.  Do not show the
      // seven-day guide for the annual plan or for a restored transaction.
      const trialEndAt = isPremium
        && productId === STORE_PRODUCT_IDS.premiumMonthly
        && purchase.purchaseState === 'purchased'
        ? getFreeTrialEndAt(purchase)
        : undefined;
      if (trialEndAt) {
        setPremiumTrialEndAt(trialEndAt);
        onPremiumTrialStarted?.({
          productId,
          trialEndAt,
          displayPrice: subscriptionsRef.current.find((item) => item.id === productId)?.displayPrice,
        });
        if (__DEV__) console.log('[StoreKit] premium free trial', { productId, trialEndAt: new Date(trialEndAt).toISOString(), offer: (purchase as Purchase & { offerIOS?: unknown }).offerIOS });
      }
      pendingPurchaseRef.current?.resolve({ success: isPremium || isDesign });
    } catch (error) {
      const message = error instanceof Error ? error.message : '購入を完了できませんでした。';
      setErrorMessage(message);
      pendingPurchaseRef.current?.resolve({ success: false, error: message });
    } finally {
      pendingPurchaseRef.current = undefined;
    }
  }, [onDesignCustomizeEntitlement, onPremiumEntitlement, onPremiumTrialStarted]);

  const handlePurchaseError = useCallback((error: { code?: ErrorCode; message?: string }) => {
    // User cancellation is an expected outcome and should not be rendered as
    // a red purchase failure.
    if (error.code !== ErrorCode.UserCancelled) {
      setErrorMessage(error.message || '購入を完了できませんでした。');
    }
    pendingPurchaseRef.current?.resolve({ success: false, error: error.message || '購入を完了できませんでした。' });
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
    subscriptionsRef.current = subscriptions;
  }, [subscriptions]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Available purchases are the StoreKit-backed source for restored/current
  // transactions. Keep the trial end derived from the monthly transaction so
  // the Settings reminder is also correct after relaunch, while paid or
  // restored non-trial subscriptions resolve to no active trial.
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setPremiumTrialEndAt(undefined);
      return;
    }
    const trialEndAt = availablePurchases
      .filter((purchase) => purchase.productId === STORE_PRODUCT_IDS.premiumMonthly && isSuccessfulPurchase(purchase))
      .map(getFreeTrialEndAt)
      .filter((endAt): endAt is number => typeof endAt === 'number' && endAt > Date.now())
      .sort((left, right) => right - left)[0];
    setPremiumTrialEndAt(trialEndAt);
  }, [availablePurchases]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[StoreKit] product response', {
      subscriptionsCount: subscriptions.length,
      productsCount: products.length,
      subscriptionIds: subscriptions.map((product) => product.id),
      inAppProductIds: products.map((product) => product.id),
    });
    [...subscriptions, ...products].forEach((product) => {
      console.log('[StoreKit] product', {
        productId: product.id,
        displayPrice: product.displayPrice,
        price: product.price,
        currency: product.currency,
        type: product.type,
      });
    });
    const expected = [
      STORE_PRODUCT_IDS.premiumMonthly,
      STORE_PRODUCT_IDS.premiumAnnual,
      STORE_PRODUCT_IDS.designCustomize,
    ];
    const returned = new Set([...subscriptions, ...products].map((product) => product.id));
    const missing = expected.filter((id) => !returned.has(id));
    if (missing.length > 0) console.log('[StoreKit] products not returned yet', { missing });
  }, [products, subscriptions]);

  useEffect(() => {
    if (!__DEV__ || !connected) return;
    void getStorefront()
      .then((storefront) => console.log('[StoreKit] storefront', storefront))
      .catch((error) => console.log('[StoreKit] storefront unavailable', error instanceof Error ? error.message : error));
  }, [connected]);

  const premiumIds = useMemo(() => [STORE_PRODUCT_IDS.premiumMonthly, STORE_PRODUCT_IDS.premiumAnnual].filter(Boolean), []);
  const designIds = useMemo(() => [STORE_PRODUCT_IDS.designCustomize].filter(Boolean), []);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    setStatus('loading');
    setEntitlementsResolved(false);
    setPremiumEntitlementResolved(premiumIds.length === 0);
    setDesignEntitlementResolved(designIds.length === 0);
    if (__DEV__) {
      console.log('[StoreKit] requesting products', {
        subscriptions: premiumIds,
        inAppProducts: designIds,
      });
    }
    const loadStoreData = async () => {
      const productResults = await Promise.allSettled([
        ...(premiumIds.length > 0 ? [fetchProducts({ skus: premiumIds, type: 'subs' })] : []),
        ...(designIds.length > 0 ? [fetchProducts({ skus: designIds, type: 'in-app' })] : []),
      ]);
      const productFailed = productResults.some((result) => result.status === 'rejected');
      if (__DEV__ && productFailed) console.log('[StoreKit] product fetch partially failed', productResults.filter((result) => result.status === 'rejected'));
      if (!cancelled) {
        setStatus(productResults.some((result) => result.status === 'fulfilled') ? 'ready' : 'unavailable');
        if (productFailed && productResults.every((result) => result.status === 'rejected')) {
          setErrorMessage('App Storeの商品情報を取得できませんでした。');
        }
      }

      const [designResult, premiumResult] = await Promise.all([
        designIds.length > 0 ? refreshAvailablePurchases().then(() => true, (error) => {
          if (__DEV__) console.log('[StoreKit] Design entitlement fetch failed', error);
          return false;
        }) : Promise.resolve(true),
        premiumIds.length > 0 ? refreshActiveSubscriptions(premiumIds).then(() => true, (error) => {
          if (__DEV__) console.log('[StoreKit] Premium entitlement fetch failed', error);
          return false;
        }) : Promise.resolve(true),
      ]);
      if (!cancelled) {
        setDesignEntitlementResolved(designResult);
        setPremiumEntitlementResolved(premiumResult);
        setEntitlementsResolved(designResult && premiumResult);
      }
    };
    void loadStoreData();
    return () => { cancelled = true; };
  }, [connected, designIds, fetchProducts, premiumIds, refreshActiveSubscriptions, refreshAvailablePurchases]);

  useEffect(() => {
    if (!premiumEntitlementResolved) return;
    const activePremium = activeSubscriptions.some((item) => premiumIds.includes(item.productId) && item.isActive);
    onPremiumEntitlement(activePremium);
  }, [activeSubscriptions, onPremiumEntitlement, premiumEntitlementResolved, premiumIds]);

  useEffect(() => {
    if (!designEntitlementResolved) return;
    const restoredDesign = availablePurchases.some((item) => item.productId === STORE_PRODUCT_IDS.designCustomize && isSuccessfulPurchase(item));
    onDesignCustomizeEntitlement(restoredDesign);
  }, [availablePurchases, designEntitlementResolved, onDesignCustomizeEntitlement]);

  const purchasePremium = useCallback((plan: PremiumPlan): Promise<StorePurchaseResult> => {
    const productId = plan === 'annual' ? STORE_PRODUCT_IDS.premiumAnnual : STORE_PRODUCT_IDS.premiumMonthly;
    if (!productId || !connected) {
      const error = 'App Storeの商品情報を取得できませんでした。';
      setErrorMessage(error);
      return Promise.resolve({ success: false, error });
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

  const purchaseDesignCustomize = useCallback(async (): Promise<StorePurchaseResult> => {
    const productId = STORE_PRODUCT_IDS.designCustomize;
    if (!productId || !connected) {
      const error = 'App Storeの商品情報を取得できませんでした。';
      setErrorMessage(error);
      return { success: false, error };
    }
    // Do not send a purchase request with an unverified SKU. Re-query the
    // in-app product first when the modal was opened before StoreKit finished
    // loading, then proceed only if the exact product is present.
    if (!productsRef.current.some((product) => product.id === productId)) {
      setStatus('loading');
      if (__DEV__) console.log('[StoreKit] re-fetching Design Customize before purchase', { productId, type: 'in-app', connected });
      let returnedProduct = false;
      try {
        // The hook's fetchProducts updates React state and intentionally
        // returns void. Query the package-level API in parallel so this gate
        // can validate the exact StoreKit response before requesting a SKU.
        const [, refreshedProducts] = await Promise.all([
          fetchProducts({ skus: [productId], type: 'in-app' }),
          fetchProductsDirect({ skus: [productId], type: 'in-app' }),
        ]);
        returnedProduct = Array.isArray(refreshedProducts) && refreshedProducts.some((product) => product.id === productId);
      } catch (error) {
        if (__DEV__) console.log('[StoreKit] Design Customize re-fetch failed', error);
      }
      // Prefer the direct query result; the hook state may update on the next
      // render and should not be the only source used to validate the SKU.
      if (!returnedProduct && !productsRef.current.some((product) => product.id === productId)) {
        setStatus('unavailable');
        setErrorMessage('App Storeの商品情報を取得できませんでした。');
        return { success: false, error: 'App Storeの商品情報を取得できませんでした。' };
      }
      setStatus('ready');
    }
    setErrorMessage(undefined);
    return new Promise((resolve) => {
      pendingPurchaseRef.current = { resolve };
      if (__DEV__) console.log('[StoreKit] requestPurchase Design Customize', { productId, type: 'in-app' });
      void requestPurchase({
        request: Platform.OS === 'ios' ? { apple: { sku: productId } } : { google: { skus: [productId] } },
        type: 'in-app',
      }).catch((error) => handlePurchaseError({ code: error?.code, message: error instanceof Error ? error.message : undefined }));
    });
  }, [connected, fetchProducts, handlePurchaseError, requestPurchase]);

  const restore = useCallback(async (): Promise<{ success: boolean; premium: boolean; designCustomize: boolean; error?: string }> => {
    if (!connected) return { success: false, premium: false, designCustomize: false, error: 'App Storeに接続できませんでした。' };
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
      return { success: true, premium, designCustomize };
    } catch (error) {
      const message = error instanceof Error ? error.message : '購入を復元できませんでした。';
      setErrorMessage(message);
      return { success: false, premium: false, designCustomize: false, error: message };
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
    premiumEntitlementResolved,
    designEntitlementResolved,
    products: mappedProducts,
    designProduct,
    premiumTrialEndAt,
    errorMessage,
    purchasePremium,
    purchaseDesignCustomize,
    restore,
    configured: premiumIds.length === 2 && designIds.length === 1,
    premiumConfigured: premiumIds.length === 2,
    designConfigured: designIds.length === 1,
  };
}
