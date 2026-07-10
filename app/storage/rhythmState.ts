import { DeparturePlan, PersistedState } from '../types';
import { todayInputValue } from '../features/tasks/taskUtils';
import { DesignMode } from '../theme';

export const STORAGE_KEY = 'rhythm-mvp-state-v1';

export const initialPlan: DeparturePlan = {
  title: '大切な予定',
  date: todayInputValue(),
  arrival: '10:00',
  travelMinutes: 40,
  preparationMinutes: 30,
  bufferMinutes: 10,
};

export function normalizePersistedState(saved: Partial<PersistedState>) {
  return saved;
}

export function normalizeDesignMode(mode: PersistedState['designMode'] | undefined): DesignMode {
  return mode === 'minimal' || mode === 'chic' ? mode : 'chic';
}
