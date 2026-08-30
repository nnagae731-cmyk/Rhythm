export const FREE_VOICE_DAILY_LIMIT = 5;
export const VOICE_REWARDED_DAILY_LIMIT = 2;
export const VOICE_REWARDED_GRANT = 3;

export type VoiceUsage = {
  date: string;
  count: number;
  rewardedCount: number;
  bonusUses: number;
};

export const maxVoiceUses = (value: VoiceUsage): number =>
  FREE_VOICE_DAILY_LIMIT + Math.max(0, value.bonusUses);

export function normalizeVoiceUsage(value: unknown, today: string): VoiceUsage {
  if (!value || typeof value !== 'object') return { date: today, count: 0, rewardedCount: 0, bonusUses: 0 };
  const candidate = value as { date?: unknown; count?: unknown; rewardedCount?: unknown; bonusUses?: unknown };
  const date = typeof candidate.date === 'string' ? candidate.date : today;
  const rewardedCount = typeof candidate.rewardedCount === 'number' && Number.isFinite(candidate.rewardedCount)
    ? Math.max(0, Math.min(VOICE_REWARDED_DAILY_LIMIT, Math.floor(candidate.rewardedCount)))
    : 0;
  const bonusUses = typeof candidate.bonusUses === 'number' && Number.isFinite(candidate.bonusUses)
    ? Math.max(0, Math.min(VOICE_REWARDED_DAILY_LIMIT * VOICE_REWARDED_GRANT, Math.floor(candidate.bonusUses)))
    : 0;
  const count = typeof candidate.count === 'number' && Number.isFinite(candidate.count)
    ? Math.max(0, Math.min(FREE_VOICE_DAILY_LIMIT + VOICE_REWARDED_DAILY_LIMIT * VOICE_REWARDED_GRANT, Math.floor(candidate.count)))
    : 0;
  return date === today ? { date, count, rewardedCount, bonusUses } : { date: today, count: 0, rewardedCount: 0, bonusUses: 0 };
}

export function consumeVoiceUsage(value: VoiceUsage, today: string): VoiceUsage {
  const current = normalizeVoiceUsage(value, today);
  return { ...current, date: today, count: Math.min(maxVoiceUses(current), current.count + 1) };
}

export function grantVoiceReward(value: VoiceUsage, today: string): VoiceUsage {
  const current = normalizeVoiceUsage(value, today);
  if (current.rewardedCount >= VOICE_REWARDED_DAILY_LIMIT) return current;
  return {
    ...current,
    date: today,
    rewardedCount: current.rewardedCount + 1,
    bonusUses: current.bonusUses + VOICE_REWARDED_GRANT,
  };
}

export function remainingVoiceUses(value: VoiceUsage, today: string): number {
  const current = normalizeVoiceUsage(value, today);
  return Math.max(0, maxVoiceUses(current) - current.count);
}

export function remainingVoiceRewards(value: VoiceUsage, today: string): number {
  return Math.max(0, VOICE_REWARDED_DAILY_LIMIT - normalizeVoiceUsage(value, today).rewardedCount);
}
