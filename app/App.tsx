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
import { DepartureCountdownCard, TimelineScreen } from './screens/TimelineScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { HistoryScreen, MonthlyReflectionCardView, ReflectionCardModel } from './screens/HistoryScreen';
import { TaskModal } from './components/TaskModal';
import { BulkTaskModal } from './components/BulkTaskModal';
import { DeparturePlanForm } from './components/DeparturePlanForm';
import { AffirmationSettingsCard, MAX_AFFIRMATIONS } from './components/AffirmationSettingsCard';
import { PremiumModal } from './components/PremiumModal';
import { useRhythmStoreKit } from './features/purchases/useRhythmStoreKit';
import { RewardedAccessModal, RewardedAccessResult } from './components/RewardedAccessModal';
import { BottomNav } from './components/BottomNav';
import { OnboardingCarousel } from './features/onboarding/OnboardingCarousel';
import { OnboardingCaptureStudio } from './features/onboarding/OnboardingCaptureStudio';
import { OnboardingHint } from './features/onboarding/OnboardingHint';
import { FREE_GUIDE_TOUR, PREMIUM_GUIDE_TOUR, WIDGET_GUIDE_CARDS } from './features/onboarding/onboardingSteps';
import type { IntroCardId, OnboardingFeatureId } from './features/onboarding/onboardingSteps';
import { useOnboarding } from './features/onboarding/useOnboarding';
import { RecoveryModal } from './components/RecoveryModal';
import { DesignCustomizeModal } from './components/DesignCustomizeModal';
import { TravelAppsSettingsCard } from './components/TravelAppsSettingsCard';
import { styles } from './styles/appStyles';
import { Affirmation, AffirmationCustomText, CalendarMarks, Category, DeparturePlan, DeparturePreparationStatus, MonthlyReflectionCard, MonthlyReview, MonthlyWishState, NudgeMode, PersistedState, PhotoThemePhotoTarget, PhotoThemeSettings, Priority, RepeatRule, Screen, SharedEvent, SharedParticipantPrefs, Subtask, Task, TaskBucket, TaskListItem, ThemeMode, TimeTab, UrgencyStatus, WidgetSettings, WidgetSize, WishAction, WishMonthMap } from './types';
import { initialPlan } from './storage/rhythmState';
import { DEFAULT_TRAVEL_APP_SETTINGS, normalizeTravelAppSettings, TravelAppSettings } from './features/travel/travelApps';
import { loadRhythmState, saveRhythmState } from './storage/rhythmStorage';
import { buildRhythmWidgetSnapshot, saveRhythmAffirmationPhoto, saveRhythmWidgetPhoto, saveRhythmWidgetSnapshot } from './features/widget/rhythmWidgetSnapshot';
import { DEFAULT_WIDGET_SETTINGS, getWidgetAccentHex, normalizeWidgetSettings } from './features/widget/widgetSettings';
import { categories, priorities, completionIcons, categoryColors as baseCategoryColors, designModes, getLateRiskMessage, getNextBestAction, getUrgencyStatus, urgencyLevel } from './features/tasks/taskUtils';
import { createSharedEventPacket, createSharedEventToken, encodeSharedEventLink, normalizeSharedEvent, parseSharedEventLink, upsertSharedEvent } from './features/shared/sharedUtils';
import { getMonthlyWishState, normalizeWishMonthsForSave, wishMonthKey } from './features/wish/wishUtils';
import { cancelPendingTaskNotifications } from './features/tasks/taskNotifications';
import { cancelPendingDepartureNotifications } from './features/departure/departureNotifications';
import { getDeparturePlanMode, getPlanScheduledTime, isArrivalReversePlan, isDepartureReminderPlan, normalizeDeparturePlanForSave } from './features/departure/departurePlanMode';
import { WishScreen } from './WishScreen';
import { VoiceInputModal } from './components/VoiceInputModal';
import { VoiceParseResult } from './features/voiceParser';
import { consumeVoiceUsage, grantVoiceReward as grantVoiceUsageReward, normalizeVoiceUsage, remainingVoiceRewards, remainingVoiceUses, VoiceUsage } from './features/voice/voiceUsage';
import { VoiceUsageLimitModal } from './components/VoiceUsageLimitModal';
import { buildRoutineInterruptionSummary, getRoutineHistories } from './features/analytics/routineInterruptionAnalysis';
import type { RoutineArchive } from './types';
import { SharedEventScreen } from './SharedEventScreen';
import { TopImageCropModal } from './components/TopImageCropModal';
import { cropRectToPixels, displayToNormalizedRect, getContainBounds, getInitialCropRect, NormalizedCropRect } from './features/photo/topImageCrop';
import { deleteManagedPhotoUri, persistPhotoUri } from './features/photo/persistentPhoto';
import { canUseNotifications, getNotificationPermissionAction, getNotificationPermissionStatus, requestRhythmNotificationPermission } from './features/notifications/notificationPermission';
import { addHours, canCreateWish, canImportCalendar, canStartPremiumDesignTrial, endOfCalendarMonth, isPremiumDesignTrialActive, isPremiumDesignUnlocked, isWishMonthlyGoalUnlocked } from './features/ads/rewardedAccessLogic';
import { getRequiredAds, RewardedFeatureId } from './features/ads/rewardedAccess';
import { DEFAULT_REWARDED_ACCESS_STATE, loadRewardedAccessState, RewardedAccessState, saveRewardedAccessState } from './features/ads/rewardedAccessStorage';
import { cancelFocusCompletionNotification, cancelPendingFocusCompletionNotifications, scheduleFocusCompletionNotification } from './features/focus/focusNotifications';
import { FOCUS_NAVIGATION_GUARD_COPY, getFocusNavigationDecision } from './features/focus/focusUsagePolicy';
import {
  Alert,
  ActivityIndicator,
  AppState,
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
  TextInput,
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
const ROUTINE_ARCHIVE_RETENTION_DAYS = 90;

function pruneRoutineArchives(items: RoutineArchive[], now = Date.now()): RoutineArchive[] {
  return items.filter((item) => {
    const removedAt = Date.parse(item.removedAt);
    return !Number.isFinite(removedAt) || now - removedAt < ROUTINE_ARCHIVE_RETENTION_DAYS * 86_400_000;
  });
}

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

type FloralPatternId = 'floral' | 'floralSoft' | 'floralSeasonal' | 'floralDark';

// Keep the template id, display name, and bundled image together. These are
// static require() values so React Native can cache and reuse the same image
// in the app background, settings swatches, and the design preview. Preview
// thumbnails are kept separate so the settings sheet never decodes the full
// screen background assets.
const designFloralAssets: Record<FloralPatternId, { source: number; label: string; previewSource?: number; thumbnailSource?: number }> = {
  floral: { source: require('./assets/themes/floral/vintage-bloom.jpg'), thumbnailSource: require('./assets/themes/floral/vintage-bloom-preview.jpg'), label: '花柄1' },
  floralSoft: { source: require('./assets/themes/floral/botanical-line.jpg'), previewSource: require('./assets/themes/floral/floral-soft-preview.png'), thumbnailSource: require('./assets/themes/floral/floral-soft-thumbnail.jpg'), label: '花柄2' },
  floralSeasonal: { source: require('./assets/themes/floral/sheer-floral.jpg'), thumbnailSource: require('./assets/themes/floral/sheer-floral-preview.jpg'), label: '花柄3' },
  // Legacy id kept for saved-data compatibility. It uses the same formal name
  // as the third floral preview and is not shown as a separate option.
  floralDark: { source: require('./assets/themes/floral/sheer-floral.jpg'), thumbnailSource: require('./assets/themes/floral/sheer-floral-preview.jpg'), label: '花柄3' },
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

function calendarEventOccurrenceKey(event: Calendar.Event) {
  const calendarId = String((event as Calendar.Event & { calendarId?: string }).calendarId ?? '');
  const start = new Date(event.startDate).toISOString();
  const end = event.endDate ? new Date(event.endDate).toISOString() : '';
  return `${calendarId}:${String(event.id)}:${start}:${end}`;
}

function normalizeCalendarTitle(value: string | undefined) {
  return (value ?? '').trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
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
        listItems: task.listItems?.map((item, index) => ({ ...item, id: `${Date.now()}-${task.id}-list-${index}-${Math.random().toString(16).slice(2)}`, order: index, checked: false })),
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
  const [analysisInitialTab, setAnalysisInitialTab] = useState<'records' | 'insights' | 'routine'>('records');
  const [currentGuideFeature, setCurrentGuideFeature] = useState<Exclude<OnboardingFeatureId, 'intro'>>();
  const [guideTransitioning, setGuideTransitioning] = useState(false);
  const [pendingGuideFeature, setPendingGuideFeature] = useState<Exclude<OnboardingFeatureId, 'intro'>>();
  const [widgetGuideVisible, setWidgetGuideVisible] = useState(false);
  const guideTransitioningRef = React.useRef(false);
  const [openTodayReview, setOpenTodayReview] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusTimerActive, setFocusTimerActive] = useState(false);
  const [voiceFocusRequest, setVoiceFocusRequest] = useState<{ durationMinutes: number; id: number }>();
  const [rewardedAccess, setRewardedAccess] = useState<RewardedAccessState>(DEFAULT_REWARDED_ACCESS_STATE);
  const [rewardedPrompt, setRewardedPrompt] = useState<{ featureId: RewardedFeatureId; title: string; description: string } | null>(null);
  const rewardedPromptCompletionRef = React.useRef<(() => void) | undefined>(undefined);
  const rewardedGenericBusyRef = React.useRef(false);
  const rewardedWishBusyRef = React.useRef(false);
  const rewardedDesignBusyRef = React.useRef(false);
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
  const persistenceTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestPersistedStateRef = React.useRef<PersistedState | undefined>(undefined);
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
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(DEFAULT_WIDGET_SETTINGS);
  const widgetPhotoSyncedUriRef = React.useRef<string | undefined>(undefined);
  const widgetAffirmationPhotoSyncedUrisRef = React.useRef<Record<number, string>>({});
  const widgetSnapshotSerializedRef = React.useRef<string | undefined>(undefined);
  const widgetSnapshotInFlightRef = React.useRef<string | undefined>(undefined);
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
  const [travelApps, setTravelApps] = useState<TravelAppSettings>(DEFAULT_TRAVEL_APP_SETTINGS);
  const [pendingTopPhoto, setPendingTopPhoto] = useState<{ target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>; originalUri: string; sourceWidth: number; sourceHeight: number; cropRect?: NormalizedCropRect }>();
  const [recoveryHistory, setRecoveryHistory] = useState<RecoveryRecord[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [focusCustomDurationMinutes, setFocusCustomDurationMinutes] = useState<number | undefined>();
  const [behaviorEvents, setBehaviorEvents] = useState<BehaviorEvent[]>([]);
  const behaviorEventsRef = React.useRef<BehaviorEvent[]>([]);
  const [routineArchives, setRoutineArchives] = useState<RoutineArchive[]>([]);
  const pendingBehaviorEventsRef = React.useRef<BehaviorEvent[]>([]);
  const pendingNotificationBehaviorActionsRef = React.useRef<Array<{ notificationInstanceId: string; action: NotificationAction; taskId?: string; actualAt: Date }>>([]);
  const pendingDepartureFollowUpsRef = React.useRef(new Set<string>());
  const pendingSharedEventPacketsRef = React.useRef<SharedEvent[]>([]);
  const pendingSharedEventTokensRef = React.useRef<string[]>([]);
  const [wishMonths, setWishMonths] = useState<WishMonthMap>({});
  const [calendarMarks, setCalendarMarks] = useState<CalendarMarks>({});
  const [calendarImportCalendarIds, setCalendarImportCalendarIds] = useState<string[] | undefined>();
  const [calendarImportKnownCalendarIds, setCalendarImportKnownCalendarIds] = useState<string[] | undefined>();
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
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceAutoStart, setVoiceAutoStart] = useState(false);
  const handledRhythmNavigationUrlRef = React.useRef<string | undefined>(undefined);
  const [voiceUsage, setVoiceUsage] = useState<VoiceUsage>(() => ({ date: dateKey(), count: 0, rewardedCount: 0, bonusUses: 0 }));
  const [voiceUsageLimitOpen, setVoiceUsageLimitOpen] = useState(false);
  const voiceRewardBusyRef = React.useRef(false);
  const openVoiceInputRef = React.useRef<(autoStart?: boolean) => void>(() => undefined);
  const [voiceTaskDraft, setVoiceTaskDraft] = useState<VoiceParseResult>();
  const [voiceWishDraft, setVoiceWishDraft] = useState<{ mode: 'wish' | 'action'; title: string; wishId?: string }>();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [now, setNow] = useState(new Date());
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [designCustomizeOpen, setDesignCustomizeOpen] = useState(false);
  const [designCustomizePurchased, setDesignCustomizePurchased] = useState(false);
  const [premiumTargetFeature, setPremiumTargetFeature] = useState<PremiumGuideFeatureId>(DEFAULT_PREMIUM_GUIDE_FEATURE);
  const [storePremiumAccess, setStorePremiumAccess] = useState(false);
  const [storeDesignCustomizeAccess, setStoreDesignCustomizeAccess] = useState(false);
  const [designPreviewPattern, setDesignPreviewPattern] = useState<ChicPattern>();
  const [designPreviewMode, setDesignPreviewMode] = useState<DesignPreviewMode>('chic');
  const [designPreviewPhotoUri, setDesignPreviewPhotoUri] = useState<string>();
  const [captureStudioOpen, setCaptureStudioOpen] = useState(false);
  const [onboardingDesignSelectionPending, setOnboardingDesignSelectionPending] = useState(false);
  const [designTrialNoticeOpen, setDesignTrialNoticeOpen] = useState(false);
  const pendingDesignApplyRef = React.useRef<(() => void) | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const configuredPlanTier: PlanTier = process.env.EXPO_PUBLIC_RHYTHM_PLAN === 'premium' ? 'premium' : 'free';
  // Development-only override for validating both purchase states before the
  // App Store product is configured. It is intentionally session-scoped and
  // never persisted over the user's saved data.
  const [devPlanTierOverride, setDevPlanTierOverride] = useState<PlanTier | null>(null);
  const planTier: PlanTier = devPlanTierOverride ?? (configuredPlanTier === 'premium' || storePremiumAccess ? 'premium' : 'free');
  const planTierRef = React.useRef<PlanTier>(planTier);
  const handleStoreDesignEntitlement = React.useCallback((active: boolean) => {
    setStoreDesignCustomizeAccess(active);
    if (active) setDesignCustomizePurchased(true);
  }, []);
  const storeKit = useRhythmStoreKit({
    onPremiumEntitlement: setStorePremiumAccess,
    onDesignCustomizeEntitlement: handleStoreDesignEntitlement,
  });
  const hasDesignCustomizeAccess = planTier === 'premium'
    || (storeKit.designConfigured ? storeKit.entitlementsResolved && storeDesignCustomizeAccess : __DEV__ && designCustomizePurchased);
  const activeDesignTrialId = planTier !== 'premium' && (isPremiumDesignTrialActive(rewardedAccess, now) || isPremiumDesignUnlocked(rewardedAccess, now))
    ? rewardedAccess.premiumDesignTrial.designId
    : null;
  const activeDesignTrial = activeDesignTrialId && activeDesignTrialId !== 'photo' ? activeDesignTrialId as ChicPattern : null;
  const photoDesignTemporaryAccess = hasDesignCustomizeAccess || activeDesignTrialId === 'photo' || isPremiumDesignUnlocked(rewardedAccess, now);
  const photoThemeEnabled = designMode === 'photo' && (hasDesignCustomizeAccess || photoDesignTemporaryAccess || rewardedAccess.photoCustomization.backgroundUnlocked || rewardedAccess.photoCustomization.focusUnlocked || rewardedAccess.photoCustomization.topExtraSlotsUnlocked > 0);
  const uiDesignMode: Exclude<DesignMode, 'photo'> = designMode === 'photo'
    ? 'chic'
    : isMonoDesign ? resolvedMonoMode : designMode;
  const photoBackgroundUri = photoThemeEnabled && (hasDesignCustomizeAccess || photoDesignTemporaryAccess || rewardedAccess.photoCustomization.backgroundUnlocked) && photoTheme.placement !== 'top' ? photoTheme.imageUri : undefined;
  const photoTopImageUri = photoThemeEnabled && (hasDesignCustomizeAccess || photoDesignTemporaryAccess || rewardedAccess.photoCustomization.topExtraSlotsUnlocked > 0) ? photoTheme.topImageUris?.[screen] ?? photoTheme.topImageOriginalUris?.[screen] ?? (photoTheme.placement === 'top' ? photoTheme.imageUri : undefined) : undefined;
  // Wish owns the shared top visual even when the app is using Mono or Design.
  // Keep this display path independent from the Photo theme gate so a saved
  // Wish image appears immediately after crop/save without switching themes.
  const wishTopImageUri = photoTheme.topImageUris?.wish ?? photoTheme.topImageOriginalUris?.wish ?? (photoTheme.placement === 'top' ? photoTheme.imageUri : undefined);
  const focusBackgroundUri = photoThemeEnabled && (hasDesignCustomizeAccess || photoDesignTemporaryAccess || rewardedAccess.photoCustomization.focusUnlocked) ? photoTheme.focusBackgroundUri : undefined;
  // A temporary trial is an explicit, time-bounded override. Persisted free
  // users still fall back to plain when no trial is active.
  const effectiveChicPattern = (activeDesignTrial ?? getEffectiveChicPattern(planTier, chicPattern, designCustomizePurchased)) as ChicPattern;
  // Keep decorative pattern and UI color independent. Floral/check/dot
  // backgrounds are selected by `chicPattern`; all Design UI surfaces use the
  // chosen `chicCheckColor` tokens.
  const chicPalette = getDesignCheckThemeTokens(chicCheckColor);
  const getThemedThemeTokens = React.useCallback((mode: DesignMode) => getThemeTokens(mode, mode === 'chic' ? chicPalette.id : chicCheckColor), [chicCheckColor, chicPalette]);
  // Design uses one palette for every surface. Keep the legacy color shape for
  // components that still consume the shared app colors object.
  const themedColors = useMemo(() => {
    const tokens = getThemeTokens(uiDesignMode, uiDesignMode === 'chic' ? chicPalette.id : chicCheckColor).colors;
    return {
      ...colors,
      background: tokens.screenBackground,
      surface: tokens.surface,
      ink: tokens.primaryText,
      muted: tokens.secondaryText,
      violet: tokens.primaryAccent,
      violetSoft: tokens.softAccent,
      coral: tokens.danger,
      coralSoft: tokens.softAccent,
      mint: tokens.success,
      line: tokens.border,
    };
  }, [chicCheckColor, chicPalette.id, uiDesignMode]);
  const currentWishMonthKey = wishMonthKey(now);
  const getRewardedPromptProgress = React.useCallback((featureId: RewardedFeatureId) => {
    const required = getRequiredAds(featureId);
    if (featureId === 'wishMonthlyGoal') return { current: rewardedAccess.wishMonthlyGoal.monthKey === currentWishMonthKey ? rewardedAccess.wishMonthlyGoal.progress : 0, required };
    if (featureId === 'wishCreate') return { current: rewardedAccess.wishCreateProgress, required };
    if (featureId === 'routineSkipBonus') return { current: rewardedAccess.routine.skipBonusProgress, required };
    return { current: 0, required };
  }, [currentWishMonthKey, rewardedAccess]);

  const grantRewarded = React.useCallback(async (featureId: RewardedFeatureId): Promise<RewardedAccessResult> => {
    if (planTier === 'premium') return { success: true, completed: true };
    if (featureId === 'wishMonthlyGoal' && isWishMonthlyGoalUnlocked(rewardedAccess, new Date())) return { success: true, completed: true };
    if (featureId === 'routineSkipBonus' && rewardedAccess.routine.skipBonusAdded >= 2) return { success: true, completed: true, message: 'Skip Bonusは最大まで取得済みです。' };
    if (featureId === 'photoTop' && rewardedAccess.photoCustomization.topExtraSlotsUnlocked >= 5) return { success: true, completed: true, message: '写真枠は最大まで解放済みです。' };
    if (rewardedGenericBusyRef.current) return { success: false, message: '広告を準備しています…' };
    rewardedGenericBusyRef.current = true;
    try {
      let showTestRewardedAd: typeof import('./services/rewardedAds').showTestRewardedAd;
      try {
        ({ showTestRewardedAd } = require('./services/rewardedAds') as typeof import('./services/rewardedAds'));
      } catch {
        return { success: false, message: '広告の確認にはDevelopment Buildが必要です。' };
      }
      const earned = await showTestRewardedAd().catch(() => false);
      if (!earned) return { success: false, message: '広告を読み込めませんでした。もう一度お試しください。' };
      const required = getRequiredAds(featureId);
      const base = rewardedAccess;
      let next: RewardedAccessState = base;
      let completed = true;
      if (featureId === 'wishMonthlyGoal') {
        const progress = base.wishMonthlyGoal.monthKey === currentWishMonthKey ? base.wishMonthlyGoal.progress : 0;
        const nextProgress = Math.min(required, progress + 1);
        next = { ...base, wishMonthlyGoal: { progress: nextProgress, monthKey: currentWishMonthKey, unlockedUntil: nextProgress >= required ? endOfCalendarMonth(new Date()) : null } };
        completed = nextProgress >= required;
      } else if (featureId === 'wishCreate') {
        const progress = Math.min(required, base.wishCreateProgress + 1);
        next = { ...base, wishCreateProgress: progress };
        completed = progress >= required;
      } else if (featureId === 'premiumDesign' || featureId === 'premiumDesignTrialExpired') {
        next = { ...base, premiumDesign: { unlockedUntil: addHours(new Date(), 12) } };
      } else if (featureId === 'calendarImport') {
        next = { ...base, calendarImportCredits: base.calendarImportCredits + 1 };
      } else if (featureId === 'photoTop') {
        next = { ...base, photoCustomization: { ...base.photoCustomization, topExtraSlotsUnlocked: Math.min(5, base.photoCustomization.topExtraSlotsUnlocked + 1) } };
      } else if (featureId === 'photoBackground') {
        next = { ...base, photoCustomization: { ...base.photoCustomization, backgroundUnlocked: true } };
      } else if (featureId === 'photoFocus') {
        next = { ...base, photoCustomization: { ...base.photoCustomization, focusUnlocked: true } };
      } else if (featureId === 'routineSkip') {
        next = { ...base, routine: { ...base.routine, skipStock: base.routine.skipStock + 1 } };
      } else if (featureId === 'routineSkipBonus') {
        const progress = Math.min(required, base.routine.skipBonusProgress + 1);
        const reached = progress >= required;
        next = { ...base, routine: { ...base.routine, skipBonusProgress: reached ? 0 : progress, skipBonusAdded: reached ? Math.min(2, base.routine.skipBonusAdded + 1) : base.routine.skipBonusAdded, skipStock: reached ? base.routine.skipStock + (base.routine.skipBonusAdded < 2 ? 1 : 0) : base.routine.skipStock } };
        completed = reached;
      }
      setRewardedAccess(next);
      await saveRewardedAccessState(next);
      const nextProgress = getRewardedPromptProgress(featureId).current + 1;
      return { success: true, completed, message: completed ? '取得しました' : `広告を1回確認しました。あと${Math.max(0, required - nextProgress)}回です。` };
    } finally {
      rewardedGenericBusyRef.current = false;
    }
  }, [currentWishMonthKey, getRewardedPromptProgress, planTier, rewardedAccess]);

  const openRewardedPrompt = React.useCallback((featureId: RewardedFeatureId, title: string, description: string, onCompleted?: () => void) => {
    if (planTier === 'premium') {
      onCompleted?.();
      return;
    }
    rewardedPromptCompletionRef.current = onCompleted;
    setRewardedPrompt({ featureId, title, description });
  }, [planTier]);

  const handleRewardedPromptReward = React.useCallback(async () => {
    if (!rewardedPrompt) return { success: false, message: '広告を利用できません。' };
    const result = await grantRewarded(rewardedPrompt.featureId);
    if (result.completed) {
      const continuation = rewardedPromptCompletionRef.current;
      rewardedPromptCompletionRef.current = undefined;
      continuation?.();
    }
    return result;
  }, [grantRewarded, rewardedPrompt]);
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
  const requestMonthlyGoalReward = React.useCallback(() => grantRewarded('wishMonthlyGoal'), [grantRewarded]);
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
      const photos = [...new Set([...(draft.photos ?? []), draft.photo ?? ''].filter(Boolean))];
      const nextReview: MonthlyReview = { ...draft, id: draft.id ?? `journal-${draft.date ?? Date.now()}`, photo: photos[0] ?? '', photos };
      const existingIndex = reviews.findIndex((review) => review.id === nextReview.id || review.date === nextReview.date);
      const nextReviews = existingIndex >= 0 ? reviews.map((review, index) => index === existingIndex ? { ...review, ...nextReview } : review) : [...reviews, nextReview];
      return { ...current, [monthKey]: { ...monthState, review: {}, reviews: nextReviews } };
    });
    if (planTier === 'premium' && [...(draft.photos ?? []), draft.photo ?? ''].some(Boolean)) void onboarding.complete('photoLog');
  }, [onboarding, planTier]);
  const saveMonthlyReflectionCard = React.useCallback((monthKey: string, card: MonthlyReflectionCard) => {
    setWishMonths((current) => {
      const monthState = getMonthlyWishState(current, monthKey);
      return { ...current, [monthKey]: { ...monthState, reflectionCard: card } };
    });
  }, []);
  const openPremiumFeature = React.useCallback((featureId: PremiumGuideFeatureId = DEFAULT_PREMIUM_GUIDE_FEATURE) => {
    setPremiumTargetFeature(featureId);
    setPremiumOpen(true);
  }, []);
  const openVoiceInput = React.useCallback((autoStart = false) => {
    // The demo and previews never consume a user's allowance.
    if (planTier === 'premium' || onboarding.state.firstRunStage === 'demo') {
      setVoiceAutoStart(autoStart);
      setVoiceOpen(true);
      return;
    }
    const current = normalizeVoiceUsage(voiceUsage, dateKey());
    if (remainingVoiceUses(current, dateKey()) <= 0) {
      setVoiceUsageLimitOpen(true);
      return;
    }
    setVoiceUsage(current);
    setVoiceAutoStart(autoStart);
    setVoiceOpen(true);
  }, [onboarding.state.firstRunStage, planTier, voiceUsage]);
  openVoiceInputRef.current = openVoiceInput;
  const consumeVoiceInput = React.useCallback(() => {
    if (planTier === 'premium' || onboarding.state.firstRunStage === 'demo') return;
    setVoiceUsage((current) => consumeVoiceUsage(current, dateKey()));
  }, [onboarding.state.firstRunStage, planTier]);
  const grantVoiceReward = React.useCallback(async (): Promise<boolean> => {
    if (planTier === 'premium' || voiceRewardBusyRef.current) return false;
    const current = normalizeVoiceUsage(voiceUsage, dateKey());
    if (remainingVoiceRewards(current, dateKey()) <= 0) return false;
    voiceRewardBusyRef.current = true;
    try {
      let showTestRewardedAd: typeof import('./services/rewardedAds').showTestRewardedAd;
      try {
        ({ showTestRewardedAd } = require('./services/rewardedAds') as typeof import('./services/rewardedAds'));
      } catch {
        return false;
      }
      const earned = await showTestRewardedAd().catch(() => false);
      if (!earned) return false;
      setVoiceUsage((value) => grantVoiceUsageReward(value, dateKey()));
      return true;
    } finally {
      voiceRewardBusyRef.current = false;
    }
  }, [planTier, voiceUsage]);
  // Development plan switches are session-only test controls. Close the
  // Premium sheet before changing the plan so its transparent Modal/backdrop
  // cannot remain mounted over the production app after the override rerender.
  const handleMockPlanTier = React.useCallback((tier: PlanTier | null) => {
    setPremiumOpen(false);
    setDevPlanTierOverride(tier);
  }, []);
  const purchaseDesignCustomize = React.useCallback(async () => {
    if (storeKit.designConfigured) {
      const success = await storeKit.purchaseDesignCustomize();
      if (success) setDesignCustomizePurchased(true);
      else if (storeKit.errorMessage) Alert.alert('購入を完了できませんでした', storeKit.errorMessage);
      return;
    }
    if (!__DEV__) {
      Alert.alert('購入機能は準備中です', 'App Storeの商品情報を確認できません。');
      return;
    }
    Alert.alert('開発用購入確認', 'Design Customizeを購入済みにしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '購入成功', onPress: () => setDesignCustomizePurchased(true) },
    ]);
  }, [storeKit]);
  const restoreDesignCustomizePurchase = React.useCallback(async () => {
    if (storeKit.designConfigured) {
      const restored = await storeKit.restore();
      if (restored.designCustomize) {
        setDesignCustomizePurchased(true);
        Alert.alert('購入を復元しました', 'Design Customizeを利用できます。');
      } else if (storeKit.errorMessage) {
        Alert.alert('購入を復元できませんでした', storeKit.errorMessage);
      } else {
        Alert.alert('復元できる購入はありません', '同じApple IDで購入した履歴が見つかりませんでした。');
      }
      return;
    }
    if (!__DEV__) {
      Alert.alert('購入の復元は準備中です', 'App Storeの商品情報を確認できません。');
      return;
    }
    if (designCustomizePurchased) {
      Alert.alert('購入を復元しました', 'Design Customizeを利用できます。');
      return;
    }
    Alert.alert('復元できる購入はありません', 'App Store接続後に購入履歴を確認できます。');
  }, [designCustomizePurchased, storeKit]);
  const restorePremiumPurchase = React.useCallback(async () => {
    if (!storeKit.configured) {
      Alert.alert('購入の復元は準備中です', 'App Storeの商品情報を確認できません。');
      return;
    }
    const restored = await storeKit.restore();
    if (restored.premium) Alert.alert('購入を復元しました', 'Premiumを利用できます。');
    else if (storeKit.errorMessage) Alert.alert('購入を復元できませんでした', storeKit.errorMessage);
    else Alert.alert('復元できる購入はありません', '同じApple IDで購入した履歴が見つかりませんでした。');
  }, [storeKit]);
  const markDesignNoticeSeen = React.useCallback((expiry: string) => {
    if (rewardedAccess.premiumDesignNoticeSeenFor === expiry) return;
    const next = { ...rewardedAccess, premiumDesignNoticeSeenFor: expiry };
    setRewardedAccess(next);
    void saveRewardedAccessState(next);
  }, [rewardedAccess]);
  useEffect(() => {
    if (planTier === 'premium' || designCustomizePurchased || isPremiumDesignUnlocked(rewardedAccess, now) || isPremiumDesignTrialActive(rewardedAccess, now)) return;
    const trialExpiry = rewardedAccess.premiumDesignTrial.used ? rewardedAccess.premiumDesignTrial.expiresAt : null;
    const unlockedExpiry = rewardedAccess.premiumDesign.unlockedUntil;
    const expiredCandidates = [trialExpiry, unlockedExpiry].reduce<string[]>((result, value) => {
      if (value) {
        const timestamp = new Date(value).getTime();
        if (!Number.isNaN(timestamp) && timestamp <= now.getTime()) result.push(value);
      }
      return result;
    }, []);
    const expiry = expiredCandidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
    if (!expiry || rewardedAccess.premiumDesignNoticeSeenFor === expiry) return;
    const trialDesignId = trialExpiry === expiry ? rewardedAccess.premiumDesignTrial.designId : null;
    const isSelectedExpiredDesign = trialDesignId === 'photo'
      ? designMode === 'photo'
      : trialDesignId
        ? designMode === 'chic' && chicPattern === trialDesignId
        : designMode === 'photo' || (designMode === 'chic' && chicPattern !== 'plain');
    if (!isSelectedExpiredDesign || designTrialNoticeOpen) return;
    pendingDesignApplyRef.current = undefined;
    markDesignNoticeSeen(expiry);
    setDesignTrialNoticeOpen(true);
  }, [chicPattern, designCustomizePurchased, designMode, designTrialNoticeOpen, isPremiumDesignUnlocked, markDesignNoticeSeen, now, planTier, rewardedAccess]);
  const startDesignTrial = React.useCallback((pattern: ChicPattern) => {
    if (hasDesignCustomizeAccess) {
      setDesignMode('chic');
      setChicPattern(pattern);
      setDesignPreviewPattern(undefined);
      if (!onboardingDesignSelectionPending) void onboarding.complete('design');
      return;
    }
    if (isPremiumDesignTrialActive(rewardedAccess, now) || isPremiumDesignUnlocked(rewardedAccess, now)) {
      setDesignMode('chic');
      setChicPattern(pattern);
      setDesignPreviewPattern(undefined);
      if (!onboardingDesignSelectionPending) void onboarding.complete('design');
      return;
    }
    if (!canStartPremiumDesignTrial(rewardedAccess)) {
      setDesignTrialNoticeOpen(true);
      setDesignPreviewPattern(undefined);
      return;
    }
    const next: RewardedAccessState = { ...rewardedAccess, premiumDesignTrial: { used: true, designId: pattern, expiresAt: addHours(new Date(), 24) } };
    setRewardedAccess(next);
    void saveRewardedAccessState(next);
    setDesignMode('chic');
    setDesignPreviewPattern(undefined);
    if (!onboardingDesignSelectionPending) void onboarding.complete('design');
  }, [hasDesignCustomizeAccess, now, onboarding, onboardingDesignSelectionPending, planTier, rewardedAccess]);
  const requestDesignReward = React.useCallback(async () => {
    if (planTier === 'premium' || rewardedAccess.premiumDesignTrial.designId == null) return false;
    if (rewardedDesignBusyRef.current) return false;
    rewardedDesignBusyRef.current = true;
    try {
      let showTestRewardedAd: typeof import('./services/rewardedAds').showTestRewardedAd;
      try {
        ({ showTestRewardedAd } = require('./services/rewardedAds') as typeof import('./services/rewardedAds'));
      } catch {
        Alert.alert('広告を利用できません', '広告の確認にはDevelopment Buildが必要です。');
        return false;
      }
      const earned = await showTestRewardedAd().catch(() => false);
      if (!earned) {
        Alert.alert('広告を完了できませんでした', '報酬を受け取れなかったため、デザインは解放されていません。');
        return false;
      }
      const next: RewardedAccessState = { ...rewardedAccess, premiumDesign: { unlockedUntil: addHours(new Date(), 12) } };
      setRewardedAccess(next);
      await saveRewardedAccessState(next);
      setDesignTrialNoticeOpen(false);
      const continuation = pendingDesignApplyRef.current;
      pendingDesignApplyRef.current = undefined;
      continuation?.();
      return true;
    } catch {
      Alert.alert('広告を利用できません', '広告の確認にはDevelopment Buildが必要です。');
      return false;
    } finally {
      rewardedDesignBusyRef.current = false;
    }
  }, [planTier, rewardedAccess]);
  const openWish = React.useCallback(() => {
    setScreen('wish');
  }, []);
  const completeInitialDesignSelection = React.useCallback(() => {
    if (!onboardingDesignSelectionPending) return;
    setOnboardingDesignSelectionPending(false);
    setScreen('home');
    if (onboarding.state.firstRunStage === 'design') {
      void onboarding.complete('design').then(() => onboarding.setFirstRunStage('done'));
    }
  }, [onboarding, onboardingDesignSelectionPending]);
  const requestWishReward = React.useCallback(async () => {
    if (hasPremiumAccess(planTier, 'wish_planning')) return { success: true, completed: true } as RewardedAccessResult;
    if (canCreateWish(rewardedAccess)) return { success: true, completed: true } as RewardedAccessResult;
    if (rewardedWishBusyRef.current) return { success: false, message: '広告を準備しています…' } as RewardedAccessResult;
    rewardedWishBusyRef.current = true;
    try {
      const result = await grantRewarded('wishCreate');
      return result;
    } finally {
      rewardedWishBusyRef.current = false;
    }
  }, [grantRewarded, planTier, rewardedAccess]);
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
    if (!existing && affirmations.length >= MAX_AFFIRMATIONS) {
      Alert.alert(`アファメーションは最大${MAX_AFFIRMATIONS}件までです`, '不要な通知を削除してから追加してください。');
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
    if (planTier !== 'premium') {
      openPremiumFeature('affirmation');
      return;
    }
    setAffirmationCustomTexts((current) => current.some((item) => item.id === draft.id) ? current.map((item) => item.id === draft.id ? draft : item) : [draft, ...current]);
    void onboarding.complete('affirmation');
  }, [onboarding, openPremiumFeature, planTier]);
  const deleteAffirmationCustomText = React.useCallback((id: string) => {
    setAffirmationCustomTexts((current) => current.filter((item) => item.id !== id));
  }, []);
  const deleteAffirmation = React.useCallback(async (affirmation: Affirmation) => {
    await Notifications.cancelScheduledNotificationAsync(affirmation.notificationId ?? `affirmation:${affirmation.id}`).catch(() => undefined);
    setAffirmations((current) => current.filter((item) => item.id !== affirmation.id));
  }, []);
  const pickPhotoForDesignPreview = React.useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('写真へのアクセスが必要です', '許可すると写真デザインを試着できます。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.85 });
    const selectedUri = result.canceled ? undefined : result.assets[0]?.uri;
    if (selectedUri) setDesignPreviewPhotoUri(selectedUri);
  }, []);

  const pickWidgetPhoto = React.useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('写真へのアクセスが必要です', '許可するとWidgetに写真を表示できます。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8 });
    const selectedUri = result.canceled ? undefined : result.assets[0]?.uri;
    if (!selectedUri) return;
    try {
      // Keep the App Group payload small and use a stable JPEG format that
      // WidgetKit can decode even when the source is HEIC or a cloud asset.
      const compressed = await ImageManipulator.manipulateAsync(
        selectedUri,
        [{ resize: { width: 1200 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
      );
      const persistentUri = persistPhotoUri(compressed.uri, 'widget-photo');
      setWidgetSettings((current) => {
        deleteManagedPhotoUri(current.photoUri, [persistentUri, ...(current.affirmationPhotoUris ?? [])]);
        return { ...current, photoUri: persistentUri, style: 'photo', affirmationPhotoUris: [...(current.affirmationPhotoUris ?? []).filter((uri) => uri !== persistentUri), persistentUri].slice(0, 3) };
      });
    } catch (error) {
      console.warn('Could not persist selected Widget photo.', error);
      Alert.alert('写真を保存できませんでした', 'もう一度選び直してください。');
    }
  }, []);
  const applyPhotoDesign = React.useCallback(() => {
    if (!designPreviewPhotoUri) {
      Alert.alert('写真を選択してください', '写真で試すから画像を選んでください。');
      return;
    }
    try {
      const persistentUri = persistPhotoUri(designPreviewPhotoUri, 'design-background');
      setPhotoTheme((current) => {
        deleteManagedPhotoUri(current.imageUri, [persistentUri, current.focusBackgroundUri, ...Object.values(current.topImageUris ?? {}), ...Object.values(current.topImageOriginalUris ?? {})]);
        return { ...current, placement: 'background', imageUri: persistentUri };
      });
      setDesignMode('photo');
      setDesignPreviewPattern(undefined);
      setDesignPreviewPhotoUri(undefined);
      if (!onboardingDesignSelectionPending) void onboarding.complete('design');
    } catch {
      Alert.alert('写真を保存できませんでした', 'もう一度選び直してください。');
    }
  }, [designPreviewPhotoUri, onboarding, onboardingDesignSelectionPending]);
  const startPhotoDesignTrial = React.useCallback(() => {
    if (!designPreviewPhotoUri) return;
    const next: RewardedAccessState = { ...rewardedAccess, premiumDesignTrial: { used: true, designId: 'photo', expiresAt: addHours(new Date(), 24) } };
    setRewardedAccess(next);
    void saveRewardedAccessState(next);
    applyPhotoDesign();
  }, [applyPhotoDesign, designPreviewPhotoUri, rewardedAccess]);
  const pickPhotoTheme = React.useCallback(async (target: PhotoThemePhotoTarget, options?: { bypassRewarded?: boolean }) => {
    if (planTier !== 'premium' && !designCustomizePurchased) {
      if (target === 'background' && !rewardedAccess.photoCustomization.backgroundUnlocked) {
        openRewardedPrompt('photoBackground', '背景に写真を使う', '広告を見ると、好きな写真をRhythmの背景に設定できます。', () => { void pickPhotoTheme(target); });
        return;
      }
      if (target === 'focus' && !rewardedAccess.photoCustomization.focusUnlocked) {
        openRewardedPrompt('photoFocus', '集中画面に写真を使う', '広告を見ると、集中タイムの背景に好きな写真を設定できます。', () => { void pickPhotoTheme(target); });
        return;
      }
      if (target !== 'background' && target !== 'focus') {
        const currentUri = photoTheme.topImageUris?.[target] ?? photoTheme.topImageOriginalUris?.[target];
        // The first Wish top image is a Rewarded-gated action for Free users.
        // Existing images remain editable under the same access rules as the
        // legacy top-image flow.
        if (!options?.bypassRewarded && target === 'wish' && !currentUri && rewardedAccess.photoCustomization.topExtraSlotsUnlocked < 1) {
          openRewardedPrompt('photoTop', 'トップ画像を設定', '広告を見ると、Wishのトップ画像を1枚設定できます。', () => { void pickPhotoTheme(target, { bypassRewarded: true }); });
          return;
        }
        const usedSlots = Object.values(photoTheme.topImageUris ?? {}).filter(Boolean).length;
        const allowedSlots = Math.min(5, 1 + rewardedAccess.photoCustomization.topExtraSlotsUnlocked);
        if (!options?.bypassRewarded && !currentUri && usedSlots >= allowedSlots) {
          openRewardedPrompt('photoTop', '写真枠を追加', '広告を見ると、画面ごとのトップ写真枠を1つ追加できます。', () => { void pickPhotoTheme(target, { bypassRewarded: true }); });
          return;
        }
      }
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
  }, [designCustomizePurchased, openRewardedPrompt, photoTheme, planTier, rewardedAccess]);

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

  const handleRhythmNavigationLink = React.useCallback((url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'rhythm:') return false;
      if (parsed.hostname === 'todo') {
        setScreen('home');
        return true;
      }
      if (parsed.hostname === 'schedule') {
        setTimelineInitialTab('departure');
        setScreen('timeline');
        return true;
      }
      if (parsed.hostname === 'voice') {
        openVoiceInputRef.current(true);
        return true;
      }
      if (parsed.hostname === 'affirmation') {
        setScreen('settings');
        return true;
      }
      if (parsed.hostname === 'premium') {
        openPremiumFeature('widget');
        return true;
      }
      if (parsed.hostname === 'design') {
        setDesignCustomizeOpen(true);
        return true;
      }
    } catch {
      // A malformed external URL should not block the existing share handler.
    }
    return false;
  }, [openPremiumFeature]);

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

  const completeTaskIds = React.useCallback((ids: string[], source: 'manual' | 'notification' = 'manual'): boolean => {
    const previousTasks = tasksRef.current;
    const result = completeTasksAndCollectEvents(tasksRef.current, ids);
    if (result.tasks === tasksRef.current) return false;
    tasksRef.current = result.tasks;
    setTasks(result.tasks);
    if (result.newlyCompleted.length === 0) return false;
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
    return true;
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

  const applySkipTaskById = React.useCallback((taskId: string, onApplied?: () => void) => {
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
        onApplied?.();
      } },
    ]);
  }, []);
  const skipTaskById = React.useCallback((taskId: string) => {
    const target = tasksRef.current.find((task) => task.id === taskId);
    if (!target || !target.isRoutine) return;
    if (planTier === 'premium') {
      applySkipTaskById(taskId);
      return;
    }
    if (rewardedAccess.routine.skipStock > 0) {
      applySkipTaskById(taskId, () => {
        const next = { ...rewardedAccess, routine: { ...rewardedAccess.routine, skipStock: Math.max(0, rewardedAccess.routine.skipStock - 1) } };
        setRewardedAccess(next);
        void saveRewardedAccessState(next);
      });
      return;
    }
    openRewardedPrompt('routineSkip', '今日はスキップする', '広告を見ると、今日をスキップしてもルーティンの連続記録を維持できます。', () => {
      applySkipTaskById(taskId, () => {
        const next = { ...rewardedAccess, routine: { ...rewardedAccess.routine, skipStock: Math.max(0, rewardedAccess.routine.skipStock - 1) } };
        setRewardedAccess(next);
        void saveRewardedAccessState(next);
      });
    });
  }, [applySkipTaskById, openRewardedPrompt, planTier, rewardedAccess]);

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
        setWidgetSettings(normalizeWidgetSettings(saved.widgetSettings));
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
        setVoiceUsage(normalizeVoiceUsage(saved.voiceUsage, dateKey()));
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
        setTravelApps(normalizeTravelAppSettings(saved.travelApps));
        setDesignCustomizePurchased(saved.designCustomizePurchased === true);
        setRecoveryHistory(saved.recoveryHistory ?? []);
        setFocusSessions(saved.focusSessions ?? []);
        if (typeof saved.focusCustomDurationMinutes === 'number' && Number.isSafeInteger(saved.focusCustomDurationMinutes) && saved.focusCustomDurationMinutes > 0) {
          setFocusCustomDurationMinutes(saved.focusCustomDurationMinutes);
        }
        // Build the compatibility lookup once while hydrating. Older events
        // may not have routineId, but resolving them with repeated array
        // scans made cold start cost grow quadratically with task history.
        const taskById = new Map(loadedTasks.map((task) => [task.id, task]));
        const routineTaskByTitle = new Map<string, Task>();
        loadedTasks.forEach((task) => {
          if (task.routineId && !routineTaskByTitle.has(task.title.trim())) routineTaskByTitle.set(task.title.trim(), task);
        });
        const loadedBehaviorEvents = (saved.behaviorEvents ?? []).map((event) => {
          if ((event.type !== 'task_completed' && event.type !== 'task_completion_reverted') || event.routineId) return event;
          const matchedTask = (event.taskId ? taskById.get(event.taskId) : undefined)
            ?? (event.taskTitleSnapshot ? routineTaskByTitle.get(event.taskTitleSnapshot.trim()) : undefined);
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
        const storedRoutineArchives = pruneRoutineArchives(saved.routineArchives ?? []);
        const storedArchiveIds = new Set(storedRoutineArchives.map((item) => item.routineId));
        const legacyRoutineArchives: RoutineArchive[] = saved.routineArchives === undefined
          ? getRoutineHistories(loadedBehaviorEvents, loadedTasks)
            .filter((routine) => !routine.active && routine.endedAt && !storedArchiveIds.has(routine.id))
            .map((routine) => {
              const representative = loadedTasks.find((task) => (task.routineId ?? task.id) === routine.id);
              const summary = buildRoutineInterruptionSummary(loadedBehaviorEvents, loadedTasks, routine);
              return {
                id: `routine-archive:${routine.id}:${routine.endedAt}`,
                routineId: routine.id,
                title: routine.title,
                removedAt: routine.endedAt!,
                streakDays: summary.longestStreak,
                totalCompletedDays: summary.totalCompletedDays,
                taskTemplate: representative,
              };
            })
          : [];
        setRoutineArchives([...storedRoutineArchives, ...legacyRoutineArchives]);
        if (saved.taskTemplates) setTaskTemplates(saved.taskTemplates);
        setSavedTaskTemplates(saved.savedTaskTemplates ?? []);
        setWishMonths(saved.wishMonths ?? {});
        setCalendarMarks(saved.calendarMarks ?? {});
        setCalendarImportCalendarIds(saved.calendarImportCalendarIds);
        setCalendarImportKnownCalendarIds(saved.calendarImportKnownCalendarIds);
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
    const state: PersistedState = { tasks, plan, departurePlans, widgetSize, widgetSettings, showCompleted, completionIcon, designMode, monoAppearance, hapticsEnabled, reviewPromptedAt, taskTemplates, savedTaskTemplates, chicPattern, chicCheckColor, recoveryHistory, focusSessions, focusCustomDurationMinutes, departureCheckIns, behaviorEvents, wishMonths: normalizeWishMonthsForSave(wishMonths), calendarMarks, calendarImportCalendarIds, calendarImportKnownCalendarIds, sharedEvents, sharedParticipantIdsByToken, sharedParticipantPrefsByToken, departurePreparationStatuses, affirmations, affirmationCustomTexts, photoTheme, travelApps, designCustomizePurchased, routineArchives: pruneRoutineArchives(routineArchives), voiceUsage: normalizeVoiceUsage(voiceUsage, dateKey()) };
    latestPersistedStateRef.current = state;
    if (persistenceDisabledRef.current) return;
    if (persistenceTimerRef.current) clearTimeout(persistenceTimerRef.current);
    persistenceTimerRef.current = setTimeout(() => {
      void saveRhythmState(state).catch((error) => {
        console.warn('Rhythm state save failed.', error);
        if (!saveFailureNotifiedRef.current) {
          saveFailureNotifiedRef.current = true;
          Alert.alert('保存できませんでした', '空き容量や端末の設定を確認して、もう一度お試しください。');
        }
      });
    }, 80);
    return () => {
      if (persistenceTimerRef.current) clearTimeout(persistenceTimerRef.current);
    };
  }, [tasks, plan, departurePlans, widgetSize, widgetSettings, showCompleted, completionIcon, designMode, monoAppearance, hapticsEnabled, reviewPromptedAt, taskTemplates, savedTaskTemplates, chicPattern, chicCheckColor, recoveryHistory, focusSessions, focusCustomDurationMinutes, departureCheckIns, behaviorEvents, wishMonths, calendarMarks, calendarImportCalendarIds, calendarImportKnownCalendarIds, sharedEvents, sharedParticipantIdsByToken, sharedParticipantPrefsByToken, departurePreparationStatuses, affirmations, affirmationCustomTexts, photoTheme, travelApps, designCustomizePurchased, routineArchives, voiceUsage, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'inactive' && nextState !== 'background') return;
      if (persistenceTimerRef.current) {
        clearTimeout(persistenceTimerRef.current);
        persistenceTimerRef.current = undefined;
      }
      const pending = latestPersistedStateRef.current;
      if (pending && !persistenceDisabledRef.current) {
        void saveRhythmState(pending).catch((error) => console.warn('Rhythm background save failed.', error));
      }
    });
    return () => subscription.remove();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const cleanup = () => setRoutineArchives((current) => {
      const next = pruneRoutineArchives(current);
      return next.length === current.length ? current : next;
    });
    cleanup();
    const timer = setInterval(cleanup, 60_000);
    return () => clearInterval(timer);
  }, [hydrated]);

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
    const openFromUrl = (url: string) => {
      // iOS may deliver the cold-start URL and the runtime event for the same
      // tap. Ignore that duplicate so voice input cannot start twice.
      if (handledRhythmNavigationUrlRef.current === url) return;
      handledRhythmNavigationUrlRef.current = url;
      setTimeout(() => { if (handledRhythmNavigationUrlRef.current === url) handledRhythmNavigationUrlRef.current = undefined; }, 1000);
      if (!handleRhythmNavigationLink(url)) handleSharedEventLink(url);
    };
    Linking.getInitialURL().then((url) => {
      if (url) openFromUrl(url);
    }).catch(() => undefined);
    const subscription = Linking.addEventListener('url', ({ url }) => openFromUrl(url));
    return () => subscription.remove();
  }, [handleRhythmNavigationLink, handleSharedEventLink]);

  const nextDeparturePlan = useMemo(() => [...departurePlans]
    .filter((item) => {
      const mode = getDeparturePlanMode(item);
      const canShowCountdown = mode === 'departure_reminder'
        || (mode === 'arrival_reverse' && hasPremiumAccess(planTier, 'late_recovery'));
      return canShowCountdown && getPlanCountdownAt(item).getTime() > now.getTime();
    })
    .sort((a, b) => getPlanCountdownAt(a).getTime() - getPlanCountdownAt(b).getTime())[0], [departurePlans, now, planTier]);

  const syncRhythmWidgetSnapshot = React.useCallback(async () => {
    // The first-run tour is deliberately read-only; its temporary data must
    // never escape to the user's home-screen widget.
    if (!hydrated || onboarding.state.firstRunStage === 'demo') return;
    const selectedPhotoUri = widgetSettings.style === 'photo'
      ? widgetSettings.photoSource === 'widget' ? widgetSettings.photoUri : wishTopImageUri
      : undefined;
    let photoFileName: string | undefined;
    let photoWasCopied = false;
    if (selectedPhotoUri) {
      if (widgetPhotoSyncedUriRef.current !== selectedPhotoUri) {
        const copied = await saveRhythmWidgetPhoto(selectedPhotoUri).catch(() => false);
        if (copied) {
          widgetPhotoSyncedUriRef.current = selectedPhotoUri;
          photoWasCopied = true;
        }
      }
      if (widgetPhotoSyncedUriRef.current === selectedPhotoUri) photoFileName = 'rhythm-widget-photo.jpg';
    }
    const affirmationPhotoUris = (widgetSettings.affirmationPhotoUris ?? []).slice(0, 3);
    const affirmationPhotoFileNames: string[] = [];
    for (let index = 0; index < affirmationPhotoUris.length; index += 1) {
      const slot = index + 1;
      const uri = affirmationPhotoUris[index]!;
      let copied = widgetAffirmationPhotoSyncedUrisRef.current[slot] === uri;
      if (!copied) copied = await saveRhythmAffirmationPhoto(uri, slot).catch(() => false);
      if (copied) {
        affirmationPhotoFileNames.push(`rhythm-affirmation-photo-${slot}.jpg`);
        if (widgetAffirmationPhotoSyncedUrisRef.current[slot] !== uri) photoWasCopied = true;
        widgetAffirmationPhotoSyncedUrisRef.current[slot] = uri;
      }
    }
    Object.keys(widgetAffirmationPhotoSyncedUrisRef.current).forEach((slotKey) => {
      if (!affirmationPhotoUris[Number(slotKey) - 1]) delete widgetAffirmationPhotoSyncedUrisRef.current[Number(slotKey)];
    });
    const snapshot = buildRhythmWidgetSnapshot({
      tasks,
      departurePlans,
      departureCheckIns,
      canShowArrivalReverseCountdown: hasPremiumAccess(planTier, 'late_recovery'),
      isPremium: planTier === 'premium',
      designCustomizePurchased: hasDesignCustomizeAccess,
      appearance: {
        style: widgetSettings.style,
        accentHex: getWidgetAccentHex(widgetSettings.accentColor),
        // Keep the existing Design selection available to each widget's
        // IntentConfiguration even when the app's current screen mode is
        // Mono or Photo. The native widget still gates patterns using this
        // persisted entitlement flag; carrying the values does not unlock
        // Design for users who do not own it.
        designPattern: effectiveChicPattern,
        designCheckColor: chicCheckColor,
        designPatternUnlocked: hasDesignCustomizeAccess,
        affirmationBackgrounds: widgetSettings.affirmationBackgrounds,
        ...(photoFileName ? { photoFileName, photoLayout: widgetSettings.photoLayout } : {}),
      },
      displayOptions: widgetSettings.displayOptions,
      wishMonths,
      affirmations,
      affirmationCustomTexts,
      // Photo bytes stay in the App Group file container; snapshots carry
      // bounded filenames only. Dedicated affirmation photo management can
      // add these slots without changing the snapshot schema again.
      affirmationPhotoFileNames,
    });
    const serialized = JSON.stringify(snapshot);
    if (!photoWasCopied && (serialized === widgetSnapshotSerializedRef.current || serialized === widgetSnapshotInFlightRef.current)) return;
    widgetSnapshotInFlightRef.current = serialized;
    try {
      const saved = await saveRhythmWidgetSnapshot(snapshot);
      if (saved) widgetSnapshotSerializedRef.current = serialized;
    } catch (error) {
      // Expo Go has no WidgetKit module. Native failures should not affect app state.
      console.warn('Rhythm widget snapshot save failed.', error);
    } finally {
      if (widgetSnapshotInFlightRef.current === serialized) widgetSnapshotInFlightRef.current = undefined;
    }
  }, [affirmationCustomTexts, affirmations, chicCheckColor, designMode, departureCheckIns, departurePlans, effectiveChicPattern, hasDesignCustomizeAccess, hydrated, onboarding.state.firstRunStage, planTier, tasks, widgetPhotoSyncedUriRef, widgetSettings, wishMonths, wishTopImageUri]);

  const openWidgetGuide = React.useCallback(() => {
    setWidgetGuideVisible(true);
  }, []);
  const closeWidgetGuide = React.useCallback(() => {
    setWidgetGuideVisible(false);
    if (!onboarding.isCompleted('widgetGuide')) void onboarding.complete('widgetGuide');
  }, [onboarding]);
  const openWidgetSection = React.useCallback(() => {
    if (!onboarding.isCompleted('widgetGuide')) setWidgetGuideVisible(true);
  }, [onboarding]);
  const refreshWidgetFromSettings = React.useCallback(() => {
    void syncRhythmWidgetSnapshot().then(() => Alert.alert('Widgetを更新しました', '最新の予定とタスクを同期しました。')).catch(() => Alert.alert('Widgetを更新できませんでした', '時間をおいてもう一度お試しください。'));
  }, [syncRhythmWidgetSnapshot]);

  useEffect(() => {
    syncRhythmWidgetSnapshot();
  }, [syncRhythmWidgetSnapshot]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') syncRhythmWidgetSnapshot();
    });
    return () => subscription.remove();
  }, [syncRhythmWidgetSnapshot]);

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
  const dangerousTask = [...tasks]
    .filter((task) => !task.done && !isTaskSkippedOnDate(task, todayTaskDate) && task.navigationEnabled && task.deadlineDate)
    .sort((a, b) => urgencyLevel(getUrgencyStatus(b, now)) - urgencyLevel(getUrgencyStatus(a, now)))[0];

  const addTask = (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule: RepeatRule = 'none', nudgeMode: NudgeMode = 'once', scheduledDate?: string, scheduledTime?: string, endAt?: string, isRoutine = false, subtasks: Subtask[] = [], listItems: TaskListItem[] = []): Task | undefined => {
    if (scheduledTime && endAt && endAt <= scheduledTime) {
      Alert.alert('終了時間を確認してください', '終了時間は開始時間より後にしてください。');
      return undefined;
    }
    const routineLimit = hasPremiumAccess(planTier, 'full_history') ? 100 : 5;
    const activeRoutineIds = new Set(tasksRef.current.filter((item) => item.isRoutine).map((item) => item.routineId ?? item.id));
    if (isRoutine && activeRoutineIds.size >= routineLimit) {
      Alert.alert('ルーティン登録数の上限', `現在のプランでは${routineLimit}件まで登録できます。`);
      return undefined;
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
      listItems: listItems.map((item, index) => ({ ...item, order: index, checked: Boolean(item.checked), text: item.text.trim() })).filter((item) => item.text),
    };
    const nextTasks = [task, ...tasksRef.current];
    tasksRef.current = nextTasks;
    setTasks(nextTasks);
    setAddOpen(false);
    setVoiceTaskDraft(undefined);
    void onboarding.complete('todo');
    if (isRoutine) void onboarding.complete('routine');
    if (remindAt || (deadlineDate && deadlineTime && deadlineNotifyBefore !== undefined)) void scheduleAllTaskNotifications(task);
    return task;
  };

  const updateTask = (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule: RepeatRule = 'none', nudgeMode: NudgeMode = 'once', scheduledDate?: string, scheduledTime?: string, endAt?: string, isRoutine = false, subtasks: Subtask[] = [], listItems?: TaskListItem[]) => {
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
    const updated = { ...editingTask, title, category, priority, remindDate, remindAt, deadlineDate, deadlineTime, deadlineNotifyBefore, navigationEnabled, preparationMinutes, travelMinutes, bufferMinutes, repeatRule, isRoutine, routineId: isRoutine ? editingTask.routineId ?? editingTask.id : editingTask.routineId, routineEndedAt: isRoutine ? undefined : endedAt, nudgeMode, scheduledDate: scheduledDate ?? editingTask.scheduledDate ?? dateKey(now), scheduledTime, endAt: endAt && /^\d{2}:\d{2}$/.test(endAt) ? endAt : undefined, status: 'active' as const, skippedAt: undefined, subtasks: subtasks.map((item, index) => ({ ...item, order: index, done: Boolean(item.done) })), listItems: (listItems ?? editingTask.listItems ?? []).map((item, index) => ({ ...item, text: item.text.trim(), order: index, checked: Boolean(item.checked) })).filter((item) => item.text) };
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

  const updateTaskList = React.useCallback((taskId: string, items: TaskListItem[]) => {
    const next = tasksRef.current.map((task) => task.id === taskId
      ? { ...task, listItems: items.map((item, index) => ({ ...item, text: item.text.trim(), order: index, checked: Boolean(item.checked) })).filter((item) => item.text) }
      : task);
    tasksRef.current = next;
    setTasks(next);
  }, []);

  const addBulkTasks = React.useCallback((titles: string[], scheduledDate: string) => {
    const uniqueTitles = titles.map((title) => title.trim()).filter(Boolean);
    if (!uniqueTitles.length) return;
    const createdAt = new Date().toISOString();
    const newTasks: Task[] = uniqueTitles.map((title, index) => {
      const id = `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
      return { id, title, createdAt, done: false, status: 'active', category: 'その他', priority: '中', repeatRule: 'none', nudgeMode: 'once', scheduledDate: scheduledDate || dateKey(now) };
    });
    const next = [...newTasks, ...tasksRef.current];
    tasksRef.current = next;
    setTasks(next);
    setBulkAddOpen(false);
    void onboarding.complete('todo');
  }, [dateKey, now, onboarding]);

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

  const scheduleDeparture = async (targetPlan = plan, options?: { silent?: boolean }) => {
    const mode = getDeparturePlanMode(targetPlan);
    if (mode === 'calendar_only') return;
    if (!await ensureNotifications()) {
      if (!options?.silent) Alert.alert('通知がオフです', '端末設定からRhythmの通知を許可してください。');
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
      if (!options?.silent) Alert.alert('出発通知を設定しました', `${formatLiveTime(departureAt)}に1回お知らせします。`);
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
    if (!options?.silent) Alert.alert('出発サポートを設定しました', `${formatLiveTime(moments.prepare)}から${count}段階でお知らせします。`);
  };
  useEffect(() => {
    if (!hydrated || planTier !== 'premium') return;
    let active = true;
    void (async () => {
      const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      for (const affirmation of affirmations.filter((item) => item.enabled)) {
        if (affirmation.notificationId) await Notifications.cancelScheduledNotificationAsync(affirmation.notificationId).catch(() => undefined);
        const matches = pending.filter((request) => request.content.data?.affirmationId === affirmation.id);
        await Promise.all(matches.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined)));
        if (active) await scheduleAffirmationNotification(affirmation).catch(() => undefined);
      }
      if (!active) return;
      for (const item of departurePlans) {
        if (!item.id || getDeparturePlanMode(item) === 'calendar_only' || planDateKey(item) < dateKey()) continue;
        await cancelPendingDepartureNotifications(item.id).catch(() => undefined);
        await scheduleDeparture(item, { silent: true });
      }
    })();
    return () => { active = false; };
  }, [hydrated, planTier]);
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

  const handleVoiceRoute = (result: VoiceParseResult): boolean => {
    setVoiceOpen(false);
    setVoiceTaskDraft(undefined);
    setVoiceWishDraft(undefined);
    if (result.intent === 'focus') {
      setTimelineInitialTab('focus');
      if (!result.focusDurationMinutes || !result.executeFocus) {
        setScreen('timeline');
        return false;
      }
      if (planTier !== 'premium') {
        openPremiumFeature('focus_custom_duration');
        return false;
      }
      setVoiceFocusRequest({ durationMinutes: result.focusDurationMinutes, id: Date.now() });
      setScreen('timeline');
      return true;
    }
    if (result.intent === 'routine' && result.explicitRoutineRegistration) {
      if (!result.title.trim()) {
        setScreen('home');
        return false;
      }
      const routine = addTask(result.title, categories[0]!, priorities[1]!, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, result.repeatRule ?? 'daily', 'once', result.scheduledDate ?? dateKey(), undefined, undefined, true);
      setScreen('home');
      return Boolean(routine);
    }
    if (result.intent === 'todo' || result.intent === 'routine') {
      setVoiceTaskDraft(result);
      setScreen('home');
      setAddOpen(true);
      return Boolean(result.title.trim());
    }
    if (result.intent === 'schedule') {
      setPlan({
        ...createEmptyPlanDraft(),
        title: result.title,
        destination: result.destination,
        date: result.scheduledDate ?? todayInputValue(),
        arrival: result.scheduledTime ?? '09:00',
        planMode: 'calendar_only',
        countdownEnabled: false,
      });
      setTimelineInitialTab('calendar');
      setScreen('timeline');
      setPlanEditorOpen(true);
      return Boolean(result.title.trim() && result.scheduledTime);
    }
    if (result.intent === 'wish' || result.intent === 'wishAction') {
      if (result.intent === 'wishAction' && planTier !== 'premium') {
        openPremiumFeature('wish');
        return false;
      }
      const relatedWish = currentWishState.wishes.find((wish) => Boolean(result.relatedWishTitle) && (wish.title.includes(result.relatedWishTitle!) || result.relatedWishTitle!.includes(wish.title)));
      setVoiceWishDraft({ mode: result.intent === 'wishAction' ? 'action' : 'wish', title: result.title, wishId: relatedWish?.id });
      setScreen('wish');
      return Boolean(result.title.trim());
    }
    return false;
  };

  useEffect(() => {
    if (screen !== 'wish') setVoiceWishDraft(undefined);
  }, [screen]);

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

  const performImportCalendarEventAsPlan = (event: Calendar.Event) => {
    const start = new Date(event.startDate);
    if (Number.isNaN(start.getTime())) {
      Alert.alert('予定を追加できませんでした', '日時を読み取れませんでした。');
      return false;
    }
    const externalCalendarEventId = typeof event.id === 'string' ? event.id : undefined;
    const calendarId = (event as Calendar.Event & { calendarId?: string }).calendarId;
    const externalCalendarEventKey = calendarEventOccurrenceKey(event);
    const eventEnd = event.endDate ? new Date(event.endDate) : undefined;
    const eventEndDate = eventEnd && !Number.isNaN(eventEnd.getTime()) ? dateKey(eventEnd) : undefined;
    const alreadyImported = departurePlansRef.current.some((item) => {
      if (item.externalCalendarEventKey) return item.externalCalendarEventKey === externalCalendarEventKey;
      if (externalCalendarEventId && item.externalCalendarEventId === externalCalendarEventId && !item.externalCalendarEventStartDate) return true;
      if (normalizeCalendarTitle(item.title) !== normalizeCalendarTitle(event.title)) return false;
      if (item.date !== dateKey(start) || Boolean(item.allDay) !== Boolean(event.allDay)) return false;
      if (!event.allDay && item.arrival !== formatLiveTime(start)) return false;
      const knownEndDate = item.endDate ?? item.externalCalendarEventEndDate;
      return !knownEndDate || knownEndDate === (eventEndDate ?? '');
    });
    if (alreadyImported) {
      Alert.alert('登録済みです', 'この予定はすでにRhythmの予定表にあります。');
      return false;
    }
    const imported: DeparturePlan = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}-calendar`,
      externalCalendarEventId,
      externalCalendarEventKey,
      externalCalendarEventCalendarId: calendarId,
      externalCalendarEventStartDate: start.toISOString(),
      externalCalendarEventEndDate: eventEndDate,
      title: event.title?.trim() || 'カレンダーの予定',
      destination: event.location?.trim() || undefined,
      countdownEnabled: false,
      planMode: 'calendar_only',
      date: dateKey(start),
      arrival: event.allDay ? '' : formatLiveTime(start),
      allDay: Boolean(event.allDay),
      endDate: eventEndDate,
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

  const importCalendarEventAsPlan = (event: Calendar.Event) => {
    if (planTier === 'premium') return performImportCalendarEventAsPlan(event);
    if (canImportCalendar(rewardedAccess)) {
      const imported = performImportCalendarEventAsPlan(event);
      if (imported) {
        const next = { ...rewardedAccess, calendarImportCredits: Math.max(0, rewardedAccess.calendarImportCredits - 1) };
        setRewardedAccess(next);
        void saveRewardedAccessState(next);
      }
      return imported;
    }
    openRewardedPrompt('calendarImport', 'カレンダーから取り込む', '広告を見ると、カレンダーの予定を1回Rhythmへ取り込めます。', () => {
      const imported = performImportCalendarEventAsPlan(event);
      if (imported) {
        const next = { ...rewardedAccess, calendarImportCredits: Math.max(0, rewardedAccess.calendarImportCredits - 1) };
        setRewardedAccess(next);
        void saveRewardedAccessState(next);
      }
    });
    return false;
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
    if (nextScreen !== 'analysis') {
      setOpenTodayReview(false);
      setAnalysisInitialTab('records');
    }
    if (nextScreen === 'wish') openWish();
    else setScreen(nextScreen);
  }, [focusTimerActive, openWish, screen]);

  // Premium previews reuse the production screens with fixed, read-only demo
  // data.  The parent preview surface disables pointer events, so these
  // callbacks are no-ops, so these screens cannot save tasks, schedule
  // notifications, request permissions, or mutate the user's state while
  // still showing the real layout, scroll behavior, and tokens.
  const renderWishCapturePreview = (premium: boolean): React.ReactNode => {
    const wishId = 'capture-preview-wish';
    const actions: WishAction[] = [
      { id: 'capture-preview-action-1', wishId, title: '寝る前に10分読む', completed: premium },
      ...(premium ? [{ id: 'capture-preview-action-2', wishId, title: '通勤中に5ページ読む', completed: false }] : []),
    ];
    return (
      <View pointerEvents="none" style={{ width: '100%', height: premium ? 740 : 620 }}>
        <WishScreen
          designMode={uiDesignMode}
          chicPattern={effectiveChicPattern}
          chicPalette={chicPalette}
          monthLabel="2026年8月"
          state={{
            monthlyGoal: '毎日少しでも自分の時間をつくる',
            wishes: [{ id: wishId, title: '週に1冊、本を読む', completed: false, createdAt: '2026-01-01T00:00:00.000Z' }],
            actions,
            review: {},
          }}
          onSaveState={() => undefined}
          onCreateTaskFromAction={() => undefined}
          affirmations={premium ? [{ id: 'capture-preview-affirmation', text: '私は自分のペースで続けられる', time: '08:30', enabled: true, createdAt: '2026-01-01T00:00:00.000Z' }] : []}
          affirmationCustomTexts={[]}
          planTier="premium"
          onSaveAffirmation={() => undefined}
          onDeleteAffirmation={() => undefined}
          onSaveAffirmationCustomText={() => undefined}
          onDeleteAffirmationCustomText={() => undefined}
          canCreateWish
          canCreateWishAction
          onPremium={() => undefined}
        />
      </View>
    );
  };

  const renderPremiumReadOnlyPreview = (kind: PremiumGuideFeatureId, wishPremium = true, previewOverride?: { initialTab?: TimeTab; previewMode?: boolean; previewCustomDurationOpen?: boolean; maxHeight?: number; analysisInitialTab?: 'records' | 'insights' | 'routine'; analysisPreviewKind?: 'time' | 'behavior' }): React.ReactNode => {
    const previewDate = dateKey(now);
    // Production preview components still consume the shared legacy styles.
    // Give their dark Premium render tree the Mono Dark tokens too; otherwise
    // warm defaults from appStyles leak through the custom renderer.
    const premiumPreviewStyles: any = uiDesignMode !== 'dark' ? styles : (() => {
      const next: Record<string, any> = { ...styles };
      const muted = /(meta|copy|label|sub|hint|caption|arrow|description|empty|ready|source|note|more|secondary|latest)/;
      const accent = /(accent|premium|choose|save|active|link|action|rate|progress)/;
      const danger = /(danger|delete|overdue|warning)/;
      Object.keys(styles).forEach((key) => {
        const lower = key.toLowerCase();
        if (lower.startsWith('dark') || lower.includes('buttontext') || lower.includes('ctatext') || lower.includes('checkmark') || lower.includes('guidecard')) return;
        const value = danger.test(lower) ? theme.colors.danger : accent.test(lower) ? theme.colors.primaryAccent : muted.test(lower) ? theme.colors.secondaryText : /text|title|name|time|value|count|body|task|heading|brand/.test(lower) ? theme.colors.primaryText : undefined;
        if (value) next[key] = [(styles as Record<string, any>)[key], { color: value }];
      });
      next.premiumPreview = [(styles as Record<string, any>).premiumPreview, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }];
      next.premiumPreviewViewport = [(styles as Record<string, any>).premiumPreviewViewport, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }];
      next.premiumPreviewViewportContent = [(styles as Record<string, any>).premiumPreviewViewportContent, { backgroundColor: theme.colors.surface }];
      // The calendar event picker keeps a light card surface in the production
      // preview. Override the generic dark remap for that card only so its
      // title/date remain readable without changing dark surfaces elsewhere.
      const lightCardText = getThemeTokens('minimal', chicPalette.id).colors;
      next.calendarEventPickerTitle = [(styles as Record<string, any>).calendarEventPickerTitle, { color: lightCardText.primaryText }];
      next.calendarEventTitle = [(styles as Record<string, any>).calendarEventTitle, { color: lightCardText.primaryText }];
      next.calendarEventDate = [(styles as Record<string, any>).calendarEventDate, { color: lightCardText.secondaryText }];
      next.calendarImportArrow = [(styles as Record<string, any>).calendarImportArrow, { color: theme.colors.primaryAccent }];
      // DepartureCountdownCard's main CTA uses a style name that also matches
      // the generic text remap above. Keep its label dark on the Mono Dark
      // accent surface, just like the production card's onAccent token.
      next.planActionMainText = [(styles as Record<string, any>).planActionMainText, { color: theme.colors.screenBackground }];
      return next;
    })();
    const previewTasks: Task[] = [
      { id: 'premium-preview-task-1', title: '資料をまとめる', done: false, category: '仕事', priority: '中', scheduledDate: previewDate, scheduledTime: '09:00', bucket: 'now' },
      { id: 'premium-preview-task-4', title: '買い物', done: false, category: '家事', priority: '低', scheduledDate: previewDate, scheduledTime: '11:30', bucket: 'later' },
      { id: 'premium-preview-task-2', title: '洗濯をする', done: true, status: 'completed', category: '家事', priority: '中', scheduledDate: previewDate, scheduledTime: '14:00', completedAt: new Date(Date.now() - 86400000).toISOString(), bucket: 'later' },
      { id: 'premium-preview-task-5', title: 'ジム', done: false, category: '健康', priority: '中', scheduledDate: previewDate, scheduledTime: '18:30', bucket: 'now' },
      { id: 'premium-preview-task-3', title: 'シーツを洗濯する', done: true, status: 'completed', category: '家事', priority: '中', scheduledDate: previewDate, completedAt: new Date(Date.now() - 86400000 * 4).toISOString(), bucket: 'later' },
    ];
    const previewPlans: DeparturePlan[] = [{ id: 'premium-preview-plan', title: '資料提出', destination: '天神○○ビル', date: previewDate, arrival: '14:00', departureTime: '13:15', endAt: '15:00', travelMinutes: 30, preparationMinutes: 15, bufferMinutes: 10, planMode: 'arrival_reverse' }];
    const previewCalendarOptions = [
      { id: 'preview-personal-calendar', title: '個人', type: 'local' },
      { id: 'preview-work-calendar', title: '仕事', type: 'local' },
    ] as Calendar.Calendar[];
    const previewCalendarEvents = [
      { id: 'preview-calendar-hospital', calendarId: 'preview-personal-calendar', title: '病院', startDate: `${previewDate}T10:00:00`, endDate: `${previewDate}T11:00:00`, allDay: false },
      { id: 'preview-calendar-meeting', calendarId: 'preview-work-calendar', title: '打ち合わせ', startDate: `${previewDate}T14:00:00`, endDate: `${previewDate}T15:00:00`, allDay: false },
      { id: 'preview-calendar-hair', calendarId: 'preview-personal-calendar', title: '美容院', startDate: `${previewDate}T18:00:00`, endDate: `${previewDate}T19:00:00`, allDay: false },
    ] as Calendar.Event[];
    const monthDate = (day: number) => dateKey(new Date(now.getFullYear(), now.getMonth(), day, 9, 0, 0, 0));
    const monthPreviewTasks: Task[] = [
      { id: 'premium-month-task-1', title: '買い物完了', done: true, status: 'completed', category: '家事', priority: '中', scheduledDate: monthDate(12), completedAt: `${monthDate(12)}T18:00:00`, bucket: 'later' },
      { id: 'premium-month-task-2', title: '資料作成完了', done: true, status: 'completed', category: '仕事', priority: '高', scheduledDate: monthDate(27), completedAt: `${monthDate(27)}T17:00:00`, bucket: 'later' },
      { id: 'premium-month-task-3', title: 'ジムに行く', done: false, category: '健康', priority: '中', scheduledDate: monthDate(24), scheduledTime: '19:00', bucket: 'now' },
    ];
    const monthPreviewPlans: DeparturePlan[] = [
      { id: 'premium-month-plan-1', title: '病院', destination: '天神○○ビル', date: monthDate(3), arrival: '10:00', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0, planMode: 'calendar_only' },
      { id: 'premium-month-plan-2', title: '資料提出', destination: '天神○○ビル', date: monthDate(8), arrival: '14:00', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0, planMode: 'calendar_only' },
      { id: 'premium-month-plan-3', title: '美容院', destination: '駅前サロン', date: monthDate(15), arrival: '18:00', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0, planMode: 'calendar_only' },
      { id: 'premium-month-plan-4', title: '打ち合わせ', destination: 'オフィス', date: monthDate(19), arrival: '14:00', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0, planMode: 'calendar_only' },
    ];
    const monthPreviewCalendarEvents = [
      { id: 'premium-month-external-1', calendarId: 'preview-personal-calendar', title: '病院', startDate: `${monthDate(3)}T10:00:00`, endDate: `${monthDate(3)}T11:00:00`, allDay: false },
      { id: 'premium-month-external-2', calendarId: 'preview-work-calendar', title: '打ち合わせ', startDate: `${monthDate(19)}T14:00:00`, endDate: `${monthDate(19)}T15:00:00`, allDay: false },
    ] as Calendar.Event[];
    const routinePreviewTasks: Task[] = [
      { id: 'premium-routine-reading', title: '読書', done: true, status: 'completed', category: 'その他', priority: '中', scheduledDate: previewDate, completedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), isRoutine: true, routineId: 'premium-routine-reading', bucket: 'now' },
      { id: 'premium-routine-stretch', title: 'ストレッチ', done: true, status: 'completed', category: '健康', priority: '中', scheduledDate: previewDate, completedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 9 * 86400000).toISOString(), isRoutine: true, routineId: 'premium-routine-stretch', bucket: 'now' },
    ];
    const routinePreviewEvents: BehaviorEvent[] = [
      ...Array.from({ length: 12 }, (_, index) => { const day = new Date(now); day.setDate(day.getDate() - 12 + index); const key = dateKey(day); return { id: `premium-routine-reading-${index}`, eventKey: `premium-routine-reading-${index}`, type: 'task_completed' as const, occurredAt: `${key}T20:00:00`, source: 'manual' as const, version: 1 as const, routineId: 'premium-routine-reading', routineTitleSnapshot: '読書', taskId: 'premium-routine-reading', taskTitleSnapshot: '読書', actualAt: `${key}T20:00:00`, taskCompletionDate: key }; }),
      ...Array.from({ length: 5 }, (_, index) => { const day = new Date(now); day.setDate(day.getDate() - 6 + index); const key = dateKey(day); return { id: `premium-routine-stretch-${index}`, eventKey: `premium-routine-stretch-${index}`, type: 'task_completed' as const, occurredAt: `${key}T07:30:00`, source: 'manual' as const, version: 1 as const, routineId: 'premium-routine-stretch', routineTitleSnapshot: 'ストレッチ', taskId: 'premium-routine-stretch', taskTitleSnapshot: 'ストレッチ', actualAt: `${key}T07:30:00`, taskCompletionDate: key }; }),
    ];
    const previewEvents: BehaviorEvent[] = [
      { id: 'premium-preview-complete', eventKey: 'premium-preview-complete', type: 'task_completed', occurredAt: new Date().toISOString(), source: 'manual', version: 1, taskId: previewTasks.find((task) => task.id === 'premium-preview-task-2')!.id, taskTitleSnapshot: previewTasks.find((task) => task.id === 'premium-preview-task-2')!.title, actualAt: new Date().toISOString(), taskCompletionDate: previewDate },
      { id: 'premium-preview-focus', eventKey: 'premium-preview-focus', type: 'focus_completed', occurredAt: new Date().toISOString(), source: 'manual', version: 1, taskId: previewTasks[0]!.id, taskTitleSnapshot: previewTasks[0]!.title, focusSessionId: 'premium-preview-focus-session', plannedDurationMinutes: 25, actualDurationMinutes: 25, focusStartedAt: new Date(Date.now() - 25 * 60_000).toISOString() },
      { id: 'premium-preview-preparation', eventKey: 'premium-preview-preparation', type: 'departure_preparation_started', occurredAt: new Date(Date.now() - 45 * 60_000).toISOString(), source: 'manual', version: 1, departurePlanId: previewPlans[0]!.id, departurePlanTitleSnapshot: previewPlans[0]!.title, departurePlanDate: previewDate, scheduledAt: new Date(Date.now() - 55 * 60_000).toISOString(), actualAt: new Date(Date.now() - 45 * 60_000).toISOString(), deltaMinutes: 10 },
      { id: 'premium-preview-departure', eventKey: 'premium-preview-departure', type: 'departure_started', occurredAt: new Date(Date.now() - 25 * 60_000).toISOString(), source: 'manual', version: 1, departurePlanId: previewPlans[0]!.id, departurePlanTitleSnapshot: previewPlans[0]!.title, departurePlanDate: previewDate, scheduledAt: new Date(Date.now() - 30 * 60_000).toISOString(), actualAt: new Date(Date.now() - 25 * 60_000).toISOString(), deltaMinutes: 5 },
      { id: 'premium-preview-notification-scheduled', eventKey: 'premium-preview-notification-scheduled', type: 'notification_scheduled', occurredAt: new Date(Date.now() - 70 * 60_000).toISOString(), source: 'system', version: 1, notificationInstanceId: 'premium-preview-notification', taskId: previewTasks.find((task) => task.id === 'premium-preview-task-2')!.id, taskTitleSnapshot: previewTasks.find((task) => task.id === 'premium-preview-task-2')!.title, scheduledAt: new Date(Date.now() - 60 * 60_000).toISOString() },
      { id: 'premium-preview-notification-action', eventKey: 'premium-preview-notification-action', type: 'notification_action', occurredAt: new Date(Date.now() - 55 * 60_000).toISOString(), source: 'notification', version: 1, notificationInstanceId: 'premium-preview-notification', notificationAction: 'completed', taskId: previewTasks.find((task) => task.id === 'premium-preview-task-2')!.id, taskTitleSnapshot: previewTasks.find((task) => task.id === 'premium-preview-task-2')!.title, scheduledAt: new Date(Date.now() - 60 * 60_000).toISOString(), actualAt: new Date(Date.now() - 55 * 60_000).toISOString(), deltaMinutes: 5 },
    ];
    const previewHistory = <HistoryScreen
      tasks={previewTasks}
      wishMonths={{} as WishMonthMap}
      calendarMarks={{ [previewDate]: '記録' }}
      onSetCalendarMark={() => undefined}
      recoveryHistory={[]}
      focusSessions={[{ id: 'premium-preview-focus-session', taskId: previewTasks[0]!.id, taskTitle: previewTasks[0]!.title, durationMinutes: 25, startedAt: new Date(Date.now() - 25 * 60_000).toISOString(), completedAt: new Date().toISOString() }]}
      departureCheckIns={[]}
      departurePlans={previewPlans}
      behaviorEvents={previewEvents}
      completionIcon="✓"
      designMode={uiDesignMode}
      chicPattern={effectiveChicPattern}
      chicPalette={chicPalette}
      planTier="premium"
      onPremium={() => undefined}
      onSaveTemplate={() => undefined}
      onRestore={() => undefined}
      onSaveDailyReview={() => undefined}
      onSaveMonthlyReflectionCard={() => undefined}
      onUpdateReview={() => undefined}
      onDeleteReview={() => undefined}
      styles={premiumPreviewStyles}
      helpers={{ dateKey, formatLiveTime, getThemeTokens: getThemedThemeTokens }}
      components={{ AchievementVessel, CalendarMarkPicker }}
      previewMode={kind === 'records' || kind === 'history'}
      previewSearchQuery={kind === 'history' ? '洗濯' : undefined}
      previewJournal={kind === 'records'}
    />;
    // The enclosing PremiumPreviewViewport measures and scales this complete
    // production surface. Do not clip the source canvas here; doing so would
    // remove lower controls before the common fit-to-viewport pass can run.
    const readonly = (node: React.ReactNode, _maxHeight = 430, minHeight = 0) => <View style={[styles.premiumPreview, { minHeight, overflow: 'visible' }, uiDesignMode === 'dark' && { backgroundColor: '#181F2E', borderColor: '#40506A' }]}>{node}</View>;
    // Settings-backed Premium features use the production settings surface as
    // their read-only preview.  The capture/preview callbacks are no-ops, so
    // this cannot persist settings, request permissions, or start ads.
    if (kind === 'photo_design') {
      return readonly(<View pointerEvents="none">{renderAppearanceSettingsPreview()}</View>);
    }
    if (kind === 'voice') {
      return readonly(<View pointerEvents="none" style={{ padding: 18, alignItems: 'center' }}><Text style={{ color: themedColors.muted, fontSize: 12, fontWeight: '800' }}>共通音声入力</Text><View style={{ marginTop: 12, width: 70, height: 70, borderRadius: 35, backgroundColor: themedColors.violet, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: uiDesignMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF', fontSize: 28 }}>⌕</Text></View><Text style={{ color: themedColors.ink, fontSize: 14, fontWeight: '900', marginTop: 10 }}>明日の18時に美容院</Text><Text style={{ color: themedColors.muted, fontSize: 11, marginTop: 4 }}>予定として整理 → 確認して保存</Text></View>, 430);
    }
    if (kind === 'nudge') return readonly(<NotificationManagerCard designMode={uiDesignMode} readOnly />, 560, 0);
    if (kind === 'travel_apps') return readonly(<TravelAppsSettingsCard settings={travelApps} onChange={() => undefined} planTier="premium" designMode={uiDesignMode} chicPalette={chicPalette} onPremium={() => undefined} readOnlyPreview />, 560);
    if (kind === 'route') {
      return readonly(<View pointerEvents="none"><DepartureCountdownCard plan={previewPlans[0]!} now={now} planTier="premium" designMode={uiDesignMode} chicPalette={chicPalette} prepared={false} departed={false} styles={premiumPreviewStyles} helpers={{ getThemeTokens: getThemedThemeTokens, planDateKey, formatLiveTime, getDepartureMoments, countdownToDate, getMapSearchTarget, openMapSearch: async () => undefined, getPlanCountdownAt }} onPrepare={() => undefined} onDepart={() => undefined} onStill={() => undefined} onRecover={() => undefined} onShare={() => undefined} onPremium={() => undefined} onEdit={() => undefined} onDelete={() => undefined} travelApps={travelApps} onOpenTravelAppSettings={() => undefined} /></View>, 760, 0);
    }
    if (kind === 'calendar' || kind === 'month' || kind === 'recovery' || kind === 'focus_custom_duration') {
      // The calendar preview is the import flow itself.  Keep the monthly
      // TaskScheduleCalendar reserved for the dedicated month preview.
      const initialTab: TimeTab = previewOverride?.initialTab ?? (kind === 'month' ? 'calendar' : kind === 'focus_custom_duration' ? 'focus' : 'departure');
      const timelinePreviewMode = previewOverride?.previewMode ?? (kind === 'calendar' || kind === 'recovery');
      // Leave enough room for the production calendar-import card and all
      // three fixed read-only event rows.  The month preview keeps its own
      // compact monthly-calendar viewport.
      const timelineMaxHeight = previewOverride?.maxHeight ?? (kind === 'calendar' ? 760 : kind === 'month' ? 620 : 560);
      return readonly(<TimelineScreen
        plan={(kind === 'month' ? monthPreviewPlans : previewPlans)[0]}
        plans={kind === 'month' ? monthPreviewPlans : previewPlans}
        planEditorOpen={false}
        departureCheckIns={[]}
        departurePreparationStatuses={{}}
        behaviorEvents={[]}
        tasks={kind === 'month' ? monthPreviewTasks : previewTasks}
        now={now}
        designMode={uiDesignMode}
        focusBackgroundUri={undefined}
        initialTab={initialTab}
        chicPattern={effectiveChicPattern}
        chicPalette={chicPalette}
        planTier="premium"
        completionIcon={completionIcon}
        focusCustomDurationMinutes={kind === 'focus_custom_duration' ? 47 : undefined}
        previewCustomDurationOpen={previewOverride?.previewCustomDurationOpen ?? (kind === 'focus_custom_duration')}
        previewMode={timelinePreviewMode}
        previewCalendarEvents={kind === 'month' ? monthPreviewCalendarEvents : previewCalendarEvents}
        previewCalendarOptions={previewCalendarOptions}
        onFocusCustomDurationChange={() => undefined}
        recoveryTargetPlanId={kind === 'recovery' ? previewPlans[0]!.id : undefined}
        onChange={() => undefined}
        onSchedule={() => undefined}
        onScheduleUsed={() => undefined}
        onOpenNewPlan={() => undefined}
        onClosePlanEditor={() => undefined}
        onImportCalendarEvent={() => false}
        onEdit={() => undefined}
        onSharePlan={() => undefined}
        onDelete={() => undefined}
        onEditTask={() => undefined}
        onDeleteTask={() => undefined}
        onTaskBucketChange={() => undefined}
        onPremium={() => undefined}
        onRecovery={() => undefined}
        onRecoveryClosed={() => undefined}
        onFocusCompleted={() => undefined}
        onFocusStarted={() => undefined}
        onFocusNotificationPermission={async () => false}
        onFocusRunningChange={() => undefined}
        focusTimerActive={false}
        onFocusNavigationBlocked={() => undefined}
        onBehaviorEvent={() => undefined}
        onDeparted={() => undefined}
        onPreparationStarted={() => undefined}
        onStill={() => undefined}
        calendarMarks={{}}
        onSetCalendarMark={() => undefined}
        hapticsEnabled={false}
        styles={premiumPreviewStyles}
        helpers={{ getThemeTokens: getThemedThemeTokens, dateKey, planDateKey, hasPremiumAccess, formatLiveDate, formatLiveTime, getDepartureMoments, normalizePlanDate, countdownToDate, dateForReminder, getMapSearchTarget, openMapSearch: () => undefined, getPlanCountdownAt, colors: themedColors }}
        components={{ TimeTabButton, FocusMode, TaskScheduleCalendar, DailyScheduleTimeline, RecoveryModal }}
      />, timelineMaxHeight);
    }
    if (kind === 'reflection') {
      const reflectionPhotos = [
        Image.resolveAssetSource(require('./assets/themes/floral/vintage-bloom-preview.jpg')).uri,
        Image.resolveAssetSource(require('./assets/themes/floral/sheer-floral-preview.jpg')).uri,
        Image.resolveAssetSource(require('./assets/themes/floral/floral-soft-thumbnail.jpg')).uri,
      ];
      const reflectionModel: ReflectionCardModel = {
        monthKey: previewDate.slice(0, 7),
        monthLabel: `${now.getFullYear()}年${now.getMonth() + 1}月`,
        photos: reflectionPhotos,
        template: 'gallery',
        palette: 'lavender',
        phrase: '自分のペースで進める',
        bestMemory: '資料をまとめる時間を作れた',
      };
      return readonly(<View style={{ alignItems: 'center', paddingVertical: 12 }}><MonthlyReflectionCardView model={reflectionModel} cardRef={React.createRef<View>()} onReady={() => undefined} /></View>, 560);
    }
    if (kind === 'history') return readonly(<View pointerEvents="none">{previewHistory}</View>, 560);
    if (kind === 'records') return readonly(<View pointerEvents="none">{previewHistory}</View>, 560);
    if (kind === 'time' || kind === 'behavior') {
      return readonly(<AnalysisScreen
        events={previewOverride?.analysisInitialTab === 'routine' ? [...previewEvents, ...routinePreviewEvents] : previewEvents}
        tasks={previewOverride?.analysisInitialTab === 'routine' ? [...previewTasks, ...routinePreviewTasks] : previewTasks}
        onRemoveRoutine={() => undefined}
        routineArchives={[]}
        onResumeRoutine={() => undefined}
        onDeleteRoutineArchive={() => undefined}
        designMode={uiDesignMode}
        planTier="premium"
        chicPalette={chicPalette}
        chicPattern={effectiveChicPattern}
        PatternDecor={ChicPatternDecor}
        recordContent={<View pointerEvents="none">{previewHistory}</View>}
        onPremium={() => undefined}
        departurePlans={previewPlans}
         onApplySuggestion={() => undefined}
         onAnalysisUsed={() => undefined}
         initialTab={previewOverride?.analysisInitialTab ?? (kind === 'time' || kind === 'behavior' ? 'insights' : 'records')}
         previewKind={previewOverride?.analysisPreviewKind ?? (kind === 'time' || kind === 'behavior' ? kind : undefined)}
       />, 430, previewOverride?.analysisInitialTab === 'routine' ? 0 : 300);
    }
    if (kind === 'templates') {
      return readonly(<TaskModal
        visible
        readOnlyPreview
        previewSection="savedTemplates"
        templates={[]}
        savedTemplates={[
          { id: 'premium-preview-template-1', version: 1, createdAt: '2026-01-01T00:00:00.000Z', title: '病院訪問の準備', category: '予定', priority: '高', repeatRule: 'none', nudgeMode: 'once', navigationEnabled: true, preparationMinutes: 30, travelMinutes: 40, bufferMinutes: 15, listItems: [{ id: 'preview-template-list-1', text: '診察券を入れる', checked: false, order: 0 }] },
          { id: 'premium-preview-template-2', version: 1, createdAt: '2026-01-02T00:00:00.000Z', title: '出張前チェック', category: '仕事', priority: '高', repeatRule: 'none', nudgeMode: 'once', navigationEnabled: false, listItems: [{ id: 'preview-template-list-2', text: '資料と充電器を確認', checked: false, order: 0 }] },
          { id: 'premium-preview-template-3', version: 1, createdAt: '2026-01-03T00:00:00.000Z', title: '朝の支度', category: 'その他', priority: '中', repeatRule: 'daily', nudgeMode: 'once', navigationEnabled: false, listItems: [{ id: 'preview-template-list-3', text: '水分をとる', checked: false, order: 0 }] },
        ]}
        designMode={uiDesignMode}
        chicPalette={chicPalette}
        planTier="premium"
        onPremium={() => undefined}
        onClose={() => undefined}
        onSave={() => undefined}
        styles={premiumPreviewStyles}
        helpers={{ getThemeTokens: getThemedThemeTokens, todayInputValue, hasPremiumAccess, dateForReminder, dateKey, formatLiveTime, colors: themedColors, summarizePremiumTaskTemplate }}
        components={{ CompactNumberSetting }}
       />, 760, 0);
    }
    if (kind === 'affirmation') {
      return readonly(<AffirmationSettingsCard
        affirmations={[{ id: 'preview-affirmation', text: '私は、自分のペースで進める', time: '08:30', enabled: true, createdAt: '2026-01-01T00:00:00.000Z' }]}
        customTexts={[{ id: 'preview-custom-affirmation', text: '今日も自分らしく進める', createdAt: '2026-01-01T00:00:00.000Z' }]}
        designMode={uiDesignMode}
        chicPalette={chicPalette}
        planTier="premium"
        onPremium={() => undefined}
        onSave={() => undefined}
        onDelete={() => undefined}
        onSaveCustomText={() => undefined}
        onDeleteCustomText={() => undefined}
        styles={premiumPreviewStyles}
        previewMode
      />, 560);
    }
    if (kind === 'wish') {
      return readonly(renderWishCapturePreview(true), 760);
    }
    return undefined;
  };

  // Premium photo-design previews need the real appearance selector, but it
  // is intentionally kept separate from the six-card first-run intro.
  const renderAppearanceSettingsPreview = (): React.ReactNode => renderOnboardingCaptureStep('customize');

  const renderOnboardingCaptureStep = (id: IntroCardId | 'customize'): React.ReactNode => {
    const previewDate = dateKey(now);
    const captureTasks: Task[] = [
      { id: 'capture-task-1', title: '資料をまとめる', done: false, category: '仕事', priority: '中', scheduledDate: previewDate, scheduledTime: '09:00', bucket: 'now' },
      { id: 'capture-task-2', title: 'スーパーに寄る', done: false, category: '家事', priority: '低', scheduledDate: previewDate, bucket: 'later' },
      { id: 'capture-task-3', title: '美容室を予約する', done: true, status: 'completed', category: '予定', priority: '高', scheduledDate: previewDate, completedAt: new Date().toISOString(), bucket: 'waiting' },
    ];
    const completedCaptureTasks: Task[] = [
      { id: 'capture-completed-1', title: '資料をまとめる', done: true, status: 'completed', category: '仕事', priority: '中', scheduledDate: previewDate, completedAt: new Date().toISOString(), bucket: 'now' },
      { id: 'capture-completed-2', title: 'メールを返信する', done: true, status: 'completed', category: '仕事', priority: '低', scheduledDate: previewDate, completedAt: new Date().toISOString(), bucket: 'later' },
      { id: 'capture-completed-3', title: '洗濯をする', done: true, status: 'completed', category: '家事', priority: '中', scheduledDate: previewDate, completedAt: new Date().toISOString(), bucket: 'later' },
    ];
    const renderHomePreview = (tasks: Task[], initialTab: 'now' | 'list' = 'now') => <HomeScreen
      tasks={tasks}
      allTasks={tasks}
      now={now}
      designMode={uiDesignMode}
      chicPalette={chicPalette}
      completionIcon="✓"
      selectionMode={false}
      selectedTaskIds={[]}
      initialTab={initialTab}
      onAdd={() => undefined}
      onOpenFocus={() => undefined}
      onOpenSchedule={() => undefined}
      onUpdateTaskList={() => undefined}
      onToggle={() => undefined}
      onToggleSubtask={() => undefined}
      onCompleteParent={() => undefined}
      onEdit={() => undefined}
      onToggleSelection={() => undefined}
      onSelectionMode={() => undefined}
      onCompleteSelected={() => undefined}
      onDeleteSelected={() => undefined}
      onDelete={() => undefined}
      onSkip={() => undefined}
      onDuplicate={() => undefined}
      onSaveTemplate={() => undefined}
      onPostpone={() => undefined}
      onBucket={() => undefined}
      styles={styles}
      renderTodayWinStrip={(todayTasks) => <TodayWinStrip tasks={todayTasks} designMode={uiDesignMode} chicPattern={effectiveChicPattern} chicPalette={chicPalette} onRestore={() => undefined} />}
      showTodoOnboarding={false}
      showTodoCompleteOnboarding={false}
      showCompletedTasksOnboarding={false}
      showTaskBucketsOnboarding={false}
      showTaskDetailsOnboarding={false}
      helpers={{ deadlineLabel, getUrgencyStatus, getLateRiskMessage, dateForReminder, dateKey, formatLiveTime, isCheckChicPattern, todayInputValue, getThemeTokens: getThemedThemeTokens }}
    />;
    const schedulePreviewPlans: DeparturePlan[] = [
      { id: 'capture-schedule-1', title: '資料をまとめる', destination: 'オフィス', date: previewDate, arrival: '10:00', planMode: 'calendar_only', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0 },
      { id: 'capture-schedule-2', title: '買い物', destination: 'スーパー', date: previewDate, arrival: '12:00', planMode: 'calendar_only', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0 },
      { id: 'capture-schedule-3', title: '病院', destination: '病院', date: previewDate, arrival: '14:00', planMode: 'calendar_only', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0 },
    ];
    if (id === 'schedule') return <View pointerEvents="none" style={{ width: '100%', padding: 12 }}><DailyScheduleTimeline date={previewDate} tasks={[]} plans={schedulePreviewPlans} externalEvents={[]} now={now} designMode={uiDesignMode} chicPalette={chicPalette} planTier="premium" onEditTask={() => undefined} onEditPlan={() => undefined} visibleStartHour={9} visibleEndHour={14} /></View>;
    if (id === 'widget' || id === 'widgetAdd' || id === 'widgetEdit') {
      const widgetColors = getThemeTokens(uiDesignMode, chicPalette.id).colors;
      return <View pointerEvents="none" style={{ width: '100%', padding: 12 }}><View style={{ gap: 8 }}><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1.3, minHeight: 92, borderRadius: 14, padding: 12, backgroundColor: widgetColors.surface, borderWidth: 1, borderColor: widgetColors.border }}><Text style={{ color: widgetColors.secondaryText, fontSize: 10, fontWeight: '800' }}>今はこれ</Text><Text numberOfLines={1} style={{ color: widgetColors.primaryText, fontSize: 15, fontWeight: '900', marginTop: 8 }}>資料をまとめる</Text><Text style={{ color: widgetColors.primaryAccent, fontSize: 11, marginTop: 5 }}>25 min</Text></View><View style={{ flex: 1, minHeight: 92, borderRadius: 14, padding: 12, backgroundColor: widgetColors.softAccent, borderWidth: 1, borderColor: widgetColors.border }}><Text style={{ color: widgetColors.secondaryText, fontSize: 10, fontWeight: '800' }}>音声入力</Text><Text style={{ color: widgetColors.primaryAccent, fontSize: 24, marginTop: 10 }}>◉</Text></View></View><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1, minHeight: 76, borderRadius: 14, padding: 12, backgroundColor: widgetColors.surface, borderWidth: 1, borderColor: widgetColors.border }}><Text style={{ color: widgetColors.secondaryText, fontSize: 10, fontWeight: '800' }}>次の予定</Text><Text style={{ color: widgetColors.primaryText, fontSize: 13, fontWeight: '900', marginTop: 7 }}>18:00 美容院</Text></View><View style={{ flex: 1.3, minHeight: 76, borderRadius: 14, padding: 12, backgroundColor: widgetColors.surface, borderWidth: 1, borderColor: widgetColors.border }}><Text style={{ color: widgetColors.secondaryText, fontSize: 10, fontWeight: '800' }}>今日の言葉</Text><Text numberOfLines={2} style={{ color: widgetColors.primaryText, fontSize: 12, fontWeight: '900', marginTop: 6 }}>私は私のペースで進めばいい</Text></View></View></View></View>;
    }
    if (id === 'focus') return renderPremiumReadOnlyPreview('calendar', true, { initialTab: 'focus', previewMode: false, previewCustomDurationOpen: false });
    if (id === 'recovery') return <View style={{ width: '100%', justifyContent: 'center', paddingVertical: 12, backgroundColor: getThemeTokens(uiDesignMode, chicPalette.id).colors.screenBackground }}>{renderPremiumReadOnlyPreview('recovery')}</View>;
    if (id === 'records') return <View pointerEvents="none" style={{ width: '100%', justifyContent: 'center', paddingVertical: 8 }}><TodayWinStrip tasks={completedCaptureTasks.slice(0, 2)} designMode={uiDesignMode} chicPattern={effectiveChicPattern} chicPalette={chicPalette} onRestore={() => undefined} /><View style={[styles.premiumPreview, { marginTop: 10, padding: 14, minHeight: 0, backgroundColor: getThemeTokens(uiDesignMode, chicPalette.id).colors.surface, borderColor: getThemeTokens(uiDesignMode, chicPalette.id).colors.border }]}><Text style={{ color: getThemeTokens(uiDesignMode, chicPalette.id).colors.primaryText, fontSize: 15, fontWeight: '900' }}>今日できたこと</Text>{completedCaptureTasks.slice(0, 2).map((task) => <View key={task.id} style={{ marginTop: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: getThemeTokens(uiDesignMode, chicPalette.id).colors.border }}><Text style={{ color: getThemeTokens(uiDesignMode, chicPalette.id).colors.primaryText, fontSize: 13, fontWeight: '800' }}>✓ {task.title}</Text><Text style={{ color: getThemeTokens(uiDesignMode, chicPalette.id).colors.secondaryText, fontSize: 11, marginTop: 2 }}>{task.category} ・ 完了</Text></View>)}</View></View>;
    if (id === 'quickTodo') {
      const quickTodoTasks = captureTasks.slice(0, 2).map((task) => ({ ...task, bucket: 'later' as const }));
      return <View pointerEvents="none" style={{ width: '100%', paddingVertical: 8 }}>{renderHomePreview(quickTodoTasks, 'list')}</View>;
    }
    if (id === 'voice') {
      const voiceTheme = getThemeTokens(uiDesignMode, chicPalette.id).colors;
      return <View pointerEvents="none" style={{ width: '100%', padding: 14, borderRadius: 16, backgroundColor: voiceTheme.surface, borderWidth: 1, borderColor: voiceTheme.border }}><Text style={{ color: voiceTheme.secondaryText, fontSize: 11, fontWeight: '800' }}>右上のマイク</Text><View style={{ marginTop: 12, alignItems: 'center' }}><View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: voiceTheme.primaryAccent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: uiDesignMode === 'dark' ? voiceTheme.screenBackground : '#FFFFFF', fontSize: 26 }}>⌕</Text></View><Text style={{ color: voiceTheme.primaryText, fontSize: 13, fontWeight: '900', marginTop: 8 }}>話しかけてください</Text></View><View style={{ marginTop: 14, padding: 11, borderRadius: 11, borderWidth: 1, borderColor: voiceTheme.border }}><Text style={{ color: voiceTheme.primaryText, fontSize: 13, fontWeight: '800' }}>明日の18時に美容院</Text><Text style={{ color: voiceTheme.secondaryText, fontSize: 10, marginTop: 4 }}>予定として整理します</Text></View></View>;
    }
    if (id === 'today') {
      return renderHomePreview(captureTasks);
    }
    if (id === 'customize') return <SettingsScreen
      tasks={captureTasks}
      timeline={displayTimeline}
      now={now}
      dangerousTask={undefined}
      size="medium"
      showCompleted
      completionIcon="✓"
      designMode={uiDesignMode}
      selectedDesignMode={uiDesignMode}
      monoAppearance="auto"
      hapticsEnabled
      chicPalette={chicPalette}
      chicPattern={effectiveChicPattern}
      chicCheckColor={chicCheckColor}
      affirmations={[{ id: 'capture-affirmation', text: '私は、自分のペースで進める', time: '08:30', enabled: true, createdAt: '2026-01-01T00:00:00.000Z' }]}
      affirmationCustomTexts={[]}
      photoTheme={photoTheme}
      travelApps={travelApps}
      widgetSettings={DEFAULT_WIDGET_SETTINGS}
      onSize={() => undefined}
      onWidgetSettings={() => undefined}
      onShowCompleted={() => undefined}
      onCompletionIcon={() => undefined}
      onDesignMode={() => undefined}
      onMonoAppearance={() => undefined}
      onHapticsEnabled={() => undefined}
      onReview={() => undefined}
      onChicPattern={() => undefined}
      onDesignPreview={() => undefined}
      onChicCheckColor={() => undefined}
      onSaveAffirmation={() => undefined}
      onDeleteAffirmation={() => undefined}
      onSaveAffirmationCustomText={() => undefined}
      onDeleteAffirmationCustomText={() => undefined}
      onPickPhotoTheme={() => undefined}
      onAdjustPhotoTheme={() => undefined}
      onClearPhotoTheme={() => undefined}
      onTravelAppsChange={() => undefined}
      templates={[]}
      savedTemplates={[]}
      onAddTemplate={() => undefined}
      onDeleteTemplate={() => undefined}
      onGuide={() => undefined}
      onPremium={() => undefined}
      onDeleteSavedTemplate={() => undefined}
      planTier={planTier}
      captureDesignOnly
      styles={styles}
      helpers={{ colors: themedColors, getThemeTokens: getThemedThemeTokens, getChicPatternVisual, hasPremiumAccess, getChicCheckColor, chicCheckColorChoices, countdownToClock, getUrgencyStatus, getNextBestAction, designModes, completionIcons, summarizePremiumTaskTemplate }}
      components={{ BThemeRibbonDecoration, CThemeRibbonDecoration, ChicPatternDecor, ChicPatternSelector, SettingsDisclosure, NotificationManagerCard }}
    />;
    return undefined;
  };

  const renderGuideCaptureStep = (id: Exclude<OnboardingFeatureId, 'intro'>): React.ReactNode => {
    const previewDate = dateKey(now);
    const guideTasks: Task[] = [
      { id: 'guide-task-1', title: '資料をまとめる', done: false, category: '仕事', priority: '中', scheduledDate: previewDate, scheduledTime: '09:00', bucket: 'now' },
      { id: 'guide-task-2', title: '洗濯をする', done: true, status: 'completed', category: '家事', priority: '中', scheduledDate: previewDate, completedAt: new Date().toISOString(), bucket: 'later' },
      { id: 'guide-task-3', title: 'スーパーに寄る', done: false, category: '家事', priority: '低', scheduledDate: previewDate, bucket: 'waiting' },
    ];
    const guidePlan: DeparturePlan = { id: 'guide-plan', title: '資料提出', destination: '天神○○ビル', date: previewDate, arrival: '14:00', departureTime: '13:15', endAt: '15:00', travelMinutes: 30, preparationMinutes: 15, bufferMinutes: 10, planMode: 'arrival_reverse' };
    const renderTaskForm = (task?: Task) => <View pointerEvents="none" style={[styles.premiumPreview, { minHeight: 460, overflow: 'hidden' }]}><TaskModal visible task={task} templates={['資料をまとめる', 'スーパーに寄る']} savedTemplates={[]} designMode={uiDesignMode} chicPalette={chicPalette} planTier="premium" onPremium={() => undefined} onClose={() => undefined} onSave={() => undefined} styles={styles} helpers={{ getThemeTokens: getThemedThemeTokens, todayInputValue, hasPremiumAccess, dateForReminder, dateKey, formatLiveTime, colors: themedColors, summarizePremiumTaskTemplate }} components={{ CompactNumberSetting }} readOnlyPreview /></View>;
    const renderPlanForm = () => <View pointerEvents="none" style={[styles.premiumPreview, { minHeight: 620, overflow: 'hidden' }]}><DeparturePlanForm plan={guidePlan} plans={[guidePlan]} behaviorEvents={[]} designMode={uiDesignMode} chicPattern={effectiveChicPattern} chicPalette={chicPalette} planTier="premium" onChange={() => undefined} onSubmit={() => undefined} onClose={() => undefined} onPremium={() => undefined} dateKey={dateKey} formatLiveDate={formatLiveDate} formatLiveTime={formatLiveTime} dateForReminder={dateForReminder} getDepartureMoments={getDepartureMoments} getMapSearchTarget={getMapSearchTarget} openMapSearch={() => undefined} travelApps={travelApps} onOpenTravelAppSettings={() => undefined} /></View>;
    let production: React.ReactNode;
    if (id === 'todo') production = renderTaskForm();
    else if (id === 'todoComplete') production = renderOnboardingCaptureStep('today');
    else if (id === 'completedTasks') production = <View pointerEvents="none" style={{ padding: 8 }}><TodayWinStrip tasks={guideTasks} designMode={uiDesignMode} chicPattern={effectiveChicPattern} chicPalette={chicPalette} onRestore={() => undefined} onOpenCompleted={() => undefined} /></View>;
    else if (id === 'taskBuckets') production = renderOnboardingCaptureStep('today');
    else if (id === 'taskDetails') production = renderTaskForm(guideTasks[0]);
    else if (id === 'schedule') production = renderPremiumReadOnlyPreview('calendar', true, { initialTab: 'deadline', previewMode: false, maxHeight: 680 });
    else if (id === 'planRegistration') production = renderPlanForm();
    else if (id === 'calendarImport') production = renderPremiumReadOnlyPreview('calendar');
    else if (id === 'focus') production = renderPremiumReadOnlyPreview('calendar', true, { initialTab: 'focus', previewMode: false, previewCustomDurationOpen: false, maxHeight: 680 });
    else if (id === 'analysis') production = renderPremiumReadOnlyPreview('behavior', true, { analysisInitialTab: 'insights' });
    else if (id === 'routine') production = renderPremiumReadOnlyPreview('behavior', true, { analysisInitialTab: 'routine' });
    else if (id === 'history') production = renderPremiumReadOnlyPreview('history');
    else if (id === 'photoLog') production = renderPremiumReadOnlyPreview('records');
    else if (id === 'voice') production = renderOnboardingCaptureStep('voice');
    else if (id === 'affirmation') production = renderPremiumReadOnlyPreview('affirmation');
    else if (id === 'wish') production = renderWishCapturePreview(false);
    else production = renderPremiumReadOnlyPreview('recovery');
    if (id === 'schedule') {
      return <View style={{ minHeight: 560, position: 'relative' }}><View style={{ height: 560, borderWidth: 1, borderColor: chicPalette.border, borderRadius: 14, overflow: 'hidden' }}>{production}</View><View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: 16 }}><OnboardingHint inline featureId="schedule" designMode={uiDesignMode} chicPalette={chicPalette} onAction={() => undefined} /></View></View>;
    }
    if (id === 'wish') {
      return <View style={{ minHeight: 620, position: 'relative' }}><View style={{ height: 620, borderWidth: 1, borderColor: chicPalette.border, borderRadius: 14, overflow: 'hidden' }}>{production}</View><View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: 16 }}><OnboardingHint inline featureId="wish" designMode={uiDesignMode} chicPalette={chicPalette} onAction={() => undefined} /></View></View>;
    }
    const productionGuideHasAction = id === 'todo' || id === 'planRegistration' || id === 'focus';
    // Keep the real screen visible, but reserve the lower portion of the
    // fixed 9:16 stage for the complete GUIDE card.  This prevents the
    // badge/title/description/CTA from being clipped by the capture frame.
    return <View style={{ minHeight: 560, position: 'relative' }}><View style={{ maxHeight: 360, borderWidth: 1, borderColor: chicPalette.border, borderRadius: 14, overflow: 'hidden' }}>{production}</View><View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: 0 }}><OnboardingHint inline featureId={id} designMode={uiDesignMode} chicPalette={chicPalette} onAction={productionGuideHasAction ? () => undefined : undefined} /></View></View>;
  };

  // Production GUIDE placement is an explicit, stateful tour.  Completion
  // Callbacks from the real screens still mark a feature complete.  Demo
  // transitions are bounded so a target that is slow or unavailable cannot
  // hide the next GUIDE indefinitely.
  const firstRunDemoActive = onboarding.state.firstRunStage === 'demo';
  const activeGuideTour: readonly Exclude<OnboardingFeatureId, 'intro'>[] = firstRunDemoActive
    ? FREE_GUIDE_TOUR
    : planTier === 'premium' ? PREMIUM_GUIDE_TOUR : FREE_GUIDE_TOUR;
  // New users run the Free demo before choosing a design.  Existing users do
  // not have firstRunStage, so the legacy Premium tour remains gated by their
  // completed design selection and is never unexpectedly restarted.
  const premiumTourReady = planTier === 'premium' && onboarding.isCompleted('intro') && onboarding.isCompleted('design');
  const firstIncompleteGuide = onboarding.ready && onboarding.isCompleted('intro') && (firstRunDemoActive || premiumTourReady)
    ? activeGuideTour.find((feature) => !onboarding.isCompleted(feature))
    : undefined;
  // The first-run tour uses an in-memory snapshot so the screens remain
  // meaningful even for a brand-new account.  It is never passed to the
  // persistence callbacks and is discarded when the tour reaches design.
  const guideDemoTasks = useMemo<Task[]>(() => {
    const demoDate = dateKey();
    return [
      { id: 'guide-demo-now', title: '資料をまとめる', done: false, status: 'active', category: '仕事', priority: '高', bucket: 'now', scheduledDate: demoDate },
      { id: 'guide-demo-later', title: 'スーパーに寄る', done: false, status: 'active', category: '家事', priority: '中', bucket: 'later', scheduledDate: demoDate },
      { id: 'guide-demo-complete', title: '朝のメールを確認', done: true, status: 'completed', category: '仕事', priority: '低', bucket: 'now', scheduledDate: demoDate, completedAt: new Date(Date.now() - 3_600_000).toISOString() },
    ];
  }, []);
  const [guideDemoTasksState, setGuideDemoTasksState] = useState<Task[]>([]);
  const guideDemoInitializedRef = React.useRef(false);
  React.useEffect(() => {
    if (firstRunDemoActive) {
      if (!guideDemoInitializedRef.current) {
        guideDemoInitializedRef.current = true;
        setGuideDemoTasksState(guideDemoTasks);
      }
    } else if (guideDemoInitializedRef.current) {
      guideDemoInitializedRef.current = false;
      setGuideDemoTasksState([]);
    }
  }, [firstRunDemoActive, guideDemoTasks]);
  const updateGuideDemoTasks = React.useCallback((updater: (current: Task[]) => Task[]) => {
    setGuideDemoTasksState((current) => {
      const next = updater(current);
      return next;
    });
  }, []);
  const activeGuideDemoTasks = firstRunDemoActive && !guideDemoInitializedRef.current ? guideDemoTasks : guideDemoTasksState;
  const guideDemoPlan: DeparturePlan = { id: 'guide-demo-plan', title: '資料提出', destination: '天神○○ビル', date: dateKey(now), arrival: '18:00', travelMinutes: 30, preparationMinutes: 15, bufferMinutes: 10, planMode: 'arrival_reverse' };
  const guideDemoCalendarOptions = useMemo(() => [
    { id: 'guide-demo-personal-calendar', title: '個人', type: 'local' },
    { id: 'guide-demo-work-calendar', title: '仕事', type: 'local' },
  ] as Calendar.Calendar[], []);
  const guideDemoCalendarEvents = useMemo(() => [
    { id: 'guide-demo-calendar-hospital', calendarId: 'guide-demo-personal-calendar', title: '病院', startDate: `${dateKey(now)}T10:00:00`, endDate: `${dateKey(now)}T11:00:00`, allDay: false },
    { id: 'guide-demo-calendar-meeting', calendarId: 'guide-demo-work-calendar', title: '打ち合わせ', startDate: `${dateKey(now)}T14:00:00`, endDate: `${dateKey(now)}T15:00:00`, allDay: false },
    { id: 'guide-demo-calendar-hair', calendarId: 'guide-demo-personal-calendar', title: '美容院', startDate: `${dateKey(now)}T18:00:00`, endDate: `${dateKey(now)}T19:00:00`, allDay: false },
  ] as Calendar.Event[], [now]);
  const guideDemoWishState: MonthlyWishState = {
    monthlyGoal: '毎日少しでも自分の時間をつくる',
    wishes: [{ id: 'guide-demo-wish', title: '週に1冊、本を読む', completed: false, createdAt: now.toISOString() }],
    actions: [{ id: 'guide-demo-action', wishId: 'guide-demo-wish', title: '寝る前に10分読む', completed: false }],
    review: {},
  };
  const guideDemoAffirmations: Affirmation[] = [{ id: 'guide-demo-affirmation', text: '私は自分のペースで続けられる', time: '09:00', enabled: true, createdAt: now.toISOString() }];
  const productionGuideFeature = pendingGuideFeature ?? currentGuideFeature;

  // Resume an interrupted first-run experience at the design step after a
  // restart.  The persisted stage is optional, so older users are untouched.
  React.useEffect(() => {
    if (!onboarding.ready || onboarding.introVisible) return;
    if (onboarding.state.firstRunStage === 'design' && !onboardingDesignSelectionPending) {
      setOnboardingDesignSelectionPending(true);
      setCurrentGuideFeature(undefined);
      setPendingGuideFeature(undefined);
      setScreen('settings');
    }
  }, [onboarding.introVisible, onboarding.ready, onboarding.state.firstRunStage, onboardingDesignSelectionPending]);

  const navigateToGuideFeature = React.useCallback((feature: Exclude<OnboardingFeatureId, 'intro'>) => {
    setAddOpen(false);
    setEditingTask(null);
    setPlanEditorOpen(false);
    setOpenTodayReview(false);
    if (feature === 'taskDetails') {
      setScreen('home');
      const taskForDetails = firstRunDemoActive
        ? guideDemoTasksState[0] ?? guideDemoTasks[0]
        : tasksRef.current.find((task) => !task.done) ?? tasksRef.current[0];
      if (taskForDetails) setEditingTask(taskForDetails);
      else setAddOpen(true);
      return;
    }
    if (feature === 'schedule') {
      setTimelineInitialTab('deadline');
      setScreen('timeline');
      return;
    }
    if (feature === 'planRegistration') {
      setTimelineInitialTab('departure');
      setScreen('timeline');
      // The first-run tour is a read-only demo.  Keep the guide on the
      // schedule screen instead of opening the production editor, which
      // would hide the guide without providing a demo action to complete.
      if (!firstRunDemoActive) openNewPlanEditor();
      return;
    }
    if (feature === 'focus') {
      setTimelineInitialTab('focus');
      setScreen('timeline');
      return;
    }
    if (feature === 'calendarImport') {
      setTimelineInitialTab('calendar');
      setScreen('timeline');
      return;
    }
    if (feature === 'analysis') {
      setAnalysisInitialTab('records');
      setScreen('analysis');
      return;
    }
    if (feature === 'routine') {
      setAnalysisInitialTab('routine');
      setScreen('analysis');
      return;
    }
    if (feature === 'history') {
      setAnalysisInitialTab('records');
      setScreen('analysis');
      return;
    }
    if (feature === 'wish' || feature === 'affirmation') {
      setScreen('wish');
      return;
    }
    if (feature === 'photoLog') {
      setScreen('home');
      setOpenTodayReview(true);
      return;
    }
    if (feature === 'voice') {
      setScreen('home');
      return;
    }
    if (feature === 'recovery') {
      setScreen('timeline');
      return;
    }
    setScreen('home');
  }, [firstRunDemoActive, guideDemoTasks, guideDemoTasksState, openNewPlanEditor]);

  React.useEffect(() => {
    if (!productionGuideFeature || onboarding.introVisible || onboardingDesignSelectionPending || guideTransitioning) return;
    navigateToGuideFeature(productionGuideFeature);
  }, [guideTransitioning, navigateToGuideFeature, onboarding.introVisible, onboardingDesignSelectionPending, productionGuideFeature]);

  const releaseGuideTransition = React.useCallback(() => {
    setPendingGuideFeature(undefined);
    setGuideTransitioning(false);
    guideTransitioningRef.current = false;
  }, []);

  const advanceGuide = React.useCallback(async (feature: Exclude<OnboardingFeatureId, 'intro'>) => {
    if (guideTransitioningRef.current || guideTransitioning || pendingGuideFeature) return;
    guideTransitioningRef.current = true;
    setGuideTransitioning(true);
    let waitingForTarget = false;
    let completedState: typeof onboarding.state = onboarding.state;
    try {
      if (!onboarding.isCompleted(feature)) completedState = await onboarding.complete(feature);
      const next = activeGuideTour.find((item) => !completedState.completed[item]);
      if (!next) {
        setCurrentGuideFeature(undefined);
        releaseGuideTransition();
        if (onboarding.state.firstRunStage === 'demo') {
          await onboarding.setFirstRunStage('design');
          setOnboardingDesignSelectionPending(true);
          setScreen('settings');
        }
        return;
      }
      waitingForTarget = true;
      setPendingGuideFeature(next);
      navigateToGuideFeature(next);
    } catch {
      // A failed completion or navigation must never leave the app in a
      // permanently locked GUIDE state.
      waitingForTarget = false;
      releaseGuideTransition();
    } finally {
      if (!waitingForTarget) releaseGuideTransition();
    }
  }, [activeGuideTour, guideTransitioning, navigateToGuideFeature, onboarding, pendingGuideFeature, planTier, releaseGuideTransition]);

  React.useEffect(() => {
    if (!onboarding.ready || onboarding.introVisible || onboardingDesignSelectionPending || guideTransitioning || pendingGuideFeature) return;
    if (!currentGuideFeature) {
      if (firstIncompleteGuide) {
        setCurrentGuideFeature(firstIncompleteGuide);
        navigateToGuideFeature(firstIncompleteGuide);
      }
      return;
    }
    if (!activeGuideTour.includes(currentGuideFeature) || onboarding.isCompleted(currentGuideFeature)) {
      void advanceGuide(currentGuideFeature);
    }
  }, [activeGuideTour, advanceGuide, currentGuideFeature, firstIncompleteGuide, guideTransitioning, navigateToGuideFeature, onboarding, onboardingDesignSelectionPending, pendingGuideFeature]);

  React.useEffect(() => {
    if (!pendingGuideFeature) return;
    const nextFeature = pendingGuideFeature;
    let secondFrame = 0;
    const frame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setCurrentGuideFeature(nextFeature);
        releaseGuideTransition();
      });
    });
    const fallback = setTimeout(() => {
      setCurrentGuideFeature(nextFeature);
      releaseGuideTransition();
    }, 1200);
    return () => {
      cancelAnimationFrame(frame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
      clearTimeout(fallback);
    };
  }, [pendingGuideFeature, releaseGuideTransition]);

  const handleHeaderVoice = React.useCallback(() => {
    // During the first-run tour the real header microphone is the GUIDE
    // target. A tap marks that step complete without opening recognition or
    // consuming the Free allowance; the next feature then appears normally.
    if (firstRunDemoActive && productionGuideFeature === 'voice') {
      void advanceGuide('voice');
      return;
    }
    openVoiceInput();
  }, [advanceGuide, firstRunDemoActive, openVoiceInput, productionGuideFeature]);

  /*
   * Target readiness is advisory only.  It can help a screen position a
   * spotlight, but it must never prevent the next GUIDE card from appearing.
  * The two-frame handoff above guarantees that pending/transitioning cannot
  * become a permanent interaction lock.
  */
  const productionGuideAction = productionGuideFeature === 'todo'
    ? () => {
        if (firstRunDemoActive) {
          void advanceGuide('todo');
          return;
        }
        setAddOpen(true);
      }
    : productionGuideFeature === 'taskDetails'
      ? () => {
          if (firstRunDemoActive) {
            void advanceGuide('taskDetails');
            return;
          }
          const firstTask = tasks.find((task) => !task.done) ?? tasks[0];
          if (firstTask) setEditingTask(firstTask);
          else setAddOpen(true);
          void onboarding.complete('taskDetails');
        }
    : productionGuideFeature === 'schedule' || productionGuideFeature === 'planRegistration'
      ? () => {
          if (firstRunDemoActive) {
            void advanceGuide(productionGuideFeature);
            return;
          }
          openNewPlanEditor();
        }
    : productionGuideFeature === 'focus'
        ? () => {
            if (firstRunDemoActive) {
              void advanceGuide('focus');
              return;
            }
            setTimelineInitialTab('focus');
          }
        : productionGuideFeature === 'wish' || productionGuideFeature === 'affirmation'
          ? () => {
              if (firstRunDemoActive) {
                void advanceGuide(productionGuideFeature);
                return;
              }
              openWish();
            }
          : productionGuideFeature === 'photoLog'
            ? () => { if (planTier === 'premium') setOpenTodayReview(true); }
            : undefined;
  const completeTourGuide = React.useCallback((feature: Exclude<OnboardingFeatureId, 'intro'>) => {
    void advanceGuide(feature);
  }, [advanceGuide]);
  const exitGuideTour = React.useCallback(() => {
    if (guideTransitioningRef.current) return;
    guideTransitioningRef.current = true;
    setGuideTransitioning(true);
    const tour = onboarding.state.firstRunStage === 'demo'
      ? FREE_GUIDE_TOUR
      : planTier === 'premium' ? PREMIUM_GUIDE_TOUR : FREE_GUIDE_TOUR;
    void (async () => {
      try {
        for (const feature of tour) {
          if (!onboarding.isCompleted(feature)) await onboarding.complete(feature);
        }
      } finally {
        setCurrentGuideFeature(undefined);
        releaseGuideTransition();
        if (onboarding.state.firstRunStage === 'demo') {
          void onboarding.setFirstRunStage('design');
          setOnboardingDesignSelectionPending(true);
          setScreen('settings');
        }
      }
    })();
  }, [onboarding, planTier, releaseGuideTransition]);
  const guideTargetLabels: Partial<Record<Exclude<OnboardingFeatureId, 'intro'>, string>> = {
    todo: '＋追加', taskDetails: '詳しく設定', taskBuckets: '一覧', todoComplete: '完了チェック', completedTasks: '達成グラフ',
    schedule: 'スケジュール', planRegistration: '予定を登録', focus: '集中', calendarImport: 'カレンダー', analysis: '分析', routine: 'ルーティン', history: '履歴', voice: '右上のマイク',
    wish: '叶えたいこと', affirmation: 'アファメーション', photoLog: '今日の記録', recovery: '立て直し',
  };
  const productionGuideCard = productionGuideFeature && !guideTransitioning ? <OnboardingHint key={productionGuideFeature} inline featureId={productionGuideFeature} designMode={uiDesignMode} chicPalette={chicPalette} targetLabel={guideTargetLabels[productionGuideFeature]} onAction={productionGuideAction} onDismiss={() => completeTourGuide(productionGuideFeature)} onNext={() => completeTourGuide(productionGuideFeature)} onExitTour={exitGuideTour} /> : null;
  const productionGuideOverlay = productionGuideFeature && !guideTransitioning && !planEditorOpen && !openTodayReview && !addOpen && !editingTask && !recoveryTargetPlanId && productionGuideFeature !== 'recovery' ? (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: 78, zIndex: 40 }}>{productionGuideCard}</View>
  ) : null;
  const premiumGuideRecoveryPlan: DeparturePlan = {
    id: 'premium-guide-recovery',
    title: '資料提出',
    destination: '天神○○ビル',
    date: dateKey(now),
    arrival: '18:00',
    travelMinutes: 30,
    preparationMinutes: 15,
    bufferMinutes: 10,
    planMode: 'arrival_reverse',
  };
  const premiumRecoveryGuideVisible = planTier === 'premium' && productionGuideFeature === 'recovery' && !recoveryTargetPlanId;
  const backgroundVeilVisible = (screen === 'home' || screen === 'timeline' || screen === 'wish')
    && ((designMode === 'chic' && effectiveChicPattern !== 'plain') || (designMode === 'photo' && photoThemeEnabled));
  const backgroundVeilOpacity = designMode === 'photo' ? 0.28 : (effectiveChicPattern === 'floral' || effectiveChicPattern === 'floralSoft' || effectiveChicPattern === 'floralSeasonal' || effectiveChicPattern === 'floralDark' ? 0.18 : 0.12);
  const backgroundVeilColor = designMode === 'photo' ? theme.colors.screenBackground : chicPalette.background;

  return (
        <SafeAreaView style={[styles.safe, uiDesignMode === 'minimal' && styles.safeMinimal, uiDesignMode === 'dark' && styles.safeDark, designMode === 'photo' && styles.safePhoto, { backgroundColor: uiDesignMode === 'chic' ? getChicPatternVisual(effectiveChicPattern, chicPalette).background : theme.colors.screenBackground }]}>
      <StatusBar style={uiDesignMode === 'dark' ? 'light' : 'dark'} />
      {photoBackgroundUri && <View pointerEvents="none" style={styles.photoThemeBackgroundWrap}><Image source={{ uri: photoBackgroundUri }} resizeMode="cover" style={styles.photoThemeBackground} /></View>}
      <View style={styles.app}>
        <BThemeRibbonPreload />
        <CThemeRibbonPreload />
        {uiDesignMode === 'chic' && !photoThemeEnabled && <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><ChicPatternDecor pattern={effectiveChicPattern} accent={chicPalette.accent} warm={chicPalette.accentSoft} checkColor={chicCheckColor} /></View>}
        {backgroundVeilVisible && <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: backgroundVeilColor, opacity: backgroundVeilOpacity }]} />}
        {photoTopImageUri && screen !== 'wish' ? <><Header designMode={uiDesignMode} now={now} compact chicPalette={chicPalette} onVoice={handleHeaderVoice} onPremium={planTier === 'premium' ? undefined : () => openPremiumFeature('voice')} /><View style={styles.photoThemeTopImage}><Image source={{ uri: photoTopImageUri }} resizeMode="contain" style={styles.photoThemeTopImageContent} /></View></> : <Header designMode={uiDesignMode} now={now} chicPalette={chicPalette} onVoice={handleHeaderVoice} onPremium={planTier === 'premium' ? undefined : () => openPremiumFeature('voice')} />}
        {completionAffirmation && <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 72, left: 20, right: 20, zIndex: 30, opacity: completionAffirmationOpacity, alignItems: 'center' }}><View style={{ maxWidth: 340, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18, backgroundColor: uiDesignMode === 'dark' ? '#20293A' : uiDesignMode === 'chic' ? chicPalette.cardSurface : '#FFFFFF', borderWidth: 1, borderColor: uiDesignMode === 'dark' ? '#40506A' : uiDesignMode === 'chic' ? chicPalette.border : '#E5E0E5', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}><Text style={{ textAlign: 'center', color: uiDesignMode === 'dark' ? '#F4F7FC' : uiDesignMode === 'chic' ? chicPalette.textPrimary : '#282538', fontSize: 14, fontWeight: '600' }}>{completionAffirmation}</Text></View></Animated.View>}

        <ScrollView contentContainerStyle={[styles.content, screen === 'timeline' && styles.contentTimeline]} keyboardShouldPersistTaps="handled">
          {screen === 'home' && (
            <HomeScreen
              tasks={firstRunDemoActive ? activeGuideDemoTasks : visibleTasks}
              allTasks={firstRunDemoActive ? activeGuideDemoTasks : tasks}
              now={now}
              designMode={uiDesignMode}
              chicPalette={chicPalette}
              completionIcon={completionIcon}
              selectionMode={selectionMode}
              selectedTaskIds={selectedTaskIds}
              onAdd={() => {
                if (firstRunDemoActive && productionGuideFeature === 'todo') {
                  void advanceGuide('todo');
                  return;
                }
                setAddOpen(true);
              }}
              onOpenFocus={() => {
                setTimelineInitialTab('focus');
                navigateWithinApp('timeline');
              }}
              initialTab={productionGuideFeature === 'taskBuckets' ? 'list' : 'now'}
              onOpenSchedule={() => {
                setTimelineInitialTab('departure');
                navigateWithinApp('timeline');
              }}
              onUpdateTaskList={(taskId, items) => {
                if (firstRunDemoActive) {
                  updateGuideDemoTasks((current) => current.map((task) => task.id === taskId ? { ...task, listItems: items } : task));
                  return;
                }
                updateTaskList(taskId, items);
              }}
              onToggle={(id) => {
                if (firstRunDemoActive) {
                  updateGuideDemoTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done, status: !task.done ? 'completed' : 'active', completedAt: !task.done ? new Date().toISOString() : undefined } : task));
                  if (productionGuideFeature === 'todoComplete') void advanceGuide('todoComplete');
                  return;
                }
                const task = tasksRef.current.find((item) => item.id === id);
                completeTaskIds([id]);
                if (task && !task.done) void onboarding.complete('todoComplete');
              }}
              onToggleSubtask={(taskId, subtaskId) => {
                if (firstRunDemoActive) {
                  updateGuideDemoTasks((current) => current.map((task) => task.id === taskId ? { ...task, subtasks: task.subtasks?.map((item) => item.id === subtaskId ? { ...item, done: !item.done } : item) } : task));
                  return;
                }
                toggleSubtask(taskId, subtaskId);
              }}
              onCompleteParent={(taskId) => {
                if (firstRunDemoActive) {
                  updateGuideDemoTasks((current) => current.map((task) => task.id === taskId ? { ...task, done: true, status: 'completed', completedAt: new Date().toISOString(), subtasks: task.subtasks?.map((item) => ({ ...item, done: true })) } : task));
                  if (productionGuideFeature === 'todoComplete') void advanceGuide('todoComplete');
                  return;
                }
                completeParentTask(taskId);
              }}
              onEdit={(task) => {
                setEditingTask(task);
                if (!firstRunDemoActive) void onboarding.complete('taskDetails');
              }}
              onToggleSelection={(id) => setSelectedTaskIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
              onClearSelection={() => setSelectedTaskIds([])}
              onSelectionMode={() => {
                setSelectionMode((current) => !current);
                setSelectedTaskIds([]);
              }}
              onCompleteSelected={() => {
                if (firstRunDemoActive) {
                  updateGuideDemoTasks((current) => current.map((task) => selectedTaskIds.includes(task.id) ? { ...task, done: true, status: 'completed', completedAt: new Date().toISOString(), subtasks: task.subtasks?.map((item) => ({ ...item, done: true })) } : task));
                  if (selectedTaskIds.length > 0 && productionGuideFeature === 'todoComplete') void advanceGuide('todoComplete');
                  setSelectionMode(false);
                  setSelectedTaskIds([]);
                  return;
                }
                const selected = selectedTaskIds.map((id) => tasksRef.current.find((task) => task.id === id)).filter((task): task is Task => Boolean(task));
                const parentIds = selected.filter((task) => !task.done && task.subtasks?.some((item) => !item.done)).map((task) => task.id);
                const regularIds = selected.filter((task) => !parentIds.includes(task.id)).map((task) => task.id);
                parentIds.forEach((id) => completeParentTask(id));
                if (regularIds.length > 0) completeTaskIds(regularIds);
                if (selectedTaskIds.some((id) => !tasksRef.current.find((task) => task.id === id)?.done)) void onboarding.complete('todoComplete');
                setSelectionMode(false);
                setSelectedTaskIds([]);
              }}
              onDelete={(id) => {
                if (firstRunDemoActive) {
                  updateGuideDemoTasks((current) => current.filter((task) => task.id !== id));
                  return;
                }
                deleteTaskById(id);
              }}
              onSkip={(id) => {
                const target = (firstRunDemoActive ? activeGuideDemoTasks : tasksRef.current).find((task) => task.id === id);
                if (!target?.isRoutine) return;
                if (firstRunDemoActive) {
                  updateGuideDemoTasks((current) => current.map((task) => task.id === id ? { ...task, done: false, status: 'skipped', skippedAt: new Date().toISOString() } : task));
                  return;
                }
                skipTaskById(id);
              }}
              onOpenSkipBonusReward={firstRunDemoActive || planTier === 'premium' ? undefined : () => openRewardedPrompt('routineSkipBonus', 'Skip Bonus', '広告を2回見ると、ルーティンのスキップ権を1回分追加できます。')}
              skipBonusAdded={rewardedAccess.routine.skipBonusAdded}
              skipBonusMax={2}
              onDeleteSelected={() => {
                if (firstRunDemoActive) {
                  updateGuideDemoTasks((current) => current.filter((task) => !selectedTaskIds.includes(task.id)));
                  setSelectionMode(false);
                  setSelectedTaskIds([]);
                  return;
                }
                deleteSelectedTasks(selectedTaskIds);
              }}
              onDuplicate={(task) => {
                if (firstRunDemoActive) {
                  const duplicateId = `${task.id}-copy`;
                  updateGuideDemoTasks((current) => [{ ...task, id: duplicateId, title: `${task.title}（コピー）`, done: false, status: 'active', completedAt: undefined }, ...current]);
                  return;
                }
                // 通知は複製せず、複製後にユーザーが改めて設定する。
                // 過去のルーティンIDも引き継がない独立したタスクにする。
                 const duplicateId = `${Date.now()}-${Math.random().toString(16).slice(2)}-copy`;
                 const duplicate = { ...task, id: duplicateId, title: `${task.title}（コピー）`, done: false, status: 'active' as const, skippedAt: undefined, completedAt: undefined, isRoutine: false, routineId: undefined, routineEndedAt: undefined, remindDate: undefined, remindAt: undefined, deadlineNotifyBefore: undefined, nudgeMode: 'once' as NudgeMode, subtasks: task.subtasks?.map((item, index) => ({ ...item, id: `${duplicateId}-subtask-${index}-${Math.random().toString(16).slice(2)}`, done: false, order: index })), listItems: task.listItems?.map((item, index) => ({ ...item, id: `${duplicateId}-list-${index}-${Math.random().toString(16).slice(2)}`, checked: false, order: index })) };
                tasksRef.current = [duplicate, ...tasksRef.current];
                setTasks(tasksRef.current);
              }}
              onSaveTemplate={(task) => {
                if (!firstRunDemoActive) saveTaskAsTemplate(task);
              }}
              onPostpone={(id) => {
                if (firstRunDemoActive) {
                  updateGuideDemoTasks((current) => current.map((task) => task.id === id ? { ...task, scheduledDate: todayInputValue(1), bucket: 'later' } : task));
                  return;
                }
                const task = tasksRef.current.find((item) => item.id === id);
                if (!task) return;
                const tomorrow = todayInputValue(1);
                const updated = { ...task, scheduledDate: tomorrow, remindDate: task.remindAt ? tomorrow : task.remindDate, bucket: 'later' as TaskBucket };
                tasksRef.current = tasksRef.current.map((item) => item.id === id ? updated : item);
                setTasks(tasksRef.current);
                void scheduleAllTaskNotifications(updated);
              }}
              onBucket={(id, bucket) => {
                if (firstRunDemoActive) {
                  updateGuideDemoTasks((current) => current.map((task) => task.id === id ? { ...task, bucket } : task));
                  if (productionGuideFeature === 'taskBuckets') void advanceGuide('taskBuckets');
                  return;
                }
                const task = tasksRef.current.find((item) => item.id === id);
                if (!task) return;
                const updated = { ...task, bucket };
                tasksRef.current = tasksRef.current.map((item) => item.id === id ? updated : item);
                setTasks(tasksRef.current);
                void scheduleAllTaskNotifications(updated);
                if (task.bucket !== bucket) void onboarding.complete('taskBuckets');
              }}
              styles={styles}
              renderTodayWinStrip={(todayTasks, openFocus, toggleTask, openTaskActions, isSelectionMode, selectedIds) => <TodayWinStrip tasks={todayTasks} designMode={uiDesignMode} chicPattern={effectiveChicPattern} chicPalette={chicPalette} onRestore={firstRunDemoActive ? () => undefined : restoreTaskById} onOpenCompleted={() => firstRunDemoActive ? void advanceGuide('completedTasks') : void onboarding.complete('completedTasks')} onOpenFocus={openFocus} onToggleTask={toggleTask} onOpenTaskActions={openTaskActions} selectionMode={isSelectionMode} selectedTaskIds={selectedIds} />}
              todayReviewExists={Boolean((wishMonths[dateKey(now).slice(0, 7)]?.reviews ?? []).some((review) => review.date === dateKey(now)) || wishMonths[dateKey(now).slice(0, 7)]?.review?.date === dateKey(now))}
              onOpenTodayRecord={() => { if (planTier !== 'premium') { openPremiumFeature('records'); return; } setOpenTodayReview(true); }}
              showTodoOnboarding={false}
              onTodoOnboardingAction={() => {
                if (firstRunDemoActive && productionGuideFeature === 'todo') {
                  void advanceGuide('todo');
                  return;
                }
                setAddOpen(true);
              }}
              showTodoCompleteOnboarding={false}
              showCompletedTasksOnboarding={false}
              showTaskBucketsOnboarding={false}
              showTaskDetailsOnboarding={false}
              helpers={{ deadlineLabel, getUrgencyStatus, getLateRiskMessage, dateForReminder, dateKey, formatLiveTime, isCheckChicPattern, todayInputValue, getThemeTokens: getThemedThemeTokens }}
            />
          )}

          {screen === 'wish' && (
            <WishScreen
              designMode={uiDesignMode}
              chicPattern={effectiveChicPattern}
              chicPalette={chicPalette}
              monthLabel={`${now.getFullYear()}年${now.getMonth() + 1}月`}
              state={firstRunDemoActive ? guideDemoWishState : currentWishState}
              wishMonths={firstRunDemoActive ? { [currentWishMonthKey]: guideDemoWishState } : wishMonths}
              onSaveState={firstRunDemoActive ? () => undefined : saveCurrentWishState}
              onCreateTaskFromAction={firstRunDemoActive ? () => undefined : createTaskFromWishAction}
              affirmations={firstRunDemoActive ? guideDemoAffirmations : affirmations}
              affirmationCustomTexts={affirmationCustomTexts}
              planTier={planTier}
              onSaveAffirmation={firstRunDemoActive ? () => undefined : saveAffirmation}
              onDeleteAffirmation={firstRunDemoActive ? () => undefined : deleteAffirmation}
              onSaveAffirmationCustomText={firstRunDemoActive ? () => undefined : saveAffirmationCustomText}
              onDeleteAffirmationCustomText={firstRunDemoActive ? () => undefined : deleteAffirmationCustomText}
              canCreateWish={hasPremiumAccess(planTier, 'wish_planning') || canCreateWish(rewardedAccess)}
              wishRewardProgress={{ current: rewardedAccess.wishCreateProgress, required: 2 }}
              onRequestWishReward={firstRunDemoActive ? undefined : requestWishReward}
              onWishCreated={firstRunDemoActive ? undefined : consumeWishReward}
              canCreateWishAction={hasPremiumAccess(planTier, 'wish_planning')}
              topImageUri={firstRunDemoActive ? undefined : wishTopImageUri}
              onPickTopImage={firstRunDemoActive ? undefined : () => { void pickPhotoTheme('wish'); }}
              initialEditor={firstRunDemoActive ? undefined : voiceWishDraft}
              onPremium={(featureId = 'wish') => { if (!firstRunDemoActive) openPremiumFeature(featureId); }}
            />
          )}

          {screen === 'timeline' && (
            <TimelineScreen
              plan={firstRunDemoActive ? guideDemoPlan : plan}
              plans={firstRunDemoActive ? [guideDemoPlan] : departurePlans}
              departureCheckIns={firstRunDemoActive ? [] : departureCheckIns}
              departurePreparationStatuses={firstRunDemoActive ? {} : departurePreparationStatuses}
              behaviorEvents={firstRunDemoActive ? [] : behaviorEvents}
              tasks={firstRunDemoActive ? activeGuideDemoTasks : tasks}
              now={now}
              designMode={uiDesignMode}
              focusBackgroundUri={focusBackgroundUri}
              chicPattern={effectiveChicPattern}
              chicPalette={chicPalette}
              planTier={planTier}
              completionIcon={completionIcon}
              initialTab={timelineInitialTab}
              previewMode={firstRunDemoActive}
              previewCalendarEvents={firstRunDemoActive ? guideDemoCalendarEvents : undefined}
              previewCalendarOptions={firstRunDemoActive ? guideDemoCalendarOptions : undefined}
              recoveryTargetPlanId={recoveryTargetPlanId}
              onChange={firstRunDemoActive ? () => undefined : setPlan}
              onSchedule={firstRunDemoActive ? () => undefined : saveDeparturePlan}
              planEditorOpen={planEditorOpen}
              onTimeTabChange={setTimelineInitialTab}
              planEditorGuide={productionGuideFeature === 'schedule' || productionGuideFeature === 'planRegistration' ? productionGuideCard : undefined}
              onOpenNewPlan={firstRunDemoActive ? () => { void advanceGuide(productionGuideFeature === 'schedule' ? 'schedule' : 'planRegistration'); } : openNewPlanEditor}
              onClosePlanEditor={closePlanEditor}
              onScheduleUsed={() => {
                if (firstRunDemoActive) {
                  if (productionGuideFeature === 'schedule') void advanceGuide('schedule');
                  return;
                }
                void onboarding.complete('schedule');
              }}
              onImportCalendarEvent={firstRunDemoActive ? () => false : importCalendarEventAsPlan}
              onEdit={(item: DeparturePlan) => { if (!firstRunDemoActive) openPlanEditor(item); }}
              onSharePlan={firstRunDemoActive ? () => undefined : shareDeparturePlan}
              onDelete={firstRunDemoActive ? () => undefined : deleteDeparturePlan}
              onEditTask={(task: Task) => { if (!firstRunDemoActive) setEditingTask(task); }}
              onDeleteTask={firstRunDemoActive ? () => undefined : deleteTaskById}
              onTaskBucketChange={(id: string, bucket: TaskBucket) => {
                if (firstRunDemoActive) return;
                const updated = tasksRef.current.map((item) => item.id === id ? { ...item, bucket } : item);
                tasksRef.current = updated;
                setTasks(updated);
              }}
              onPremium={firstRunDemoActive ? () => undefined : openPremiumFeature}
              onRecovery={firstRunDemoActive ? () => undefined : applyRecovery}
              onRecoveryOpened={(planId: string) => setRecoveryTargetPlanId(planId)}
              recoveryGuide={productionGuideFeature === 'recovery' ? productionGuideCard : undefined}
              onRecoveryClosed={() => setRecoveryTargetPlanId(undefined)}
              onFocusCompleted={firstRunDemoActive ? () => undefined : completeFocusSession}
              onFocusStarted={() => {
                setVoiceFocusRequest(undefined);
                if (firstRunDemoActive) {
                  if (productionGuideFeature === 'focus') void advanceGuide('focus');
                  return;
                }
                void onboarding.complete('focus');
              }}
              onFocusNotificationPermission={firstRunDemoActive ? async () => false : ensureNotifications}
              onFocusRunningChange={setFocusTimerActive}
              focusCustomDurationMinutes={focusCustomDurationMinutes}
              onFocusCustomDurationChange={firstRunDemoActive ? () => undefined : setFocusCustomDurationMinutes}
              focusVoiceRequest={voiceFocusRequest}
              focusTimerActive={focusTimerActive}
              onFocusNavigationBlocked={() => setFocusNavigationNotice(true)}
              onBehaviorEvent={firstRunDemoActive ? () => undefined : recordBehaviorEvent}
              onDeparted={firstRunDemoActive ? () => undefined : markDeparturePlanAsDeparted}
              onPreparationStarted={firstRunDemoActive ? () => undefined : markDeparturePreparationStarted}
              onStill={(planId: string, phase: 'preparation' | 'departure') => {
                if (firstRunDemoActive) return;
                const target = departurePlansRef.current.find((item) => item.id === planId);
                if (target) handleDepartureStill(target, phase);
              }}
              calendarMarks={firstRunDemoActive ? {} : calendarMarks}
              travelApps={firstRunDemoActive ? [] : travelApps}
              onOpenTravelAppSettings={() => setScreen('settings')}
              calendarImportCalendarIds={firstRunDemoActive ? [] : calendarImportCalendarIds}
              calendarImportKnownCalendarIds={firstRunDemoActive ? [] : calendarImportKnownCalendarIds}
              onCalendarImportCalendarIdsChange={firstRunDemoActive ? () => undefined : setCalendarImportCalendarIds}
              onCalendarImportKnownCalendarIdsChange={firstRunDemoActive ? () => undefined : setCalendarImportKnownCalendarIds}
              onSetCalendarMark={firstRunDemoActive ? () => undefined : (date: string, mark?: string) => setCalendarMarks((current) => { const next = { ...current }; if (mark) next[date] = mark; else delete next[date]; return next; })}
              hapticsEnabled={firstRunDemoActive ? false : hapticsEnabled}
              styles={styles}
              helpers={{ getThemeTokens: getThemedThemeTokens, dateKey, planDateKey, hasPremiumAccess, formatLiveDate, formatLiveTime, getDepartureMoments, normalizePlanDate, countdownToDate, dateForReminder, getMapSearchTarget, openMapSearch: firstRunDemoActive ? async () => undefined : openMapSearch, getPlanCountdownAt, colors: themedColors }}
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
               designMode={uiDesignMode}
               selectedDesignMode={designMode}
               monoAppearance={monoAppearance}
               hapticsEnabled={hapticsEnabled}
               chicPattern={effectiveChicPattern}
               chicCheckColor={chicCheckColor}
               chicPalette={chicPalette}
               affirmations={affirmations}
               affirmationCustomTexts={affirmationCustomTexts}
               photoTheme={photoTheme}
               travelApps={travelApps}
              widgetSettings={widgetSettings}
              onPickWidgetPhoto={pickWidgetPhoto}
              onRemoveAffirmationPhoto={(index) => setWidgetSettings((current) => {
                const photos = current.affirmationPhotoUris ?? [];
                const removeIndex = index ?? photos.length - 1;
                return { ...current, affirmationPhotoUris: photos.filter((_, photoIndex) => photoIndex !== removeIndex) };
              })}
              onWidgetGuide={openWidgetGuide}
              onRefreshWidget={refreshWidgetFromSettings}
              onWidgetSectionOpened={openWidgetSection}
              planTier={planTier}
              onSize={setWidgetSize}
              onWidgetSettings={setWidgetSettings}
              onShowCompleted={setShowCompleted}
              onCompletionIcon={setCompletionIcon}
                onDesignMode={(mode) => {
                 // Free users can open the photo settings to preview each entry point;
                 // the individual background/top/focus actions request their own
                 // Rewarded entitlement before persisting an image.
                  if (mode === 'photo' && planTier !== 'premium' && !photoDesignTemporaryAccess) {
                    setDesignPreviewMode('photo');
                    setDesignPreviewPhotoUri(undefined);
                    setDesignPreviewPattern('plain');
                    return;
                  }
                  if (mode === 'minimal' || mode === 'dark') {
                   setDesignMode('minimal');
                   setMonoAppearance(mode === 'dark' ? 'dark' : 'light');
                 } else {
                   setDesignMode(mode);
                 }
                 if (!onboardingDesignSelectionPending) void onboarding.complete('design');
                 if (mode !== 'chic') completeInitialDesignSelection();
               }}
               onMonoAppearance={(appearance) => {
                 setDesignMode('minimal');
                 setMonoAppearance(appearance);
                 if (!onboardingDesignSelectionPending) void onboarding.complete('design');
                 completeInitialDesignSelection();
               }}
               onHapticsEnabled={handleHapticsEnabled}
               onReview={() => void requestAppReview()}
              onChicPattern={(pattern) => {
                const feature = pattern === 'plain' ? undefined : getChicPatternFeatureId(pattern);
                if (feature && !hasPremiumAccess(planTier, feature) && !designCustomizePurchased) { openPremiumFeature(); return; }
                setChicPattern(pattern);
                if (!onboardingDesignSelectionPending) void onboarding.complete('design');
                completeInitialDesignSelection();
              }}
               onDesignPreview={(pattern) => { setDesignPreviewMode('chic'); setDesignPreviewPattern(pattern); }}
               onChicCheckColor={(color) => { setChicCheckColor(color); if (!onboardingDesignSelectionPending) void onboarding.complete('design'); completeInitialDesignSelection(); }}
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
               onTravelAppsChange={setTravelApps}
              templates={taskTemplates}
              savedTemplates={savedTaskTemplates}
              onAddTemplate={(title) => setTaskTemplates((current) => current.includes(title) ? current : [...current, title])}
              onDeleteTemplate={(title) => setTaskTemplates((current) => current.filter((item) => item !== title))}
              onGuide={onboarding.openIntro}
              onPremium={openPremiumFeature}
               onDeleteSavedTemplate={deleteSavedTaskTemplate}
               onOpenCaptureStudio={__DEV__ ? () => setCaptureStudioOpen(true) : undefined}
               designCustomizePurchased={designCustomizePurchased}
               designCustomizePrice={storeKit.designProduct?.displayPrice}
               designCustomizePriceStatus={storeKit.status}
               onOpenDesignCustomize={() => setDesignCustomizeOpen(true)}
               initialAppearanceOpen={onboardingDesignSelectionPending}
                          styles={styles}
              helpers={{ colors: themedColors, getThemeTokens: getThemedThemeTokens, getChicPatternVisual, hasPremiumAccess, getChicCheckColor, chicCheckColorChoices, countdownToClock, getUrgencyStatus, getNextBestAction, designModes, completionIcons, summarizePremiumTaskTemplate }}
              components={{ BThemeRibbonDecoration, CThemeRibbonDecoration, ChicPatternDecor, ChicPatternSelector, SettingsDisclosure, NotificationManagerCard }}
            />
          )}

          {screen === 'analysis' && (
            <AnalysisScreen
              events={firstRunDemoActive ? [] : behaviorEvents}
              tasks={firstRunDemoActive ? activeGuideDemoTasks : tasks}
              designMode={uiDesignMode}
              chicPalette={chicPalette}
              chicPattern={chicPattern}
              PatternDecor={ChicPatternDecor}
              planTier={planTier}
              onPremium={firstRunDemoActive ? () => undefined : openPremiumFeature}
              routineArchives={firstRunDemoActive ? [] : routineArchives}
              onResumeRoutine={(archive) => {
                if (firstRunDemoActive) return;
                const duplicate = tasksRef.current.some((task) => task.isRoutine && (task.title.trim() === archive.title.trim() || (archive.routineId && task.routineId === archive.routineId)));
                if (duplicate) {
                  Alert.alert('同じルーティンがすでにあります', '使用中のルーティンを重複して再開することはできません。');
                  return;
                }
                const template = archive.taskTemplate;
                if (!template) {
                  Alert.alert('ルーティンを再開できません', '引き継げる設定が見つかりません。');
                  return;
                }
                addTask(template.title, template.category, template.priority, template.remindDate, template.remindAt, template.deadlineDate, template.deadlineTime, template.deadlineNotifyBefore, template.navigationEnabled, template.preparationMinutes, template.travelMinutes, template.bufferMinutes, template.repeatRule ?? 'none', template.nudgeMode ?? 'once', dateKey(now), template.scheduledTime, template.endAt, true, template.subtasks ?? [], template.listItems ?? []);
              }}
              onDeleteRoutineArchive={(archive) => { if (firstRunDemoActive) return; Alert.alert('この解除履歴を削除しますか？', '解除履歴を削除すると、この解除歴画面からは確認できなくなります。', [{ text: 'キャンセル', style: 'cancel' }, { text: '削除する', style: 'destructive', onPress: () => setRoutineArchives((current) => current.filter((item) => item.id !== archive.id)) }]); }}
              onAnalysisUsed={(tab) => {
                if (firstRunDemoActive) {
                  const feature = tab === 'routine' ? 'routine' : 'analysis';
                  if (productionGuideFeature === feature) void advanceGuide(feature);
                  return;
                }
                if (tab === 'routine') void onboarding.complete('routine');
                else void onboarding.complete('analysis');
              }}
              initialTab={analysisInitialTab}
              departurePlans={firstRunDemoActive ? [guideDemoPlan] : departurePlans}
              onApplySuggestion={(suggestion) => {
                if (firstRunDemoActive) return;
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
              onRemoveRoutine={(taskId) => { if (firstRunDemoActive) return; Alert.alert('ルーティンから外しますか？', 'タスク自体と完了履歴は残ります。', [{ text: 'キャンセル', style: 'cancel' }, { text: 'ルーティンから外す', style: 'destructive', onPress: () => {
                const target = tasksRef.current.find((task) => task.id === taskId);
                if (!target) return;
                const endedAt = new Date().toISOString();
                const routineId = target.routineId ?? target.id;
                const routine = getRoutineHistories(behaviorEventsRef.current, tasksRef.current).find((item) => item.id === routineId);
                const summary = routine ? buildRoutineInterruptionSummary(behaviorEventsRef.current, tasksRef.current, routine, new Date(endedAt)) : undefined;
                const archive: RoutineArchive = {
                  id: `routine-archive:${routineId}:${endedAt}`,
                  routineId,
                  title: target.title,
                  removedAt: endedAt,
                  streakDays: summary?.longestStreak ?? 0,
                  totalCompletedDays: summary?.totalCompletedDays ?? 0,
                  taskTemplate: { ...target, subtasks: target.subtasks?.map((item) => ({ ...item })), listItems: target.listItems?.map((item) => ({ ...item })) },
                };
                const next = tasksRef.current.map((task) => (task.routineId ?? task.id) === routineId ? { ...task, isRoutine: false, routineEndedAt: endedAt } : task);
                tasksRef.current = next;
                setTasks(next);
                setRoutineArchives((current) => pruneRoutineArchives([...current.filter((item) => item.routineId !== routineId), archive]));
                recordBehaviorEvent(createRoutineDeactivatedBehaviorEvent({ routineId, routineTitle: target.title, taskId: target.id, occurredAt: new Date(endedAt), targetDate: dateKey(endedAt) }));
              } }]); }}
              recordContent={<HistoryScreen openDailyReview={openTodayReview} initialDate={dateKey(now)} tasks={firstRunDemoActive ? activeGuideDemoTasks : tasks} wishMonths={firstRunDemoActive ? { [currentWishMonthKey]: guideDemoWishState } : wishMonths} calendarMarks={firstRunDemoActive ? {} : calendarMarks} onSetCalendarMark={firstRunDemoActive ? () => undefined : (date, mark) => setCalendarMarks((current) => { const next = { ...current }; if (mark) next[date] = mark; else delete next[date]; return next; })} recoveryHistory={firstRunDemoActive ? [] : recoveryHistory} focusSessions={firstRunDemoActive ? [] : focusSessions} departureCheckIns={firstRunDemoActive ? [] : departureCheckIns} departurePlans={firstRunDemoActive ? [guideDemoPlan] : departurePlans} behaviorEvents={firstRunDemoActive ? [] : behaviorEvents} completionIcon={completionIcon} designMode={uiDesignMode} chicPattern={effectiveChicPattern} chicPalette={chicPalette} planTier={planTier} onPremium={firstRunDemoActive ? () => undefined : openPremiumFeature} onSaveTemplate={firstRunDemoActive ? () => undefined : saveTaskAsTemplate} onRestore={firstRunDemoActive ? () => undefined : (id) => { void onboarding.complete('history'); restoreTaskById(id); }} onSaveDailyReview={firstRunDemoActive ? () => undefined : saveDailyReview} onSaveMonthlyReflectionCard={firstRunDemoActive ? () => undefined : saveMonthlyReflectionCard} onUpdateReview={firstRunDemoActive ? () => undefined : updateWishReview} onDeleteReview={firstRunDemoActive ? () => undefined : deleteWishReview} styles={styles} helpers={{ dateKey, formatLiveTime, getThemeTokens: getThemedThemeTokens }} components={{ AchievementVessel, CalendarMarkPicker }} />}
            />
          )}
        </ScrollView>

        {productionGuideOverlay}

        <BottomNav screen={screen} designMode={uiDesignMode} chicPalette={chicPalette} onChange={navigateWithinApp} />
      </View>

      <Modal visible={openTodayReview && planTier === 'premium'} transparent animationType="slide" onRequestClose={() => setOpenTodayReview(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpenTodayReview(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, maxHeight: '92%' }]} onPress={(event) => event.stopPropagation()}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}><Pressable onPress={() => setOpenTodayReview(false)}><Text style={{ color: theme.colors.primaryAccent, fontSize: 13, fontWeight: '800' }}>閉じる</Text></Pressable></View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <HistoryScreen dailyReviewOnly openDailyReview={openTodayReview} initialDate={dateKey(now)} tasks={tasks} wishMonths={wishMonths} calendarMarks={calendarMarks} onSetCalendarMark={(date, mark) => setCalendarMarks((current) => { const next = { ...current }; if (mark) next[date] = mark; else delete next[date]; return next; })} recoveryHistory={recoveryHistory} focusSessions={focusSessions} departureCheckIns={departureCheckIns} departurePlans={departurePlans} behaviorEvents={behaviorEvents} completionIcon={completionIcon} designMode={uiDesignMode} chicPattern={effectiveChicPattern} chicPalette={chicPalette} planTier={planTier} onPremium={openPremiumFeature} onSaveTemplate={saveTaskAsTemplate} onRestore={restoreTaskById} onSaveDailyReview={saveDailyReview} onSaveMonthlyReflectionCard={saveMonthlyReflectionCard} onUpdateReview={updateWishReview} onDeleteReview={deleteWishReview} guideOverlay={productionGuideFeature === 'photoLog' ? productionGuideCard : undefined} styles={styles} helpers={{ dateKey, formatLiveTime, getThemeTokens: getThemedThemeTokens }} components={{ AchievementVessel, CalendarMarkPicker }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {premiumRecoveryGuideVisible && <RecoveryModal
        visible
        plan={premiumGuideRecoveryPlan}
        now={now}
        designMode={uiDesignMode}
        styles={styles}
        travelApps={travelApps}
        planTier="premium"
        chicPalette={chicPalette}
        onOpenTravelAppSettings={() => undefined}
        onPremium={() => undefined}
        onClose={() => completeTourGuide('recovery')}
        onApply={() => undefined}
        readOnly
        guideOverlay={productionGuideCard}
      />}

      {rewardedPrompt && <RewardedAccessModal
        visible
        title={rewardedPrompt.title}
        description={rewardedPrompt.description}
        current={getRewardedPromptProgress(rewardedPrompt.featureId).current}
        required={getRewardedPromptProgress(rewardedPrompt.featureId).required}
        designMode={uiDesignMode}
        chicPalette={chicPalette}
        onReward={handleRewardedPromptReward}
        onClose={() => { rewardedPromptCompletionRef.current = undefined; setRewardedPrompt(null); }}
        onPremium={() => { setRewardedPrompt(null); openPremiumFeature(); }}
      />}

      <Modal visible={focusNavigationNotice} transparent animationType="fade" onRequestClose={() => setFocusNavigationNotice(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFocusNavigationNotice(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.colors.primaryText }]}>{FOCUS_NAVIGATION_GUARD_COPY.title}</Text>
            <Text style={[styles.emptyCopy, { color: theme.colors.secondaryText }]}>{FOCUS_NAVIGATION_GUARD_COPY.message}</Text>
            <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryAccent }]} onPress={() => setFocusNavigationNotice(false)}><Text style={[styles.primaryButtonText, { color: uiDesignMode === 'chic' && chicPalette ? chicPalette.onAccent : uiDesignMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF' }]}>{FOCUS_NAVIGATION_GUARD_COPY.confirm}</Text></Pressable>
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

      {addOpen && <TaskModal visible templates={taskTemplates} savedTemplates={savedTaskTemplates} designMode={uiDesignMode} chicPalette={chicPalette} planTier={planTier} onPremium={firstRunDemoActive ? () => undefined : openPremiumFeature} onClose={() => { setAddOpen(false); setVoiceTaskDraft(undefined); }} onOpenVoice={openVoiceInput} onOpenBulkAdd={() => { setAddOpen(false); setBulkAddOpen(true); }} onSave={firstRunDemoActive ? () => undefined : addTask} initialDraft={firstRunDemoActive ? undefined : voiceTaskDraft} readOnlyPreview={firstRunDemoActive} guideOverlay={productionGuideFeature === 'taskDetails' ? productionGuideCard : undefined} styles={styles} helpers={{ getThemeTokens: getThemedThemeTokens, todayInputValue, hasPremiumAccess, dateForReminder, dateKey, formatLiveTime, colors: themedColors, summarizePremiumTaskTemplate }} components={{ CompactNumberSetting }} />}
      <BulkTaskModal visible={bulkAddOpen} designMode={uiDesignMode} chicPalette={chicPalette} styles={styles} today={todayInputValue()} onClose={() => setBulkAddOpen(false)} onSave={firstRunDemoActive ? () => undefined : addBulkTasks} />
      {editingTask !== null && <TaskModal
        visible
        task={editingTask}
        templates={taskTemplates}
        savedTemplates={savedTaskTemplates}
        designMode={uiDesignMode}
        chicPalette={chicPalette}
        planTier={planTier}
        onPremium={firstRunDemoActive ? () => undefined : openPremiumFeature}
        onClose={() => setEditingTask(null)}
        onOpenVoice={openVoiceInput}
        onSave={firstRunDemoActive ? () => undefined : updateTask}
        readOnlyPreview={firstRunDemoActive}
        guideOverlay={productionGuideFeature === 'taskDetails' ? productionGuideCard : undefined}
        styles={styles}
        helpers={{ getThemeTokens: getThemedThemeTokens, todayInputValue, hasPremiumAccess, dateForReminder, dateKey, formatLiveTime, colors: themedColors, summarizePremiumTaskTemplate }}
        components={{ CompactNumberSetting }}
      />}
      <PremiumModal visible={premiumOpen} initialFeatureId={premiumTargetFeature} designMode={uiDesignMode} chicPalette={chicPalette} planTier={planTier} isDevelopment={__DEV__} onMockPlanTier={handleMockPlanTier} onClose={() => setPremiumOpen(false)} styles={styles} helpers={{ getThemeTokens: getThemedThemeTokens }} renderReadOnlyPreview={renderPremiumReadOnlyPreview} products={storeKit.products} productStatus={storeKit.status} purchaseError={storeKit.errorMessage} onPurchasePlan={storeKit.purchasePremium} onRestorePurchase={() => { void restorePremiumPurchase(); }} />
      <VoiceUsageLimitModal
        visible={voiceUsageLimitOpen}
        designMode={uiDesignMode}
        chicPalette={chicPalette}
        canWatchReward={remainingVoiceRewards(voiceUsage, dateKey()) > 0}
        onReward={async () => {
          const earned = await grantVoiceReward();
          if (earned) {
            setVoiceUsageLimitOpen(false);
            setVoiceOpen(true);
          }
          return earned;
        }}
        onPremium={() => { setVoiceUsageLimitOpen(false); openPremiumFeature('voice'); }}
        onClose={() => setVoiceUsageLimitOpen(false)}
      />
      <VoiceInputModal visible={voiceOpen} autoStart={voiceAutoStart} designMode={uiDesignMode} chicPalette={chicPalette} dateKey={dateKey} onClose={() => { setVoiceAutoStart(false); setVoiceOpen(false); }} onRoute={handleVoiceRoute} hapticsEnabled={hapticsEnabled} isPremium={planTier === 'premium'} remainingUses={remainingVoiceUses(voiceUsage, dateKey())} onRecognitionAccepted={consumeVoiceInput} />
      <DesignCustomizeModal visible={designCustomizeOpen} designMode={uiDesignMode} chicPalette={chicPalette} purchased={designCustomizePurchased || storeDesignCustomizeAccess} localizedPrice={storeKit.designProduct?.displayPrice} purchaseError={storeKit.errorMessage} isDevelopment={__DEV__} onPurchase={purchaseDesignCustomize} onRestore={restoreDesignCustomizePurchase} onPremium={() => { setDesignCustomizeOpen(false); openPremiumFeature('photo_design'); }} onClose={() => setDesignCustomizeOpen(false)} />
      {__DEV__ && <OnboardingCaptureStudio visible={captureStudioOpen} onClose={() => setCaptureStudioOpen(false)} renderStep={renderOnboardingCaptureStep} renderGuideStep={renderGuideCaptureStep} renderPremiumStep={renderPremiumReadOnlyPreview} colors={{ background: theme.colors.screenBackground, surface: theme.colors.surface, border: theme.colors.border, text: theme.colors.primaryText, muted: theme.colors.secondaryText, accent: theme.colors.primaryAccent, onAccent: uiDesignMode === 'chic' && chicPalette ? chicPalette.onAccent : uiDesignMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF' }} />}
      <DesignPreviewModal visible={Boolean(designPreviewPattern)} initialPattern={designPreviewPattern} initialMode={designPreviewMode} chicCheckColor={chicCheckColor} planTier={planTier} photoUri={designPreviewPhotoUri} onPickPhoto={() => void pickPhotoForDesignPreview()} onClose={() => { setDesignPreviewPattern(undefined); setDesignPreviewPhotoUri(undefined); setDesignPreviewMode('chic'); }} onTrial={(mode, pattern) => {
        if (mode === 'chic' && pattern && canStartPremiumDesignTrial(rewardedAccess)) {
          startDesignTrial(pattern);
          completeInitialDesignSelection();
          return;
        }
        if (mode === 'photo' && designPreviewPhotoUri && canStartPremiumDesignTrial(rewardedAccess)) {
          startPhotoDesignTrial();
          completeInitialDesignSelection();
          return;
        }
        setDesignPreviewPattern(undefined);
        setDesignTrialNoticeOpen(true);
      }} onUse={(mode, pattern) => {
        if (mode === 'photo') {
          if (!designPreviewPhotoUri) { void pickPhotoForDesignPreview(); return; }
          if (planTier === 'premium' || designCustomizePurchased || activeDesignTrialId === 'photo' || isPremiumDesignUnlocked(rewardedAccess, now)) {
            applyPhotoDesign();
            completeInitialDesignSelection();
            return;
          }
          if (canStartPremiumDesignTrial(rewardedAccess)) {
            setDesignTrialNoticeOpen(true);
            return;
          }
          pendingDesignApplyRef.current = () => {
            applyPhotoDesign();
            completeInitialDesignSelection();
          };
          setDesignPreviewPattern(undefined);
          setDesignTrialNoticeOpen(true);
          return;
        }
        if (mode === 'minimal' || mode === 'dark') {
          setDesignMode('minimal');
          setMonoAppearance(mode === 'dark' ? 'dark' : 'light');
          setDesignPreviewPattern(undefined);
          if (!onboardingDesignSelectionPending) void onboarding.complete('design');
          completeInitialDesignSelection();
          return;
        }
        if (pattern === 'plain') {
          setDesignMode('chic');
          setChicPattern('plain');
          setDesignPreviewPattern(undefined);
          if (!onboardingDesignSelectionPending) void onboarding.complete('design');
          completeInitialDesignSelection();
          return;
        }
        if (pattern) {
          const hasPatternAccess = planTier === 'premium' || designCustomizePurchased || isPremiumDesignUnlocked(rewardedAccess, now) || isPremiumDesignTrialActive(rewardedAccess, now);
          if (!hasPatternAccess) {
            setDesignPreviewPattern(undefined);
            setDesignTrialNoticeOpen(true);
            return;
          }
          setDesignMode('chic');
          setChicPattern(pattern);
          setDesignPreviewPattern(undefined);
          if (!onboardingDesignSelectionPending) void onboarding.complete('design');
          completeInitialDesignSelection();
        }
      }} />
      <DesignTrialExpiredModal visible={designTrialNoticeOpen} designMode={uiDesignMode} chicPalette={chicPalette} onClose={() => { pendingDesignApplyRef.current = undefined; setDesignTrialNoticeOpen(false); }} onPremium={() => { pendingDesignApplyRef.current = undefined; setDesignTrialNoticeOpen(false); openPremiumFeature('photo_design'); }} onReward={() => void requestDesignReward()} />
      <TopImageCropModal visible={Boolean(pendingTopPhoto)} uri={pendingTopPhoto?.originalUri} sourceWidth={pendingTopPhoto?.sourceWidth ?? 1} sourceHeight={pendingTopPhoto?.sourceHeight ?? 1} initialRect={pendingTopPhoto?.cropRect} styles={styles} onCancel={() => setPendingTopPhoto(undefined)} onReselect={() => { if (pendingTopPhoto) void pickPhotoTheme(pendingTopPhoto.target); }} onUse={(cropRect) => { void applyPendingTopPhoto(cropRect); }} />
      <OnboardingCarousel
  visible={
    onboarding.ready &&
    onboarding.introVisible
  }
  onDismiss={
    onboarding.isCompleted('intro')
      ? onboarding.closeIntro
      : () => {
          void onboarding.finishIntro();
      }
  }
  finalActionLabel="Rhythmを体験する"
  designMode={uiDesignMode}
  chicPalette={chicPalette}
  onFinalAction={() => {
    if (onboarding.isCompleted('intro')) {
      onboarding.closeIntro();
      return;
    }
    void onboarding.finishIntro();
  }}
  renderStep={renderOnboardingCaptureStep}
/>
      <OnboardingCarousel
        visible={widgetGuideVisible}
        onDismiss={closeWidgetGuide}
        onFinalAction={closeWidgetGuide}
        finalActionLabel="閉じる"
        showSkip={false}
        cards={WIDGET_GUIDE_CARDS}
        renderStep={renderOnboardingCaptureStep}
        designMode={uiDesignMode}
        chicPalette={chicPalette}
      />
    </SafeAreaView>
  );
}

type DesignPreviewMode = 'minimal' | 'dark' | 'chic' | 'photo';

function DesignPreviewModal({ visible, initialPattern, initialMode = 'chic', chicCheckColor, planTier, photoUri, onPickPhoto, onClose, onUse, onTrial }: { visible: boolean; initialPattern?: ChicPattern; initialMode?: DesignPreviewMode; chicCheckColor: ChicCheckColor; planTier: PlanTier; photoUri?: string; onPickPhoto: () => void; onClose: () => void; onUse: (mode: DesignPreviewMode, pattern?: ChicPattern) => void; onTrial?: (mode: DesignPreviewMode, pattern?: ChicPattern) => void }) {
  const [mode, setMode] = useState<DesignPreviewMode>('chic');
  const [pattern, setPattern] = useState<ChicPattern>(initialPattern ?? 'plain');
  const [floralSoftPreviewStatus, setFloralSoftPreviewStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setPattern(initialPattern ?? 'plain');
    }
  }, [initialMode, initialPattern, visible]);
  const isFreeFloralSoftPreview = planTier !== 'premium' && mode === 'chic' && pattern === 'floralSoft';
  const isLockedPremiumPattern = planTier !== 'premium' && mode === 'chic' && pattern !== 'plain';
  useEffect(() => {
    if (!visible || !isFreeFloralSoftPreview) {
      setFloralSoftPreviewStatus('idle');
      return;
    }
    setFloralSoftPreviewStatus('loading');
    const timeout = setTimeout(() => {
      setFloralSoftPreviewStatus((current) => current === 'loaded' ? current : 'error');
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isFreeFloralSoftPreview, visible]);
  const palette = getDesignCheckThemeTokens(chicCheckColor);
  const previewVisual = getChicPatternVisual(pattern, palette);
  const previewTokens = mode === 'chic'
    ? getDesignPatternThemeTokens(pattern, chicCheckColor)
    : undefined;
  const uiPreview = mode === 'chic' && previewTokens
    ? { background: previewTokens.background, surface: previewTokens.cardSurface, soft: previewTokens.accentSoft, border: previewTokens.border, text: previewTokens.textPrimary, muted: previewTokens.textSecondary, accent: previewTokens.accent, accentStrong: previewTokens.accentStrong, onAccent: previewTokens.onAccent }
    : (() => { const colors = getThemeTokens(mode).colors; return { background: colors.screenBackground, surface: colors.surface, soft: colors.softAccent, border: colors.border, text: colors.primaryText, muted: colors.secondaryText, accent: colors.primaryAccent, accentStrong: colors.primaryAccent, onAccent: mode === 'dark' ? colors.screenBackground : '#FFFFFF' }; })();
  const previewPatterns: { id: ChicPattern; label: string }[] = [
    { id: 'plain', label: 'プレーン' },
    { id: 'floral', label: designFloralAssets.floral.label },
    { id: 'floralSoft', label: designFloralAssets.floralSoft.label },
    { id: 'floralSeasonal', label: designFloralAssets.floralSeasonal.label },
    { id: 'dot', label: 'ドット' },
    { id: 'checkLavenderSatin', label: 'ギンガム1' },
    { id: 'checkBeigeNoir', label: 'ギンガム2' },
    { id: 'checkMauveFrame', label: 'ギンガム3' },
  ];
  if (!visible) return null;
  return <>
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={designPreviewStyles.backdrop} onPress={onClose}>
      <Pressable style={[designPreviewStyles.sheet, { backgroundColor: uiPreview.surface, borderColor: uiPreview.border }]} onPress={(event) => event.stopPropagation()}>
        <View style={designPreviewStyles.header}><View><Text style={[designPreviewStyles.eyebrow, { color: uiPreview.accent }]}>DESIGN PREVIEW</Text><Text style={[designPreviewStyles.title, { color: uiPreview.text }]}>見た目を試してみよう</Text></View><Pressable onPress={onClose} hitSlop={10}><Text style={[designPreviewStyles.close, { color: uiPreview.muted }]}>×</Text></Pressable></View>
        <Text style={[designPreviewStyles.copy, { color: uiPreview.muted }]}>実際のRhythm画面で、Mono・Design・Photoの見え方を確認できます。</Text>
        <View style={designPreviewStyles.modeRow}>
          {([{ id: 'minimal', label: 'Mono Light' }, { id: 'dark', label: 'Mono Dark' }, { id: 'chic', label: 'Design' }, { id: 'photo', label: 'Photo' }] as { id: DesignPreviewMode; label: string }[]).map((item) => <Pressable key={item.id} style={[designPreviewStyles.modeChip, { borderColor: uiPreview.border }, mode === item.id && { borderColor: uiPreview.accent, backgroundColor: uiPreview.soft }]} onPress={() => setMode(item.id)}><Text style={[designPreviewStyles.modeChipText, { color: uiPreview.muted }, mode === item.id && { color: uiPreview.accentStrong }]}>{item.label}</Text></Pressable>)}
        </View>
        {mode === 'chic' && <View style={designPreviewStyles.patternRow}>{previewPatterns.map((item) => <Pressable key={item.id} style={[designPreviewStyles.patternChip, pattern === item.id && { borderColor: palette.accent, backgroundColor: palette.accentSoft }]} onPress={() => setPattern(item.id)}><View style={[designPreviewStyles.patternDot, { backgroundColor: item.id === 'plain' ? palette.accent : getChicPatternVisual(item.id, palette).accent }]} /><Text numberOfLines={1} style={[designPreviewStyles.patternText, pattern === item.id && { color: palette.accentStrong }]}>{item.label}</Text></Pressable>)}</View>}
        <View style={[designPreviewStyles.preview, { backgroundColor: mode === 'photo' ? '#202020' : uiPreview.background, borderColor: uiPreview.border }]}>
          {isFreeFloralSoftPreview ? <View style={designPreviewStyles.floralSoftPreviewCard}>
            {floralSoftPreviewStatus !== 'loaded' && <View style={[StyleSheet.absoluteFillObject, designPreviewStyles.floralSoftPreviewFallback, { backgroundColor: uiPreview.soft }]}>{floralSoftPreviewStatus === 'error' ? <Text style={[designPreviewStyles.floralSoftPreviewError, { color: uiPreview.muted }]}>プレビューを表示できませんでした</Text> : <ActivityIndicator color={uiPreview.accent} />}</View>}
            <Image source={designFloralAssets.floralSoft.previewSource ?? designFloralAssets.floralSoft.source} resizeMode="contain" onLoadStart={() => setFloralSoftPreviewStatus('loading')} onLoad={() => setFloralSoftPreviewStatus('loaded')} onError={() => setFloralSoftPreviewStatus('error')} style={[designPreviewStyles.floralSoftPreviewImage, floralSoftPreviewStatus !== 'loaded' && { opacity: 0 }]} />
            <View style={[designPreviewStyles.floralSoftPreviewNotice, { backgroundColor: uiPreview.surface, borderTopColor: uiPreview.border }]}><Text style={[designPreviewStyles.floralSoftPreviewName, { color: uiPreview.text }]}>花柄2</Text><Text style={[designPreviewStyles.floralSoftPreviewPremium, { color: uiPreview.accent }]}>Premium限定デザイン</Text><Text style={[designPreviewStyles.floralSoftPreviewCopy, { color: uiPreview.muted }]}>このデザインを使うにはPremium登録が必要です</Text></View>
          </View> : <>
            {mode === 'chic' && <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><ChicPatternDecor pattern={pattern} accent={previewVisual.accent} warm={previewVisual.warm} checkColor={chicCheckColor} preview previewTopCrop={pattern === 'floralSoft'} /></View>}
          {mode === 'photo' && photoUri ? <Image source={{ uri: photoUri }} resizeMode="cover" style={designPreviewStyles.photoBackground} /> : null}
          <TodayWinStrip
            tasks={[]}
            designMode={mode === 'dark' ? 'dark' : mode === 'chic' ? 'chic' : 'minimal'}
            chicPattern={pattern}
            chicPalette={palette}
            onRestore={() => undefined}
          />
          {mode === 'photo' && !photoUri && <Text style={designPreviewStyles.photoHint}>写真を選ぶと、ここに試着表示されます。選択だけでは保存されません。</Text>}
          </>}
        </View>
        {mode === 'photo' && <Pressable style={[designPreviewStyles.secondaryButton, { borderColor: uiPreview.border, backgroundColor: uiPreview.surface }]} onPress={onPickPhoto}><Text style={[designPreviewStyles.secondaryButtonText, { color: uiPreview.accent }]}>{photoUri ? '写真を選び直す' : '写真で試す'}</Text></Pressable>}
        {isLockedPremiumPattern && <Text style={[designPreviewStyles.trialHint, { color: uiPreview.muted }]}>試着だけではお試し時間は開始されません。</Text>}
        <View style={designPreviewStyles.actions}><Pressable style={[designPreviewStyles.secondaryButton, { borderColor: uiPreview.border, backgroundColor: uiPreview.surface }]} onPress={onClose}><Text style={[designPreviewStyles.secondaryButtonText, { color: uiPreview.accent }]} >閉じる</Text></Pressable><Pressable style={[designPreviewStyles.primaryButton, { backgroundColor: uiPreview.accent }]} onPress={() => { if (mode === 'photo' && !photoUri) { onPickPhoto(); return; } if (isLockedPremiumPattern) { onTrial?.(mode, pattern); return; } onUse(mode, mode === 'chic' ? pattern : undefined); }}><Text style={[designPreviewStyles.primaryButtonText, { color: uiPreview.onAccent }]}>{mode === 'photo' ? (photoUri ? 'この写真を使う' : '写真で試す') : isLockedPremiumPattern ? '24時間無料で使ってみる' : 'このデザインを使う'}</Text></Pressable></View>
      </Pressable>
    </Pressable>
    </Modal>
  </>;
}

function DesignTrialExpiredModal({ visible, designMode, chicPalette, onClose, onPremium, onReward }: { visible: boolean; designMode: DesignMode; chicPalette?: ChicThemePalette; onClose: () => void; onPremium: () => void; onReward: () => void }) {
  const colors = chicPalette && designMode === 'chic' ? { surface: chicPalette.cardSurface, border: chicPalette.border, text: chicPalette.textPrimary, muted: chicPalette.textSecondary, accent: chicPalette.accent, onAccent: chicPalette.onAccent } : (() => { const theme = getThemeTokens(designMode).colors; return { surface: theme.surface, border: theme.border, text: theme.primaryText, muted: theme.secondaryText, accent: theme.primaryAccent, onAccent: designMode === 'dark' ? theme.screenBackground : '#FFFFFF' }; })();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={designPreviewStyles.backdrop} onPress={onClose}><Pressable style={[designPreviewStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={(event) => event.stopPropagation()}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={designPreviewStyles.trialSheetContent}><Text style={[designPreviewStyles.eyebrow, { color: colors.accent }]}>DESIGN TRIAL</Text><Text style={[designPreviewStyles.title, { color: colors.text }]}>デザイン体験が終了しました</Text><Text style={[designPreviewStyles.copy, { color: colors.muted }]}>広告を1回確認すると12時間使えます。Premiumなら期限なしで使い続けられます。無料デザインでそのまま続けることもできます。</Text><Pressable style={[designPreviewStyles.primaryButton, designPreviewStyles.trialActionButton, { backgroundColor: colors.accent }]} onPress={onReward}><Text style={[designPreviewStyles.primaryButtonText, { color: colors.onAccent }]}>広告を見て取得（12時間）</Text></Pressable><Pressable style={[designPreviewStyles.secondaryButton, designPreviewStyles.trialActionButton, { borderColor: colors.border }]} onPress={onPremium}><Text style={[designPreviewStyles.secondaryButtonText, { color: colors.accent }]}>Premiumで使い続ける</Text></Pressable><Pressable style={designPreviewStyles.textButton} onPress={onClose}><Text style={[designPreviewStyles.textButtonText, { color: colors.muted }]}>無料デザインで続ける</Text></Pressable></ScrollView></Pressable></Pressable></Modal>;
}

const designPreviewStyles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,24,28,0.28)', paddingHorizontal: 12, paddingBottom: 14 },
  sheet: { width: '100%', maxWidth: 520, alignSelf: 'center', maxHeight: '92%', borderRadius: 22, backgroundColor: '#FFFFFF', padding: 18 },
  trialSheetContent: { paddingBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: '#7A6C86', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#282538', fontSize: 21, fontWeight: '900', marginTop: 5 },
  close: { color: '#777285', fontSize: 26, lineHeight: 26 },
  copy: { color: '#777285', fontSize: 12, lineHeight: 18, marginTop: 8 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  modeChip: { borderWidth: 1, borderColor: '#DDD7E3', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  modeChipActive: {},
  modeChipText: { color: '#777285', fontSize: 10, fontWeight: '800' },
  modeChipTextActive: {},
  patternRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  patternChip: { width: '31.5%', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E4DFE3', borderRadius: 8, paddingHorizontal: 5 },
  patternDot: { width: 10, height: 10, borderRadius: 5 },
  patternText: { flex: 1, color: '#777285', fontSize: 9, fontWeight: '800' },
  preview: { minHeight: 190, borderRadius: 16, marginTop: 14, padding: 18, overflow: 'hidden', justifyContent: 'center' },
  floralSoftPreviewCard: { width: '100%', minHeight: 260, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFDFD', justifyContent: 'center' },
  floralSoftPreviewImage: { width: '100%', height: 190 },
  floralSoftPreviewFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F0EB' },
  floralSoftPreviewNotice: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(255,253,253,0.96)' },
  floralSoftPreviewName: { color: '#443E39', fontSize: 16, fontWeight: '900' },
  floralSoftPreviewPremium: { fontSize: 12, fontWeight: '900', marginTop: 2 },
  floralSoftPreviewCopy: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  floralSoftPreviewError: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  photoBackground: { ...StyleSheet.absoluteFillObject, opacity: 0.7 },
  photoHint: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  primaryButton: { minHeight: 46, flex: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 },
  trialActionButton: { flex: 0, width: '100%' },
  trialHint: { fontSize: 11, lineHeight: 16, marginTop: 8, textAlign: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  secondaryButton: { minHeight: 46, flex: 1, borderRadius: 11, borderWidth: 1, borderColor: '#DDD7E3', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 },
  secondaryButtonText: { fontSize: 13, fontWeight: '900' },
  textButton: { alignItems: 'center', paddingVertical: 10 },
  textButtonText: { color: '#777285', fontSize: 12, fontWeight: '800' },
});

function TimeTabButton({ tab, active, designMode, chicPattern, chicPalette, themeAccent, secondaryText, onPress }: { tab: TimeTab; active: boolean; designMode: DesignMode; chicPattern: ChicPattern; chicPalette?: ChicThemePalette; themeAccent: string; secondaryText: string; onPress: () => void }) {
  const palette: ChicThemePalette = chicPalette ?? getDesignCheckThemeTokens('cool');
  const label = tab === 'departure' ? '出発' : tab === 'deadline' ? 'スケジュール' : tab === 'calendar' ? '予定表' : '集中';
  const isDark = designMode === 'dark';
  if (designMode === 'chic') return <Pressable style={[styles.timeTab, styles.timeTabChicPattern, { backgroundColor: palette.background, borderColor: active ? palette.accent : palette.border }, active && { borderWidth: 2 }]} onPress={onPress}><View style={[styles.timeTabGlassLabel, { width: '100%', backgroundColor: active ? palette.accentSoft : palette.cardSurface, borderColor: palette.border }]}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.timeTabText, { fontSize: label.length > 4 ? 10 : 11, flexShrink: 1, color: active ? palette.accentStrong : palette.textSecondary }]}>{label}</Text>{active && <Text style={[styles.timeTabMarker, { color: palette.accent }]}>●</Text>}</View></Pressable>;
     return <Pressable style={[styles.timeTab, styles.timeTabMinimal, isDark && styles.darkSurface, active && styles.timeTabActive, active && { backgroundColor: isDark ? '#26365F' : themeAccent, borderColor: isDark ? '#6F8DFF' : themeAccent }]} onPress={onPress}><Text numberOfLines={1} style={[styles.timeTabText, { color: isDark ? '#F4F7FC' : secondaryText }, active && styles.timeTabTextActive, active && styles.timeTabTextActiveMinimal]}>{label}</Text></Pressable>;
}

function FocusMode({ tasks, designMode, chicPalette, backgroundImageUri, planTier, onPremium, customDurationMinutes, onCustomDurationChange, voiceStartRequest, onFocusCompleted, onFocusStarted, onFocusNotificationPermission, onFocusRunningChange, onBehaviorEvent, hapticsEnabled = true, previewCustomDurationOpen = false, previewMode = false }: { tasks: Task[]; designMode: DesignMode; chicPalette?: ChicThemePalette; backgroundImageUri?: string; planTier: PlanTier; onPremium?: (featureId?: PremiumGuideFeatureId) => void; customDurationMinutes?: number; onCustomDurationChange?: (minutes: number) => void; voiceStartRequest?: { durationMinutes: number; id: number }; onFocusCompleted: (session: FocusSession) => void; onFocusStarted?: () => void; onFocusNotificationPermission?: () => Promise<boolean>; onFocusRunningChange?: (running: boolean) => void; onBehaviorEvent: (event: BehaviorEvent) => void; hapticsEnabled?: boolean; previewCustomDurationOpen?: boolean; previewMode?: boolean }) {
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
  const [duration, setDuration] = useState(previewCustomDurationOpen ? customDurationMinutes ?? 47 : 25);
  const [secondsLeft, setSecondsLeft] = useState((previewCustomDurationOpen ? customDurationMinutes ?? 47 : 25) * 60);
  const [running, setRunning] = useState(false);
  const [customEditorOpen, setCustomEditorOpen] = useState(previewCustomDurationOpen);
  const [customDraft, setCustomDraft] = useState(String(previewCustomDurationOpen ? customDurationMinutes ?? 47 : ''));
  const pausedSecondsRef = React.useRef((previewCustomDurationOpen ? customDurationMinutes ?? 47 : 25) * 60);
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
  useEffect(() => {
    // A saved custom value remains in storage for a future Premium upgrade,
    // but a Free user must never start it. Keep the existing default fixed
    // duration when access is lost while the timer is idle.
    if (planTier !== 'premium' && !running && ![5, 15, 25, 45].includes(duration)) {
      chooseDuration(25);
      setCustomEditorOpen(false);
    }
  }, [duration, planTier, running]);
  const openCustomDurationEditor = () => {
    if (planTier !== 'premium') {
      onPremium?.('focus_custom_duration');
      return;
    }
    setCustomDraft(String(customDurationMinutes ?? duration));
    setCustomEditorOpen(true);
  };
  useEffect(() => {
    if (previewCustomDurationOpen) setCustomEditorOpen(true);
  }, [previewCustomDurationOpen]);
  const applyCustomDuration = () => {
    const value = Number(customDraft.trim());
    if (!Number.isSafeInteger(value) || value < 1) {
      Alert.alert('集中時間を確認してください', '1分以上の整数で入力してください。');
      return;
    }
    chooseDuration(value);
    onCustomDurationChange?.(value);
    setCustomEditorOpen(false);
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
  const toggleTimer = async (requestedDurationMinutes?: number) => {
    // First-run GUIDE uses the real Focus screen as a read-only demo.  The
    // CTA should advance the tour without starting a timer, writing a focus
    // session, scheduling a notification, or activating the navigation guard.
    if (previewMode) {
      onFocusStarted?.();
      return;
    }
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
    const notificationPermissionGranted = onFocusNotificationPermission
      ? await onFocusNotificationPermission()
      : true;
    if (requestedDurationMinutes && requestedDurationMinutes !== duration) chooseDuration(requestedDurationMinutes);
    const nextSeconds = requestedDurationMinutes ? requestedDurationMinutes * 60 : pausedSecondsRef.current > 0 ? pausedSecondsRef.current : secondsLeft === 0 ? duration * 60 : secondsLeft;
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
        if (!sessionRef.current || !endAtRef.current) return;
        focusNotificationIdRef.current = await scheduleFocusCompletionNotification({ timerId: sessionRef.current.id, endAt: new Date(endAtRef.current).toISOString(), taskTitle: sessionRef.current.taskTitle, permissionGranted: notificationPermissionGranted });
      });
    }
  };
  useEffect(() => {
    if (!voiceStartRequest || previewMode || planTier !== 'premium' || running) return;
    void toggleTimer(voiceStartRequest.durationMinutes);
  }, [voiceStartRequest?.id]);
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
        <Pressable style={[styles.focusStartButton, isMinimal && styles.focusStartButtonMinimal, isDark && styles.focusStartButtonDark, isChic && styles.focusStartButtonChic, isChic && chicPalette && { backgroundColor: chicPalette.accent }]} onPress={() => void toggleTimer()}><Text style={[styles.focusStartText, { color: isChic && chicPalette ? chicPalette.onAccent : isDark ? getThemeTokens('dark').colors.screenBackground : '#FFFFFF' }]}>{running ? '一時停止' : secondsLeft === 0 ? 'もう一度' : 'スタート'}</Text></Pressable>
      </View>
    </View>
    <Text style={[styles.focusSectionTitle, isMinimal && styles.focusSectionTitleMinimal, isDark && styles.focusSectionTitleDark, isChic && chicPalette && { color: chicPalette.textPrimary }]}>集中時間</Text>
    <View style={styles.focusDurationRow}>{[5, 15, 25, 45].map((minutesValue) => <Pressable key={minutesValue} style={[styles.focusDurationChip, duration === minutesValue && styles.focusDurationChipActive, duration === minutesValue && isMinimal && styles.focusDurationChipActiveMinimal, duration === minutesValue && isDark && styles.focusDurationChipActiveDark, designMode === 'chic' && chicPalette && { backgroundColor: duration === minutesValue ? chicPalette.accent : chicPalette.cardSurface, borderColor: duration === minutesValue ? chicPalette.accent : chicPalette.border }]} onPress={() => chooseDuration(minutesValue)}><Text style={[styles.focusDurationText, duration === minutesValue && styles.focusDurationTextActive, designMode === 'chic' && chicPalette && { color: duration === minutesValue ? chicPalette.onAccent : chicPalette.textSecondary }]}>{minutesValue}分</Text></Pressable>)}<Pressable style={[styles.focusDurationChip, customDurationMinutes != null && duration === customDurationMinutes && ![5, 15, 25, 45].includes(duration) && styles.focusDurationChipActive, designMode === 'chic' && chicPalette && { backgroundColor: customDurationMinutes != null && duration === customDurationMinutes && ![5, 15, 25, 45].includes(duration) ? chicPalette.accent : chicPalette.cardSurface, borderColor: customDurationMinutes != null && duration === customDurationMinutes && ![5, 15, 25, 45].includes(duration) ? chicPalette.accent : chicPalette.border }]} onPress={openCustomDurationEditor}><Text style={[styles.focusDurationText, customDurationMinutes != null && duration === customDurationMinutes && ![5, 15, 25, 45].includes(duration) && styles.focusDurationTextActive, designMode === 'chic' && chicPalette && { color: customDurationMinutes != null && duration === customDurationMinutes && ![5, 15, 25, 45].includes(duration) ? chicPalette.onAccent : chicPalette.textSecondary }]}>{customDurationMinutes != null ? `好きな時間（${customDurationMinutes}分）` : '好きな時間'}</Text></Pressable></View>
    {customEditorOpen && <View style={[{ marginHorizontal: 2, marginBottom: 12, padding: 12, borderRadius: 12, borderWidth: 1 }, isDark ? { backgroundColor: '#20293A', borderColor: '#40506A' } : isChic && chicPalette ? { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border } : { backgroundColor: '#FFFFFF', borderColor: '#DDD7E3' }]}><Text style={[{ fontSize: 12, fontWeight: '800', marginBottom: 8 }, isDark ? { color: '#F4F7FC' } : isChic && chicPalette ? { color: chicPalette.textPrimary } : { color: '#282538' }]}>好きな集中時間（分）</Text><TextInput value={customDraft} onChangeText={(value) => setCustomDraft(value.replace(/[^0-9]/g, ''))} keyboardType="number-pad" returnKeyType="done" placeholder="例：47" placeholderTextColor={isDark ? '#8F9BB0' : '#777285'} style={[{ minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 }, isDark ? { backgroundColor: '#181F2E', borderColor: '#40506A', color: '#F4F7FC' } : isChic && chicPalette ? { backgroundColor: chicPalette.surface, borderColor: chicPalette.border, color: chicPalette.textPrimary } : { backgroundColor: '#FFFFFF', borderColor: '#DDD7E3', color: '#282538' }]} /><View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><Pressable style={[{ flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }, isDark ? { borderColor: '#40506A' } : isChic && chicPalette ? { borderColor: chicPalette.border } : { borderColor: '#DDD7E3' }]} onPress={() => setCustomEditorOpen(false)}><Text style={[{ fontWeight: '800' }, isDark ? { color: '#B4C0D4' } : isChic && chicPalette ? { color: chicPalette.textSecondary } : { color: '#777285' }]}>キャンセル</Text></Pressable><Pressable style={[{ flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, isDark ? { backgroundColor: '#8EA6FF' } : isChic && chicPalette ? { backgroundColor: chicPalette.accent } : { backgroundColor: getThemeTokens(designMode).colors.primaryAccent }]} onPress={applyCustomDuration}><Text style={{ color: isDark ? getThemeTokens('dark').colors.screenBackground : isChic && chicPalette ? chicPalette.onAccent : '#FFFFFF', fontWeight: '800' }}>決定</Text></Pressable></View></View>}
    {availableTasks.length === 0 ? <View style={styles.departureEmpty}><Text style={[styles.emptyCopy, isChic && chicPalette && { color: chicPalette.textSecondary }]}>未完了タスクはありません。今日はゆっくりしよう。</Text></View> : taskGroups.map((group) => <View key={group.bucket}>
      <Text style={[styles.focusSectionTitle, isMinimal && styles.focusSectionTitleMinimal, isDark && styles.focusSectionTitleDark, isChic && chicPalette && { color: chicPalette.textPrimary }]}>{group.label}</Text>
      {group.tasks.map((task) => { const nextSubtask = task.subtasks?.find((item) => !item.done); return <Pressable key={task.id} style={[styles.focusTaskRow, selectedTaskId === task.id && styles.focusTaskRowActive, designMode === 'chic' && chicPalette && { backgroundColor: selectedTaskId === task.id ? chicPalette.accentSoft : chicPalette.taskBackground, borderColor: selectedTaskId === task.id ? chicPalette.accent : chicPalette.border }]} onPress={() => { setSelectedTaskId(task.id); reset(); }}><View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} /><View style={{ flex: 1 }}><Text style={[styles.focusTaskTitle, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{nextSubtask ? `${nextSubtask.title}（${task.title}）` : task.title}</Text><Text style={[styles.focusTaskMeta, designMode === 'chic' && chicPalette && { color: chicPalette.taskMeta }]}>{task.category} ・ 優先度 {task.priority}</Text></View><Text style={[styles.focusTaskCheck, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>{selectedTaskId === task.id ? '●' : '○'}</Text></Pressable>; })}
    </View>)}
  </>;
}

function DailyScheduleTimeline({ date, tasks, plans, externalEvents, now, designMode, chicPalette, planTier, onEditTask, onEditPlan, visibleStartHour, visibleEndHour }: { date: string; tasks: Task[]; plans: DeparturePlan[]; externalEvents: Calendar.Event[]; now: Date; designMode: DesignMode; chicPalette?: ChicThemePalette; planTier: PlanTier; onEditTask: (task: Task) => void; onEditPlan: (plan: DeparturePlan) => void; visibleStartHour?: number; visibleEndHour?: number }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  const categoryColors = Object.fromEntries(categories.map((category) => [category, designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent])) as Record<Category, string>;
  type ScheduleItem = { id: string; time?: string; endTime?: string; title: string; meta?: string; kind: 'task' | 'plan' | 'external' | 'done'; onPress?: () => void };
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
      ? time ? undefined : '終日'
      : mode === 'departure_reminder'
        ? `出発 ${time}`
        : canUseReversePlan
          ? `出発 ${formatLiveTime(getDepartureMoments(plan).leave)} ・ 準備 ${formatLiveTime(getDepartureMoments(plan).prepare)}`
          : '到着からの逆算 ・ Premium';
    items.push({ id: `plan-${plan.id ?? index}`, time, endTime: plan.endAt ?? undefined, title: plan.title, meta, kind: 'plan', onPress: () => onEditPlan(plan) });
  });
  externalEvents.filter((event) => dateKey(new Date(event.startDate)) === date).forEach((event) => {
    const eventStart = new Date(event.startDate);
    items.push({ id: `external-${event.id}`, time: event.allDay ? undefined : formatLiveTime(eventStart), title: event.title || 'カレンダー予定', meta: event.allDay ? '終日' : undefined, kind: 'external' });
  });
  const allDayItems = items.filter((item) => !item.time);
  const timed = items.filter((item) => item.time).sort((a, b) => parseClock(a.time!) - parseClock(b.time!));
  const currentDate = dateKey(now);
  // Include each plan's end time when building the axis so the timeline
  // continues through the full displayed time range, not only its start hour.
  const axisHours = timed.flatMap((item) => {
    const startMinutes = parseClock(item.time!);
    const endMinutes = item.endTime ? Math.max(startMinutes, parseClock(item.endTime)) : startMinutes;
    return [Math.floor(startMinutes / 60), Math.ceil(endMinutes / 60)];
  });
  const firstHour = Math.min(visibleStartHour ?? 7, ...axisHours);
  const lastHour = Math.max(visibleEndHour ?? 22, ...axisHours);
  const timelineHours = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
  const hourHeight = 64;
  const axisStartMinutes = firstHour * 60;
  const timelineHeight = timelineHours.length * hourHeight;
  const placements = timed.reduce<Array<ScheduleItem & { startMinutes: number; endMinutes: number; column: number }>>((result, item) => {
    const startMinutes = parseClock(item.time!);
    const minimumCardMinutes = designMode === 'chic' ? 96 : item.kind === 'external' ? 45 : 30;
    const endMinutes = item.endTime ? Math.max(startMinutes + minimumCardMinutes, parseClock(item.endTime)) : startMinutes + minimumCardMinutes;
    let column = 0;
    while (result.some((placed) => placed.column === column && startMinutes < placed.endMinutes && endMinutes > placed.startMinutes)) column += 1;
    result.push({ ...item, startMinutes, endMinutes, column });
    return result;
  }, []);
  const columnCount = Math.max(1, ...placements.map((item) => item.column + 1));
  return <View style={{ marginTop: 12, marginBottom: 8 }}>
    {allDayItems.length > 0 && <View style={{ marginBottom: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.secondarySurface }}><Text style={{ color: theme.colors.primaryText, fontSize: 11, fontWeight: '800', marginBottom: 6 }}>終日の予定</Text>{allDayItems.map((item) => { const content = <View key={`all-day-${item.id}`} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.colors.border }}><Text style={{ color: theme.colors.primaryText, fontSize: 13, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: theme.colors.secondaryText, fontSize: 10, marginTop: 2 }}>{item.meta}</Text></View>; return item.onPress ? <Pressable key={`all-day-press-${item.id}`} onPress={item.onPress}>{content}</Pressable> : content; })}</View>}
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}><Text style={[styles.sectionTitle, { color: isDark ? '#F4F7FC' : theme.colors.primaryText }]}>今日の流れ</Text><Text style={{ color: theme.colors.primaryAccent, fontSize: 11, fontWeight: '800' }}>{date === currentDate ? '現在時刻を表示中' : '1日の予定'}</Text></View>
    <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: designMode === 'minimal' || isDark ? 16 : 18, overflow: 'hidden', height: timelineHeight, position: 'relative' }}>
      {timelineHours.map((hour) => {
        const isCurrentHour = date === currentDate && now.getHours() === hour;
        const hourItems = timed.filter((item) => Math.floor(parseClock(item.time!) / 60) === hour);
        return <View key={`timeline-hour-${hour}`} style={{ flexDirection: 'row', height: hourHeight, minHeight: hourHeight, borderBottomColor: theme.colors.border, borderBottomWidth: 1 }}>
          <View style={{ width: 66, paddingTop: 11, alignItems: 'center' }}><Text style={{ color: isCurrentHour ? theme.colors.primaryAccent : theme.colors.secondaryText, fontSize: 11, fontWeight: '700' }}>{String(hour).padStart(2, '0')}:00</Text></View>
          <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: theme.colors.border, paddingBottom: hourItems.length > 0 ? 7 : 0 }}>
            <View style={{ marginTop: 23, borderTopWidth: 1, borderTopColor: isCurrentHour ? theme.colors.primaryAccent : theme.colors.border, opacity: isCurrentHour ? 0.9 : 0.65 }} />
          </View>
        </View>;
      })}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 66, right: 0, top: 0, bottom: 0 }}>
      {placements.map((item) => {
        const accent = item.kind === 'plan' ? theme.colors.primaryAccent : item.kind === 'external' ? theme.colors.secondaryAccent : item.kind === 'done' ? theme.colors.secondaryText : categoryColors[tasks.find((task) => `task-${task.id}` === item.id)?.category ?? categories[0]!];
        const top = ((item.startMinutes - axisStartMinutes) / 60) * hourHeight + 4;
        const height = Math.max(designMode === 'chic' ? 96 : item.kind === 'external' ? 68 : 58, ((item.endMinutes - item.startMinutes) / 60) * hourHeight - 8);
        const content = <View style={{ flex: 1, padding: designMode === 'chic' ? 10 : 7, borderLeftWidth: 4, borderLeftColor: accent, borderRadius: 10, backgroundColor: theme.colors.secondarySurface, opacity: item.kind === 'done' ? 0.58 : 1, justifyContent: 'flex-start' }}><Text style={{ color: accent, fontSize: 10, lineHeight: 12, fontWeight: '900' }}>{item.time}</Text><Text numberOfLines={designMode === 'chic' ? 3 : 2} ellipsizeMode="tail" style={{ color: theme.colors.primaryText, fontSize: designMode === 'chic' ? 13 : 14, lineHeight: designMode === 'chic' ? 18 : 17, fontWeight: '800', marginTop: 2, flexShrink: 1 }}>{item.kind === 'done' ? '✓ ' : ''}{item.title}</Text></View>;
        const card = item.onPress ? <Pressable onPress={item.onPress} style={{ flex: 1 }}>{content}</Pressable> : <View style={{ flex: 1 }}>{content}</View>;
        return <View key={`timeline-item-${item.id}`} style={{ position: 'absolute', top, left: `${(item.column * 100) / columnCount}%`, width: `${100 / columnCount}%`, height, paddingHorizontal: 4 }}>{card}</View>;
      })}
      </View>
    </View>
  </View>;
}

