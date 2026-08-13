import { BehaviorEvent } from '../../behaviorEvents';
import { Task } from '../../types';

export type RoutineHistory = {
  id: string;
  title: string;
  memberIds: Set<string>;
  active: boolean;
  endedAt?: string;
  createdAt?: string;
};

export type RoutineStatus = 'before' | 'waiting' | 'continuing' | 'resumed_today' | 'resumed_recently' | 'interrupted' | 'deactivated';

export type RoutineInterruptionRecord = {
  interruptionStart: string;
  interruptionEnd: string;
  resumedAt?: string;
  offDays: number;
  postResumeStreak: number;
  isCurrent?: boolean;
};

export type RoutineDisplayDay = {
  key: string;
  label: string;
  completed: boolean;
  future: boolean;
  today: boolean;
  eligible: boolean;
};

export type RoutineInterruptionSummary = {
  status: RoutineStatus;
  statusLabel: string;
  statusCopy: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletedDays: number;
  completionRate: number;
  cycleDays: number;
  completedCycleDays: number;
  displayDays: RoutineDisplayDay[];
  history: RoutineInterruptionRecord[];
  latestRecord?: RoutineInterruptionRecord;
  interruptionsThisMonth: number;
  resumesThisMonth: number;
  deactivatedAt?: string;
};

type RoutineDay = { key: string; completed: boolean; eligible: boolean };

export function localDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateFromLocalKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? new Date().getFullYear(), (month ?? 1) - 1, day ?? 1);
}

export function addLocalDays(key: string, amount: number): string {
  const date = dateFromLocalKey(key);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

export function dayDistance(startKey: string, endKey: string): number {
  return Math.max(0, Math.round((dateFromLocalKey(endKey).getTime() - dateFromLocalKey(startKey).getTime()) / 86_400_000));
}

export function formatRoutineDate(key?: string): string {
  if (!key) return '—';
  const date = dateFromLocalKey(key);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function routineEventDay(event: BehaviorEvent): string {
  return event.routineTargetDate ?? localDateKey(event.type === 'task_completion_reverted' && event.taskCompletionDate ? event.taskCompletionDate : event.occurredAt);
}

function isRoutineStateEvent(event: BehaviorEvent): boolean {
  return event.type === 'routine_state_changed' || event.type === 'task_completed' || event.type === 'task_completion_reverted';
}

export function routineEventsFor(events: BehaviorEvent[], routine: RoutineHistory): BehaviorEvent[] {
  return events.filter((event) => isRoutineStateEvent(event) && (event.routineId === routine.id || (!event.routineId && event.taskId && routine.memberIds.has(event.taskId))));
}

/**
 * Keeps the stable routine id as the primary identity. Older saved tasks did not
 * have one, so their original task ids remain a fallback only for those records.
 */
export function getRoutineHistories(events: BehaviorEvent[], tasks: Task[]): RoutineHistory[] {
  const histories = new Map<string, RoutineHistory>();
  const ensure = (id: string, title: string, active: boolean, createdAt?: string) => {
    const current = histories.get(id) ?? { id, title, memberIds: new Set<string>(), active, createdAt };
    current.title = title || current.title;
    if (createdAt && (!current.createdAt || new Date(createdAt).getTime() < new Date(current.createdAt).getTime())) current.createdAt = createdAt;
    histories.set(id, current);
    return current;
  };

  tasks.filter((task) => task.isRoutine || task.routineId).forEach((task) => {
    const current = ensure(task.routineId ?? task.id, task.title, Boolean(task.isRoutine), task.createdAt);
    current.memberIds.add(task.id);
    if (task.isRoutine) {
      current.active = true;
      current.endedAt = undefined;
    }
    if (task.routineEndedAt && !task.isRoutine) {
      current.active = false;
      current.endedAt = task.routineEndedAt;
    }
  });

  events.filter((event) => event.routineId).sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()).forEach((event) => {
    const current = ensure(event.routineId!, event.routineTitleSnapshot ?? event.taskTitleSnapshot ?? 'ルーティン', true, event.occurredAt);
    if (event.taskId) current.memberIds.add(event.taskId);
    current.title = event.routineTitleSnapshot ?? current.title;
    if (event.type === 'routine_deactivated') {
      current.active = false;
      current.endedAt = event.occurredAt;
    } else if (isRoutineStateEvent(event) && current.endedAt && new Date(event.occurredAt).getTime() > new Date(current.endedAt).getTime()) {
      // Reusing a routineId after turning a routine back on retains its history.
      current.active = true;
      current.endedAt = undefined;
    }
  });

  // Current routine tasks are the authoritative local state. This covers older
  // data where a routine was turned back on without a separate activation event.
  tasks.filter((task) => task.isRoutine).forEach((task) => {
    const current = histories.get(task.routineId ?? task.id);
    if (!current) return;
    current.active = true;
    current.endedAt = undefined;
  });

  return [...histories.values()].sort((left, right) => left.title.localeCompare(right.title, 'ja'));
}

function routineDayCompleted(events: BehaviorEvent[], tasks: Task[], routine: RoutineHistory, dayKey: string): boolean {
  const dayEvents = routineEventsFor(events, routine)
    .filter((event) => routineEventDay(event) === dayKey)
    .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime());
  let completed = false;
  dayEvents.forEach((event) => {
    if (event.type === 'routine_state_changed') completed = Boolean(event.routineCompleted);
    if (event.type === 'task_completed') completed = true;
    if (event.type === 'task_completion_reverted') completed = false;
  });

  const latestPersistedCompletion = tasks
    .filter((task) => routine.memberIds.has(task.id) && task.done && task.completedAt && localDateKey(task.completedAt) === dayKey)
    .sort((left, right) => new Date(left.completedAt!).getTime() - new Date(right.completedAt!).getTime())
    .at(-1);
  const latestEvent = dayEvents.at(-1);
  if (latestPersistedCompletion && (!latestEvent || new Date(latestPersistedCompletion.completedAt!).getTime() >= new Date(latestEvent.occurredAt).getTime())) return true;
  return completed;
}

