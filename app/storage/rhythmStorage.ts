import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistedState } from '../types';
import { STORAGE_KEY } from './rhythmState';

// AsyncStorage writes for the main state can be initiated by both the
// debounced persistence effect and the AppState background flush. Keep those
// writes in one in-process queue so an older write cannot complete after a
// newer one and become the final value for STORAGE_KEY.
let rhythmStateSaveQueue: Promise<unknown> = Promise.resolve();

export async function loadRhythmState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Rhythm storage has an unsupported root value.');
    }
    return parsed as Partial<PersistedState>;
  } catch (error) {
    console.warn('Rhythm state could not be read. Existing storage was left untouched.', error);
    throw error;
  }
}

export async function saveRhythmState(state: PersistedState) {
  const serialized = JSON.stringify(state);
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
}
