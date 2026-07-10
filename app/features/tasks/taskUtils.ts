import { ChicPattern } from '../../theme';
import { Category, DeparturePlan, Priority, RepeatRule, Task, TaskBucket, UrgencyStatus } from '../../types';

export const STORAGE_KEY = 'rhythm-mvp-state-v1';
export const designModes: { id: 'minimal' | 'chic'; name: string; description: string }[] = [
  { id: 'minimal', name: 'Minimal', description: '静かで端正' },
  { id: 'chic', name: 'Chic', description: '淡くおしゃれ' },
];
export const categories: Category[] = ['仕事', '家事', '健康', '予定', 'その他'];
export const priorities: Priority[] = ['高', '中', '低'];
export const repeatOptions: { id: RepeatRule; label: string }[] = [
  { id: 'none', label: 'なし' },
  { id: 'daily', label: '毎日' },
  { id: 'weekdays', label: '平日' },
  { id: 'weekly', label: '毎週' },
];
export const completionIcons = ['✓', '★', '♥', '✿', '☀'];
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
};

export function getChicTaskPatternPalette(category: Category) {
  return chicTaskPatternPalettes[category];
}

export function parseClock(clock: string) {
  const [rawHours = '0', rawMinutes = '0'] = clock.split(':');
  const hours = Math.min(23, Math.max(0, Number(rawHours) || 0));
  const minutes = Math.min(59, Math.max(0, Number(rawMinutes) || 0));
  return hours * 60 + minutes;
}

export function formatClock(totalMinutes: number) {
  const value = (totalMinutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
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
  const days = rule === 'weekly' ? 7 : 1;
  base.setDate(base.getDate() + days);
  if (rule === 'weekdays') {
    while (base.getDay() === 0 || base.getDay() === 6) base.setDate(base.getDate() + 1);
  }
  return dateKey(base);
}

export type TaskCompletionResult = { tasks: Task[]; newlyCompleted: Task[] };

export function completeTasksWithRepeats(current: Task[], ids: string[]) {
  const completedAt = new Date().toISOString();
  const nextTasks: Task[] = [];
  const updated = current.map((task) => {
    if (!ids.includes(task.id) || task.done) return task;
    const rule = task.repeatRule ?? 'none';
    if (rule !== 'none') {
      nextTasks.push({
        ...task,
        id: `${Date.now()}-${task.id}-${Math.random().toString(16).slice(2)}`,
        done: false,
        completedAt: undefined,
        deadlineDate: task.deadlineDate ? advanceDateValue(task.deadlineDate, rule) : undefined,
        remindDate: task.remindDate ? advanceDateValue(task.remindDate, rule) : undefined,
        scheduledDate: advanceDateValue(task.scheduledDate ?? dateKey(), rule),
      });
    }
    return { ...task, done: true, completedAt };
  });
  return [...nextTasks, ...updated];
}

export function completeTasksAndCollectEvents(current: Task[], ids: string[]): TaskCompletionResult {
  const eligibleIds = new Set(current.filter((task) => ids.includes(task.id) && !task.done).map((task) => task.id));
  if (eligibleIds.size === 0) return { tasks: current, newlyCompleted: [] };
  const tasks = completeTasksWithRepeats(current, ids);
  return {
    tasks,
    newlyCompleted: tasks.filter((task) => eligibleIds.has(task.id) && task.done && task.completedAt),
  };
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

export function getChicPatternVisual(pattern: ChicPattern) {
  if (pattern === 'dot') return { background: '#FFF3F5', accent: '#D986A1', warm: '#A997C8' };
  if (pattern === 'check') return { background: '#FFF9F6', accent: '#E8B8C7', warm: '#F4D8E2' };
  return { background: '#FFF3F5', accent: '#D986A1', warm: '#A997C8' };
}
