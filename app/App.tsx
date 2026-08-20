import * as Calendar from 'expo-calendar';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { ChicCheckColor, ChicPattern, ChicThemePalette, DesignMode, chicCheckColorChoices, getChicCheckColor, getDesignCheckColorLabel, getDesignCheckThemeTokens, getDesignPatternThemeTokens, getThemeTokens, normalizeChicCheckColor, normalizeChicPattern } from './theme';
import { RecoveryRecord } from './recovery';
import { createCompletedFocusSession, createFocusSessionId, FocusSession } from './focusSession';
import { createDepartureCheckIn, DepartureCheckIn } from './departureCheckIn';
import { getChicPatternFeatureId, getEffectiveChicPattern, getEffectiveNudgeMode, hasPremiumAccess, PlanTier } from './premiumAccess';
import { AnalysisScreen } from './AnalysisScreen';
import { BThemeRibbonDecoration, BThemeRibbonPreload } from './components/BThemeRibbonDecoration';
import { CThemeRibbonDecoration, CThemeRibbonPreload } from './components/CThemeRibbonDecoration';
import { appendBehaviorEvent, appendBehaviorEvents, BehaviorEvent, createDeparturePreparationStartedEvent, createDepartureStartedEvent, createFocusCompletedBehaviorEvent, createFocusStartedEvent, createFocusStoppedEvent, createNotificationActionEvent, createNotificationScheduledEvent, createRoutineDeactivatedBehaviorEvent, createRoutineStateChangedBehaviorEvent, createTaskCompletedBehaviorEvent, createTaskCompletionRevertedBehaviorEvent, NotificationAction } from './behaviorEvents';
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
import { OnboardingCarousel } from './features/onboarding/OnboardingCarousel';
import { OnboardingHint } from './features/onboarding/OnboardingHint';
import { useOnboarding } from './features/onboarding/useOnboarding';
import { RecoveryModal } from './components/RecoveryModal';
import { styles } from './styles/appStyles';
import { Affirmation, AffirmationCustomText, CalendarMarks, Category, DeparturePlan, DeparturePreparationStatus, MonthlyReview, MonthlyWishState, NudgeMode, PersistedState, PhotoThemePhotoTarget, PhotoThemeSettings, Priority, RepeatRule, Screen, SharedEvent, SharedParticipantPrefs, Subtask, Task, TaskBucket, ThemeMode, TimeTab, UrgencyStatus, WidgetSize, WishAction, WishMonthMap } from './types';
import { initialPlan } from './storage/rhythmState';
import { loadRhythmState, saveRhythmState } from './storage/rhythmStorage';
import { categories, priorities, completionIcons, categoryColors as baseCategoryColors, designModes, getLateRiskMessage, getNextBestAction, getUrgencyStatus, urgencyLevel } from './features/tasks/taskUtils';
import { createSharedEventPacket, createSharedEventToken, encodeSharedEventLink, normalizeSharedEvent, parseSharedEventLink, upsertSharedEvent } from './features/shared/sharedUtils';
import { getMonthlyWishState, wishMonthKey } from './features/wish/wishUtils';
import { cancelPendingTaskNotifications } from './features/tasks/taskNotifications';
import { cancelPendingDepartureNotifications } from './features/departure/departureNotifications';
import { getDeparturePlanMode, getPlanScheduledTime, isArrivalReversePlan, isDepartureReminderPlan, normalizeDeparturePlanForSave } from './features/departure/departurePlanMode';
import { WishScreen } from './WishScreen';
import { SharedEventScreen } from './SharedEventScreen';
import { TopImageCropModal } from './components/TopImageCropModal';
import { cropRectToPixels, displayToNormalizedRect, getContainBounds, getInitialCropRect, NormalizedCropRect } from './features/photo/topImageCrop';
import { deleteManagedPhotoUri, persistPhotoUri } from './features/photo/persistentPhoto';
import { canUseNotifications, getNotificationPermissionAction, getNotificationPermissionStatus, requestRhythmNotificationPermission } from './features/notifications/notificationPermission';
import { canCreateWish } from './features/ads/rewardedAccessLogic';
import { DEFAULT_REWARDED_ACCESS_STATE, loadRewardedAccessState, RewardedAccessState, saveRewardedAccessState } from './features/ads/rewardedAccessStorage';
import { cancelFocusCompletionNotification, cancelPendingFocusCompletionNotifications, scheduleFocusCompletionNotification } from './features/focus/focusNotifications';
import { FOCUS_NAVIGATION_GUARD_COPY, getFocusNavigationDecision } from './features/focus/focusUsagePolicy';
import {
  Alert,
  Animated,
  useColorScheme,
  Easing,
  Image,
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
  Vibration,
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
const categoryColors = baseCategoryColors;

const focusCompletionMessages = [
  'お疲れさま。ここまで集中できたね',
  'よく頑張ったね。少し休憩しよう',
  '集中タイム完了。頭と体を休ませよう',
  'ひと区切りついたね。水分補給しよう',
  '今取り組んだ時間は、ちゃんと積み重なっているよ',
  'ここまで進めた自分を認めよう',
  'ナイス集中。次は無理せず休もう',
  '今日の自分に、まずは小さな拍手',
] as const;

const taskCompletionMessages = [
  'タスク完了。今日も一歩前進',
  'よくできたね。ちゃんと終わらせたよ',
  'ひとつ片づいたね。えらい',
  'やることをひとつ減らせたね',
  '今日の自分、いい感じ',
  '完了できた自分を褒めよう',
  '小さな達成も、大事な前進',
  'よく頑張ったね。次も自分のペースで',
] as const;

type CompletionFeedbackKind = 'focus' | 'task';

// One static image per floral pattern. The same cached asset is reused by the
// app background and pattern previews; no flowers are generated at runtime.
const designFloralBackgroundAssets: Record<'floral' | 'floralSoft' | 'floralSeasonal' | 'floralDark', number> = {
  floral: require('./assets/themes/floral/vintage-bloom.jpg'),
  floralSoft: require('./assets/themes/floral/botanical-line.jpg'),
  floralSeasonal: require('./assets/themes/floral/sheer-floral.jpg'),
  floralDark: require('./assets/themes/floral/sheer-floral.jpg'),
};

// PREPARED is retained only to safely receive actions from notifications that
// were scheduled by earlier app versions.
type DepartureNotificationAction = 'DEPARTED' | 'PREPARING' | 'PREPARED' | 'PREPARE_LATER' | 'DEPARTURE_SNOOZE' | 'PREPARATION_SNOOZE';
const departureNotificationActions: readonly DepartureNotificationAction[] = ['DEPARTED', 'PREPARING', 'PREPARED', 'PREPARE_LATER', 'DEPARTURE_SNOOZE', 'PREPARATION_SNOOZE'];

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

function triggerHaptic(enabled: boolean, pattern: number | number[] = 20) {
  if (!enabled) return;
  try { Vibration.vibrate(pattern); } catch { /* unsupported devices simply skip haptics */ }
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

function normalizeTaskDateKey(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return undefined;
  return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`;
}

function getTaskStatus(task: Task): 'active' | 'completed' | 'skipped' {
  return task.status ?? (task.done ? 'completed' : 'active');
}

function isTaskSkippedOnDate(task: Task, day: string) {
  return getTaskStatus(task) === 'skipped' && Boolean(task.skippedAt) && dateKey(task.skippedAt!) === day;
}

function reviewIdentity(review: MonthlyReview) {
  return review.id ?? `${review.date ?? ''}|${review.shortNote ?? ''}|${review.memo ?? ''}|${review.satisfaction ?? 0}`;
}

function reviewsForMonth(monthState: MonthlyWishState) {
  if (monthState.reviews?.length) return monthState.reviews;
  const review = monthState.review;
  return review && (review.photo || review.date || review.shortNote || review.memo || review.satisfaction) ? [review] : [];
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
  if (rule === 'monthly') base.setMonth(base.getMonth() + 1);
  else base.setDate(base.getDate() + (rule === 'weekly' ? 7 : 1));
  if (rule === 'weekdays') {
    while (base.getDay() === 0 || base.getDay() === 6) base.setDate(base.getDate() + 1);
  }
  return dateKey(base);
}

function completeTasksWithRepeats(current: Task[], ids: string[]) {
  const completedAt = new Date().toISOString();
  const nextTasks: Task[] = [];
  const updated = current.map((task) => {
    if (!ids.includes(task.id) || task.done || getTaskStatus(task) === 'skipped') return task;
    const rule = task.repeatRule ?? 'none';
    if (rule !== 'none') {
      nextTasks.push({
        ...task,
        id: `${Date.now()}-${task.id}-${Math.random().toString(16).slice(2)}`,
        createdAt: task.createdAt,
        done: false,
        status: 'active',
        skippedAt: undefined,
        completedAt: undefined,
        deadlineDate: task.deadlineDate ? advanceDateValue(task.deadlineDate, rule) : undefined,
        remindDate: task.remindAt ? advanceDateValue(task.remindDate ?? task.scheduledDate ?? dateKey(), rule) : undefined,
        scheduledDate: advanceDateValue(task.scheduledDate ?? dateKey(), rule),
        scheduledTime: task.scheduledTime,
        isRoutine: task.isRoutine,
        routineId: task.routineId ?? (task.isRoutine ? task.id : undefined),
        subtasks: task.subtasks?.map((item, index) => ({ ...item, order: index, done: false })),
      });
    }
    return { ...task, done: true, status: 'completed' as const, skippedAt: undefined, completedAt, subtasks: task.subtasks?.map((item) => ({ ...item, done: true })) };
  });
  return [...nextTasks, ...updated];
}

type TaskCompletionResult = { tasks: Task[]; newlyCompleted: Task[] };

function completeTasksAndCollectEvents(current: Task[], ids: string[]): TaskCompletionResult {
  const eligibleIds = new Set(current.filter((task) => ids.includes(task.id) && !task.done && getTaskStatus(task) !== 'skipped').map((task) => task.id));
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

function formatLiveDate(now: Date) {
  return `${now.getMonth() + 1}月${now.getDate()}日 ${['日', '月', '火', '水', '木', '金', '土'][now.getDay()]}曜日`;
}

function formatLiveTime(now: Date) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function countdownToClock(clock: string, now: Date) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) return '予定なし';
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

function getPlanCountdownAt(plan: DeparturePlan) {
  return isDepartureReminderPlan(plan)
    ? dateForReminder(planDateKey(plan), getPlanScheduledTime(plan))
    : getDepartureMoments(plan).leave;
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

function getChicPatternVisual(pattern: ChicPattern, palette: ChicThemePalette = getDesignCheckThemeTokens('cool')) {
  // Pattern controls the decoration only. UI accents always come from the
  // selected Design color so dots and cards do not fall back to pink/purple.
  if (pattern === 'dot') return { background: palette.background, accent: palette.accent, warm: palette.accentSoft };
  if (pattern === 'checkBeigeNoir' || pattern === 'checkMauveFrame' || pattern === 'checkLavenderSatin') return { background: palette.background, accent: palette.accent, warm: palette.patternStripe };
  if (pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark') {
    const floralPalette = getDesignPatternThemeTokens(pattern, 'cool');
    return { background: floralPalette.background, accent: palette.accent, warm: palette.accentSoft };
  }
  return { background: palette.background, accent: palette.accent, warm: palette.accentSoft };
}

function getInitialNormalizedCrop(sourceWidth: number, sourceHeight: number): NormalizedCropRect {
  const bounds = getContainBounds(sourceWidth, sourceHeight, sourceWidth, sourceHeight);
  const rect = getInitialCropRect(bounds);
  return displayToNormalizedRect(rect, bounds);
}

async function ensureNotifications() {
  const status = await getNotificationPermissionStatus();
  if (!canUseNotifications(status)) {
    const action = getNotificationPermissionAction(status);
    const proceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        '通知を許可しますか？',
        '設定した時間や集中タイムの終了をRhythmからお知らせします。',
        action === 'openSettings'
          ? [{ text: 'あとで', style: 'cancel', onPress: () => resolve(false) }, { text: 'iPhoneの設定を開く', onPress: () => { void Linking.openSettings(); resolve(false); } }]
          : [{ text: 'あとで', style: 'cancel', onPress: () => resolve(false) }, { text: '通知を許可する', onPress: () => resolve(true) }],
      );
    });
    if (!proceed) return false;
    const requested = await requestRhythmNotificationPermission();
    if (!canUseNotifications(requested)) return false;
  }

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
    { identifier: 'DEPARTURE_SNOOZE', buttonTitle: 'まだ', options: { opensAppToForeground: false } },
  ]);
  await Notifications.setNotificationCategoryAsync('PREPARATION_ACTIONS', [
    { identifier: 'PREPARING', buttonTitle: '準備を始める', options: { opensAppToForeground: false } },
    { identifier: 'PREPARE_LATER', buttonTitle: 'まだ', options: { opensAppToForeground: false } },
    { identifier: 'PREPARATION_SNOOZE', buttonTitle: '5分後に再通知', options: { opensAppToForeground: false } },
  ]);
  return true;
}

async function scheduleAffirmationNotification(affirmation: Affirmation) {
  const minutes = parseClock(affirmation.time);
  return Notifications.scheduleNotificationAsync({
    identifier: `affirmation:${affirmation.id}`,
    content: {
      title: '今日の言葉',
      body: affirmation.text,
      data: { affirmationId: affirmation.id, kind: 'affirmation' },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: Math.floor(minutes / 60),
      minute: minutes % 60,
    },
  });
}

export default function App() {
  const onboarding = useOnboarding();
  const [screen, setScreen] = useState<Screen>('home');
  const [focusNavigationNotice, setFocusNavigationNotice] = useState(false);
  const [timelineInitialTab, setTimelineInitialTab] = useState<TimeTab>('departure');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusTimerActive, setFocusTimerActive] = useState(false);
  const [rewardedAccess, setRewardedAccess] = useState<RewardedAccessState>(DEFAULT_REWARDED_ACCESS_STATE);
  const rewardedWishBusyRef = React.useRef(false);
  const tasksRef = React.useRef<Task[]>([]);
  const scheduleTaskNotificationsRef = React.useRef<(task: Task) => Promise<void>>(async () => undefined);
  const hydratedRef = React.useRef(false);
  useEffect(() => {
    let active = true;
    void loadRewardedAccessState().then((loaded) => { if (active) setRewardedAccess(loaded); });
    return () => { active = false; };
  }, []);
  const persistenceDisabledRef = React.useRef(false);
  const saveFailureNotifiedRef = React.useRef(false);
  const pendingNotificationCompletionIdsRef = React.useRef<string[]>([]);
  const pendingDepartureNotificationActionsRef = React.useRef<Array<{
    planId: string;
    action: DepartureNotificationAction;
    notificationInstanceId: string;
  }>>([]);
  const [plan, setPlan] = useState<DeparturePlan>(initialPlan);
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [departurePlans, setDeparturePlans] = useState<DeparturePlan[]>([]);
  const departurePlansRef = React.useRef<DeparturePlan[]>([]);
  const [departureCheckIns, setDepartureCheckIns] = useState<DepartureCheckIn[]>([]);
  const departureCheckInsRef = React.useRef<DepartureCheckIn[]>([]);
  const [departurePreparationStatuses, setDeparturePreparationStatuses] = useState<Record<string, DeparturePreparationStatus>>({});
  const [widgetSize, setWidgetSize] = useState<WidgetSize>('medium');
  const [showCompleted, setShowCompleted] = useState(false);
  const [completionIcon, setCompletionIcon] = useState('✓');
  // Mono is available to every plan. Keep the persisted design mode stable and
  // resolve the actual Light/Dark rendering from this preference and the OS.
  const [designMode, setDesignMode] = useState<DesignMode>('minimal');
  const [monoAppearance, setMonoAppearance] = useState<'auto' | 'light' | 'dark'>('auto');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const hapticsPreferenceTouchedRef = React.useRef(false);
  const [reviewPromptedAt, setReviewPromptedAt] = useState<string | undefined>();
  // useColorScheme subscribes to iOS/Android appearance changes and triggers a
  // render immediately. It is only consulted while Mono is selected; Design
  // remains independent from the OS appearance.
  const systemColorScheme = useColorScheme();
  const [chicPattern, setChicPattern] = useState<ChicPattern>('plain');
  const [chicCheckColor, setChicCheckColor] = useState<ChicCheckColor>('cool');
  const [affirmations, setAffirmations] = useState<Affirmation[]>([]);
  const [affirmationCustomTexts, setAffirmationCustomTexts] = useState<AffirmationCustomText[]>([]);
  const affirmationsRef = React.useRef<Affirmation[]>([]);
  const completeTaskIdsRef = React.useRef<(ids: string[], source?: 'manual' | 'notification') => void>(() => undefined);
  const [completionAffirmation, setCompletionAffirmation] = useState<string>();
  const completionAffirmationTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const completionAffirmationLastRef = React.useRef<string | undefined>(undefined);
  const completionAffirmationRunRef = React.useRef(0);
  const lastAffirmationNotificationTextRef = React.useRef<string | undefined>(undefined);
  const preparationFeedbackKeysRef = React.useRef(new Set<string>());
  const completionAffirmationOpacity = React.useRef(new Animated.Value(0)).current;
  const [photoTheme, setPhotoTheme] = useState<PhotoThemeSettings>({ placement: 'background' });
  const [pendingTopPhoto, setPendingTopPhoto] = useState<{ target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>; originalUri: string; sourceWidth: number; sourceHeight: number; cropRect?: NormalizedCropRect }>();
  const [recoveryHistory, setRecoveryHistory] = useState<RecoveryRecord[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [behaviorEvents, setBehaviorEvents] = useState<BehaviorEvent[]>([]);
  const behaviorEventsRef = React.useRef<BehaviorEvent[]>([]);
  const pendingBehaviorEventsRef = React.useRef<BehaviorEvent[]>([]);
  const pendingNotificationBehaviorActionsRef = React.useRef<Array<{ notificationInstanceId: string; action: NotificationAction; taskId?: string; actualAt: Date }>>([]);
  const pendingDepartureFollowUpsRef = React.useRef(new Set<string>());
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
  // The pattern is decorative only; the selected Design color owns the UI
  // palette across every screen.
  const appDesignPaletteId = chicCheckColor;
  const isMonoDesign = designMode === 'minimal' || designMode === 'dark';
  const resolvedMonoMode: 'minimal' | 'dark' = monoAppearance === 'dark'
    ? 'dark'
    : monoAppearance === 'light'
      ? 'minimal'
      : systemColorScheme === 'dark' ? 'dark' : 'minimal';
  const theme = useMemo(() => getThemeTokens(isMonoDesign ? resolvedMonoMode : designMode, appDesignPaletteId), [designMode, isMonoDesign, resolvedMonoMode, appDesignPaletteId]);
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
  const photoThemeEnabled = designMode === 'photo' && hasPremiumAccess(planTier, 'photo_design');
  const uiDesignMode: Exclude<DesignMode, 'photo'> = designMode === 'photo'
    ? 'chic'
    : isMonoDesign ? resolvedMonoMode : designMode;
  const photoBackgroundUri = photoThemeEnabled && photoTheme.placement !== 'top' ? photoTheme.imageUri : undefined;
  const photoTopImageUri = photoThemeEnabled ? photoTheme.topImageUris?.[screen] ?? photoTheme.topImageOriginalUris?.[screen] ?? (photoTheme.placement === 'top' ? photoTheme.imageUri : undefined) : undefined;
  const focusBackgroundUri = photoThemeEnabled ? photoTheme.focusBackgroundUri : undefined;
  const effectiveChicPattern = getEffectiveChicPattern(planTier, chicPattern) as ChicPattern;
  // Keep decorative pattern and UI color independent. Floral/check/dot
  // backgrounds are selected by `chicPattern`; all Design UI surfaces use the
  // chosen `chicCheckColor` tokens.
  const chicPalette = getDesignCheckThemeTokens(chicCheckColor);
  const getThemedThemeTokens = React.useCallback((mode: DesignMode) => getThemeTokens(mode, mode === 'chic' ? chicPalette.id : chicCheckColor), [chicCheckColor, chicPalette]);
  // Design uses one palette for every surface. Keep the legacy color shape for
  // components that still consume the shared app colors object.
  const themedColors = useMemo(() => uiDesignMode === 'chic' ? {
    ...colors,
    background: chicPalette.background,
    surface: chicPalette.cardSurface,
    ink: chicPalette.textPrimary,
    muted: chicPalette.textSecondary,
    violet: chicPalette.accent,
    violetSoft: chicPalette.accentSoft,
    coral: chicPalette.accent,
    coralSoft: chicPalette.cardTint,
    mint: chicPalette.accentSoft,
    line: chicPalette.border,
  } : colors, [uiDesignMode, chicPalette]);
  const currentWishMonthKey = wishMonthKey(now);
  const showCompletionAffirmation = React.useCallback((kind: CompletionFeedbackKind = 'task', withHaptic = false) => {
    const configured = [...affirmations.map((item) => item.text.trim()), ...affirmationCustomTexts.map((item) => item.text.trim())].filter(Boolean);
    const fallback = kind === 'focus' ? focusCompletionMessages : taskCompletionMessages;
    const candidates = [...configured, ...fallback];
    const nonRepeating = candidates.filter((text) => text !== completionAffirmationLastRef.current && text !== lastAffirmationNotificationTextRef.current);
    const pool = nonRepeating.length > 0 ? nonRepeating : candidates.filter((text) => text !== completionAffirmationLastRef.current);
    const text = pool[Math.floor(Math.random() * pool.length)] ?? fallback[0] ?? 'よく頑張ったね';
    completionAffirmationLastRef.current = text;
    const runId = completionAffirmationRunRef.current + 1;
    completionAffirmationRunRef.current = runId;
    if (completionAffirmationTimerRef.current) clearTimeout(completionAffirmationTimerRef.current);
    setCompletionAffirmation(text);
    completionAffirmationOpacity.stopAnimation();
    completionAffirmationOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(completionAffirmationOpacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(completionAffirmationOpacity, { toValue: 0, duration: 320, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished && completionAffirmationRunRef.current === runId) setCompletionAffirmation(undefined); });
    if (withHaptic) triggerHaptic(hapticsEnabled, [0, 35, 70]);
  }, [affirmations, affirmationCustomTexts, completionAffirmationOpacity, hapticsEnabled]);
  const currentWishState = getMonthlyWishState(wishMonths, currentWishMonthKey);
  const saveCurrentWishState = React.useCallback((updater: (current: MonthlyWishState) => MonthlyWishState) => {
    setWishMonths((current) => {
      const previous = getMonthlyWishState(current, currentWishMonthKey);
      return { ...current, [currentWishMonthKey]: updater(previous) };
    });
    void onboarding.complete('wish');
  }, [currentWishMonthKey, onboarding]);
  const updateWishReview = React.useCallback((monthKey: string, reviewKey: string, updates: Partial<MonthlyReview>) => {
    setWishMonths((current) => {
      const monthState = getMonthlyWishState(current, monthKey);
      const reviews = reviewsForMonth(monthState);
      const updated = reviews.map((review) => reviewIdentity(review) === reviewKey ? { ...review, ...updates } : review);
      return { ...current, [monthKey]: { ...monthState, review: updated[updated.length - 1] ?? monthState.review, reviews: updated } };
    });
  }, []);
  const deleteWishReview = React.useCallback((monthKey: string, reviewKey: string) => {
    setWishMonths((current) => {
      const monthState = getMonthlyWishState(current, monthKey);
      const reviews = reviewsForMonth(monthState);
      const remaining = reviews.filter((review) => reviewIdentity(review) !== reviewKey);
      // 履歴から削除した直後に、前のレビューを入力欄へ復元しない。
      // 旧形式 review は互換用に残すが、現在の入力 draft は常に空へ戻す。
      return { ...current, [monthKey]: { ...monthState, review: {}, reviews: remaining } };
    });
  }, []);
  const saveDailyReview = React.useCallback((monthKey: string, draft: MonthlyReview) => {
    setWishMonths((current) => {
      const monthState = getMonthlyWishState(current, monthKey);
      const reviews = reviewsForMonth(monthState);
      const photos = draft.photos?.filter(Boolean) ?? (draft.photo ? [draft.photo] : []);
      const nextReview: MonthlyReview = { ...draft, id: draft.id ?? `journal-${draft.date ?? Date.now()}`, photo: photos[0] ?? '', photos };
      const existingIndex = reviews.findIndex((review) => review.id === nextReview.id || review.date === nextReview.date);
      const nextReviews = existingIndex >= 0 ? reviews.map((review, index) => index === existingIndex ? { ...review, ...nextReview } : review) : [...reviews, nextReview];
      return { ...current, [monthKey]: { ...monthState, review: {}, reviews: nextReviews } };
    });
    if ((draft.photos?.filter(Boolean).length ?? (draft.photo ? 1 : 0)) > 0) void onboarding.complete('photoLog');
  }, [onboarding]);
  const openPremiumFeature = React.useCallback((featureId: PremiumGuideFeatureId = DEFAULT_PREMIUM_GUIDE_FEATURE) => {
    setPremiumTargetFeature(featureId);
    setPremiumOpen(true);
  }, []);
  const openWish = React.useCallback(() => {
    setScreen('wish');
  }, []);
  const requestWishReward = React.useCallback(async () => {
    if (hasPremiumAccess(planTier, 'wish_planning')) return true;
    if (canCreateWish(rewardedAccess)) return true;
    if (rewardedWishBusyRef.current) return false;
    rewardedWishBusyRef.current = true;
    try {
      // Google Mobile Ads is a native module and is loaded only when the user
      // explicitly requests a rewarded ad, keeping Expo Go startup safe.
      const { showTestRewardedAd } = require('./services/rewardedAds') as typeof import('./services/rewardedAds');
      const earned = await showTestRewardedAd().catch(() => false);
      if (!earned) {
        Alert.alert('広告を完了できませんでした', '報酬を受け取れなかったため、追加権は増えていません。');
        return false;
      }
      const next: RewardedAccessState = { ...rewardedAccess, wishCreateProgress: Math.min(2, rewardedAccess.wishCreateProgress + 1) };
      setRewardedAccess(next);
      await saveRewardedAccessState(next);
      if (next.wishCreateProgress < 2) {
        Alert.alert('広告を1回確認しました', `あと${2 - next.wishCreateProgress}回で1件追加できます。`);
        return false;
      }
      return true;
    } finally {
      rewardedWishBusyRef.current = false;
    }
  }, [planTier, rewardedAccess]);
  const consumeWishReward = React.useCallback(() => {
    if (hasPremiumAccess(planTier, 'wish_planning') || rewardedAccess.wishCreateProgress <= 0) return;
    const next: RewardedAccessState = { ...rewardedAccess, wishCreateProgress: Math.max(0, rewardedAccess.wishCreateProgress - 2) };
    setRewardedAccess(next);
    void saveRewardedAccessState(next);
  }, [planTier, rewardedAccess]);
  const saveAffirmation = React.useCallback(async (draft: Affirmation) => {
    if (!hasPremiumAccess(planTier, 'affirmations')) {
      openPremiumFeature('affirmation');
      return;
    }
    const existing = affirmations.find((item) => item.id === draft.id);
    if (!existing && affirmations.length >= 5) {
      Alert.alert('アファメーションは最大5件までです', '不要な通知を削除してから追加してください。');
      return;
    }
    const duplicateTime = affirmations.find((item) => item.id !== draft.id && item.time === draft.time);
    if (duplicateTime) {
      Alert.alert('同じ時刻の通知があります', '別の時刻を選択してください。');
      return;
    }
    await Notifications.cancelScheduledNotificationAsync(existing?.notificationId ?? `affirmation:${draft.id}`).catch(() => undefined);
    const next: Affirmation = { ...draft, notificationId: undefined };
    if (next.enabled) {
      const allowed = await ensureNotifications();
      if (!allowed) {
        next.enabled = false;
        Alert.alert('通知を許可すると、指定した時間に言葉を届けられます。');
      } else {
        next.notificationId = await scheduleAffirmationNotification(next).catch(() => undefined);
      }
    }
    setAffirmations((current) => current.some((item) => item.id === next.id) ? current.map((item) => item.id === next.id ? next : item) : [next, ...current]);
    void onboarding.complete('affirmation');
  }, [affirmations, onboarding, openPremiumFeature, planTier]);
  const saveAffirmationCustomText = React.useCallback((draft: AffirmationCustomText) => {
    setAffirmationCustomTexts((current) => current.some((item) => item.id === draft.id) ? current.map((item) => item.id === draft.id ? draft : item) : [draft, ...current]);
    void onboarding.complete('affirmation');
  }, [onboarding]);
  const deleteAffirmationCustomText = React.useCallback((id: string) => {
    setAffirmationCustomTexts((current) => current.filter((item) => item.id !== id));
  }, []);
  const deleteAffirmation = React.useCallback(async (affirmation: Affirmation) => {
    await Notifications.cancelScheduledNotificationAsync(affirmation.notificationId ?? `affirmation:${affirmation.id}`).catch(() => undefined);
    setAffirmations((current) => current.filter((item) => item.id !== affirmation.id));
  }, []);
  const pickPhotoTheme = React.useCallback(async (target: PhotoThemePhotoTarget) => {
    if (!hasPremiumAccess(planTier, 'photo_design')) {
      openPremiumFeature('photo_design');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('写真へのアクセスを許可すると、背景やトップ画像に設定できます。');
      return;
    }
    const isTopImage = target !== 'background' && target !== 'focus';
    const aspect: [number, number] = [4, 3];
    // iOS の標準トリミングは横長比率を指定しても正方形になることがあるため、
    // トップ画像だけはアプリ内の横長プレビューで位置を確定する。
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, ...(isTopImage ? {} : { aspect }), quality: isTopImage ? 1 : 0.82 });
    const selectedAsset = result.canceled ? undefined : result.assets[0];
    if (!selectedAsset?.uri) return;
    if (isTopImage) {
      // 調整を確定するまでは選択元をそのまま使い、不要な端末内コピーを作らない。
      setPendingTopPhoto({ target: target as Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>, originalUri: selectedAsset.uri, sourceWidth: selectedAsset.width || 1000, sourceHeight: selectedAsset.height || 1000 });
      return;
    }
    let persistentUri: string;
    try {
      persistentUri = persistPhotoUri(selectedAsset.uri, target);
    } catch (error) {
      console.warn('Could not persist selected Rhythm photo.', error);
      Alert.alert('写真を保存できませんでした', 'もう一度選び直してください。');
      return;
    }
    if (target === 'background') {
      setPhotoTheme((current) => {
        deleteManagedPhotoUri(current.imageUri, [persistentUri, current.focusBackgroundUri, ...Object.values(current.topImageUris ?? {}), ...Object.values(current.topImageOriginalUris ?? {})]);
        return { ...current, placement: 'background', imageUri: persistentUri };
      });
    } else if (target === 'focus') {
      setPhotoTheme((current) => {
        deleteManagedPhotoUri(current.focusBackgroundUri, [persistentUri, current.imageUri, ...Object.values(current.topImageUris ?? {}), ...Object.values(current.topImageOriginalUris ?? {})]);
        return { ...current, focusBackgroundUri: persistentUri };
      });
    }
  }, [openPremiumFeature, planTier]);

  const adjustTopPhoto = React.useCallback((target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>) => {
    const originalUri = photoTheme.topImageOriginalUris?.[target] ?? photoTheme.topImageUris?.[target];
    if (!originalUri) return;
    Image.getSize(originalUri, (sourceWidth, sourceHeight) => setPendingTopPhoto({ target, originalUri, sourceWidth, sourceHeight, cropRect: photoTheme.topImageCropRects?.[target] }), () => setPendingTopPhoto({ target, originalUri, sourceWidth: 1000, sourceHeight: 1000, cropRect: photoTheme.topImageCropRects?.[target] }));
  }, [photoTheme]);

  const applyPendingTopPhoto = React.useCallback(async (cropOverride?: NormalizedCropRect) => {
    if (!pendingTopPhoto) return;
    try {
      const normalized = cropOverride ?? pendingTopPhoto.cropRect ?? getInitialNormalizedCrop(pendingTopPhoto.sourceWidth, pendingTopPhoto.sourceHeight);
      const crop = cropRectToPixels(normalized, pendingTopPhoto.sourceWidth, pendingTopPhoto.sourceHeight);
      const result = await ImageManipulator.manipulateAsync(pendingTopPhoto.originalUri, [{ crop }, { resize: { width: 1000, height: 400 } }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
      const originalUri = persistPhotoUri(pendingTopPhoto.originalUri, `top-original-${pendingTopPhoto.target}`);
      const displayUri = persistPhotoUri(result.uri, `top-${pendingTopPhoto.target}`);
      setPhotoTheme((current) => {
        const previousDisplayUri = current.topImageUris?.[pendingTopPhoto.target];
        const previousOriginalUri = current.topImageOriginalUris?.[pendingTopPhoto.target];
        const topImageUris = { ...current.topImageUris, [pendingTopPhoto.target]: displayUri };
        const topImageOriginalUris = { ...current.topImageOriginalUris, [pendingTopPhoto.target]: originalUri };
        const retainedUris = [current.imageUri, current.focusBackgroundUri, ...Object.values(topImageUris), ...Object.values(topImageOriginalUris)];
        deleteManagedPhotoUri(previousDisplayUri, retainedUris);
        deleteManagedPhotoUri(previousOriginalUri, retainedUris);
        return { ...current, topImageUris, topImageOriginalUris, topImageCropRects: { ...current.topImageCropRects, [pendingTopPhoto.target]: normalized } };
      });
      setPendingTopPhoto(undefined);
    } catch {
      Alert.alert('トップ画像を調整できませんでした', 'もう一度画像を選び直して試してください。');
    }
  }, [pendingTopPhoto]);

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
    if (!hasPremiumAccess(planTierRef.current, 'late_recovery')) {
      openPremiumFeature('route');
      return;
    }
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
  }, [openPremiumFeature, openSharedEventToken, syncSharedEventPacket]);

  const removeSharedEventForPlan = React.useCallback((planId: string) => {
    const removedTokens = sharedEventsRef.current
      .filter((event) => event.eventId === planId)
      .map((event) => event.shareToken);
    if (removedTokens.length === 0) return;
    const removed = new Set(removedTokens);
    setSharedEvents((current) => {
      const next = current.filter((event) => !removed.has(event.shareToken));
      sharedEventsRef.current = next;
      return next;
    });
    setSharedParticipantIdsByToken((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([token]) => !removed.has(token)));
      sharedParticipantIdsByTokenRef.current = next;
      return next;
    });
    setSharedParticipantPrefsByToken((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([token]) => !removed.has(token)));
      sharedParticipantPrefsByTokenRef.current = next;
      return next;
    });
    if (sharedEventToken && removed.has(sharedEventToken)) {
      setSharedEventOpen(false);
      setSharedEventToken(undefined);
    }
  }, [sharedEventToken]);

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
    // 無料版の基本通知は、通知そのものだけを届ける。反応を分析履歴へ新規保存しない。
    if (!hasPremiumAccess(planTierRef.current, 'time_analysis')) return;
    if (!hydratedRef.current) {
      pendingNotificationBehaviorActionsRef.current.push(args);
      return;
    }
    const scheduled = behaviorEventsRef.current.find((item) => item.type === 'notification_scheduled' && item.notificationInstanceId === args.notificationInstanceId);
    const task = args.taskId ? tasksRef.current.find((item) => item.id === args.taskId) : undefined;
    recordBehaviorEvent(createNotificationActionEvent({ notificationInstanceId: args.notificationInstanceId, action: args.action, taskId: args.taskId, taskTitle: task?.title ?? scheduled?.taskTitleSnapshot, actualAt: args.actualAt, scheduledAt: scheduled?.scheduledAt }));
  }, [recordBehaviorEvent]);

  const completeTaskIds = React.useCallback((ids: string[], source: 'manual' | 'notification' = 'manual') => {
    const previousTasks = tasksRef.current;
    const result = completeTasksAndCollectEvents(tasksRef.current, ids);
    if (result.tasks === tasksRef.current) return;
    tasksRef.current = result.tasks;
    setTasks(result.tasks);
    if (result.newlyCompleted.length === 0) return;
    result.newlyCompleted.forEach((task) => { void cancelPendingTaskNotifications(task.id); });
    const previousIds = new Set(previousTasks.map((task) => task.id));
    result.tasks.filter((task) => !previousIds.has(task.id) && !task.done).forEach((nextTask) => {
      void scheduleTaskNotificationsRef.current(nextTask);
    });
    void playCompletionSound();
    triggerHaptic(hapticsEnabled, 18);
    showCompletionAffirmation('task');
    result.newlyCompleted.forEach((task) => {
      const completedAt = new Date(task.completedAt!);
      recordBehaviorEvent(createTaskCompletedBehaviorEvent({
        taskId: task.id,
        taskTitle: task.title,
        occurredAt: completedAt,
        source,
        routineId: task.isRoutine ? task.routineId ?? task.id : undefined,
        routineTitle: task.isRoutine ? task.title : undefined,
        routineTargetDate: task.isRoutine ? dateKey(completedAt) : undefined,
      }));
      if (task.isRoutine) recordBehaviorEvent(createRoutineStateChangedBehaviorEvent({ taskId: task.id, routineId: task.routineId ?? task.id, routineTitle: task.title, occurredAt: completedAt, targetDate: dateKey(completedAt), completed: true, source }));
    });
  }, [hapticsEnabled, recordBehaviorEvent, showCompletionAffirmation]);
  affirmationsRef.current = affirmations;
  completeTaskIdsRef.current = completeTaskIds;

  const toggleSubtask = React.useCallback((taskId: string, subtaskId: string) => {
    const current = tasksRef.current.find((task) => task.id === taskId);
    if (!current?.subtasks?.length) return;
    const nextSubtasks = current.subtasks.map((item) => item.id === subtaskId ? { ...item, done: !item.done } : item);
    const allDone = nextSubtasks.length > 0 && nextSubtasks.every((item) => item.done);
    const updated = { ...current, subtasks: nextSubtasks, done: allDone, status: allDone ? 'completed' as const : 'active' as const, skippedAt: undefined, completedAt: allDone ? (current.completedAt ?? new Date().toISOString()) : undefined };
    const next = tasksRef.current.map((task) => task.id === taskId ? updated : task);
    tasksRef.current = next;
    setTasks(next);
    if (allDone && !current.done) { void playCompletionSound(); triggerHaptic(hapticsEnabled, 18); showCompletionAffirmation('task'); }
  }, [hapticsEnabled, showCompletionAffirmation]);

  const completeParentTask = React.useCallback((taskId: string) => {
    const current = tasksRef.current.find((task) => task.id === taskId);
    if (!current || current.done || !current.subtasks?.some((item) => !item.done)) return completeTaskIds([taskId]);
    Alert.alert('親タスクを完了しますか？', '未完了のサブタスクもすべて完了にします。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '完了にする', onPress: () => {
        const completedAt = new Date().toISOString();
        const updated = { ...current, done: true, status: 'completed' as const, skippedAt: undefined, completedAt, subtasks: current.subtasks?.map((item) => ({ ...item, done: true })) };
        const next = tasksRef.current.map((task) => task.id === taskId ? updated : task);
        tasksRef.current = next;
        setTasks(next);
        void playCompletionSound();
        triggerHaptic(hapticsEnabled, 18);
        showCompletionAffirmation('task');
      } },
    ]);
  }, [completeTaskIds, hapticsEnabled, showCompletionAffirmation]);

  const markDeparturePlanAsDeparted = React.useCallback((planId: string, source: 'manual' | 'notification' = 'manual') => {
    const target = departurePlansRef.current.find((item) => item.id === planId);
    if (!target?.id || !isArrivalReversePlan(target) || !hasPremiumAccess(planTierRef.current, 'late_recovery')) return;
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

  const markDeparturePreparationStarted = React.useCallback((planId: string, status: DeparturePreparationStatus = 'preparing', source: 'manual' | 'notification' = 'manual') => {
    const target = departurePlansRef.current.find((item) => item.id === planId);
    if (!target?.id || !isArrivalReversePlan(target) || !hasPremiumAccess(planTierRef.current, 'late_recovery')) return;
    setDeparturePreparationStatuses((current) => ({ ...current, [planId]: status }));
    recordBehaviorEvent(createDeparturePreparationStartedEvent({ planId: target.id, planTitle: target.title, planDate: target.date, scheduledAt: getDepartureMoments(target).prepare, actualAt: new Date(), source }));
  }, [recordBehaviorEvent]);

  const scheduleDepartureFollowUp = React.useCallback(async (target: DeparturePlan, phase: 'preparation' | 'departure', body?: string, delaySeconds?: number) => {
    if (!target.id || !isArrivalReversePlan(target) || !hasPremiumAccess(planTierRef.current, 'late_recovery')) return;
    const key = `${target.id}:${phase}`;
    if (pendingDepartureFollowUpsRef.current.has(key)) return;
    pendingDepartureFollowUpsRef.current.add(key);
    try {
      if (!await ensureNotifications()) return;
      const pending = await Notifications.getAllScheduledNotificationsAsync();
      const stage = `follow_up_${phase}`;
      await Promise.all(pending
        .filter((request) => request.content.data?.departurePlanId === target.id && request.content.data?.departureStage === stage)
        .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
      const seconds = delaySeconds ?? (phase === 'preparation' ? 600 : 300);
      const notificationDate = new Date(Date.now() + seconds * 1000);
      await Notifications.scheduleNotificationAsync({
        identifier: `departure:${target.id}:${stage}:${notificationDate.toISOString()}`,
        content: {
          title: phase === 'preparation' ? '準備、始められそう？' : '出発、できそう？',
          body: body ?? target.title,
          categoryIdentifier: phase === 'preparation' ? 'PREPARATION_ACTIONS' : 'DEPARTURE_ACTIONS',
          data: { departurePlanId: target.id, departureDate: target.date, departureStage: stage },
          sound: 'default',
          interruptionLevel: 'timeSensitive' as const,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notificationDate },
      });
    } catch {
      // 通知が利用できない状態でも、画面上の予定・行動状態は維持する。
    } finally {
      pendingDepartureFollowUpsRef.current.delete(key);
    }
  }, []);

  const handleDepartureStill = React.useCallback((target: DeparturePlan, phase: 'preparation' | 'departure', notificationInstanceId?: string) => {
    if (!target.id || !isArrivalReversePlan(target) || !hasPremiumAccess(planTierRef.current, 'late_recovery')) return;
    if (notificationInstanceId) {
      recordBehaviorEvent(createNotificationActionEvent({
        notificationInstanceId,
        action: 'snoozed',
        departurePlanId: target.id,
        departurePlanTitle: target.title,
        departurePlanDate: target.date,
        actualAt: new Date(),
      }));
    }
    void scheduleDepartureFollowUp(target, phase);
  }, [recordBehaviorEvent, scheduleDepartureFollowUp]);

  const applyPremiumDepartureNotificationAction = React.useCallback((planId: string, action: DepartureNotificationAction, notificationInstanceId: string) => {
    const target = departurePlansRef.current.find((item) => item.id === planId);
    if (!target?.id || !isArrivalReversePlan(target) || !hasPremiumAccess(planTierRef.current, 'late_recovery')) return;
    recordBehaviorEvent(createNotificationActionEvent({
      notificationInstanceId,
      action: action === 'PREPARE_LATER' || action === 'DEPARTURE_SNOOZE' || action === 'PREPARATION_SNOOZE' ? 'snoozed' : 'completed',
      departurePlanId: target.id,
      departurePlanTitle: target.title,
      departurePlanDate: target.date,
      actualAt: new Date(),
    }));
    if (action === 'DEPARTED') {
      markDeparturePlanAsDeparted(planId, 'notification');
      return;
    }
    if (action === 'PREPARING' || action === 'PREPARED') {
      markDeparturePreparationStarted(planId, action === 'PREPARED' ? 'prepared' : 'preparing', 'notification');
      return;
    }
    if (action === 'PREPARATION_SNOOZE') {
      void scheduleDepartureFollowUp(target, 'preparation', undefined, 300);
      return;
    }
    handleDepartureStill(target, action === 'PREPARE_LATER' ? 'preparation' : 'departure');
  }, [handleDepartureStill, markDeparturePlanAsDeparted, markDeparturePreparationStarted, recordBehaviorEvent, scheduleDepartureFollowUp]);

  const restoreTaskById = React.useCallback((taskId: string, source: 'manual' | 'notification' = 'manual') => {
    const target = tasksRef.current.find((task) => task.id === taskId);
    if (!target || (!target.done && getTaskStatus(target) !== 'skipped')) return;
    const next = tasksRef.current.map((task) => task.id === taskId ? { ...task, done: false, status: 'active' as const, skippedAt: undefined, completedAt: undefined } : task);
    tasksRef.current = next;
    setTasks(next);
    if (target.routineId && (!target.routineEndedAt || new Date(target.completedAt!).getTime() <= new Date(target.routineEndedAt).getTime())) {
      recordBehaviorEvent(createTaskCompletionRevertedBehaviorEvent({
        taskId: target.id,
        taskTitle: target.title,
        occurredAt: new Date(),
        completedAt: target.completedAt,
        source,
        routineId: target.routineId,
        routineTitle: target.title,
        routineTargetDate: dateKey(target.completedAt!),
      }));
      recordBehaviorEvent(createRoutineStateChangedBehaviorEvent({ taskId: target.id, routineId: target.routineId, routineTitle: target.title, occurredAt: new Date(), targetDate: dateKey(target.completedAt!), completed: false, source }));
    }
  }, [recordBehaviorEvent]);

  const skipTaskById = React.useCallback((taskId: string) => {
    const target = tasksRef.current.find((task) => task.id === taskId);
    if (!target || target.done || getTaskStatus(target) === 'skipped') return;
    Alert.alert('今日はお休みで大丈夫', '今日はお休みで大丈夫。連続記録は途切れません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '今日は休む', onPress: () => {
        const skippedAt = new Date().toISOString();
        const next = tasksRef.current.map((task) => task.id === taskId ? { ...task, done: false, status: 'skipped' as const, skippedAt } : task);
        tasksRef.current = next;
        setTasks(next);
        void cancelPendingTaskNotifications(taskId);
      } },
    ]);
  }, []);

  const deleteTaskById = React.useCallback((taskId: string) => {
    const target = tasksRef.current.find((task) => task.id === taskId);
    if (!target) return;
    const next = tasksRef.current.filter((task) => task.id !== taskId);
    tasksRef.current = next;
    setTasks(next);
    setSelectedTaskIds((current) => current.filter((id) => id !== taskId));
    void cancelPendingTaskNotifications(taskId);
  }, []);

  const deleteSelectedTasks = React.useCallback((ids: string[]) => {
    const selected = [...new Set(ids)].filter((id) => tasksRef.current.some((task) => task.id === id));
    if (selected.length === 0) return;
    Alert.alert(`選択した${selected.length}件を削除しますか？`, '削除したタスクは元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: `${selected.length}件を削除`, style: 'destructive', onPress: () => {
        selected.forEach((id) => deleteTaskById(id));
        setSelectionMode(false);
        setSelectedTaskIds([]);
      } },
    ]);
  }, [deleteTaskById]);

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
        const loadedTasks = saved.tasks ? saved.tasks.map((task) => ({
          ...task,
          category: (task.category ?? 'その他') as Category,
          priority: (task.priority ?? '中') as Priority,
          routineId: task.routineId ?? (task.isRoutine ? task.id : undefined),
        })) : [];
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
        if (!hapticsPreferenceTouchedRef.current && typeof saved.hapticsEnabled === 'boolean') setHapticsEnabled(saved.hapticsEnabled);
        if (saved.reviewPromptedAt) setReviewPromptedAt(saved.reviewPromptedAt);
        if (saved.designMode === 'minimal' || saved.designMode === 'dark' || saved.designMode === 'chic' || saved.designMode === 'photo') {
          setDesignMode(saved.designMode);
          // Older saves encoded Mono Light/Dark in designMode. Treat those as
          // explicit manual choices; only new/updated Mono saves can be auto.
          const legacyAppearance = saved.designMode === 'dark' ? 'dark' : saved.designMode === 'minimal' ? 'light' : undefined;
          setMonoAppearance(saved.monoAppearance ?? legacyAppearance ?? 'auto');
        } else {
          setDesignMode('minimal');
          setMonoAppearance(saved.monoAppearance ?? 'auto');
        }
        setChicPattern(saved.chicPattern ? normalizeChicPattern(saved.chicPattern) : 'plain');
        setChicCheckColor(normalizeChicCheckColor(saved.chicCheckColor));
        setAffirmations(saved.affirmations ?? []);
        setAffirmationCustomTexts(saved.affirmationCustomTexts ?? []);
        setPhotoTheme({
          placement: saved.photoTheme?.placement === 'top' ? 'top' : 'background',
          imageUri: saved.photoTheme?.imageUri,
          topImageUris: saved.photoTheme?.topImageUris ?? {},
          topImageOriginalUris: saved.photoTheme?.topImageOriginalUris ?? saved.photoTheme?.topImageUris ?? {},
          topImageAdjustments: saved.photoTheme?.topImageAdjustments ?? {},
          topImageCropRects: saved.photoTheme?.topImageCropRects ?? {},
          focusBackgroundUri: saved.photoTheme?.focusBackgroundUri,
        });
        setRecoveryHistory(saved.recoveryHistory ?? []);
        setFocusSessions(saved.focusSessions ?? []);
        const loadedBehaviorEvents = (saved.behaviorEvents ?? []).map((event) => {
          if ((event.type !== 'task_completed' && event.type !== 'task_completion_reverted') || event.routineId) return event;
          const matchedTask = loadedTasks.find((task) => task.id === event.taskId)
            ?? loadedTasks.find((task) => Boolean(task.routineId) && task.title.trim() === event.taskTitleSnapshot?.trim());
          if (!matchedTask?.routineId) return event;
          return {
            ...event,
            routineId: matchedTask.routineId,
            routineTitleSnapshot: matchedTask.title,
            routineTargetDate: dateKey(event.type === 'task_completion_reverted' && event.taskCompletionDate ? event.taskCompletionDate : event.occurredAt),
          };
        });
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
      .catch((error) => {
        console.warn('Rhythm hydration failed; keeping the persisted value untouched.', error);
        persistenceDisabledRef.current = true;
        Alert.alert('保存データを読み込めませんでした', 'データは初期化せず、そのまま残しています。');
      })
      .finally(() => {
        hydratedRef.current = true;
        setHydrated(true);
        const pendingIds = [...new Set(pendingNotificationCompletionIdsRef.current)];
        pendingNotificationCompletionIdsRef.current = [];
        if (pendingIds.length > 0) completeTaskIds(pendingIds, 'notification');
        const pendingDepartureActions = pendingDepartureNotificationActionsRef.current;
        pendingDepartureNotificationActionsRef.current = [];
        pendingDepartureActions.forEach(({ planId, action, notificationInstanceId }) => applyPremiumDepartureNotificationAction(planId, action, notificationInstanceId));
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
      const notificationData = response.notification.request.content.data;
      if (notificationData?.kind === 'affirmation' && typeof notificationData.affirmationId === 'string') {
        const affirmation = affirmationsRef.current.find((item) => item.id === notificationData.affirmationId);
        if (affirmation) lastAffirmationNotificationTextRef.current = affirmation.text;
      }
      const taskId = response.notification.request.content.data?.taskId;
      const departurePlanId = response.notification.request.content.data?.departurePlanId;
      const notificationInstanceIdValue = response.notification.request.content.data?.notificationInstanceId;
      const notificationInstanceId = typeof notificationInstanceIdValue === 'string' ? notificationInstanceIdValue : response.notification.request.identifier;
      const action = response.actionIdentifier;

      // Premium の出発通知は hydration 後に画面操作と同じ共通処理へ渡す。
      if (typeof departurePlanId === 'string' && departureNotificationActions.includes(action as DepartureNotificationAction)) {
        const departureAction = action as DepartureNotificationAction;
        if (!hydratedRef.current) {
          pendingDepartureNotificationActionsRef.current.push({ planId: departurePlanId, action: departureAction, notificationInstanceId });
          return;
        }
        applyPremiumDepartureNotificationAction(departurePlanId, departureAction, notificationInstanceId);
        return;
      }

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

      if (typeof taskId !== 'string') return;
      if (action === 'DONE' || action === 'SNOOZE') {
        recordNotificationBehaviorAction({ notificationInstanceId, action: action === 'DONE' ? 'completed' : 'snoozed', taskId, actualAt: new Date() });
      }
      if (action === 'DONE') {
        if (!hydratedRef.current) {
          pendingNotificationCompletionIdsRef.current.push(taskId);
          return;
        }
        completeTaskIdsRef.current([taskId], 'notification');
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
          if (task && hasPremiumAccess(planTierRef.current, 'time_analysis')) {
            recordBehaviorEvent(createNotificationScheduledEvent({ notificationInstanceId: nextNotificationInstanceId, taskId, taskTitle: task.title, scheduledAt, occurredAt: new Date() }));
          }
        })();
      }
    });

    return () => responseSubscription.remove();
  }, [handleDepartureStill, markDeparturePlanAsDeparted, markDeparturePreparationStarted, openPremiumFeature, recordBehaviorEvent, recordNotificationBehaviorAction]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state: PersistedState = { tasks, plan, departurePlans, widgetSize, showCompleted, completionIcon, designMode, monoAppearance, hapticsEnabled, reviewPromptedAt, taskTemplates, savedTaskTemplates, chicPattern, chicCheckColor, recoveryHistory, focusSessions, departureCheckIns, behaviorEvents, wishMonths, calendarMarks, sharedEvents, sharedParticipantIdsByToken, sharedParticipantPrefsByToken, departurePreparationStatuses, affirmations, affirmationCustomTexts, photoTheme };
    if (persistenceDisabledRef.current) return;
    saveRhythmState(state).catch((error) => {
      console.warn('Rhythm state save failed.', error);
      if (!saveFailureNotifiedRef.current) {
        saveFailureNotifiedRef.current = true;
        Alert.alert('保存できませんでした', '空き容量や端末の設定を確認して、もう一度お試しください。');
      }
    });
  }, [tasks, plan, departurePlans, widgetSize, showCompleted, completionIcon, designMode, monoAppearance, hapticsEnabled, reviewPromptedAt, taskTemplates, savedTaskTemplates, chicPattern, chicCheckColor, recoveryHistory, focusSessions, departureCheckIns, behaviorEvents, wishMonths, calendarMarks, sharedEvents, sharedParticipantIdsByToken, sharedParticipantPrefsByToken, departurePreparationStatuses, affirmations, affirmationCustomTexts, photoTheme, hydrated]);

  const requestAppReview = React.useCallback(async () => {
    try {
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
        setReviewPromptedAt(new Date().toISOString());
      }
    } catch {
      // Review UI is OS controlled and may be unavailable in Expo Go or simulators.
    }
  }, []);

  const handleHapticsEnabled = React.useCallback((value: boolean) => {
    hapticsPreferenceTouchedRef.current = true;
    setHapticsEnabled(Boolean(value));
  }, []);

  useEffect(() => {
    if (!hydrated || reviewPromptedAt) return;
    const completedCount = tasks.filter((task) => task.done).length;
    const focusCount = focusSessions.length;
    if (completedCount < 5 && focusCount < 3) return;
    void requestAppReview();
  }, [hydrated, tasks, focusSessions, reviewPromptedAt, requestAppReview]);

  useEffect(() => {
    if (!hydrated || planTier === 'premium') return;
    affirmations.forEach((affirmation) => {
      void Notifications.cancelScheduledNotificationAsync(affirmation.notificationId ?? `affirmation:${affirmation.id}`).catch(() => undefined);
    });
  }, [affirmations, hydrated, planTier]);

  // Premiumから無料版へ開き直した場合、以前の段階通知だけは安全に停止する。
  // 予定データや過去の行動履歴は消さない。
  useEffect(() => {
    if (!hydrated || planTier === 'premium') return;
    departurePlans.forEach((item) => {
      if (item.id && isArrivalReversePlan(item)) void cancelPendingDepartureNotifications(item.id);
    });
  }, [departurePlans, hydrated, planTier]);

  useEffect(() => {
    const openFromUrl = (url: string) => handleSharedEventLink(url);
    Linking.getInitialURL().then((url) => {
      if (url) openFromUrl(url);
    }).catch(() => undefined);
    const subscription = Linking.addEventListener('url', ({ url }) => openFromUrl(url));
    return () => subscription.remove();
  }, [handleSharedEventLink]);

  const nextDeparturePlan = useMemo(() => [...departurePlans]
    .filter((item) => {
      const mode = getDeparturePlanMode(item);
      const canShowCountdown = mode === 'departure_reminder'
        || (mode === 'arrival_reverse' && hasPremiumAccess(planTier, 'late_recovery'));
      return canShowCountdown && getPlanCountdownAt(item).getTime() > now.getTime();
    })
    .sort((a, b) => getPlanCountdownAt(a).getTime() - getPlanCountdownAt(b).getTime())[0], [departurePlans, now, planTier]);
  const displayPlan = nextDeparturePlan ?? plan;
  const canDisplayReverseTimeline = Boolean(nextDeparturePlan
    && isArrivalReversePlan(displayPlan)
    && hasPremiumAccess(planTier, 'late_recovery'));
  const displayTimeline = canDisplayReverseTimeline
    ? (() => {
      const moments = getDepartureMoments(displayPlan);
      return { start: formatLiveTime(moments.prepare), leave: formatLiveTime(moments.leave), arrival: formatLiveTime(moments.arrival) };
    })()
    : nextDeparturePlan && isDepartureReminderPlan(displayPlan)
      ? { start: '—', leave: formatLiveTime(getPlanCountdownAt(displayPlan)), arrival: '—' }
      : { start: '—', leave: '予定なし', arrival: '—' };

  useEffect(() => {
    if (!hydrated || !hasPremiumAccess(planTier, 'late_recovery')) return;
    departurePlans.forEach((item) => {
      if (!item.id || !isArrivalReversePlan(item) || planDateKey(item) !== dateKey(now)) return;
      const prepareAt = getDepartureMoments(item).prepare;
      const key = `${item.id}:${planDateKey(item)}`;
      if (prepareAt.getTime() <= now.getTime() && now.getTime() - prepareAt.getTime() < 60_000 && !preparationFeedbackKeysRef.current.has(key)) {
        preparationFeedbackKeysRef.current.add(key);
        showCompletionAffirmation('task', true);
      }
    });
  }, [departurePlans, hydrated, now, planTier, showCompletionAffirmation]);

  const priorityRank: Record<Priority, number> = { 高: 0, 中: 1, 低: 2 };
  const todayTaskDate = dateKey(now);
  const isVisibleToday = React.useCallback((task: Task) => !task.done && !isTaskSkippedOnDate(task, todayTaskDate) && (!normalizeTaskDateKey(task.scheduledDate) || normalizeTaskDateKey(task.scheduledDate)! <= todayTaskDate), [todayTaskDate]);
  const visibleTasks = tasks
    .filter(isVisibleToday)
    .sort((a, b) => Number(a.done) - Number(b.done) || priorityRank[a.priority] - priorityRank[b.priority]);
  const remaining = visibleTasks.reduce((sum, task) => sum + (task.subtasks?.length ? task.subtasks.filter((item) => !item.done).length : 1), 0);
  const dangerousTask = [...tasks]
    .filter((task) => !task.done && !isTaskSkippedOnDate(task, todayTaskDate) && task.navigationEnabled && task.deadlineDate)
    .sort((a, b) => urgencyLevel(getUrgencyStatus(b, now)) - urgencyLevel(getUrgencyStatus(a, now)))[0];

  const addTask = (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule: RepeatRule = 'none', nudgeMode: NudgeMode = 'once', scheduledDate?: string, scheduledTime?: string, endAt?: string, isRoutine = false, subtasks: Subtask[] = []) => {
    if (scheduledTime && endAt && endAt <= scheduledTime) {
      Alert.alert('終了時間を確認してください', '終了時間は開始時間より後にしてください。');
      return;
    }
    const routineLimit = hasPremiumAccess(planTier, 'full_history') ? 100 : 5;
    const activeRoutineIds = new Set(tasksRef.current.filter((item) => item.isRoutine).map((item) => item.routineId ?? item.id));
    if (isRoutine && activeRoutineIds.size >= routineLimit) {
      Alert.alert('ルーティン登録数の上限', `現在のプランでは${routineLimit}件まで登録できます。`);
      return;
    }
    const taskId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const task: Task = {
      id: taskId,
      title,
      createdAt: new Date().toISOString(),
      done: false,
      status: 'active',
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
      endAt: endAt && /^\d{2}:\d{2}$/.test(endAt) ? endAt : undefined,
      subtasks: subtasks.map((item, index) => ({ ...item, order: index, done: Boolean(item.done) })),
    };
    const nextTasks = [task, ...tasksRef.current];
    tasksRef.current = nextTasks;
    setTasks(nextTasks);
    setAddOpen(false);
    if (isRoutine) void onboarding.complete('routine');
    if (remindAt || (deadlineDate && deadlineTime && deadlineNotifyBefore !== undefined)) void scheduleAllTaskNotifications(task);
  };

  const updateTask = (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule: RepeatRule = 'none', nudgeMode: NudgeMode = 'once', scheduledDate?: string, scheduledTime?: string, endAt?: string, isRoutine = false, subtasks: Subtask[] = []) => {
    if (!editingTask) return;
    if (scheduledTime && endAt && endAt <= scheduledTime) {
      Alert.alert('終了時間を確認してください', '終了時間は開始時間より後にしてください。');
      return;
    }
    const routineLimit = hasPremiumAccess(planTier, 'full_history') ? 100 : 5;
    const existingRoutineId = editingTask.routineId ?? editingTask.id;
    const activeRoutineIds = new Set(tasksRef.current.filter((item) => item.isRoutine && (item.routineId ?? item.id) !== existingRoutineId).map((item) => item.routineId ?? item.id));
    if (isRoutine && !editingTask.isRoutine && activeRoutineIds.size >= routineLimit) {
      Alert.alert('ルーティン登録数の上限', `現在のプランでは${routineLimit}件まで登録できます。`);
      return;
    }
    const reactivatesRoutine = isRoutine && !editingTask.isRoutine && Boolean(editingTask.routineId);
    const endedAt = editingTask.isRoutine && !isRoutine ? new Date().toISOString() : editingTask.routineEndedAt;
    const updated = { ...editingTask, title, category, priority, remindDate, remindAt, deadlineDate, deadlineTime, deadlineNotifyBefore, navigationEnabled, preparationMinutes, travelMinutes, bufferMinutes, repeatRule, isRoutine, routineId: isRoutine ? editingTask.routineId ?? editingTask.id : editingTask.routineId, routineEndedAt: isRoutine ? undefined : endedAt, nudgeMode, scheduledDate: scheduledDate ?? editingTask.scheduledDate ?? dateKey(now), scheduledTime, endAt: endAt && /^\d{2}:\d{2}$/.test(endAt) ? endAt : undefined, status: 'active' as const, skippedAt: undefined, subtasks: subtasks.map((item, index) => ({ ...item, order: index, done: Boolean(item.done) })) };
    const nextTasks = tasksRef.current.map((task) => {
      if (task.id === editingTask.id) return updated;
      if (editingTask.isRoutine && !isRoutine && (task.routineId ?? task.id) === existingRoutineId) {
        return { ...task, isRoutine: false, routineEndedAt: endedAt };
      }
      return task;
    });
    tasksRef.current = nextTasks;
    setTasks(nextTasks);
    setEditingTask(null);
    if (isRoutine) void onboarding.complete('routine');
    if (editingTask.isRoutine && !isRoutine && updated.routineId && endedAt) {
      recordBehaviorEvent(createRoutineDeactivatedBehaviorEvent({ routineId: updated.routineId, routineTitle: editingTask.title, taskId: editingTask.id, occurredAt: new Date(endedAt), targetDate: dateKey(endedAt) }));
    }
    if (reactivatesRoutine && updated.routineId) {
      recordBehaviorEvent(createRoutineStateChangedBehaviorEvent({ taskId: updated.id, routineId: updated.routineId, routineTitle: updated.title, occurredAt: new Date(), targetDate: dateKey(), completed: Boolean(updated.done), source: 'manual' }));
    }
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
    const reminderDate = normalizeTaskDateKey(task.remindDate) ?? normalizeTaskDateKey(task.scheduledDate);
    const date = reminderDate ? dateForReminder(reminderDate, task.remindAt) : dateForClock(task.remindAt);
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
      if (hasPremiumAccess(planTier, 'time_analysis')) {
        recordBehaviorEvent(createNotificationScheduledEvent({ notificationInstanceId, taskId: task.id, taskTitle: task.title, scheduledAt: notificationDate, occurredAt: new Date() }));
      }
    }
  };

  const scheduleDeadlineReminder = async (task: Task) => {
    if (!task.deadlineDate || !task.deadlineTime || task.deadlineNotifyBefore === undefined) return;
    if (!await ensureNotifications()) return;
    const deadline = dateForReminder(task.deadlineDate, task.deadlineTime);
    const notificationDate = new Date(deadline.getTime() - task.deadlineNotifyBefore * 60_000);
    if (notificationDate.getTime() <= Date.now()) return;
    const timing = task.deadlineNotifyBefore === 0 ? '期限時刻です' : `期限まであと${task.deadlineNotifyBefore >= 60 ? `${task.deadlineNotifyBefore / 60}時間` : `${task.deadlineNotifyBefore}分`}`;
    const notificationInstanceId = `deadline:${task.id}:${notificationDate.toISOString()}`;
    await Notifications.scheduleNotificationAsync({
      identifier: notificationInstanceId,
      content: {
        title: timing,
        body: task.title,
        categoryIdentifier: 'TASK_ACTIONS',
        data: { taskId: task.id, notificationInstanceId, notificationKind: 'deadline' },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notificationDate },
    });
    if (hasPremiumAccess(planTier, 'time_analysis')) {
      recordBehaviorEvent(createNotificationScheduledEvent({ notificationInstanceId, taskId: task.id, taskTitle: task.title, scheduledAt: notificationDate, occurredAt: new Date() }));
    }
  };

  const scheduleDeparture = async (targetPlan = plan) => {
    const mode = getDeparturePlanMode(targetPlan);
    if (mode === 'calendar_only') return;
    if (!await ensureNotifications()) {
      Alert.alert('通知がオフです', '端末設定からRhythmの通知を許可してください。');
      return;
    }
    if (mode === 'departure_reminder') {
      const departureAt = dateForReminder(planDateKey(targetPlan), getPlanScheduledTime(targetPlan));
      if (departureAt.getTime() <= Date.now()) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '出発時刻です',
          body: targetPlan.title,
          sound: 'default',
          data: { departurePlanId: targetPlan.id, departureDate: targetPlan.date, departureStage: 'departure_reminder' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: departureAt },
      });
      Alert.alert('出発通知を設定しました', `${formatLiveTime(departureAt)}に1回お知らせします。`);
      return;
    }
    // Existing arrival_reverse plans remain readable on a free device, but new
    // Premium-only action notifications are never registered without access.
    if (!hasPremiumAccess(planTier, 'late_recovery')) return;
    const moments = getDepartureMoments(targetPlan);
    const arrivalDate = moments.arrival;
    const stages = [
      {
        id: 'wake_up',
        before: targetPlan.travelMinutes + targetPlan.bufferMinutes + targetPlan.preparationMinutes + 10,
        title: '起きて、準備の時間です',
        body: `${formatLiveTime(moments.prepare)}から準備を始める予定です`,
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
    ];

    let count = 0;
    for (const stage of stages) {
      const date = new Date(arrivalDate.getTime() - stage.before * 60_000);
      if (date.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: stage.title, body: stage.body, sound: 'default', interruptionLevel: 'timeSensitive' as const, categoryIdentifier: stage.id === 'prepare' || stage.id === 'wake_up' ? 'PREPARATION_ACTIONS' : 'DEPARTURE_ACTIONS', data: { departurePlanId: targetPlan.id, departureDate: targetPlan.date, departureStage: stage.id } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
      count += 1;
    }
    Alert.alert('出発サポートを設定しました', `${formatLiveTime(moments.prepare)}から${count}段階でお知らせします。`);
  };
  scheduleTaskNotificationsRef.current = scheduleAllTaskNotifications;

  const createTaskFromWishAction = (action: WishAction) => {
    if (tasks.some((task) => !task.done && task.title.trim() === action.title.trim())) {
      Alert.alert('同じタスクがあります', '今日のタスク一覧から確認できます。');
      return;
    }
    addTask(action.title, categories[0]!, priorities[1]!);
    Alert.alert('タスクに追加しました', '今日のタスクとして登録しました。');
  };

  const createEmptyPlanDraft = (): DeparturePlan => ({ ...initialPlan, title: '', planMode: 'calendar_only', countdownEnabled: false, date: todayInputValue() });

  const closePlanEditor = React.useCallback(() => {
    setPlanEditorOpen(false);
    setPlan(createEmptyPlanDraft());
  }, []);

  const openNewPlanEditor = React.useCallback(() => {
    setPlan(createEmptyPlanDraft());
    setPlanEditorOpen(true);
  }, []);

  const openPlanEditor = React.useCallback((target: DeparturePlan) => {
    setPlan({ ...target, ...normalizeDeparturePlanForSave(target) });
    setPlanEditorOpen(true);
  }, []);

  const saveDeparturePlan = async (): Promise<boolean> => {
    // 編集対象が実際に存在する時だけ更新する。削除済み予定のIDがフォームに残っても、
    // 新しい予定として追加し、カウントダウン中の別予定を上書きしない。
    const editTarget = plan.id ? departurePlansRef.current.find((item) => item.id === plan.id) : undefined;
    const mode = getDeparturePlanMode(plan);
    if (mode === 'arrival_reverse' && !hasPremiumAccess(planTier, 'late_recovery')) {
      openPremiumFeature('route');
      return false;
    }
    const saved: DeparturePlan = normalizeDeparturePlanForSave({
      ...plan,
      id: editTarget?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}-departure`,
      date: normalizePlanDate(plan.date),
    });
    if (editTarget?.id) await cancelPendingDepartureNotifications(editTarget.id);
    const nextPlans = editTarget
      ? departurePlansRef.current.map((item) => item.id === editTarget.id ? saved : item)
      : [...departurePlansRef.current, saved];
    departurePlansRef.current = nextPlans;
    setDeparturePlans(nextPlans);
    try {
      await scheduleDeparture(saved);
    } catch {
      Alert.alert('予定は保存しました', '通知を設定できませんでした。端末の通知設定を確認してください。');
    }
    if (mode === 'calendar_only') Alert.alert(plan.id ? '予定を保存しました' : '予定を追加しました', '予定表に表示しました。');
    closePlanEditor();
    void onboarding.complete('planRegistration');
    return true;
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
      planMode: 'calendar_only',
      date: dateKey(start),
      arrival: formatLiveTime(start),
      travelMinutes: initialPlan.travelMinutes,
      preparationMinutes: initialPlan.preparationMinutes,
      bufferMinutes: initialPlan.bufferMinutes,
    };
    const nextPlans = [...departurePlansRef.current, imported];
    departurePlansRef.current = nextPlans;
    setDeparturePlans(nextPlans);
    void onboarding.complete('calendarImport');
    return true;
  };

  const deleteDeparturePlan = (id: string) => {
    const target = departurePlansRef.current.find((item) => item.id === id);
    if (!target) return;

    Alert.alert(
      'この予定を削除しますか？',
      '削除した予定は元に戻せません。予定に紐づく通知と行動記録も削除されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            void cancelPendingDepartureNotifications(id);
            const nextPlans = departurePlansRef.current.filter((item) => item.id !== id);
            departurePlansRef.current = nextPlans;
            setDeparturePlans(nextPlans);
            setDepartureCheckIns((current) => {
              const next = current.filter((item) => item.planId !== id);
              departureCheckInsRef.current = next;
              return next;
            });
            setRecoveryHistory((current) => current.filter((item) => item.planId !== id));
            setBehaviorEvents((current) => {
              const next = current.filter((event) => event.departurePlanId !== id);
              behaviorEventsRef.current = next;
              return next;
            });
            removeSharedEventForPlan(id);
            setDeparturePreparationStatuses((current) => {
              const next = { ...current };
              delete next[id];
              return next;
            });
            setPlan((current) => current.id === id ? createEmptyPlanDraft() : current);
            setPlanEditorOpen(false);
          },
        },
      ],
    );
  };

  const applyRecovery = (record: RecoveryRecord) => {
    const target = departurePlansRef.current.find((item) => item.id === record.planId);
    if (!target || !isArrivalReversePlan(target) || !hasPremiumAccess(planTierRef.current, 'late_recovery')) return;
    setRecoveryHistory((current) => current.some((item) => item.id === record.id) ? current : [record, ...current].slice(0, 200));
    if (record.newArrival) {
      const nextPlans = departurePlansRef.current.map((item) => item.id === record.planId ? { ...item, arrival: record.newArrival! } : item);
      departurePlansRef.current = nextPlans;
      setDeparturePlans(nextPlans);
      const updated = nextPlans.find((item) => item.id === record.planId);
      if (updated?.id) {
        void (async () => {
          await cancelPendingDepartureNotifications(updated.id!);
          await scheduleDeparture(updated);
        })();
      }
    }
    setRecoveryTargetPlanId(undefined);
    void onboarding.complete('recovery');
  };

  const completeFocusSession = (session: FocusSession) => {
    setFocusSessions((current) => current.some((item) => item.id === session.id) ? current : [session, ...current].slice(0, 300));
    showCompletionAffirmation('focus');
  };

  const navigateWithinApp = React.useCallback((nextScreen: Screen) => {
    const decision = getFocusNavigationDecision(focusTimerActive && nextScreen !== 'timeline');
    if (!decision.allowed) {
      setFocusNavigationNotice(true);
      return;
    }
    if (nextScreen === 'wish') openWish();
    else setScreen(nextScreen);
  }, [focusTimerActive, openWish, screen]);

  return (
        <SafeAreaView style={[styles.safe, uiDesignMode === 'minimal' && styles.safeMinimal, uiDesignMode === 'dark' && styles.safeDark, designMode === 'photo' && styles.safePhoto, { backgroundColor: uiDesignMode === 'chic' ? getChicPatternVisual(effectiveChicPattern, chicPalette).background : theme.colors.screenBackground }]}>
      <StatusBar style={uiDesignMode === 'dark' ? 'light' : 'dark'} />
      {photoBackgroundUri && <View pointerEvents="none" style={styles.photoThemeBackgroundWrap}><Image source={{ uri: photoBackgroundUri }} resizeMode="cover" style={styles.photoThemeBackground} /></View>}
      <View style={styles.app}>
        <BThemeRibbonPreload />
        <CThemeRibbonPreload />
        {uiDesignMode === 'chic' && !photoThemeEnabled && <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><ChicPatternDecor pattern={effectiveChicPattern} accent={chicPalette.accent} warm={chicPalette.accentSoft} checkColor={chicCheckColor} /></View>}
        {photoTopImageUri ? <><Header designMode={uiDesignMode} now={now} compact chicPalette={chicPalette} /><View style={styles.photoThemeTopImage}><Image source={{ uri: photoTopImageUri }} resizeMode="contain" style={styles.photoThemeTopImageContent} /></View></> : <Header designMode={uiDesignMode} now={now} chicPalette={chicPalette} />}
        {completionAffirmation && <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 72, left: 20, right: 20, zIndex: 30, opacity: completionAffirmationOpacity, alignItems: 'center' }}><View style={{ maxWidth: 340, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18, backgroundColor: uiDesignMode === 'dark' ? '#20293A' : uiDesignMode === 'chic' ? chicPalette.cardSurface : '#FFFFFF', borderWidth: 1, borderColor: uiDesignMode === 'dark' ? '#40506A' : uiDesignMode === 'chic' ? chicPalette.border : '#E5E0E5', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}><Text style={{ textAlign: 'center', color: uiDesignMode === 'dark' ? '#F4F7FC' : uiDesignMode === 'chic' ? chicPalette.textPrimary : '#282538', fontSize: 14, fontWeight: '600' }}>{completionAffirmation}</Text></View></Animated.View>}

        <ScrollView contentContainerStyle={[styles.content, screen === 'timeline' && styles.contentTimeline]} keyboardShouldPersistTaps="handled">
          {onboarding.ready && onboarding.isCompleted('todo') && screen === 'timeline' && !onboarding.isCompleted('schedule') && <View style={{ marginBottom: 12 }}><OnboardingHint featureId="schedule" /></View>}
          {onboarding.ready && onboarding.isCompleted('schedule') && screen === 'timeline' && !onboarding.isCompleted('planRegistration') && <View style={{ marginBottom: 12 }}><OnboardingHint featureId="planRegistration" /></View>}
          {onboarding.ready && onboarding.isCompleted('planRegistration') && screen === 'timeline' && !onboarding.isCompleted('calendarImport') && <View style={{ marginBottom: 12 }}><OnboardingHint featureId="calendarImport" /></View>}
          {onboarding.ready && screen === 'analysis' && !onboarding.isCompleted('analysis') && <View style={{ marginBottom: 12 }}><OnboardingHint featureId="analysis" /></View>}
          {onboarding.ready && screen === 'analysis' && !onboarding.isCompleted('history') && <View style={{ marginBottom: 12 }}><OnboardingHint featureId="history" /></View>}
          {onboarding.ready && screen === 'settings' && !onboarding.isCompleted('design') && <View style={{ marginBottom: 12 }}><OnboardingHint featureId="design" /></View>}
          {screen === 'home' && (
            <HomeScreen
              tasks={visibleTasks}
              allTasks={tasks}
              remaining={remaining}
              now={now}
              designMode={uiDesignMode}
              chicPalette={chicPalette}
              completionIcon={completionIcon}
              selectionMode={selectionMode}
              selectedTaskIds={selectedTaskIds}
              onAdd={() => setAddOpen(true)}
                onQuickAdd={(title, category, priority, scheduledDate, scheduledTime, endAt, isRoutine, deadlineDate, deadlineTime, deadlineNotifyBefore, remindDate, remindAt, repeatRule, subtasks) => addTask(title, category, priority, remindDate, remindAt, deadlineDate, deadlineTime, deadlineNotifyBefore, undefined, undefined, undefined, undefined, repeatRule ?? 'none', 'once', scheduledDate, scheduledTime, endAt, isRoutine, subtasks)}
              onToggle={(id) => {
                const task = tasksRef.current.find((item) => item.id === id);
                completeTaskIds([id]);
                if (task && !task.done) void onboarding.complete('todoComplete');
              }}
              onToggleSubtask={toggleSubtask}
              onCompleteParent={completeParentTask}
              onEdit={(task) => {
                setEditingTask(task);
                void onboarding.complete('taskDetails');
              }}
              onToggleSelection={(id) => setSelectedTaskIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
              onSelectionMode={() => {
                setSelectionMode((current) => !current);
                setSelectedTaskIds([]);
              }}
              onCompleteSelected={() => {
                completeTaskIds(selectedTaskIds);
                if (selectedTaskIds.some((id) => !tasksRef.current.find((task) => task.id === id)?.done)) void onboarding.complete('todoComplete');
                setSelectionMode(false);
                setSelectedTaskIds([]);
              }}
              onDelete={deleteTaskById}
              onSkip={skipTaskById}
              onDeleteSelected={() => deleteSelectedTasks(selectedTaskIds)}
              onDuplicate={(task) => {
                // 通知は複製せず、複製後にユーザーが改めて設定する。
                // 過去のルーティンIDも引き継がない独立したタスクにする。
                const duplicate = { ...task, id: `${Date.now()}-copy`, title: `${task.title}（コピー）`, done: false, status: 'active' as const, skippedAt: undefined, completedAt: undefined, isRoutine: false, routineId: undefined, routineEndedAt: undefined, remindDate: undefined, remindAt: undefined, deadlineNotifyBefore: undefined, nudgeMode: 'once' as NudgeMode };
                tasksRef.current = [duplicate, ...tasksRef.current];
                setTasks(tasksRef.current);
              }}
              onSaveTemplate={saveTaskAsTemplate}
              onPostpone={(id) => {
                const task = tasksRef.current.find((item) => item.id === id);
                if (!task) return;
                const tomorrow = todayInputValue(1);
                const updated = { ...task, scheduledDate: tomorrow, remindDate: task.remindAt ? tomorrow : task.remindDate, bucket: 'later' as TaskBucket };
                tasksRef.current = tasksRef.current.map((item) => item.id === id ? updated : item);
                setTasks(tasksRef.current);
                void scheduleAllTaskNotifications(updated);
              }}
              onBucket={(id, bucket) => {
                const task = tasksRef.current.find((item) => item.id === id);
                if (!task) return;
                const updated = { ...task, bucket };
                tasksRef.current = tasksRef.current.map((item) => item.id === id ? updated : item);
                setTasks(tasksRef.current);
                void scheduleAllTaskNotifications(updated);
                if (task.bucket !== bucket) void onboarding.complete('taskBuckets');
              }}
              styles={styles}
              renderTodayWinStrip={(todayTasks) => <TodayWinStrip tasks={todayTasks} designMode={uiDesignMode} chicPattern={effectiveChicPattern} chicPalette={chicPalette} onRestore={restoreTaskById} onOpenCompleted={() => void onboarding.complete('completedTasks')} />}
              showTodoOnboarding={onboarding.ready && onboarding.isCompleted('intro') && !onboarding.isCompleted('todo')}
              onTodoOnboardingCompleted={() => void onboarding.complete('todo')}
              showTodoCompleteOnboarding={onboarding.ready && onboarding.isCompleted('todo') && !onboarding.isCompleted('todoComplete') && tasks.some((task) => !task.done)}
              onTodoCompleteOnboarding={() => void onboarding.complete('todoComplete')}
              showCompletedTasksOnboarding={onboarding.ready && onboarding.isCompleted('todoComplete') && !onboarding.isCompleted('completedTasks') && tasks.some((task) => task.done)}
              onCompletedTasksOnboarding={() => void onboarding.complete('completedTasks')}
              showTaskBucketsOnboarding={onboarding.ready && onboarding.isCompleted('completedTasks') && !onboarding.isCompleted('taskBuckets') && tasks.length > 0}
              onTaskBucketsOnboarding={() => void onboarding.complete('taskBuckets')}
              showTaskDetailsOnboarding={onboarding.ready && onboarding.isCompleted('taskBuckets') && !onboarding.isCompleted('taskDetails') && tasks.length > 0}
              onTaskDetailsOnboarding={() => void onboarding.complete('taskDetails')}
              helpers={{ deadlineLabel, getUrgencyStatus, getLateRiskMessage, dateForReminder, dateKey, formatLiveTime, isCheckChicPattern, todayInputValue }}
            />
          )}

          {screen === 'wish' && (
            <WishScreen
              designMode={uiDesignMode}
              chicPattern={effectiveChicPattern}
              chicPalette={chicPalette}
              monthLabel={`${now.getFullYear()}年${now.getMonth() + 1}月`}
              state={currentWishState}
              onSaveState={saveCurrentWishState}
              onCreateTaskFromAction={createTaskFromWishAction}
              canCreateWish={hasPremiumAccess(planTier, 'wish_planning') || canCreateWish(rewardedAccess)}
              wishRewardProgress={{ current: rewardedAccess.wishCreateProgress, required: 2 }}
              onRequestWishReward={requestWishReward}
              onWishCreated={consumeWishReward}
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
              focusBackgroundUri={focusBackgroundUri}
              chicPattern={effectiveChicPattern}
              chicPalette={chicPalette}
              planTier={planTier}
              initialTab={timelineInitialTab}
              recoveryTargetPlanId={recoveryTargetPlanId}
              onChange={setPlan}
              onSchedule={saveDeparturePlan}
              planEditorOpen={planEditorOpen}
              onOpenNewPlan={openNewPlanEditor}
              onClosePlanEditor={closePlanEditor}
              onScheduleUsed={() => void onboarding.complete('schedule')}
              onImportCalendarEvent={importCalendarEventAsPlan}
              onEdit={(item: DeparturePlan) => openPlanEditor(item)}
              onSharePlan={shareDeparturePlan}
              onDelete={deleteDeparturePlan}
              onEditTask={(task: Task) => setEditingTask(task)}
              onDeleteTask={deleteTaskById}
              onPremium={openPremiumFeature}
              onRecovery={applyRecovery}
              onRecoveryClosed={() => setRecoveryTargetPlanId(undefined)}
              onFocusCompleted={completeFocusSession}
              onFocusStarted={() => void onboarding.complete('focus')}
              onFocusRunningChange={setFocusTimerActive}
              focusTimerActive={focusTimerActive}
              onFocusNavigationBlocked={() => setFocusNavigationNotice(true)}
              onBehaviorEvent={recordBehaviorEvent}
              onDeparted={markDeparturePlanAsDeparted}
              onPreparationStarted={markDeparturePreparationStarted}
              onStill={(planId: string, phase: 'preparation' | 'departure') => {
                const target = departurePlansRef.current.find((item) => item.id === planId);
                if (target) handleDepartureStill(target, phase);
              }}
              calendarMarks={calendarMarks}
              onSetCalendarMark={(date: string, mark?: string) => setCalendarMarks((current) => { const next = { ...current }; if (mark) next[date] = mark; else delete next[date]; return next; })}
              hapticsEnabled={hapticsEnabled}
              styles={styles}
              helpers={{ getThemeTokens: getThemedThemeTokens, dateKey, planDateKey, hasPremiumAccess, formatLiveDate, formatLiveTime, getDepartureMoments, normalizePlanDate, countdownToDate, dateForReminder, getMapSearchTarget, openMapSearch, getPlanCountdownAt, colors: themedColors }}
              components={{ TimeTabButton, FocusMode, TaskScheduleCalendar, DailyScheduleTimeline, RecoveryModal }}
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
               // Keep the raw mode here so persisted photo settings remain
               // reachable; the rest of the app intentionally maps photo to
               // the Design visual mode.
               designMode={designMode}
               monoAppearance={monoAppearance}
               hapticsEnabled={hapticsEnabled}
               chicPattern={effectiveChicPattern}
               chicCheckColor={chicCheckColor}
               chicPalette={chicPalette}
               affirmations={affirmations}
               affirmationCustomTexts={affirmationCustomTexts}
               photoTheme={photoTheme}
              planTier={planTier}
              onSize={setWidgetSize}
              onShowCompleted={setShowCompleted}
              onCompletionIcon={setCompletionIcon}
               onDesignMode={(mode) => {
                 if (mode === 'photo' && !hasPremiumAccess(planTier, 'photo_design')) { openPremiumFeature('photo_design'); return; }
                 if (mode === 'minimal' || mode === 'dark') {
                   setDesignMode('minimal');
                   setMonoAppearance(mode === 'dark' ? 'dark' : 'light');
                 } else {
                   setDesignMode(mode);
                 }
                 void onboarding.complete('design');
               }}
               onMonoAppearance={(appearance) => {
                 setDesignMode('minimal');
                 setMonoAppearance(appearance);
                 void onboarding.complete('design');
               }}
               onHapticsEnabled={handleHapticsEnabled}
               onReview={() => void requestAppReview()}
              onChicPattern={(pattern) => {
                const feature = pattern === 'plain' || pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark' ? undefined : getChicPatternFeatureId(pattern);
                if (feature && !hasPremiumAccess(planTier, feature)) { openPremiumFeature(); return; }
                setChicPattern(pattern);
                void onboarding.complete('design');
              }}
               onChicCheckColor={(color) => { setChicCheckColor(color); void onboarding.complete('design'); }}
               onSaveAffirmation={saveAffirmation}
               onDeleteAffirmation={deleteAffirmation}
               onSaveAffirmationCustomText={saveAffirmationCustomText}
               onDeleteAffirmationCustomText={deleteAffirmationCustomText}
               onPickPhotoTheme={(target) => void pickPhotoTheme(target)}
               onAdjustPhotoTheme={(target) => adjustTopPhoto(target)}
               onClearPhotoTheme={(target) => setPhotoTheme((current) => {
                 if (target === 'background') {
                   deleteManagedPhotoUri(current.imageUri, [current.focusBackgroundUri, ...Object.values(current.topImageUris ?? {}), ...Object.values(current.topImageOriginalUris ?? {})]);
                   return { ...current, imageUri: undefined };
                 }
                 if (target === 'focus') {
                   deleteManagedPhotoUri(current.focusBackgroundUri, [current.imageUri, ...Object.values(current.topImageUris ?? {}), ...Object.values(current.topImageOriginalUris ?? {})]);
                   return { ...current, focusBackgroundUri: undefined };
                 }
                 const topImageUris = { ...current.topImageUris };
                 const topImageOriginalUris = { ...current.topImageOriginalUris };
                 const topImageAdjustments = { ...current.topImageAdjustments };
                 const topImageCropRects = { ...current.topImageCropRects };
                 const removedDisplayUri = topImageUris[target];
                 const removedOriginalUri = topImageOriginalUris[target];
                 delete topImageUris[target];
                 delete topImageOriginalUris[target];
                 delete topImageAdjustments[target];
                 delete topImageCropRects[target];
                 const retainedUris = [current.imageUri, current.focusBackgroundUri, ...Object.values(topImageUris), ...Object.values(topImageOriginalUris)];
                 deleteManagedPhotoUri(removedDisplayUri, retainedUris);
                 deleteManagedPhotoUri(removedOriginalUri, retainedUris);
                 return { ...current, topImageUris, topImageOriginalUris, topImageAdjustments, topImageCropRects };
               })}
              templates={taskTemplates}
              savedTemplates={savedTaskTemplates}
              onAddTemplate={(title) => setTaskTemplates((current) => current.includes(title) ? current : [...current, title])}
              onDeleteTemplate={(title) => setTaskTemplates((current) => current.filter((item) => item !== title))}
              onGuide={onboarding.openIntro}
              onPremium={openPremiumFeature}
              onDeleteSavedTemplate={deleteSavedTaskTemplate}
                          styles={styles}
              helpers={{ colors, getThemeTokens: getThemedThemeTokens, getChicPatternVisual, hasPremiumAccess, getChicCheckColor, chicCheckColorChoices, countdownToClock, getUrgencyStatus, getNextBestAction, designModes, completionIcons, summarizePremiumTaskTemplate }}
              components={{ BThemeRibbonDecoration, CThemeRibbonDecoration, ChicPatternDecor, ChicPatternSelector, SettingsDisclosure, NotificationManagerCard }}
            />
          )}

          {screen === 'analysis' && (
            <AnalysisScreen
              events={behaviorEvents}
              tasks={tasks}
              designMode={uiDesignMode}
              chicPalette={chicPalette}
              planTier={planTier}
              onPremium={openPremiumFeature}
              departurePlans={departurePlans}
              onApplySuggestion={(suggestion) => {
                const nextPlans = departurePlansRef.current.map((item) => item.id === suggestion.planId ? { ...item, preparationMinutes: suggestion.nextPreparationMinutes } : item);
                const updatedPlan = nextPlans.find((item) => item.id === suggestion.planId);
                departurePlansRef.current = nextPlans;
                setDeparturePlans(nextPlans);
                setPlan((current) => current.id === suggestion.planId ? { ...current, preparationMinutes: suggestion.nextPreparationMinutes } : current);
                if (updatedPlan?.id) {
                  void (async () => {
                    await cancelPendingDepartureNotifications(updatedPlan.id!);
                    if (getDeparturePlanMode(updatedPlan) !== 'calendar_only') await scheduleDeparture(updatedPlan);
                  })();
                }
              }}
              onRemoveRoutine={(taskId) => Alert.alert('ルーティンから外しますか？', 'タスク自体と完了履歴は残ります。', [{ text: 'キャンセル', style: 'cancel' }, { text: 'ルーティンから外す', style: 'destructive', onPress: () => {
                const target = tasksRef.current.find((task) => task.id === taskId);
                if (!target) return;
                const endedAt = new Date().toISOString();
                const routineId = target.routineId ?? target.id;
                const next = tasksRef.current.map((task) => (task.routineId ?? task.id) === routineId ? { ...task, isRoutine: false, routineEndedAt: endedAt } : task);
                tasksRef.current = next;
                setTasks(next);
                recordBehaviorEvent(createRoutineDeactivatedBehaviorEvent({ routineId, routineTitle: target.title, taskId: target.id, occurredAt: new Date(endedAt), targetDate: dateKey(endedAt) }));
              } }])}
              recordContent={<HistoryScreen tasks={tasks} wishMonths={wishMonths} calendarMarks={calendarMarks} onSetCalendarMark={(date, mark) => setCalendarMarks((current) => { const next = { ...current }; if (mark) next[date] = mark; else delete next[date]; return next; })} recoveryHistory={recoveryHistory} focusSessions={focusSessions} departureCheckIns={departureCheckIns} departurePlans={departurePlans} behaviorEvents={behaviorEvents} completionIcon={completionIcon} designMode={uiDesignMode} chicPattern={effectiveChicPattern} chicPalette={chicPalette} planTier={planTier} onPremium={openPremiumFeature} onSaveTemplate={saveTaskAsTemplate} onRestore={(id) => { void onboarding.complete('history'); restoreTaskById(id); }} onSaveDailyReview={saveDailyReview} onUpdateReview={updateWishReview} onDeleteReview={deleteWishReview} styles={styles} helpers={{ dateKey, formatLiveTime, getThemeTokens: getThemedThemeTokens }} components={{ AchievementVessel, CalendarMarkPicker }} />}
            />
          )}
        </ScrollView>

        <BottomNav screen={screen} designMode={uiDesignMode} chicPalette={chicPalette} onChange={navigateWithinApp} />
      </View>

      <Modal visible={focusNavigationNotice} transparent animationType="fade" onRequestClose={() => setFocusNavigationNotice(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFocusNavigationNotice(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.colors.primaryText }]}>{FOCUS_NAVIGATION_GUARD_COPY.title}</Text>
            <Text style={[styles.emptyCopy, { color: theme.colors.secondaryText }]}>{FOCUS_NAVIGATION_GUARD_COPY.message}</Text>
            <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryAccent }]} onPress={() => setFocusNavigationNotice(false)}><Text style={styles.primaryButtonText}>{FOCUS_NAVIGATION_GUARD_COPY.confirm}</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <SharedEventScreen
        visible={sharedEventOpen && hasPremiumAccess(planTier, 'late_recovery')}
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

      <TaskModal visible={addOpen} templates={taskTemplates} savedTemplates={savedTaskTemplates} designMode={uiDesignMode} chicPalette={chicPalette} planTier={planTier} onPremium={openPremiumFeature} onClose={() => setAddOpen(false)} onSave={addTask} styles={styles} helpers={{ getThemeTokens: getThemedThemeTokens, todayInputValue, hasPremiumAccess, dateForReminder, dateKey, formatLiveTime, colors: themedColors, summarizePremiumTaskTemplate }} components={{ CompactNumberSetting }} />
      <TaskModal
        visible={editingTask !== null}
        task={editingTask ?? undefined}
        templates={taskTemplates}
        savedTemplates={savedTaskTemplates}
        designMode={uiDesignMode}
        chicPalette={chicPalette}
        planTier={planTier}
        onPremium={openPremiumFeature}
        onClose={() => setEditingTask(null)}
        onSave={updateTask}
        styles={styles}
        helpers={{ getThemeTokens: getThemedThemeTokens, todayInputValue, hasPremiumAccess, dateForReminder, dateKey, formatLiveTime, colors: themedColors, summarizePremiumTaskTemplate }}
        components={{ CompactNumberSetting }}
      />
      <PremiumModal visible={premiumOpen} initialFeatureId={premiumTargetFeature} designMode={uiDesignMode} chicPalette={chicPalette} onClose={() => setPremiumOpen(false)} styles={styles} helpers={{ getThemeTokens: getThemedThemeTokens }} />
      <TopImageCropModal visible={Boolean(pendingTopPhoto)} uri={pendingTopPhoto?.originalUri} sourceWidth={pendingTopPhoto?.sourceWidth ?? 1} sourceHeight={pendingTopPhoto?.sourceHeight ?? 1} initialRect={pendingTopPhoto?.cropRect} styles={styles} onCancel={() => setPendingTopPhoto(undefined)} onReselect={() => { if (pendingTopPhoto) void pickPhotoTheme(pendingTopPhoto.target); }} onUse={(cropRect) => { void applyPendingTopPhoto(cropRect); }} />
      <OnboardingCarousel
  visible={
    onboarding.ready &&
    onboarding.introVisible
  }
  onDismiss={
    onboarding.isCompleted('intro')
      ? onboarding.closeIntro
      : onboarding.finishIntro
  }
