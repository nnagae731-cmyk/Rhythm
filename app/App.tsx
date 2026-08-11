import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { ChicCheckColor, ChicPattern, DesignMode, chicCheckColorChoices, getChicCheckColor, getThemeTokens, normalizeChicCheckColor, normalizeChicPattern } from './theme';
import { RecoveryRecord } from './recovery';
import { createCompletedFocusSession, createFocusSessionId, FocusSession } from './focusSession';
import { createDepartureCheckIn, DepartureCheckIn } from './departureCheckIn';
import { getChicPatternFeatureId, getEffectiveChicPattern, getEffectiveNudgeMode, hasPremiumAccess, PlanTier } from './premiumAccess';
import { AnalysisScreen } from './AnalysisScreen';
import { BThemeRibbonDecoration, BThemeRibbonPreload } from './components/BThemeRibbonDecoration';
import { CThemeRibbonDecoration, CThemeRibbonPreload } from './components/CThemeRibbonDecoration';
import { appendBehaviorEvent, appendBehaviorEvents, BehaviorEvent, createDeparturePreparationStartedEvent, createDepartureStartedEvent, createFocusCompletedBehaviorEvent, createFocusStartedEvent, createFocusStoppedEvent, createNotificationActionEvent, createNotificationScheduledEvent, createTaskCompletedBehaviorEvent, NotificationAction } from './behaviorEvents';
import { DEFAULT_PREMIUM_GUIDE_FEATURE, PremiumGuideFeatureId } from './premiumGuide';
import { createPremiumTaskTemplate, hasSameTemplateSettings, PremiumTaskTemplate, summarizePremiumTaskTemplate } from './taskTemplates';
import { Header } from './components/Header';
import { HomeScreen } from './screens/HomeScreen';
import { TimelineScreen } from './screens/TimelineScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { TaskModal } from './components/TaskModal';
import { PremiumModal } from './components/PremiumModal';
import { BottomNav } from './components/BottomNav';
import { GuideModal } from './components/GuideModal';
import { RecoveryModal } from './components/RecoveryModal';
import { styles } from './styles/appStyles';
import { Screen, TimeTab, WidgetSize, Category, Priority, RepeatRule, NudgeMode, ThemeMode, UrgencyStatus, Task, DeparturePlan, PersistedState, WishMonthMap, MonthlyWishState, MonthlyReview, WishAction, SharedEvent, SharedParticipantPrefs, CalendarMarks, DeparturePreparationStatus } from './types';
import { initialPlan } from './storage/rhythmState';
import { loadRhythmState, saveRhythmState } from './storage/rhythmStorage';
import { categories, priorities, completionIcons, categoryColors, designModes, chicUtilityPalettes } from './features/tasks/taskUtils';
import { createSharedEventPacket, createSharedEventToken, encodeSharedEventLink, normalizeSharedEvent, parseSharedEventLink, upsertSharedEvent } from './features/shared/sharedUtils';
import { getMonthlyWishState, wishMonthKey } from './features/wish/wishUtils';
import { cancelPendingTaskNotifications } from './features/tasks/taskNotifications';
import { cancelPendingDepartureNotifications } from './features/departure/departureNotifications';
import { WishScreen } from './WishScreen';
import { SharedEventScreen } from './SharedEventScreen';
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isCompletionFeedback = notification.request.content.data?.completionFeedback === true;
    return {
      shouldShowBanner: !isCompletionFeedback,
      shouldShowList: !isCompletionFeedback,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});


const COMPLETION_CHIME_URI = 'data:audio/wav;base64,UklGRqUPAABXQVZFZm10IBAAAAABAAEAIlYAACJWAAABAAgAZGF0YYEPAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIBnam5zeX+GjJGWmZqamJWQioR+d3FtaWdmZ2ltc3h/hYyRlZiampiVkIuFfnhybWlnZmdpbXJ4f4WLkZWYmpqYlZGLhX54cm1pZ2ZnaW1yeH6Fi5CVmJqamJWRi4V/eHJtaWdmZ2ltcnd+hIuQlZiampiVkYyGf3lzbmpnZmdpbHF3fYSKkJSYmpqZlpGMhoB5c25qZ2ZmaWxxd32EipCUmJqamZaSjIaAeXNuamdmZmhscXZ9g4mPlJiampmWko2HgHp0bmpnZmZobHB2fIOJj5SXmZqZlpKNh4F6dG9qZ2ZmaGtwdnyCiY+Tl5mamZaTjYeBe3Rva2hmZmhrcHV8goiOk5eZmpmXk46IgXt1b2toZmZoa291e4KIjpOXmZqZl5OOiIJ7dXBraGZmaGtvdXuBiI6Tl5mamZeTjoiCfHVwa2hmZmhrb3R6gYeNkpaZmpmXlI+Jgnx2cGtoZmZnam90eoGHjZKWmZqZl5SPiYN8dnBsaGZmZ2pudHqAh42SlpmampiUj4qDfXZxbGhmZmdqbnN5gIaMkpaZmpqYlJCKhH13cWxpZ2Znam5zeX+GjJGWmZqamJSQioR9d3FsaWdmZ2puc3l/hoyRlZiampiVkIuEfndybWlnZmdpbXJ4f4WLkZWYmpqYlZCLhX54cm1pZ2ZnaW1yeH6Fi5GVmJqamJWRi4V/eHJtaWdmZ2ltcnh+hYuQlZiampiVkYyFf3lzbWlnZmdpbXF3foSKkJWYmpqZlpGMhn95c25qZ2ZnaWxxd32EipCUmJqamZaSjIaAeXNuamdmZmlscXd9g4qPlJiampmWko2GgHp0bmpnZmZobHF2fYOJj5SXmpqZlpKNh4B6dG9qZ2ZmaGxwdnyDiY+Ul5mamZaSjYeBenRvamhmZmhrcHZ8gomOk5eZmpmXk46IgXt1b2toZmZoa3B1e4KIjpOXmZqZl5OOiIJ7dW9raGZmgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIB+hYySlpeWkoyFfnZwa2lpbHF4f4eOk5aXlZGLhHx1b2tpam1zeoGJj5SXl5SQiYJ6c25qaWpudHuDipGVl5aTjoiAeHJtamlrb3Z9hYySlpeWko2GfndwbGlpbHF3f4aNk5aXlZGLhHx1b2tpam1yeYGIj5SXl5WQioJ7dG5qaWpudHuCipCVl5eUj4iAeXJtamlrb3V9hIuRlZeWk42Gf3dxbGlpbHB3foaNk5aXlpKMhX12b2tpam1yeYCIjpSXl5WQioN7dG5qaWpuc3qCiZCUl5eUj4mBeXJtamlrb3V8hIuRlZeWk46Hf3hxbGlpa3B2foaNkpaXlpKMhX12cGtpaWxxeICHjpOWl5WRi4N8dG5qaWptc3qBiY+Ul5eUj4mBenNtamlqbnR8g4uRlZeWk46HgHhxbGlpa3B2fYWMkpaXlpKNhn52cGtpaWxxeH+HjpOWl5WRi4R8dW9raWptcnmBiY+Ul5eUkImCenNuamlqbnR7g4qQlZeXlI6IgHlybWppa292fYWMkpaXlpONhn53cGxpaWxxd3+GjZOWl5WRi4R9dW9raWptcnmAiI+Ul5eVkIqCe3RuamlqbnR7goqQlZeXlI+IgXlybWppa291fISLkZWXlpONhn93cWxpaWxwd36GjZKWl5aSjIV9dm9raWptcniAiI6TlpeVkYqDe3RuamlqbnN6gomQlJeXlI+JgXpzbWppa291fISLkZWXlpOOh394cWxpaWtwdn6FjJKWl5aSjIV+dnBraWlscXiAh46TlpeVkYuDfHVva2lqbXN6gYmPlJeXlJCJgnpzbWppam50e4OKkZWXlpOOh4B4cmxpaWtwdn2FjJKWl5aSjYZ+d3BsaWlscXd/h46TlpeVkYuEfHVva2lqbXJ5gYiPlJeXlZCKgnpzbmppam50e4OKkJWXl5SPiIB5cm1qaWtvdX2EjJKWl5aTjYZ/d3FsaWlscXd/ho2TlpeWkoyEfXVva2lqbXJ5gIiPlJeXlZCKg3t0bmppam5zeoKKkJWXl5SPiIF5cm2AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICEe3NubG5zfISNkpSSjYV8dG5sbnN7hIySlJKNhXx0bmxtc3qDjJKUk46GfXVvbG1yeoOLkZSTjoZ9dW9sbXJ5gouRlJOOh352b2xtcXmCipGUk4+Hf3ZvbG1xeIGKkJSTj4h/d3BsbXF4gYmQlJSQiIB3cGxscHeAiZCUlJCJgHhwbGxwd3+Ij5OUkImBeHFtbHB2f4iPk5SRioF5cW1sb3Z+h4+TlJGKgnlybWxvdX6HjpOUkYuDenJtbG91fYaOk5SRi4N6cm1sbnR9ho2TlJKMhHtzbmxudHyFjZKUkoyEe3NubG5zfISNkpSSjYV8dG5sbnN7hIySlJKNhXx0bmxtc3qDjJKUk46GfXVvbG1yeoOLkZSTjoZ9dW9sbXJ5gouRlJOOh352b2xtcXmCipGUk4+Hf3ZvbG1xeIGKkJSTj4h/d3BsbXF4gYmQlJSQiIB3cGxscHeAiZCUlJCJgHhwbGxwd3+Ij5OUkImBeHFtbHB2f4iPk5SRioF5cW1sb3Z+h4+TlJGKgnlybWxvdX6HjpOUkYuDenJtbG91fYaOk5SRi4N6cm1sbnR9ho2TlJKMhHtzbmxudHyFjZKUkoyEe3NubG5zfISNkpSSjYV8dG5sbnN7hIySlJKNhXx0bmxtc3qDjJKUk46GfXVvbG1yeoOLkZSTjoZ9dW9sbXJ5gouRlJOOh352b2xtcXmCipGUk4+Hf3ZvbG1xeIGKkJSTj4h/d3BsbXF4gYmQlJSQiIB3cGxscHeAiZCUlJCJgHhwbGxwd3+Ij5OUkImBeHFtbHB2f4iPk5SRioF5cW1sb3Z+h4+TlJGKgnlybWxvdX6HjpOUkYuDenJtbG91fYaOk5SRi4N6cm1sbnR9ho2TlJKMhHtzbmxudHyFjZKUkoyEe3NubG5zfISNkpSSjYV8dG5sbnN7hIySlJKNhXx0bmxtc3qDjJKUk46GfXVvbG1yeoOLkZSTjoZ9dW9sbXJ5gouRlJOOh352b2xtcXmCipGUk4+Hf3ZvbG1xeIGKkJSTj4h/d3BsbXF4gYmQlJSQiIB3cGxscHeAiZCUlJCJgHhwbGxwd3+Ij5OUkImBeHFtbHB2f4iPk5SRioF5cW1sb3Z+gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA=';

async function playCompletionSound() {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri: COMPLETION_CHIME_URI }, { shouldPlay: true, volume: 0.7 });
    setTimeout(() => { void sound.unloadAsync(); }, 500);
    return;
  } catch {
    // Expo Goや端末側で音声再生が使えない場合は、通知音へフォールバック。
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'タスク完了', sound: 'default', data: { completionFeedback: true } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, repeats: false },
    });
  } catch {
    // 通知権限がない端末でも、完了処理そのものは失敗させない。
  }
}

