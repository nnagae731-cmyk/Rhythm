import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { ChicPattern, DesignMode, getThemeTokens } from './theme';
import { createRecoveryRecord, getRecoveryOptions, RecoveryOption, RecoveryRecord } from './recovery';
import { createCompletedFocusSession, createFocusSessionId, FocusSession } from './focusSession';
import { createDepartureCheckIn, DepartureCheckIn } from './departureCheckIn';
import { getEffectiveChicPattern, getEffectiveNudgeMode, hasPremiumAccess, isWithinFreeHistory, PlanTier } from './premiumAccess';
import { AnalysisScreen } from './AnalysisScreen';
import { appendBehaviorEvent, appendBehaviorEvents, BehaviorEvent, createDeparturePreparationStartedEvent, createDepartureStartedEvent, createFocusCompletedBehaviorEvent, createFocusStartedEvent, createFocusStoppedEvent, createNotificationActionEvent, createNotificationScheduledEvent, createTaskCompletedBehaviorEvent, NotificationAction } from './behaviorEvents';
import { DEFAULT_PREMIUM_GUIDE_FEATURE, PremiumGuideFeatureId } from './premiumGuide';
import { createPremiumTaskTemplate, hasSameTemplateSettings, PremiumTaskTemplate, summarizePremiumTaskTemplate } from './taskTemplates';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Share,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

type Screen = 'home' | 'timeline' | 'analysis' | 'settings';
type TimeTab = 'departure' | 'deadline' | 'calendar' | 'focus';
type WidgetSize = 'small' | 'medium';
type Category = '仕事' | '家事' | '健康' | '予定' | 'その他';
type Priority = '高' | '中' | '低';
type RepeatRule = 'none' | 'daily' | 'weekdays' | 'weekly';
type TaskBucket = 'now' | 'later' | 'waiting';
type NudgeMode = 'once' | 'repeat' | 'strong';
type ThemeMode = DesignMode;
type UrgencyStatus = '余裕あり' | 'そろそろ準備' | '今出れば間に合う' | '急いで出発' | '予定どおりは厳しい' | 'リカバリーが必要';

