export const FREE_VOICE_DAILY_LIMIT = 5;

export type VoiceUsage = {
  date: string;
  count: number;
};

export function normalizeVoiceUsage(value: unknown, today: string): VoiceUsage {
  if (!value || typeof value !== 'object') return { date: today, count: 0 };
  const candidate = value as { date?: unknown; count?: unknown };
  const date = typeof candidate.date === 'string' ? candidate.date : today;
  const count = typeof candidate.count === 'number' && Number.isFinite(candidate.count)
    ? Math.max(0, Math.min(FREE_VOICE_DAILY_LIMIT, Math.floor(candidate.count)))
    : 0;
  return date === today ? { date, count } : { date: today, count: 0 };
}

export function consumeVoiceUsage(value: VoiceUsage, today: string): VoiceUsage {
  const current = normalizeVoiceUsage(value, today);
  return { date: today, count: Math.min(FREE_VOICE_DAILY_LIMIT, current.count + 1) };
}

export function remainingVoiceUses(value: VoiceUsage, today: string): number {
  return Math.max(0, FREE_VOICE_DAILY_LIMIT - normalizeVoiceUsage(value, today).count);
}