function parseClock(clock: string) {
  const [rawHours = '0', rawMinutes = '0'] = clock.split(':');
  const hours = Math.min(23, Math.max(0, Number(rawHours) || 0));
  const minutes = Math.min(59, Math.max(0, Number(rawMinutes) || 0));
  return hours * 60 + minutes;
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

function normalizePlanDate(day: string | undefined) {
  const match = day?.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`;
  return todayInputValue();
}

function planDateKey(plan: DeparturePlan) {
  return normalizePlanDate(plan.date);
}

function isPlanOnDate(plan: DeparturePlan, day: string) {
  return planDateKey(plan) === normalizePlanDate(day);
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
        createdAt: task.createdAt,
        done: false,
        completedAt: undefined,
        deadlineDate: task.deadlineDate ? advanceDateValue(task.deadlineDate, rule) : undefined,
        remindDate: task.remindDate ? advanceDateValue(task.remindDate, rule) : undefined,
        scheduledDate: advanceDateValue(task.scheduledDate ?? dateKey(), rule),
        scheduledTime: task.scheduledTime,
        isRoutine: task.isRoutine,
        routineId: task.routineId ?? (task.isRoutine ? task.id : undefined),
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
  const arrival = dateForReminder(planDateKey(plan), plan.arrival);
  const leave = new Date(arrival.getTime() - (plan.travelMinutes + plan.bufferMinutes) * 60_000);
  const prepare = new Date(leave.getTime() - plan.preparationMinutes * 60_000);
  return { arrival, leave, prepare };
}

function getPlanDestinationQuery(plan: DeparturePlan) {
  return (plan.destination?.trim() || plan.title.trim()).trim();
}

function PremiumRoutePreview({ plan, now, designMode, onOpenMap }: { plan: DeparturePlan; now: Date; designMode: DesignMode; onOpenMap: (query: string) => void }) {
  const theme = getThemeTokens(designMode);
  const isDark = designMode === 'dark';
  const destinationQuery = getPlanDestinationQuery(plan);
  const moments = getDepartureMoments(plan);

  const urgencyText = getNextBestAction({ ...plan, title: plan.title, category: '予定', priority: '中', done: false, id: 'route-preview' }, now);
  const destinationLabel = destinationQuery || '目的地を入れると表示されます';

  return (
    <View style={[styles.routePreviewCard, { borderColor: isDark ? '#D6D9DE' : theme.colors.border, backgroundColor: isDark ? '#FFFFFF' : theme.colors.surface }]}>
      <View style={styles.routePreviewHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.routePreviewBadge}>PREMIUM</Text>
          <Text style={[styles.routePreviewTitle, isDark && styles.darkBodyText]}>間に合う出発プランを整える</Text>
          <Text style={[styles.routePreviewCopy, isDark && styles.darkAccentText]}>登録した移動時間をもとに、準備・出発・余裕時間をまとめて逆算できます。</Text>
        </View>
        <Pressable style={styles.routePreviewOpenButton} onPress={() => onOpenMap(destinationQuery)}>
          <Text style={styles.routePreviewOpenButtonText}>地図を開く</Text>
        </Pressable>
      </View>

      <View style={styles.routePreviewBody}>
        <View style={styles.routePreviewMapFrame}>
          <View style={styles.routePreviewPlanGrid}>
            <View style={styles.routePreviewPlanBadge}>
              <Text style={[styles.routePreviewPlanBadgeLabel, isDark && styles.darkAccentText]}>想定経路</Text>
              <Text style={[styles.routePreviewPlanBadgeValue, isDark && styles.darkBodyText]}>自宅 → {destinationQuery || '目的地'}</Text>
            </View>
            <View style={styles.routePreviewPlanFlow}>
              <View style={styles.routePreviewPlanStop}>
                <Text style={[styles.routePreviewPlanStopLabel, isDark && styles.darkAccentText]}>自宅</Text>
                <Text style={[styles.routePreviewPlanStopValue, isDark && styles.darkBodyText]}>出発</Text>
              </View>
              <View style={styles.routePreviewPlanLine} />
              <View style={styles.routePreviewPlanStop}>
                <Text style={[styles.routePreviewPlanStopLabel, isDark && styles.darkAccentText]}>移動</Text>
                <Text style={[styles.routePreviewPlanStopValue, isDark && styles.darkBodyText]}>約{plan.travelMinutes}分</Text>
              </View>
              <View style={styles.routePreviewPlanLineShort} />
              <View style={styles.routePreviewPlanStop}>
                <Text style={[styles.routePreviewPlanStopLabel, isDark && styles.darkAccentText]}>到着</Text>
                <Text style={[styles.routePreviewPlanStopValue, isDark && styles.darkBodyText]}>{plan.arrival || '予定時刻'}</Text>
              </View>
            </View>
            <View style={styles.routePreviewPlanTimeRow}>
              <View style={styles.routePreviewPlanTimeCard}>
                <Text style={[styles.routePreviewPlanTimeLabel, isDark && styles.darkAccentText]}>準備開始</Text>
                <Text style={[styles.routePreviewPlanTimeValue, isDark && styles.darkBodyText]}>{formatLiveTime(moments.prepare)}</Text>
              </View>
              <View style={styles.routePreviewPlanTimeCard}>
                <Text style={[styles.routePreviewPlanTimeLabel, isDark && styles.darkAccentText]}>家を出る</Text>
                <Text style={[styles.routePreviewPlanTimeValue, isDark && styles.darkBodyText]}>{formatLiveTime(moments.leave)}</Text>
              </View>
            </View>
            <View style={styles.routePreviewPlanNote}>
              <Text style={[styles.routePreviewMapPlaceholderTitle, isDark && styles.darkBodyText]}>自宅からの所要時間</Text>
              <Text style={[styles.routePreviewMapPlaceholderCopy, isDark && styles.darkAccentText]}>約{plan.travelMinutes}分</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.routePreviewRisk, isDark && styles.darkBodyText]}>{urgencyText}</Text>
        <Text style={[styles.routePreviewLocation, isDark && styles.darkAccentText]}>{destinationLabel}</Text>
      </View>
    </View>
  );
}

function getMapSearchTarget(plan: DeparturePlan) {
  return (plan.destination?.trim() || plan.title || '').trim();
}

function buildMapSearchUrl(query: string) {
  const encoded = encodeURIComponent(query.trim());
  if (!encoded) return undefined;
  if (Platform.OS === 'ios') return `maps://?q=${encoded}`;
  if (Platform.OS === 'android') return `geo:0,0?q=${encoded}`;
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

async function openMapSearch(query: string) {
  const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
  const primaryUrl = buildMapSearchUrl(query);
  if (!primaryUrl) {
    Alert.alert('目的地を入れてね', '地図を開くには目的地が必要です。');
    return;
  }
  try {
    await Linking.openURL(primaryUrl);
  } catch {
    try {
      await Linking.openURL(fallbackUrl);
    } catch {
      Alert.alert('地図を開けませんでした', '目的地の入力を確認してもう一度試してね。');
    }
  }
}

function countdownToDate(target: Date, now: Date) {
  const minutes = Math.ceil((target.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return '出発時刻を過ぎました';
  if (minutes < 60) return `あと${minutes}分`;
  if (minutes < 24 * 60) return `あと${Math.floor(minutes / 60)}時間${minutes % 60}分`;
  return `あと${Math.floor(minutes / 1440)}日${Math.floor((minutes % 1440) / 60)}時間`;
}

function getChicPatternVisual(pattern: ChicPattern) {
  if (pattern === 'dot') return { background: '#FFF4F7', accent: '#D986A1', warm: '#A997C8' };
  if (pattern === 'checkBeigeNoir') return { background: '#FBF4EA', accent: '#C9B49A', warm: '#191614' };
  if (pattern === 'checkMauveFrame') return { background: '#FFF2F6', accent: '#B9778F', warm: '#E2B6C2' };
  if (pattern === 'checkLavenderSatin') return { background: '#F7F2FC', accent: '#B9ADD8', warm: '#DDD4EE' };
  return { background: '#FFF4F7', accent: '#D986A1', warm: '#A997C8' };
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
  await Notifications.setNotificationCategoryAsync('PREPARATION_ACTIONS', [
    { identifier: 'PREPARING', buttonTitle: '準備中', options: { opensAppToForeground: false } },
    { identifier: 'PREPARED', buttonTitle: '準備完了', options: { opensAppToForeground: false } },
    { identifier: 'PREPARE_LATER', buttonTitle: 'まだ', options: { opensAppToForeground: false } },
  ]);
  return true;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [timelineInitialTab, setTimelineInitialTab] = useState<TimeTab>('departure');
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = React.useRef<Task[]>([]);
  const hydratedRef = React.useRef(false);
  const pendingNotificationCompletionIdsRef = React.useRef<string[]>([]);
  const pendingDepartureCheckInIdsRef = React.useRef<string[]>([]);
  const pendingDeparturePreparationIdsRef = React.useRef<Array<{ id: string; status: DeparturePreparationStatus }>>([]);
  const [plan, setPlan] = useState<DeparturePlan>(initialPlan);
  const [departurePlans, setDeparturePlans] = useState<DeparturePlan[]>([]);
  const departurePlansRef = React.useRef<DeparturePlan[]>([]);
  const [departureCheckIns, setDepartureCheckIns] = useState<DepartureCheckIn[]>([]);
  const departureCheckInsRef = React.useRef<DepartureCheckIn[]>([]);
  const [departurePreparationStatuses, setDeparturePreparationStatuses] = useState<Record<string, DeparturePreparationStatus>>({});
  const [widgetSize, setWidgetSize] = useState<WidgetSize>('medium');
  const [showCompleted, setShowCompleted] = useState(false);
  const [completionIcon, setCompletionIcon] = useState('✓');
  const [designMode, setDesignMode] = useState<DesignMode>('chic');
  const [chicPattern, setChicPattern] = useState<ChicPattern>('plain');
  const [chicCheckColor, setChicCheckColor] = useState<ChicCheckColor>('cool');
  const [recoveryHistory, setRecoveryHistory] = useState<RecoveryRecord[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [behaviorEvents, setBehaviorEvents] = useState<BehaviorEvent[]>([]);
  const behaviorEventsRef = React.useRef<BehaviorEvent[]>([]);
  const pendingBehaviorEventsRef = React.useRef<BehaviorEvent[]>([]);
  const pendingNotificationBehaviorActionsRef = React.useRef<Array<{ notificationInstanceId: string; action: NotificationAction; taskId?: string; actualAt: Date }>>([]);
  const pendingSharedEventPacketsRef = React.useRef<SharedEvent[]>([]);
  const pendingSharedEventTokensRef = React.useRef<string[]>([]);
  const [wishMonths, setWishMonths] = useState<WishMonthMap>({});
  const [calendarMarks, setCalendarMarks] = useState<CalendarMarks>({});
  const [sharedEvents, setSharedEvents] = useState<SharedEvent[]>([]);
  const sharedEventsRef = React.useRef<SharedEvent[]>([]);
  const [sharedParticipantIdsByToken, setSharedParticipantIdsByToken] = useState<Record<string, string>>({});
  const sharedParticipantIdsByTokenRef = React.useRef<Record<string, string>>({});
  const [sharedParticipantPrefsByToken, setSharedParticipantPrefsByToken] = useState<Record<string, SharedParticipantPrefs>>({});
  const sharedParticipantPrefsByTokenRef = React.useRef<Record<string, SharedParticipantPrefs>>({});
  const [sharedEventToken, setSharedEventToken] = useState<string>();
  const [sharedEventOpen, setSharedEventOpen] = useState(false);
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
  const currentWishMonthKey = wishMonthKey(now);
  const currentWishState = getMonthlyWishState(wishMonths, currentWishMonthKey);
  const saveCurrentWishState = React.useCallback((updater: (current: MonthlyWishState) => MonthlyWishState) => {
    setWishMonths((current) => {
      const previous = getMonthlyWishState(current, currentWishMonthKey);
      return { ...current, [currentWishMonthKey]: updater(previous) };
    });
  }, [currentWishMonthKey]);
  const updateWishReview = React.useCallback((monthKey: string, reviewKey: string, updates: Partial<MonthlyReview>) => {
    setWishMonths((current) => {
      const monthState = getMonthlyWishState(current, monthKey);
      const reviews = monthState.reviews?.length ? monthState.reviews : (monthState.review && (monthState.review.photo || monthState.review.date || monthState.review.shortNote || monthState.review.memo || monthState.review.satisfaction) ? [monthState.review] : []);
      const updated = reviews.map((review) => (review.id === reviewKey || (!review.id && `${review.date ?? ''}|${review.shortNote ?? ''}|${review.memo ?? ''}|${review.satisfaction ?? 0}` === reviewKey) ? { ...review, ...updates } : review));
      return { ...current, [monthKey]: { ...monthState, review: updated[updated.length - 1] ?? monthState.review, reviews: updated } };
    });
  }, []);
  const deleteWishReview = React.useCallback((monthKey: string, reviewKey: string) => {
    setWishMonths((current) => {
      const monthState = getMonthlyWishState(current, monthKey);
      const reviews = monthState.reviews?.length ? monthState.reviews : (monthState.review && (monthState.review.photo || monthState.review.date || monthState.review.shortNote || monthState.review.memo || monthState.review.satisfaction) ? [monthState.review] : []);
      const remaining = reviews.filter((review) => !(review.id === reviewKey || (!review.id && `${review.date ?? ''}|${review.shortNote ?? ''}|${review.memo ?? ''}|${review.satisfaction ?? 0}` === reviewKey)));
      // 履歴から削除した直後に、前のレビューを入力欄へ復元しない。
      // 旧形式 review は互換用に残すが、現在の入力 draft は常に空へ戻す。
      return { ...current, [monthKey]: { ...monthState, review: {}, reviews: remaining } };
    });
  }, []);
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

  const syncSharedEventPacket = React.useCallback((packet: SharedEvent) => {
    const normalized = normalizeSharedEvent(packet);
    setSharedEvents((current) => upsertSharedEvent(current, normalized));
    return normalized;
  }, []);

  const openSharedEventToken = React.useCallback((shareToken: string) => {
    setSharedEventToken(shareToken);
    setSharedEventOpen(true);
  }, []);

  const handleSharedEventLink = React.useCallback((url: string) => {
    const parsed = parseSharedEventLink(url);
    if (!parsed) return;
    if (!hydratedRef.current) {
      if (parsed.packet) pendingSharedEventPacketsRef.current.push(parsed.packet);
      else pendingSharedEventTokensRef.current.push(parsed.shareToken);
      return;
    }
    if (parsed.packet) {
      const normalized = syncSharedEventPacket(parsed.packet);
      const ownerParticipantId = normalized.participants[0]?.participantId;
      if (ownerParticipantId && !sharedParticipantIdsByTokenRef.current[normalized.shareToken]) {
        setSharedParticipantIdsByToken((current) => ({ ...current, [normalized.shareToken]: ownerParticipantId }));
      }
      openSharedEventToken(normalized.shareToken);
      return;
    }
    openSharedEventToken(parsed.shareToken);
  }, [openSharedEventToken, syncSharedEventPacket]);

  const shareDeparturePlan = React.useCallback((targetPlan: DeparturePlan) => {
    if (!targetPlan.id) {
      Alert.alert('保存した予定から共有できます');
      return;
    }
    const existing = sharedEventsRef.current.find((item) => item.eventId === targetPlan.id || item.shareToken === targetPlan.id);
    const token = existing?.shareToken ?? createSharedEventToken(targetPlan.id);
    const ownerDisplayName = existing?.ownerDisplayName ?? 'あなた';
    const packet = createSharedEventPacket(targetPlan, token, ownerDisplayName, existing?.participants ?? []);
    const normalized = syncSharedEventPacket(packet);
    const ownerParticipantId = normalized.participants[0]?.participantId;
    if (ownerParticipantId) {
      setSharedParticipantIdsByToken((current) => ({ ...current, [normalized.shareToken]: ownerParticipantId }));
    }
    openSharedEventToken(normalized.shareToken);
    const link = encodeSharedEventLink(normalized.shareToken);
    void Share.share({ title: targetPlan.title, message: `${targetPlan.title}\n${link}`, url: link }).catch(() => undefined);
  }, [openSharedEventToken, syncSharedEventPacket]);

  const shareCurrentSharedEvent = React.useCallback((shareToken: string) => {
    const packet = sharedEventsRef.current.find((item) => item.shareToken === shareToken);
    if (!packet) {
      Alert.alert('共有予定が見つかりません');
      return;
    }
    const link = encodeSharedEventLink(packet.shareToken);
    void Share.share({ title: packet.title, message: `${packet.title}\n${link}`, url: link }).catch(() => undefined);
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
    void playCompletionSound();
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

  const markDeparturePreparationStarted = React.useCallback((planId: string, status: DeparturePreparationStatus = 'preparing') => {
    const target = departurePlansRef.current.find((item) => item.id === planId);
    if (!target?.id) return;
    setDeparturePreparationStatuses((current) => ({ ...current, [planId]: status }));
    recordBehaviorEvent(createDeparturePreparationStartedEvent({ planId: target.id, planTitle: target.title, planDate: target.date, scheduledAt: getDepartureMoments(target).prepare, actualAt: new Date() }));
  }, [recordBehaviorEvent]);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { departurePlansRef.current = departurePlans; }, [departurePlans]);
  useEffect(() => { departureCheckInsRef.current = departureCheckIns; }, [departureCheckIns]);
  useEffect(() => { behaviorEventsRef.current = behaviorEvents; }, [behaviorEvents]);
  useEffect(() => { sharedEventsRef.current = sharedEvents; }, [sharedEvents]);
  useEffect(() => { sharedParticipantIdsByTokenRef.current = sharedParticipantIdsByToken; }, [sharedParticipantIdsByToken]);
  useEffect(() => { sharedParticipantPrefsByTokenRef.current = sharedParticipantPrefsByToken; }, [sharedParticipantPrefsByToken]);
  useEffect(() => { planTierRef.current = planTier; }, [planTier]);

  useEffect(() => {
    loadRhythmState()
      .then((saved) => {
        if (!saved) return;
        const loadedTasks = saved.tasks ? saved.tasks.map((task) => ({ ...task, category: (task.category ?? 'その他') as Category, priority: (task.priority ?? '中') as Priority })) : [];
        tasksRef.current = loadedTasks;
        setTasks(loadedTasks);
        if (saved.plan) setPlan({ ...saved.plan, date: normalizePlanDate(saved.plan.date) });
        const loadedDeparturePlans = (saved.departurePlans ?? []).map((item) => ({ ...item, date: normalizePlanDate(item.date) }));
        departurePlansRef.current = loadedDeparturePlans;
        setDeparturePlans(loadedDeparturePlans);
        const loadedDepartureCheckIns = saved.departureCheckIns ?? [];
        departureCheckInsRef.current = loadedDepartureCheckIns;
        setDepartureCheckIns(loadedDepartureCheckIns);
        setDeparturePreparationStatuses(saved.departurePreparationStatuses ?? {});
        if (saved.widgetSize) setWidgetSize(saved.widgetSize);
        if (typeof saved.showCompleted === 'boolean') setShowCompleted(saved.showCompleted);
        if (saved.completionIcon) setCompletionIcon(saved.completionIcon);
        if (saved.designMode === 'minimal' || saved.designMode === 'dark' || saved.designMode === 'chic') setDesignMode(saved.designMode);
        else setDesignMode('chic');
        setChicPattern(saved.chicPattern ? normalizeChicPattern(saved.chicPattern) : 'plain');
        setChicCheckColor(normalizeChicCheckColor(saved.chicCheckColor));
        setRecoveryHistory(saved.recoveryHistory ?? []);
        setFocusSessions(saved.focusSessions ?? []);
        const loadedBehaviorEvents = saved.behaviorEvents ?? [];
        behaviorEventsRef.current = loadedBehaviorEvents;
        setBehaviorEvents(loadedBehaviorEvents);
        if (saved.taskTemplates) setTaskTemplates(saved.taskTemplates);
        setSavedTaskTemplates(saved.savedTaskTemplates ?? []);
        setWishMonths(saved.wishMonths ?? {});
        setCalendarMarks(saved.calendarMarks ?? {});
        const loadedSharedEvents = (saved.sharedEvents ?? []).map((item) => normalizeSharedEvent(item));
        sharedEventsRef.current = loadedSharedEvents;
        setSharedEvents(loadedSharedEvents);
        const loadedSharedParticipantIdsByToken = saved.sharedParticipantIdsByToken ?? {};
        sharedParticipantIdsByTokenRef.current = loadedSharedParticipantIdsByToken;
        setSharedParticipantIdsByToken(loadedSharedParticipantIdsByToken);
        const loadedSharedParticipantPrefsByToken = saved.sharedParticipantPrefsByToken ?? {};
        sharedParticipantPrefsByTokenRef.current = loadedSharedParticipantPrefsByToken;
        setSharedParticipantPrefsByToken(loadedSharedParticipantPrefsByToken);
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
        const pendingPreparationIds = pendingDeparturePreparationIdsRef.current;
        pendingDeparturePreparationIdsRef.current = [];
        pendingPreparationIds.forEach(({ id, status }) => markDeparturePreparationStarted(id, status));
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
        const pendingSharedPackets = pendingSharedEventPacketsRef.current;
        pendingSharedEventPacketsRef.current = [];
        pendingSharedPackets.forEach((packet) => {
          const normalized = syncSharedEventPacket(packet);
          const ownerParticipantId = normalized.participants[0]?.participantId;
          if (ownerParticipantId && !sharedParticipantIdsByTokenRef.current[normalized.shareToken]) {
            setSharedParticipantIdsByToken((current) => ({ ...current, [normalized.shareToken]: ownerParticipantId }));
          }
          openSharedEventToken(normalized.shareToken);
        });
        const pendingSharedTokens = [...new Set(pendingSharedEventTokensRef.current)];
        pendingSharedEventTokensRef.current = [];
        pendingSharedTokens.forEach((shareToken) => openSharedEventToken(shareToken));
      });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const taskId = response.notification.request.content.data?.taskId;
      const departurePlanId = response.notification.request.content.data?.departurePlanId;
      const notificationInstanceIdValue = response.notification.request.content.data?.notificationInstanceId;
      const notificationInstanceId = typeof notificationInstanceIdValue === 'string' ? notificationInstanceIdValue : response.notification.request.identifier;
      const action = response.actionIdentifier;

      // 通知ボタンを展開しなくても、通知本体をタップしたら
      // 対象の回答画面へ直接移動できるようにする。
      if (action === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        if (typeof departurePlanId === 'string') {
          setTimelineInitialTab('departure');
          setScreen('timeline');
          return;
        }
        if (typeof taskId === 'string') {
          setScreen('home');
          return;
        }
      }

      if (action === 'DEPARTED') {
        if (typeof departurePlanId !== 'string') return;
        if (!hydratedRef.current) {
          pendingDepartureCheckInIdsRef.current.push(departurePlanId);
          return;
        }
        markDeparturePlanAsDeparted(departurePlanId, 'notification');
        return;
      }

      if (action === 'PREPARING' || action === 'PREPARED' || action === 'PREPARE_LATER') {
        if (typeof departurePlanId !== 'string') return;
        if (action === 'PREPARE_LATER') {
          void Notifications.scheduleNotificationAsync({
            content: {
              title: '準備、始められそう？',
              body: response.notification.request.content.body ?? '今の時間から、次の準備タイミングを考えます。',
              categoryIdentifier: 'PREPARATION_ACTIONS',
              data: response.notification.request.content.data,
              sound: 'default',
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 600 },
          });
          return;
        }
        // 回答済みの準備通知だけを消し、後続の出発通知は維持する。
        void Notifications.dismissNotificationAsync(response.notification.request.identifier);
        if (!hydratedRef.current) {
          pendingDeparturePreparationIdsRef.current.push({ id: departurePlanId, status: action === 'PREPARED' ? 'prepared' : 'preparing' });
          return;
        }
        markDeparturePreparationStarted(departurePlanId, action === 'PREPARED' ? 'prepared' : 'preparing');
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
  }, [completeTaskIds, markDeparturePlanAsDeparted, markDeparturePreparationStarted, openPremiumFeature, recordBehaviorEvent, recordNotificationBehaviorAction]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state: PersistedState = { tasks, plan, departurePlans, widgetSize, showCompleted, completionIcon, designMode, taskTemplates, savedTaskTemplates, chicPattern, chicCheckColor, recoveryHistory, focusSessions, departureCheckIns, behaviorEvents, wishMonths, calendarMarks, sharedEvents, sharedParticipantIdsByToken, sharedParticipantPrefsByToken, departurePreparationStatuses };
    saveRhythmState(state).catch(() => undefined);
  }, [tasks, plan, departurePlans, widgetSize, showCompleted, completionIcon, designMode, taskTemplates, savedTaskTemplates, chicPattern, chicCheckColor, recoveryHistory, focusSessions, departureCheckIns, behaviorEvents, wishMonths, calendarMarks, sharedEvents, sharedParticipantIdsByToken, sharedParticipantPrefsByToken, departurePreparationStatuses, hydrated]);

  useEffect(() => {
    const openFromUrl = (url: string) => handleSharedEventLink(url);
    Linking.getInitialURL().then((url) => {
      if (url) openFromUrl(url);
    }).catch(() => undefined);
    const subscription = Linking.addEventListener('url', ({ url }) => openFromUrl(url));
    return () => subscription.remove();
  }, [handleSharedEventLink]);

  const nextDeparturePlan = useMemo(() => [...departurePlans]
    .filter((item) => item.countdownEnabled !== false && getDepartureMoments(item).arrival.getTime() > now.getTime())
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

  const addTask = (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule: RepeatRule = 'none', nudgeMode: NudgeMode = 'once', scheduledDate?: string, scheduledTime?: string, isRoutine = false) => {
    const routineLimit = hasPremiumAccess(planTier, 'full_history') ? 100 : 5;
    if (isRoutine && tasksRef.current.filter((item) => item.isRoutine).length >= routineLimit) {
      Alert.alert('ルーティン登録数の上限', `現在のプランでは${routineLimit}件まで登録できます。`);
      return;
    }
    const taskId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const task: Task = {
      id: taskId,
      title,
      createdAt: new Date().toISOString(),
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
      isRoutine,
      routineId: isRoutine ? taskId : undefined,
      nudgeMode,
      scheduledDate: scheduledDate ?? dateKey(now),
      scheduledTime,
    };
    setTasks((current) => [task, ...current]);
    setAddOpen(false);
    if (remindAt || (deadlineDate && deadlineTime && deadlineNotifyBefore !== undefined)) void scheduleAllTaskNotifications(task);
  };

  const updateTask = (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule: RepeatRule = 'none', nudgeMode: NudgeMode = 'once', scheduledDate?: string, scheduledTime?: string, isRoutine = false) => {
    if (!editingTask) return;
    const routineLimit = hasPremiumAccess(planTier, 'full_history') ? 100 : 5;
    const routineCount = tasksRef.current.filter((item) => item.isRoutine && item.id !== editingTask.id).length;
    if (isRoutine && routineCount >= routineLimit) {
      Alert.alert('ルーティン登録数の上限', `現在のプランでは${routineLimit}件まで登録できます。`);
      return;
    }
    const updated = { ...editingTask, title, category, priority, remindDate, remindAt, deadlineDate, deadlineTime, deadlineNotifyBefore, navigationEnabled, preparationMinutes, travelMinutes, bufferMinutes, repeatRule, isRoutine, routineId: isRoutine ? editingTask.routineId ?? editingTask.id : undefined, nudgeMode, scheduledDate: scheduledDate ?? editingTask.scheduledDate ?? dateKey(now), scheduledTime };
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
    const moments = getDepartureMoments(targetPlan);
    const arrivalDate = moments.arrival;
    // Premiumの寝坊防止モードは、既存の逆算時刻を基準に
    // 「準備前の起床確認」と「出発直前の強い確認」を追加します。
    // 無料版はこれまでどおりの3段階通知のままです。
    const wakeProtectionEnabled = hasPremiumAccess(planTier, 'late_recovery');
    const stages = [
      {
        id: 'wake_up',
        before: targetPlan.travelMinutes + targetPlan.bufferMinutes + targetPlan.preparationMinutes + 10,
        title: '起きて、準備の時間です',
        body: `${formatLiveTime(moments.prepare)}から準備を始める予定です`,
        premiumOnly: true,
      },
      {
        id: 'prepare',
        before: targetPlan.travelMinutes + targetPlan.bufferMinutes + targetPlan.preparationMinutes,
        title: '準備、始めた？',
        body: `${formatLiveTime(moments.leave)}に出発すると安心です`,
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
        body: `${formatLiveTime(moments.arrival)}到着予定です`,
      },
      {
        id: 'late_warning',
        before: Math.max(0, targetPlan.travelMinutes + targetPlan.bufferMinutes - 5),
        title: 'まだなら、今出よう',
        body: '急いで出発するか、予定を組み直してください',
      },
    ].filter((stage) => !stage.premiumOnly || wakeProtectionEnabled)
      .filter((stage) => stage.id !== 'late_warning' || wakeProtectionEnabled);

    let count = 0;
    for (const stage of stages) {
      const date = new Date(arrivalDate.getTime() - stage.before * 60_000);
      if (date.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: stage.title, body: stage.body, sound: 'default', ...(wakeProtectionEnabled ? { interruptionLevel: 'timeSensitive' as const } : {}), categoryIdentifier: stage.id === 'prepare' || stage.id === 'wake_up' ? 'PREPARATION_ACTIONS' : 'DEPARTURE_ACTIONS', data: { departurePlanId: targetPlan.id, departureDate: targetPlan.date, departureStage: stage.id } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
      count += 1;
    }
    Alert.alert('出発サポートを設定しました', `${formatLiveTime(moments.prepare)}から${count}段階でお知らせします。`);
  };

  const createTaskFromWishAction = (action: WishAction) => {
    if (tasks.some((task) => !task.done && task.title.trim() === action.title.trim())) {
      Alert.alert('同じタスクがあります', '今日のタスク一覧から確認できます。');
      return;
    }
    addTask(action.title, categories[0]!, priorities[1]!);
    Alert.alert('タスクに追加しました', '今日のタスクとして登録しました。');
  };

  const saveDeparturePlan = async () => {
    // 編集対象が実際に存在する時だけ更新する。削除済み予定のIDがフォームに残っても、
    // 新しい予定として追加し、カウントダウン中の別予定を上書きしない。
    const editTarget = plan.id ? departurePlansRef.current.find((item) => item.id === plan.id) : undefined;
    const saved: DeparturePlan = {
      ...plan,
      id: editTarget?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}-departure`,
      date: normalizePlanDate(plan.date),
    };
    if (editTarget?.id) await cancelPendingDepartureNotifications(editTarget.id);
    const nextPlans = editTarget
      ? departurePlansRef.current.map((item) => item.id === editTarget.id ? saved : item)
      : [...departurePlansRef.current, saved];
    departurePlansRef.current = nextPlans;
    setDeparturePlans(nextPlans);
    if (saved.countdownEnabled !== false) {
      await scheduleDeparture(saved);
    } else {
      Alert.alert(plan.id ? '予定を保存しました' : '予定を追加しました', '予定表に表示しました。');
    }
    setPlan({ ...initialPlan, date: todayInputValue(), title: '新しい予定' });
  };

  const importCalendarEventAsPlan = (event: Calendar.Event) => {
    const start = new Date(event.startDate);
    if (Number.isNaN(start.getTime())) {
      Alert.alert('予定を追加できませんでした', '日時を読み取れませんでした。');
      return false;
    }
    const externalCalendarEventId = typeof event.id === 'string' ? event.id : undefined;
    if (externalCalendarEventId && departurePlansRef.current.some((item) => item.externalCalendarEventId === externalCalendarEventId)) {
      Alert.alert('登録済みです', 'この予定はすでにRhythmの予定表にあります。');
      return false;
    }
    const imported: DeparturePlan = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}-calendar`,
      externalCalendarEventId,
      title: event.title?.trim() || 'カレンダーの予定',
      destination: event.location?.trim() || undefined,
      countdownEnabled: false,
      date: dateKey(start),
      arrival: formatLiveTime(start),
      travelMinutes: initialPlan.travelMinutes,
      preparationMinutes: initialPlan.preparationMinutes,
      bufferMinutes: initialPlan.bufferMinutes,
    };
    const nextPlans = [...departurePlansRef.current, imported];
    departurePlansRef.current = nextPlans;
    setDeparturePlans(nextPlans);
    return true;
  };

  const deleteDeparturePlan = (id: string) => {
    void cancelPendingDepartureNotifications(id);
    const nextPlans = departurePlansRef.current.filter((item) => item.id !== id);
    departurePlansRef.current = nextPlans;
    setDeparturePlans(nextPlans);
    setDeparturePreparationStatuses((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setPlan((current) => current.id === id ? { ...initialPlan, date: todayInputValue(), title: '新しい予定' } : current);
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
        <SafeAreaView style={[styles.safe, { backgroundColor: uiDesignMode === 'chic' ? (isCheckChicPattern(effectiveChicPattern) ? getChicCheckColor(chicCheckColor).background : getChicPatternVisual(effectiveChicPattern).background) : theme.colors.screenBackground }, uiDesignMode === 'minimal' && styles.safeMinimal, uiDesignMode === 'dark' && styles.safeDark, uiDesignMode === 'chic' && styles.safeChic]}>
      <StatusBar style={uiDesignMode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.app}>
        <BThemeRibbonPreload />
        <CThemeRibbonPreload />
        {uiDesignMode === 'chic' && <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><ChicPatternDecor pattern={effectiveChicPattern} accent={isCheckChicPattern(effectiveChicPattern) ? getChicCheckColor(chicCheckColor).accent : getChicPatternVisual(effectiveChicPattern).accent} warm={isCheckChicPattern(effectiveChicPattern) ? getChicCheckColor(chicCheckColor).warm : getChicPatternVisual(effectiveChicPattern).warm} checkColor={chicCheckColor} /></View>}
        <Header designMode={uiDesignMode} now={now} />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {screen === 'home' && (
            <HomeScreen
              tasks={visibleTasks}
              allTasks={tasks}
              remaining={remaining}
              timeline={displayTimeline}
              now={now}
              designMode={uiDesignMode}
              chicPattern={effectiveChicPattern}
              completionIcon={completionIcon}
              selectionMode={selectionMode}
              selectedTaskIds={selectedTaskIds}
              onAdd={() => setAddOpen(true)}
                onQuickAdd={(title, category, priority, scheduledDate, scheduledTime, isRoutine) => addTask(title, category, priority, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'none', 'once', scheduledDate, scheduledTime, isRoutine)}
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
              onBucket={(id, bucket) => setTasks((current) => current.map((task) => task.id === id ? { ...task, bucket } : task))}
              onOpenTime={(tab) => { setTimelineInitialTab(tab); setScreen('timeline'); }}
              onOpenWish={() => setScreen('wish')}
              styles={styles}
              renderTodayWinStrip={(todayTasks) => <TodayWinStrip tasks={todayTasks} designMode={uiDesignMode} chicPattern={effectiveChicPattern} onRestore={(id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: false, completedAt: undefined } : task))} />}
              PatternDecor={ChicPatternDecor}
              helpers={{ deadlineLabel, getUrgencyStatus, getLateRiskMessage, dateForReminder, dateKey, formatLiveTime, isCheckChicPattern, todayInputValue }}
            />
          )}

          {screen === 'wish' && (
            <WishScreen
              designMode={uiDesignMode}
              chicPattern={effectiveChicPattern}
              monthLabel={`${now.getFullYear()}年${now.getMonth() + 1}月`}
              state={currentWishState}
              onSaveState={saveCurrentWishState}
              onCreateTaskFromAction={createTaskFromWishAction}
              onBack={() => setScreen('home')}
            />
          )}

          {screen === 'timeline' && (
            <TimelineScreen
              plan={plan}
              plans={departurePlans}
              departureCheckIns={departureCheckIns}
              departurePreparationStatuses={departurePreparationStatuses}
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
              onImportCalendarEvent={importCalendarEventAsPlan}
              onEdit={(item) => setPlan(item)}
              onSharePlan={shareDeparturePlan}
              onDelete={deleteDeparturePlan}
              onEditTask={(task) => setEditingTask(task)}
              onDeleteTask={(id) => setTasks((current) => current.filter((task) => task.id !== id))}
              onPremium={openPremiumFeature}
              onRecovery={applyRecovery}
              onRecoveryClosed={() => setRecoveryTargetPlanId(undefined)}
              onFocusCompleted={completeFocusSession}
              onBehaviorEvent={recordBehaviorEvent}
              onDeparted={markDeparturePlanAsDeparted}
              onPreparationStarted={markDeparturePreparationStarted}
              calendarMarks={calendarMarks}
              onSetCalendarMark={(date, mark) => setCalendarMarks((current) => { const next = { ...current }; if (mark) next[date] = mark; else delete next[date]; return next; })}
              styles={styles}
              helpers={{ getThemeTokens, dateKey, planDateKey, hasPremiumAccess, formatLiveDate, formatLiveTime, getDepartureMoments, normalizePlanDate, countdownToDate, dateForReminder, getMapSearchTarget, openMapSearch, colors }}
              components={{ TimeTabButton, FocusMode, TaskScheduleCalendar, DailyScheduleTimeline, PremiumRoutePreview, ScheduleSettingCard, RecoveryModal }}
            />
          )}

          {screen === 'settings' && (
            <SettingsScreen
              tasks={tasks}
              timeline={displayTimeline}
              now={now}
              dangerousTask={dangerousTask}
              size={widgetSize}
              showCompleted={showCompleted}
              completionIcon={completionIcon}
              designMode={uiDesignMode}
              chicPattern={effectiveChicPattern}
              chicCheckColor={chicCheckColor}
              planTier={planTier}
              onSize={setWidgetSize}
              onShowCompleted={setShowCompleted}
              onCompletionIcon={setCompletionIcon}
              onDesignMode={setDesignMode}
              onChicPattern={(pattern) => {
                const feature = pattern === 'plain' || pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark' ? undefined : getChicPatternFeatureId(pattern);
                if (feature && !hasPremiumAccess(planTier, feature)) { openPremiumFeature(); return; }
                setChicPattern(pattern);
              }}
              onChicCheckColor={setChicCheckColor}
              templates={taskTemplates}
              savedTemplates={savedTaskTemplates}
              onAddTemplate={(title) => setTaskTemplates((current) => current.includes(title) ? current : [...current, title])}
              onDeleteTemplate={(title) => setTaskTemplates((current) => current.filter((item) => item !== title))}
              onGuide={() => setGuideOpen(true)}
              onPremium={openPremiumFeature}
              onDeleteSavedTemplate={deleteSavedTaskTemplate}
                          styles={styles}
              helpers={{ colors, getChicPatternVisual, hasPremiumAccess, getChicCheckColor, chicCheckColorChoices, countdownToClock, getUrgencyStatus, getNextBestAction, designModes, completionIcons, summarizePremiumTaskTemplate }}
              components={{ BThemeRibbonDecoration, CThemeRibbonDecoration, ChicPatternDecor, ChicPatternSelector, SettingsDisclosure, NotificationManagerCard }}
            />
          )}

          {screen === 'analysis' && (
            <AnalysisScreen
              events={behaviorEvents}
              tasks={tasks}
              designMode={uiDesignMode}
              planTier={planTier}
              onPremium={openPremiumFeature}
              onRemoveRoutine={(taskId) => Alert.alert('ルーティンから外しますか？', 'タスク自体と完了履歴は残ります。', [{ text: 'キャンセル', style: 'cancel' }, { text: 'ルーティンから外す', style: 'destructive', onPress: () => setTasks((current) => current.map((task) => task.id === taskId ? { ...task, isRoutine: false, routineId: undefined } : task)) }])}
              recordContent={<HistoryScreen tasks={tasks} wishMonths={wishMonths} calendarMarks={calendarMarks} onSetCalendarMark={(date, mark) => setCalendarMarks((current) => { const next = { ...current }; if (mark) next[date] = mark; else delete next[date]; return next; })} recoveryHistory={recoveryHistory} focusSessions={focusSessions} departureCheckIns={departureCheckIns} departurePlans={departurePlans} behaviorEvents={behaviorEvents} completionIcon={completionIcon} designMode={uiDesignMode} chicPattern={effectiveChicPattern} planTier={planTier} onPremium={openPremiumFeature} onSaveTemplate={saveTaskAsTemplate} onRestore={(id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: false, completedAt: undefined } : task))} onUpdateReview={updateWishReview} onDeleteReview={deleteWishReview} styles={styles} helpers={{ dateKey, formatLiveTime }} components={{ AchievementVessel, CalendarMarkPicker }} />}
            />
          )}
        </ScrollView>

        <BottomNav screen={screen} designMode={uiDesignMode} onChange={setScreen} />
      </View>

      <SharedEventScreen
        visible={sharedEventOpen}
        shareToken={sharedEventToken}
        designMode={uiDesignMode}
        sharedEvents={sharedEvents}
        participantIdsByToken={sharedParticipantIdsByToken}
        participantPrefsByToken={sharedParticipantPrefsByToken}
        onSaveSharedEvents={setSharedEvents}
        onSaveParticipantIds={setSharedParticipantIdsByToken}
        onSaveParticipantPrefs={setSharedParticipantPrefsByToken}
        onClose={() => setSharedEventOpen(false)}
        onOpenMap={(query) => void openMapSearch(query)}
        onShareCurrentEvent={shareCurrentSharedEvent}
      />

      <TaskModal visible={addOpen} templates={taskTemplates} savedTemplates={savedTaskTemplates} designMode={uiDesignMode} planTier={planTier} onPremium={openPremiumFeature} onClose={() => setAddOpen(false)} onSave={addTask} styles={styles} helpers={{ getThemeTokens, todayInputValue, hasPremiumAccess, dateForReminder, dateKey, formatLiveTime, colors, summarizePremiumTaskTemplate }} components={{ CompactNumberSetting }} />
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
        styles={styles}
        helpers={{ getThemeTokens, todayInputValue, hasPremiumAccess, dateForReminder, dateKey, formatLiveTime, colors, summarizePremiumTaskTemplate }}
        components={{ CompactNumberSetting }}
      />
      <PremiumModal visible={premiumOpen} initialFeatureId={premiumTargetFeature} designMode={uiDesignMode} chicPattern={effectiveChicPattern} onClose={() => setPremiumOpen(false)} styles={styles} helpers={{ getThemeTokens }} components={{ ChicPatternDecor, isCheckChicPattern }} />
      <GuideModal visible={guideOpen} styles={styles} onClose={() => setGuideOpen(false)} />
    </SafeAreaView>
  );
}

function TimeTabButton({ tab, active, designMode, chicPattern, themeAccent, secondaryText, onPress }: { tab: TimeTab; active: boolean; designMode: DesignMode; chicPattern: ChicPattern; themeAccent: string; secondaryText: string; onPress: () => void }) {
  const palette = chicUtilityPalettes[tab];
  const label = tab === 'departure' ? '出発' : tab === 'deadline' ? 'スケジュール' : tab === 'calendar' ? '予定表' : '集中';
  const isDark = designMode === 'dark';
  if (designMode === 'chic') return <Pressable style={[styles.timeTab, styles.timeTabChicPattern, { backgroundColor: palette.background }, active && { borderColor: palette.accent, borderWidth: 2 }]} onPress={onPress}>{!isCheckChicPattern(chicPattern) && <ChicPatternDecor pattern={chicPattern} accent={palette.accent} warm={palette.warm} density="compact" />}<View style={[styles.timeTabGlassLabel, active && styles.timeTabGlassLabelActive]}><Text style={[styles.timeTabText, { color: active ? palette.accent : '#8B7B82' }]}>{label}</Text>{active && <Text style={[styles.timeTabMarker, { color: palette.accent }]}>●</Text>}</View></Pressable>;
  return <Pressable style={[styles.timeTab, styles.timeTabMinimal, isDark && styles.darkSurface, active && styles.timeTabActive, active && { backgroundColor: isDark ? '#B9A8D8' : themeAccent, borderColor: isDark ? '#7B6BE8' : themeAccent }]} onPress={onPress}><Text style={[styles.timeTabText, { color: isDark ? '#101114' : secondaryText }, active && styles.timeTabTextActive]}>{label}</Text></Pressable>;
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

  const isMinimal = designMode !== 'chic';
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

function DailyScheduleTimeline({ date, tasks, plans, externalEvents, now, designMode, onEditTask, onEditPlan }: { date: string; tasks: Task[]; plans: DeparturePlan[]; externalEvents: Calendar.Event[]; now: Date; designMode: DesignMode; onEditTask: (task: Task) => void; onEditPlan: (plan: DeparturePlan) => void }) {
  const theme = getThemeTokens(designMode);
  const isDark = designMode === 'dark';
  type ScheduleItem = { id: string; time?: string; title: string; meta: string; kind: 'task' | 'plan' | 'external' | 'done'; onPress?: () => void };
  const items: ScheduleItem[] = [];
  tasks.filter((task) => {
    const dates = [task.scheduledDate, task.deadlineDate, task.remindDate, task.done && task.completedAt ? dateKey(task.completedAt) : undefined];
    return dates.includes(date);
  }).forEach((task) => {
    const time = task.scheduledTime;
    if (!time) return;
    items.push({ id: `task-${task.id}`, time, title: task.title, meta: task.done ? '完了' : task.category, kind: task.done ? 'done' : 'task', onPress: task.done ? undefined : () => onEditTask(task) });
  });
  plans.filter((plan) => isPlanOnDate(plan, date)).forEach((plan, index) => {
    items.push({ id: `plan-${plan.id ?? index}`, time: plan.arrival, title: plan.title, meta: plan.countdownEnabled === false ? '予定表の予定' : `出発 ${formatLiveTime(getDepartureMoments(plan).leave)} ・ 準備 ${formatLiveTime(getDepartureMoments(plan).prepare)}`, kind: 'plan', onPress: () => onEditPlan(plan) });
  });
  externalEvents.filter((event) => dateKey(new Date(event.startDate)) === date).forEach((event) => items.push({ id: `external-${event.id}`, time: formatLiveTime(new Date(event.startDate)), title: event.title || 'カレンダー予定', meta: '端末カレンダー', kind: 'external' }));
  const timed = items.filter((item) => item.time).sort((a, b) => parseClock(a.time!) - parseClock(b.time!));
  const currentDate = dateKey(now);
  const itemHours = timed.map((item) => Math.floor(parseClock(item.time!) / 60));
  const firstHour = Math.min(7, ...itemHours);
  const lastHour = Math.max(22, ...itemHours);
  const timelineHours = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
  return <View style={{ marginTop: 12, marginBottom: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}><Text style={[styles.sectionTitle, { color: isDark ? '#161421' : theme.colors.primaryText }]}>今日の流れ</Text><Text style={{ color: theme.colors.primaryAccent, fontSize: 11, fontWeight: '800' }}>{date === currentDate ? '現在時刻を表示中' : '1日の予定'}</Text></View>
    <View style={{ backgroundColor: isDark ? '#FFFFFF' : theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: designMode === 'minimal' || isDark ? 3 : 18, overflow: 'hidden' }}>
      {timelineHours.map((hour) => {
        const isCurrentHour = date === currentDate && now.getHours() === hour;
        const hourItems = timed.filter((item) => Math.floor(parseClock(item.time!) / 60) === hour);
        return <View key={`timeline-hour-${hour}`} style={{ flexDirection: 'row', minHeight: 48, borderBottomColor: theme.colors.border, borderBottomWidth: 1 }}>
          <View style={{ width: 66, paddingTop: 11, alignItems: 'center' }}><Text style={{ color: isCurrentHour ? theme.colors.primaryAccent : theme.colors.secondaryText, fontSize: 11, fontWeight: '700' }}>{String(hour).padStart(2, '0')}:00</Text></View>
          <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: theme.colors.border, paddingBottom: hourItems.length > 0 ? 7 : 0 }}>
            <View style={{ marginTop: 23, borderTopWidth: 1, borderTopColor: isCurrentHour ? theme.colors.primaryAccent : theme.colors.border, opacity: isCurrentHour ? 0.9 : 0.65 }} />
            {hourItems.map((item) => {
              const accent = item.kind === 'plan' ? '#7B6BE8' : item.kind === 'external' ? '#B9A8D8' : item.kind === 'done' ? '#AEB7B0' : categoryColors[tasks.find((task) => `task-${task.id}` === item.id)?.category ?? categories[0]!];
              const content = <View style={{ marginHorizontal: 8, marginTop: 7, padding: 10, borderLeftWidth: 4, borderLeftColor: accent, borderRadius: 8, backgroundColor: isDark ? '#F5F3F8' : '#FAF9FC', opacity: item.kind === 'done' ? 0.58 : 1 }}><Text style={{ color: accent, fontSize: 10, fontWeight: '900' }}>{item.time}</Text><Text style={{ color: isDark ? '#161421' : theme.colors.primaryText, fontSize: 14, fontWeight: '800', marginTop: 2 }}>{item.kind === 'done' ? '✓ ' : ''}{item.title}</Text><Text style={{ color: theme.colors.secondaryText, fontSize: 10, marginTop: 3 }}>{item.meta}</Text></View>;
              return item.onPress ? <Pressable key={item.id} onPress={item.onPress}>{content}</Pressable> : <View key={item.id}>{content}</View>;
            })}
          </View>
        </View>;
      })}
    </View>
  </View>;
}

function CalendarPlanActions({ plan, isDark, onEdit, onDelete, onOpenMap }: { plan: DeparturePlan; isDark: boolean; onEdit: (plan: DeparturePlan) => void; onDelete: (id: string) => void; onOpenMap: (plan: DeparturePlan) => void }) {
  const buttonStyle = { minHeight: 32, paddingHorizontal: 9, justifyContent: 'center' as const, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#CFC8DE' : '#DDD4F5', backgroundColor: isDark ? '#FFFFFF' : '#FAF8FF' };
  return <View style={[styles.scheduleAgendaActions, { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }]}>
    {plan.destination?.trim() && <Pressable hitSlop={6} style={buttonStyle} onPress={(event) => { event.stopPropagation(); onOpenMap(plan); }}><Text style={{ color: isDark ? '#5A3E9B' : colors.violet, fontSize: 10, fontWeight: '900' }}>地図</Text></Pressable>}
    <Pressable hitSlop={6} style={buttonStyle} onPress={(event) => { event.stopPropagation(); onEdit(plan); }}><Text style={{ color: isDark ? '#161421' : colors.ink, fontSize: 10, fontWeight: '900' }}>編集</Text></Pressable>
    {plan.id && <Pressable hitSlop={6} style={[buttonStyle, { borderColor: '#E3B9BF', backgroundColor: '#FFF7F7' }]} onPress={(event) => { event.stopPropagation(); onDelete(plan.id!); }}><Text style={{ color: '#B85060', fontSize: 10, fontWeight: '900' }}>削除</Text></Pressable>}
  </View>;
}

function TaskScheduleCalendar({ tasks, plans, externalEvents, now, designMode, chicPattern, planTier, focusDate, calendarMarks, onSetCalendarMark, onPremium, onEditTask, onDeleteTask, onEditPlan, onDeletePlan, onOpenMap, behaviorEvents, departureCheckIns, departurePreparationStatuses }: { tasks: Task[]; plans: DeparturePlan[]; externalEvents: Calendar.Event[]; now: Date; designMode: DesignMode; chicPattern: ChicPattern; planTier: PlanTier; focusDate?: string; calendarMarks: CalendarMarks; onSetCalendarMark: (date: string, mark?: string) => void; onPremium: (featureId?: PremiumGuideFeatureId) => void; onEditTask: (task: Task) => void; onDeleteTask: (id: string) => void; onEditPlan: (plan: DeparturePlan) => void; onDeletePlan: (id: string) => void; onOpenMap: (plan: DeparturePlan) => void; behaviorEvents: BehaviorEvent[]; departureCheckIns: DepartureCheckIn[]; departurePreparationStatuses: Record<string, DeparturePreparationStatus> }) {
  const theme = getThemeTokens(designMode);
  const isDark = designMode === 'dark';
  const [monthDate, setMonthDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(dateKey(now));
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'tasks' | 'plans'>('all');
  useEffect(() => {
    if (!focusDate) return;
    const date = dateForReminder(focusDate, '12:00');
    setMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedDate(normalizePlanDate(focusDate));
  }, [focusDate]);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const leading = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const taskDates = (task: Task) => Array.from(new Set([
    task.scheduledDate ?? dateKey(now),
    task.deadlineDate,
    task.remindDate,
    task.done && task.completedAt ? dateKey(task.completedAt) : undefined,
  ].filter((value): value is string => Boolean(value))));
  const selectedTasks = tasks.filter((task) => !task.done && taskDates(task).includes(selectedDate));
  const selectedCompletedTasks = tasks.filter((task) => task.done && taskDates(task).includes(selectedDate));
  const selectedPlans = plans.filter((item) => isPlanOnDate(item, selectedDate));
  const selectedExternalEvents = externalEvents.filter((event) => dateKey(new Date(event.startDate)) === selectedDate);
  const calendarPlanDisplayLimit = planTier === 'premium' ? 30 : 3;
  const visibleSelectedTasks = scheduleFilter === 'plans' ? [] : selectedTasks;
  const visibleSelectedCompletedTasks = scheduleFilter === 'plans' ? [] : selectedCompletedTasks;
  const selectedPlanEntries = scheduleFilter === 'tasks' ? [] : selectedPlans;
  const visibleSelectedPlans = selectedPlanEntries.slice(0, calendarPlanDisplayLimit);
  const hiddenSelectedPlanCount = Math.max(0, selectedPlanEntries.length - visibleSelectedPlans.length);
  const visibleSelectedExternalEvents = scheduleFilter === 'tasks' ? [] : selectedExternalEvents;
  const getPlanStatus = (item: DeparturePlan) => {
    const checkIn = item.id ? departureCheckIns.find((record) => record.planId === item.id && normalizePlanDate(record.date) === planDateKey(item)) : undefined;
    const departed = item.id ? behaviorEvents.some((event) => event.type === 'departure_started' && event.departurePlanId === item.id && normalizePlanDate(event.departurePlanDate) === planDateKey(item)) : false;
    const prepared = item.id ? departurePreparationStatuses[item.id] : undefined;
    return checkIn ? '到着済み' : departed ? '移動中' : prepared === 'prepared' ? '準備完了' : prepared === 'preparing' ? '準備中' : '未準備';
  };
  const getStatusPalette = (status: string) => status === '到着済み'
    ? { backgroundColor: '#DDF3E5', color: '#27714A' }
    : status === '移動中'
      ? { backgroundColor: '#E8E0FA', color: '#5A3E9B' }
      : status === '準備完了'
        ? { backgroundColor: '#E4F0FF', color: '#356AA5' }
        : status === '準備中'
          ? { backgroundColor: '#FFF0D6', color: '#9A641E' }
          : { backgroundColor: '#F0EDF2', color: '#6D6672' };
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
    const freeCompletedTasks = tasks.filter((task) => task.done && taskDates(task).includes(freeSelected));
    const freePlans = plans.filter((item) => isPlanOnDate(item, freeSelected));
    const visibleFreeTasks = scheduleFilter === 'plans' ? [] : freeTasks;
    const visibleFreeCompletedTasks = scheduleFilter === 'plans' ? [] : freeCompletedTasks;
    const freePlanEntries = scheduleFilter === 'tasks' ? [] : freePlans;
    const visibleFreePlans = freePlanEntries.slice(0, calendarPlanDisplayLimit);
    const hiddenFreePlanCount = Math.max(0, freePlanEntries.length - visibleFreePlans.length);
    return <>
      <View style={[styles.scheduleCalendarCard, designMode !== 'chic' && styles.scheduleCalendarCardMinimal, isDark && styles.darkSurface, { backgroundColor: isDark ? '#FFFFFF' : theme.colors.surface, borderColor: isDark ? '#D6D9DE' : theme.colors.border, borderRadius: designMode !== 'chic' ? 2 : theme.radius.large }]}>
        <View style={styles.scheduleCalendarHeader}><View><Text style={[styles.scheduleMonthTitle, isDark && styles.darkCalendarText]}>これから7日間</Text><Text style={[styles.scheduleMonthCopy, isDark && styles.darkCalendarAccent]}>今日から6日後までの予定</Text></View><Pressable onPress={() => onPremium('month')}><Text style={[styles.scheduleAgendaEdit, isDark && styles.darkCalendarAccent]}>月表示 Premium</Text></Pressable></View>
        <ScheduleFilterChips value={scheduleFilter} designMode={designMode} onChange={setScheduleFilter} compact />
        <View style={styles.scheduleGrid}>{freeDates.map(({ date, key }) => {
          const selected = key === freeSelected;
          const taskCount = scheduleFilter === 'plans' ? 0 : tasks.filter((task) => taskDates(task).includes(key)).length;
          const planCount = scheduleFilter === 'tasks' ? 0 : plans.filter((item) => isPlanOnDate(item, key)).length;
          const count = taskCount + planCount;
          return <Pressable key={key} style={[styles.scheduleDayCell, selected && styles.scheduleDayCellSelected, selected && { backgroundColor: isDark ? '#EEEAF7' : '#F3EEFF', borderColor: theme.colors.primaryAccent }]} onPress={() => setSelectedDate(key)}><Text style={[styles.scheduleDayNumber, date.getDay() === 0 && styles.scheduleSundayNumber, date.getDay() === 6 && styles.scheduleSaturdayNumber, selected && styles.scheduleSelectedNumber]}>{date.getMonth() + 1}/{date.getDate()}</Text>{calendarMarks[key] && <Text style={styles.scheduleCalendarMark}>{calendarMarks[key]}</Text>}{count > 0 && <Text style={[styles.scheduleMoreText, selected && styles.scheduleMoreTextSelected]}>{count}件</Text>}</Pressable>;
        })}</View>
      </View>
      <CalendarMarkPicker date={freeSelected} mark={calendarMarks[freeSelected]} onSet={onSetCalendarMark} designMode={designMode} />
      <View style={[styles.scheduleAgendaHeader, isDark && styles.darkPanel]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>{freeSelected.replaceAll('-', '.')} の予定</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{visibleFreeTasks.length + visibleFreeCompletedTasks.length + visibleFreePlans.length}件</Text></View>
      {visibleFreeTasks.map((task) => <Pressable key={task.id} style={styles.scheduleAgendaItem} onPress={() => onEditTask(task)}><View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{task.title}</Text><Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText]}>{task.category}</Text></View><Text style={[styles.scheduleAgendaEdit, isDark && styles.darkAccentText]}>編集 ›</Text></Pressable>)}
      {visibleFreeCompletedTasks.map((task) => <View key={`free-completed-${task.id}`} style={[styles.scheduleAgendaItem, styles.scheduleCompletedAgendaItem]}><View style={[styles.scheduleAgendaDot, styles.scheduleCompletedDot]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, styles.scheduleCompletedTitle]}>✓ {task.title}</Text><Text style={[styles.scheduleAgendaMeta, styles.scheduleCompletedMeta]}>完了したタスク ・ {task.completedAt ? formatLiveTime(new Date(task.completedAt)) : '記録あり'}</Text></View><Text style={styles.scheduleCompletedLabel}>完了</Text></View>)}
      {visibleFreePlans.map((item, index) => { const status = getPlanStatus(item); const palette = getStatusPalette(status); const isCountdownPlan = item.countdownEnabled !== false; return <Pressable key={item.id ?? `${item.title}-${index}`} style={styles.scheduleAgendaItem} onPress={() => onEditPlan(item)}><View style={[styles.scheduleAgendaDot, { backgroundColor: '#7B6BE8' }]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{item.title}</Text>{isCountdownPlan ? <View style={styles.schedulePlanMetaRow}><Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText]}>出発プラン ・ {item.arrival} 到着</Text><View style={[styles.scheduleStatusBadge, { backgroundColor: palette.backgroundColor }]}><Text style={[styles.scheduleStatusBadgeText, { color: palette.color }]}>{status}</Text></View></View> : <Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText]}>予定表の予定 ・ {item.arrival}</Text>}</View><CalendarPlanActions plan={item} isDark={isDark} onEdit={onEditPlan} onDelete={onDeletePlan} onOpenMap={onOpenMap} /></Pressable>; })}
      {hiddenFreePlanCount > 0 && <Pressable style={styles.departureEmpty} onPress={() => onPremium('month')}><Text style={styles.emptyCopy}>無料版は1日3件まで表示できます。残り{hiddenFreePlanCount}件はPremiumで確認できます。</Text></Pressable>}
      {visibleFreeTasks.length === 0 && visibleFreeCompletedTasks.length === 0 && visibleFreePlans.length === 0 && <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>この日はまだ空いています。</Text></View>}
    </>;
  }

  return <>
      <View style={[styles.scheduleCalendarCard, designMode !== 'chic' && styles.scheduleCalendarCardMinimal, isDark && styles.darkSurface, { backgroundColor: isDark ? '#FFFFFF' : theme.colors.surface, borderColor: isDark ? '#D6D9DE' : theme.colors.border, borderRadius: designMode !== 'chic' ? 2 : theme.radius.large }]}>
      {designMode === 'chic' && !isCheckChicPattern(chicPattern) && <View pointerEvents="none" style={styles.calendarPatternCorner}><ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" /></View>}
        <View style={styles.scheduleCalendarHeader}>
          <Pressable style={styles.scheduleMonthArrow} onPress={() => moveMonth(-1)}><Text style={styles.scheduleMonthArrowText}>‹</Text></Pressable>
        <View><Text style={[styles.scheduleMonthTitle, isDark && styles.darkCalendarText]}>{year}年 {month + 1}月</Text><Text style={[styles.scheduleMonthCopy, isDark && styles.darkCalendarAccent]}>予定をまとめて見渡す</Text></View>
        <Pressable style={styles.scheduleMonthArrow} onPress={() => moveMonth(1)}><Text style={styles.scheduleMonthArrowText}>›</Text></Pressable>
      </View>
      <ScheduleFilterChips value={scheduleFilter} designMode={designMode} onChange={setScheduleFilter} compact />
      <View style={styles.scheduleWeekRow}>{['日','月','火','水','木','金','土'].map((label) => <Text key={label} style={[styles.scheduleWeekLabel, isDark && styles.darkCalendarAccent]}>{label}</Text>)}</View>
      <View style={styles.scheduleGrid}>{cells.map((date, index) => {
        if (!date) return <View key={`empty-${index}`} style={styles.scheduleDayCell} />;
        const key = dateKey(date);
        const dayTasks = scheduleFilter === 'plans' ? [] : tasks.filter((task) => !task.done && taskDates(task).includes(key));
        const dayCompletedTasks = scheduleFilter === 'plans' ? [] : tasks.filter((task) => task.done && taskDates(task).includes(key));
        const dayPlans = scheduleFilter === 'tasks' ? [] : plans.filter((item) => isPlanOnDate(item, key));
        const dayExternalEvents = scheduleFilter === 'tasks' ? [] : externalEvents.filter((event) => dateKey(new Date(event.startDate)) === key);
        // 予定を追加したことが月表示でもすぐ分かるよう、出発予定は常に最初の帯にする。
        const visiblePlanBars = dayPlans.slice(0, 1);
        const visibleTaskBars = dayTasks.slice(0, Math.max(0, 2 - visiblePlanBars.length));
        const slotsAfterTasks = Math.max(0, 2 - visiblePlanBars.length - visibleTaskBars.length);
        const visibleCompletedBars = dayCompletedTasks.slice(0, slotsAfterTasks);
        const visibleExternalBars = dayExternalEvents.slice(0, Math.max(0, slotsAfterTasks - visibleCompletedBars.length));
        const dayItemCount = dayTasks.length + dayPlans.length + dayCompletedTasks.length + dayExternalEvents.length;
        const selected = key === selectedDate;
        const today = key === dateKey(now);
        return <Pressable key={key} style={[styles.scheduleDayCell, designMode === 'minimal' && styles.scheduleDayCellMinimal, today && styles.scheduleDayCellToday, selected && styles.scheduleDayCellSelected, selected && { backgroundColor: isDark ? '#EEEAF7' : '#F3EEFF', borderColor: theme.colors.primaryAccent }]} onPress={() => setSelectedDate(key)}>
          <Text style={[styles.scheduleDayNumber, date.getDay() === 0 && styles.scheduleSundayNumber, date.getDay() === 6 && styles.scheduleSaturdayNumber, today && styles.scheduleTodayNumber, selected && styles.scheduleSelectedNumber]}>{date.getDate()}</Text>
          {calendarMarks[key] && <Text style={styles.scheduleCalendarMark}>{calendarMarks[key]}</Text>}
          <View style={styles.scheduleEventStack}>
            {visiblePlanBars.map((item, itemIndex) => <View key={item.id ?? `${item.title}-${itemIndex}`} style={[styles.scheduleEventBar, styles.schedulePlanBar, selected && styles.scheduleEventBarSelected]}><Text numberOfLines={1} style={[styles.scheduleEventBarText, selected && styles.scheduleEventBarTextSelected, selected && isDark && styles.darkBodyText]}>{item.title}</Text></View>)}
            {visibleTaskBars.map((task) => <View key={task.id} style={[styles.scheduleEventBar, { backgroundColor: categoryColors[task.category] }, selected && styles.scheduleEventBarSelected]}><Text numberOfLines={1} style={[styles.scheduleEventBarText, selected && styles.scheduleEventBarTextSelected, selected && isDark && styles.darkBodyText]}>{task.title}</Text></View>)}
            {visibleCompletedBars.map((task) => <View key={`done-${task.id}`} style={[styles.scheduleEventBar, styles.scheduleCompletedBar]}><Text numberOfLines={1} style={styles.scheduleCompletedBarText}>✓ {task.title}</Text></View>)}
            {visibleExternalBars.map((event) => <View key={`external-${event.id}`} style={[styles.scheduleEventBar, { backgroundColor: '#B9A8D8' }, selected && styles.scheduleEventBarSelected]}><Text numberOfLines={1} style={[styles.scheduleEventBarText, selected && styles.scheduleEventBarTextSelected, selected && isDark && styles.darkBodyText]}>{event.title || 'カレンダー予定'}</Text></View>)}
            {dayItemCount > 2 && <Text style={[styles.scheduleMoreText, selected && styles.scheduleSelectedText, selected && isDark && styles.darkBodyText]}>ほか {dayItemCount - 2}件</Text>}
          </View>
        </Pressable>;
      })}</View>
      <View style={styles.scheduleLegend}><Text style={[styles.scheduleLegendText, isDark && styles.darkAccentText]}>色付き帯：タスク</Text><Text style={[styles.scheduleLegendPlan, isDark && styles.darkAccentText]}>紫の帯：出発予定</Text></View>
    </View>

    <CalendarMarkPicker date={selectedDate} mark={calendarMarks[selectedDate]} onSet={onSetCalendarMark} designMode={designMode} />
    <View style={[styles.scheduleAgendaHeader, isDark && styles.darkPanel]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>{selectedDate.replaceAll('-', '.')} の予定</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{visibleSelectedTasks.length + visibleSelectedCompletedTasks.length + visibleSelectedPlans.length + visibleSelectedExternalEvents.length}件</Text></View>
    {visibleSelectedTasks.length === 0 && visibleSelectedCompletedTasks.length === 0 && visibleSelectedPlans.length === 0 && visibleSelectedExternalEvents.length === 0 ? <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>この日はまだ空いています。</Text></View> : <>
      {visibleSelectedTasks.map((task) => {
        const overdue = Boolean(task.deadlineDate && getTargetDate(task) && getTargetDate(task)!.getTime() < now.getTime());
        return <Pressable key={task.id} style={[styles.scheduleAgendaItem, overdue && styles.scheduleAgendaDanger]} onPress={() => onEditTask(task)}>
          <View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} />
          <View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{task.title}</Text><Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText]}>{task.category} ・ {task.deadlineDate ? `期限 ${task.deadlineTime ?? ''}` : task.repeatRule && task.repeatRule !== 'none' ? 'ルーティン' : `リマインド ${task.remindAt ?? ''}`}</Text></View>
          <View style={styles.scheduleAgendaActions}><Text style={[styles.scheduleAgendaEdit, isDark && styles.darkAccentText]}>{overdue ? '期限超過' : '編集 ›'}</Text><Pressable onPress={(event) => { event.stopPropagation(); onDeleteTask(task.id); }}><Text style={styles.timelineTaskDelete}>削除</Text></Pressable></View>
        </Pressable>;
      })}
      {visibleSelectedCompletedTasks.map((task) => <View key={`completed-${task.id}`} style={[styles.scheduleAgendaItem, styles.scheduleCompletedAgendaItem]}><View style={[styles.scheduleAgendaDot, styles.scheduleCompletedDot]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, styles.scheduleCompletedTitle]}>✓ {task.title}</Text><Text style={[styles.scheduleAgendaMeta, styles.scheduleCompletedMeta]}>完了したタスク ・ {task.completedAt ? formatLiveTime(new Date(task.completedAt)) : '記録あり'}</Text></View><Text style={styles.scheduleCompletedLabel}>完了</Text></View>)}
      {visibleSelectedPlans.map((item, index) => { const status = getPlanStatus(item); const palette = getStatusPalette(status); const isCountdownPlan = item.countdownEnabled !== false; return <Pressable key={item.id ?? `${item.title}-${index}`} style={styles.scheduleAgendaItem} onPress={() => onEditPlan(item)}><View style={[styles.scheduleAgendaDot, { backgroundColor: '#7B6BE8' }]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{item.title}</Text>{isCountdownPlan ? <View style={styles.schedulePlanMetaRow}><Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText]}>出発プラン ・ {item.arrival} 到着</Text><View style={[styles.scheduleStatusBadge, { backgroundColor: palette.backgroundColor }]}><Text style={[styles.scheduleStatusBadgeText, { color: palette.color }]}>{status}</Text></View></View> : <Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText]}>予定表の予定 ・ {item.arrival}</Text>}</View><CalendarPlanActions plan={item} isDark={isDark} onEdit={onEditPlan} onDelete={onDeletePlan} onOpenMap={onOpenMap} /></Pressable>; })}
      {hiddenSelectedPlanCount > 0 && <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>この日は{calendarPlanDisplayLimit}件まで表示しています。</Text></View>}
      {visibleSelectedExternalEvents.map((event) => <View key={`external-agenda-${event.id}`} style={styles.scheduleAgendaItem}><View style={[styles.scheduleAgendaDot, { backgroundColor: '#B9A8D8' }]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{event.title || 'カレンダー予定'}</Text><Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText]}>端末カレンダー ・ {formatLiveTime(new Date(event.startDate))}</Text></View><Text style={[styles.scheduleAgendaEdit, isDark && styles.darkAccentText]}>外部</Text></View>)}
    </>}
  </>;
}

