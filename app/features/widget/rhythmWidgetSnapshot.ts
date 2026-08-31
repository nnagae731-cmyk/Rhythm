import { NativeModules, Platform } from 'react-native';
import { DeparturePlan, Task } from '../../types';
import { DepartureCheckIn } from '../../departureCheckIn';
import { getDeparturePlanMode, getPlanScheduledTime, isDepartureReminderPlan } from '../departure/departurePlanMode';
import { getDepartureMoments } from '../departure/departureUtils';
import { dateForReminder, dateKey } from '../tasks/taskUtils';

export const RHYTHM_WIDGET_APP_GROUP = 'group.app.rhythm.daily';

export type RhythmWidgetAppearance = {
  /** Reserved for the future Widget settings UI. Mono remains the default. */
  style: 'mono' | 'color' | 'photo';
  accentHex?: string;
};

export type RhythmWidgetSnapshot = {
  updatedAt: string;
  appearance?: RhythmWidgetAppearance;
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
};

type SnapshotInput = {
  tasks: Task[];
  departurePlans: DeparturePlan[];
  departureCheckIns: DepartureCheckIn[];
  /** Arrival-reverse countdowns stay behind the existing Premium entitlement. */
  canShowArrivalReverseCountdown: boolean;
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

export function buildRhythmWidgetSnapshot({
  tasks,
  departurePlans,
  departureCheckIns,
  canShowArrivalReverseCountdown,
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

  return {
    updatedAt: now.toISOString(),
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
  };
}

type RhythmWidgetNativeModule = { saveSnapshot(snapshot: string): Promise<boolean> };

/** No-op in Expo Go or Android; the production iOS extension supplies this module. */
export async function saveRhythmWidgetSnapshot(snapshot: RhythmWidgetSnapshot) {
  if (Platform.OS !== 'ios') return false;
  const module = NativeModules.RhythmWidget as RhythmWidgetNativeModule | undefined;
  if (!module?.saveSnapshot) return false;
  return module.saveSnapshot(JSON.stringify(snapshot));
}
