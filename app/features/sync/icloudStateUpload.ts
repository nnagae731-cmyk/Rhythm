import AsyncStorage from '@react-native-async-storage/async-storage';
import { ICLOUD_MAX_BODY_BYTES, syncBodyHash, utf8ByteLength } from './syncCodec';
import { ICLOUD_STATE_SYNC_ENABLED } from './syncConfig';
import { ICLOUD_STATE_BODY_KEY, ICLOUD_STATE_META_KEY, isICloudStateSyncAvailable, writeICloudStateValue } from './icloudStateSync';

export const SYNC_DEVICE_ID_KEY = 'rhythm-sync-device-id-v1';
export const ICLOUD_UPLOAD_DEBOUNCE_MS = 3_000;
export { ICLOUD_MAX_BODY_BYTES, utf8ByteLength } from './syncCodec';
let timer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;
let workPending = false;
let deviceIdPromise: Promise<string> | undefined;

let coordinator: ((body: string, updatedAt: number) => void) | undefined;
export function installICloudUploadCoordinator(listener: (body: string, updatedAt: number) => void) {
  coordinator = listener;
  cancelPendingICloudUpload();
  return () => { if (coordinator === listener) { coordinator = undefined; cancelPendingICloudUpload(); } };
}
export function cancelPendingICloudUpload(): boolean {
  const canceled = workPending;
  generation += 1;
  workPending = false;
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  return canceled;
}

function getDeviceId(): Promise<string> {
  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      const stored = await AsyncStorage.getItem(SYNC_DEVICE_ID_KEY);
      if (stored && stored.trim() && stored.length <= 256) return stored;
      // Installation-local random ID, not an Apple/account/advertising ID.
      const id = `sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      await AsyncStorage.setItem(SYNC_DEVICE_ID_KEY, id);
      return id;
    })();
  }
  return deviceIdPromise.catch(error => { deviceIdPromise = undefined; throw error; });
}

async function upload(body: string, updatedAt: number, revision: number): Promise<void> {
  if (revision !== generation || !isICloudStateSyncAvailable()) return;
  const bodyBytes = utf8ByteLength(body);
  if (bodyBytes > ICLOUD_MAX_BODY_BYTES) {
    console.warn('[iCloud] Upload skipped: body exceeds size limit.', { bodyBytes, limit: ICLOUD_MAX_BODY_BYTES });
    return;
  }
  const deviceId = await getDeviceId();
  // A newer successful local save supersedes an ID lookup still in flight.
  if (revision !== generation || !isICloudStateSyncAvailable()) return;
  if (!writeICloudStateValue(ICLOUD_STATE_BODY_KEY, body)) {
    console.warn('[iCloud] Body write failed. Will retry on the next local save.');
    return;
  }
  // Meta last is a completion marker, NOT an atomic two-key transaction.
  if (!writeICloudStateValue(ICLOUD_STATE_META_KEY, JSON.stringify({ updatedAt, deviceId, bodyBytes, bodyHash: syncBodyHash(body) }))) {
    console.warn('[iCloud] Meta write failed. Will retry on the next local save.');
    return;
  }
  if (__DEV__) console.log('[iCloud] Native KVS write calls returned (not server confirmation).', { updatedAt, bodyBytes, deviceIdSuffix: deviceId.slice(-6) });
}

/** Called with the exact serialized string only AFTER the local write resolves. */
export function queueICloudStateUpload(body: string, updatedAt: number): void {
  if (coordinator) { cancelPendingICloudUpload(); coordinator(body, updatedAt); return; }
  queuePreparedICloudStateUpload(body, updatedAt);
}

/** Coordinator-approved LWW timestamp; deliberately bypasses the save observer. */
export function queuePreparedICloudStateUpload(body: string, updatedAt: number): void {
  const revision = ++generation;
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  workPending = false;
  if (!ICLOUD_STATE_SYNC_ENABLED || !isICloudStateSyncAvailable()) return;
  workPending = true;
  timer = setTimeout(() => {
    timer = undefined;
    void upload(body, updatedAt, revision).catch(error => {
      console.warn('[iCloud] Upload failed. Local save is unaffected; retry on next save.', error);
    }).finally(() => { if (revision === generation) workPending = false; });
  }, ICLOUD_UPLOAD_DEBOUNCE_MS);
}