function ScheduleFilterChips({ value, designMode, onChange, compact = false }: { value: 'all' | 'tasks' | 'plans'; designMode: DesignMode; onChange: (value: 'all' | 'tasks' | 'plans') => void; compact?: boolean }) {
  return <View style={[styles.scheduleFilterRow, compact && styles.scheduleFilterRowInCalendar, designMode === 'dark' && styles.darkSurface]}>{([['all', 'すべて'], ['tasks', 'やること'], ['plans', '予定']] as const).map(([id, label]) => <Pressable key={id} onPress={() => onChange(id)} style={[styles.scheduleFilterChip, value === id && styles.scheduleFilterChipActive, value === id && designMode === 'dark' && styles.scheduleFilterChipActiveDark]}><Text style={[styles.scheduleFilterText, value === id && styles.scheduleFilterTextActive, value === id && designMode === 'dark' && styles.scheduleFilterTextActiveDark]}>{label}</Text></Pressable>)}</View>;
}

function CalendarMarkPicker({ date, mark, onSet, designMode }: { date: string; mark?: string; onSet: (date: string, mark?: string) => void; designMode: DesignMode }) {
  const stickers = ['🌸', '💗', '☕', '⭐', '🎯', '📌'];
  return <View style={[styles.calendarMarkPicker, designMode === 'minimal' && styles.calendarMarkPickerMinimal]}>
    <View style={{ flex: 1 }}><Text style={styles.calendarMarkTitle}>この日に目印</Text><Text style={styles.calendarMarkCopy}>{mark ? `${mark} を表示中` : 'シールを選んで予定や記録を目立たせる'}</Text></View>
    <View style={styles.calendarMarkChoices}>{stickers.map((sticker) => <Pressable key={sticker} style={[styles.calendarMarkChoice, mark === sticker && styles.calendarMarkChoiceActive]} onPress={() => onSet(date, mark === sticker ? undefined : sticker)}><Text style={styles.calendarMarkChoiceText}>{sticker}</Text></Pressable>)}{mark && <Pressable style={styles.calendarMarkClear} onPress={() => onSet(date, undefined)}><Text style={styles.calendarMarkClearText}>×</Text></Pressable>}</View>
  </View>;
}

