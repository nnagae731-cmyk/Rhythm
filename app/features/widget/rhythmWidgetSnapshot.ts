import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { Affirmation, AffirmationCustomText, DeparturePlan, Task, WishMonthMap } from '../../types';
import { DepartureCheckIn } from '../../departureCheckIn';
import { getDeparturePlanMode, getPlanScheduledTime, isDepartureReminderPlan } from '../departure/departurePlanMode';
import { getDepartureMoments } from '../departure/departureUtils';
import { dateForReminder, dateKey } from '../tasks/taskUtils';

export const RHYTHM_WIDGET_APP_GROUP = 'group.app.rhythm.daily';

export type RhythmWidgetAppearance = {
  /** Selected by the app's Widget settings UI. Mono remains the default. */
  style: 'mono' | 'color' | 'photo';
  accentHex?: string;
  /** Filename in the App Group container; the image itself is never in the snapshot. */
  photoFileName?: string;
  photoLayout?: 'background' | 'right' | 'top' | 'card' | 'circle';
  /** Existing app Design identifiers. These are decoration hints only; the
   * native renderer keeps Mono/Photo fallbacks when they are absent. */
  designPattern?: string;
  designCheckColor?: string;
  /** Existing Design Customize/Premium gate; never grants access by itself. */
  designPatternUnlocked?: boolean;
  affirmationBackgrounds?: Array<'floral' | 'dot' | 'check' | 'photo'>;
};

export type RhythmWidgetSnapshot = {
  updatedAt: string;
  /** Effective entitlements used by the extension to gate Widget kinds. */
  isPremium?: boolean;
  /** True when Design Customize is purchased or included with Premium. */
  designCustomizePurchased?: boolean;
  appearance?: RhythmWidgetAppearance;
  /** Kept in the payload for the native renderer's future display filtering. */
  displayOptions?: Record<string, boolean>;
  currentTask?: {
    id: string;
    title: string;
    startAt?: string;
    estimatedMinutes?: number;
    /** Minutes until the scheduled start when it is in the future. */
    remainingMinutes?: number;
    status?: string;
    priority?: Task['priority'];
  };
  nextPlan?: {
    id?: string;
    title: string;
    scheduledAt: string;
    location?: string;
    allDay?: boolean;
    leaveAt?: string;
    remainingToLeave?: number;
    /** Kept for compatibility with the first snapshot schema. */
    departureAt?: string;
  };
  calendarMonth?: {
    year: number;
    month: number;
    leadingEmptyCount: number;
    days: Array<{ date: string; day: number; weekdayIndex: number; hasSchedule: boolean; scheduleCount: number; isToday: boolean }>;
  };
  calendarWeek?: {
    startDate: string;
    days: Array<{ date: string; day: number; weekday: string; isToday: boolean; schedules: WidgetScheduleItem[] }>;
  };
  todaySchedules?: WidgetScheduleItem[];
  todayScheduleCount?: number;
  checklist?: Array<{ id: string; title: string; done: boolean }>;
  goal?: { id: string; title: string; progress: number; completedActions: number; actionCount: number };
  /** Bounded affirmation data; text only, never image bytes. */
  affirmations?: Array<{ id: string; text: string }>;
  affirmationPhotoFileNames?: string[];
};

export type WidgetScheduleItem = {
  id?: string;
  title: string;
  scheduledAt: string;
  location?: string;
  allDay?: boolean;
  leaveAt?: string;
};

type SnapshotInput = {
  tasks: Task[];
  departurePlans: DeparturePlan[];
  departureCheckIns: DepartureCheckIn[];
  /** Arrival-reverse countdowns stay behind the existing Premium entitlement. */
  canShowArrivalReverseCountdown: boolean;
  isPremium?: boolean;
  designCustomizePurchased?: boolean;
  appearance?: RhythmWidgetAppearance;
  displayOptions?: Record<string, boolean>;
  wishMonths?: WishMonthMap;
  affirmations?: Affirmation[];
  affirmationCustomTexts?: AffirmationCustomText[];
  affirmationPhotoFileNames?: string[];
  now?: Date;
};

const priorityOrder: Record<Task['priority'], number> = { 高: 0, 中: 1, 低: 2 };

function planScheduledAt(plan: DeparturePlan) {
  return dateForReminder(plan.date, plan.allDay ? '00:00' : getPlanScheduledTime(plan) || '00:00');
}

function wasAlreadyDeparted(plan: DeparturePlan, checkIns: DepartureCheckIn[]) {
  if (!plan.id) return false;
  return checkIns.some((item) => item.planId === plan.id && item.date === plan.date && Boolean(item.departedAt));
}

function departureAtForWidget(plan: DeparturePlan, checkIns: DepartureCheckIn[], canShowArrivalReverseCountdown: boolean) {
  if (plan.allDay || wasAlreadyDeparted(plan, checkIns)) return undefined;
  const mode = getDeparturePlanMode(plan);
  if (isDepartureReminderPlan(plan)) return planScheduledAt(plan);
  if (mode === 'arrival_reverse' && canShowArrivalReverseCountdown) return getDepartureMoments(plan).leave;
  return undefined;
}

