export const REWARDED_AD_RULES = {
  wishMonthlyGoal: {
    label: '「叶えたいこと」内の月の目標',
    adsRequired: 5,
    unlockDurationMonths: 1,
  },

  wishCreate: {
    label: '叶えたいこと',
    adsRequired: 2,
    unlockCount: 1,
  },

  wishActionCreate: {
    label: '叶えるための行動',
    adsRequired: 2,
    unlockCount: 1,
  },

  premiumDesign: {
    label: 'プレミアデザイン',
    adsRequired: 1,
    unlockDurationHours: 12,
  },

  calendarImport: {
    label: 'カレンダーから取り込み',
    adsRequired: 1,
    unlockCount: 1,
  },

  premiumDesignTrial: {
    label: 'プレミアデザイン試着',
    adsRequired: 0,
    perDesign: false,
  },

  premiumDesignTrialExpired: {
    label: 'プレミアデザインを12時間使う',
    adsRequired: 1,
    unlockDurationHours: 12,
  },

  photoTop: {
    label: '写真カスタマイズ・トップ画',
    adsRequired: 1,
    unlockCount: 1,
    maxUnlocks: 5,
  },

  photoBackground: {
    label: '写真カスタマイズ・背景',
    adsRequired: 1,
  },

  photoFocus: {
    label: '写真カスタマイズ・集中タイマー',
    adsRequired: 1,
  },

  widgetPhoto: {
    label: 'Widget写真カスタマイズ',
    adsRequired: 1,
    unlockDurationDays: 7,
  },

  routineSkip: {
    label: 'ルーティンのスキップ',
    adsRequired: 1,
    skipDays: 1,
  },

  routineSkipBonus: {
    label: 'スキップ可能日の追加',
    adsRequired: 2,
    skipDaysAdded: 1,
    maxAddedDays: 2,
  },
} as const;

export type RewardedFeatureId = keyof typeof REWARDED_AD_RULES;

export function getRequiredAds(featureId: RewardedFeatureId) {
  return REWARDED_AD_RULES[featureId].adsRequired;
}

export function isRewardRequirementMet(
  featureId: RewardedFeatureId,
  watchedAds: number,
) {
  return watchedAds >= getRequiredAds(featureId);
}

export function getRewardProgress(
  featureId: RewardedFeatureId,
  watchedAds: number,
) {
  const required = getRequiredAds(featureId);

  return {
    current: Math.min(Math.max(watchedAds, 0), required),
    required,
    completed: watchedAds >= required,
  };
}