function isCheckChicPattern(pattern: ChicPattern): boolean {
  return pattern === 'checkLavenderSatin' || pattern === 'checkBeigeNoir' || pattern === 'checkMauveFrame';
}

function FloralSprig({
  index,
  variant,
  compact,
  accent,
  warm,
  season = 'spring',
}: {
  index: number;
  variant: 'soft' | 'seasonal' | 'dark';
  compact: boolean;
  accent: string;
  warm: string;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
}) {
  const left = (index * (compact ? 71 : 113)) % (compact ? 260 : 520) - 22;
  const top = (index * (compact ? 53 : 91)) % (compact ? 430 : 1450) - 28;
  const rotation = ((index % 5) - 2) * (variant === 'seasonal' ? 8 : 11);
  const scale = (variant === 'seasonal' ? (index % 4 === 0 ? 1.18 : 0.96) : index % 5 === 0 ? 1.12 : 0.86) * (compact ? 0.72 : 1);
  const seasonalPalette = {
    spring: { stem: '#C88B92', primary: '#E59AAA', secondary: '#F6C9D0', center: '#D39A74', bloom: 23, petal: 9, petals: 5 },
    summer: { stem: '#8A9B72', primary: '#E7B84B', secondary: '#F4D98B', center: '#A96E37', bloom: 21, petal: 8, petals: 8 },
    autumn: { stem: '#9B6B54', primary: '#C97855', secondary: '#E1A16C', center: '#8D5D3C', bloom: 20, petal: 8, petals: 6 },
    winter: { stem: '#7E829D', primary: '#A9A6D0', secondary: '#D7D3EA', center: '#B7A9B8', bloom: 19, petal: 8, petals: 5 },
  }[season];
  const stemColor = variant === 'dark' ? '#775A6A' : variant === 'seasonal' ? seasonalPalette.stem : '#AA8C9B';
  const petalA = variant === 'dark' ? '#6F5365' : variant === 'seasonal' ? seasonalPalette.primary : accent;
  const petalB = variant === 'dark' ? '#A78699' : variant === 'seasonal' ? seasonalPalette.secondary : warm;
  const center = variant === 'seasonal' ? seasonalPalette.center : variant === 'dark' ? '#D1A7B0' : '#C5A172';
  const bloomSize = variant === 'seasonal' ? seasonalPalette.bloom : 16;
  const petalSize = variant === 'seasonal' ? seasonalPalette.petal : 7;
  const petalCount = variant === 'seasonal' ? seasonalPalette.petals : 5;
  const bloom = (key: string, x: number, y: number, size = bloomSize) => (
    <View key={key} style={[styles.floralBloom, { left: x, top: y, width: size, height: size }]}> 
      {Array.from({ length: petalCount }, (_, petalIndex) => (petalIndex * 360) / petalCount).map((angle, petalIndex) => (
        <View key={petalIndex} style={[styles.floralPetal, { width: petalSize, height: petalSize * 1.35, left: size / 2 - petalSize / 2, top: size / 2 - petalSize * 0.7, backgroundColor: petalIndex % 2 ? petalB : petalA, transform: [{ rotate: `${angle}deg` }, { translateY: -size * 0.27 }] }]} />
      ))}
      <View style={[styles.floralBloomCenter, { left: size / 2 - 3, top: size / 2 - 3, backgroundColor: center }]} />
    </View>
  );
  return (
    <View pointerEvents="none" style={[styles.floralSprig, { left, top, opacity: variant === 'dark' ? 0.52 : variant === 'seasonal' ? 0.5 : 0.38, transform: [{ rotate: `${rotation}deg` }, { scale }] }]}>
      <View style={[styles.floralStem, { backgroundColor: stemColor, transform: [{ rotate: `${index % 2 ? -10 : 8}deg` }] }]} />
      <View style={[styles.floralLeaf, { backgroundColor: stemColor, left: 25, top: 28, transform: [{ rotate: '-28deg' }] }]} />
      <View style={[styles.floralLeaf, { backgroundColor: stemColor, left: 40, top: 43, transform: [{ rotate: '32deg' }] }]} />
      <View style={[styles.floralLeaf, { backgroundColor: stemColor, left: 22, top: 58, transform: [{ rotate: '-42deg' }] }]} />
      {bloom('a', variant === 'seasonal' ? 12 : 22, variant === 'seasonal' ? 5 : 15, variant === 'seasonal' ? 23 : 16)}
      {bloom('b', variant === 'seasonal' ? 45 : 43, variant === 'seasonal' ? 29 : 34, variant === 'seasonal' ? 17 : 12)}
      {variant !== 'soft' && bloom('c', variant === 'seasonal' ? 5 : 18, 61, variant === 'seasonal' ? 14 : 11)}
    </View>
  );
}

