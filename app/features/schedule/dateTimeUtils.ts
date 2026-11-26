import { RepeatRule, Task } from '../../types';

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

export function shiftDateKey(value: string, days: number) {
  const date = dateForReminder(value, '12:00');
  date.setDate(date.getDate() + days);
  return dateKey(date);
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
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) return '予定なし';
  const target = dateForClock(clock);
  const minutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `あと${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `あと${hours}時間` : `あと${hours}時間${rest}分`;
}

export function countdownToDate(target: Date, now: Date) {
  const minutes = Math.ceil((target.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return '出発時刻を過ぎました';
  if (minutes < 60) return `あと${minutes}分`;
  if (minutes < 24 * 60) return `あと${Math.floor(minutes / 60)}時間${minutes % 60}分`;
  return `あと${Math.floor(minutes / 1440)}日${Math.floor((minutes % 1440) / 60)}時間`;
}