type Task = {
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

type DeparturePlan = {
  id?: string;
  title: string;
  date: string;
  arrival: string;
  travelMinutes: number;
  preparationMinutes: number;
  bufferMinutes: number;
};

type PersistedState = {
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

const STORAGE_KEY = 'rhythm-mvp-state-v1';
const categories: Category[] = ['仕事', '家事', '健康', '予定', 'その他'];
const priorities: Priority[] = ['高', '中', '低'];
const repeatOptions: { id: RepeatRule; label: string }[] = [
  { id: 'none', label: 'なし' },
  { id: 'daily', label: '毎日' },
  { id: 'weekdays', label: '平日' },
  { id: 'weekly', label: '毎週' },
];
const completionIcons = ['✓', '★', '♥', '✿', '☀'];
const designModes: { id: DesignMode; name: string; description: string }[] = [
  { id: 'minimal', name: 'Minimal', description: '静かで端正' },
  { id: 'chic', name: 'Chic', description: '淡くおしゃれ' },
];
const categoryColors: Record<Category, string> = {
  仕事: '#E9E4FF',
  家事: '#FFF0D9',
  健康: '#DFF5EA',
  予定: '#FFE4DF',
  その他: '#EEECEF',
};
type ChicTaskPatternPalette = { background: string; accent: string; warm: string };
const chicTaskPatternPalettes: Record<Category, ChicTaskPatternPalette> = {
  仕事: { background: '#F7F2FC', accent: '#A997C8', warm: '#DCCBF0' },
  家事: { background: '#FFF5EF', accent: '#DFA58F', warm: '#F3C9B8' },
  健康: { background: '#F1FAF7', accent: '#8FC9BD', warm: '#C9E8E0' },
  予定: { background: '#FFF2F6', accent: '#D986A1', warm: '#F1B8CB' },
  その他: { background: '#FFF9EE', accent: '#C6A467', warm: '#E8D5A7' },
};
function getChicTaskPatternPalette(category: Category) { return chicTaskPatternPalettes[category]; }
const chicUtilityPalettes = {
  departure: { background: '#FFF3F3', accent: '#D986A1', warm: '#F3B6A8' },
  deadline: { background: '#FFF8ED', accent: '#C6A467', warm: '#E7C987' },
  calendar: { background: '#F7F2FC', accent: '#A997C8', warm: '#DCCBF0' },
  focus: { background: '#F1FAF7', accent: '#8FC9BD', warm: '#C9E8E0' },
};

const colors = {
  background: '#F8F5EF',
  surface: '#FFFFFF',
  ink: '#282538',
  muted: '#777285',
  violet: '#7559E8',
  violetSoft: '#EEE9FF',
  coral: '#FA7D72',
  coralSoft: '#FFF0ED',
  mint: '#DFF5EA',
  line: '#ECE8F0',
};

const initialPlan: DeparturePlan = {
  title: '大切な予定',
  date: todayInputValue(),
  arrival: '10:00',
  travelMinutes: 40,
  preparationMinutes: 30,
  bufferMinutes: 10,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function parseClock(clock: string) {
  const [rawHours = '0', rawMinutes = '0'] = clock.split(':');
  const hours = Math.min(23, Math.max(0, Number(rawHours) || 0));
  const minutes = Math.min(59, Math.max(0, Number(rawMinutes) || 0));
  return hours * 60 + minutes;
}

function formatClock(totalMinutes: number) {
  const value = (totalMinutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function dateForClock(clock: string) {
  const date = new Date();
  const total = parseClock(clock);
  date.setHours(Math.floor(total / 60), total % 60, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date;
}

function dateKey(value: Date | string = new Date()) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateForReminder(day: string, clock: string) {
  const [year = new Date().getFullYear(), month = 1, date = 1] = day.split('-').map(Number);
  const total = parseClock(clock);
  const result = new Date(year, (month || 1) - 1, date || 1, Math.floor(total / 60), total % 60, 0, 0);
  return result;
}

function todayInputValue(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

function advanceDateValue(value: string | undefined, rule: RepeatRule) {
  const base = value ? dateForReminder(value, '12:00') : new Date();
  const days = rule === 'weekly' ? 7 : 1;
  base.setDate(base.getDate() + days);
  if (rule === 'weekdays') {
    while (base.getDay() === 0 || base.getDay() === 6) base.setDate(base.getDate() + 1);
  }
  return dateKey(base);
}

function completeTasksWithRepeats(current: Task[], ids: string[]) {
  const completedAt = new Date().toISOString();
  const nextTasks: Task[] = [];
  const updated = current.map((task) => {
    if (!ids.includes(task.id) || task.done) return task;
    const rule = task.repeatRule ?? 'none';
    if (rule !== 'none') {
      nextTasks.push({
        ...task,
        id: `${Date.now()}-${task.id}-${Math.random().toString(16).slice(2)}`,
        done: false,
        completedAt: undefined,
        deadlineDate: task.deadlineDate ? advanceDateValue(task.deadlineDate, rule) : undefined,
        remindDate: task.remindDate ? advanceDateValue(task.remindDate, rule) : undefined,
        scheduledDate: advanceDateValue(task.scheduledDate ?? dateKey(), rule),
      });
    }
    return { ...task, done: true, completedAt };
  });
  return [...nextTasks, ...updated];
}

type TaskCompletionResult = { tasks: Task[]; newlyCompleted: Task[] };

function completeTasksAndCollectEvents(current: Task[], ids: string[]): TaskCompletionResult {
  const eligibleIds = new Set(current.filter((task) => ids.includes(task.id) && !task.done).map((task) => task.id));
  if (eligibleIds.size === 0) return { tasks: current, newlyCompleted: [] };
  const tasks = completeTasksWithRepeats(current, ids);
  return {
    tasks,
    newlyCompleted: tasks.filter((task) => eligibleIds.has(task.id) && task.done && task.completedAt),
  };
}

function deadlineLabel(task: Task) {
  if (!task.deadlineDate) return undefined;
  const date = dateForReminder(task.deadlineDate, task.deadlineTime ?? '23:59');
  const difference = date.getTime() - Date.now();
  if (difference < 0) return { text: '期限超過', overdue: true };
  const hours = Math.floor(difference / 3_600_000);
  if (hours < 24) return { text: `残り${Math.max(1, hours)}時間`, overdue: false };
  const days = Math.ceil(hours / 24);
  return { text: `あと${days}日`, overdue: false };
}

function getTargetDate(task: Task) {
  if (!task.deadlineDate) return undefined;
  return dateForReminder(task.deadlineDate, task.deadlineTime ?? '23:59');
}

export function getUrgencyStatus(task: Task, now = new Date()): UrgencyStatus {
  const target = getTargetDate(task);
  if (!target) return '余裕あり';
  const travel = task.travelMinutes ?? 30;
  const preparation = task.preparationMinutes ?? 30;
  const buffer = task.bufferMinutes ?? 10;
  const leaveAt = new Date(target.getTime() - (travel + buffer) * 60_000);
  const prepareAt = new Date(leaveAt.getTime() - preparation * 60_000);
  const minutesAfterLeave = (now.getTime() - leaveAt.getTime()) / 60_000;

  if (now < prepareAt) return '余裕あり';
  if (now < new Date(leaveAt.getTime() - 10 * 60_000)) return 'そろそろ準備';
  if (now <= leaveAt) return '今出れば間に合う';
  if (minutesAfterLeave <= 5) return '急いで出発';
  if (now < target) return '予定どおりは厳しい';
  return 'リカバリーが必要';
}

export function getNextBestAction(task: Task, now = new Date()) {
  const status = getUrgencyStatus(task, now);
  const messages: Record<UrgencyStatus, string> = {
    '余裕あり': 'まだ余裕あり。今は準備だけでOK',
    'そろそろ準備': 'そろそろ準備を始めよう',
    '今出れば間に合う': '今出たらまだ間に合う',
    '急いで出発': '5分以内に出発して',
    '予定どおりは厳しい': '予定どおりの到着は厳しいかも',
    'リカバリーが必要': '到着遅れ前提で次の行動を選ぼう',
  };
  return messages[status];
}

export function getLateRiskMessage(task: Task, now = new Date()) {
  const target = getTargetDate(task);
  if (!target) return '到着時刻を設定すると判定できます';
  const status = getUrgencyStatus(task, now);
  if (status === 'リカバリーが必要') return `予定時刻を${Math.max(1, Math.floor((now.getTime() - target.getTime()) / 60_000))}分超過`;
  const travel = task.travelMinutes ?? 30;
  const buffer = task.bufferMinutes ?? 10;
  const leaveAt = new Date(target.getTime() - (travel + buffer) * 60_000);
  const remaining = Math.ceil((leaveAt.getTime() - now.getTime()) / 60_000);
  return remaining > 0 ? `出発まであと${remaining}分` : `出発目安を${Math.abs(remaining)}分超過`;
}

function urgencyLevel(status: UrgencyStatus) {
  return ['余裕あり', 'そろそろ準備', '今出れば間に合う', '急いで出発', '予定どおりは厳しい', 'リカバリーが必要'].indexOf(status);
}

function formatLiveDate(now: Date) {
  return `${now.getMonth() + 1}月${now.getDate()}日 ${['日', '月', '火', '水', '木', '金', '土'][now.getDay()]}曜日`;
}

function formatLiveTime(now: Date) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function countdownToClock(clock: string, now: Date) {
  const target = dateForClock(clock);
  const minutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `あと${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `あと${hours}時間` : `あと${hours}時間${rest}分`;
}

function getDepartureMoments(plan: DeparturePlan) {
  const arrival = dateForReminder(plan.date, plan.arrival);
  const leave = new Date(arrival.getTime() - (plan.travelMinutes + plan.bufferMinutes) * 60_000);
  const prepare = new Date(leave.getTime() - plan.preparationMinutes * 60_000);
  return { arrival, leave, prepare };
}

function countdownToDate(target: Date, now: Date) {
  const minutes = Math.ceil((target.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return '出発時刻を過ぎました';
  if (minutes < 60) return `あと${minutes}分`;
  if (minutes < 24 * 60) return `あと${Math.floor(minutes / 60)}時間${minutes % 60}分`;
  return `あと${Math.floor(minutes / 1440)}日${Math.floor((minutes % 1440) / 60)}時間`;
}

function getChicPatternVisual(pattern: ChicPattern) {
  if (pattern === 'dot') return { background: '#FFF3F5', accent: '#D986A1', warm: '#A997C8' };
  if (pattern === 'check') return { background: '#FFF9F6', accent: '#E8B8C7', warm: '#F4D8E2' };
  return { background: '#FFF3F5', accent: '#D986A1', warm: '#A997C8' };
}

async function ensureNotifications() {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'リマインダー',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      sound: 'default',
    });
  }

  await Notifications.setNotificationCategoryAsync('TASK_ACTIONS', [
    {
      identifier: 'DONE',
      buttonTitle: '終わった',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'SNOOZE',
      buttonTitle: '10分後',
      options: { opensAppToForeground: false },
    },
  ]);
  await Notifications.setNotificationCategoryAsync('DEPARTURE_ACTIONS', [
    { identifier: 'DEPARTED', buttonTitle: '出発した', options: { opensAppToForeground: false } },
    { identifier: 'OPEN_TIME', buttonTitle: '今見る', options: { opensAppToForeground: true } },
    { identifier: 'OPEN_RECOVERY', buttonTitle: '立て直す', options: { opensAppToForeground: true } },
    { identifier: 'DEPARTURE_SNOOZE', buttonTitle: '5分後', options: { opensAppToForeground: false } },
  ]);
  return true;
}

async function cancelPendingTaskNotifications(taskId: string) {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const matches = pending.filter((request) => request.content.data?.taskId === taskId);
  await Promise.all(matches.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
}

async function cancelPendingDepartureNotifications(planId: string) {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const matches = pending.filter((request) => request.content.data?.departurePlanId === planId);
  await Promise.all(matches.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [timelineInitialTab, setTimelineInitialTab] = useState<TimeTab>('departure');
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = React.useRef<Task[]>([]);
  const hydratedRef = React.useRef(false);
  const pendingNotificationCompletionIdsRef = React.useRef<string[]>([]);
  const pendingDepartureCheckInIdsRef = React.useRef<string[]>([]);
  const [plan, setPlan] = useState<DeparturePlan>(initialPlan);
  const [departurePlans, setDeparturePlans] = useState<DeparturePlan[]>([]);
  const departurePlansRef = React.useRef<DeparturePlan[]>([]);
  const [departureCheckIns, setDepartureCheckIns] = useState<DepartureCheckIn[]>([]);
  const departureCheckInsRef = React.useRef<DepartureCheckIn[]>([]);
  const [widgetSize, setWidgetSize] = useState<WidgetSize>('medium');
  const [showCompleted, setShowCompleted] = useState(false);
  const [completionIcon, setCompletionIcon] = useState('✓');
  const [designMode, setDesignMode] = useState<DesignMode>('chic');
  const [chicPattern, setChicPattern] = useState<ChicPattern>('floral');
  const [recoveryHistory, setRecoveryHistory] = useState<RecoveryRecord[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [behaviorEvents, setBehaviorEvents] = useState<BehaviorEvent[]>([]);
  const behaviorEventsRef = React.useRef<BehaviorEvent[]>([]);
  const pendingBehaviorEventsRef = React.useRef<BehaviorEvent[]>([]);
  const pendingNotificationBehaviorActionsRef = React.useRef<Array<{ notificationInstanceId: string; action: NotificationAction; taskId?: string; actualAt: Date }>>([]);
  const [recoveryTargetPlanId, setRecoveryTargetPlanId] = useState<string>();
  const [taskTemplates, setTaskTemplates] = useState<string[]>(['朝の支度', '持ち物を確認', '連絡を返す', '薬を飲む']);
  const [savedTaskTemplates, setSavedTaskTemplates] = useState<PremiumTaskTemplate[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const theme = useMemo(() => getThemeTokens(designMode), [designMode]);
  const [addOpen, setAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [now, setNow] = useState(new Date());
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [premiumTargetFeature, setPremiumTargetFeature] = useState<PremiumGuideFeatureId>(DEFAULT_PREMIUM_GUIDE_FEATURE);
  const [hydrated, setHydrated] = useState(false);
  const planTier: PlanTier = process.env.EXPO_PUBLIC_RHYTHM_PLAN === 'premium' ? 'premium' : 'free';
  const planTierRef = React.useRef<PlanTier>(planTier);
  const uiDesignMode = designMode;
  const effectiveChicPattern = getEffectiveChicPattern(planTier, chicPattern) as ChicPattern;
  const openPremiumFeature = React.useCallback((featureId: PremiumGuideFeatureId = DEFAULT_PREMIUM_GUIDE_FEATURE) => {
    setPremiumTargetFeature(featureId);
    setPremiumOpen(true);
  }, []);

  const saveTaskAsTemplate = React.useCallback((task: Task) => {
    if (!hasPremiumAccess(planTier, 'saved_task_templates')) {
      openPremiumFeature('templates');
      return;
    }
    const template = createPremiumTaskTemplate(task, `template:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`, new Date());
    if (savedTaskTemplates.some((current) => hasSameTemplateSettings(current, template))) {
      Alert.alert('保存済みです', '同じ設定のマイひな型は保存済みです。');
      return;
    }
    setSavedTaskTemplates((current) => [template, ...current]);
    Alert.alert('マイひな型に保存しました', task.title);
  }, [openPremiumFeature, planTier, savedTaskTemplates]);

  const deleteSavedTaskTemplate = React.useCallback((template: PremiumTaskTemplate) => {
    Alert.alert('このマイひな型を削除しますか？', template.title, [{ text: 'キャンセル', style: 'cancel' }, { text: '削除', style: 'destructive', onPress: () => setSavedTaskTemplates((current) => current.filter((item) => item.id !== template.id)) }]);
  }, []);

  const recordBehaviorEvent = React.useCallback((next: BehaviorEvent) => {
    if (!hydratedRef.current) {
      pendingBehaviorEventsRef.current.push(next);
      return;
    }
    const updated = appendBehaviorEvent(behaviorEventsRef.current, next);
    if (updated === behaviorEventsRef.current) return;
    behaviorEventsRef.current = updated;
    setBehaviorEvents(updated);
  }, []);

  const recordNotificationBehaviorAction = React.useCallback((args: { notificationInstanceId: string; action: NotificationAction; taskId?: string; actualAt: Date }) => {
    if (!hydratedRef.current) {
      pendingNotificationBehaviorActionsRef.current.push(args);
      return;
    }
    const scheduled = behaviorEventsRef.current.find((item) => item.type === 'notification_scheduled' && item.notificationInstanceId === args.notificationInstanceId);
    const task = args.taskId ? tasksRef.current.find((item) => item.id === args.taskId) : undefined;
    recordBehaviorEvent(createNotificationActionEvent({ notificationInstanceId: args.notificationInstanceId, action: args.action, taskId: args.taskId, taskTitle: task?.title ?? scheduled?.taskTitleSnapshot, actualAt: args.actualAt, scheduledAt: scheduled?.scheduledAt }));
  }, [recordBehaviorEvent]);

  const completeTaskIds = React.useCallback((ids: string[], source: 'manual' | 'notification' = 'manual') => {
    const result = completeTasksAndCollectEvents(tasksRef.current, ids);
    if (result.tasks === tasksRef.current) return;
    tasksRef.current = result.tasks;
    setTasks(result.tasks);
    if (result.newlyCompleted.length === 0) return;
    result.newlyCompleted.forEach((task) => { void cancelPendingTaskNotifications(task.id); });
    result.newlyCompleted.forEach((task) => recordBehaviorEvent(createTaskCompletedBehaviorEvent({ taskId: task.id, taskTitle: task.title, occurredAt: new Date(task.completedAt!), source })));
  }, [recordBehaviorEvent]);

  const markDeparturePlanAsDeparted = React.useCallback((planId: string, source: 'manual' | 'notification' = 'manual') => {
    const target = departurePlansRef.current.find((item) => item.id === planId);
    if (!target?.id) return;
    const recordId = `departure:${target.id}:${target.date}`;
    if (departureCheckInsRef.current.some((item) => item.id === recordId)) return;
    const actualAt = new Date();
    const moments = getDepartureMoments(target);
    const record = createDepartureCheckIn({
      planId: target.id,
      planTitle: target.title,
      date: target.date,
      plannedLeaveAt: moments.leave,
      departedAt: actualAt,
    });
    const next = [record, ...departureCheckInsRef.current].slice(0, 300);
    departureCheckInsRef.current = next;
    setDepartureCheckIns(next);
    recordBehaviorEvent(createDepartureStartedEvent({ planId: target.id, planTitle: target.title, planDate: target.date, scheduledAt: moments.leave, actualAt, source }));
    void cancelPendingDepartureNotifications(target.id);
  }, [recordBehaviorEvent]);

  const markDeparturePreparationStarted = React.useCallback((planId: string) => {
    const target = departurePlansRef.current.find((item) => item.id === planId);
    if (!target?.id) return;
    recordBehaviorEvent(createDeparturePreparationStartedEvent({ planId: target.id, planTitle: target.title, planDate: target.date, scheduledAt: getDepartureMoments(target).prepare, actualAt: new Date() }));
  }, [recordBehaviorEvent]);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { departurePlansRef.current = departurePlans; }, [departurePlans]);
  useEffect(() => { departureCheckInsRef.current = departureCheckIns; }, [departureCheckIns]);
  useEffect(() => { behaviorEventsRef.current = behaviorEvents; }, [behaviorEvents]);
  useEffect(() => { planTierRef.current = planTier; }, [planTier]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<PersistedState>;
        const loadedTasks = saved.tasks ? saved.tasks.map((task) => ({ ...task, category: (task.category ?? 'その他') as Category, priority: (task.priority ?? '中') as Priority })) : [];
        tasksRef.current = loadedTasks;
        setTasks(loadedTasks);
        if (saved.plan) setPlan({ ...saved.plan, date: saved.plan.date ?? todayInputValue() });
        const loadedDeparturePlans = saved.departurePlans ?? [];
        departurePlansRef.current = loadedDeparturePlans;
        setDeparturePlans(loadedDeparturePlans);
        const loadedDepartureCheckIns = saved.departureCheckIns ?? [];
        departureCheckInsRef.current = loadedDepartureCheckIns;
        setDepartureCheckIns(loadedDepartureCheckIns);
        if (saved.widgetSize) setWidgetSize(saved.widgetSize);
        if (typeof saved.showCompleted === 'boolean') setShowCompleted(saved.showCompleted);
        if (saved.completionIcon) setCompletionIcon(saved.completionIcon);
        if (saved.designMode === 'minimal' || saved.designMode === 'chic') setDesignMode(saved.designMode);
        else setDesignMode('chic');
        setChicPattern(saved.chicPattern ?? 'floral');
        setRecoveryHistory(saved.recoveryHistory ?? []);
        setFocusSessions(saved.focusSessions ?? []);
        const loadedBehaviorEvents = saved.behaviorEvents ?? [];
        behaviorEventsRef.current = loadedBehaviorEvents;
        setBehaviorEvents(loadedBehaviorEvents);
        if (saved.taskTemplates) setTaskTemplates(saved.taskTemplates);
        setSavedTaskTemplates(saved.savedTaskTemplates ?? []);
      })
      .catch(() => Alert.alert('保存データを読み込めませんでした'))
      .finally(() => {
        hydratedRef.current = true;
        setHydrated(true);
        const pendingIds = [...new Set(pendingNotificationCompletionIdsRef.current)];
        pendingNotificationCompletionIdsRef.current = [];
        if (pendingIds.length > 0) completeTaskIds(pendingIds, 'notification');
        const pendingDepartureIds = [...new Set(pendingDepartureCheckInIdsRef.current)];
        pendingDepartureCheckInIdsRef.current = [];
        pendingDepartureIds.forEach((id) => markDeparturePlanAsDeparted(id, 'notification'));
        const pendingNotificationActions = pendingNotificationBehaviorActionsRef.current;
        pendingNotificationBehaviorActionsRef.current = [];
        const pendingBehaviorEvents = pendingBehaviorEventsRef.current;
        pendingBehaviorEventsRef.current = [];
        if (pendingBehaviorEvents.length > 0) {
          const updated = appendBehaviorEvents(behaviorEventsRef.current, pendingBehaviorEvents);
          behaviorEventsRef.current = updated;
          setBehaviorEvents(updated);
        }
        pendingNotificationActions.forEach(recordNotificationBehaviorAction);
      });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const taskId = response.notification.request.content.data?.taskId;
      const departurePlanId = response.notification.request.content.data?.departurePlanId;
      const notificationInstanceIdValue = response.notification.request.content.data?.notificationInstanceId;
      const notificationInstanceId = typeof notificationInstanceIdValue === 'string' ? notificationInstanceIdValue : response.notification.request.identifier;
      const action = response.actionIdentifier;

      if (action === 'DEPARTED') {
        if (typeof departurePlanId !== 'string') return;
        if (!hydratedRef.current) {
          pendingDepartureCheckInIdsRef.current.push(departurePlanId);
          return;
        }
        markDeparturePlanAsDeparted(departurePlanId, 'notification');
        return;
      }

      if (action === 'OPEN_TIME') {
        setRecoveryTargetPlanId(undefined);
        setTimelineInitialTab('departure');
        setScreen('timeline');
        return;
      }

      if (action === 'OPEN_RECOVERY') {
        if (!hasPremiumAccess(planTierRef.current, 'late_recovery')) {
          openPremiumFeature('recovery');
          return;
        }
        if (typeof departurePlanId === 'string') setRecoveryTargetPlanId(departurePlanId);
        setTimelineInitialTab('departure');
        setScreen('timeline');
        return;
      }

      if (action === 'DEPARTURE_SNOOZE') {
        void Notifications.scheduleNotificationAsync({
          content: { title: '5分後の出発確認です', body: response.notification.request.content.body ?? '出発状況を確認しましょう', categoryIdentifier: 'DEPARTURE_ACTIONS', data: response.notification.request.content.data, sound: 'default' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 300 },
        });
        return;
      }

      if (typeof taskId !== 'string') return;
      if (action === 'DONE' || action === 'SNOOZE') {
        recordNotificationBehaviorAction({ notificationInstanceId, action: action === 'DONE' ? 'completed' : 'snoozed', taskId, actualAt: new Date() });
      }
      if (action === 'DONE') {
        if (!hydratedRef.current) {
          pendingNotificationCompletionIdsRef.current.push(taskId);
          return;
        }
        completeTaskIds([taskId], 'notification');
        void cancelPendingTaskNotifications(taskId);
      }

      if (action === 'SNOOZE' || action === 'LATER') {
        const seconds = action === 'SNOOZE' ? 600 : 3600;
        void (async () => {
          const scheduledAt = new Date(Date.now() + seconds * 1000);
          const nextNotificationInstanceId = `task:${taskId}:${scheduledAt.toISOString()}:${action.toLowerCase()}`;
          await Notifications.scheduleNotificationAsync({
            identifier: nextNotificationInstanceId,
            content: {
              title: action === 'SNOOZE' ? 'そろそろ、どう？' : 'あとで確認する時間です',
              body: response.notification.request.content.body ?? 'タスクを確認しましょう',
              categoryIdentifier: 'TASK_ACTIONS',
              data: { taskId, notificationInstanceId: nextNotificationInstanceId },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
          });
          const task = tasksRef.current.find((item) => item.id === taskId);
          if (task) recordBehaviorEvent(createNotificationScheduledEvent({ notificationInstanceId: nextNotificationInstanceId, taskId, taskTitle: task.title, scheduledAt, occurredAt: new Date() }));
        })();
      }
    });

    return () => responseSubscription.remove();
  }, [completeTaskIds, markDeparturePlanAsDeparted, openPremiumFeature, recordBehaviorEvent, recordNotificationBehaviorAction]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state: PersistedState = { tasks, plan, departurePlans, widgetSize, showCompleted, completionIcon, designMode, taskTemplates, savedTaskTemplates, chicPattern, recoveryHistory, focusSessions, departureCheckIns, behaviorEvents };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [tasks, plan, departurePlans, widgetSize, showCompleted, completionIcon, designMode, taskTemplates, savedTaskTemplates, chicPattern, recoveryHistory, focusSessions, departureCheckIns, behaviorEvents, hydrated]);

  const timeline = useMemo(() => {
    const arrival = parseClock(plan.arrival);
    const leave = arrival - plan.travelMinutes - plan.bufferMinutes;
    const start = leave - plan.preparationMinutes;
    return {
      start: formatClock(start),
      leave: formatClock(leave),
      arrival: formatClock(arrival),
    };
  }, [plan]);

  const nextDeparturePlan = useMemo(() => [...departurePlans]
    .filter((item) => getDepartureMoments(item).arrival.getTime() > now.getTime())
    .sort((a, b) => getDepartureMoments(a).leave.getTime() - getDepartureMoments(b).leave.getTime())[0], [departurePlans, now]);
  const displayPlan = nextDeparturePlan ?? plan;
  const displayMoments = getDepartureMoments(displayPlan);
  const displayTimeline = {
    start: formatLiveTime(displayMoments.prepare),
    leave: formatLiveTime(displayMoments.leave),
    arrival: formatLiveTime(displayMoments.arrival),
  };

  const priorityRank: Record<Priority, number> = { 高: 0, 中: 1, 低: 2 };
  const visibleTasks = tasks
    .filter((task) => !task.done && (!task.scheduledDate || task.scheduledDate <= dateKey(now)))
    .sort((a, b) => Number(a.done) - Number(b.done) || priorityRank[a.priority] - priorityRank[b.priority]);
  const remaining = tasks.filter((task) => !task.done).length;
  const dangerousTask = [...tasks]
    .filter((task) => !task.done && task.navigationEnabled && task.deadlineDate)
    .sort((a, b) => urgencyLevel(getUrgencyStatus(b, now)) - urgencyLevel(getUrgencyStatus(a, now)))[0];

  const addTask = (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule: RepeatRule = 'none', nudgeMode: NudgeMode = 'once', scheduledDate?: string) => {
    const task: Task = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      done: false,
      remindAt,
      remindDate,
      category,
      priority,
      deadlineDate,
      deadlineTime,
      deadlineNotifyBefore,
      navigationEnabled,
      preparationMinutes,
      travelMinutes,
      bufferMinutes,
      repeatRule,
      nudgeMode,
      scheduledDate: scheduledDate ?? dateKey(now),
    };
    setTasks((current) => [task, ...current]);
    setAddOpen(false);
    if (remindAt || (deadlineDate && deadlineTime && deadlineNotifyBefore !== undefined)) void scheduleAllTaskNotifications(task);
  };

  const updateTask = (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule: RepeatRule = 'none', nudgeMode: NudgeMode = 'once', scheduledDate?: string) => {
    if (!editingTask) return;
    const updated = { ...editingTask, title, category, priority, remindDate, remindAt, deadlineDate, deadlineTime, deadlineNotifyBefore, navigationEnabled, preparationMinutes, travelMinutes, bufferMinutes, repeatRule, nudgeMode, scheduledDate: scheduledDate ?? editingTask.scheduledDate ?? dateKey(now) };
    setTasks((current) => current.map((task) => task.id === editingTask.id ? updated : task));
    setEditingTask(null);
    void scheduleAllTaskNotifications(updated);
  };

  const scheduleAllTaskNotifications = async (task: Task) => {
    await cancelPendingTaskNotifications(task.id);
    if (task.remindAt) await scheduleTaskReminder(task);
    if (task.deadlineDate && task.deadlineTime && task.deadlineNotifyBefore !== undefined) await scheduleDeadlineReminder(task);
  };

  const scheduleTaskReminder = async (task: Task) => {
    if (!task.remindAt) return;
    if (!await ensureNotifications()) {
      Alert.alert('通知がオフです', '端末設定からRhythmの通知を許可してください。');
      return;
    }
    const date = task.remindDate ? dateForReminder(task.remindDate, task.remindAt) : dateForClock(task.remindAt);
    if (date.getTime() <= Date.now()) {
      Alert.alert('過去の日時です', '現在より後のリマインド日時を設定してください。');
      return;
    }
    const effectiveNudgeMode = getEffectiveNudgeMode(planTier, task.nudgeMode ?? 'once');
    const offsets = effectiveNudgeMode === 'strong' ? [0, 3, 8] : effectiveNudgeMode === 'repeat' ? [0, 5] : [0];
    for (const [index, offset] of offsets.entries()) {
      const notificationDate = new Date(date.getTime() + offset * 60_000);
      const notificationInstanceId = `task:${task.id}:${notificationDate.toISOString()}:${index}`;
      await Notifications.scheduleNotificationAsync({
        identifier: notificationInstanceId,
        content: {
          title: index === 0 ? '終わった？' : index === offsets.length - 1 ? 'まだなら、今確認しよう' : 'そろそろ終われそう？',
          body: task.title,
          categoryIdentifier: 'TASK_ACTIONS',
          data: { taskId: task.id, notificationInstanceId, notificationKind: 'task_reminder', nudgeIndex: index },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notificationDate,
        },
      });
      recordBehaviorEvent(createNotificationScheduledEvent({ notificationInstanceId, taskId: task.id, taskTitle: task.title, scheduledAt: notificationDate, occurredAt: new Date() }));
    }
  };

  const scheduleDeadlineReminder = async (task: Task) => {
    if (!task.deadlineDate || !task.deadlineTime || task.deadlineNotifyBefore === undefined) return;
    if (!await ensureNotifications()) return;
    const deadline = dateForReminder(task.deadlineDate, task.deadlineTime);
    const notificationDate = new Date(deadline.getTime() - task.deadlineNotifyBefore * 60_000);
    if (notificationDate.getTime() <= Date.now()) return;
    const timing = task.deadlineNotifyBefore === 0 ? '期限時刻です' : `期限まであと${task.deadlineNotifyBefore >= 60 ? `${task.deadlineNotifyBefore / 60}時間` : `${task.deadlineNotifyBefore}分`}`;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: timing,
        body: task.title,
        categoryIdentifier: 'TASK_ACTIONS',
        data: { taskId: task.id, notificationKind: 'deadline' },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notificationDate },
    });
  };

  const scheduleDeparture = async (targetPlan = plan) => {
    if (!await ensureNotifications()) {
      Alert.alert('通知がオフです', '端末設定からRhythmの通知を許可してください。');
      return;
    }
    const arrivalDate = getDepartureMoments(targetPlan).arrival;
    const stages = [
      {
        id: 'prepare',
        before: targetPlan.travelMinutes + targetPlan.bufferMinutes + targetPlan.preparationMinutes,
        title: '準備、始めた？',
        body: `${timeline.leave}に出発すると安心です`,
      },
      {
        id: 'ten_minutes',
        before: targetPlan.travelMinutes + targetPlan.bufferMinutes + 10,
        title: 'そろそろ出発しよう',
        body: `${targetPlan.title}の持ち物を確認しよう`,
      },
      {
        id: 'leave_now',
        before: targetPlan.travelMinutes + targetPlan.bufferMinutes,
        title: '出発した？',
        body: `${timeline.arrival}到着予定です`,
      },
      {
        id: 'late_warning',
        before: Math.max(0, targetPlan.travelMinutes + targetPlan.bufferMinutes - 5),
        title: 'まだなら、今出よう',
        body: '急いで出発するか、予定を組み直してください',
      },
    ].filter((stage) => stage.id !== 'late_warning' || hasPremiumAccess(planTier, 'late_recovery'));

    let count = 0;
    for (const stage of stages) {
      const date = new Date(arrivalDate.getTime() - stage.before * 60_000);
      if (date.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: stage.title, body: stage.body, sound: 'default', categoryIdentifier: 'DEPARTURE_ACTIONS', data: { departurePlanId: targetPlan.id, departureDate: targetPlan.date, departureStage: stage.id } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
      count += 1;
    }
    Alert.alert('出発サポートを設定しました', `${timeline.start}から${count}段階でお知らせします。`);
  };

  const saveDeparturePlan = async () => {
    const saved: DeparturePlan = { ...plan, id: plan.id ?? `${Date.now()}-departure` };
    setDeparturePlans((current) => plan.id ? current.map((item) => item.id === plan.id ? saved : item) : [...current, saved]);
    await scheduleDeparture(saved);
    setPlan({ ...initialPlan, date: todayInputValue(), title: '新しい予定' });
  };

  const applyRecovery = (record: RecoveryRecord) => {
    setRecoveryHistory((current) => current.some((item) => item.id === record.id) ? current : [record, ...current].slice(0, 200));
    if (record.newArrival) setDeparturePlans((current) => current.map((item) => item.id === record.planId ? { ...item, arrival: record.newArrival! } : item));
    setRecoveryTargetPlanId(undefined);
  };

  const completeFocusSession = (session: FocusSession) => {
    setFocusSessions((current) => current.some((item) => item.id === session.id) ? current : [session, ...current].slice(0, 300));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.screenBackground }, uiDesignMode === 'minimal' && styles.safeMinimal, uiDesignMode === 'chic' && styles.safeChic]}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <Header designMode={uiDesignMode} now={now} />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {screen === 'home' && (
            <HomeScreen
              tasks={visibleTasks}
              allTasks={tasks}
              remaining={remaining}
              timeline={displayTimeline}
              now={now}
              dangerousTask={dangerousTask}
              designMode={uiDesignMode}
              chicPattern={effectiveChicPattern}
              completionIcon={completionIcon}
              selectionMode={selectionMode}
              selectedTaskIds={selectedTaskIds}
              onAdd={() => setAddOpen(true)}
              onQuickAdd={(title) => addTask(title, 'その他', '中')}
              onToggle={(id) => completeTaskIds([id])}
              onEdit={(task) => setEditingTask(task)}
              onToggleSelection={(id) => setSelectedTaskIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
              onSelectionMode={() => {
                setSelectionMode((current) => !current);
                setSelectedTaskIds([]);
              }}
              onCompleteSelected={() => {
                completeTaskIds(selectedTaskIds);
                setSelectionMode(false);
                setSelectedTaskIds([]);
              }}
              onDelete={(id) => setTasks((current) => current.filter((task) => task.id !== id))}
              onDuplicate={(task) => setTasks((current) => [{ ...task, id: `${Date.now()}-copy`, title: `${task.title}（コピー）`, done: false, completedAt: undefined }, ...current])}
              onSaveTemplate={saveTaskAsTemplate}
              onPostpone={(id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, scheduledDate: todayInputValue(1), bucket: 'later' } : task))}
              onRestore={(id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: false, completedAt: undefined } : task))}
              onBucket={(id, bucket) => setTasks((current) => current.map((task) => task.id === id ? { ...task, bucket } : task))}
              onOpenTime={(tab) => { setTimelineInitialTab(tab); setScreen('timeline'); }}
            />
          )}

          {screen === 'timeline' && (
            <TimelineScreen
              plan={plan}
              timeline={timeline}
              plans={departurePlans}
              departureCheckIns={departureCheckIns}
              behaviorEvents={behaviorEvents}
              tasks={tasks}
              now={now}
              designMode={uiDesignMode}
              chicPattern={effectiveChicPattern}
              planTier={planTier}
              initialTab={timelineInitialTab}
              recoveryTargetPlanId={recoveryTargetPlanId}
              onChange={setPlan}
              onSchedule={saveDeparturePlan}
              onEdit={(item) => setPlan(item)}
              onDelete={(id) => setDeparturePlans((current) => current.filter((item) => item.id !== id))}
              onEditTask={(task) => setEditingTask(task)}
              onPremium={openPremiumFeature}
              onRecovery={applyRecovery}
              onRecoveryClosed={() => setRecoveryTargetPlanId(undefined)}
              onFocusCompleted={completeFocusSession}
              onBehaviorEvent={recordBehaviorEvent}
              onDeparted={markDeparturePlanAsDeparted}
              onPreparationStarted={markDeparturePreparationStarted}
            />
          )}

          {screen === 'settings' && (
            <WidgetScreen
              tasks={tasks}
              timeline={displayTimeline}
              now={now}
              dangerousTask={dangerousTask}
              size={widgetSize}
              showCompleted={showCompleted}
              completionIcon={completionIcon}
              designMode={uiDesignMode}
              chicPattern={effectiveChicPattern}
              planTier={planTier}
              onSize={setWidgetSize}
              onShowCompleted={setShowCompleted}
              onCompletionIcon={setCompletionIcon}
              onDesignMode={setDesignMode}
              onChicPattern={(pattern) => {
                const feature = pattern === 'dot' ? 'chic_dot' : pattern === 'check' ? 'chic_check' : undefined;
                if (feature && !hasPremiumAccess(planTier, feature)) { openPremiumFeature(); return; }
                setChicPattern(pattern);
              }}
              templates={taskTemplates}
              savedTemplates={savedTaskTemplates}
              onAddTemplate={(title) => setTaskTemplates((current) => current.includes(title) ? current : [...current, title])}
              onDeleteTemplate={(title) => setTaskTemplates((current) => current.filter((item) => item !== title))}
              onGuide={() => setGuideOpen(true)}
              onPremium={openPremiumFeature}
              onDeleteSavedTemplate={deleteSavedTaskTemplate}
            />
          )}

          {screen === 'analysis' && (
            <AnalysisScreen
              events={behaviorEvents}
              designMode={uiDesignMode}
              planTier={planTier}
              onPremium={openPremiumFeature}
              recordContent={<HistoryScreen tasks={tasks} recoveryHistory={recoveryHistory} focusSessions={focusSessions} departureCheckIns={departureCheckIns} completionIcon={completionIcon} designMode={uiDesignMode} chicPattern={effectiveChicPattern} planTier={planTier} onPremium={openPremiumFeature} onSaveTemplate={saveTaskAsTemplate} onRestore={(id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: false, completedAt: undefined } : task))} />}
            />
          )}
        </ScrollView>

        <BottomNav screen={screen} designMode={uiDesignMode} onChange={setScreen} />
      </View>

      <TaskModal visible={addOpen} templates={taskTemplates} savedTemplates={savedTaskTemplates} designMode={uiDesignMode} planTier={planTier} onPremium={openPremiumFeature} onClose={() => setAddOpen(false)} onSave={addTask} />
      <TaskModal
        visible={editingTask !== null}
        task={editingTask ?? undefined}
        templates={taskTemplates}
        savedTemplates={savedTaskTemplates}
        designMode={uiDesignMode}
        planTier={planTier}
        onPremium={openPremiumFeature}
        onClose={() => setEditingTask(null)}
        onSave={updateTask}
      />
      <PremiumModal visible={premiumOpen} initialFeatureId={premiumTargetFeature} designMode={uiDesignMode} chicPattern={effectiveChicPattern} onClose={() => setPremiumOpen(false)} />
      <GuideModal visible={guideOpen} onClose={() => setGuideOpen(false)} />
    </SafeAreaView>
  );
}

function Header({ designMode, now }: { designMode: ThemeMode; now: Date }) {
  return (
    <View style={[styles.header, designMode === 'minimal' && styles.headerMinimal, ]}>
      <View>
        <Text style={styles.dateLabel}>{formatLiveDate(now)} · {formatLiveTime(now)}</Text>
        <Text style={[styles.brand, designMode === 'minimal' && styles.brandMinimal]}>{false ? 'Rhythm ✦' : 'Rhythm'}</Text>
      </View>
    </View>
  );
}

function HomeScreen({
  tasks,
  allTasks,
  remaining,
  timeline,
  now,
  dangerousTask,
  completionIcon,
  designMode,
  chicPattern,
  selectionMode,
  selectedTaskIds,
  onAdd,
  onQuickAdd,
  onToggle,
  onEdit,
  onToggleSelection,
  onSelectionMode,
  onCompleteSelected,
  onDelete,
  onDuplicate,
  onSaveTemplate,
  onPostpone,
  onRestore,
  onBucket,
  onOpenTime,
}: {
  tasks: Task[];
  allTasks: Task[];
  remaining: number;
  timeline: { start: string; leave: string; arrival: string };
  now: Date;
  dangerousTask?: Task;
  designMode: DesignMode;
  chicPattern: ChicPattern;
  completionIcon: string;
  selectionMode: boolean;
  selectedTaskIds: string[];
  onAdd: () => void;
  onQuickAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onToggleSelection: (id: string) => void;
  onSelectionMode: () => void;
  onCompleteSelected: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (task: Task) => void;
  onSaveTemplate: (task: Task) => void;
  onPostpone: (id: string) => void;
  onRestore: (id: string) => void;
  onBucket: (id: string, bucket: TaskBucket) => void;
  onOpenTime: (tab: TimeTab) => void;
}) {
  const priorityOrder: Record<Priority, number> = { 高: 0, 中: 1, 低: 2 };
  const [categoryFilter, setCategoryFilter] = useState<'すべて' | Category>('すべて');
  const [bucketFilter, setBucketFilter] = useState<TaskBucket>('now');
  const [bucketTask, setBucketTask] = useState<Task | null>(null);
  const [actionTask, setActionTask] = useState<Task | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const bucketTasks = tasks.filter((task) => (task.bucket ?? 'now') === bucketFilter);
  const categoryTasks = categoryFilter === 'すべて' ? bucketTasks : bucketTasks.filter((task) => task.category === categoryFilter);
  const displayTasks = [...categoryTasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const nextNowTask = [...allTasks]
    .filter((task) => !task.done && (task.bucket ?? 'now') === 'now')
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])[0];
  const handleQuickAdd = () => {
    const title = quickTitle.trim();
    if (!title) return;
    onQuickAdd(title);
    setQuickTitle('');
  };
  return (
    <>
      <View style={[styles.compactTodayHeader, designMode === 'minimal' && styles.compactTodayHeaderMinimal, designMode === 'chic' && styles.compactTodayHeaderChic, ]}>
        {designMode === 'chic' && <ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" />}
        <View style={designMode === 'chic' ? styles.chicTodayPaper : styles.todayHeaderInner}>
          {designMode === 'minimal' && <View style={styles.todayMinimalIndex}><Text style={styles.todayMinimalIndexText}>{String(allTasks.filter((task) => (task.bucket ?? 'now') === 'now' && !task.done).length).padStart(2, '0')}</Text></View>}
          {designMode === 'chic' && <View style={styles.todayChicMark}><Text style={styles.todayChicMarkText}>✿</Text></View>}
          <View style={{ flex: 1 }}>
            <Text style={[styles.compactTodayKicker, designMode === 'chic' && styles.compactTodayKickerChic]}>{nextNowTask ? '今はこれ' : '今日のはじまり'}</Text>
            <Text numberOfLines={2} style={styles.compactTodayCopy}>{nextNowTask ? nextNowTask.title : remaining === 0 ? '今日の分は完了。いい感じ' : '次にやる1つをここで決めます'}</Text>
            {designMode === 'chic' && <Text style={styles.chicTodayStats}>完了 {allTasks.filter((task) => task.done && task.completedAt && dateKey(task.completedAt) === dateKey(now)).length}　残り {remaining}</Text>}
          </View>
        </View>
      </View>
      <TodayWinStrip tasks={allTasks} designMode={designMode} chicPattern={chicPattern} onRestore={(id) => onRestore(id)} />

      <View style={[styles.quickAddCard, designMode === 'minimal' && styles.quickAddCardMinimal, designMode === 'chic' && styles.quickAddCardChic]}>
        <Text style={styles.quickAddTitle}>やることを追加</Text>
        <TextInput
          value={quickTitle}
          onChangeText={setQuickTitle}
          placeholder="明日18時に洗濯物を取り込む"
          placeholderTextColor="#A29DAA"
          style={styles.quickAddInput}
          returnKeyType="done"
          onSubmitEditing={handleQuickAdd}
        />
        <Text style={styles.quickAddHint}>キーボードのマイクから音声でも入力できます</Text>
        <Pressable style={styles.quickAddButton} onPress={handleQuickAdd}><Text style={styles.quickAddButtonText}>登録</Text></Pressable>
      </View>

      <View style={[styles.sectionHeader, designMode === 'minimal' && styles.sectionHeaderMinimal]}>
        <View>
          <Text style={styles.sectionTitle}>今日のタスク</Text>
          <Text style={styles.sectionSub}>{remaining === 0 ? 'きれいに片づきました' : `あと${remaining}件です`}</Text>
        </View>
        <View style={styles.taskHeaderButtons}>
          <Pressable style={styles.selectButton} onPress={onSelectionMode}><Text style={styles.selectButtonText}>{selectionMode ? '取消' : '選択'}</Text></Pressable>
          <Pressable style={styles.addButton} onPress={onAdd}><Text style={styles.addButtonText}>＋ 追加</Text></Pressable>
        </View>
      </View>

      <View style={styles.bucketTabs}>{([{ id: 'now', label: '今やる' }, { id: 'later', label: 'あとで' }, { id: 'waiting', label: '待ち' }] as { id: TaskBucket; label: string }[]).map((item) => {
        const count = tasks.filter((task) => (task.bucket ?? 'now') === item.id).length;
        return <Pressable key={item.id} style={[styles.bucketTab, designMode === 'minimal' && styles.bucketTabMinimal, designMode === 'chic' && styles.bucketTabChic, bucketFilter === item.id && styles.bucketTabActive, bucketFilter === item.id && designMode === 'chic' && styles.bucketTabActiveChic]} onPress={() => setBucketFilter(item.id)}><Text style={[styles.bucketTabText, bucketFilter === item.id && styles.bucketTabTextActive]}>{item.label} {count}</Text></Pressable>;
      })}</View>

      <View style={styles.homeToolRow}>
        <HomeToolCard designMode={designMode} chicPattern={chicPattern} kind="departure" icon="↗" title="出発" meta={timeline.leave} onPress={() => onOpenTime('departure')} />
        <HomeToolCard designMode={designMode} chicPattern={chicPattern} kind="calendar" icon="▦" title="予定表" meta="月を見る" onPress={() => onOpenTime('calendar')} />
        <HomeToolCard designMode={designMode} chicPattern={chicPattern} kind="focus" icon="◉" title="集中" meta="今だけ" onPress={() => onOpenTime('focus')} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
        {(['すべて', ...categories] as const).map((category) => <Pressable key={category} style={[styles.filterChip, categoryFilter === category && styles.filterChipActive]} onPress={() => setCategoryFilter(category)}><Text style={[styles.filterChipText, categoryFilter === category && styles.filterChipTextActive]}>{category}</Text></Pressable>)}
      </ScrollView>

      {selectionMode && (
        <View style={styles.batchBar}>
          <Text style={styles.batchCount}>{selectedTaskIds.length}件を選択中</Text>
          <Pressable disabled={selectedTaskIds.length === 0} style={[styles.batchComplete, selectedTaskIds.length === 0 && styles.batchDisabled]} onPress={onCompleteSelected}>
            <Text style={styles.batchCompleteText}>まとめて完了</Text>
          </Pressable>
        </View>
      )}

      {displayTasks.length === 0 ? (
        <Pressable style={[styles.emptyCard, designMode === 'minimal' && styles.emptyCardMinimal, designMode === 'chic' && styles.emptyCardChic, ]} onPress={onAdd}>
          {designMode === 'chic' && <ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" />}
          <View style={designMode === 'chic' ? styles.emptyChicGlass : styles.emptyPlainContent}><Text style={styles.emptyIcon}>○</Text><Text style={styles.emptyTitle}>最初のタスクを追加しよう</Text><Text style={styles.emptyCopy}>忘れたくないことを、ここに置いておけます。</Text></View>
        </Pressable>
      ) : displayTasks.map((task) => { const chicPalette = getChicTaskPatternPalette(task.category); return (
        <View key={task.id} style={[styles.taskCard, designMode === 'minimal' && styles.taskCardMinimal, designMode === 'chic' && styles.taskCardChic, designMode === 'chic' && { backgroundColor: chicPalette.background }, task.done && designMode !== 'chic' && styles.taskCardDone, task.done && designMode === 'chic' && styles.taskCardChicDone]}>
          {designMode === 'chic' && <ChicPatternDecor pattern={chicPattern} accent={chicPalette.accent} warm={chicPalette.warm} density="compact" />}
          <View style={[styles.taskCardInner, designMode === 'chic' && styles.taskCardInnerChic, task.done && designMode === 'chic' && styles.taskCardInnerChicDone]}>
          <Pressable style={[styles.check, task.done && styles.checkDone, task.done && designMode === 'chic' && { backgroundColor: '#D986A1', borderColor: '#D986A1' }, selectionMode && selectedTaskIds.includes(task.id) && styles.selectionChecked]} onPress={() => selectionMode ? onToggleSelection(task.id) : onToggle(task.id)}>
            <Text style={styles.checkMark}>{selectionMode ? (selectedTaskIds.includes(task.id) ? '✓' : '') : (task.done ? completionIcon : '')}</Text>
          </Pressable>
          <View style={styles.taskBody}>
            <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>{task.title}</Text>
            {task.navigationEnabled && !task.done && <View style={styles.inlineUrgency}><Text style={styles.inlineUrgencyText}>{getUrgencyStatus(task, now)}</Text><Text style={styles.inlineRisk}>{getLateRiskMessage(task, now)}</Text></View>}
            <View style={styles.taskInfoRow}>
              <View style={[styles.priorityPill, task.priority === '高' && styles.priorityHigh]}><Text style={[styles.priorityText, task.priority === '高' && styles.priorityHighText]}>{task.priority === '高' ? '！重要' : task.priority}</Text></View>
              <View style={[styles.categoryPill, { backgroundColor: categoryColors[task.category] }, designMode === 'chic' && styles.categoryPillChic, designMode === 'chic' && { borderColor: chicPalette.accent }]}><Text style={[styles.categoryText, designMode === 'chic' && { color: chicPalette.accent }]}>{task.category}</Text></View>
              {task.repeatRule && task.repeatRule !== 'none' && <View style={styles.routinePill}><Text style={styles.routinePillText}>↻ {repeatOptions.find((option) => option.id === task.repeatRule)?.label}</Text></View>}
              {task.scheduledDate && <Text style={styles.taskMeta}>▣ {task.scheduledDate.slice(5).replace('-', '/')}</Text>}
              {task.remindAt && <Text style={styles.taskMeta}>◷ {task.remindDate?.slice(5).replace('-', '/')} {task.remindAt}</Text>}
              {task.remindAt && task.nudgeMode && task.nudgeMode !== 'once' && <View style={styles.nudgeBadge}><Text style={styles.nudgeBadgeText}>{task.nudgeMode === 'strong' ? '通知×3' : '通知×2'}</Text></View>}
              {task.deadlineDate && (() => { const status = deadlineLabel(task); return <Text style={[styles.deadlineMeta, status?.overdue && styles.deadlineOverdue]}>⌛ {task.deadlineDate.slice(5).replace('-', '/')} {task.deadlineTime ?? '23:59'} · {status?.text}</Text>; })()}
            </View>
          </View>
          {!selectionMode && <Pressable style={styles.taskBucketButton} onPress={() => setBucketTask(task)}><Text style={styles.taskBucketButtonText}>{(task.bucket ?? 'now') === 'now' ? '今やる' : task.bucket === 'later' ? 'あとで' : '待ち'}⌄</Text></Pressable>}
          {!selectionMode && <Pressable style={styles.taskMoreButton} onPress={() => setActionTask(task)} hitSlop={8}><Text style={styles.taskMoreText}>•••</Text></Pressable>}
          </View>
        </View>
      ); })}
      <Modal visible={Boolean(bucketTask)} transparent animationType="fade" onRequestClose={() => setBucketTask(null)}>
        <Pressable style={styles.bucketModalBackdrop} onPress={() => setBucketTask(null)}>
          <View style={styles.bucketModalCard}>
            <Text style={styles.bucketModalTitle}>どこに振り分ける？</Text>
            <Text numberOfLines={1} style={styles.bucketModalTask}>{bucketTask?.title}</Text>
            {([{ id: 'now', label: '今やる', copy: '今日、優先して取り組む' }, { id: 'later', label: 'あとで', copy: '今日中だけど、今ではない' }, { id: 'waiting', label: '待ち', copy: '返事や条件が揃うまで保留' }] as { id: TaskBucket; label: string; copy: string }[]).map((item) => <Pressable key={item.id} style={[styles.bucketModalOption, (bucketTask?.bucket ?? 'now') === item.id && styles.bucketModalOptionActive]} onPress={() => { if (bucketTask) onBucket(bucketTask.id, item.id); setBucketTask(null); setBucketFilter(item.id); }}><View><Text style={styles.bucketModalOptionTitle}>{item.label}</Text><Text style={styles.bucketModalOptionCopy}>{item.copy}</Text></View><Text style={styles.bucketModalOptionCheck}>{(bucketTask?.bucket ?? 'now') === item.id ? '✓' : '›'}</Text></Pressable>)}
          </View>
        </Pressable>
      </Modal>
      <Modal visible={Boolean(actionTask)} transparent animationType="fade" onRequestClose={() => setActionTask(null)}>
        <Pressable style={styles.bucketModalBackdrop} onPress={() => setActionTask(null)}>
          <View style={styles.taskActionCard}>
            <Text numberOfLines={1} style={styles.bucketModalTitle}>{actionTask?.title}</Text>
            <Text style={styles.taskActionHint}>タスクの操作</Text>
            <View style={styles.taskActionGrid}>
              <Pressable style={styles.taskActionOption} onPress={() => { if (actionTask) onEdit(actionTask); setActionTask(null); }}><Text style={styles.taskActionIcon}>✎</Text><Text style={styles.taskActionLabel}>編集</Text></Pressable>
              <Pressable style={styles.taskActionOption} onPress={() => { if (actionTask) onDuplicate(actionTask); setActionTask(null); }}><Text style={styles.taskActionIcon}>▣</Text><Text style={styles.taskActionLabel}>複製</Text></Pressable>
              <Pressable style={styles.taskActionOption} onPress={() => { if (actionTask) onPostpone(actionTask.id); setActionTask(null); }}><Text style={styles.taskActionIcon}>→</Text><Text style={styles.taskActionLabel}>明日へ</Text></Pressable>
              <Pressable style={[styles.taskActionOption, styles.taskActionDelete]} onPress={() => { if (actionTask) onDelete(actionTask.id); setActionTask(null); }}><Text style={[styles.taskActionIcon, styles.taskActionDeleteText]}>×</Text><Text style={[styles.taskActionLabel, styles.taskActionDeleteText]}>削除</Text></Pressable>
            </View>
            <Pressable style={styles.taskTemplateSaveAction} onPress={() => { if (actionTask) onSaveTemplate(actionTask); setActionTask(null); }}><View><Text style={styles.taskTemplateSaveTitle}>設定ごとひな型に保存</Text><Text style={styles.taskTemplateSaveCopy}>カテゴリ・通知・間に合うナビも再利用</Text></View><Text style={styles.taskTemplateSavePremium}>Premium</Text></Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function HomeToolCard({ designMode, chicPattern, kind, icon, title, meta, onPress }: { designMode: DesignMode; chicPattern: ChicPattern; kind: 'departure' | 'calendar' | 'focus'; icon: string; title: string; meta: string; onPress: () => void }) {
  const palette = chicUtilityPalettes[kind];
  return <Pressable style={[styles.homeToolCard, designMode === 'minimal' && styles.homeToolCardMinimal, designMode === 'chic' && styles.homeToolCardChic, designMode === 'chic' && { backgroundColor: palette.background }, ]} onPress={onPress}>
    {designMode === 'chic' && <ChicPatternDecor pattern={chicPattern} accent={palette.accent} warm={palette.warm} density="compact" />}
    <View style={designMode === 'chic' ? styles.homeToolGlass : styles.homeToolPlain}><Text style={[styles.homeToolIcon, designMode === 'chic' && { color: palette.accent }]}>{icon}</Text><Text style={styles.homeToolTitle}>{title}</Text><Text numberOfLines={1} style={styles.homeToolMeta}>{meta}</Text></View>
  </Pressable>;
}

function TimeTabButton({ tab, active, designMode, chicPattern, themeAccent, secondaryText, onPress }: { tab: TimeTab; active: boolean; designMode: DesignMode; chicPattern: ChicPattern; themeAccent: string; secondaryText: string; onPress: () => void }) {
  const palette = chicUtilityPalettes[tab];
  const label = tab === 'departure' ? '出発' : tab === 'deadline' ? '締切' : tab === 'calendar' ? '予定表' : '集中';
  if (designMode === 'chic') return <Pressable style={[styles.timeTab, styles.timeTabChicPattern, { backgroundColor: palette.background }, active && { borderColor: palette.accent, borderWidth: 2 }]} onPress={onPress}><ChicPatternDecor pattern={chicPattern} accent={palette.accent} warm={palette.warm} density="compact" /><View style={[styles.timeTabGlassLabel, active && styles.timeTabGlassLabelActive]}><Text style={[styles.timeTabText, { color: active ? palette.accent : '#8B7B82' }]}>{label}</Text>{active && <Text style={[styles.timeTabMarker, { color: palette.accent }]}>●</Text>}</View></Pressable>;
  return <Pressable style={[styles.timeTab, designMode === 'minimal' && styles.timeTabMinimal, active && styles.timeTabActive, active && { backgroundColor: themeAccent, borderColor: themeAccent }]} onPress={onPress}><Text style={[styles.timeTabText, { color: secondaryText }, active && styles.timeTabTextActive]}>{label}</Text></Pressable>;
}

function TimelineScreen({
  plan,
  timeline,
  plans,
  departureCheckIns,
  behaviorEvents,
  tasks,
  now,
  designMode,
  initialTab,
  chicPattern,
  planTier,
  recoveryTargetPlanId,
  onChange,
  onSchedule,
  onEdit,
  onDelete,
  onEditTask,
  onPremium,
  onRecovery,
  onRecoveryClosed,
  onFocusCompleted,
  onBehaviorEvent,
  onDeparted,
  onPreparationStarted,
}: {
  plan: DeparturePlan;
  timeline: { start: string; leave: string; arrival: string };
  plans: DeparturePlan[];
  departureCheckIns: DepartureCheckIn[];
  behaviorEvents: BehaviorEvent[];
  tasks: Task[];
  now: Date;
  designMode: DesignMode;
  initialTab: TimeTab;
  chicPattern: ChicPattern;
  planTier: PlanTier;
  recoveryTargetPlanId?: string;
  onChange: (plan: DeparturePlan) => void;
  onSchedule: () => void;
  onEdit: (plan: DeparturePlan) => void;
  onDelete: (id: string) => void;
  onEditTask: (task: Task) => void;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onRecovery: (record: RecoveryRecord) => void;
  onRecoveryClosed: () => void;
  onFocusCompleted: (session: FocusSession) => void;
  onBehaviorEvent: (event: BehaviorEvent) => void;
  onDeparted: (planId: string) => void;
  onPreparationStarted: (planId: string) => void;
}) {
  const theme = getThemeTokens(designMode);
  const [showPlanDatePicker, setShowPlanDatePicker] = useState(false);
  const [timeTab, setTimeTab] = useState<TimeTab>(initialTab);
  const [calendarEvents, setCalendarEvents] = useState<Calendar.Event[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [recoveryPlan, setRecoveryPlan] = useState<DeparturePlan>();
  const [statusMessage, setStatusMessage] = useState('');
  useEffect(() => setTimeTab(initialTab), [initialTab]);
  useEffect(() => {
    if (!recoveryTargetPlanId) return;
    const target = plans.find((item) => item.id === recoveryTargetPlanId);
    if (target) setRecoveryPlan(target);
  }, [plans, recoveryTargetPlanId]);
  const deadlineTasks = [...tasks].filter((task) => !task.done && task.deadlineDate).sort((a, b) => (getTargetDate(a)?.getTime() ?? Infinity) - (getTargetDate(b)?.getTime() ?? Infinity));
  const importCalendarEvents = async () => {
    if (!hasPremiumAccess(planTier, 'external_calendar')) {
      onPremium('calendar');
      return;
    }
    setCalendarLoading(true);
    try {
      const permission = await Calendar.requestCalendarPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('カレンダーへのアクセスが必要です', '設定からカレンダーへのアクセスを許可してください。');
        return;
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const start = new Date();
      const end = new Date(start.getTime() + 14 * 24 * 60 * 60_000);
      const events = await Calendar.getEventsAsync(calendars.map((item) => item.id), start, end);
      setCalendarEvents(events.filter((event) => !event.allDay).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 12));
    } catch {
      Alert.alert('カレンダーを読み込めませんでした');
    } finally {
      setCalendarLoading(false);
    }
  };
  const selectCalendarEvent = (event: Calendar.Event) => {
    const start = new Date(event.startDate);
    onChange({ ...initialPlan, title: event.title || 'カレンダーの予定', date: dateKey(start), arrival: formatLiveTime(start) });
    setCalendarEvents([]);
    setTimeTab('departure');
  };
  return (
    <>
      {designMode === 'chic' ? <View style={styles.chicTimeHero}><ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" /><View style={styles.chicTimeHeroPaper}><Text numberOfLines={2} style={[styles.hero, styles.timeHero, { marginBottom: 0 }]}>時間に追われる前に、先回り。</Text></View></View> : <Text numberOfLines={2} style={[styles.hero, styles.timeHero]}>時間に追われる前に、先回り。</Text>}
      <View style={[styles.timeTabs, designMode === 'minimal' && styles.timeTabsMinimal, designMode === 'chic' && styles.timeTabsChic, ]}>
        {(['departure', 'deadline', 'calendar', 'focus'] as TimeTab[]).map((tab) => <TimeTabButton key={tab} tab={tab} active={timeTab === tab} designMode={designMode} chicPattern={chicPattern} themeAccent={theme.colors.primaryAccent} secondaryText={theme.colors.secondaryText} onPress={() => setTimeTab(tab)} />)}
      </View>

      {timeTab === 'focus' ? <FocusMode tasks={tasks} designMode={designMode} onFocusCompleted={onFocusCompleted} onBehaviorEvent={onBehaviorEvent} /> : timeTab === 'calendar' ? <TaskScheduleCalendar tasks={tasks} plans={plans} externalEvents={calendarEvents} now={now} designMode={designMode} chicPattern={chicPattern} planTier={planTier} onPremium={onPremium} onEditTask={onEditTask} onEditPlan={onEdit} /> : timeTab === 'deadline' ? <>
        <View style={styles.departureListHeader}><Text style={styles.sectionTitle}>締切カウントダウン</Text><Text style={styles.sectionSub}>{deadlineTasks.length}件</Text></View>
        {deadlineTasks.length === 0 ? <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>期限付きタスクを追加すると、ここに残り時間が表示されます。</Text></View> : deadlineTasks.map((task) => {
          const target = getTargetDate(task)!;
          const overdue = target.getTime() <= now.getTime();
          return <Pressable key={task.id} style={[styles.deadlineCountdownCard, overdue && styles.deadlineCountdownDanger]} onPress={() => onEditTask(task)}>
            <View style={{ flex: 1 }}><Text style={styles.departureCountdownTitle}>{task.title}</Text><View style={styles.taskInfoRow}><View style={[styles.categoryPill, { backgroundColor: categoryColors[task.category] }]}><Text style={styles.categoryText}>{task.category}</Text></View><Text style={styles.deadlineCountdownWhen}>{task.deadlineDate?.replaceAll('-', '.')} {task.deadlineTime}</Text></View></View>
            <View style={styles.departureCountdownRight}><Text style={[styles.departureCountdownValue, overdue && styles.deadlineDangerText]}>{overdue ? '期限超過' : countdownToDate(target, now)}</Text><Text style={styles.deadlineTapEdit}>タップして編集</Text></View>
          </Pressable>;
        })}
        <View style={styles.deadlineGuide}><Text style={styles.deadlineGuideTitle}>締切の追加方法</Text><Text style={styles.deadlineGuideCopy}>「今日」→「＋追加」→「期限を設定」から登録できます。</Text></View>
      </> : <>
      <Pressable style={styles.calendarImportButton} onPress={importCalendarEvents}><Text style={styles.calendarImportIcon}>▣</Text><View style={{ flex: 1 }}><Text style={styles.calendarImportTitle}>{calendarLoading ? '読み込み中…' : 'いつものカレンダーとつなぐ'}</Text><Text style={styles.calendarImportCopy}>{hasPremiumAccess(planTier, 'external_calendar') ? '端末の予定をRhythmへ取り込む' : 'Premium'}</Text></View><Text style={styles.calendarImportArrow}>›</Text></Pressable>
      {calendarEvents.length > 0 && <View style={styles.calendarEventPicker}><Text style={styles.calendarEventPickerTitle}>取り込む予定を選択</Text>{calendarEvents.map((event) => { const start = new Date(event.startDate); return <Pressable key={event.id} style={styles.calendarEventRow} onPress={() => selectCalendarEvent(event)}><View><Text style={styles.calendarEventTitle}>{event.title || '名称なし'}</Text><Text style={styles.calendarEventDate}>{formatLiveDate(start)} {formatLiveTime(start)}</Text></View><Text style={styles.calendarImportArrow}>＋</Text></Pressable>; })}</View>}
      <View style={styles.departureListHeader}><Text style={styles.sectionTitle}>カウントダウン</Text><Text style={styles.sectionSub}>{plans.length}件の予定</Text></View>
      {plans.length === 0 ? <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>予定を追加すると、ここに出発までの時間が並びます。</Text></View> : [...plans].sort((a, b) => getDepartureMoments(a).leave.getTime() - getDepartureMoments(b).leave.getTime()).map((item) => {
        const moments = getDepartureMoments(item);
        const passed = moments.arrival.getTime() < now.getTime();
        const checkIn = item.id ? departureCheckIns.find((record) => record.planId === item.id && record.date === item.date) : undefined;
        const preparationEvent = item.id ? behaviorEvents.find((event) => event.type === 'departure_preparation_started' && event.departurePlanId === item.id && event.departurePlanDate === item.date) : undefined;
        const departureEvent = item.id ? behaviorEvents.find((event) => event.type === 'departure_started' && event.departurePlanId === item.id && event.departurePlanDate === item.date) : undefined;
        return <View key={item.id} style={[styles.departureCountdownCard, passed && styles.departurePassed]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.departureCountdownTitle}>{item.title}</Text>
            <Text style={styles.departureCountdownDate}>{item.date.replaceAll('-', '.')} · {item.arrival}到着</Text>
            <Text style={styles.departureCountdownMeta}>{formatLiveTime(moments.leave)}出発 · {formatLiveTime(moments.prepare)}準備</Text>
            {preparationEvent && <Text style={styles.taskMeta}>準備開始 {formatLiveTime(new Date(preparationEvent.actualAt ?? preparationEvent.occurredAt))}</Text>}
            {departureEvent && <Text style={styles.taskMeta}>出発 {formatLiveTime(new Date(departureEvent.actualAt ?? departureEvent.occurredAt))}</Text>}
            {checkIn && <Text style={styles.taskMeta}>出発済み {formatLiveTime(new Date(checkIn.departedAt))} · {checkIn.onTime ? '予定どおり' : '遅れて出発'}</Text>}
          </View>
          <View style={styles.departureCountdownRight}><Text style={styles.departureCountdownValue}>{checkIn ? '出発済み' : passed ? '終了' : countdownToDate(moments.leave, now)}</Text>{!preparationEvent && item.id && <View style={styles.twoChoiceRow}><Pressable style={styles.recoveryMiniButton} onPress={() => onPreparationStarted(item.id!)}><Text style={styles.recoveryMiniButtonText}>準備した</Text></Pressable><Pressable style={styles.recoveryMiniButtonSecondary} onPress={() => setStatusMessage('今の時間から、次に準備するタイミングを考えます。')}><Text style={styles.recoveryMiniButtonSecondaryText}>まだ</Text></Pressable></View>}{!checkIn && item.id && <View style={styles.twoChoiceRow}><Pressable style={styles.recoveryMiniButton} onPress={() => onDeparted(item.id!)}><Text style={styles.recoveryMiniButtonText}>出発した</Text></Pressable><Pressable style={styles.recoveryMiniButtonSecondary} onPress={() => setStatusMessage('5分後にもう一度確認します。')}><Text style={styles.recoveryMiniButtonSecondaryText}>まだ</Text></Pressable></View>}{!checkIn && moments.leave.getTime() <= now.getTime() && <Pressable style={styles.recoveryMiniButton} onPress={() => hasPremiumAccess(planTier, 'late_recovery') ? setRecoveryPlan(item) : onPremium('recovery')}><Text style={styles.recoveryMiniButtonText}>立て直す {hasPremiumAccess(planTier, 'late_recovery') ? '' : 'Premium'}</Text></Pressable>}<View style={styles.departureActions}><Pressable onPress={() => onEdit(item)}><Text style={styles.departureEdit}>編集</Text></Pressable><Pressable onPress={() => item.id && onDelete(item.id)}><Text style={styles.departureDelete}>×</Text></Pressable></View></View>
        </View>;
      })}
      {!!statusMessage && <Text style={styles.timelineStatusMessage}>{statusMessage}</Text>}

      <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 10 }]}>{plan.id ? '予定を編集' : '予定を追加'}</Text>
      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>予定の名前</Text>
        <TextInput
          style={styles.titleInput}
          value={plan.title}
          onChangeText={(title) => onChange({ ...plan, title })}
          placeholder="予定を入力"
        />
        <Text style={styles.fieldLabel}>到着したい時刻</Text>
        <Pressable style={styles.departureDateButton} onPress={() => setShowPlanDatePicker((value) => !value)}><Text style={styles.departureDateButtonText}>▣ {plan.date}</Text></Pressable>
        {showPlanDatePicker && <DateTimePicker value={dateForReminder(plan.date, plan.arrival)} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={(event, selected) => {
          if (Platform.OS !== 'ios') setShowPlanDatePicker(false);
          if (event.type === 'set' && selected) onChange({ ...plan, date: dateKey(selected) });
        }} />}
        <TextInput
          style={styles.arrivalInput}
          value={plan.arrival}
          onChangeText={(arrival) => onChange({ ...plan, arrival })}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />
        <NumberSetting label="移動時間" value={plan.travelMinutes} onChange={(travelMinutes) => onChange({ ...plan, travelMinutes })} />
        <NumberSetting label="準備時間" value={plan.preparationMinutes} onChange={(preparationMinutes) => onChange({ ...plan, preparationMinutes })} />
        <NumberSetting label="余裕時間" value={plan.bufferMinutes} onChange={(bufferMinutes) => onChange({ ...plan, bufferMinutes })} />
      </View>

      <View style={styles.timelineCard}>
        <TimelinePoint time={timeline.start} label="準備スタート" />
        <TimelinePoint time={timeline.leave} label="家を出る" featured />
        <TimelinePoint time={timeline.arrival} label="目的地に到着" last />
      </View>

      <Pressable style={styles.primaryButton} onPress={onSchedule}>
        <Text style={styles.primaryButtonText}>{plan.id ? '変更を保存して通知' : '予定を追加して通知'}</Text>
      </Pressable>
      </>}

      <Pressable style={[styles.premiumCard, { backgroundColor: designMode === 'minimal' ? '#FFFFFF' : designMode === 'chic' ? '#FFF0F2' : '#FFF0DC', borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.large }]} onPress={() => onPremium()}>
        <View style={styles.premiumText}>
          <Text style={[styles.premiumBadge, { color: theme.colors.primaryAccent }]}>PREMIUM</Text>
          <Text style={styles.premiumTitle}>寝坊防止モード</Text>
          <Text style={styles.premiumCopy}>自動再計算・遅刻リカバリー・ガチ警告</Text>
        </View>
        <Text style={[styles.lock, { color: theme.colors.primaryAccent }]}>▣</Text>
      </Pressable>
      <RecoveryModal visible={Boolean(recoveryPlan)} plan={recoveryPlan} now={now} designMode={designMode} onPremium={() => onPremium('recovery')} onClose={() => { setRecoveryPlan(undefined); onRecoveryClosed(); }} onApply={(record) => { onRecovery(record); setRecoveryPlan(undefined); }} />
    </>
  );
}

function FocusMode({ tasks, designMode, onFocusCompleted, onBehaviorEvent }: { tasks: Task[]; designMode: DesignMode; onFocusCompleted: (session: FocusSession) => void; onBehaviorEvent: (event: BehaviorEvent) => void }) {
  const availableTasks = tasks.filter((task) => !task.done);
  const [selectedTaskId, setSelectedTaskId] = useState(availableTasks[0]?.id ?? '');
  const [duration, setDuration] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const selectedTask = availableTasks.find((task) => task.id === selectedTaskId);
  const sessionRef = React.useRef<{ id: string; startedAt: Date; taskId?: string; taskTitle?: string; plannedDurationMinutes: number } | undefined>(undefined);
  const endAtRef = React.useRef<number | undefined>(undefined);
  const completionCallbackRef = React.useRef(onFocusCompleted);
  completionCallbackRef.current = onFocusCompleted;
  const behaviorCallbackRef = React.useRef(onBehaviorEvent);
  behaviorCallbackRef.current = onBehaviorEvent;

  const finishSession = React.useCallback(() => {
    const activeSession = sessionRef.current;
    if (!activeSession) return;
    const actualAt = new Date();
    const session = createCompletedFocusSession({ id: activeSession.id, taskId: activeSession.taskId, taskTitle: activeSession.taskTitle, durationMinutes: activeSession.plannedDurationMinutes, startedAt: activeSession.startedAt, completedAt: actualAt });
    sessionRef.current = undefined;
    endAtRef.current = undefined;
    behaviorCallbackRef.current(createFocusCompletedBehaviorEvent({ sessionId: activeSession.id, taskId: activeSession.taskId, taskTitle: activeSession.taskTitle, plannedDurationMinutes: activeSession.plannedDurationMinutes, focusStartedAt: activeSession.startedAt, actualAt }));
    setRunning(false);
    setSecondsLeft(0);
    completionCallbackRef.current(session);
    Alert.alert('集中タイム終了', selectedTask ? `「${selectedTask.title}」に取り組めました。少し休憩しよう。` : '少し休憩しよう。');
  }, [selectedTask]);

  const stopActiveSession = React.useCallback(() => {
    const activeSession = sessionRef.current;
    if (!activeSession) return;
    sessionRef.current = undefined;
    endAtRef.current = undefined;
    behaviorCallbackRef.current(createFocusStoppedEvent({ sessionId: activeSession.id, taskId: activeSession.taskId, taskTitle: activeSession.taskTitle, plannedDurationMinutes: activeSession.plannedDurationMinutes, focusStartedAt: activeSession.startedAt, actualAt: new Date() }));
  }, []);

  useEffect(() => () => {
    stopActiveSession();
  }, [stopActiveSession]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const endAt = endAtRef.current;
      if (!endAt) return;
      const remainingSeconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSecondsLeft(remainingSeconds);
      if (remainingSeconds === 0) finishSession();
    }, 500);
    return () => clearInterval(timer);
  }, [finishSession, running]);

  const chooseDuration = (minutes: number) => {
    if (sessionRef.current) stopActiveSession();
    setDuration(minutes);
    setSecondsLeft(minutes * 60);
    setRunning(false);
    sessionRef.current = undefined;
    endAtRef.current = undefined;
  };
  const reset = () => {
    if (sessionRef.current) stopActiveSession();
    setRunning(false);
    setSecondsLeft(duration * 60);
    sessionRef.current = undefined;
    endAtRef.current = undefined;
  };
  const toggleTimer = () => {
    if (running) {
      const endAt = endAtRef.current;
      if (endAt) setSecondsLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
      stopActiveSession();
      setRunning(false);
      return;
    }
    const nextSeconds = secondsLeft === 0 ? duration * 60 : secondsLeft;
    if (!sessionRef.current) {
      const startedAt = new Date();
      const id = createFocusSessionId(startedAt, Math.random().toString(36).slice(2, 10));
      const plannedDurationMinutes = Math.max(1, Math.ceil(nextSeconds / 60));
      sessionRef.current = { id, startedAt, taskId: selectedTask?.id, taskTitle: selectedTask?.title, plannedDurationMinutes };
      behaviorCallbackRef.current(createFocusStartedEvent({ sessionId: id, taskId: selectedTask?.id, taskTitle: selectedTask?.title, plannedDurationMinutes, occurredAt: startedAt }));
    }
    setSecondsLeft(nextSeconds);
    endAtRef.current = Date.now() + nextSeconds * 1000;
    setRunning(true);
  };
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = 1 - secondsLeft / (duration * 60);

  const isMinimal = designMode === 'minimal';
  const isChic = designMode === 'chic';
  const modeCopy = isMinimal ? '今はこれだけ' : isChic ? '静かな時間を、ひとつだけ。' : '相棒も隣でいっしょに集中！';
  return <>
    <View style={[styles.focusHero, isChic && styles.focusHeroChic, ]}>
      {isChic && <><View style={styles.focusChicFlowerOne}><Text>✿</Text></View><View style={styles.focusChicFlowerTwo}><Text>✦</Text></View></>}
      <Text style={[styles.focusEyebrow, !isMinimal && styles.focusEyebrowLight]}>{running ? '集中中' : '集中タイマー'}</Text>
      <Text style={[styles.focusTitle, !isMinimal && styles.focusTitleLight]}>{selectedTask?.title ?? '集中するタスクを選ぼう'}</Text>
      <Text style={[styles.focusCopy, !isMinimal && styles.focusCopyLight]}>{modeCopy}</Text>
      <View style={[styles.focusTimerRing, isChic && styles.focusTimerRingChic, ]}>
        <Text style={[styles.focusTime, !isMinimal && styles.focusTimeLight]}>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</Text>
        <Text style={[styles.focusTimerState, isChic && styles.focusTimerStateChic, ]}>{running ? '集中中' : secondsLeft === 0 ? 'できた！' : '準備OK'}</Text>
      </View>
      <View style={[styles.focusProgressTrack, !isMinimal && styles.focusProgressTrackLight]}><View style={[styles.focusProgressFill, isChic && styles.focusProgressFillChic, { width: `${Math.max(2, progress * 100)}%` }]} /></View>
      <View style={styles.focusActions}>
        <Pressable style={[styles.focusResetButton, !isMinimal && styles.focusResetButtonLight]} onPress={reset}><Text style={[styles.focusResetText, !isMinimal && styles.focusResetTextLight]}>リセット</Text></Pressable>
        <Pressable style={[styles.focusStartButton, isChic && styles.focusStartButtonChic, ]} onPress={toggleTimer}><Text style={styles.focusStartText}>{running ? '一時停止' : secondsLeft === 0 ? 'もう一度' : 'スタート'}</Text></Pressable>
      </View>
    </View>
    <Text style={styles.focusSectionTitle}>集中時間</Text>
    <View style={styles.focusDurationRow}>{[5, 15, 25, 45].map((minutesValue) => <Pressable key={minutesValue} style={[styles.focusDurationChip, duration === minutesValue && styles.focusDurationChipActive]} onPress={() => chooseDuration(minutesValue)}><Text style={[styles.focusDurationText, duration === minutesValue && styles.focusDurationTextActive]}>{minutesValue}分</Text></Pressable>)}</View>
    <Text style={styles.focusSectionTitle}>今やるタスク</Text>
    {availableTasks.length === 0 ? <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>未完了タスクはありません。今日はゆっくりしよう。</Text></View> : availableTasks.slice(0, 8).map((task) => <Pressable key={task.id} style={[styles.focusTaskRow, selectedTaskId === task.id && styles.focusTaskRowActive]} onPress={() => { setSelectedTaskId(task.id); reset(); }}><View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} /><View style={{ flex: 1 }}><Text style={styles.focusTaskTitle}>{task.title}</Text><Text style={styles.focusTaskMeta}>{task.category} ・ 優先度 {task.priority}</Text></View><Text style={styles.focusTaskCheck}>{selectedTaskId === task.id ? '●' : '○'}</Text></Pressable>)}
  </>;
}

function RecoveryModal({ visible, plan, now, designMode, onClose, onApply, onPremium }: { visible: boolean; plan?: DeparturePlan; now: Date; designMode: DesignMode; onClose: () => void; onApply: (record: RecoveryRecord) => void; onPremium: () => void }) {
  if (!plan) return null;
  const theme = getThemeTokens(designMode);
  const options = getRecoveryOptions(plan, now);
  const estimatedArrival = options[0]?.estimatedArrival ?? plan.arrival;
  const applyOption = async (option: RecoveryOption) => {
    const record = createRecoveryRecord(plan, option);
    if (!record) { Alert.alert('この予定はまだ保存されていません'); return; }
    if (option.action === 'contact' && option.contactMessage) {
      const result = await Share.share({ message: option.contactMessage });
      if (result.action !== Share.sharedAction) return;
    }
    onApply(record);
    Alert.alert('リカバリープランを反映しました', option.description);
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.modalBackdrop} onPress={onClose}><Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, borderRadius: theme.radius.modal }]} onPress={(event) => event.stopPropagation()}><ScrollView showsVerticalScrollIndicator={false}><View style={styles.modalHandle} /><View style={[styles.recoveryHeader, { backgroundColor: theme.colors.softAccent }]}><Text style={[styles.recoveryEyebrow, { color: theme.colors.primaryAccent }]}>遅れても、ここから立て直せます</Text><Text style={styles.recoveryTitle}>{plan.title}</Text><Text style={styles.recoverySummary}>予定到着 {plan.arrival}　→　今出ると {estimatedArrival}ごろ</Text></View><Text style={styles.recoveryPrompt}>次の行動を選んでください</Text>{options.map((option) => { const locked = option.action === 'delay_arrival' || option.action === 'reschedule'; return <Pressable key={option.action} style={[styles.recoveryOption, { borderColor: theme.colors.border }]} onPress={() => { if (locked) { onClose(); onPremium(); } else void applyOption(option); }}><View style={[styles.recoveryOptionIcon, { backgroundColor: theme.colors.secondarySurface }]}><Text style={[styles.recoveryOptionIconText, { color: theme.colors.primaryAccent }]}>{option.action === 'leave_now' ? '↗' : option.action === 'delay_arrival' ? '◷' : option.action === 'contact' ? '✉' : '↻'}</Text></View><View style={{ flex: 1 }}><Text style={styles.recoveryOptionTitle}>{option.title}</Text><Text style={styles.recoveryOptionCopy}>{option.description}</Text></View><Text style={[styles.recoveryOptionArrow, { color: theme.colors.primaryAccent }]}>{locked ? '▣' : '›'}</Text></Pressable>; })}<Text style={styles.recoveryNote}>位置情報や経路検索はまだ使わず、登録済みの移動時間から計算しています。</Text><Pressable onPress={onClose}><Text style={styles.cancelText}>閉じる</Text></Pressable></ScrollView></Pressable></Pressable></Modal>;
}

function TaskScheduleCalendar({ tasks, plans, externalEvents, now, designMode, chicPattern, planTier, onPremium, onEditTask, onEditPlan }: { tasks: Task[]; plans: DeparturePlan[]; externalEvents: Calendar.Event[]; now: Date; designMode: DesignMode; chicPattern: ChicPattern; planTier: PlanTier; onPremium: (featureId?: PremiumGuideFeatureId) => void; onEditTask: (task: Task) => void; onEditPlan: (plan: DeparturePlan) => void }) {
  const theme = getThemeTokens(designMode);
  const [monthDate, setMonthDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(dateKey(now));
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const leading = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const taskDates = (task: Task) => Array.from(new Set([task.scheduledDate ?? dateKey(now), task.deadlineDate, task.remindDate].filter((value): value is string => Boolean(value))));
  const selectedTasks = tasks.filter((task) => !task.done && taskDates(task).includes(selectedDate));
  const selectedPlans = plans.filter((item) => item.date === selectedDate);
  const selectedExternalEvents = externalEvents.filter((event) => dateKey(new Date(event.startDate)) === selectedDate);
  const moveMonth = (amount: number) => {
    const next = new Date(year, month + amount, 1);
    setMonthDate(next);
    setSelectedDate(dateKey(next));
  };

  if (!hasPremiumAccess(planTier, 'long_range_calendar')) {
    const freeDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index);
      return { date, key: dateKey(date) };
    });
    const freeSelected = freeDates.some((item) => item.key === selectedDate) ? selectedDate : freeDates[0]!.key;
    const freeTasks = tasks.filter((task) => !task.done && taskDates(task).includes(freeSelected));
    const freePlans = plans.filter((item) => item.date === freeSelected);
    return <>
      <View style={[styles.scheduleCalendarCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: designMode === 'minimal' ? 2 : theme.radius.large }]}>
        <View style={styles.scheduleCalendarHeader}><View><Text style={styles.scheduleMonthTitle}>これから7日間</Text><Text style={styles.scheduleMonthCopy}>今日から6日後までの予定</Text></View><Pressable onPress={() => onPremium('month')}><Text style={styles.scheduleAgendaEdit}>月表示 Premium</Text></Pressable></View>
        <View style={styles.scheduleGrid}>{freeDates.map(({ date, key }) => {
          const selected = key === freeSelected;
          const count = tasks.filter((task) => !task.done && taskDates(task).includes(key)).length + plans.filter((item) => item.date === key).length;
          return <Pressable key={key} style={[styles.scheduleDayCell, selected && styles.scheduleDayCellSelected, selected && { backgroundColor: theme.colors.primaryAccent }]} onPress={() => setSelectedDate(key)}><Text style={[styles.scheduleDayNumber, selected && styles.scheduleSelectedText]}>{date.getMonth() + 1}/{date.getDate()}</Text>{count > 0 && <Text style={[styles.scheduleMoreText, selected && styles.scheduleSelectedText]}>{count}件</Text>}</Pressable>;
        })}</View>
      </View>
      <View style={styles.scheduleAgendaHeader}><Text style={styles.sectionTitle}>{freeSelected.replaceAll('-', '.')} の予定</Text><Text style={styles.sectionSub}>{freeTasks.length + freePlans.length}件</Text></View>
      {freeTasks.map((task) => <Pressable key={task.id} style={styles.scheduleAgendaItem} onPress={() => onEditTask(task)}><View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} /><View style={{ flex: 1 }}><Text style={styles.scheduleAgendaTitle}>{task.title}</Text><Text style={styles.scheduleAgendaMeta}>{task.category}</Text></View><Text style={styles.scheduleAgendaEdit}>編集 ›</Text></Pressable>)}
      {freePlans.map((item, index) => <Pressable key={item.id ?? `${item.title}-${index}`} style={styles.scheduleAgendaItem} onPress={() => onEditPlan(item)}><View style={[styles.scheduleAgendaDot, { backgroundColor: '#7B6BE8' }]} /><View style={{ flex: 1 }}><Text style={styles.scheduleAgendaTitle}>{item.title}</Text><Text style={styles.scheduleAgendaMeta}>出発プラン ・ {item.arrival} 到着</Text></View><Text style={styles.scheduleAgendaEdit}>編集 ›</Text></Pressable>)}
      {freeTasks.length === 0 && freePlans.length === 0 && <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>この日はまだ空いています。</Text></View>}
    </>;
  }

  return <>
    <View style={[styles.scheduleCalendarCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: designMode === 'minimal' ? 2 : theme.radius.large }]}>
      {designMode === 'chic' && <View pointerEvents="none" style={styles.calendarPatternCorner}><ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" /></View>}
      <View style={styles.scheduleCalendarHeader}>
        <Pressable style={styles.scheduleMonthArrow} onPress={() => moveMonth(-1)}><Text style={styles.scheduleMonthArrowText}>‹</Text></Pressable>
        <View><Text style={styles.scheduleMonthTitle}>{year}年 {month + 1}月</Text><Text style={styles.scheduleMonthCopy}>タスクと出発予定を、ひと目で</Text></View>
        <Pressable style={styles.scheduleMonthArrow} onPress={() => moveMonth(1)}><Text style={styles.scheduleMonthArrowText}>›</Text></Pressable>
      </View>
      <View style={styles.scheduleWeekRow}>{['日','月','火','水','木','金','土'].map((label) => <Text key={label} style={styles.scheduleWeekLabel}>{label}</Text>)}</View>
      <View style={styles.scheduleGrid}>{cells.map((date, index) => {
        if (!date) return <View key={`empty-${index}`} style={styles.scheduleDayCell} />;
        const key = dateKey(date);
        const dayTasks = tasks.filter((task) => !task.done && taskDates(task).includes(key));
        const dayPlans = plans.filter((item) => item.date === key);
        const dayExternalEvents = externalEvents.filter((event) => dateKey(new Date(event.startDate)) === key);
        const selected = key === selectedDate;
        const today = key === dateKey(now);
        return <Pressable key={key} style={[styles.scheduleDayCell, designMode === 'minimal' && styles.scheduleDayCellMinimal, selected && styles.scheduleDayCellSelected, selected && { backgroundColor: theme.colors.primaryAccent }]} onPress={() => setSelectedDate(key)}>
          <Text style={[styles.scheduleDayNumber, today && styles.scheduleTodayNumber, selected && styles.scheduleSelectedText]}>{date.getDate()}</Text>
          <View style={styles.scheduleEventStack}>
            {dayTasks.slice(0, 2).map((task) => <View key={task.id} style={[styles.scheduleEventBar, { backgroundColor: categoryColors[task.category] }]}><Text numberOfLines={1} style={styles.scheduleEventBarText}>{task.title}</Text></View>)}
            {dayTasks.length < 2 && dayPlans.slice(0, 2 - dayTasks.length).map((item, itemIndex) => <View key={item.id ?? `${item.title}-${itemIndex}`} style={[styles.scheduleEventBar, styles.schedulePlanBar]}><Text numberOfLines={1} style={styles.scheduleEventBarText}>{item.arrival} {item.title}</Text></View>)}
            {dayTasks.length + dayPlans.length < 2 && dayExternalEvents.slice(0, 2 - dayTasks.length - dayPlans.length).map((event) => <View key={`external-${event.id}`} style={[styles.scheduleEventBar, { backgroundColor: '#B9A8D8' }]}><Text numberOfLines={1} style={styles.scheduleEventBarText}>{formatLiveTime(new Date(event.startDate))} {event.title || 'カレンダー予定'}</Text></View>)}
            {dayTasks.length + dayPlans.length + dayExternalEvents.length > 2 && <Text style={[styles.scheduleMoreText, selected && styles.scheduleSelectedText]}>ほか {dayTasks.length + dayPlans.length + dayExternalEvents.length - 2}件</Text>}
          </View>
        </Pressable>;
      })}</View>
      <View style={styles.scheduleLegend}><Text style={styles.scheduleLegendText}>色付き帯：タスク</Text><Text style={styles.scheduleLegendPlan}>紫の帯：出発予定</Text></View>
    </View>

    <View style={styles.scheduleAgendaHeader}><Text style={styles.sectionTitle}>{selectedDate.replaceAll('-', '.')} の予定</Text><Text style={styles.sectionSub}>{selectedTasks.length + selectedPlans.length + selectedExternalEvents.length}件</Text></View>
    {selectedTasks.length === 0 && selectedPlans.length === 0 && selectedExternalEvents.length === 0 ? <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>この日はまだ空いています。</Text></View> : <>
      {selectedTasks.map((task) => {
        const overdue = Boolean(task.deadlineDate && getTargetDate(task) && getTargetDate(task)!.getTime() < now.getTime());
        return <Pressable key={task.id} style={[styles.scheduleAgendaItem, overdue && styles.scheduleAgendaDanger]} onPress={() => onEditTask(task)}>
          <View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} />
          <View style={{ flex: 1 }}><Text style={styles.scheduleAgendaTitle}>{task.title}</Text><Text style={styles.scheduleAgendaMeta}>{task.category} ・ {task.deadlineDate ? `期限 ${task.deadlineTime ?? ''}` : task.repeatRule && task.repeatRule !== 'none' ? 'ルーティン' : `リマインド ${task.remindAt ?? ''}`}</Text></View>
          <Text style={styles.scheduleAgendaEdit}>{overdue ? '期限超過' : '編集 ›'}</Text>
        </Pressable>;
      })}
      {selectedPlans.map((item, index) => <Pressable key={item.id ?? `${item.title}-${index}`} style={styles.scheduleAgendaItem} onPress={() => onEditPlan(item)}><View style={[styles.scheduleAgendaDot, { backgroundColor: '#7B6BE8' }]} /><View style={{ flex: 1 }}><Text style={styles.scheduleAgendaTitle}>{item.title}</Text><Text style={styles.scheduleAgendaMeta}>出発プラン ・ {item.arrival} 到着</Text></View><Text style={styles.scheduleAgendaEdit}>編集 ›</Text></Pressable>)}
      {selectedExternalEvents.map((event) => <View key={`external-agenda-${event.id}`} style={styles.scheduleAgendaItem}><View style={[styles.scheduleAgendaDot, { backgroundColor: '#B9A8D8' }]} /><View style={{ flex: 1 }}><Text style={styles.scheduleAgendaTitle}>{event.title || 'カレンダー予定'}</Text><Text style={styles.scheduleAgendaMeta}>端末カレンダー ・ {formatLiveTime(new Date(event.startDate))}</Text></View><Text style={styles.scheduleAgendaEdit}>外部</Text></View>)}
    </>}
  </>;
}

function UrgencyCard({ task, now, featured = false }: { task: Task; now: Date; featured?: boolean }) {
  const status = getUrgencyStatus(task, now);
  const level = urgencyLevel(status);
  const danger = level >= 3;
  return (
    <View style={[styles.urgencyCard, danger && styles.urgencyCardDanger, featured && styles.urgencyCardFeatured]}>
      <View style={styles.urgencyTop}>
        <Text style={[styles.urgencyEyebrow, danger && styles.urgencyDangerText]}>{featured ? '⚠ 今いちばん危ない予定' : '間に合う判定'}</Text>
        <View style={[styles.urgencyBadge, danger && styles.urgencyBadgeDanger]}><Text style={[styles.urgencyBadgeText, danger && styles.urgencyBadgeTextDanger]}>{status}</Text></View>
      </View>
      <Text style={styles.urgencyTaskTitle}>{task.title}</Text>
      <Text style={styles.urgencyAction}>{getNextBestAction(task, now)}</Text>
      <Text style={[styles.urgencyRisk, danger && styles.urgencyDangerText]}>{getLateRiskMessage(task, now)}</Text>
    </View>
  );
}

function ModeHomeHero({ designMode, tasks, dangerousTask, now, completedCount, remaining }: { designMode: ThemeMode; tasks: Task[]; dangerousTask?: Task; now: Date; completedCount: number; remaining: number }) {
  const nextTask = dangerousTask ?? tasks.find((task) => !task.done);
  if (designMode === 'minimal') {
    return <View style={styles.minimalHero}>
      <View style={styles.minimalClockRow}><Text style={styles.minimalLiveTime}>{formatLiveTime(now)}</Text><Text style={styles.minimalLiveDate}>{formatLiveDate(now)}</Text></View>
      <View style={styles.nextActionCard}>
        <View style={styles.nextActionHeader}><Text style={styles.minimalKicker}>NEXT ACTION</Text><Text style={styles.nextActionIndex}>{String(remaining).padStart(2, '0')} LEFT</Text></View>
        <Text numberOfLines={2} style={styles.nextActionTitle}>{nextTask?.title ?? 'ALL CLEAR'}</Text>
        <Text style={styles.nextActionMessage}>{nextTask ? (nextTask.navigationEnabled ? getNextBestAction(nextTask, now) : '次はこれだけに集中') : '今日のタスクは完了'}</Text>
        {nextTask?.navigationEnabled && <View style={styles.nextActionStatus}><Text style={styles.nextActionStatusText}>{getUrgencyStatus(nextTask, now)} / {getLateRiskMessage(nextTask, now)}</Text></View>}
      </View>
    </View>;
  }
  const pattern = getChicPatternVisual('floral');
  const chicMessage = completedCount > 0 ? `${completedCount}つ終わった、いい感じ` : dangerousTask ? '今ならまだ余裕あり' : '今日を少し整えよう';
  return <View style={[styles.chicHero, { backgroundColor: pattern.background }]}>
    <ChicPatternDecor pattern="floral" accent={pattern.accent} warm={pattern.warm} />
    <View style={styles.chicPaperPanel}>
      <Text style={styles.chicKicker}>今日のメモ</Text>
      <Text style={styles.chicHeadline}>{chicMessage}</Text>
      <Text style={styles.chicFlow}>{nextTask ? `次は「${nextTask.title}」だけ` : '完璧じゃなくて、戻れたらOK'}</Text>
      <View style={styles.chicSummary}>
        <Text style={styles.chicSummaryStrong}>{completedCount}</Text><Text style={styles.chicSummaryText}> 完了</Text>
        <Text style={styles.chicSummaryDot}> ✦ </Text>
        <Text style={styles.chicSummaryStrong}>{remaining}</Text><Text style={styles.chicSummaryText}> 残り</Text>
      </View>
    </View>
  </View>;
}

function ChicPatternDecor({ pattern, accent, warm, density = 'regular' }: { pattern: ChicPattern | 'flower' | 'stripe'; accent: string; warm: string; density?: 'regular' | 'compact' }) {
  const compact = density === 'compact';
  const checkCell = compact ? 14 : 16;
  if (pattern === 'check' || pattern === 'stripe') return <View pointerEvents="none" style={[styles.patternLayer, { backgroundColor: '#FFF9F6' }]}>
    {Array.from({ length: 40 }, (_, index) => <React.Fragment key={index}><View style={[styles.checkVerticalBand, { left: index * checkCell, width: checkCell / 2, backgroundColor: `${accent}38` }]} /><View style={[styles.checkHorizontalBand, { top: index * checkCell, height: checkCell / 2, backgroundColor: `${warm}38` }]} /></React.Fragment>)}
  </View>;
  if (pattern === 'dot') return <View pointerEvents="none" style={styles.patternLayer}>
    {Array.from({ length: compact ? 160 : 144 }, (_, index) => { const columns = compact ? 22 : 18; const spacingX = compact ? 20 : 25; const spacingY = compact ? 18 : 22; const row = Math.floor(index / columns); const column = index % columns; const size = index % 3 === 0 ? (compact ? 5 : 6) : index % 2 === 0 ? 4 : 3; return <View key={index} style={[styles.patternDotSmall, { width: size, height: size, borderRadius: size / 2, backgroundColor: index % 2 ? warm : accent, left: 4 + column * spacingX + (row % 2 ? spacingX / 2 : 0), top: 5 + row * spacingY }]} />; })}
  </View>;
  return <View pointerEvents="none" style={styles.patternLayer}>
    {Array.from({ length: compact ? 130 : 96 }, (_, index) => { const columns = compact ? 20 : 16; const spacingX = compact ? 25 : 32; const spacingY = compact ? 23 : 29; const row = Math.floor(index / columns); const column = index % columns; const scale = (index % 4 === 0 ? 0.82 : index % 5 === 0 ? 1.08 : 0.95) * (compact ? 0.82 : 1); return <View key={index} style={[styles.patternFlowerSmall, { left: 4 + column * spacingX + (row % 2 ? spacingX / 2 : 0), top: 4 + row * spacingY, transform: [{ scale }, { rotate: `${index % 6 === 0 ? 18 : index % 7 === 0 ? -12 : 0}deg` }] }]}><View style={[styles.flowerPetalSmall, styles.flowerSmallTop, { backgroundColor: accent }]} /><View style={[styles.flowerPetalSmall, styles.flowerSmallRight, { backgroundColor: warm }]} /><View style={[styles.flowerPetalSmall, styles.flowerSmallBottom, { backgroundColor: accent }]} /><View style={[styles.flowerPetalSmall, styles.flowerSmallLeft, { backgroundColor: warm }]} /><View style={styles.flowerCenterSmall} /></View>; })}
  </View>;
}

function NumberSetting({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.numberSetting}>
      <Text style={styles.numberLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepButton} onPress={() => onChange(Math.max(0, value - 5))}><Text style={styles.stepText}>−</Text></Pressable>
        <Text style={styles.numberValue}>{value}分</Text>
        <Pressable style={styles.stepButton} onPress={() => onChange(value + 5)}><Text style={styles.stepText}>＋</Text></Pressable>
      </View>
    </View>
  );
}

function CompactNumberSetting({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <View style={styles.compactSetting}>
    <Text style={styles.compactLabel}>{label}</Text>
    <View style={styles.compactControls}>
      <Pressable onPress={() => onChange(Math.max(0, value - 5))}><Text style={styles.compactStep}>−</Text></Pressable>
      <Text style={styles.compactValue}>{value}分</Text>
      <Pressable onPress={() => onChange(value + 5)}><Text style={styles.compactStep}>＋</Text></Pressable>
    </View>
  </View>;
}

function TimelinePoint({ time, label, featured = false, last = false }: { time: string; label: string; featured?: boolean; last?: boolean }) {
  return (
    <View style={styles.timelinePoint}>
      <View style={styles.track}>
        <View style={[styles.dot, featured && styles.dotFeatured]} />
        {!last && <View style={styles.trackLine} />}
      </View>
      <Text style={styles.pointTime}>{time}</Text>
      <Text style={[styles.pointLabel, featured && styles.pointFeatured]}>{label}</Text>
    </View>
  );
}

function WidgetScreen({
  tasks,
  timeline,
  now,
  dangerousTask,
  size,
  showCompleted,
  completionIcon,
  designMode,
  chicPattern,
  onSize,
  onShowCompleted,
  onCompletionIcon,
  onDesignMode,
  onChicPattern,
  templates,
  savedTemplates,
  onAddTemplate,
  onDeleteTemplate,
  onGuide,
  onPremium,
  onDeleteSavedTemplate,
  planTier,
}: {
  tasks: Task[];
  timeline: { start: string; leave: string; arrival: string };
  now: Date;
  dangerousTask?: Task;
  size: WidgetSize;
  showCompleted: boolean;
  completionIcon: string;
  designMode: DesignMode;
  chicPattern: ChicPattern;
  onSize: (size: WidgetSize) => void;
  onShowCompleted: (value: boolean) => void;
  onCompletionIcon: (icon: string) => void;
  onDesignMode: (mode: DesignMode) => void;
  onChicPattern: (pattern: ChicPattern) => void;
  templates: string[];
  savedTemplates: PremiumTaskTemplate[];
  onAddTemplate: (title: string) => void;
  onDeleteTemplate: (title: string) => void;
  onGuide: () => void;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onDeleteSavedTemplate: (template: PremiumTaskTemplate) => void;
  planTier: PlanTier;
}) {
  const [newTemplate, setNewTemplate] = useState('');
  const previewTasks = tasks.filter((task) => showCompleted || !task.done).slice(0, size === 'small' ? 2 : 3);
  const patternVisual = getChicPatternVisual(chicPattern);
  return (
    <>
      <Text style={styles.hero}>Rhythmを、私仕様に。</Text>
      {__DEV__ && <View style={styles.settingsCard}><Text style={styles.settingsTitle}>Expo Go 確認環境</Text><Text style={styles.switchCopy}>このQRコードは、利用プランが固定された確認用環境です。</Text><Text style={styles.devPlanCurrent}>現在：{planTier === 'premium' ? 'Premium版' : '無料版'}</Text></View>}
      <View style={styles.modeCard}>
        <Text style={styles.settingsTitle}>デザインモード</Text>
        <View style={styles.modeChoices}>
          {designModes.map((mode) => (
            <Pressable key={mode.id} style={[styles.modeChoice, designMode === mode.id && styles.modeChoiceActive]} onPress={() => onDesignMode(mode.id)}>
              <View style={[styles.modeMiniPreview, mode.id === 'minimal' && styles.modeMiniMinimal, mode.id === 'chic' && styles.modeMiniChic, ]}>
                {mode.id === 'minimal' ? <><View style={styles.modeMiniBlackBlock} /><Text style={styles.modeMiniNumber}>03</Text><View style={styles.modeMiniLine} /></> : mode.id === 'chic' ? <><ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" /><View style={styles.modeMiniGlass} /><Text style={styles.modeMiniSparkle}>✦</Text></> : <><View style={styles.modeMiniSun} /><Text style={styles.modeMiniEgg}>🥚</Text><View style={styles.modeMiniGround} /></>}
              </View>
              <Text style={[styles.modeName, designMode === mode.id && styles.modeNameActive]}>{mode.name}</Text>
              <Text style={styles.modeDescription}>{mode.description}</Text>
            </Pressable>
          ))}
        </View>
        {designMode === 'chic' && <View style={styles.patternSelector}><Text style={styles.fieldLabel}>Chicの柄</Text><View style={styles.patternChoices}>{(['floral', 'dot', 'check'] as ChicPattern[]).map((pattern) => { const locked = pattern !== 'floral' && !hasPremiumAccess(planTier, pattern === 'dot' ? 'chic_dot' : 'chic_check'); return <Pressable key={pattern} style={[styles.patternChoice, chicPattern === pattern && styles.patternChoiceActive]} onPress={() => onChicPattern(pattern)}><View style={styles.patternSwatch}><ChicPatternDecor pattern={pattern} accent="#D986A1" warm="#A997C8" /></View><Text style={[styles.patternChoiceText, chicPattern === pattern && styles.patternChoiceTextActive]}>{pattern === 'floral' ? '花柄' : pattern === 'dot' ? `ドット${locked ? ' 🔒' : ''}` : `チェック${locked ? ' 🔒' : ''}`}</Text></Pressable>; })}</View></View>}
      </View>
      <Pressable style={styles.guideCard} onPress={onGuide}><View><Text style={styles.guideCardTitle}>Rhythmの使い方</Text><Text style={styles.guideCardCopy}>登録・振り分け・出発・集中の流れを見る</Text></View><Text style={styles.guideCardArrow}>›</Text></Pressable>
      <NotificationManagerCard />
      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>クイック雛形</Text>
        <Text style={styles.switchCopy}>よく登録するタスクを自分用に保存できます</Text>
        <View style={styles.templateAddRow}><TextInput value={newTemplate} onChangeText={setNewTemplate} placeholder="例：水筒をバッグに入れる" placeholderTextColor="#A29DAA" style={styles.templateInput} /><Pressable style={styles.templateAddButton} onPress={() => { const clean = newTemplate.trim(); if (!clean) return; onAddTemplate(clean); setNewTemplate(''); }}><Text style={styles.templateAddButtonText}>追加</Text></Pressable></View>
        <View style={styles.templateList}>{templates.map((item) => <View key={item} style={styles.templateRow}><Text style={styles.templateRowText}>{item}</Text><Pressable onPress={() => onDeleteTemplate(item)}><Text style={styles.templateDelete}>×</Text></Pressable></View>)}</View>
      </View>
      <View style={styles.settingsCard}>
        <View style={styles.historyHeader}><View><Text style={styles.settingsTitle}>マイひな型</Text><Text style={styles.switchCopy}>設定ごと保存して、次回そのまま呼び出す</Text></View><Text style={styles.taskTemplateSavePremium}>Premium</Text></View>
        {hasPremiumAccess(planTier, 'saved_task_templates') ? savedTemplates.length === 0 ? <Text style={styles.savedTemplateEmpty}>タスクの「•••」から「設定ごとひな型に保存」を選べます。</Text> : savedTemplates.map((template) => <View key={template.id} style={styles.savedTemplateSettingRow}><View style={{ flex: 1 }}><Text style={styles.savedTemplateSettingTitle}>{template.title}</Text><Text style={styles.savedTemplateSettingCopy}>{summarizePremiumTaskTemplate(template)}</Text></View><Pressable onPress={() => onDeleteSavedTemplate(template)}><Text style={styles.templateDelete}>削除</Text></Pressable></View>) : <Pressable style={styles.savedTemplateLocked} onPress={() => onPremium('templates')}><View style={{ flex: 1 }}><Text style={styles.savedTemplateLockedTitle}>この機能を見る</Text><Text style={styles.savedTemplateLockedCopy}>保存済みデータは無料へ戻っても消えません</Text></View><Text style={styles.guideCardArrow}>›</Text></Pressable>}
      </View>
      <Text style={styles.settingsSectionLabel}>ウィジェット設定</Text>
      <Text style={styles.previewLabel}>WIDGET PREVIEW</Text>

      <View style={[styles.phonePreview, designMode === 'minimal' && styles.phonePreviewMinimal, designMode === 'chic' && { backgroundColor: patternVisual.accent }, ]}>
        <Text style={styles.phoneClock}>9:41</Text>
        <View style={[styles.widget, size === 'small' && styles.widgetSmall, designMode === 'minimal' && styles.widgetMinimal, designMode === 'chic' && { backgroundColor: patternVisual.background }, ]}>
          {designMode === 'chic' && <ChicPatternDecor pattern={chicPattern} accent={patternVisual.accent} warm={patternVisual.warm} />}
          {designMode === 'chic' && <View pointerEvents="none" style={styles.widgetChicWash} />}
          <View style={styles.widgetTop}>
            <View>
              <Text style={[styles.widgetBrand, designMode === 'minimal' && styles.widgetBrandMinimal]}>Rhythm</Text>
              <Text style={styles.widgetDate}>{designMode === 'minimal' ? 'SAT / JUL 04' : 'TODAY'}</Text>
            </View>
            <View style={styles.widgetDeparture}>
              <Text style={styles.widgetDepartureLabel}>出発まで</Text>
              <Text style={styles.widgetDepartureTime}>{countdownToClock(timeline.leave, now)}</Text>
            </View>
          </View>
          <View style={styles.widgetDivider} />
          
          {dangerousTask && <View style={styles.widgetUrgency}>
            <Text style={styles.widgetUrgencyStatus}>{getUrgencyStatus(dangerousTask, now)}</Text>
            <Text numberOfLines={1} style={styles.widgetUrgencyAction}>{getNextBestAction(dangerousTask, now)}</Text>
          </View>}
          {previewTasks.length === 0 ? (
            <Text style={styles.widgetEmpty}>今日のタスクはありません ✦</Text>
          ) : previewTasks.map((task) => (
            <View key={task.id} style={styles.widgetTask}>
              <View style={[styles.widgetCheck, task.done && styles.widgetCheckDone]}><Text style={styles.widgetCheckText}>{task.done ? completionIcon : ''}</Text></View>
              <Text numberOfLines={1} style={[styles.widgetTaskText, task.done && styles.widgetTaskDone]}>{task.title}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>ウィジェット設定</Text>
        <Text style={styles.fieldLabel}>サイズ</Text>
        <View style={styles.segment}>
          <Pressable style={[styles.segmentButton, size === 'small' && styles.segmentActive]} onPress={() => onSize('small')}>
            <Text style={[styles.segmentText, size === 'small' && styles.segmentTextActive]}>小</Text>
          </Pressable>
          <Pressable style={[styles.segmentButton, size === 'medium' && styles.segmentActive]} onPress={() => onSize('medium')}>
            <Text style={[styles.segmentText, size === 'medium' && styles.segmentTextActive]}>中</Text>
          </Pressable>
        </View>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>完了したタスクも表示</Text>
            <Text style={styles.switchCopy}>チェック済みの項目を残します</Text>
          </View>
          <Switch value={showCompleted} onValueChange={onShowCompleted} trackColor={{ true: colors.violet }} />
        </View>
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>完了アイコン</Text>
        <View style={styles.iconChoices}>
          {completionIcons.map((icon) => (
            <Pressable key={icon} style={[styles.iconChoice, completionIcon === icon && styles.iconChoiceActive]} onPress={() => onCompletionIcon(icon)}>
              <Text style={[styles.iconChoiceText, completionIcon === icon && styles.iconChoiceTextActive]}>{icon}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.lockedSetting} onPress={() => onPremium()}>
          <View>
            <Text style={styles.switchTitle}>カスタムテーマ</Text>
            <Text style={styles.switchCopy}>色・背景・フォントを自由に変更</Text>
          </View>
          <Text style={styles.smallLock}>▣ PREMIUM</Text>
        </Pressable>
      </View>
    </>
  );
}

function NotificationManagerCard() {
  const [pending, setPending] = useState<Notifications.NotificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = React.useCallback(async () => {
    setLoading(true);
    try { setPending(await Notifications.getAllScheduledNotificationsAsync()); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const stopAll = () => Alert.alert('予約通知をすべて停止しますか？', 'タスクと出発の予約通知が停止されます。', [
    { text: 'キャンセル', style: 'cancel' },
    { text: '停止する', style: 'destructive', onPress: () => { void Notifications.cancelAllScheduledNotificationsAsync().then(refresh); } },
  ]);
  return <View style={styles.notificationManagerCard}>
    <View style={styles.notificationManagerHeader}><View><Text style={styles.settingsTitle}>通知管理</Text><Text style={styles.switchCopy}>{loading ? '確認中…' : `${pending.length}件の通知を予約中`}</Text></View><Pressable style={styles.notificationRefresh} onPress={() => void refresh()}><Text style={styles.notificationRefreshText}>更新</Text></Pressable></View>
    {pending.slice(0, 4).map((request) => <View key={request.identifier} style={styles.notificationPendingRow}><View style={styles.notificationPendingDot} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.notificationPendingTitle}>{request.content.title ?? '通知'}</Text><Text numberOfLines={1} style={styles.notificationPendingBody}>{request.content.body ?? ''}</Text></View></View>)}
    {pending.length > 4 && <Text style={styles.notificationMore}>ほか{pending.length - 4}件</Text>}
    <Pressable disabled={pending.length === 0} style={[styles.notificationStopButton, pending.length === 0 && styles.batchDisabled]} onPress={stopAll}><Text style={styles.notificationStopText}>予約通知をすべて停止</Text></Pressable>
  </View>;
}

function TaskModal({ visible, task, templates, savedTemplates, designMode, planTier, onPremium, onClose, onSave }: { visible: boolean; task?: Task; templates: string[]; savedTemplates: PremiumTaskTemplate[]; designMode: DesignMode; planTier: PlanTier; onPremium: (featureId?: PremiumGuideFeatureId) => void; onClose: () => void; onSave: (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule?: RepeatRule, nudgeMode?: NudgeMode, scheduledDate?: string) => void }) {
  const theme = getThemeTokens(designMode);
  const [title, setTitle] = useState('');
  const [remind, setRemind] = useState(false);
  const [time, setTime] = useState('09:00');
  const [remindDate, setRemindDate] = useState(todayInputValue());
  const [category, setCategory] = useState<Category>('その他');
  const [priority, setPriority] = useState<Priority>('中');
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState(todayInputValue());
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [deadlineNotify, setDeadlineNotify] = useState(true);
  const [deadlineNotifyBefore, setDeadlineNotifyBefore] = useState(30);
  const [showDeadlineDatePicker, setShowDeadlineDatePicker] = useState(false);
  const [showDeadlineTimePicker, setShowDeadlineTimePicker] = useState(false);
  const [navigationEnabled, setNavigationEnabled] = useState(false);
  const [preparationMinutes, setPreparationMinutes] = useState(30);
  const [travelMinutes, setTravelMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(10);
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('none');
  const [nudgeMode, setNudgeMode] = useState<NudgeMode>('once');
  const [scheduledDate, setScheduledDate] = useState(todayInputValue());
  const [showScheduledDatePicker, setShowScheduledDatePicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(task?.title ?? '');
    setRemind(Boolean(task?.remindAt));
    setTime(task?.remindAt ?? '09:00');
    setRemindDate(task?.remindDate ?? todayInputValue());
    setCategory(task?.category ?? 'その他');
    setPriority(task?.priority ?? '中');
    setHasDeadline(Boolean(task?.deadlineDate));
    setDeadlineDate(task?.deadlineDate ?? todayInputValue());
    setDeadlineTime(task?.deadlineTime ?? '23:59');
    setDeadlineNotify(task?.deadlineNotifyBefore !== undefined || !task);
    setDeadlineNotifyBefore(task?.deadlineNotifyBefore ?? 30);
    setShowDeadlineDatePicker(false);
    setShowDeadlineTimePicker(false);
    setNavigationEnabled(task?.navigationEnabled ?? false);
    setPreparationMinutes(task?.preparationMinutes ?? 30);
    setTravelMinutes(task?.travelMinutes ?? 30);
    setBufferMinutes(task?.bufferMinutes ?? 10);
    setRepeatRule(task?.repeatRule ?? 'none');
    setNudgeMode(task?.nudgeMode ?? 'once');
    setScheduledDate(task?.scheduledDate ?? todayInputValue());
    setShowScheduledDatePicker(false);
  }, [visible, task]);

  const save = () => {
    const clean = title.trim();
    if (!clean) {
      Alert.alert('タスクを入力してください');
      return;
    }
    onSave(clean, category, priority, remind ? remindDate : undefined, remind ? time : undefined, hasDeadline ? deadlineDate : undefined, hasDeadline ? deadlineTime : undefined, hasDeadline && deadlineNotify ? deadlineNotifyBefore : undefined, hasDeadline && navigationEnabled, preparationMinutes, travelMinutes, bufferMinutes, repeatRule, nudgeMode, scheduledDate);
  };

  const applySavedTemplate = (template: PremiumTaskTemplate) => {
    setTitle(template.title);
    setCategory(template.category);
    setPriority(template.priority);
    setRepeatRule(template.repeatRule);
    setRemind(Boolean(template.remindAt));
    setTime(template.remindAt ?? '09:00');
    setRemindDate(todayInputValue());
    setNudgeMode(template.nudgeMode);
    setNavigationEnabled(template.navigationEnabled);
    setPreparationMinutes(template.preparationMinutes ?? 30);
    setTravelMinutes(template.travelMinutes ?? 30);
    setBufferMinutes(template.bufferMinutes ?? 10);
    setScheduledDate(todayInputValue());
    setHasDeadline(false);
    setDeadlineDate(todayInputValue());
    setDeadlineTime('23:59');
    setDeadlineNotify(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={8}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, borderRadius: theme.radius.modal }]} onPress={(event) => event.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{task ? 'タスクを編集' : '新しいタスク'}</Text>
          {!task && templates.length > 0 && <><Text style={styles.templateGroupLabel}>クイックひな型</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.taskTemplates}>{templates.map((item) => <Pressable key={item} style={styles.taskTemplateChip} onPress={() => setTitle(item)}><Text style={styles.taskTemplateText}>＋ {item}</Text></Pressable>)}</ScrollView></>}
          {!task && (hasPremiumAccess(planTier, 'saved_task_templates') ? <View style={styles.savedTemplatePicker}><Text style={styles.templateGroupLabel}>マイひな型</Text>{savedTemplates.length === 0 ? <Text style={styles.savedTemplateEmpty}>タスクの「•••」から設定ごと保存できます。</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedTemplateChips}>{savedTemplates.map((template) => <Pressable key={template.id} style={styles.savedTemplateChip} onPress={() => applySavedTemplate(template)}><Text numberOfLines={1} style={styles.savedTemplateChipTitle}>{template.title}</Text><Text numberOfLines={2} style={styles.savedTemplateChipCopy}>{summarizePremiumTaskTemplate(template)}</Text><Text style={styles.savedTemplateChoose}>選ぶ ›</Text></Pressable>)}</ScrollView>}</View> : <Pressable style={styles.savedTemplateLocked} onPress={() => onPremium('templates')}><View style={{ flex: 1 }}><Text style={styles.savedTemplateLockedTitle}>マイひな型</Text><Text style={styles.savedTemplateLockedCopy}>一度作った設定を、次からそのまま使う</Text></View><Text style={styles.taskTemplateSavePremium}>Premium機能</Text></Pressable>)}
          <Text style={styles.fieldLabel}>やること・忘れたくないこと</Text>
          <TextInput
            autoFocus
            value={title}
            onChangeText={setTitle}
            placeholder="例：資料をバッグに入れる"
            placeholderTextColor="#A29DAA"
            style={styles.modalInput}
            selectionColor={colors.violet}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>ジャンル</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChoices}>
            {categories.map((item) => (
              <Pressable key={item} style={[styles.categoryChoice, { backgroundColor: theme.colors.secondarySurface }, category === item && styles.categoryChoiceActive, category === item && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.primaryAccent }]} onPress={() => setCategory(item)}>
                <Text style={styles.categoryChoiceText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={[styles.fieldLabel, { marginTop: 17 }]}>優先度</Text>
          <View style={styles.priorityChoices}>
            {priorities.map((item) => (
              <Pressable key={item} style={[styles.priorityChoice, { backgroundColor: theme.colors.secondarySurface }, priority === item && styles.priorityChoiceActive, priority === item && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.primaryAccent }]} onPress={() => setPriority(item)}>
                <Text style={[styles.priorityChoiceText, priority === item && styles.priorityChoiceTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.fieldLabel, { marginTop: 17 }]}>実行する日</Text>
          <View style={styles.taskDateQuickRow}>
            <Pressable style={styles.taskDateQuick} onPress={() => setScheduledDate(todayInputValue())}><Text style={styles.taskDateQuickText}>今日</Text></Pressable>
            <Pressable style={styles.taskDateQuick} onPress={() => setScheduledDate(todayInputValue(1))}><Text style={styles.taskDateQuickText}>明日</Text></Pressable>
            <Pressable style={styles.taskDatePickerButton} onPress={() => setShowScheduledDatePicker((value) => !value)}><Text style={styles.taskDatePickerText}>▣ {scheduledDate}</Text></Pressable>
          </View>
          {showScheduledDatePicker && <DateTimePicker value={dateForReminder(scheduledDate, '12:00')} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowScheduledDatePicker(false); if (event.type === 'set' && selected) setScheduledDate(dateKey(selected)); }} />}
          <Text style={[styles.fieldLabel, { marginTop: 17 }]}>繰り返し・ルーティン</Text>
          <View style={styles.repeatChoices}>
            {repeatOptions.map((option) => <Pressable key={option.id} style={[styles.repeatChoice, { backgroundColor: theme.colors.secondarySurface }, repeatRule === option.id && styles.repeatChoiceActive, repeatRule === option.id && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.primaryAccent }]} onPress={() => setRepeatRule(option.id)}><Text style={[styles.repeatChoiceText, repeatRule === option.id && styles.repeatChoiceTextActive]}>{option.label}</Text></Pressable>)}
          </View>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>追加リマインド</Text>
              <Text style={styles.switchCopy}>期限とは別の日時にも通知します</Text>
            </View>
            <Switch value={remind} onValueChange={setRemind} trackColor={{ true: colors.violet }} />
          </View>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>期限を設定</Text>
              <Text style={styles.switchCopy}>残り時間と期限超過を表示します</Text>
            </View>
            <Switch value={hasDeadline} onValueChange={setHasDeadline} trackColor={{ true: colors.coral }} />
          </View>
          {hasDeadline && (
            <View style={styles.deadlinePanel}>
              <View style={styles.quickDates}>
                <Pressable style={styles.quickDeadlineButton} onPress={() => setDeadlineDate(todayInputValue())}><Text style={styles.quickDeadlineText}>今日まで</Text></Pressable>
                <Pressable style={styles.quickDeadlineButton} onPress={() => setDeadlineDate(todayInputValue(1))}><Text style={styles.quickDeadlineText}>明日まで</Text></Pressable>
                <Pressable style={styles.quickDeadlineButton} onPress={() => setDeadlineDate(todayInputValue(7))}><Text style={styles.quickDeadlineText}>1週間後</Text></Pressable>
              </View>
              <View style={styles.remindTimeRow}>
                <Text style={styles.numberLabel}>期限日</Text>
                <Pressable style={styles.pickerButton} onPress={() => setShowDeadlineDatePicker((value) => !value)}><Text style={styles.pickerButtonText}>▣ {deadlineDate}</Text></Pressable>
              </View>
              {showDeadlineDatePicker && <DateTimePicker value={dateForReminder(deadlineDate, deadlineTime)} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={(event: DateTimePickerEvent, selected) => {
                if (Platform.OS !== 'ios') setShowDeadlineDatePicker(false);
                if (event.type === 'set' && selected) setDeadlineDate(dateKey(selected));
              }} />}
              <View style={styles.remindTimeRow}>
                <Text style={styles.numberLabel}>リミット時刻</Text>
                <Pressable style={styles.pickerButton} onPress={() => setShowDeadlineTimePicker((value) => !value)}><Text style={[styles.pickerButtonText, { color: colors.coral }]}>◷ {deadlineTime}</Text></Pressable>
              </View>
              {showDeadlineTimePicker && <DateTimePicker value={dateForReminder(deadlineDate, deadlineTime)} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event: DateTimePickerEvent, selected) => {
                if (Platform.OS !== 'ios') setShowDeadlineTimePicker(false);
                if (event.type === 'set' && selected) setDeadlineTime(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
              }} />}
              <View style={styles.deadlineNotifyRow}>
                <View><Text style={styles.numberLabel}>期限前に通知</Text><Text style={styles.switchCopy}>期限の設定と連動します</Text></View>
                <Switch value={deadlineNotify} onValueChange={setDeadlineNotify} trackColor={{ true: colors.coral }} />
              </View>
              {deadlineNotify && <View style={styles.notifyChoices}>
                {[0, 10, 30, 60, 1440].map((minutes) => (
                  <Pressable key={minutes} style={[styles.notifyChoice, deadlineNotifyBefore === minutes && styles.notifyChoiceActive]} onPress={() => setDeadlineNotifyBefore(minutes)}>
                    <Text style={[styles.notifyChoiceText, deadlineNotifyBefore === minutes && styles.notifyChoiceTextActive]}>{minutes === 0 ? '時刻通り' : minutes === 1440 ? '1日前' : minutes >= 60 ? `${minutes / 60}時間前` : `${minutes}分前`}</Text>
                  </Pressable>
                ))}
              </View>}
              <View style={styles.deadlineNotifyRow}>
                <View><Text style={styles.numberLabel}>間に合うナビ</Text><Text style={styles.switchCopy}>準備・移動時間から危険度を判定</Text></View>
                <Switch value={navigationEnabled} onValueChange={setNavigationEnabled} trackColor={{ true: colors.violet }} />
              </View>
              {navigationEnabled && <View style={styles.navigationDurations}>
                <CompactNumberSetting label="準備" value={preparationMinutes} onChange={setPreparationMinutes} />
                <CompactNumberSetting label="移動" value={travelMinutes} onChange={setTravelMinutes} />
                <CompactNumberSetting label="余裕" value={bufferMinutes} onChange={setBufferMinutes} />
              </View>}
            </View>
          )}
          {remind && (
            <View style={styles.reminderPanel}>
              <View style={styles.quickDates}>
                <Pressable style={styles.quickDateButton} onPress={() => setRemindDate(todayInputValue())}><Text style={styles.quickDateText}>今日</Text></Pressable>
                <Pressable style={styles.quickDateButton} onPress={() => setRemindDate(todayInputValue(1))}><Text style={styles.quickDateText}>明日</Text></Pressable>
              </View>
              <View style={styles.remindTimeRow}>
                <View><Text style={styles.numberLabel}>日付</Text><Text style={styles.inputHint}>YYYY-MM-DD</Text></View>
                <TextInput style={styles.remindDateInput} value={remindDate} onChangeText={setRemindDate} maxLength={10} keyboardType="numbers-and-punctuation" selectionColor={colors.violet} />
              </View>
              <View style={styles.remindTimeRow}>
                <Text style={styles.numberLabel}>時刻</Text>
                <TextInput style={styles.remindTimeInput} value={time} onChangeText={setTime} maxLength={5} keyboardType="numbers-and-punctuation" selectionColor={colors.violet} />
              </View>
              <Text style={[styles.numberLabel, { marginTop: 13, marginBottom: 8 }]}>通知スルー防止</Text>
              <View style={styles.nudgeChoices}>
                {([{ id: 'once', label: '1回', copy: '通常' }, { id: 'repeat', label: '2回', copy: 'Premium' }, { id: 'strong', label: '3回', copy: 'Premium' }] as { id: NudgeMode; label: string; copy: string }[]).map((item) => { const locked = item.id !== 'once' && !hasPremiumAccess(planTier, item.id === 'repeat' ? 'repeat_nudge' : 'strong_nudge'); return <Pressable key={item.id} style={[styles.nudgeChoice, nudgeMode === item.id && styles.nudgeChoiceActive]} onPress={() => locked ? onPremium('nudge') : setNudgeMode(item.id)}><Text style={[styles.nudgeChoiceTitle, nudgeMode === item.id && styles.nudgeChoiceTitleActive]}>{item.label}{locked ? ' 🔒' : ''}</Text><Text style={[styles.nudgeChoiceCopy, nudgeMode === item.id && styles.nudgeChoiceCopyActive]}>{item.copy}</Text></Pressable>; })}
              </View>
            </View>
          )}
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryAccent, borderRadius: theme.radius.button }]} onPress={save}><Text style={styles.primaryButtonText}>{task ? '変更を保存' : '登録する'}</Text></Pressable>
          <Pressable onPress={onClose}><Text style={styles.cancelText}>キャンセル</Text></Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TodayWinStrip({ tasks, designMode, chicPattern, onRestore }: { tasks: Task[]; designMode: ThemeMode; chicPattern: ChicPattern; onRestore: (id: string) => void }) {
  const theme = getThemeTokens(designMode);
  const completed = tasks.filter((task) => task.done && task.completedAt && dateKey(task.completedAt) === dateKey());
  const count = completed.length;
  const drop = React.useRef(new Animated.Value(1)).current;
  const previous = React.useRef(count);
  const [dropVisible, setDropVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => {
    if (count > previous.current) {
      setDropVisible(true);
      drop.setValue(0);
      Animated.sequence([
        Animated.timing(drop, { toValue: 1, duration: 620, easing: Easing.bounce, useNativeDriver: true }),
        Animated.timing(drop, { toValue: 0.88, duration: 120, useNativeDriver: true }),
        Animated.timing(drop, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start(() => setDropVisible(false));
    }
    previous.current = count;
  }, [count, drop]);
  const fallingStyle = { transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-38, 18] }) }, { scale: drop.interpolate({ inputRange: [0, 1], outputRange: [1.25, 0.82] }) }], opacity: drop };
  const details = <Modal visible={detailsOpen} transparent animationType="slide" onRequestClose={() => setDetailsOpen(false)}><Pressable style={styles.modalBackdrop} onPress={() => setDetailsOpen(false)}><Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, borderRadius: theme.radius.modal }]} onPress={(event) => event.stopPropagation()}>{designMode === 'chic' && <View pointerEvents="none" style={styles.completedModalPattern}><ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" /></View>}<View style={styles.modalHandle} /><Text style={styles.modalTitle}>今日できたこと</Text>{completed.length === 0 ? <Text style={styles.emptyCopy}>完了したタスクはまだありません。</Text> : completed.map((task) => <View key={task.id} style={[styles.completedDetailRow, designMode === 'minimal' && styles.completedDetailRowMinimal]}><Text style={[styles.completedDetailIcon, { color: theme.colors.primaryAccent }]}>{designMode === 'minimal' ? '✓' : designMode === 'chic' ? '✿' : '★'}</Text><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskMeta}>{task.category}</Text></View><Pressable style={[styles.restoreButton, { backgroundColor: theme.colors.softAccent }]} onPress={() => onRestore(task.id)}><Text style={[styles.restoreButtonText, { color: theme.colors.primaryAccent }]}>元に戻す</Text></Pressable></View>)}<Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryAccent, borderRadius: theme.radius.button }]} onPress={() => setDetailsOpen(false)}><Text style={styles.primaryButtonText}>閉じる</Text></Pressable></Pressable></Pressable></Modal>;
  if (designMode === 'minimal') return <><Pressable style={styles.todayMinimalWin} onPress={() => setDetailsOpen(true)}><View><Text style={styles.minimalAchievementLabel}>今日できたこと</Text><Text style={styles.todayWinCount}>{String(count).padStart(2, '0')}</Text><Text style={styles.todayWinComment}>{count}件完了</Text></View><View style={styles.todayMiniMeter}>{Array.from({ length: 6 }, (_, item) => <View key={item} style={[styles.todayMiniTick, item < Math.min(6, count) && styles.todayMiniTickDone]} />)}</View></Pressable>{details}</>;
  const item = designMode === 'chic' ? '✿' : '🍪';
  return <><Pressable style={[styles.todayWinStrip, designMode === 'chic' && styles.todayWinStripChic, ]} onPress={() => setDetailsOpen(true)}>{designMode === 'chic' && <ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" />}<View style={designMode === 'chic' ? styles.todayWinsPaper : styles.todayWinsPlain}><View style={[{ flex: 1 }, designMode === 'chic' && styles.todayWinsTextPlate]}><Text style={styles.vesselLabelTop}>{designMode === 'chic' ? '小さな達成' : '相棒の宝もの'}</Text><Text style={styles.todayWinComment}>{count === 0 ? '最初のひとつを待っています' : `${count}つ終わった、いい感じ`}</Text><Text style={styles.todayWinHint}>瓶をタップして今日の完了を見る</Text></View><View style={styles.miniJarWrap}><View style={styles.miniJarLid} /><View style={[styles.miniJar, designMode === 'chic' && styles.miniJarChicGlass, ]}>{Array.from({ length: Math.min(12, count) }, (_, index) => <Text key={index} style={[styles.miniJarItem, { left: 8 + (index % 3) * 22, bottom: 4 + Math.floor(index / 3) * 14, color: index % 3 === 0 ? '#F3C7D5' : index % 3 === 1 ? '#DCCBF0' : '#F5E1A4' }]}>{index % 2 ? '✦' : '●'}</Text>)}</View>{dropVisible && <Animated.Text style={[styles.fallingTreasure, fallingStyle]}>{item}</Animated.Text>}</View></View></Pressable>{details}</>;
}

function AchievementVessel({ tasks, designMode, chicPattern = 'floral', scope = 'month', compact = false }: { tasks: Task[]; designMode: ThemeMode; chicPattern?: ChicPattern; scope?: 'today' | 'month'; compact?: boolean }) {
  const now = new Date();
  const completed = tasks.filter((task) => {
    if (!task.completedAt) return false;
    const completedDate = new Date(task.completedAt);
    return scope === 'today' ? dateKey(completedDate) === dateKey(now) : completedDate.getFullYear() === now.getFullYear() && completedDate.getMonth() === now.getMonth();
  });
  const visible = completed.slice(-18);
  if (designMode === 'minimal') {
    return <View style={[styles.minimalAchievement, compact && styles.minimalAchievementCompact]}><View><Text style={styles.minimalAchievementLabel}>{scope === 'today' ? '今日できたこと' : '今月の記録'}</Text><Text style={[styles.minimalAchievementNumber, compact && styles.minimalAchievementNumberCompact]}>{String(completed.length).padStart(2, '0')}</Text><Text style={styles.taskMeta}>{completed.length}件完了</Text></View><View style={styles.minimalAchievementBars}>{Array.from({ length: 10 }, (_, item) => <View key={item} style={[styles.minimalAchievementBar, item < Math.min(10, completed.length) && styles.minimalAchievementBarFilled]} />)}</View></View>;
  }
  return <View style={[styles.vesselScene, compact && styles.vesselSceneCompact, designMode === 'chic' && styles.vesselSceneChic, ]}>
    {designMode === 'chic' && <ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" />}
    <View style={[styles.vesselLabel, designMode === 'chic' && styles.vesselLabelChic]}><Text style={styles.vesselLabelTop}>{scope === 'today' ? '今日の小さな達成' : designMode === 'chic' ? '今月の小さな達成' : '今月のできたこと'}</Text><Text style={[styles.vesselLabelTitle, compact && styles.vesselLabelTitleCompact]}>{completed.length}個のできた！</Text></View>
    <View style={styles.jarLid} />
    <View style={[styles.jarBody, compact && styles.jarBodyCompact, ]}>
      {visible.map((task, index) => <View key={task.id} style={[styles.jarTreasure, { left: 13 + (index % 6) * 39, bottom: 10 + Math.floor(index / 6) * 35, transform: [{ rotate: `${(index % 5) * 8 - 16}deg` }] }]}><Text style={styles.jarTreasureText}>{designMode === 'chic' ? (index % 3 === 0 ? '✿' : index % 3 === 1 ? '★' : '●') : (index % 2 ? '★' : '🍪')}</Text></View>)}
      {visible.length === 0 && <Text style={styles.jarEmptyText}>最初のひとつを待っています</Text>}
    </View>
    {!compact && <Text style={styles.vesselCaption}>{designMode === 'chic' ? '終わるたび、瓶に小さな花が増えます' : '相棒の宝物が少しずつ増えていくよ'}</Text>}
  </View>;
}

function HistoryScreen({ tasks, recoveryHistory, focusSessions, departureCheckIns, completionIcon, designMode, chicPattern, planTier, onPremium, onSaveTemplate, onRestore }: { tasks: Task[]; recoveryHistory: RecoveryRecord[]; focusSessions: FocusSession[]; departureCheckIns: DepartureCheckIn[]; completionIcon: string; designMode: ThemeMode; chicPattern: ChicPattern; planTier: PlanTier; onPremium: (featureId?: PremiumGuideFeatureId) => void; onSaveTemplate: (task: Task) => void; onRestore: (id: string) => void }) {
  const now = new Date();
  const [selectedKey, setSelectedKey] = useState(dateKey(now));
  const [historySearch, setHistorySearch] = useState('');
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const premiumHistory = hasPremiumAccess(planTier, 'full_history');
  const historyTasks = premiumHistory ? tasks : tasks.filter((task) => task.completedAt && isWithinFreeHistory(task.completedAt, now));
  const completedByDay = historyTasks.reduce<Record<string, Task[]>>((result, task) => {
    if (!task.completedAt) return result;
    const key = dateKey(task.completedAt);
    result[key] = [...(result[key] ?? []), task];
    return result;
  }, {});
  const selectedTasks = !premiumHistory ? historyTasks.filter((task) => task.done && task.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()) : historySearch.trim() ? historyTasks.filter((task) => task.done && task.completedAt && task.title.toLowerCase().includes(historySearch.trim().toLowerCase())).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()) : completedByDay[selectedKey] ?? [];
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEntries = Object.entries(completedByDay).filter(([key]) => key.startsWith(monthPrefix));
  const monthlyCount = monthEntries.reduce((sum, [, items]) => sum + items.length, 0);
  const activeDays = monthEntries.length;
  const bestDayCount = monthEntries.reduce((best, [, items]) => Math.max(best, items.length), 0);
  const monthlyFocusSessions = focusSessions.filter((session) => session.completedAt.startsWith(monthPrefix));
  const monthlyFocusMinutes = monthlyFocusSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const visibleRecoveryHistory = premiumHistory ? recoveryHistory : recoveryHistory.filter((record) => isWithinFreeHistory(record.occurredAt, now));
  const visibleFocusSessions = premiumHistory ? focusSessions : focusSessions.filter((session) => isWithinFreeHistory(session.completedAt, now));
  const visibleDepartureCheckIns = premiumHistory ? departureCheckIns : departureCheckIns.filter((record) => isWithinFreeHistory(record.departedAt, now));

  return (
    <>
      <Text style={styles.hero}>{premiumHistory ? (designMode === 'minimal' ? '今月の記録' : designMode === 'chic' ? '今月の小さな達成' : '今月の相棒との記録') : '直近7日間のできたこと'}</Text>
      {premiumHistory ? <View style={styles.historySearchBox}><Text style={styles.taskSearchIcon}>⌕</Text><TextInput value={historySearch} onChangeText={setHistorySearch} placeholder="過去に完了したタスクを検索" placeholderTextColor="#A29DAA" style={styles.taskSearchInput} />{historySearch.length > 0 && <Pressable onPress={() => setHistorySearch('')}><Text style={styles.historySearchClear}>×</Text></Pressable>}</View> : <Pressable style={styles.guideCard} onPress={() => onPremium('month')}><View><Text style={styles.guideCardTitle}>全期間の履歴と検索</Text><Text style={styles.guideCardCopy}>Premiumで月表示・詳細検索を利用できます</Text></View><Text style={styles.guideCardArrow}>›</Text></Pressable>}
      {premiumHistory && <AchievementVessel tasks={tasks} designMode={designMode} chicPattern={chicPattern} scope="month" />}
      {premiumHistory && <View style={styles.monthStats}>
        <View style={styles.monthStat}><Text style={styles.monthStatNumber}>{monthlyCount}</Text><Text style={styles.monthStatLabel}>今月の完了</Text></View>
        <View style={styles.monthStat}><Text style={styles.monthStatNumber}>{activeDays}</Text><Text style={styles.monthStatLabel}>活動した日</Text></View>
        <View style={styles.monthStat}><Text style={styles.monthStatNumber}>{bestDayCount}</Text><Text style={styles.monthStatLabel}>1日の最多</Text></View>
      </View>}
      {premiumHistory && <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarMonth}>{year}年 {month + 1}月</Text>
          <Text style={styles.calendarTotal}>{monthlyCount}件完了</Text>
        </View>
        <View style={styles.weekRow}>
          {['日', '月', '火', '水', '木', '金', '土'].map((day) => <Text key={day} style={styles.weekLabel}>{day}</Text>)}
        </View>
        <View style={styles.calendarGrid}>
          {cells.map((day, index) => {
            if (day === null) return <View key={`blank-${index}`} style={styles.dayCell} />;
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const count = completedByDay[key]?.length ?? 0;
            const selected = key === selectedKey;
            return (
              <Pressable key={key} style={[styles.dayCell, selected && styles.daySelected]} onPress={() => setSelectedKey(key)}>
                <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>{day}</Text>
                {count > 0 && <View style={styles.dayDone}><Text style={styles.dayDoneText}>{count}</Text></View>}
              </Pressable>
            );
          })}
        </View>
      </View>}

      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>{premiumHistory ? (historySearch.trim() ? '検索結果' : selectedKey.replaceAll('-', '.')) : '最近の完了'}</Text>
        <Text style={styles.sectionSub}>{selectedTasks.length}件見つかりました</Text>
      </View>
      {selectedTasks.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyCopy}>この日の完了タスクはまだありません。</Text></View>
      ) : selectedTasks.map((task) => (
        <View key={task.id} style={styles.historyTask}>
          <View style={styles.historyIcon}><Text style={styles.historyIconText}>{completionIcon}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskMeta}>{task.category} ・ {task.completedAt ? dateKey(task.completedAt).replaceAll('-', '.') : ''}</Text>
          </View>
          <View style={styles.historyTaskActions}><Pressable style={styles.historyTemplateButton} onPress={() => onSaveTemplate(task)}><Text style={styles.historyTemplateButtonText}>ひな型</Text><Text style={styles.historyTemplatePremium}>Premium</Text></Pressable><Pressable style={styles.restoreButton} onPress={() => onRestore(task.id)}><Text style={styles.restoreButtonText}>元に戻す</Text></Pressable></View>
        </View>
      ))}
      {visibleRecoveryHistory.length > 0 && <View style={styles.recoveryHistorySection}><View style={styles.historyHeader}><Text style={styles.sectionTitle}>立て直した記録</Text><Text style={styles.sectionSub}>{visibleRecoveryHistory.length}回</Text></View>{visibleRecoveryHistory.slice(0, 5).map((record) => <View key={record.id} style={styles.recoveryHistoryRow}><View style={styles.recoveryHistoryIcon}><Text style={styles.recoveryHistoryIconText}>↻</Text></View><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{record.planTitle}</Text><Text style={styles.taskMeta}>{record.action === 'leave_now' ? '今すぐ出発' : record.action === 'delay_arrival' ? '到着予定を変更' : record.action === 'contact' ? '遅れる連絡' : '予定を組み直し'} ・ 見込み {record.estimatedArrival}</Text></View></View>)}</View>}
      {visibleFocusSessions.length > 0 && <View style={styles.recoveryHistorySection}><View style={styles.historyHeader}><Text style={styles.sectionTitle}>集中した記録</Text><Text style={styles.sectionSub}>{premiumHistory ? `今月 ${monthlyFocusMinutes}分` : '直近7日'}</Text></View>{visibleFocusSessions.slice(0, 5).map((session) => <View key={session.id} style={styles.recoveryHistoryRow}><View style={[styles.recoveryHistoryIcon, styles.focusHistoryIcon]}><Text style={styles.focusHistoryIconText}>◉</Text></View><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{session.taskTitle}</Text><Text style={styles.taskMeta}>{session.durationMinutes}分 ・ {dateKey(session.completedAt).replaceAll('-', '.')}</Text></View></View>)}</View>}
      {visibleDepartureCheckIns.length > 0 && <View style={styles.recoveryHistorySection}><View style={styles.historyHeader}><Text style={styles.sectionTitle}>出発した記録</Text><Text style={styles.sectionSub}>{visibleDepartureCheckIns.length}回</Text></View>{visibleDepartureCheckIns.slice(0, 5).map((record) => <View key={record.id} style={styles.recoveryHistoryRow}><View style={styles.recoveryHistoryIcon}><Text style={styles.recoveryHistoryIconText}>➜</Text></View><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{record.planTitle}</Text><Text style={styles.taskMeta}>{record.onTime ? '予定どおり出発' : '遅れて出発'} ・ {dateKey(record.departedAt).replaceAll('-', '.')} {formatLiveTime(new Date(record.departedAt))}</Text></View></View>)}</View>}
    </>
  );
}

function GuideModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const steps = [
    ['1', '今日に登録', '＋追加から実行日・期限・通知を設定します'],
    ['2', '今やるへ整理', '今やる／あとで／待ちに振り分けます'],
    ['3', '間に合う準備', '出発で準備・移動時間を逆算します'],
    ['4', 'ひとつに集中', '集中タイマーで今のタスクだけ進めます'],
    ['5', 'できたを確認', '完了は瓶と履歴にたまり、誤操作は戻せます'],
  ];
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.modalBackdrop} onPress={onClose}><Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}><View style={styles.modalHandle} /><Text style={styles.modalTitle}>Rhythmの使い方</Text><Text style={styles.guideIntro}>迷ったら、この順番だけで大丈夫。</Text>{steps.map(([number, title, copy]) => <View key={number} style={styles.guideStep}><View style={styles.guideStepNumber}><Text style={styles.guideStepNumberText}>{number}</Text></View><View style={{ flex: 1 }}><Text style={styles.guideStepTitle}>{title}</Text><Text style={styles.guideStepCopy}>{copy}</Text></View></View>)}<Pressable style={styles.primaryButton} onPress={onClose}><Text style={styles.primaryButtonText}>わかった</Text></Pressable></Pressable></Pressable></Modal>;
}

type PremiumPreviewKind = PremiumGuideFeatureId;

const PREMIUM_GUIDE_FEATURES: Array<{ id: PremiumGuideFeatureId; kind: PremiumPreviewKind; title: string; description: string }> = [
  { id: 'calendar', kind: 'calendar', title: 'いつもの予定を、Rhythmにまとめる', description: '普段使っているカレンダーの予定も、Rhythmの予定表にまとめて表示。予定を見ながら、何時に準備して何時に出るかを考えられます。' },
  { id: 'nudge', kind: 'nudge', title: '通知を見逃しても、そのままにしない', description: '1回の通知で動けなくても、Rhythmがもう一度確認。「見たけど後回し」を減らします。' },
  { id: 'time', kind: 'time', title: '予定と実際のズレが分かる', description: '準備や出発が、予定よりどのくらいズレているかを記録。感覚ではなく、最近の実際の行動から確認できます。' },
  { id: 'behavior', kind: 'behavior', title: '自分が動きやすい形を知る', description: '通知・集中・延長の記録から、最近の動き方を振り返れます。性格診断ではなく、実際の行動だけを使います。' },
  { id: 'month', kind: 'month', title: '7日より先まで見渡す', description: '無料版は今日から7日間。Premiumでは月単位で先の予定と、7日を超えた完了・集中・出発記録を確認できます。' },
  { id: 'recovery', kind: 'recovery', title: '遅れた時も、ここから立て直す', description: '遅れたことを責めるのではなく、今からできる行動を表示。予定が崩れても、すぐに戻れる形を考えます。' },
  { id: 'templates', kind: 'templates', title: '一度作った設定を、次からそのまま使う', description: '登録済みタスクを、カテゴリ・優先度・通知時刻・間に合うナビの時間設定と一緒に保存。次からはひな型を選び、内容を確認するだけで登録できます。' },
];

function PremiumMiniPreview({ kind, designMode }: { kind: PremiumPreviewKind; designMode: DesignMode }) {
  if (kind === 'calendar') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>予定表の表示イメージ</Text>{[['09:00', '朝会', '外部予定'], ['11:00', '資料提出', 'Rhythm'], ['14:00', '病院訪問', '外部予定'], ['18:30', 'ピラティス', '外部予定']].map(([time, title, source]) => <View key={`${time}-${title}`} style={styles.previewScheduleRow}><Text style={styles.previewTime}>{time}</Text><Text style={styles.previewScheduleTitle}>{title}</Text><Text style={[styles.previewSource, source === 'Rhythm' && styles.previewSourceRhythm]}>{source}</Text></View>)}<View style={styles.previewFlow}><Text style={styles.previewFlowText}>14:00 病院訪問</Text><Text style={styles.previewArrow}>↓</Text><Text style={styles.previewFlowButton}>出発を考える</Text></View></View>;
  if (kind === 'nudge') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>通知の表示イメージ</Text>{[['09:00', '忘れてない？', '資料を送る'], ['09:05', 'そろそろ始められそう？', 'もう一度確認'], ['09:08', 'まだ終わってなければ', '今確認しよう']].map(([time, title, copy], index) => <View key={time} style={[styles.previewNotification, index > 0 && styles.previewNotificationLater]}><Text style={styles.previewNotificationTime}>{time}</Text><View style={{ flex: 1 }}><Text style={styles.previewNotificationTitle}>{title}</Text><Text style={styles.previewNotificationCopy}>{copy}</Text></View></View>)}</View>;
  if (kind === 'time') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>表示イメージ</Text><Text style={styles.previewMetricLabel}>準備開始</Text><View style={styles.previewTimeCompare}><View><Text style={styles.previewCompareLabel}>予定</Text><Text style={styles.previewCompareValue}>12:10</Text></View><Text style={styles.previewCompareArrow}>→</Text><View><Text style={styles.previewCompareLabel}>実際</Text><Text style={styles.previewCompareValue}>12:24</Text></View></View><Text style={styles.previewMetricBig}>平均14分遅め</Text><Text style={styles.previewRecordCount}>記録 8回</Text></View>;
  if (kind === 'behavior') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>表示イメージ</Text><Text style={styles.previewMetricLabel}>最近の行動</Text><View style={styles.previewInsightRow}><Text style={styles.previewInsightLabel}>動き始め</Text><Text style={styles.previewInsightValue}>通知から平均17分で反応</Text></View><View style={styles.previewInsightRow}><Text style={styles.previewInsightLabel}>集中</Text><Text style={styles.previewInsightValue}>15分が比較的続きやすい傾向</Text></View><View style={styles.previewInsightRow}><Text style={styles.previewInsightLabel}>延長</Text><Text style={styles.previewInsightValue}>8回中5回はその後完了</Text></View></View>;
  if (kind === 'month') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>予定表の表示イメージ</Text><View style={styles.previewPlanCompare}><View style={styles.previewFreeWeek}><Text style={styles.previewCompareTag}>無料・今日から7日</Text><View style={styles.previewWeekRow}>{['6', '7', '8', '9', '10', '11', '12'].map((day) => <Text key={day} style={styles.previewWeekDay}>7/{day}</Text>)}</View></View><Text style={styles.previewArrow}>↓</Text><View style={styles.previewMonth}><Text style={styles.previewMonthTitle}>2026年 7月</Text><Text style={styles.previewMonthWeek}>日  月  火  水  木  金  土</Text><Text style={styles.previewMonthDays}>         1    2    3    4{`\n`} 5    6    7    8    9  10  11{`\n`}12  13  14  15  16  17  18{`\n`}19  20  21  22  23  24  25</Text></View></View></View>;
  if (kind === 'templates') return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>表示イメージ</Text><View style={styles.previewTemplateSource}><Text style={styles.previewTemplateTitle}>病院訪問の準備</Text><Text style={styles.previewTemplateMeta}>予定　優先度 高　通知 09:00</Text><Text style={styles.previewTemplateMeta}>準備30分　移動40分　余裕15分</Text><Text style={styles.previewTemplateSave}>設定ごとひな型に保存</Text></View><Text style={styles.previewArrow}>↓</Text><View style={styles.previewTemplateSaved}><View><Text style={styles.previewCompareTag}>マイひな型</Text><Text style={styles.previewTemplateTitle}>病院訪問の準備</Text></View><Text style={styles.previewTemplateChoose}>選ぶ ›</Text></View><Text style={styles.previewTemplateReady}>設定済みでフォームへ反映</Text></View>;
  return <View style={styles.premiumPreview}><Text style={styles.previewImageLabel}>立て直しの表示イメージ</Text><View style={styles.previewDanger}><Text style={styles.previewDangerText}>予定どおりは厳しい</Text></View><View style={styles.previewRecoveryGrid}>{['今から出発', '到着予定を変更', '遅れる連絡', '予定を組み直す'].map((label) => <View key={label} style={styles.previewRecoveryOption}><Text style={styles.previewRecoveryText}>{label}</Text></View>)}</View></View>;
}

function PremiumFeatureEntryCard({ number, title, active, designMode, chicPattern, onPress }: { number: string; title: string; active: boolean; designMode: DesignMode; chicPattern: ChicPattern; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.premiumEntryCard, active && styles.premiumEntryCardActive, designMode === 'minimal' && styles.premiumEntryCardMinimal, designMode === 'chic' && styles.premiumEntryCardChic]}>
    {designMode === 'chic' && <View pointerEvents="none" style={styles.premiumEntryPattern}><ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" density="compact" /></View>}
    <Text style={[styles.premiumEntryNumber, active && styles.premiumEntryNumberActive]}>{number}</Text>
    <Text numberOfLines={2} style={[styles.premiumEntryTitle, active && styles.premiumEntryTitleActive]}>{title}</Text>
  </Pressable>;
}

function PremiumFeatureDetail({ number, kind, title, description, designMode, chicPattern }: { number: string; kind: PremiumPreviewKind; title: string; description: string; designMode: DesignMode; chicPattern: ChicPattern }) {
  return <View style={[styles.premiumFeatureBlock, designMode === 'minimal' && styles.premiumFeatureMinimal, designMode === 'chic' && styles.premiumFeatureChic, ]}>
    {designMode === 'chic' && <ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" />}
    <View style={styles.premiumFeatureInner}>
      <View style={styles.premiumFeatureTop}><Text style={[styles.premiumFeatureNumber, designMode === 'minimal' && styles.premiumFeatureNumberMinimal]}>{number}</Text><Text style={styles.premiumFeatureLabel}>Premium機能</Text></View>
      <PremiumMiniPreview kind={kind} designMode={designMode} />
      <View style={[styles.premiumFeatureTextPlate, designMode === 'minimal' && styles.premiumFeatureTextMinimal, designMode === 'chic' && styles.premiumFeatureTextChic]}><Text style={[styles.premiumFeatureTitle, designMode === 'minimal' && styles.premiumFeatureTitleMinimal]}>{title}</Text><Text style={[styles.premiumFeatureDescription, designMode === 'minimal' && styles.premiumFeatureDescriptionMinimal]}>{description}</Text></View>
    </View>
  </View>;
}

function PremiumModal({ visible, initialFeatureId, designMode, chicPattern, onClose }: { visible: boolean; initialFeatureId: PremiumGuideFeatureId; designMode: DesignMode; chicPattern: ChicPattern; onClose: () => void }) {
  const theme = getThemeTokens(designMode);
  const initialIndex = Math.max(0, PREMIUM_GUIDE_FEATURES.findIndex((feature) => feature.id === initialFeatureId));
  const [selectedFeatureId, setSelectedFeatureId] = useState<PremiumGuideFeatureId>(initialFeatureId);
  useEffect(() => {
    if (!visible) return;
    setSelectedFeatureId(initialFeatureId);
  }, [initialFeatureId, visible]);
  const selectedFeature = PREMIUM_GUIDE_FEATURES.find((feature) => feature.id === selectedFeatureId) ?? PREMIUM_GUIDE_FEATURES[initialIndex] ?? PREMIUM_GUIDE_FEATURES[0]!;
  const selectedIndex = Math.max(0, PREMIUM_GUIDE_FEATURES.findIndex((feature) => feature.id === selectedFeature.id));
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable style={[styles.modalSheet, styles.premiumModalSheet, { backgroundColor: theme.colors.screenBackground }]} onPress={(event) => event.stopPropagation()}>
        <View style={styles.modalHandle} />
        <View style={styles.premiumCarouselHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.premiumCarouselBrand}>Rhythm Premium</Text>
            <Text style={styles.premiumCarouselCopy}>Rhythmが、あなたより少し先に動く。</Text>
          </View>
          <Pressable style={[styles.premiumHeaderClose, { borderColor: theme.colors.primaryAccent }]} onPress={onClose}><Text style={[styles.premiumCloseButtonText, { color: theme.colors.primaryAccent }]}>閉じる</Text></Pressable>
        </View>
        <View style={styles.premiumFeaturePicker}>
          {PREMIUM_GUIDE_FEATURES.map((feature, index) => <PremiumFeatureEntryCard key={feature.id} number={String(index + 1).padStart(2, '0')} title={feature.title} active={feature.id === selectedFeature.id} designMode={designMode} chicPattern={chicPattern} onPress={() => setSelectedFeatureId(feature.id)} />)}
        </View>
        <View style={styles.premiumFeatureStage}>
          <PremiumFeatureDetail number={String(selectedIndex + 1).padStart(2, '0')} kind={selectedFeature.kind} title={selectedFeature.title} description={selectedFeature.description} designMode={designMode} chicPattern={chicPattern} />
          {selectedFeature.id === 'month' && <View style={styles.premiumHistoryNote}><Text style={styles.premiumHistoryTitle}>過去の記録も、あとから振り返れる</Text><Text style={styles.premiumHistoryCopy}>7日を超えた完了記録や、集中・出発の記録も確認できます。</Text></View>}
        </View>
        <Pressable style={[styles.premiumCloseButton, { borderColor: theme.colors.primaryAccent }]} onPress={onClose}><Text style={[styles.premiumCloseButtonText, { color: theme.colors.primaryAccent }]}>Rhythmに戻る</Text></Pressable>
      </Pressable>
    </Pressable>
  </Modal>;
}

function BottomNav({ screen, designMode, onChange }: { screen: Screen; designMode: DesignMode; onChange: (screen: Screen) => void }) {
  const theme = getThemeTokens(designMode);
  const items: { id: Screen; icon: string; label: string }[] = [
    { id: 'home', icon: '✓', label: '今日' },
    { id: 'timeline', icon: '↗', label: 'タイム' },
    { id: 'analysis', icon: '◫', label: '分析' },
    { id: 'settings', icon: '⚙', label: '設定' },
  ];
  return (
    <View style={[styles.bottomNav, designMode === 'minimal' && styles.bottomNavMinimal, designMode === 'chic' && styles.bottomNavChic, ]}>
      {items.map((item) => {
        const active = item.id === screen;
        return (
          <Pressable key={item.id} style={styles.navItem} onPress={() => onChange(item.id)}>
            <Text style={[styles.navIcon, { color: active ? theme.colors.primaryAccent : theme.colors.secondaryText }]}>{item.icon}</Text>
            <Text style={[styles.navLabel, { color: active ? theme.colors.primaryAccent : theme.colors.secondaryText }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  safeMinimal: { backgroundColor: '#F2F2F2' },
  safeChic: { backgroundColor: '#FFF8F3' },
  app: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerMinimal: { paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#1C1C1C' },
  dateLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.25 },
  brand: { color: colors.ink, fontSize: 29, fontWeight: '900', letterSpacing: -1.2 },
  brandMinimal: { color: '#111111', letterSpacing: -1.5 },
  remainingPill: { backgroundColor: colors.mint, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  remainingPillMinimal: { backgroundColor: '#1A1A1A', borderRadius: 3 },
  remainingText: { color: '#337256', fontSize: 12, fontWeight: '800' },
  remainingTextMinimal: { color: '#FFFFFF', letterSpacing: 0.8 },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 118 },
  hero: { color: colors.ink, fontSize: 30, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2, marginBottom: 22 },
  minimalHero: { marginBottom: 24, paddingTop: 10 },
  minimalClockRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 15 },
  minimalLiveTime: { color: '#0A0A0A', fontSize: 44, lineHeight: 48, fontWeight: '300', letterSpacing: -2.4 },
  minimalLiveDate: { color: '#5D5D5D', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, paddingBottom: 5 },
  nextActionCard: { backgroundColor: '#111111', borderRadius: 4, padding: 19, minHeight: 172 },
  nextActionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextActionIndex: { color: '#A8A8A8', fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  nextActionTitle: { color: '#FFFFFF', fontSize: 27, lineHeight: 33, fontWeight: '800', letterSpacing: -1, marginTop: 20 },
  nextActionMessage: { color: '#C8C8C8', fontSize: 11, fontWeight: '700', marginTop: 8 },
  nextActionStatus: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#555555', borderRadius: 3, paddingHorizontal: 8, paddingVertical: 5, marginTop: 13 },
  nextActionStatusText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  minimalRule: { height: 5, width: 52, backgroundColor: '#101010', marginBottom: 15 },
  minimalKicker: { color: '#6A6A6A', fontSize: 9, letterSpacing: 1.8, fontWeight: '800' },
  minimalHeadline: { color: '#0D0D0D', fontSize: 46, lineHeight: 52, fontWeight: '900', letterSpacing: -2.6, marginTop: 5 },
  minimalStats: { flexDirection: 'row', alignItems: 'baseline', marginTop: 17 },
  minimalStatStrong: { color: '#111111', fontSize: 21, fontWeight: '900' },
  minimalStatLabel: { color: '#777777', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginLeft: 5 },
  minimalStatDivider: { width: 1, height: 17, backgroundColor: '#B8B8B8', marginHorizontal: 15 },
  chicHero: { minHeight: 216, backgroundColor: '#EAE1FF', borderRadius: 32, padding: 14, marginBottom: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#FFFFFF' },
  chicPaperPanel: { flex: 1, backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 23, padding: 18, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)' },
  chicOrbOne: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: '#FFCFC9', right: -42, top: -55, opacity: 0.72 },
  chicOrbTwo: { position: 'absolute', width: 105, height: 105, borderRadius: 53, backgroundColor: '#D1F3E4', right: 34, bottom: -52, opacity: 0.85 },
  chicKicker: { color: '#7358B9', fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  chicPatternSymbol: { position: 'absolute', right: 25, top: 53, color: '#FFFFFF', fontSize: 39, fontWeight: '300', opacity: 0.8 },
  patternLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  patternDotSmall: { position: 'absolute', opacity: 0.42 },
  patternFlowerSmall: { position: 'absolute', width: 13, height: 13, opacity: 0.48 },
  flowerPetalSmall: { position: 'absolute', width: 5, height: 5, borderRadius: 3 },
  flowerSmallTop: { left: 4, top: 0 },
  flowerSmallRight: { right: 0, top: 4 },
  flowerSmallBottom: { left: 4, bottom: 0 },
  flowerSmallLeft: { left: 0, top: 4 },
  flowerCenterSmall: { position: 'absolute', left: 5, top: 5, width: 3, height: 3, borderRadius: 2, backgroundColor: '#C6A467' },
  checkPatternBase: { backgroundColor: '#FFF9F6' },
  checkVerticalBand: { position: 'absolute', top: 0, bottom: 0, width: 8, backgroundColor: 'rgba(232,184,199,0.22)' },
  checkHorizontalBand: { position: 'absolute', left: 0, right: 0, height: 8, backgroundColor: 'rgba(232,184,199,0.22)' },
  chicHeadline: { color: '#342B4A', fontSize: 29, lineHeight: 38, fontWeight: '900', letterSpacing: -1.1, marginTop: 15 },
  chicFlow: { color: '#71657E', fontSize: 11, fontWeight: '700', marginTop: 7, maxWidth: '78%' },
  chicSummary: { flexDirection: 'row', alignItems: 'baseline', marginTop: 19 },
  chicSummaryStrong: { color: '#6F52B5', fontSize: 17, fontWeight: '900' },
  chicSummaryText: { color: '#827593', fontSize: 9, fontWeight: '700' },
  chicSummaryDot: { color: '#F19A89', fontSize: 11 },
  sceneSun: { position: 'absolute', width: 66, height: 66, borderRadius: 33, backgroundColor: '#FFD66F', right: 20, top: 17, opacity: 0.75 },
  sceneCloud: { position: 'absolute', left: 18, top: 13, backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 },
  sceneCloudText: { color: '#8B6849', fontSize: 9, fontWeight: '800' },
  sceneFloor: { height: 18, backgroundColor: '#D9C58E', marginHorizontal: -13, marginBottom: -13, marginTop: -12, opacity: 0.6 },
  departureMini: { backgroundColor: colors.ink, borderRadius: 24, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  departureMinimal: { backgroundColor: '#171717', borderRadius: 10 },
  eggBubble: { width: 76, height: 76, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#A17133', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  eggEmoji: { fontSize: 43 },
  urgencyCard: { backgroundColor: colors.violetSoft, borderRadius: 22, padding: 17, marginBottom: 14, borderWidth: 1.5, borderColor: '#DCD2FF' },
  urgencyCardFeatured: { marginBottom: 15 },
  urgencyCardDanger: { backgroundColor: colors.coralSoft, borderColor: '#FFC6BD' },
  urgencyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  urgencyEyebrow: { flex: 1, color: colors.violet, fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
  urgencyDangerText: { color: colors.coral },
  urgencyBadge: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  urgencyBadgeDanger: { backgroundColor: '#FFFFFF' },
  urgencyBadgeText: { color: colors.violet, fontSize: 9, fontWeight: '900' },
  urgencyBadgeTextDanger: { color: colors.coral },
  urgencyTaskTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 11 },
  urgencyAction: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 5 },
  urgencyRisk: { color: colors.violet, fontSize: 10, fontWeight: '900', marginTop: 7 },
  miniEyebrow: { color: '#AAA4B7', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  departureTime: { color: '#FFFFFF', fontSize: 35, fontWeight: '900', marginTop: 3 },
  departureCopy: { color: '#BCB6C8', fontSize: 12, fontWeight: '600' },
  arrowCircle: { width: 48, height: 48, borderRadius: 18, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionHeaderMinimal: { borderTopWidth: 1, borderTopColor: '#BDBDBD', paddingTop: 15 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  sectionSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  addButton: { backgroundColor: colors.violetSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  addButtonText: { color: colors.violet, fontSize: 13, fontWeight: '900' },
  taskHeaderButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterChips: { gap: 8, paddingBottom: 13, paddingRight: 16 },
  filterChip: { backgroundColor: '#ECE9EF', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1.5, borderColor: 'transparent' },
  filterChipActive: { backgroundColor: colors.violetSoft, borderColor: colors.violet },
  filterChipText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  filterChipTextActive: { color: colors.violet },
  selectButton: { backgroundColor: '#EEECEF', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  selectButtonText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  batchBar: { backgroundColor: colors.violetSoft, borderRadius: 17, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  batchCount: { color: colors.violet, fontSize: 12, fontWeight: '900' },
  batchComplete: { backgroundColor: colors.violet, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9 },
  batchDisabled: { opacity: 0.35 },
  batchCompleteText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  emptyCard: { minHeight: 164, backgroundColor: colors.surface, borderRadius: 22, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', overflow: 'hidden' },
  emptyCardMinimal: { borderRadius: 2, borderStyle: 'solid', borderColor: '#171715', backgroundColor: '#FFFFFF' },
  emptyCardChic: { borderRadius: 26, borderStyle: 'solid', borderColor: '#F0DFE5', backgroundColor: '#FFFFFF' },
  emptyPlainContent: { alignItems: 'center' },
  emptyChicGlass: { width: '72%', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.84)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 22, alignItems: 'center', zIndex: 2 },
  emptyIcon: { color: colors.violet, fontSize: 30, marginBottom: 8 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyCopy: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 6 },
  taskCard: { minHeight: 70, backgroundColor: colors.surface, borderRadius: 19, paddingHorizontal: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', position: 'relative' },
  taskCardInner: { flex: 1, minHeight: 70, flexDirection: 'row', alignItems: 'center' },
  taskCardMinimal: { borderRadius: 8, borderWidth: 1, borderColor: '#DDDDDD', shadowOpacity: 0 },
  taskCardChic: { minHeight: 82, paddingHorizontal: 0, paddingVertical: 6, paddingLeft: 6, borderRadius: 23, borderWidth: 0, overflow: 'hidden', shadowColor: '#B88FA1', shadowOpacity: 0.08, shadowRadius: 9, shadowOffset: { width: 0, height: 4 } },
  taskCardInnerChic: { flex: 0, width: '84%', minHeight: 70, borderRadius: 18, paddingHorizontal: 7, backgroundColor: 'rgba(255,255,255,0.84)', zIndex: 2 },
  taskCardChicDone: { opacity: 1 },
  taskCardInnerChicDone: { opacity: 0.82 },
  taskCardDone: { opacity: 0.55, backgroundColor: '#EFEEE9' },
  check: { width: 29, height: 29, borderRadius: 10, borderWidth: 2, borderColor: '#D8D3DE', alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  checkDone: { backgroundColor: colors.violet, borderColor: colors.violet },
  selectionChecked: { backgroundColor: colors.coral, borderColor: colors.coral },
  checkMark: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  taskBody: { flex: 1, paddingVertical: 12 },
  taskTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  taskTitleDone: { textDecorationLine: 'line-through' },
  inlineUrgency: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  inlineUrgencyText: { color: colors.coral, fontSize: 9, fontWeight: '900' },
  inlineRisk: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  taskMeta: { color: colors.violet, fontSize: 11, fontWeight: '700', marginTop: 5 },
  deadlineMeta: { color: '#9A6B24', fontSize: 10, fontWeight: '800', marginTop: 4 },
  deadlineOverdue: { color: colors.coral },
  taskInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  priorityPill: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: '#F0EDF4' },
  priorityHigh: { backgroundColor: colors.coralSoft },
  priorityText: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  priorityHighText: { color: colors.coral },
  categoryPill: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3 },
  categoryPillChic: { backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1 },
  categoryText: { color: colors.ink, fontSize: 9, fontWeight: '800' },
  routinePill: { backgroundColor: '#E8F5EE', borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3 },
  routinePillText: { color: '#357457', fontSize: 9, fontWeight: '900' },
  edit: { color: colors.violet, fontSize: 11, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 10 },
  delete: { color: '#B2ACB8', fontSize: 22, padding: 8 },
  formCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 16 },
  timeHero: { fontSize: 28, lineHeight: 36, flexShrink: 1 },
  chicTimeHero: { minHeight: 170, borderRadius: 26, backgroundColor: '#FFF3F5', padding: 15, marginBottom: 14, overflow: 'hidden' },
  chicTimeHeroPaper: { width: '68%', minHeight: 112, alignSelf: 'flex-start', borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.84)', paddingHorizontal: 18, justifyContent: 'center', zIndex: 2 },
  timeTabs: { flexDirection: 'row', backgroundColor: '#EDE9F1', borderRadius: 17, padding: 4, marginBottom: 22, overflow: 'hidden' },
  timeTabsMinimal: { borderRadius: 0, padding: 0, backgroundColor: 'transparent', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#CFCFCA' },
  timeTabsChic: { backgroundColor: 'transparent', borderRadius: 0, padding: 0, gap: 5, overflow: 'visible' },
  timeTab: { flex: 1, borderRadius: 13, paddingVertical: 12, alignItems: 'center' },
  timeTabMinimal: { borderRadius: 0, borderRightWidth: 1, borderColor: '#CFCFCA' },
  timeTabChicPattern: { minHeight: 52, borderRadius: 15, paddingVertical: 6, paddingHorizontal: 3, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(217,134,161,0.18)' },
  timeTabGlassLabel: { minWidth: '72%', alignSelf: 'center', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.82)', alignItems: 'center', zIndex: 2 },
  timeTabGlassLabelActive: { backgroundColor: 'rgba(255,255,255,0.94)' },
  timeTabMarker: { position: 'absolute', right: 4, top: 2, fontSize: 5 },
  timeTabActive: { backgroundColor: colors.surface, shadowColor: '#433850', shadowOpacity: 0.08, shadowRadius: 6 },
  timeTabText: { color: colors.muted, fontSize: 13, fontWeight: '900' },
  timeTabTextActive: { color: colors.violet },
  departureListHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  departureEmpty: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, marginBottom: 8, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed' },
  departureCountdownCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 9, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 5, borderLeftColor: colors.violet },
  departurePassed: { opacity: 0.48, borderLeftColor: colors.muted },
  departureCountdownTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  departureCountdownDate: { color: colors.violet, fontSize: 10, fontWeight: '800', marginTop: 5 },
  departureCountdownMeta: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 4 },
  departureCountdownRight: { alignItems: 'flex-end', marginLeft: 10 },
  departureCountdownValue: { color: colors.coral, fontSize: 12, fontWeight: '900' },
  departureActions: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 10 },
  departureEdit: { color: colors.violet, fontSize: 10, fontWeight: '900' },
  departureDelete: { color: colors.muted, fontSize: 18, fontWeight: '700' },
  recoveryMiniButton: { alignSelf: 'flex-end', marginTop: 6, borderRadius: 9, backgroundColor: '#FFF0E4', paddingHorizontal: 9, paddingVertical: 5 },
  recoveryMiniButtonText: { color: '#B86A34', fontSize: 8, fontWeight: '900' },
  recoveryMiniButtonSecondary: { alignSelf: 'flex-end', marginTop: 6, borderRadius: 9, backgroundColor: '#F4F0F6', paddingHorizontal: 9, paddingVertical: 5 },
  recoveryMiniButtonSecondaryText: { color: colors.ink, fontSize: 8, fontWeight: '900' },
  twoChoiceRow: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end' },
  timelineStatusMessage: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 8, marginBottom: 10 },
  recoveryHeader: { borderRadius: 20, padding: 16, marginBottom: 18 },
  recoveryEyebrow: { fontSize: 9, fontWeight: '900' },
  recoveryTitle: { color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: '900', marginTop: 7 },
  recoverySummary: { color: colors.muted, fontSize: 10, lineHeight: 16, fontWeight: '700', marginTop: 8 },
  recoveryPrompt: { color: colors.ink, fontSize: 12, fontWeight: '900', marginBottom: 9 },
  recoveryOption: { minHeight: 67, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, paddingHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recoveryOptionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  recoveryOptionIconText: { fontSize: 17, fontWeight: '900' },
  recoveryOptionTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  recoveryOptionCopy: { color: colors.muted, fontSize: 8, lineHeight: 13, fontWeight: '600', marginTop: 3 },
  recoveryOptionArrow: { fontSize: 21, fontWeight: '700' },
  recoveryNote: { color: colors.muted, fontSize: 8, lineHeight: 13, textAlign: 'center', marginTop: 7 },
  departureDateButton: { alignSelf: 'flex-start', backgroundColor: colors.violetSoft, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9, marginBottom: 4 },
  departureDateButtonText: { color: colors.violet, fontSize: 13, fontWeight: '900' },
  deadlineCountdownCard: { backgroundColor: colors.surface, borderRadius: 19, padding: 15, marginBottom: 9, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#F2B54A' },
  deadlineCountdownDanger: { borderLeftColor: colors.coral, backgroundColor: colors.coralSoft },
  deadlineCountdownWhen: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  deadlineDangerText: { color: '#C9473B' },
  deadlineTapEdit: { color: colors.muted, fontSize: 8, fontWeight: '700', marginTop: 7 },
  deadlineGuide: { backgroundColor: colors.violetSoft, borderRadius: 17, padding: 15, marginTop: 5 },
  deadlineGuideTitle: { color: colors.violet, fontSize: 11, fontWeight: '900' },
  deadlineGuideCopy: { color: colors.muted, fontSize: 10, fontWeight: '600', marginTop: 4 },
  calendarImportButton: { backgroundColor: '#E8F5EE', borderRadius: 19, padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: '#CDE9DB' },
  calendarImportIcon: { color: '#3E8A67', fontSize: 22 },
  calendarImportTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  calendarImportCopy: { color: colors.muted, fontSize: 9, fontWeight: '600', marginTop: 3 },
  calendarImportArrow: { color: '#3E8A67', fontSize: 23, fontWeight: '700' },
  calendarEventPicker: { backgroundColor: colors.surface, borderRadius: 19, padding: 14, marginBottom: 15 },
  calendarEventPickerTitle: { color: colors.ink, fontSize: 12, fontWeight: '900', marginBottom: 7 },
  calendarEventRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 11 },
  calendarEventTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  calendarEventDate: { color: colors.muted, fontSize: 9, marginTop: 3 },
  fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.7, marginTop: 10, marginBottom: 6 },
  titleInput: { color: colors.ink, fontSize: 18, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 9 },
  arrivalInput: { color: colors.violet, fontSize: 40, fontWeight: '900', letterSpacing: -1.4, paddingVertical: 3 },
  numberSetting: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  numberLabel: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.violetSoft, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.violet, fontSize: 19, fontWeight: '800' },
  numberValue: { color: colors.ink, width: 55, textAlign: 'center', fontSize: 14, fontWeight: '900' },
  timelineCard: { backgroundColor: colors.ink, borderRadius: 24, padding: 20, marginBottom: 14 },
  timelinePoint: { minHeight: 61, flexDirection: 'row', alignItems: 'flex-start' },
  track: { width: 25, alignItems: 'center' },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#8F899C', marginTop: 4, zIndex: 2 },
  dotFeatured: { width: 16, height: 16, borderRadius: 8, marginTop: 1, backgroundColor: '#C9B9FF' },
  trackLine: { position: 'absolute', top: 12, width: 2, height: 54, backgroundColor: '#4B4658' },
  pointTime: { color: '#FFFFFF', width: 70, fontSize: 17, fontWeight: '900' },
  pointLabel: { color: '#AFA9BB', fontSize: 14, fontWeight: '700', paddingTop: 2 },
  pointFeatured: { color: '#FFFFFF', fontWeight: '900' },
  primaryButton: { backgroundColor: colors.violet, minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  premiumCard: { backgroundColor: colors.coralSoft, borderRadius: 22, padding: 19, marginTop: 18, flexDirection: 'row', alignItems: 'center' },
  premiumText: { flex: 1 },
  premiumBadge: { color: colors.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  premiumTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 4 },
  premiumCopy: { color: colors.muted, fontSize: 12, marginTop: 4 },
  lock: { color: colors.coral, fontSize: 28 },
  previewLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textAlign: 'center', marginBottom: 10 },
  modeCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, marginBottom: 20 },
  modeChoices: { flexDirection: 'row', gap: 8, marginTop: 13 },
  modeChoice: { flex: 1, minHeight: 154, borderRadius: 17, backgroundColor: '#F2EFF5', alignItems: 'center', justifyContent: 'center', padding: 7, borderWidth: 2, borderColor: 'transparent' },
  modeChoiceActive: { backgroundColor: colors.violetSoft, borderColor: colors.violet },
  modeIcon: { fontSize: 24, marginBottom: 5 },
  modeName: { color: colors.ink, fontSize: 11, fontWeight: '900' },
  modeNameActive: { color: colors.violet },
  modeDescription: { color: colors.muted, fontSize: 8, marginTop: 3 },
  modeMiniPreview: { width: '100%', height: 70, borderRadius: 10, marginBottom: 8, overflow: 'hidden', position: 'relative' },
  modeMiniMinimal: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#171715', borderRadius: 2 },
  modeMiniChic: { backgroundColor: '#FFF3F5', borderWidth: 1, borderColor: '#F0DFE5', borderRadius: 16 },
  modeMiniBlackBlock: { position: 'absolute', left: 7, top: 7, width: 24, height: 17, backgroundColor: '#171715' },
  modeMiniNumber: { position: 'absolute', right: 8, top: 5, color: '#171715', fontSize: 24, fontWeight: '900' },
  modeMiniLine: { position: 'absolute', left: 7, right: 7, bottom: 12, height: 1, backgroundColor: '#171715' },
  modeMiniGlass: { position: 'absolute', width: 43, height: 43, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.72)', left: 10, top: 14, borderWidth: 1, borderColor: '#F4D8E2' },
  modeMiniFlower: { position: 'absolute', right: 10, top: 8 },
  modeMiniSparkle: { position: 'absolute', right: 20, bottom: 7, color: '#C6A467' },
  modeMiniSun: { position: 'absolute', width: 39, height: 39, borderRadius: 20, backgroundColor: '#FFE4BD', right: 7, top: 5 },
  modeMiniEgg: { position: 'absolute', fontSize: 31, left: 14, top: 17 },
  modeMiniGround: { position: 'absolute', left: -8, right: -8, height: 28, borderRadius: 40, bottom: -15, backgroundColor: '#CFE8E1' },
  patternSelector: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F0DFE5', paddingTop: 13 },
  patternChoices: { flexDirection: 'row', gap: 8, marginTop: 8 },
  patternChoice: { flex: 1, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFF3F5', padding: 6 },
  patternChoiceActive: { borderColor: '#D986A1', backgroundColor: '#FFFFFF' },
  patternSwatch: { height: 43, borderRadius: 11, backgroundColor: '#FFF9F6', overflow: 'hidden' },
  patternChoiceText: { color: '#8B7B82', fontSize: 9, fontWeight: '800', textAlign: 'center', marginTop: 5 },
  patternChoiceTextActive: { color: '#D986A1' },
  phonePreview: { backgroundColor: '#D9D1EA', borderRadius: 35, padding: 22, paddingBottom: 34, minHeight: 350, alignItems: 'center', marginBottom: 18 },
  phonePreviewMinimal: { backgroundColor: '#D7D7D7', borderRadius: 14 },
  phoneClock: { color: colors.ink, fontSize: 30, fontWeight: '500', marginBottom: 30 },
  widget: { width: '100%', maxWidth: 340, minHeight: 190, backgroundColor: colors.surface, borderRadius: 26, padding: 18, shadowColor: '#3B3151', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 9 } },
  widgetMinimal: { borderRadius: 10, shadowOpacity: 0, borderWidth: 1, borderColor: '#DADADA' },
  widgetChicWash: { ...StyleSheet.absoluteFillObject, margin: 9, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.78)' },
  widgetChicOrb: { position: 'absolute', width: 82, height: 82, borderRadius: 41, right: -21, top: -28, opacity: 0.65 },
  widgetChicSymbol: { position: 'absolute', right: 20, top: 10, color: '#FFFFFF', fontSize: 24, opacity: 0.9 },
  widgetSmall: { maxWidth: 210, minHeight: 190 },
  widgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  widgetBrand: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  widgetBrandMinimal: { color: '#111111', fontSize: 17, letterSpacing: 1.2 },
  widgetDate: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  widgetDeparture: { alignItems: 'flex-end' },
  widgetDepartureLabel: { color: colors.coral, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  widgetDepartureTime: { color: colors.violet, fontSize: 14, fontWeight: '900', marginTop: 2 },
  widgetDivider: { height: 1, backgroundColor: colors.line, marginVertical: 11 },
  widgetUrgency: { backgroundColor: colors.coralSoft, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, marginBottom: 7 },
  widgetUrgencyStatus: { color: colors.coral, fontSize: 8, fontWeight: '900' },
  widgetUrgencyAction: { color: colors.ink, fontSize: 9, fontWeight: '800', marginTop: 2 },
  widgetTask: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  widgetCheck: { width: 16, height: 16, borderRadius: 5, borderWidth: 1.5, borderColor: '#CBC5D2', marginRight: 9, alignItems: 'center', justifyContent: 'center' },
  widgetCheckDone: { backgroundColor: colors.violet, borderColor: colors.violet },
  widgetCheckText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  widgetTaskText: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '700' },
  widgetTaskDone: { textDecorationLine: 'line-through', color: colors.muted },
  widgetEmpty: { color: colors.muted, fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 14 },
  settingsCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 20 },
  settingsTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  settingsSectionLabel: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 4, marginBottom: 12 },
  segment: { flexDirection: 'row', backgroundColor: '#F0EDF4', padding: 4, borderRadius: 15 },
  segmentButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  segmentTextActive: { color: colors.violet },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, marginTop: 18, paddingTop: 18 },
  switchTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  switchCopy: { color: colors.muted, fontSize: 10, marginTop: 4 },
  lockedSetting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, marginTop: 18, paddingTop: 18 },
  iconChoices: { flexDirection: 'row', gap: 10 },
  iconChoice: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#F0EDF4', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconChoiceActive: { backgroundColor: colors.violetSoft, borderColor: colors.violet },
  iconChoiceText: { color: colors.muted, fontSize: 20, fontWeight: '900' },
  iconChoiceTextActive: { color: colors.violet },
  smallLock: { color: colors.coral, fontSize: 9, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(34,30,45,0.46)', justifyContent: 'flex-end' },
  keyboardView: { flex: 1 },
  modalSheet: { backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8, maxHeight: '92%' },
  modalScroll: { paddingBottom: 24 },
  modalHandle: { width: 42, height: 5, backgroundColor: '#D0CBD5', borderRadius: 4, alignSelf: 'center', marginBottom: 19 },
  modalTitle: { color: colors.ink, fontSize: 25, fontWeight: '900', marginBottom: 14 },
  modalInput: { backgroundColor: '#FFFFFF', borderRadius: 17, borderWidth: 2, borderColor: colors.violetSoft, paddingHorizontal: 16, height: 58, color: '#282538', fontSize: 16, fontWeight: '700' },
  categoryChoices: { gap: 9, paddingVertical: 3, paddingRight: 12 },
  categoryChoice: { borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: 'transparent' },
  categoryChoiceActive: { borderColor: colors.violet },
  categoryChoiceText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  priorityChoices: { flexDirection: 'row', gap: 9 },
  priorityChoice: { flex: 1, borderRadius: 13, backgroundColor: '#F0EDF4', paddingVertical: 11, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  priorityChoiceActive: { backgroundColor: colors.violetSoft, borderColor: colors.violet },
  priorityChoiceHigh: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  priorityChoiceText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  priorityChoiceTextActive: { color: colors.ink },
  repeatChoices: { flexDirection: 'row', gap: 7 },
  repeatChoice: { flex: 1, backgroundColor: '#F0EDF4', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  repeatChoiceActive: { backgroundColor: '#E8F5EE', borderColor: '#4D9B76' },
  repeatChoiceText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  repeatChoiceTextActive: { color: '#357457' },
  remindTimeRow: { backgroundColor: colors.surface, borderRadius: 17, padding: 14, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remindTimeInput: { color: colors.violet, fontSize: 24, fontWeight: '900', textAlign: 'right', width: 90 },
  reminderPanel: { marginTop: 6 },
  deadlinePanel: { marginTop: 6, backgroundColor: colors.coralSoft, borderRadius: 18, padding: 10 },
  quickDates: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickDateButton: { backgroundColor: colors.violetSoft, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 8 },
  quickDateText: { color: colors.violet, fontSize: 11, fontWeight: '900' },
  quickDeadlineButton: { backgroundColor: '#FFFFFF', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 8 },
  quickDeadlineText: { color: colors.coral, fontSize: 10, fontWeight: '900' },
  pickerButton: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 },
  pickerButtonText: { color: colors.violet, fontSize: 15, fontWeight: '900' },
  deadlineNotifyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F5D8D2', marginTop: 12, paddingTop: 12 },
  notifyChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  notifyChoice: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1.5, borderColor: 'transparent' },
  notifyChoiceActive: { borderColor: colors.coral, backgroundColor: '#FFF8F6' },
  notifyChoiceText: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  notifyChoiceTextActive: { color: colors.coral },
  navigationDurations: { backgroundColor: '#FFFFFF', borderRadius: 14, marginTop: 10, paddingHorizontal: 12 },
  compactSetting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  compactLabel: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  compactControls: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  compactStep: { color: colors.violet, fontSize: 18, fontWeight: '900', paddingHorizontal: 5 },
  compactValue: { color: colors.ink, fontSize: 11, fontWeight: '900', width: 42, textAlign: 'center' },
  remindDateInput: { color: colors.violet, fontSize: 17, fontWeight: '900', textAlign: 'right', width: 125 },
  nudgeChoices: { flexDirection: 'row', gap: 7 },
  nudgeChoice: { flex: 1, minHeight: 53, borderRadius: 13, borderWidth: 1, borderColor: '#E3DCE8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  nudgeChoiceActive: { borderColor: colors.violet, backgroundColor: colors.violetSoft },
  nudgeChoiceTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  nudgeChoiceTitleActive: { color: colors.violet },
  nudgeChoiceCopy: { color: colors.muted, fontSize: 8, fontWeight: '700', marginTop: 2 },
  nudgeChoiceCopyActive: { color: '#6859A7' },
  taskDateQuickRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  taskDateQuick: { height: 40, minWidth: 52, borderRadius: 12, backgroundColor: '#F1EDF5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  taskDateQuickText: { color: colors.violet, fontSize: 10, fontWeight: '900' },
  taskDatePickerButton: { flex: 1, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1D9E6', alignItems: 'center', justifyContent: 'center' },
  taskDatePickerText: { color: colors.ink, fontSize: 10, fontWeight: '900' },
  taskTemplates: { gap: 7, paddingBottom: 15 },
  taskTemplateChip: { height: 34, borderRadius: 17, backgroundColor: '#F5F0F7', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  taskTemplateText: { color: colors.violet, fontSize: 9, fontWeight: '900' },
  inputHint: { color: colors.muted, fontSize: 8, marginTop: 2 },
  cancelText: { color: colors.muted, fontSize: 13, fontWeight: '800', textAlign: 'center', paddingTop: 18 },
  premiumSun: { color: colors.coral, fontSize: 48, textAlign: 'center' },
  premiumModalCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 12 },
  premiumModalSheet: { paddingHorizontal: 14, paddingBottom: 0, height: '92%' },
  premiumModalScroll: { paddingHorizontal: 5, paddingBottom: 30 },
  premiumIntro: { position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 12, marginBottom: 16, backgroundColor: '#F2EAFE' },
  premiumIntroMinimal: { borderRadius: 1, backgroundColor: '#111111', borderTopWidth: 5, borderTopColor: '#777777' },
  premiumIntroChic: { backgroundColor: '#F7DCE6', borderWidth: 1, borderColor: '#EABCCB' },
  premiumIntroPlate: { zIndex: 2, backgroundColor: 'rgba(255,255,255,0.84)', borderRadius: 17, padding: 17 },
  premiumIntroPlateMinimal: { backgroundColor: 'transparent', borderRadius: 0 },
  premiumIntroBrand: { color: '#6D52B5', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  premiumIntroBrandMinimal: { color: '#A8A8A8' },
  premiumIntroTitle: { color: '#2E2934', fontSize: 24, lineHeight: 31, fontWeight: '900', marginTop: 7 },
  premiumIntroTitleMinimal: { color: '#FFFFFF' },
  premiumIntroCopy: { color: '#6F6876', fontSize: 12, lineHeight: 19, marginTop: 8 },
  premiumIntroCopyMinimal: { color: '#CFCFCF' },
  premiumFeatureBlock: { position: 'relative', overflow: 'hidden', borderRadius: 22, backgroundColor: '#F2EEFA', borderWidth: 1, borderColor: '#DDD4EA', marginBottom: 14 },
  premiumFeatureMinimal: { borderRadius: 1, backgroundColor: '#F5F5F2', borderColor: '#1A1A1A', borderLeftWidth: 5 },
  premiumFeatureChic: { backgroundColor: '#F7DDE6', borderColor: '#E9BECB' },
  premiumFeatureInner: { zIndex: 2, padding: 13 },
  premiumFeatureTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  premiumFeatureNumber: { color: '#776789', fontSize: 18, fontWeight: '300', marginRight: 9 },
  premiumFeatureNumberMinimal: { color: '#111111', fontSize: 25, fontWeight: '900' },
  premiumFeatureLabel: { color: '#6952A8', backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, fontSize: 9, fontWeight: '900' },
  premiumFeatureBuddy: { marginLeft: 'auto', fontSize: 18 },
  premiumFeatureTextPlate: { marginTop: 10, paddingHorizontal: 3, paddingBottom: 2 },
  premiumFeatureTextMinimal: { borderTopWidth: 1, borderTopColor: '#A4A4A4', paddingTop: 11 },
  premiumFeatureTextChic: { alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.84)', borderRadius: 13, padding: 12 },
  premiumFeatureTitle: { color: '#302A36', fontSize: 17, lineHeight: 23, fontWeight: '900' },
  premiumFeatureTitleMinimal: { color: '#111111' },
  premiumFeatureDescription: { color: '#6E6675', fontSize: 11, lineHeight: 18, marginTop: 6 },
  premiumFeatureDescriptionMinimal: { color: '#444444' },
  premiumPreview: { backgroundColor: '#FFFFFF', borderRadius: 15, borderWidth: 1, borderColor: '#E2DDE7', padding: 12 },
  previewImageLabel: { color: '#9A929F', fontSize: 8, fontWeight: '900', letterSpacing: 0.6, marginBottom: 8 },
  previewScheduleRow: { flexDirection: 'row', alignItems: 'center', minHeight: 28, borderBottomWidth: 1, borderBottomColor: '#EEEAF0' },
  previewTime: { color: '#3D3743', fontSize: 10, fontWeight: '900', width: 42 },
  previewScheduleTitle: { color: '#3D3743', fontSize: 11, fontWeight: '800', flex: 1 },
  previewSource: { color: '#775FA9', backgroundColor: '#EEE7F8', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3, fontSize: 7, fontWeight: '900' },
  previewSourceRhythm: { color: '#8C5568', backgroundColor: '#F9DFE8' },
  previewFlow: { alignItems: 'center', marginTop: 9 }, previewFlowText: { color: '#4E4755', fontSize: 9, fontWeight: '800' }, previewArrow: { color: '#83778D', fontSize: 13, lineHeight: 15 }, previewFlowButton: { color: '#FFFFFF', backgroundColor: '#6F58B5', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 6, fontSize: 9, fontWeight: '900' },
  previewNotification: { flexDirection: 'row', gap: 9, padding: 9, backgroundColor: '#F3F0F5', borderRadius: 11, borderWidth: 1, borderColor: '#E3DEE7' },
  previewNotificationLater: { marginTop: 6, marginLeft: 13 }, previewNotificationTime: { color: '#6F6575', fontSize: 9, fontWeight: '900' }, previewNotificationTitle: { color: '#332E38', fontSize: 10, fontWeight: '900' }, previewNotificationCopy: { color: '#817987', fontSize: 8, marginTop: 2 },
  previewMetricLabel: { color: '#655E6C', fontSize: 10, fontWeight: '900' }, previewTimeCompare: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 10 }, previewCompareLabel: { color: '#918996', fontSize: 8, fontWeight: '800' }, previewCompareValue: { color: '#302A36', fontSize: 20, fontWeight: '900' }, previewCompareArrow: { color: '#A89EB0', fontSize: 17 }, previewMetricBig: { color: '#B65D78', fontSize: 22, fontWeight: '900', marginTop: 12 }, previewRecordCount: { color: '#928A98', fontSize: 8, fontWeight: '800', marginTop: 4 },
  previewInsightRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#ECE7EF', paddingVertical: 8 }, previewInsightLabel: { color: '#6D6474', fontSize: 9, fontWeight: '900', width: 54 }, previewInsightValue: { color: '#3D3743', fontSize: 9, fontWeight: '700', flex: 1 },
  previewPlanCompare: { alignItems: 'center' }, previewFreeWeek: { width: '100%' }, previewCompareTag: { color: '#655E6C', fontSize: 8, fontWeight: '900', marginBottom: 6 }, previewWeekRow: { flexDirection: 'row', justifyContent: 'space-between' }, previewWeekDay: { color: '#4B4550', fontSize: 7, borderWidth: 1, borderColor: '#DDD7E1', paddingHorizontal: 3, paddingVertical: 5 }, previewMonth: { width: '100%', backgroundColor: '#F5F1F7', borderRadius: 10, padding: 9 }, previewMonthTitle: { color: '#3B3541', fontSize: 10, fontWeight: '900' }, previewMonthWeek: { color: '#8B828F', fontSize: 8, marginTop: 6 }, previewMonthDays: { color: '#49424F', fontSize: 9, lineHeight: 16, fontWeight: '700' },
  premiumHistoryNote: { borderWidth: 1, borderColor: '#CFC7D5', borderRadius: 14, padding: 14, marginTop: 3, backgroundColor: 'rgba(255,255,255,0.62)' }, premiumHistoryTitle: { color: '#332E38', fontSize: 15, fontWeight: '900' }, premiumHistoryCopy: { color: '#736B79', fontSize: 10, lineHeight: 17, marginTop: 5 }, premiumHistoryRows: { marginTop: 9, borderTopWidth: 1, borderTopColor: '#DED8E2', paddingTop: 6 }, premiumHistoryRow: { color: '#5B5361', fontSize: 9, paddingVertical: 3 },
  premiumFuture: { backgroundColor: '#EEE8F5', borderRadius: 14, padding: 14, marginVertical: 14 }, premiumFutureTitle: { color: '#5E4A79', fontSize: 13, fontWeight: '900' }, premiumFutureCopy: { color: '#746A7E', fontSize: 10, lineHeight: 17, marginTop: 5 },
  premiumCarouselHeader: { paddingHorizontal: 8, paddingBottom: 10 },
  premiumCarouselBrand: { color: '#312B37', fontSize: 19, fontWeight: '900' },
  premiumCarouselCopy: { color: '#766E7C', fontSize: 11, marginTop: 3 },
  premiumCarouselArea: { flex: 1, overflow: 'hidden' },
  premiumHeaderClose: { minWidth: 74, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  premiumFeaturePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  premiumFeatureStage: { marginBottom: 10 },
  premiumEntryCard: { width: '48%', minHeight: 74, borderRadius: 16, borderWidth: 1, borderColor: '#DDD7E1', backgroundColor: '#FFF', padding: 10, overflow: 'hidden' },
  premiumEntryCardActive: { borderColor: '#6F58B5', backgroundColor: '#F1ECFF' },
  premiumEntryCardMinimal: { borderRadius: 2, borderColor: '#1A1A1A', backgroundColor: '#F8F8F8' },
  premiumEntryCardChic: { backgroundColor: '#FFF7FA', borderColor: '#F0D5DF' },
  premiumEntryPattern: { position: 'absolute', right: -4, top: -4, left: -4, bottom: -4, opacity: 0.18 },
  premiumEntryNumber: { color: '#8F8797', fontSize: 9, fontWeight: '900' },
  premiumEntryNumberActive: { color: '#6F58B5' },
  premiumEntryTitle: { color: '#3A3340', fontSize: 11, lineHeight: 15, fontWeight: '900', marginTop: 9 },
  premiumEntryTitleActive: { color: '#2A2440' },
  premiumGuideScroll: { paddingHorizontal: 4, paddingBottom: 24 },
  premiumGuideSection: { marginBottom: 12 },
  premiumSlideScroll: { paddingHorizontal: 4, paddingBottom: 8 },
  premiumCarouselFooter: { paddingHorizontal: 8, paddingTop: 6, paddingBottom: 10, alignItems: 'center' },
  premiumSwipeHint: { color: '#88808D', fontSize: 9, fontWeight: '700' },
  premiumCarouselControls: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  premiumCarouselControl: { minWidth: 70, paddingVertical: 7, paddingHorizontal: 10, alignItems: 'center' },
  premiumCarouselControlDisabled: { opacity: 0.25 },
  premiumCarouselControlText: { color: '#655E6A', fontSize: 12, fontWeight: '900' },
  premiumPageNumber: { color: '#403946', fontSize: 13, fontWeight: '900', marginTop: 5 },
  premiumIndicators: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 6 },
  premiumIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D5CFD9' },
  premiumCloseButton: { width: '100%', borderWidth: 1, paddingVertical: 10, alignItems: 'center', marginTop: 9 },
  premiumCloseButtonText: { fontSize: 12, fontWeight: '900' },
  previewTemplateSource: { borderWidth: 1, borderColor: '#DDD7E1', padding: 10, borderRadius: 10 },
  previewTemplateTitle: { color: '#352F3B', fontSize: 12, fontWeight: '900' },
  previewTemplateMeta: { color: '#756D7B', fontSize: 8, marginTop: 4 },
  previewTemplateSave: { color: '#FFFFFF', backgroundColor: '#7057B3', fontSize: 8, fontWeight: '900', textAlign: 'center', paddingVertical: 7, marginTop: 8, borderRadius: 7 },
  previewTemplateSaved: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F4EFF7', padding: 9, borderRadius: 9 },
  previewTemplateChoose: { color: '#6C54AA', fontSize: 9, fontWeight: '900' },
  previewTemplateReady: { color: '#5B5262', fontSize: 9, fontWeight: '800', textAlign: 'center', marginTop: 7 },
  previewDanger: { backgroundColor: '#FFE3E1', borderRadius: 9, padding: 8, marginBottom: 8 },
  previewDangerText: { color: '#A84646', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  previewRecoveryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  previewRecoveryOption: { width: '48%', backgroundColor: '#F0EBF5', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 5 },
  previewRecoveryText: { color: '#554A61', fontSize: 8, fontWeight: '900', textAlign: 'center' },
  taskTemplateSaveAction: { marginTop: 10, borderWidth: 1, borderColor: '#CFC4DB', backgroundColor: '#F7F2FA', padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskTemplateSaveTitle: { color: '#3B3341', fontSize: 13, fontWeight: '900' },
  taskTemplateSaveCopy: { color: '#7D7383', fontSize: 9, marginTop: 3 },
  taskTemplateSavePremium: { color: '#6F52B5', fontSize: 9, fontWeight: '900' },
  templateGroupLabel: { color: '#6A6270', fontSize: 10, fontWeight: '900', marginTop: 8, marginBottom: 7 },
  savedTemplatePicker: { marginBottom: 8 },
  savedTemplateEmpty: { color: '#857D8A', fontSize: 10, lineHeight: 16, paddingVertical: 8 },
  savedTemplateChips: { gap: 8, paddingBottom: 5 },
  savedTemplateChip: { width: 190, borderWidth: 1, borderColor: '#D9D0E2', backgroundColor: '#FBF8FD', padding: 11, borderRadius: 13 },
  savedTemplateChipTitle: { color: '#352F3B', fontSize: 12, fontWeight: '900' },
  savedTemplateChipCopy: { color: '#786F7E', fontSize: 9, lineHeight: 14, marginTop: 4 },
  savedTemplateChoose: { color: '#6D52B5', fontSize: 9, fontWeight: '900', marginTop: 7 },
  savedTemplateLocked: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D7CCDF', backgroundColor: '#F8F3FA', padding: 12, marginVertical: 8, borderRadius: 12 },
  savedTemplateLockedTitle: { color: '#403746', fontSize: 12, fontWeight: '900' },
  savedTemplateLockedCopy: { color: '#817687', fontSize: 9, lineHeight: 14, marginTop: 3 },
  savedTemplateSettingRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E4DFE7', paddingVertical: 10 },
  savedTemplateSettingTitle: { color: '#39323F', fontSize: 12, fontWeight: '900' },
  savedTemplateSettingCopy: { color: '#7B7280', fontSize: 9, lineHeight: 14, marginTop: 3 },
  devPlanLabel: { color: '#6E6674', fontSize: 10, fontWeight: '900', marginTop: 14, marginBottom: 7 },
  devPlanChoices: { flexDirection: 'row', gap: 8 },
  devPlanChoice: { flex: 1, borderWidth: 1, borderColor: '#D1CAD6', backgroundColor: '#F5F2F6', paddingVertical: 11, alignItems: 'center', borderRadius: 10 },
  devPlanChoiceText: { color: '#5C5561', fontSize: 12, fontWeight: '900' },
  devPlanChoiceTextActive: { color: '#FFFFFF' },
  devPlanCurrent: { color: '#4B4450', fontSize: 10, fontWeight: '900', marginTop: 9 },
  historyTaskActions: { alignItems: 'flex-end', gap: 5 },
  historyTemplateButton: { borderWidth: 1, borderColor: '#D2C7DA', paddingHorizontal: 9, paddingVertical: 5, alignItems: 'center' },
  historyTemplateButtonText: { color: '#55475E', fontSize: 9, fontWeight: '900' },
  historyTemplatePremium: { color: '#8061B5', fontSize: 6, fontWeight: '900' },
  benefit: { color: colors.ink, fontSize: 13, fontWeight: '700', paddingVertical: 7 },
  notReadyPill: { alignSelf: 'center', backgroundColor: colors.violetSoft, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, marginVertical: 14 },
  notReadyText: { color: colors.violet, fontSize: 11, fontWeight: '900' },
  calendarCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, marginBottom: 22 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  calendarMonth: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  calendarTotal: { color: colors.violet, fontSize: 10, fontWeight: '900' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLabel: { width: '14.285%', textAlign: 'center', color: colors.muted, fontSize: 10, fontWeight: '800' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.285%', height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  daySelected: { backgroundColor: colors.violet },
  dayNumber: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  dayNumberSelected: { color: '#FFFFFF', fontWeight: '900' },
  dayDone: { position: 'absolute', bottom: 2, right: 5, width: 15, height: 15, borderRadius: 8, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  dayDoneText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  historyHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  historyTask: { backgroundColor: colors.surface, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  historyIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  historyIconText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  minimalAchievement: { backgroundColor: '#111111', borderRadius: 4, padding: 19, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  minimalAchievementCompact: { padding: 14, marginTop: 14, marginBottom: 4 },
  minimalAchievementLabel: { color: '#999999', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  minimalAchievementNumber: { color: '#FFFFFF', fontSize: 42, lineHeight: 47, fontWeight: '300', letterSpacing: -2 },
  minimalAchievementNumberCompact: { fontSize: 30, lineHeight: 34 },
  minimalAchievementBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 43 },
  minimalAchievementBar: { width: 5, height: 12, backgroundColor: '#3B3B3B' },
  minimalAchievementBarFilled: { height: 38, backgroundColor: '#FFFFFF' },
  vesselScene: { backgroundColor: '#FFF0F5', borderRadius: 28, padding: 18, alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#FFFFFF', position: 'relative', overflow: 'hidden' },
  vesselSceneChic: { backgroundColor: '#FFF3F5', borderColor: '#F0DFE5' },
  vesselSceneCompact: { marginTop: 14, marginBottom: 4, padding: 12, borderRadius: 22 },
  vesselLabel: { alignItems: 'center', marginBottom: 9 },
  vesselLabelChic: { backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 9, zIndex: 2 },
  vesselLabelTop: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  vesselLabelTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 3 },
  vesselLabelTitleCompact: { fontSize: 15 },
  jarLid: { width: 116, height: 18, borderRadius: 7, backgroundColor: '#D7B98B', zIndex: 3 },
  jarBody: { width: 264, height: 132, borderRadius: 34, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: 'rgba(255,255,255,0.58)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.92)', overflow: 'hidden', position: 'relative', zIndex: 2 },
  jarBodyCompact: { width: 244, height: 82, borderRadius: 27, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  jarTreasure: { position: 'absolute', width: 31, height: 31, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  jarTreasureText: { fontSize: 17 },
  jarEmptyText: { color: colors.muted, fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 55 },
  vesselCaption: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 11, zIndex: 2 },
  monthStats: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  monthStat: { flex: 1, backgroundColor: colors.surface, borderRadius: 17, paddingVertical: 13, alignItems: 'center' },
  monthStatNumber: { color: colors.violet, fontSize: 22, fontWeight: '900' },
  monthStatLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', marginTop: 3 },
  todayMinimalWin: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CFCFCF', borderRadius: 4, padding: 13, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayWinComment: { color: colors.ink, fontSize: 13, fontWeight: '900', marginTop: 3 },
  todayWinHint: { color: colors.muted, fontSize: 8, fontWeight: '600', marginTop: 3 },
  todayMiniMeter: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 30 },
  todayMiniTick: { width: 5, height: 8, backgroundColor: '#DDDDDD' },
  todayMiniTickDone: { height: 28, backgroundColor: '#111111' },
  todayWinStrip: { paddingHorizontal: 4, paddingVertical: 7, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  todayWinStripChic: { minHeight: 118, borderRadius: 24, backgroundColor: '#FFF3F5', padding: 10, overflow: 'hidden' },
  todayWinsPaper: { flex: 1, minHeight: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  todayWinsTextPlate: { flex: 0, width: '58%', backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 12 },
  todayWinsPlain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  miniJarWrap: { width: 82, height: 78, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
  miniJarLid: { width: 47, height: 9, borderRadius: 4, backgroundColor: '#CDAE7B', zIndex: 2 },
  miniJar: { width: 72, height: 56, borderRadius: 17, borderTopLeftRadius: 11, borderTopRightRadius: 11, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 2, borderColor: '#FFFFFF', position: 'relative', overflow: 'hidden' },
  miniJarChicGlass: { backgroundColor: 'rgba(255,255,255,0.62)', borderColor: 'rgba(217,134,161,0.28)', shadowColor: '#D986A1', shadowOpacity: 0.15, shadowRadius: 7, shadowOffset: { width: 0, height: 4 } },
  miniJarItem: { position: 'absolute', fontSize: 13 },
  fallingTreasure: { position: 'absolute', top: 0, right: 31, fontSize: 17, zIndex: 4 },
  completedDetailRow: { backgroundColor: colors.surface, borderRadius: 16, padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 11 },
  completedDetailIcon: { color: colors.violet, fontSize: 20, fontWeight: '900' },
  completedDetailRowMinimal: { borderRadius: 0, borderWidth: 0, borderBottomWidth: 1, borderBottomColor: '#CFCFCA' },
  completedModalPattern: { position: 'absolute', width: '100%', height: 108, left: 0, top: 0, overflow: 'hidden', opacity: 0.45 },
  todayWinCount: { color: '#171715', fontSize: 32, lineHeight: 35, fontWeight: '900' },
  restoreButton: { height: 30, borderRadius: 9, backgroundColor: '#F1EDF5', paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  restoreButtonText: { color: colors.violet, fontSize: 8, fontWeight: '900' },
  historySearchBox: { height: 46, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E1EA', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 14 },
  historySearchClear: { color: colors.muted, fontSize: 17, fontWeight: '800', paddingHorizontal: 5 },
  recoveryHistorySection: { marginTop: 22 },
  recoveryHistoryRow: { minHeight: 62, borderRadius: 16, backgroundColor: '#FFFFFF', padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recoveryHistoryIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#FFF0E4', alignItems: 'center', justifyContent: 'center' },
  recoveryHistoryIconText: { color: '#B86A34', fontSize: 17, fontWeight: '900' },
  focusHistoryIcon: { backgroundColor: '#EEE9FF' },
  focusHistoryIconText: { color: colors.violet, fontSize: 15, fontWeight: '900' },
  guideCard: { minHeight: 70, borderRadius: 18, backgroundColor: '#282331', paddingHorizontal: 16, paddingVertical: 13, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guideCardTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  guideCardCopy: { color: '#C9C2D1', fontSize: 8, fontWeight: '700', marginTop: 4 },
  guideCardArrow: { color: '#FFFFFF', fontSize: 24 },
  notificationManagerCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E8E1EC' },
  notificationManagerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  notificationRefresh: { height: 32, borderRadius: 10, backgroundColor: '#F1EDF5', paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  notificationRefreshText: { color: colors.violet, fontSize: 9, fontWeight: '900' },
  notificationPendingRow: { minHeight: 42, borderTopWidth: 1, borderTopColor: '#F0ECF2', flexDirection: 'row', alignItems: 'center', gap: 9 },
  notificationPendingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.violet },
  notificationPendingTitle: { color: colors.ink, fontSize: 10, fontWeight: '900' },
  notificationPendingBody: { color: colors.muted, fontSize: 8, fontWeight: '600', marginTop: 2 },
  notificationMore: { color: colors.muted, fontSize: 8, fontWeight: '700', marginTop: 6 },
  notificationStopButton: { height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#D99AA1', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  notificationStopText: { color: '#B84C58', fontSize: 10, fontWeight: '900' },
  templateAddRow: { flexDirection: 'row', gap: 7, marginTop: 13 },
  templateInput: { flex: 1, height: 42, borderRadius: 12, backgroundColor: '#F5F1F7', paddingHorizontal: 12, color: colors.ink, fontSize: 10, fontWeight: '700' },
  templateAddButton: { width: 58, height: 42, borderRadius: 12, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
  templateAddButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  templateList: { marginTop: 10, gap: 6 },
  templateRow: { minHeight: 38, borderRadius: 11, backgroundColor: '#FAF8FB', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  templateRowText: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  templateDelete: { color: '#B95B67', fontSize: 17, fontWeight: '700', paddingHorizontal: 5 },
  guideIntro: { color: colors.muted, fontSize: 11, marginBottom: 15 },
  guideStep: { flexDirection: 'row', gap: 11, alignItems: 'center', marginBottom: 13 },
  guideStepNumber: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.violetSoft, alignItems: 'center', justifyContent: 'center' },
  guideStepNumberText: { color: colors.violet, fontSize: 11, fontWeight: '900' },
  guideStepTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' },
  guideStepCopy: { color: colors.muted, fontSize: 8, fontWeight: '600', marginTop: 2 },
  compactTodayHeader: { minHeight: 42, borderRadius: 14, backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 9, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#EEE9F2' },
  compactTodayHeaderMinimal: { borderRadius: 2, borderColor: '#1A1A1A', backgroundColor: '#F8F8F8' },
  compactTodayHeaderChic: { minHeight: 138, borderRadius: 26, backgroundColor: '#FFF3F5', borderColor: '#F0DFE5', shadowColor: '#D986A1', shadowOpacity: 0.1, shadowRadius: 10, padding: 14 },
  compactTodayTime: { color: colors.ink, fontSize: 27, lineHeight: 29, fontWeight: '800', letterSpacing: -1.2 },
  compactTodayDate: { color: colors.muted, fontSize: 8, fontWeight: '800', marginTop: 2 },
  compactTodayMessage: { flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(100,90,105,0.15)', paddingLeft: 14 },
  compactTodayKicker: { color: colors.violet, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  compactTodayKickerChic: { color: '#C9507B', letterSpacing: 1.1 },
  compactTodayCopy: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '800' },
  quickAddCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E1EC', borderRadius: 18, padding: 14, marginBottom: 12 },
  quickAddCardMinimal: { borderRadius: 2, borderColor: '#1A1A1A', backgroundColor: '#F8F8F8' },
  quickAddCardChic: { backgroundColor: '#FFF7FA', borderColor: '#F2D7E1' },
  quickAddTitle: { color: colors.ink, fontSize: 12, fontWeight: '900', marginBottom: 8 },
  quickAddInput: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#DDD7E1', backgroundColor: '#FFF', paddingHorizontal: 12, color: colors.ink, fontSize: 13, fontWeight: '700' },
  quickAddHint: { color: colors.muted, fontSize: 8, fontWeight: '700', marginTop: 6 },
  quickAddButton: { alignSelf: 'flex-end', minWidth: 74, height: 34, borderRadius: 10, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  quickAddButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  todayHeaderInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 2 },
  chicTodayPaper: { flex: 0, width: '68%', minHeight: 108, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.84)', zIndex: 2 },
  chicTodayStats: { color: '#8B7B82', fontSize: 9, fontWeight: '800', marginTop: 8 },
  todayMinimalIndex: { width: 34, height: 29, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' },
  todayMinimalIndexText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  todayChicMark: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFD1E1', alignItems: 'center', justifyContent: 'center' },
  todayChicMarkText: { color: '#C84F7A', fontSize: 18 },
  todayChicSpark: { color: '#E5A34A', fontSize: 17, paddingRight: 2 },
  chicHeaderPatternCutout: { position: 'absolute', width: '31%', right: 0, top: 0, bottom: 0, overflow: 'hidden' },
  bucketTabs: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  bucketTab: { flex: 1, height: 38, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E1EA', alignItems: 'center', justifyContent: 'center' },
  bucketTabActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  bucketTabMinimal: { borderRadius: 2, borderColor: '#BDBDBD' },
  bucketTabChic: { borderRadius: 15, backgroundColor: '#FFF8FB', borderColor: '#F5D5E0' },
  bucketTabActiveChic: { backgroundColor: '#D95F8A', borderColor: '#D95F8A' },
  bucketTabText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  bucketTabTextActive: { color: '#FFFFFF' },
  timelineShortcutCompact: { minHeight: 48, borderRadius: 13, backgroundColor: '#F2EEF6', paddingHorizontal: 13, paddingVertical: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineShortcutTitle: { color: colors.ink, fontSize: 10, fontWeight: '900' },
  timelineShortcutMeta: { color: colors.muted, fontSize: 8, fontWeight: '700', marginTop: 3 },
  timelineShortcutArrow: { color: colors.violet, fontSize: 22, fontWeight: '700' },
  homeToolRow: { flexDirection: 'row', gap: 7, marginBottom: 11 },
  homeToolCard: { flex: 1, minHeight: 76, borderRadius: 16, padding: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E1EC', position: 'relative', overflow: 'hidden' },
  homeToolCardMinimal: { borderRadius: 2, borderColor: '#1A1A1A', backgroundColor: '#F7F7F7' },
  homeToolCardChic: { borderRadius: 21, padding: 6, borderColor: 'rgba(217,134,161,0.18)' },
  homeToolGlass: { width: '72%', minHeight: 63, alignSelf: 'flex-start', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.82)', paddingHorizontal: 9, paddingVertical: 8, zIndex: 2 },
  homeToolPlain: { flex: 1 },
  homeToolIcon: { color: colors.violet, fontSize: 14, fontWeight: '900' },
  homeToolTitle: { color: colors.ink, fontSize: 11, fontWeight: '900', marginTop: 4 },
  homeToolMeta: { color: colors.muted, fontSize: 8, fontWeight: '700', marginTop: 2 },
  taskSearchRow: { flexDirection: 'row', gap: 7, marginBottom: 8 },
  taskSearchBox: { flex: 1, height: 43, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E1EA', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11 },
  taskSearchIcon: { color: colors.muted, fontSize: 17, marginRight: 7 },
  taskSearchInput: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '700', paddingVertical: 0 },
  taskSortButton: { width: 76, height: 43, borderRadius: 13, backgroundColor: '#F0ECF4', alignItems: 'center', justifyContent: 'center' },
  taskSortLabel: { color: colors.muted, fontSize: 7, fontWeight: '700' },
  taskSortValue: { color: colors.violet, fontSize: 9, fontWeight: '900', marginTop: 2 },
  taskBucketButton: { minWidth: 49, height: 28, borderRadius: 8, paddingHorizontal: 6, backgroundColor: '#F0ECF4', alignItems: 'center', justifyContent: 'center' },
  taskBucketButtonText: { color: colors.violet, fontSize: 8, fontWeight: '900' },
  taskMoreButton: { width: 29, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  taskMoreText: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  nudgeBadge: { backgroundColor: '#FFE3EA', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  nudgeBadgeText: { color: '#B74469', fontSize: 7, fontWeight: '900' },
  bucketModalBackdrop: { flex: 1, backgroundColor: 'rgba(28,22,32,0.42)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  bucketModalCard: { width: '100%', maxWidth: 390, backgroundColor: '#FFFFFF', borderRadius: 25, padding: 20 },
  bucketModalTitle: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  bucketModalTask: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 5, marginBottom: 15 },
  bucketModalOption: { minHeight: 62, borderRadius: 15, borderWidth: 1, borderColor: '#EAE4ED', paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bucketModalOptionActive: { borderColor: colors.violet, backgroundColor: '#F5F1FF' },
  bucketModalOptionTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  bucketModalOptionCopy: { color: colors.muted, fontSize: 9, fontWeight: '600', marginTop: 3 },
  bucketModalOptionCheck: { color: colors.violet, fontSize: 16, fontWeight: '900' },
  taskActionCard: { width: '100%', maxWidth: 390, backgroundColor: '#FFFFFF', borderRadius: 25, padding: 20 },
  taskActionHint: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 5, marginBottom: 15 },
  taskActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  taskActionOption: { width: '48.5%', minHeight: 70, borderRadius: 16, backgroundColor: '#F5F1F7', alignItems: 'center', justifyContent: 'center' },
  taskActionIcon: { color: colors.violet, fontSize: 18, fontWeight: '900' },
  taskActionLabel: { color: colors.ink, fontSize: 10, fontWeight: '900', marginTop: 5 },
  taskActionDelete: { backgroundColor: '#FFF0F1' },
  taskActionDeleteText: { color: '#C54D58' },
  scheduleCalendarCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#EEE9F2' },
  scheduleCalendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  scheduleMonthArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F0F7', alignItems: 'center', justifyContent: 'center' },
  scheduleMonthArrowText: { color: colors.ink, fontSize: 26, lineHeight: 28, fontWeight: '500' },
  scheduleMonthTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  scheduleMonthCopy: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  scheduleWeekRow: { flexDirection: 'row', marginBottom: 4 },
  scheduleWeekLabel: { width: '14.285%', textAlign: 'center', color: colors.muted, fontSize: 9, fontWeight: '800' },
  scheduleGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  scheduleDayCell: { width: '14.285%', height: 66, borderRadius: 8, alignItems: 'center', paddingTop: 4, paddingHorizontal: 2, borderWidth: 0.5, borderColor: '#F0EBF2' },
  scheduleDayCellMinimal: { borderRadius: 0, borderColor: '#CFCFCA' },
  calendarPatternCorner: { position: 'absolute', width: '30%', height: 78, right: 0, top: 0, overflow: 'hidden', opacity: 0.55 },
  scheduleDayCellSelected: { backgroundColor: colors.violet },
  scheduleDayNumber: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  scheduleTodayNumber: { color: '#D95887', textDecorationLine: 'underline' },
  scheduleSelectedText: { color: '#FFFFFF', textDecorationLine: 'none' },
  scheduleMarkers: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  scheduleTaskMarker: { minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: '#FFD2DF', alignItems: 'center', justifyContent: 'center' },
  scheduleMarkerText: { color: '#A43E63', fontSize: 8, fontWeight: '900' },
  schedulePlanMarker: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#75C8C0' },
  scheduleEventStack: { width: '100%', marginTop: 4, gap: 2 },
  scheduleEventBar: { width: '100%', minHeight: 16, borderRadius: 3, paddingHorizontal: 3, justifyContent: 'center' },
  schedulePlanBar: { backgroundColor: '#D9D3FF' },
  scheduleEventBarText: { color: '#443A48', fontSize: 7, lineHeight: 10, fontWeight: '800' },
  scheduleMoreText: { color: colors.muted, fontSize: 7, fontWeight: '800', paddingLeft: 2 },
  scheduleLegend: { flexDirection: 'row', justifyContent: 'center', gap: 17, marginTop: 8 },
  scheduleLegendText: { color: '#C4567E', fontSize: 8, fontWeight: '800' },
  scheduleLegendPlan: { color: '#45A39A', fontSize: 8, fontWeight: '800' },
  scheduleAgendaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  scheduleAgendaItem: { backgroundColor: '#FFFFFF', borderRadius: 17, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#EEE9F2' },
  scheduleAgendaDanger: { borderColor: '#EE9C9C', backgroundColor: '#FFF7F7' },
  scheduleAgendaDot: { width: 10, height: 10, borderRadius: 5 },
  scheduleAgendaTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  scheduleAgendaMeta: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 4 },
  scheduleAgendaEdit: { color: colors.violet, fontSize: 9, fontWeight: '900' },
  focusHero: { backgroundColor: '#17151C', borderRadius: 26, padding: 22, alignItems: 'center', marginBottom: 22 },
  focusHeroChic: { backgroundColor: '#2E242B', borderWidth: 1, borderColor: '#59434E', shadowColor: '#D986A1', shadowOpacity: 0.12, shadowRadius: 18, overflow: 'hidden' },
  focusChicFlowerOne: { position: 'absolute', top: 18, left: 20, opacity: 0.35 },
  focusChicFlowerTwo: { position: 'absolute', top: 74, right: 26, opacity: 0.4 },
  focusEyebrow: { color: '#AFA6C5', fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  focusEyebrowLight: { color: '#E8CDD7' },
  focusTitle: { color: '#FFFFFF', fontSize: 22, lineHeight: 29, fontWeight: '900', textAlign: 'center', marginTop: 12 },
  focusTitleLight: { color: '#FFFFFF' },
  focusCopy: { color: '#BDB7C7', fontSize: 10, fontWeight: '700', marginTop: 5 },
  focusCopyLight: { color: '#D7C8CE' },
  focusTimerRing: { width: 172, height: 172, borderRadius: 86, borderWidth: 9, borderColor: '#8370E8', alignItems: 'center', justifyContent: 'center', marginVertical: 23, backgroundColor: '#211E29' },
  focusTimerRingChic: { borderColor: '#D986A1', backgroundColor: '#392E35' },
  focusTime: { color: '#FFFFFF', fontSize: 39, fontWeight: '300', letterSpacing: -1.5 },
  focusTimeLight: { color: '#FFFFFF' },
  focusTimerState: { color: '#BDB2FF', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  focusTimerStateChic: { color: '#D2668C' },
  focusProgressTrack: { width: '100%', height: 5, borderRadius: 3, backgroundColor: '#35303F', overflow: 'hidden' },
  focusProgressTrackLight: { backgroundColor: 'rgba(86,65,76,0.12)' },
  focusProgressFill: { height: '100%', borderRadius: 3, backgroundColor: '#A794FF' },
  focusProgressFillChic: { backgroundColor: '#ED8DAE' },
  focusActions: { width: '100%', flexDirection: 'row', gap: 9, marginTop: 18 },
  focusResetButton: { flex: 0.7, height: 46, borderRadius: 14, borderWidth: 1, borderColor: '#514B5B', alignItems: 'center', justifyContent: 'center' },
  focusResetButtonLight: { borderColor: 'rgba(91,67,78,0.25)', backgroundColor: 'rgba(255,255,255,0.45)' },
  focusResetText: { color: '#D4CEDC', fontSize: 11, fontWeight: '800' },
  focusResetTextLight: { color: '#6F5C65' },
  focusStartButton: { flex: 1, height: 46, borderRadius: 14, backgroundColor: '#8874EC', alignItems: 'center', justifyContent: 'center' },
  focusStartButtonChic: { backgroundColor: '#E8759D' },
  focusStartText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  focusSectionTitle: { color: colors.ink, fontSize: 13, fontWeight: '900', marginBottom: 10 },
  focusDurationRow: { flexDirection: 'row', gap: 7, marginBottom: 22 },
  focusDurationChip: { flex: 1, height: 39, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E1EA', alignItems: 'center', justifyContent: 'center' },
  focusDurationChipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  focusDurationText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  focusDurationTextActive: { color: '#FFFFFF' },
  focusTaskRow: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#EEE9F2' },
  focusTaskRowActive: { borderColor: colors.violet, backgroundColor: '#F5F2FF' },
  focusTaskTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  focusTaskMeta: { color: colors.muted, fontSize: 8, fontWeight: '700', marginTop: 3 },
  focusTaskCheck: { color: colors.violet, fontSize: 14, fontWeight: '900' },
  bottomNav: { position: 'absolute', left: 18, right: 18, bottom: 14, height: 74, backgroundColor: colors.surface, borderRadius: 25, flexDirection: 'row', alignItems: 'center', shadowColor: '#372F4A', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  bottomNavMinimal: { left: 0, right: 0, bottom: 0, borderRadius: 0, height: 66, borderTopWidth: 1, borderTopColor: '#C8C8C8', shadowOpacity: 0 },
  bottomNavChic: { backgroundColor: '#FFF7FA', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#D96C9B', shadowOpacity: 0.16 },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { color: '#A39DAA', fontSize: 20, fontWeight: '900' },
  navLabel: { color: '#A39DAA', fontSize: 10, fontWeight: '800' },
  navActive: { color: colors.violet },
});
