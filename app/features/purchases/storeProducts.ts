/** App Store Connect product identifiers used by both EAS and local Metro builds. */
const DEFAULT_STORE_PRODUCT_IDS = {
  premiumMonthly: 'app.rhythm.daily.premium.monthly',
  premiumAnnual: 'app.rhythm.daily.premium.yearly',
  designCustomize: 'app.rhythm.daily.design.customize',
} as const;

function resolveProductId(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized || fallback;
}

/**
 * EAS public env values override the stable product IDs. The fallback keeps
 * local `expo start --dev-client` builds from querying StoreKit with empty SKUs.
 */
export const STORE_PRODUCT_IDS = {
  premiumMonthly: resolveProductId(process.env.EXPO_PUBLIC_RHYTHM_PREMIUM_MONTHLY_PRODUCT_ID, DEFAULT_STORE_PRODUCT_IDS.premiumMonthly),
  premiumAnnual: resolveProductId(process.env.EXPO_PUBLIC_RHYTHM_PREMIUM_ANNUAL_PRODUCT_ID, DEFAULT_STORE_PRODUCT_IDS.premiumAnnual),
  designCustomize: resolveProductId(process.env.EXPO_PUBLIC_RHYTHM_DESIGN_CUSTOMIZE_PRODUCT_ID, DEFAULT_STORE_PRODUCT_IDS.designCustomize),
} as const;

export type PremiumPlan = 'monthly' | 'annual';

export function isStoreKitConfigured(): boolean {
  return Boolean(STORE_PRODUCT_IDS.premiumMonthly && STORE_PRODUCT_IDS.premiumAnnual && STORE_PRODUCT_IDS.designCustomize);
}
