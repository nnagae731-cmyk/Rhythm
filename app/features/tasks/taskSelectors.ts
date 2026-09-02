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
  source: Task | DeparturePlan;
};

const priorityRank: Record<Task['priority'], number> = { 高: 0, 中: 1, 低: 2 };

function taskDeadline(task: Task) {
  return task.deadlineDate ? dateForReminder(task.deadlineDate, task.deadlineTime ?? '23:59') : undefined;
}

function taskStart(task: Task) {
  return task.scheduledDate && task.scheduledTime ? dateForReminder(task.scheduledDate, task.scheduledTime) : undefined;
}

function taskActionableAt(task: Task) {
  const start = taskStart(task);
  const deadline = taskDeadline(task);
  const riskAt = deadline
    ? new Date(deadline.getTime() - ((task.preparationMinutes ?? 30) + (task.travelMinutes ?? 30) + (task.bufferMinutes ?? 10)) * 60_000)
    : undefined;
  if (!start) return riskAt;
  if (!riskAt) return start;
  return start.getTime() < riskAt.getTime() ? start : riskAt;
}

/** Selects from an already-filtered "now" candidate list. Scope is intentionally owned by callers. */
export function selectCurrentTask(candidates: Task[], now = new Date()) {
  return candidates
    .map((task, index) => {
      const deadline = taskDeadline(task);
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
      || priorityRank[a.task.priority] - priorityRank[b.task.priority]
      || a.targetTime - b.targetTime
      || (a.registrationTime - b.registrationTime)
      || a.index - b.index)[0]?.task;
}

function planScheduledAt(plan: DeparturePlan) {
  return dateForReminder(plan.date, plan.allDay ? '00:00' : getPlanScheduledTime(plan) || '00:00');
}

/** Normalizes task and departure-plan times so Home and Widget use the same comparison. */
export function normalizeUpcomingItems(tasks: Task[], plans: DeparturePlan[], now = new Date()): UpcomingItem[] {
  const taskItems = tasks
    .filter((task) => !task.done && task.status !== 'skipped' && task.scheduledDate && task.scheduledTime)
    .map((task) => {
      const scheduledAt = taskStart(task)!;
      return { id: task.id, title: task.title, sourceType: 'task' as const, scheduledAt, actionableAt: taskActionableAt(task), source: task };
    });
  const planItems = plans
    .filter((plan) => Boolean(plan.date))
    .map((plan) => {
      const scheduledAt = planScheduledAt(plan);
      const mode = getDeparturePlanMode(plan);
      const actionableAt = !plan.allDay && (isDepartureReminderPlan(plan) || mode === 'arrival_reverse')
        ? (isDepartureReminderPlan(plan) ? scheduledAt : getDepartureMoments(plan).leave)
        : undefined;
      return { id: plan.id ?? `plan-${plan.date}-${plan.title}`, title: plan.title, sourceType: 'departurePlan' as const, scheduledAt, actionableAt, source: plan };
    });
  return [...taskItems, ...planItems].filter((item) => {
    if (item.sourceType === 'departurePlan' && (item.source as DeparturePlan).allDay) return (item.source as DeparturePlan).date >= dateKey(now);
    const at = item.actionableAt ?? item.scheduledAt;
    return at.getTime() >= now.getTime();
  });
}

export function selectNextUpcomingItem(tasks: Task[], plans: DeparturePlan[], now = new Date()) {
  return normalizeUpcomingItems(tasks, plans, now)
    .sort((a, b) => (a.actionableAt ?? a.scheduledAt).getTime() - (b.actionableAt ?? b.scheduledAt).getTime())[0];
}

export function selectNextUpcomingPlan(plans: DeparturePlan[], now = new Date(), canShowArrivalReverseCountdown = true) {
  return plans
    .filter((plan) => {
      const mode = getDeparturePlanMode(plan);
      if (mode === 'arrival_reverse' && !canShowArrivalReverseCountdown) return false;
      if (plan.allDay) return plan.date >= dateKey(now);
      const at = mode === 'arrival_reverse' && !plan.allDay ? getDepartureMoments(plan).leave : planScheduledAt(plan);
      return at.getTime() >= now.getTime();
    })
    .sort((a, b) => {
      const aAt = (getDeparturePlanMode(a) === 'arrival_reverse' && !a.allDay) ? getDepartureMoments(a).leave : planScheduledAt(a);
      const bAt = (getDeparturePlanMode(b) === 'arrival_reverse' && !b.allDay) ? getDepartureMoments(b).leave : planScheduledAt(b);
      return aAt.getTime() - bAt.getTime();
    })[0];
}