function routineStartKey(events: BehaviorEvent[], tasks: Task[], routine: RoutineHistory, todayKey: string): string {
  const keys = [
    routine.createdAt ? localDateKey(routine.createdAt) : undefined,
    ...routineEventsFor(events, routine).map(routineEventDay),
    ...tasks.filter((task) => routine.memberIds.has(task.id) && task.createdAt).map((task) => localDateKey(task.createdAt!)),
  ].filter((key): key is string => Boolean(key && key <= todayKey)).sort();
  return keys[0] ?? todayKey;
}

function getDeactivationWindows(events: BehaviorEvent[], tasks: Task[], routine: RoutineHistory, todayKey: string): Array<{ start: string; end?: string }> {
  const changes: Array<{ key: string; active: boolean }> = [];
  events.filter((event) => event.routineId === routine.id && (event.type === 'routine_deactivated' || event.type === 'routine_state_changed'))
    .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())
    .forEach((event) => changes.push({ key: routineEventDay(event), active: event.type !== 'routine_deactivated' }));
  // A task generated after a prior deactivate event is a safe local signal that
  // the same routine id was turned back on, even on older saved data.
  tasks.filter((task) => task.isRoutine && task.routineId === routine.id && task.createdAt)
    .forEach((task) => changes.push({ key: localDateKey(task.createdAt!), active: true }));
  changes.sort((left, right) => left.key.localeCompare(right.key));

  const windows: Array<{ start: string; end?: string }> = [];
  let inactiveStart: string | undefined;
  changes.forEach((change) => {
    if (!change.active && !inactiveStart) inactiveStart = addLocalDays(change.key, 1);
    if (change.active && inactiveStart) {
      const end = addLocalDays(change.key, -1);
      if (inactiveStart <= end) windows.push({ start: inactiveStart, end });
      inactiveStart = undefined;
    }
  });
  if (inactiveStart && !routine.active) windows.push({ start: inactiveStart, end: todayKey });
  return windows;
}

function isInInactiveWindow(key: string, windows: Array<{ start: string; end?: string }>): boolean {
  return windows.some((window) => key >= window.start && (!window.end || key <= window.end));
}

function countTrailingCompleted(days: RoutineDay[], lastIndex: number): number {
  let count = 0;
  for (let index = lastIndex; index >= 0; index -= 1) {
    const day = days[index];
    if (!day || !day.eligible) break;
    if (!day.completed) break;
    count += 1;
  }
  return count;
}

