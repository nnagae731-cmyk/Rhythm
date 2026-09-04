import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { Affirmation, AffirmationCustomText, DeparturePlan, Task, WidgetMonoTemplate, WidgetPhotoLayout, WidgetType, WishMonthMap } from '../../types';
import { DepartureCheckIn } from '../../departureCheckIn';
import { getDeparturePlanMode, getPlanScheduledTime, isDepartureReminderPlan } from '../departure/departurePlanMode';
import { getDepartureMoments } from '../departure/departureUtils';
import { dateForReminder, dateKey } from '../tasks/taskUtils';
import { selectCurrentTask, selectCurrentTasks, selectNextUpcomingPlan, taskActionableAt, taskDeadlineAt } from '../tasks/taskSelectors';

export const RHYTHM_WIDGET_APP_GROUP = 'group.app.rhythm.daily';

export type RhythmWidgetAppearance = {
  /** Selected by the app's Widget settings UI. Mono remains the default. */
  style: 'mono' | 'color' | 'photo';
  monoTemplate?: WidgetMonoTemplate;
  accentHex?: string;
  /** Filename in the App Group container; the image itself is never in the snapshot. */
  photoFileName?: string;
  photoLayout?: 'background' | 'right' | 'top' | 'card' | 'circle' | 'cutout';
  /** Filename of the transparent foreground PNG in the App Group container. */
  cutoutFileName?: string;
  /** Existing app Design identifiers. These are decoration hints only; the
   * native renderer keeps Mono/Photo fallbacks when they are absent. */
  designPattern?: string;
  designCheckColor?: string;
  /** Existing Design Customize/Premium gate; never grants access by itself. */
  designPatternUnlocked?: boolean;
  affirmationBackgrounds?: Array<'floral' | 'dot' | 'check' | 'photo'>;
};

/** Per-widget photo references. Image bytes remain in the App Group container. */
export type RhythmWidgetCustomization = {
  photoFileName?: string;
  cutoutFileName?: string;
  photoLayout?: WidgetPhotoLayout;
  monoTemplate?: WidgetMonoTemplate;
};