function CalendarPlanActions({ plan, isDark, onEdit, onDelete, onOpenMap }: { plan: DeparturePlan; isDark: boolean; onEdit: (plan: DeparturePlan) => void; onDelete: (id: string) => void; onOpenMap: (plan: DeparturePlan) => void }) {
  const theme = getThemeTokens(isDark ? 'dark' : 'minimal').colors;
  const buttonStyle = { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' as const, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.secondarySurface };
  return <View style={[styles.scheduleAgendaActions, { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }]}>
    {plan.destination?.trim() && <Pressable hitSlop={6} style={buttonStyle} onPress={(event) => { event.stopPropagation(); onOpenMap(plan); }}><Text style={{ color: theme.primaryAccent, fontSize: 10, fontWeight: '900' }}>地図</Text></Pressable>}
    <Pressable hitSlop={6} style={buttonStyle} onPress={(event) => { event.stopPropagation(); onEdit(plan); }}><Text style={{ color: theme.primaryText, fontSize: 10, fontWeight: '900' }}>編集</Text></Pressable>
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
    const scheduledTime = getPlanScheduledTime(item);
    const timeLabel = item.allDay ? '終日' : scheduledTime ? `${scheduledTime}${endSuffix}` : '終日';
    const meta = mode === 'calendar_only'
      ? timeLabel
      : mode === 'departure_reminder'
        ? `出発時刻 ・ ${timeLabel}`
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
        <View style={styles.scheduleCalendarHeader}><View><Text style={[styles.scheduleMonthTitle, isDark && styles.darkCalendarText]}>これから7日間</Text><Text style={[styles.scheduleMonthCopy, isDark && styles.darkCalendarAccent]}>今日から6日後までの予定</Text></View><Pressable onPress={() => onPremium('month')}><Text style={[styles.scheduleAgendaEdit, { color: designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }, isDark && styles.darkCalendarAccent]}>月表示 Premium</Text></Pressable></View>
        <ScheduleFilterChips value={scheduleFilter} designMode={designMode} chicPalette={chicPalette} onChange={setScheduleFilter} compact />
        <View style={styles.scheduleGrid}>{freeDates.map(({ date, key }) => {
          const selected = key === freeSelected;
          const taskCount = scheduleFilter === 'plans' ? 0 : tasks.filter((task) => taskDates(task).includes(key)).length;
          const planCount = scheduleFilter === 'tasks' ? 0 : plans.filter((item) => isPlanOnDate(item, key)).length;
          const count = taskCount + planCount;
        return <Pressable key={key} style={[styles.scheduleDayCell, isDark && styles.scheduleDayCellDark, selected && styles.scheduleDayCellSelected, selected && { backgroundColor: designMode === 'chic' && chicPalette ? chicPalette.accentSoft : theme.colors.softAccent, borderColor: designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }]} onPress={() => setSelectedDate(key)}><Text style={[styles.scheduleDayNumber, isDark && styles.darkBodyText, date.getDay() === 0 && styles.scheduleSundayNumber, date.getDay() === 6 && styles.scheduleSaturdayNumber, selected && styles.scheduleSelectedNumber, selected && isDark && styles.scheduleSelectedNumberDark, selected && { color: designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent }]}>{date.getMonth() + 1}/{date.getDate()}</Text>{calendarMarks[key] && <Text style={[styles.scheduleCalendarMark, { color: designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent }]}>{calendarMarks[key]}</Text>}{count > 0 && <Text style={[styles.scheduleMoreText, isDark && styles.darkMutedText, selected && styles.scheduleMoreTextSelected, selected && { color: designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.colors.primaryAccent }]}>{count}件</Text>}</Pressable>;
        })}</View>
      </View>
      <CalendarMarkPicker date={freeSelected} mark={calendarMarks[freeSelected]} onSet={onSetCalendarMark} designMode={designMode} chicPalette={chicPalette} />
      <View style={[styles.scheduleAgendaHeader, isDark && styles.darkPanel]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>{freeSelected.replaceAll('-', '.')} の予定</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{visibleFreeTasks.length + visibleFreeCompletedTasks.length + visibleFreePlans.length}件</Text></View>
      {visibleFreeTasks.map((task) => <Pressable key={task.id} style={[styles.scheduleAgendaItem, isDark && styles.scheduleAgendaItemDark, chicAgendaStyle]} onPress={() => onEditTask(task)}><View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{task.title}</Text><Text style={[styles.scheduleAgendaMeta, { color: designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.colors.secondaryText }, isDark && styles.darkAccentText]}>{task.category}</Text></View><Text style={[styles.scheduleAgendaEdit, { color: designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }, isDark && styles.darkAccentText]}>編集 ›</Text></Pressable>)}
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
        return <Pressable key={key} style={[styles.scheduleDayCell, designMode === 'minimal' && styles.scheduleDayCellMinimal, isDark && styles.scheduleDayCellDark, today && styles.scheduleDayCellToday, selected && styles.scheduleDayCellSelected, selected && { backgroundColor: designMode === 'chic' && chicPalette ? chicPalette.accentSoft : theme.colors.softAccent, borderColor: designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }]} onPress={() => setSelectedDate(key)}>
          <Text style={[styles.scheduleDayNumber, isDark && styles.darkBodyText, date.getDay() === 0 && styles.scheduleSundayNumber, date.getDay() === 6 && styles.scheduleSaturdayNumber, today && styles.scheduleTodayNumber, selected && styles.scheduleSelectedNumber, selected && isDark && styles.scheduleSelectedNumberDark, selected && { color: designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent }]}>{date.getDate()}</Text>
          {calendarMarks[key] && <Text style={[styles.scheduleCalendarMark, { color: designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent }]}>{calendarMarks[key]}</Text>}
          <View style={styles.scheduleEventStack}>
            {visiblePlanBars.map((item, itemIndex) => {
              const planBarBackground = designMode === 'chic' && chicPalette ? chicPalette.accentSoft : isDark ? '#40558A' : theme.colors.secondarySurface;
              const planBarBorder = designMode === 'chic' && chicPalette ? chicPalette.border : isDark ? '#6F82B5' : theme.colors.border;
              const planBarText = designMode === 'chic' && chicPalette ? chicPalette.accentStrong : isDark ? '#F4F7FC' : theme.colors.primaryText;
              const selectedPlanBarBackground = designMode === 'chic' && chicPalette ? chicPalette.cardTint : isDark ? '#5872B8' : theme.colors.softAccent;
              const selectedPlanBarText = designMode === 'chic' && chicPalette ? chicPalette.accentStrong : isDark ? '#FFFFFF' : theme.colors.primaryText;
              return <View key={item.id ?? `${item.title}-${itemIndex}`} style={[styles.scheduleEventBar, { backgroundColor: selected ? selectedPlanBarBackground : planBarBackground, borderColor: planBarBorder, borderWidth: 1 }, selected && styles.scheduleEventBarSelected]}><Text numberOfLines={1} style={[styles.scheduleEventBarText, { color: selected ? selectedPlanBarText : planBarText }]}>{item.title}</Text></View>;
            })}
            {visibleTaskBars.map((task) => <View key={task.id} style={[styles.scheduleEventBar, { backgroundColor: designMode === 'chic' && chicPalette ? chicPalette.accentSoft : theme.colors.secondarySurface, borderColor: designMode === 'chic' && chicPalette ? chicPalette.border : theme.colors.border, borderWidth: 1 }, selected && styles.scheduleEventBarSelected]}><Text numberOfLines={1} style={[styles.scheduleEventBarText, isDark && styles.scheduleEventBarTextDark, selected && styles.scheduleEventBarTextSelected, selected && isDark && styles.darkBodyText, { color: designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryText }]}>{task.title}</Text></View>)}
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
          <View style={styles.scheduleAgendaActions}><Text style={[styles.scheduleAgendaEdit, { color: overdue ? theme.colors.danger : designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }, isDark && styles.darkAccentText]}>{overdue ? '期限超過' : '編集 ›'}</Text><Pressable onPress={(event) => { event.stopPropagation(); onDeleteTask(task.id); }}><Text style={styles.timelineTaskDelete}>削除</Text></Pressable></View>
        </Pressable>;
      })}
      {visibleSelectedCompletedTasks.map((task) => <View key={`completed-${task.id}`} style={[styles.scheduleAgendaItem, styles.scheduleCompletedAgendaItem, isDark && styles.scheduleCompletedAgendaItemDark, chicAgendaStyle]}><View style={[styles.scheduleAgendaDot, styles.scheduleCompletedDot]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, styles.scheduleCompletedTitle, isDark && styles.scheduleCompletedTitleDark]}>✓ {task.title}</Text><Text style={[styles.scheduleAgendaMeta, styles.scheduleCompletedMeta, isDark && styles.scheduleCompletedMetaDark]}>完了したタスク ・ {task.completedAt ? formatLiveTime(new Date(task.completedAt)) : '記録あり'}</Text></View><Text style={[styles.scheduleCompletedLabel, isDark && styles.scheduleCompletedLabelDark]}>完了</Text></View>)}
      {visibleSelectedPlans.map(renderPlanAgenda)}
      {hiddenSelectedPlanCount > 0 && <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>この日は{calendarPlanDisplayLimit}件まで表示しています。</Text></View>}
      {visibleSelectedExternalEvents.map((event) => <View key={`external-agenda-${event.id}`} style={[styles.scheduleAgendaItem, isDark && styles.scheduleAgendaItemDark, chicAgendaStyle]}><View style={[styles.scheduleAgendaDot, { backgroundColor: designExternalAccent }]} /><View style={{ flex: 1 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{event.title || 'カレンダー予定'}</Text><Text style={[styles.scheduleAgendaMeta, { color: designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.colors.secondaryText }, isDark && styles.darkAccentText]}>{event.allDay ? '終日' : formatLiveTime(new Date(event.startDate))}</Text></View></View>)}
    </>}
  </>;
}

