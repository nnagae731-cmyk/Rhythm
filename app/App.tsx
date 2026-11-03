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
import { DesignAppliedPreview, SettingsScreen } from './screens/SettingsScreen';
import { HistoryScreen, MonthlyReflectionCardView, ReflectionCardModel } from './screens/HistoryScreen';
import { TaskModal } from './components/TaskModal';
import { BulkTaskModal } from './components/BulkTaskModal';
import { DeparturePlanForm } from './components/DeparturePlanForm';
import { AffirmationSettingsCard, MAX_AFFIRMATIONS } from './components/AffirmationSettingsCard';
import { PremiumFeatureIcon, PremiumModal, type PremiumFeatureIconName } from './components/PremiumModal';
import { PremiumTrialStarted, useRhythmStoreKit } from './features/purchases/useRhythmStoreKit';
import { STORE_PRODUCT_IDS } from './features/purchases/storeProducts';
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
import { Affirmation, AffirmationCustomText, AppNotice, AppNoticeCategory, CalendarMarks, Category, DeparturePlan, DeparturePreparationStatus, FocusPersistedState, LiveActivityCustomizationSettings, LiveActivityDisplayOptions, MonthlyReflectionCard, MonthlyReview, MonthlyWishState, MonoPattern, NudgeMode, PersistedState, PhotoThemePhotoTarget, PhotoThemeSettings, Priority, RepeatRule, Screen, SharedEvent, SharedParticipantPrefs, Subtask, Task, TaskBucket, TaskListItem, ThemeMode, TimeTab, UrgencyStatus, WidgetSettings, WidgetSize, WidgetType, WishAction, WishMonthMap } from './types';
import { initialPlan } from './storage/rhythmState';
import { DEFAULT_TRAVEL_APP_SETTINGS, normalizeTravelAppSettings, TravelAppSettings } from './features/travel/travelApps';
import { loadRhythmState, saveRhythmState } from './storage/rhythmStorage';
import { acknowledgeRhythmWidgetPendingActions, buildRhythmWidgetSnapshot, getRhythmWidgetPendingActions, saveRhythmAffirmationPhoto, saveRhythmWidgetPhoto, saveRhythmWidgetPhotoForWidget, saveRhythmWidgetSnapshot } from './features/widget/rhythmWidgetSnapshot';
import { DEFAULT_WIDGET_SETTINGS, getWidgetCustomization, normalizeWidgetSettings, WIDGET_TYPE_OPTIONS } from './features/widget/widgetSettings';
import type { WidgetEntitlementOverride } from './features/widget/widgetSettings';
import { categories, priorities, completionIcons, categoryColors as baseCategoryColors, designModes, getLateRiskMessage, getNextBestAction, getUrgencyStatus, urgencyLevel } from './features/tasks/taskUtils';
import { planScheduledAt, selectCurrentTask, selectCurrentTasks } from './features/tasks/taskSelectors';
import { createSharedEventPacket, createSharedEventToken, encodeSharedEventLink, normalizeSharedEvent, parseSharedEventLink, upsertSharedEvent } from './features/shared/sharedUtils';
import { getMonthlyWishState, normalizeWishMonthsForSave, wishMonthKey } from './features/wish/wishUtils';
import { cancelPendingTaskNotifications, cancelPendingTaskNotificationsUnsafe } from './features/tasks/taskNotifications';
import { cancelPendingDepartureNotifications, cancelPendingDepartureNotificationsUnsafe } from './features/departure/departureNotifications';
import { enqueueNotificationOperation } from './features/notifications/notificationOperationQueue';
import { getDeparturePlanMode, getPlanScheduledTime, isArrivalReversePlan, isDepartureReminderPlan, normalizeDeparturePlanForSave } from './features/departure/departurePlanMode';
import { DEFAULT_LIVE_ACTIVITY_CUSTOMIZATION, DEFAULT_LIVE_ACTIVITY_DISPLAY_OPTIONS, endRhythmLiveActivity, getRhythmLiveActivityStatus, isRhythmLiveActivityAvailable, normalizeRhythmLiveActivityCustomization, normalizeRhythmLiveActivityDisplayOptions, startOrUpdateRhythmLiveActivity, type RhythmLiveActivityPayload, type RhythmLiveActivityRuntimeStatus } from './features/widget/rhythmLiveActivity';
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
import { deleteManagedPhotoUri, deleteTemporaryPhotoUri, isPersistedPhotoAvailable, persistPhotoUri } from './features/photo/persistentPhoto';
import { canUseNotifications, getNotificationPermissionAction, getNotificationPermissionStatus, requestRhythmNotificationPermission } from './features/notifications/notificationPermission';
import { addHours, canCreateWish, canCreateWishAction, canImportCalendar, canStartPremiumDesignTrial, isPremiumDesignTrialActive, isPremiumDesignUnlocked, isWidgetPhotoUnlockActive } from './features/ads/rewardedAccessLogic';
import { getRequiredAds, REWARDED_AD_RULES, RewardedFeatureId } from './features/ads/rewardedAccess';
import { DEFAULT_REWARDED_ACCESS_STATE, loadRewardedAccessState, RewardedAccessState, saveRewardedAccessState } from './features/ads/rewardedAccessStorage';
import { cancelFocusCompletionNotification, cancelPendingFocusCompletionNotifications, scheduleFocusCompletionNotification } from './features/focus/focusNotifications';
import { cancelPremiumTrialReminder, schedulePremiumTrialReminder } from './features/notifications/premiumTrialReminder';
import { buildAffirmationContent, buildCompletionFeedbackContent, buildDeadlineTitle, buildDepartureFollowUpContent, buildDepartureReminderContent, buildDepartureStageContent, buildScheduleSwitchContent, buildTaskActionContent, buildTaskReminderTitle, buildRoutineRemainingContent } from './features/notifications/notificationContent';
import { cancelPendingAffirmationNotifications, cancelPendingAffirmationNotificationsUnsafe } from './features/notifications/affirmationNotifications';
import { FOCUS_NAVIGATION_GUARD_COPY, getFocusNavigationDecision } from './features/focus/focusUsagePolicy';
import {
  Alert,
  ActivityIndicator,
  AppState,
  Animated,
  useColorScheme,
  Easing,
  Image,
  InteractionManager,
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
  useWindowDimensions,
  View,
  Vibration,
  type DimensionValue,
} from 'react-native';

function logPremiumDiagnostic(event: string, details: Record<string, unknown> = {}) {
  if (!__DEV__) return;
  console.log(`[PremiumDiagnostic] ${event}`, {
    timestamp: new Date().toISOString(),
    plan: 'unknown',
    purchaseStatus: 'unknown',
    planTier: 'unknown',
    modalVisible: false,
    entitlementsResolved: false,
    pending: false,
    ...details,
  });
}

function getFocusCompletionAlertCopy(taskTitle?: string) {
  return {
    title: '集中タイム終了',
    message: taskTitle ? `「${taskTitle}」に取り組めました。少し休憩しよう。` : '少し休憩しよう。',
  };
}

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

// Stable local notices. Their IDs are intentionally independent from the
// persisted read state so a future push/remote source can reuse the same UI.
const INITIAL_APP_NOTICES: AppNotice[] = [];

const APP_NOTICE_CATEGORY_LABELS: Record<AppNoticeCategory, string> = {
  feature: '新機能',
  update: 'アップデート',
  important: '重要なお知らせ',
};

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

type ImageDesignPattern = 'stationery' | 'botanicalBackground' | 'ocean' | 'nightSky';

type UserFacingDesignPattern = Exclude<ChicPattern, 'floralDark'>;
type DesignPatternFeature = 'chic_floral' | 'chic_dot' | 'chic_heart' | 'chic_check_lavender_satin' | 'chic_check_beige_noir' | 'chic_check_mauve_frame';

// Single source of truth for patterns that users can choose in Design. Legacy
// persisted ids stay accepted by ChicPattern, but are intentionally omitted
// from user-facing pickers.
const designPatternChoices: readonly { id: UserFacingDesignPattern; label: string; feature?: DesignPatternFeature }[] = [
  { id: 'plain', label: 'プレーン' },
  { id: 'floral', label: designFloralAssets.floral.label, feature: 'chic_floral' },
  { id: 'floralSoft', label: designFloralAssets.floralSoft.label, feature: 'chic_floral' },
  { id: 'floralSeasonal', label: designFloralAssets.floralSeasonal.label, feature: 'chic_floral' },
  { id: 'dot', label: 'ドット', feature: 'chic_dot' },
  { id: 'heart', label: 'ハート', feature: 'chic_heart' },
  { id: 'checkLavenderSatin', label: 'ギンガム1', feature: 'chic_check_lavender_satin' },
  { id: 'checkBeigeNoir', label: 'ギンガム2', feature: 'chic_check_beige_noir' },
  { id: 'checkMauveFrame', label: 'ギンガム3', feature: 'chic_check_mauve_frame' },
  { id: 'stationery', label: 'ステーショナリー', feature: 'chic_floral' },
  { id: 'botanicalBackground', label: 'ボタニカル', feature: 'chic_floral' },
  { id: 'ocean', label: 'オーシャン', feature: 'chic_floral' },
  { id: 'nightSky', label: 'ナイトスカイ', feature: 'chic_floral' },
];

// These are completed background illustrations supplied for the app's Design
// mode. They are deliberately kept outside the palette/decor renderer so the
// pixels are never tinted or overlaid by the selected nine-color theme. The
// smaller previewSource is used only by settings/preview swatches so opening
// those surfaces does not decode every full-screen original at once.
const designBackgroundAssets: Record<ImageDesignPattern, { source: number; previewSource: number; background: string; width: number; height: number }> = {
  stationery: { source: require('./assets/themes/design-backgrounds/design-stationery-background.jpg'), previewSource: require('./assets/themes/design-backgrounds/design-stationery-preview.jpg'), background: '#F8F7F2', width: 590, height: 1280 },
  botanicalBackground: { source: require('./assets/themes/design-backgrounds/design-botanical-background.jpg'), previewSource: require('./assets/themes/design-backgrounds/design-botanical-preview.jpg'), background: '#F8F8F4', width: 590, height: 1280 },
  ocean: { source: require('./assets/themes/design-backgrounds/design-ocean-background.jpg'), previewSource: require('./assets/themes/design-backgrounds/design-ocean-preview.jpg'), background: '#EAF8FA', width: 589, height: 1280 },
  nightSky: { source: require('./assets/themes/design-backgrounds/design-night-sky-background.jpg'), previewSource: require('./assets/themes/design-backgrounds/design-night-sky-preview.jpg'), background: '#101722', width: 589, height: 1280 },
};

function isImageDesignPattern(pattern: ChicPattern): pattern is ImageDesignPattern {
  return pattern === 'stationery' || pattern === 'botanicalBackground' || pattern === 'ocean' || pattern === 'nightSky';
}

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
      content: { ...buildCompletionFeedbackContent(), sound: 'default', data: { completionFeedback: true } },
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
  if (rule === 'monthly') {
    const day = base.getDate();
    const nextMonth = new Date(base.getFullYear(), base.getMonth() + 1, 1, base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
    const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    nextMonth.setDate(Math.min(day, lastDay));
    return dateKey(nextMonth);
  }
  else base.setDate(base.getDate() + (rule === 'weekly' ? 7 : 1));
  if (rule === 'weekdays') {
    while (base.getDay() === 0 || base.getDay() === 6) base.setDate(base.getDate() + 1);
  }
  return dateKey(base);
}

// Current schedule surfaces intentionally exclude routine instances and
// skipped items. History/analysis use their own unfiltered data paths.
function isRegularVisibleTask(task: Task) {
  return task.isRoutine !== true && task.status !== 'skipped';
}

type ScheduleConflictKind = 'schedule' | 'preparation' | 'departure';

type ScheduleConflict = {
  key: string;
  task: Task;
  plan: DeparturePlan;
  kind: ScheduleConflictKind;
  effectiveAt: Date;
  taskStart: Date;
  taskEnd: Date;
};

function getTaskScheduleInterval(task: Task) {
  const day = normalizeTaskDateKey(task.scheduledDate);
  if (!day || !task.scheduledTime) return undefined;
  const endTime = task.endAt ?? (normalizeTaskDateKey(task.deadlineDate) === day ? task.deadlineTime : undefined);
  if (!endTime) return undefined;
  const start = dateForReminder(day, task.scheduledTime);
  const end = dateForReminder(day, endTime);
  return end.getTime() > start.getTime() ? { start, end } : undefined;
}

function findScheduleConflict(task: Task, plans: DeparturePlan[], now: Date): ScheduleConflict | undefined {
  if (!isRegularVisibleTask(task) || task.done) return undefined;
  const interval = getTaskScheduleInterval(task);
  const taskDay = normalizeTaskDateKey(task.scheduledDate);
  if (!interval || !taskDay) return undefined;
  let best: ScheduleConflict | undefined;
  for (const plan of plans) {
    if (!plan.id || plan.allDay || planDateKey(plan) !== taskDay) continue;
    const scheduledTime = getPlanScheduledTime(plan);
    if (!scheduledTime) continue;
    const planStart = dateForReminder(taskDay, scheduledTime);
    if (planStart.getTime() <= now.getTime() && !isArrivalReversePlan(plan)) continue;
    const planEnd = plan.endAt && /^\d{2}:\d{2}$/.test(plan.endAt)
      ? dateForReminder(plan.endDate ?? taskDay, plan.endAt)
      : planStart;
    const moments = isArrivalReversePlan(plan) ? getDepartureMoments({ ...plan, date: taskDay }) : undefined;
    const boundaries: Array<{ kind: ScheduleConflictKind; at: Date }> = [
      { kind: 'schedule', at: planStart },
      ...(moments ? [{ kind: 'preparation' as const, at: moments.prepare }, { kind: 'departure' as const, at: moments.leave }] : []),
    ];
    const directOverlap = planEnd.getTime() > planStart.getTime()
      && interval.start.getTime() < planEnd.getTime()
      && interval.end.getTime() > planStart.getTime();
    const boundary = boundaries
      .filter(({ at }) => interval.start.getTime() < at.getTime() && interval.end.getTime() > at.getTime())
      .sort((left, right) => left.at.getTime() - right.at.getTime())[0];
    const match = directOverlap && !isArrivalReversePlan(plan)
      ? { kind: 'schedule' as const, at: planStart }
      : boundary;
    if (!match || (match.at.getTime() <= now.getTime() && planEnd.getTime() <= now.getTime())) continue;
    const candidate = {
      key: `${task.id}:${plan.id}:${interval.start.toISOString()}:${interval.end.toISOString()}:${match.kind}:${match.at.toISOString()}`,
      task,
      plan,
      kind: match.kind,
      effectiveAt: match.at,
      taskStart: interval.start,
      taskEnd: interval.end,
    };
    if (!best
      || candidate.effectiveAt.getTime() < best.effectiveAt.getTime()
      || (candidate.effectiveAt.getTime() === best.effectiveAt.getTime() && String(candidate.plan.id).localeCompare(String(best.plan.id)) < 0)) {
      best = candidate;
    }
  }
  return best;
}

type ScheduleSwitchCandidate = {
  task: Task;
  plan: DeparturePlan;
  kind: ScheduleConflictKind;
  boundaryAt: Date;
  notifyAt: Date;
  key: string;
};

function findScheduleSwitchCandidate(task: Task, plans: DeparturePlan[], now: Date): ScheduleSwitchCandidate | undefined {
  if (!isRegularVisibleTask(task) || task.done) return undefined;
  const day = normalizeTaskDateKey(task.scheduledDate);
  if (!day || !task.scheduledTime) return undefined;
  const endClock = task.endAt ?? (normalizeTaskDateKey(task.deadlineDate) === day ? task.deadlineTime : undefined);
  if (!endClock) return undefined;
  const taskStart = dateForReminder(day, task.scheduledTime);
  const taskEnd = dateForReminder(day, endClock);
  if (taskEnd.getTime() <= taskStart.getTime()) return undefined;

  let best: ScheduleSwitchCandidate | undefined;
  for (const plan of plans) {
    if (!plan.id || plan.allDay || planDateKey(plan) !== day) continue;
    const scheduledClock = getPlanScheduledTime(plan);
    if (!scheduledClock) continue;
    const scheduledAt = dateForReminder(day, scheduledClock);
    const moments = isArrivalReversePlan(plan) ? getDepartureMoments({ ...plan, date: day }) : undefined;
    const boundaries: Array<{ kind: ScheduleConflictKind; at: Date }> = moments
      ? [
        { kind: 'preparation', at: moments.prepare },
        { kind: 'departure', at: moments.leave },
        { kind: 'schedule', at: moments.arrival },
      ]
      : [{ kind: 'schedule', at: scheduledAt }];
    const boundary = boundaries
      .filter(({ at }) => at.getTime() > now.getTime() && taskStart.getTime() < at.getTime() && taskEnd.getTime() > at.getTime())
      .sort((left, right) => left.at.getTime() - right.at.getTime())[0];
    if (!boundary) continue;
    const notifyAt = new Date(boundary.at.getTime() - 15 * 60_000);
    if (notifyAt.getTime() <= now.getTime()) continue;
    const key = `${task.id}:${plan.id}:${boundary.kind}:${boundary.at.toISOString()}`;
    const candidate = { task, plan, kind: boundary.kind, boundaryAt: boundary.at, notifyAt, key };
    if (!best
      || candidate.boundaryAt.getTime() < best.boundaryAt.getTime()
      || (candidate.boundaryAt.getTime() === best.boundaryAt.getTime() && String(candidate.plan.id).localeCompare(String(best.plan.id)) < 0)) {
      best = candidate;
    }
  }
  return best;
}

function getTodayRemainingRoutines(items: Task[], day: string) {
  const latestByRoutine = new Map<string, Task>();
  items.forEach((task) => {
    if (!task.isRoutine || task.done || getTaskStatus(task) === 'skipped' || task.routineEndedAt) return;
    const scheduled = normalizeTaskDateKey(task.scheduledDate);
    if (scheduled && scheduled !== day) return;
    const key = task.routineId ?? task.id;
    const current = latestByRoutine.get(key);
    if (!current || (task.createdAt ?? '') > (current.createdAt ?? '')) latestByRoutine.set(key, task);
  });
  return [...latestByRoutine.values()];
}

function isOccurrenceAfterToday(scheduledDate: string, now: Date) {
  return scheduledDate > dateKey(now);
}

function advanceDateBySteps(value: string | undefined, rule: RepeatRule, steps: number) {
  let current = value;
  for (let index = 0; index < steps; index += 1) current = advanceDateValue(current, rule);
  return current;
}

function nextFutureOccurrence(startDate: string | undefined, rule: RepeatRule, _scheduledTime: string | undefined, now: Date) {
  let candidate = advanceDateValue(startDate ?? dateKey(now), rule);
  let steps = 1;
  for (let index = 0; index < 5000 && !isOccurrenceAfterToday(candidate, now); index += 1) {
    const next = advanceDateValue(candidate, rule);
    if (next === candidate) break;
    candidate = next;
    steps += 1;
  }
  return { scheduledDate: candidate, steps };
}

function repeatSeriesKey(task: Task) {
  if (task.routineId) return `routine:${task.routineId}`;
  // Generated ordinary repeat instances preserve createdAt. This gives the
  // series a stable identity without merging unrelated same-title tasks.
  return `repeat:${task.createdAt ?? task.id}`;
}