function ChicPatternDecor({ pattern, accent, warm, density = 'regular', checkColor }: { pattern: ChicPattern | 'flower' | 'stripe'; accent: string; warm: string; density?: 'regular' | 'compact'; checkColor?: ChicCheckColor }) {
  const compact = density === 'compact';
  if (pattern === 'plain') return null;
  if (pattern === 'checkLavenderSatin' || pattern === 'checkBeigeNoir' || pattern === 'checkMauveFrame') {
    const selectedCheckColor = checkColor ? getChicCheckColor(checkColor) : undefined;
    const backgroundColor = selectedCheckColor?.background ?? (pattern === 'checkBeigeNoir' ? '#FBF4EA' : pattern === 'checkMauveFrame' ? '#FFF1F6' : '#F6F1FB');
    const cell = pattern === 'checkLavenderSatin' ? (compact ? 30 : 32) : pattern === 'checkBeigeNoir' ? (compact ? 12 : 14) : (compact ? 20 : 22);
    const verticalColor = selectedCheckColor ? `${selectedCheckColor.accent}30` : pattern === 'checkBeigeNoir' ? 'rgba(116,96,79,0.08)' : pattern === 'checkMauveFrame' ? 'rgba(185,119,143,0.12)' : 'rgba(185,173,216,0.17)';
    const horizontalColor = selectedCheckColor ? `${selectedCheckColor.warm}28` : pattern === 'checkBeigeNoir' ? 'rgba(201,180,154,0.14)' : pattern === 'checkMauveFrame' ? 'rgba(226,182,194,0.18)' : 'rgba(227,216,241,0.26)';
    const columns = Math.min(28, Math.ceil((compact ? 260 : 520) / cell) + 2);
    const rows = Math.min(48, Math.ceil((compact ? 420 : 1400) / cell) + 2);
    const overlapColor = selectedCheckColor ? `${selectedCheckColor.accent}42` : pattern === 'checkBeigeNoir' ? 'rgba(116,96,79,0.14)' : pattern === 'checkMauveFrame' ? 'rgba(185,119,143,0.19)' : 'rgba(185,173,216,0.25)';
    const bandSize = cell * 0.36;
    const bandOffset = (cell - bandSize) / 2;
    return <View pointerEvents="none" style={[styles.patternLayer, { backgroundColor }]}>
      {Array.from({ length: columns }, (_, index) => <View key={`v-${index}`} style={[styles.checkVerticalBand, { left: index * cell + bandOffset, width: bandSize, backgroundColor: verticalColor }]} />)}
      {Array.from({ length: rows }, (_, index) => <View key={`h-${index}`} style={[styles.checkHorizontalBand, { top: index * cell + bandOffset, height: bandSize, backgroundColor: horizontalColor }]} />)}
      {Array.from({ length: columns * rows }, (_, index) => { const column = index % columns; const row = Math.floor(index / columns); return <View key={`cross-${index}`} style={[styles.checkIntersection, { left: column * cell + bandOffset, top: row * cell + bandOffset, width: bandSize, height: bandSize, backgroundColor: overlapColor }]} />; })}
    </View>;
  }
  if (pattern === 'dot') return <View pointerEvents="none" style={styles.patternLayer}>
    {Array.from({ length: compact ? 160 : 144 }, (_, index) => { const columns = compact ? 22 : 18; const spacingX = compact ? 20 : 25; const spacingY = compact ? 18 : 22; const row = Math.floor(index / columns); const column = index % columns; const size = index % 3 === 0 ? (compact ? 5 : 6) : index % 2 === 0 ? 4 : 3; return <View key={index} style={[styles.patternDotSmall, { width: size, height: size, borderRadius: size / 2, backgroundColor: index % 2 ? warm : accent, left: 4 + column * spacingX + (row % 2 ? spacingX / 2 : 0), top: 5 + row * spacingY }]} />; })}
  </View>;
  const flowerPattern = pattern === 'floralSeasonal' ? 'seasonal' : pattern === 'floralDark' ? 'dark' : 'soft';
  const flowerAccent = flowerPattern === 'seasonal' ? '#E59AAA' : flowerPattern === 'dark' ? '#8E6678' : accent;
  const flowerWarm = flowerPattern === 'seasonal' ? '#F4C6CD' : flowerPattern === 'dark' ? '#B18B9A' : warm;
  const seasonalQuarter = Math.floor(new Date().getMonth() / 3);
  const seasonalName: 'spring' | 'summer' | 'autumn' | 'winter' = ['spring', 'summer', 'autumn', 'winter'][seasonalQuarter] as 'spring' | 'summer' | 'autumn' | 'winter';
  return <View pointerEvents="none" style={styles.patternLayer}>
    {Array.from({ length: compact ? (flowerPattern === 'seasonal' ? 18 : 24) : (flowerPattern === 'seasonal' ? 15 : 21) }, (_, index) => <FloralSprig key={index} index={index} variant={flowerPattern as 'soft' | 'seasonal' | 'dark'} season={seasonalName} compact={compact} accent={flowerAccent} warm={flowerWarm} />)}
  </View>;
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

function ChicPatternSelector({ designMode, chicPattern, chicCheckColor, planTier, onPattern, onCheckColor }: { designMode: DesignMode; chicPattern: ChicPattern; chicCheckColor: ChicCheckColor; planTier: PlanTier; onPattern: (pattern: ChicPattern) => void; onCheckColor: (color: ChicCheckColor) => void }) {
  const patterns: { id: ChicPattern; label: string; feature?: 'chic_dot' | 'chic_check_lavender_satin' | 'chic_check_beige_noir' | 'chic_check_mauve_frame' }[] = [
    { id: 'plain', label: 'プレーン' },
    { id: 'dot', label: 'ドット', feature: 'chic_dot' },
    { id: 'checkLavenderSatin', label: 'くすみラベンダーチェック', feature: 'chic_check_lavender_satin' },
    { id: 'checkBeigeNoir', label: 'ベージュ×ブラックチェック', feature: 'chic_check_beige_noir' },
    { id: 'checkMauveFrame', label: 'モーブフレームチェック', feature: 'chic_check_mauve_frame' },
  ];
  return <View style={[styles.patternSelectorNew, designMode === 'dark' && styles.darkSurface]}>
    <Text style={[styles.fieldLabel, designMode === 'dark' && styles.darkAccentText]}>背景の柄</Text>
    <View style={styles.patternChoices}>{patterns.map((item) => { const locked = !!item.feature && !hasPremiumAccess(planTier, item.feature); const visual = getChicPatternVisual(item.id); return <Pressable key={item.id} style={[styles.patternChoice, chicPattern === item.id && styles.patternChoiceActive]} onPress={() => { if (locked) return; onPattern(item.id); }}><View style={[styles.patternSwatch, styles.patternSwatchLarge, { backgroundColor: visual.background }]}><ChicPatternDecor pattern={item.id} accent={visual.accent} warm={visual.warm} density="compact" checkColor={chicCheckColor} /></View><Text style={[styles.patternChoiceText, chicPattern === item.id && styles.patternChoiceTextActive]}>{item.label}{locked ? ' 🔒' : ''}</Text></Pressable>; })}</View>
    {isCheckChicPattern(chicPattern) && <><Text style={[styles.fieldLabel, { marginTop: 12 }, designMode === 'dark' && styles.darkAccentText]}>チェックの色</Text><View style={styles.patternChoices}>{chicCheckColorChoices.map((choice) => <Pressable key={choice.id} style={[styles.patternChoice, chicCheckColor === choice.id && styles.patternChoiceActive]} onPress={() => onCheckColor(choice.id)}><View style={[styles.checkColorSwatch, { backgroundColor: choice.background, borderColor: choice.accent }]}><View style={[styles.checkColorSwatchBand, { backgroundColor: choice.accent }]} /><View style={[styles.checkColorSwatchBandHorizontal, { backgroundColor: choice.warm }]} /></View><Text style={[styles.patternChoiceText, chicCheckColor === choice.id && styles.patternChoiceTextActive]}>{choice.label}</Text></Pressable>)}</View></>}
  </View>;
}

function ScheduleSettingCard({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <View style={{ flex: 1, minWidth: 0, backgroundColor: '#F8F6FC', borderWidth: 1, borderColor: '#E8E1F0', borderRadius: 14, padding: 10 }}><Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800' }}>{label}</Text><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}><Pressable style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: '#EEE9FF', alignItems: 'center', justifyContent: 'center' }} onPress={() => onChange(Math.max(0, value - 5))}><Text style={{ color: colors.violet, fontSize: 17, fontWeight: '900' }}>−</Text></Pressable><Text style={{ color: colors.ink, fontSize: 13, fontWeight: '900' }}>{value}分</Text><Pressable style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: '#EEE9FF', alignItems: 'center', justifyContent: 'center' }} onPress={() => onChange(value + 5)}><Text style={{ color: colors.violet, fontSize: 17, fontWeight: '900' }}>＋</Text></Pressable></View></View>;
}

function SettingsDisclosure({ title, subtitle, expanded, onPress, children, designMode }: { title: string; subtitle: string; expanded: boolean; onPress: () => void; children: React.ReactNode; designMode?: DesignMode }) {
  const isDark = designMode === 'dark';
  return <View style={styles.settingsDisclosure}>
    <Pressable style={[styles.settingsDisclosureHeader, isDark && styles.darkSurface]} onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded }}>
      <View style={{ flex: 1 }}><Text style={[styles.settingsDisclosureTitle, isDark && styles.darkBodyText]}>{title}</Text><Text style={[styles.settingsDisclosureSubtitle, isDark && styles.darkAccentText]}>{subtitle}</Text></View>
      <Text style={[styles.settingsDisclosureChevron, isDark && styles.darkAccentText]}>{expanded ? '⌃' : '⌄'}</Text>
    </Pressable>
    {expanded && <View style={styles.settingsDisclosureBody}>{children}</View>}
  </View>;
}

