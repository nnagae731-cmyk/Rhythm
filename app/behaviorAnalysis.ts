import { BehaviorEvent } from './behaviorEvents';

export type AnalysisStatus = 'insufficient' | 'early' | 'ready';
export type AnalysisResult = { status: AnalysisStatus; sampleCount: number; averageMinutes?: number; summary?: string };
export type DepartureAnalysisResult = AnalysisResult & { lateCount: number };
export type NotificationAnalysisResult = AnalysisResult & { completedCount: number; snoozedCount: number };
export type FocusDurationGroup = { plannedMinutes: number; total: number; completed: number; completionRate: number };
export type FocusAnalysisResult = AnalysisResult & { completedCount: number; stoppedCount: number; durationGroups: FocusDurationGroup[] };
export type SnoozeAnalysisResult = AnalysisResult & { completedAfterCount: number };

const ON_TIME_TOLERANCE_MINUTES = 2;
const STANDARD_FOCUS_DURATIONS = [5, 15, 25, 45];

export function getAnalysisStatus(sampleCount: number): AnalysisStatus {
  return sampleCount <= 2 ? 'insufficient' : sampleCount <= 4 ? 'early' : 'ready';
}

function average(values: number[]): number | undefined {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : undefined;
}

function delaySummary(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (Math.abs(value) <= ON_TIME_TOLERANCE_MINUTES) return '予定時刻に近い動きが多め';
  return value > 0 ? `予定より平均${value}分遅め` : `予定より平均${Math.abs(value)}分早め`;
}

function analyzeDelay(events: BehaviorEvent[], type: 'departure_preparation_started' | 'departure_started'): AnalysisResult {
  const values = events.filter((item) => item.type === type && typeof item.deltaMinutes === 'number').map((item) => item.deltaMinutes!);
  const averageMinutes = average(values);
  return { status: getAnalysisStatus(values.length), sampleCount: values.length, averageMinutes, summary: delaySummary(averageMinutes) };
}

export function analyzePreparationStartDelay(events: BehaviorEvent[]): AnalysisResult {
  return analyzeDelay(events, 'departure_preparation_started');
}

export function analyzeDepartureDelay(events: BehaviorEvent[]): DepartureAnalysisResult {
  const base = analyzeDelay(events, 'departure_started');
  const lateCount = events.filter((item) => item.type === 'departure_started' && typeof item.deltaMinutes === 'number' && item.deltaMinutes > ON_TIME_TOLERANCE_MINUTES).length;
  return { ...base, lateCount };
}

export function analyzeNotificationResponse(events: BehaviorEvent[]): NotificationAnalysisResult {
  const actions = events.filter((item) => item.type === 'notification_action');
  const values = actions.filter((item) => typeof item.deltaMinutes === 'number').map((item) => item.deltaMinutes!);
  const averageMinutes = average(values);
  return { status: getAnalysisStatus(values.length), sampleCount: values.length, averageMinutes, summary: averageMinutes === undefined ? undefined : `通知から平均${Math.max(0, averageMinutes)}分で反応`, completedCount: actions.filter((item) => item.notificationAction === 'completed').length, snoozedCount: actions.filter((item) => item.notificationAction === 'snoozed').length };
}

export function analyzeFocusDuration(events: BehaviorEvent[]): FocusAnalysisResult {
  const finished = events.filter((item) => (item.type === 'focus_stopped' || item.type === 'focus_completed') && typeof item.actualDurationMinutes === 'number');
  const averageMinutes = average(finished.map((item) => item.actualDurationMinutes!));
  const durationGroups = STANDARD_FOCUS_DURATIONS.map((plannedMinutes) => {
    const group = finished.filter((item) => item.plannedDurationMinutes === plannedMinutes);
    const completed = group.filter((item) => item.type === 'focus_completed').length;
    return { plannedMinutes, total: group.length, completed, completionRate: group.length ? Math.round(completed / group.length * 100) : 0 };
  }).filter((group) => group.total > 0);
  const best = [...durationGroups].filter((group) => group.total >= 2).sort((a, b) => b.completionRate - a.completionRate)[0];
  return { status: getAnalysisStatus(finished.length), sampleCount: finished.length, averageMinutes, completedCount: finished.filter((item) => item.type === 'focus_completed').length, stoppedCount: finished.filter((item) => item.type === 'focus_stopped').length, durationGroups, summary: best ? `${best.plannedMinutes}分の集中が比較的続きやすい傾向` : averageMinutes === undefined ? undefined : `平均${averageMinutes}分取り組んでいます` };
}

export function analyzeSnoozeBehavior(events: BehaviorEvent[]): SnoozeAnalysisResult {
  const snoozed = events.filter((item) => item.type === 'notification_action' && item.notificationAction === 'snoozed');
  const completedAfterCount = snoozed.filter((snooze) => events.some((item) => item.type === 'task_completed' && item.taskId === snooze.taskId && new Date(item.occurredAt) > new Date(snooze.occurredAt))).length;
  return { status: getAnalysisStatus(snoozed.length), sampleCount: snoozed.length, completedAfterCount, summary: snoozed.length ? `10分後を選んだ${snoozed.length}回のうち、${completedAfterCount}回はその後完了しています` : undefined };
}