function ScheduleFilterChips({ value, designMode, chicPalette, onChange, compact = false }: { value: 'all' | 'tasks' | 'plans'; designMode: DesignMode; chicPalette?: ChicThemePalette; onChange: (value: 'all' | 'tasks' | 'plans') => void; compact?: boolean }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  return <View style={[styles.scheduleFilterRow, compact && styles.scheduleFilterRowInCalendar, designMode === 'dark' && styles.darkSurface, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]}>{([['all', 'すべて'], ['tasks', 'やること'], ['plans', '予定']] as const).map(([id, label]) => <Pressable key={id} onPress={() => onChange(id)} style={[styles.scheduleFilterChip, value === id && styles.scheduleFilterChipActive, value === id && designMode === 'minimal' && { backgroundColor: theme.colors.primaryAccent, borderColor: theme.colors.primaryAccent }, value === id && designMode === 'dark' && styles.scheduleFilterChipActiveDark, value === id && designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }]}><Text style={[styles.scheduleFilterText, value === id && styles.scheduleFilterTextActive, value === id && designMode === 'minimal' && { color: '#FFFFFF' }, value === id && designMode === 'dark' && styles.scheduleFilterTextActiveDark, value === id && designMode === 'chic' && chicPalette && { color: chicPalette.onAccent }, value !== id && designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{label}</Text></Pressable>)}</View>;
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

function isFloralPattern(pattern: ChicPattern | 'flower' | 'stripe'): pattern is FloralPatternId {
  return pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark';
}

const FloralPatternDecor = React.memo(function FloralPatternDecor({ pattern, accent, warm, compact, previewTopCrop, preview = false, fallbackBackground }: { pattern: FloralPatternId; accent: string; warm: string; compact: boolean; previewTopCrop: boolean; preview?: boolean; fallbackBackground?: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>(preview ? 'idle' : 'loaded');
  const asset = designFloralAssets[pattern];
  // Preview rendering is intentionally decoupled from the full-screen
  // background. It uses the lightweight thumbnail when one exists and never
  // changes the persisted pattern when a thumbnail is still loading.
  const imageSource = preview ? (asset.thumbnailSource ?? asset.source) : asset.source;

  useEffect(() => {
    if (!preview) return;
    setStatus('idle');
    const timeout = setTimeout(() => {
      setStatus((current) => current === 'loaded' ? current : 'error');
    }, 2500);
    return () => clearTimeout(timeout);
  }, [imageSource, preview]);

  const showPreviewFallback = preview && status !== 'loaded';
  const fallbackColor = fallbackBackground ?? warm;
  return <View pointerEvents="none" style={[styles.patternLayer, { width: '100%', height: '100%', backgroundColor: fallbackColor }]}>
    {showPreviewFallback && <View style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: fallbackColor }]}>
      {status === 'error' ? <Text style={{ color: accent, fontSize: compact ? 8 : 11, fontWeight: '800' }}>花柄を表示できません</Text> : <ActivityIndicator color={accent} />}
    </View>}
    <Image
      source={imageSource}
      resizeMode="cover"
      fadeDuration={0}
      onLoadStart={preview ? () => setStatus('loading') : undefined}
      onLoad={preview ? () => setStatus('loaded') : undefined}
      onError={preview ? () => setStatus('error') : undefined}
      accessibilityLabel={asset.label}
      style={[styles.patternImageLayer, compact && styles.patternImageLayerCompact, previewTopCrop && styles.patternImageLayerPreviewTop, showPreviewFallback && { opacity: 0 }]}
    />
  </View>;
});