function NotificationManagerCard({ designMode }: { designMode?: DesignMode }) {
  const isDark = designMode === 'dark';
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
  return <View style={[styles.notificationManagerCard, isDark && styles.darkSurface]}>
    <View style={styles.notificationManagerHeader}><View><Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>通知管理</Text><Text style={[styles.switchCopy, isDark && styles.darkAccentText]}>{loading ? '確認中…' : `${pending.length}件の通知を予約中`}</Text></View><Pressable style={styles.notificationRefresh} onPress={() => void refresh()}><Text style={styles.notificationRefreshText}>更新</Text></Pressable></View>
    {pending.slice(0, 4).map((request) => <View key={request.identifier} style={styles.notificationPendingRow}><View style={styles.notificationPendingDot} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.notificationPendingTitle, isDark && styles.darkBodyText]}>{request.content.title ?? '通知'}</Text><Text numberOfLines={1} style={[styles.notificationPendingBody, isDark && styles.darkAccentText]}>{request.content.body ?? ''}</Text></View></View>)}
    {pending.length > 4 && <Text style={[styles.notificationMore, isDark && styles.darkAccentText]}>ほか{pending.length - 4}件</Text>}
    <Pressable disabled={pending.length === 0} style={[styles.notificationStopButton, pending.length === 0 && styles.batchDisabled]} onPress={stopAll}><Text style={styles.notificationStopText}>予約通知をすべて停止</Text></Pressable>
  </View>;
}

