import type { RewardedAccessState } from '../ads/rewardedAccessStorage';
import { isUnlockActive } from '../ads/rewardedAccessLogic';
import { REWARDED_AD_RULES, type RewardedFeatureId } from '../ads/rewardedAccess';
import type { PhotoThemePhotoTarget } from '../../types';
export type PhotoKind = 'sample' | 'personal';
export const PHOTO_ACCESS_HOURS = REWARDED_AD_RULES.photoTop.unlockDurationHours;
export function isPhotoRewardFeature(id: RewardedFeatureId) { return id === 'photoTop' || id === 'photoBackground' || id === 'photoFocus'; }
export const PHOTO_TARGETS: readonly PhotoThemePhotoTarget[] = ['home', 'timeline', 'analysis', 'wish', 'background', 'focus', 'settings'];
export function rewardPhotoTarget(receipt: { featureId: RewardedFeatureId; photoTarget?: PhotoThemePhotoTarget }): PhotoThemePhotoTarget | undefined {
  const target = receipt.photoTarget ?? (receipt.featureId === 'photoBackground' ? 'background' : receipt.featureId === 'photoFocus' ? 'focus' : undefined);
  if (!target || !PHOTO_TARGETS.includes(target)) return undefined;
  if (receipt.featureId === 'photoBackground') return target === 'background' ? target : undefined;
  if (receipt.featureId === 'photoFocus') return target === 'focus' ? target : undefined;
  return receipt.featureId === 'photoTop' && target !== 'background' && target !== 'focus' ? target : undefined;
}
export function canUsePhotoKind(state: RewardedAccessState, kind: PhotoKind, target: PhotoThemePhotoTarget | undefined, now = new Date()): boolean {
  // Neither legacy flags nor the superseded global grant identify a slot.
  if (!target) return false;
  const grant = state.photoAccessByTarget?.[target];
  return kind === 'sample' ? grant?.sampleUnlocked === true : isUnlockActive(grant?.personalUnlockedUntil ?? null, now);
}
export function photoRewardProgress(state: RewardedAccessState, kind: PhotoKind, target: PhotoThemePhotoTarget | undefined, now = new Date()) {
  const grant = target ? state.photoAccessByTarget?.[target] : undefined;
  return { current: kind === 'sample' ? (canUsePhotoKind(state, 'sample', target, now) ? 1 : 0) : canUsePhotoKind(state, 'personal', target, now) ? 2 : grant?.personalProgress ?? 0, required: kind === 'sample' ? REWARDED_AD_RULES.photoTop.sampleAdsRequired : REWARDED_AD_RULES.photoTop.adsRequired };
}
export function photoAccessLabel(state: RewardedAccessState, purchased: boolean, target: PhotoThemePhotoTarget, now = new Date()) {
  if (purchased) return '購入済み・期限なし';
  if (canUsePhotoKind(state, 'personal', target, now)) {
    const days = Math.max(1, Math.ceil((new Date(state.photoAccessByTarget![target]!.personalUnlockedUntil!).getTime() - now.getTime()) / 86400000));
    return `この枠の自分の画像：残り${days}日`;
  }
  return `${canUsePhotoKind(state, 'sample', target, now) ? 'この枠のサンプル：期限なし' : 'この枠のサンプル：広告1回で解放'} ／ 自分の画像：広告2回で3日間`;
}
