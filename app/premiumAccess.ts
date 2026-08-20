export type PlanTier = 'free' | 'premium';

export type PremiumFeature =
  | 'repeat_nudge'
  | 'strong_nudge'
  | 'external_calendar'
  | 'long_range_calendar'
  | 'full_history'
  | 'history_search'
  | 'chic_dot'
  | 'chic_floral'
  | 'chic_check_lavender_satin'
  | 'chic_check_beige_noir'
  | 'chic_check_mauve_frame'
  | 'custom_theme'
  | 'behavior_time_correction'
  | 'late_recovery'
  | 'focus_analysis'
  | 'time_analysis'
  | 'behavior_analysis'
  | 'saved_task_templates'
  | 'wish_planning'
  | 'affirmations'
  | 'photo_design';

export const FREE_SCHEDULE_DAYS = 7;

export function hasPremiumAccess(tier: PlanTier, _feature: PremiumFeature): boolean {
  return tier === 'premium';
}

export function getEffectiveNudgeMode<T extends 'once' | 'repeat' | 'strong'>(tier: PlanTier, mode: T): T | 'once' {
  return tier === 'premium' ? mode : 'once';
}

export function getEffectiveChicPattern<T extends 'plain' | 'floral' | 'floralSoft' | 'floralSeasonal' | 'floralDark' | 'dot' | 'checkLavenderSatin' | 'checkBeigeNoir' | 'checkMauveFrame'>(tier: PlanTier, pattern: T): T | 'plain' {
  if (pattern === 'plain') return pattern;
  return tier === 'premium' ? pattern : 'plain';
}

export function getChicPatternFeatureId(pattern: 'floral' | 'floralSoft' | 'floralSeasonal' | 'floralDark' | 'dot' | 'checkLavenderSatin' | 'checkBeigeNoir' | 'checkMauveFrame') {
  if (pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark') return 'chic_floral';
  if (pattern === 'dot') return 'chic_dot';
  if (pattern === 'checkBeigeNoir') return 'chic_check_beige_noir';
  if (pattern === 'checkMauveFrame') return 'chic_check_mauve_frame';
  return 'chic_check_lavender_satin';
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
