import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistedState } from '../types';
import { STORAGE_KEY } from './rhythmState';

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
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Rhythm state could not be saved. The previous saved state was left untouched.', error);
    throw error;
  }
}
