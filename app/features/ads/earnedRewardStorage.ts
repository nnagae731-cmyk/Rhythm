import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetType } from '../../types';
import { REWARDED_AD_RULES, type RewardedFeatureId } from './rewardedAccess';
import { addHours } from './rewardedAccessLogic';
import { EARNED_REWARD_STORAGE_KEY, REWARD_STORAGE_PROBE_KEY, isRewardedAccessLoadFailure, saveRewardedAccessState, type RewardedAccessState } from './rewardedAccessStorage';

export { EARNED_REWARD_STORAGE_KEY } from './rewardedAccessStorage';
export type EarnedRewardReceipt = { id: string; featureId: RewardedFeatureId; earnedAt: string; widgetType: WidgetType | null };

/** Do not ask someone to watch an ad when storage is already unavailable. */
export async function assertRewardStorageWritable() {
  await AsyncStorage.setItem(REWARD_STORAGE_PROBE_KEY, '1');
  if (await AsyncStorage.getItem(REWARD_STORAGE_PROBE_KEY) !== '1') throw new Error('広告の記録を保存できません。');
  await AsyncStorage.removeItem(REWARD_STORAGE_PROBE_KEY).catch(error => console.warn('[Ads] Storage probe cleanup will be retried.', error));
}

/** Only called after the SDK's EARNED_REWARD event, never for a close/error. */
export async function recordEarnedReward(receipt: EarnedRewardReceipt) {
  await AsyncStorage.setItem(EARNED_REWARD_STORAGE_KEY, JSON.stringify(receipt));
}

export function applyEarnedReward(base: RewardedAccessState, receipt: EarnedRewardReceipt) {
  if (base.lastAppliedRewardId === receipt.id) return base;
  const required = REWARDED_AD_RULES[receipt.featureId].adsRequired;
  const earnedAt = new Date(receipt.earnedAt);
  let next = base;
  switch (receipt.featureId) {
    case 'wishCreate': next = { ...base, wishCreateProgress: Math.min(required, base.wishCreateProgress + 1) }; break;
    case 'wishActionCreate': next = { ...base, wishActionCreateProgress: Math.min(required, base.wishActionCreateProgress + 1) }; break;
    case 'premiumDesign':
    case 'premiumDesignTrialExpired': next = { ...base, premiumDesign: { unlockedUntil: addHours(earnedAt, 12) } }; break;
    case 'calendarImport': next = { ...base, calendarImportCredits: base.calendarImportCredits + 1 }; break;
    case 'photoTop': next = { ...base, photoCustomization: { ...base.photoCustomization, topExtraSlotsUnlocked: Math.min(5, base.photoCustomization.topExtraSlotsUnlocked + 1) } }; break;
    case 'photoBackground': next = { ...base, photoCustomization: { ...base.photoCustomization, backgroundUnlocked: true } }; break;
    case 'photoFocus': next = { ...base, photoCustomization: { ...base.photoCustomization, focusUnlocked: true } }; break;
    case 'widgetPhoto':
      if (!receipt.widgetType) throw new Error('写真を使うWidgetを確認できません。');
      next = { ...base, widgetPhotoCustomization: { widgetType: receipt.widgetType, unlockedAt: receipt.earnedAt, expiresAt: addHours(earnedAt, 24 * REWARDED_AD_RULES.widgetPhoto.unlockDurationDays) } };
      break;
    case 'routineSkip': next = { ...base, routine: { ...base.routine, skipStock: base.routine.skipStock + 1 } }; break;
    case 'routineSkipBonus': {
      const progress = Math.min(required, base.routine.skipBonusProgress + 1);
      const reached = progress >= required;
      next = { ...base, routine: { ...base.routine, skipBonusProgress: reached ? 0 : progress, skipBonusAdded: reached ? Math.min(2, base.routine.skipBonusAdded + 1) : base.routine.skipBonusAdded, skipStock: reached ? base.routine.skipStock + (base.routine.skipBonusAdded < 2 ? 1 : 0) : base.routine.skipStock } };
      break;
    }
    default: throw new Error('広告の報酬種別を確認できません。');
  }
  return { ...next, lastAppliedRewardId: receipt.id };
}

/** A leftover receipt is harmless once its ID is part of the committed state. */
export async function clearEarnedReward() {
  try { await AsyncStorage.removeItem(EARNED_REWARD_STORAGE_KEY); }
  catch (error) { console.warn('[Ads] Earned receipt cleanup will be retried.', error); }
}

export async function recoverEarnedReward(base: RewardedAccessState): Promise<RewardedAccessState> {
  if (isRewardedAccessLoadFailure(base)) throw new Error('広告の保存状態を読み込めません。');
  const raw = await AsyncStorage.getItem(EARNED_REWARD_STORAGE_KEY);
  if (!raw) return base;
  const receipt = JSON.parse(raw) as EarnedRewardReceipt;
  if (!receipt || typeof receipt.id !== 'string' || !receipt.id || !Object.prototype.hasOwnProperty.call(REWARDED_AD_RULES, receipt.featureId) || receipt.featureId === 'premiumDesignTrial' || typeof receipt.earnedAt !== 'string' || !Number.isFinite(new Date(receipt.earnedAt).getTime()) || (receipt.widgetType !== null && typeof receipt.widgetType !== 'string')) {
    throw new Error('視聴済み広告の記録を確認できません。記録は保持しています。');
  }
  const next = applyEarnedReward(base, receipt);
  if (next !== base) await saveRewardedAccessState(next);
  await clearEarnedReward();
  return next;
}
