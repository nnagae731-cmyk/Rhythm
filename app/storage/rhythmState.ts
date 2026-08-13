import { DeparturePlan, PersistedState } from '../types';
import { todayInputValue } from '../features/tasks/taskUtils';
import { DesignMode } from '../theme';

export const STORAGE_KEY = 'rhythm-mvp-state-v1';

export const initialPlan: DeparturePlan = {
  title: '',
  planMode: 'calendar_only',
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
  return mode === 'minimal' || mode === 'dark' || mode === 'chic' ? mode : 'chic';
}
