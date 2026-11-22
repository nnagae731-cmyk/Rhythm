import { Task, WishAction, WishMonthMap } from '../../types';

export function readWishTaskOrigin(value: unknown): Task['origin'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  if (typeof raw.monthKey !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(raw.monthKey)
    || typeof raw.wishId !== 'string' || !raw.wishId.trim()
    || typeof raw.actionId !== 'string' || !raw.actionId.trim()) return undefined;
  return { monthKey: raw.monthKey, wishId: raw.wishId, actionId: raw.actionId };
}

export function sameWishTaskOrigin(a: unknown, b: unknown): boolean {
  const left = readWishTaskOrigin(a), right = readWishTaskOrigin(b);
  return Boolean(left && right && left.monthKey === right.monthKey && left.wishId === right.wishId && left.actionId === right.actionId);
}

export function linkedWishAction(months: WishMonthMap, value: unknown): WishAction | undefined {
  const origin = readWishTaskOrigin(value);
  if (!origin) return undefined;
  const month = months?.[origin.monthKey];
  if (!month || !Array.isArray(month.wishes) || !Array.isArray(month.actions)
    || month.wishes.filter(wish => wish?.id === origin.wishId).length !== 1) return undefined;
  const matches = month.actions.filter(action => action?.id === origin.actionId && action.wishId === origin.wishId);
  // Ambiguous/corrupt data must not update an arbitrary action.
  return matches.length === 1 && typeof matches[0]?.completed === 'boolean' ? matches[0] : undefined;
}

export function isOneOffWishTask(task: Task): boolean {
  return Boolean(readWishTaskOrigin(task.origin)) && !task.isRoutine && (task.repeatRule ?? 'none') === 'none';
}

/** Only explicit, unique one-to-one links may propagate completion. */
export function wishMonthsAfterTaskCompletion(months: WishMonthMap, allTasks: Task[], changedIds: string[]): WishMonthMap {
  let next = months;
  for (const task of allTasks) {
    if (!changedIds.includes(task.id) || typeof task.done !== 'boolean' || !isOneOffWishTask(task) || task.status === 'skipped') continue;
    if (allTasks.filter(other => sameWishTaskOrigin(other.origin, task.origin)).length !== 1) continue;
    const action = linkedWishAction(next, task.origin), origin = readWishTaskOrigin(task.origin)!;
    if (!action || action.completed === task.done) continue;
    const month = next[origin.monthKey];
    if (!month) continue;
    next = { ...next, [origin.monthKey]: { ...month, actions: month.actions.map(item => item === action
      ? { ...item, completed: task.done, completedAt: task.done ? task.completedAt ?? new Date().toISOString() : undefined }
      : item) } };
  }
  return next;
}

/** Resolve Wish edits without effects, titles, or a second persistence path. */
export function taskChangesAfterWishEdit(previous: WishMonthMap, next: WishMonthMap, tasks: Task[]) {
  const completeIds: string[] = [], restoreIds: string[] = [];
  const detached = tasks.map(task => {
    const before = linkedWishAction(previous, task.origin), after = linkedWishAction(next, task.origin);
    if (before && !after) return { ...task, origin: undefined };
    if (!before || !after || before.completed === after.completed || !isOneOffWishTask(task)) return task;
    if (tasks.filter(other => sameWishTaskOrigin(other.origin, task.origin)).length !== 1) return task;
    if (after.completed && (!task.done || task.status === 'skipped')) completeIds.push(task.id);
    if (!after.completed && (task.done || task.status === 'skipped')) restoreIds.push(task.id);
    return task;
  });
  return { tasks: detached.some((task, index) => task !== tasks[index]) ? detached : tasks, completeIds, restoreIds };
}
