import { parseSmartTaskInput } from './tasks/smartTaskInput';
import { RepeatRule } from '../types';

export type VoiceIntent = 'todo' | 'schedule' | 'routine' | 'wish' | 'wishAction' | 'ambiguous';

export type VoiceParseResult = {
  intent: VoiceIntent;
  title: string;
  scheduledDate?: string;
  scheduledTime?: string;
  destination?: string;
  priority?: '高' | '中' | '低';
  repeatRule?: RepeatRule;
  relatedWishTitle?: string;
  transcript: string;
};

function cleanTitle(value: string) {
  return value.replace(/^(えっと|あの|その|ねえ)[、,\s]*/u, '').replace(/[、,，。]+$/u, '').replace(/\s{2,}/g, ' ').trim();
}

function parseDestination(value: string) {
  const match = value.match(/(?:で|にて|@)\s*([^、,。]+?)(?:(?:で|に)\s*(?:待ち合わせ|集合|行く|向かう)|$)/u);
  return match?.[1]?.trim() || undefined;
}

/** Local deterministic parser used only to prepare existing form values. */
export function parseVoiceInput(input: string, now = new Date(), dateKey?: (date: Date) => string): VoiceParseResult {
  const transcript = input.trim();
  const task = parseSmartTaskInput(transcript, now, dateKey);
  const hasRoutine = /毎日|毎朝|毎晩|毎週|平日|毎月/u.test(transcript);
  const hasWishAction = /(?:ために|為に|のため)/u.test(transcript) && !/予定|予約|時に|時の/u.test(transcript);
  const hasWish = /たい(?:です|な|。)?$|たいこと|叶えたい|目標|夢/u.test(transcript);
  const hasSchedule = Boolean(task.scheduledTime) && !hasRoutine;
  const destination = parseDestination(transcript);
  let title = cleanTitle(task.title);
  let relatedWishTitle: string | undefined;

  if (hasWishAction) {
    relatedWishTitle = cleanTitle(transcript.match(/^(.*?)(?:ために|為に|のため)/u)?.[1] ?? '');
    title = cleanTitle(transcript.replace(/^(.*?)(?:ために|為に|のため)(?:、|\s*)/u, '') || title);
  } else if (hasWish) {
    title = cleanTitle(transcript.replace(/^(?:9月|\d+月|今年中|今月中|いつか)?(?:までに|までには)?/u, '').replace(/(?:したい|させたい|行きたい|叶えたい)(?:です|な)?[。！？]?$/u, ''));
  } else if (hasSchedule && destination) {
    title = cleanTitle(title.replace(destination, '').replace(/(?:で)?(?:待ち合わせ|集合|行く|向かう)/u, ''));
  }

  const priority = /優先度?\s*(?:が)?\s*高|急ぎ|最優先/u.test(transcript) ? '高' : /優先度?\s*(?:が)?\s*低/u.test(transcript) ? '低' : undefined;
  const intent: VoiceIntent = hasWishAction ? 'wishAction' : hasWish ? 'wish' : hasRoutine ? 'routine' : hasSchedule ? 'schedule' : title ? 'todo' : 'ambiguous';
  return { intent, title: title || transcript, scheduledDate: task.scheduledDate, scheduledTime: task.scheduledTime, destination, priority, repeatRule: task.repeatRule, relatedWishTitle, transcript };
}
