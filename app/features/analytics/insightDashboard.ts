import { BehaviorEvent } from '../../behaviorEvents';
import { DeparturePlan } from '../../types';

export type InsightRange = '7d' | '30d' | 'all';
export type InsightMetric = 'preparation' | 'departure' | 'notification' | 'focus';
export type InsightConditionView = 'weekday' | 'timeOfDay';

export type DailyInsightPoint = {
  date: string;
  value: number;
  sampleCount: number;
};

export type InsightMetricSummary = {
  id: InsightMetric;
  label: string;
  points: DailyInsightPoint[];
  average?: number;
  previousAverage?: number;
  sampleCount: number;
  previousSampleCount: number;
};

export type InsightRate = {
  id: 'departure' | 'notification' | 'focus';
  label: string;
  detail: string;
  numerator: number;
  denominator: number;
  percent?: number;
  previousPercent?: number;
  previousDenominator: number;
};

export type NotificationResponseBreakdown = {
  completed: number;
  later: number;
  noResponse: number;
  total: number;
};

export type InsightCondition = {
  id: string;
  label: string;
  sampleCount: number;
  onTimePercent?: number;
  averageLateMinutes?: number;
};

export type InsightTrend = {
  status: 'improved' | 'maintain' | 'attention';
  message: string;
  comparison: string;
  sampleCount: number;
} | {
  status: 'insufficient';
  message: string;
  comparison: string;
  sampleCount: number;
};

export type InsightSuggestion = {
  id: 'preparation_time';
  title: string;
  reason: string;
  currentValue: string;
  nextValue: string;
  planId: string;
  currentPreparationMinutes: number;
  nextPreparationMinutes: number;
};

export type InsightDashboard = {
  range: InsightRange;
  rangeLabel: string;
  hasPreviousRange: boolean;
  metrics: Record<InsightMetric, InsightMetricSummary>;
  rates: InsightRate[];
  notificationResponses: NotificationResponseBreakdown;
  weekdayConditions: InsightCondition[];
  timeOfDayConditions: InsightCondition[];
  trend: InsightTrend;
  suggestion?: InsightSuggestion;
};

type RangeWindow = {
  start: string;
  end: string;
  previousStart?: string;
  previousEnd?: string;
};

type TimedValue = { date: string; value: number; event: BehaviorEvent };
type RateCounts = { numerator: number; denominator: number };

const DAY_MS = 86_400_000;
const ON_TIME_TOLERANCE_MINUTES = 5;
const MIN_COMPARISON_SAMPLES = 3;

export function localDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