function buildInterruptionRecords(days: RoutineDay[], todayKey: string, active: boolean): RoutineInterruptionRecord[] {
  const records: RoutineInterruptionRecord[] = [];
  let interruptionStart: string | undefined;
  let previousEligibleCompleted: boolean | undefined;

  days.forEach((day) => {
    if (!day.eligible) {
      previousEligibleCompleted = undefined;
      return;
    }
    // The current day remains a chance to complete, so it never opens a break.
    if (day.key === todayKey && !day.completed) return;
    if (day.completed) {
      if (interruptionStart) {
        const interruptionEnd = addLocalDays(day.key, -1);
        records.push({
          interruptionStart,
          interruptionEnd,
          resumedAt: day.key,
          offDays: dayDistance(interruptionStart, interruptionEnd) + 1,
          postResumeStreak: 0,
        });
        interruptionStart = undefined;
      }
      previousEligibleCompleted = true;
      return;
    }
    if (previousEligibleCompleted && !interruptionStart) interruptionStart = day.key;
    previousEligibleCompleted = false;
  });

  if (interruptionStart && active) {
    const yesterdayKey = addLocalDays(todayKey, -1);
    const interruptionEnd = yesterdayKey >= interruptionStart ? yesterdayKey : interruptionStart;
    records.push({
      interruptionStart,
      interruptionEnd,
      offDays: dayDistance(interruptionStart, interruptionEnd) + 1,
      postResumeStreak: 0,
      isCurrent: true,
    });
  }

  return records.map((record, index, all) => {
    if (!record.resumedAt) return record;
    const lastDayKey = days.at(-1)?.key ?? todayKey;
    const rawEnd = all[index + 1]?.interruptionStart ? addLocalDays(all[index + 1]!.interruptionStart, -1) : lastDayKey;
    const endDay = days.find((day) => day.key === rawEnd);
    const until = endDay && !endDay.completed ? addLocalDays(rawEnd, -1) : rawEnd;
    const indexAtResume = days.findIndex((day) => day.key === record.resumedAt);
    const indexAtEnd = days.findIndex((day) => day.key === until);
    return {
      ...record,
      postResumeStreak: indexAtResume >= 0 && indexAtEnd >= indexAtResume ? countTrailingCompleted(days.slice(0, indexAtEnd + 1), indexAtEnd) : 0,
    };
  }).sort((left, right) => (right.resumedAt ?? right.interruptionEnd).localeCompare(left.resumedAt ?? left.interruptionEnd));
}

function statusText(status: RoutineStatus, currentStreak: number, currentInterruptionDays: number): { label: string; copy: string } {
  switch (status) {
    case 'before': return { label: '開始前', copy: '最初の1回が記録されると、ここで続き方を見られます' };
    case 'waiting': return { label: '今日の実行待ち', copy: '今日はまだ終わっていません。できるタイミングで大丈夫です' };
    case 'resumed_today': return { label: '今日再開', copy: '戻れた今日が、新しい一歩です' };
    case 'resumed_recently': return { label: `再開後${currentStreak}日`, copy: '戻れてからの流れを、ゆっくり続けられています' };
    case 'interrupted': return { label: '中断中', copy: `現在${currentInterruptionDays}日お休み中です。今日からまた始められます` };
    case 'deactivated': return { label: '解除済み', copy: 'これまでの達成は、ここに残っています' };
    default: return { label: '継続中', copy: '今のペースで続けられています' };
  }
}

