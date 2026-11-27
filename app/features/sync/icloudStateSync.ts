import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { ICLOUD_STATE_SYNC_ENABLED } from './syncConfig';
export { ICLOUD_STATE_SYNC_ENABLED } from './syncConfig';

// This adapter does not schedule uploads or apply remote data itself.
export const ICLOUD_STATE_BODY_KEY = 'rhythm-state-body-v1';
export const ICLOUD_STATE_META_KEY = 'rhythm-state-meta-v1';
export type ICloudStateKey = typeof ICLOUD_STATE_BODY_KEY | typeof ICLOUD_STATE_META_KEY;
export type ICloudStateChange = {
  changedKeys: readonly string[];
  reason: 'serverChange' | 'initialSync' | 'quotaViolation' | 'accountChange';
};
type Subscription = { remove(): void };
type CloudSettingsNative = {
  isAvailable(): boolean;
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  addListener(event: 'onStoreChanged', listener: (change: ICloudStateChange) => void): Subscription;
};

function availableModule(): CloudSettingsNative | null {
  if (!ICLOUD_STATE_SYNC_ENABLED || Platform.OS !== 'ios') return null;
  try {
    // Avoid upstream's eager requireNativeModule: an older binary/Expo Go
    // without the module must keep working without a sign-in/error dialog.
    const module = requireOptionalNativeModule<CloudSettingsNative>('ExpoCloudSettings');
    return module?.isAvailable?.() ? module : null;
  } catch (error) {
    console.warn('[iCloud] KVS unavailable.', error);
    return null;
  }
}

export function isICloudStateSyncAvailable(): boolean { return availableModule() !== null; }

export function readICloudStateValue(key: ICloudStateKey, strict = false): string | null {
  try {
    const module = availableModule();
    if (!module && strict) throw new Error('KVS is unavailable during snapshot read.');
    return module?.getString(key) ?? null;
  } catch (error) { console.warn('[iCloud] KVS read failed.', error); if (strict) throw error; return null; }
}

export function writeICloudStateValue(key: ICloudStateKey, value: string): boolean {
  try {
    const module = availableModule();
    if (!module) return false;
    module.setString(key, value);
    return true; // Native setter returned, not a persistence/server acknowledgement.
  } catch (error) { console.warn('[iCloud] KVS write failed.', error); return false; }
}

export function subscribeToICloudStateChanges(listener: (change: ICloudStateChange) => void): Subscription {
  try {
    const module = availableModule();
    if (module) return module.addListener('onStoreChanged', event => {
      if (event.reason === 'initialSync' || event.reason === 'accountChange' || event.reason === 'quotaViolation' || event.changedKeys.some(key => key === ICLOUD_STATE_BODY_KEY || key === ICLOUD_STATE_META_KEY)) listener(event);
    });
  } catch (error) { console.warn('[iCloud] KVS subscription failed.', error); }
  return { remove() {} };
}
