export type PlanTier = 'free' | 'premium';

export type PremiumFeature =
  | 'repeat_nudge'
  | 'strong_nudge'
  | 'external_calendar'
  | 'long_range_calendar'
  | 'full_history'
  | 'history_search'
  | 'chic_dot'
  | 'chic_check'
  | 'custom_theme'
  | 'behavior_time_correction'
  | 'late_recovery'
  | 'focus_analysis'
  | 'time_analysis'
  | 'behavior_analysis';

export const FREE_SCHEDULE_DAYS = 7;

export function hasPremiumAccess(tier: PlanTier, _feature: PremiumFeature): boolean {
  return tier === 'premium';
}

export function getEffectiveNudgeMode<T extends 'once' | 'repeat' | 'strong'>(tier: PlanTier, mode: T): T | 'once' {
  return tier === 'premium' ? mode : 'once';
}

export function getEffectiveChicPattern<T extends 'floral' | 'dot' | 'check'>(tier: PlanTier, pattern: T): T | 'floral' {
  return tier === 'premium' ? pattern : 'floral';
}

export function isWithinFreeSchedule(date: string, now = new Date()): boolean {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + FREE_SCHEDULE_DAYS);
  const target = new Date(`${date}T00:00:00`);
  return target >= start && target < end;
}

export function isWithinFreeHistory(isoDate: string, now = new Date()): boolean {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (FREE_SCHEDULE_DAYS - 1));
  const target = new Date(isoDate);
  return target >= start && target < end;
}
