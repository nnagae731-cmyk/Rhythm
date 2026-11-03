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
  currentTasks?: Array<{ id: string; title: string }>;
  currentTaskRemainingCount?: number;
  currentTaskListItems?: Array<{ id: string; text: string; checked: boolean }>;
  affirmationTexts?: string[];
  affirmationRotationMode?: 'fixed' | 'automatic';
  affirmationRotationIntervalMinutes?: 30 | 60 | 120;
  affirmationRotationAnchor?: string;
  fontDesign?: RhythmFontDesign;
  fontSize?: LiveActivityFontSize;
};

/** Runtime-only state. ActivityKit owns the actual lifecycle, so this is
 * deliberately never written into the persisted app state. */
export type RhythmLiveActivityRuntimeStatus = 'off' | 'waiting' | 'starting' | 'active' | 'unavailable' | 'failed';

type RhythmLiveActivityNativeModule = {
  isLiveActivityAvailable?: () => Promise<boolean>;
  startOrUpdateLiveActivity?: (payload: string) => Promise<boolean>;
  updateLiveActivity?: (payload: string) => Promise<boolean>;
  endLiveActivity?: () => Promise<boolean>;
  getLiveActivityStatus?: () => Promise<string>;
};

function logLiveActivityDiagnostic(event: string, details?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`[LiveActivity] ${event}`, details ?? {});
  }
}

function moduleForIOS() {
  if (Platform.OS !== 'ios') {
    logLiveActivityDiagnostic('native-module-skipped', { platform: Platform.OS });
    return undefined;
  }
  const nativeModule = requireOptionalNativeModule<RhythmLiveActivityNativeModule>('RhythmWidget');
  logLiveActivityDiagnostic('native-module-resolved', {
    available: Boolean(nativeModule),
    hasAvailabilityMethod: Boolean(nativeModule?.isLiveActivityAvailable),
    hasStartMethod: Boolean(nativeModule?.startOrUpdateLiveActivity),
    hasEndMethod: Boolean(nativeModule?.endLiveActivity),
    hasStatusMethod: Boolean(nativeModule?.getLiveActivityStatus),
  });
  return nativeModule;
}

export async function isRhythmLiveActivityAvailable() {
  const nativeModule = moduleForIOS();
  if (!nativeModule?.isLiveActivityAvailable) {
    logLiveActivityDiagnostic('availability-skipped', { reason: 'native-method-missing' });
    return false;
  }
  try {
    const available = await nativeModule.isLiveActivityAvailable();
    logLiveActivityDiagnostic('availability-result', { available });
    return available;
  } catch (error) {
    logLiveActivityDiagnostic('availability-error', { error: String(error) });
    return false;
  }
}

export async function startOrUpdateRhythmLiveActivity(payload: RhythmLiveActivityPayload) {
  const nativeModule = moduleForIOS();
  if (!nativeModule?.startOrUpdateLiveActivity) {
    logLiveActivityDiagnostic('start-skipped', { reason: 'native-method-missing' });
    return false;
  }
  const serializedPayload = JSON.stringify(payload);
  logLiveActivityDiagnostic('start-request', {
    mode: payload.mode,
    tier: payload.tier,
    hasCurrentTask: Boolean(payload.currentTaskTitle || payload.currentTasks?.length),
    hasFocusTask: Boolean(payload.focusTaskTitle),
    hasNextSchedule: Boolean(payload.nextScheduleTitle),
  });
  try {
    const result = await nativeModule.startOrUpdateLiveActivity(serializedPayload);
    logLiveActivityDiagnostic('start-result', { result });
    return result;
  } catch (error) {
    logLiveActivityDiagnostic('start-error', { error: String(error) });
    return false;
  }
}

export async function updateRhythmLiveActivity(payload: RhythmLiveActivityPayload) {
  const nativeModule = moduleForIOS();
  if (!nativeModule?.updateLiveActivity) return false;
  return nativeModule.updateLiveActivity(JSON.stringify(payload)).catch(() => false);
}

export async function endRhythmLiveActivity() {
  const nativeModule = moduleForIOS();
  if (!nativeModule?.endLiveActivity) {
    logLiveActivityDiagnostic('end-skipped', { reason: 'native-method-missing' });
    return false;
  }
  try {
    const result = await nativeModule.endLiveActivity();
    logLiveActivityDiagnostic('end-result', { result });
    return result;
  } catch (error) {
    logLiveActivityDiagnostic('end-error', { error: String(error) });
    return false;
  }
}

export async function getRhythmLiveActivityStatus() {
  const nativeModule = moduleForIOS();
  if (!nativeModule?.getLiveActivityStatus) {
    logLiveActivityDiagnostic('status-skipped', { reason: 'native-method-missing' });
    return { available: false, active: false };
  }
  try {
    const parsed = JSON.parse(await nativeModule.getLiveActivityStatus());
    const status = { available: parsed?.available === true, active: parsed?.active === true };
    logLiveActivityDiagnostic('status-result', status);
    return status;
  } catch (error) {
    logLiveActivityDiagnostic('status-error', { error: String(error) });
    return { available: false, active: false };
  }
}
