import { parseSmartTaskInput } from './tasks/smartTaskInput';
import { RepeatRule } from '../types';

export type VoiceIntent = 'todo' | 'schedule' | 'routine' | 'focus' | 'wish' | 'wishAction' | 'ambiguous';

export type VoiceParseResult = {
  intent: VoiceIntent;
  title: string;
  scheduledDate?: string;
  scheduledTime?: string;
  destination?: string;
  priority?: '高' | '中' | '低';
  repeatRule?: RepeatRule;
  /** True only when the utterance explicitly asks to register the item as a routine. */
  explicitRoutineRegistration?: boolean;
  /** True only when the utterance explicitly asks to complete an existing routine today. */
  explicitRoutineCompletion?: boolean;
  /** Duration extracted from a focus command, in minutes. */
  focusDurationMinutes?: number;
  /** True only when the utterance explicitly asks to start focus. */
  executeFocus?: boolean;
  relatedWishTitle?: string;
  transcript: string;
};

function cleanTitle(value: string) {
  return value
    .replace(/^(えっと|あの|その|ねえ)[、,\s]*/u, '')
    .replace(/^(?:の\s+)+/u, '')
    .replace(/^毎\s+/u, '')
    .replace(/^(?:[でに]\s*)+/u, '')
    .replace(/[、,，。]+$/u, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseDestination(value: string) {
  // Prefer the segment following a spoken time. This avoids treating the
  // particle in "14時に" as the beginning of a destination.
  const afterTime = value.match(/(?:\d{1,2}時(?:\d{1,2}分)?|\d{1,2}:\d{2})\s*に\s*([^、。]+?)(?=で(?:[^、。]*?(?:待ち合わせ|集合|ご飯|食事))|に(?:行く|向かう)|(?:で)?会う)/u);
  if (afterTime?.[1]?.trim()) return afterTime[1].trim();
  // Keep the fallback conservative: a bare "で" in another command (for
  // example, "1時間で起動して") is not a destination marker.
  const match = value.match(/([^、,。]+?)で(?:[^、。]*?(?:待ち合わせ|集合|ご飯|食事))/u)
    ?? value.match(/([^、,。]+?)に(?:行く|向かう)/u);
  return match?.[1]?.trim() || undefined;
}

function parseFocusDuration(value: string) {
  const hours = value.match(/(\d{1,2})\s*時間\s*(半|\d{1,2}\s*分)?/u);
  if (hours) {
    const hourValue = Number(hours[1]);
    const minuteValue = hours[2] === '半' ? 30 : hours[2] ? Number(hours[2].replace(/\s*分/u, '')) : 0;
    const total = hourValue * 60 + minuteValue;
    return total > 0 ? total : undefined;
  }
  const minutes = value.match(/(\d{1,3})\s*(?:分|ふん)(?:間)?/u);
  const total = minutes ? Number(minutes[1]) : 0;
  return total > 0 ? total : undefined;
}

const routineWords = /(?:ルーティン|ルーチン|ルーティーン|routine|習慣)/iu;
const singleDateWords = /(?:今日|きょう|明日|あした|明後日|あさって|今週|来週|\d{1,2}月\s*\d{1,2}日|\d{1,2}\/\d{1,2})/u;

/** Detect recurring language without treating a one-off date as a routine. */
export function detectRoutineCandidate(input: string) {
  const value = input.trim();
  const recurringDayPhrase = value.replace(/毎週\s*[日月火水木金土](?:曜日?)?/u, '');
  const recurring = /毎日|毎朝|毎晩|毎夜|毎週|毎月|平日|休日|毎食後|週\s*\d+\s*回|1日\s*\d+\s*回/u.test(value)
    || /[月火水木金土日]{2,}(?:曜日?)?/u.test(value);
  const contextRoutine = /寝る前|朝起きたら/u.test(value) && !singleDateWords.test(recurringDayPhrase);
  return recurring || contextRoutine;
}

export function detectRoutineRepeatRule(input: string, fallback?: RepeatRule) {
  if (/毎月/u.test(input)) return 'monthly' as RepeatRule;
  if (/平日/u.test(input)) return 'weekdays' as RepeatRule;
  if (/毎週|休日|週\s*\d+\s*回|[月火水木金土日]{2,}(?:曜日?)/u.test(input)) return 'weekly' as RepeatRule;
  if (/毎日|毎朝|毎晩|毎夜|毎食後|1日\s*\d+\s*回/u.test(input)) return 'daily' as RepeatRule;
  return fallback;
}

export function detectExplicitRoutineRegistration(input: string) {
  return routineWords.test(input) && /(?:に)?(?:登録|追加|設定|習慣化|ルーティン化|化)?(?:して|する)/iu.test(input);
}

export function detectExplicitRoutineCompletion(input: string) {
  const completion = /(?:やった|完了(?:にして|した)?|済み(?:にして|にする)?|チェック(?:して|する)?|終わった|終えた)/u.test(input);
  if (!completion) return false;
  return routineWords.test(input) || /今日|きょう/u.test(input) || /寝る前|朝起きたら/u.test(input);
}

function stripRoutineInstruction(value: string) {
  return value
    .replace(/^(?:これ|それ)(?:を)?\s*(?:ルーティン|ルーチン|ルーティーン|routine|習慣)(?:に)?(?:登録|追加|設定|習慣化|ルーティン化|化)?(?:して|する)\s*[、,]?\s*/iu, '')
    .replace(/(?:の)?(?:を)?\s*(?:ルーティン|ルーチン|ルーティーン|routine|習慣)(?:に)?(?:登録|追加|設定|習慣化|ルーティン化|化)?(?:して|する)\s*[。！？]?$/iu, '')
    .trim();
}

function stripRoutineCompletionInstruction(value: string) {
  return value
    .replace(/(?:の)?(?:を)?\s*(?:ルーティン|ルーチン|ルーティーン|routine|習慣)(?:を)?\s*(?:今日|きょう)?\s*(?:完了(?:にして|した)?|済み(?:にして|にする)?|チェック(?:して|する)?|終わった|終えた)\s*[。！？]?$/iu, '')
    .replace(/(?:の)?(?:を)?\s*(?:今日|きょう)?\s*(?:やった|完了(?:にして|した)?|済み(?:にして|にする)?|チェック(?:して|する)?|終わった|終えた)\s*[。！？]?$/u, '')
    .replace(/(?:今日|きょう)\s*(?:の)?\s*(?:ルーティン|ルーチン|ルーティーン|routine|習慣)\s*(?:を)?\s*$/iu, '')
    .replace(/^(?:今日|きょう)\s*の\s*/u, '')
    .trim();
}

function stripRoutineRecurrence(value: string) {
  return value
    .replace(/^(?:毎日|毎朝|毎晩|毎夜|毎週|毎月|平日|休日|毎食後)(?:の|に|は)?\s*/u, '')
    .replace(/^週\s*\d+\s*回(?:の|に|は)?\s*/u, '')
    .replace(/^1日\s*\d+\s*回(?:の|に|は)?\s*/u, '')
    .replace(/^[月火水木金土日]{2,}(?:曜日?)?(?:の|に|は)?\s*/u, '')
    .trim();
}

/** Local deterministic parser used only to prepare existing form values. */
export function parseVoiceInput(input: string, now = new Date(), dateKey?: (date: Date) => string): VoiceParseResult {
  const transcript = input.trim();
  const task = parseSmartTaskInput(transcript, now, dateKey);
  const explicitRoutineRegistration = detectExplicitRoutineRegistration(transcript);
  const explicitRoutineCompletion = detectExplicitRoutineCompletion(transcript) && !explicitRoutineRegistration;
  const hasRoutine = detectRoutineCandidate(transcript) || explicitRoutineRegistration || explicitRoutineCompletion;
  const focusDurationMinutes = parseFocusDuration(transcript);
  const hasFocus = /集中/u.test(transcript);
  const executeFocus = Boolean(focusDurationMinutes && hasFocus && /始めて|開始(?:して)?|起動(?:して)?|スタート(?:して)?|セットして|集中(?:する|して)(?:よ|ね|。)?$/u.test(transcript));
  const hasWishAction = /(?:ために|為に|のため)/u.test(transcript) && !/予定|予約|時に|時の/u.test(transcript);
  const hasWish = /たい(?:です|な|。)?$|たいこと|叶えたい|目標|夢/u.test(transcript);
  const destination = parseDestination(transcript);
  const hasSchedule = Boolean(task.scheduledTime) && !hasRoutine && (Boolean(destination) || /待ち合わせ|集合|会う|行く|向かう|会議|打ち合わせ|病院|美容院|カフェ|ご飯|食事|予約|予定/u.test(transcript));
  let title = cleanTitle(task.title);
  let relatedWishTitle: string | undefined;

  if (explicitRoutineRegistration) {
    const routineSource = stripRoutineInstruction(transcript);
    const parsedRoutineTitle = routineSource || transcript.match(/^(これ|それ)/u)?.[1] || '';
    title = cleanTitle(stripRoutineRecurrence(parseSmartTaskInput(parsedRoutineTitle, now, dateKey).title));
  } else if (explicitRoutineCompletion) {
    const routineSource = stripRoutineCompletionInstruction(transcript);
    title = cleanTitle(parseSmartTaskInput(routineSource, now, dateKey).title);
  } else if (hasWishAction) {
    relatedWishTitle = cleanTitle(transcript.match(/^(.*?)(?:ために|為に|のため)/u)?.[1] ?? '');
    title = cleanTitle(transcript.replace(/^(.*?)(?:ために|為に|のため)(?:、|\s*)/u, '') || title);
  } else if (hasWish) {
    title = cleanTitle(transcript.replace(/^(?:9月|\d+月|今年中|今月中|いつか)?(?:までに|までには)?/u, '').replace(/(?:したい|させたい|行きたい|叶えたい)(?:です|な)?[。！？]?$/u, ''));
  } else if (hasSchedule && destination) {
    title = cleanTitle(title.replace(destination, '').replace(/^(?:[でに]\s*)+/u, ''));
  }

  if (hasRoutine && !explicitRoutineCompletion) title = cleanTitle(stripRoutineRecurrence(title));

  const priority = /優先度?\s*(?:が)?\s*高|急ぎ|最優先/u.test(transcript) ? '高' : /優先度?\s*(?:が)?\s*低/u.test(transcript) ? '低' : undefined;
  const intent: VoiceIntent = executeFocus || hasFocus ? 'focus' : hasWishAction ? 'wishAction' : hasWish ? 'wish' : hasRoutine ? 'routine' : hasSchedule ? 'schedule' : title ? 'todo' : 'ambiguous';
  return { intent, title: title || (explicitRoutineCompletion ? '' : transcript), scheduledDate: task.scheduledDate, scheduledTime: task.scheduledTime, destination, priority, repeatRule: detectRoutineRepeatRule(transcript, task.repeatRule), explicitRoutineRegistration, explicitRoutineCompletion, focusDurationMinutes, executeFocus, relatedWishTitle, transcript };
}