export type RhythmWidgetSnapshot = {
  updatedAt: string;
  /** Effective entitlements used by the extension to gate Widget kinds. */
  isPremium?: boolean;
  /** True when Design Customize is purchased or included with Premium. */
  designCustomizePurchased?: boolean;
  appearance?: RhythmWidgetAppearance;
  widgetCustomizations?: Partial<Record<WidgetType, RhythmWidgetCustomization>>;
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
    /** Derived ranking timestamps so the Widget can re-evaluate time changes. */
    actionableAt?: string;
    deadlineAt?: string;
    createdAt?: string;
    scheduledDate?: string;
  };
  /** Bounded candidates used by WidgetKit timeline entries after the app closes. */
  currentTaskCandidates?: Array<NonNullable<RhythmWidgetSnapshot['currentTask']>>;
  /** Additional actionable tasks for the Medium current-task widget. */
  todayNowTasks?: Array<NonNullable<RhythmWidgetSnapshot['currentTask']>>;
  /** Total actionable tasks after the featured current task, before the
   * Medium widget's three-row display limit. */
  todayNowTaskCount?: number;
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
  /** Bounded future plans used to switch the next-plan display without JS. */
  nextPlans?: Array<NonNullable<RhythmWidgetSnapshot['nextPlan']>>;
  /** Bounded schedule source used to rebuild date-based widgets at boundaries. */
  calendarPlans?: WidgetScheduleItem[];
  calendarMonth?: {
    year: number;
    month: number;
    leadingEmptyCount: number;
    days: Array<{ date: string; day: number; weekdayIndex: number; hasSchedule: boolean; scheduleCount: number; scheduleTitle?: string; isToday: boolean }>;
  };
  calendarWeek?: {
    startDate: string;
    days: Array<{ date: string; day: number; weekday: string; isToday: boolean; schedules: WidgetScheduleItem[] }>;
  };
  todaySchedules?: WidgetScheduleItem[];
  todayScheduleCount?: number;
  checklist?: Array<{ id: string; title: string; done: boolean }>;
  goal?: { id: string; title: string; progress: number; completedActions: number; actionCount: number };
  goalMonths?: Record<string, NonNullable<RhythmWidgetSnapshot['goal']>>;
  widgetPhotoUnlock?: { widgetType: WidgetType | null; expiresAt: string | null };
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
  widgetCustomizations?: Partial<Record<WidgetType, RhythmWidgetCustomization>>;
  displayOptions?: Record<string, boolean>;
  wishMonths?: WishMonthMap;
  affirmations?: Affirmation[];
  affirmationCustomTexts?: AffirmationCustomText[];
  affirmationPhotoFileNames?: string[];
  widgetPhotoUnlock?: { widgetType: WidgetType | null; expiresAt: string | null };
  now?: Date;
};

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
  const scheduleTitles = new Map<string, string>();
  departurePlans.forEach((plan) => {
    scheduleCounts.set(plan.date, (scheduleCounts.get(plan.date) ?? 0) + 1);
    if (!scheduleTitles.has(plan.date) && plan.title.trim()) scheduleTitles.set(plan.date, plan.title.trim());
  });
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
      ...(scheduleTitles.get(date) ? { scheduleTitle: scheduleTitles.get(date)!.slice(0, 8) } : {}),
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
  widgetCustomizations,
  displayOptions,
  wishMonths,
  affirmations = [],
  affirmationCustomTexts = [],
  affirmationPhotoFileNames = [],
  widgetPhotoUnlock,
  now = new Date(),
}: SnapshotInput): RhythmWidgetSnapshot {
  const today = dateKey(now);
  const currentCandidates = tasks
    .filter((task) => !task.done && task.status !== 'skipped' && (task.bucket ?? 'now') === 'now')
    .filter((task) => !task.scheduledDate || task.scheduledDate <= today);
  const currentTask = selectCurrentTask(currentCandidates, now);
  const rankedCurrentTasks = selectCurrentTasks(currentCandidates, now);
  const remainingCurrentTasks = rankedCurrentTasks.filter((task) => task.id !== currentTask?.id);
  const todayNowTasks = remainingCurrentTasks.slice(0, 3);

  // Keep enough future/current candidates for WidgetKit to re-evaluate the
  // same ranking when the app is not running. The bound prevents snapshots
  // from growing with the full task history.
  const futureCandidates = tasks
    .filter((task) => !task.done && task.status !== 'skipped' && (task.bucket ?? 'now') === 'now')
    .filter((task) => Boolean(task.scheduledDate && task.scheduledDate > today))
    .sort((a, b) => (taskActionableAt(a)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (taskActionableAt(b)?.getTime() ?? Number.MAX_SAFE_INTEGER));
  const timelineTaskCandidates = [...rankedCurrentTasks, ...futureCandidates]
    .filter((task, index, all) => all.findIndex((candidate) => candidate.id === task.id) === index)
    .slice(0, 16);

  const serializeTask = (task: Task) => {
    const taskStart = taskStartAt(task);
    const estimated = taskEstimatedMinutes(task);
    const actionable = taskActionableAt(task);
    const deadline = taskDeadlineAt(task);
    return {
      id: task.id,
      title: task.title,
      ...(taskStart ? { startAt: taskStart.toISOString() } : {}),
      ...(estimated ? { estimatedMinutes: estimated } : {}),
      ...(taskStart && taskStart.getTime() > now.getTime() ? { remainingMinutes: Math.max(0, Math.ceil((taskStart.getTime() - now.getTime()) / 60000)) } : {}),
      ...(actionable ? { actionableAt: actionable.toISOString() } : {}),
      ...(deadline ? { deadlineAt: deadline.toISOString() } : {}),
      ...(task.createdAt ? { createdAt: task.createdAt } : {}),
      ...(task.scheduledDate ? { scheduledDate: task.scheduledDate } : {}),
      status: task.status ?? 'active',
      priority: task.priority,
    };
  };

  const nextPlanValue = selectNextUpcomingPlan(departurePlans, now, canShowArrivalReverseCountdown);
  const nextPlan = nextPlanValue ? { plan: nextPlanValue, scheduledAt: planScheduledAt(nextPlanValue) } : undefined;
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
  const goalForMonth = (monthKey: string) => {
    const monthState = wishMonths?.[monthKey];
    const selectedWish = monthState?.wishes.find((wish) => wish.id === monthState.topWishId)
      ?? monthState?.wishes.find((wish) => !wish.completed)
      ?? monthState?.wishes[0];
    const goalActions = selectedWish ? (monthState?.actions ?? []).filter((action) => action.wishId === selectedWish.id) : [];
    return selectedWish
      ? { id: selectedWish.id, title: selectedWish.title, progress: selectedWish.completed ? 100 : goalActions.length ? Math.round((goalActions.filter((action) => action.completed).length / goalActions.length) * 100) : 0, completedActions: goalActions.filter((action) => action.completed).length, actionCount: goalActions.length }
      : monthState?.monthlyGoal?.trim()
        ? { id: `monthly-goal-${monthKey}`, title: monthState.monthlyGoal.trim(), progress: 0, completedActions: 0, actionCount: 0 }
        : undefined;
  };
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthKey = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const goal = goalForMonth(currentMonthKey);
  const goalMonths = [currentMonthKey, nextMonthKey].reduce<Record<string, NonNullable<RhythmWidgetSnapshot['goal']>>>((result, key) => {
    const value = goalForMonth(key); if (value) result[key] = value; return result;
  }, {});
  const affirmationPool = [
    ...affirmations.filter((item) => item.enabled).map((item) => ({ id: item.id, text: item.text.trim() })),
    ...affirmationCustomTexts.map((item) => ({ id: item.id, text: item.text.trim() })),
  ].filter((item) => item.text.length > 0).slice(0, 8);

  const nextPlans = departurePlans
    .filter((plan) => !plan.allDay)
    .map((plan) => ({ plan, scheduledAt: planScheduledAt(plan) }))
    .map(({ plan, scheduledAt }) => ({ plan, scheduledAt, comparisonAt: departureAtForWidget(plan, departureCheckIns, canShowArrivalReverseCountdown) ?? scheduledAt }))
    .filter(({ comparisonAt }) => comparisonAt.getTime() >= now.getTime())
    .sort((a, b) => a.comparisonAt.getTime() - b.comparisonAt.getTime())
    .slice(0, 8)
    .map(({ plan, scheduledAt }) => {
      const leave = departureAtForWidget(plan, departureCheckIns, canShowArrivalReverseCountdown);
      return {
        id: plan.id,
        title: plan.title,
        scheduledAt: scheduledAt.toISOString(),
        ...(plan.destination?.trim() ? { location: plan.destination.trim() } : {}),
        ...(leave && leave.getTime() > now.getTime() ? { leaveAt: leave.toISOString(), departureAt: leave.toISOString(), remainingToLeave: Math.max(0, Math.ceil((leave.getTime() - now.getTime()) / 60000)) } : {}),
      };
    });

  return {
    updatedAt: now.toISOString(),
    isPremium,
    designCustomizePurchased,
    ...(appearance ? { appearance } : {}),
    ...(widgetCustomizations && Object.keys(widgetCustomizations).length ? { widgetCustomizations } : {}),
    ...(displayOptions ? { displayOptions } : {}),
    ...(currentTask ? { currentTask: serializeTask(currentTask) } : {}),
    ...(timelineTaskCandidates.length ? { currentTaskCandidates: timelineTaskCandidates.map(serializeTask) } : {}),
    ...(todayNowTasks.length ? {
      todayNowTasks: todayNowTasks.map((task) => {
        const taskStart = taskStartAt(task);
        const estimated = taskEstimatedMinutes(task);
        return {
          id: task.id,
          title: task.title,
          ...(taskStart ? { startAt: taskStart.toISOString() } : {}),
          ...(estimated ? { estimatedMinutes: estimated } : {}),
          status: task.status ?? 'active',
          priority: task.priority,
        };
      }),
    } : {}),
    ...(remainingCurrentTasks.length ? { todayNowTaskCount: remainingCurrentTasks.length } : {}),
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
    ...(nextPlans.length ? { nextPlans } : {}),
    calendarPlans: departurePlans
      .slice()
      .sort((a, b) => planScheduledAt(a).getTime() - planScheduledAt(b).getTime())
      .filter((plan) => plan.date >= localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)))
      .slice(0, 96)
      .map((plan) => scheduleWidgetItem(plan, departureCheckIns, canShowArrivalReverseCountdown)),
    calendarMonth: buildCalendarMonth(departurePlans, now),
    calendarWeek: buildCalendarWeek(departurePlans, departureCheckIns, canShowArrivalReverseCountdown, now),
    ...(todaySchedules.length ? { todaySchedules } : {}),
    ...(allTodaySchedules.length ? { todayScheduleCount: allTodaySchedules.length } : {}),
    checklist: tasks
      .flatMap((task) => (task.listItems ?? []).slice().sort((a, b) => a.order - b.order).map((item) => ({ id: `${task.id}:${item.id}`, taskId: task.id, listItemId: item.id, title: item.text, done: item.checked })))
      .filter((item) => item.title.trim().length > 0)
      .slice(0, 8),
    ...(goal ? { goal } : {}),
    ...(Object.keys(goalMonths).length ? { goalMonths } : {}),
    ...(widgetPhotoUnlock ? { widgetPhotoUnlock } : {}),
    ...(affirmationPool.length ? { affirmations: affirmationPool } : {}),
    ...(affirmationPhotoFileNames.length ? { affirmationPhotoFileNames: affirmationPhotoFileNames.slice(0, 3) } : {}),
  };
}

