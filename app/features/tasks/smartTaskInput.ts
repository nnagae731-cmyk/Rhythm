import { RepeatRule } from '../../types';

export type SmartTaskParseResult = {
  title: string;
  scheduledDate?: string;
  scheduledTime?: string;
  endTime?: string;
  remindDate?: string;
  remindAt?: string;
  repeatRule?: RepeatRule;
  matched: string[];
};

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function clock(value: number, minute = 0): string {
  return `${String(value).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseClock(text: string): { time?: string; source?: string } {
  const match = text.match(/(午前|午後)?\s*(\d{1,2})(?:時|:\s*)(\d{1,2})?/u);
  if (!match) return {};
  let hour = Number(match[2]);
  const minute = Number(match[3] ?? 0);
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour > 23 || minute > 59) return {};
  if (match[1] === '午後' && hour < 12) hour += 12;
  if (match[1] === '午前' && hour === 12) hour = 0;
  return { time: clock(hour, minute), source: match[0] };
}

/**
 * Parse the small, deterministic Japanese task grammar used by the input
 * fields. It deliberately returns no guess when a date is invalid or absent.
 */
export function parseSmartTaskInput(input: string, now = new Date(), dateKey: (date: Date) => string = localDateKey): SmartTaskParseResult {
  const original = input.trim();
  let title = original;
  const matched: string[] = [];
  let scheduledDate: string | undefined;
  let scheduledTime: string | undefined;
  let endTime: string | undefined;
  let remindDate: string | undefined;
  let remindAt: string | undefined;
  let repeatRule: RepeatRule | undefined;
  let scheduledDateObject: Date | undefined;

  const consume = (value: string) => {
    if (!value) return;
    matched.push(value);
    title = title.replace(value, ' ');
  };

  // Keep ranges in the parser so typed and voice input share one result.
  const range = original.match(/(\d{1,2}):(\d{2})\s*[-〜]\s*(\d{1,2}):(\d{2})/u)
    ?? original.match(/(\d{1,2})時(?:から|〜|-)\s*(\d{1,2})(?:時半|時)(?:\s*|$)/u);
  if (range) {
    const startHour = Number(range[1]);
    const startMinute = range[2] !== undefined ? Number(range[2]) : 0;
    const endHour = Number(range[3]);
    const endMinute = range[4] !== undefined ? Number(range[4]) : 30;
    if (startHour <= 23 && startMinute <= 59 && endHour <= 23 && endMinute <= 59) {
      scheduledTime = clock(startHour, startMinute);
      endTime = clock(endHour, endMinute);
      consume(range[0]);
    }
  }

  const relative = original.match(/(\d+)\s*(分|時間)後/u);
  if (relative) {
    const minutes = Number(relative[1]) * (relative[2] === '時間' ? 60 : 1);
    const target = new Date(now.getTime() + minutes * 60_000);
    scheduledDateObject = target;
    scheduledDate = dateKey(target);
    scheduledTime = clock(target.getHours(), target.getMinutes());
    consume(relative[0]);
  }

  const namedDay = original.match(/(今日|明日|あした|明後日|あさって|今週|来週)/u);
  if (namedDay && !scheduledDateObject) {
    const offset = namedDay[1] === '今日' ? 0 : namedDay[1] === '明後日' || namedDay[1] === 'あさって' ? 2 : namedDay[1] === '来週' ? 7 : 1;
    scheduledDateObject = addDays(now, offset);
    scheduledDate = dateKey(scheduledDateObject);
    consume(namedDay[0]);
  }

  const monthDay = original.match(/(\d{1,2})月\s*(\d{1,2})日|(?:^|\s)(\d{1,2})\/(\d{1,2})(?=\s|$)/u);
  if (monthDay) {
    const month = Number(monthDay[1] ?? monthDay[3]);
    const day = Number(monthDay[2] ?? monthDay[4]);
    const candidate = new Date(now.getFullYear(), month - 1, day);
    if (candidate.getMonth() === month - 1 && candidate.getDate() === day) {
      if (candidate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) candidate.setFullYear(candidate.getFullYear() + 1);
      scheduledDateObject = candidate;
      scheduledDate = dateKey(candidate);
      consume(monthDay[0]);
    }
  }

  const weekday = original.match(/(?:次の|来週の)?(日|月|火|水|木|金|土)曜日?/u);
  if (weekday && !scheduledDateObject) {
    const target = DAY_NAMES.indexOf(weekday[1]!);
    const distance = (target - now.getDay() + 7) % 7 || 7;
    scheduledDateObject = addDays(now, distance);
    scheduledDate = dateKey(scheduledDateObject);
    consume(weekday[0]);
  }

  const timeMatch = scheduledTime ? {} : parseClock(original);
  if (timeMatch.time) {
    scheduledTime = timeMatch.time;
    consume(timeMatch.source ?? '');
  } else {
    const period = original.match(/(朝|午前中|昼|午後|夕方|夜|晩)/u);
    if (period) {
      scheduledTime = period[1] === '朝' || period[1] === '午前中' ? '09:00' : period[1] === '昼' || period[1] === '午後' ? '12:00' : period[1] === '夕方' ? '17:00' : '20:00';
      consume(period[0]);
    }
  }

  const repeat = original.match(/(毎日|毎朝|毎晩|平日|毎週|毎月)(?:の)?(?:(日|月|火|水|木|金|土)曜日?)?/u);
  if (repeat) {
    repeatRule = ['毎日', '毎朝', '毎晩'].includes(repeat[1]!) ? 'daily' : repeat[1] === '平日' ? 'weekdays' : repeat[1] === '毎月' ? 'monthly' : 'weekly';
    consume(repeat[0]);
  }

  const notify = original.match(/(\d+)\s*(分|時間)前に通知/u);
  const dayBefore = original.match(/前日に通知/u);
  const sameDay = original.match(/当日\s*(\d{1,2})(?:時|:\s*)(\d{1,2})?/u);
  if (notify && scheduledDateObject && scheduledTime) {
    const [hour, minute] = scheduledTime.split(':').map(Number);
    const eventAt = new Date(scheduledDateObject);
    eventAt.setHours(hour!, minute!, 0, 0);
    eventAt.setMinutes(eventAt.getMinutes() - Number(notify[1]) * (notify[2] === '時間' ? 60 : 1));
    remindDate = dateKey(eventAt);
    remindAt = clock(eventAt.getHours(), eventAt.getMinutes());
    consume(notify[0]);
  } else if (dayBefore && scheduledDateObject) {
    const eventAt = addDays(scheduledDateObject, -1);
    remindDate = dateKey(eventAt);
    remindAt = scheduledTime ?? '09:00';
    consume(dayBefore[0]);
  } else if (sameDay && scheduledDateObject) {
    remindDate = dateKey(scheduledDateObject);
    remindAt = clock(Number(sameDay[1]), Number(sameDay[2] ?? 0));
    consume(sameDay[0]);
  }

  return { title: title.replace(/[、,，。]+$/u, '').replace(/\s{2,}/g, ' ').trim() || original, scheduledDate, scheduledTime, endTime, remindDate, remindAt, repeatRule, matched };
}
