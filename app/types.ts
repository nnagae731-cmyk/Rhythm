import { ChicCheckColor, ChicPattern, DesignMode } from './theme';
import { RecoveryRecord } from './recovery';
import { FocusSession } from './focusSession';
import { DepartureCheckIn } from './departureCheckIn';
import { PlanTier } from './premiumAccess';
import { BehaviorEvent } from './behaviorEvents';
import { PremiumTaskTemplate } from './taskTemplates';
import type { NormalizedCropRect } from './features/photo/topImageCrop';

export type Screen = 'home' | 'timeline' | 'analysis' | 'settings' | 'wish';
export type TimeTab = 'departure' | 'deadline' | 'calendar' | 'focus';
export type WidgetSize = 'small' | 'medium';
export type Category = '仕事' | '家事' | '健康' | '予定' | 'その他';
export type Priority = '高' | '中' | '低';
export type RepeatRule = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
export type TaskBucket = 'now' | 'later' | 'waiting';
export type Subtask = { id: string; title: string; done: boolean; order: number };
export type TaskStatus = 'active' | 'completed' | 'skipped';
export type NudgeMode = 'once' | 'repeat' | 'strong';
export type ThemeMode = DesignMode;
export type UrgencyStatus = '余裕あり' | 'そろそろ準備' | '今出れば間に合う' | '急いで出発' | '予定どおりは厳しい' | 'リカバリーが必要';

export type Task = {
  id: string;
  title: string;
  createdAt?: string;
  done: boolean;
  /** New status flag; legacy tasks derive this from `done` when absent. */
  status?: TaskStatus;
  /** Local day on which the task was skipped. */
  skippedAt?: string;
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
  /** Set only when the routine is explicitly turned off; preserved for historical analysis. */
  routineEndedAt?: string;
  bucket?: TaskBucket;
  nudgeMode?: NudgeMode;
  scheduledDate?: string;
  scheduledTime?: string;
  /** Optional end time for schedule range display. Legacy tasks omit this. */
  endAt?: string;
  category: Category;
  priority: Priority;
  completedAt?: string;
  /** One-level child tasks. Absent on legacy tasks. */
  subtasks?: Subtask[];
};

export type DeparturePlan = {
  id?: string;
  title: string;
  destination?: string;
  /** 端末カレンダーから取り込んだ予定を重複登録しないための端末内ID。 */
  externalCalendarEventId?: string;
  /** false の予定は予定表だけへ表示し、出発の逆算・通知・カウントダウンを行わない。 */
  countdownEnabled?: boolean;
  /** Explicit schedule mode for newly saved plans. */
  planMode?: 'calendar_only' | 'departure_reminder' | 'arrival_reverse';
  /** Used only by a direct-departure reminder. `arrival` remains for legacy plans. */
  departureTime?: string;
  date: string;
  arrival: string;
  /** Optional local HH:mm end time for schedule display. */
  endAt?: string | null;
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
  photos?: string[];
  date?: string;
  shortNote?: string;
  memo?: string;
  satisfaction?: number;
};

export type ReflectionCardTemplate = 'gallery' | 'film' | 'scrapbook';
export type ReflectionCardPalette = 'lavender' | 'blue' | 'peach' | 'green';

/** Optional monthly card metadata; old wish data remains valid without it. */
export type MonthlyReflectionCard = {
  monthKey: string;
  photoIds: string[];
  phrase: string;
  bestMemory: string;
  template: ReflectionCardTemplate;
  palette: ReflectionCardPalette;
  updatedAt: string;
};

export type MonthlyWishState = {
  theme?: string;
  wishes: Wish[];
  actions: WishAction[];
  review: MonthlyReview;
  reviews?: MonthlyReview[];
  reflectionCard?: MonthlyReflectionCard;
};

export type Affirmation = {
  id: string;
  text: string;
  templateId?: string;
  source?: 'template' | 'custom';
  customTextId?: string;
  time: string;
  enabled: boolean;
  createdAt: string;
  notificationId?: string;
};

export type AffirmationCustomText = {
  id: string;
  text: string;
  createdAt: string;
};

export type PhotoThemeTopSlot = 'home' | 'timeline' | 'analysis' | 'wish' | 'settings';
export type PhotoThemePhotoTarget = 'background' | 'focus' | PhotoThemeTopSlot;

export type PhotoThemeSettings = {
  imageUri?: string;
  placement: 'background' | 'top';
  topImageUris?: Partial<Record<PhotoThemeTopSlot, string>>;
  /** 元画像URI。表示用URIが切り取られた旧データの場合もフォールバックする。 */
  topImageOriginalUris?: Partial<Record<PhotoThemeTopSlot, string>>;
  topImageAdjustments?: Partial<Record<PhotoThemeTopSlot, { scale: number; offsetX: number; offsetY: number }>>;
  topImageCropRects?: Partial<Record<PhotoThemeTopSlot, NormalizedCropRect>>;
  focusBackgroundUri?: string;
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
  /** Mono appearance preference. Optional for backwards compatibility with older saves. */
  monoAppearance?: 'auto' | 'light' | 'dark';
  hapticsEnabled?: boolean;
  reviewPromptedAt?: string;
  taskTemplates?: string[];
  chicPattern?: ChicPattern;
  chicCheckColor?: ChicCheckColor;
  recoveryHistory?: RecoveryRecord[];
  focusSessions?: FocusSession[];
  /** Last custom Focus duration in minutes. Kept optional for older saves. */
  focusCustomDurationMinutes?: number;
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
  affirmations?: Affirmation[];
  affirmationCustomTexts?: AffirmationCustomText[];
  photoTheme?: PhotoThemeSettings;
};
