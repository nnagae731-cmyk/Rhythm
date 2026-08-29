// Keep the legacy ids for persisted/deep-link compatibility while exposing
// focused ids for the current Premium guide copy.
export type PremiumGuideFeatureId = 'calendar' | 'route' | 'travel_apps' | 'nudge' | 'time' | 'behavior' | 'month' | 'recovery' | 'templates' | 'wish' | 'affirmation' | 'photo_design' | 'records' | 'reflection' | 'floral' | 'dot' | 'check' | 'history' | 'focus_custom_duration' | 'voice';

export const DEFAULT_PREMIUM_GUIDE_FEATURE: PremiumGuideFeatureId = 'calendar';