function shiftDateKey(value: string, days: number) {
  const date = dateForReminder(value, '12:00');
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function normalizeRoutineResumeDate(value: string | undefined, templateScheduledDate: string | undefined, resumedScheduledDate: string) {
  if (!value) return undefined;
  if (!templateScheduledDate) return value < resumedScheduledDate ? resumedScheduledDate : value;
  const offset = Math.round((dateForReminder(value, '12:00').getTime() - dateForReminder(templateScheduledDate, '12:00').getTime()) / 86_400_000);
  return shiftDateKey(resumedScheduledDate, Math.max(0, offset));
}

function routineResumeScheduledDate(template: Task, now: Date) {
  const today = dateKey(now);
  if (template.repeatRule !== 'weekdays') return today;
  const weekday = dateForReminder(today, '12:00').getDay();
  return weekday === 0 || weekday === 6 ? advanceDateValue(today, 'weekdays') : today;
}

function buildNextRepeatedTask(task: Task, current: Task[], now = new Date()): Task | undefined {
  const rule = task.repeatRule ?? 'none';
  // Deactivated routines keep their historical repeatRule for analytics, but
  // must never create a new occurrence when an old instance is completed.
  if (rule === 'none' || (task.routineId && task.routineEndedAt)) return undefined;
  const { scheduledDate, steps } = nextFutureOccurrence(task.scheduledDate, rule, task.scheduledTime, now);
  const routineId = task.routineId ?? (task.isRoutine ? task.id : undefined);
  const seriesKey = repeatSeriesKey(task);
  if (current.some((candidate) => (
    candidate.id !== task.id
    && repeatSeriesKey(candidate) === seriesKey
    && (candidate.repeatRule ?? 'none') === rule
    && candidate.scheduledDate === scheduledDate
  ))) return undefined;
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    ...task,
    id: `${stamp}-${task.id}`,
    createdAt: task.createdAt ?? task.id,
    done: false,
    status: 'active',
    skippedAt: undefined,
    completedAt: undefined,
    deadlineDate: task.deadlineDate ? advanceDateBySteps(task.deadlineDate, rule, steps) : undefined,
    remindDate: task.remindAt ? advanceDateBySteps(task.remindDate ?? task.scheduledDate ?? dateKey(now), rule, steps) : undefined,
    scheduledDate,
    scheduledTime: task.scheduledTime,
    isRoutine: task.isRoutine,
    routineId,
    subtasks: task.subtasks?.map((item, index) => ({ ...item, order: index, done: false })),
    listItems: task.listItems?.map((item, index) => ({ ...item, id: `${stamp}-list-${index}`, order: index, checked: false })),
  };
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
      const nextTask = buildNextRepeatedTask(task, [...current, ...nextTasks]);
      if (nextTask) nextTasks.push(nextTask);
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

// Night Sky is a finished dark artwork, so its foreground must remain stable
// regardless of the user's saved nine-color Design selection.
function getNightSkyPalette(base: ChicThemePalette): ChicThemePalette {
  return {
    ...base,
    id: 'nightSky',
    background: '#101722', patternBase: '#101722', patternStripe: 'rgba(214,182,111,0.34)',
    surface: 'rgba(16,24,36,0.94)', cardSurface: 'rgba(18,28,42,0.92)', cardTint: 'rgba(214,182,111,0.16)', surfaceSubtle: 'rgba(24,35,50,0.92)',
    border: 'rgba(220,225,230,0.42)', accent: '#D6B66F', accentStrong: '#E4CA8B', accentSoft: 'rgba(214,182,111,0.22)',
    textPrimary: '#F4F2EC', textSecondary: '#D8D9D7', textMuted: '#AEB4B5', onAccent: '#101722',
    success: '#A8C9BB', warning: '#D6B66F', danger: '#E1A0A0', focusBackground: '#101722',
    focusSurface: 'rgba(18,28,42,0.94)', calendarBackground: '#101722', taskBackground: 'rgba(18,28,42,0.92)', taskMeta: '#AEB4B5',
    statusAccent: '#D6B66F', warm: 'rgba(214,182,111,0.34)',
  };
}

function getNightSkyThemeTokens() {
  return getThemeTokens('chic', 'nightSky');
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
      ...buildAffirmationContent(affirmation.text),
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
  const { width: screenWidth } = useWindowDimensions();
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
  const [focusActivity, setFocusActivity] = useState<{ taskTitle?: string; endsAt?: string; elapsedStartAt?: string; elapsedSeconds?: number; remainingSeconds?: number; running?: boolean }>();
  const [liveActivityEnabled, setLiveActivityEnabled] = useState(false);
  const [liveActivityRuntimeStatus, setLiveActivityRuntimeStatus] = useState<RhythmLiveActivityRuntimeStatus>('off');
  const liveActivityEnabledRef = React.useRef(false);
  const liveActivityPreferenceTouchedRef = React.useRef(false);
  const [liveActivityDisplayOptions, setLiveActivityDisplayOptions] = useState<LiveActivityDisplayOptions>(() => ({ ...DEFAULT_LIVE_ACTIVITY_DISPLAY_OPTIONS }));
  const [liveActivityCustomization, setLiveActivityCustomization] = useState<LiveActivityCustomizationSettings>(() => ({ ...DEFAULT_LIVE_ACTIVITY_CUSTOMIZATION }));
  const liveActivitySerializedRef = React.useRef<string | undefined>(undefined);
  const [voiceFocusRequest, setVoiceFocusRequest] = useState<{ durationMinutes: number; id: number }>();
  const [rewardedAccess, setRewardedAccess] = useState<RewardedAccessState>(DEFAULT_REWARDED_ACCESS_STATE);
  const [rewardedAccessHydrated, setRewardedAccessHydrated] = useState(false);
  const [rewardedPrompt, setRewardedPrompt] = useState<{ featureId: RewardedFeatureId; title: string; description: string } | null>(null);
  const [rewardedPromptClosing, setRewardedPromptClosing] = useState(false);
  const rewardedPromptCompletionRef = React.useRef<(() => void) | undefined>(undefined);
  const topImageRewardCompletedRef = React.useRef(false);
  const topImageRewardDismissActionRef = React.useRef<(() => void) | undefined>(undefined);
  const widgetPhotoUnlockTargetRef = React.useRef<WidgetType | null>(null);
  const rewardedGenericBusyRef = React.useRef(false);
  const rewardedWishBusyRef = React.useRef(false);
  const rewardedDesignBusyRef = React.useRef(false);
  const tasksRef = React.useRef<Task[]>([]);
  const scheduleTaskNotificationsRef = React.useRef<(task: Task) => Promise<void>>(async () => undefined);
  const navigateWithinAppRef = React.useRef<(nextScreen: Screen) => void>(() => undefined);
  const hydratedRef = React.useRef(false);
  useEffect(() => {
    let active = true;
    void loadRewardedAccessState().then((loaded) => {
      if (!active) return;
      setRewardedAccess(loaded);
      setRewardedAccessHydrated(true);
    });
    return () => { active = false; };
  }, []);
  const persistenceDisabledRef = React.useRef(false);
  const saveFailureNotifiedRef = React.useRef(false);
  const persistenceTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestPersistedStateRef = React.useRef<PersistedState | undefined>(undefined);
  const pendingNotificationCompletionIdsRef = React.useRef<string[]>([]);
  const pendingWidgetActionsProcessingRef = React.useRef(false);
  const pendingNotificationNavigationRef = React.useRef<Array<'timeline' | 'routine'>>([]);
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
  const widgetCustomPhotoSyncedUrisRef = React.useRef<Record<string, string>>({});
  const widgetAffirmationPhotoSyncedUrisRef = React.useRef<Record<number, string>>({});
  const widgetSnapshotSerializedRef = React.useRef<string | undefined>(undefined);
  const widgetSnapshotInFlightRef = React.useRef<{ requestId: number; serialized: string } | undefined>(undefined);
  const widgetSnapshotRequestRef = React.useRef(0);
  const widgetSnapshotSaveChainRef = React.useRef<Promise<void>>(Promise.resolve());
  const [showCompleted, setShowCompleted] = useState(false);
  const [completionIcon, setCompletionIcon] = useState('✓');
  // Mono is available to every plan. Keep the persisted design mode stable and
  // resolve the actual Light/Dark rendering from this preference and the OS.
  const [designMode, setDesignMode] = useState<DesignMode>('minimal');
  const [monoAppearance, setMonoAppearance] = useState<'auto' | 'light' | 'dark'>('auto');
  const [monoPattern, setMonoPattern] = useState<MonoPattern>('plain');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [premiumTrialReminderEnabled, setPremiumTrialReminderEnabled] = useState(true);
  const premiumTrialNoticeShownRef = React.useRef<string | undefined>(undefined);
  const pendingPremiumTrialChoiceRef = React.useRef<string | undefined>(undefined);
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
  const affirmationOperationGenerationRef = React.useRef<Record<string, number>>({});
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
  const [pendingTopPhoto, setPendingTopPhoto] = useState<{ target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>; originalUri: string; previewUri?: string; sourceWidth: number; sourceHeight: number; cropRect?: NormalizedCropRect }>();
  const [topImageCropResumeToken, setTopImageCropResumeToken] = useState(0);
  const topImageAccessPurchaseResumeRef = React.useRef(false);
  const resumeTopImageAfterAccessFlow = React.useCallback(() => {
    if (!topImageAccessPurchaseResumeRef.current) return;
    topImageAccessPurchaseResumeRef.current = false;
    InteractionManager.runAfterInteractions(() => setTopImageCropResumeToken((current) => current + 1));
  }, []);
  const [topImageProcessing, setTopImageProcessing] = useState(false);
  const topImageProcessingRef = React.useRef(false);
  const topImageCropDismissActionRef = React.useRef<{ type: 'resume' | 'reselect'; target?: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'> }>({ type: 'resume' });
  const previousTopImageVisibleRef = React.useRef(false);
  useEffect(() => {
    const visible = Boolean(pendingTopPhoto);
    if (__DEV__ && visible && !previousTopImageVisibleRef.current) {
      console.log('[TopImage] crop-presented', { target: pendingTopPhoto?.target });
    }
    previousTopImageVisibleRef.current = visible;
  }, [pendingTopPhoto]);
  const [recoveryHistory, setRecoveryHistory] = useState<RecoveryRecord[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [focusState, setFocusState] = useState<FocusPersistedState | undefined>();
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
  const [tomorrowPrepPromptedDate, setTomorrowPrepPromptedDate] = useState<string | undefined>();
  const tomorrowPrepPromptedDateRef = React.useRef<string | undefined>(undefined);
  const [routineRemainingNotifiedDate, setRoutineRemainingNotifiedDate] = useState<string | undefined>();
  const routineRemainingNotifiedDateRef = React.useRef<string | undefined>(undefined);
  const [readNoticeIds, setReadNoticeIds] = useState<string[]>([]);
  const [noticeCenterOpen, setNoticeCenterOpen] = useState(false);
  const routineRemainingNotificationInFlightRef = React.useRef(false);
  const [homeInitialTab, setHomeInitialTab] = useState<'now' | 'list' | 'routine'>('now');
  const [tomorrowPrepOpen, setTomorrowPrepOpen] = useState(false);
  const [tomorrowPrepStep, setTomorrowPrepStep] = useState<0 | 1 | 2 | 3>(0);
  const [focusTaskCompletionPrompt, setFocusTaskCompletionPrompt] = useState<FocusSession | undefined>();
  const focusTaskCompletionPromptedRef = React.useRef(new Set<string>());
  const tomorrowPrepDeferredUntilRef = React.useRef(0);
  const [scheduleConflictPrompt, setScheduleConflictPrompt] = useState<ScheduleConflict | undefined>();
  const pendingScheduleConflictRef = React.useRef<ScheduleConflict | undefined>(undefined);
  const scheduleConflictKeysRef = React.useRef(new Set<string>());
  const [premiumOpen, setPremiumOpen] = useState(false);
  const premiumOpenRef = React.useRef(false);
  premiumOpenRef.current = premiumOpen;
  const [designCustomizeOpen, setDesignCustomizeOpen] = useState(false);
  const [designCustomizePurchased, setDesignCustomizePurchased] = useState(false);
  const [premiumTargetFeature, setPremiumTargetFeature] = useState<PremiumGuideFeatureId>(DEFAULT_PREMIUM_GUIDE_FEATURE);
  const purchaseDiagnosticPendingRef = React.useRef(false);
  const purchaseDiagnosticActiveRef = React.useRef(false);
  const [storePremiumAccess, setStorePremiumAccess] = useState(false);
  const [storeDesignCustomizeAccess, setStoreDesignCustomizeAccess] = useState(false);
  const [designPreviewPattern, setDesignPreviewPattern] = useState<ChicPattern>();
  const [designPreviewMode, setDesignPreviewMode] = useState<DesignPreviewMode>('chic');
  const [designPreviewPhotoUri, setDesignPreviewPhotoUri] = useState<string>();
  const [designPreviewMonoPattern, setDesignPreviewMonoPattern] = useState<MonoPattern>();
  const [captureStudioOpen, setCaptureStudioOpen] = useState(false);
  const [onboardingDesignSelectionPending, setOnboardingDesignSelectionPending] = useState(false);
  const completingInitialDesignSelectionRef = React.useRef(false);
  const [designTrialNoticeOpen, setDesignTrialNoticeOpen] = useState(false);
  const pendingDesignApplyRef = React.useRef<(() => void) | undefined>(undefined);
  const designRewardAfterCustomizeDismissRef = React.useRef<(() => void) | undefined>(undefined);
  const premiumAfterDismissRef = React.useRef<(() => void) | undefined>(undefined);
  const designCustomizeAfterDismissRef = React.useRef<(() => void) | undefined>(undefined);
  const designTrialAfterDismissRef = React.useRef<(() => void) | undefined>(undefined);
  const pendingDesignTrialRef = React.useRef<(() => void) | undefined>(undefined);
  const applyPendingDesignAfterEntitlement = React.useCallback(() => {
    const pending = pendingDesignApplyRef.current;
    if (!pending) return;
    pendingDesignApplyRef.current = undefined;
    setDesignTrialNoticeOpen(false);
    setDesignCustomizeOpen(false);
    setPremiumOpen(false);
    pending();
  }, []);
  const [hydrated, setHydrated] = useState(false);
  const configuredPlanTier: PlanTier = process.env.EXPO_PUBLIC_RHYTHM_PLAN === 'premium' ? 'premium' : 'free';
  // Development-only override for validating both purchase states before the
  // App Store product is configured. It is intentionally session-scoped and
  // never persisted over the user's saved data.
  const [devPlanTierOverride, setDevPlanTierOverride] = useState<PlanTier | null>(null);
  const planTier: PlanTier = devPlanTierOverride ?? (configuredPlanTier === 'premium' || storePremiumAccess ? 'premium' : 'free');
  const [widgetEntitlementOverride, setWidgetEntitlementOverride] = useState<WidgetEntitlementOverride>('actual');
  const widgetPlanTier: PlanTier = __DEV__ && widgetEntitlementOverride === 'premium'
    ? 'premium'
    : __DEV__ && (widgetEntitlementOverride === 'free' || widgetEntitlementOverride === 'design')
      ? 'free'
      : planTier;
  const widgetDesignCustomizePurchased = __DEV__ && (widgetEntitlementOverride === 'design' || widgetEntitlementOverride === 'premium')
    ? true
    : __DEV__ && widgetEntitlementOverride === 'free'
      ? false
      : storeDesignCustomizeAccess;
  const planTierRef = React.useRef<PlanTier>(planTier);
  const handleStoreDesignEntitlement = React.useCallback((active: boolean) => {
    logPremiumDiagnostic('PREMIUM_ENTITLEMENT_CHANGED', { plan: active ? 'design' : 'free', purchaseStatus: 'entitlement', planTier: planTierRef.current, modalVisible: premiumOpenRef.current, entitlementsResolved: false, pending: purchaseDiagnosticPendingRef.current });
    setStoreDesignCustomizeAccess(active);
    if (active) setDesignCustomizePurchased(true);
    if (active) applyPendingDesignAfterEntitlement();
  }, [applyPendingDesignAfterEntitlement]);
  const handleStorePremiumEntitlement = React.useCallback((active: boolean) => {
    logPremiumDiagnostic('PREMIUM_ENTITLEMENT_CHANGED', { plan: active ? 'premium' : 'free', purchaseStatus: 'entitlement', planTier: planTierRef.current, modalVisible: premiumOpenRef.current, entitlementsResolved: false, pending: purchaseDiagnosticPendingRef.current });
    setStorePremiumAccess(active);
    if (active) applyPendingDesignAfterEntitlement();
  }, [applyPendingDesignAfterEntitlement]);
  const choosePremiumTrialReminder = React.useCallback((trial: PremiumTrialStarted, enabled: boolean) => {
    const noticeKey = `${trial.productId}:${trial.trialEndAt}`;
    pendingPremiumTrialChoiceRef.current = noticeKey;
    setPremiumTrialReminderEnabled(enabled);
    if (!enabled) {
      void cancelPremiumTrialReminder().finally(() => {
        if (pendingPremiumTrialChoiceRef.current === noticeKey) pendingPremiumTrialChoiceRef.current = undefined;
      });
      return;
    }
    // Alert button callbacks can run before the native alert's dismissal
    // animation finishes. Wait for that interaction to settle before asking
    // iOS to present its own notification permission sheet.
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        void (async () => {
          try {
            if (await ensureNotifications()) {
              await schedulePremiumTrialReminder(trial.trialEndAt);
              if (__DEV__) console.log('[Notifications] Premium trial reminder selected', { trialEndAt: new Date(trial.trialEndAt).toISOString() });
            }
          } catch (error) {
            if (__DEV__) console.log('[Notifications] Premium trial reminder selection failed', error);
          } finally {
            if (pendingPremiumTrialChoiceRef.current === noticeKey) pendingPremiumTrialChoiceRef.current = undefined;
          }
        })();
      }, 250);
    });
  }, []);
  const handlePremiumTrialStarted = React.useCallback((trial: PremiumTrialStarted) => {
    const noticeKey = `${trial.productId}:${trial.trialEndAt}`;
    if (premiumTrialNoticeShownRef.current === noticeKey) return;
    premiumTrialNoticeShownRef.current = noticeKey;
    logPremiumDiagnostic('PREMIUM_TRIAL_ALERT_REQUESTED', { plan: 'monthly', purchaseStatus: 'trial_started', planTier: planTierRef.current, modalVisible: premiumOpenRef.current, entitlementsResolved: false, pending: purchaseDiagnosticPendingRef.current });
    const monthlyPrice = trial.displayPrice ?? 'App Storeに表示された価格';
    Alert.alert(
      'Premiumを開始しました',
      `7日間無料で利用できます。\n無料期間終了後は${monthlyPrice} / 月で自動更新されます。\n\n無料期間終了の前日にお知らせしますか？\n終了約24時間前に通知します。`,
      [
        { text: 'お知らせする', onPress: () => { logPremiumDiagnostic('PREMIUM_TRIAL_ALERT_DISMISSED', { choice: 'enabled', plan: 'monthly', purchaseStatus: 'trial_choice', planTier: planTierRef.current, modalVisible: premiumOpenRef.current, entitlementsResolved: false, pending: purchaseDiagnosticPendingRef.current }); choosePremiumTrialReminder(trial, true); } },
        { text: '今回はしない', style: 'cancel', onPress: () => { logPremiumDiagnostic('PREMIUM_TRIAL_ALERT_DISMISSED', { choice: 'disabled', plan: 'monthly', purchaseStatus: 'trial_choice', planTier: planTierRef.current, modalVisible: premiumOpenRef.current, entitlementsResolved: false, pending: purchaseDiagnosticPendingRef.current }); choosePremiumTrialReminder(trial, false); } },
      ],
    );
  }, [choosePremiumTrialReminder]);
  const storeKit = useRhythmStoreKit({
    onPremiumEntitlement: handleStorePremiumEntitlement,
    onDesignCustomizeEntitlement: handleStoreDesignEntitlement,
    onPremiumTrialStarted: handlePremiumTrialStarted,
  });
  const storeKitEntitlementsResolved = !storeKit.configured || storeKit.entitlementsResolved;
  useEffect(() => {
    logPremiumDiagnostic('PREMIUM_MODAL_VISIBLE', { plan: planTier, purchaseStatus: purchaseDiagnosticPendingRef.current ? 'processing' : 'idle', planTier, modalVisible: premiumOpen, entitlementsResolved: storeKitEntitlementsResolved, pending: purchaseDiagnosticPendingRef.current });
  }, [planTier, premiumOpen, storeKitEntitlementsResolved]);
  const purchasePremiumWithDiagnostics = React.useCallback(async (plan: 'monthly' | 'annual') => {
    purchaseDiagnosticPendingRef.current = true;
    purchaseDiagnosticActiveRef.current = true;
    logPremiumDiagnostic('PURCHASE_START', { plan, purchaseStatus: 'processing', planTier, modalVisible: premiumOpenRef.current, entitlementsResolved: storeKitEntitlementsResolved, pending: true });
    try {
      const result = await storeKit.purchasePremium(plan);
      logPremiumDiagnostic('PREMIUM_PURCHASE_STATUS', { plan, purchaseStatus: result.success ? 'success' : 'failed', planTier: planTierRef.current, modalVisible: premiumOpenRef.current, entitlementsResolved: storeKitEntitlementsResolved, pending: false });
      return result.success;
    } finally {
      purchaseDiagnosticPendingRef.current = false;
    }
  }, [planTier, storeKit, storeKitEntitlementsResolved]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || !purchaseDiagnosticActiveRef.current) return;
      purchaseDiagnosticActiveRef.current = false;
      logPremiumDiagnostic('APP_INTERACTION_RECOVERED', { plan: planTierRef.current, purchaseStatus: 'foreground', planTier: planTierRef.current, modalVisible: premiumOpenRef.current, entitlementsResolved: storeKitEntitlementsResolved, pending: purchaseDiagnosticPendingRef.current });
    });
    return () => subscription.remove();
  }, [storeKitEntitlementsResolved]);
  const premiumTrialReminderAvailable = planTier === 'premium'
    && typeof storeKit.premiumTrialEndAt === 'number'
    && storeKit.premiumTrialEndAt > now.getTime();
  useEffect(() => {
    if (!hydrated || !storeKitEntitlementsResolved) return;
    const trialEndAt = storeKit.premiumTrialEndAt;
    const trialKey = trialEndAt ? `${STORE_PRODUCT_IDS.premiumMonthly}:${trialEndAt}` : undefined;
    if (trialKey && pendingPremiumTrialChoiceRef.current === trialKey) return;
    if (!premiumTrialReminderEnabled) {
      void cancelPremiumTrialReminder();
      return;
    }
    // A restored subscription does not identify whether its expiration is an
    // introductory offer. Keep an already scheduled reminder intact rather
    // than cancelling it when no trustworthy trial date is available.
    if (!trialEndAt) return;
    void (async () => {
      if (!(await ensureNotifications())) return;
      const scheduled = await schedulePremiumTrialReminder(trialEndAt);
      if (__DEV__) console.log('[Notifications] Premium trial reminder', { scheduled, trialEndAt: new Date(trialEndAt).toISOString() });
    })().catch((error) => {
      if (__DEV__) console.log('[Notifications] Premium trial reminder unavailable', error);
    });
  }, [hydrated, premiumTrialReminderEnabled, storeKit.premiumTrialEndAt, storeKitEntitlementsResolved]);
  // StoreKit is the source of truth for Design Customize. Premium access is
  // taken from the resolved StoreKit entitlement as well; the development
  // plan switch and the persisted compatibility mirror never grant access.
  const storeDesignCustomizeEntitlement = storeKit.designConfigured
    && storeKit.designEntitlementResolved
    && storeDesignCustomizeAccess;
  const hasDesignCustomizeAccess = storePremiumAccess || storeDesignCustomizeEntitlement;
  const designAccessStatus = storeDesignCustomizeEntitlement
    ? '購入済み'
    : storePremiumAccess
      ? 'プレミアムで利用中'
      : isPremiumDesignTrialActive(rewardedAccess, now)
        ? '24時間無料体験中'
        : isPremiumDesignUnlocked(rewardedAccess, now)
          ? '広告で12時間利用中'
          : storeKitEntitlementsResolved ? '未購入 ›' : '購入状態を確認中';
  const currentDesignNeedsAccess = designMode === 'photo'
    || ((designMode === 'minimal' || designMode === 'dark') && monoPattern !== 'plain')
    || (designMode === 'chic' && chicPattern !== 'plain');
  const designRewardAvailable = rewardedAccessHydrated && currentDesignNeedsAccess
    && planTier !== 'premium'
    && !hasDesignCustomizeAccess
    && !isPremiumDesignTrialActive(rewardedAccess, now)
    && !isPremiumDesignUnlocked(rewardedAccess, now)
    && (canStartPremiumDesignTrial(rewardedAccess) || rewardedAccess.premiumDesignTrial.used);
  const designRewardLabel = canStartPremiumDesignTrial(rewardedAccess)
    ? '24時間無料で使う'
    : '広告を見て12時間使う';
  useEffect(() => {
    if (!__DEV__) return;
    console.log('[DesignEntitlement]', {
      planTier,
      storePremiumAccess,
      storeDesignCustomizeAccess,
      designCustomizePurchased,
      designEntitlementResolved: storeKit.designEntitlementResolved,
      hasDesignCustomizeAccess,
      premiumDesignTrial: {
        used: rewardedAccess.premiumDesignTrial.used,
        expiresAt: rewardedAccess.premiumDesignTrial.expiresAt,
      },
      premiumDesignUnlockedUntil: rewardedAccess.premiumDesign.unlockedUntil,
      photoTopUnlocks: rewardedAccess.photoCustomization.topExtraSlotsUnlocked,
    });
  }, [designCustomizePurchased, hasDesignCustomizeAccess, planTier, rewardedAccess, storeDesignCustomizeAccess, storeKit.designEntitlementResolved, storePremiumAccess]);
  useEffect(() => {
    liveActivityEnabledRef.current = liveActivityEnabled;
  }, [liveActivityEnabled]);
  const handleLiveActivityEnabled = React.useCallback((requested: boolean) => {
    const previous = liveActivityEnabledRef.current;
    liveActivityPreferenceTouchedRef.current = true;
    liveActivityEnabledRef.current = requested;
    setLiveActivityEnabled(requested);
    setLiveActivityRuntimeStatus(requested ? 'waiting' : 'off');
    if (__DEV__) {
      console.log('[LiveActivityToggle]', {
        previous,
        requested,
        next: requested,
        planTier,
        hydrated,
      });
    }
  }, [hydrated, planTier]);
  // Mono plain is free. Loose Leaf and Chic use the same Design access/trial
  // boundary as the paid Design/Photo choices; their preview remains free.
  const resetWidgetPhotoUnlockForDevelopment = React.useCallback(() => {
    if (!__DEV__) return;
    Alert.alert(
      'Widget広告状態をリセット',
      'Widget写真の広告解放だけを未解放状態へ戻します。他のRewarded状態や購入状態は変更しません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: () => {
            setRewardedAccess((current) => {
              const next: RewardedAccessState = {
                ...current,
                widgetPhotoCustomization: { ...DEFAULT_REWARDED_ACCESS_STATE.widgetPhotoCustomization },
              };
              void saveRewardedAccessState(next);
              return next;
            });
          },
        },
      ],
    );
  }, []);
  const activeDesignTrialId = planTier !== 'premium' && (isPremiumDesignTrialActive(rewardedAccess, now) || isPremiumDesignUnlocked(rewardedAccess, now))
    ? rewardedAccess.premiumDesignTrial.designId
    : null;
  const hasMonoPatternAccess = (pattern: MonoPattern) => pattern === 'plain'
    || planTier === 'premium'
    || hasDesignCustomizeAccess
    || isPremiumDesignUnlocked(rewardedAccess, now)
    || isPremiumDesignTrialActive(rewardedAccess, now);
  const effectiveMonoPattern: MonoPattern = hasMonoPatternAccess(monoPattern) ? monoPattern : 'plain';
  const activeDesignTrial = activeDesignTrialId && activeDesignTrialId !== 'photo' && designMode === 'chic' ? activeDesignTrialId as ChicPattern : null;
  const photoDesignTemporaryAccess = hasDesignCustomizeAccess || isPremiumDesignTrialActive(rewardedAccess, now) || isPremiumDesignUnlocked(rewardedAccess, now);
  const photoThemeEnabled = designMode === 'photo' && (hasDesignCustomizeAccess || photoDesignTemporaryAccess || rewardedAccess.photoCustomization.backgroundUnlocked || rewardedAccess.photoCustomization.focusUnlocked || rewardedAccess.photoCustomization.topExtraSlotsUnlocked > 0);
  const photoTopImageAccess = hasDesignCustomizeAccess || photoDesignTemporaryAccess || rewardedAccess.photoCustomization.topExtraSlotsUnlocked > 0;
  const uiDesignMode: Exclude<DesignMode, 'photo'> = designMode === 'photo'
    ? 'chic'
    : isMonoDesign ? resolvedMonoMode : designMode;
  const photoBackgroundUri = photoThemeEnabled && (hasDesignCustomizeAccess || photoDesignTemporaryAccess || rewardedAccess.photoCustomization.backgroundUnlocked) && photoTheme.placement !== 'top' ? photoTheme.imageUri : undefined;
  const photoTopImageUri = photoTopImageAccess || Boolean(photoTheme.topImageUris?.[screen] ?? photoTheme.topImageOriginalUris?.[screen])
    ? photoTheme.topImageUris?.[screen] ?? photoTheme.topImageOriginalUris?.[screen]
    : undefined;
  // Per-screen top visuals are independent from the Photo background theme.
  // Keep this display path available in Mono, Design, and Photo while retaining
  // the existing top-slot entitlement gate.
  const wishTopImageUri = photoTopImageAccess || Boolean(photoTheme.topImageUris?.wish ?? photoTheme.topImageOriginalUris?.wish)
    ? photoTheme.topImageUris?.wish ?? photoTheme.topImageOriginalUris?.wish
    : undefined;
  const focusBackgroundUri = photoThemeEnabled && (hasDesignCustomizeAccess || photoDesignTemporaryAccess || rewardedAccess.photoCustomization.focusUnlocked) ? photoTheme.focusBackgroundUri : undefined;
  // A temporary trial is an explicit, time-bounded override. Persisted free
  // users still fall back to plain when no trial is active.
  const effectiveChicPattern = (activeDesignTrial ?? getEffectiveChicPattern(planTier, chicPattern, hasDesignCustomizeAccess)) as ChicPattern;
  // Keep decorative pattern and UI color independent. Night Sky is the one
  // exception: its completed artwork has a fixed foreground palette, while
  // the selected color remains persisted and is restored on exit.
  const selectedChicPalette = getDesignCheckThemeTokens(chicCheckColor);
  const chicPalette = effectiveChicPattern === 'nightSky' ? getNightSkyPalette(selectedChicPalette) : selectedChicPalette;
  const getThemedThemeTokens = React.useCallback((mode: DesignMode) => mode === 'chic' && effectiveChicPattern === 'nightSky'
    ? getNightSkyThemeTokens()
    : getThemeTokens(mode, mode === 'chic' ? selectedChicPalette.id : chicCheckColor), [chicCheckColor, effectiveChicPattern, selectedChicPalette.id]);
  // Resolve the app's shared ThemeTokens from the same effective palette used
  // by the foreground components. In particular, nightSky must not render a
  // normal nine-color frame before its fixed palette is applied. Photo keeps
  // its existing photo tokens while the dedicated Design palette applies to
  // Mono/Design UI.
  const theme = useMemo(() => designMode === 'photo'
    ? getThemeTokens('photo', appDesignPaletteId)
    : getThemedThemeTokens(uiDesignMode), [appDesignPaletteId, designMode, getThemedThemeTokens, uiDesignMode]);
  // Design uses one palette for every surface. Keep the legacy color shape for
  // components that still consume the shared app colors object.
  const themedColors = useMemo(() => {
    const tokens = getThemedThemeTokens(uiDesignMode).colors;
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
  }, [chicCheckColor, getThemedThemeTokens, uiDesignMode]);
  const currentWishMonthKey = wishMonthKey(now);
  const getRewardedPromptProgress = React.useCallback((featureId: RewardedFeatureId) => {
    const required = getRequiredAds(featureId);
    if (featureId === 'wishCreate') return { current: rewardedAccess.wishCreateProgress, required };
    if (featureId === 'wishActionCreate') return { current: rewardedAccess.wishActionCreateProgress, required };
    if (featureId === 'routineSkipBonus') return { current: rewardedAccess.routine.skipBonusProgress, required };
    if (featureId === 'widgetPhoto') return { current: 0, required };
    return { current: 0, required };
  }, [rewardedAccess]);

  const grantRewarded = React.useCallback(async (featureId: RewardedFeatureId): Promise<RewardedAccessResult> => {
    if (planTier === 'premium') return { success: true, completed: true };
    if (featureId === 'routineSkipBonus' && rewardedAccess.routine.skipBonusAdded >= 2) return { success: true, completed: true, message: 'Skip Bonusは最大まで取得済みです。' };
    if (featureId === 'photoTop' && rewardedAccess.photoCustomization.topExtraSlotsUnlocked >= 5) return { success: true, completed: true, message: '写真枠は最大まで解放済みです。' };
    if (rewardedGenericBusyRef.current) return { success: false, message: '広告を準備しています…' };
    rewardedGenericBusyRef.current = true;
    try {
      let showTestRewardedAd: typeof import('./services/rewardedAds').showTestRewardedAd;
      try {
        ({ showTestRewardedAd } = require('./services/rewardedAds') as typeof import('./services/rewardedAds'));
      } catch (error) {
        if (__DEV__) console.log('[Ads] show:error', error instanceof Error ? error.message : String(error));
        return { success: false, message: '広告の確認にはDevelopment Buildが必要です。' };
      }
      const earned = await showTestRewardedAd().catch((error) => {
        if (__DEV__) console.log('[Ads] show:error', error instanceof Error ? error.message : String(error));
        return false;
      });
      if (!earned) return { success: false, message: '広告を読み込めませんでした。もう一度お試しください。' };
      const required = getRequiredAds(featureId);
      const base = rewardedAccess;
      let next: RewardedAccessState = base;
      let completed = true;
      if (featureId === 'wishCreate') {
        const progress = Math.min(required, base.wishCreateProgress + 1);
        next = { ...base, wishCreateProgress: progress };
        completed = progress >= required;
      } else if (featureId === 'wishActionCreate') {
        const progress = Math.min(required, base.wishActionCreateProgress + 1);
        next = { ...base, wishActionCreateProgress: progress };
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
      } else if (featureId === 'widgetPhoto') {
        const widgetType = widgetPhotoUnlockTargetRef.current;
        if (!widgetType) return { success: false, message: '写真を使うWidgetを選択してください。' };
        const unlockedAt = new Date();
        next = { ...base, widgetPhotoCustomization: { widgetType, unlockedAt: unlockedAt.toISOString(), expiresAt: addHours(unlockedAt, 24 * REWARDED_AD_RULES.widgetPhoto.unlockDurationDays) } };
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
  }, [getRewardedPromptProgress, planTier, rewardedAccess]);

  const openRewardedPrompt = React.useCallback((featureId: RewardedFeatureId, title: string, description: string, onCompleted?: () => void) => {
    if (planTier === 'premium') {
      onCompleted?.();
      return;
    }
    if (featureId === 'photoTop') topImageRewardCompletedRef.current = false;
    setRewardedPromptClosing(false);
    rewardedPromptCompletionRef.current = onCompleted;
    setRewardedPrompt({ featureId, title, description });
  }, [planTier]);

  const finishTopImageRewardPrompt = React.useCallback(() => {
    const action = topImageRewardDismissActionRef.current;
    if (!action) return;
    topImageRewardDismissActionRef.current = undefined;
    setRewardedPrompt(null);
    setRewardedPromptClosing(false);
    InteractionManager.runAfterInteractions(action);
  }, []);

  const handleRewardedPromptReward = React.useCallback(async () => {
    if (!rewardedPrompt) return { success: false, message: '広告を利用できません。' };
    const result = await grantRewarded(rewardedPrompt.featureId);
    if (result.completed) {
      if (rewardedPrompt.featureId === 'photoTop') {
        // The picker is another native presentation. Open it only after the
        // rewarded sheet has dismissed, not while that sheet is still visible.
        topImageRewardCompletedRef.current = true;
      } else {
        const continuation = rewardedPromptCompletionRef.current;
        rewardedPromptCompletionRef.current = undefined;
        continuation?.();
      }
    }
    return result;
  }, [grantRewarded, rewardedPrompt]);
  const requestWidgetPhotoUnlock = React.useCallback((widgetType: WidgetType, override?: WidgetEntitlementOverride) => {
    const overrideFree = __DEV__ && override === 'free';
    const overrideDesign = __DEV__ && (override === 'design' || override === 'premium');
    const effectivePlanTier: PlanTier = override === 'premium' ? 'premium' : overrideFree || override === 'design' ? 'free' : planTier;
    const effectiveDesignAccess = overrideDesign || ((override == null || override === 'actual') && hasDesignCustomizeAccess);
    if (effectivePlanTier === 'premium' || effectiveDesignAccess) return;
    if (isWidgetPhotoUnlockActive(rewardedAccess, widgetType, new Date())) return;
    const current = rewardedAccess.widgetPhotoCustomization;
    if (current.widgetType && current.expiresAt && new Date(current.expiresAt).getTime() > Date.now()) return;
    widgetPhotoUnlockTargetRef.current = widgetType;
    openRewardedPrompt('widgetPhoto', 'ウィジェットの写真を7日間使う', '広告を1回見ると、選んだウィジェットで写真を7日間使えます。', () => undefined);
  }, [hasDesignCustomizeAccess, openRewardedPrompt, planTier, rewardedAccess]);
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
  // Design access has one shared entry point so the settings card, Design/Photo
  // sheet and full-screen try-on cannot silently hide the existing rewarded
  // path. Viewing remains free; this only decides which existing access UI to
  // open before a design is applied.
  const openDesignAccess = React.useCallback(() => {
    // The access card must always expose the purchase route. Temporary
    // Trial/Rewarded access never means "purchased" and must not replace the
    // Design Customize purchase sheet.
    setDesignCustomizeOpen(true);
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
    if (planTier === 'premium' || onboarding.state.firstRunStage === 'demo') {
      void onboarding.complete('voice');
      return;
    }
    setVoiceUsage((current) => consumeVoiceUsage(current, dateKey()));
    void onboarding.complete('voice');
  }, [onboarding, onboarding.state.firstRunStage, planTier]);
  const grantVoiceReward = React.useCallback(async (): Promise<boolean> => {
    if (planTier === 'premium' || voiceRewardBusyRef.current) return false;
    const current = normalizeVoiceUsage(voiceUsage, dateKey());
    if (remainingVoiceRewards(current, dateKey()) <= 0) return false;
    voiceRewardBusyRef.current = true;
    try {
      let showTestRewardedAd: typeof import('./services/rewardedAds').showTestRewardedAd;
      try {
        ({ showTestRewardedAd } = require('./services/rewardedAds') as typeof import('./services/rewardedAds'));
      } catch (error) {
        if (__DEV__) console.log('[Ads] show:error', error instanceof Error ? error.message : String(error));
        return false;
      }
      const earned = await showTestRewardedAd().catch((error) => {
        if (__DEV__) console.log('[Ads] show:error', error instanceof Error ? error.message : String(error));
        return false;
      });
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
      const result = await storeKit.purchaseDesignCustomize();
      if (result.success) {
        setDesignCustomizePurchased(true);
        const applyPendingDesign = pendingDesignApplyRef.current;
        pendingDesignApplyRef.current = undefined;
        pendingDesignTrialRef.current = undefined;
        if (applyPendingDesign) {
          setDesignCustomizeOpen(false);
          applyPendingDesign();
        }
      }
      else if (result.error) Alert.alert('購入を完了できませんでした', 'App Storeの商品情報を取得できませんでした。時間をおいてもう一度お試しください。');
      return;
    }
    Alert.alert('購入を利用できません', 'App Storeの商品情報を確認できません。時間をおいてもう一度お試しください。');
  }, [storeKit]);
  const restoreDesignCustomizePurchase = React.useCallback(async () => {
    if (storeKit.designConfigured) {
      const restored = await storeKit.restore();
      if (restored.designCustomize) {
        setDesignCustomizePurchased(true);
        const applyPendingDesign = pendingDesignApplyRef.current;
        pendingDesignApplyRef.current = undefined;
        pendingDesignTrialRef.current = undefined;
        if (applyPendingDesign) {
          setDesignCustomizeOpen(false);
          applyPendingDesign();
        }
        Alert.alert('購入を復元しました', 'デザインカスタマイズを利用できます。');
      } else if (restored.error) {
        Alert.alert('購入を復元できませんでした', 'App Storeの商品情報を取得できませんでした。時間をおいてもう一度お試しください。');
      } else {
        Alert.alert('復元できる購入はありません', '同じApple IDで購入した履歴が見つかりませんでした。');
      }
      return;
    }
    Alert.alert('購入を復元できません', 'App Storeの商品情報を確認できません。時間をおいてもう一度お試しください。');
  }, [storeKit]);
  const restorePremiumPurchase = React.useCallback(async () => {
    if (!storeKit.configured) {
      Alert.alert('購入を復元できません', 'App Storeの商品情報を確認できません。時間をおいてもう一度お試しください。');
      return;
    }
    const restored = await storeKit.restore();
    if (restored.premium) Alert.alert('購入を復元しました', 'Premiumを利用できます。');
    else if (restored.error) Alert.alert('購入を復元できませんでした', 'App Storeの商品情報を取得できませんでした。時間をおいてもう一度お試しください。');
    else Alert.alert('復元できる購入はありません', '同じApple IDで購入した履歴が見つかりませんでした。');
  }, [storeKit]);
  const markDesignNoticeSeen = React.useCallback((expiry: string) => {
    if (rewardedAccess.premiumDesignNoticeSeenFor === expiry) return;
    const next = { ...rewardedAccess, premiumDesignNoticeSeenFor: expiry };
    setRewardedAccess(next);
    void saveRewardedAccessState(next);
  }, [rewardedAccess]);
  useEffect(() => {
    if (planTier === 'premium' || hasDesignCustomizeAccess || isPremiumDesignUnlocked(rewardedAccess, now) || isPremiumDesignTrialActive(rewardedAccess, now)) return;
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
  }, [chicPattern, designMode, designTrialNoticeOpen, hasDesignCustomizeAccess, isPremiumDesignUnlocked, markDesignNoticeSeen, now, planTier, rewardedAccess]);
  const completeInitialDesignSelection = React.useCallback(() => {
    if (!onboardingDesignSelectionPending) return;
    if (__DEV__) {
      console.log('[FirstRunDiagnostic]', {
        ready: onboarding.ready,
        introVisible: onboarding.introVisible,
        introCompleted: onboarding.isCompleted('intro'),
        firstRunStage: onboarding.state.firstRunStage,
        onboardingDesignSelectionPending: true,
        currentScreen: screen,
        designSheetRequested: false,
        event: 'design-selection-complete',
      });
    }
    setOnboardingDesignSelectionPending(false);
    setScreen('home');
    if (onboarding.state.firstRunStage === 'design') {
      // Mark the handoff complete before the async persistence finishes. The
      // resume effect observes firstRunStage and would otherwise see the
      // transient `design` value after pending=false and reopen Settings in a
      // loop, which makes the app appear frozen on first launch.
      completingInitialDesignSelectionRef.current = true;
      void onboarding.setFirstRunStage('done').then(() => {
        completingInitialDesignSelectionRef.current = false;
        void onboarding.complete('design');
      });
    }
  }, [onboarding.introVisible, onboarding.ready, onboarding.state.completed.intro, onboarding.state.firstRunStage, onboardingDesignSelectionPending, screen]);
  const startDesignTrial = React.useCallback((pattern: ChicPattern, color: ChicCheckColor = chicCheckColor) => {
    if (hasDesignCustomizeAccess) {
      setDesignMode('chic');
      setChicPattern(pattern);
      setChicCheckColor(color);
      setDesignPreviewPattern(undefined);
      if (!onboardingDesignSelectionPending) void onboarding.complete('design');
      completeInitialDesignSelection();
      return;
    }
    if (isPremiumDesignTrialActive(rewardedAccess, now) || isPremiumDesignUnlocked(rewardedAccess, now)) {
      setDesignMode('chic');
      setChicPattern(pattern);
      setChicCheckColor(color);
      setDesignPreviewPattern(undefined);
      if (!onboardingDesignSelectionPending) void onboarding.complete('design');
      completeInitialDesignSelection();
      return;
    }
    if (!rewardedAccessHydrated) {
      Alert.alert('利用状態を確認中です', '少し待ってからもう一度お試しください。');
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
    setChicPattern(pattern);
    setChicCheckColor(color);
    setDesignPreviewPattern(undefined);
    if (!onboardingDesignSelectionPending) void onboarding.complete('design');
    completeInitialDesignSelection();
  }, [chicCheckColor, completeInitialDesignSelection, hasDesignCustomizeAccess, now, onboarding, onboardingDesignSelectionPending, rewardedAccess, rewardedAccessHydrated]);
  const startMonoDesignTrial = React.useCallback((pattern: 'looseLeaf' | 'chic', appearance: 'auto' | 'light' | 'dark' = monoAppearance) => {
    if (hasDesignCustomizeAccess || isPremiumDesignUnlocked(rewardedAccess, now) || isPremiumDesignTrialActive(rewardedAccess, now)) {
      setDesignMode('minimal');
      setMonoAppearance(appearance);
      setMonoPattern(pattern);
      setDesignPreviewMonoPattern(undefined);
      if (!onboardingDesignSelectionPending) void onboarding.complete('design');
      completeInitialDesignSelection();
      return;
    }
    if (!rewardedAccessHydrated) {
      Alert.alert('利用状態を確認中です', '少し待ってからもう一度お試しください。');
      return;
    }
    if (!canStartPremiumDesignTrial(rewardedAccess)) {
      setDesignTrialNoticeOpen(true);
      return;
    }
    const next: RewardedAccessState = { ...rewardedAccess, premiumDesignTrial: { used: true, designId: pattern, expiresAt: addHours(new Date(), 24) } };
    setRewardedAccess(next);
    void saveRewardedAccessState(next);
    setDesignMode('minimal');
    setMonoAppearance(appearance);
    setMonoPattern(pattern);
    setDesignPreviewMonoPattern(undefined);
    pendingDesignApplyRef.current = undefined;
    if (!onboardingDesignSelectionPending) void onboarding.complete('design');
    completeInitialDesignSelection();
  }, [completeInitialDesignSelection, hasDesignCustomizeAccess, monoAppearance, now, onboarding, onboardingDesignSelectionPending, planTier, rewardedAccess, rewardedAccessHydrated]);
  const requestDesignReward = React.useCallback(async () => {
    if (planTier === 'premium') return false;
    if (!rewardedAccessHydrated) {
      if (__DEV__) console.log('[Ads] design-reward-blocked', { reason: 'access-not-hydrated' });
      Alert.alert('利用状態を確認中です', '少し待ってからもう一度お試しください。');
      return false;
    }
    if (rewardedDesignBusyRef.current) return false;
    rewardedDesignBusyRef.current = true;
    try {
      if (__DEV__) console.log('[Ads] design-reward-request', { rewardedDesignBusy: true });
      let showTestRewardedAd: typeof import('./services/rewardedAds').showTestRewardedAd;
      try {
        ({ showTestRewardedAd } = require('./services/rewardedAds') as typeof import('./services/rewardedAds'));
      } catch (error) {
        if (__DEV__) console.log('[Ads] show:error', error instanceof Error ? error.message : String(error));
        Alert.alert('広告を利用できません', '広告の確認にはDevelopment Buildが必要です。');
        return false;
      }
      const earned = await showTestRewardedAd().catch((error) => {
        if (__DEV__) console.log('[Ads] show:error', error instanceof Error ? error.message : String(error));
        return false;
      });
      if (__DEV__) console.log('[Ads] design-reward-result', { earned });
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
  }, [planTier, rewardedAccess, rewardedAccessHydrated]);
  const openWish = React.useCallback(() => {
    setScreen('wish');
  }, []);
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
  const requestWishActionReward = React.useCallback(async () => {
    if (hasPremiumAccess(planTier, 'wish_planning') || canCreateWishAction(rewardedAccess)) return { success: true, completed: true } as RewardedAccessResult;
    return grantRewarded('wishActionCreate');
  }, [grantRewarded, planTier, rewardedAccess]);
  const consumeWishActionReward = React.useCallback(() => {
    if (hasPremiumAccess(planTier, 'wish_planning') || rewardedAccess.wishActionCreateProgress <= 0) return;
    const next: RewardedAccessState = { ...rewardedAccess, wishActionCreateProgress: Math.max(0, rewardedAccess.wishActionCreateProgress - 2) };
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
    const generation = (affirmationOperationGenerationRef.current[draft.id] ?? 0) + 1;
    affirmationOperationGenerationRef.current[draft.id] = generation;
    const next: Affirmation = { ...draft, notificationId: undefined };
    try {
      await enqueueNotificationOperation(`affirmation:${draft.id}`, async () => {
        await cancelPendingAffirmationNotificationsUnsafe(draft.id, existing?.notificationId);
        if (next.enabled) {
          let allowed = false;
          try {
            allowed = await ensureNotifications();
          } catch (error) {
            // Permission APIs can reject while Settings/background transitions
            // are in flight. Keep the preference saved as disabled instead of
            // leaking an unhandled rejection from the settings sheet.
            if (__DEV__) console.warn('[Notifications] affirmation permission check failed', error);
          }
          if (!allowed) {
            next.enabled = false;
            Alert.alert('通知を許可すると、指定した時間に言葉を届けられます。');
          } else {
            next.notificationId = await scheduleAffirmationNotification(next).catch(() => undefined);
          }
        }
      });
    } catch (error) {
      if (__DEV__) console.warn('[Notifications] affirmation save transaction failed', error);
      return;
    }
    if (affirmationOperationGenerationRef.current[draft.id] !== generation) return;
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
    const generation = (affirmationOperationGenerationRef.current[affirmation.id] ?? 0) + 1;
    affirmationOperationGenerationRef.current[affirmation.id] = generation;
    try {
      await cancelPendingAffirmationNotifications(affirmation.id, affirmation.notificationId);
    } catch (error) {
      if (__DEV__) console.warn('[Notifications] affirmation delete transaction failed', error);
      return;
    }
    if (affirmationOperationGenerationRef.current[affirmation.id] !== generation) return;
    setAffirmations((current) => current.filter((item) => item.id !== affirmation.id));
  }, []);
  const pickPhotoForDesignPreview = React.useCallback(async (openPreviewAfterPick = false): Promise<boolean> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('写真へのアクセスが必要です', '許可すると写真デザインを試着できます。');
      return false;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    const selectedUri = result.canceled ? undefined : result.assets[0]?.uri;
    if (selectedUri) {
      setDesignPreviewPhotoUri(selectedUri);
      // The current Design Sheet owns the preview surface. Do not open the
      // legacy root-level DesignPreviewModal after picking a photo; the
      // selected URI is fed back into the Sheet and its full-screen try-on.
      if (openPreviewAfterPick) setDesignPreviewMode('photo');
      return true;
    }
    return false;
  }, []);

  const pickWidgetPhoto = React.useCallback(async (widgetType?: WidgetType, override?: WidgetEntitlementOverride) => {
    const overrideFree = __DEV__ && override === 'free';
    const overrideDesign = __DEV__ && (override === 'design' || override === 'premium');
    const effectivePlanTier: PlanTier = override === 'premium' ? 'premium' : overrideFree || override === 'design' ? 'free' : planTier;
    const effectiveDesignAccess = overrideDesign || ((override == null || override === 'actual') && hasDesignCustomizeAccess);
    if (widgetType && effectivePlanTier !== 'premium' && !effectiveDesignAccess && !isWidgetPhotoUnlockActive(rewardedAccess, widgetType, new Date())) {
      requestWidgetPhotoUnlock(widgetType, override);
      return;
    }
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
      const persistentUri = persistPhotoUri(compressed.uri, widgetType ? `widget-photo-${widgetType}` : 'widget-photo');
      setWidgetSettings((current) => {
        if (widgetType) {
          const previous = current.widgetCustomizations?.[widgetType];
          const customizations = { ...(current.widgetCustomizations ?? {}), [widgetType]: { ...(previous ?? {}), photoUri: persistentUri, photoLayout: previous?.photoLayout ?? current.photoLayout } };
          return { ...current, style: 'photo', widgetCustomizations: customizations };
        }
        deleteManagedPhotoUri(current.photoUri, [persistentUri, ...(current.affirmationPhotoUris ?? [])]);
        return { ...current, photoUri: persistentUri, style: 'photo', affirmationPhotoUris: [...(current.affirmationPhotoUris ?? []).filter((uri) => uri !== persistentUri), persistentUri].slice(0, 3) };
      });
    } catch (error) {
      console.warn('Could not persist selected Widget photo.', error);
      Alert.alert('写真を保存できませんでした', 'もう一度選び直してください。');
    }
  }, [hasDesignCustomizeAccess, planTier, requestWidgetPhotoUnlock, rewardedAccess]);
  const applyPhotoDesign = React.useCallback((photoUriOverride?: string, colorOverride?: ChicCheckColor) => {
    const selectedPhotoUri = photoUriOverride ?? designPreviewPhotoUri;
    if (!selectedPhotoUri) {
      Alert.alert('写真を選択してください', '写真で試すから画像を選んでください。');
      return;
    }
    try {
      const persistentUri = persistPhotoUri(selectedPhotoUri, 'design-background');
      setPhotoTheme((current) => {
        deleteManagedPhotoUri(current.imageUri, [persistentUri, current.focusBackgroundUri, ...Object.values(current.topImageUris ?? {}), ...Object.values(current.topImageOriginalUris ?? {})]);
        return { ...current, placement: 'background', imageUri: persistentUri };
      });
      if (colorOverride) setChicCheckColor(colorOverride);
      setDesignMode('photo');
      setDesignPreviewPattern(undefined);
      setDesignPreviewPhotoUri(undefined);
      setDesignPreviewMonoPattern(undefined);
      if (!onboardingDesignSelectionPending) void onboarding.complete('design');
      completeInitialDesignSelection();
    } catch {
      Alert.alert('写真を保存できませんでした', 'もう一度選び直してください。');
    }
  }, [completeInitialDesignSelection, designPreviewPhotoUri, onboarding, onboardingDesignSelectionPending]);
  const startPhotoDesignTrial = React.useCallback((photoUriOverride?: string, colorOverride?: ChicCheckColor) => {
    const selectedPhotoUri = photoUriOverride ?? designPreviewPhotoUri;
    if (!selectedPhotoUri) return;
    if (!rewardedAccessHydrated) {
      Alert.alert('利用状態を確認中です', '少し待ってからもう一度お試しください。');
      return;
    }
    const next: RewardedAccessState = { ...rewardedAccess, premiumDesignTrial: { used: true, designId: 'photo', expiresAt: addHours(new Date(), 24) } };
    setRewardedAccess(next);
    void saveRewardedAccessState(next);
    applyPhotoDesign(selectedPhotoUri, colorOverride);
  }, [applyPhotoDesign, designPreviewPhotoUri, rewardedAccess, rewardedAccessHydrated]);
  const applyDesignTryOn = React.useCallback((selection: DesignTryOnSelection) => {
    if (selection.mode === 'minimal' || selection.mode === 'dark') {
      if (!hasMonoPatternAccess(selection.monoPattern)) {
        setDesignPreviewMonoPattern(selection.monoPattern);
        pendingDesignApplyRef.current = () => {
          setDesignMode('minimal');
          setMonoAppearance(selection.monoAppearance);
          setMonoPattern(selection.monoPattern);
          setDesignPreviewMonoPattern(undefined);
          if (!onboardingDesignSelectionPending) void onboarding.complete('design');
          completeInitialDesignSelection();
        };
        pendingDesignTrialRef.current = canStartPremiumDesignTrial(rewardedAccess)
          ? () => startMonoDesignTrial(selection.monoPattern as 'looseLeaf' | 'chic', selection.monoAppearance)
          : undefined;
        setDesignTrialNoticeOpen(true);
        return;
      }
      setDesignMode('minimal');
      setMonoAppearance(selection.monoAppearance);
      setMonoPattern(selection.monoPattern);
      setDesignPreviewMonoPattern(undefined);
      if (!onboardingDesignSelectionPending) void onboarding.complete('design');
      completeInitialDesignSelection();
      return;
    }
    if (selection.mode === 'chic') {
      const hasPatternAccess = selection.pattern === 'plain'
        || planTier === 'premium'
        || hasDesignCustomizeAccess
        || isPremiumDesignUnlocked(rewardedAccess, now)
        || isPremiumDesignTrialActive(rewardedAccess, now);
      if (!hasPatternAccess) {
        setDesignPreviewMode('chic');
        setDesignPreviewPattern(selection.pattern);
        pendingDesignApplyRef.current = () => {
          setChicCheckColor(selection.color);
          setDesignMode('chic');
          setChicPattern(selection.pattern);
          setDesignPreviewPattern(undefined);
          if (!onboardingDesignSelectionPending) void onboarding.complete('design');
          completeInitialDesignSelection();
        };
        pendingDesignTrialRef.current = canStartPremiumDesignTrial(rewardedAccess)
          ? () => startDesignTrial(selection.pattern, selection.color)
          : undefined;
        setDesignTrialNoticeOpen(true);
        return;
      }
      setChicCheckColor(selection.color);
      setDesignMode('chic');
      setChicPattern(selection.pattern);
      setDesignPreviewMonoPattern(undefined);
      if (!onboardingDesignSelectionPending) void onboarding.complete('design');
      completeInitialDesignSelection();
      return;
    }
    if (!selection.photoUri) {
      setDesignPreviewMode('photo');
      setDesignPreviewPattern(undefined);
      void pickPhotoForDesignPreview();
      return;
    }
    const hasPhotoAccess = planTier === 'premium'
      || hasDesignCustomizeAccess
      || isPremiumDesignTrialActive(rewardedAccess, now)
      || isPremiumDesignUnlocked(rewardedAccess, now);
    if (!hasPhotoAccess) {
      setDesignPreviewMode('photo');
      setDesignPreviewPattern(undefined);
      setDesignPreviewPhotoUri(selection.photoUri);
      pendingDesignApplyRef.current = () => applyPhotoDesign(selection.photoUri, selection.color);
      pendingDesignTrialRef.current = canStartPremiumDesignTrial(rewardedAccess)
        ? () => startPhotoDesignTrial(selection.photoUri, selection.color)
        : undefined;
      setDesignTrialNoticeOpen(true);
      return;
    }
    applyPhotoDesign(selection.photoUri, selection.color);
  }, [activeDesignTrialId, applyPhotoDesign, canStartPremiumDesignTrial, completeInitialDesignSelection, hasDesignCustomizeAccess, hasMonoPatternAccess, isPremiumDesignUnlocked, now, onboarding, onboardingDesignSelectionPending, pickPhotoForDesignPreview, planTier, rewardedAccess, startDesignTrial, startMonoDesignTrial, startPhotoDesignTrial]);
  const startDesignRewardForCurrent = React.useCallback(() => {
    if (hasDesignCustomizeAccess || planTier === 'premium') return;
    const hadTryOnSelection = Boolean(pendingDesignApplyRef.current);
    if (!hadTryOnSelection) {
      pendingDesignApplyRef.current = () => {
        if (designMode === 'photo') {
          if (photoTheme.imageUri) applyPhotoDesign(photoTheme.imageUri, chicCheckColor);
          return;
        }
        if (designMode === 'minimal' || designMode === 'dark') {
          setDesignMode('minimal');
          setMonoAppearance(monoAppearance);
          setMonoPattern(monoPattern);
          return;
        }
        setDesignMode('chic');
        setChicPattern(chicPattern);
        setChicCheckColor(chicCheckColor);
      };
    }
    designRewardAfterCustomizeDismissRef.current = () => {
      if (canStartPremiumDesignTrial(rewardedAccess)) {
        const startTrial = designMode === 'photo'
          ? () => photoTheme.imageUri && startPhotoDesignTrial(photoTheme.imageUri, chicCheckColor)
          : designMode === 'minimal' || designMode === 'dark'
            ? () => startMonoDesignTrial(monoPattern === 'plain' ? 'looseLeaf' : monoPattern, monoAppearance)
            : () => startDesignTrial(chicPattern === 'plain' ? 'floral' : chicPattern, chicCheckColor);
        startTrial();
        return;
      }
      void requestDesignReward().then((success) => {
        if (!success) {
          if (hadTryOnSelection) setDesignTrialNoticeOpen(true);
          else pendingDesignApplyRef.current = undefined;
        }
        resumeTopImageAfterAccessFlow();
      });
    };
    setDesignCustomizeOpen(false);
    if (Platform.OS !== 'ios') InteractionManager.runAfterInteractions(() => {
      const startReward = designRewardAfterCustomizeDismissRef.current;
      designRewardAfterCustomizeDismissRef.current = undefined;
      startReward?.();
    });
  }, [applyPhotoDesign, canStartPremiumDesignTrial, chicCheckColor, chicPattern, designMode, hasDesignCustomizeAccess, monoAppearance, monoPattern, photoTheme.imageUri, planTier, requestDesignReward, rewardedAccess, resumeTopImageAfterAccessFlow, startDesignTrial, startMonoDesignTrial, startPhotoDesignTrial]);
  const canOpenTopImagePicker = React.useCallback((target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>) => {
    const hasWholePhotoAccess = planTier === 'premium'
      || hasDesignCustomizeAccess
      || isPremiumDesignTrialActive(rewardedAccess, now)
      || isPremiumDesignUnlocked(rewardedAccess, now);
    if (hasWholePhotoAccess) return true;
    if (photoTheme.topImageUris?.[target] || photoTheme.topImageOriginalUris?.[target]) return true;
    const usedSlots = new Set([
      ...Object.keys(photoTheme.topImageUris ?? {}),
      ...Object.keys(photoTheme.topImageOriginalUris ?? {}),
    ]).size;
    // Top-image slots are a separate rewarded feature. No slot is available
    // before the first photoTop reward; existing images remain editable.
    const allowedSlots = Math.min(5, rewardedAccess.photoCustomization.topExtraSlotsUnlocked);
    return usedSlots < allowedSlots;
  }, [hasDesignCustomizeAccess, isPremiumDesignUnlocked, now, photoTheme, planTier, rewardedAccess]);

  const pickPhotoTheme = React.useCallback(async (target: PhotoThemePhotoTarget, options?: { bypassRewarded?: boolean }) => {
    if (__DEV__) console.log('[TopImage] pick-start', { target });
    const hasWholePhotoAccess = planTier === 'premium'
      || hasDesignCustomizeAccess
      || isPremiumDesignTrialActive(rewardedAccess, now)
      || isPremiumDesignUnlocked(rewardedAccess, now);
    if (planTier !== 'premium' && !hasDesignCustomizeAccess) {
      if (target === 'background' && !rewardedAccess.photoCustomization.backgroundUnlocked && !hasWholePhotoAccess) {
        openRewardedPrompt('photoBackground', '背景に写真を使う', '広告を見ると、好きな写真をRhythmの背景に設定できます。', () => { void pickPhotoTheme(target); });
        return;
      }
      if (target === 'focus' && !rewardedAccess.photoCustomization.focusUnlocked && !hasWholePhotoAccess) {
        openRewardedPrompt('photoFocus', '集中画面に写真を使う', '広告を見ると、集中タイムの背景に好きな写真を設定できます。', () => { void pickPhotoTheme(target); });
        return;
      }
      if (target !== 'background' && target !== 'focus') {
        const currentUri = photoTheme.topImageUris?.[target] ?? photoTheme.topImageOriginalUris?.[target];
        // Every new top-image slot uses the existing photoTop Rewarded route;
        // existing images can still be changed without another unlock.
        const usedSlots = new Set([
          ...Object.keys(photoTheme.topImageUris ?? {}),
          ...Object.keys(photoTheme.topImageOriginalUris ?? {}),
        ]).size;
        const allowedSlots = Math.min(5, rewardedAccess.photoCustomization.topExtraSlotsUnlocked);
        if (!options?.bypassRewarded && !currentUri && usedSlots >= allowedSlots) {
          openRewardedPrompt('photoTop', '写真枠を追加', '広告を見ると、画面ごとのトップ写真枠を1つ追加できます。', () => { void pickPhotoTheme(target, { bypassRewarded: true }); });
          return;
        }
      }
    }
    const isTopImage = target !== 'background' && target !== 'focus';
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      if (isTopImage) setTopImageCropResumeToken((current) => current + 1);
      Alert.alert('写真へのアクセスを許可すると、背景やトップ画像に設定できます。');
      return;
    }
    const aspect: [number, number] = [4, 3];
    // iOS の標準トリミングは横長比率を指定しても正方形になることがあるため、
    // トップ画像だけはアプリ内の横長プレビューで位置を確定する。
    if (__DEV__ && isTopImage) console.log('[TopImage] picker-present', { target });
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, ...(isTopImage ? {} : { aspect }), quality: isTopImage ? 1 : 0.82 });
    if (__DEV__ && isTopImage) console.log('[TopImage] picker-dismissed', { target });
    if (__DEV__) console.log('[TopImage] picker-result', { target, canceled: result.canceled, width: result.canceled ? undefined : result.assets[0]?.width, height: result.canceled ? undefined : result.assets[0]?.height });
    const selectedAsset = result.canceled ? undefined : result.assets[0];
    if (!selectedAsset?.uri) {
      if (isTopImage) setTopImageCropResumeToken((current) => current + 1);
      return;
    }
    if (isTopImage) {
      // 調整を確定するまでは選択元をそのまま使い、不要な端末内コピーを作らない。
      const sourceWidth = selectedAsset.width || 1000;
      const sourceHeight = selectedAsset.height || 1000;
      let previewUri: string | undefined;
      const maxPreviewEdge = 1800;
      if (Math.max(sourceWidth, sourceHeight) > maxPreviewEdge) {
        try {
          if (__DEV__) console.log('[TopImage] crop-preview-start', { target, sourceWidth, sourceHeight, maxPreviewEdge });
          const scale = maxPreviewEdge / Math.max(sourceWidth, sourceHeight);
          const preview = await ImageManipulator.manipulateAsync(selectedAsset.uri, [{ resize: { width: Math.max(1, Math.round(sourceWidth * scale)) } }], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG });
          previewUri = preview.uri;
          if (__DEV__) console.log('[TopImage] crop-preview-complete', { target, width: Math.max(1, Math.round(sourceWidth * scale)), height: Math.max(1, Math.round(sourceHeight * scale)) });
        } catch (error) {
          if (__DEV__) console.log('[TopImage] error', { target, stage: 'crop-preview', message: error instanceof Error ? error.message : String(error) });
        }
      }
      if (pendingTopPhoto?.previewUri) deleteTemporaryPhotoUri(pendingTopPhoto.previewUri);
      const pending = { target: target as Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>, originalUri: selectedAsset.uri, previewUri, sourceWidth, sourceHeight };
      if (__DEV__) {
        console.log('[TopImage] crop-presentation-start', { target: pending.target });
        console.log('[TopImage] crop-modal-open', { target: pending.target, sourceWidth: pending.sourceWidth, sourceHeight: pending.sourceHeight, previewReady: Boolean(previewUri) });
      }
      setPendingTopPhoto(pending);
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
  }, [hasDesignCustomizeAccess, isPremiumDesignUnlocked, now, openRewardedPrompt, pendingTopPhoto, photoTheme, planTier, rewardedAccess]);

  const adjustTopPhoto = React.useCallback((target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>) => {
    const originalUri = photoTheme.topImageOriginalUris?.[target] ?? photoTheme.topImageUris?.[target];
    if (!originalUri) return;
    Image.getSize(originalUri, (sourceWidth, sourceHeight) => setPendingTopPhoto({ target, originalUri, sourceWidth, sourceHeight, cropRect: photoTheme.topImageCropRects?.[target] }), () => setPendingTopPhoto({ target, originalUri, sourceWidth: 1000, sourceHeight: 1000, cropRect: photoTheme.topImageCropRects?.[target] }));
  }, [photoTheme]);

  const applyPendingTopPhoto = React.useCallback(async (cropOverride?: NormalizedCropRect) => {
    if (!pendingTopPhoto || topImageProcessingRef.current) return;
    const pending = pendingTopPhoto;
    let processingErrorMessage: string | undefined;
    topImageProcessingRef.current = true;
    setTopImageProcessing(true);
    try {
      if (__DEV__) console.log('[TopImage] apply-start', { target: pending.target, originalUri: Boolean(pending.originalUri), sourceWidth: pending.sourceWidth, sourceHeight: pending.sourceHeight });
      const normalized = cropOverride ?? pending.cropRect ?? getInitialNormalizedCrop(pending.sourceWidth, pending.sourceHeight);
      const crop = cropRectToPixels(normalized, pending.sourceWidth, pending.sourceHeight);
      if (__DEV__) console.log('[TopImage] manipulate-start', { target: pending.target, crop });
      const result = await ImageManipulator.manipulateAsync(pending.originalUri, [{ crop }, { resize: { width: 1000, height: 400 } }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
      if (__DEV__) console.log('[TopImage] manipulate-complete', { target: pending.target, resultUri: Boolean(result.uri) });
      if (__DEV__) console.log('[TopImage] persist-original-start', { target: pending.target });
      const originalUri = persistPhotoUri(pending.originalUri, `top-original-${pending.target}`);
      const originalAvailable = isPersistedPhotoAvailable(originalUri);
      if (__DEV__) console.log('[TopImage] persist-original-complete', { target: pending.target, exists: originalAvailable });
      if (!originalAvailable) throw new Error('top image original persistence unavailable');
      if (__DEV__) console.log('[TopImage] persist-display-start', { target: pending.target });
      const displayUri = persistPhotoUri(result.uri, `top-${pending.target}`);
      const displayAvailable = isPersistedPhotoAvailable(displayUri);
      if (__DEV__) console.log('[TopImage] persist-display-complete', { target: pending.target, exists: displayAvailable });
      if (!displayAvailable) throw new Error('top image display persistence unavailable');
      setPhotoTheme((current) => {
        if (__DEV__) console.log('[TopImage] state-before', { target: pending.target, hadDisplay: Boolean(current.topImageUris?.[pending.target]), hadOriginal: Boolean(current.topImageOriginalUris?.[pending.target]) });
        const previousDisplayUri = current.topImageUris?.[pending.target];
        const previousOriginalUri = current.topImageOriginalUris?.[pending.target];
        const topImageUris = { ...current.topImageUris, [pending.target]: displayUri };
        const topImageOriginalUris = { ...current.topImageOriginalUris, [pending.target]: originalUri };
        const retainedUris = [current.imageUri, current.focusBackgroundUri, ...Object.values(topImageUris), ...Object.values(topImageOriginalUris)];
        deleteManagedPhotoUri(previousDisplayUri, retainedUris);
        deleteManagedPhotoUri(previousOriginalUri, retainedUris);
        if (__DEV__) console.log('[TopImage] state-after', { target: pending.target, displayUri: Boolean(topImageUris[pending.target]), originalUri: Boolean(topImageOriginalUris[pending.target]), cropRect: true });
        return { ...current, topImageUris, topImageOriginalUris, topImageCropRects: { ...current.topImageCropRects, [pending.target]: normalized } };
      });
    } catch (error) {
      processingErrorMessage = error instanceof Error ? error.message : String(error);
      if (__DEV__) console.log('[TopImage] error', { target: pending.target, message: processingErrorMessage });
    } finally {
      topImageProcessingRef.current = false;
      setTopImageProcessing(false);
      if (pending.previewUri) deleteTemporaryPhotoUri(pending.previewUri);
      topImageCropDismissActionRef.current = { type: 'resume', target: pending.target };
      if (__DEV__) {
        console.log('[TopImage] crop-dismiss-start', { target: pending.target });
        console.log('[TopImage] modal-close', { target: pending.target });
      }
      setPendingTopPhoto(undefined);
      if (processingErrorMessage) {
        InteractionManager.runAfterInteractions(() => {
          Alert.alert('トップ画像を調整できませんでした', 'もう一度画像を選び直して試してください。');
        });
      }
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
      if (parsed.hostname === 'todo' || parsed.hostname === 'today') {
        navigateWithinAppRef.current('home');
        return true;
      }
      if (parsed.hostname === 'add') {
        navigateWithinAppRef.current('home');
        setAddOpen(true);
        return true;
      }
      if (parsed.hostname === 'schedule') {
        setTimelineInitialTab('departure');
        navigateWithinAppRef.current('timeline');
        return true;
      }
      if (parsed.hostname === 'focus') {
        setTimelineInitialTab('focus');
        navigateWithinAppRef.current('timeline');
        return true;
      }
      if (parsed.hostname === 'voice') {
        openVoiceInputRef.current(true);
        return true;
      }
      if (parsed.hostname === 'affirmation') {
        navigateWithinAppRef.current('settings');
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
    result.newlyCompleted.forEach((task) => { void cancelPendingTaskNotifications(task.id); void cancelScheduleSwitchNotificationsForTask(task.id); });
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
    if (allDone && !current.done) {
      const withCompletedSubtasks = tasksRef.current.map((task) => task.id === taskId ? { ...task, subtasks: nextSubtasks } : task);
      tasksRef.current = withCompletedSubtasks;
      setTasks(withCompletedSubtasks);
      completeTaskIds([taskId]);
      return;
    }
    const updated = { ...current, subtasks: nextSubtasks, done: false, status: 'active' as const, skippedAt: undefined, completedAt: undefined };
    const next = tasksRef.current.map((task) => task.id === taskId ? updated : task);
    tasksRef.current = next;
    setTasks(next);
    if (allDone && !current.done) { void playCompletionSound(); triggerHaptic(hapticsEnabled, 18); showCompletionAffirmation('task'); }
  }, [completeTaskIds]);

  const completeParentTask = React.useCallback((taskId: string) => {
    const current = tasksRef.current.find((task) => task.id === taskId);
    if (!current || current.done || !current.subtasks?.some((item) => !item.done)) return completeTaskIds([taskId]);
    Alert.alert('親タスクを完了しますか？', '未完了のサブタスクもすべて完了にします。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '完了にする', onPress: () => {
        // The confirmation can remain open while another operation updates
        // the same task. Re-read the ref instead of applying the stale
        // snapshot captured when the alert was presented.
        const latest = tasksRef.current.find((task) => task.id === taskId);
        if (!latest || latest.done || !latest.subtasks?.some((item) => !item.done)) return;
        const withCompletedSubtasks = tasksRef.current.map((task) => task.id === taskId ? { ...task, subtasks: task.subtasks?.map((item) => ({ ...item, done: true })) } : task);
        tasksRef.current = withCompletedSubtasks;
        setTasks(withCompletedSubtasks);
        completeTaskIds([taskId]);
      } },
    ]);
  }, [completeTaskIds]);

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
    return enqueueNotificationOperation(`departure:${target.id}`, async () => {
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
            ...buildDepartureFollowUpContent(phase, body ?? target.title),
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
    });
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
    const wasSkipped = getTaskStatus(target) === 'skipped';
    const wasCompleted = target.done === true && !wasSkipped;
    const next = tasksRef.current.map((task) => task.id === taskId ? { ...task, done: false, status: 'active' as const, skippedAt: undefined, completedAt: undefined } : task);
    tasksRef.current = next;
    setTasks(next);
    const restored = next.find((task) => task.id === taskId);
    if (restored) {
      void scheduleTaskNotificationsRef.current(restored);
      void syncScheduleSwitchNotificationsForTask(restored.id);
    }
    if (wasCompleted && target.routineId && target.completedAt && (!target.routineEndedAt || new Date(target.completedAt).getTime() <= new Date(target.routineEndedAt).getTime())) {
      recordBehaviorEvent(createTaskCompletionRevertedBehaviorEvent({
        taskId: target.id,
        taskTitle: target.title,
        occurredAt: new Date(),
        completedAt: target.completedAt,
        source,
        routineId: target.routineId,
        routineTitle: target.title,
        routineTargetDate: dateKey(target.completedAt),
      }));
      recordBehaviorEvent(createRoutineStateChangedBehaviorEvent({ taskId: target.id, routineId: target.routineId, routineTitle: target.title, occurredAt: new Date(), targetDate: dateKey(target.completedAt), completed: false, source }));
    }
  }, [recordBehaviorEvent]);

  const applySkipTaskById = React.useCallback((taskId: string, onApplied?: () => void) => {
    const target = tasksRef.current.find((task) => task.id === taskId);
    if (!target || target.done || getTaskStatus(target) === 'skipped') return;
    Alert.alert('今日はお休みで大丈夫', '今日はお休みで大丈夫。連続記録は途切れません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '今日は休む', onPress: () => {
        const skippedAt = new Date().toISOString();
        const current = tasksRef.current;
        const latest = current.find((task) => task.id === taskId);
        if (!latest || latest.done || getTaskStatus(latest) === 'skipped') return;
        const nextOccurrence = latest.isRoutine ? buildNextRepeatedTask(latest, current) : undefined;
        const next = current.map((task) => task.id === taskId ? { ...task, done: false, status: 'skipped' as const, skippedAt } : task);
        if (nextOccurrence) next.push(nextOccurrence);
        tasksRef.current = next;
        setTasks(next);
        void cancelPendingTaskNotifications(taskId);
        void cancelScheduleSwitchNotificationsForTask(taskId);
        if (nextOccurrence) {
          void scheduleTaskNotificationsRef.current(nextOccurrence);
          void syncScheduleSwitchNotificationsForTask(nextOccurrence.id);
        }
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
    void cancelScheduleSwitchNotificationsForTask(taskId);
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
        if (saved.widgetSize === 'small' || saved.widgetSize === 'medium') setWidgetSize(saved.widgetSize);
        setWidgetSettings(normalizeWidgetSettings(saved.widgetSettings));
        if (typeof saved.showCompleted === 'boolean') setShowCompleted(saved.showCompleted);
        if (saved.completionIcon) setCompletionIcon(saved.completionIcon);
        if (!hapticsPreferenceTouchedRef.current && typeof saved.hapticsEnabled === 'boolean') setHapticsEnabled(saved.hapticsEnabled);
        setPremiumTrialReminderEnabled(saved.premiumTrialReminderEnabled !== false);
        if (!liveActivityPreferenceTouchedRef.current) setLiveActivityEnabled(saved.liveActivityEnabled === true);
        setLiveActivityDisplayOptions(normalizeRhythmLiveActivityDisplayOptions(saved.liveActivityDisplayOptions));
        setLiveActivityCustomization(normalizeRhythmLiveActivityCustomization(saved.liveActivityCustomization));
        if (saved.reviewPromptedAt) setReviewPromptedAt(saved.reviewPromptedAt);
        setReadNoticeIds(Array.isArray(saved.readNoticeIds) ? [...new Set(saved.readNoticeIds.filter((id): id is string => typeof id === 'string'))] : []);
        tomorrowPrepPromptedDateRef.current = saved.tomorrowPrepPromptedDate;
        setTomorrowPrepPromptedDate(saved.tomorrowPrepPromptedDate);
        routineRemainingNotifiedDateRef.current = saved.routineRemainingNotifiedDate;
        setRoutineRemainingNotifiedDate(saved.routineRemainingNotifiedDate);
        const legacyAppearance = saved.designMode === 'dark' ? 'dark' : saved.designMode === 'minimal' ? 'light' : undefined;
        const loadedMonoAppearance = saved.monoAppearance === 'auto' || saved.monoAppearance === 'light' || saved.monoAppearance === 'dark'
          ? saved.monoAppearance
          : legacyAppearance ?? 'auto';
        const loadedMonoPattern: MonoPattern = saved.monoPattern === 'looseLeaf' || saved.monoPattern === 'chic' ? saved.monoPattern : 'plain';
        if (saved.designMode === 'minimal' || saved.designMode === 'dark' || saved.designMode === 'chic' || saved.designMode === 'photo') {
          setDesignMode(saved.designMode);
          // Older saves encoded Mono Light/Dark in designMode. Treat those as
          // explicit manual choices; only new/updated Mono saves can be auto.
          setMonoAppearance(loadedMonoAppearance);
          setMonoPattern(loadedMonoPattern);
        } else {
          setDesignMode('minimal');
          setMonoAppearance(loadedMonoAppearance);
          setMonoPattern(loadedMonoPattern);
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
        setFocusState(saved.focusState);
        if (saved.focusState?.running && saved.focusState.endAt && Date.parse(saved.focusState.endAt) > Date.now()) setFocusTimerActive(true);
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
        const pendingNotificationNavigation = [...new Set(pendingNotificationNavigationRef.current)];
        pendingNotificationNavigationRef.current = [];
        pendingNotificationNavigation.forEach((route) => {
          if (route === 'timeline') {
            setTimelineInitialTab('departure');
            navigateWithinAppRef.current('timeline');
          } else {
            setHomeInitialTab('routine');
            navigateWithinAppRef.current('home');
          }
        });
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

      const notificationKind = notificationData?.kind;
      if (notificationKind === 'schedule_switch' || notificationKind === 'routine_remaining') {
        const route: 'timeline' | 'routine' = notificationKind === 'schedule_switch' ? 'timeline' : 'routine';
        if (!hydratedRef.current) {
          pendingNotificationNavigationRef.current.push(route);
        } else if (route === 'timeline') {
          setTimelineInitialTab('departure');
          navigateWithinAppRef.current('timeline');
        } else {
          setHomeInitialTab('routine');
          navigateWithinAppRef.current('home');
        }
        return;
      }

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
          navigateWithinAppRef.current('timeline');
          return;
        }
        if (typeof taskId === 'string') {
          navigateWithinAppRef.current('home');
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
        void cancelScheduleSwitchNotificationsForTask(taskId);
      }

      if (action === 'SNOOZE' || action === 'LATER') {
        const seconds = action === 'SNOOZE' ? 600 : 3600;
        void enqueueNotificationOperation(`task:${taskId}`, async () => {
          // Notification actions can arrive after a task was deleted or
          // completed. Validate the latest state before creating any new
          // notification so stale actions cannot resurrect a task.
          const task = tasksRef.current.find((item) => item.id === taskId);
          if (!task || task.done || task.status === 'skipped') return;
          const scheduledAt = new Date(Date.now() + seconds * 1000);
          const nextNotificationInstanceId = `task:${taskId}:${scheduledAt.toISOString()}:${action.toLowerCase()}`;
          await Notifications.scheduleNotificationAsync({
            identifier: nextNotificationInstanceId,
            content: {
              ...buildTaskActionContent(action, response.notification.request.content.body ?? 'タスクを確認しましょう'),
              categoryIdentifier: 'TASK_ACTIONS',
              data: { taskId, notificationInstanceId: nextNotificationInstanceId },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
          });
          if (hasPremiumAccess(planTierRef.current, 'time_analysis')) {
            recordBehaviorEvent(createNotificationScheduledEvent({ notificationInstanceId: nextNotificationInstanceId, taskId, taskTitle: task.title, scheduledAt, occurredAt: new Date() }));
          }
        }).catch((error) => {
          if (__DEV__) console.warn('[Notifications] task action scheduling failed', error);
        });
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
    const state: PersistedState = { tasks, plan, departurePlans, widgetSize, widgetSettings, showCompleted, completionIcon, designMode, monoAppearance, monoPattern, hapticsEnabled, premiumTrialReminderEnabled, liveActivityEnabled, liveActivityDisplayOptions, liveActivityCustomization, reviewPromptedAt, readNoticeIds: [...new Set(readNoticeIds)], tomorrowPrepPromptedDate, routineRemainingNotifiedDate, taskTemplates, savedTaskTemplates, chicPattern, chicCheckColor, recoveryHistory, focusSessions, focusState, focusCustomDurationMinutes, departureCheckIns, behaviorEvents, wishMonths: normalizeWishMonthsForSave(wishMonths), calendarMarks, calendarImportCalendarIds, calendarImportKnownCalendarIds, sharedEvents, sharedParticipantIdsByToken, sharedParticipantPrefsByToken, departurePreparationStatuses, affirmations, affirmationCustomTexts, photoTheme, travelApps, designCustomizePurchased, routineArchives: pruneRoutineArchives(routineArchives), voiceUsage: normalizeVoiceUsage(voiceUsage, dateKey()) };
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
  }, [tasks, plan, departurePlans, widgetSize, widgetSettings, showCompleted, completionIcon, designMode, monoAppearance, monoPattern, hapticsEnabled, premiumTrialReminderEnabled, liveActivityEnabled, liveActivityDisplayOptions, liveActivityCustomization, reviewPromptedAt, readNoticeIds, tomorrowPrepPromptedDate, routineRemainingNotifiedDate, taskTemplates, savedTaskTemplates, chicPattern, chicCheckColor, recoveryHistory, focusSessions, focusState, focusCustomDurationMinutes, departureCheckIns, behaviorEvents, wishMonths, calendarMarks, calendarImportCalendarIds, calendarImportKnownCalendarIds, sharedEvents, sharedParticipantIdsByToken, sharedParticipantPrefsByToken, departurePreparationStatuses, affirmations, affirmationCustomTexts, photoTheme, travelApps, designCustomizePurchased, routineArchives, voiceUsage, hydrated]);

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

  // Reconcile only the affirmation namespace after entitlement/permission or
  // app lifecycle changes. Each item remains serialized with edits/deletes,
  // and a generation check prevents an older foreground pass from restoring
  // stale text or time.
  const syncAffirmationNotifications = React.useCallback(async () => {
    if (!hydrated || !storeKitEntitlementsResolved) return;
    let permissionGranted = false;
    if (hasPremiumAccess(planTier, 'affirmations')) {
      try {
        permissionGranted = canUseNotifications(await getNotificationPermissionStatus());
      } catch (error) {
        if (__DEV__) console.warn('[Notifications] affirmation permission refresh failed', error);
      }
    }
    const snapshot = [...affirmationsRef.current];
    for (const affirmation of snapshot) {
      const generation = affirmationOperationGenerationRef.current[affirmation.id] ?? 0;
      await enqueueNotificationOperation(`affirmation:${affirmation.id}`, async () => {
        await cancelPendingAffirmationNotificationsUnsafe(affirmation.id, affirmation.notificationId);
        if (affirmationOperationGenerationRef.current[affirmation.id] !== generation) return;
        const latest = affirmationsRef.current.find((item) => item.id === affirmation.id);
        if (!permissionGranted || !latest?.enabled) return;
        await scheduleAffirmationNotification(latest).catch((error) => {
          if (__DEV__) console.warn('[Notifications] affirmation reschedule failed', error);
        });
      }).catch((error) => {
        if (__DEV__) console.warn('[Notifications] affirmation reconciliation failed', error);
      });
    }
  }, [hydrated, planTier, storeKitEntitlementsResolved]);

  useEffect(() => {
    void syncAffirmationNotifications();
  }, [syncAffirmationNotifications]);

  useEffect(() => {
    if (!hydrated) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void syncAffirmationNotifications();
    });
    return () => subscription.remove();
  }, [hydrated, syncAffirmationNotifications]);

  // Premiumから無料版へ開き直した場合、以前の段階通知だけは安全に停止する。
  // 予定データや過去の行動履歴は消さない。
  useEffect(() => {
    if (!hydrated || !storeKitEntitlementsResolved || planTier === 'premium') return;
    departurePlans.forEach((item) => {
      if (item.id && isArrivalReversePlan(item)) void cancelPendingDepartureNotifications(item.id);
    });
  }, [departurePlans, hydrated, planTier, storeKitEntitlementsResolved]);

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

  const liveActivityPayload = useMemo<RhythmLiveActivityPayload | undefined>(() => {
    if (!hydrated || !liveActivityEnabled || !storeKitEntitlementsResolved) return undefined;
    // The existing DEV widget entitlement switch is also useful for exercising
    // the three Live Activity tiers without touching StoreKit transactions.
    const tier: RhythmLiveActivityPayload['tier'] = __DEV__ && widgetEntitlementOverride !== 'actual'
      ? widgetEntitlementOverride === 'premium' ? 'premium' : widgetEntitlementOverride === 'design' ? 'design' : 'free'
      : planTier === 'premium' ? 'premium' : hasDesignCustomizeAccess ? 'design' : 'free';
    const displayOptions = normalizeRhythmLiveActivityDisplayOptions(liveActivityDisplayOptions);
    const requestedCustomization = normalizeRhythmLiveActivityCustomization(liveActivityCustomization);
    // Free Live Activity keeps its existing basic typography. Design Customize
    // and Premium may use the persisted typography settings.
    const customization = tier === 'free'
      ? { ...DEFAULT_LIVE_ACTIVITY_CUSTOMIZATION }
      : tier === 'premium'
        ? requestedCustomization
        : { ...requestedCustomization, interactiveChecks: false, affirmationRotationMode: 'fixed' as const };
    // Live Activity keeps the saved nine-color accent even while the app is
    // rendered with Night Sky's fixed foreground palette.
    const accentHex = tier === 'free' ? '#FFFFFF' : selectedChicPalette.accent;
    const affirmationTexts = tier === 'premium' && displayOptions.affirmation
      ? [...new Set([...affirmations.filter((item) => item.enabled).map((item) => item.text.trim()), ...affirmationCustomTexts.map((item) => item.text.trim())].filter(Boolean))].slice(0, 8)
      : [];
    const affirmationText = affirmationTexts[0];
    const rotationAnchor = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const focusStateStillActive = Boolean(focusState && (!focusState.running || !focusState.endAt || Date.parse(focusState.endAt) > now.getTime()));
    const focusDataAvailable = Boolean(focusStateStillActive || focusActivity?.taskTitle?.trim() || focusActivity?.endsAt);
    const focusLiveActivityEnabled = focusDataAvailable && (tier !== 'premium' || displayOptions.focusRemaining) && (focusTimerActive || focusStateStillActive);
    if (focusLiveActivityEnabled) {
      const persistedFocus = focusState;
      const focusTask = persistedFocus?.taskId ? tasks.find((task) => task.id === persistedFocus.taskId) : undefined;
      const elapsedSeconds = focusActivity?.elapsedSeconds ?? (persistedFocus ? Math.max(0, persistedFocus.plannedDurationMinutes * 60 - persistedFocus.pausedSeconds) : undefined);
      const elapsedStartAt = focusActivity?.elapsedStartAt ?? persistedFocus?.elapsedStartAt;
      return {
        tier,
        mode: 'focus',
        focusTaskTitle: focusActivity?.taskTitle ?? (focusStateStillActive ? persistedFocus?.taskTitle : undefined),
        focusEndsAt: focusActivity?.endsAt ?? (focusStateStillActive && persistedFocus?.running ? persistedFocus.endAt : undefined),
        focusElapsedStartAt: elapsedStartAt,
        focusElapsedSeconds: elapsedSeconds,
        focusRemainingSeconds: focusActivity?.remainingSeconds ?? (focusStateStillActive && persistedFocus?.running ? undefined : focusStateStillActive ? persistedFocus?.pausedSeconds : undefined),
        focusRunning: focusActivity?.running ?? (focusStateStillActive ? persistedFocus?.running : false) ?? focusTimerActive,
        affirmationText,
        affirmationTexts,
        affirmationRotationMode: customization.affirmationRotationMode,
        affirmationRotationIntervalMinutes: customization.affirmationRotationIntervalMinutes,
        affirmationRotationAnchor: rotationAnchor,
        interactiveChecks: tier === 'premium' && customization.interactiveChecks,
        currentTaskId: tier === 'premium' && customization.interactiveChecks ? focusTask?.id : undefined,
        currentTaskListItems: tier === 'premium' && customization.interactiveChecks && focusTask?.listItems?.length
          ? focusTask.listItems.slice(0, 3).map((item) => ({ id: item.id, text: item.text, checked: item.checked }))
          : undefined,
        fontDesign: customization.fontDesign,
        fontSize: customization.fontSize,
        displayOptions,
        accentHex,
      };
    }
    const today = dateKey(now);
    const candidates = tasks
      .filter((task) => task.isRoutine !== true && !task.done && task.status !== 'skipped' && (task.bucket ?? 'now') === 'now')
      .filter((task) => !task.scheduledDate || task.scheduledDate <= today);
    const showCurrentTasks = tier !== 'premium' || displayOptions.currentTask;
    const rankedCurrentTasks = showCurrentTasks ? selectCurrentTasks(candidates, now) : [];
    const current = rankedCurrentTasks[0] ?? (showCurrentTasks ? selectCurrentTask(candidates, now) : undefined);
    const displayTasks = rankedCurrentTasks.slice(0, 3);
    const next = tier === 'premium' && (displayOptions.nextSchedule || displayOptions.departureCountdown) ? nextDeparturePlan : undefined;
    return {
      tier,
      mode: 'normal',
      // A switch that appears enabled but produces no visible activity is
      // confusing. Keep a lightweight, actionable empty state until the
      // user has an eligible TODO; real task/focus/schedule data replaces it
      // on the next sync.
      currentTaskTitle: current?.title ?? '今日のTODOを追加',
      currentTasks: displayTasks.length ? displayTasks.map((task) => ({ id: task.id, title: task.title })) : undefined,
      currentTaskRemainingCount: Math.max(0, rankedCurrentTasks.length - displayTasks.length),
      nextScheduleTitle: tier === 'premium' && (displayOptions.nextSchedule || displayOptions.departureCountdown) ? next?.title : undefined,
      nextScheduleAt: tier === 'premium' && displayOptions.nextSchedule && next ? planScheduledAt(next).toISOString() : undefined,
      departureAt: tier === 'premium' && displayOptions.departureCountdown && next && getPlanCountdownAt(next).getTime() > now.getTime() ? getPlanCountdownAt(next).toISOString() : undefined,
      affirmationText,
      affirmationTexts,
      affirmationRotationMode: customization.affirmationRotationMode,
      affirmationRotationIntervalMinutes: customization.affirmationRotationIntervalMinutes,
      affirmationRotationAnchor: rotationAnchor,
      interactiveChecks: tier === 'premium' && customization.interactiveChecks,
      currentTaskId: tier === 'premium' && customization.interactiveChecks ? displayTasks[0]?.id : undefined,
      currentTaskListItems: tier === 'premium' && customization.interactiveChecks && displayTasks[0]?.listItems?.length
        ? displayTasks[0].listItems.slice(0, 3).map((item) => ({ id: item.id, text: item.text, checked: item.checked }))
        : undefined,
      fontDesign: customization.fontDesign,
      fontSize: customization.fontSize,
      displayOptions: tier === 'premium' ? displayOptions : undefined,
      accentHex,
    };
  }, [affirmationCustomTexts, affirmations, focusActivity, focusState, focusTimerActive, hasDesignCustomizeAccess, hydrated, liveActivityCustomization, liveActivityDisplayOptions, liveActivityEnabled, nextDeparturePlan, now, planTier, selectedChicPalette.accent, storeKitEntitlementsResolved, tasks, widgetEntitlementOverride]);

  useEffect(() => {
    if (!__DEV__) return;
    if (!hydrated) {
      console.log('[LiveActivity] payload skipped: hydration pending');
    } else if (!liveActivityEnabled) {
      console.log('[LiveActivity] payload skipped: switch disabled');
    } else if (!storeKitEntitlementsResolved) {
      console.log('[LiveActivity] payload skipped: entitlements unresolved');
    } else if (!liveActivityPayload) {
      console.log('[LiveActivity] payload skipped: no eligible focus/task/schedule/affirmation');
    } else {
      console.log('[LiveActivity] payload created = true');
    }
  }, [hydrated, liveActivityPayload, storeKitEntitlementsResolved]);

  useEffect(() => {
    if (__DEV__) {
      console.log('[LiveActivity] sync-state', {
        hydrated,
        enabled: liveActivityEnabled,
        entitlementsResolved: storeKitEntitlementsResolved,
        payloadAvailable: Boolean(liveActivityPayload),
        serializedRefSet: liveActivitySerializedRef.current !== undefined,
      });
    }
    if (!hydrated || !storeKitEntitlementsResolved) return;
    const serialized = liveActivityPayload ? JSON.stringify(liveActivityPayload) : undefined;
    if (!serialized || !liveActivityPayload) {
      liveActivitySerializedRef.current = undefined;
      setLiveActivityRuntimeStatus('off');
      if (__DEV__) console.log('[LiveActivity] sync-action', { action: 'end', reason: 'payload-unavailable' });
      void endRhythmLiveActivity();
      return;
    }
    if (serialized === liveActivitySerializedRef.current) return;
    const payload = liveActivityPayload;
    if (__DEV__) console.log('[LiveActivity] sync-action', { action: 'start-or-update', mode: payload.mode, tier: payload.tier });
    setLiveActivityRuntimeStatus('starting');
    void (async () => {
      const available = await isRhythmLiveActivityAvailable();
      if (!available) {
        // Never cache a failed call as if it had started. This makes a later
        // native-capable build or a manual re-enable retry the same payload.
        liveActivitySerializedRef.current = undefined;
        setLiveActivityRuntimeStatus('unavailable');
        if (__DEV__) console.log('[LiveActivity] sync-complete', { action: 'start-or-update', result: false, reason: 'unavailable' });
        return;
      }
      const result = await startOrUpdateRhythmLiveActivity(payload);
      const status = await getRhythmLiveActivityStatus();
      if (result && status.active) {
        liveActivitySerializedRef.current = serialized;
        setLiveActivityRuntimeStatus('active');
      } else {
        liveActivitySerializedRef.current = undefined;
        setLiveActivityRuntimeStatus('failed');
      }
      if (__DEV__) {
        console.log('[LiveActivity] sync-complete', { action: 'start-or-update', result });
        console.log('[LiveActivity] status', status);
      }
    })();
  }, [hydrated, liveActivityEnabled, liveActivityPayload, storeKitEntitlementsResolved]);

  const syncRhythmWidgetSnapshot = React.useCallback(async () => {
    // The first-run tour is deliberately read-only; its temporary data must
    // never escape to the user's home-screen widget.
    if (!hydrated || !storeKitEntitlementsResolved || onboarding.state.firstRunStage === 'demo') return;
    const requestId = widgetSnapshotRequestRef.current + 1;
    widgetSnapshotRequestRef.current = requestId;
    const selectedPhotoUri = widgetSettings.style === 'photo'
      ? widgetSettings.photoSource === 'widget' ? widgetSettings.photoUri : wishTopImageUri
      : undefined;
    // Native removes the shared image when it is no longer referenced. A
    // later switch back to the same URI must copy it into the App Group again.
    if (!selectedPhotoUri) widgetPhotoSyncedUriRef.current = undefined;
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
    const widgetCustomizations: Record<string, { photoFileName?: string; photoLayout?: WidgetSettings['photoLayout']; monoTemplate?: WidgetSettings['monoTemplate'] }> = {};
    for (const { id } of WIDGET_TYPE_OPTIONS) {
      const storedCustomization = widgetSettings.widgetCustomizations?.[id];
      const customization = getWidgetCustomization(widgetSettings, id);
      // Keep an explicit empty per-kind entry so the native module can safely
      // clean derived files after a user removes the last customization.
      if (!storedCustomization) {
        widgetCustomizations[id] = {};
        continue;
      }
      let widgetPhotoFileName: string | undefined;
      if (storedCustomization?.photoUri) {
        const previousUri = widgetCustomPhotoSyncedUrisRef.current[id];
        let copied = previousUri === storedCustomization.photoUri;
        if (!copied) copied = await saveRhythmWidgetPhotoForWidget(storedCustomization.photoUri, id).catch(() => false);
        if (copied) {
          widgetCustomPhotoSyncedUrisRef.current[id] = storedCustomization.photoUri;
          widgetPhotoFileName = `rhythm-widget-photo-${id}.jpg`;
          if (previousUri !== storedCustomization.photoUri) photoWasCopied = true;
        }
      }
      if (widgetPhotoFileName || storedCustomization?.photoLayout || storedCustomization?.monoTemplate) {
        widgetCustomizations[id] = {
          ...(widgetPhotoFileName ? { photoFileName: widgetPhotoFileName } : {}),
          ...(customization.photoLayout ? { photoLayout: customization.photoLayout } : {}),
          ...(customization.monoTemplate ? { monoTemplate: customization.monoTemplate } : {}),
        };
      }
    }
    Object.keys(widgetCustomPhotoSyncedUrisRef.current).forEach((id) => {
      if (!widgetSettings.widgetCustomizations?.[id as WidgetType]?.photoUri) delete widgetCustomPhotoSyncedUrisRef.current[id];
    });
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
        monoTemplate: widgetSettings.monoTemplate,
        fontDesign: widgetSettings.fontDesign,
        accentHex: chicPalette.accent,
        // Keep the existing Design selection available to each widget's
        // AppIntent configuration even when the app's current screen mode is
        // Mono or Photo. The native widget still gates patterns using this
        // persisted entitlement flag; carrying the values does not unlock
        // Design for users who do not own it.
        // The heart pattern is supported by the app and Widget renderer; keep
        // the same persisted identifier so both previews stay in sync.
        // The four completed image backgrounds are app-only. Never pass their
        // ids to the native Widget renderer, whose pattern enum intentionally
        // remains unchanged; it falls back to the existing plain design.
        designPattern: isImageDesignPattern(effectiveChicPattern) ? 'plain' : effectiveChicPattern,
        designCheckColor: chicCheckColor,
        designPatternUnlocked: hasDesignCustomizeAccess,
        affirmationBackgrounds: widgetSettings.affirmationBackgrounds,
        ...(photoFileName ? { photoFileName, photoLayout: widgetSettings.photoLayout } : {}),
      },
      widgetCustomizations,
      displayOptions: widgetSettings.displayOptions,
      widgetPhotoUnlock: rewardedAccess.widgetPhotoCustomization,
      wishMonths,
      affirmations,
      affirmationCustomTexts,
      // Photo bytes stay in the App Group file container; snapshots carry
      // bounded filenames only. Dedicated affirmation photo management can
      // add these slots without changing the snapshot schema again.
      affirmationPhotoFileNames,
    });
    if (__DEV__) {
      const today = dateKey(now);
      const monthKey = today.slice(0, 7);
      const weekDates = new Set((snapshot.calendarWeek?.days ?? []).map((day) => day.date));
      const summarizePlan = (item: DeparturePlan) => ({ title: item.title, date: item.date, time: item.allDay ? '終日' : (getPlanScheduledTime(item) || item.arrival || undefined) });
      const calendarMonthItems = departurePlans.filter((item) => item.date.startsWith(monthKey)).map(summarizePlan);
      const calendarWeekItems = departurePlans.filter((item) => weekDates.has(item.date)).map(summarizePlan);
      const calendarTodayItems = departurePlans.filter((item) => item.date === today).map(summarizePlan);
      console.log('[CalendarDiagnostic] WIDGET_SNAPSHOT_BEFORE_SAVE', {
        timestamp: new Date().toISOString(),
        departurePlansCount: departurePlans.length,
        calendarPlansCount: snapshot.calendarPlans?.length ?? 0,
        calendarMonthScheduleCount: snapshot.calendarMonth?.days.reduce((sum, day) => sum + day.scheduleCount, 0) ?? 0,
        calendarWeekScheduleCount: snapshot.calendarWeek?.days.reduce((sum, day) => sum + day.schedules.length, 0) ?? 0,
        today: calendarTodayItems.slice(0, 24),
        week: calendarWeekItems.slice(0, 24),
        month: calendarMonthItems.slice(0, 24),
      });
    }
    const serialized = JSON.stringify(snapshot);
    // Async photo preparation can finish out of order. Only the most
    // recently requested snapshot may enter the save queue; otherwise an old
    // request could overwrite a newer theme/task state after it completes.
    if (requestId !== widgetSnapshotRequestRef.current) return;
    if (!photoWasCopied && serialized === widgetSnapshotSerializedRef.current) return;
    widgetSnapshotInFlightRef.current = { requestId, serialized };
    const persist = async () => {
      if (requestId !== widgetSnapshotRequestRef.current) return;
      try {
        const saved = await saveRhythmWidgetSnapshot(snapshot);
        if (__DEV__) console.log('[CalendarDiagnostic] WIDGET_SNAPSHOT_WRITE', { timestamp: new Date().toISOString(), success: saved, departurePlansCount: departurePlans.length, calendarPlansCount: snapshot.calendarPlans?.length ?? 0 });
        if (saved && requestId === widgetSnapshotRequestRef.current) widgetSnapshotSerializedRef.current = serialized;
      } catch (error) {
        // Expo Go has no WidgetKit module. Native failures should not affect app state.
        console.warn('Rhythm widget snapshot save failed.', error);
      } finally {
        if (widgetSnapshotInFlightRef.current?.requestId === requestId) widgetSnapshotInFlightRef.current = undefined;
      }
    };
    // Native writes are serialized as well as generation-checked. If a newer
    // request arrives while an older native write is in progress, it waits for
    // that write and becomes the final write; an older queued request skips.
    const queuedPersist = widgetSnapshotSaveChainRef.current.then(persist, persist);
    widgetSnapshotSaveChainRef.current = queuedPersist.catch(() => undefined);
    await queuedPersist;
  }, [affirmationCustomTexts, affirmations, chicCheckColor, designMode, departureCheckIns, departurePlans, effectiveChicPattern, hasDesignCustomizeAccess, hydrated, onboarding.state.firstRunStage, planTier, rewardedAccess.widgetPhotoCustomization, storeKitEntitlementsResolved, tasks, widgetPhotoSyncedUriRef, widgetCustomPhotoSyncedUrisRef, widgetSettings, wishMonths, wishTopImageUri]);

  const openWidgetGuide = React.useCallback(() => {
    // Present this native Modal only after the Widget sheet has completed its
    // dismissal transaction; presenting two iOS Modals in one frame can leave
    // an invisible host capturing touches.
    requestAnimationFrame(() => requestAnimationFrame(() => setWidgetGuideVisible(true)));
  }, []);

  const removeRoutineById = React.useCallback((taskId: string) => {
    const target = tasksRef.current.find((task) => task.id === taskId);
    if (!target?.isRoutine) return;
    Alert.alert('ルーティンから外しますか？', 'タスク自体と完了履歴は残ります。', [{ text: 'キャンセル', style: 'cancel' }, { text: 'ルーティンから外す', style: 'destructive', onPress: () => {
      const latest = tasksRef.current.find((task) => task.id === taskId);
      if (!latest) return;
      const endedAt = new Date().toISOString();
      const routineId = latest.routineId ?? latest.id;
      const routine = getRoutineHistories(behaviorEventsRef.current, tasksRef.current).find((item) => item.id === routineId);
      const summary = routine ? buildRoutineInterruptionSummary(behaviorEventsRef.current, tasksRef.current, routine, new Date(endedAt)) : undefined;
      const archive: RoutineArchive = {
        id: `routine-archive:${routineId}:${endedAt}`,
        routineId,
        title: latest.title,
        removedAt: endedAt,
        streakDays: summary?.longestStreak ?? 0,
        totalCompletedDays: summary?.totalCompletedDays ?? 0,
        taskTemplate: { ...latest, subtasks: latest.subtasks?.map((item) => ({ ...item })), listItems: latest.listItems?.map((item) => ({ ...item })) },
      };
      const next = tasksRef.current.map((task) => (task.routineId ?? task.id) === routineId ? { ...task, isRoutine: false, routineEndedAt: endedAt } : task);
      tasksRef.current = next;
      setTasks(next);
      next
        .filter((task) => (task.routineId ?? task.id) === routineId && normalizeTaskDateKey(task.scheduledDate) && normalizeTaskDateKey(task.scheduledDate)! > dateKey(endedAt))
        .forEach((task) => { void cancelPendingTaskNotifications(task.id); void cancelScheduleSwitchNotificationsForTask(task.id); });
      setRoutineArchives((current) => pruneRoutineArchives([...current.filter((item) => item.routineId !== routineId), archive]));
      recordBehaviorEvent(createRoutineDeactivatedBehaviorEvent({ routineId, routineTitle: latest.title, taskId: latest.id, occurredAt: new Date(endedAt), targetDate: dateKey(endedAt) }));
    } }]);
  }, [recordBehaviorEvent]);
  const closeWidgetGuide = React.useCallback(() => {
    setWidgetGuideVisible(false);
    if (!onboarding.isCompleted('widgetGuide')) void onboarding.complete('widgetGuide');
  }, [onboarding]);
  const openWidgetSection = React.useCallback(() => {
    if (!onboarding.isCompleted('widgetGuide')) setWidgetGuideVisible(true);
  }, [onboarding]);
  const refreshWidgetFromSettings = React.useCallback(() => syncRhythmWidgetSnapshot()
    .then(() => Alert.alert('Widgetを更新しました', '最新の予定とタスクを同期しました。'))
    .catch(() => Alert.alert('Widgetを更新できませんでした', '時間をおいてもう一度お試しください。')), [syncRhythmWidgetSnapshot]);

  useEffect(() => {
    void syncRhythmWidgetSnapshot().catch((error) => {
      if (__DEV__) console.warn('[Widget] initial snapshot sync failed', error);
    });
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

  const enqueueScheduleConflict = React.useCallback((conflict: ScheduleConflict | undefined) => {
    if (!conflict || scheduleConflictKeysRef.current.has(conflict.key)) return;
    scheduleConflictKeysRef.current.add(conflict.key);
    if (focusTaskCompletionPrompt || tomorrowPrepOpen || scheduleConflictPrompt || noticeCenterOpen) {
      pendingScheduleConflictRef.current = conflict;
      return;
    }
    setScheduleConflictPrompt(conflict);
  }, [focusTaskCompletionPrompt, noticeCenterOpen, scheduleConflictPrompt, tomorrowPrepOpen]);

  const queueScheduleConflictCheck = React.useCallback((task: Task, plans: DeparturePlan[]) => {
    enqueueScheduleConflict(findScheduleConflict(task, plans, now));
  }, [enqueueScheduleConflict, now]);

  const queuePlanConflictCheck = React.useCallback((targetPlan: DeparturePlan, currentTasks: Task[]) => {
    for (const task of currentTasks) {
      const conflict = findScheduleConflict(task, [targetPlan], now);
      if (conflict) {
        enqueueScheduleConflict(conflict);
        break;
      }
    }
  }, [enqueueScheduleConflict, now]);

  const addTask = (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule: RepeatRule = 'none', nudgeMode: NudgeMode = 'once', scheduledDate?: string, scheduledTime?: string, endAt?: string, isRoutine = false, subtasks: Subtask[] = [], listItems: TaskListItem[] = [], routineIdOverride?: string): Task | undefined => {
    if (scheduledTime && endAt && endAt <= scheduledTime) {
      Alert.alert('終了時間を確認してください', '終了時間は開始時間より後にしてください。');
      return undefined;
    }
    if (isRoutine && repeatRule === 'none') {
      Alert.alert('繰り返しを選んでください', 'ルーティンには毎日・平日・毎週・毎月のいずれかを設定してください。');
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
      routineId: isRoutine ? routineIdOverride ?? taskId : undefined,
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
    void syncScheduleSwitchNotificationsForTask(task.id);
    queueScheduleConflictCheck(task, departurePlansRef.current);
    return task;
  };

  const updateTask = (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule: RepeatRule = 'none', nudgeMode: NudgeMode = 'once', scheduledDate?: string, scheduledTime?: string, endAt?: string, isRoutine = false, subtasks: Subtask[] = [], listItems?: TaskListItem[]) => {
    if (!editingTask) return;
    if (scheduledTime && endAt && endAt <= scheduledTime) {
      Alert.alert('終了時間を確認してください', '終了時間は開始時間より後にしてください。');
      return;
    }
    if (isRoutine && repeatRule === 'none') {
      Alert.alert('繰り返しを選んでください', 'ルーティンには毎日・平日・毎週・毎月のいずれかを設定してください。');
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
    const existingStatus = getTaskStatus(editingTask);
    const updated = { ...editingTask, title, category, priority, remindDate, remindAt, deadlineDate, deadlineTime, deadlineNotifyBefore, navigationEnabled, preparationMinutes, travelMinutes, bufferMinutes, repeatRule, isRoutine, routineId: isRoutine ? editingTask.routineId ?? editingTask.id : editingTask.routineId, routineEndedAt: isRoutine ? undefined : endedAt, nudgeMode, scheduledDate: scheduledDate ?? editingTask.scheduledDate ?? dateKey(now), scheduledTime, endAt: endAt && /^\d{2}:\d{2}$/.test(endAt) ? endAt : undefined, done: editingTask.done, status: existingStatus, completedAt: editingTask.completedAt, skippedAt: editingTask.skippedAt, subtasks: subtasks.map((item, index) => ({ ...item, order: index, done: Boolean(item.done) })), listItems: (listItems ?? editingTask.listItems ?? []).map((item, index) => ({ ...item, text: item.text.trim(), order: index, checked: Boolean(item.checked) })).filter((item) => item.text) };
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
    if (updated.done || getTaskStatus(updated) === 'skipped') void cancelPendingTaskNotifications(updated.id);
    else void scheduleAllTaskNotifications(updated);
    void syncScheduleSwitchNotificationsForTask(updated.id);
    queueScheduleConflictCheck(updated, departurePlansRef.current);
  };

  const updateTaskList = React.useCallback((taskId: string, items: TaskListItem[]) => {
    const next = tasksRef.current.map((task) => task.id === taskId
      ? { ...task, listItems: items.map((item, index) => ({ ...item, text: item.text.trim(), order: index, checked: Boolean(item.checked) })).filter((item) => item.text) }
      : task);
    tasksRef.current = next;
    setTasks(next);
  }, []);

  const processPendingWidgetActions = React.useCallback(async () => {
    if (!hydratedRef.current || onboarding.state.firstRunStage === 'demo') return;
    if (pendingWidgetActionsProcessingRef.current) return;
    pendingWidgetActionsProcessingRef.current = true;
    try {
      const actions = await getRhythmWidgetPendingActions();
      if (!actions.length) return;
      const handledIds: string[] = [];
      const taskIdsToComplete: string[] = [];
      let nextTasks = tasksRef.current;
      actions.forEach((raw: any) => {
        if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return;
        if (raw.type === 'addTask' && typeof raw.title === 'string') {
          const title = raw.title.trim();
          if (title) {
            const taskId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const scheduledDate = typeof raw.scheduledDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.scheduledDate)
              ? raw.scheduledDate
              : dateKey();
            const scheduledTime = typeof raw.scheduledTime === 'string' && /^\d{2}:\d{2}$/.test(raw.scheduledTime)
              ? raw.scheduledTime
              : undefined;
            const task: Task = {
              id: taskId,
              title,
              createdAt: new Date().toISOString(),
              done: false,
              status: 'active',
              category: 'その他',
              priority: '中',
              repeatRule: 'none',
              nudgeMode: 'once',
              scheduledDate,
              scheduledTime,
            };
            nextTasks = [task, ...nextTasks];
            queueScheduleConflictCheck(task, departurePlansRef.current);
          }
          handledIds.push(raw.id);
        } else if (raw.type === 'completeTask' && typeof raw.taskId === 'string') {
          const target = nextTasks.find((task) => task.id === raw.taskId);
          if (target && !target.done) {
            taskIdsToComplete.push(raw.taskId);
          }
          handledIds.push(raw.id);
        } else if (raw.type === 'toggleListItem' && typeof raw.taskId === 'string' && typeof raw.listItemId === 'string' && typeof raw.completed === 'boolean') {
          const target = nextTasks.find((task) => task.id === raw.taskId);
          const scheduledDate = target?.scheduledDate ? normalizeTaskDateKey(target.scheduledDate) : undefined;
          const isCurrentWidgetChecklistTask = target !== undefined
            && target.isRoutine !== true
            && target.done !== true
            && target.status !== 'skipped'
            && (target.bucket ?? 'now') === 'now'
            && (!scheduledDate || scheduledDate <= dateKey());
          if (isCurrentWidgetChecklistTask && target?.listItems?.some((item) => item.id === raw.listItemId)) {
            nextTasks = nextTasks.map((task) => task.id === raw.taskId
              ? { ...task, listItems: task.listItems?.map((item) => item.id === raw.listItemId ? { ...item, checked: raw.completed } : item) }
              : task);
          }
          handledIds.push(raw.id);
        }
      });
      if (nextTasks !== tasksRef.current) {
        tasksRef.current = nextTasks;
        setTasks(nextTasks);
      }
      if (taskIdsToComplete.length) completeTaskIds(taskIdsToComplete, 'manual');
      if (handledIds.length) await acknowledgeRhythmWidgetPendingActions(handledIds);
    } finally {
      pendingWidgetActionsProcessingRef.current = false;
    }
  }, [completeTaskIds, onboarding.state.firstRunStage]);

  React.useEffect(() => {
    if (!hydrated) return;
    void processPendingWidgetActions();
  }, [hydrated, processPendingWidgetActions]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void processPendingWidgetActions().finally(() => { void syncRhythmWidgetSnapshot(); });
      }
    });
    return () => subscription.remove();
  }, [processPendingWidgetActions, syncRhythmWidgetSnapshot]);

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
    newTasks.forEach((task) => queueScheduleConflictCheck(task, departurePlansRef.current));
    setBulkAddOpen(false);
    void onboarding.complete('todo');
  }, [dateKey, now, onboarding, queueScheduleConflictCheck]);

  const syncScheduleSwitchNotificationsForTask = async (taskId: string) => {
    await enqueueNotificationOperation('schedule-switch', async () => {
      const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      await Promise.all(pending.filter((request) => {
        const data = request.content.data as Record<string, unknown> | undefined;
        return data?.kind === 'schedule_switch' && data.taskId === taskId;
      }).map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
      const latest = tasksRef.current.find((item) => item.id === taskId);
      const candidate = latest ? findScheduleSwitchCandidate(latest, departurePlansRef.current, new Date()) : undefined;
      if (!candidate || !await ensureNotifications()) return;
      const identifier = `schedule-switch:${candidate.task.id}:${candidate.plan.id}`;
      await Notifications.scheduleNotificationAsync({
        identifier,
            content: {
          ...buildScheduleSwitchContent(candidate.plan.title, candidate.kind, candidate.task.title),
          sound: 'default',
          data: { kind: 'schedule_switch', taskId: candidate.task.id, departurePlanId: candidate.plan.id, notificationInstanceId: identifier, boundaryKind: candidate.kind, boundaryAt: candidate.boundaryAt.toISOString() },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: candidate.notifyAt },
      });
    }).catch((error) => {
      if (__DEV__) console.warn('[Notifications] schedule switch sync failed', error);
    });
  };

  const syncScheduleSwitchNotificationsForPlan = async (planId: string) => {
    await enqueueNotificationOperation('schedule-switch', async () => {
      const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      await Promise.all(pending.filter((request) => {
        const data = request.content.data as Record<string, unknown> | undefined;
        return data?.kind === 'schedule_switch' && data.departurePlanId === planId;
      }).map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
      const latestPlan = departurePlansRef.current.find((item) => item.id === planId);
      if (!latestPlan) return;
      const candidate = tasksRef.current
        .map((task) => findScheduleSwitchCandidate(task, [latestPlan], new Date()))
        .filter((item): item is ScheduleSwitchCandidate => Boolean(item))
        .sort((left, right) => left.boundaryAt.getTime() - right.boundaryAt.getTime()
          || String(left.task.id).localeCompare(String(right.task.id)))[0];
      if (!candidate || !await ensureNotifications()) return;
      const identifier = `schedule-switch:${candidate.task.id}:${candidate.plan.id}`;
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          ...buildScheduleSwitchContent(candidate.plan.title, candidate.kind, candidate.task.title),
          sound: 'default',
          data: { kind: 'schedule_switch', taskId: candidate.task.id, departurePlanId: candidate.plan.id, notificationInstanceId: identifier, boundaryKind: candidate.kind, boundaryAt: candidate.boundaryAt.toISOString() },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: candidate.notifyAt },
      });
    }).catch((error) => {
      if (__DEV__) console.warn('[Notifications] schedule switch plan sync failed', error);
    });
  };

  const cancelScheduleSwitchNotificationsForTask = async (taskId: string) => {
    await enqueueNotificationOperation('schedule-switch', async () => {
      const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      await Promise.all(pending.filter((request) => {
        const data = request.content.data as Record<string, unknown> | undefined;
        return data?.kind === 'schedule_switch' && data.taskId === taskId;
      }).map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
    }).catch(() => undefined);
  };

  const cancelScheduleSwitchNotificationsForPlan = async (planId: string) => {
    await enqueueNotificationOperation('schedule-switch', async () => {
      const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      await Promise.all(pending.filter((request) => {
        const data = request.content.data as Record<string, unknown> | undefined;
        return data?.kind === 'schedule_switch' && data.departurePlanId === planId;
      }).map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
    }).catch(() => undefined);
  };

  const scheduleAllTaskNotifications = async (task: Task) => {
    try {
      await enqueueNotificationOperation(`task:${task.id}`, async () => {
        await cancelPendingTaskNotificationsUnsafe(task.id);
        const latest = tasksRef.current.find((item) => item.id === task.id);
        if (!latest || latest.done || latest.status === 'skipped') return;
        if (latest.remindAt) await scheduleTaskReminder(latest);
        if (latest.deadlineDate && latest.deadlineTime && latest.deadlineNotifyBefore !== undefined) await scheduleDeadlineReminder(latest);
      });
    } catch (error) {
      // Saving the task must remain successful even when the native
      // notification store is unavailable (e.g. during backgrounding).
      console.warn('Task notification scheduling failed.', error);
    }
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
          title: buildTaskReminderTitle(index, offsets.length),
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
    const notificationInstanceId = `deadline:${task.id}:${notificationDate.toISOString()}`;
    await Notifications.scheduleNotificationAsync({
      identifier: notificationInstanceId,
      content: {
        title: buildDeadlineTitle(task.deadlineNotifyBefore),
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
    if (!targetPlan.id) return;
    const planId = targetPlan.id;
    await enqueueNotificationOperation(`departure:${planId}`, async () => {
      await cancelPendingDepartureNotificationsUnsafe(planId);
      if (!departurePlansRef.current.some((item) => item.id === planId)) return;
      const mode = getDeparturePlanMode(targetPlan);
      if (mode === 'calendar_only') return;
      if (!await ensureNotifications()) {
        if (!options?.silent) Alert.alert('通知がオフです', '端末の通知を許可してください。');
        return;
      }
      if (mode === 'departure_reminder') {
        const departureAt = dateForReminder(planDateKey(targetPlan), getPlanScheduledTime(targetPlan));
        if (departureAt.getTime() <= Date.now()) return;
        await Notifications.scheduleNotificationAsync({
          content: {
            ...buildDepartureReminderContent(targetPlan.title),
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
        ...buildDepartureStageContent('wake_up', targetPlan.title, formatLiveTime(moments.prepare), formatLiveTime(moments.leave), formatLiveTime(moments.arrival)),
      },
      {
        id: 'prepare',
        before: targetPlan.travelMinutes + targetPlan.bufferMinutes + targetPlan.preparationMinutes,
        ...buildDepartureStageContent('prepare', targetPlan.title, formatLiveTime(moments.prepare), formatLiveTime(moments.leave), formatLiveTime(moments.arrival)),
      },
      {
        id: 'ten_minutes',
        before: targetPlan.travelMinutes + targetPlan.bufferMinutes + 10,
        ...buildDepartureStageContent('ten_minutes', targetPlan.title, formatLiveTime(moments.prepare), formatLiveTime(moments.leave), formatLiveTime(moments.arrival)),
      },
      {
        id: 'leave_now',
        before: targetPlan.travelMinutes + targetPlan.bufferMinutes,
        ...buildDepartureStageContent('leave_now', targetPlan.title, formatLiveTime(moments.prepare), formatLiveTime(moments.leave), formatLiveTime(moments.arrival)),
      },
      {
        id: 'late_warning',
        before: Math.max(0, targetPlan.travelMinutes + targetPlan.bufferMinutes - 5),
        ...buildDepartureStageContent('late_warning', targetPlan.title, formatLiveTime(moments.prepare), formatLiveTime(moments.leave), formatLiveTime(moments.arrival)),
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
    });
  };
  useEffect(() => {
    if (!hydrated || !storeKitEntitlementsResolved || planTier !== 'premium') return;
    let active = true;
    void (async () => {
      if (!active) return;
      for (const item of departurePlans) {
        if (!item.id || getDeparturePlanMode(item) === 'calendar_only' || planDateKey(item) < dateKey()) continue;
        await cancelPendingDepartureNotifications(item.id).catch(() => undefined);
        await scheduleDeparture(item, { silent: true });
      }
    })();
    return () => { active = false; };
  }, [hydrated, planTier, storeKitEntitlementsResolved]);
  scheduleTaskNotificationsRef.current = scheduleAllTaskNotifications;

  const moveTaskToTomorrow = React.useCallback((taskId: string) => {
    const target = tasksRef.current.find((item) => item.id === taskId);
    if (!target) return;
    const nextDate = todayInputValue(1);
    const oldDate = normalizeTaskDateKey(target.scheduledDate);
    const nextTask: Task = {
      ...target,
      scheduledDate: nextDate,
      remindDate: target.remindAt ? nextDate : target.remindDate,
      ...(oldDate && target.deadlineDate === oldDate ? { deadlineDate: nextDate } : {}),
      bucket: 'later',
    };
    const next = tasksRef.current.map((item) => item.id === taskId ? nextTask : item);
    tasksRef.current = next;
    setTasks(next);
    void scheduleTaskNotificationsRef.current(nextTask);
    void syncScheduleSwitchNotificationsForTask(nextTask.id);
  }, []);

  const moveTaskToLater = React.useCallback((taskId: string) => {
    const target = tasksRef.current.find((item) => item.id === taskId);
    if (!target) return;
    const nextTask = { ...target, bucket: 'later' as TaskBucket };
    const next = tasksRef.current.map((item) => item.id === taskId ? nextTask : item);
    tasksRef.current = next;
    setTasks(next);
    void scheduleTaskNotificationsRef.current(nextTask);
    void syncScheduleSwitchNotificationsForTask(nextTask.id);
  }, []);

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
    if (!hydrated || routineRemainingNotificationInFlightRef.current) return;
    const day = dateKey(now);
    const remaining = getTodayRemainingRoutines(tasksRef.current, day);
    routineRemainingNotificationInFlightRef.current = true;
    void enqueueNotificationOperation('routine-remaining', async () => {
      const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      const sameDay = pending.filter((request) => {
        const data = request.content.data as Record<string, unknown> | undefined;
        return data?.kind === 'routine_remaining' && data.routineDate === day;
      });
      const scheduledAt = dateForReminder(day, '20:00');
      const isBeforeNotificationTime = scheduledAt.getTime() > Date.now();
      if (remaining.length === 0) {
        await Promise.all(sameDay.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
        return;
      }
      // A notification that is already due is considered sent for the day;
      // never create a second one after the 20:00 boundary.
      if (!isBeforeNotificationTime) {
        if (sameDay.length > 0 || routineRemainingNotifiedDateRef.current === day) {
          routineRemainingNotifiedDateRef.current = day;
          setRoutineRemainingNotifiedDate(day);
        }
        return;
      }
      const currentCount = remaining.length;
      const existingSameDay = sameDay[0];
      const sameCount = existingSameDay
        ? Number((existingSameDay.content.data as Record<string, unknown> | undefined)?.routineCount)
        : undefined;
      if (sameDay.length > 0 && sameCount === currentCount) return;
      await Promise.all(sameDay.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
      // A legacy save may have marked the date when scheduling rather than
      // delivery. If no pending request remains, keep that day suppressed.
      if (sameDay.length === 0 && routineRemainingNotifiedDateRef.current === day) return;
      if (!canUseNotifications(await getNotificationPermissionStatus())) return;
      const identifier = `routine-remaining:${day}`;
      await Notifications.scheduleNotificationAsync({
        identifier,
      content: {
          ...buildRoutineRemainingContent(currentCount),
          sound: 'default',
          data: { kind: 'routine_remaining', routineDate: day, routineCount: currentCount, notificationInstanceId: identifier },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: scheduledAt },
      });
    }).catch((error) => {
      if (__DEV__) console.warn('[Notifications] routine remaining sync failed', error);
    }).finally(() => {
      routineRemainingNotificationInFlightRef.current = false;
    });
  }, [hydrated, now, tasks]);

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
    if (editTarget?.id) {
      await cancelPendingDepartureNotifications(editTarget.id);
      await cancelScheduleSwitchNotificationsForPlan(editTarget.id);
    }
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
    if (saved.id) void syncScheduleSwitchNotificationsForPlan(saved.id);
    if (mode === 'calendar_only') Alert.alert(plan.id ? '予定を保存しました' : '予定を追加しました', '予定表に表示しました。');
    closePlanEditor();
    void onboarding.complete('planRegistration');
    queuePlanConflictCheck(saved, tasksRef.current);
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
    if (imported.id) void syncScheduleSwitchNotificationsForPlan(imported.id);
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
            void cancelScheduleSwitchNotificationsForPlan(id);
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
          await cancelScheduleSwitchNotificationsForPlan(updated.id!);
          await scheduleDeparture(updated);
          await syncScheduleSwitchNotificationsForPlan(updated.id!);
        })().catch((error) => {
          if (__DEV__) console.warn('[Notifications] recovery reschedule failed', error);
        });
      }
    }
    setRecoveryTargetPlanId(undefined);
    void onboarding.complete('recovery');
  };

  const completeFocusSession = (session: FocusSession) => {
    setFocusSessions((current) => current.some((item) => item.id === session.id) ? current : [session, ...current].slice(0, 300));
    showCompletionAffirmation('focus');
  };

  const handleFocusTaskFinished = React.useCallback((session: FocusSession): boolean => {
    if (!session.taskId || focusTaskCompletionPromptedRef.current.has(session.id)) return false;
    const target = tasksRef.current.find((task) => task.id === session.taskId);
    if (!target || target.done || target.status === 'skipped') return false;
    focusTaskCompletionPromptedRef.current.add(session.id);
    setScheduleConflictPrompt(undefined);
    setFocusTaskCompletionPrompt(session);
    return true;
  }, []);

  useEffect(() => {
    if (!focusTaskCompletionPrompt) return;
    const target = tasksRef.current.find((task) => task.id === focusTaskCompletionPrompt.taskId);
    if (!target || target.done || target.status === 'skipped') setFocusTaskCompletionPrompt(undefined);
  }, [focusTaskCompletionPrompt, tasks]);

  useEffect(() => {
    if (!scheduleConflictPrompt) return;
    if (!tasks.some((task) => task.id === scheduleConflictPrompt.task.id) || !departurePlans.some((plan) => plan.id === scheduleConflictPrompt.plan.id)) {
      setScheduleConflictPrompt(undefined);
    }
  }, [departurePlans, scheduleConflictPrompt, tasks]);

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
    // TimelineScreen mirrors initialTab into its local tab state. Keep the
    // Focus tab selected while a session is running so a schedule/deep-link
    // request cannot unmount FocusMode and trigger its cleanup.
    if (focusTimerActive && nextScreen === 'timeline') setTimelineInitialTab('focus');
    if (nextScreen === 'wish') openWish();
    else setScreen(nextScreen);
  }, [focusTimerActive, openWish, screen]);
  navigateWithinAppRef.current = navigateWithinApp;

  // Premium previews reuse the production screens with fixed, read-only demo
  // data.  The parent preview surface disables pointer events, so these
  // callbacks are no-ops, so these screens cannot save tasks, schedule
  // notifications, request permissions, or mutate the user's state while
  // still showing the real layout, scroll behavior, and tokens.
  const renderWishCapturePreview = (premium: boolean): React.ReactNode => {
    const wishId = 'capture-preview-wish';
    const actions: WishAction[] = [
      { id: 'capture-preview-action-1', wishId, title: '少し時間をとる', completed: premium },
      ...(premium ? [{ id: 'capture-preview-action-2', wishId, title: 'できる範囲で続ける', completed: false }] : []),
    ];
    return (
      <View pointerEvents="none" style={{ width: '100%', height: premium ? 740 : 620 }}>
        <WishScreen
          designMode={uiDesignMode}
          chicPattern={effectiveChicPattern}
          chicPalette={chicPalette}
          monthLabel={`${new Date().getFullYear()}年${new Date().getMonth() + 1}月`}
          state={{
            monthlyGoal: '毎日少しでも自分の時間をつくる',
            wishes: [{ id: wishId, title: '自分の時間をつくる', completed: false, createdAt: '2026-01-01T00:00:00.000Z' }],
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

  const renderDesignShowcasePreview = (): React.ReactNode => {
    const tileStyle = { flex: 1, minWidth: 0, borderRadius: 10, overflow: 'hidden' as const, borderWidth: 1, borderColor: chicPalette.border, backgroundColor: chicPalette.cardSurface };
    const tileLabel = { color: chicPalette.textPrimary, fontSize: 10, fontWeight: '800' as const, textAlign: 'center' as const, paddingVertical: 5 };
    return <View pointerEvents="none" style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: chicPalette.border, backgroundColor: chicPalette.cardSurface }}>
      <Text style={{ color: chicPalette.textPrimary, fontSize: 13, fontWeight: '900' }}>RhythmPace Design</Text>
      <Text style={{ color: chicPalette.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 3 }}>花柄・ドット・チェック・写真の違いを、実際のデザインで確認できます。</Text>
      <View style={{ flexDirection: 'row', gap: 7, marginTop: 10 }}>
        <View style={tileStyle}><Image source={designFloralAssets.floral.thumbnailSource ?? designFloralAssets.floral.source} resizeMode="cover" style={{ width: '100%', height: 62 }} /><Text style={tileLabel}>花柄</Text></View>
        <View style={tileStyle}><View style={{ height: 62, overflow: 'hidden', backgroundColor: chicPalette.background }}><ChicPatternDecor pattern="dot" accent={chicPalette.accent} warm={chicPalette.accentSoft} checkColor={chicCheckColor} preview /></View><Text style={tileLabel}>ドット</Text></View>
        <View style={tileStyle}><View style={{ height: 62, overflow: 'hidden', backgroundColor: chicPalette.patternBase }}><ChicPatternDecor pattern="checkLavenderSatin" accent={chicPalette.accent} warm={chicPalette.patternStripe} checkColor={chicCheckColor} preview /></View><Text style={tileLabel}>チェック</Text></View>
        <View style={tileStyle}>{photoTheme.imageUri ? <Image source={{ uri: photoTheme.imageUri }} resizeMode="cover" style={{ width: '100%', height: 62 }} /> : <View style={{ height: 62, alignItems: 'center', justifyContent: 'center', backgroundColor: chicPalette.surfaceSubtle }}><Text style={{ color: chicPalette.textSecondary, fontSize: 18 }}>▧</Text></View>}<Text style={tileLabel}>写真</Text></View>
      </View>
    </View>;
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
      { id: 'premium-preview-task-1', title: '今日のタスクを確認', done: false, category: '仕事', priority: '中', scheduledDate: previewDate, scheduledTime: '09:00', bucket: 'now' },
      { id: 'premium-preview-task-4', title: '予定を確認', done: false, category: 'その他', priority: '低', scheduledDate: previewDate, scheduledTime: '11:30', bucket: 'later' },
      { id: 'premium-preview-task-2', title: '完了したタスク', done: true, status: 'completed', category: 'その他', priority: '中', scheduledDate: previewDate, scheduledTime: '14:00', completedAt: new Date(Date.now() - 86400000).toISOString(), bucket: 'later' },
      { id: 'premium-preview-task-5', title: '今日の予定', done: false, category: 'その他', priority: '中', scheduledDate: previewDate, scheduledTime: '18:30', bucket: 'now' },
      { id: 'premium-preview-task-3', title: '完了したタスク', done: true, status: 'completed', category: 'その他', priority: '中', scheduledDate: previewDate, completedAt: new Date(Date.now() - 86400000 * 4).toISOString(), bucket: 'later' },
    ];
    // Keep the read-only showcase relative to the current time so a stale
    // fixed clock never renders an absurd multi-hour countdown.
    const previewArrivalAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const previewDepartureAt = new Date(previewArrivalAt.getTime() - 45 * 60 * 1000);
    const previewEndAt = new Date(previewArrivalAt.getTime() + 60 * 60 * 1000);
    const previewClock = (value: Date) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
    const previewPlanDate = dateKey(previewArrivalAt);
    const previewPlans: DeparturePlan[] = [{ id: 'premium-preview-plan', title: '予定', destination: '予定の場所', date: previewPlanDate, arrival: previewClock(previewArrivalAt), departureTime: previewClock(previewDepartureAt), endAt: previewClock(previewEndAt), travelMinutes: 30, preparationMinutes: 15, bufferMinutes: 10, planMode: 'arrival_reverse' }];
    const previewCalendarOptions = [
      { id: 'preview-personal-calendar', title: '個人', type: 'local' },
      { id: 'preview-work-calendar', title: '仕事', type: 'local' },
    ] as Calendar.Calendar[];
    const previewCalendarEvents = [
      { id: 'preview-calendar-hospital', calendarId: 'preview-personal-calendar', title: '予定', startDate: `${previewDate}T10:00:00`, endDate: `${previewDate}T11:00:00`, allDay: false },
      { id: 'preview-calendar-meeting', calendarId: 'preview-work-calendar', title: '予定', startDate: `${previewDate}T14:00:00`, endDate: `${previewDate}T15:00:00`, allDay: false },
      { id: 'preview-calendar-hair', calendarId: 'preview-personal-calendar', title: '予定', startDate: `${previewDate}T18:00:00`, endDate: `${previewDate}T19:00:00`, allDay: false },
    ] as Calendar.Event[];
    const monthDate = (day: number) => dateKey(new Date(now.getFullYear(), now.getMonth(), day, 9, 0, 0, 0));
    const monthPreviewTasks: Task[] = [
      { id: 'premium-month-task-1', title: '完了したタスク', done: true, status: 'completed', category: 'その他', priority: '中', scheduledDate: monthDate(12), completedAt: `${monthDate(12)}T18:00:00`, bucket: 'later' },
      { id: 'premium-month-task-2', title: '完了したタスク', done: true, status: 'completed', category: 'その他', priority: '高', scheduledDate: monthDate(27), completedAt: `${monthDate(27)}T17:00:00`, bucket: 'later' },
      { id: 'premium-month-task-3', title: '今日のタスク', done: false, category: 'その他', priority: '中', scheduledDate: monthDate(24), scheduledTime: '19:00', bucket: 'now' },
    ];
    const monthPreviewPlans: DeparturePlan[] = [
      { id: 'premium-month-plan-1', title: '予定', destination: '予定の場所', date: monthDate(3), arrival: '10:00', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0, planMode: 'calendar_only' },
      { id: 'premium-month-plan-2', title: 'タスク', destination: '予定の場所', date: monthDate(8), arrival: '14:00', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0, planMode: 'calendar_only' },
      { id: 'premium-month-plan-3', title: '予定', destination: '予定の場所', date: monthDate(15), arrival: '18:00', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0, planMode: 'calendar_only' },
      { id: 'premium-month-plan-4', title: '予定', destination: '予定の場所', date: monthDate(19), arrival: '14:00', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0, planMode: 'calendar_only' },
    ];
    const monthPreviewCalendarEvents = [
      { id: 'premium-month-external-1', calendarId: 'preview-personal-calendar', title: '予定', startDate: `${monthDate(3)}T10:00:00`, endDate: `${monthDate(3)}T11:00:00`, allDay: false },
      { id: 'premium-month-external-2', calendarId: 'preview-work-calendar', title: '予定', startDate: `${monthDate(19)}T14:00:00`, endDate: `${monthDate(19)}T15:00:00`, allDay: false },
    ] as Calendar.Event[];
    const routinePreviewTasks: Task[] = [
      { id: 'premium-routine-reading', title: 'ルーティン', done: true, status: 'completed', category: 'その他', priority: '中', scheduledDate: previewDate, completedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), isRoutine: true, routineId: 'premium-routine-reading', bucket: 'now' },
      { id: 'premium-routine-stretch', title: 'ルーティン', done: true, status: 'completed', category: 'その他', priority: '中', scheduledDate: previewDate, completedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 9 * 86400000).toISOString(), isRoutine: true, routineId: 'premium-routine-stretch', bucket: 'now' },
    ];
    const routinePreviewEvents: BehaviorEvent[] = [
      ...Array.from({ length: 12 }, (_, index) => { const day = new Date(now); day.setDate(day.getDate() - 12 + index); const key = dateKey(day); return { id: `premium-routine-reading-${index}`, eventKey: `premium-routine-reading-${index}`, type: 'task_completed' as const, occurredAt: `${key}T20:00:00`, source: 'manual' as const, version: 1 as const, routineId: 'premium-routine-reading', routineTitleSnapshot: 'ルーティン', taskId: 'premium-routine-reading', taskTitleSnapshot: 'ルーティン', actualAt: `${key}T20:00:00`, taskCompletionDate: key }; }),
      ...Array.from({ length: 5 }, (_, index) => { const day = new Date(now); day.setDate(day.getDate() - 6 + index); const key = dateKey(day); return { id: `premium-routine-stretch-${index}`, eventKey: `premium-routine-stretch-${index}`, type: 'task_completed' as const, occurredAt: `${key}T07:30:00`, source: 'manual' as const, version: 1 as const, routineId: 'premium-routine-stretch', routineTitleSnapshot: 'ルーティン', taskId: 'premium-routine-stretch', taskTitleSnapshot: 'ルーティン', actualAt: `${key}T07:30:00`, taskCompletionDate: key }; }),
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
      previewSearchQuery={kind === 'history' ? 'タスク' : undefined}
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
      return readonly(<View pointerEvents="none">{renderDesignShowcasePreview()}<View style={{ marginTop: 10 }}>{renderAppearanceSettingsPreview()}</View></View>);
    }
    if (kind === 'voice') {
      return readonly(<View pointerEvents="none" style={{ padding: 18, alignItems: 'center' }}><Text style={{ color: themedColors.muted, fontSize: 12, fontWeight: '800' }}>共通音声入力</Text><View style={{ marginTop: 12, width: 70, height: 70, borderRadius: 35, backgroundColor: themedColors.violet, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: uiDesignMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF', fontSize: 28 }}>⌕</Text></View><Text style={{ color: themedColors.ink, fontSize: 14, fontWeight: '900', marginTop: 10 }}>明日の予定を追加</Text><Text style={{ color: themedColors.muted, fontSize: 11, marginTop: 4 }}>予定として整理 → 確認して保存</Text></View>, 430);
    }
    if (kind === 'nudge') return readonly(<NotificationManagerCard designMode={uiDesignMode} chicPalette={chicPalette} readOnly />, 560, 0);
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
        onFocusTaskFinished={() => undefined}
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
        bestMemory: '今日の時間を大切にできた',
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
          { id: 'premium-preview-template-1', version: 1, createdAt: '2026-01-01T00:00:00.000Z', title: '明日の準備', category: '予定', priority: '高', repeatRule: 'none', nudgeMode: 'once', navigationEnabled: true, preparationMinutes: 30, travelMinutes: 40, bufferMinutes: 15, listItems: [{ id: 'preview-template-list-1', text: '必要なものを確認', checked: false, order: 0 }] },
          { id: 'premium-preview-template-2', version: 1, createdAt: '2026-01-02T00:00:00.000Z', title: '事前チェック', category: 'その他', priority: '高', repeatRule: 'none', nudgeMode: 'once', navigationEnabled: false, listItems: [{ id: 'preview-template-list-2', text: '必要なものを確認', checked: false, order: 0 }] },
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

  // Premium/Capture Studio previews may use the real appearance selector. The
  // first-run carousel must use an inline-only preview because a React Native
  // Modal cannot be contained by the carousel viewport.
  const renderAppearanceSettingsPreview = (): React.ReactNode => renderOnboardingCaptureStep('customize');

  const renderEmbeddedAppearancePreview = (): React.ReactNode => {
    const monoColors = getThemeTokens('minimal', chicPalette.id).colors;
    const designVisual = getChicPatternVisual('floral', chicPalette);
    const photoAsset = designBackgroundAssets.botanicalBackground;
    return <View pointerEvents="none" style={{ width: '100%', padding: 12 }}>
      <Text style={{ color: monoColors.primaryText, fontSize: 13, fontWeight: '900', marginBottom: 8 }}>見た目を選ぶ</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, height: 116, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: monoColors.border, backgroundColor: monoColors.surface, padding: 10 }}>
          <Text style={{ color: monoColors.secondaryText, fontSize: 10, fontWeight: '800' }}>シンプル</Text>
          <View style={{ marginTop: 12, gap: 8 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: monoColors.primaryText, opacity: 0.78 }} />
            <View style={{ height: 8, width: '72%', borderRadius: 4, backgroundColor: monoColors.primaryAccent, opacity: 0.58 }} />
            <View style={{ height: 8, width: '52%', borderRadius: 4, backgroundColor: monoColors.border }} />
          </View>
        </View>
        <View style={{ flex: 1, height: 116, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: chicPalette.border, backgroundColor: designVisual.background }}>
          <View style={{ height: 78, overflow: 'hidden' }}><ChicPatternDecor pattern="floral" accent={designVisual.accent} warm={designVisual.warm} checkColor={chicCheckColor} preview /></View>
          <Text style={{ color: chicPalette.textPrimary, fontSize: 10, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 7 }}>デザイン</Text>
        </View>
        <View style={{ flex: 1, height: 116, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: monoColors.border, backgroundColor: monoColors.surface }}>
          <Image source={photoAsset.previewSource} resizeMode="cover" style={{ width: '100%', height: 78 }} />
          <Text style={{ color: monoColors.primaryText, fontSize: 10, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 7 }}>写真</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
        {[chicPalette.accent, '#9D8DDF', '#E7A9BC', '#8DAFD7'].map((color) => <View key={color} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color, borderWidth: 1, borderColor: monoColors.border }} />)}
        <Text style={{ color: monoColors.secondaryText, fontSize: 10, marginLeft: 2 }}>色や柄を組み合わせて選べます</Text>
      </View>
    </View>;
  };

  const renderOnboardingCaptureStep = (id: IntroCardId | 'customize'): React.ReactNode => {
    const previewDate = dateKey(now);
    const captureTasks: Task[] = [
      { id: 'capture-task-1', title: '今日のタスクを確認', done: false, category: '仕事', priority: '中', scheduledDate: previewDate, scheduledTime: '09:00', bucket: 'now' },
      { id: 'capture-task-2', title: '今日の用事', done: false, category: 'その他', priority: '低', scheduledDate: previewDate, bucket: 'later' },
      { id: 'capture-task-3', title: '予定を確認', done: true, status: 'completed', category: '予定', priority: '高', scheduledDate: previewDate, completedAt: new Date().toISOString(), bucket: 'waiting' },
    ];
    const completedCaptureTasks: Task[] = [
      { id: 'capture-completed-1', title: '今日のタスクを確認', done: true, status: 'completed', category: '仕事', priority: '中', scheduledDate: previewDate, completedAt: new Date().toISOString(), bucket: 'now' },
      { id: 'capture-completed-2', title: '完了したタスク', done: true, status: 'completed', category: 'その他', priority: '低', scheduledDate: previewDate, completedAt: new Date().toISOString(), bucket: 'later' },
      { id: 'capture-completed-3', title: '完了したタスク', done: true, status: 'completed', category: 'その他', priority: '中', scheduledDate: previewDate, completedAt: new Date().toISOString(), bucket: 'later' },
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
      { id: 'capture-schedule-1', title: '今日のタスク', destination: '予定の場所', date: previewDate, arrival: '10:00', planMode: 'calendar_only', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0 },
      { id: 'capture-schedule-2', title: '予定', destination: '予定の場所', date: previewDate, arrival: '12:00', planMode: 'calendar_only', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0 },
      { id: 'capture-schedule-3', title: '予定', destination: '予定の場所', date: previewDate, arrival: '14:00', planMode: 'calendar_only', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0 },
    ];
    if (id === 'schedule') return <View pointerEvents="none" style={{ width: '100%', padding: 12 }}><DailyScheduleTimeline date={previewDate} tasks={[]} plans={schedulePreviewPlans} externalEvents={[]} now={now} designMode={uiDesignMode} chicPalette={chicPalette} planTier="premium" onEditTask={() => undefined} onEditPlan={() => undefined} visibleStartHour={9} visibleEndHour={14} /></View>;
    if (id === 'widget' || id === 'widgetAdd' || id === 'widgetEdit') {
      const widgetColors = getThemeTokens(uiDesignMode, chicPalette.id).colors;
      return <View pointerEvents="none" style={{ width: '100%', padding: 12 }}><View style={{ gap: 8 }}><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1.3, minHeight: 92, borderRadius: 14, padding: 12, backgroundColor: widgetColors.surface, borderWidth: 1, borderColor: widgetColors.border }}><Text style={{ color: widgetColors.secondaryText, fontSize: 10, fontWeight: '800' }}>今はこれ</Text><Text numberOfLines={1} style={{ color: widgetColors.primaryText, fontSize: 15, fontWeight: '900', marginTop: 8 }}>今日のタスクを確認</Text><Text style={{ color: widgetColors.primaryAccent, fontSize: 11, marginTop: 5 }}>25 min</Text></View><View style={{ flex: 1, minHeight: 92, borderRadius: 14, padding: 12, backgroundColor: widgetColors.softAccent, borderWidth: 1, borderColor: widgetColors.border }}><Text style={{ color: widgetColors.secondaryText, fontSize: 10, fontWeight: '800' }}>音声入力</Text><Text style={{ color: widgetColors.primaryAccent, fontSize: 24, marginTop: 10 }}>◉</Text></View></View><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1, minHeight: 76, borderRadius: 14, padding: 12, backgroundColor: widgetColors.surface, borderWidth: 1, borderColor: widgetColors.border }}><Text style={{ color: widgetColors.secondaryText, fontSize: 10, fontWeight: '800' }}>次の予定</Text><Text style={{ color: widgetColors.primaryText, fontSize: 13, fontWeight: '900', marginTop: 7 }}>18:00 予定</Text></View><View style={{ flex: 1.3, minHeight: 76, borderRadius: 14, padding: 12, backgroundColor: widgetColors.surface, borderWidth: 1, borderColor: widgetColors.border }}><Text style={{ color: widgetColors.secondaryText, fontSize: 10, fontWeight: '800' }}>今日の言葉</Text><Text numberOfLines={2} style={{ color: widgetColors.primaryText, fontSize: 12, fontWeight: '900', marginTop: 6 }}>私は私のペースで進めばいい</Text></View></View></View></View>;
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
      return <View pointerEvents="none" style={{ width: '100%', padding: 14, borderRadius: 16, backgroundColor: voiceTheme.surface, borderWidth: 1, borderColor: voiceTheme.border }}><Text style={{ color: voiceTheme.secondaryText, fontSize: 11, fontWeight: '800' }}>右上のマイク</Text><View style={{ marginTop: 12, alignItems: 'center' }}><View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: voiceTheme.primaryAccent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: uiDesignMode === 'dark' ? voiceTheme.screenBackground : '#FFFFFF', fontSize: 26 }}>⌕</Text></View><Text style={{ color: voiceTheme.primaryText, fontSize: 13, fontWeight: '900', marginTop: 8 }}>話しかけてください</Text></View><View style={{ marginTop: 14, padding: 11, borderRadius: 11, borderWidth: 1, borderColor: voiceTheme.border }}><Text style={{ color: voiceTheme.primaryText, fontSize: 13, fontWeight: '800' }}>明日の予定を追加</Text><Text style={{ color: voiceTheme.secondaryText, fontSize: 10, marginTop: 4 }}>予定として整理します</Text></View></View>;
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
      monoPattern="plain"
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
      onMonoPattern={() => undefined}
      onHapticsEnabled={() => undefined}
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
      onPremium={() => undefined}
      onDeleteSavedTemplate={() => undefined}
      planTier={planTier}
      captureDesignOnly
      styles={styles}
      helpers={{ colors: themedColors, getThemeTokens: getThemedThemeTokens, getChicPatternVisual, getNightSkyPalette, hasPremiumAccess, getChicCheckColor, chicCheckColorChoices, countdownToClock, getUrgencyStatus, getNextBestAction, designModes, completionIcons, summarizePremiumTaskTemplate }}
      components={{ BThemeRibbonDecoration, CThemeRibbonDecoration, ChicPatternDecor, ChicPatternSelector, ThemeColorSelector, SettingsDisclosure, NotificationManagerCard, PremiumFeatureIcon }}
    />;
    return undefined;
  };

  const renderOnboardingEmbeddedStep = (id: IntroCardId | 'customize'): React.ReactNode => (
    id === 'customize' ? renderEmbeddedAppearancePreview() : renderOnboardingCaptureStep(id)
  );

  const renderGuideCaptureStep = (id: Exclude<OnboardingFeatureId, 'intro'>): React.ReactNode => {
    const previewDate = dateKey(now);
    const guideTasks: Task[] = [
      { id: 'guide-task-1', title: '今日のタスクを確認', done: false, category: '仕事', priority: '中', scheduledDate: previewDate, scheduledTime: '09:00', bucket: 'now' },
      { id: 'guide-task-2', title: '完了したタスク', done: true, status: 'completed', category: 'その他', priority: '中', scheduledDate: previewDate, completedAt: new Date().toISOString(), bucket: 'later' },
      { id: 'guide-task-3', title: '今日の用事', done: false, category: 'その他', priority: '低', scheduledDate: previewDate, bucket: 'waiting' },
    ];
    const guidePlan: DeparturePlan = { id: 'guide-plan', title: '予定', destination: '予定の場所', date: previewDate, arrival: '14:00', departureTime: '13:15', endAt: '15:00', travelMinutes: 30, preparationMinutes: 15, bufferMinutes: 10, planMode: 'arrival_reverse' };
    const renderTaskForm = (task?: Task) => <View pointerEvents="none" style={[styles.premiumPreview, { minHeight: 460, overflow: 'hidden' }]}><TaskModal visible task={task} templates={['今日のタスク', '今日の用事']} savedTemplates={[]} designMode={uiDesignMode} chicPalette={chicPalette} planTier="premium" onPremium={() => undefined} onClose={() => undefined} onSave={() => undefined} styles={styles} helpers={{ getThemeTokens: getThemedThemeTokens, todayInputValue, hasPremiumAccess, dateForReminder, dateKey, formatLiveTime, colors: themedColors, summarizePremiumTaskTemplate }} components={{ CompactNumberSetting }} readOnlyPreview /></View>;
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
  const tomorrowKey = todayInputValue(1);
  const todayKeyForPrep = dateKey(now);
  const hasTomorrowPrepCandidates = tasks.some((task) => {
    if (task.done || task.status === 'skipped') return false;
    const scheduled = normalizeTaskDateKey(task.scheduledDate);
    return (!scheduled || scheduled <= todayKeyForPrep) || scheduled === tomorrowKey;
  }) || departurePlans.some((item) => planDateKey(item) === tomorrowKey);
  const tomorrowPrepBlocked = focusTimerActive
    || Boolean(focusTaskCompletionPrompt)
    || Boolean(scheduleConflictPrompt)
    || addOpen
    || bulkAddOpen
    || voiceOpen
    || Boolean(editingTask)
    || planEditorOpen
    || premiumOpen
    || designCustomizeOpen
    || Boolean(designPreviewPattern)
    || designTrialNoticeOpen
    || openTodayReview
    || sharedEventOpen
    || Boolean(recoveryTargetPlanId)
    || widgetGuideVisible
    || noticeCenterOpen
    || Boolean(currentGuideFeature)
    || firstRunDemoActive
    || onboarding.introVisible;

  useEffect(() => {
    if (!hydrated || tomorrowPrepBlocked || !hasTomorrowPrepCandidates || now.getHours() < 20 || now.getTime() < tomorrowPrepDeferredUntilRef.current) return;
    if (tomorrowPrepPromptedDateRef.current === todayKeyForPrep || tomorrowPrepOpen) return;
    tomorrowPrepPromptedDateRef.current = todayKeyForPrep;
    setTomorrowPrepPromptedDate(todayKeyForPrep);
    setTomorrowPrepStep(0);
    setTomorrowPrepOpen(true);
  }, [hasTomorrowPrepCandidates, hydrated, now, tomorrowPrepBlocked, todayKeyForPrep, tomorrowPrepOpen]);

  useEffect(() => {
    if (focusTaskCompletionPrompt || scheduleConflictPrompt || tomorrowPrepOpen || noticeCenterOpen) return;
    const pending = pendingScheduleConflictRef.current;
    if (!pending) return;
    pendingScheduleConflictRef.current = undefined;
    setScheduleConflictPrompt(pending);
  }, [focusTaskCompletionPrompt, noticeCenterOpen, scheduleConflictPrompt, tomorrowPrepOpen]);
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
  // Contextual guides are intentionally one-at-a-time for regular users. They
  // appear on the real screen when that feature is first opened, and never
  // start the old multi-screen demo tour.
  const contextualGuideFeature: Exclude<OnboardingFeatureId, 'intro'> | undefined = !firstRunDemoActive && !premiumTourReady && onboarding.ready && onboarding.isCompleted('intro')
    ? screen === 'home' && !onboarding.isCompleted('todo')
      ? 'todo'
      : screen === 'timeline' && timelineInitialTab === 'focus' && !onboarding.isCompleted('focus')
        ? 'focus'
        : screen === 'analysis' && analysisInitialTab === 'routine' && !onboarding.isCompleted('routine')
          ? 'routine'
          : undefined
    : undefined;
  // The first-run tour uses an in-memory snapshot so the screens remain
  // meaningful even for a brand-new account.  It is never passed to the
  // persistence callbacks and is discarded when the tour reaches design.
  const guideDemoTasks = useMemo<Task[]>(() => {
    const demoDate = dateKey();
    return [
      { id: 'guide-demo-now', title: '今日のタスクを確認', done: false, status: 'active', category: '仕事', priority: '高', bucket: 'now', scheduledDate: demoDate },
      { id: 'guide-demo-later', title: '今日の用事', done: false, status: 'active', category: 'その他', priority: '中', bucket: 'later', scheduledDate: demoDate },
      { id: 'guide-demo-complete', title: '完了したタスク', done: true, status: 'completed', category: 'その他', priority: '低', bucket: 'now', scheduledDate: demoDate, completedAt: new Date(Date.now() - 3_600_000).toISOString() },
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
  const guideDemoPlan: DeparturePlan = { id: 'guide-demo-plan', title: '予定', destination: '予定の場所', date: dateKey(now), arrival: '18:00', travelMinutes: 30, preparationMinutes: 15, bufferMinutes: 10, planMode: 'arrival_reverse' };
  const guideDemoCalendarOptions = useMemo(() => [
    { id: 'guide-demo-personal-calendar', title: '個人', type: 'local' },
    { id: 'guide-demo-work-calendar', title: '仕事', type: 'local' },
  ] as Calendar.Calendar[], []);
  const guideDemoCalendarEvents = useMemo(() => [
    { id: 'guide-demo-calendar-hospital', calendarId: 'guide-demo-personal-calendar', title: '予定', startDate: `${dateKey(now)}T10:00:00`, endDate: `${dateKey(now)}T11:00:00`, allDay: false },
    { id: 'guide-demo-calendar-meeting', calendarId: 'guide-demo-work-calendar', title: '予定', startDate: `${dateKey(now)}T14:00:00`, endDate: `${dateKey(now)}T15:00:00`, allDay: false },
    { id: 'guide-demo-calendar-hair', calendarId: 'guide-demo-personal-calendar', title: '予定', startDate: `${dateKey(now)}T18:00:00`, endDate: `${dateKey(now)}T19:00:00`, allDay: false },
  ] as Calendar.Event[], [now]);
  const guideDemoWishState: MonthlyWishState = {
    monthlyGoal: '毎日少しでも自分の時間をつくる',
    wishes: [{ id: 'guide-demo-wish', title: '自分の時間をつくる', completed: false, createdAt: now.toISOString() }],
    actions: [{ id: 'guide-demo-action', wishId: 'guide-demo-wish', title: '少し時間をとる', completed: false }],
    review: {},
  };
  const guideDemoAffirmations: Affirmation[] = [{ id: 'guide-demo-affirmation', text: '私は自分のペースで続けられる', time: '09:00', enabled: true, createdAt: now.toISOString() }];
  const productionGuideFeature = pendingGuideFeature ?? currentGuideFeature;

  React.useEffect(() => {
    if (!__DEV__) return;
    console.log('[FirstRunDiagnostic]', {
      ready: onboarding.ready,
      introVisible: onboarding.introVisible,
      introCompleted: onboarding.isCompleted('intro'),
      firstRunStage: onboarding.state.firstRunStage,
      onboardingDesignSelectionPending,
      currentScreen: screen,
      designSheetRequested: onboardingDesignSelectionPending && screen === 'settings',
      event: 'state',
    });
  }, [onboarding.introVisible, onboarding.ready, onboarding.state.completed.intro, onboarding.state.firstRunStage, onboardingDesignSelectionPending, screen]);

  // Resume an interrupted first-run experience at the design step after a
  // restart.  The persisted stage is optional, so older users are untouched.
  React.useEffect(() => {
    // The design handoff is valid only after the intro was completed. This
    // keeps a stale/legacy stage from opening the Design sheet for a new user
    // before the five-page introduction (or after an early skip).
    if (!onboarding.ready || onboarding.introVisible || !onboarding.isCompleted('intro')) return;
    if (onboarding.state.firstRunStage === 'design' && !onboardingDesignSelectionPending && !completingInitialDesignSelectionRef.current) {
      if (__DEV__) {
        console.log('[FirstRunDiagnostic]', {
          ready: onboarding.ready,
          introVisible: onboarding.introVisible,
          introCompleted: onboarding.isCompleted('intro'),
          firstRunStage: onboarding.state.firstRunStage,
          onboardingDesignSelectionPending: true,
          currentScreen: screen,
          designSheetRequested: true,
          event: 'design-sheet-requested',
        });
      }
      setOnboardingDesignSelectionPending(true);
      setCurrentGuideFeature(undefined);
      setPendingGuideFeature(undefined);
      setScreen('settings');
    }
  }, [onboarding.introVisible, onboarding.ready, onboarding.state.completed.intro, onboarding.state.firstRunStage, onboardingDesignSelectionPending, screen]);

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
      // Contextual guides complete in place. Only the legacy first-run or
      // Premium tour may advance to another destination.
      if (!firstRunDemoActive && !premiumTourReady) {
        setCurrentGuideFeature(undefined);
        releaseGuideTransition();
        return;
      }
      const next = activeGuideTour.find((item) => !completedState.completed[item]);
      if (!next) {
        setCurrentGuideFeature(undefined);
        releaseGuideTransition();
        if (onboarding.state.firstRunStage === 'demo' && onboarding.isCompleted('intro') && !onboarding.introVisible) {
          await onboarding.setFirstRunStage('done');
          if (__DEV__) console.log('[FirstRunDiagnostic]', { event: 'legacy-demo-complete', source: 'advanceGuide', ready: onboarding.ready, introVisible: onboarding.introVisible, introCompleted: onboarding.isCompleted('intro'), firstRunStage: onboarding.state.firstRunStage, onboardingDesignSelectionPending: false, screen, designSheetRequested: false });
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
  }, [activeGuideTour, firstRunDemoActive, guideTransitioning, navigateToGuideFeature, onboarding, pendingGuideFeature, planTier, premiumTourReady, releaseGuideTransition]);

  React.useEffect(() => {
    if (!onboarding.ready || onboarding.introVisible || onboardingDesignSelectionPending || guideTransitioning || pendingGuideFeature) return;
    if (!currentGuideFeature) {
      const nextGuide = firstIncompleteGuide ?? contextualGuideFeature;
      if (nextGuide) {
        setCurrentGuideFeature(nextGuide);
        navigateToGuideFeature(nextGuide);
      }
      return;
    }
    if (!activeGuideTour.includes(currentGuideFeature) || onboarding.isCompleted(currentGuideFeature)) {
      void advanceGuide(currentGuideFeature);
    }
  }, [activeGuideTour, advanceGuide, contextualGuideFeature, currentGuideFeature, firstIncompleteGuide, guideTransitioning, navigateToGuideFeature, onboarding, onboardingDesignSelectionPending, pendingGuideFeature]);

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
        if (onboarding.state.firstRunStage === 'demo' && onboarding.isCompleted('intro') && !onboarding.introVisible) {
          void onboarding.setFirstRunStage('done');
          if (__DEV__) console.log('[FirstRunDiagnostic]', { event: 'legacy-demo-complete', source: 'exitGuideTour', ready: onboarding.ready, introVisible: onboarding.introVisible, introCompleted: onboarding.isCompleted('intro'), firstRunStage: onboarding.state.firstRunStage, onboardingDesignSelectionPending: false, screen, designSheetRequested: false });
        }
      }
    })();
  }, [onboarding, planTier, releaseGuideTransition]);
  const guideTargetLabels: Partial<Record<Exclude<OnboardingFeatureId, 'intro'>, string>> = {
    todo: '＋追加', taskDetails: '詳しく設定', taskBuckets: '一覧', todoComplete: '完了チェック', completedTasks: '達成グラフ',
    schedule: 'スケジュール', planRegistration: '予定を登録', focus: '集中', calendarImport: 'カレンダー', analysis: '分析', routine: 'ルーティン', history: '履歴', voice: '右上のマイク',
    wish: '叶えたいこと', affirmation: 'アファメーション', photoLog: '今日の記録', recovery: '立て直し',
  };
  const productionGuideCard = productionGuideFeature && !guideTransitioning ? <OnboardingHint key={productionGuideFeature} inline featureId={productionGuideFeature} designMode={uiDesignMode} chicPalette={chicPalette} targetLabel={guideTargetLabels[productionGuideFeature]} onAction={productionGuideAction} onDismiss={() => completeTourGuide(productionGuideFeature)} onNext={() => completeTourGuide(productionGuideFeature)} onExitTour={firstRunDemoActive || premiumTourReady ? exitGuideTour : undefined} /> : null;
  const productionGuideOverlay = productionGuideFeature && !guideTransitioning && !planEditorOpen && !openTodayReview && !addOpen && !editingTask && !recoveryTargetPlanId && productionGuideFeature !== 'recovery' ? (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: 78, zIndex: 40 }}>{productionGuideCard}</View>
  ) : null;
  const premiumGuideRecoveryPlan: DeparturePlan = {
    id: 'premium-guide-recovery',
    title: '予定',
    destination: '予定の場所',
    date: dateKey(now),
    arrival: '18:00',
    travelMinutes: 30,
    preparationMinutes: 15,
    bufferMinutes: 10,
    planMode: 'arrival_reverse',
  };
  const premiumRecoveryGuideVisible = planTier === 'premium' && productionGuideFeature === 'recovery' && !recoveryTargetPlanId;
  const backgroundVeilVisible = (screen === 'home' || screen === 'timeline' || screen === 'wish')
    && ((designMode === 'chic' && effectiveChicPattern !== 'plain' && !isImageDesignPattern(effectiveChicPattern)) || (designMode === 'photo' && photoThemeEnabled));
  const backgroundVeilOpacity = designMode === 'photo' ? 0.28 : (effectiveChicPattern === 'floral' || effectiveChicPattern === 'floralSoft' || effectiveChicPattern === 'floralSeasonal' || effectiveChicPattern === 'floralDark' ? 0.18 : 0.12);
  const backgroundVeilColor = designMode === 'photo' ? theme.colors.screenBackground : chicPalette.background;
  const imageDesignBackground = designMode === 'chic' && isImageDesignPattern(effectiveChicPattern) ? designBackgroundAssets[effectiveChicPattern] : undefined;
  const imageDesignBackgroundSize = imageDesignBackground ? {
    width: screenWidth,
    height: screenWidth * (imageDesignBackground.height / imageDesignBackground.width),
  } : undefined;
  const headerChicPalette = designMode === 'chic' && effectiveChicPattern === 'nightSky'
    ? { ...chicPalette, textPrimary: '#F4F7FC', textSecondary: '#D6DEEA' }
    : chicPalette;
  const focusPromptTask = focusTaskCompletionPrompt?.taskId ? tasks.find((task) => task.id === focusTaskCompletionPrompt.taskId) : undefined;
  const prepTodayTasks = tasks.filter((task) => {
    const scheduled = normalizeTaskDateKey(task.scheduledDate);
    return !task.done && task.status !== 'skipped' && (!scheduled || scheduled <= todayKeyForPrep);
  });
  const prepTomorrowTasks = tasks.filter((task) => normalizeTaskDateKey(task.scheduledDate) === tomorrowKey && !task.done && task.status !== 'skipped');
  const prepTomorrowPlans = departurePlans.filter((item) => planDateKey(item) === tomorrowKey);
  const visibleAppNotices = useMemo(() => INITIAL_APP_NOTICES
    .filter((notice) => {
      const publishedAt = Date.parse(notice.publishedAt);
      return Number.isFinite(publishedAt) && publishedAt <= now.getTime();
    })
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt)), [now]);
  const unreadNoticeCount = visibleAppNotices.reduce((count, notice) => count + (readNoticeIds.includes(notice.id) ? 0 : 1), 0);
  const markNoticeRead = React.useCallback((noticeId: string) => {
    setReadNoticeIds((current) => current.includes(noticeId) ? current : [...current, noticeId]);
  }, []);
  const openNoticeTarget = React.useCallback((notice: AppNotice) => {
    if (!notice.targetScreen) return;
    const params = notice.targetParams && typeof notice.targetParams === 'object' && !Array.isArray(notice.targetParams)
      ? notice.targetParams as Record<string, unknown>
      : {};
    if (notice.targetScreen === 'home' && params.homeTab === 'routine') setHomeInitialTab('routine');
    if (notice.targetScreen === 'timeline' && params.timelineTab === 'focus') setTimelineInitialTab('focus');
    setNoticeCenterOpen(false);
    navigateWithinAppRef.current(notice.targetScreen);
  }, []);
  const modalPalette: ModalPalette = {
    screenBackground: theme.colors.screenBackground,
    surface: theme.colors.surface,
    secondarySurface: theme.colors.secondarySurface,
    border: theme.colors.border,
    primaryText: theme.colors.primaryText,
    secondaryText: theme.colors.secondaryText,
    primaryAccent: theme.colors.primaryAccent,
    accentSoft: theme.colors.softAccent,
    warning: theme.colors.warning,
    onAccent: uiDesignMode === 'chic' && chicPalette ? chicPalette.onAccent : uiDesignMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF',
    modalRadius: theme.radius.modal,
    buttonRadius: theme.radius.button,
    shadow: theme.shadow,
  };
  const resolveFocusPrompt = (action: 'complete' | 'continue' | 'later') => {
    const target = focusPromptTask;
    tomorrowPrepDeferredUntilRef.current = Date.now() + 10 * 60_000;
    setFocusTaskCompletionPrompt(undefined);
    if (!target) return;
    if (action === 'complete') completeTaskIds([target.id], 'manual');
    if (action === 'continue') { setTimelineInitialTab('focus'); setScreen('timeline'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: imageDesignBackground?.background ?? (uiDesignMode === 'chic' ? getChicPatternVisual(effectiveChicPattern, chicPalette).background : theme.colors.screenBackground) }}>
      {imageDesignBackground && imageDesignBackgroundSize && <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { overflow: 'hidden', backgroundColor: imageDesignBackground.background }]}><Image source={imageDesignBackground.source} style={[imageDesignBackgroundSize, { position: 'absolute', top: 0, alignSelf: 'center' }]} /></View>}
      <SafeAreaView style={[styles.safe, uiDesignMode === 'minimal' && styles.safeMinimal, uiDesignMode === 'dark' && styles.safeDark, designMode === 'photo' && styles.safePhoto, !hydrated && { opacity: 0 }, { backgroundColor: 'transparent' }]}>
      <StatusBar style={uiDesignMode === 'dark' || (designMode === 'chic' && effectiveChicPattern === 'nightSky') ? 'light' : 'dark'} />
      {isMonoDesign && effectiveMonoPattern === 'looseLeaf' && <MonoLooseLeafBackground dark={uiDesignMode === 'dark'} />}
      {isMonoDesign && effectiveMonoPattern === 'chic' && <MonoChicBackground dark={uiDesignMode === 'dark'} />}
      {photoBackgroundUri && <View pointerEvents="none" style={styles.photoThemeBackgroundWrap}><Image source={{ uri: photoBackgroundUri }} resizeMode="cover" style={styles.photoThemeBackground} /></View>}
      <View style={styles.app} pointerEvents={hydrated ? 'auto' : 'none'}>
        <BThemeRibbonPreload />
        <CThemeRibbonPreload />
        {uiDesignMode === 'chic' && !photoThemeEnabled && !isImageDesignPattern(effectiveChicPattern) && <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><ChicPatternDecor pattern={effectiveChicPattern} accent={chicPalette.accent} warm={chicPalette.accentSoft} checkColor={chicCheckColor} /></View>}
        {backgroundVeilVisible && <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: backgroundVeilColor, opacity: backgroundVeilOpacity }]} />}
        {photoTopImageUri && screen !== 'wish' ? <><Header designMode={uiDesignMode} now={now} compact chicPalette={headerChicPalette} onVoice={handleHeaderVoice} onPremium={planTier === 'premium' ? undefined : () => openPremiumFeature('voice')} onNotifications={screen === 'settings' ? () => setNoticeCenterOpen(true) : undefined} hasUnreadNotifications={screen === 'settings' && unreadNoticeCount > 0} /><View style={styles.photoThemeTopImage}><Image source={{ uri: photoTopImageUri }} resizeMode="contain" style={styles.photoThemeTopImageContent} /></View></> : <Header designMode={uiDesignMode} now={now} chicPalette={headerChicPalette} onVoice={handleHeaderVoice} onPremium={planTier === 'premium' ? undefined : () => openPremiumFeature('voice')} onNotifications={screen === 'settings' ? () => setNoticeCenterOpen(true) : undefined} hasUnreadNotifications={screen === 'settings' && unreadNoticeCount > 0} />}
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
              initialTab={firstRunDemoActive ? 'now' : productionGuideFeature === 'taskBuckets' ? 'list' : homeInitialTab}
              onOpenSchedule={() => {
                setTimelineInitialTab('departure');
                navigateWithinApp('timeline');
              }}
              canShowArrivalReverseCountdown={hasPremiumAccess(planTier, 'late_recovery')}
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
              onRestore={(taskId) => {
                if (firstRunDemoActive) {
                  updateGuideDemoTasks((current) => current.map((task) => task.id === taskId ? { ...task, done: false, status: 'active', completedAt: undefined, subtasks: task.subtasks?.map((item) => ({ ...item, done: false })) } : task));
                  return;
                }
                restoreTaskById(taskId);
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
              onRemoveRoutine={firstRunDemoActive ? undefined : removeRoutineById}
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
                  updateGuideDemoTasks((current) => [{ ...task, id: duplicateId, createdAt: new Date().toISOString(), title: `${task.title}（コピー）`, done: false, status: 'active', completedAt: undefined }, ...current]);
                  return;
                }
                // 通知は複製せず、複製後にユーザーが改めて設定する。
                // 過去のルーティンIDも引き継がない独立したタスクにする。
                 const duplicateId = `${Date.now()}-${Math.random().toString(16).slice(2)}-copy`;
                 const duplicate = { ...task, id: duplicateId, createdAt: new Date().toISOString(), title: `${task.title}（コピー）`, done: false, status: 'active' as const, skippedAt: undefined, completedAt: undefined, isRoutine: false, routineId: undefined, routineEndedAt: undefined, remindDate: undefined, remindAt: undefined, deadlineNotifyBefore: undefined, nudgeMode: 'once' as NudgeMode, subtasks: task.subtasks?.map((item, index) => ({ ...item, id: `${duplicateId}-subtask-${index}-${Math.random().toString(16).slice(2)}`, done: false, order: index })), listItems: task.listItems?.map((item, index) => ({ ...item, id: `${duplicateId}-list-${index}-${Math.random().toString(16).slice(2)}`, checked: false, order: index })) };
                tasksRef.current = [duplicate, ...tasksRef.current];
                setTasks(tasksRef.current);
                void syncScheduleSwitchNotificationsForTask(duplicate.id);
              }}
              onSaveTemplate={(task) => {
                if (!firstRunDemoActive) saveTaskAsTemplate(task);
              }}
                departurePlans={firstRunDemoActive ? [guideDemoPlan] : departurePlans}
              onPostpone={(id, targetDate) => {
                if (firstRunDemoActive) {
                  updateGuideDemoTasks((current) => current.map((task) => task.id === id ? { ...task, scheduledDate: targetDate ?? todayInputValue(1), bucket: 'later' } : task));
                  return;
                }
                const task = tasksRef.current.find((item) => item.id === id);
                if (!task) return;
                const target = targetDate ?? todayInputValue(1);
                const oldScheduledDate = task.scheduledDate;
                const shouldMoveDeadline = Boolean(oldScheduledDate && task.deadlineDate === oldScheduledDate);
                const updated = {
                  ...task,
                  scheduledDate: target,
                  remindDate: task.remindAt ? target : task.remindDate,
                  ...(shouldMoveDeadline ? { deadlineDate: target } : {}),
                  bucket: 'later' as TaskBucket,
                };
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
              canCreateWishAction={hasPremiumAccess(planTier, 'wish_planning') || canCreateWishAction(rewardedAccess)}
              wishActionRewardProgress={{ current: rewardedAccess.wishActionCreateProgress, required: 2 }}
              onRequestWishActionReward={firstRunDemoActive ? undefined : requestWishActionReward}
              onWishActionCreated={firstRunDemoActive ? undefined : consumeWishActionReward}
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
              canUseMonoPaidPattern={hasMonoPatternAccess(monoPattern)}
              designPreviewPhotoUri={designPreviewPhotoUri}
              designPreviewMonoPattern={designPreviewMonoPattern}
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
              onFocusTaskFinished={firstRunDemoActive ? () => undefined : handleFocusTaskFinished}
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
              onFocusActivityChange={setFocusActivity}
              focusPersistedState={firstRunDemoActive ? undefined : focusState}
              onFocusStateChange={firstRunDemoActive ? () => undefined : setFocusState}
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
               monoPattern={monoPattern}
               hapticsEnabled={hapticsEnabled}
               premiumTrialReminderEnabled={premiumTrialReminderEnabled}
               onPremiumTrialReminderEnabled={premiumTrialReminderAvailable ? setPremiumTrialReminderEnabled : undefined}
               liveActivityEnabled={liveActivityEnabled}
               onLiveActivityEnabled={handleLiveActivityEnabled}
               liveActivityRuntimeStatus={liveActivityRuntimeStatus}
               liveActivityDisplayOptions={liveActivityDisplayOptions}
               onLiveActivityDisplayOptionsChange={setLiveActivityDisplayOptions}
               liveActivityCustomization={liveActivityCustomization}
               onLiveActivityCustomizationChange={setLiveActivityCustomization}
               chicPattern={effectiveChicPattern}
               chicCheckColor={chicCheckColor}
               chicPalette={chicPalette}
               affirmations={affirmations}
               affirmationCustomTexts={affirmationCustomTexts}
              photoTheme={photoTheme}
              travelApps={travelApps}
              widgetSettings={widgetSettings}
              onPickWidgetPhoto={pickWidgetPhoto}
              onUnlockWidgetPhoto={requestWidgetPhotoUnlock}
              widgetPhotoUnlock={rewardedAccess.widgetPhotoCustomization}
              entitlementsResolved={!storeKit.configured || storeKit.entitlementsResolved}
              onRemoveAffirmationPhoto={(index) => setWidgetSettings((current) => {
                const photos = current.affirmationPhotoUris ?? [];
                const removeIndex = index ?? photos.length - 1;
                return { ...current, affirmationPhotoUris: photos.filter((_, photoIndex) => photoIndex !== removeIndex) };
              })}
              onWidgetGuide={openWidgetGuide}
              onRefreshWidget={refreshWidgetFromSettings}
              onWidgetSectionOpened={openWidgetSection}
              planTier={planTier}
              widgetPlanTier={widgetPlanTier}
              widgetDesignCustomizePurchased={widgetDesignCustomizePurchased}
              widgetEntitlementOverride={__DEV__ ? widgetEntitlementOverride : 'actual'}
              onWidgetEntitlementOverrideChange={__DEV__ ? setWidgetEntitlementOverride : undefined}
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
               onMonoPattern={(pattern) => {
                 if (!hasMonoPatternAccess(pattern)) {
                   setDesignPreviewMode(resolvedMonoMode);
                   setDesignPreviewMonoPattern(pattern);
                   return;
                 }
                 setMonoPattern(pattern);
                 if (!onboardingDesignSelectionPending) void onboarding.complete('design');
                 completeInitialDesignSelection();
               }}
               onMonoPreview={(pattern) => {
                 setDesignPreviewMode(resolvedMonoMode);
                 setDesignPreviewMonoPattern(pattern);
               }}
               onHapticsEnabled={handleHapticsEnabled}
               onChicPattern={(pattern) => {
                 // Selecting a design is preview-only. Entitlement, Trial, and
                 // Rewarded checks happen exclusively when the user confirms
                 // with "このデザインを使う" in the try-on screen.
                 setDesignPreviewMode('chic');
                 setDesignPreviewPattern(pattern);
              }}
               onDesignPreview={(pattern) => {
                 // A locked Design is only a try-on candidate until the user
                 // confirms it in the full-screen preview.
                 setDesignPreviewMode('chic');
                 setDesignPreviewPattern(pattern);
               }}
                fullscreenPreview={(onBack, sheetVisible, closeSheetThen) => <DesignTryOnModal
                  visible={sheetVisible}
                  initialMode={designPreviewPhotoUri ? 'photo' : designMode === 'photo' ? 'photo' : isMonoDesign ? resolvedMonoMode : designMode}
                  initialPattern={designPreviewPattern ?? effectiveChicPattern}
                  initialColor={chicCheckColor}
                  initialMonoAppearance={monoAppearance}
                  initialMonoPattern={designPreviewMonoPattern ?? effectiveMonoPattern}
                  photoUri={designPreviewPhotoUri ?? photoTheme.imageUri}
                  topImageUris={{
                    home: photoTheme.topImageUris?.home ?? photoTheme.topImageOriginalUris?.home,
                    timeline: photoTheme.topImageUris?.timeline ?? photoTheme.topImageOriginalUris?.timeline,
                    analysis: photoTheme.topImageUris?.analysis ?? photoTheme.topImageOriginalUris?.analysis,
                    wish: photoTheme.topImageUris?.wish ?? photoTheme.topImageOriginalUris?.wish,
                    settings: photoTheme.topImageUris?.settings ?? photoTheme.topImageOriginalUris?.settings,
                  }}
                  focusBackgroundUri={photoTheme.focusBackgroundUri}
                  wishState={guideDemoWishState}
                  wishMonths={{ [currentWishMonthKey]: guideDemoWishState }}
                  previewComponents={{ TimeTabButton, FocusMode, TaskScheduleCalendar, DailyScheduleTimeline, RecoveryModal }}
                  previewHelpers={{ getThemeTokens: getThemedThemeTokens, dateKey, planDateKey, hasPremiumAccess, formatLiveDate, formatLiveTime, getDepartureMoments, normalizePlanDate, countdownToDate, dateForReminder, getMapSearchTarget, openMapSearch: async () => undefined, getPlanCountdownAt, colors: themedColors }}
                  systemColorScheme={systemColorScheme}
                  onClose={() => { setDesignPreviewMonoPattern(undefined); onBack(); }}
                  onApply={(selection) => closeSheetThen(() => applyDesignTryOn(selection))}
                />}
               onChicCheckColor={(color) => { setChicCheckColor(color); if (!onboardingDesignSelectionPending) void onboarding.complete('design'); completeInitialDesignSelection(); }}
               onSaveAffirmation={saveAffirmation}
               onDeleteAffirmation={deleteAffirmation}
               onSaveAffirmationCustomText={saveAffirmationCustomText}
               onDeleteAffirmationCustomText={deleteAffirmationCustomText}
               topImageCropResumeToken={topImageCropResumeToken}
               canOpenTopImagePicker={canOpenTopImagePicker}
               onPickPhotoTheme={(target) => void pickPhotoTheme(target)}
               onPickPhotoPreview={() => pickPhotoForDesignPreview(true)}
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
              onPremium={openPremiumFeature}
               onDeleteSavedTemplate={deleteSavedTaskTemplate}
               onOpenCaptureStudio={__DEV__ ? () => setCaptureStudioOpen(true) : undefined}
               designCustomizePurchased={hasDesignCustomizeAccess}
               designAccessStatus={designAccessStatus}
               canUseMonoPaidPattern={planTier === 'premium' || hasDesignCustomizeAccess || isPremiumDesignUnlocked(rewardedAccess, now) || isPremiumDesignTrialActive(rewardedAccess, now)}
               canUsePaidDesign={planTier === 'premium' || hasDesignCustomizeAccess || isPremiumDesignUnlocked(rewardedAccess, now) || isPremiumDesignTrialActive(rewardedAccess, now)}
               onResetWidgetPhotoUnlock={__DEV__ ? resetWidgetPhotoUnlockForDevelopment : undefined}
              designCustomizePrice={storeKit.designProduct?.displayPrice}
              designCustomizePriceStatus={storeKit.status}
               onOpenDesignCustomize={() => setDesignCustomizeOpen(true)}
               onOpenDesignAccess={openDesignAccess}
               initialAppearanceOpen={onboardingDesignSelectionPending && onboarding.ready && !onboarding.introVisible}
               onboardingDesignSelectionPending={onboardingDesignSelectionPending}
               currentScreen={screen}
                          styles={styles}
              helpers={{ colors: themedColors, getThemeTokens: getThemedThemeTokens, getChicPatternVisual, getNightSkyPalette, hasPremiumAccess, getChicCheckColor, chicCheckColorChoices, countdownToClock, getUrgencyStatus, getNextBestAction, designModes, completionIcons, summarizePremiumTaskTemplate }}
              components={{ BThemeRibbonDecoration, CThemeRibbonDecoration, ChicPatternDecor, ChicPatternSelector, ThemeColorSelector, SettingsDisclosure, NotificationManagerCard, PremiumFeatureIcon }}
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
                const duplicate = tasksRef.current.some((task) => task.isRoutine && (archive.routineId ? task.routineId === archive.routineId : task.title.trim() === archive.title.trim()));
                if (duplicate) {
                  Alert.alert('同じルーティンがすでにあります', '使用中のルーティンを重複して再開することはできません。');
                  return;
                }
                const template = archive.taskTemplate;
                if (!template) {
                  Alert.alert('ルーティンを再開できません', '引き継げる設定が見つかりません。');
                  return;
                }
                const resumedScheduledDate = routineResumeScheduledDate(template, now);
                const resumedRemindDate = normalizeRoutineResumeDate(template.remindDate, template.scheduledDate, resumedScheduledDate);
                const resumedDeadlineDate = normalizeRoutineResumeDate(template.deadlineDate, template.scheduledDate, resumedScheduledDate);
                const resetSubtasks = (template.subtasks ?? []).map((item, index) => ({ ...item, order: index, done: false }));
                const resetListItems = (template.listItems ?? []).map((item, index) => ({ ...item, order: index, checked: false }));
                addTask(template.title, template.category, template.priority, resumedRemindDate, template.remindAt, resumedDeadlineDate, template.deadlineTime, template.deadlineNotifyBefore, template.navigationEnabled, template.preparationMinutes, template.travelMinutes, template.bufferMinutes, template.repeatRule ?? 'none', template.nudgeMode ?? 'once', resumedScheduledDate, template.scheduledTime, template.endAt, true, resetSubtasks, resetListItems, archive.routineId);
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
                    await cancelScheduleSwitchNotificationsForPlan(updatedPlan.id!);
                    if (getDeparturePlanMode(updatedPlan) !== 'calendar_only') await scheduleDeparture(updatedPlan);
                    await syncScheduleSwitchNotificationsForPlan(updatedPlan.id!);
                  })().catch((error) => {
                    if (__DEV__) console.warn('[Notifications] suggestion reschedule failed', error);
                  });
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
                next.filter((task) => (task.routineId ?? task.id) === routineId).forEach((task) => { void cancelScheduleSwitchNotificationsForTask(task.id); });
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
        visible={!rewardedPromptClosing}
        title={rewardedPrompt.title}
        description={rewardedPrompt.description}
        current={getRewardedPromptProgress(rewardedPrompt.featureId).current}
        required={getRewardedPromptProgress(rewardedPrompt.featureId).required}
        designMode={uiDesignMode}
        chicPalette={chicPalette}
        onReward={handleRewardedPromptReward}
        rewardButtonLabel={rewardedPrompt.featureId === 'widgetPhoto' ? '広告を見て7日間使う' : rewardedPrompt.featureId === 'premiumDesign' || rewardedPrompt.featureId === 'premiumDesignTrialExpired' ? '広告を見て12時間使う' : rewardedPrompt.featureId === 'photoTop' ? '広告を見て写真枠を追加' : rewardedPrompt.featureId === 'photoBackground' ? '広告を見て背景写真を使う' : rewardedPrompt.featureId === 'photoFocus' ? '広告を見て集中背景を使う' : undefined}
        onClose={() => {
          if (rewardedPrompt.featureId === 'photoTop') {
            if (rewardedPromptClosing) return;
            const continuation = rewardedPromptCompletionRef.current;
            const completed = topImageRewardCompletedRef.current;
            rewardedPromptCompletionRef.current = undefined;
            topImageRewardCompletedRef.current = false;
            topImageRewardDismissActionRef.current = completed && continuation
              ? continuation
              : () => setTopImageCropResumeToken((current) => current + 1);
            setRewardedPromptClosing(true);
            if (Platform.OS !== 'ios') InteractionManager.runAfterInteractions(finishTopImageRewardPrompt);
            return;
          }
          rewardedPromptCompletionRef.current = undefined;
          setRewardedPrompt(null);
        }}
        onDismiss={() => {
          if (rewardedPrompt.featureId === 'photoTop' && rewardedPromptClosing) finishTopImageRewardPrompt();
        }}
        onPremium={() => {
          const designFeature = rewardedPrompt.featureId === 'photoBackground' || rewardedPrompt.featureId === 'photoFocus' || rewardedPrompt.featureId === 'photoTop' || rewardedPrompt.featureId === 'premiumDesign' || rewardedPrompt.featureId === 'premiumDesignTrialExpired' || rewardedPrompt.featureId === 'widgetPhoto';
          if (rewardedPrompt.featureId === 'photoTop') {
            topImageAccessPurchaseResumeRef.current = true;
            topImageRewardCompletedRef.current = false;
            rewardedPromptCompletionRef.current = undefined;
            topImageRewardDismissActionRef.current = () => setDesignCustomizeOpen(true);
            setRewardedPromptClosing(true);
            if (Platform.OS !== 'ios') InteractionManager.runAfterInteractions(finishTopImageRewardPrompt);
            return;
          }
          setRewardedPrompt(null);
          if (designFeature) setDesignCustomizeOpen(true);
          else openPremiumFeature();
        }}
        premiumLabel={rewardedPrompt.featureId === 'photoBackground' || rewardedPrompt.featureId === 'photoFocus' || rewardedPrompt.featureId === 'photoTop' || rewardedPrompt.featureId === 'premiumDesign' || rewardedPrompt.featureId === 'premiumDesignTrialExpired' || rewardedPrompt.featureId === 'widgetPhoto' ? 'デザインカスタマイズを購入' : undefined}
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

      <AppNoticeCenter
        visible={noticeCenterOpen}
        notices={visibleAppNotices}
        readNoticeIds={readNoticeIds}
        palette={modalPalette}
        onRead={markNoticeRead}
        onNavigate={openNoticeTarget}
        onClose={() => setNoticeCenterOpen(false)}
      />

      <TomorrowPrepModal
        visible={tomorrowPrepOpen}
        step={tomorrowPrepStep}
        todayTasks={prepTodayTasks}
        tomorrowTasks={prepTomorrowTasks}
        tomorrowPlans={prepTomorrowPlans}
        palette={modalPalette}
        onStepChange={setTomorrowPrepStep}
        onMoveTomorrow={moveTaskToTomorrow}
        onLater={moveTaskToLater}
        onCompleteTask={(taskId) => completeTaskIds([taskId], 'manual')}
        onEditTask={(task) => { setTomorrowPrepOpen(false); setEditingTask(task); }}
        onEditPlan={(target) => { setTomorrowPrepOpen(false); setScreen('timeline'); openPlanEditor(target); }}
        onClose={() => setTomorrowPrepOpen(false)}
      />

      {scheduleConflictPrompt && <Modal visible transparent animationType="fade" onRequestClose={() => setScheduleConflictPrompt(undefined)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setScheduleConflictPrompt(undefined)}>
          <Pressable style={[styles.modalSheet, popupSheetStyle(modalPalette)]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: modalPalette.primaryText }]}>予定に少し近いかも</Text>
            <Text style={{ color: modalPalette.warning, fontSize: 12, fontWeight: '800', marginBottom: 4 }}>⚠ 時間の余裕を確認してください</Text>
            <Text style={[styles.emptyCopy, { color: modalPalette.secondaryText }]}>{scheduleConflictPrompt.kind === 'preparation' ? `「${scheduleConflictPrompt.plan.title}」の準備は${formatLiveTime(scheduleConflictPrompt.effectiveAt)}頃から。` : scheduleConflictPrompt.kind === 'departure' ? `「${scheduleConflictPrompt.plan.title}」は${formatLiveTime(scheduleConflictPrompt.effectiveAt)}頃に出発です。` : `「${scheduleConflictPrompt.plan.title}」の予定と時間が重なっています。`}</Text>
            <Text style={[styles.emptyCopy, { color: modalPalette.secondaryText }]}>{`「${scheduleConflictPrompt.task.title}」は${formatLiveTime(scheduleConflictPrompt.taskStart)}〜${formatLiveTime(scheduleConflictPrompt.taskEnd)}です。このままだと時間が足りないかも。`}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}><Pressable style={[styles.primaryButton, { backgroundColor: modalPalette.primaryAccent, borderRadius: modalPalette.buttonRadius }]} onPress={() => { const target = scheduleConflictPrompt.task; tomorrowPrepDeferredUntilRef.current = Date.now() + 10 * 60_000; setScheduleConflictPrompt(undefined); setEditingTask(target); }}><Text style={[styles.primaryButtonText, { color: modalPalette.onAccent }]}>時間を調整</Text></Pressable><Pressable style={{ minHeight: 46, flex: 1, borderRadius: modalPalette.buttonRadius, borderWidth: 1, borderColor: modalPalette.border, backgroundColor: modalPalette.secondarySurface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 }} onPress={() => { tomorrowPrepDeferredUntilRef.current = Date.now() + 10 * 60_000; setScheduleConflictPrompt(undefined); }}><Text style={{ color: modalPalette.primaryText, fontSize: 13, fontWeight: '900' }}>このまま</Text></Pressable></View>
          </Pressable>
        </Pressable>
      </Modal>}

      <FocusTaskCompletionModal
        session={focusTaskCompletionPrompt}
        task={focusPromptTask}
        palette={modalPalette}
        onComplete={() => resolveFocusPrompt('complete')}
        onContinue={() => resolveFocusPrompt('continue')}
        onLater={() => resolveFocusPrompt('later')}
      />

      <SharedEventScreen
        visible={sharedEventOpen && hasPremiumAccess(planTier, 'late_recovery')}
        shareToken={sharedEventToken}
        designMode={uiDesignMode}
        chicPalette={chicPalette}
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
      <PremiumModal visible={premiumOpen} initialFeatureId={premiumTargetFeature} designMode={uiDesignMode} chicPalette={chicPalette} planTier={planTier} isDevelopment={__DEV__} onMockPlanTier={handleMockPlanTier} onClose={() => { logPremiumDiagnostic('PREMIUM_MODAL_DISMISSED', { plan: planTier, purchaseStatus: purchaseDiagnosticPendingRef.current ? 'processing' : 'idle', planTier, modalVisible: premiumOpen, entitlementsResolved: storeKitEntitlementsResolved, pending: purchaseDiagnosticPendingRef.current }); setPremiumOpen(false); if (Platform.OS !== 'ios') resumeTopImageAfterAccessFlow(); }} onDismiss={() => { if (Platform.OS !== 'ios') return; const pending = premiumAfterDismissRef.current; premiumAfterDismissRef.current = undefined; if (pending) pending(); else resumeTopImageAfterAccessFlow(); }} onOpenDesignCustomize={() => { premiumAfterDismissRef.current = () => setDesignCustomizeOpen(true); setPremiumOpen(false); if (Platform.OS !== 'ios') InteractionManager.runAfterInteractions(() => { const pending = premiumAfterDismissRef.current; premiumAfterDismissRef.current = undefined; pending?.(); }); }} styles={styles} helpers={{ getThemeTokens: getThemedThemeTokens }} renderReadOnlyPreview={renderPremiumReadOnlyPreview} products={storeKit.products} productStatus={storeKit.status} purchaseError={storeKit.errorMessage} onPurchasePlan={purchasePremiumWithDiagnostics} onRestorePurchase={() => { void restorePremiumPurchase(); }} />
      <VoiceUsageLimitModal
        visible={voiceUsageLimitOpen}
        designMode={uiDesignMode}
        chicPalette={chicPalette}
        canWatchReward={remainingVoiceRewards(voiceUsage, dateKey()) > 0}
        onReward={grantVoiceReward}
        onRewarded={() => setVoiceOpen(true)}
        onPremium={() => openPremiumFeature('voice')}
        onClose={() => setVoiceUsageLimitOpen(false)}
      />
      <VoiceInputModal visible={voiceOpen} autoStart={voiceAutoStart} designMode={uiDesignMode} chicPalette={chicPalette} dateKey={dateKey} onClose={() => { setVoiceAutoStart(false); setVoiceOpen(false); }} onRoute={handleVoiceRoute} hapticsEnabled={hapticsEnabled} isPremium={planTier === 'premium'} remainingUses={remainingVoiceUses(voiceUsage, dateKey())} onRecognitionAccepted={consumeVoiceInput} />
      <DesignCustomizeModal visible={designCustomizeOpen} designMode={uiDesignMode} chicPalette={chicPalette} purchased={storeDesignCustomizeEntitlement} premiumIncluded={storePremiumAccess} rewardedAvailable={designRewardAvailable} rewardedLabel={designRewardLabel} onRewarded={startDesignRewardForCurrent} localizedPrice={storeKit.designProduct?.displayPrice} priceStatus={storeKit.status} purchaseError={storeKit.errorMessage} onPurchase={purchaseDesignCustomize} onRestore={restoreDesignCustomizePurchase} onPremium={() => { designCustomizeAfterDismissRef.current = () => openPremiumFeature('photo_design'); setDesignCustomizeOpen(false); if (Platform.OS !== 'ios') InteractionManager.runAfterInteractions(() => { const pending = designCustomizeAfterDismissRef.current; designCustomizeAfterDismissRef.current = undefined; pending?.(); }); }} onClose={() => { setDesignCustomizeOpen(false); pendingDesignApplyRef.current = undefined; pendingDesignTrialRef.current = undefined; if (Platform.OS !== 'ios') resumeTopImageAfterAccessFlow(); }} onDismiss={() => { if (Platform.OS !== 'ios') return; const nextModal = designCustomizeAfterDismissRef.current; designCustomizeAfterDismissRef.current = undefined; if (nextModal) { nextModal(); return; } const startReward = designRewardAfterCustomizeDismissRef.current; designRewardAfterCustomizeDismissRef.current = undefined; if (startReward) startReward(); else if (!premiumOpenRef.current) resumeTopImageAfterAccessFlow(); }} />
      {__DEV__ && <OnboardingCaptureStudio visible={captureStudioOpen} onClose={() => setCaptureStudioOpen(false)} renderStep={renderOnboardingCaptureStep} renderGuideStep={renderGuideCaptureStep} renderPremiumStep={renderPremiumReadOnlyPreview} colors={{ background: theme.colors.screenBackground, surface: theme.colors.surface, border: theme.colors.border, text: theme.colors.primaryText, muted: theme.colors.secondaryText, accent: theme.colors.primaryAccent, onAccent: uiDesignMode === 'chic' && chicPalette ? chicPalette.onAccent : uiDesignMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF' }} />}
       {false && <DesignPreviewModal visible={Boolean(designPreviewPattern)} initialPattern={designPreviewPattern} initialMode={designPreviewMode} chicCheckColor={chicCheckColor} planTier={planTier} designCustomizePurchased={hasDesignCustomizeAccess || isPremiumDesignUnlocked(rewardedAccess, now) || isPremiumDesignTrialActive(rewardedAccess, now)} photoUri={designPreviewPhotoUri} onPickPhoto={() => void pickPhotoForDesignPreview()} onClose={() => { pendingDesignApplyRef.current = undefined; pendingDesignTrialRef.current = undefined; setDesignPreviewPattern(undefined); setDesignPreviewPhotoUri(undefined); setDesignPreviewMonoPattern(undefined); setDesignPreviewMode('chic'); }} onUse={(mode, pattern) => {
        if (mode === 'photo') {
          if (!designPreviewPhotoUri) { void pickPhotoForDesignPreview(); return; }
          if (planTier === 'premium' || hasDesignCustomizeAccess || isPremiumDesignTrialActive(rewardedAccess, now) || isPremiumDesignUnlocked(rewardedAccess, now)) {
            applyPhotoDesign();
            completeInitialDesignSelection();
            return;
          }
          pendingDesignApplyRef.current = () => {
            applyPhotoDesign();
            completeInitialDesignSelection();
          };
          pendingDesignTrialRef.current = canStartPremiumDesignTrial(rewardedAccess)
            ? () => startPhotoDesignTrial()
            : undefined;
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
          const hasPatternAccess = planTier === 'premium' || hasDesignCustomizeAccess || isPremiumDesignUnlocked(rewardedAccess, now) || isPremiumDesignTrialActive(rewardedAccess, now);
          if (!hasPatternAccess) {
          pendingDesignApplyRef.current = () => {
            setDesignMode('chic');
            setChicPattern(pattern);
            setChicCheckColor(chicCheckColor);
            setDesignPreviewPattern(undefined);
              if (!onboardingDesignSelectionPending) void onboarding.complete('design');
              completeInitialDesignSelection();
            };
          pendingDesignTrialRef.current = canStartPremiumDesignTrial(rewardedAccess)
            ? () => startDesignTrial(pattern, chicCheckColor)
            : undefined;
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
      }} />}
      <DesignTrialExpiredModal visible={designTrialNoticeOpen} trialAvailable={rewardedAccessHydrated && canStartPremiumDesignTrial(rewardedAccess)} designMode={uiDesignMode} chicPalette={chicPalette} onClose={() => { pendingDesignApplyRef.current = undefined; pendingDesignTrialRef.current = undefined; designTrialAfterDismissRef.current = undefined; setDesignTrialNoticeOpen(false); }} onDismiss={() => { if (Platform.OS !== 'ios') return; const pending = designTrialAfterDismissRef.current; designTrialAfterDismissRef.current = undefined; pending?.(); }} onPremium={() => { pendingDesignTrialRef.current = undefined; designTrialAfterDismissRef.current = () => setDesignCustomizeOpen(true); setDesignTrialNoticeOpen(false); if (Platform.OS !== 'ios') InteractionManager.runAfterInteractions(() => { const pending = designTrialAfterDismissRef.current; designTrialAfterDismissRef.current = undefined; pending?.(); }); }} onTrial={() => {
        const startTrial = pendingDesignTrialRef.current;
        pendingDesignTrialRef.current = undefined;
        pendingDesignApplyRef.current = undefined;
        setDesignTrialNoticeOpen(false);
        startTrial?.();
      }} onReward={() => {
        designTrialAfterDismissRef.current = () => {
          void requestDesignReward().then((success) => {
            if (!success) setDesignTrialNoticeOpen(true);
          });
        };
        setDesignTrialNoticeOpen(false);
        if (Platform.OS !== 'ios') InteractionManager.runAfterInteractions(() => {
          const pending = designTrialAfterDismissRef.current;
          designTrialAfterDismissRef.current = undefined;
          pending?.();
        });
      }} />
      <TopImageCropModal
        visible={Boolean(pendingTopPhoto)}
        uri={pendingTopPhoto?.previewUri ?? pendingTopPhoto?.originalUri}
        sourceWidth={pendingTopPhoto?.sourceWidth ?? 1}
        sourceHeight={pendingTopPhoto?.sourceHeight ?? 1}
        initialRect={pendingTopPhoto?.cropRect}
        styles={styles}
        processing={topImageProcessing}
        onCancel={() => {
          const target = pendingTopPhoto?.target;
          topImageCropDismissActionRef.current = { type: 'resume', target };
          if (__DEV__) {
            console.log('[TopImage] cancel-button-press');
            console.log('[TopImage] crop-dismiss-start', { target, reason: 'cancel' });
            console.log('[TopImage] modal-close', { target, reason: 'cancel' });
          }
          if (pendingTopPhoto?.previewUri) deleteTemporaryPhotoUri(pendingTopPhoto.previewUri);
          setPendingTopPhoto(undefined);
        }}
        onDismiss={() => {
          const action = topImageCropDismissActionRef.current;
          topImageCropDismissActionRef.current = { type: 'resume' };
          if (__DEV__) console.log('[TopImage] crop-dismissed', { target: action.target, action: action.type });
          InteractionManager.runAfterInteractions(() => {
            if (action.type === 'reselect' && action.target) {
              void pickPhotoTheme(action.target);
              return;
            }
            setTopImageCropResumeToken((current) => current + 1);
          });
        }}
        onReselect={() => {
          const target = pendingTopPhoto?.target;
          if (!target) return;
          topImageCropDismissActionRef.current = { type: 'reselect', target };
          if (__DEV__) console.log('[TopImage] crop-dismiss-start', { target, reason: 'reselect' });
          if (pendingTopPhoto?.previewUri) deleteTemporaryPhotoUri(pendingTopPhoto.previewUri);
          setPendingTopPhoto(undefined);
        }}
        onUse={(cropRect) => { void applyPendingTopPhoto(cropRect); }}
      />
      <OnboardingCarousel
  visible={
    onboarding.ready &&
    onboarding.introVisible
  }
  onDismiss={
    onboarding.isCompleted('intro')
      ? onboarding.closeIntro
      : () => {
        if (__DEV__) {
          console.log('[FirstRunDiagnostic]', {
            ready: onboarding.ready,
            introVisible: onboarding.introVisible,
            introCompleted: onboarding.isCompleted('intro'),
            firstRunStage: onboarding.state.firstRunStage,
            onboardingDesignSelectionPending,
            currentScreen: screen,
            designSheetRequested: false,
            event: 'skip-intro',
          });
        }
        void onboarding.skipIntro();
      }
  }
  finalActionLabel="デザインを選ぶ"
  designMode={uiDesignMode}
  chicPalette={chicPalette}
  onFinalAction={() => {
    if (onboarding.isCompleted('intro')) {
      onboarding.closeIntro();
      return;
    }
    if (__DEV__) {
      console.log('[FirstRunDiagnostic]', {
        ready: onboarding.ready,
        introVisible: onboarding.introVisible,
        introCompleted: onboarding.isCompleted('intro'),
        firstRunStage: onboarding.state.firstRunStage,
        onboardingDesignSelectionPending,
        currentScreen: screen,
        designSheetRequested: true,
        event: 'finish-intro-design-request',
      });
    }
    void onboarding.finishIntro();
  }}
  renderStep={renderOnboardingEmbeddedStep}
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
    </View>
  );
}

type ModalPalette = {
  screenBackground: string;
  surface: string;
  secondarySurface: string;
  border: string;
  primaryText: string;
  secondaryText: string;
  primaryAccent: string;
  accentSoft: string;
  warning: string;
  onAccent: string;
  modalRadius: number;
  buttonRadius: number;
  shadow: { color: string; opacity: number; radius: number; y: number };
};

function popupSheetStyle(palette: ModalPalette, maxHeight?: DimensionValue) {
  return {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderTopWidth: 1,
    borderTopLeftRadius: palette.modalRadius,
    borderTopRightRadius: palette.modalRadius,
    shadowColor: palette.shadow.color,
    shadowOpacity: palette.shadow.opacity,
    shadowRadius: palette.shadow.radius,
    shadowOffset: { width: 0, height: palette.shadow.y },
    elevation: 6,
    ...(maxHeight === undefined ? {} : { maxHeight }),
  };
}

function FocusTaskCompletionModal({ session, task, palette, onComplete, onContinue, onLater }: { session?: FocusSession; task?: Task; palette: ModalPalette; onComplete: () => void; onContinue: () => void; onLater: () => void }) {
  if (!session || !task) return null;
  return <Modal visible transparent animationType="fade" onRequestClose={onLater}>
    <Pressable style={styles.modalBackdrop} onPress={onLater}>
      <Pressable style={[styles.modalSheet, popupSheetStyle(palette)]} onPress={(event) => event.stopPropagation()}>
        <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
        <Text style={[styles.modalTitle, { color: palette.primaryText }]}>集中おつかれさま</Text>
        <Text style={[styles.emptyCopy, { color: palette.secondaryText }]}>{`「${task.title}」は終わった？`}</Text>
        <Pressable style={[styles.primaryButton, { backgroundColor: palette.primaryAccent, borderRadius: palette.buttonRadius }]} onPress={onComplete}><Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>完了</Text></Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={{ minHeight: 46, flex: 1, borderRadius: palette.buttonRadius, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 }} onPress={onContinue}><Text style={{ color: palette.primaryText, fontSize: 13, fontWeight: '900' }}>もう少し</Text></Pressable>
          <Pressable style={{ minHeight: 46, flex: 1, borderRadius: palette.buttonRadius, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.secondarySurface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 }} onPress={onLater}><Text style={{ color: palette.secondaryText, fontSize: 13, fontWeight: '900' }}>後で</Text></Pressable>
        </View>
      </Pressable>
    </Pressable>
  </Modal>;
}

function TomorrowPrepModal({ visible, step, todayTasks, tomorrowTasks, tomorrowPlans, palette, onStepChange, onMoveTomorrow, onLater, onCompleteTask, onEditTask, onEditPlan, onClose }: { visible: boolean; step: 0 | 1 | 2 | 3; todayTasks: Task[]; tomorrowTasks: Task[]; tomorrowPlans: DeparturePlan[]; palette: ModalPalette; onStepChange: (step: 0 | 1 | 2 | 3) => void; onMoveTomorrow: (taskId: string) => void; onLater: (taskId: string) => void; onCompleteTask: (taskId: string) => void; onEditTask: (task: Task) => void; onEditPlan: (plan: DeparturePlan) => void; onClose: () => void }) {
  const buttonStyle = { minHeight: 38, borderRadius: palette.buttonRadius, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.secondarySurface, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 10, flex: 1 };
  const timeLabel = (plan: DeparturePlan) => {
    const scheduled = getPlanScheduledTime(plan);
    if (!scheduled) return '終日';
    if (!isArrivalReversePlan(plan)) return `予定 ${scheduled}`;
    const moments = getDepartureMoments(plan);
    return `予定 ${scheduled}  準備 ${formatLiveTime(moments.prepare)}  出発 ${formatLiveTime(moments.leave)}`;
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable style={[styles.modalSheet, popupSheetStyle(palette, '86%')]} onPress={(event) => event.stopPropagation()}>
        <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={[styles.modalTitle, { color: palette.primaryText }]}>{step === 0 ? '明日の準備をしておきますか？' : '明日の準備'}</Text><Pressable onPress={onClose}><Text style={{ color: palette.primaryAccent, fontWeight: '800' }}>閉じる</Text></Pressable></View>
        {step === 0 && <>
          <Text style={[styles.emptyCopy, { color: palette.secondaryText }]}>今日残っていることと、明日の予定を少し整理できます。</Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: palette.primaryAccent, borderRadius: palette.buttonRadius }]} onPress={() => onStepChange(1)}><Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>準備する</Text></Pressable>
          <Pressable style={{ minHeight: 46, borderRadius: palette.buttonRadius, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.secondarySurface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 }} onPress={onClose}><Text style={{ color: palette.secondaryText, fontSize: 13, fontWeight: '900' }}>今日はしない</Text></Pressable>
        </>}
        {step === 1 && <>
          <Text style={[styles.emptyCopy, { color: palette.secondaryText }]}>今日の未完了Taskを少し整理できます。</Text>
          <ScrollView style={{ marginTop: 8 }}><Text style={{ color: palette.primaryText, fontWeight: '900', marginBottom: 6 }}>今日の未完了Task</Text>{todayTasks.length === 0 ? <Text style={{ color: palette.secondaryText }}>残っているTaskはありません。</Text> : todayTasks.map((task) => <View key={task.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border }}><Text style={{ color: palette.primaryText, fontWeight: '800' }}>{task.title}</Text><View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}><Pressable style={buttonStyle} onPress={() => onMoveTomorrow(task.id)}><Text style={{ color: palette.primaryText, fontSize: 12 }}>明日に移す</Text></Pressable><Pressable style={buttonStyle} onPress={() => onLater(task.id)}><Text style={{ color: palette.primaryText, fontSize: 12 }}>あとで</Text></Pressable><Pressable style={buttonStyle} onPress={() => onCompleteTask(task.id)}><Text style={{ color: palette.primaryText, fontSize: 12 }}>完了</Text></Pressable><Pressable style={buttonStyle} onPress={() => onEditTask(task)}><Text style={{ color: palette.primaryAccent, fontSize: 12 }}>編集</Text></Pressable></View></View>)}</ScrollView>
          <Pressable style={[styles.primaryButton, { backgroundColor: palette.primaryAccent, borderRadius: palette.buttonRadius }]} onPress={() => onStepChange(2)}><Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>明日の内容を見る</Text></Pressable>
        </>}
        {step === 2 && <>
          <Text style={[styles.emptyCopy, { color: palette.secondaryText }]}>明日の予定とTaskを時系列で確認します。</Text>
          <ScrollView style={{ marginTop: 8 }}><Text style={{ color: palette.primaryText, fontWeight: '900', marginBottom: 6 }}>予定</Text>{tomorrowPlans.length === 0 ? <Text style={{ color: palette.secondaryText }}>明日の予定はありません。</Text> : tomorrowPlans.map((plan) => <Pressable key={plan.id} onPress={() => onEditPlan(plan)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border }}><Text style={{ color: palette.primaryText, fontWeight: '800' }}>{plan.title}</Text><Text style={{ color: palette.secondaryText, fontSize: 12, marginTop: 3 }}>{timeLabel(plan)}</Text></Pressable>)}<Text style={{ color: palette.primaryText, fontWeight: '900', marginTop: 12, marginBottom: 6 }}>Task / Routine</Text>{tomorrowTasks.length === 0 ? <Text style={{ color: palette.secondaryText }}>明日のTaskはありません。</Text> : tomorrowTasks.map((task) => <Pressable key={task.id} onPress={() => onEditTask(task)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border }}><Text style={{ color: palette.primaryText }}>{task.title}</Text>{task.scheduledTime ? <Text style={{ color: palette.secondaryText, fontSize: 12, marginTop: 2 }}>{task.scheduledTime}</Text> : null}</Pressable>)}</ScrollView>
          <Pressable style={[styles.primaryButton, { backgroundColor: palette.primaryAccent, borderRadius: palette.buttonRadius }]} onPress={() => onStepChange(3)}><Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>次へ</Text></Pressable>
        </>}
        {step === 3 && <><Text style={[styles.modalTitle, { color: palette.primaryText, fontSize: 20 }]}>明日の準備ができました</Text><Text style={[styles.emptyCopy, { color: palette.secondaryText }]}>明日も自分のペースで進めよう。</Text><Pressable style={[styles.primaryButton, { backgroundColor: palette.primaryAccent, borderRadius: palette.buttonRadius }]} onPress={onClose}><Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>閉じる</Text></Pressable></>}
      </Pressable>
    </Pressable>
  </Modal>;
}

