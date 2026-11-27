// Frozen taskUtils implementations from main 1dcdfa6, captured BEFORE consolidation.
// Kept only as an independent regression oracle; production never imports this fixture.
import type { RepeatRule, Task } from '../../types';
export type TaskCompletionResult = { tasks: Task[]; newlyCompleted: Task[] };

export function parseClock(clock: string) {
  const [rawHours = '0', rawMinutes = '0'] = clock.split(':');
  const hours = Math.min(23, Math.max(0, Number(rawHours) || 0));
  const minutes = Math.min(59, Math.max(0, Number(rawMinutes) || 0));
  return hours * 60 + minutes;
}

export function dateForClock(clock: string) {
  const date = new Date();
  const total = parseClock(clock);
  date.setHours(Math.floor(total / 60), total % 60, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date;
}

export function dateKey(value: Date | string = new Date()) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateForReminder(day: string, clock: string) {
  const [year = new Date().getFullYear(), month = 1, date = 1] = day.split('-').map(Number);
  const total = parseClock(clock);
  const result = new Date(year, (month || 1) - 1, date || 1, Math.floor(total / 60), total % 60, 0, 0);
  return result;
}

export function todayInputValue(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

export function advanceDateValue(value: string | undefined, rule: RepeatRule) {
  const base = value ? dateForReminder(value, '12:00') : new Date();
  if (rule === 'monthly') {
    // Keep the day when it exists in the next month; otherwise clamp to that
    // month's final day (31st -> 28/29/30 instead of overflowing forward).
    const day = base.getDate();
    const nextMonth = new Date(base.getFullYear(), base.getMonth() + 1, 1, base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
    const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    nextMonth.setDate(Math.min(day, lastDay));
    return dateKey(nextMonth);
  }
  else base.setDate(base.getDate() + (rule === 'weekly' ? 7 : 1));
  if (rule === 'weekdays') {
    while (base.getDay() === 0 || base.getDay() === 6) base.setDate(base.getDate() + 1);
  }
  return dateKey(base);
}

export function deadlineLabel(task: Task) {
  if (!task.deadlineDate) return undefined;
  const date = dateForReminder(task.deadlineDate, task.deadlineTime ?? '23:59');
  const difference = date.getTime() - Date.now();
  if (difference < 0) return { text: '期限超過', overdue: true };
  const hours = Math.floor(difference / 3_600_000);
  if (hours < 24) return { text: `残り${Math.max(1, hours)}時間`, overdue: false };
  const days = Math.ceil(hours / 24);
  return { text: `あと${days}日`, overdue: false };
}

export function getTargetDate(task: Task) {
  if (!task.deadlineDate) return undefined;
  return dateForReminder(task.deadlineDate, task.deadlineTime ?? '23:59');
}

export function formatLiveDate(now: Date) {
  return `${now.getMonth() + 1}月${now.getDate()}日 ${['日', '月', '火', '水', '木', '金', '土'][now.getDay()]}曜日`;
}

export function formatLiveTime(now: Date) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function countdownToClock(clock: string, now: Date) {
  const target = dateForClock(clock);
  const minutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `あと${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `あと${hours}時間` : `あと${hours}時間${rest}分`;
}

export function isOccurrenceAfterToday(scheduledDate: string, now: Date) {
  return scheduledDate > dateKey(now);
}

export function advanceDateBySteps(value: string | undefined, rule: RepeatRule, steps: number) {
  let current = value;
  for (let index = 0; index < steps; index += 1) current = advanceDateValue(current, rule);
  return current;
}

export function nextFutureOccurrence(startDate: string | undefined, rule: RepeatRule, _scheduledTime: string | undefined, now: Date) {
  let candidate = advanceDateValue(startDate ?? dateKey(now), rule);
  let steps = 1;
  for (let index = 0; index < 5000 && !isOccurrenceAfterToday(candidate, now); index += 1) {
    const next = advanceDateValue(candidate, rule);
    if (next === candidate) break;
    candidate = next;
    steps += 1;
  }
  return { scheduledDate: candidate, steps };
}

export function repeatSeriesKey(task: Task) {
  return task.routineId ? `routine:${task.routineId}` : `repeat:${task.createdAt ?? task.id}`;
}

export function completeTasksWithRepeats(current: Task[], ids: string[]) {
  const completedAt = new Date().toISOString();
  const now = new Date();
  const nextTasks: Task[] = [];
  const updated = current.map((task) => {
    if (!ids.includes(task.id) || task.done || task.status === 'skipped') return task;
    const rule = task.repeatRule ?? 'none';
    if (rule !== 'none' && !(task.routineId && task.routineEndedAt)) {
      const { scheduledDate, steps } = nextFutureOccurrence(task.scheduledDate, rule, task.scheduledTime, now);
      const seriesKey = repeatSeriesKey(task);
      const alreadyExists = current.some((candidate) => candidate.id !== task.id && repeatSeriesKey(candidate) === seriesKey && (candidate.repeatRule ?? 'none') === rule && candidate.scheduledDate === scheduledDate)
        || nextTasks.some((candidate) => repeatSeriesKey(candidate) === seriesKey && (candidate.repeatRule ?? 'none') === rule && candidate.scheduledDate === scheduledDate);
      if (!alreadyExists) nextTasks.push({
        ...task,
        origin: undefined,
        id: `${Date.now()}-${task.id}-${Math.random().toString(16).slice(2)}`,
        createdAt: task.createdAt ?? task.id,
        done: false,
        status: 'active',
        skippedAt: undefined,
        completedAt: undefined,
        deadlineDate: task.deadlineDate ? advanceDateBySteps(task.deadlineDate, rule, steps) : undefined,
        remindDate: task.remindDate ? advanceDateBySteps(task.remindDate, rule, steps) : undefined,
        scheduledDate,
        subtasks: task.subtasks?.map((item, index) => ({ ...item, order: index, done: false })),
        listItems: task.listItems?.map((item, index) => ({ ...item, id: `${Date.now()}-${task.id}-list-${index}-${Math.random().toString(16).slice(2)}`, order: index, checked: false })),
      });
    }
    return { ...task, done: true, status: 'completed' as const, skippedAt: undefined, completedAt, subtasks: task.subtasks?.map((item) => ({ ...item, done: true })) };
  });
  return [...nextTasks, ...updated];
}

export function completeTasksAndCollectEvents(current: Task[], ids: string[]): TaskCompletionResult {
  const eligibleIds = new Set(current.filter((task) => ids.includes(task.id) && !task.done && task.status !== 'skipped').map((task) => task.id));
  if (eligibleIds.size === 0) return { tasks: current, newlyCompleted: [] };
  const tasks = completeTasksWithRepeats(current, ids);
  return {
    tasks,
    newlyCompleted: tasks.filter((task) => eligibleIds.has(task.id) && task.done && task.completedAt),
  };
}
