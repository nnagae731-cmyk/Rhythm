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
  /** True only when the utterance explicitly asks to make the item a routine. */
  executeRoutine?: boolean;
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

function stripRoutineInstruction(value: string) {
  return value
    .replace(/^(?:これ|それ)(?:を)?\s*(?:ルーティン|ルーチン|ルーティーン|routine|習慣)(?:に)?(?:して|する|登録して|化して)\s*[、,]?\s*/iu, '')
    .replace(/(?:の)?(?:を)?\s*(?:ルーティン|ルーチン|ルーティーン|routine|習慣)(?:に)?(?:して|する|登録して|化して)\s*[。！？]?$/iu, '')
    .trim();
}

/** Local deterministic parser used only to prepare existing form values. */
export function parseVoiceInput(input: string, now = new Date(), dateKey?: (date: Date) => string): VoiceParseResult {
  const transcript = input.trim();
  const task = parseSmartTaskInput(transcript, now, dateKey);
  const hasRoutine = /毎日|毎朝|毎晩|毎週|平日|毎月/u.test(transcript);
  const executeRoutine = /(?:ルーティン|ルーチン|ルーティーン|routine|習慣)(?:に)?(?:して|する|登録して|化して)/iu.test(transcript);
  const focusDurationMinutes = parseFocusDuration(transcript);
  const hasFocus = /集中/u.test(transcript);
  const executeFocus = Boolean(focusDurationMinutes && hasFocus && /始めて|開始(?:して)?|起動(?:して)?|スタート(?:して)?|セットして|集中(?:する|して)(?:よ|ね|。)?$/u.test(transcript));
  const hasWishAction = /(?:ために|為に|のため)/u.test(transcript) && !/予定|予約|時に|時の/u.test(transcript);
  const hasWish = /たい(?:です|な|。)?$|たいこと|叶えたい|目標|夢/u.test(transcript);
  const hasSchedule = Boolean(task.scheduledTime) && !hasRoutine;
  const destination = parseDestination(transcript);
  let title = cleanTitle(task.title);
  let relatedWishTitle: string | undefined;

  if (executeRoutine) {
    const routineSource = stripRoutineInstruction(transcript);
    title = cleanTitle(parseSmartTaskInput(routineSource, now, dateKey).title);
  } else if (hasWishAction) {
    relatedWishTitle = cleanTitle(transcript.match(/^(.*?)(?:ために|為に|のため)/u)?.[1] ?? '');
    title = cleanTitle(transcript.replace(/^(.*?)(?:ために|為に|のため)(?:、|\s*)/u, '') || title);
  } else if (hasWish) {
    title = cleanTitle(transcript.replace(/^(?:9月|\d+月|今年中|今月中|いつか)?(?:までに|までには)?/u, '').replace(/(?:したい|させたい|行きたい|叶えたい)(?:です|な)?[。！？]?$/u, ''));
  } else if (hasSchedule && destination) {
    title = cleanTitle(title.replace(destination, '').replace(/^(?:[でに]\s*)+/u, ''));
  }

  const priority = /優先度?\s*(?:が)?\s*高|急ぎ|最優先/u.test(transcript) ? '高' : /優先度?\s*(?:が)?\s*低/u.test(transcript) ? '低' : undefined;
  const intent: VoiceIntent = executeFocus || hasFocus ? 'focus' : hasWishAction ? 'wishAction' : hasWish ? 'wish' : executeRoutine || hasRoutine ? 'routine' : hasSchedule ? 'schedule' : title ? 'todo' : 'ambiguous';
  return { intent, title: title || transcript, scheduledDate: task.scheduledDate, scheduledTime: task.scheduledTime, destination, priority, repeatRule: task.repeatRule, executeRoutine, focusDurationMinutes, executeFocus, relatedWishTitle, transcript };
}
