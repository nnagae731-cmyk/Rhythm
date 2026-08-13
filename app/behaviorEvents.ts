export type BehaviorEventType =
  | 'notification_scheduled'
  | 'notification_action'
  | 'task_completed'
  | 'task_completion_reverted'
  | 'routine_state_changed'
  | 'routine_deactivated'
  | 'focus_started'
  | 'focus_stopped'
  | 'focus_completed'
  | 'departure_preparation_started'
  | 'departure_started';

export type BehaviorEventSource = 'manual' | 'notification' | 'system';
export type NotificationAction = 'completed' | 'snoozed';

export type BehaviorEvent = {
  id: string;
  eventKey: string;
  type: BehaviorEventType;
  occurredAt: string;
  source: BehaviorEventSource;
  version: 1;
  taskId?: string;
  taskTitleSnapshot?: string;
  departurePlanId?: string;
  departurePlanTitleSnapshot?: string;
  departurePlanDate?: string;
  notificationInstanceId?: string;
  notificationAction?: NotificationAction;
  scheduledAt?: string;
  actualAt?: string;
  taskCompletionDate?: string;
  /** Stable identity for routine history. Kept even when the task is deleted. */
  routineId?: string;
  routineTitleSnapshot?: string;
  /** Local target day (YYYY-MM-DD) for a routine completion or its undo. */
  routineTargetDate?: string;
  routineCompleted?: boolean;
  deltaMinutes?: number;
  focusSessionId?: string;
  plannedDurationMinutes?: number;
  actualDurationMinutes?: number;
  focusStartedAt?: string;
};

export function calculateDeltaMinutes(scheduledAt: Date | string, actualAt: Date | string): number {
  return Math.round((new Date(actualAt).getTime() - new Date(scheduledAt).getTime()) / 60_000);
}

function event(eventKey: string, type: BehaviorEventType, source: BehaviorEventSource, occurredAt: Date, fields: Omit<Partial<BehaviorEvent>, 'id' | 'eventKey' | 'type' | 'source' | 'occurredAt' | 'version'> = {}): BehaviorEvent {
  return { id: eventKey, eventKey, type, source, occurredAt: occurredAt.toISOString(), version: 1, ...fields };
}

export function appendBehaviorEvent(current: BehaviorEvent[], next: BehaviorEvent): BehaviorEvent[] {
  return current.some((item) => item.eventKey === next.eventKey) ? current : [next, ...current].slice(0, 5000);
}

export function appendBehaviorEvents(current: BehaviorEvent[], next: BehaviorEvent[]): BehaviorEvent[] {
  return next.reduce(appendBehaviorEvent, current);
}

export function createTaskCompletedBehaviorEvent(args: { taskId: string; taskTitle: string; occurredAt: Date; source?: BehaviorEventSource; routineId?: string; routineTitle?: string; routineTargetDate?: string }): BehaviorEvent {
  return event(`task_completed:${args.taskId}`, 'task_completed', args.source ?? 'manual', args.occurredAt, {
    taskId: args.taskId,
    taskTitleSnapshot: args.taskTitle,
    actualAt: args.occurredAt.toISOString(),
    routineId: args.routineId,
    routineTitleSnapshot: args.routineTitle,
    routineTargetDate: args.routineTargetDate,
  });
}

/** Records an explicit undo so daily routine history can use the last valid state. */
export function createTaskCompletionRevertedBehaviorEvent(args: { taskId: string; taskTitle: string; occurredAt: Date; completedAt?: string; source?: BehaviorEventSource; routineId?: string; routineTitle?: string; routineTargetDate?: string }): BehaviorEvent {
  return event(`task_completion_reverted:${args.taskId}:${args.occurredAt.getTime()}`, 'task_completion_reverted', args.source ?? 'manual', args.occurredAt, {
    taskId: args.taskId,
    taskTitleSnapshot: args.taskTitle,
    actualAt: args.occurredAt.toISOString(),
    taskCompletionDate: args.completedAt,
    routineId: args.routineId,
    routineTitleSnapshot: args.routineTitle,
    routineTargetDate: args.routineTargetDate,
  });
}

export function createRoutineDeactivatedBehaviorEvent(args: { routineId: string; routineTitle: string; taskId?: string; occurredAt: Date; targetDate: string }): BehaviorEvent {
  return event(`routine_deactivated:${args.routineId}:${args.occurredAt.getTime()}`, 'routine_deactivated', 'manual', args.occurredAt, {
    taskId: args.taskId,
    taskTitleSnapshot: args.routineTitle,
    routineId: args.routineId,
    routineTitleSnapshot: args.routineTitle,
    routineTargetDate: args.targetDate,
  });
}

/** A non-award event that preserves the last same-day routine state even after its task is deleted. */
export function createRoutineStateChangedBehaviorEvent(args: { taskId: string; routineId: string; routineTitle: string; occurredAt: Date; targetDate: string; completed: boolean; source?: BehaviorEventSource }): BehaviorEvent {
  return event(`routine_state:${args.taskId}:${args.targetDate}:${args.occurredAt.getTime()}`, 'routine_state_changed', args.source ?? 'manual', args.occurredAt, {
    taskId: args.taskId,
    taskTitleSnapshot: args.routineTitle,
    routineId: args.routineId,
    routineTitleSnapshot: args.routineTitle,
    routineTargetDate: args.targetDate,
    routineCompleted: args.completed,
  });
}