function TodayWinStrip({ tasks, designMode, chicPattern, onRestore }: { tasks: Task[]; designMode: ThemeMode; chicPattern: ChicPattern; onRestore: (id: string) => void }) {
  const theme = getThemeTokens(designMode);
  const now = new Date();
  const todayKey = dateKey(now);
  const completedToday = tasks.filter((task) => task.done && task.completedAt && dateKey(task.completedAt) === todayKey);
  const count = completedToday.length;
  const drop = React.useRef(new Animated.Value(1)).current;
  const previous = React.useRef(count);
  const [dropVisible, setDropVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const nextNowTask = [...tasks]
    .filter((task) => !task.done && (task.bucket ?? 'now') === 'now')
    .sort((a, b) => {
      const priority: Record<Priority, number> = { 高: 0, 中: 1, 低: 2 };
      return priority[a.priority] - priority[b.priority];
    })[0];
  const remainingNow = tasks.filter((task) => !task.done && (task.bucket ?? 'now') === 'now').length;
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
  const details = (
    <Modal visible={detailsOpen} transparent animationType="slide" onRequestClose={() => setDetailsOpen(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setDetailsOpen(false)}>
        <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, borderRadius: theme.radius.modal }]} onPress={(event) => event.stopPropagation()}>
          {designMode === 'chic' && !isCheckChicPattern(chicPattern) && <View pointerEvents="none" style={styles.completedModalPattern}><ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" /></View>}
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>今日できたこと</Text>
          {completedToday.length === 0 ? (
            <Text style={styles.emptyCopy}>完了したタスクはまだありません。</Text>
          ) : completedToday.map((task) => (
            <View key={task.id} style={[styles.completedDetailRow, designMode === 'minimal' && styles.completedDetailRowMinimal]}>
              <Text style={[styles.completedDetailIcon, { color: theme.colors.primaryAccent }]}>{designMode !== 'chic' ? '✓' : '✿'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>{task.category}</Text>
              </View>
              <Pressable style={[styles.restoreButton, { backgroundColor: theme.colors.softAccent }]} onPress={() => onRestore(task.id)}>
                <Text style={[styles.restoreButtonText, { color: theme.colors.primaryAccent }]}>元に戻す</Text>
              </Pressable>
            </View>
          ))}
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryAccent, borderRadius: theme.radius.button }]} onPress={() => setDetailsOpen(false)}>
            <Text style={styles.primaryButtonText}>閉じる</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
  if (designMode !== 'chic') {
    return (
      <>
        <Pressable style={[styles.todayHeroCard, styles.todayHeroCardMinimal]} onPress={() => setDetailsOpen(true)}>
          <View style={styles.todayHeroMinimalLayout}>
            <View style={styles.todayHeroMinimalLeft}>
              <Text style={styles.todayHeroMinimalKicker}>TODAY</Text>
              <Text style={styles.todayHeroMinimalNumber}>{String(count).padStart(2, '0')}</Text>
              <Text style={styles.todayHeroMinimalNowLabel}>今はこれ</Text>
              <Text numberOfLines={2} style={styles.todayHeroMinimalTask}>{nextNowTask ? nextNowTask.title : remainingNow === 0 ? '今日の分は完了。いい感じ' : '次にやる1つをここで決めます'}</Text>
              <Text style={styles.todayHeroMinimalStats}>完了 {count} / 残り {remainingNow}</Text>
            </View>
            <View style={styles.todayHeroMinimalRight}>
              <View style={styles.todayHeroMinimalMeter}>
                {Array.from({ length: 8 }, (_, index) => <View key={index} style={[styles.todayHeroMinimalTick, index < Math.min(8, count) && styles.todayHeroMinimalTickFilled]} />)}
              </View>
              <Text style={styles.todayHeroMinimalHint}>今日できたことを確認</Text>
            </View>
          </View>
        </Pressable>
        {details}
      </>
    );
  }
  const item = '✿';
  return (
    <>
      <Pressable style={[styles.todayHeroCard, styles.todayHeroCardChic]} onPress={() => setDetailsOpen(true)}>
        {designMode === 'chic' && chicPattern === 'checkLavenderSatin' && <BThemeRibbonDecoration />}
        {designMode === 'chic' && chicPattern === 'checkBeigeNoir' && <CThemeRibbonDecoration />}
        <View style={styles.todayHeroChicLayout}>
          <View style={styles.todayHeroChicPlate}>
            <View style={styles.todayChicMark}><Text style={styles.todayChicMarkText}>✿</Text></View>
            <Text style={styles.todayHeroKicker}>今はこれ</Text>
            <Text numberOfLines={2} style={styles.todayHeroCopy}>{nextNowTask ? nextNowTask.title : remainingNow === 0 ? '今日の分は完了。いい感じ' : '次にやる1つをここで決めます'}</Text>
            <Text style={styles.todayHeroStats}>完了 {count}　残り {remainingNow}</Text>
          </View>
          <View style={styles.todayHeroJarWrap}>
            <View style={styles.miniJarWrap}>
              <View style={styles.miniJarLid} />
              <View style={[styles.miniJar, styles.miniJarChicGlass]}>
                {Array.from({ length: Math.min(12, count) }, (_, index) => <Text key={index} style={[styles.miniJarItem, { left: 8 + (index % 3) * 22, bottom: 4 + Math.floor(index / 3) * 14, color: index % 3 === 0 ? '#F3C7D5' : index % 3 === 1 ? '#DCCBF0' : '#F5E1A4' }]}>{index % 2 ? '✦' : '●'}</Text>)}
              </View>
              {dropVisible && <Animated.Text style={[styles.fallingTreasure, fallingStyle]}>{item}</Animated.Text>}
            </View>
            <Text style={styles.todayHeroJarHint}>タップして今日できたことを見る</Text>
          </View>
        </View>
      </Pressable>
      {details}
    </>
  );
}

