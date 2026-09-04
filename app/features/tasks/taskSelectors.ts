import { DeparturePlan, Task } from '../../types';
import { dateForReminder, dateKey } from './taskUtils';
import { getDeparturePlanMode, getPlanScheduledTime, isDepartureReminderPlan } from '../departure/departurePlanMode';
import { getDepartureMoments } from '../departure/departureUtils';

export type UpcomingItem = {
  id: string;
  title: string;
  sourceType: 'task' | 'departurePlan';
  scheduledAt: Date;
  actionableAt?: Date;
  /** Primary time shown to the user; Premium arrival-reverse plans use leaveAt. */
  displayAt: Date;
  /** Arrival time retained so the Home UI can explain an arrival-reverse choice. */
  arrivalAt?: Date;
  leaveAt?: Date;
  source: Task | DeparturePlan;
};

const priorityRank: Record<Task['priority'], number> = { 高: 0, 中: 1, 低: 2 };

export function taskDeadlineAt(task: Task) {
  return task.deadlineDate ? dateForReminder(task.deadlineDate, task.deadlineTime ?? '23:59') : undefined;
}

function taskStart(task: Task) {
  return task.scheduledDate && task.scheduledTime ? dateForReminder(task.scheduledDate, task.scheduledTime) : undefined;
}

export function taskActionableAt(task: Task) {
  const start = taskStart(task);
  const deadline = taskDeadlineAt(task);
  const actionableDeadline = task.navigationEnabled === true && deadline
    ? new Date(deadline.getTime() - ((task.preparationMinutes ?? 30) + (task.travelMinutes ?? 30) + (task.bufferMinutes ?? 10)) * 60_000)
    : deadline;
  if (!start) return actionableDeadline;
  if (!actionableDeadline) return start;
  return start.getTime() < actionableDeadline.getTime() ? start : actionableDeadline;
}

/** Sorts an already-filtered "now" candidate list using the shared Home/Widget ranking. */
export function selectCurrentTasks(candidates: Task[], now = new Date()) {
  return candidates
    .map((task, index) => {
      const deadline = taskDeadlineAt(task);
      const start = taskStart(task);
      const actionable = taskActionableAt(task);
      const overdue = Boolean((deadline && deadline.getTime() < now.getTime()) || (actionable && actionable.getTime() <= now.getTime()));
      const near = Boolean(actionable && actionable.getTime() > now.getTime() && actionable.getTime() <= now.getTime() + 2 * 60 * 60_000);
      const today = Boolean(actionable && dateKey(actionable) === dateKey(now));
      const temporalRank = overdue ? 0 : near ? 1 : today ? 2 : 3;
      const registrationTime = task.createdAt ? Date.parse(task.createdAt) : Number.MAX_SAFE_INTEGER;
      const targetTime = actionable?.getTime() ?? start?.getTime() ?? deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return { task, index, temporalRank, targetTime, registrationTime };
    })
    .sort((a, b) => a.temporalRank - b.temporalRank
      || a.targetTime - b.targetTime
      || priorityRank[a.task.priority] - priorityRank[b.task.priority]
      || (a.registrationTime - b.registrationTime)
      || a.index - b.index).map(({ task }) => task);
}

/** Selects the highest-ranked current task. Scope is intentionally owned by callers. */
export function selectCurrentTask(candidates: Task[], now = new Date()) {
  return selectCurrentTasks(candidates, now)[0];
}

export function planScheduledAt(plan: DeparturePlan) {
  return dateForReminder(plan.date, plan.allDay ? '00:00' : getPlanScheduledTime(plan) || '00:00');
}

function planComparisonAt(plan: DeparturePlan, canShowArrivalReverseCountdown: boolean) {
  const mode = getDeparturePlanMode(plan);
  if (mode === 'arrival_reverse' && canShowArrivalReverseCountdown && !plan.allDay) return getDepartureMoments(plan).leave;
  return planScheduledAt(plan);
}

function planDisplayTimes(plan: DeparturePlan, canShowArrivalReverseCountdown: boolean) {
  const arrivalAt = !plan.allDay && getDeparturePlanMode(plan) === 'arrival_reverse' ? dateForReminder(plan.date, plan.arrival) : undefined;
  const leaveAt = arrivalAt && canShowArrivalReverseCountdown ? getDepartureMoments(plan).leave : undefined;
  return {
    displayAt: leaveAt ?? planScheduledAt(plan),
    ...(arrivalAt ? { arrivalAt } : {}),
    ...(leaveAt ? { leaveAt } : {}),
  };
}

/** Normalizes task and departure-plan times so Home and Widget use the same comparison. */
export function normalizeUpcomingItems(tasks: Task[], plans: DeparturePlan[], now = new Date(), canShowArrivalReverseCountdown = true): UpcomingItem[] {
  const taskItems = tasks
    .filter((task) => !task.done && task.status !== 'skipped' && task.scheduledDate && task.scheduledTime)
    .map((task) => {
      const scheduledAt = taskStart(task)!;
      return { id: task.id, title: task.title, sourceType: 'task' as const, scheduledAt, actionableAt: taskActionableAt(task), displayAt: scheduledAt, source: task };
    });
  const planItems = plans
    // All-day plans remain available to calendar/today views, but they do not
    // have a meaningful clock time for the "next" timed item.
    .filter((plan) => Boolean(plan.date) && !plan.allDay)
    .map((plan) => {
      const scheduledAt = planScheduledAt(plan);
      const mode = getDeparturePlanMode(plan);
      const actionableAt = isDepartureReminderPlan(plan) || (mode === 'arrival_reverse' && canShowArrivalReverseCountdown)
        ? (isDepartureReminderPlan(plan) ? scheduledAt : getDepartureMoments(plan).leave)
        : undefined;
      const displayTimes = planDisplayTimes(plan, canShowArrivalReverseCountdown);
      return { id: plan.id ?? `plan-${plan.date}-${plan.title}`, title: plan.title, sourceType: 'departurePlan' as const, scheduledAt, actionableAt, ...displayTimes, source: plan };
    });
  return [...taskItems, ...planItems].filter((item) => {
    const at = item.actionableAt ?? item.scheduledAt;
    return at.getTime() >= now.getTime();
  });
}

export function selectNextUpcomingItem(tasks: Task[], plans: DeparturePlan[], now = new Date(), canShowArrivalReverseCountdown = true) {
  return normalizeUpcomingItems(tasks, plans, now, canShowArrivalReverseCountdown)
    .sort((a, b) => (a.actionableAt ?? a.scheduledAt).getTime() - (b.actionableAt ?? b.scheduledAt).getTime())[0];
}

export function selectNextUpcomingPlan(plans: DeparturePlan[], now = new Date(), canShowArrivalReverseCountdown = true) {
  return plans
    .filter((plan) => !plan.allDay)
    .filter((plan) => planComparisonAt(plan, canShowArrivalReverseCountdown).getTime() >= now.getTime())
    .sort((a, b) => {
      return planComparisonAt(a, canShowArrivalReverseCountdown).getTime() - planComparisonAt(b, canShowArrivalReverseCountdown).getTime();
    })[0];
}
