import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistedState } from '../types';
import { STORAGE_KEY } from './rhythmState';

export async function loadRhythmState() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as Partial<PersistedState>;
}

export async function saveRhythmState(state: PersistedState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