function AchievementVessel({ tasks, designMode, chicPattern = 'plain', scope = 'month', compact = false }: { tasks: Task[]; designMode: ThemeMode; chicPattern?: ChicPattern; scope?: 'today' | 'month'; compact?: boolean }) {
  const now = new Date();
  const completed = tasks.filter((task) => {
    if (!task.completedAt) return false;
    const completedDate = new Date(task.completedAt);
    return scope === 'today' ? dateKey(completedDate) === dateKey(now) : completedDate.getFullYear() === now.getFullYear() && completedDate.getMonth() === now.getMonth();
  });
  const visible = completed.slice(-18);
  if (designMode !== 'chic') {
    return <View style={[styles.minimalAchievement, compact && styles.minimalAchievementCompact, designMode === 'dark' && styles.minimalAchievementDark]}><View><Text style={[styles.minimalAchievementLabel, designMode === 'dark' && styles.minimalAchievementLabelDark]}>{scope === 'today' ? '今日できたこと' : '今月の記録'}</Text><Text style={[styles.minimalAchievementNumber, compact && styles.minimalAchievementNumberCompact, designMode === 'dark' && styles.minimalAchievementNumberDark]}>{String(completed.length).padStart(2, '0')}</Text><Text style={[styles.taskMeta, designMode === 'dark' && styles.minimalAchievementLabelDark]}>{completed.length}件完了</Text></View><View style={styles.minimalAchievementBars}>{Array.from({ length: 10 }, (_, item) => <View key={item} style={[styles.minimalAchievementBar, item < Math.min(10, completed.length) && styles.minimalAchievementBarFilled, designMode === 'dark' && styles.minimalAchievementBarDark, item < Math.min(10, completed.length) && designMode === 'dark' && styles.minimalAchievementBarFilledDark]} />)}</View></View>;
  }
  return <View style={[styles.vesselScene, compact && styles.vesselSceneCompact, designMode === 'chic' && styles.vesselSceneChic, ]}>
    {designMode === 'chic' && !isCheckChicPattern(chicPattern) && <ChicPatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" />}
    <View style={[styles.vesselLabel, designMode === 'chic' && styles.vesselLabelChic]}><Text style={styles.vesselLabelTop}>{scope === 'today' ? '今日の小さな達成' : designMode === 'chic' ? '今月の小さな達成' : '今月のできたこと'}</Text><Text style={[styles.vesselLabelTitle, compact && styles.vesselLabelTitleCompact]}>{completed.length}個のできた！</Text></View>
    <View style={styles.jarLid} />
    <View style={[styles.jarBody, compact && styles.jarBodyCompact, ]}>
      {visible.map((task, index) => <View key={task.id} style={[styles.jarTreasure, { left: 13 + (index % 6) * 39, bottom: 10 + Math.floor(index / 6) * 35, transform: [{ rotate: `${(index % 5) * 8 - 16}deg` }] }]}><Text style={styles.jarTreasureText}>{designMode === 'chic' ? (index % 3 === 0 ? '✿' : index % 3 === 1 ? '★' : '●') : (index % 2 ? '★' : '🍪')}</Text></View>)}
      {visible.length === 0 && <Text style={styles.jarEmptyText}>最初のひとつを待っています</Text>}
    </View>
    {!compact && <Text style={styles.vesselCaption}>{designMode === 'chic' ? '終わるたび、瓶に小さな花が増えます' : '相棒の宝物が少しずつ増えていくよ'}</Text>}
  </View>;
}