function formatNoticeDate(publishedAt: string) {
  const date = new Date(publishedAt);
  return Number.isNaN(date.getTime()) ? '' : `${date.getMonth() + 1}/${date.getDate()}`;
}

function AppNoticeCenter({ visible, notices, readNoticeIds, palette, onRead, onNavigate, onClose }: { visible: boolean; notices: AppNotice[]; readNoticeIds: string[]; palette: ModalPalette; onRead: (noticeId: string) => void; onNavigate: (notice: AppNotice) => void; onClose: () => void }) {
  const [selectedNoticeId, setSelectedNoticeId] = useState<string>();
  const selectedNotice = notices.find((notice) => notice.id === selectedNoticeId);

  useEffect(() => {
    if (!visible) setSelectedNoticeId(undefined);
  }, [visible]);

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable style={[styles.modalSheet, popupSheetStyle(palette, '88%')]} onPress={(event) => event.stopPropagation()}>
        <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {selectedNotice ? <Pressable accessibilityRole="button" accessibilityLabel="お知らせ一覧へ戻る" onPress={() => setSelectedNoticeId(undefined)}><Text style={{ color: palette.primaryAccent, fontSize: 24, lineHeight: 26 }}>‹</Text></Pressable> : null}
            <Text style={[styles.modalTitle, { color: palette.primaryText, marginBottom: 0 }]}>お知らせ</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose}><Text style={{ color: palette.primaryAccent, fontWeight: '800' }}>閉じる</Text></Pressable>
        </View>
        {!selectedNotice ? <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
          {notices.length === 0 ? <Text style={{ color: palette.secondaryText, paddingVertical: 20 }}>現在のお知らせはありません。</Text> : notices.map((notice) => {
            const unread = !readNoticeIds.includes(notice.id);
            const categoryColor = notice.category === 'important' ? palette.warning : palette.primaryAccent;
            return <Pressable key={notice.id} accessibilityRole="button" onPress={() => { onRead(notice.id); setSelectedNoticeId(notice.id); }} style={{ padding: 13, marginTop: 8, borderRadius: palette.buttonRadius, borderWidth: 1, borderColor: unread ? categoryColor : palette.border, backgroundColor: palette.secondarySurface }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Text style={{ color: categoryColor, fontSize: 10, fontWeight: '900' }}>{APP_NOTICE_CATEGORY_LABELS[notice.category]}</Text>
                {unread ? <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, backgroundColor: categoryColor }}><Text style={{ color: palette.onAccent, fontSize: 9, fontWeight: '900' }}>NEW</Text></View> : null}
                <Text style={{ marginLeft: 'auto', color: palette.secondaryText, fontSize: 10 }}>{formatNoticeDate(notice.publishedAt)}</Text>
              </View>
              <Text numberOfLines={2} style={{ color: palette.primaryText, fontSize: 14, lineHeight: 20, fontWeight: '900', marginTop: 7 }}>{notice.title}</Text>
              <Text numberOfLines={3} style={{ color: palette.secondaryText, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{notice.body}</Text>
            </Pressable>;
          })}
        </ScrollView> : <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
          <Text style={{ color: selectedNotice.category === 'important' ? palette.warning : palette.primaryAccent, fontSize: 11, fontWeight: '900' }}>{APP_NOTICE_CATEGORY_LABELS[selectedNotice.category]} ・ {formatNoticeDate(selectedNotice.publishedAt)}</Text>
          <Text style={{ color: palette.primaryText, fontSize: 20, lineHeight: 28, fontWeight: '900', marginTop: 8 }}>{selectedNotice.title}</Text>
          <Text style={{ color: palette.secondaryText, fontSize: 14, lineHeight: 23, marginTop: 14 }}>{selectedNotice.body}</Text>
          {selectedNotice.targetScreen ? <Pressable accessibilityRole="button" onPress={() => onNavigate(selectedNotice)} style={{ minHeight: 46, borderRadius: palette.buttonRadius, backgroundColor: palette.primaryAccent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, marginTop: 20 }}><Text style={{ color: palette.onAccent, fontSize: 13, fontWeight: '900' }}>この機能を見る</Text></Pressable> : null}
        </ScrollView>}
      </Pressable>
    </Pressable>
  </Modal>;
}

