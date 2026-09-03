import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type RhythmLiveActivityPayload = {
  mode: 'normal' | 'focus';
  currentTaskTitle?: string;
  nextScheduleTitle?: string;
  nextScheduleAt?: string;
  departureAt?: string;
  focusTaskTitle?: string;
  focusEndsAt?: string;
  accentHex?: string;
};

type RhythmLiveActivityNativeModule = {
  isLiveActivityAvailable?: () => Promise<boolean>;
  startOrUpdateLiveActivity?: (payload: string) => Promise<boolean>;
  updateLiveActivity?: (payload: string) => Promise<boolean>;
  endLiveActivity?: () => Promise<boolean>;
  getLiveActivityStatus?: () => Promise<string>;
};

function moduleForIOS() {
  if (Platform.OS !== 'ios') return undefined;
  return requireOptionalNativeModule<RhythmLiveActivityNativeModule>('RhythmWidget');
}

export async function isRhythmLiveActivityAvailable() {
  const nativeModule = moduleForIOS();
  if (!nativeModule?.isLiveActivityAvailable) return false;
  return nativeModule.isLiveActivityAvailable().catch(() => false);
}

export async function startOrUpdateRhythmLiveActivity(payload: RhythmLiveActivityPayload) {
  const nativeModule = moduleForIOS();
  if (!nativeModule?.startOrUpdateLiveActivity) return false;
  return nativeModule.startOrUpdateLiveActivity(JSON.stringify(payload)).catch(() => false);
}

export async function updateRhythmLiveActivity(payload: RhythmLiveActivityPayload) {
  const nativeModule = moduleForIOS();
  if (!nativeModule?.updateLiveActivity) return false;
  return nativeModule.updateLiveActivity(JSON.stringify(payload)).catch(() => false);
}

export async function endRhythmLiveActivity() {
  const nativeModule = moduleForIOS();
  if (!nativeModule?.endLiveActivity) return false;
  return nativeModule.endLiveActivity().catch(() => false);
}

export async function getRhythmLiveActivityStatus() {
  const nativeModule = moduleForIOS();
  if (!nativeModule?.getLiveActivityStatus) return { available: false, active: false };
  try {
    const parsed = JSON.parse(await nativeModule.getLiveActivityStatus());
    return { available: parsed?.available === true, active: parsed?.active === true };
  } catch {
    return { available: false, active: false };
  }
}
