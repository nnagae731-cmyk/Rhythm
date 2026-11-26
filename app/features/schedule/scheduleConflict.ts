import type { DeparturePlan, Task } from '../../types';
import { dateForReminder, todayInputValue } from '../tasks/taskUtils';
import { getPlanScheduledTime, isArrivalReversePlan, isDepartureReminderPlan } from '../departure/departurePlanMode';

export function normalizeTaskDateKey(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return undefined;
  return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`;
}

export function normalizePlanDate(day: string | undefined) {
  const match = day?.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`;
  return todayInputValue();
}

export function planDateKey(plan: DeparturePlan) {
  return normalizePlanDate(plan.date);
}

export function isPlanOnDate(plan: DeparturePlan, day: string) {
  return planDateKey(plan) === normalizePlanDate(day);
}

// Current schedule surfaces intentionally exclude routine instances and
// skipped items. History/analysis use their own unfiltered data paths.
export function isRegularVisibleTask(task: Task) {
  return task.isRoutine !== true && task.status !== 'skipped';
}

export type ScheduleConflictKind = 'schedule' | 'preparation' | 'departure';

export type ScheduleConflict = {
  key: string;
  task: Task;
  plan: DeparturePlan;
  kind: ScheduleConflictKind;
  effectiveAt: Date;
  taskStart: Date;
  taskEnd: Date;
};

export function getTaskScheduleInterval(task: Task) {
  const day = normalizeTaskDateKey(task.scheduledDate);
  if (!day || !task.scheduledTime) return undefined;
  const endTime = task.endAt ?? (normalizeTaskDateKey(task.deadlineDate) === day ? task.deadlineTime : undefined);
  if (!endTime) return undefined;
  const start = dateForReminder(day, task.scheduledTime);
  const end = dateForReminder(day, endTime);
  return end.getTime() > start.getTime() ? { start, end } : undefined;
}

export function findScheduleConflict(task: Task, plans: DeparturePlan[], now: Date): ScheduleConflict | undefined {
  if (!isRegularVisibleTask(task) || task.done) return undefined;
  const interval = getTaskScheduleInterval(task);
  const taskDay = normalizeTaskDateKey(task.scheduledDate);
  if (!interval || !taskDay) return undefined;
  let best: ScheduleConflict | undefined;
  for (const plan of plans) {
    if (!plan.id || plan.allDay || planDateKey(plan) !== taskDay) continue;
    const scheduledTime = getPlanScheduledTime(plan);
    if (!scheduledTime) continue;
    const planStart = dateForReminder(taskDay, scheduledTime);
    if (planStart.getTime() <= now.getTime() && !isArrivalReversePlan(plan)) continue;
    const planEnd = plan.endAt && /^\d{2}:\d{2}$/.test(plan.endAt)
      ? dateForReminder(plan.endDate ?? taskDay, plan.endAt)
      : planStart;
    const moments = isArrivalReversePlan(plan) ? getDepartureMoments({ ...plan, date: taskDay }) : undefined;
    const boundaries: Array<{ kind: ScheduleConflictKind; at: Date }> = [
      { kind: 'schedule', at: planStart },
      ...(moments ? [{ kind: 'preparation' as const, at: moments.prepare }, { kind: 'departure' as const, at: moments.leave }] : []),
    ];
    const directOverlap = planEnd.getTime() > planStart.getTime()
      && interval.start.getTime() < planEnd.getTime()
      && interval.end.getTime() > planStart.getTime();
    const boundary = boundaries
      .filter(({ at }) => interval.start.getTime() < at.getTime() && interval.end.getTime() > at.getTime())
      .sort((left, right) => left.at.getTime() - right.at.getTime())[0];
    const match = directOverlap && !isArrivalReversePlan(plan)
      ? { kind: 'schedule' as const, at: planStart }
      : boundary;
    if (!match || (match.at.getTime() <= now.getTime() && planEnd.getTime() <= now.getTime())) continue;
    const candidate = {
      key: `${task.id}:${plan.id}:${interval.start.toISOString()}:${interval.end.toISOString()}:${match.kind}:${match.at.toISOString()}`,
      task,
      plan,
      kind: match.kind,
      effectiveAt: match.at,
      taskStart: interval.start,
      taskEnd: interval.end,
    };
    if (!best
      || candidate.effectiveAt.getTime() < best.effectiveAt.getTime()
      || (candidate.effectiveAt.getTime() === best.effectiveAt.getTime() && String(candidate.plan.id).localeCompare(String(best.plan.id)) < 0)) {
      best = candidate;
    }
  }
  return best;
}