function ChicPatternDecor({ pattern, accent, warm, density = 'regular', checkColor, preview = false, previewTopCrop = false }: { pattern: ChicPattern | 'flower' | 'stripe'; accent: string; warm: string; density?: 'regular' | 'compact'; checkColor?: ChicCheckColor; preview?: boolean; previewTopCrop?: boolean }) {
  const compact = density === 'compact';
  if (pattern === 'plain') return null;
  if (isFloralPattern(pattern)) {
    const fallbackBackground = getDesignPatternThemeTokens(pattern, checkColor ?? 'cool').background;
    return <FloralPatternDecor key={pattern} pattern={pattern} accent={accent} warm={warm} compact={compact} preview={preview} fallbackBackground={fallbackBackground} previewTopCrop={previewTopCrop} />;
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

function ChicPatternSelector({ designMode, chicPattern, chicCheckColor, planTier, designCustomizePurchased = false, onPattern, onCheckColor, onPremium, onPreview }: { designMode: DesignMode; chicPattern: ChicPattern; chicCheckColor: ChicCheckColor; planTier: PlanTier; designCustomizePurchased?: boolean; onPattern: (pattern: ChicPattern) => void; onCheckColor: (color: ChicCheckColor) => void; onPremium: () => void; onPreview: (pattern: ChicPattern) => void }) {
  const patterns: { id: ChicPattern; label: string; feature?: 'chic_floral' | 'chic_dot' | 'chic_check_lavender_satin' | 'chic_check_beige_noir' | 'chic_check_mauve_frame' }[] = [
    { id: 'plain', label: 'プレーン' },
    { id: 'floral', label: designFloralAssets.floral.label, feature: 'chic_floral' },
    { id: 'floralSoft', label: designFloralAssets.floralSoft.label, feature: 'chic_floral' },
    { id: 'floralSeasonal', label: designFloralAssets.floralSeasonal.label, feature: 'chic_floral' },
    { id: 'dot', label: 'ドット', feature: 'chic_dot' },
    { id: 'checkLavenderSatin', label: 'くすみラベンダーチェック', feature: 'chic_check_lavender_satin' },
    { id: 'checkBeigeNoir', label: 'ベージュ×ブラックチェック', feature: 'chic_check_beige_noir' },
    { id: 'checkMauveFrame', label: 'モーブフレームチェック', feature: 'chic_check_mauve_frame' },
  ];
  const displayPatternLabels: Partial<Record<ChicPattern, string>> = {
    floral: designFloralAssets.floral.label,
    floralSoft: designFloralAssets.floralSoft.label,
    floralSeasonal: designFloralAssets.floralSeasonal.label,
    floralDark: designFloralAssets.floralDark.label,
    plain: 'プレーン',
    dot: 'ドット',
    checkLavenderSatin: 'ギンガムチェック1',
    checkBeigeNoir: 'ギンガムチェック2',
    checkMauveFrame: 'ギンガムチェック3',
  };
  const visiblePatterns = designMode === 'photo' ? patterns.filter((item) => item.id === 'plain') : patterns;
  const selectedPalette = getChicCheckColor(chicCheckColor);
  return <View style={[styles.patternSelectorNew, designMode === 'dark' && styles.darkSurface, { borderTopColor: selectedPalette.border }]}>
    <Text style={[styles.fieldLabel, designMode === 'dark' && styles.darkAccentText, { color: designMode === 'dark' ? '#B4C0D4' : selectedPalette.textPrimary }]}>背景の柄</Text>
    <View style={styles.patternChoices}>
      {visiblePatterns.map((item) => {
        const locked = !!item.feature && !hasPremiumAccess(planTier, item.feature) && !designCustomizePurchased;
        const isCheck = isCheckChicPattern(item.id);
        const visual = isCheck ? getChicCheckColor(chicCheckColor) : getChicPatternVisual(item.id, getChicCheckColor(chicCheckColor));
        const patternBase = isCheck ? getChicCheckColor(chicCheckColor).patternBase : visual.background;
        const patternStripe = isCheck ? getChicCheckColor(chicCheckColor).patternStripe : visual.warm;
        const choicePalette = selectedPalette;
        const selected = chicPattern === item.id;
        return <Pressable key={item.id} style={[styles.patternChoice, { backgroundColor: choicePalette.cardSurface, borderColor: selected ? choicePalette.accent : choicePalette.border }, selected && { borderWidth: 2 }]} onPress={() => { if (locked) { onPreview(item.id); return; } onPattern(item.id); }}>
          <View style={[styles.patternSwatch, styles.patternSwatchLarge, { backgroundColor: patternBase, borderColor: choicePalette.border, borderWidth: 1 }]}><ChicPatternDecor pattern={item.id} accent={visual.accent} warm={patternStripe} density="compact" checkColor={chicCheckColor} preview previewTopCrop={item.id === 'floralSoft'} /></View>
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
  const theme = getThemeTokens(designMode ?? 'minimal').colors;
  return <View style={styles.settingsDisclosure}>
    <Pressable style={[styles.settingsDisclosureHeader, isDark && styles.darkSurface]} onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded }}>
      <View style={{ flex: 1 }}><Text style={[styles.settingsDisclosureTitle, { color: theme.primaryText }]}>{title}</Text><Text style={[styles.settingsDisclosureSubtitle, { color: theme.secondaryText }]}>{subtitle}</Text></View>
      <Text style={[styles.settingsDisclosureChevron, { color: theme.primaryAccent }]}>{expanded ? '⌃' : '⌄'}</Text>
    </Pressable>
    {expanded && <View style={styles.settingsDisclosureBody}>{children}</View>}
  </View>;
}

function NotificationManagerCard({ designMode, readOnly = false }: { designMode?: DesignMode; readOnly?: boolean }) {
  const isDark = designMode === 'dark';
  const theme = getThemeTokens(designMode ?? 'minimal').colors;
  const [pending, setPending] = useState<Notifications.NotificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = React.useCallback(async () => {
    setLoading(true);
    try { setPending(await Notifications.getAllScheduledNotificationsAsync()); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // Premium previews are read-only and must not inspect or touch the
    // user's scheduled notifications. The production card refreshes only
    // when it is actually shown in Settings.
    if (readOnly) return;
    void refresh();
  }, [readOnly, refresh]);
  const stopAll = () => Alert.alert('予約通知をすべて停止しますか？', 'タスクと出発の予約通知が停止されます。', [
    { text: 'キャンセル', style: 'cancel' },
    { text: '停止する', style: 'destructive', onPress: () => { void Notifications.cancelAllScheduledNotificationsAsync().then(refresh); } },
  ]);
  if (readOnly) return <View style={[styles.notificationManagerCard, isDark && styles.darkSurface]}><View style={styles.notificationManagerHeader}><View><Text style={[styles.settingsTitle, { color: theme.primaryText }]}>高度な通知</Text><Text style={[styles.switchCopy, { color: theme.secondaryText }]}>段階的な通知を設定できます</Text></View><Text style={[styles.notificationRefreshText, { color: theme.primaryAccent }]}>Premium</Text></View>{[['09:00', 'そろそろ始められそう？'], ['09:05', 'もう一度確認しよう'], ['09:08', '今からできることを選ぶ']].map(([time, copy]) => <View key={time} style={styles.notificationPendingRow}><View style={[styles.notificationPendingDot, { backgroundColor: theme.primaryAccent }]} /><View style={{ flex: 1 }}><Text style={[styles.notificationPendingTitle, { color: theme.primaryText }]}>{time}</Text><Text style={[styles.notificationPendingBody, { color: theme.secondaryText }]}>{copy}</Text></View></View>)}</View>;
  return <View style={[styles.notificationManagerCard, isDark && styles.darkSurface]}>
    <View style={styles.notificationManagerHeader}><View><Text style={[styles.settingsTitle, { color: theme.primaryText }]}>通知管理</Text><Text style={[styles.switchCopy, { color: theme.secondaryText }]}>{loading ? '確認中…' : `${pending.length}件の通知を予約中`}</Text></View><Pressable style={styles.notificationRefresh} onPress={() => void refresh()}><Text style={[styles.notificationRefreshText, { color: theme.primaryAccent }]}>更新</Text></Pressable></View>
    {pending.slice(0, 4).map((request) => <View key={request.identifier} style={styles.notificationPendingRow}><View style={[styles.notificationPendingDot, { backgroundColor: theme.primaryAccent }]} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.notificationPendingTitle, { color: theme.primaryText }]}>{request.content.title ?? '通知'}</Text><Text numberOfLines={1} style={[styles.notificationPendingBody, { color: theme.secondaryText }]}>{request.content.body ?? ''}</Text></View></View>)}
    {pending.length > 4 && <Text style={[styles.notificationMore, { color: theme.secondaryText }]}>ほか{pending.length - 4}件</Text>}
    <Pressable disabled={pending.length === 0} style={[styles.notificationStopButton, pending.length === 0 && styles.batchDisabled]} onPress={stopAll}><Text style={styles.notificationStopText}>予約通知をすべて停止</Text></Pressable>
  </View>;
}

function TodayWinStrip({ tasks, designMode, chicPattern, chicPalette, onRestore, onOpenCompleted, onOpenFocus, onToggleTask, onOpenTaskActions, selectionMode = false, selectedTaskIds = [] }: { tasks: Task[]; designMode: ThemeMode; chicPattern: ChicPattern; chicPalette: ChicThemePalette; onRestore: (id: string) => void; onOpenCompleted?: () => void; onOpenFocus?: () => void; onToggleTask?: (id: string) => void; onOpenTaskActions?: (task: Task) => void; selectionMode?: boolean; selectedTaskIds?: string[] }) {
  const theme = getThemeTokens(designMode, chicPalette.id);
  // Completed-task cards use a light surface even when the surrounding sheet
  // is Mono Dark. Keep the card copy on the matching dark-on-light palette.
  const completedCardText = designMode === 'dark'
    ? getThemeTokens('minimal', chicPalette.id).colors
    : theme.colors;
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
  const nextNowTaskSelected = Boolean(nextNowTask && selectionMode && selectedTaskIds.includes(nextNowTask.id));
  const nextNowTaskChecked = selectionMode ? nextNowTaskSelected : Boolean(nextNowTask?.done);
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
                <Text style={[styles.taskTitle, { color: completedCardText.primaryText }]}>{task.title}</Text>
                <Text style={[styles.taskMeta, { color: completedCardText.secondaryText }]}>{task.category}</Text>
              </View>
              <Pressable style={[styles.restoreButton, { backgroundColor: theme.colors.softAccent }]} onPress={() => onRestore(task.id)}>
                <Text style={[styles.restoreButtonText, { color: theme.colors.primaryAccent }]}>元に戻す</Text>
              </Pressable>
            </View>
          ))}
        <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryAccent, borderRadius: theme.radius.button }]} onPress={() => setDetailsOpen(false)}>
            <Text style={[styles.primaryButtonText, { color: designMode === 'chic' && chicPalette ? chicPalette.onAccent : designMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF' }]}>閉じる</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
  if (designMode !== 'chic') {
    return (
      <>
        <View style={[styles.todayHeroCard, styles.todayHeroCardMinimal, designMode === 'dark' && styles.todayHeroCardMinimalDark]}>
          <View style={styles.todayHeroMinimalLayout}>
            <View style={styles.todayHeroMinimalLeft}>
              <Text style={[styles.todayHeroMinimalKicker, designMode === 'dark' && styles.todayHeroMinimalKickerDark]}>TODAY</Text>
              <Text style={[styles.todayHeroMinimalNowLabel, designMode === 'dark' && styles.todayHeroMinimalTextDark]}>今はこれ</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Pressable disabled={!nextNowTask || !onToggleTask} onPress={(event) => { event.stopPropagation(); if (nextNowTask) onToggleTask?.(nextNowTask.id); }} style={[styles.check, designMode === 'dark' && styles.checkDark, nextNowTaskChecked && styles.checkDone, nextNowTaskSelected && styles.selectionChecked]}><Text style={styles.checkMark}>{nextNowTaskChecked ? '✓' : ''}</Text></Pressable><Pressable disabled={!nextNowTask || !onOpenTaskActions} onPress={(event) => { event.stopPropagation(); if (nextNowTask) onOpenTaskActions?.(nextNowTask); }} style={{ flex: 1 }}><Text numberOfLines={2} style={[styles.todayHeroMinimalTask, designMode === 'dark' && styles.todayHeroMinimalTextDark]}>{nextNowTask ? nextNowTask.title : remainingNow === 0 ? '今日の分は完了。いい感じ' : '次にやる1つをここで決めます'}</Text></Pressable></View>
              <Text style={[styles.todayHeroMinimalStats, designMode === 'dark' && styles.todayHeroMinimalStatsDark]}>完了 {count} / 残り {remainingNow}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="今日できたことを確認" onPress={() => { onOpenCompleted?.(); setDetailsOpen(true); }} style={styles.todayUnifiedAchievementMinimal}>
              <Text style={[styles.todayHeroMinimalKicker, { color: theme.colors.primaryAccent }]}>達成グラフ</Text>
              <Text style={[styles.todayHeroMinimalNumber, { color: theme.colors.primaryText }]}>{String(count).padStart(2, '0')}</Text>
              <View style={styles.minimalAchievementBars}>{Array.from({ length: 8 }, (_, index) => <View key={index} style={[styles.minimalAchievementBar, { backgroundColor: index < Math.min(8, count) ? theme.colors.primaryAccent : theme.colors.secondarySurface }]} />)}</View>
              <Text style={[styles.todayHeroMinimalStats, { color: theme.colors.secondaryText }]}>今日できたことを確認</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="集中する" onPress={(event) => { event.stopPropagation(); onOpenFocus?.(); }} style={{ minHeight: 46, marginTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.softAccent, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryAccent, fontSize: 13, fontWeight: '900' }}>集中する</Text><Text style={{ color: theme.colors.primaryAccent, fontSize: 20 }}>›</Text></Pressable>
        </View>
        {details}
      </>
    );
  }
  const item = '✿';
  const treasureColors = [chicPalette.accentSoft, chicPalette.patternStripe, chicPalette.border];
  return (
    <>
      <View style={[styles.todayHeroCard, styles.todayHeroCardChic, { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border, shadowColor: chicPalette.accent }]}>
        {designMode === 'chic' && chicPattern === 'checkLavenderSatin' && <BThemeRibbonDecoration today />}
        {designMode === 'chic' && chicPattern === 'checkBeigeNoir' && <CThemeRibbonDecoration today />}
        <View style={styles.todayHeroChicLayout}>
          <View style={[styles.todayHeroChicPlate, { backgroundColor: chicPalette.cardSurface }] }>
            <View style={[styles.todayChicMark, { backgroundColor: chicPalette.accentSoft }]}><Text style={[styles.todayChicMarkText, { color: chicPalette.accent }]}>✿</Text></View>
            <Text style={[styles.todayHeroKicker, { color: chicPalette.textSecondary }]}>今はこれ</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Pressable disabled={!nextNowTask || !onToggleTask} onPress={(event) => { event.stopPropagation(); if (nextNowTask) onToggleTask?.(nextNowTask.id); }} style={[styles.check, nextNowTaskChecked && styles.checkDone, nextNowTaskSelected && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }, { borderColor: chicPalette.accent }]}><Text style={styles.checkMark}>{nextNowTaskChecked ? '✓' : ''}</Text></Pressable><Pressable disabled={!nextNowTask || !onOpenTaskActions} onPress={(event) => { event.stopPropagation(); if (nextNowTask) onOpenTaskActions?.(nextNowTask); }} style={{ flex: 1 }}><Text numberOfLines={2} style={[styles.todayHeroCopy, { color: chicPalette.textPrimary }]}>{nextNowTask ? nextNowTask.title : remainingNow === 0 ? '今日の分は完了。いい感じ' : '次にやる1つをここで決めます'}</Text></Pressable></View>
            <Text style={[styles.todayHeroStats, { color: chicPalette.textSecondary }]}>完了 {count}　残り {remainingNow}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="今日できたことを確認" onPress={() => { onOpenCompleted?.(); setDetailsOpen(true); }} style={styles.todayHeroJarWrap}>
            <View style={styles.miniJarWrap}>
              <View style={[styles.miniJarLid, { backgroundColor: chicPalette.accent }]} />
              <View style={[styles.miniJar, styles.miniJarChicGlass, { borderColor: chicPalette.border, shadowColor: chicPalette.accent }]}>{Array.from({ length: Math.min(12, count) }, (_, index) => <Text key={index} style={[styles.miniJarItem, { left: 8 + (index % 3) * 22, bottom: 4 + Math.floor(index / 3) * 14, color: treasureColors[index % treasureColors.length] }]}>{index % 2 ? '✦' : '●'}</Text>)}</View>
              {dropVisible && <Animated.Text style={[styles.fallingTreasure, fallingStyle]}>{item}</Animated.Text>}
            </View>
            <Text style={[styles.todayHeroProgressLabel, { color: chicPalette.textSecondary }]}>今日の進み</Text>
            <Text style={[styles.todayHeroJarHint, { color: chicPalette.textMuted }]}>タップして今日できたことを見る</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="集中する" onPress={(event) => { event.stopPropagation(); onOpenFocus?.(); }} style={{ minHeight: 46, marginTop: 12, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: chicPalette.border, borderRadius: 12, backgroundColor: chicPalette.accentSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: chicPalette.accentStrong, fontSize: 13, fontWeight: '900' }}>集中する</Text><Text style={{ color: chicPalette.accent, fontSize: 20 }}>›</Text></Pressable>
      </View>
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
    const monoTheme = getThemeTokens(designMode);
    return <View style={[styles.minimalAchievement, compact && styles.minimalAchievementCompact, { backgroundColor: monoTheme.colors.surface, borderColor: monoTheme.colors.border, borderWidth: 1 }]}><View><Text style={[styles.minimalAchievementLabel, { color: monoTheme.colors.secondaryText }]}>{targetDate ? 'この日の達成グラフ' : scope === 'today' ? '今日の達成グラフ' : '今月の達成グラフ'}</Text><Text style={[styles.minimalAchievementNumber, compact && styles.minimalAchievementNumberCompact, { color: monoTheme.colors.primaryText }]}>{String(completed.length).padStart(2, '0')}</Text><Text style={[styles.taskMeta, { color: monoTheme.colors.secondaryText }]}>{completed.length}件完了</Text></View><View style={styles.minimalAchievementBars}>{Array.from({ length: 10 }, (_, item) => <View key={item} style={[styles.minimalAchievementBar, { backgroundColor: item < Math.min(10, completed.length) ? monoTheme.colors.primaryAccent : monoTheme.colors.secondarySurface }]} />)}</View></View>;
  }
  const vesselPalette = chicPalette ?? getDesignCheckThemeTokens('cool');
  return <View style={[styles.vesselScene, compact && styles.vesselSceneCompact, styles.vesselSceneChic, { backgroundColor: vesselPalette.cardTint, borderColor: vesselPalette.border }]}>
    <View style={[styles.vesselLabel, styles.vesselLabelChic, { backgroundColor: vesselPalette.cardSurface }]}><Text style={[styles.vesselLabelTop, { color: vesselPalette.textSecondary }]}>{targetDate ? 'この日の達成の瓶' : scope === 'today' ? '今日の達成の瓶' : '今月の達成の瓶'}</Text><Text style={[styles.vesselLabelTitle, compact && styles.vesselLabelTitleCompact, { color: vesselPalette.textPrimary }]}>{completed.length}個のできた！</Text></View>
    <View style={[styles.jarLid, designMode === 'chic' && { backgroundColor: vesselPalette.accent }]} />
    <View style={[styles.jarBody, compact && styles.jarBodyCompact, designMode === 'chic' && { borderColor: vesselPalette.border, backgroundColor: vesselPalette.cardSurface }]}>
      {visible.map((task, index) => <View key={task.id} style={[styles.jarTreasure, designMode === 'chic' && { backgroundColor: vesselPalette.cardSurface }, { left: 13 + (index % 6) * 39, bottom: 10 + Math.floor(index / 6) * 35, transform: [{ rotate: `${(index % 5) * 8 - 16}deg` }] }]}><Text style={[styles.jarTreasureText, designMode === 'chic' && { color: vesselPalette.accent }]}>{designMode === 'chic' ? (index % 3 === 0 ? '✿' : index % 3 === 1 ? '★' : '●') : (index % 2 ? '★' : '🍪')}</Text></View>)}
      {visible.length === 0 && <Text style={styles.jarEmptyText}>最初のひとつを待っています</Text>}
    </View>
    {!compact && <Text style={[styles.vesselCaption, designMode === 'chic' && { color: vesselPalette.textSecondary }]}>{designMode === 'chic' ? '終わるたび、瓶に小さな花が増えます' : '相棒の宝物が少しずつ増えていくよ'}</Text>}
  </View>;
}