export function createNotificationScheduledEvent(args: { notificationInstanceId: string; taskId: string; taskTitle: string; scheduledAt: Date; occurredAt: Date }): BehaviorEvent {
  return event(`notification_scheduled:${args.notificationInstanceId}`, 'notification_scheduled', 'system', args.occurredAt, { notificationInstanceId: args.notificationInstanceId, taskId: args.taskId, taskTitleSnapshot: args.taskTitle, scheduledAt: args.scheduledAt.toISOString() });
}

export function createNotificationActionEvent(args: { notificationInstanceId: string; action: NotificationAction; taskId?: string; taskTitle?: string; departurePlanId?: string; departurePlanTitle?: string; departurePlanDate?: string; actualAt: Date; scheduledAt?: string }): BehaviorEvent {
  return event(`notification_action:${args.notificationInstanceId}:${args.action}`, 'notification_action', 'notification', args.actualAt, {
    notificationInstanceId: args.notificationInstanceId,
    notificationAction: args.action,
    taskId: args.taskId,
    taskTitleSnapshot: args.taskTitle,
    departurePlanId: args.departurePlanId,
    departurePlanTitleSnapshot: args.departurePlanTitle,
    departurePlanDate: args.departurePlanDate,
    actualAt: args.actualAt.toISOString(),
    scheduledAt: args.scheduledAt,
    deltaMinutes: args.scheduledAt ? calculateDeltaMinutes(args.scheduledAt, args.actualAt) : undefined,
  });
}

export function createDeparturePreparationStartedEvent(args: { planId: string; planTitle: string; planDate: string; scheduledAt: Date; actualAt: Date; source?: BehaviorEventSource }): BehaviorEvent {
  return event(`departure_preparation_started:${args.planId}:${args.planDate}`, 'departure_preparation_started', args.source ?? 'manual', args.actualAt, { departurePlanId: args.planId, departurePlanTitleSnapshot: args.planTitle, departurePlanDate: args.planDate, scheduledAt: args.scheduledAt.toISOString(), actualAt: args.actualAt.toISOString(), deltaMinutes: calculateDeltaMinutes(args.scheduledAt, args.actualAt) });
}

export function createDepartureStartedEvent(args: { planId: string; planTitle: string; planDate: string; scheduledAt: Date; actualAt: Date; source?: BehaviorEventSource }): BehaviorEvent {
  return event(`departure_started:${args.planId}:${args.planDate}`, 'departure_started', args.source ?? 'manual', args.actualAt, { departurePlanId: args.planId, departurePlanTitleSnapshot: args.planTitle, departurePlanDate: args.planDate, scheduledAt: args.scheduledAt.toISOString(), actualAt: args.actualAt.toISOString(), deltaMinutes: calculateDeltaMinutes(args.scheduledAt, args.actualAt) });
}

export function createFocusStartedEvent(args: { sessionId: string; taskId?: string; taskTitle?: string; plannedDurationMinutes: number; occurredAt: Date }): BehaviorEvent {
  return event(`focus_started:${args.sessionId}`, 'focus_started', 'manual', args.occurredAt, { focusSessionId: args.sessionId, taskId: args.taskId, taskTitleSnapshot: args.taskTitle, plannedDurationMinutes: args.plannedDurationMinutes, focusStartedAt: args.occurredAt.toISOString() });
}

export function createFocusStoppedEvent(args: { sessionId: string; taskId?: string; taskTitle?: string; plannedDurationMinutes: number; focusStartedAt: Date; actualAt: Date }): BehaviorEvent {
  const actualDurationMinutes = Math.max(0, Math.round((args.actualAt.getTime() - args.focusStartedAt.getTime()) / 60_000));
  return event(`focus_finished:${args.sessionId}`, 'focus_stopped', 'manual', args.actualAt, { focusSessionId: args.sessionId, taskId: args.taskId, taskTitleSnapshot: args.taskTitle, plannedDurationMinutes: args.plannedDurationMinutes, focusStartedAt: args.focusStartedAt.toISOString(), actualAt: args.actualAt.toISOString(), actualDurationMinutes });
}

export function createFocusCompletedBehaviorEvent(args: { sessionId: string; taskId?: string; taskTitle?: string; plannedDurationMinutes: number; focusStartedAt: Date; actualAt: Date }): BehaviorEvent {
  const actualDurationMinutes = Math.max(0, Math.round((args.actualAt.getTime() - args.focusStartedAt.getTime()) / 60_000));
  return event(`focus_finished:${args.sessionId}`, 'focus_completed', 'system', args.actualAt, { focusSessionId: args.sessionId, taskId: args.taskId, taskTitleSnapshot: args.taskTitle, plannedDurationMinutes: args.plannedDurationMinutes, focusStartedAt: args.focusStartedAt.toISOString(), actualAt: args.actualAt.toISOString(), actualDurationMinutes });
}
