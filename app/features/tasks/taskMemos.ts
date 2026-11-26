import type { Task, TaskListItem } from '../../types';

/**
 * Read legacy child steps as the existing task checklist, not another TODO.
 * The storage key/root format is unchanged. Run only at App entry points;
 * low-level loading remains read-only so a failed write retains the original.
 */
export function taskWithUnifiedMemos(task: Task): Task {
  if (!Array.isArray(task.subtasks) || task.subtasks.length === 0) return task;
  // Do not discard corrupt/unknown values as part of this compatibility move.
  if (task.subtasks.some(item => !item || typeof item.id !== 'string' || typeof item.title !== 'string')) return task;
  if (task.listItems !== undefined && !Array.isArray(task.listItems)) return task;
  const existing = task.listItems ?? [];
  if (existing.some(item => !item || typeof item.id !== 'string' || typeof item.text !== 'string')) return task;
  const ids = new Set(existing.map(item => item.id));
  const notes: TaskListItem[] = [...existing];
  const steps = task.subtasks.map((item, index) => ({ item, index }))
    .sort((a, b) => (Number.isFinite(a.item.order) ? a.item.order : a.index) - (Number.isFinite(b.item.order) ? b.item.order : b.index));
  for (const { item } of steps) {
    let id = item.id;
    while (ids.has(id)) id = `legacy-subtask:${id}`;
    ids.add(id);
    const { title, done, ...rest } = item;
    notes.push({ ...rest, id, text: title, checked: Boolean(done), order: notes.length });
  }
  // Same titles are deliberately not deduplicated; they can be distinct notes.
  return { ...task, subtasks: [], listItems: notes };
}

/** Preserve changes made outside the editor while its draft was open. */
export function mergeTaskMemoEdit(base: TaskListItem[], draft: TaskListItem[], latest: TaskListItem[]): TaskListItem[] {
  const before = new Map(base.map(item => [item.id, item]));
  const current = new Map(latest.map(item => [item.id, item]));
  const result: TaskListItem[] = [];
  for (const item of draft) {
    const original = before.get(item.id), newer = current.get(item.id);
    if (original && !newer) continue; // Do not resurrect an externally deleted note.
    result.push(newer ? { ...newer, text: original && original.text === item.text ? newer.text : item.text } : item);
  }
  const ids = new Set(result.map(item => item.id));
  for (const item of latest) if (!before.has(item.id) && !ids.has(item.id)) result.push(item);
  return result.map((item, order) => ({ ...item, order }));
}