function addDays(key: string, amount: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function daysBetween(start: string, end: string): number {
  return Math.max(1, Math.round((dateFromKey(end).getTime() - dateFromKey(start).getTime()) / DAY_MS) + 1);
}

function shortDate(key: string): string {
  const date = dateFromKey(key);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function eventTime(event: BehaviorEvent): string {
  return event.actualAt ?? event.occurredAt;
}

function eventDate(event: BehaviorEvent): string {
  return localDateKey(eventTime(event));
}

function withinRange(date: string, window: Pick<RangeWindow, 'start' | 'end'>): boolean {
  return Boolean(date) && date >= window.start && date <= window.end;
}

function getRelevantDates(events: BehaviorEvent[], todayKey: string): string[] {
  return events
    .filter((event) => ['departure_preparation_started', 'departure_started', 'notification_scheduled', 'notification_action', 'focus_started', 'focus_stopped', 'focus_completed'].includes(event.type))
    .map((event) => event.type === 'notification_scheduled' && event.scheduledAt ? localDateKey(event.scheduledAt) : eventDate(event))
    .filter((date) => Boolean(date) && date <= todayKey)
    .sort();
}

function getRangeWindow(events: BehaviorEvent[], range: InsightRange, now: Date): RangeWindow {
  const today = localDateKey(now);
  if (range === 'all') {
    const earliest = getRelevantDates(events, today)[0] ?? today;
    return { start: earliest, end: today };
  }
  const count = range === '7d' ? 7 : 30;
  const start = addDays(today, -(count - 1));
  return { start, end: today, previousStart: addDays(start, -count), previousEnd: addDays(start, -1) };
}

function valuesForMetric(events: BehaviorEvent[], metric: InsightMetric): TimedValue[] {
  if (metric === 'preparation' || metric === 'departure') {
    const type = metric === 'preparation' ? 'departure_preparation_started' : 'departure_started';
    return events
      .filter((event) => event.type === type && typeof event.deltaMinutes === 'number')
      .map((event) => ({ date: eventDate(event), value: -event.deltaMinutes!, event }))
      .filter((item) => Boolean(item.date));
  }
  if (metric === 'notification') {
    return events
      .filter((event) => event.type === 'notification_action' && typeof event.deltaMinutes === 'number')
      .map((event) => ({ date: eventDate(event), value: Math.max(0, event.deltaMinutes!), event }))
      .filter((item) => Boolean(item.date));
  }
  const finished = new Map<string, BehaviorEvent>();
  events
    .filter((event) => (event.type === 'focus_stopped' || event.type === 'focus_completed') && event.focusSessionId && typeof event.plannedDurationMinutes === 'number' && event.plannedDurationMinutes > 0 && typeof event.actualDurationMinutes === 'number')
    .forEach((event) => {
      const existing = finished.get(event.focusSessionId!);
      if (!existing || new Date(eventTime(event)).getTime() > new Date(eventTime(existing)).getTime()) finished.set(event.focusSessionId!, event);
    });
  return [...finished.values()]
    .map((event) => ({ date: eventDate(event), value: Math.min(100, Math.max(0, Math.round(event.actualDurationMinutes! / event.plannedDurationMinutes! * 100))), event }))
    .filter((item) => Boolean(item.date));
}

function toDailyPoints(values: TimedValue[], window: Pick<RangeWindow, 'start' | 'end'>): DailyInsightPoint[] {
  const grouped = new Map<string, number[]>();
  values.filter((item) => withinRange(item.date, window)).forEach((item) => {
    const current = grouped.get(item.date) ?? [];
    current.push(item.value);
    grouped.set(item.date, current);
  });
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, items]) => ({ date, value: average(items) ?? 0, sampleCount: items.length }));
}

function metricSummary(events: BehaviorEvent[], metric: InsightMetric, window: RangeWindow): InsightMetricSummary {
  const values = valuesForMetric(events, metric);
  const selected = values.filter((item) => withinRange(item.date, window));
  const previous = window.previousStart && window.previousEnd
    ? values.filter((item) => withinRange(item.date, { start: window.previousStart!, end: window.previousEnd! }))
    : [];
  const labels: Record<InsightMetric, string> = { preparation: '準備', departure: '出発', notification: '通知', focus: '集中' };
  return {
    id: metric,
    label: labels[metric],
    points: toDailyPoints(values, window),
    average: average(selected.map((item) => item.value)),
    previousAverage: average(previous.map((item) => item.value)),
    sampleCount: selected.length,
    previousSampleCount: previous.length,
  };
}

function notificationSchedules(events: BehaviorEvent[], window: Pick<RangeWindow, 'start' | 'end'>): BehaviorEvent[] {
  const byId = new Map<string, BehaviorEvent>();
  events.filter((event) => event.type === 'notification_scheduled' && event.notificationInstanceId && event.scheduledAt).forEach((event) => {
    const date = localDateKey(event.scheduledAt!);
    if (!withinRange(date, window)) return;
    const existing = byId.get(event.notificationInstanceId!);
    if (!existing || new Date(event.occurredAt).getTime() < new Date(existing.occurredAt).getTime()) byId.set(event.notificationInstanceId!, event);
  });
  return [...byId.values()];
}

function firstNotificationActions(events: BehaviorEvent[], schedules: BehaviorEvent[]): Map<string, BehaviorEvent> {
  const scheduledAtById = new Map(schedules.map((event) => [event.notificationInstanceId!, new Date(event.scheduledAt!).getTime()]));
  const actions = new Map<string, BehaviorEvent>();
  events.filter((event) => event.type === 'notification_action' && event.notificationInstanceId).forEach((event) => {
    const scheduledAt = scheduledAtById.get(event.notificationInstanceId!);
    const actualAt = new Date(eventTime(event)).getTime();
    if (!scheduledAt || Number.isNaN(actualAt) || actualAt < scheduledAt) return;
    const existing = actions.get(event.notificationInstanceId!);
    if (!existing || actualAt < new Date(eventTime(existing)).getTime()) actions.set(event.notificationInstanceId!, event);
  });
  return actions;
}