/>
    </SafeAreaView>
  );
}

function TimeTabButton({ tab, active, designMode, chicPattern, chicPalette, themeAccent, secondaryText, onPress }: { tab: TimeTab; active: boolean; designMode: DesignMode; chicPattern: ChicPattern; chicPalette?: ChicThemePalette; themeAccent: string; secondaryText: string; onPress: () => void }) {
  const palette: ChicThemePalette = chicPalette ?? getDesignCheckThemeTokens('cool');
  const label = tab === 'departure' ? '出発' : tab === 'deadline' ? 'スケジュール' : tab === 'calendar' ? '予定表' : '集中';
  const isDark = designMode === 'dark';
  if (designMode === 'chic') return <Pressable style={[styles.timeTab, styles.timeTabChicPattern, { backgroundColor: palette.background, borderColor: active ? palette.accent : palette.border }, active && { borderWidth: 2 }]} onPress={onPress}><View style={[styles.timeTabGlassLabel, { width: '100%', backgroundColor: active ? palette.accentSoft : palette.cardSurface, borderColor: palette.border }]}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.timeTabText, { fontSize: label.length > 4 ? 10 : 11, flexShrink: 1, color: active ? palette.accentStrong : palette.textSecondary }]}>{label}</Text>{active && <Text style={[styles.timeTabMarker, { color: palette.accent }]}>●</Text>}</View></Pressable>;
     return <Pressable style={[styles.timeTab, styles.timeTabMinimal, isDark && styles.darkSurface, active && styles.timeTabActive, active && { backgroundColor: isDark ? '#26365F' : themeAccent, borderColor: isDark ? '#6F8DFF' : themeAccent }]} onPress={onPress}><Text numberOfLines={1} style={[styles.timeTabText, { color: isDark ? '#F4F7FC' : secondaryText }, active && styles.timeTabTextActive, active && styles.timeTabTextActiveMinimal]}>{label}</Text></Pressable>;
}

