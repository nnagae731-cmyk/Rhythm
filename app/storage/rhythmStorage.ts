import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistedState } from '../types';
import { STORAGE_KEY } from './rhythmState';
import { queueICloudStateUpload } from '../features/sync/icloudStateUpload';
import { parseRhythmStateBody } from './rhythmStateValidation';

// AsyncStorage writes for the main state can be initiated by both the
// debounced persistence effect and the AppState background flush. Keep those
// writes in one in-process queue so an older write cannot complete after a
// newer one and become the final value for STORAGE_KEY.
let rhythmStateSaveQueue: Promise<unknown> = Promise.resolve();
let localWriteVersion = 0;
export const PRE_SYNC_BACKUP_KEY = 'rhythm-state-pre-sync-backup-v1';
export async function loadPreSyncBackupState() {
  const raw = await AsyncStorage.getItem(PRE_SYNC_BACKUP_KEY);
  return !raw || raw === 'null' ? null : parseRhythmStateBody(raw);
}
export function getLocalStateWriteVersion() { return localWriteVersion; }
export async function readCommittedRhythmStateBody(): Promise<string | null> {
  await rhythmStateSaveQueue;
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function loadRhythmState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseRhythmStateBody(raw);
  } catch (error) {
    console.warn('Rhythm state could not be read. Existing storage was left untouched.', error);
    throw error;
  }
}

export async function saveRhythmState(state: PersistedState) {
  const serialized = JSON.stringify(state);
  localWriteVersion += 1;
  const write = rhythmStateSaveQueue.then(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.warn('Rhythm state could not be saved. The previous saved state was left untouched.', error);
      throw error;
    }
  });
  rhythmStateSaveQueue = write.catch(() => undefined);
  await write;
  // Outside the existing local queue. Cloud work must never delay/reject a
  // successful local save, including its settings/journal receipt handling.
  try { queueICloudStateUpload(serialized, Date.now()); }
  catch (error) { console.warn('[iCloud] Could not schedule upload. Local save succeeded.', error); }
}

/** Conditional remote adoption uses the SAME queue, not a second writer. */
export async function adoptRemoteRhythmState(expected: string | null, body: string, canApply: () => boolean): Promise<'adopted' | 'changed' | 'blocked' | 'backup-failed' | 'write-failed'> {
  parseRhythmStateBody(body);
  const version = localWriteVersion;
  const write = rhythmStateSaveQueue.then(async () => {
    if (version !== localWriteVersion) return 'changed' as const;
    if (!canApply()) return 'blocked' as const;
    const current = await AsyncStorage.getItem(STORAGE_KEY);
    if (current !== expected || version !== localWriteVersion) return 'changed' as const;
    if (!canApply()) return 'blocked' as const;
    try { await AsyncStorage.setItem(PRE_SYNC_BACKUP_KEY, current ?? 'null'); }
    catch (error) { console.warn('[iCloud] Pre-sync backup failed; kept local state.', error); return 'backup-failed' as const; }
    if (!canApply() || version !== localWriteVersion) return 'blocked' as const;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, body);
      // Input may arrive while the Native write is in flight. Roll back in
      // this same queue before any later local writes and do not rehydrate.
      if (!canApply() || version !== localWriteVersion) {
        if (current === null) await AsyncStorage.removeItem(STORAGE_KEY);
        else await AsyncStorage.setItem(STORAGE_KEY, current);
        return 'blocked' as const;
      }
      return 'adopted' as const;
    } catch (error) {
      console.warn('[iCloud] Remote adoption failed; pre-sync backup retained.', error);
      return 'write-failed' as const;
    }
  });
  rhythmStateSaveQueue = write.catch(() => undefined);
  return write;
}
