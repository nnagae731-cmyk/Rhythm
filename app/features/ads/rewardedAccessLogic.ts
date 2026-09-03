import { REWARDED_AD_RULES } from './rewardedAccess';
import { RewardedAccessState } from './rewardedAccessStorage';

export function isUnlockActive(
  unlockedUntil: string | null,
  now = new Date(),
): boolean {
  if (!unlockedUntil) {
    return false;
  }

  const end = new Date(unlockedUntil);

  if (Number.isNaN(end.getTime())) {
    return false;
  }

  return end.getTime() > now.getTime();
}

export function addHours(
  from: Date,
  hours: number,
): string {
  const result = new Date(from);
  result.setTime(
    result.getTime() + hours * 60 * 60 * 1000,
  );

  return result.toISOString();
}

export function isPremiumDesignUnlocked(
  state: RewardedAccessState,
  now = new Date(),
): boolean {
  return isUnlockActive(
    state.premiumDesign.unlockedUntil,
    now,
  );
}

export function canCreateWish(
  state: RewardedAccessState,
): boolean {
  return (
    state.wishCreateProgress >=
    REWARDED_AD_RULES.wishCreate.adsRequired
  );
}

export function canCreateWishAction(
  state: RewardedAccessState,
): boolean {
  return (
    state.wishActionCreateProgress >=
    REWARDED_AD_RULES.wishActionCreate.adsRequired
  );
}

export function canImportCalendar(
  state: RewardedAccessState,
): boolean {
  return state.calendarImportCredits > 0;
}

export function canTryPremiumDesign(
  state: RewardedAccessState,
  designId: string,
): boolean {
  return (
    (state.premiumDesignTrialCredits[designId] ?? 0) >
    0
  );
}

export function getUnlockedTopPhotoSlots(
  state: RewardedAccessState,
): number {
  return Math.min(
    state.photoCustomization.topExtraSlotsUnlocked,
    REWARDED_AD_RULES.photoTop.maxUnlocks,
  );
}

export function isBackgroundPhotoUnlocked(
  state: RewardedAccessState,
): boolean {
  return state.photoCustomization.backgroundUnlocked;
}

export function isFocusPhotoUnlocked(
  state: RewardedAccessState,
): boolean {
  return state.photoCustomization.focusUnlocked;
}

export function isWidgetPhotoUnlockActive(
  state: RewardedAccessState,
  widgetType: string,
  now = new Date(),
): boolean {
  return state.widgetPhotoCustomization.widgetType === widgetType
    && isUnlockActive(state.widgetPhotoCustomization.expiresAt, now);
}

export function getWishProgress(
  state: RewardedAccessState,
) {
  return {
    current: state.wishCreateProgress,
    required:
      REWARDED_AD_RULES.wishCreate.adsRequired,
    completed: canCreateWish(state),
  };
}

export function getWishActionProgress(
  state: RewardedAccessState,
) {
  return {
    current: state.wishActionCreateProgress,
    required:
      REWARDED_AD_RULES.wishActionCreate.adsRequired,
    completed: canCreateWishAction(state),
  };
}

export function getRoutineSkipBonusProgress(
  state: RewardedAccessState,
) {
  return {
    current: state.routine.skipBonusProgress,
    required:
      REWARDED_AD_RULES.routineSkipBonus.adsRequired,
    added: state.routine.skipBonusAdded,
    maxAdded:
      REWARDED_AD_RULES.routineSkipBonus.maxAddedDays,
  };
}

export function isPremiumDesignTrialActive(
  state: RewardedAccessState,
  now = new Date(),
): boolean {
  return state.premiumDesignTrial.used && isUnlockActive(state.premiumDesignTrial.expiresAt, now);
}

export function canStartPremiumDesignTrial(state: RewardedAccessState): boolean {
  return !state.premiumDesignTrial.used;
}