function departureRate(events: BehaviorEvent[], window: Pick<RangeWindow, 'start' | 'end'>): RateCounts {
  const values = events.filter((event) => event.type === 'departure_started' && typeof event.deltaMinutes === 'number' && withinRange(eventDate(event), window));
  return { numerator: values.filter((event) => event.deltaMinutes! <= ON_TIME_TOLERANCE_MINUTES).length, denominator: values.length };
}

function notificationRate(events: BehaviorEvent[], window: Pick<RangeWindow, 'start' | 'end'>): RateCounts {
  const schedules = notificationSchedules(events, window);
  const actions = firstNotificationActions(events, schedules);
  return { numerator: [...actions.values()].filter((event) => (event.deltaMinutes ?? Number.POSITIVE_INFINITY) <= 5).length, denominator: schedules.length };
}

function focusRate(events: BehaviorEvent[], window: Pick<RangeWindow, 'start' | 'end'>): RateCounts {
  const starts = new Map<string, BehaviorEvent>();
  events.filter((event) => event.type === 'focus_started' && event.focusSessionId && withinRange(eventDate(event), window)).forEach((event) => starts.set(event.focusSessionId!, event));
  const completed = new Set(events.filter((event) => event.type === 'focus_completed' && event.focusSessionId).map((event) => event.focusSessionId!));
  return { numerator: [...starts.keys()].filter((id) => completed.has(id)).length, denominator: starts.size };
}

function asRate(id: InsightRate['id'], label: string, detail: string, current: RateCounts, previous: RateCounts): InsightRate {
  return {
    id,
    label,
    detail,
    numerator: current.numerator,
    denominator: current.denominator,
    percent: current.denominator ? Math.round(current.numerator / current.denominator * 100) : undefined,
    previousPercent: previous.denominator ? Math.round(previous.numerator / previous.denominator * 100) : undefined,
    previousDenominator: previous.denominator,
  };
}

function notificationBreakdown(events: BehaviorEvent[], window: Pick<RangeWindow, 'start' | 'end'>): NotificationResponseBreakdown {
  const schedules = notificationSchedules(events, window);
  const actions = firstNotificationActions(events, schedules);
  let completed = 0;
  let later = 0;
  let noResponse = 0;
  schedules.forEach((schedule) => {
    const action = actions.get(schedule.notificationInstanceId!);
    if (!action) noResponse += 1;
    else if (action.notificationAction === 'completed') completed += 1;
    else later += 1;
  });
  return { completed, later, noResponse, total: schedules.length };
}

function conditionStats(events: BehaviorEvent[], window: Pick<RangeWindow, 'start' | 'end'>, kind: InsightConditionView): InsightCondition[] {
  const labels: Array<[string, string]> = kind === 'weekday'
    ? [['1', '月'], ['2', '火'], ['3', '水'], ['4', '木'], ['5', '金'], ['6', '土'], ['0', '日']]
    : [['morning', '朝'], ['afternoon', '昼'], ['evening', '夕方'], ['night', '夜']];
  const buckets = new Map(labels.map(([id]) => [id, [] as number[]]));
  events.filter((event) => event.type === 'departure_started' && typeof event.deltaMinutes === 'number' && withinRange(eventDate(event), window)).forEach((event) => {
    const date = new Date(eventTime(event));
    if (Number.isNaN(date.getTime())) return;
    const id = kind === 'weekday'
      ? String(date.getDay())
      : date.getHours() >= 5 && date.getHours() < 11 ? 'morning' : date.getHours() >= 11 && date.getHours() < 16 ? 'afternoon' : date.getHours() >= 16 && date.getHours() < 20 ? 'evening' : 'night';
    buckets.get(id)?.push(event.deltaMinutes!);
  });
  return labels.map(([id, label]) => {
    const values = buckets.get(id) ?? [];
    return {
      id,
      label,
      sampleCount: values.length,
      onTimePercent: values.length ? Math.round(values.filter((value) => value <= ON_TIME_TOLERANCE_MINUTES).length / values.length * 100) : undefined,
      averageLateMinutes: values.length ? Math.max(0, average(values) ?? 0) : undefined,
    };
  });
}

function rangeLabel(window: RangeWindow, range: InsightRange): string {
  if (range === 'all') return `${shortDate(window.start)}〜今日`;
  return `${shortDate(window.start)}〜${shortDate(window.end)}`;
}