function FocusMode({ tasks, designMode, chicPalette, backgroundImageUri, onFocusCompleted, onFocusStarted, onFocusRunningChange, onBehaviorEvent, hapticsEnabled = true }: { tasks: Task[]; designMode: DesignMode; chicPalette?: ChicThemePalette; backgroundImageUri?: string; onFocusCompleted: (session: FocusSession) => void; onFocusStarted?: () => void; onFocusRunningChange?: (running: boolean) => void; onBehaviorEvent: (event: BehaviorEvent) => void; hapticsEnabled?: boolean }) {
  const availableTasks = React.useMemo(() => {
    const today = dateKey();
    const seenTitles = new Set<string>();
    const bucketOrder: Record<TaskBucket, number> = { now: 0, later: 1, waiting: 2 };
    return tasks.filter((task) => {
      const scheduledDate = normalizeTaskDateKey(task.scheduledDate);
      if (task.done || isTaskSkippedOnDate(task, today) || (scheduledDate && scheduledDate > today)) return false;
      const titleKey = task.title.trim();
      if (seenTitles.has(titleKey)) return false;
      seenTitles.add(titleKey);
      return true;
    }).sort((a, b) => (bucketOrder[a.bucket ?? 'now'] - bucketOrder[b.bucket ?? 'now']) || a.title.localeCompare(b.title));
  }, [tasks]);
  const [selectedTaskId, setSelectedTaskId] = useState(availableTasks[0]?.id ?? '');
  const [duration, setDuration] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const pausedSecondsRef = React.useRef(25 * 60);
  const selectedTask = availableTasks.find((task) => task.id === selectedTaskId);
  const sessionRef = React.useRef<{ id: string; startedAt: Date; taskId?: string; taskTitle?: string; plannedDurationMinutes: number } | undefined>(undefined);
  const endAtRef = React.useRef<number | undefined>(undefined);
  const completionCallbackRef = React.useRef(onFocusCompleted);
  completionCallbackRef.current = onFocusCompleted;
  const behaviorCallbackRef = React.useRef(onBehaviorEvent);
  behaviorCallbackRef.current = onBehaviorEvent;
  const focusNotificationIdRef = React.useRef<string | null>(null);
  const cancelFocusNotification = React.useCallback(async () => {
    await cancelFocusCompletionNotification(focusNotificationIdRef.current);
    focusNotificationIdRef.current = null;
    if (sessionRef.current?.id) await cancelPendingFocusCompletionNotifications(sessionRef.current.id);
  }, []);

  useEffect(() => {
    const selectedStillExists = availableTasks.some((task) => task.id === selectedTaskId);
    if (!selectedStillExists) {
      setSelectedTaskId(availableTasks[0]?.id ?? '');
    }
  }, [availableTasks, selectedTaskId]);

  const finishSession = React.useCallback(() => {
    const activeSession = sessionRef.current;
    if (!activeSession) return;
    const actualAt = new Date();
    const session = createCompletedFocusSession({ id: activeSession.id, taskId: activeSession.taskId, taskTitle: activeSession.taskTitle, durationMinutes: activeSession.plannedDurationMinutes, startedAt: activeSession.startedAt, completedAt: actualAt });
    sessionRef.current = undefined;
    endAtRef.current = undefined;
    behaviorCallbackRef.current(createFocusCompletedBehaviorEvent({ sessionId: activeSession.id, taskId: activeSession.taskId, taskTitle: activeSession.taskTitle, plannedDurationMinutes: activeSession.plannedDurationMinutes, focusStartedAt: activeSession.startedAt, actualAt }));
    setRunning(false);
    onFocusRunningChange?.(false);
    setSecondsLeft(0);
    pausedSecondsRef.current = 0;
    completionCallbackRef.current(session);
    void cancelFocusNotification();
    triggerHaptic(hapticsEnabled, [0, 35, 70]);
    Alert.alert('集中タイム終了', activeSession.taskTitle ? `「${activeSession.taskTitle}」に取り組めました。少し休憩しよう。` : '少し休憩しよう。');
  }, [cancelFocusNotification, hapticsEnabled, onFocusRunningChange]);

  const stopActiveSession = React.useCallback(() => {
    const activeSession = sessionRef.current;
    if (!activeSession) return;
    sessionRef.current = undefined;
    endAtRef.current = undefined;
    behaviorCallbackRef.current(createFocusStoppedEvent({ sessionId: activeSession.id, taskId: activeSession.taskId, taskTitle: activeSession.taskTitle, plannedDurationMinutes: activeSession.plannedDurationMinutes, focusStartedAt: activeSession.startedAt, actualAt: new Date() }));
  }, []);

  useEffect(() => () => {
    stopActiveSession();
    void cancelFocusNotification();
    onFocusRunningChange?.(false);
  }, [stopActiveSession]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const endAt = endAtRef.current;
      if (!endAt) return;
      const remainingSeconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      pausedSecondsRef.current = remainingSeconds;
      setSecondsLeft(remainingSeconds);
      if (remainingSeconds === 0) finishSession();
    }, 500);
    return () => clearInterval(timer);
  }, [finishSession, running]);

  const chooseDuration = (minutes: number) => {
    if (sessionRef.current) stopActiveSession();
    setDuration(minutes);
    setSecondsLeft(minutes * 60);
    pausedSecondsRef.current = minutes * 60;
    setRunning(false);
    sessionRef.current = undefined;
    endAtRef.current = undefined;
  };
  const reset = () => {
    if (sessionRef.current) stopActiveSession();
    void cancelFocusNotification();
    onFocusRunningChange?.(false);
    setRunning(false);
    setSecondsLeft(duration * 60);
    pausedSecondsRef.current = duration * 60;
    sessionRef.current = undefined;
    endAtRef.current = undefined;
  };
  const toggleTimer = () => {
    if (running) {
      const endAt = endAtRef.current;
      if (endAt) {
        const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        pausedSecondsRef.current = remaining;
        setSecondsLeft(remaining);
      }
      stopActiveSession();
      setRunning(false);
      onFocusRunningChange?.(false);
      void cancelFocusNotification();
      return;
    }
    const nextSeconds = pausedSecondsRef.current > 0 ? pausedSecondsRef.current : secondsLeft === 0 ? duration * 60 : secondsLeft;
    if (!sessionRef.current) {
      const startedAt = new Date();
      const id = createFocusSessionId(startedAt, Math.random().toString(36).slice(2, 10));
      const plannedDurationMinutes = Math.max(1, Math.ceil(nextSeconds / 60));
      sessionRef.current = { id, startedAt, taskId: selectedTask?.id, taskTitle: selectedTask?.title, plannedDurationMinutes };
      onFocusStarted?.();
      behaviorCallbackRef.current(createFocusStartedEvent({ sessionId: id, taskId: selectedTask?.id, taskTitle: selectedTask?.title, plannedDurationMinutes, occurredAt: startedAt }));
      triggerHaptic(hapticsEnabled, 15);
    }
    setSecondsLeft(nextSeconds);
    pausedSecondsRef.current = nextSeconds;
    endAtRef.current = Date.now() + nextSeconds * 1000;
    setRunning(true);
    onFocusRunningChange?.(true);
    if (sessionRef.current) {
      void cancelFocusNotification().then(async () => {
        focusNotificationIdRef.current = await scheduleFocusCompletionNotification({ timerId: sessionRef.current?.id ?? '', endAt: new Date(endAtRef.current ?? Date.now()).toISOString(), taskTitle: sessionRef.current?.taskTitle });
      });
    }
  };
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = 1 - secondsLeft / (duration * 60);

  const isMinimal = designMode === 'minimal';
  const isDark = designMode === 'dark';
  const isChic = designMode === 'chic';
  const categoryColors = isChic && chicPalette ? Object.fromEntries(categories.map((category) => [category, chicPalette.accent])) as Record<Category, string> : Object.fromEntries(categories.map((category) => [category, isDark ? '#8EA6FF' : getThemeTokens(designMode).colors.primaryAccent])) as Record<Category, string>;
  const taskGroups = (['now', 'later', 'waiting'] as TaskBucket[]).map((bucket) => ({
    bucket,
    label: bucket === 'now' ? '今やるタスク' : bucket === 'later' ? 'あとで' : '待ち',
    tasks: availableTasks.filter((task) => (task.bucket ?? 'now') === bucket),
  })).filter((group) => group.tasks.length > 0);
  const modeCopy = isMinimal ? '今はこれだけ' : isChic ? '静かな時間を、ひとつだけ。' : '相棒も隣でいっしょに集中！';
  return <>
    <View style={[styles.focusHero, isMinimal && styles.focusHeroMinimal, isDark && styles.focusHeroDark, isChic && styles.focusHeroChic, isChic && chicPalette && { backgroundColor: chicPalette.focusBackground, borderColor: chicPalette.border, shadowColor: chicPalette.accent }, backgroundImageUri && styles.focusHeroWithPhoto]}>
      {backgroundImageUri && <><Image source={{ uri: backgroundImageUri }} resizeMode="cover" style={styles.focusHeroPhoto} /><View pointerEvents="none" style={styles.focusHeroPhotoShade} /></>}
      {isChic && chicPalette && <><View style={styles.focusChicFlowerOne}><Text style={{ color: chicPalette.accent }}>✿</Text></View><View style={styles.focusChicFlowerTwo}><Text style={{ color: chicPalette.accentStrong }}>✦</Text></View></>}
      <Text style={[styles.focusEyebrow, isMinimal && styles.focusEyebrowMinimal, isDark && styles.focusEyebrowDark, isChic && styles.focusEyebrowLight, isChic && chicPalette && { color: chicPalette.textSecondary }]}>{running ? '集中中' : '集中タイマー'}</Text>
      <Text style={[styles.focusTitle, isMinimal && styles.focusTitleMinimal, !isMinimal && styles.focusTitleLight, isChic && chicPalette && { color: chicPalette.textPrimary }]}>{sessionRef.current?.taskTitle ?? selectedTask?.title ?? '集中するタスクを選ぼう'}</Text>
      <Text style={[styles.focusCopy, isMinimal && styles.focusCopyMinimal, isDark && styles.focusCopyDark, isChic && styles.focusCopyLight, isChic && chicPalette && { color: chicPalette.textSecondary }]}>{modeCopy}</Text>
      <View style={[styles.focusTimerRing, isMinimal && styles.focusTimerRingMinimal, isDark && styles.focusTimerRingDark, isChic && styles.focusTimerRingChic, isChic && chicPalette && { borderColor: chicPalette.accent, backgroundColor: chicPalette.focusSurface }]}>
        <Text style={[styles.focusTime, isMinimal && styles.focusTimeMinimal, !isMinimal && styles.focusTimeLight, isChic && chicPalette && { color: chicPalette.textPrimary }]}>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</Text>
        <Text style={[styles.focusTimerState, isMinimal && styles.focusTimerStateMinimal, isDark && styles.focusTimerStateDark, isChic && styles.focusTimerStateChic, isChic && chicPalette && { color: chicPalette.accent }]}>{running ? '集中中' : secondsLeft === 0 ? 'できた！' : '準備OK'}</Text>
      </View>
      <View style={[styles.focusProgressTrack, !isMinimal && styles.focusProgressTrackLight, isChic && chicPalette && { backgroundColor: chicPalette.accentSoft }]}><View style={[styles.focusProgressFill, isMinimal && styles.focusProgressFillMinimal, isDark && styles.focusProgressFillDark, isChic && styles.focusProgressFillChic, isChic && chicPalette && { backgroundColor: chicPalette.accent }, { width: `${Math.max(2, progress * 100)}%` }]} /></View>
      <View style={styles.focusActions}>
        <Pressable style={[styles.focusResetButton, !isMinimal && styles.focusResetButtonLight, isChic && chicPalette && { borderColor: chicPalette.border, backgroundColor: chicPalette.cardSurface }]} onPress={reset}><Text style={[styles.focusResetText, isMinimal && styles.focusResetTextMinimal, !isMinimal && styles.focusResetTextLight, isChic && chicPalette && { color: chicPalette.textSecondary }]}>リセット</Text></Pressable>
        <Pressable style={[styles.focusStartButton, isMinimal && styles.focusStartButtonMinimal, isDark && styles.focusStartButtonDark, isChic && styles.focusStartButtonChic, isChic && chicPalette && { backgroundColor: chicPalette.accent }]} onPress={toggleTimer}><Text style={[styles.focusStartText, isChic && chicPalette && { color: chicPalette.onAccent }]}>{running ? '一時停止' : secondsLeft === 0 ? 'もう一度' : 'スタート'}</Text></Pressable>
      </View>
    </View>
    <Text style={[styles.focusSectionTitle, isMinimal && styles.focusSectionTitleMinimal, isDark && styles.focusSectionTitleDark, isChic && chicPalette && { color: chicPalette.textPrimary }]}>集中時間</Text>
    <View style={styles.focusDurationRow}>{[5, 15, 25, 45].map((minutesValue) => <Pressable key={minutesValue} style={[styles.focusDurationChip, duration === minutesValue && styles.focusDurationChipActive, duration === minutesValue && isMinimal && styles.focusDurationChipActiveMinimal, duration === minutesValue && isDark && styles.focusDurationChipActiveDark, designMode === 'chic' && chicPalette && { backgroundColor: duration === minutesValue ? chicPalette.accent : chicPalette.cardSurface, borderColor: duration === minutesValue ? chicPalette.accent : chicPalette.border }]} onPress={() => chooseDuration(minutesValue)}><Text style={[styles.focusDurationText, duration === minutesValue && styles.focusDurationTextActive, designMode === 'chic' && chicPalette && { color: duration === minutesValue ? chicPalette.onAccent : chicPalette.textSecondary }]}>{minutesValue}分</Text></Pressable>)}</View>
    {availableTasks.length === 0 ? <View style={styles.departureEmpty}><Text style={[styles.emptyCopy, isChic && chicPalette && { color: chicPalette.textSecondary }]}>未完了タスクはありません。今日はゆっくりしよう。</Text></View> : taskGroups.map((group) => <View key={group.bucket}>
      <Text style={[styles.focusSectionTitle, isMinimal && styles.focusSectionTitleMinimal, isDark && styles.focusSectionTitleDark, isChic && chicPalette && { color: chicPalette.textPrimary }]}>{group.label}</Text>
      {group.tasks.map((task) => { const nextSubtask = task.subtasks?.find((item) => !item.done); return <Pressable key={task.id} style={[styles.focusTaskRow, selectedTaskId === task.id && styles.focusTaskRowActive, designMode === 'chic' && chicPalette && { backgroundColor: selectedTaskId === task.id ? chicPalette.accentSoft : chicPalette.taskBackground, borderColor: selectedTaskId === task.id ? chicPalette.accent : chicPalette.border }]} onPress={() => { setSelectedTaskId(task.id); reset(); }}><View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} /><View style={{ flex: 1 }}><Text style={[styles.focusTaskTitle, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{nextSubtask ? `${nextSubtask.title}（${task.title}）` : task.title}</Text><Text style={[styles.focusTaskMeta, designMode === 'chic' && chicPalette && { color: chicPalette.taskMeta }]}>{task.category} ・ 優先度 {task.priority}</Text></View><Text style={[styles.focusTaskCheck, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>{selectedTaskId === task.id ? '●' : '○'}</Text></Pressable>; })}
    </View>)}
  </>;
}

function DailyScheduleTimeline({ date, tasks, plans, externalEvents, now, designMode, chicPalette, planTier, onEditTask, onEditPlan }: { date: string; tasks: Task[]; plans: DeparturePlan[]; externalEvents: Calendar.Event[]; now: Date; designMode: DesignMode; chicPalette?: ChicThemePalette; planTier: PlanTier; onEditTask: (task: Task) => void; onEditPlan: (plan: DeparturePlan) => void }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  const categoryColors = Object.fromEntries(categories.map((category) => [category, designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent])) as Record<Category, string>;
  type ScheduleItem = { id: string; time?: string; endTime?: string; title: string; meta: string; kind: 'task' | 'plan' | 'external' | 'done'; onPress?: () => void };
  const items: ScheduleItem[] = [];
  tasks.filter((task) => {
    const dates = [task.scheduledDate, task.deadlineDate, task.remindDate, task.done && task.completedAt ? dateKey(task.completedAt) : undefined];
    return dates.includes(date);
  }).forEach((task) => {
    const time = task.scheduledTime;
    if (!time) return;
    items.push({ id: `task-${task.id}`, time, endTime: task.endAt, title: task.title, meta: task.done ? '完了' : task.category, kind: task.done ? 'done' : 'task', onPress: task.done ? undefined : () => onEditTask(task) });
  });
  plans.filter((plan) => isPlanOnDate(plan, date)).forEach((plan, index) => {
    const mode = getDeparturePlanMode(plan);
    const time = getPlanScheduledTime(plan);
    const canUseReversePlan = isArrivalReversePlan(plan) && planTier === 'premium';
    const meta = mode === 'calendar_only'
      ? '予定表の予定'
      : mode === 'departure_reminder'
        ? `出発 ${time}`
        : canUseReversePlan
          ? `出発 ${formatLiveTime(getDepartureMoments(plan).leave)} ・ 準備 ${formatLiveTime(getDepartureMoments(plan).prepare)}`
          : '到着からの逆算 ・ Premium';
    items.push({ id: `plan-${plan.id ?? index}`, time, endTime: plan.endAt ?? undefined, title: plan.title, meta, kind: 'plan', onPress: () => onEditPlan(plan) });
  });
  externalEvents.filter((event) => dateKey(new Date(event.startDate)) === date).forEach((event) => items.push({ id: `external-${event.id}`, time: formatLiveTime(new Date(event.startDate)), title: event.title || 'カレンダー予定', meta: '端末カレンダー', kind: 'external' }));
  const timed = items.filter((item) => item.time).sort((a, b) => parseClock(a.time!) - parseClock(b.time!));
  const currentDate = dateKey(now);
  // Include each plan's end time when building the axis so the timeline
  // continues through the full displayed time range, not only its start hour.
  const axisHours = timed.flatMap((item) => {
    const startMinutes = parseClock(item.time!);
    const endMinutes = item.endTime ? Math.max(startMinutes, parseClock(item.endTime)) : startMinutes;
    return [Math.floor(startMinutes / 60), Math.ceil(endMinutes / 60)];
  });
  const firstHour = Math.min(7, ...axisHours);
  const lastHour = Math.max(22, ...axisHours);
  const timelineHours = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
  const hourHeight = 64;
  const axisStartMinutes = firstHour * 60;
  const timelineHeight = timelineHours.length * hourHeight;
  const placements = timed.reduce<Array<ScheduleItem & { startMinutes: number; endMinutes: number; column: number }>>((result, item) => {
    const startMinutes = parseClock(item.time!);
    const minimumCardMinutes = designMode === 'chic' ? 96 : 48;
    const endMinutes = item.endTime ? Math.max(startMinutes + (designMode === 'chic' ? 96 : 30), parseClock(item.endTime)) : startMinutes + minimumCardMinutes;
    let column = 0;
    while (result.some((placed) => placed.column === column && startMinutes < placed.endMinutes && endMinutes > placed.startMinutes)) column += 1;
    result.push({ ...item, startMinutes, endMinutes, column });
    return result;
  }, []);
  const columnCount = Math.max(1, ...placements.map((item) => item.column + 1));
  return <View style={{ marginTop: 12, marginBottom: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}><Text style={[styles.sectionTitle, { color: isDark ? '#F4F7FC' : theme.colors.primaryText }]}>今日の流れ</Text><Text style={{ color: theme.colors.primaryAccent, fontSize: 11, fontWeight: '800' }}>{date === currentDate ? '現在時刻を表示中' : '1日の予定'}</Text></View>
    <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: designMode === 'minimal' || isDark ? 16 : 18, overflow: 'hidden', height: timelineHeight, position: 'relative' }}>
      {timelineHours.map((hour) => {
        const isCurrentHour = date === currentDate && now.getHours() === hour;
        const hourItems = timed.filter((item) => Math.floor(parseClock(item.time!) / 60) === hour);
        return <View key={`timeline-hour-${hour}`} style={{ flexDirection: 'row', height: hourHeight, minHeight: hourHeight, borderBottomColor: theme.colors.border, borderBottomWidth: 1 }}>
          <View style={{ width: 66, paddingTop: 11, alignItems: 'center' }}><Text style={{ color: isCurrentHour ? theme.colors.primaryAccent : theme.colors.secondaryText, fontSize: 11, fontWeight: '700' }}>{String(hour).padStart(2, '0')}:00</Text></View>
          <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: theme.colors.border, paddingBottom: hourItems.length > 0 ? 7 : 0 }}>
            <View style={{ marginTop: 23, borderTopWidth: 1, borderTopColor: isCurrentHour ? theme.colors.primaryAccent : theme.colors.border, opacity: isCurrentHour ? 0.9 : 0.65 }} />
            {false && hourItems.map((item) => {
              const accent = item.kind === 'plan' ? theme.colors.primaryAccent : item.kind === 'external' ? theme.colors.secondaryAccent : item.kind === 'done' ? theme.colors.secondaryText : categoryColors[tasks.find((task) => `task-${task.id}` === item.id)?.category ?? categories[0]!];
              const durationMinutes = item.time && item.endTime ? Math.max(0, parseClock(item.endTime) - parseClock(item.time)) : 0;
              const blockHeight = durationMinutes > 0 ? Math.max(62, Math.min(360, durationMinutes * 1.35)) : undefined;
              const content = <View style={{ marginHorizontal: 8, marginTop: 7, padding: 10, minHeight: blockHeight, borderLeftWidth: 4, borderLeftColor: accent, borderRadius: 10, backgroundColor: theme.colors.secondarySurface, opacity: item.kind === 'done' ? 0.58 : 1 }}><Text style={{ color: accent, fontSize: 10, fontWeight: '900' }}>{item.time}</Text><Text style={{ color: theme.colors.primaryText, fontSize: 14, fontWeight: '800', marginTop: 2 }}>{item.kind === 'done' ? '✓ ' : ''}{item.title}</Text><Text style={{ color: theme.colors.secondaryText, fontSize: 10, marginTop: 3 }}>{item.meta}</Text>{item.endTime && <Text style={{ color: theme.colors.secondaryText, fontSize: 10, fontWeight: '800', marginTop: 'auto' }}>終了 {item.endTime}</Text>}</View>;
              return item.onPress ? <Pressable key={item.id} onPress={item.onPress}>{content}</Pressable> : <View key={item.id}>{content}</View>;
            })}
          </View>
        </View>;
      })}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 66, right: 0, top: 0, bottom: 0 }}>
      {placements.map((item) => {
        const accent = item.kind === 'plan' ? theme.colors.primaryAccent : item.kind === 'external' ? theme.colors.secondaryAccent : item.kind === 'done' ? theme.colors.secondaryText : categoryColors[tasks.find((task) => `task-${task.id}` === item.id)?.category ?? categories[0]!];
        const top = ((item.startMinutes - axisStartMinutes) / 60) * hourHeight + 4;
        const height = Math.max(designMode === 'chic' ? 96 : 58, ((item.endMinutes - item.startMinutes) / 60) * hourHeight - 8);
        const content = <View style={{ flex: 1, padding: 10, borderLeftWidth: 4, borderLeftColor: accent, borderRadius: 10, backgroundColor: theme.colors.secondarySurface, opacity: item.kind === 'done' ? 0.58 : 1, justifyContent: 'space-between' }}><Text style={{ color: accent, fontSize: 10, fontWeight: '900' }}>{item.time}</Text><Text numberOfLines={designMode === 'chic' ? 3 : 2} ellipsizeMode="tail" style={{ color: theme.colors.primaryText, fontSize: designMode === 'chic' ? 13 : 14, lineHeight: designMode === 'chic' ? 18 : undefined, fontWeight: '800', marginTop: 2, flexShrink: designMode === 'chic' ? 0 : 1 }}>{item.kind === 'done' ? '✓ ' : ''}{item.title}</Text><Text numberOfLines={1} style={{ color: theme.colors.secondaryText, fontSize: 10, marginTop: 3 }}>{item.meta}</Text>{item.endTime && <Text style={{ color: theme.colors.secondaryText, fontSize: 10, fontWeight: '800', marginTop: 4 }}>終了 {item.endTime}</Text>}</View>;
        const card = item.onPress ? <Pressable onPress={item.onPress} style={{ flex: 1 }}>{content}</Pressable> : <View style={{ flex: 1 }}>{content}</View>;
        return <View key={`timeline-item-${item.id}`} style={{ position: 'absolute', top, left: `${(item.column * 100) / columnCount}%`, width: `${100 / columnCount}%`, height, paddingHorizontal: 4 }}>{card}</View>;
      })}
      </View>
    </View>
  </View>;
}