type DesignPreviewMode = 'minimal' | 'dark' | 'chic' | 'photo';
type DesignTryOnSelection = {
  mode: DesignPreviewMode;
  pattern: ChicPattern;
  color: ChicCheckColor;
  photoUri?: string;
  monoAppearance: 'auto' | 'light' | 'dark';
  monoPattern: MonoPattern;
};

// Temporary, read-only design try-on. It mounts the production HomeScreen
// renderer with in-memory sample data and never writes app state.
function DesignTryOnModal({ visible, initialMode, initialPattern, initialColor, initialMonoAppearance, initialMonoPattern, photoUri, topImageUris, focusBackgroundUri, wishState, wishMonths, previewComponents, previewHelpers, systemColorScheme, onClose, onApply }: {
  visible: boolean;
  initialMode: DesignPreviewMode;
  initialPattern: ChicPattern;
  initialColor: ChicCheckColor;
  initialMonoAppearance: 'auto' | 'light' | 'dark';
  initialMonoPattern: MonoPattern;
  photoUri?: string;
  topImageUris?: Partial<Record<'home' | 'timeline' | 'analysis' | 'wish' | 'settings', string>>;
  focusBackgroundUri?: string;
  wishState?: MonthlyWishState;
  wishMonths?: WishMonthMap;
  previewComponents?: any;
  previewHelpers?: any;
  systemColorScheme?: 'light' | 'dark' | null;
  onClose: () => void;
  onApply: (selection: DesignTryOnSelection) => void;
}) {
  const [mode, setMode] = useState<DesignPreviewMode>(initialMode);
  const [pattern, setPattern] = useState<ChicPattern>(initialPattern);
  const [color, setColor] = useState<ChicCheckColor>(initialColor);
  const [monoAppearance, setMonoAppearance] = useState<'auto' | 'light' | 'dark'>(initialMonoAppearance);
  const [monoPattern, setMonoPattern] = useState<MonoPattern>(initialMonoPattern);
  const [photoTarget, setPhotoTarget] = useState<'background' | 'home' | 'timeline' | 'analysis' | 'wish' | 'settings' | 'focus'>('background');
  const photoTargetLabel = photoTarget === 'home' ? '今日' : photoTarget === 'timeline' ? '予定' : photoTarget === 'analysis' ? '分析' : photoTarget === 'wish' ? '叶えたいこと' : photoTarget === 'settings' ? '設定' : photoTarget === 'focus' ? '集中タイマー' : '背景';
  useEffect(() => {
    if (!visible) return;
    setMode(initialMode); setPattern(initialPattern); setColor(initialColor);
    setMonoAppearance(initialMonoAppearance); setMonoPattern(initialMonoPattern);
    setPhotoTarget('background');
  }, [visible, initialColor, initialMode, initialMonoAppearance, initialMonoPattern, initialPattern]);
  const resolvedMonoMode: 'minimal' | 'dark' = monoAppearance === 'dark' ? 'dark' : monoAppearance === 'light' ? 'minimal' : systemColorScheme === 'dark' ? 'dark' : 'minimal';
  const homeMode: DesignMode = mode === 'photo' || mode === 'chic' ? 'chic' : resolvedMonoMode;
  const basePalette = getDesignCheckThemeTokens(color);
  const previewPalette = mode === 'chic' && pattern === 'nightSky' ? getNightSkyPalette(basePalette) : basePalette;
  const imageBackground = mode === 'chic' && isImageDesignPattern(pattern) ? designBackgroundAssets[pattern] : undefined;
  const selectedTopImageUri = photoTarget === 'background' || photoTarget === 'focus' ? undefined : topImageUris?.[photoTarget];
  const sampleNow = new Date();
  const sampleDate = dateKey(sampleNow);
  const sampleTasks: Task[] = [
    { id: '__design_tryon_current', title: '今日のタスクを確認', done: false, status: 'active', category: '仕事', priority: '中', scheduledDate: sampleDate, scheduledTime: '10:00', endAt: '10:30', bucket: 'now' },
    { id: '__design_tryon_later', title: '今日の用事', done: false, status: 'active', category: 'その他', priority: '低', scheduledDate: sampleDate, bucket: 'later' },
  ];
  const samplePlans: DeparturePlan[] = [{ id: '__design_tryon_plan', title: '予定', destination: '予定の場所', date: sampleDate, arrival: '14:00', travelMinutes: 15, preparationMinutes: 10, bufferMinutes: 5, planMode: 'arrival_reverse' }];
  const previewBackground = mode === 'photo' ? previewPalette.background : imageBackground?.background ?? (mode === 'chic' ? previewPalette.background : getThemeTokens(homeMode, color).colors.screenBackground);
  const renderBackground = mode === 'photo' && photoUri
    ? <><Image source={{ uri: photoUri }} resizeMode="cover" style={StyleSheet.absoluteFillObject} /><View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(15,20,28,0.34)' }]} /></>
    : imageBackground ? <Image source={imageBackground.source} resizeMode="contain" style={StyleSheet.absoluteFillObject} />
      : mode === 'chic' ? <ChicPatternDecor pattern={pattern} accent={previewPalette.accent} warm={previewPalette.accentSoft} checkColor={color} />
        : monoPattern === 'looseLeaf' ? <MonoLooseLeafBackground dark={homeMode === 'dark'} /> : monoPattern === 'chic' ? <MonoChicBackground dark={homeMode === 'dark'} /> : null;
  const previewSurfaceStyle = { flex: 1, paddingHorizontal: 16, paddingTop: 8 };
  const topImage = selectedTopImageUri ? <Image source={{ uri: selectedTopImageUri }} resizeMode="cover" style={{ width: '100%', height: 108, borderRadius: 16, marginBottom: 8 }} /> : null;
  const homePreview = <View pointerEvents="none" style={previewSurfaceStyle}>
    {topImage}
    <HomeScreen
      tasks={sampleTasks} allTasks={sampleTasks} now={sampleNow} designMode={homeMode} chicPalette={previewPalette} completionIcon="✓"
      selectionMode={false} selectedTaskIds={[]} onAdd={() => undefined} onOpenFocus={() => undefined} initialTab="now"
      onOpenTodayRecord={() => undefined} onOpenSchedule={() => undefined} onToggle={() => undefined} onToggleSubtask={() => undefined}
      onUpdateTaskList={() => undefined} onCompleteParent={() => undefined} onRestore={() => undefined} onEdit={() => undefined}
      onToggleSelection={() => undefined} onSelectionMode={() => undefined} onClearSelection={() => undefined} onCompleteSelected={() => undefined}
      onDeleteSelected={() => undefined} onDelete={() => undefined} onSkip={() => undefined} onRemoveRoutine={() => undefined}
      onDuplicate={() => undefined} onSaveTemplate={() => undefined} onPostpone={() => undefined} departurePlans={samplePlans} onBucket={() => undefined}
      styles={styles}
      renderTodayWinStrip={(todayTasks) => <TodayWinStrip tasks={todayTasks} designMode={homeMode} chicPattern={mode === 'chic' ? pattern : 'plain'} chicPalette={previewPalette} onRestore={() => undefined} />}
      helpers={{ deadlineLabel, getUrgencyStatus, getLateRiskMessage, dateForReminder, dateKey, formatLiveTime, isCheckChicPattern, todayInputValue, getThemeTokens: (design: DesignMode) => getThemeTokens(design, color) }}
    />
  </View>;
  const timelineHelpers = previewHelpers ?? { getThemeTokens: (design: DesignMode) => getThemeTokens(design, color), dateKey, planDateKey, hasPremiumAccess, formatLiveDate, formatLiveTime, getDepartureMoments, normalizePlanDate, countdownToDate, dateForReminder, getMapSearchTarget, openMapSearch: async () => undefined, getPlanCountdownAt, colors: previewPalette };
  const timelineComponents = previewComponents ?? {};
  const timelinePreview = <View pointerEvents="none" style={previewSurfaceStyle}>
    {topImage}
    <TimelineScreen
      plan={samplePlans[0]} plans={samplePlans} planEditorOpen={false} departureCheckIns={[]} departurePreparationStatuses={{}} behaviorEvents={[]} tasks={sampleTasks} now={sampleNow}
      designMode={homeMode} focusBackgroundUri={photoTarget === 'focus' ? focusBackgroundUri : undefined} initialTab={photoTarget === 'focus' ? 'focus' : 'departure'} chicPattern={mode === 'chic' ? pattern : 'plain'} chicPalette={previewPalette} planTier="premium" completionIcon="✓"
      focusCustomDurationMinutes={25} onFocusCustomDurationChange={() => undefined} focusVoiceRequest={undefined} focusPersistedState={undefined} onFocusStateChange={() => undefined} recoveryTargetPlanId={undefined}
      onChange={() => undefined} onSchedule={() => undefined} onScheduleUsed={() => undefined} onTimeTabChange={() => undefined} onOpenNewPlan={() => undefined} onClosePlanEditor={() => undefined} onImportCalendarEvent={() => false} onEdit={() => undefined} onSharePlan={() => undefined} onDelete={() => undefined} onEditTask={() => undefined} onDeleteTask={() => undefined} onTaskBucketChange={() => undefined} onPremium={() => undefined} onRecovery={() => undefined} onRecoveryOpened={() => undefined} onRecoveryClosed={() => undefined}
      onFocusCompleted={() => undefined} onFocusTaskFinished={() => undefined} onFocusStarted={() => undefined} onFocusNotificationPermission={async () => false} onFocusRunningChange={() => undefined} onFocusActivityChange={() => undefined} focusTimerActive={false} onFocusNavigationBlocked={() => undefined} onBehaviorEvent={() => undefined} onDeparted={() => undefined} onPreparationStarted={() => undefined} onStill={() => undefined}
      calendarMarks={{}} onSetCalendarMark={() => undefined} travelApps={[]} onOpenTravelAppSettings={() => undefined} hapticsEnabled={false} previewCustomDurationOpen={false} previewMode previewCalendarEvents={[]} previewCalendarOptions={[]} calendarImportCalendarIds={[]} calendarImportKnownCalendarIds={[]} onCalendarImportCalendarIdsChange={() => undefined} onCalendarImportKnownCalendarIdsChange={() => undefined} planEditorGuide={undefined} recoveryGuide={undefined} styles={styles} helpers={timelineHelpers} components={timelineComponents}
    />
  </View>;
  const analysisPreview = <View pointerEvents="none" style={previewSurfaceStyle}>
    {topImage}
    <AnalysisScreen events={[]} tasks={sampleTasks} onRemoveRoutine={() => undefined} routineArchives={[]} onResumeRoutine={() => undefined} onDeleteRoutineArchive={() => undefined} designMode={homeMode} planTier="premium" recordContent={null} onPremium={() => undefined} departurePlans={samplePlans} chicPalette={previewPalette} chicPattern={mode === 'chic' ? pattern : 'plain'} PatternDecor={ChicPatternDecor} onApplySuggestion={() => undefined} onAnalysisUsed={() => undefined} initialTab="records" previewKind="time" />
  </View>;
  const wishPreview = wishState ? <View pointerEvents="none" style={previewSurfaceStyle}>
    {topImage}
    <WishScreen designMode={homeMode} chicPattern={mode === 'chic' ? pattern : 'plain'} chicPalette={previewPalette} monthLabel={`${sampleNow.getFullYear()}年${sampleNow.getMonth() + 1}月`} state={wishState} wishMonths={wishMonths ?? {}} onSaveState={() => undefined} onCreateTaskFromAction={() => undefined} canCreateWish planTier="premium" affirmations={[]} affirmationCustomTexts={[]} onSaveAffirmation={() => undefined} onDeleteAffirmation={() => undefined} onSaveAffirmationCustomText={() => undefined} onDeleteAffirmationCustomText={() => undefined} canCreateWishAction topImageUri={selectedTopImageUri} onPremium={() => undefined} />
  </View> : homePreview;
  const settingsPreview = <View pointerEvents="none" style={previewSurfaceStyle}>
    <DesignAppliedPreview
      tab={mode === 'photo' ? 'photo' : mode === 'chic' ? 'chic' : 'mono'}
      selectedMode={homeMode}
      designMode={homeMode}
      systemColorScheme={systemColorScheme}
      monoAppearance={monoAppearance}
      monoPattern={monoPattern}
      chicPattern={mode === 'chic' ? pattern : 'plain'}
      chicCheckColor={color}
      chicPalette={previewPalette}
      photoTheme={{ imageUri: photoUri, topImageUris: { settings: selectedTopImageUri } } as any}
      previewPhotoUri={photoUri}
      topImageUriOverride={selectedTopImageUri}
      colors={{ background: previewBackground, surface: previewPalette.cardSurface, border: previewPalette.border, text: previewPalette.textPrimary, muted: previewPalette.textSecondary, accent: previewPalette.accent, soft: previewPalette.accentSoft, onAccent: previewPalette.onAccent }}
      styles={styles}
      helpers={{ getChicCheckColor: (value: ChicCheckColor) => getDesignCheckThemeTokens(value), getNightSkyPalette, getThemeTokens: (design: DesignMode, paletteId?: ChicCheckColor) => getThemeTokens(design, paletteId), getChicPatternVisual }}
      components={{ ChicPatternDecor, BThemeRibbonDecoration, CThemeRibbonDecoration }}
    />
  </View>;
  const previewContent = photoTarget === 'timeline' || photoTarget === 'focus' ? timelinePreview : photoTarget === 'analysis' ? analysisPreview : photoTarget === 'wish' ? wishPreview : photoTarget === 'settings' ? settingsPreview : homePreview;
  const applySelection = () => {
    const selection = { mode: mode === 'photo' ? 'photo' : mode, pattern: mode === 'chic' ? pattern : 'plain', color, photoUri, monoAppearance, monoPattern } as DesignTryOnSelection;
    // Close the try-on surface before opening the Trial/Rewarded/purchase
    // surface. The parent queues the next action until the outer Design Sheet
    // has received its native onDismiss; delaying this callback with another
    // InteractionManager task can leave the iOS modal transition suspended.
    onClose();
    onApply(selection);
  };
  const monoChoices: Array<{ id: MonoPattern; label: string }> = [{ id: 'plain', label: 'プレーン' }, { id: 'looseLeaf', label: 'ルーズリーフ' }, { id: 'chic', label: 'シック' }];
  return <SafeAreaView style={{ flex: 1, backgroundColor: previewBackground }}><View style={{ flex: 1, overflow: 'hidden' }}>
      {renderBackground}
      <View style={{ flex: 1 }}>
        <View style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: previewPalette.border, backgroundColor: previewPalette.cardSurface }}>
          <View><Text style={{ color: previewPalette.textPrimary, fontSize: 17, fontWeight: '900' }}>{photoTarget === 'background' ? '今日を試着' : `${photoTargetLabel}を試着`}</Text><Text style={{ color: previewPalette.textSecondary, fontSize: 11, marginTop: 2 }}>試着中・正式設定はまだ変更されません</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="試着を閉じる" onPress={onClose} style={{ minWidth: 42, minHeight: 42, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: previewPalette.accent, fontSize: 25 }}>×</Text></Pressable>
        </View>
        <View style={{ flex: 1 }}>{previewContent}</View>
        <View style={{ maxHeight: 286, paddingTop: 10, paddingBottom: 8, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: previewPalette.border, backgroundColor: previewPalette.cardSurface }}>
          <View style={{ flexDirection: 'row', gap: 7, marginBottom: 8 }}>{(['minimal', 'chic', 'photo'] as const).map((tab) => { const active = tab === 'minimal' ? mode === 'minimal' || mode === 'dark' : mode === tab; return <Pressable key={tab} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setMode(tab === 'minimal' ? 'minimal' : tab)} style={{ flex: 1, minHeight: 34, borderRadius: 10, borderWidth: 1, borderColor: active ? previewPalette.accent : previewPalette.border, backgroundColor: active ? previewPalette.accentSoft : previewPalette.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: active ? previewPalette.accentStrong : previewPalette.textSecondary, fontSize: 12, fontWeight: '900' }}>{tab === 'minimal' ? 'Mono' : tab === 'chic' ? 'Design' : 'Photo'}</Text></Pressable>; })}</View>
          {(mode === 'minimal' || mode === 'dark') && <><View style={{ flexDirection: 'row', gap: 7, marginBottom: 8 }}>{(['auto', 'light', 'dark'] as const).map((item) => <Pressable key={item} onPress={() => setMonoAppearance(item)} style={{ paddingHorizontal: 12, minHeight: 30, borderRadius: 9, borderWidth: 1, borderColor: monoAppearance === item ? previewPalette.accent : previewPalette.border, backgroundColor: monoAppearance === item ? previewPalette.accentSoft : previewPalette.surface, justifyContent: 'center' }}><Text style={{ color: monoAppearance === item ? previewPalette.accentStrong : previewPalette.textSecondary, fontSize: 11, fontWeight: '800' }}>{item === 'auto' ? '自動' : item === 'light' ? 'Light' : 'Dark'}</Text></Pressable>)}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>{monoChoices.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: monoPattern === item.id }} onPress={() => setMonoPattern(item.id)} style={{ width: 108, minHeight: 42, borderRadius: 10, borderWidth: monoPattern === item.id ? 2 : 1, borderColor: monoPattern === item.id ? previewPalette.accent : previewPalette.border, backgroundColor: previewPalette.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: monoPattern === item.id ? previewPalette.accentStrong : previewPalette.textSecondary, fontSize: 11, fontWeight: '800' }}>{item.label}</Text></Pressable>)}</ScrollView></>}
          {mode === 'chic' && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>{designPatternChoices.map((item) => { const active = pattern === item.id; const imageAsset = isImageDesignPattern(item.id) ? designBackgroundAssets[item.id] : undefined; const visual = getChicPatternVisual(item.id, previewPalette); return <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setPattern(item.id)} style={{ width: 106, minHeight: 58, borderRadius: 10, borderWidth: active ? 2 : 1, borderColor: active ? previewPalette.accent : previewPalette.border, overflow: 'hidden', backgroundColor: imageAsset?.background ?? visual.background }}>{imageAsset ? <Image source={imageAsset.previewSource} resizeMode="cover" style={{ width: '100%', height: 34 }} /> : <View style={{ width: '100%', height: 34, overflow: 'hidden' }}><ChicPatternDecor pattern={item.id} accent={visual.accent} warm={visual.warm} checkColor={color} preview previewTopCrop={item.id === 'floralSoft'} /></View>}<Text style={{ color: active ? previewPalette.accentStrong : previewPalette.textSecondary, fontSize: 10, fontWeight: '800', textAlign: 'center', paddingVertical: 4 }}>{item.label}</Text></Pressable>; })}</ScrollView>}
          {mode === 'photo' && <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, marginBottom: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: previewPalette.border, backgroundColor: previewPalette.surface }}>{photoUri ? <Image source={{ uri: photoUri }} resizeMode="cover" style={{ width: 54, height: 36, borderRadius: 7 }} /> : <View style={{ width: 54, height: 36, borderRadius: 7, backgroundColor: previewPalette.accentSoft }} />}<Text style={{ color: previewPalette.textSecondary, fontSize: 11, marginLeft: 9 }}>{photoUri ? '保存済み写真を試着中' : '写真を選択するとPreviewできます'}</Text></View>}
          {mode === 'photo' && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 7 }}><Text style={{ color: previewPalette.textSecondary, fontSize: 10, alignSelf: 'center', marginRight: 2 }}>写真の表示：</Text>{([{ id: 'background', label: '背景' }, { id: 'home', label: '今日' }, { id: 'timeline', label: '予定' }, { id: 'analysis', label: '分析' }, { id: 'wish', label: '叶えたいこと' }, { id: 'settings', label: '設定' }, { id: 'focus', label: '集中タイマー' }] as const).map((item) => { const active = photoTarget === item.id; const available = item.id === 'background' ? Boolean(photoUri) : item.id === 'focus' ? Boolean(focusBackgroundUri) : Boolean(topImageUris?.[item.id]); return <Pressable key={item.id} disabled={!available} onPress={() => setPhotoTarget(item.id)} style={{ minHeight: 30, paddingHorizontal: 10, borderRadius: 9, borderWidth: active ? 2 : 1, borderColor: active ? previewPalette.accent : previewPalette.border, backgroundColor: active ? previewPalette.accentSoft : previewPalette.surface, opacity: available ? 1 : 0.45, justifyContent: 'center' }}><Text style={{ color: active ? previewPalette.accentStrong : previewPalette.textSecondary, fontSize: 10, fontWeight: '800' }}>{item.label}</Text></Pressable>; })}</ScrollView>}
          {mode !== 'minimal' && mode !== 'dark' && <ThemeColorSelector color={color} onChange={setColor} designMode="chic" />}
          <Pressable accessibilityRole="button" accessibilityLabel="このデザインを使う" onPress={applySelection} style={{ minHeight: 42, borderRadius: 12, marginTop: 8, backgroundColor: previewPalette.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: previewPalette.onAccent, fontSize: 13, fontWeight: '900' }}>このデザインを使う</Text></Pressable>
        </View>
      </View>
    </View></SafeAreaView>;
}