export type ScheduleSwitchCandidate = {
  task: Task;
  plan: DeparturePlan;
  kind: ScheduleConflictKind;
  boundaryAt: Date;
  notifyAt: Date;
  key: string;
};

export function findScheduleSwitchCandidate(task: Task, plans: DeparturePlan[], now: Date): ScheduleSwitchCandidate | undefined {
  if (!isRegularVisibleTask(task) || task.done) return undefined;
  const day = normalizeTaskDateKey(task.scheduledDate);
  if (!day || !task.scheduledTime) return undefined;
  const endClock = task.endAt ?? (normalizeTaskDateKey(task.deadlineDate) === day ? task.deadlineTime : undefined);
  if (!endClock) return undefined;
  const taskStart = dateForReminder(day, task.scheduledTime);
  const taskEnd = dateForReminder(day, endClock);
  if (taskEnd.getTime() <= taskStart.getTime()) return undefined;

  let best: ScheduleSwitchCandidate | undefined;
  for (const plan of plans) {
    if (!plan.id || plan.allDay || planDateKey(plan) !== day) continue;
    const scheduledClock = getPlanScheduledTime(plan);
    if (!scheduledClock) continue;
    const scheduledAt = dateForReminder(day, scheduledClock);
    const moments = isArrivalReversePlan(plan) ? getDepartureMoments({ ...plan, date: day }) : undefined;
    const boundaries: Array<{ kind: ScheduleConflictKind; at: Date }> = moments
      ? [
        { kind: 'preparation', at: moments.prepare },
        { kind: 'departure', at: moments.leave },
        { kind: 'schedule', at: moments.arrival },
      ]
      : [{ kind: 'schedule', at: scheduledAt }];
    const boundary = boundaries
      .filter(({ at }) => at.getTime() > now.getTime() && taskStart.getTime() < at.getTime() && taskEnd.getTime() > at.getTime())
      .sort((left, right) => left.at.getTime() - right.at.getTime())[0];
    if (!boundary) continue;
    const notifyAt = new Date(boundary.at.getTime() - 15 * 60_000);
    if (notifyAt.getTime() <= now.getTime()) continue;
    const key = `${task.id}:${plan.id}:${boundary.kind}:${boundary.at.toISOString()}`;
    const candidate = { task, plan, kind: boundary.kind, boundaryAt: boundary.at, notifyAt, key };
    if (!best
      || candidate.boundaryAt.getTime() < best.boundaryAt.getTime()
      || (candidate.boundaryAt.getTime() === best.boundaryAt.getTime() && String(candidate.plan.id).localeCompare(String(best.plan.id)) < 0)) {
      best = candidate;
    }
  }
  return best;
}

export function getDepartureMoments(plan: DeparturePlan) {
  const arrival = dateForReminder(planDateKey(plan), plan.arrival);
  const leave = new Date(arrival.getTime() - (plan.travelMinutes + plan.bufferMinutes) * 60_000);
  const prepare = new Date(leave.getTime() - plan.preparationMinutes * 60_000);
  return { arrival, leave, prepare };
}

export function getPlanCountdownAt(plan: DeparturePlan) {
  return isDepartureReminderPlan(plan)
    ? dateForReminder(planDateKey(plan), getPlanScheduledTime(plan))
    : getDepartureMoments(plan).leave;
}