type RhythmWidgetNativeModule = {
  saveSnapshot(snapshot: string): Promise<boolean>;
  savePhoto?(uri: string): Promise<boolean>;
  saveWidgetPhoto?(uri: string, widgetType: WidgetType): Promise<boolean>;
  saveWidgetPhotoCutout?(uri: string, widgetType: WidgetType): Promise<boolean>;
  removeWidgetPhotoBackground?(uri: string, widgetType: WidgetType): Promise<string | null>;
  isWidgetPhotoBackgroundRemovalAvailable?(): Promise<boolean>;
  saveAffirmationPhoto?(uri: string, slot: number): Promise<boolean>;
  getPendingWidgetActions?(): Promise<string>;
  acknowledgePendingWidgetActions?(actionIds: string[]): Promise<boolean>;
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

/** Copies a widget-kind-specific image into the shared App Group container. */
export async function saveRhythmWidgetPhotoForWidget(uri: string, widgetType: WidgetType) {
  if (Platform.OS !== 'ios') return false;
  const module = requireOptionalNativeModule<RhythmWidgetNativeModule>('RhythmWidget');
  if (!module?.saveWidgetPhoto) return false;
  return module.saveWidgetPhoto(uri, widgetType);
}

/** Generates and caches a transparent foreground PNG using the iOS Vision module. */
export async function generateRhythmWidgetPhotoCutout(uri: string, widgetType: WidgetType) {
  if (Platform.OS !== 'ios') return false as const;
  const module = requireOptionalNativeModule<RhythmWidgetNativeModule>('RhythmWidget');
  if (__DEV__) console.log('[BackgroundRemoval][JS] start', { widgetType });
  if (__DEV__) console.log('[BackgroundRemoval][JS] sourceUri', uri);
  if (!module?.removeWidgetPhotoBackground) {
    if (__DEV__) console.log('[BackgroundRemoval][JS] nativeResult', { available: false, reason: 'module unavailable' });
    return false as const;
  }
  try {
    const result = (await module.removeWidgetPhotoBackground(uri, widgetType)) ?? false;
    if (__DEV__) console.log('[BackgroundRemoval][JS] nativeResult', { available: true, success: Boolean(result) });
    return result;
  } catch (error) {
    if (__DEV__) console.log('[BackgroundRemoval][JS] nativeResult', { available: true, success: false, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function isRhythmWidgetPhotoBackgroundRemovalAvailable() {
  if (Platform.OS !== 'ios') return false;
  const module = requireOptionalNativeModule<RhythmWidgetNativeModule>('RhythmWidget');
  if (!module?.isWidgetPhotoBackgroundRemovalAvailable) {
    if (__DEV__) console.log('[BackgroundRemoval][JS] nativeAvailable', false);
    return false;
  }
  const available = await module.isWidgetPhotoBackgroundRemovalAvailable();
  if (__DEV__) console.log('[BackgroundRemoval][JS] nativeAvailable', available);
  return available;
}

/** Copies the cached foreground PNG into the stable App Group filename. */
export async function saveRhythmWidgetPhotoCutout(uri: string, widgetType: WidgetType) {
  if (Platform.OS !== 'ios') return false;
  const module = requireOptionalNativeModule<RhythmWidgetNativeModule>('RhythmWidget');
  if (!module?.saveWidgetPhotoCutout) return false;
  const copied = await module.saveWidgetPhotoCutout(uri, widgetType);
  if (__DEV__) console.log('[BackgroundRemoval][JS] appGroupCopy', { widgetType, success: copied });
  return copied;
}

export async function saveRhythmAffirmationPhoto(uri: string, slot: number) {
  if (Platform.OS !== 'ios') return false;
  const module = requireOptionalNativeModule<RhythmWidgetNativeModule>('RhythmWidget');
  if (!module?.saveAffirmationPhoto) return false;
  return module.saveAffirmationPhoto(uri, slot);
}

export async function getRhythmWidgetPendingActions() {
  if (Platform.OS !== 'ios') return [];
  const module = requireOptionalNativeModule<RhythmWidgetNativeModule>('RhythmWidget');
  if (!module?.getPendingWidgetActions) return [];
  try {
    const raw = await module.getPendingWidgetActions();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function acknowledgeRhythmWidgetPendingActions(actionIds: string[]) {
  if (Platform.OS !== 'ios' || actionIds.length === 0) return false;
  const module = requireOptionalNativeModule<RhythmWidgetNativeModule>('RhythmWidget');
  return module?.acknowledgePendingWidgetActions ? module.acknowledgePendingWidgetActions(actionIds) : false;
}
