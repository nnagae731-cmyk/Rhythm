import { normalizeTaskDateKey } from '../schedule/scheduleConflict';
import { RepeatRule, Task } from '../../types';
import * as Calendar from 'expo-calendar';
import { advanceDateValue, dateForReminder, dateKey, shiftDateKey } from '../schedule/dateTimeUtils';

export function getTaskStatus(task: Task): 'active' | 'completed' | 'skipped' {
  return task.status ?? (task.done ? 'completed' : 'active');
}

export function isTaskSkippedOnDate(task: Task, day: string) {
  return getTaskStatus(task) === 'skipped' && Boolean(task.skippedAt) && dateKey(task.skippedAt!) === day;
}

export function getTodayRemainingRoutines(items: Task[], day: string) {
  const latestByRoutine = new Map<string, Task>();
  items.forEach((task) => {
    if (!task.isRoutine || task.done || getTaskStatus(task) === 'skipped' || task.routineEndedAt) return;
    const scheduled = normalizeTaskDateKey(task.scheduledDate);
    if (scheduled && scheduled !== day) return;
    const key = task.routineId ?? task.id;
    const current = latestByRoutine.get(key);
    if (!current || (task.createdAt ?? '') > (current.createdAt ?? '')) latestByRoutine.set(key, task);
  });
  return [...latestByRoutine.values()];
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
  if (task.routineId) return `routine:${task.routineId}`;
  // Generated ordinary repeat instances preserve createdAt. This gives the
  // series a stable identity without merging unrelated same-title tasks.
  return `repeat:${task.createdAt ?? task.id}`;
}

export function normalizeRoutineResumeDate(value: string | undefined, templateScheduledDate: string | undefined, resumedScheduledDate: string) {
  if (!value) return undefined;
  if (!templateScheduledDate) return value < resumedScheduledDate ? resumedScheduledDate : value;
  const offset = Math.round((dateForReminder(value, '12:00').getTime() - dateForReminder(templateScheduledDate, '12:00').getTime()) / 86_400_000);
  return shiftDateKey(resumedScheduledDate, Math.max(0, offset));
}

export function routineResumeScheduledDate(template: Task, now: Date) {
  const today = dateKey(now);
  if (template.repeatRule !== 'weekdays') return today;
  const weekday = dateForReminder(today, '12:00').getDay();
  return weekday === 0 || weekday === 6 ? advanceDateValue(today, 'weekdays') : today;
}

export function buildNextRepeatedTask(task: Task, current: Task[], now = new Date()): Task | undefined {
  const rule = task.repeatRule ?? 'none';
  // Deactivated routines keep their historical repeatRule for analytics, but
  // must never create a new occurrence when an old instance is completed.
  if (rule === 'none' || (task.routineId && task.routineEndedAt)) return undefined;
  const { scheduledDate, steps } = nextFutureOccurrence(task.scheduledDate, rule, task.scheduledTime, now);
  const routineId = task.routineId ?? (task.isRoutine ? task.id : undefined);
  const seriesKey = repeatSeriesKey(task);
  if (current.some((candidate) => (
    candidate.id !== task.id
    && repeatSeriesKey(candidate) === seriesKey
    && (candidate.repeatRule ?? 'none') === rule
    && candidate.scheduledDate === scheduledDate
  ))) return undefined;
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    ...task,
    id: `${stamp}-${task.id}`,
    createdAt: task.createdAt ?? task.id,
    origin: undefined,
    done: false,
    status: 'active',
    skippedAt: undefined,
    completedAt: undefined,
    deadlineDate: task.deadlineDate ? advanceDateBySteps(task.deadlineDate, rule, steps) : undefined,
    remindDate: task.remindAt ? advanceDateBySteps(task.remindDate ?? task.scheduledDate ?? dateKey(now), rule, steps) : undefined,
    scheduledDate,
    scheduledTime: task.scheduledTime,
    isRoutine: task.isRoutine,
    routineId,
    subtasks: task.subtasks?.map((item, index) => ({ ...item, order: index, done: false })),
    listItems: task.listItems?.map((item, index) => ({ ...item, id: `${stamp}-list-${index}`, order: index, checked: false })),
  };
}

export function calendarEventOccurrenceKey(event: Calendar.Event) {
  const calendarId = String((event as Calendar.Event & { calendarId?: string }).calendarId ?? '');
  const start = new Date(event.startDate).toISOString();
  const end = event.endDate ? new Date(event.endDate).toISOString() : '';
  return `${calendarId}:${String(event.id)}:${start}:${end}`;
}

export function normalizeCalendarTitle(value: string | undefined) {
  return (value ?? '').trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}

export type TaskCompletionResult = { tasks: Task[]; newlyCompleted: Task[] };

export function completeTasksWithRepeats(current: Task[], ids: string[]) {
  const completedAt = new Date().toISOString();
  const nextTasks: Task[] = [];
  const updated = current.map((task) => {
    if (!ids.includes(task.id) || task.done || getTaskStatus(task) === 'skipped') return task;
    const rule = task.repeatRule ?? 'none';
    if (rule !== 'none') {
      const nextTask = buildNextRepeatedTask(task, [...current, ...nextTasks]);
      if (nextTask) nextTasks.push(nextTask);
    }
    return { ...task, done: true, status: 'completed' as const, skippedAt: undefined, completedAt, subtasks: task.subtasks?.map((item) => ({ ...item, done: true })) };
  });
  return [...nextTasks, ...updated];
}

export function completeTasksAndCollectEvents(current: Task[], ids: string[]): TaskCompletionResult {
  const eligibleIds = new Set(current.filter((task) => ids.includes(task.id) && !task.done && getTaskStatus(task) !== 'skipped').map((task) => task.id));
  if (eligibleIds.size === 0) return { tasks: current, newlyCompleted: [] };
  const tasks = completeTasksWithRepeats(current, ids);
  return {
    tasks,
    newlyCompleted: tasks.filter((task) => eligibleIds.has(task.id) && task.done && task.completedAt),
  };
}