function makeTrend(metrics: Record<InsightMetric, InsightMetricSummary>, rates: InsightRate[], window: RangeWindow, range: InsightRange): InsightTrend {
  if (range === 'all' || !window.previousStart || !window.previousEnd) {
    return { status: 'insufficient', message: '全期間では、変化を比べるための前期間がありません', comparison: '全期間の集計', sampleCount: 0 };
  }
  type Candidate = { score: number; status: 'improved' | 'maintain' | 'attention'; message: string; sampleCount: number };
  const candidates: Candidate[] = [];
  (['preparation', 'departure'] as InsightMetric[]).forEach((id) => {
    const metric = metrics[id];
    if (metric.average === undefined || metric.previousAverage === undefined || metric.sampleCount < MIN_COMPARISON_SAMPLES || metric.previousSampleCount < MIN_COMPARISON_SAMPLES) return;
    const difference = metric.average - metric.previousAverage;
    const status = difference >= 1 ? 'improved' : difference <= -1 ? 'attention' : 'maintain';
    const direction = difference >= 0 ? '早く' : '遅く';
    candidates.push({ score: Math.abs(difference), status, message: `${metric.label}${id === 'preparation' ? '開始' : ''}が平均${Math.round(Math.abs(difference))}分${direction}なりました`, sampleCount: Math.min(metric.sampleCount, metric.previousSampleCount) });
  });
  const notification = metrics.notification;
  if (notification.average !== undefined && notification.previousAverage !== undefined && notification.sampleCount >= MIN_COMPARISON_SAMPLES && notification.previousSampleCount >= MIN_COMPARISON_SAMPLES) {
    const difference = notification.previousAverage - notification.average;
    const status = difference >= 1 ? 'improved' : difference <= -1 ? 'attention' : 'maintain';
    candidates.push({ score: Math.abs(difference), status, message: `通知からの操作が平均${Math.round(Math.abs(difference))}分${difference >= 0 ? '短く' : '長く'}なりました`, sampleCount: Math.min(notification.sampleCount, notification.previousSampleCount) });
  }
  const focus = metrics.focus;
  if (focus.average !== undefined && focus.previousAverage !== undefined && focus.sampleCount >= MIN_COMPARISON_SAMPLES && focus.previousSampleCount >= MIN_COMPARISON_SAMPLES) {
    const difference = focus.average - focus.previousAverage;
    const status = difference >= 3 ? 'improved' : difference <= -3 ? 'attention' : 'maintain';
    candidates.push({ score: Math.abs(difference), status, message: `集中の実行率が${Math.round(Math.abs(difference))}%${difference >= 0 ? '上がりました' : '下がりました'}`, sampleCount: Math.min(focus.sampleCount, focus.previousSampleCount) });
  }
  rates.forEach((rate) => {
    if (rate.percent === undefined || rate.previousPercent === undefined || rate.denominator < MIN_COMPARISON_SAMPLES || rate.previousDenominator < MIN_COMPARISON_SAMPLES) return;
    const difference = rate.percent - rate.previousPercent;
    const status = difference >= 3 ? 'improved' : difference <= -3 ? 'attention' : 'maintain';
    candidates.push({ score: Math.abs(difference), status, message: `${rate.label}が${Math.abs(difference)}%${difference >= 0 ? '上がりました' : '下がりました'}`, sampleCount: Math.min(rate.denominator, rate.previousDenominator) });
  });
  const best = candidates.sort((left, right) => right.score - left.score)[0];
  const bestSampleCount = Math.max(0, ...Object.values(metrics).map((metric) => Math.min(metric.sampleCount, metric.previousSampleCount)));
  if (!best) {
    const remaining = Math.max(1, MIN_COMPARISON_SAMPLES - bestSampleCount);
    return { status: 'insufficient', message: `あと${remaining}件の記録で傾向を表示できます`, comparison: '今の期間と前の同じ期間を比較します', sampleCount: bestSampleCount };
  }
  return { ...best, comparison: `${shortDate(window.start)}〜${shortDate(window.end)} と、その前の${daysBetween(window.start, window.end)}日間を比較` };
}

