export type FocusSession = {
  id: string;
  taskId?: string;
  taskTitle: string;
  durationMinutes: number;
  startedAt: string;
  completedAt: string;
};

export function createFocusSessionId(startedAt: Date, nonce: string) {
  return `focus:${startedAt.toISOString()}:${nonce}`;
}

export function createCompletedFocusSession(args: {
  id: string;
  taskId?: string;
  taskTitle?: string;
  durationMinutes: number;
  startedAt: Date;
  completedAt?: Date;
}): FocusSession {
  return {
    id: args.id,
    taskId: args.taskId,
    taskTitle: args.taskTitle ?? '集中タイム',
    durationMinutes: args.durationMinutes,
    startedAt: args.startedAt.toISOString(),
    completedAt: (args.completedAt ?? new Date()).toISOString(),
  };
}