export function buildRoutineInterruptionSummary(events: BehaviorEvent[], tasks: Task[], routine: RoutineHistory, now = new Date()): RoutineInterruptionSummary {
  const todayKey = localDateKey(now);
  const startKey = routineStartKey(events, tasks, routine, todayKey);
  const deactivatedAt = routine.active ? undefined : routine.endedAt;
  const endKey = deactivatedAt ? localDateKey(deactivatedAt) : todayKey;
  const inactiveWindows = getDeactivationWindows(events, tasks, routine, todayKey);
  const days: RoutineDay[] = [];
  for (let key = startKey; key <= endKey; key = addLocalDays(key, 1)) {
    const eligible = !isInInactiveWindow(key, inactiveWindows);
    days.push({ key, eligible, completed: eligible && routineDayCompleted(events, tasks, routine, key) });
  }

  const completedDays = days.filter((day) => day.completed);
  const completedKeys = new Set(completedDays.map((day) => day.key));
  const firstCompletedIndex = days.findIndex((day) => day.completed);
  const records = firstCompletedIndex < 0 ? [] : buildInterruptionRecords(days.slice(firstCompletedIndex), todayKey, routine.active);
  const latestRecord = records[0];
  const lastInactiveWindow = inactiveWindows.at(-1);
  const activeSegmentStart = routine.active && lastInactiveWindow?.end ? addLocalDays(lastInactiveWindow.end, 1) : startKey;
  const currentSegmentDays = days.filter((day) => day.key >= activeSegmentStart);
  const currentSegmentHasCompletion = currentSegmentDays.some((day) => day.completed);
  const todayIndex = days.findIndex((day) => day.key === todayKey);
  const todayCompleted = todayIndex >= 0 && days[todayIndex]!.completed;
  const yesterdayIndex = days.findIndex((day) => day.key === addLocalDays(todayKey, -1));
  const yesterdayCompleted = yesterdayIndex >= 0 && days[yesterdayIndex]!.completed;
  const baseStreakIndex = todayCompleted ? todayIndex : yesterdayIndex;
  const trailingStreak = baseStreakIndex >= 0 ? countTrailingCompleted(days, baseStreakIndex) : 0;
  let longestStreak = 0;
  let runningStreak = 0;
  days.forEach((day) => {
    if (!day.eligible) { runningStreak = 0; return; }
    runningStreak = day.completed ? runningStreak + 1 : 0;
    longestStreak = Math.max(longestStreak, runningStreak);
  });

  const currentInterruption = records.find((record) => record.isCurrent);
  let status: RoutineStatus;
  let currentStreak = trailingStreak;
  if (!routine.active) {
    status = 'deactivated';
    currentStreak = 0;
  } else if (firstCompletedIndex < 0) {
    status = 'before';
    currentStreak = 0;
  } else if (!currentSegmentHasCompletion) {
    // A routine explicitly turned on again should invite today's action instead
    // of inheriting a past interruption from before it was deactivated.
    status = 'waiting';
    currentStreak = 0;
  } else if (todayCompleted && latestRecord?.resumedAt === todayKey) {
    status = 'resumed_today';
  } else if (!todayCompleted && currentInterruption && yesterdayIndex >= 0 && !yesterdayCompleted) {
    status = 'interrupted';
    currentStreak = 0;
  } else if (!todayCompleted) {
    status = 'waiting';
  } else if (latestRecord?.resumedAt && dayDistance(latestRecord.resumedAt, todayKey) + 1 <= 7) {
    status = 'resumed_recently';
  } else {
    status = 'continuing';
  }

  const currentMonth = todayKey.slice(0, 7);
  const interruptionsThisMonth = records.filter((record) => record.interruptionStart.startsWith(currentMonth)).length;
  const resumesThisMonth = records.filter((record) => record.resumedAt?.startsWith(currentMonth)).length;
  const cycleEndKey = endKey;
  const cycleAge = Math.max(0, dayDistance(startKey, cycleEndKey));
  const cycleDays = (cycleAge % 21) + 1;
  const cycleStartKey = addLocalDays(cycleEndKey, -(cycleDays - 1));
  const displayDays = Array.from({ length: 21 }, (_, index) => {
    const key = addLocalDays(cycleStartKey, index);
    const day = days.find((item) => item.key === key);
    return {
      key,
      label: `${dateFromLocalKey(key).getMonth() + 1}/${dateFromLocalKey(key).getDate()}`,
      completed: Boolean(day?.completed),
      eligible: Boolean(day?.eligible),
      future: key > cycleEndKey || !day?.eligible,
      today: key === todayKey,
    };
  });
  const completedCycleDays = displayDays.filter((day) => day.eligible && day.completed).length;
  const eligibleCycleDays = Math.max(1, displayDays.filter((day) => day.eligible).length);
  const text = statusText(status, currentStreak, currentInterruption?.offDays ?? 0);

  return {
    status,
    statusLabel: text.label,
    statusCopy: text.copy,
    currentStreak,
    longestStreak,
    totalCompletedDays: completedKeys.size,
    completionRate: Math.round(completedCycleDays / eligibleCycleDays * 100),
    cycleDays: eligibleCycleDays,
    completedCycleDays,
    displayDays,
    history: records,
    latestRecord,
    interruptionsThisMonth,
    resumesThisMonth,
    deactivatedAt,
  };
}