function DesignPreviewModal({ visible, initialPattern, initialMode = 'chic', chicCheckColor, planTier, designCustomizePurchased = false, photoUri, onPickPhoto, onClose, onUse }: { visible: boolean; initialPattern?: ChicPattern; initialMode?: DesignPreviewMode; chicCheckColor: ChicCheckColor; planTier: PlanTier; designCustomizePurchased?: boolean; photoUri?: string; onPickPhoto: () => void; onClose: () => void; onUse: (mode: DesignPreviewMode, pattern?: ChicPattern) => void }) {
  const [mode, setMode] = useState<DesignPreviewMode>('chic');
  const [pattern, setPattern] = useState<ChicPattern>(initialPattern ?? 'plain');
  const [floralSoftPreviewStatus, setFloralSoftPreviewStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setPattern(initialPattern ?? 'plain');
    }
  }, [initialMode, initialPattern, visible]);
  const hasDesignAccess = planTier === 'premium' || designCustomizePurchased;
  const isFreeFloralSoftPreview = !hasDesignAccess && mode === 'chic' && pattern === 'floralSoft';
  const isLockedPremiumPattern = !hasDesignAccess && mode === 'chic' && pattern !== 'plain';
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
  const palette = pattern === 'nightSky' ? getNightSkyPalette(getDesignCheckThemeTokens(chicCheckColor)) : getDesignCheckThemeTokens(chicCheckColor);
  const previewVisual = getChicPatternVisual(pattern, palette);
  const previewTokens = mode === 'chic'
    ? (pattern === 'nightSky' ? palette : getDesignPatternThemeTokens(pattern, chicCheckColor))
    : undefined;
  const uiPreview = mode === 'chic' && previewTokens
    ? { background: previewTokens.background, surface: previewTokens.cardSurface, soft: previewTokens.accentSoft, border: previewTokens.border, text: previewTokens.textPrimary, muted: previewTokens.textSecondary, accent: previewTokens.accent, accentStrong: previewTokens.accentStrong, onAccent: previewTokens.onAccent }
    : (() => { const colors = getThemeTokens(mode).colors; return { background: colors.screenBackground, surface: colors.surface, soft: colors.softAccent, border: colors.border, text: colors.primaryText, muted: colors.secondaryText, accent: colors.primaryAccent, accentStrong: colors.primaryAccent, onAccent: mode === 'dark' ? colors.screenBackground : '#FFFFFF' }; })();
  if (!visible) return null;
  return <>
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={designPreviewStyles.backdrop} onPress={onClose}>
      <Pressable style={[designPreviewStyles.sheet, { backgroundColor: uiPreview.surface, borderColor: uiPreview.border }]} onPress={(event) => event.stopPropagation()}>
        <View style={designPreviewStyles.header}><View><Text style={[designPreviewStyles.eyebrow, { color: uiPreview.accent }]}>見た目を確認</Text><Text style={[designPreviewStyles.title, { color: uiPreview.text }]}>見た目を試してみよう</Text></View><Pressable onPress={onClose} hitSlop={10}><Text style={[designPreviewStyles.close, { color: uiPreview.muted }]}>×</Text></Pressable></View>
        <Text style={[designPreviewStyles.copy, { color: uiPreview.muted }]}>実際のRhythm画面で、シンプル・デザイン・写真の見え方を確認できます。</Text>
        <View style={designPreviewStyles.modeRow}>
          {([{ id: 'minimal', label: 'ライト' }, { id: 'dark', label: 'ダーク' }, { id: 'chic', label: 'デザイン' }, { id: 'photo', label: '写真' }] as { id: DesignPreviewMode; label: string }[]).map((item) => <Pressable key={item.id} style={[designPreviewStyles.modeChip, { borderColor: uiPreview.border }, mode === item.id && { borderColor: uiPreview.accent, backgroundColor: uiPreview.soft }]} onPress={() => setMode(item.id)}><Text style={[designPreviewStyles.modeChipText, { color: uiPreview.muted }, mode === item.id && { color: uiPreview.accentStrong }]}>{item.label}</Text></Pressable>)}
        </View>
        {mode === 'chic' && <View style={designPreviewStyles.patternRow}>{designPatternChoices.map((item) => { const imageAsset = isImageDesignPattern(item.id) ? designBackgroundAssets[item.id] : undefined; return <Pressable key={item.id} style={[designPreviewStyles.patternChip, pattern === item.id && { borderColor: palette.accent, backgroundColor: palette.accentSoft }]} onPress={() => setPattern(item.id)}>{imageAsset ? <Image source={imageAsset.previewSource} resizeMode="contain" style={designPreviewStyles.patternDot} /> : <View style={[designPreviewStyles.patternDot, { backgroundColor: item.id === 'plain' ? palette.accent : getChicPatternVisual(item.id, palette).accent }]} />}<Text numberOfLines={1} style={[designPreviewStyles.patternText, pattern === item.id && { color: palette.accentStrong }]}>{item.label}</Text></Pressable>; })}</View>}
        <View style={[designPreviewStyles.preview, { backgroundColor: mode === 'photo' ? '#202020' : uiPreview.background, borderColor: uiPreview.border }]}>
          {isFreeFloralSoftPreview ? <View style={designPreviewStyles.floralSoftPreviewCard}>
            {floralSoftPreviewStatus !== 'loaded' && <View style={[StyleSheet.absoluteFillObject, designPreviewStyles.floralSoftPreviewFallback, { backgroundColor: uiPreview.soft }]}>{floralSoftPreviewStatus === 'error' ? <Text style={[designPreviewStyles.floralSoftPreviewError, { color: uiPreview.muted }]}>プレビューを表示できませんでした</Text> : <ActivityIndicator color={uiPreview.accent} />}</View>}
            <Image source={designFloralAssets.floralSoft.previewSource ?? designFloralAssets.floralSoft.source} resizeMode="contain" onLoadStart={() => setFloralSoftPreviewStatus('loading')} onLoad={() => setFloralSoftPreviewStatus('loaded')} onError={() => setFloralSoftPreviewStatus('error')} style={[designPreviewStyles.floralSoftPreviewImage, floralSoftPreviewStatus !== 'loaded' && { opacity: 0 }]} />
            <View style={[designPreviewStyles.floralSoftPreviewNotice, { backgroundColor: uiPreview.surface, borderTopColor: uiPreview.border }]}><Text style={[designPreviewStyles.floralSoftPreviewName, { color: uiPreview.text }]}>花柄2</Text><Text style={[designPreviewStyles.floralSoftPreviewPremium, { color: uiPreview.accent }]}>プレミアム限定デザイン</Text><Text style={[designPreviewStyles.floralSoftPreviewCopy, { color: uiPreview.muted }]}>このデザインを使うにはプレミアム登録が必要です</Text></View>
          </View> : <>
            {mode === 'chic' && (isImageDesignPattern(pattern) ? <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><Image source={designBackgroundAssets[pattern].source} resizeMode="contain" style={StyleSheet.absoluteFillObject} /></View> : <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><ChicPatternDecor pattern={pattern} accent={previewVisual.accent} warm={previewVisual.warm} checkColor={chicCheckColor} preview previewTopCrop={pattern === 'floralSoft'} /></View>)}
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
        <View style={designPreviewStyles.actions}><Pressable style={[designPreviewStyles.secondaryButton, { borderColor: uiPreview.border, backgroundColor: uiPreview.surface }]} onPress={onClose}><Text style={[designPreviewStyles.secondaryButtonText, { color: uiPreview.accent }]} >閉じる</Text></Pressable><Pressable style={[designPreviewStyles.primaryButton, { backgroundColor: uiPreview.accent }]} onPress={() => { if (mode === 'photo' && !photoUri) { onPickPhoto(); return; } onUse(mode, mode === 'chic' ? pattern : undefined); }}><Text style={[designPreviewStyles.primaryButtonText, { color: uiPreview.onAccent }]}>{mode === 'photo' ? (photoUri ? 'この写真を使う' : '写真で試す') : 'このデザインを使う'}</Text></Pressable></View>
      </Pressable>
    </Pressable>
    </Modal>
  </>;
}

