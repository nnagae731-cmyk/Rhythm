import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { LiveActivityCustomizationSettings, LiveActivityDisplayOptions, LiveActivityFontSize, RhythmFontDesign } from '../../types';
import { normalizeRhythmFontDesign } from '../fontDesign';

export const DEFAULT_LIVE_ACTIVITY_DISPLAY_OPTIONS: LiveActivityDisplayOptions = {
  currentTask: true,
  nextSchedule: true,
  departureCountdown: true,
  focusRemaining: true,
  affirmation: true,
};

export function normalizeRhythmLiveActivityDisplayOptions(value?: Partial<LiveActivityDisplayOptions> | null): LiveActivityDisplayOptions {
  const normalized: LiveActivityDisplayOptions = {
    currentTask: value?.currentTask !== false,
    nextSchedule: value?.nextSchedule !== false,
    departureCountdown: value?.departureCountdown !== false,
    focusRemaining: value?.focusRemaining !== false,
    affirmation: value?.affirmation !== false,
  };
  return Object.values(normalized).some(Boolean) ? normalized : { ...DEFAULT_LIVE_ACTIVITY_DISPLAY_OPTIONS };
}

export const DEFAULT_LIVE_ACTIVITY_CUSTOMIZATION: LiveActivityCustomizationSettings = {
  interactiveChecks: false,
  affirmationRotationMode: 'fixed',
  affirmationRotationIntervalMinutes: 60,
  fontDesign: 'default',
  fontSize: 'medium',
};

export function normalizeRhythmLiveActivityCustomization(value?: Partial<LiveActivityCustomizationSettings> | null): LiveActivityCustomizationSettings {
  const interval = value?.affirmationRotationIntervalMinutes === 30 || value?.affirmationRotationIntervalMinutes === 120
    ? value.affirmationRotationIntervalMinutes
    : 60;
  const fontSize: LiveActivityFontSize = value?.fontSize === 'small' || value?.fontSize === 'large' ? value.fontSize : 'medium';
  return {
    interactiveChecks: value?.interactiveChecks === true,
    affirmationRotationMode: value?.affirmationRotationMode === 'automatic' ? 'automatic' : 'fixed',
    affirmationRotationIntervalMinutes: interval,
    fontDesign: normalizeRhythmFontDesign(value?.fontDesign) as RhythmFontDesign,
    fontSize,
  };
}

export type RhythmLiveActivityPayload = {
  /** Entitlement tier used to redact premium-only state before it reaches ActivityKit. */
  tier: 'free' | 'design' | 'premium';
  mode: 'normal' | 'focus';
  currentTaskTitle?: string;
  nextScheduleTitle?: string;
  nextScheduleAt?: string;
  departureAt?: string;
  focusTaskTitle?: string;
  focusEndsAt?: string;
  focusElapsedStartAt?: string;
  focusElapsedSeconds?: number;
  focusRemainingSeconds?: number;
  focusRunning?: boolean;
  affirmationText?: string;
  accentHex?: string;
  displayOptions?: LiveActivityDisplayOptions;
  interactiveChecks?: boolean;
  currentTaskId?: string;
  currentTaskListItems?: Array<{ id: string; text: string; checked: boolean }>;
  affirmationTexts?: string[];
  affirmationRotationMode?: 'fixed' | 'automatic';
  affirmationRotationIntervalMinutes?: 30 | 60 | 120;
  affirmationRotationAnchor?: string;
  fontDesign?: RhythmFontDesign;
  fontSize?: LiveActivityFontSize;
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
