import { ChicPattern, DesignMode } from './theme';
import { RecoveryRecord } from './recovery';
import { FocusSession } from './focusSession';
import { DepartureCheckIn } from './departureCheckIn';
import { PlanTier } from './premiumAccess';
import { BehaviorEvent } from './behaviorEvents';
import { PremiumTaskTemplate } from './taskTemplates';

export type Screen = 'home' | 'timeline' | 'analysis' | 'settings';
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
  bucket?: TaskBucket;
  nudgeMode?: NudgeMode;
  scheduledDate?: string;
  category: Category;
  priority: Priority;
  completedAt?: string;
};

export type DeparturePlan = {
  id?: string;
  title: string;
  date: string;
  arrival: string;
  travelMinutes: number;
  preparationMinutes: number;
  bufferMinutes: number;
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
  recoveryHistory?: RecoveryRecord[];
  focusSessions?: FocusSession[];
  departureCheckIns?: DepartureCheckIn[];
  devPremiumPreview?: boolean;
  devPlanTier?: PlanTier;
  behaviorEvents?: BehaviorEvent[];
  savedTaskTemplates?: PremiumTaskTemplate[];
};