function taskStartAt(task: Task | undefined) {
  if (!task || !task.scheduledDate || !task.scheduledTime) return undefined;
  return dateForReminder(task.scheduledDate, task.scheduledTime);
}

function taskEstimatedMinutes(task: Task | undefined) {
  if (!task || !task.scheduledDate || !task.scheduledTime || !task.endAt) return undefined;
  const start = dateForReminder(task.scheduledDate, task.scheduledTime);
  const end = dateForReminder(task.scheduledDate, task.endAt);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return minutes > 0 ? minutes : undefined;
}

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

function scheduleWidgetItem(plan: DeparturePlan, checkIns: DepartureCheckIn[], canShowArrivalReverseCountdown: boolean): WidgetScheduleItem {
  const scheduledAt = planScheduledAt(plan);
  const leaveAt = departureAtForWidget(plan, checkIns, canShowArrivalReverseCountdown);
  return {
    id: plan.id,
    title: plan.title,
    scheduledAt: scheduledAt.toISOString(),
    ...(plan.destination?.trim() ? { location: plan.destination.trim() } : {}),
    ...(plan.allDay ? { allDay: true } : {}),
    ...(leaveAt ? { leaveAt: leaveAt.toISOString() } : {}),
  };
}

function buildCalendarMonth(departurePlans: DeparturePlan[], now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const scheduleCounts = new Map<string, number>();
  departurePlans.forEach((plan) => scheduleCounts.set(plan.date, (scheduleCounts.get(plan.date) ?? 0) + 1));
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const scheduleCount = scheduleCounts.get(date) ?? 0;
    return {
      date,
      day,
      weekdayIndex: new Date(year, month - 1, day).getDay(),
      hasSchedule: scheduleCount > 0,
      scheduleCount,
      isToday: date === dateKey(now),
    };
  });
  return { year, month, leadingEmptyCount: firstWeekday, days };
}

function buildCalendarWeek(departurePlans: DeparturePlan[], checkIns: DepartureCheckIn[], canShowArrivalReverseCountdown: boolean, now: Date) {
  const today = dateKey(now);
  const plansByDate = new Map<string, DeparturePlan[]>();
  departurePlans.forEach((plan) => {
    const current = plansByDate.get(plan.date) ?? [];
    current.push(plan);
    plansByDate.set(plan.date, current);
  });
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 12, 0, 0, 0);
  return {
    startDate: localDateKey(sunday),
    days: Array.from({ length: 7 }, (_, index) => {
      const current = new Date(sunday);
      current.setDate(sunday.getDate() + index);
      const date = localDateKey(current);
      const schedules = (plansByDate.get(date) ?? [])
        .sort((a, b) => planScheduledAt(a).getTime() - planScheduledAt(b).getTime())
        .slice(0, 3)
        .map((plan) => scheduleWidgetItem(plan, checkIns, canShowArrivalReverseCountdown));
      return { date, day: current.getDate(), weekday: weekdayLabels[current.getDay()] ?? '', isToday: date === today, schedules };
    }),
  };
}