function getSuggestion(events: BehaviorEvent[], plans: DeparturePlan[], window: RangeWindow): InsightSuggestion | undefined {
  const plansById = new Map(plans.filter((plan) => plan.id).map((plan) => [plan.id!, plan]));
  const grouped = new Map<string, BehaviorEvent[]>();
  events.filter((event) => event.type === 'departure_preparation_started' && event.departurePlanId && typeof event.deltaMinutes === 'number' && withinRange(eventDate(event), window)).forEach((event) => {
    const current = grouped.get(event.departurePlanId!) ?? [];
    current.push(event);
    grouped.set(event.departurePlanId!, current);
  });
  const candidate = [...grouped.entries()]
    .map(([planId, records]) => ({ planId, records, averageDelay: average(records.map((record) => record.deltaMinutes!)) ?? 0, plan: plansById.get(planId) }))
    .filter((item) => item.plan && item.records.length >= MIN_COMPARISON_SAMPLES && item.averageDelay >= 5)
    .sort((left, right) => right.averageDelay - left.averageDelay)[0];
  if (!candidate?.plan) return undefined;
  const current = candidate.plan.preparationMinutes;
  const next = Math.min(180, current + 10);
  if (next === current) return undefined;
  return {
    id: 'preparation_time',
    title: '準備時間を10分長くする',
    reason: `${candidate.plan.title}は、準備開始が平均${Math.round(candidate.averageDelay)}分遅れています`,
    currentValue: `${current}分`,
    nextValue: `${next}分`,
    planId: candidate.plan.id!,
    currentPreparationMinutes: current,
    nextPreparationMinutes: next,
  };
}

export function buildInsightDashboard(events: BehaviorEvent[], plans: DeparturePlan[], range: InsightRange, now = new Date()): InsightDashboard {
  const window = getRangeWindow(events, range, now);
  const metrics = {
    preparation: metricSummary(events, 'preparation', window),
    departure: metricSummary(events, 'departure', window),
    notification: metricSummary(events, 'notification', window),
    focus: metricSummary(events, 'focus', window),
  };
  const previousWindow = window.previousStart && window.previousEnd ? { start: window.previousStart, end: window.previousEnd } : { start: '', end: '' };
  const rates = [
    asRate('departure', '予定どおり出発', '予定〜5分以内に出発', departureRate(events, window), departureRate(events, previousWindow)),
    asRate('notification', '5分以内に反応', '通知後5分以内に最初の操作', notificationRate(events, window), notificationRate(events, previousWindow)),
    asRate('focus', '集中を完走', '開始した集中を最後まで完了', focusRate(events, window), focusRate(events, previousWindow)),
  ];
  return {
    range,
    rangeLabel: rangeLabel(window, range),
    hasPreviousRange: Boolean(window.previousStart && window.previousEnd),
    metrics,
    rates,
    notificationResponses: notificationBreakdown(events, window),
    weekdayConditions: conditionStats(events, window, 'weekday'),
    timeOfDayConditions: conditionStats(events, window, 'timeOfDay'),
    trend: makeTrend(metrics, rates, window, range),
    suggestion: getSuggestion(events, plans, window),
  };
}

export function formatMetricAverage(metric: InsightMetric, value?: number): string {
  if (value === undefined) return '記録なし';
  if (metric === 'focus') return `平均 ${Math.round(value)}%`;
  if (metric === 'notification') return `平均 ${Math.round(value)}分`;
  if (Math.abs(value) < 1) return '予定どおり';
  return `${Math.abs(Math.round(value))}分${value > 0 ? '早め' : '遅れ'}`;
}

export function formatPointValue(metric: InsightMetric, value: number): string {
  if (metric === 'focus') return `${Math.round(value)}% 実行`;
  if (metric === 'notification') return `${Math.round(value)}分後に操作`;
  if (Math.abs(value) < 1) return '予定どおり';
  return `${Math.abs(Math.round(value))}分${value > 0 ? '早め' : '遅れ'}`;
}

export function formatComparison(metric: InsightMetric, current?: number, previous?: number): string {
  if (current === undefined || previous === undefined) return '前期間の記録なし';
  const difference = metric === 'notification' ? previous - current : current - previous;
  if (Math.abs(difference) < 1) return '前期間とほぼ同じ';
  const suffix = metric === 'focus' ? '%' : '分';
  return `前期間より${Math.abs(Math.round(difference))}${suffix}${difference > 0 ? '改善' : '変化あり'}`;
}

export function insightPointDateLabel(key: string): string {
  return shortDate(key);
}
