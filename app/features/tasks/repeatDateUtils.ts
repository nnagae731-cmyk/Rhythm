import type { RepeatRule, Task } from '../../types';
import { advanceDateValue, dateKey } from '../schedule/dateTimeUtils';

// Both consumers share these verified helpers without a schedule/taskUtils cycle.
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
