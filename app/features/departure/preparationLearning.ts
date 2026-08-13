import { BehaviorEvent } from '../../behaviorEvents';
import { DeparturePlan } from '../../types';
import { dateForReminder } from '../tasks/taskUtils';

export type PreparationRecommendationSource =
  | 'destination'
  | 'title'
  | 'weekday_time'
  | 'last_used'
  | 'default';

export type PreparationRecommendation = {
  minutes: number;
  sampleCount: number;
  source: PreparationRecommendationSource;
  message: string;
};

type PreparationObservation = {
  planId: string;
  date: string;
  title: string;
  destination?: string;
  arrival?: string;
  minutes: number;
};

const MIN_PREPARATION_MINUTES = 5;
const MAX_PREPARATION_MINUTES = 180;

/** Normalizes only for exact matching. It deliberately never performs partial matching. */
export function normalizePlanMatchText(value?: string): string {
  return (value ?? '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ja-JP')
    .replace(/\s+/g, ' ');
}

function eventDate(event: BehaviorEvent): Date | undefined {
  const date = new Date(event.actualAt ?? event.occurredAt);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function eventGroupKey(event: BehaviorEvent): string | undefined {
  if (!event.departurePlanId) return undefined;
  return `${event.departurePlanId}:${event.departurePlanDate ?? ''}`;
}

/**
 * Creates observations from actual behaviour only. Saved plan values are not
 * observations, so an old configured duration can never teach the app a value.
 */
export function getPreparationObservations(
  events: BehaviorEvent[],
  plans: DeparturePlan[],
): PreparationObservation[] {
  const plansById = new Map(
    plans
      .filter((plan): plan is DeparturePlan & { id: string } => Boolean(plan.id))
      .map((plan) => [plan.id, plan]),
  );
  const byOccurrence = new Map<string, { preparation?: BehaviorEvent; departure?: BehaviorEvent }>();

  events
    .filter((event) => event.type === 'departure_preparation_started' || event.type === 'departure_started')
    .forEach((event) => {
      const key = eventGroupKey(event);
      if (!key) return;
      const item = byOccurrence.get(key) ?? {};
      const existing = event.type === 'departure_preparation_started' ? item.preparation : item.departure;
      if (!existing || (eventDate(event)?.getTime() ?? 0) > (eventDate(existing)?.getTime() ?? 0)) {
        if (event.type === 'departure_preparation_started') item.preparation = event;
        else item.departure = event;
      }
      byOccurrence.set(key, item);
    });

  return [...byOccurrence.values()].flatMap(({ preparation, departure }) => {
    if (!preparation || !departure || !preparation.departurePlanId) return [];
    const preparationAt = eventDate(preparation);
    const departureAt = eventDate(departure);
    if (!preparationAt || !departureAt) return [];

    const minutes = Math.round((departureAt.getTime() - preparationAt.getTime()) / 60_000);
    if (minutes < MIN_PREPARATION_MINUTES || minutes > MAX_PREPARATION_MINUTES) return [];

    const plan = plansById.get(preparation.departurePlanId);
    return [{
      planId: preparation.departurePlanId,
      date: preparation.departurePlanDate ?? plan?.date ?? '',
      title: plan?.title ?? preparation.departurePlanTitleSnapshot ?? departure.departurePlanTitleSnapshot ?? '',
      destination: plan?.destination,
      arrival: plan?.arrival,
      minutes,
    }];
  });
}

function roundToFive(minutes: number): number {
  return Math.max(0, Math.round(minutes / 5) * 5);
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function representativeValue(values: number[]): number {
  if (values.length === 1) return values[0]!;
  if (values.length === 2) return (values[0]! + values[1]!) / 2;
  return median(values);
}

function recommendationFrom(
  values: number[],
  source: PreparationRecommendationSource,
  fallbackMinutes: number,
): PreparationRecommendation {
  if (!values.length) {
    return {
      minutes: fallbackMinutes,
      sampleCount: 0,
      source: 'default',
      message: `標準の準備時間 ${fallbackMinutes}分を使っています`,
    };
  }

  const minutes = roundToFive(representativeValue(values));
  const sampleText = values.length === 1 ? '1回の実績' : `過去${values.length}回の実績`;
  return {
    minutes,
    sampleCount: values.length,
    source,
    message: `${sampleText}から準備時間を${minutes}分にしています`,
  };
}

function sameWeekdayAndNearbyArrival(observation: PreparationObservation, draft: DeparturePlan): boolean {
  if (!observation.date || !observation.arrival) return false;
  const observed = dateForReminder(observation.date, observation.arrival);
  const planned = dateForReminder(draft.date, draft.arrival);
  if (observed.getDay() !== planned.getDay()) return false;
  const observedMinutes = observed.getHours() * 60 + observed.getMinutes();
  const plannedMinutes = planned.getHours() * 60 + planned.getMinutes();
  return Math.abs(observedMinutes - plannedMinutes) <= 120;
}

function latestUsedMinutes(plans: DeparturePlan[], draft: DeparturePlan): number | undefined {
  const draftTime = dateForReminder(draft.date, draft.arrival).getTime();
  const candidates = plans
    .filter((plan) => plan.id !== draft.id && plan.countdownEnabled !== false && Number.isFinite(plan.preparationMinutes))
    .filter((plan) => dateForReminder(plan.date, plan.arrival).getTime() <= draftTime)
    .sort((left, right) => dateForReminder(right.date, right.arrival).getTime() - dateForReminder(left.date, left.arrival).getTime());
  return candidates[0] ? roundToFive(candidates[0].preparationMinutes) : undefined;
}

export function recommendPreparationMinutes(args: {
  draft: DeparturePlan;
  plans: DeparturePlan[];
  events: BehaviorEvent[];
  standardMinutes: number;
}): PreparationRecommendation {
  const fallback = Math.max(0, roundToFive(args.standardMinutes));
  const observations = getPreparationObservations(args.events, args.plans);
  const destination = normalizePlanMatchText(args.draft.destination);
  const title = normalizePlanMatchText(args.draft.title);

  const destinationMatches = destination
    ? observations.filter((item) => normalizePlanMatchText(item.destination) === destination)
    : [];
  if (destinationMatches.length) {
    return recommendationFrom(destinationMatches.map((item) => item.minutes), 'destination', fallback);
  }

  const titleMatches = title
    ? observations.filter((item) => normalizePlanMatchText(item.title) === title)
    : [];
  if (titleMatches.length) {
    return recommendationFrom(titleMatches.map((item) => item.minutes), 'title', fallback);
  }

  const weekdayMatches = observations.filter((item) => sameWeekdayAndNearbyArrival(item, args.draft));
  if (weekdayMatches.length) {
    return recommendationFrom(weekdayMatches.map((item) => item.minutes), 'weekday_time', fallback);
  }

  const lastUsed = latestUsedMinutes(args.plans, args.draft);
  if (lastUsed !== undefined) {
    return {
      minutes: lastUsed,
      sampleCount: 0,
      source: 'last_used',
      message: `直前に使った準備時間 ${lastUsed}分を使っています`,
    };
  }

  return recommendationFrom([], 'default', fallback);
}