export function buildRhythmWidgetSnapshot({
  tasks,
  departurePlans,
  departureCheckIns,
  canShowArrivalReverseCountdown,
  isPremium = false,
  designCustomizePurchased = false,
  appearance,
  displayOptions,
  wishMonths,
  affirmations = [],
  affirmationCustomTexts = [],
  affirmationPhotoFileNames = [],
  now = new Date(),
}: SnapshotInput): RhythmWidgetSnapshot {
  const today = dateKey(now);
  const currentTask = [...tasks]
    .filter((task) => !task.done && task.status !== 'skipped' && (task.bucket ?? 'now') === 'now')
    .filter((task) => !task.scheduledDate || task.scheduledDate <= today)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? ''))[0];

  const nextPlan = departurePlans
    .map((plan) => ({ plan, scheduledAt: planScheduledAt(plan) }))
    .filter(({ plan, scheduledAt }) => plan.allDay ? plan.date >= today : scheduledAt.getTime() >= now.getTime())
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
  const rawDepartureAt = nextPlan
    ? departureAtForWidget(nextPlan.plan, departureCheckIns, canShowArrivalReverseCountdown)
    : undefined;
  const departureAt = rawDepartureAt && rawDepartureAt.getTime() > now.getTime() ? rawDepartureAt : undefined;
  const startAt = taskStartAt(currentTask);
  const estimatedMinutes = taskEstimatedMinutes(currentTask);
  const remainingMinutes = startAt && startAt.getTime() > now.getTime()
    ? Math.max(0, Math.ceil((startAt.getTime() - now.getTime()) / 60000))
    : undefined;
  const remainingToLeave = departureAt
    ? Math.max(0, Math.ceil((departureAt.getTime() - now.getTime()) / 60000))
    : undefined;
  const allTodaySchedules = departurePlans
    .filter((plan) => plan.date === today)
    .sort((a, b) => planScheduledAt(a).getTime() - planScheduledAt(b).getTime())
  const todaySchedules = allTodaySchedules.slice(0, 8).map((plan) => scheduleWidgetItem(plan, departureCheckIns, canShowArrivalReverseCountdown));
  const currentMonthState = wishMonths?.[`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`];
  const selectedWish = currentMonthState?.wishes.find((wish) => wish.id === currentMonthState.topWishId)
    ?? currentMonthState?.wishes.find((wish) => !wish.completed)
    ?? currentMonthState?.wishes[0];
  const goalActions = selectedWish ? (currentMonthState?.actions ?? []).filter((action) => action.wishId === selectedWish.id) : [];
  const goal = selectedWish
    ? {
      id: selectedWish.id,
      title: selectedWish.title,
      progress: selectedWish.completed ? 100 : goalActions.length ? Math.round((goalActions.filter((action) => action.completed).length / goalActions.length) * 100) : 0,
      completedActions: goalActions.filter((action) => action.completed).length,
      actionCount: goalActions.length,
    }
    : currentMonthState?.monthlyGoal?.trim()
      ? { id: `monthly-goal-${today.slice(0, 7)}`, title: currentMonthState.monthlyGoal.trim(), progress: 0, completedActions: 0, actionCount: 0 }
      : undefined;
  const affirmationPool = [
    ...affirmations.filter((item) => item.enabled).map((item) => ({ id: item.id, text: item.text.trim() })),
    ...affirmationCustomTexts.map((item) => ({ id: item.id, text: item.text.trim() })),
  ].filter((item) => item.text.length > 0).slice(0, 8);

  return {
    updatedAt: now.toISOString(),
    isPremium,
    designCustomizePurchased,
    ...(appearance ? { appearance } : {}),
    ...(displayOptions ? { displayOptions } : {}),
    ...(currentTask ? {
      currentTask: {
        id: currentTask.id,
        title: currentTask.title,
        ...(startAt ? { startAt: startAt.toISOString() } : {}),
        ...(estimatedMinutes ? { estimatedMinutes } : {}),
        ...(remainingMinutes !== undefined ? { remainingMinutes } : {}),
        status: currentTask.status ?? (currentTask.done ? 'completed' : 'active'),
        priority: currentTask.priority,
      },
    } : {}),
    ...(nextPlan ? {
      nextPlan: {
        id: nextPlan.plan.id,
        title: nextPlan.plan.title,
        scheduledAt: nextPlan.scheduledAt.toISOString(),
        ...(nextPlan.plan.destination?.trim() ? { location: nextPlan.plan.destination.trim() } : {}),
        ...(nextPlan.plan.allDay ? { allDay: true } : {}),
        ...(departureAt
          ? {
            leaveAt: departureAt.toISOString(),
            remainingToLeave,
            departureAt: departureAt.toISOString(),
          }
          : {}),
      },
    } : {}),
    calendarMonth: buildCalendarMonth(departurePlans, now),
    calendarWeek: buildCalendarWeek(departurePlans, departureCheckIns, canShowArrivalReverseCountdown, now),
    ...(todaySchedules.length ? { todaySchedules } : {}),
    ...(allTodaySchedules.length ? { todayScheduleCount: allTodaySchedules.length } : {}),
    checklist: tasks.filter((task) => (task.bucket ?? 'now') === 'waiting').slice(0, 8).map((task) => ({ id: task.id, title: task.title, done: task.done })),
    ...(goal ? { goal } : {}),
    ...(affirmationPool.length ? { affirmations: affirmationPool } : {}),
    ...(affirmationPhotoFileNames.length ? { affirmationPhotoFileNames: affirmationPhotoFileNames.slice(0, 3) } : {}),
  };
}

type RhythmWidgetNativeModule = {
  saveSnapshot(snapshot: string): Promise<boolean>;
  savePhoto?(uri: string): Promise<boolean>;
  saveAffirmationPhoto?(uri: string, slot: number): Promise<boolean>;
};

/** No-op in Expo Go or Android; the production iOS extension supplies this module. */
export async function saveRhythmWidgetSnapshot(snapshot: RhythmWidgetSnapshot) {
  if (Platform.OS !== 'ios') return false;
  const module = requireOptionalNativeModule<RhythmWidgetNativeModule>('RhythmWidget');
  if (!module?.saveSnapshot) return false;
  return module.saveSnapshot(JSON.stringify(snapshot));
}

/** Copies a managed app-local image into the App Group container for WidgetKit. */
export async function saveRhythmWidgetPhoto(uri: string) {
  if (Platform.OS !== 'ios') return false;
  const module = requireOptionalNativeModule<RhythmWidgetNativeModule>('RhythmWidget');
  if (!module?.savePhoto) return false;
  return module.savePhoto(uri);
}

export async function saveRhythmAffirmationPhoto(uri: string, slot: number) {
  if (Platform.OS !== 'ios') return false;
  const module = requireOptionalNativeModule<RhythmWidgetNativeModule>('RhythmWidget');
  if (!module?.saveAffirmationPhoto) return false;
  return module.saveAffirmationPhoto(uri, slot);
}