function DesignTrialExpiredModal({ visible, trialAvailable = false, designMode, chicPalette, onClose, onDismiss, onPremium, onTrial, onReward }: { visible: boolean; trialAvailable?: boolean; designMode: DesignMode; chicPalette?: ChicThemePalette; onClose: () => void; onDismiss?: () => void; onPremium: () => void; onTrial: () => void; onReward: () => void }) {
  const colors = chicPalette && designMode === 'chic' ? { surface: chicPalette.cardSurface, border: chicPalette.border, text: chicPalette.textPrimary, muted: chicPalette.textSecondary, accent: chicPalette.accent, onAccent: chicPalette.onAccent } : (() => { const theme = getThemeTokens(designMode).colors; return { surface: theme.surface, border: theme.border, text: theme.primaryText, muted: theme.secondaryText, accent: theme.primaryAccent, onAccent: designMode === 'dark' ? theme.screenBackground : '#FFFFFF' }; })();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}><Pressable style={designPreviewStyles.backdrop} onPress={onClose}><Pressable style={[designPreviewStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={(event) => event.stopPropagation()}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={designPreviewStyles.trialSheetContent}><Text style={[designPreviewStyles.eyebrow, { color: colors.accent }]}>デザインカスタマイズ</Text><Text style={[designPreviewStyles.title, { color: colors.text }]}>{trialAvailable ? '24時間無料で試してみますか？' : 'デザインの利用期限が終了しました'}</Text><Text style={[designPreviewStyles.copy, { color: colors.muted }]}>{trialAvailable ? '広告なしで24時間、今試着しているデザインを使えます。' : '広告を1回見ると、デザイン・写真を12時間使えます。購入すると期限なく利用できます。'}</Text>{trialAvailable ? <Pressable style={[designPreviewStyles.primaryButton, designPreviewStyles.trialActionButton, { backgroundColor: colors.accent }]} onPress={onTrial}><Text style={[designPreviewStyles.primaryButtonText, { color: colors.onAccent }]}>24時間無料で使う</Text></Pressable> : <Pressable style={[designPreviewStyles.primaryButton, designPreviewStyles.trialActionButton, { backgroundColor: colors.accent }]} onPress={onReward}><Text style={[designPreviewStyles.primaryButtonText, { color: colors.onAccent }]}>広告を見て12時間使う</Text></Pressable>}<Pressable style={[designPreviewStyles.secondaryButton, designPreviewStyles.trialActionButton, { borderColor: colors.border }]} onPress={onPremium}><Text style={[designPreviewStyles.secondaryButtonText, { color: colors.accent }]}>デザインカスタマイズを購入</Text></Pressable><Pressable style={designPreviewStyles.textButton} onPress={onClose}><Text style={[designPreviewStyles.textButtonText, { color: colors.muted }]}>あとで</Text></Pressable></ScrollView></Pressable></Pressable></Modal>;
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

  function FocusMode({ tasks, designMode, chicPalette, backgroundImageUri, planTier, onPremium, customDurationMinutes, onCustomDurationChange, voiceStartRequest, focusPersistedState, onFocusStateChange, onFocusCompleted, onFocusTaskFinished, onFocusStarted, onFocusNotificationPermission, onFocusRunningChange, onFocusActivityChange, onBehaviorEvent, hapticsEnabled = true, previewCustomDurationOpen = false, previewMode = false }: { tasks: Task[]; designMode: DesignMode; chicPalette?: ChicThemePalette; backgroundImageUri?: string; planTier: PlanTier; onPremium?: (featureId?: PremiumGuideFeatureId) => void; customDurationMinutes?: number; onCustomDurationChange?: (minutes: number) => void; voiceStartRequest?: { durationMinutes: number; id: number }; focusPersistedState?: FocusPersistedState; onFocusStateChange?: (state?: FocusPersistedState) => void; onFocusCompleted: (session: FocusSession) => void; onFocusTaskFinished?: (session: FocusSession) => boolean | void; onFocusStarted?: () => void; onFocusNotificationPermission?: () => Promise<boolean>; onFocusRunningChange?: (running: boolean) => void; onFocusActivityChange?: (state?: { taskTitle?: string; endsAt?: string; elapsedStartAt?: string; elapsedSeconds?: number; remainingSeconds?: number; running?: boolean }) => void; onBehaviorEvent: (event: BehaviorEvent) => void; hapticsEnabled?: boolean; previewCustomDurationOpen?: boolean; previewMode?: boolean }) {
  const availableTasks = React.useMemo(() => {
    const today = dateKey();
    const seenTitles = new Set<string>();
    const bucketOrder: Record<TaskBucket, number> = { now: 0, later: 1, waiting: 2 };
    return tasks.filter((task) => {
      const scheduledDate = normalizeTaskDateKey(task.scheduledDate);
      if (!isRegularVisibleTask(task) || task.done || isTaskSkippedOnDate(task, today) || (scheduledDate && scheduledDate > today)) return false;
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
  const focusElapsedStartAtRef = React.useRef<string | undefined>(undefined);
  const focusStateRestoredRef = React.useRef(false);
  const completionCallbackRef = React.useRef(onFocusCompleted);
  completionCallbackRef.current = onFocusCompleted;
  const behaviorCallbackRef = React.useRef(onBehaviorEvent);
  behaviorCallbackRef.current = onBehaviorEvent;
  const focusNotificationIdRef = React.useRef<string | null>(null);
  const publishFocusState = React.useCallback((runningState: boolean, endAt?: number) => {
    const session = sessionRef.current;
    if (!session) {
      onFocusStateChange?.(undefined);
      return;
    }
    const elapsedSeconds = Math.max(0, session.plannedDurationMinutes * 60 - pausedSecondsRef.current);
    if (runningState || !focusElapsedStartAtRef.current) {
      focusElapsedStartAtRef.current = new Date(Date.now() - elapsedSeconds * 1000).toISOString();
    }
    onFocusStateChange?.({
      sessionId: session.id,
      taskId: session.taskId,
      taskTitle: session.taskTitle,
      plannedDurationMinutes: session.plannedDurationMinutes,
      startedAt: session.startedAt.toISOString(),
      running: runningState,
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      pausedSeconds: pausedSecondsRef.current,
      elapsedStartAt: focusElapsedStartAtRef.current,
    });
    onFocusActivityChange?.({ taskTitle: session.taskTitle, endsAt: endAt ? new Date(endAt).toISOString() : undefined, elapsedStartAt: focusElapsedStartAtRef.current, elapsedSeconds, remainingSeconds: runningState ? undefined : pausedSecondsRef.current, running: runningState });
  }, [onFocusActivityChange, onFocusStateChange]);
  const cancelFocusNotification = React.useCallback((sessionIdOverride?: string) => enqueueNotificationOperation('focus', async () => {
    const notificationId = focusNotificationIdRef.current;
    const sessionId = sessionIdOverride ?? sessionRef.current?.id;
    focusNotificationIdRef.current = null;
    await cancelFocusCompletionNotification(notificationId);
    if (sessionId) await cancelPendingFocusCompletionNotifications(sessionId);
  }), []);

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
    focusElapsedStartAtRef.current = undefined;
    onFocusStateChange?.(undefined);
    onFocusActivityChange?.(undefined);
    behaviorCallbackRef.current(createFocusCompletedBehaviorEvent({ sessionId: activeSession.id, taskId: activeSession.taskId, taskTitle: activeSession.taskTitle, plannedDurationMinutes: activeSession.plannedDurationMinutes, focusStartedAt: activeSession.startedAt, actualAt }));
    setRunning(false);
    onFocusRunningChange?.(false);
    setSecondsLeft(0);
    pausedSecondsRef.current = 0;
    completionCallbackRef.current(session);
    const prompted = onFocusTaskFinished?.(session) === true;
    void cancelFocusNotification(activeSession.id);
    triggerHaptic(hapticsEnabled, [0, 35, 70]);
    if (!prompted) {
      const copy = getFocusCompletionAlertCopy(activeSession.taskTitle);
      Alert.alert(copy.title, copy.message);
    }
  }, [cancelFocusNotification, hapticsEnabled, onFocusRunningChange, onFocusStateChange, onFocusTaskFinished]);

  const stopActiveSession = React.useCallback(() => {
    const activeSession = sessionRef.current;
    if (!activeSession) return;
    sessionRef.current = undefined;
    endAtRef.current = undefined;
    focusElapsedStartAtRef.current = undefined;
    onFocusStateChange?.(undefined);
    onFocusActivityChange?.(undefined);
    behaviorCallbackRef.current(createFocusStoppedEvent({ sessionId: activeSession.id, taskId: activeSession.taskId, taskTitle: activeSession.taskTitle, plannedDurationMinutes: activeSession.plannedDurationMinutes, focusStartedAt: activeSession.startedAt, actualAt: new Date() }));
  }, [onFocusActivityChange, onFocusStateChange]);

  useEffect(() => {
    if (previewMode || focusStateRestoredRef.current || !focusPersistedState) return;
    focusStateRestoredRef.current = true;
    const startedAt = new Date(focusPersistedState.startedAt);
    if (Number.isNaN(startedAt.getTime())) {
      onFocusStateChange?.(undefined);
      return;
    }
    sessionRef.current = {
      id: focusPersistedState.sessionId,
      startedAt,
      taskId: focusPersistedState.taskId,
      taskTitle: focusPersistedState.taskTitle,
      plannedDurationMinutes: focusPersistedState.plannedDurationMinutes,
    };
    setDuration(Math.max(1, focusPersistedState.plannedDurationMinutes));
    pausedSecondsRef.current = Math.max(0, Math.round(focusPersistedState.pausedSeconds));
    const restoredElapsedSeconds = Math.max(0, focusPersistedState.plannedDurationMinutes * 60 - pausedSecondsRef.current);
    focusElapsedStartAtRef.current = focusPersistedState.elapsedStartAt ?? new Date(Date.now() - restoredElapsedSeconds * 1000).toISOString();
    if (!focusPersistedState.elapsedStartAt) onFocusStateChange?.({ ...focusPersistedState, elapsedStartAt: focusElapsedStartAtRef.current });
    const savedEndAt = focusPersistedState.endAt ? Date.parse(focusPersistedState.endAt) : undefined;
    if (focusPersistedState.running && savedEndAt && savedEndAt > Date.now()) {
      endAtRef.current = savedEndAt;
      const remaining = Math.max(0, Math.ceil((savedEndAt - Date.now()) / 1000));
      pausedSecondsRef.current = remaining;
      setSecondsLeft(remaining);
      setRunning(true);
      onFocusRunningChange?.(true);
      onFocusActivityChange?.({ taskTitle: sessionRef.current.taskTitle, endsAt: new Date(savedEndAt).toISOString(), elapsedStartAt: focusElapsedStartAtRef.current, elapsedSeconds: restoredElapsedSeconds, running: true });
      return;
    }
    if (focusPersistedState.running && savedEndAt && savedEndAt <= Date.now()) {
      setSecondsLeft(0);
      pausedSecondsRef.current = 0;
      finishSession();
      return;
    }
    endAtRef.current = undefined;
    setSecondsLeft(pausedSecondsRef.current || focusPersistedState.plannedDurationMinutes * 60);
    setRunning(false);
    onFocusRunningChange?.(false);
    onFocusActivityChange?.({ taskTitle: sessionRef.current.taskTitle, elapsedStartAt: focusElapsedStartAtRef.current, elapsedSeconds: restoredElapsedSeconds, remainingSeconds: pausedSecondsRef.current, running: false });
  }, [finishSession, focusPersistedState, onFocusActivityChange, onFocusRunningChange, onFocusStateChange, previewMode]);

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
    focusElapsedStartAtRef.current = undefined;
    onFocusStateChange?.(undefined);
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
    focusElapsedStartAtRef.current = undefined;
    onFocusStateChange?.(undefined);
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
      // Pause is not a session end: retain the same session id and startedAt
      // so Resume continues the original focus session without emitting a
      // second focus_started or a premature focus_stopped event.
      endAtRef.current = undefined;
      setRunning(false);
      onFocusRunningChange?.(false);
      publishFocusState(false);
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
    publishFocusState(true, endAtRef.current);
    setRunning(true);
    onFocusRunningChange?.(true);
    if (sessionRef.current) {
      void enqueueNotificationOperation('focus', async () => {
        const notificationId = focusNotificationIdRef.current;
        const sessionId = sessionRef.current?.id;
        focusNotificationIdRef.current = null;
        await cancelFocusCompletionNotification(notificationId);
        if (sessionId) await cancelPendingFocusCompletionNotifications(sessionId);
        if (!sessionRef.current || !endAtRef.current) return;
        const scheduledId = await scheduleFocusCompletionNotification({ timerId: sessionRef.current.id, endAt: new Date(endAtRef.current).toISOString(), taskTitle: sessionRef.current.taskTitle, permissionGranted: notificationPermissionGranted });
        focusNotificationIdRef.current = scheduledId;
      }).catch((error) => {
        if (__DEV__) console.warn('[Notifications] focus completion scheduling failed', error);
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
  tasks.filter((task) => isRegularVisibleTask(task)).filter((task) => {
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
  const selectedTasks = tasks.filter((task) => isRegularVisibleTask(task) && !task.done && taskDates(task).includes(selectedDate));
  const selectedCompletedTasks = tasks.filter((task) => isRegularVisibleTask(task) && task.done && taskDates(task).includes(selectedDate));
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
    const freeTasks = tasks.filter((task) => isRegularVisibleTask(task) && !task.done && taskDates(task).includes(freeSelected));
    const freeCompletedTasks = tasks.filter((task) => isRegularVisibleTask(task) && task.done && taskDates(task).includes(freeSelected));
    const freePlans = plans.filter((item) => isPlanOnDate(item, freeSelected));
    const visibleFreeTasks = scheduleFilter === 'plans' ? [] : freeTasks;
    const visibleFreeCompletedTasks = scheduleFilter === 'plans' ? [] : freeCompletedTasks;
    const freePlanEntries = scheduleFilter === 'tasks' ? [] : freePlans;
    const visibleFreePlans = freePlanEntries.slice(0, calendarPlanDisplayLimit);
    const hiddenFreePlanCount = Math.max(0, freePlanEntries.length - visibleFreePlans.length);
    return <>
      <View style={[styles.scheduleCalendarCard, designMode !== 'chic' && styles.scheduleCalendarCardMinimal, isDark && styles.darkSurface, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: designMode !== 'chic' ? 16 : theme.radius.large }]}>
        <View style={styles.scheduleCalendarHeader}><View><Text style={[styles.scheduleMonthTitle, isDark && styles.darkCalendarText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>これから7日間</Text><Text style={[styles.scheduleMonthCopy, isDark && styles.darkCalendarAccent, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>今日から6日後までの予定</Text></View><Pressable onPress={() => onPremium('month')}><Text style={[styles.scheduleAgendaEdit, { color: designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }, isDark && styles.darkCalendarAccent]}>月表示 Premium</Text></Pressable></View>
        <ScheduleFilterChips value={scheduleFilter} designMode={designMode} chicPalette={chicPalette} onChange={setScheduleFilter} compact />
        <View style={styles.scheduleGrid}>{freeDates.map(({ date, key }) => {
          const selected = key === freeSelected;
          const taskCount = scheduleFilter === 'plans' ? 0 : tasks.filter((task) => isRegularVisibleTask(task) && taskDates(task).includes(key)).length;
          const planCount = scheduleFilter === 'tasks' ? 0 : plans.filter((item) => isPlanOnDate(item, key)).length;
          const count = taskCount + planCount;
        return <Pressable key={key} style={[styles.scheduleDayCell, isDark && styles.scheduleDayCellDark, selected && styles.scheduleDayCellSelected, selected && { backgroundColor: designMode === 'chic' && chicPalette ? chicPalette.accentSoft : theme.colors.softAccent, borderColor: designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }]} onPress={() => setSelectedDate(key)}><Text style={[styles.scheduleDayNumber, isDark && styles.darkBodyText, date.getDay() === 0 && styles.scheduleSundayNumber, date.getDay() === 6 && styles.scheduleSaturdayNumber, selected && styles.scheduleSelectedNumber, selected && isDark && styles.scheduleSelectedNumberDark, selected && { color: designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent }]}>{date.getMonth() + 1}/{date.getDate()}</Text>{calendarMarks[key] && <Text style={[styles.scheduleCalendarMark, { color: designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent }]}>{calendarMarks[key]}</Text>}{count > 0 && <Text style={[styles.scheduleMoreText, isDark && styles.darkMutedText, selected && styles.scheduleMoreTextSelected, selected && { color: designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.colors.primaryAccent }]}>{count}件</Text>}</Pressable>;
        })}</View>
      </View>
      <CalendarMarkPicker date={freeSelected} mark={calendarMarks[freeSelected]} onSet={onSetCalendarMark} designMode={designMode} chicPalette={chicPalette} />
      <View style={[styles.scheduleAgendaHeader, isDark && styles.darkPanel, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{freeSelected.replaceAll('-', '.')} の予定</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{visibleFreeTasks.length + visibleFreeCompletedTasks.length + visibleFreePlans.length}件</Text></View>
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
        <View><Text style={[styles.scheduleMonthTitle, isDark && styles.darkCalendarText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{year}年 {month + 1}月</Text><Text style={[styles.scheduleMonthCopy, isDark && styles.darkCalendarAccent, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>予定をまとめて見渡す</Text></View>
        <Pressable style={[styles.scheduleMonthArrow, isDark && styles.scheduleMonthArrowDark]} onPress={() => moveMonth(1)}><Text style={[styles.scheduleMonthArrowText, isDark && styles.scheduleMonthArrowTextDark]}>›</Text></Pressable>
      </View>
      <ScheduleFilterChips value={scheduleFilter} designMode={designMode} chicPalette={chicPalette} onChange={setScheduleFilter} compact />
      <View style={styles.scheduleWeekRow}>{['日','月','火','水','木','金','土'].map((label) => <Text key={label} style={[styles.scheduleWeekLabel, isDark && styles.darkCalendarAccent]}>{label}</Text>)}</View>
      <View style={styles.scheduleGrid}>{cells.map((date, index) => {
        if (!date) return <View key={`empty-${index}`} style={styles.scheduleDayCell} />;
        const key = dateKey(date);
        const dayTasks = scheduleFilter === 'plans' ? [] : tasks.filter((task) => isRegularVisibleTask(task) && !task.done && taskDates(task).includes(key));
        const dayCompletedTasks = scheduleFilter === 'plans' ? [] : tasks.filter((task) => isRegularVisibleTask(task) && task.done && taskDates(task).includes(key));
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
    <View style={[styles.scheduleAgendaHeader, isDark && styles.darkPanel, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{selectedDate.replaceAll('-', '.')} の予定</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{visibleSelectedTasks.length + visibleSelectedCompletedTasks.length + visibleSelectedPlans.length + visibleSelectedExternalEvents.length}件</Text></View>
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

const HEART_DECORATIONS = [
  // Keep the upper third visibly heart-led while leaving the title, buttons,
  // and tab labels readable. Positions are fixed so a rerender never changes
  // the pattern's rhythm.
  { left: '4%', top: '5%', size: 16, glyph: '♥', opacity: 0.34, rotate: '-12deg' },
  { left: '17%', top: '2%', size: 10, glyph: '♡', opacity: 0.28, rotate: '9deg' },
  { left: '8%', top: '12%', size: 18, glyph: '♥', opacity: 0.27, rotate: '6deg' },
  { left: '31%', top: '7%', size: 23, glyph: '♥', opacity: 0.3, rotate: '-8deg' },
  { left: '38%', top: '2%', size: 15, glyph: '♥', opacity: 0.25, rotate: '-10deg' },
  { left: '47%', top: '3%', size: 11, glyph: '♡', opacity: 0.26, rotate: '12deg' },
  { left: '61%', top: '9%', size: 15, glyph: '♥', opacity: 0.31, rotate: '-10deg' },
  { left: '68%', top: '13%', size: 11, glyph: '♡', opacity: 0.24, rotate: '8deg' },
  { left: '76%', top: '3%', size: 10, glyph: '♡', opacity: 0.3, rotate: '8deg' },
  { left: '91%', top: '8%', size: 22, glyph: '♥', opacity: 0.32, rotate: '11deg' },
  { left: '97%', top: '16%', size: 16, glyph: '♥', opacity: 0.26, rotate: '-7deg' },
  { left: '10%', top: '17%', size: 12, glyph: '♡', opacity: 0.27, rotate: '-7deg' },
  { left: '23%', top: '20%', size: 17, glyph: '♥', opacity: 0.32, rotate: '8deg' },
  { left: '40%', top: '15%', size: 10, glyph: '♥', opacity: 0.24, rotate: '-12deg' },
  { left: '55%', top: '22%', size: 26, glyph: '♡', opacity: 0.29, rotate: '7deg' },
  { left: '70%', top: '16%', size: 13, glyph: '♥', opacity: 0.3, rotate: '-8deg' },
  { left: '84%', top: '22%', size: 17, glyph: '♡', opacity: 0.28, rotate: '10deg' },
  { left: '96%', top: '28%', size: 11, glyph: '♥', opacity: 0.25, rotate: '-10deg' },
  { left: '14%', top: '26%', size: 22, glyph: '♡', opacity: 0.23, rotate: '8deg' },
  { left: '32%', top: '29%', size: 12, glyph: '♥', opacity: 0.22, rotate: '-8deg' },
  { left: '5%', top: '31%', size: 20, glyph: '♥', opacity: 0.3, rotate: '8deg' },
  { left: '18%', top: '37%', size: 10, glyph: '♡', opacity: 0.23, rotate: '-12deg' },
  { left: '38%', top: '33%', size: 14, glyph: '♥', opacity: 0.27, rotate: '6deg' },
  { left: '58%', top: '31%', size: 18, glyph: '♥', opacity: 0.25, rotate: '-6deg' },
  { left: '67%', top: '35%', size: 12, glyph: '♡', opacity: 0.24, rotate: '-8deg' },
  { left: '88%', top: '39%', size: 21, glyph: '♥', opacity: 0.29, rotate: '10deg' },
  { left: '2%', top: '51%', size: 13, glyph: '♡', opacity: 0.25, rotate: '-9deg' },
  { left: '27%', top: '54%', size: 16, glyph: '♥', opacity: 0.26, rotate: '9deg' },
  { left: '52%', top: '49%', size: 10, glyph: '♡', opacity: 0.23, rotate: '-7deg' },
  { left: '76%', top: '56%', size: 18, glyph: '♥', opacity: 0.28, rotate: '-11deg' },
  { left: '94%', top: '61%', size: 12, glyph: '♡', opacity: 0.25, rotate: '8deg' },
  { left: '14%', top: '61%', size: 15, glyph: '♥', opacity: 0.24, rotate: '-8deg' },
  { left: '43%', top: '63%', size: 23, glyph: '♡', opacity: 0.24, rotate: '7deg' },
  { left: '9%', top: '69%', size: 22, glyph: '♥', opacity: 0.3, rotate: '-8deg' },
  { left: '34%', top: '72%', size: 11, glyph: '♡', opacity: 0.23, rotate: '10deg' },
  { left: '59%', top: '68%', size: 15, glyph: '♥', opacity: 0.27, rotate: '-6deg' },
  { left: '83%', top: '73%', size: 24, glyph: '♡', opacity: 0.28, rotate: '8deg' },
  { left: '18%', top: '87%', size: 17, glyph: '♥', opacity: 0.3, rotate: '-8deg' },
  { left: '47%', top: '91%', size: 12, glyph: '♡', opacity: 0.25, rotate: '7deg' },
  { left: '72%', top: '88%', size: 20, glyph: '♥', opacity: 0.28, rotate: '-10deg' },
  { left: '31%', top: '95%', size: 16, glyph: '♥', opacity: 0.25, rotate: '8deg' },
  { left: '69%', top: '79%', size: 11, glyph: '♥', opacity: 0.23, rotate: '-6deg' },
  { left: '94%', top: '94%', size: 10, glyph: '♡', opacity: 0.24, rotate: '9deg' },
] as const;

const HEART_CONFETTI = [
  { left: '17%', top: '16%', rotate: '28deg' }, { left: '63%', top: '5%', rotate: '-24deg' },
  { left: '36%', top: '37%', rotate: '-18deg' }, { left: '88%', top: '24%', rotate: '22deg' },
  { left: '9%', top: '73%', rotate: '-26deg' }, { left: '55%', top: '73%', rotate: '18deg' },
];

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
  if (pattern === 'heart') return <View pointerEvents="none" style={[styles.patternLayer, { backgroundColor: 'transparent' }]}>
    {HEART_DECORATIONS.map((item, index) => <Text key={`heart-${index}`} style={{ position: 'absolute', left: item.left as any, top: item.top as any, fontSize: compact ? Math.max(8, item.size - 3) : item.size, lineHeight: compact ? item.size : item.size + 3, color: accent, opacity: item.opacity, transform: [{ rotate: item.rotate }] }}>{item.glyph}</Text>)}
    {HEART_CONFETTI.map((item, index) => <View key={`heart-confetti-${index}`} style={{ position: 'absolute', left: item.left as any, top: item.top as any, width: compact ? 4 : 6, height: compact ? 9 : 13, borderRadius: 1, backgroundColor: warm, opacity: 0.45, transform: [{ rotate: item.rotate }] }} />)}
    {['18%', '48%', '79%'].map((left, index) => <View key={`heart-dot-${index}`} style={{ position: 'absolute', left: left as any, top: `${20 + index * 23}%` as any, width: compact ? 3 : 4, height: compact ? 3 : 4, borderRadius: 3, backgroundColor: accent, opacity: 0.3 }} />)}
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
  const visiblePatterns = designMode === 'photo' ? designPatternChoices.filter((item) => item.id === 'plain') : designPatternChoices;
  const selectedPalette = chicPattern === 'nightSky' ? getNightSkyPalette(getChicCheckColor(chicCheckColor)) : getChicCheckColor(chicCheckColor);
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
        const imageAsset = isImageDesignPattern(item.id) ? designBackgroundAssets[item.id] : undefined;
        return <Pressable key={item.id} style={[styles.patternChoice, { backgroundColor: choicePalette.cardSurface, borderColor: selected ? choicePalette.accent : choicePalette.border }, selected && { borderWidth: 2 }]} onPress={() => { if (locked) { onPreview(item.id); return; } onPattern(item.id); }}>
          <View style={[styles.patternSwatch, styles.patternSwatchLarge, { backgroundColor: imageAsset?.background ?? patternBase, borderColor: choicePalette.border, borderWidth: 1 }]}>{imageAsset ? <Image source={imageAsset.previewSource} resizeMode="contain" style={StyleSheet.absoluteFillObject} /> : <ChicPatternDecor pattern={item.id} accent={visual.accent} warm={patternStripe} density="compact" checkColor={chicCheckColor} preview previewTopCrop={item.id === 'floralSoft'} />}</View>
          <Text numberOfLines={2} ellipsizeMode="clip" style={[styles.patternChoiceText, { color: selected ? choicePalette.accentStrong : choicePalette.textSecondary }]}>{item.label}{locked ? ' 🔒' : ''}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

/** Compact shared palette picker. It is intentionally independent of the
 * Design pattern picker so Mono, Design and Photo all use the same source of
 * truth without showing a large nine-card palette by default. */
function ThemeColorSelector({ color, onChange, designMode }: { color: ChicCheckColor; onChange: (color: ChicCheckColor) => void; designMode: DesignMode }) {
  const [expanded, setExpanded] = useState(false);
  const selected = getChicCheckColor(color);
  const selectedLabel = getDesignCheckColorLabel(color);
  const textColor = designMode === 'dark' ? '#F4F7FC' : selected.textPrimary;
  return <View style={[styles.themeColorSelector, { borderColor: selected.border, backgroundColor: designMode === 'dark' ? '#181F2E' : selected.cardSurface }]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={styles.themeColorSelectorHeader}>
      <View style={[styles.themeColorSelectorSwatch, { backgroundColor: selected.accent, borderColor: selected.border }]} />
      <Text style={[styles.themeColorSelectorLabel, { color: textColor }]} numberOfLines={1}>{selectedLabel}</Text>
      <Text style={[styles.themeColorSelectorChevron, { color: selected.accent }]}>{expanded ? '⌃' : '⌄'}</Text>
    </Pressable>
    {expanded && <View style={[styles.themeColorGrid, { borderTopColor: selected.border }]}>
      {chicCheckColorChoices.map((choice) => {
        const active = choice.id === color;
        return <Pressable key={choice.id} accessibilityRole="button" accessibilityLabel={getDesignCheckColorLabel(choice.id)} accessibilityState={{ selected: active }} onPress={() => { onChange(choice.id); setExpanded(false); }} style={[styles.themeColorGridItem, { backgroundColor: designMode === 'dark' ? '#20293A' : choice.cardSurface, borderColor: active ? choice.accent : choice.border }, active && { borderWidth: 2 }]}>
          <View style={[styles.themeColorGridSwatch, { backgroundColor: choice.accent, borderColor: choice.border }]} />
          <Text style={[styles.themeColorGridText, { color: active ? choice.accent : (designMode === 'dark' ? '#D7DEEA' : choice.textSecondary) }]} numberOfLines={1}>{getDesignCheckColorLabel(choice.id)}</Text>
        </Pressable>;
      })}
    </View>}
  </View>;
}

function SettingsDisclosure({ title, subtitle, expanded, onPress, children, designMode, chicPalette, icon, headerAction }: { title: string; subtitle: string; expanded: boolean; onPress: () => void; children: React.ReactNode; designMode?: DesignMode; chicPalette?: ChicThemePalette; icon?: PremiumFeatureIconName; headerAction?: React.ReactNode }) {
  const isDark = designMode === 'dark';
  const isChic = designMode === 'chic' && !!chicPalette;
  const theme = getThemeTokens(designMode ?? 'minimal', chicPalette?.id ?? 'cool').colors;
  const textPrimary = isChic ? chicPalette!.textPrimary : theme.primaryText;
  const textSecondary = isChic ? chicPalette!.textSecondary : theme.secondaryText;
  const accent = isChic ? chicPalette!.accent : theme.primaryAccent;
  const headerStyle = [styles.settingsDisclosureHeader, isDark && styles.darkSurface, isChic && { backgroundColor: chicPalette!.cardSurface, borderColor: chicPalette!.border }];
  const headerContent = <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
    {icon ? <View style={{ width: 32, alignItems: 'flex-start' }}><PremiumFeatureIcon name={icon} color={expanded ? accent : textSecondary} /></View> : null}
    <View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.settingsDisclosureTitle, { color: textPrimary }]}>{title}</Text><Text style={[styles.settingsDisclosureSubtitle, { color: textSecondary }]}>{subtitle}</Text></View>
  </View>;
  const chevron = <Text style={[styles.settingsDisclosureChevron, { color: accent }]}>{expanded ? '⌃' : '⌄'}</Text>;
  return <View style={styles.settingsDisclosure}>
    {headerAction ? <View style={headerStyle}>
      <Pressable style={{ flex: 1, minWidth: 0 }} onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded }}>{headerContent}</Pressable>
      {headerAction}
      <Pressable style={{ minWidth: 32, minHeight: 40, alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 4 }} onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded }}>{chevron}</Pressable>
    </View> : <Pressable style={headerStyle} onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded }}>
      {headerContent}
      {chevron}
    </Pressable>}
    {expanded && <View style={styles.settingsDisclosureBody}>{children}</View>}
  </View>;
}

function MonoLooseLeafBackground({ dark }: { dark: boolean }) {
  const backgroundColor = dark ? '#171B24' : '#F7F5EF';
  const lineColor = dark ? 'rgba(190,200,220,0.10)' : 'rgba(120,110,90,0.12)';
  const marginColor = dark ? 'rgba(220,150,160,0.18)' : 'rgba(190,120,125,0.18)';
  const holeColor = dark ? '#10141C' : '#E8E3D9';
  return <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor }]}>
    {Array.from({ length: 28 }, (_, index) => <View key={`line-${index}`} style={{ position: 'absolute', left: 0, right: 0, top: 28 + index * 30, height: 1, backgroundColor: lineColor }} />)}
    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 42, width: 1, backgroundColor: marginColor }} />
    {Array.from({ length: 14 }, (_, index) => <View key={`hole-${index}`} style={{ position: 'absolute', left: 10, top: 17 + index * 48, width: 12, height: 12, borderRadius: 6, backgroundColor: holeColor, borderWidth: 1, borderColor: lineColor }} />)}
  </View>;
}

function MonoChicBackground({ dark }: { dark: boolean }) {
  const backgroundColor = dark ? '#101722' : '#F1F0EB';
  const panelColors = dark
    ? ['rgba(31, 48, 70, 0.72)', 'rgba(18, 31, 50, 0.58)', 'rgba(47, 62, 78, 0.32)']
    : ['rgba(221, 219, 211, 0.62)', 'rgba(246, 245, 240, 0.72)', 'rgba(205, 202, 191, 0.26)'];
  const lineColor = dark ? 'rgba(222, 187, 112, 0.52)' : 'rgba(125, 104, 58, 0.42)';
  const dotColor = dark ? 'rgba(222, 187, 112, 0.48)' : 'rgba(125, 104, 58, 0.34)';
  const dots = [
    { left: '67%', top: '13%' }, { left: '72%', top: '13%' }, { left: '77%', top: '13%' },
    { left: '67%', top: '18%' }, { left: '72%', top: '18%' }, { left: '77%', top: '18%' },
    { left: '67%', top: '23%' }, { left: '72%', top: '23%' }, { left: '77%', top: '23%' },
    { left: '67%', top: '28%' }, { left: '72%', top: '28%' }, { left: '77%', top: '28%' },
    { left: '67%', top: '33%' }, { left: '72%', top: '33%' }, { left: '77%', top: '33%' },
    { left: '83%', top: '78%' }, { left: '88%', top: '78%' }, { left: '93%', top: '78%' },
    { left: '83%', top: '83%' }, { left: '88%', top: '83%' }, { left: '93%', top: '83%' },
  ];
  return <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor }]}>
    <View style={{ position: 'absolute', width: '145%', height: '43%', left: '-35%' as any, top: '7%' as any, backgroundColor: panelColors[0], transform: [{ rotate: '-27deg' }] }} />
    <View style={{ position: 'absolute', width: '125%', height: '36%', left: '24%' as any, top: '37%' as any, backgroundColor: panelColors[1], transform: [{ rotate: '-27deg' }] }} />
    <View style={{ position: 'absolute', width: '120%', height: '22%', left: '-20%' as any, bottom: '1%' as any, backgroundColor: panelColors[2], transform: [{ rotate: '-27deg' }] }} />
    <View style={{ position: 'absolute', width: '130%', height: 1, left: '-12%' as any, top: '21%' as any, backgroundColor: lineColor, transform: [{ rotate: '-45deg' }] }} />
    <View style={{ position: 'absolute', width: '120%', height: 1, left: '10%' as any, top: '67%' as any, backgroundColor: lineColor, transform: [{ rotate: '-45deg' }] }} />
    {dots.map((dot, index) => <View key={`chic-dot-${index}`} style={{ position: 'absolute', left: dot.left as any, top: dot.top as any, width: 4, height: 4, borderRadius: 2, backgroundColor: dotColor }} />)}
  </View>;
}

function NotificationManagerCard({ designMode, chicPalette, readOnly = false }: { designMode?: DesignMode; chicPalette?: ChicThemePalette; readOnly?: boolean }) {
  const isDark = designMode === 'dark';
  const isChic = designMode === 'chic' && !!chicPalette;
  const theme = getThemeTokens(designMode ?? 'minimal', chicPalette?.id ?? 'cool').colors;
  const notificationColors = isChic ? {
    surface: chicPalette!.cardSurface,
    border: chicPalette!.border,
    text: chicPalette!.textPrimary,
    muted: chicPalette!.textSecondary,
    accent: chicPalette!.accent,
    danger: chicPalette!.danger,
  } : {
    surface: theme.surface,
    border: theme.border,
    text: theme.primaryText,
    muted: theme.secondaryText,
    accent: theme.primaryAccent,
    danger: theme.danger,
  };
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
  if (readOnly) return <View style={[styles.notificationManagerCard, isDark && styles.darkSurface, isChic && { backgroundColor: notificationColors.surface, borderColor: notificationColors.border }]}><View style={styles.notificationManagerHeader}><View><Text style={[styles.settingsTitle, { color: notificationColors.text }]}>高度な通知</Text><Text style={[styles.switchCopy, { color: notificationColors.muted }]}>段階的な通知を設定できます</Text></View><Text style={[styles.notificationRefreshText, { color: notificationColors.accent }]}>Premium</Text></View>{[['09:00', 'そろそろ始められそう？'], ['09:05', 'もう一度確認しよう'], ['09:08', '今からできることを選ぶ']].map(([time, copy]) => <View key={time} style={styles.notificationPendingRow}><View style={[styles.notificationPendingDot, { backgroundColor: notificationColors.accent }]} /><View style={{ flex: 1 }}><Text style={[styles.notificationPendingTitle, { color: notificationColors.text }]}>{time}</Text><Text style={[styles.notificationPendingBody, { color: notificationColors.muted }]}>{copy}</Text></View></View>)}</View>;
  return <View style={[styles.notificationManagerCard, isDark && styles.darkSurface, isChic && { backgroundColor: notificationColors.surface, borderColor: notificationColors.border }]}>
    <View style={styles.notificationManagerHeader}><View><Text style={[styles.settingsTitle, { color: notificationColors.text }]}>通知管理</Text><Text style={[styles.switchCopy, { color: notificationColors.muted }]}>{loading ? '確認中…' : `${pending.length}件の通知を予約中`}</Text></View><Pressable style={styles.notificationRefresh} onPress={() => void refresh()}><Text style={[styles.notificationRefreshText, { color: notificationColors.accent }]}>更新</Text></Pressable></View>
    {pending.slice(0, 4).map((request) => <View key={request.identifier} style={styles.notificationPendingRow}><View style={[styles.notificationPendingDot, { backgroundColor: notificationColors.accent }]} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.notificationPendingTitle, { color: notificationColors.text }]}>{request.content.title ?? '通知'}</Text><Text numberOfLines={1} style={[styles.notificationPendingBody, { color: notificationColors.muted }]}>{request.content.body ?? ''}</Text></View></View>)}
    {pending.length > 4 && <Text style={[styles.notificationMore, { color: notificationColors.muted }]}>ほか{pending.length - 4}件</Text>}
    <Pressable disabled={pending.length === 0} style={[styles.notificationStopButton, isChic && { borderColor: notificationColors.danger }, pending.length === 0 && styles.batchDisabled]} onPress={stopAll}><Text style={[styles.notificationStopText, isChic && { color: notificationColors.danger }]}>予約通知をすべて停止</Text></Pressable>
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
  const scheduledToday = tasks.filter((task) => isRegularVisibleTask(task) && (!task.scheduledDate || normalizeTaskDateKey(task.scheduledDate)! <= todayKey)).filter((task) => !isTaskSkippedOnDate(task, todayKey));
  const completedToday = tasks.filter((task) => task.done && task.completedAt && dateKey(task.completedAt) === todayKey);
  const count = completedToday.reduce((sum, task) => sum + (task.subtasks?.length ? task.subtasks.filter((item) => item.done).length : 1), 0);
  const drop = React.useRef(new Animated.Value(1)).current;
  const previous = React.useRef(count);
  const [dropVisible, setDropVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const nextNowTask = selectCurrentTask(
    scheduledToday.filter((task) => !task.done && (task.bucket ?? 'now') === 'now'),
    now,
  );
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Pressable disabled={!nextNowTask || !onToggleTask} onPress={(event) => { event.stopPropagation(); if (nextNowTask) onToggleTask?.(nextNowTask.id); }} style={[styles.check, designMode === 'dark' && styles.checkDark, nextNowTaskChecked && styles.checkDone, nextNowTaskSelected && styles.selectionChecked]}><Text style={styles.checkMark}>{nextNowTaskChecked ? '✓' : ''}</Text></Pressable><Pressable disabled={!nextNowTask || !onOpenTaskActions} onPress={(event) => { event.stopPropagation(); if (nextNowTask) onOpenTaskActions?.(nextNowTask); }} style={{ flex: 1 }}><Text numberOfLines={2} adjustsFontSizeToFit={scheduledToday.length === 0} minimumFontScale={0.9} style={[styles.todayHeroMinimalTask, designMode === 'dark' && styles.todayHeroMinimalTextDark]}>{nextNowTask ? nextNowTask.title : scheduledToday.length === 0 ? '今日はまだ未登録' : remainingNow === 0 ? '今日の分は完了。いい感じ' : '次にやる1つをここで決めます'}</Text></Pressable></View>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Pressable disabled={!nextNowTask || !onToggleTask} onPress={(event) => { event.stopPropagation(); if (nextNowTask) onToggleTask?.(nextNowTask.id); }} style={[styles.check, nextNowTaskChecked && styles.checkDone, nextNowTaskSelected && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }, { borderColor: chicPalette.accent }]}><Text style={styles.checkMark}>{nextNowTaskChecked ? '✓' : ''}</Text></Pressable><Pressable disabled={!nextNowTask || !onOpenTaskActions} onPress={(event) => { event.stopPropagation(); if (nextNowTask) onOpenTaskActions?.(nextNowTask); }} style={{ flex: 1 }}><Text numberOfLines={2} adjustsFontSizeToFit={scheduledToday.length === 0} minimumFontScale={0.9} style={[styles.todayHeroCopy, { color: chicPalette.textPrimary }]}>{nextNowTask ? nextNowTask.title : scheduledToday.length === 0 ? '今日はまだ未登録' : remainingNow === 0 ? '今日の分は完了。いい感じ' : '次にやる1つをここで決めます'}</Text></Pressable></View>
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
