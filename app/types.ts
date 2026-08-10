import { ChicCheckColor, ChicPattern, DesignMode } from './theme';
import { RecoveryRecord } from './recovery';
import { FocusSession } from './focusSession';
import { DepartureCheckIn } from './departureCheckIn';
import { PlanTier } from './premiumAccess';
import { BehaviorEvent } from './behaviorEvents';
import { PremiumTaskTemplate } from './taskTemplates';

export type Screen = 'home' | 'timeline' | 'analysis' | 'settings' | 'wish';
export type TimeTab = 'departure' | 'deadline' | 'calendar' | 'focus';
export type WidgetSize = 'small' | 'medium';
export type Category = '仕事' | '家事' | '健康' | '予定' | 'その他';
export type Priority = '高' | '中' | '低';
export type RepeatRule = 'none' | 'daily' | 'weekdays' | 'weekly';
export type TaskBucket = 'now' | 'later' | 'waiting';
export type NudgeMode = 'once' | 'repeat' | 'strong';
export type ThemeMode = DesignMode;
export type UrgencyStatus = '余裕あり' | 'そろそろ準備' | '今出れば間に合う' | '急いで出発' | '予定どおりは厳しい' | 'リカバリーが必要';

export type Task = {
  id: string;
  title: string;
  createdAt?: string;
  done: boolean;
  remindAt?: string;
  remindDate?: string;
  deadlineDate?: string;
  deadlineTime?: string;
  deadlineNotifyBefore?: number;
  navigationEnabled?: boolean;
  preparationMinutes?: number;
  travelMinutes?: number;
  bufferMinutes?: number;
  repeatRule?: RepeatRule;
  isRoutine?: boolean;
  routineId?: string;
  bucket?: TaskBucket;
  nudgeMode?: NudgeMode;
  scheduledDate?: string;
  scheduledTime?: string;
  category: Category;
  priority: Priority;
  completedAt?: string;
};

export type DeparturePlan = {
  id?: string;
  title: string;
  destination?: string;
  /** 端末カレンダーから取り込んだ予定を重複登録しないための端末内ID。 */
  externalCalendarEventId?: string;
  /** false の予定は予定表だけへ表示し、出発の逆算・通知・カウントダウンを行わない。 */
  countdownEnabled?: boolean;
  date: string;
  arrival: string;
  travelMinutes: number;
  preparationMinutes: number;
  bufferMinutes: number;
};

export type Wish = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
};

export type WishAction = {
  id: string;
  wishId: string;
  title: string;
  completed: boolean;
  completedAt?: string;
};

export type MonthlyReview = {
  id?: string;
  photo?: string;
  date?: string;
  shortNote?: string;
  memo?: string;
  satisfaction?: number;
};

export type MonthlyWishState = {
  theme?: string;
  wishes: Wish[];
  actions: WishAction[];
  review: MonthlyReview;
  reviews?: MonthlyReview[];
};

export type WishMonthMap = Record<string, MonthlyWishState>;
export type CalendarMarks = Record<string, string>;
export type DeparturePreparationStatus = 'preparing' | 'prepared';

export type SharedAttendanceStatus = '参加' | '不参加';
export type SharedActionStatus = '未準備' | '準備中' | '今から出る' | '移動中' | '少し遅れそう' | '到着した' | '参加できない';
export type SharedDeparturePoint = 'current' | 'home' | 'custom';

export type SharedParticipant = {
  participantId: string;
  sharedEventId: string;
  displayName: string;
  attendanceStatus: SharedAttendanceStatus;
  actionStatus: SharedActionStatus;
  estimatedArrivalAt?: string;
  lastUpdatedAt: string;
};

export type SharedEvent = {
  shareToken: string;
  eventId: string;
  ownerDisplayName: string;
  sharingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  title: string;
  date: string;
  destination?: string;
  arrival: string;
  travelMinutes: number;
  preparationMinutes: number;
  bufferMinutes: number;
  participants: SharedParticipant[];
};

export type SharedParticipantPrefs = {
  departurePoint: SharedDeparturePoint;
  departurePointLabel?: string;
};

export type PersistedState = {
  tasks: Task[];
  plan: DeparturePlan;
  departurePlans: DeparturePlan[];
  widgetSize: WidgetSize;
  showCompleted: boolean;
  completionIcon: string;
  designMode: DesignMode;
  taskTemplates?: string[];
  chicPattern?: ChicPattern;
  chicCheckColor?: ChicCheckColor;
  recoveryHistory?: RecoveryRecord[];
  focusSessions?: FocusSession[];
  departureCheckIns?: DepartureCheckIn[];
  devPremiumPreview?: boolean;
  devPlanTier?: PlanTier;
  behaviorEvents?: BehaviorEvent[];
  savedTaskTemplates?: PremiumTaskTemplate[];
  wishMonths?: WishMonthMap;
  calendarMarks?: CalendarMarks;
  sharedEvents?: SharedEvent[];
  sharedParticipantIdsByToken?: Record<string, string>;
  sharedParticipantPrefsByToken?: Record<string, SharedParticipantPrefs>;
  departurePreparationStatuses?: Record<string, DeparturePreparationStatus>;
};
