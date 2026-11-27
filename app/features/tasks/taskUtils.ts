import { Category, Priority, RepeatRule, Task, UrgencyStatus } from '../../types';
import { ChicPattern, ChicThemePalette, getDesignCheckThemeTokens, getDesignPatternThemeTokens } from '../../theme';
import { dateForClock, getTargetDate } from '../schedule/dateTimeUtils';
export { parseClock, dateForClock, dateKey, dateForReminder, todayInputValue, advanceDateValue, deadlineLabel, getTargetDate, formatLiveDate, formatLiveTime } from '../schedule/dateTimeUtils';
import { advanceDateBySteps, nextFutureOccurrence, repeatSeriesKey } from './repeatDateUtils';
import type { TaskCompletionResult } from './repeatUtils';
export type { TaskCompletionResult } from './repeatUtils';

export const STORAGE_KEY = 'rhythm-mvp-state-v1';
export const designModes: { id: 'minimal' | 'chic'; name: string; description: string }[] = [
  { id: 'minimal', name: 'Mono', description: '白と黒で整える' },
  { id: 'chic', name: 'Design', description: '淡くおしゃれ' },
];
export const categories: Category[] = ['仕事', '家事', '健康', '予定', 'その他'];
export const priorities: Priority[] = ['高', '中', '低'];
export const repeatOptions: { id: RepeatRule; label: string }[] = [
  { id: 'none', label: 'なし' },
  { id: 'daily', label: '毎日' },
  { id: 'weekdays', label: '平日' },
  { id: 'weekly', label: '毎週' },
  { id: 'monthly', label: '毎月' },
];
export const completionIcons = ['✓', '★', '♥', '✿', '☀'];

/** Keeps the optional effort estimate useful without inventing a value for old tasks. */
export function normalizeEstimatedMinutes(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const normalized = Math.round(value);
  return normalized >= 1 && normalized <= 720 ? normalized : undefined;
}
export const categoryColors: Record<Category, string> = {
  仕事: '#E9E4FF',
  家事: '#FFF0D9',
  健康: '#DFF5EA',
  予定: '#FFE4DF',
  その他: '#EEECEF',
};

export type ChicTaskPatternPalette = { background: string; accent: string; warm: string };

export const chicTaskPatternPalettes: Record<Category, ChicTaskPatternPalette> = {
  仕事: { background: '#F7F2FC', accent: '#A997C8', warm: '#DCCBF0' },
  家事: { background: '#FFF5EF', accent: '#DFA58F', warm: '#F3C9B8' },
  健康: { background: '#F1FAF7', accent: '#8FC9BD', warm: '#C9E8E0' },
  予定: { background: '#FFF2F6', accent: '#D986A1', warm: '#F1B8CB' },
  その他: { background: '#FFF9EE', accent: '#C6A467', warm: '#E8D5A7' },
};

export const chicUtilityPalettes = {
  departure: { background: '#FFF3F3', accent: '#D986A1', warm: '#F3B6A8' },
  deadline: { background: '#FFF8ED', accent: '#C6A467', warm: '#E7C987' },
  calendar: { background: '#F7F2FC', accent: '#A997C8', warm: '#DCCBF0' },
  focus: { background: '#F1FAF7', accent: '#8FC9BD', warm: '#C9E8E0' },
  wish: { background: '#FFF4F8', accent: '#D986A1', warm: '#F4D8E2' },
};

export function getChicTaskPatternPalette(category: Category) {
  return chicTaskPatternPalettes[category];
}

export function formatClock(totalMinutes: number) {
  const value = (totalMinutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

// Keep the legacy contract: IDs, reminder-date fallback and per-batch clock
// differ from repeatUtils. See qa-repeat-equivalence.test.js.
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

// This collector retains the legacy completion contract above.
export function completeTasksAndCollectEvents(current: Task[], ids: string[]): TaskCompletionResult {
  const eligibleIds = new Set(current.filter((task) => ids.includes(task.id) && !task.done && task.status !== 'skipped').map((task) => task.id));
  if (eligibleIds.size === 0) return { tasks: current, newlyCompleted: [] };
  const tasks = completeTasksWithRepeats(current, ids);
  return {
    tasks,
    newlyCompleted: tasks.filter((task) => eligibleIds.has(task.id) && task.done && task.completedAt),
  };
}

export function getUrgencyStatus(task: Task, now = new Date()): UrgencyStatus {
  const target = getTargetDate(task);
  if (!target) return '余裕あり';
  const travel = task.travelMinutes ?? 30;
  const preparation = task.preparationMinutes ?? 30;
  const buffer = task.bufferMinutes ?? 10;
  const leaveAt = new Date(target.getTime() - (travel + buffer) * 60_000);
  const prepareAt = new Date(leaveAt.getTime() - preparation * 60_000);
  const minutesAfterLeave = (now.getTime() - leaveAt.getTime()) / 60_000;

  if (now < prepareAt) return '余裕あり';
  if (now < new Date(leaveAt.getTime() - 10 * 60_000)) return 'そろそろ準備';
  if (now <= leaveAt) return '今出れば間に合う';
  if (minutesAfterLeave <= 5) return '急いで出発';
  if (now < target) return '予定どおりは厳しい';
  return 'リカバリーが必要';
}

export function getNextBestAction(task: Task, now = new Date()) {
  const status = getUrgencyStatus(task, now);
  const messages: Record<UrgencyStatus, string> = {
    '余裕あり': 'まだ余裕あり。今は準備だけでOK',
    'そろそろ準備': 'そろそろ準備を始めよう',
    '今出れば間に合う': '今出たらまだ間に合う',
    '急いで出発': '5分以内に出発して',
    '予定どおりは厳しい': '予定どおりの到着は厳しいかも',
    'リカバリーが必要': '到着遅れ前提で次の行動を選ぼう',
  };
  return messages[status];
}

export function getLateRiskMessage(task: Task, now = new Date()) {
  const target = getTargetDate(task);
  if (!target) return '到着時刻を設定すると判定できます';
  const status = getUrgencyStatus(task, now);
  if (status === 'リカバリーが必要') return `予定時刻を${Math.max(1, Math.floor((now.getTime() - target.getTime()) / 60_000))}分超過`;
  const travel = task.travelMinutes ?? 30;
  const buffer = task.bufferMinutes ?? 10;
  const leaveAt = new Date(target.getTime() - (travel + buffer) * 60_000);
  const remaining = Math.ceil((leaveAt.getTime() - now.getTime()) / 60_000);
  return remaining > 0 ? `出発まであと${remaining}分` : `出発目安を${Math.abs(remaining)}分超過`;
}

export function urgencyLevel(status: UrgencyStatus) {
  return ['余裕あり', 'そろそろ準備', '今出れば間に合う', '急いで出発', '予定どおりは厳しい', 'リカバリーが必要'].indexOf(status);
}

// Legacy path accepts malformed clocks; App dateTimeUtils returns '予定なし'.
export function countdownToClock(clock: string, now: Date) {
  const target = dateForClock(clock);
  const minutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `あと${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `あと${hours}時間` : `あと${hours}時間${rest}分`;
}

export function getChicPatternVisual(pattern: ChicPattern, palette: ChicThemePalette = getDesignCheckThemeTokens('cool')) {
  if (pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark') {
    const floralPalette = getDesignPatternThemeTokens(pattern, 'cool');
    return { background: floralPalette.background, accent: palette.accent, warm: palette.accentSoft };
  }
  return { background: palette.background, accent: palette.accent, warm: palette.accentSoft };
}
