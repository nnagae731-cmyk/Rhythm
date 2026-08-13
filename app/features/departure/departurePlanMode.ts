import { DeparturePlan } from '../../types';

export type DeparturePlanMode = 'calendar_only' | 'departure_reminder' | 'arrival_reverse';

/**
 * Compatibility layer for schedules saved before planMode existed.
 * Keep this old-field interpretation until historic device data can be
 * explicitly migrated.
 */
export function getDeparturePlanMode(plan: DeparturePlan): DeparturePlanMode {
  if (plan.planMode) return plan.planMode;
  return plan.countdownEnabled === false ? 'calendar_only' : 'arrival_reverse';
}

export function isDepartureReminderPlan(plan: DeparturePlan) {
  return getDeparturePlanMode(plan) === 'departure_reminder';
}

export function isArrivalReversePlan(plan: DeparturePlan) {
  return getDeparturePlanMode(plan) === 'arrival_reverse';
}

/** The one time shown in calendar and direct-departure cards. */
export function getPlanScheduledTime(plan: DeparturePlan) {
  return isDepartureReminderPlan(plan) ? plan.departureTime ?? plan.arrival : plan.arrival;
}

/** Adds new fields without dropping values required by older persisted plans. */
export function normalizeDeparturePlanForSave(plan: DeparturePlan): DeparturePlan {
  const planMode = getDeparturePlanMode(plan);
  const directTime = plan.departureTime ?? plan.arrival;
  return {
    ...plan,
    planMode,
    countdownEnabled: planMode !== 'calendar_only',
    ...(planMode === 'departure_reminder' ? { departureTime: directTime, arrival: directTime } : {}),
  };
}