function CalendarPlanActions({ plan, isDark, onEdit, onDelete, onOpenMap }: { plan: DeparturePlan; isDark: boolean; onEdit: (plan: DeparturePlan) => void; onDelete: (id: string) => void; onOpenMap: (plan: DeparturePlan) => void }) {
  const buttonStyle = { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' as const, borderRadius: 10, borderWidth: 1, borderColor: isDark ? '#40506A' : '#DDD4F5', backgroundColor: isDark ? '#20293A' : '#FAF8FF' };
  return <View style={[styles.scheduleAgendaActions, { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }]}>
    {plan.destination?.trim() && <Pressable hitSlop={6} style={buttonStyle} onPress={(event) => { event.stopPropagation(); onOpenMap(plan); }}><Text style={{ color: isDark ? '#8EA6FF' : colors.violet, fontSize: 10, fontWeight: '900' }}>地図</Text></Pressable>}
    <Pressable hitSlop={6} style={buttonStyle} onPress={(event) => { event.stopPropagation(); onEdit(plan); }}><Text style={{ color: isDark ? '#F4F7FC' : colors.ink, fontSize: 10, fontWeight: '900' }}>編集</Text></Pressable>
    {plan.id && <Pressable hitSlop={6} style={[buttonStyle, { borderColor: isDark ? '#754657' : '#E3B9BF', backgroundColor: isDark ? '#35222D' : '#FFF7F7' }]} onPress={(event) => { event.stopPropagation(); onDelete(plan.id!); }}><Text style={{ color: isDark ? '#FF8F9C' : '#B85060', fontSize: 10, fontWeight: '900' }}>削除</Text></Pressable>}
  </View>;
}

function DesignCalendarPlanActions({ plan, chicPalette, onEdit, onDelete, onOpenMap }: { plan: DeparturePlan; chicPalette: ChicThemePalette; onEdit: (plan: DeparturePlan) => void; onDelete: (id: string) => void; onOpenMap: (plan: DeparturePlan) => void }) {
  const buttonStyle = { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' as const, borderRadius: 10, borderWidth: 1, borderColor: chicPalette.border, backgroundColor: chicPalette.cardTint };
  return <View style={[styles.scheduleAgendaActions, { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }]}>
    {plan.destination?.trim() && <Pressable hitSlop={6} style={buttonStyle} onPress={(event) => { event.stopPropagation(); onOpenMap(plan); }}><Text style={{ color: chicPalette.accentStrong, fontSize: 10, fontWeight: '900' }}>地図</Text></Pressable>}
    <Pressable hitSlop={6} style={buttonStyle} onPress={(event) => { event.stopPropagation(); onEdit(plan); }}><Text style={{ color: chicPalette.textPrimary, fontSize: 10, fontWeight: '900' }}>編集</Text></Pressable>
    {plan.id && <Pressable hitSlop={6} style={[buttonStyle, { borderColor: chicPalette.danger, backgroundColor: chicPalette.accentSoft }]} onPress={(event) => { event.stopPropagation(); onDelete(plan.id!); }}><Text style={{ color: chicPalette.danger, fontSize: 10, fontWeight: '900' }}>削除</Text></Pressable>}
  </View>;
}

function TaskScheduleCalendar({ tasks, plans, externalEvents, now, designMode, chicPattern, chicPalette, planTier, focusDate, calendarMarks, onSetCalendarMark, onPremium, onEditTask, onDeleteTask, onEditPlan, onDeletePlan, onOpenMap, behaviorEvents, departureCheckIns, departurePreparationStatuses }: { tasks: Task[]; plans: DeparturePlan[]; externalEvents: Calendar.Event[]; now: Date; designMode: DesignMode; chicPattern: ChicPattern; chicPalette?: ChicThemePalette; planTier: PlanTier; focusDate?: string; calendarMarks: CalendarMarks; onSetCalendarMark: (date: string, mark?: string) => void; onPremium: (featureId?: PremiumGuideFeatureId) => void; onEditTask: (task: Task) => void; onDeleteTask: (id: string) => void; onEditPlan: (plan: DeparturePlan) => void; onDeletePlan: (id: string) => void; onOpenMap: (plan: DeparturePlan) => void; behaviorEvents: BehaviorEvent[]; departureCheckIns: DepartureCheckIn[]; departurePreparationStatuses: Record<string, DeparturePreparationStatus> }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  const designPlanAccent = designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent;
  const designExternalAccent = designMode === 'chic' && chicPalette ? chicPalette.patternStripe : theme.colors.secondaryAccent;
  const categoryColors = Object.fromEntries(categories.map((category) => [category, designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent])) as Record<Category, string>;
  const chicAgendaStyle = designMode === 'chic' && chicPalette ? { backgroundColor: chicPalette.taskBackground, borderColor: chicPalette.border } : undefined;
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
  const planDayState = useMemo(() => {
    const checkIns = new Set<string>();
    const departed = new Set<string>();
    departureCheckIns.forEach((record) => checkIns.add(`${record.planId}:${normalizePlanDate(record.date)}`));
    behaviorEvents.forEach((event) => {
      if (event.type === 'departure_started' && event.departurePlanId && event.departurePlanDate) {
        departed.add(`${event.departurePlanId}:${normalizePlanDate(event.departurePlanDate)}`);
      }
    });
    return { checkIns, departed };
  }, [behaviorEvents, departureCheckIns]);
  const getPlanStatus = (item: DeparturePlan) => {
    if (!isArrivalReversePlan(item) || planTier !== 'premium') return undefined;
    const key = item.id ? `${item.id}:${planDateKey(item)}` : undefined;
    const checkIn = Boolean(key && planDayState.checkIns.has(key));
    const departed = Boolean(key && planDayState.departed.has(key));
    const prepared = item.id ? departurePreparationStatuses[item.id] : undefined;
    return checkIn ? '出発済み' : departed ? '移動中' : prepared === 'prepared' ? '準備完了' : prepared === 'preparing' ? '準備中' : '未準備';
  };
  const getStatusPalette = (status: string) => status === '出発済み'
      ? { backgroundColor: isDark ? '#203A35' : '#DDF3E5', color: isDark ? '#7ED6C4' : '#27714A' }
    : status === '移動中'
      ? { backgroundColor: isDark ? '#26365F' : '#E8E0FA', color: isDark ? '#8EA6FF' : '#5A3E9B' }
      : status === '準備完了'
        ? { backgroundColor: isDark ? '#20334D' : '#E4F0FF', color: isDark ? '#8EA6FF' : '#356AA5' }
        : status === '準備中'
          ? { backgroundColor: isDark ? '#3A3323' : '#FFF0D6', color: isDark ? '#E8B878' : '#9A641E' }
          : { backgroundColor: isDark ? '#20293A' : '#F0EDF2', color: isDark ? '#9CA8BC' : '#6D6672' };
  const renderPlanAgenda = (item: DeparturePlan, index: number) => {
    const mode = getDeparturePlanMode(item);
    const status = getPlanStatus(item);
    const palette = status && designMode === 'chic' && chicPalette
      ? { backgroundColor: chicPalette.accentSoft, color: chicPalette.accentStrong }
      : status ? getStatusPalette(status) : undefined;
    const canUseReversePlan = isArrivalReversePlan(item) && planTier === 'premium';
    const endSuffix = item.endAt ? ` 〜 ${item.endAt}` : '';
    const meta = mode === 'calendar_only'
      ? `予定表の予定 ・ ${getPlanScheduledTime(item)}${endSuffix}`
      : mode === 'departure_reminder'
        ? `出発時刻 ・ ${getPlanScheduledTime(item)}${endSuffix}`
        : canUseReversePlan
          ? `到着 ${item.arrival} ・ 出発 ${formatLiveTime(getDepartureMoments(item).leave)}`
          : '到着からの逆算 ・ Premium';
    return <Pressable key={item.id ?? `${item.title}-${index}`} style={[styles.scheduleAgendaItem, isDark && styles.scheduleAgendaItemDark, chicAgendaStyle]} onPress={() => onEditPlan(item)}>
      <View style={[styles.scheduleAgendaDot, { backgroundColor: designPlanAccent }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{item.title}</Text>
        <View style={styles.schedulePlanMetaRow}>
          <Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{meta}</Text>
          {status && palette && <View style={[styles.scheduleStatusBadge, { backgroundColor: palette.backgroundColor }]}><Text style={[styles.scheduleStatusBadgeText, { color: palette.color }]}>{status}</Text></View>}
        </View>
      </View>
      {designMode === 'chic' && chicPalette ? <DesignCalendarPlanActions plan={item} chicPalette={chicPalette} onEdit={onEditPlan} onDelete={onDeletePlan} onOpenMap={onOpenMap} /> : <CalendarPlanActions plan={item} isDark={isDark} onEdit={onEditPlan} onDelete={onDeletePlan} onOpenMap={onOpenMap} />}
    </Pressable>;
  };
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
      <View style={[styles.scheduleCalendarCard, designMode !== 'chic' && styles.scheduleCalendarCardMinimal, isDark && styles.darkSurface, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: designMode !== 'chic' ? 16 : theme.radius.large }]}>
        <View style={styles.scheduleCalendarHeader}><View><Text style={[styles.scheduleMonthTitle, isDark && styles.darkCalendarText]}>これから7日間</Text><Text style={[styles.scheduleMonthCopy, isDark && styles.darkCalendarAccent]}>今日から6日後までの予定</Text></View><Pressable onPress={() => onPremium('month')}><Text style={[styles.scheduleAgendaEdit, isDark && styles.darkCalendarAccent]}>月表示 Premium</Text></Pressable></View>
        <ScheduleFilterChips value={scheduleFilter} designMode={designMode} chicPalette={chicPalette} onChange={setScheduleFilter} compact />
        <View style={styles.scheduleGrid}>{freeDates.map(({ date, key }) => {
          const selected = key === freeSelected;
          const taskCount = scheduleFilter === 'plans' ? 0 : tasks.filter((task) => taskDates(task).includes(key)).length;
          const planCount = scheduleFilter === 'tasks' ? 0 : plans.filter((item) => isPlanOnDate(item, key)).length;
          const count = taskCount + planCount;
        return <Pressable key={key} style={[styles.scheduleDayCell, isDark && styles.scheduleDayCellDark, selected && styles.scheduleDayCellSelected, selected && { backgroundColor: designMode === 'chic' && chicPalette ? chicPalette.accentSoft : isDark ? '#26365F' : '#F3EEFF', borderColor: designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }]} onPress={() => setSelectedDate(key)}><Text style={[styles.scheduleDayNumber, isDark && styles.darkBodyText, date.getDay() === 0 && styles.scheduleSundayNumber, date.getDay() === 6 && styles.scheduleSaturdayNumber, selected && styles.scheduleSelectedNumber, selected && isDark && styles.scheduleSelectedNumberDark, selected && designMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{date.getMonth() + 1}/{date.getDate()}</Text>{calendarMarks[key] && <Text style={styles.scheduleCalendarMark}>{calendarMarks[key]}</Text>}{count > 0 && <Text style={[styles.scheduleMoreText, isDark && styles.darkMutedText, selected && styles.scheduleMoreTextSelected, selected && designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{count}件</Text>}</Pressable>;
        })}</View>
      </View>
      <CalendarMarkPicker date={freeSelected} mark={calendarMarks[freeSelected]} onSet={onSetCalendarMark} designMode={designMode} chicPalette={chicPalette} />
      <View style={[styles.scheduleAgendaHeader, isDark && styles.darkPanel]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>{freeSelected.replaceAll('-', '.')} の予定</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{visibleFreeTasks.length + visibleFreeCompletedTasks.length + visibleFreePlans.length}件</Text></View>
      {visibleFreeTasks.map((task) => <Pressable key={task.id} style={[styles.scheduleAgendaItem, isDark && styles.scheduleAgendaItemDark, chicAgendaStyle]} onPress={() => onEditTask(task)}><View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{task.title}</Text><Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText]}>{task.category}</Text></View><Text style={[styles.scheduleAgendaEdit, isDark && styles.darkAccentText]}>編集 ›</Text></Pressable>)}
      {visibleFreeCompletedTasks.map((task) => <View key={`free-completed-${task.id}`} style={[styles.scheduleAgendaItem, styles.scheduleCompletedAgendaItem, isDark && styles.scheduleCompletedAgendaItemDark, chicAgendaStyle]}><View style={[styles.scheduleAgendaDot, styles.scheduleCompletedDot]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, styles.scheduleCompletedTitle, isDark && styles.scheduleCompletedTitleDark]}>✓ {task.title}</Text><Text style={[styles.scheduleAgendaMeta, styles.scheduleCompletedMeta, isDark && styles.scheduleCompletedMetaDark]}>完了したタスク ・ {task.completedAt ? formatLiveTime(new Date(task.completedAt)) : '記録あり'}</Text></View><Text style={[styles.scheduleCompletedLabel, isDark && styles.scheduleCompletedLabelDark]}>完了</Text></View>)}
      {visibleFreePlans.map(renderPlanAgenda)}
      {hiddenFreePlanCount > 0 && <Pressable style={styles.departureEmpty} onPress={() => onPremium('month')}><Text style={styles.emptyCopy}>無料版は1日3件まで表示できます。残り{hiddenFreePlanCount}件はPremiumで確認できます。</Text></Pressable>}
      {visibleFreeTasks.length === 0 && visibleFreeCompletedTasks.length === 0 && visibleFreePlans.length === 0 && <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>この日はまだ空いています。</Text></View>}
    </>;
  }

  return <>
      <View style={[styles.scheduleCalendarCard, designMode !== 'chic' && styles.scheduleCalendarCardMinimal, isDark && styles.darkSurface, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: designMode !== 'chic' ? 16 : theme.radius.large }]}>
        <View style={styles.scheduleCalendarHeader}>
          <Pressable style={[styles.scheduleMonthArrow, isDark && styles.scheduleMonthArrowDark]} onPress={() => moveMonth(-1)}><Text style={[styles.scheduleMonthArrowText, isDark && styles.scheduleMonthArrowTextDark]}>‹</Text></Pressable>
        <View><Text style={[styles.scheduleMonthTitle, isDark && styles.darkCalendarText]}>{year}年 {month + 1}月</Text><Text style={[styles.scheduleMonthCopy, isDark && styles.darkCalendarAccent]}>予定をまとめて見渡す</Text></View>
        <Pressable style={[styles.scheduleMonthArrow, isDark && styles.scheduleMonthArrowDark]} onPress={() => moveMonth(1)}><Text style={[styles.scheduleMonthArrowText, isDark && styles.scheduleMonthArrowTextDark]}>›</Text></Pressable>
      </View>
      <ScheduleFilterChips value={scheduleFilter} designMode={designMode} chicPalette={chicPalette} onChange={setScheduleFilter} compact />
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
        return <Pressable key={key} style={[styles.scheduleDayCell, designMode === 'minimal' && styles.scheduleDayCellMinimal, isDark && styles.scheduleDayCellDark, today && styles.scheduleDayCellToday, selected && styles.scheduleDayCellSelected, selected && { backgroundColor: designMode === 'chic' && chicPalette ? chicPalette.accentSoft : isDark ? '#26365F' : '#F3EEFF', borderColor: designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }]} onPress={() => setSelectedDate(key)}>
          <Text style={[styles.scheduleDayNumber, isDark && styles.darkBodyText, date.getDay() === 0 && styles.scheduleSundayNumber, date.getDay() === 6 && styles.scheduleSaturdayNumber, today && styles.scheduleTodayNumber, selected && styles.scheduleSelectedNumber, selected && isDark && styles.scheduleSelectedNumberDark]}>{date.getDate()}</Text>
          {calendarMarks[key] && <Text style={styles.scheduleCalendarMark}>{calendarMarks[key]}</Text>}
          <View style={styles.scheduleEventStack}>
            {visiblePlanBars.map((item, itemIndex) => {
              const planBarBackground = designMode === 'chic' && chicPalette ? chicPalette.accentSoft : isDark ? '#40558A' : theme.colors.secondarySurface;
              const planBarBorder = designMode === 'chic' && chicPalette ? chicPalette.border : isDark ? '#6F82B5' : theme.colors.border;
              const planBarText = designMode === 'chic' && chicPalette ? chicPalette.accentStrong : isDark ? '#F4F7FC' : theme.colors.primaryText;
              const selectedPlanBarBackground = designMode === 'chic' && chicPalette ? chicPalette.cardTint : isDark ? '#5872B8' : theme.colors.softAccent;
              const selectedPlanBarText = designMode === 'chic' && chicPalette ? chicPalette.accentStrong : isDark ? '#FFFFFF' : theme.colors.primaryText;
              return <View key={item.id ?? `${item.title}-${itemIndex}`} style={[styles.scheduleEventBar, { backgroundColor: selected ? selectedPlanBarBackground : planBarBackground, borderColor: planBarBorder, borderWidth: 1 }, selected && styles.scheduleEventBarSelected]}><Text numberOfLines={1} style={[styles.scheduleEventBarText, { color: selected ? selectedPlanBarText : planBarText }]}>{item.title}</Text></View>;
            })}
             {visibleTaskBars.map((task) => <View key={task.id} style={[styles.scheduleEventBar, { backgroundColor: designMode === 'chic' && chicPalette ? chicPalette.accentSoft : isDark ? '#26365F' : theme.colors.secondarySurface, borderColor: designMode === 'chic' && chicPalette ? chicPalette.border : theme.colors.border, borderWidth: 1 }, selected && styles.scheduleEventBarSelected]}><Text numberOfLines={1} style={[styles.scheduleEventBarText, isDark && styles.scheduleEventBarTextDark, selected && styles.scheduleEventBarTextSelected, selected && isDark && styles.darkBodyText, designMode === 'minimal' && { color: theme.colors.primaryText }, designMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{task.title}</Text></View>)}
            {visibleCompletedBars.map((task) => <View key={`done-${task.id}`} style={[styles.scheduleEventBar, styles.scheduleCompletedBar, isDark && styles.scheduleCompletedBarDark]}><Text numberOfLines={1} style={[styles.scheduleCompletedBarText, isDark && styles.scheduleCompletedBarTextDark]}>✓ {task.title}</Text></View>)}
            {visibleExternalBars.map((event) => <View key={`external-${event.id}`} style={[styles.scheduleEventBar, { backgroundColor: designExternalAccent }, isDark && styles.scheduleExternalBarDark, selected && styles.scheduleEventBarSelected]}><Text numberOfLines={1} style={[styles.scheduleEventBarText, isDark && styles.scheduleEventBarTextDark, selected && styles.scheduleEventBarTextSelected, selected && isDark && styles.darkBodyText]}>{event.title || 'カレンダー予定'}</Text></View>)}
            {dayItemCount > 2 && <Text style={[styles.scheduleMoreText, selected && styles.scheduleSelectedText, isDark && styles.scheduleMoreTextDark]}>ほか {dayItemCount - 2}件</Text>}
          </View>
        </Pressable>;
      })}</View>
      <View style={styles.scheduleLegend}><Text style={[styles.scheduleLegendText, isDark && styles.darkAccentText, designMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{'色付き帯：タスク'}</Text><Text style={[styles.scheduleLegendPlan, isDark && styles.darkAccentText, designMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{'アクセント帯：出発予定'}</Text></View>
    </View>

    <CalendarMarkPicker date={selectedDate} mark={calendarMarks[selectedDate]} onSet={onSetCalendarMark} designMode={designMode} chicPalette={chicPalette} />
    <View style={[styles.scheduleAgendaHeader, isDark && styles.darkPanel]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>{selectedDate.replaceAll('-', '.')} の予定</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{visibleSelectedTasks.length + visibleSelectedCompletedTasks.length + visibleSelectedPlans.length + visibleSelectedExternalEvents.length}件</Text></View>
    {visibleSelectedTasks.length === 0 && visibleSelectedCompletedTasks.length === 0 && visibleSelectedPlans.length === 0 && visibleSelectedExternalEvents.length === 0 ? <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>この日はまだ空いています。</Text></View> : <>
      {visibleSelectedTasks.map((task) => {
        const overdue = Boolean(task.deadlineDate && getTargetDate(task) && getTargetDate(task)!.getTime() < now.getTime());
        return <Pressable key={task.id} style={[styles.scheduleAgendaItem, isDark && styles.scheduleAgendaItemDark, chicAgendaStyle, overdue && styles.scheduleAgendaDanger, overdue && isDark && styles.scheduleAgendaDangerDark]} onPress={() => onEditTask(task)}>
          <View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} />
          <View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{task.title}</Text><Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText]}>{task.category} ・ {task.deadlineDate ? `期限 ${task.deadlineTime ?? ''}` : task.repeatRule && task.repeatRule !== 'none' ? 'ルーティン' : `リマインド ${task.remindAt ?? ''}`}</Text></View>
          <View style={styles.scheduleAgendaActions}><Text style={[styles.scheduleAgendaEdit, isDark && styles.darkAccentText]}>{overdue ? '期限超過' : '編集 ›'}</Text><Pressable onPress={(event) => { event.stopPropagation(); onDeleteTask(task.id); }}><Text style={styles.timelineTaskDelete}>削除</Text></Pressable></View>
        </Pressable>;
      })}
      {visibleSelectedCompletedTasks.map((task) => <View key={`completed-${task.id}`} style={[styles.scheduleAgendaItem, styles.scheduleCompletedAgendaItem, isDark && styles.scheduleCompletedAgendaItemDark, chicAgendaStyle]}><View style={[styles.scheduleAgendaDot, styles.scheduleCompletedDot]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, styles.scheduleCompletedTitle, isDark && styles.scheduleCompletedTitleDark]}>✓ {task.title}</Text><Text style={[styles.scheduleAgendaMeta, styles.scheduleCompletedMeta, isDark && styles.scheduleCompletedMetaDark]}>完了したタスク ・ {task.completedAt ? formatLiveTime(new Date(task.completedAt)) : '記録あり'}</Text></View><Text style={[styles.scheduleCompletedLabel, isDark && styles.scheduleCompletedLabelDark]}>完了</Text></View>)}
      {visibleSelectedPlans.map(renderPlanAgenda)}
      {hiddenSelectedPlanCount > 0 && <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>この日は{calendarPlanDisplayLimit}件まで表示しています。</Text></View>}
      {visibleSelectedExternalEvents.map((event) => <View key={`external-agenda-${event.id}`} style={[styles.scheduleAgendaItem, isDark && styles.scheduleAgendaItemDark, chicAgendaStyle]}><View style={[styles.scheduleAgendaDot, { backgroundColor: designExternalAccent }]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{event.title || 'カレンダー予定'}</Text><Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText]}>端末カレンダー ・ {formatLiveTime(new Date(event.startDate))}</Text></View><Text style={[styles.scheduleAgendaEdit, isDark && styles.darkAccentText]}>外部</Text></View>)}
    </>}
  </>;
}

function ScheduleFilterChips({ value, designMode, chicPalette, onChange, compact = false }: { value: 'all' | 'tasks' | 'plans'; designMode: DesignMode; chicPalette?: ChicThemePalette; onChange: (value: 'all' | 'tasks' | 'plans') => void; compact?: boolean }) {
  return <View style={[styles.scheduleFilterRow, compact && styles.scheduleFilterRowInCalendar, designMode === 'dark' && styles.darkSurface, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]}>{([['all', 'すべて'], ['tasks', 'やること'], ['plans', '予定']] as const).map(([id, label]) => <Pressable key={id} onPress={() => onChange(id)} style={[styles.scheduleFilterChip, value === id && styles.scheduleFilterChipActive, value === id && designMode === 'dark' && styles.scheduleFilterChipActiveDark, value === id && designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }]}><Text style={[styles.scheduleFilterText, value === id && styles.scheduleFilterTextActive, value === id && designMode === 'dark' && styles.scheduleFilterTextActiveDark, value === id && designMode === 'chic' && chicPalette && { color: chicPalette.onAccent }, value !== id && designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{label}</Text></Pressable>)}</View>;
}

function CalendarMarkPicker({ date, mark, onSet, designMode, chicPalette }: { date: string; mark?: string; onSet: (date: string, mark?: string) => void; designMode: DesignMode; chicPalette?: ChicThemePalette }) {
  const stickers = ['🌸', '💗', '☕', '⭐', '🎯', '📌'];
  const isDark = designMode === 'dark';
  const isChic = designMode === 'chic' && Boolean(chicPalette);
  return <View style={[styles.calendarMarkPicker, designMode === 'minimal' && styles.calendarMarkPickerMinimal, isDark && styles.darkCalendarMarkPicker, isChic && chicPalette && { backgroundColor: chicPalette.cardTint, borderColor: chicPalette.border }]}>
    <View style={{ flex: 1 }}><Text style={[styles.calendarMarkTitle, isDark && styles.darkBodyText, isChic && chicPalette && { color: chicPalette.textPrimary }]}>この日に目印</Text><Text style={[styles.calendarMarkCopy, isDark && styles.darkMutedText, isChic && chicPalette && { color: chicPalette.textSecondary }]}>{mark ? `${mark} を表示中` : 'シールを選んで予定や記録を目立たせる'}</Text></View>
    <View style={styles.calendarMarkChoices}>{stickers.map((sticker) => <Pressable key={sticker} style={[styles.calendarMarkChoice, isDark && styles.darkCalendarMarkChoice, isChic && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }, mark === sticker && styles.calendarMarkChoiceActive, mark === sticker && isDark && styles.darkCalendarMarkChoiceActive, mark === sticker && isChic && chicPalette && { backgroundColor: chicPalette.accentSoft, borderColor: chicPalette.accent }]} onPress={() => onSet(date, mark === sticker ? undefined : sticker)}><Text style={[styles.calendarMarkChoiceText, isChic && chicPalette && { color: chicPalette.accentStrong }]}>{sticker}</Text></Pressable>)}{mark && <Pressable style={[styles.calendarMarkClear, isDark && styles.darkCalendarMarkClear, isChic && chicPalette && { backgroundColor: chicPalette.accentSoft }]} onPress={() => onSet(date, undefined)}><Text style={[styles.calendarMarkClearText, isDark && styles.darkBodyText, isChic && chicPalette && { color: chicPalette.accentStrong }]}>×</Text></Pressable>}</View>
  </View>;
}

function isCheckChicPattern(pattern: ChicPattern): boolean {
  return pattern === 'checkLavenderSatin' || pattern === 'checkBeigeNoir' || pattern === 'checkMauveFrame';
}

function ChicPatternDecor({ pattern, accent, warm, density = 'regular', checkColor, previewTopCrop = false }: { pattern: ChicPattern | 'flower' | 'stripe'; accent: string; warm: string; density?: 'regular' | 'compact'; checkColor?: ChicCheckColor; previewTopCrop?: boolean }) {
  const compact = density === 'compact';
  if (pattern === 'plain') return null;
  if (pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark') {
    return <View pointerEvents="none" style={styles.patternLayer}><Image source={designFloralBackgroundAssets[pattern]} resizeMode="cover" style={[styles.patternImageLayer, compact && styles.patternImageLayerCompact, previewTopCrop && styles.patternImageLayerPreviewTop]} /></View>;
  }
  if (pattern === 'checkLavenderSatin' || pattern === 'checkBeigeNoir' || pattern === 'checkMauveFrame') {
    const selectedCheckColor = checkColor ? getChicCheckColor(checkColor) : undefined;
    const fallbackCheck = getDesignCheckThemeTokens('cool');
    const backgroundColor = selectedCheckColor?.patternBase ?? fallbackCheck.patternBase;
    const cell = pattern === 'checkLavenderSatin' ? (compact ? 30 : 32) : pattern === 'checkBeigeNoir' ? (compact ? 12 : 14) : (compact ? 20 : 22);
    const verticalColor = `${(selectedCheckColor ?? fallbackCheck).patternStripe}30`;
    const horizontalColor = `${(selectedCheckColor ?? fallbackCheck).patternStripe}28`;
    const columns = Math.min(28, Math.ceil((compact ? 260 : 520) / cell) + 2);
    const rows = Math.min(48, Math.ceil((compact ? 420 : 1400) / cell) + 2);
    const overlapColor = `${(selectedCheckColor ?? fallbackCheck).patternStripe}42`;
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
  return null;
}

function CompactNumberSetting({ label, value, onChange, isDark = false }: { label: string; value: number; onChange: (value: number) => void; isDark?: boolean }) {
  return <View style={[styles.compactSetting, isDark && styles.compactSettingDark]}>
    <Text style={[styles.compactLabel, isDark && styles.compactLabelDark]}>{label}</Text>
    <View style={styles.compactControls}>
      <Pressable onPress={() => onChange(Math.max(0, value - 5))}><Text style={[styles.compactStep, isDark && styles.compactStepDark]}>−</Text></Pressable>
      <Text style={[styles.compactValue, isDark && styles.compactValueDark]}>{value}分</Text>
      <Pressable onPress={() => onChange(value + 5)}><Text style={[styles.compactStep, isDark && styles.compactStepDark]}>＋</Text></Pressable>
    </View>
  </View>;
}

function ChicPatternSelector({ designMode, chicPattern, chicCheckColor, planTier, onPattern, onCheckColor, onPremium }: { designMode: DesignMode; chicPattern: ChicPattern; chicCheckColor: ChicCheckColor; planTier: PlanTier; onPattern: (pattern: ChicPattern) => void; onCheckColor: (color: ChicCheckColor) => void; onPremium: () => void }) {
  const patterns: { id: ChicPattern; label: string; feature?: 'chic_dot' | 'chic_check_lavender_satin' | 'chic_check_beige_noir' | 'chic_check_mauve_frame' }[] = [
    { id: 'floral', label: '花柄1' },
    { id: 'floralSoft', label: '花柄2' },
    { id: 'floralSeasonal', label: '花柄3' },
    { id: 'plain', label: 'プレーン' },
    { id: 'dot', label: 'ドット', feature: 'chic_dot' },
    { id: 'checkLavenderSatin', label: 'くすみラベンダーチェック', feature: 'chic_check_lavender_satin' },
    { id: 'checkBeigeNoir', label: 'ベージュ×ブラックチェック', feature: 'chic_check_beige_noir' },
    { id: 'checkMauveFrame', label: 'モーブフレームチェック', feature: 'chic_check_mauve_frame' },
  ];
  const displayPatternLabels: Partial<Record<ChicPattern, string>> = {
    floral: '花柄1', floralSoft: '花柄2', floralSeasonal: '花柄3', floralDark: '花柄3',
    checkLavenderSatin: 'ギンガムチェック1', checkBeigeNoir: 'ギンガムチェック2', checkMauveFrame: 'ギンガムチェック3',
  };
  Object.assign(displayPatternLabels, {
    floral: '\u82b1\u67c41', floralSoft: '\u82b1\u67c42', floralSeasonal: '\u82b1\u67c43', floralDark: '\u82b1\u67c43',
    plain: '\u30d7\u30ec\u30fc\u30f3', dot: '\u30c9\u30c3\u30c8',
    checkLavenderSatin: '\u30ae\u30f3\u30ac\u30e0\u30c1\u30a7\u30c3\u30af1', checkBeigeNoir: '\u30ae\u30f3\u30ac\u30e0\u30c1\u30a7\u30c3\u30af2', checkMauveFrame: '\u30ae\u30f3\u30ac\u30e0\u30c1\u30a7\u30c3\u30af3',
  });
  const visiblePatterns = designMode === 'photo' ? patterns.filter((item) => item.id === 'plain') : patterns;
  const selectedPalette = getChicCheckColor(chicCheckColor);
  return <View style={[styles.patternSelectorNew, designMode === 'dark' && styles.darkSurface, { borderTopColor: selectedPalette.border }]}>
    <Text style={[styles.fieldLabel, designMode === 'dark' && styles.darkAccentText, { color: designMode === 'dark' ? '#B4C0D4' : selectedPalette.textPrimary }]}>背景の柄</Text>
    <View style={styles.patternChoices}>
      {visiblePatterns.map((item) => {
        const locked = !!item.feature && !hasPremiumAccess(planTier, item.feature);
        const isCheck = isCheckChicPattern(item.id);
        const visual = isCheck ? getChicCheckColor(chicCheckColor) : getChicPatternVisual(item.id, getChicCheckColor(chicCheckColor));
        const patternBase = isCheck ? getChicCheckColor(chicCheckColor).patternBase : visual.background;
        const patternStripe = isCheck ? getChicCheckColor(chicCheckColor).patternStripe : visual.warm;
        const choicePalette = selectedPalette;
        const selected = chicPattern === item.id;
        return <Pressable key={item.id} style={[styles.patternChoice, { backgroundColor: choicePalette.cardSurface, borderColor: selected ? choicePalette.accent : choicePalette.border }, selected && { borderWidth: 2 }]} onPress={() => { if (locked) { onPremium(); return; } onPattern(item.id); }}>
          <View style={[styles.patternSwatch, styles.patternSwatchLarge, { backgroundColor: patternBase, borderColor: choicePalette.border, borderWidth: 1 }]}><ChicPatternDecor pattern={item.id} accent={visual.accent} warm={patternStripe} density="compact" checkColor={chicCheckColor} previewTopCrop={item.id === 'floralSoft'} /></View>
          <Text numberOfLines={2} ellipsizeMode="clip" style={[styles.patternChoiceText, { color: selected ? choicePalette.accentStrong : choicePalette.textSecondary }]}>{displayPatternLabels[item.id] ?? item.label}{locked ? ' 🔒' : ''}</Text>
        </Pressable>;
      })}
    </View>
    <>
      <Text style={[styles.fieldLabel, { marginTop: 12 }, designMode === 'dark' && styles.darkAccentText, { color: designMode === 'dark' ? '#B4C0D4' : selectedPalette.textPrimary }]}>テーマカラー</Text>
      <View style={styles.themeColorChoices}>
        {chicCheckColorChoices.map((choice) => <Pressable key={choice.id} accessibilityLabel={getDesignCheckColorLabel(choice.id)} style={[styles.themeColorChoice, { backgroundColor: choice.cardSurface, borderColor: chicCheckColor === choice.id ? choice.accent : choice.border }, chicCheckColor === choice.id && { borderWidth: 2 }]} onPress={() => onCheckColor(choice.id)}>
          <View style={[styles.themeColorSwatch, { backgroundColor: choice.background, borderColor: choice.border }]} />
          <Text numberOfLines={2} ellipsizeMode="clip" style={[styles.themeColorText, { color: chicCheckColor === choice.id ? choice.accentStrong : choice.textSecondary }]}>{getDesignCheckColorLabel(choice.id)}</Text>
        </Pressable>)}
      </View>
    </>
  </View>;
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

function TodayWinStrip({ tasks, designMode, chicPattern, chicPalette, onRestore, onOpenCompleted }: { tasks: Task[]; designMode: ThemeMode; chicPattern: ChicPattern; chicPalette: ChicThemePalette; onRestore: (id: string) => void; onOpenCompleted?: () => void }) {
  const theme = getThemeTokens(designMode, chicPalette.id);
  const now = new Date();
  const todayKey = dateKey(now);
  const scheduledToday = tasks.filter((task) => !task.scheduledDate || normalizeTaskDateKey(task.scheduledDate)! <= todayKey).filter((task) => !isTaskSkippedOnDate(task, todayKey));
  const completedToday = tasks.filter((task) => task.done && task.completedAt && dateKey(task.completedAt) === todayKey);
  const count = completedToday.reduce((sum, task) => sum + (task.subtasks?.length ? task.subtasks.filter((item) => item.done).length : 1), 0);
  const drop = React.useRef(new Animated.Value(1)).current;
  const previous = React.useRef(count);
  const [dropVisible, setDropVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const nextNowTask = [...scheduledToday]
    .filter((task) => !task.done && (task.bucket ?? 'now') === 'now')
    .sort((a, b) => {
      const priority: Record<Priority, number> = { 高: 0, 中: 1, 低: 2 };
      return priority[a.priority] - priority[b.priority];
    })[0];
  const remainingNow = scheduledToday.filter((task) => !task.done && (task.bucket ?? 'now') === 'now').reduce((sum, task) => sum + (task.subtasks?.length ? task.subtasks.filter((item) => !item.done).length : 1), 0);
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
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: theme.colors.primaryText }]}>今日できたこと</Text>
          {completedToday.length === 0 ? (
            <Text style={[styles.emptyCopy, { color: theme.colors.secondaryText }]}>完了したタスクはまだありません。</Text>
          ) : completedToday.map((task) => (
            <View key={task.id} style={[styles.completedDetailRow, designMode === 'minimal' && styles.completedDetailRowMinimal]}>
              <Text style={[styles.completedDetailIcon, { color: theme.colors.primaryAccent }]}>{designMode !== 'chic' ? '✓' : '✿'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, { color: theme.colors.primaryText }]}>{task.title}</Text>
                <Text style={[styles.taskMeta, { color: theme.colors.secondaryText }]}>{task.category}</Text>
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
        <Pressable style={[styles.todayHeroCard, styles.todayHeroCardMinimal, designMode === 'dark' && styles.todayHeroCardMinimalDark]} onPress={() => { onOpenCompleted?.(); setDetailsOpen(true); }}>
          <View style={styles.todayHeroMinimalLayout}>
            <View style={styles.todayHeroMinimalLeft}>
              <Text style={[styles.todayHeroMinimalKicker, designMode === 'dark' && styles.todayHeroMinimalKickerDark]}>TODAY</Text>
              <Text style={[styles.todayHeroMinimalNowLabel, designMode === 'dark' && styles.todayHeroMinimalTextDark]}>今はこれ</Text>
              <Text numberOfLines={2} style={[styles.todayHeroMinimalTask, designMode === 'dark' && styles.todayHeroMinimalTextDark]}>{nextNowTask ? nextNowTask.title : remainingNow === 0 ? '今日の分は完了。いい感じ' : '次にやる1つをここで決めます'}</Text>
              <Text style={[styles.todayHeroMinimalStats, designMode === 'dark' && styles.todayHeroMinimalStatsDark]}>完了 {count} / 残り {remainingNow}</Text>
            </View>
            <View style={styles.todayUnifiedAchievementMinimal}>
              <Text style={[styles.todayHeroMinimalKicker, designMode === 'dark' && styles.todayHeroMinimalKickerDark]}>今日の進み</Text>
              <Text style={[styles.todayHeroMinimalNumber, designMode === 'dark' && styles.todayHeroMinimalNumberDark]}>{String(count).padStart(2, '0')}</Text>
              <View style={styles.minimalAchievementBars}>{Array.from({ length: 8 }, (_, index) => <View key={index} style={[styles.minimalAchievementBar, index < Math.min(8, count) && styles.minimalAchievementBarFilled, designMode === 'dark' && styles.minimalAchievementBarDark, index < Math.min(8, count) && designMode === 'dark' && styles.minimalAchievementBarFilledDark]} />)}</View>
              <Text style={[styles.todayHeroMinimalStats, designMode === 'dark' && styles.todayHeroMinimalStatsDark]}>今日できたことを確認</Text>
            </View>
          </View>
        </Pressable>
        {details}
      </>
    );
  }
  const item = '✿';
  const treasureColors = [chicPalette.accentSoft, chicPalette.patternStripe, chicPalette.border];
  return (
    <>
      <Pressable style={[styles.todayHeroCard, styles.todayHeroCardChic, { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border, shadowColor: chicPalette.accent }]} onPress={() => { onOpenCompleted?.(); setDetailsOpen(true); }}>
        {designMode === 'chic' && chicPattern === 'checkLavenderSatin' && <BThemeRibbonDecoration today />}
        {designMode === 'chic' && chicPattern === 'checkBeigeNoir' && <CThemeRibbonDecoration today />}
        <View style={styles.todayHeroChicLayout}>
          <View style={[styles.todayHeroChicPlate, { backgroundColor: chicPalette.cardSurface }] }>
            <View style={[styles.todayChicMark, { backgroundColor: chicPalette.accentSoft }]}><Text style={[styles.todayChicMarkText, { color: chicPalette.accent }]}>✿</Text></View>
            <Text style={[styles.todayHeroKicker, { color: chicPalette.textSecondary }]}>今はこれ</Text>
            <Text numberOfLines={2} style={[styles.todayHeroCopy, { color: chicPalette.textPrimary }]}>{nextNowTask ? nextNowTask.title : remainingNow === 0 ? '今日の分は完了。いい感じ' : '次にやる1つをここで決めます'}</Text>
            <Text style={[styles.todayHeroStats, { color: chicPalette.textSecondary }]}>完了 {count}　残り {remainingNow}</Text>
          </View>
          <View style={styles.todayHeroJarWrap}>
            <View style={styles.miniJarWrap}>
              <View style={[styles.miniJarLid, { backgroundColor: chicPalette.accent }]} />
              <View style={[styles.miniJar, styles.miniJarChicGlass, { borderColor: chicPalette.border, shadowColor: chicPalette.accent }]}>{Array.from({ length: Math.min(12, count) }, (_, index) => <Text key={index} style={[styles.miniJarItem, { left: 8 + (index % 3) * 22, bottom: 4 + Math.floor(index / 3) * 14, color: treasureColors[index % treasureColors.length] }]}>{index % 2 ? '✦' : '●'}</Text>)}</View>
              {dropVisible && <Animated.Text style={[styles.fallingTreasure, fallingStyle]}>{item}</Animated.Text>}
            </View>
            <Text style={[styles.todayHeroProgressLabel, { color: chicPalette.textSecondary }]}>今日の進み</Text>
            <Text style={[styles.todayHeroJarHint, { color: chicPalette.textMuted }]}>タップして今日できたことを見る</Text>
          </View>
        </View>
      </Pressable>
      {details}
    </>
  );
}

function AchievementVessel({ tasks, designMode, chicPattern = 'plain', chicPalette, scope = 'month', targetDate, targetMonth, compact = false }: { tasks: Task[]; designMode: ThemeMode; chicPattern?: ChicPattern; chicPalette?: ChicThemePalette; scope?: 'today' | 'month'; targetDate?: string; targetMonth?: string; compact?: boolean }) {
  const now = new Date();
  const completed = tasks.filter((task) => {
    if (!task.done || !task.completedAt) return false;
    const completedDate = new Date(task.completedAt);
    return targetDate ? dateKey(completedDate) === targetDate : scope === 'today' ? dateKey(completedDate) === dateKey(now) : dateKey(completedDate).startsWith(targetMonth ?? dateKey(now).slice(0, 7));
  }).flatMap((task) => task.subtasks?.length ? task.subtasks.filter((item) => item.done).map((item) => ({ ...task, id: `${task.id}:${item.id}`, title: item.title })) : [task]);
  const visible = completed.slice(-18);
  if (designMode !== 'chic') {
    return <View style={[styles.minimalAchievement, compact && styles.minimalAchievementCompact, designMode === 'dark' && styles.minimalAchievementDark]}><View><Text style={[styles.minimalAchievementLabel, designMode === 'dark' && styles.minimalAchievementLabelDark]}>{targetDate ? 'この日の達成' : scope === 'today' ? '今日できたこと' : '今月の記録'}</Text><Text style={[styles.minimalAchievementNumber, compact && styles.minimalAchievementNumberCompact, designMode === 'dark' && styles.minimalAchievementNumberDark]}>{String(completed.length).padStart(2, '0')}</Text><Text style={[styles.taskMeta, designMode === 'dark' && styles.minimalAchievementLabelDark]}>{completed.length}件完了</Text></View><View style={styles.minimalAchievementBars}>{Array.from({ length: 10 }, (_, item) => <View key={item} style={[styles.minimalAchievementBar, item < Math.min(10, completed.length) && styles.minimalAchievementBarFilled, designMode === 'dark' && styles.minimalAchievementBarDark, item < Math.min(10, completed.length) && designMode === 'dark' && styles.minimalAchievementBarFilledDark]} />)}</View></View>;
  }
  const vesselPalette = chicPalette ?? getDesignCheckThemeTokens('cool');
  return <View style={[styles.vesselScene, compact && styles.vesselSceneCompact, designMode === 'chic' && styles.vesselSceneChic, designMode === 'chic' && { backgroundColor: vesselPalette.cardTint, borderColor: vesselPalette.border }]}>
    <View style={[styles.vesselLabel, designMode === 'chic' && styles.vesselLabelChic]}><Text style={[styles.vesselLabelTop, designMode === 'chic' && { color: vesselPalette.textSecondary }]}>{targetDate ? 'この日の小さな達成' : scope === 'today' ? '今日の小さな達成' : designMode === 'chic' ? '今月の小さな達成' : '今月のできたこと'}</Text><Text style={[styles.vesselLabelTitle, compact && styles.vesselLabelTitleCompact, designMode === 'chic' && { color: vesselPalette.textPrimary }]}>{completed.length}個のできた！</Text></View>
    <View style={[styles.jarLid, designMode === 'chic' && { backgroundColor: vesselPalette.accent }]} />
    <View style={[styles.jarBody, compact && styles.jarBodyCompact, designMode === 'chic' && { borderColor: vesselPalette.border, backgroundColor: vesselPalette.cardSurface }]}>
      {visible.map((task, index) => <View key={task.id} style={[styles.jarTreasure, designMode === 'chic' && { backgroundColor: vesselPalette.cardSurface }, { left: 13 + (index % 6) * 39, bottom: 10 + Math.floor(index / 6) * 35, transform: [{ rotate: `${(index % 5) * 8 - 16}deg` }] }]}><Text style={[styles.jarTreasureText, designMode === 'chic' && { color: vesselPalette.accent }]}>{designMode === 'chic' ? (index % 3 === 0 ? '✿' : index % 3 === 1 ? '★' : '●') : (index % 2 ? '★' : '🍪')}</Text></View>)}
      {visible.length === 0 && <Text style={styles.jarEmptyText}>最初のひとつを待っています</Text>}
    </View>
    {!compact && <Text style={[styles.vesselCaption, designMode === 'chic' && { color: vesselPalette.textSecondary }]}>{designMode === 'chic' ? '終わるたび、瓶に小さな花が増えます' : '相棒の宝物が少しずつ増えていくよ'}</Text>}
  </View>;
}
