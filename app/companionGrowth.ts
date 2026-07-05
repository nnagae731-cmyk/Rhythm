export type CompanionGrowthStage =
  | 'egg'
  | 'cracked'
  | 'hatched'
  | 'tiny'
  | 'fluffy'
  | 'companion'
  | 'grown';

export type CompanionGrowthState = {
  version: 1;
  growthPoints: number;
  hasSeenHatchAnimation: boolean;
  acknowledgedStage: CompanionGrowthStage;
  lastGrowthAt?: string;
  awardedEventKeys: string[];
};

export type CompanionGrowthEventType =
  | 'task_completed'
  | 'focus_completed'
  | 'notification_action'
  | 'recovery_used'
  | 'departure_on_time';

export const DEFAULT_COMPANION_GROWTH_STATE: CompanionGrowthState = {
  version: 1,
  growthPoints: 0,
  hasSeenHatchAnimation: false,
  acknowledgedStage: 'egg',
  awardedEventKeys: [],
};

export const companionStageIndex: Record<CompanionGrowthStage, number> = {
  egg: 0,
  cracked: 1,
  hatched: 2,
  tiny: 3,
  fluffy: 4,
  companion: 5,
  grown: 6,
};

export function getCompanionGrowthStage(growthPoints: number): CompanionGrowthStage {
  if (growthPoints >= 260) return 'grown';
  if (growthPoints >= 160) return 'companion';
  if (growthPoints >= 90) return 'fluffy';
  if (growthPoints >= 45) return 'tiny';
  if (growthPoints >= 20) return 'hatched';
  if (growthPoints >= 8) return 'cracked';
  return 'egg';
}

export function getCompanionGrowthEventPoints(type: CompanionGrowthEventType): number {
  return { task_completed: 1, focus_completed: 2, notification_action: 2, recovery_used: 3, departure_on_time: 3 }[type];
}

export function applyCompanionGrowthEvent(current: CompanionGrowthState, type: CompanionGrowthEventType, eventKey: string, occurredAt = new Date()): CompanionGrowthState {
  if (current.awardedEventKeys.includes(eventKey)) return current;
  const addedPoints = getCompanionGrowthEventPoints(type);
  const next: CompanionGrowthState = {
    ...current,
    growthPoints: current.growthPoints + addedPoints,
    lastGrowthAt: occurredAt.toISOString(),
    awardedEventKeys: [...current.awardedEventKeys, eventKey].slice(-500),
  };
  if (__DEV__) console.log('[CompanionGrowth]', { event: type, eventKey, addedPoints, growthPoints: next.growthPoints, stage: getCompanionGrowthStage(next.growthPoints) });
  return next;
}

export function hasCompanionStageAdvanced(previous: CompanionGrowthStage, current: CompanionGrowthStage): boolean {
  return companionStageIndex[current] > companionStageIndex[previous];
}

export function shouldShowHatchAnimation(growth: CompanionGrowthState): boolean {
  return companionStageIndex[getCompanionGrowthStage(growth.growthPoints)] >= companionStageIndex.hatched && !growth.hasSeenHatchAnimation;
}

export function markHatchAnimationSeen(current: CompanionGrowthState): CompanionGrowthState {
  return { ...current, hasSeenHatchAnimation: true };
}

export function acknowledgeCompanionStage(current: CompanionGrowthState): CompanionGrowthState {
  return { ...current, acknowledgedStage: getCompanionGrowthStage(current.growthPoints) };
}

export function getCompanionStageStatus(stage: CompanionGrowthStage): string {
  return {
    egg: '静かにここにいる', cracked: '小さな変化があるみたい', hatched: '新しい気配がする',
    tiny: '少しずつ慣れてきた', fluffy: 'ここが落ち着くみたい', companion: '今日も一緒に進もう',
    grown: 'いつもの場所で待っている',
  }[stage];
}
