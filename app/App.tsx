import { PhotoReadableBand } from './components/SurfaceFade';
import { canUsePhotoKind, rewardPhotoTarget, isPhotoRewardFeature, photoAccessLabel, photoRewardProgress, type PhotoKind } from './features/photo/photoAccess';
import { photoKind, restoreSamplePhotoUris, visiblePhotoSettings, withoutTopPhoto } from './features/photo/photoSamples';
import { usePhotoEntryHint } from './features/onboarding/usePhotoEntryHint';
import { PhotoEntrySheet, PhotoTopEntry } from './components/PhotoEntry';
import { useRhythmPersistence } from './storage/useRhythmPersistence';
import { usePhotoTheme } from './features/photo/usePhotoTheme';
import { ensureNotifications, scheduleAffirmationNotification } from './features/notifications/notificationSetup';
import { type DepartureNotificationAction, departureNotificationActions } from './features/departure/departureNotifications';
import { getInitialNormalizedCrop } from './features/photo/topImageCrop';
import { INITIAL_APP_NOTICES } from './components/NoticeModals';
import { type ModalPalette, popupSheetStyle } from './components/modalPalette';
import { FocusRuntimeStatus, getFocusAvailableTasks, showFocusCompletionAlert, FocusMode, FocusTaskCompletionModal } from './components/FocusModeView';
import { DailyScheduleTimeline, TaskScheduleCalendar } from './components/ScheduleCalendar';
import { AppNoticeCenter, TomorrowPrepModal } from './components/NoticeModals';
import { SettingsDisclosure } from './components/SettingsDisclosure';
import { AchievementVessel } from './components/AchievementVessel';
import { TodayWinStrip } from './components/TodayWinStrip';
import { ChicPatternSelector } from './components/ChicPatternSelector';
import { DesignPreviewModal, DesignTrialExpiredModal, DesignTryOnModal, type DesignPreviewMode, type DesignTryOnSelection } from './components/DesignModals';
export { DesignTryOnModal } from './components/DesignModals';
import * as Calendar from 'expo-calendar';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { ChicCheckColor, ChicPattern, ChicThemePalette, DesignMode, chicCheckColorChoices, getChicCheckColor, getDesignCheckColorLabel, getDesignCheckThemeTokens, getDesignPatternThemeTokens, getThemeTokens, normalizeChicCheckColor, normalizeChicPattern } from './theme';
import { RecoveryRecord } from './recovery';
import { FocusSession } from './focusSession';
import { createDepartureCheckIn, DepartureCheckIn } from './departureCheckIn';
import { getEffectiveChicPattern, getEffectiveNudgeMode, hasPremiumAccess, PlanTier } from './premiumAccess';
import { AnalysisScreen } from './AnalysisScreen';
import { BThemeRibbonDecoration, BThemeRibbonPreload } from './components/BThemeRibbonDecoration';
import { CThemeRibbonDecoration, CThemeRibbonPreload } from './components/CThemeRibbonDecoration';
import { appendBehaviorEvent, appendBehaviorEvents, BehaviorEvent, createDeparturePreparationStartedEvent, createDepartureStartedEvent, createNotificationActionEvent, createNotificationScheduledEvent, createRoutineDeactivatedBehaviorEvent, createRoutineStateChangedBehaviorEvent, createTaskCompletedBehaviorEvent, createTaskCompletionRevertedBehaviorEvent, NotificationAction } from './behaviorEvents';
import { DEFAULT_PREMIUM_GUIDE_FEATURE, PremiumGuideFeatureId } from './premiumGuide';
import { createPremiumTaskTemplate, hasSameTemplateSettings, PremiumTaskTemplate, summarizePremiumTaskTemplate } from './taskTemplates';
import { Header } from './components/Header';
import { HomeScreen } from './screens/HomeScreen';
import { DepartureCountdownCard, TimelineScreen } from './screens/TimelineScreen';
import { DesignAppliedPreview, SettingsScreen } from './screens/SettingsScreen';
import { HistoryScreen, MonthlyReflectionCardView, ReflectionCardModel } from './screens/HistoryScreen';
import { TaskModal } from './components/TaskModal';
import { mergeTaskMemoEdit, taskWithUnifiedMemos } from './features/tasks/taskMemos';
import { BulkTaskModal } from './components/BulkTaskModal';
import { DeparturePlanForm } from './components/DeparturePlanForm';
import { AffirmationSettingsCard, MAX_AFFIRMATIONS } from './components/AffirmationSettingsCard';
import { PremiumFeatureIcon, PremiumModal, type PremiumFeatureIconName } from './components/PremiumModal';
import { PremiumTrialStarted, useRhythmStoreKit } from './features/purchases/useRhythmStoreKit';
import { STORE_PRODUCT_IDS } from './features/purchases/storeProducts';
import { RewardedAccessModal, RewardedAccessResult } from './components/RewardedAccessModal';
import { BottomNav, getBottomNavTopOffset } from './components/BottomNav';
import { NotificationManagerCard } from './components/NotificationManagerCard';
import { OnboardingCarousel } from './features/onboarding/OnboardingCarousel';
import { OnboardingCaptureStudio } from './features/onboarding/OnboardingCaptureStudio';
import { OnboardingHint } from './features/onboarding/OnboardingHint';
import { FREE_GUIDE_TOUR, PREMIUM_GUIDE_TOUR } from './features/onboarding/onboardingSteps';
import type { IntroCardId, OnboardingFeatureId } from './features/onboarding/onboardingSteps';
import { useOnboarding } from './features/onboarding/useOnboarding';
import { RecoveryModal } from './components/RecoveryModal';
import { DesignCustomizeModal } from './components/DesignCustomizeModal';
import { TravelAppsSettingsCard } from './components/TravelAppsSettingsCard';
import { styles } from './styles/appStyles';
import { Affirmation, AffirmationCustomText, AppNotice, AppNoticeCategory, CalendarMarks, Category, DeparturePlan, DeparturePreparationStatus, FocusPersistedState, LiveActivityCustomizationSettings, LiveActivityDisplayOptions, MonthlyReflectionCard, MonthlyReview, MonthlyWishState, MonoPattern, NudgeMode, PersistedState, PhotoThemePhotoTarget, PhotoThemeSettings, Priority, RepeatRule, Screen, SharedEvent, SharedParticipantPrefs, Subtask, Task, TaskBucket, TaskListItem, ThemeMode, TimeTab, WidgetSettings, WidgetSize, WidgetType, WishAction, WishMonthMap } from './types';
import { isOneOffWishTask, linkedWishAction, readWishTaskOrigin, sameWishTaskOrigin, taskChangesAfterWishEdit, wishMonthsAfterTaskCompletion, wishTaskForActionDeletion } from './features/wish/wishTaskLink';
import { initialPlan } from './storage/rhythmState';
import { DEFAULT_TRAVEL_APP_SETTINGS, normalizeTravelAppSettings, TravelAppSettings } from './features/travel/travelApps';
import { loadRhythmState, loadPreSyncBackupState } from './storage/rhythmStorage';
import { useICloudStateSync } from './features/sync/useICloudStateSync';
import { acknowledgeRhythmWidgetPendingActions, buildRhythmWidgetSnapshot, getRhythmWidgetPendingActions, saveRhythmAffirmationPhoto, saveRhythmWidgetPhoto, saveRhythmWidgetPhotoForWidget, saveRhythmWidgetSnapshot } from './features/widget/rhythmWidgetSnapshot';
import { DEFAULT_WIDGET_SETTINGS, getWidgetCustomization, normalizeWidgetSettings, WIDGET_TYPE_OPTIONS } from './features/widget/widgetSettings';
import type { WidgetEntitlementOverride } from './features/widget/widgetSettings';
import { categories, priorities, completionIcons, designModes, getLateRiskMessage, getNextBestAction, getUrgencyStatus, normalizeEstimatedMinutes, urgencyLevel } from './features/tasks/taskUtils';
import { planScheduledAt, selectCurrentTask, selectCurrentTasks } from './features/tasks/taskSelectors';
import { createSharedEventPacket, createSharedEventToken, encodeSharedEventLink, normalizeSharedEvent, parseSharedEventLink, upsertSharedEvent } from './features/shared/sharedUtils';
import { getMonthlyWishState, normalizeWishMonthsForSave, reviewIdentity, reviewsForMonth, wishMonthKey } from './features/wish/wishUtils';
import { cancelPendingTaskNotifications, cancelPendingTaskNotificationsUnsafe, getUnreconciledTaskNotificationIds, reconcileTaskNotificationsUnsafe } from './features/tasks/taskNotifications';
import { cancelPendingDepartureNotifications, cancelPendingDepartureNotificationsUnsafe } from './features/departure/departureNotifications';
import { enqueueNotificationOperation } from './features/notifications/notificationOperationQueue';
import { pendingNotificationReconciliations, reconcileNotificationOperation } from './features/notifications/pendingReconciliation';
import { getPendingNotificationRequests } from './features/notifications/pendingRequests';
import { getDeparturePlanMode, getPlanScheduledTime, isArrivalReversePlan, isDepartureReminderPlan, normalizeDeparturePlanForSave } from './features/departure/departurePlanMode';
import { DEFAULT_LIVE_ACTIVITY_CUSTOMIZATION, DEFAULT_LIVE_ACTIVITY_DISPLAY_OPTIONS, endRhythmLiveActivity, getRhythmLiveActivityStatus, getRhythmLiveActivityAvailability, normalizeRhythmLiveActivityCustomization, normalizeRhythmLiveActivityDisplayOptions, startOrUpdateRhythmLiveActivity, type RhythmLiveActivityPayload, type RhythmLiveActivityRuntimeStatus } from './features/widget/rhythmLiveActivity';
import { WishScreen } from './WishScreen';
import { VoiceInputModal } from './components/VoiceInputModal';
import { VoiceParseResult } from './features/voiceParser';
import { consumeVoiceUsage, grantVoiceReward as grantVoiceUsageReward, normalizeVoiceUsage, remainingVoiceRewards, remainingVoiceUses, VoiceUsage } from './features/voice/voiceUsage';
import { VoiceUsageLimitModal } from './components/VoiceUsageLimitModal';
import { buildRoutineInterruptionSummary, getRoutineHistories } from './features/analytics/routineInterruptionAnalysis';
import type { RoutineArchive } from './types';
import { SharedEventScreen } from './SharedEventScreen';
import { TopImageCropModal } from './components/TopImageCropModal';
import { AIShareSheet } from './components/AIShareSheet';
import { cropRectToPixels, displayToNormalizedRect, getContainBounds, getInitialCropRect, NormalizedCropRect } from './features/photo/topImageCrop';
import { cleanupUnreferencedManagedPhotos, collectReferencedManagedPhotoUris, deleteManagedPhotoUri, deleteTemporaryPhotoUri, isPersistedPhotoAvailable, persistPhotoUri, rebaseManagedPhotoUris, isDisplayPhotoAvailable } from './features/photo/persistentPhoto';
import { pruneBehaviorEvents, pruneFocusSessions, pruneRecoveryHistory, pruneRoutineArchives } from './features/storage/historyCleanup';
import { canUseNotifications, getNotificationPermissionAction, getNotificationPermissionStatus, requestRhythmNotificationPermission } from './features/notifications/notificationPermission';
import { addHours, canCreateWish, canCreateWishAction, canImportCalendar, canStartPremiumDesignTrial, isPremiumDesignTrialActive, isPremiumDesignUnlocked, isWidgetPhotoUnlockActive } from './features/ads/rewardedAccessLogic';
import { getRequiredAds, RewardedFeatureId } from './features/ads/rewardedAccess';
import { DEFAULT_REWARDED_ACCESS_STATE, isRewardedAccessLoadFailure, loadRewardedAccessState, RewardedAccessState, saveRewardedAccessState } from './features/ads/rewardedAccessStorage';
import { applyEarnedReward, assertRewardStorageWritable, clearEarnedReward, EarnedRewardReceipt, recordEarnedReward, recoverEarnedReward } from './features/ads/earnedRewardStorage';
import { cancelPendingFocusCompletionNotifications } from './features/focus/focusNotifications';
import { cancelPremiumTrialReminder, schedulePremiumTrialReminder } from './features/notifications/premiumTrialReminder';
import { buildAffirmationContent, buildDeadlineTitle, buildDepartureFollowUpContent, buildDepartureReminderContent, buildDepartureStageContent, buildScheduleSwitchContent, buildTaskActionContent, buildTaskReminderTitle, buildRoutineRemainingContent } from './features/notifications/notificationContent';
import { cancelPendingAffirmationNotifications, cancelPendingAffirmationNotificationsUnsafe } from './features/notifications/affirmationNotifications';
import { FocusControllerContext, FocusRuntimeProvider, useFocusController, type FocusController, type FocusModeProps } from './features/focus/useFocusController';
import {
  Alert,
  ActivityIndicator,
  AppState,
  Animated,
  useColorScheme,
  Easing,
  Image,

  Keyboard,
  KeyboardAvoidingView,
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
  type DimensionValue,
} from 'react-native';
import { colors } from './styles/colors';
import { parseClock, dateForClock, dateKey, dateForReminder, todayInputValue, deadlineLabel, getTargetDate, formatLiveDate, formatLiveTime, countdownToClock, countdownToDate } from './features/schedule/dateTimeUtils';
import { getTaskStatus, isTaskSkippedOnDate, getTodayRemainingRoutines, normalizeRoutineResumeDate, routineResumeScheduledDate, buildNextRepeatedTask, calendarEventOccurrenceKey, normalizeCalendarTitle, completeTasksAndCollectEvents } from './features/tasks/repeatUtils';
import { getChicPatternVisual, getNightSkyPalette, getNightSkyThemeTokens } from './features/design/designVisuals';
import { TimeTabButton } from './components/TimeTabButton';
import { withCalendarBandAlpha, CalendarMarkPicker, DesignCalendarPlanActions } from './components/CalendarMarkPicker';
import { CompactNumberSetting, ThemeColorSelector } from './components/SettingsControls';
import { getFocusCompletionAlertCopy, focusCompletionMessages, taskCompletionMessages, CompletionFeedbackKind, playCompletionSound, triggerHaptic } from './features/feedback/completionFeedback';
import { designFloralAssets, designPatternChoices, designBackgroundAssets, isImageDesignPattern } from './features/design/designAssets';
import { normalizeTaskDateKey, normalizePlanDate, planDateKey, isPlanOnDate, isRegularVisibleTask, ScheduleConflict, findScheduleConflict, ScheduleSwitchCandidate, findScheduleSwitchCandidate, getDepartureMoments, getPlanCountdownAt } from './features/schedule/scheduleConflict';
import { getMapSearchTarget, openMapSearch } from './features/departure/mapSearch';
import { isCheckChicPattern, ChicPatternDecor } from './components/PatternDecor';
import { MonoLooseLeafBackground, MonoChicBackground } from './components/MonoBackgrounds';
export { FloralPatternDecor } from './components/PatternDecor';

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






// Night Sky is a finished dark artwork, so its foreground must remain stable
// regardless of the user's saved nine-color Design selection.




export default function App() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const onboarding = useOnboarding();
  const [screen, setScreen] = useState<Screen>('home');
  const [syncHomeEditing, setSyncHomeEditing] = useState(false);
  const [timelineInitialTab, setTimelineInitialTab] = useState<TimeTab>('departure');
  const [analysisInitialTab, setAnalysisInitialTab] = useState<'records' | 'insights' | 'routine'>('records');
  const [currentGuideFeature, setCurrentGuideFeature] = useState<Exclude<OnboardingFeatureId, 'intro'>>();
  const [guideTransitioning, setGuideTransitioning] = useState(false);
  const [pendingGuideFeature, setPendingGuideFeature] = useState<Exclude<OnboardingFeatureId, 'intro'>>();
  const guideTransitioningRef = React.useRef(false);
  const [openTodayReview, setOpenTodayReview] = useState(false);

  // UI receipt only: update from successful root writes, never optimistic edits.
  const [savedJournalMonths, setSavedJournalMonths] = useState<WishMonthMap>({});
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
  const liveActivitySyncGenerationRef = React.useRef(0);
  const liveActivityOperationRef = React.useRef<Promise<unknown>>(Promise.resolve());
  const [voiceFocusRequest, setVoiceFocusRequest] = useState<{ durationMinutes: number; id: number }>();
  const [rewardedAccess, setRewardedAccess] = useState<RewardedAccessState>(DEFAULT_REWARDED_ACCESS_STATE);
  const rewardedAccessRef = React.useRef(rewardedAccess);
  rewardedAccessRef.current = rewardedAccess;
  // Preserve an earned reward across storage retries without showing another
  // ad. The journal recovers after restart; the ref also permits retrying when
  // even the journal write failed. Publish access only after its real save.
  const earnedRewardRef = React.useRef<EarnedRewardReceipt | undefined>(undefined);
  const [earnedRewardPending, setEarnedRewardPending] = useState(false);
  const [earnedRewardSaving, setEarnedRewardSaving] = useState(false);
  const retryEarnedRewardRef = React.useRef<() => Promise<void>>(async () => undefined);
  const [rewardedAccessHydrated, setRewardedAccessHydrated] = useState(false);
  const [rewardedPrompt, setRewardedPrompt] = useState<{ featureId: RewardedFeatureId; title: string; description: string } | null>(null);
  const [rewardedPromptClosing, setRewardedPromptClosing] = useState(false);
  const rewardedPromptCompletionRef = React.useRef<(() => void) | undefined>(undefined);
  const topImageRewardCompletedRef = React.useRef(false);
  const topImageRewardDismissActionRef = React.useRef<(() => void) | undefined>(undefined);
  const photoRewardTargetRef = React.useRef<PhotoThemePhotoTarget | undefined>(undefined);
  const photoRewardKindRef = React.useRef<PhotoKind>('personal');
  const applyPhotoDesignRef = React.useRef<(uri?: string, color?: ChicCheckColor) => void>(() => {});
  const widgetPhotoUnlockTargetRef = React.useRef<WidgetType | null>(null);
  const rewardedGenericBusyRef = React.useRef(false);
  const rewardedWishBusyRef = React.useRef(false);
  const rewardedDesignBusyRef = React.useRef(false);
  const tasksRef = React.useRef<Task[]>([]);
  const scheduleTaskNotificationsRef = React.useRef<(task: Task) => Promise<void>>(async () => undefined);
  const navigateWithinAppRef = React.useRef<(nextScreen: Screen) => void>(() => undefined);
  const hydratedRef = React.useRef(false);
  const syncHydrationCompletedRef = React.useRef(-1);
  const syncHydrationHadActionsRef = React.useRef(false);
  const syncHydrationLoadedMissingRef = React.useRef<boolean | undefined>(undefined);
  useEffect(() => {
    let active = true;
    let resolved = false;
    let loading = false;
    const load = async () => {
      if (resolved || loading) return;
      loading = true;
      try {
        const loaded = await loadRewardedAccessState();
        if (!active || isRewardedAccessLoadFailure(loaded)) return;
        const recovered = await recoverEarnedReward(loaded);
        if (!active) return;
        resolved = true;
        rewardedAccessRef.current = recovered;
        setRewardedAccess(recovered);
        setRewardedAccessHydrated(true);
      } catch (error) {
        console.warn('[Ads] Earned reward recovery could not finish. Retry on app activation.', error);
      } finally { loading = false; }
    };
    void load();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') { void load(); if (earnedRewardRef.current) void retryEarnedRewardRef.current(); }
    });
    return () => { active = false; subscription.remove(); };
  }, []);
  const departureSavingRef = React.useRef(false);
  const startupPhotoReferencesRef = React.useRef<Set<string> | undefined>(undefined);
  const pendingNotificationCompletionIdsRef = React.useRef<string[]>([]);
  const pendingWidgetActionsProcessingRef = React.useRef(false);
  // Native ACK can fail after local persistence. Remember an applied linked
  // action for this mounted session so a later undo is not replayed away.
  const appliedLinkedWidgetCompletionIdsRef = React.useRef(new Set<string>());
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
  const widgetSnapshotSaveChainRef = React.useRef<Promise<unknown>>(Promise.resolve());
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
  const restoreLinkedTaskRef = React.useRef<(id: string) => void>(() => undefined);
  const [completionAffirmation, setCompletionAffirmation] = useState<string>();
  const completionAffirmationTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const completionAffirmationLastRef = React.useRef<string | undefined>(undefined);
  const completionAffirmationRunRef = React.useRef(0);
  const lastAffirmationNotificationTextRef = React.useRef<string | undefined>(undefined);
  const preparationFeedbackKeysRef = React.useRef(new Set<string>());
  const completionAffirmationOpacity = React.useRef(new Animated.Value(0)).current;
  const [photoTheme, setPhotoTheme] = useState<PhotoThemeSettings>({ placement: 'background' });
  const [photoEntryTarget, setPhotoEntryTarget] = useState<PhotoThemePhotoTarget>();
  const [travelApps, setTravelApps] = useState<TravelAppSettings>(DEFAULT_TRAVEL_APP_SETTINGS);
  const [recoveryHistory, setRecoveryHistory] = useState<RecoveryRecord[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [aiShareOpen, setAiShareOpen] = useState(false);
  const [aiShareWishId, setAiShareWishId] = useState<string>();
  const [focusState, setFocusState] = useState<FocusPersistedState | undefined>();
  const focusStateRef = React.useRef(focusState);
  focusStateRef.current = focusState;
  const [focusCustomDurationMinutes, setFocusCustomDurationMinutes] = useState<number | undefined>();
  const [behaviorEvents, setBehaviorEvents] = useState<BehaviorEvent[]>([]);
  const behaviorEventsRef = React.useRef<BehaviorEvent[]>([]);
  const [routineArchives, setRoutineArchives] = useState<RoutineArchive[]>([]);
  const pendingBehaviorEventsRef = React.useRef<BehaviorEvent[]>([]);
  const pendingNotificationBehaviorActionsRef = React.useRef<Array<{ notificationInstanceId: string; action: NotificationAction; taskId?: string; actualAt: Date }>>([]);
  const pendingDepartureFollowUpsRef = React.useRef(new Set<string>());
  const pendingSharedEventPacketsRef = React.useRef<SharedEvent[]>([]);
  const pendingSharedEventTokensRef = React.useRef<string[]>([]);
  const [wishMonths, setWishMonthsState] = useState<WishMonthMap>({});
  const wishMonthsRef = React.useRef<WishMonthMap>({});
  // One synchronous mutation boundary, not mutually observing effects. Ref
  // updates happen before nested completion handlers and async save receipts.
  const setWishMonths = React.useCallback((updater: React.SetStateAction<WishMonthMap>) => {
    const previous = wishMonthsRef.current;
    const next = typeof updater === 'function' ? updater(previous) : updater;
    if (next === previous) return;
    wishMonthsRef.current = next;
    setWishMonthsState(next);
    const linked = taskChangesAfterWishEdit(previous, next, tasksRef.current);
    if (linked.tasks !== tasksRef.current) { tasksRef.current = linked.tasks; setTasks(linked.tasks); }
    linked.completeIds.forEach(id => {
      if (tasksRef.current.find(task => task.id === id)?.status === 'skipped') restoreLinkedTaskRef.current(id);
      completeTaskIdsRef.current([id]);
    });
    linked.restoreIds.forEach(id => restoreLinkedTaskRef.current(id));
  }, []);
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
  const [homeInitialTab, setHomeInitialTab] = useState<'now' | 'list' | 'routine'>('now');
  const [tomorrowPrepOpen, setTomorrowPrepOpen] = useState(false);
  const [tomorrowPrepStep, setTomorrowPrepStep] = useState<0 | 1 | 2 | 3>(0);
  const [focusTaskCompletionPrompt, setFocusTaskCompletionPrompt] = useState<FocusSession | undefined>();
  const [focusCompletionPromptOpen, setFocusCompletionPromptOpen] = useState(false);
  const [focusCompletionNotice, setFocusCompletionNotice] = useState(false);
  const [statusNoticeHeight, setStatusNoticeHeight] = useState(0);
  const focusCompletionCanPresentRef = React.useRef(false);
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
  const [introDismissing, setIntroDismissing] = useState(false);
  const introTransitionRef = React.useRef(false);
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
  const createPersistedSnapshot = React.useCallback((): PersistedState => ({ tasks, plan, departurePlans, widgetSize, widgetSettings, showCompleted, completionIcon, designMode, monoAppearance, monoPattern, hapticsEnabled, premiumTrialReminderEnabled, liveActivityEnabled, liveActivityDisplayOptions, liveActivityCustomization, reviewPromptedAt, readNoticeIds: [...new Set(readNoticeIds)], tomorrowPrepPromptedDate, routineRemainingNotifiedDate, taskTemplates, savedTaskTemplates, chicPattern, chicCheckColor, recoveryHistory: pruneRecoveryHistory(recoveryHistory), focusSessions: pruneFocusSessions(focusSessions), focusState, focusCustomDurationMinutes, departureCheckIns, behaviorEvents: pruneBehaviorEvents(behaviorEvents), wishMonths: normalizeWishMonthsForSave(wishMonths), calendarMarks, calendarImportCalendarIds, calendarImportKnownCalendarIds, sharedEvents, sharedParticipantIdsByToken, sharedParticipantPrefsByToken, departurePreparationStatuses, affirmations, affirmationCustomTexts, photoTheme, travelApps, designCustomizePurchased, routineArchives: pruneRoutineArchives(routineArchives), voiceUsage: normalizeVoiceUsage(voiceUsage, dateKey()) }), [tasks, plan, departurePlans, widgetSize, widgetSettings, showCompleted, completionIcon, designMode, monoAppearance, monoPattern, hapticsEnabled, premiumTrialReminderEnabled, liveActivityEnabled, liveActivityDisplayOptions, liveActivityCustomization, reviewPromptedAt, readNoticeIds, tomorrowPrepPromptedDate, routineRemainingNotifiedDate, taskTemplates, savedTaskTemplates, chicPattern, chicCheckColor, recoveryHistory, focusSessions, focusState, focusCustomDurationMinutes, departureCheckIns, behaviorEvents, wishMonths, calendarMarks, calendarImportCalendarIds, calendarImportKnownCalendarIds, sharedEvents, sharedParticipantIdsByToken, sharedParticipantPrefsByToken, departurePreparationStatuses, affirmations, affirmationCustomTexts, photoTheme, travelApps, designCustomizePurchased, routineArchives, voiceUsage]);
  const { persistenceDisabledRef, persistenceIssue, setPersistenceIssue, hydrationRetry, setHydrationRetry, setSaveRetry, persistenceRetrying, setPersistenceRetrying, pendingWishSavesRef, latestPersistedStateRef, waitForSettingsSave } = useRhythmPersistence({ hydrated, hydratedRef, createSnapshot: createPersistedSnapshot, wishMonths, setSavedJournalMonths });
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
      `${trial.trialLabel ?? '無料期間'}で利用できます。\n無料期間終了後は${monthlyPrice} / 月で自動更新されます。\n\n無料期間終了の前日にお知らせしますか？\n終了約24時間前に通知します。`,
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
    if (!hydrated || !storeKitEntitlementsResolved || persistenceDisabledRef.current) return;
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
          ? '広告で3日間利用中'
          : storeKitEntitlementsResolved ? '未購入 ›' : '購入状態を確認中';
  const designRewardAvailable = rewardedAccessHydrated
    && planTier !== 'premium'
    && !hasDesignCustomizeAccess
    && !isPremiumDesignTrialActive(rewardedAccess, now)
    && !isPremiumDesignUnlocked(rewardedAccess, now)
    && (canStartPremiumDesignTrial(rewardedAccess) || rewardedAccess.premiumDesignTrial.used);
  const designRewardLabel = canStartPremiumDesignTrial(rewardedAccess)
    ? '24時間無料で使う'
    : '広告を見て3日間使う';
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
  // The trial remembers the design that started it. A later 3-day rewarded
  // unlock is global Design access, so it must not resurrect that old design.
  const activeDesignTrialId = planTier !== 'premium' && isPremiumDesignTrialActive(rewardedAccess, now)
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
  const canUsePhoto = (kind: PhotoKind, target: PhotoThemePhotoTarget) => planTier === 'premium' || hasDesignCustomizeAccess || (rewardedAccessHydrated && canUsePhotoKind(rewardedAccess, kind, target, now));
  const displayPhotoTheme = visiblePhotoSettings(photoTheme, canUsePhoto);
  const previewSavedBackgroundUri = isDisplayPhotoAvailable(photoTheme.imageUri) ? photoTheme.imageUri : undefined;
  const photoThemeEnabled = designMode === 'photo';
  const uiDesignMode: Exclude<DesignMode, 'photo'> = designMode === 'photo' ? 'chic' : isMonoDesign ? resolvedMonoMode : designMode;
  const photoBackgroundUri = photoThemeEnabled && photoTheme.placement !== 'top' ? displayPhotoTheme.imageUri : undefined;
  const photoTopImageUri = displayPhotoTheme.topImageUris?.[screen] ?? displayPhotoTheme.topImageOriginalUris?.[screen];
  const wishTopImageUri = displayPhotoTheme.topImageUris?.wish ?? displayPhotoTheme.topImageOriginalUris?.wish;
  const focusBackgroundUri = displayPhotoTheme.focusBackgroundUri;
  // A temporary trial is an explicit, time-bounded override. Persisted free
  // users still fall back to plain when no trial is active.
  const effectiveChicPattern = (activeDesignTrial ?? getEffectiveChicPattern(planTier, chicPattern, hasDesignCustomizeAccess || isPremiumDesignUnlocked(rewardedAccess, now))) as ChicPattern;
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
    if (isPhotoRewardFeature(featureId)) return photoRewardProgress(rewardedAccess, photoRewardKindRef.current, photoRewardTargetRef.current, new Date());
    if (featureId === 'wishCreate') return { current: rewardedAccess.wishCreateProgress, required };
    if (featureId === 'wishActionCreate') return { current: rewardedAccess.wishActionCreateProgress, required };
    if (featureId === 'routineSkipBonus') return { current: rewardedAccess.routine.skipBonusProgress, required };
    if (featureId === 'widgetPhoto') return { current: 0, required };
    return { current: 0, required };
  }, [rewardedAccess]);

  const grantRewarded = React.useCallback(async (featureId: RewardedFeatureId): Promise<RewardedAccessResult> => {
    if (!rewardedAccessHydrated) return { success: false, message: '利用状態を確認できません。読み込み完了後にお試しください。' };
    if (earnedRewardRef.current && earnedRewardRef.current.featureId !== featureId) return { success: false, message: '視聴済み広告の保存が未完了です。元の画面から保存を再試行してください。' };
    if (!earnedRewardRef.current) {
      if (planTier === 'premium') return { success: true, completed: true };
      if (isPhotoRewardFeature(featureId) && !rewardPhotoTarget({ featureId, photoTarget: photoRewardTargetRef.current })) return { success: false, message: '写真の対象枠を選んでください。' };
      if (isPhotoRewardFeature(featureId) && (hasDesignCustomizeAccess || canUsePhotoKind(rewardedAccessRef.current, photoRewardKindRef.current, photoRewardTargetRef.current, new Date()))) return { success: true, completed: true };
      if (featureId === 'routineSkipBonus' && rewardedAccessRef.current.routine.skipBonusAdded >= 2) return { success: true, completed: true, message: 'Skip Bonusは最大まで取得済みです。' };
      if (featureId === 'widgetPhoto' && !widgetPhotoUnlockTargetRef.current) return { success: false, message: '写真を使うWidgetを選択してください。' };
    }
    if (rewardedGenericBusyRef.current) return { success: false, message: '広告を準備しています…' };
    rewardedGenericBusyRef.current = true;
    setEarnedRewardSaving(true);
    try {
      let journalWrite: Promise<boolean> | undefined;
      if (!earnedRewardRef.current) {
      try { await assertRewardStorageWritable(); }
      catch { return { success: false, message: '保存先を利用できないため、広告は開始していません。端末の空き容量などを確認し、もう一度お試しください。' }; }
      let showTestRewardedAd: typeof import('./services/rewardedAds').showTestRewardedAd;
      try {
        ({ showTestRewardedAd } = require('./services/rewardedAds') as typeof import('./services/rewardedAds'));
      } catch (error) {
        if (__DEV__) console.log('[Ads] show:error', error instanceof Error ? error.message : String(error));
        return { success: false, message: '広告の確認にはDevelopment Buildが必要です。' };
      }
      const widgetType = widgetPhotoUnlockTargetRef.current;
      const photoTarget = isPhotoRewardFeature(featureId) ? photoRewardTargetRef.current : undefined;
      const earned = await showTestRewardedAd(() => {
        earnedRewardRef.current ??= { id: `earned:${Date.now()}:${Math.random().toString(36).slice(2)}`, featureId, earnedAt: new Date().toISOString(), widgetType, photoTarget };
        setEarnedRewardPending(true);
        journalWrite ??= recordEarnedReward(earnedRewardRef.current).then(() => true, () => false);
      }).catch((error) => {
        if (__DEV__) console.log('[Ads] show:error', error instanceof Error ? error.message : String(error));
        return false;
      });
      if (!earned && !earnedRewardRef.current) return { success: false, message: '広告を読み込めませんでした。もう一度お試しください。' };
        earnedRewardRef.current ??= { id: `earned:${Date.now()}:${Math.random().toString(36).slice(2)}`, featureId, earnedAt: new Date().toISOString(), widgetType, photoTarget };
      }
      const receipt = earnedRewardRef.current;
      const required = getRequiredAds(featureId);
      try {
        // Journal first: restarting after the access write fails must not
        // require another ad. The committed state contains the receipt ID.
        if (journalWrite) { if (!await journalWrite) throw new Error('Earned receipt write failed.'); }
        else await recordEarnedReward(receipt);
      } catch {
        setEarnedRewardPending(true);
        return { success: false, completed: false, retryWithoutAd: true, message: '広告は視聴済みですが、記録を保存できません。アプリを閉じずに保存を再試行してください。広告を見直す必要はありません。' };
      }
      let base = rewardedAccessRef.current;
      let next = applyEarnedReward(base, receipt);
      const completed = featureId === 'wishCreate' ? next.wishCreateProgress >= required
        : featureId === 'wishActionCreate' ? next.wishActionCreateProgress >= required
          : featureId === 'routineSkipBonus' ? next.routine.skipBonusAdded > base.routine.skipBonusAdded : isPhotoRewardFeature(featureId) ? canUsePhotoKind(next, photoRewardKindRef.current, rewardPhotoTarget(receipt), new Date()) : true;
      try {
        // If another existing credit/setting changes while the write is in
        // flight, rebase on that latest state, not the pre-ad snapshot.
        let saved = false;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          base = rewardedAccessRef.current;
          next = applyEarnedReward(base, receipt);
          await saveRewardedAccessState(next);
          if (rewardedAccessRef.current === base) { saved = true; break; }
        }
        if (!saved) throw new Error('Reward state changed during save. Retry from the earned receipt.');
      } catch {
        setEarnedRewardPending(true);
        return { success: false, completed: false, retryWithoutAd: true, message: '広告は視聴済みです。アプリを閉じずに保存を再試行してください。広告を見直す必要はありません。' };
      }
      earnedRewardRef.current = undefined;
      setEarnedRewardPending(false);
      rewardedAccessRef.current = next;
      setRewardedAccess(next);
      await clearEarnedReward();
      const nextProgress = getRewardedPromptProgress(featureId).current + 1;
      return { success: true, completed, message: completed ? '取得しました' : `広告を1回確認しました。あと${Math.max(0, required - nextProgress)}回です。` };
    } finally {
      rewardedGenericBusyRef.current = false;
      setEarnedRewardSaving(false);
    }
  }, [getRewardedPromptProgress, planTier, hasDesignCustomizeAccess, rewardedAccessHydrated]);

  retryEarnedRewardRef.current = async () => {
    const receipt = earnedRewardRef.current;
    if (!receipt || rewardedGenericBusyRef.current) return;
    try { await grantRewarded(receipt.featureId); }
    catch (error) { setEarnedRewardPending(true); console.warn('[Ads] Earned reward retry failed.', error); }
  };

  const openRewardedPrompt = React.useCallback((featureId: RewardedFeatureId, title: string, description: string, onCompleted?: () => void, kind: PhotoKind = 'personal', photoTarget?: PhotoThemePhotoTarget) => {
    if (isPhotoRewardFeature(featureId)) {
      const target = rewardPhotoTarget({ featureId, photoTarget });
      if (!target) { Alert.alert('写真の対象枠を選んでください'); return; }
      photoRewardTargetRef.current = target;
      photoRewardKindRef.current = kind;
    }
    if (planTier === 'premium') {
      onCompleted?.();
      return;
    }
    if (isPhotoRewardFeature(featureId)) topImageRewardCompletedRef.current = false;
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
      if (isPhotoRewardFeature(rewardedPrompt.featureId)) {
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
    openRewardedPrompt('widgetPhoto', 'ウィジェットの写真を3日間使う', '広告を1回見ると、選んだウィジェットで写真を3日間使えます。', () => undefined);
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
  const saveCurrentWishEditor = React.useCallback((updater: (current: MonthlyWishState) => MonthlyWishState): Promise<void> => {
    if (!hydratedRef.current || persistenceDisabledRef.current) return Promise.reject(new Error('保存データを確認できません'));
    return new Promise((resolve, reject) => {
      const pending: { expected?: WishMonthMap; resolve: () => void; reject: (error: Error) => void } = { resolve: () => { void onboarding.complete('wish'); resolve(); }, reject };
      pendingWishSavesRef.current.push(pending);
      setWishMonths((current) => {
        const next = { ...current, [currentWishMonthKey]: updater(getMonthlyWishState(current, currentWishMonthKey)) };
        pending.expected = next;
        return next;
      });
    });
  }, [currentWishMonthKey, onboarding]);
  const updateWishReview = React.useCallback((monthKey: string, reviewKey: string, updates: Partial<MonthlyReview>) => {
    setWishMonths((current) => {
      const monthState = getMonthlyWishState(current, monthKey);
      const reviews = reviewsForMonth(monthState);
      const updated = reviews.map((review) => reviewIdentity(review) === reviewKey ? { ...review, ...updates } : review);
      return { ...current, [monthKey]: { ...monthState, review: updated[updated.length - 1] ?? monthState.review, reviews: updated } };
    });
  }, []);
  const deleteWishReview = React.useCallback(async (monthKey: string, reviewKey: string) => {
    if (!hydratedRef.current || persistenceDisabledRef.current) throw new Error('保存データを確認できません');
    let removed: MonthlyReview[] = [];
    try {
    await new Promise<void>((resolve, reject) => {
    const pending: { expected?: WishMonthMap; resolve: () => void; reject: (error: Error) => void } = { resolve, reject };
    pendingWishSavesRef.current.push(pending);
    setWishMonths((current) => {
      const monthState = getMonthlyWishState(current, monthKey);
      const reviews = reviewsForMonth(monthState);
      removed = reviews.filter((review) => reviewIdentity(review) === reviewKey);
      const remaining = reviews.filter((review) => reviewIdentity(review) !== reviewKey);
      // 履歴から削除した直後に、前のレビューを入力欄へ復元しない。
      // 旧形式 review は互換用に残すが、現在の入力 draft は常に空へ戻す。
      const next = { ...current, [monthKey]: { ...monthState, review: {}, reviews: remaining } };
      pending.expected = next;
      return next;
    });
    });
    } catch (error) {
      // Restore only the removed entries; never overwrite concurrent tasks,
      // other months, goals, or newly edited reviews with an old snapshot.
      setWishMonths((current) => {
        const monthState = getMonthlyWishState(current, monthKey);
        const reviews = reviewsForMonth(monthState);
        const restore = removed.filter((review) => !reviews.some((item) => reviewIdentity(item) === reviewIdentity(review) || Boolean(review.date && item.date === review.date)));
        return restore.length ? { ...current, [monthKey]: { ...monthState, reviews: [...reviews, ...restore] } } : current;
      });
      throw error;
    }
  }, []);
  const saveDailyReview = React.useCallback((monthKey: string, draft: MonthlyReview) => {
    if (!hydratedRef.current || persistenceDisabledRef.current) return Promise.reject(new Error('保存データを確認できません'));
    return new Promise<void>((resolve, reject) => {
      const pending: { expected?: WishMonthMap; resolve: () => void; reject: (error: Error) => void } = { resolve: () => {
        if (planTier === 'premium' && [...(draft.photos ?? []), draft.photo ?? ''].some(Boolean)) void onboarding.complete('photoLog');
        resolve();
      }, reject };
      pendingWishSavesRef.current.push(pending);
      setWishMonths((current) => {
      const monthState = getMonthlyWishState(current, monthKey);
      const reviews = reviewsForMonth(monthState);
      const photos = [...new Set([...(draft.photos ?? []), draft.photo ?? ''].filter(Boolean))];
      const nextReview: MonthlyReview = { ...draft, id: draft.id ?? `journal-${draft.date ?? Date.now()}`, photo: photos[0] ?? '', photos };
      const existingIndex = reviews.findIndex((review) => review.id === nextReview.id || review.date === nextReview.date);
      const nextReviews = existingIndex >= 0 ? reviews.map((review, index) => index === existingIndex ? { ...review, ...nextReview } : review) : [...reviews, nextReview];
        const next = { ...current, [monthKey]: { ...monthState, review: {}, reviews: nextReviews } };
        pending.expected = next;
        return next;
      });
    });
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
    if (!onboardingDesignSelectionPending || completingInitialDesignSelectionRef.current) return;
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
    completingInitialDesignSelectionRef.current = true;
    void onboarding.completeInitialDesign().then(() => {
      setOnboardingDesignSelectionPending(false);
      setScreen('home');
    }).catch(() => {
      Alert.alert('初回設定を保存できませんでした', '設定のデザインを開き、もう一度選択してください。');
    }).finally(() => { completingInitialDesignSelectionRef.current = false; });
  }, [onboarding.completeInitialDesign, onboarding.introVisible, onboarding.ready, onboarding.state.completed.intro, onboarding.state.firstRunStage, onboardingDesignSelectionPending, screen]);
  const deferInitialDesignSelection = () => {
    setDesignMode('minimal');
    setMonoAppearance('auto');
    setMonoPattern('plain');
    setChicPattern('plain');
    completeInitialDesignSelection();
  };
  const beginInitialDesignFromIntro = () => {
    if (introTransitionRef.current) return;
    introTransitionRef.current = true;
    setIntroDismissing(true);
    void onboarding.finishIntro().then(() => {
      if (Platform.OS !== 'ios') InteractionManager.runAfterInteractions(() => { introTransitionRef.current = false; setIntroDismissing(false); });
    }).catch(() => {
      introTransitionRef.current = false;
      setIntroDismissing(false);
      Alert.alert('案内の状態を保存できませんでした', 'この画面からもう一度お試しください。');
    });
  };
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
      const result = await grantRewarded('premiumDesign');
      if (!result.success || !result.completed) {
        Alert.alert(result.retryWithoutAd ? '広告の保存を再試行してください' : '広告を完了できませんでした', result.message ?? 'デザインは解放されていません。');
        return false;
      }
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
  }, [grantRewarded, planTier, rewardedAccessHydrated]);
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
      throw new Error('Premiumの利用権を確認してください');
    }
    const existing = affirmations.find((item) => item.id === draft.id);
    if (!existing && affirmations.length >= MAX_AFFIRMATIONS) {
      Alert.alert(`アファメーションは最大${MAX_AFFIRMATIONS}件までです`, '不要な通知を削除してから追加してください。');
      throw new Error('登録上限に達しています');
    }
    const duplicateTime = affirmations.find((item) => item.id !== draft.id && item.time === draft.time);
    if (duplicateTime) {
      Alert.alert('同じ時刻の通知があります', '別の時刻を選択してください。');
      throw new Error('別の通知時刻を選択してください');
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
            next.notificationId = await scheduleAffirmationNotification(next);
          }
        }
      });
    } catch (error) {
      if (__DEV__) console.warn('[Notifications] affirmation save transaction failed', error);
      throw new Error('通知を更新できませんでした。もう一度お試しください。');
    }
    if (affirmationOperationGenerationRef.current[draft.id] !== generation) throw new Error('通知の設定が変更されました。もう一度お試しください。');
    const persisted = waitForSettingsSave((state) => state.affirmations?.some((item) => item.id === next.id && item.text === next.text && item.time === next.time && item.enabled === next.enabled && item.notificationId === next.notificationId) === true);
    setAffirmations((current) => current.some((item) => item.id === next.id) ? current.map((item) => item.id === next.id ? next : item) : [next, ...current]);
    await persisted;
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
  const { pendingTopPhoto, setPendingTopPhoto, topImageCropResumeToken, setTopImageCropResumeToken, topImageProcessing, topImageAccessPurchaseResumeRef, topImageCropDismissActionRef, resumeTopImageAfterAccessFlow, canPickPhotoKind, canOpenTopImagePicker, pickPhotoTheme, adjustTopPhoto, applyPendingTopPhoto } = usePhotoTheme({ photoTheme, setPhotoTheme, setDesignMode, planTier, hasDesignCustomizeAccess, rewardedAccess, now, openRewardedPrompt });

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
    const sampleId = selectedPhotoUri === photoTheme.imageUri ? photoTheme.samplePhotoIds?.background : undefined;
    const kind = sampleId ? 'sample' : 'personal';
    if (planTier !== 'premium' && !hasDesignCustomizeAccess && !canUsePhotoKind(rewardedAccessRef.current, kind, 'background', new Date())) {
      openRewardedPrompt('photoBackground', '写真を使う', 'この枠は、広告1回でサンプルを期限なし、2回で自分の画像を3日間使えます。', () => applyPhotoDesignRef.current(selectedPhotoUri, colorOverride), kind, 'background');
      return;
    }
    try {
      const persistentUri = sampleId ? selectedPhotoUri : persistPhotoUri(selectedPhotoUri, 'design-background');
      if (!sampleId && !isPersistedPhotoAvailable(persistentUri)) throw new Error('photo persistence unavailable');
      setPhotoTheme((current) => {
        deleteManagedPhotoUri(current.imageUri, [persistentUri, current.focusBackgroundUri, ...Object.values(current.topImageUris ?? {}), ...Object.values(current.topImageOriginalUris ?? {})]);
        const samplePhotoIds = { ...current.samplePhotoIds }; if (!sampleId) delete samplePhotoIds.background;
        return { ...current, samplePhotoIds, placement: 'background', imageUri: persistentUri };
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
  }, [completeInitialDesignSelection, designPreviewPhotoUri, onboarding, onboardingDesignSelectionPending, photoTheme, planTier, hasDesignCustomizeAccess, openRewardedPrompt]);
  applyPhotoDesignRef.current = applyPhotoDesign;
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
    if (!rewardedAccessHydrated) {
      Alert.alert('利用状態を確認できません', 'アプリを開き直すか、しばらくしてからもう一度お試しください。');
      return;
    }
    const hadTryOnSelection = Boolean(pendingDesignApplyRef.current);
    const currentDesignIsFree = (designMode === 'minimal' || designMode === 'dark')
      ? monoPattern === 'plain'
      : designMode === 'chic' && chicPattern === 'plain';
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
        // From the Design Customize sheet, a user may still be on Plain.
        // Starting the one-time access must not silently replace it with a
        // different paid pattern; the next paid selection can use this trial.
        if (!hadTryOnSelection && currentDesignIsFree) {
          pendingDesignApplyRef.current = undefined;
          const next: RewardedAccessState = {
            ...rewardedAccess,
            premiumDesignTrial: { used: true, designId: null, expiresAt: addHours(new Date(), 24) },
          };
          setRewardedAccess(next);
          void saveRewardedAccessState(next);
          return;
        }
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
  }, [applyPhotoDesign, canStartPremiumDesignTrial, chicCheckColor, chicPattern, designMode, hasDesignCustomizeAccess, monoAppearance, monoPattern, photoTheme.imageUri, planTier, requestDesignReward, rewardedAccess, rewardedAccessHydrated, resumeTopImageAfterAccessFlow, startDesignTrial, startMonoDesignTrial, startPhotoDesignTrial]);




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
    setWishMonths(current => wishMonthsAfterTaskCompletion(current, result.tasks, result.newlyCompleted.map(task => task.id)));
    if (result.newlyCompleted.length === 0) return false;
    result.newlyCompleted.forEach((task) => { void cancelPendingTaskNotifications(task.id).catch((error) => console.warn('Task notification cancellation failed.', error)); void cancelScheduleSwitchNotificationsForTask(task.id); });
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
  }, [hapticsEnabled, recordBehaviorEvent, setWishMonths, showCompletionAffirmation]);
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
    if (current.done) setWishMonths(months => wishMonthsAfterTaskCompletion(months, next, [taskId]));
    if (allDone && !current.done) { void playCompletionSound(); triggerHaptic(hapticsEnabled, 18); showCompletionAffirmation('task'); }
  }, [completeTaskIds, setWishMonths]);

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
    void cancelPendingDepartureNotifications(target.id).catch((error) => console.warn('Departure notification cancellation failed.', error));
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
    if (wasCompleted) setWishMonths(current => wishMonthsAfterTaskCompletion(current, next, [taskId]));
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
  }, [recordBehaviorEvent, setWishMonths]);

  restoreLinkedTaskRef.current = restoreTaskById;
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
        void cancelPendingTaskNotifications(taskId).catch((error) => console.warn('Task notification cancellation failed.', error));
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

  const [deletedTaskUndo, setDeletedTaskUndo] = useState<{ task: Task; index: number }>();
  const deletedTaskUndoRef = React.useRef<typeof deletedTaskUndo>(undefined);
  const deletedTaskUndoTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearDeletedTaskUndo = React.useCallback(() => {
    if (deletedTaskUndoTimerRef.current) clearTimeout(deletedTaskUndoTimerRef.current);
    deletedTaskUndoTimerRef.current = undefined;
    deletedTaskUndoRef.current = undefined;
    setDeletedTaskUndo(undefined);
  }, []);
  useEffect(() => () => { if (deletedTaskUndoTimerRef.current) clearTimeout(deletedTaskUndoTimerRef.current); }, []);
  const undoTaskDeletion = () => {
    const entry = deletedTaskUndoRef.current;
    clearDeletedTaskUndo();
    if (!entry || tasksRef.current.some(task => task.id === entry.task.id)) return;
    const restored = { ...entry.task };
    if (restored.origin && !linkedWishAction(wishMonthsRef.current, restored.origin)) delete restored.origin;
    const next = [...tasksRef.current];
    next.splice(Math.min(entry.index, next.length), 0, restored);
    tasksRef.current = next;
    setTasks(next);
    void scheduleTaskNotificationsRef.current(restored).catch(error => console.warn('Restored task notifications failed.', error));
    void syncScheduleSwitchNotificationsForTask(restored.id);
  };
  const deleteTaskById = React.useCallback((taskId: string, allowUndo = true) => {
    const target = tasksRef.current.find((task) => task.id === taskId);
    if (!target) return;
    const index = tasksRef.current.findIndex(task => task.id === taskId);
    clearDeletedTaskUndo();
    if (allowUndo) {
      const entry = { task: target, index };
      deletedTaskUndoRef.current = entry;
      setDeletedTaskUndo(entry);
      deletedTaskUndoTimerRef.current = setTimeout(() => { if (deletedTaskUndoRef.current === entry) clearDeletedTaskUndo(); }, 6000);
    }
    const next = tasksRef.current.filter((task) => task.id !== taskId);
    tasksRef.current = next;
    setTasks(next);
    setSelectedTaskIds((current) => current.filter((id) => id !== taskId));
    void cancelPendingTaskNotifications(taskId).catch((error) => console.warn('Task notification cancellation failed.', error));
    void cancelScheduleSwitchNotificationsForTask(taskId);
  }, [clearDeletedTaskUndo]);

  const deleteWishAction = React.useCallback(async (monthKey: string, action: WishAction, includeTask: boolean, expectedTaskId?: string) => {
    if (!hydratedRef.current || persistenceDisabledRef.current) throw new Error('保存データを確認できません');
    const currentAction = wishMonthsRef.current[monthKey]?.actions.find(item => item.id === action.id);
    if (currentAction && currentAction.wishId !== action.wishId) throw new Error('行動の関連先が変更されています。画面を開き直してください。');
    const origin = { monthKey, wishId: action.wishId, actionId: action.id };
    const target = includeTask ? wishTaskForActionDeletion(wishMonthsRef.current, tasksRef.current, origin, expectedTaskId) : undefined;
    const persisted = waitForSettingsSave(state =>
      !state.wishMonths?.[monthKey]?.actions.some(item => item.id === action.id)
      && (!includeTask || !state.tasks?.some(task => task.id === expectedTaskId)));
    // Both changes are synchronous and share the existing root snapshot queue.
    // Never restore a stale whole-App snapshot if persistence fails.
    if (target) deleteTaskById(target.id, false);
    setWishMonths(current => {
      const month = current[monthKey];
      if (!month || !month.actions.some(item => item.id === action.id)) return current;
      return { ...current, [monthKey]: { ...month, actions: month.actions.filter(item => item.id !== action.id) } };
    });
    setSaveRetry(value => value + 1); // Also flush an unchanged retry after failure.
    await persisted;
  }, [deleteTaskById, setWishMonths]);

  const deleteSelectedTasks = React.useCallback((ids: string[]) => {
    const selected = [...new Set(ids)].filter((id) => tasksRef.current.some((task) => task.id === id));
    if (selected.length === 0) return;
    Alert.alert(`選択した${selected.length}件を削除しますか？`, '削除したタスクは元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: `${selected.length}件を削除`, style: 'destructive', onPress: () => {
        selected.forEach((id) => deleteTaskById(id, false));
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

  // Stable subscriptions read the current callbacks without restarting hydration.
  const notificationCallbacksRef = React.useRef({ applyPremiumDepartureNotificationAction, recordNotificationBehaviorAction, recordBehaviorEvent, syncSharedEventPacket, openSharedEventToken });
  notificationCallbacksRef.current = { applyPremiumDepartureNotificationAction, recordNotificationBehaviorAction, recordBehaviorEvent, syncSharedEventPacket, openSharedEventToken };

  useEffect(() => {
    let active = true;
    hydratedRef.current = false;
    persistenceDisabledRef.current = true;
    setHydrated(false);
    setPersistenceRetrying(true);
    loadRhythmState()
      .then((saved) => {
        if (!active) return;
        syncHydrationLoadedMissingRef.current = !saved;
        if (!saved) return;
        saved = rebaseManagedPhotoUris(saved);
        // Scan the rebased saved object, including unknown/legacy fields,
        // before normalizing anything. On error hydration fails closed.
        startupPhotoReferencesRef.current = new Set([...(startupPhotoReferencesRef.current ?? []), ...collectReferencedManagedPhotoUris(saved)]);
        const loadedTasks = saved.tasks ? saved.tasks.map((task) => taskWithUnifiedMemos({
          ...task,
          category: (task.category ?? 'その他') as Category,
          priority: (task.priority ?? '中') as Priority,
          estimatedMinutes: normalizeEstimatedMinutes(task.estimatedMinutes),
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
        setPhotoTheme(restoreSamplePhotoUris({
          samplePhotoIds: saved.photoTheme?.samplePhotoIds,
          placement: saved.photoTheme?.placement === 'top' ? 'top' : 'background',
          imageUri: saved.photoTheme?.imageUri,
          topImageUris: saved.photoTheme?.topImageUris ?? {},
          topImageOriginalUris: saved.photoTheme?.topImageOriginalUris ?? saved.photoTheme?.topImageUris ?? {},
          topImageAdjustments: saved.photoTheme?.topImageAdjustments ?? {},
          topImageCropRects: saved.photoTheme?.topImageCropRects ?? {},
          focusBackgroundUri: saved.photoTheme?.focusBackgroundUri,
        }));
        setTravelApps(normalizeTravelAppSettings(saved.travelApps));
        setDesignCustomizePurchased(saved.designCustomizePurchased === true);
        setRecoveryHistory(pruneRecoveryHistory(saved.recoveryHistory ?? []));
        setFocusSessions(pruneFocusSessions(saved.focusSessions ?? []));
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
        const loadedBehaviorEvents = pruneBehaviorEvents((saved.behaviorEvents ?? []).map((event) => {
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
        }));
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
        setRoutineArchives(pruneRoutineArchives([...storedRoutineArchives, ...legacyRoutineArchives]));
        if (saved.taskTemplates) setTaskTemplates(saved.taskTemplates);
        setSavedTaskTemplates(saved.savedTaskTemplates ?? []);
        setWishMonths(saved.wishMonths ?? {});

        setSavedJournalMonths(saved.wishMonths ?? {});
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
      .then(() => {
        if (!active) return;
        persistenceDisabledRef.current = false;
        setPersistenceIssue(undefined);
      })
      .catch((error) => {
        if (!active) return;
        console.warn('Rhythm hydration failed; keeping the persisted value untouched.', error);
        persistenceDisabledRef.current = true;
        setPersistenceIssue('read');
        Alert.alert('保存データを読み込めませんでした', 'データは初期化せず、そのまま残しています。');
      })
      .finally(() => {
        if (!active) return;
        setPersistenceRetrying(false);
        if (persistenceDisabledRef.current) return;
        syncHydrationCompletedRef.current = hydrationRetry;
        syncHydrationHadActionsRef.current = Boolean(pendingNotificationCompletionIdsRef.current.length || pendingDepartureNotificationActionsRef.current.length || pendingNotificationBehaviorActionsRef.current.length || pendingBehaviorEventsRef.current.length || pendingSharedEventPacketsRef.current.length || pendingSharedEventTokensRef.current.length);
        hydratedRef.current = true;
        setHydrated(true);
        const pendingIds = [...new Set(pendingNotificationCompletionIdsRef.current)];
        pendingNotificationCompletionIdsRef.current = [];
        if (pendingIds.length > 0) completeTaskIdsRef.current(pendingIds, 'notification');
        const pendingDepartureActions = pendingDepartureNotificationActionsRef.current;
        pendingDepartureNotificationActionsRef.current = [];
        pendingDepartureActions.forEach(({ planId, action, notificationInstanceId }) => notificationCallbacksRef.current.applyPremiumDepartureNotificationAction(planId, action, notificationInstanceId));
        const pendingNotificationActions = pendingNotificationBehaviorActionsRef.current;
        pendingNotificationBehaviorActionsRef.current = [];
        const pendingBehaviorEvents = pendingBehaviorEventsRef.current;
        pendingBehaviorEventsRef.current = [];
        if (pendingBehaviorEvents.length > 0) {
          const updated = appendBehaviorEvents(behaviorEventsRef.current, pendingBehaviorEvents);
          behaviorEventsRef.current = updated;
          setBehaviorEvents(updated);
        }
        pendingNotificationActions.forEach((action) => notificationCallbacksRef.current.recordNotificationBehaviorAction(action));
        const pendingSharedPackets = pendingSharedEventPacketsRef.current;
        pendingSharedEventPacketsRef.current = [];
        pendingSharedPackets.forEach((packet) => {
          const normalized = notificationCallbacksRef.current.syncSharedEventPacket(packet);
          const ownerParticipantId = normalized.participants[0]?.participantId;
          if (ownerParticipantId && !sharedParticipantIdsByTokenRef.current[normalized.shareToken]) {
            setSharedParticipantIdsByToken((current) => ({ ...current, [normalized.shareToken]: ownerParticipantId }));
          }
          notificationCallbacksRef.current.openSharedEventToken(normalized.shareToken);
        });
        const pendingSharedTokens = [...new Set(pendingSharedEventTokensRef.current)];
        pendingSharedEventTokensRef.current = [];
        pendingSharedTokens.forEach((shareToken) => notificationCallbacksRef.current.openSharedEventToken(shareToken));
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

    return () => { active = false; };
  }, [hydrationRetry]);

  useEffect(() => {
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
        notificationCallbacksRef.current.applyPremiumDepartureNotificationAction(departurePlanId, departureAction, notificationInstanceId);
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
        notificationCallbacksRef.current.recordNotificationBehaviorAction({ notificationInstanceId, action: action === 'DONE' ? 'completed' : 'snoozed', taskId, actualAt: new Date() });
      }
      if (action === 'DONE') {
        if (!hydratedRef.current) {
          pendingNotificationCompletionIdsRef.current.push(taskId);
          return;
        }
        completeTaskIdsRef.current([taskId], 'notification');
        void cancelPendingTaskNotifications(taskId).catch((error) => console.warn('Task notification cancellation failed.', error));
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
            notificationCallbacksRef.current.recordBehaviorEvent(createNotificationScheduledEvent({ notificationInstanceId: nextNotificationInstanceId, taskId, taskTitle: task.title, scheduledAt, occurredAt: new Date() }));
          }
        }).catch((error) => {
          if (__DEV__) console.warn('[Notifications] task action scheduling failed', error);
        });
      }
    });

    return () => responseSubscription.remove();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);



  useEffect(() => {
    if (!hydrated) return;
    const cleanup = () => {
      setRecoveryHistory((current) => {
        const next = pruneRecoveryHistory(current);
        return next.length === current.length ? current : next;
      });
      setFocusSessions((current) => {
        const next = pruneFocusSessions(current);
        return next.length === current.length ? current : next;
      });
      setBehaviorEvents((current) => {
        const next = pruneBehaviorEvents(current);
        behaviorEventsRef.current = next;
        return next.length === current.length ? current : next;
      });
      setRoutineArchives((current) => {
        const next = pruneRoutineArchives(current);
        return next.length === current.length ? current : next;
      });
    };
    cleanup();
    const timer = setInterval(cleanup, 60 * 60_000);
    return () => clearInterval(timer);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || persistenceDisabledRef.current || !startupPhotoReferencesRef.current) return;
    // Only scan the successfully read snapshot once. Files used by an editor
    // or copied during this launch are separately protected for this session.
    let active = true;
    const timer = setTimeout(() => { void (async () => {
      const startupReferences = startupPhotoReferencesRef.current;
      if (!startupReferences || persistenceDisabledRef.current) return;
      try {
        const currentReferences = latestPersistedStateRef.current ? collectReferencedManagedPhotoUris(latestPersistedStateRef.current) : startupReferences;
        const backup = await loadPreSyncBackupState();
        if (!active || persistenceDisabledRef.current) return;
        const backupReferences = backup ? collectReferencedManagedPhotoUris(backup) : [];
        cleanupUnreferencedManagedPhotos([...startupReferences, ...currentReferences, ...backupReferences]);
      } catch (error) {
        console.warn('Photo cleanup skipped because references could not be inspected.', error);
      }
    })(); }, 1_000);
    return () => { active = false; clearTimeout(timer); };
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
      if (item.id && isArrivalReversePlan(item)) void cancelPendingDepartureNotifications(item.id).catch((error) => console.warn('Departure notification cancellation failed.', error));
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
    if (!hydrated || !storeKitEntitlementsResolved || persistenceDisabledRef.current) return;
    const generation = ++liveActivitySyncGenerationRef.current;
    const isCurrent = () => generation === liveActivitySyncGenerationRef.current;
    const enqueueNative = (operation: () => Promise<unknown>) => {
      const pending = liveActivityOperationRef.current.catch(() => undefined).then(operation);
      liveActivityOperationRef.current = pending;
      return pending;
    };
    const serialized = liveActivityPayload ? JSON.stringify(liveActivityPayload) : undefined;
    if (!serialized || !liveActivityPayload) {
      liveActivitySerializedRef.current = undefined;
      setLiveActivityRuntimeStatus('off');
      if (__DEV__) console.log('[LiveActivity] sync-action', { action: 'end', reason: 'payload-unavailable' });
      void enqueueNative(async () => { if (isCurrent()) await endRhythmLiveActivity(); }).catch(() => { if (isCurrent()) setLiveActivityRuntimeStatus('failed'); });
      return () => { liveActivitySyncGenerationRef.current += 1; };
    }
    if (serialized === liveActivitySerializedRef.current) return;
    const payload = liveActivityPayload;
    if (__DEV__) console.log('[LiveActivity] sync-action', { action: 'start-or-update', mode: payload.mode, tier: payload.tier });
    setLiveActivityRuntimeStatus('starting');
    void (async () => {
      const { available, reason } = await getRhythmLiveActivityAvailability();
      if (!isCurrent()) return;
      if (!available) {
        // Never cache a failed call as if it had started. This makes a later
        // native-capable build or a manual re-enable retry the same payload.
        liveActivitySerializedRef.current = undefined;
        setLiveActivityRuntimeStatus(reason ?? 'unavailable');
        if (__DEV__) console.log('[LiveActivity] sync-complete', { action: 'start-or-update', result: false, reason: 'unavailable' });
        return;
      }
      await enqueueNative(async () => {
      if (!isCurrent()) return;
      const result = await startOrUpdateRhythmLiveActivity(payload);
      if (!isCurrent()) return;
      const status = await getRhythmLiveActivityStatus();
      if (!isCurrent()) return;
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
      });
    })().catch((error) => {
      if (isCurrent()) { liveActivitySerializedRef.current = undefined; setLiveActivityRuntimeStatus('failed'); }
      if (__DEV__) console.warn('[LiveActivity] sync failed', error);
    });
    return () => { liveActivitySyncGenerationRef.current += 1; };
  }, [hydrated, liveActivityEnabled, liveActivityPayload, storeKitEntitlementsResolved]);

  const syncRhythmWidgetSnapshot = React.useCallback(async () => {
    // The first-run tour is deliberately read-only; its temporary data must
    // never escape to the user's home-screen widget.
    if (!hydrated || !storeKitEntitlementsResolved || persistenceDisabledRef.current || onboarding.state.firstRunStage === 'demo') return 'waiting' as const;
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
    if (requestId !== widgetSnapshotRequestRef.current) return 'superseded' as const;
    if (!photoWasCopied && serialized === widgetSnapshotSerializedRef.current) return 'unchanged' as const;
    widgetSnapshotInFlightRef.current = { requestId, serialized };
    const persist = async () => {
      if (requestId !== widgetSnapshotRequestRef.current) return 'superseded' as const;
      try {
        const saved = await saveRhythmWidgetSnapshot(snapshot);
        if (__DEV__) console.log('[CalendarDiagnostic] WIDGET_SNAPSHOT_WRITE', { timestamp: new Date().toISOString(), success: saved, departurePlansCount: departurePlans.length, calendarPlansCount: snapshot.calendarPlans?.length ?? 0 });
        if (saved && requestId === widgetSnapshotRequestRef.current) widgetSnapshotSerializedRef.current = serialized;
        return saved ? requestId === widgetSnapshotRequestRef.current ? 'updated' as const : 'superseded' as const : 'unavailable' as const;
      } catch (error) {
        // Expo Go has no WidgetKit module. Native failures should not affect app state.
        console.warn('Rhythm widget snapshot save failed.', error);
        return 'unavailable' as const;
      } finally {
        if (widgetSnapshotInFlightRef.current?.requestId === requestId) widgetSnapshotInFlightRef.current = undefined;
      }
    };
    // Native writes are serialized as well as generation-checked. If a newer
    // request arrives while an older native write is in progress, it waits for
    // that write and becomes the final write; an older queued request skips.
    const queuedPersist = widgetSnapshotSaveChainRef.current.then(persist, persist);
    widgetSnapshotSaveChainRef.current = queuedPersist.catch(() => undefined);
    return await queuedPersist;
  }, [affirmationCustomTexts, affirmations, chicCheckColor, designMode, departureCheckIns, departurePlans, effectiveChicPattern, hasDesignCustomizeAccess, hydrated, onboarding.state.firstRunStage, planTier, rewardedAccess.widgetPhotoCustomization, storeKitEntitlementsResolved, tasks, widgetPhotoSyncedUriRef, widgetCustomPhotoSyncedUrisRef, widgetSettings, wishMonths, wishTopImageUri]);

  const markWidgetGuideSeen = React.useCallback(() => {
    if (!onboarding.isCompleted('widgetGuide')) void onboarding.complete('widgetGuide');
  }, [onboarding]);

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
        .forEach((task) => { void cancelPendingTaskNotifications(task.id).catch((error) => console.warn('Task notification cancellation failed.', error)); void cancelScheduleSwitchNotificationsForTask(task.id); });
      setRoutineArchives((current) => pruneRoutineArchives([...current.filter((item) => item.routineId !== routineId), archive]));
      recordBehaviorEvent(createRoutineDeactivatedBehaviorEvent({ routineId, routineTitle: latest.title, taskId: latest.id, occurredAt: new Date(endedAt), targetDate: dateKey(endedAt) }));
    } }]);
  }, [recordBehaviorEvent]);
  const openWidgetSection = React.useCallback(() => undefined, []);
  const refreshWidgetFromSettings = React.useCallback(() => syncRhythmWidgetSnapshot()
    .then((result) => {
      if (result === 'updated') Alert.alert('Widgetを更新しました', '最新の予定とタスクを同期しました。');
      else if (result === 'unchanged') Alert.alert('Widgetは最新の状態です', '前回の同期から変更はありません。');
      else if (result === 'waiting' || result === 'superseded') Alert.alert('Widgetの更新を確認中です', '読込・利用状況の確認が終わってから、もう一度お試しください。');
      else Alert.alert('Widgetを更新できませんでした', 'このビルドのWidget連携と端末の状態を確認してください。');
    })
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

  const addTask = (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule: RepeatRule = 'none', nudgeMode: NudgeMode = 'once', scheduledDate?: string, scheduledTime?: string, endAt?: string, isRoutine = false, subtasks: Subtask[] = [], estimatedMinutes?: number, listItems: TaskListItem[] = [], routineIdOverride?: string): Task | undefined => {
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
    const task: Task = taskWithUnifiedMemos({
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
      estimatedMinutes: normalizeEstimatedMinutes(estimatedMinutes),
      subtasks: subtasks.map((item, index) => ({ ...item, order: index, done: Boolean(item.done) })),
      listItems: listItems.map((item, index) => ({ ...item, order: index, checked: Boolean(item.checked), text: item.text.trim() })).filter((item) => item.text),
    });
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

  const updateTask = (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule: RepeatRule = 'none', nudgeMode: NudgeMode = 'once', scheduledDate?: string, scheduledTime?: string, endAt?: string, isRoutine = false, subtasks: Subtask[] = [], estimatedMinutes?: number, listItems?: TaskListItem[]) => {
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
    const applyUpdate = (detachOrigin = false) => {
    const latestTask = tasksRef.current.find(task => task.id === editingTask.id);
    if (!latestTask) return;
    const reactivatesRoutine = isRoutine && !latestTask.isRoutine && Boolean(latestTask.routineId);
    const endedAt = latestTask.isRoutine && !isRoutine ? new Date().toISOString() : latestTask.routineEndedAt;
    const existingStatus = getTaskStatus(latestTask);
    const updated = taskWithUnifiedMemos({ ...latestTask, origin: detachOrigin ? undefined : latestTask.origin, title, category, priority, remindDate, remindAt, deadlineDate, deadlineTime, deadlineNotifyBefore, navigationEnabled, preparationMinutes, travelMinutes, bufferMinutes, repeatRule, isRoutine, routineId: isRoutine ? latestTask.routineId ?? latestTask.id : latestTask.routineId, routineEndedAt: isRoutine ? undefined : endedAt, nudgeMode, scheduledDate: scheduledDate ?? latestTask.scheduledDate ?? dateKey(now), scheduledTime, endAt: endAt && /^\d{2}:\d{2}$/.test(endAt) ? endAt : undefined, estimatedMinutes: normalizeEstimatedMinutes(estimatedMinutes), done: latestTask.done, status: existingStatus, completedAt: latestTask.completedAt, skippedAt: latestTask.skippedAt, subtasks: subtasks.map((item, index) => ({ ...item, order: index, done: Boolean(item.done) })), listItems: (listItems ? mergeTaskMemoEdit(editingTask.listItems ?? [], listItems, latestTask.listItems ?? []) : latestTask.listItems ?? []).map((item, index) => ({ ...item, text: item.text.trim(), order: index, checked: Boolean(item.checked) })).filter((item) => item.text) });
    const nextTasks = tasksRef.current.map((task) => {
      if (task.id === latestTask.id) return updated;
      if (latestTask.isRoutine && !isRoutine && (task.routineId ?? task.id) === existingRoutineId) {
        return { ...task, isRoutine: false, routineEndedAt: endedAt };
      }
      return task;
    });
    tasksRef.current = nextTasks;
    setTasks(nextTasks);
    setEditingTask(null);
    if (isRoutine) void onboarding.complete('routine');
    if (latestTask.isRoutine && !isRoutine && updated.routineId && endedAt) {
      recordBehaviorEvent(createRoutineDeactivatedBehaviorEvent({ routineId: updated.routineId, routineTitle: latestTask.title, taskId: latestTask.id, occurredAt: new Date(endedAt), targetDate: dateKey(endedAt) }));
    }
    if (reactivatesRoutine && updated.routineId) {
      recordBehaviorEvent(createRoutineStateChangedBehaviorEvent({ taskId: updated.id, routineId: updated.routineId, routineTitle: updated.title, occurredAt: new Date(), targetDate: dateKey(), completed: Boolean(updated.done), source: 'manual' }));
    }
    if (updated.done || getTaskStatus(updated) === 'skipped') void cancelPendingTaskNotifications(updated.id).catch((error) => console.warn('Task notification cancellation failed.', error));
    else void scheduleAllTaskNotifications(updated);
    void syncScheduleSwitchNotificationsForTask(updated.id);
    queueScheduleConflictCheck(updated, departurePlansRef.current);
    };
    if (readWishTaskOrigin(tasksRef.current.find(task => task.id === editingTask.id)?.origin) && (repeatRule !== 'none' || isRoutine)) {
      Alert.alert('目標との連動を解除しますか？', '繰り返しに変更すると、このToDoと目標の行動の完了連動を解除します。元の行動と完了状態は残ります。', [
        { text: 'キャンセル', style: 'cancel' }, { text: '連動を解除して変更', onPress: () => applyUpdate(true) },
      ]);
    } else applyUpdate();
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
      const linkedActionIds = new Set(actions.filter((raw: any) => typeof raw?.id === 'string' && raw.type === 'completeTask'
        && (appliedLinkedWidgetCompletionIdsRef.current.has(raw.id)
          || tasksRef.current.some(task => task.id === raw.taskId && isOneOffWishTask(task)))).map((raw: any) => raw.id));
      const linkedActionTaskIds = new Set(actions.filter((raw: any) => linkedActionIds.has(raw?.id)).map((raw: any) => raw.taskId));
      const handledIds: string[] = [];
      const taskIdsToComplete: string[] = [];
      const createdTasks: Task[] = [];
      const createdPlans: DeparturePlan[] = [];
      let nextTasks = tasksRef.current;
      let nextPlans = departurePlansRef.current;
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
              ...(scheduledTime ? { remindDate: scheduledDate, remindAt: scheduledTime } : {}),
            };
            nextTasks = [task, ...nextTasks];
            createdTasks.push(task);
            queueScheduleConflictCheck(task, departurePlansRef.current);
          }
          handledIds.push(raw.id);
        } else if (raw.type === 'addPlan' && typeof raw.title === 'string') {
          const title = raw.title.trim();
          if (title) {
            const scheduledDate = typeof raw.scheduledDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.scheduledDate)
              ? raw.scheduledDate
              : dateKey();
            const scheduledTime = typeof raw.scheduledTime === 'string' && /^\d{2}:\d{2}$/.test(raw.scheduledTime)
              ? raw.scheduledTime
              : undefined;
            const createdPlan: DeparturePlan = {
              ...initialPlan,
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}-siri-plan`,
              title,
              date: scheduledDate,
              // A Siri request without a date/time is a calendar-only,
              // time-free plan. Never inherit initialPlan's 10:00 default.
              arrival: scheduledTime ?? '',
              allDay: !scheduledTime,
              planMode: scheduledTime ? 'departure_reminder' : 'calendar_only',
              countdownEnabled: Boolean(scheduledTime),
              ...(scheduledTime ? { departureTime: scheduledTime } : {}),
            };
            nextPlans = [createdPlan, ...nextPlans];
            createdPlans.push(createdPlan);
          }
          handledIds.push(raw.id);
        } else if (raw.type === 'completeTask' && typeof raw.taskId === 'string') {
          const target = nextTasks.find((task) => task.id === raw.taskId);
          if (target && !target.done && !appliedLinkedWidgetCompletionIdsRef.current.has(raw.id)) {
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
      if (nextPlans !== departurePlansRef.current) {
        departurePlansRef.current = nextPlans;
        setDeparturePlans(nextPlans);
      }
      for (const createdTask of createdTasks) {
        if (createdTask.remindAt) void scheduleAllTaskNotifications(createdTask);
        void syncScheduleSwitchNotificationsForTask(createdTask.id);
      }
      for (const createdPlan of createdPlans) {
        if (createdPlan.departureTime) {
          try {
            await scheduleDeparture(createdPlan);
          } catch {
            // The plan itself is already persisted. Notification failures must
            // not discard a successful Siri/App Shortcuts addition.
          }
          if (createdPlan.id) void syncScheduleSwitchNotificationsForPlan(createdPlan.id);
        }
        queuePlanConflictCheck(createdPlan, tasksRef.current);
      }
      if (createdPlans.length) void onboarding.complete('planRegistration');
      if (taskIdsToComplete.length) completeTaskIds(taskIdsToComplete, 'manual');
      linkedActionIds.forEach(id => appliedLinkedWidgetCompletionIdsRef.current.add(id));
      const ordinaryActionIds = handledIds.filter(id => !linkedActionIds.has(id));
      if (ordinaryActionIds.length) await acknowledgeRhythmWidgetPendingActions(ordinaryActionIds);
      if (linkedActionIds.size) {
        // Do not consume the native completion before the corresponding main
        // state is durable. Match the latest intent (including a later undo or
        // deletion), not the stale completed snapshot captured above.
        while (true) {
          const expectedTasks = tasksRef.current;
          const expectedWishMonths = wishMonthsRef.current;
          const saved = waitForSettingsSave(state => state.tasks === expectedTasks && state.tasks.every(task => {
            if (!linkedActionTaskIds.has(task.id) || !isOneOffWishTask(task)
              || state.tasks.filter(other => sameWishTaskOrigin(other.origin, task.origin)).length !== 1) return true;
            const action = linkedWishAction(state.wishMonths ?? {}, task.origin);
            return !action || action.completed === task.done;
          }));
          setSaveRetry(value => value + 1);
          try { await saved; }
          catch (error) {
            if (expectedTasks !== tasksRef.current || expectedWishMonths !== wishMonthsRef.current) continue;
            console.warn('Linked Widget completion is not saved; native action retained.', error); return;
          }
          if (expectedTasks !== tasksRef.current || expectedWishMonths !== wishMonthsRef.current) continue;
          break;
        }
        const acknowledgedIds = handledIds.filter(id => linkedActionIds.has(id));
        if (await acknowledgeRhythmWidgetPendingActions(acknowledgedIds)) {
          acknowledgedIds.forEach(id => appliedLinkedWidgetCompletionIdsRef.current.delete(id));
        }
      }
    } finally {
      pendingWidgetActionsProcessingRef.current = false;
    }
  }, [completeTaskIds, onboarding, onboarding.state.firstRunStage, queuePlanConflictCheck]);

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
      const pending = await getPendingNotificationRequests();
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
      const pending = await getPendingNotificationRequests();
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
      const pending = await getPendingNotificationRequests();
      await Promise.all(pending.filter((request) => {
        const data = request.content.data as Record<string, unknown> | undefined;
        return data?.kind === 'schedule_switch' && data.taskId === taskId;
      }).map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
    }).catch(() => undefined);
  };

  const cancelScheduleSwitchNotificationsForPlan = async (planId: string) => {
    await enqueueNotificationOperation('schedule-switch', async () => {
      const pending = await getPendingNotificationRequests();
      await Promise.all(pending.filter((request) => {
        const data = request.content.data as Record<string, unknown> | undefined;
        return data?.kind === 'schedule_switch' && data.departurePlanId === planId;
      }).map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
    }).catch(() => undefined);
  };

  const scheduleAllTaskNotifications = async (task: Task) => {
    try {
      await enqueueNotificationOperation(`task:${task.id}`, () => reconcileTaskNotificationsUnsafe(task.id, async () => {
        await cancelPendingTaskNotificationsUnsafe(task.id);
        const latest = tasksRef.current.find((item) => item.id === task.id);
        if (!latest || latest.done || latest.status === 'skipped') return;
        if (latest.remindAt) await scheduleTaskReminder(latest);
        if (latest.deadlineDate && latest.deadlineTime && latest.deadlineNotifyBefore !== undefined) await scheduleDeadlineReminder(latest);
      }));
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
    await enqueueNotificationOperation(`departure:${planId}`, () => reconcileNotificationOperation('departure', planId, async () => {
      await cancelPendingDepartureNotificationsUnsafe(planId);
      const latestPlan = departurePlansRef.current.find((item) => item.id === planId);
      if (!latestPlan) return;
      targetPlan = latestPlan;
      const mode = getDeparturePlanMode(targetPlan);
      if (mode === 'calendar_only') return;
      if (!(options?.silent ? canUseNotifications(await getNotificationPermissionStatus()) : await ensureNotifications())) {
        if (options?.silent) throw new Error('Notification permission unavailable');
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
    }));
  };
  useEffect(() => {
    if (!hydrated || !storeKitEntitlementsResolved || planTier !== 'premium') return;
    let active = true;
    void (async () => {
      if (!active) return;
      for (const item of departurePlans) {
        if (!item.id || getDeparturePlanMode(item) === 'calendar_only' || planDateKey(item) < dateKey()) continue;
        await cancelPendingDepartureNotifications(item.id).catch(() => undefined);
        await scheduleDeparture(item, { silent: true }).catch((error) => console.warn('Departure notification scheduling failed.', error));
      }
    })();
    return () => { active = false; };
  }, [hydrated, planTier, storeKitEntitlementsResolved]);
  scheduleTaskNotificationsRef.current = scheduleAllTaskNotifications;

  useEffect(() => {
    if (!hydrated || !storeKitEntitlementsResolved || persistenceDisabledRef.current) return;
    let active = true;
    void pendingNotificationReconciliations('departure').then(async (ids) => {
      for (const id of ids) {
        if (!active) return;
        const current = departurePlansRef.current.find((item) => item.id === id);
        try {
          if (current) await scheduleDeparture(current, { silent: true });
          else await cancelPendingDepartureNotifications(id);
        } catch (error) { console.warn('Departure notification reconciliation failed.', error); }
      }
    }).catch((error) => console.warn('Departure notification reconciliation could not be loaded.', error));
    return () => { active = false; };
  }, [hydrated, storeKitEntitlementsResolved]);

  useEffect(() => {
    if (!hydrated || persistenceDisabledRef.current || focusState) return;
    let active = true;
    void pendingNotificationReconciliations('focus').then(async (ids) => {
      for (const id of ids) {
        if (!active) return;
        await enqueueNotificationOperation('focus', async () => {
          if (!active || focusStateRef.current) return;
          await reconcileNotificationOperation('focus', id, () => cancelPendingFocusCompletionNotifications(id));
        })
          .catch((error) => console.warn('Focus notification reconciliation failed.', error));
      }
    }).catch((error) => console.warn('Focus notification reconciliation could not be loaded.', error));
    return () => { active = false; };
  }, [hydrated, focusState]);

  useEffect(() => {
    if (!hydrated || !storeKitEntitlementsResolved || persistenceDisabledRef.current) return;
    let active = true;
    void getUnreconciledTaskNotificationIds().then(async (ids) => {
      for (const id of ids) {
        if (!active) return;
        const task = tasksRef.current.find((item) => item.id === id);
        if (task && !task.done && task.status !== 'skipped') {
          await scheduleTaskNotificationsRef.current(task);
        } else {
          await cancelPendingTaskNotifications(id).catch((error) => console.warn('Task notification reconciliation failed.', error));
        }
      }
    }).catch((error) => console.warn('Task notification reconciliation could not be loaded.', error));
    return () => { active = false; };
  }, [hydrated, storeKitEntitlementsResolved]);

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

  const createTaskFromWishAction = async (action: WishAction) => {
    if (!hydratedRef.current || persistenceDisabledRef.current) throw new Error('保存データを確認できません');
    const origin = { monthKey: currentWishMonthKey, wishId: action.wishId, actionId: action.id };
    const source = linkedWishAction(wishMonthsRef.current, origin);
    if (!source) throw new Error('元の行動が見つかりません');
    const existing = tasksRef.current.find(task => sameWishTaskOrigin(task.origin, origin));
    let linkedId = existing?.id;
    if (!existing) {
      const created = addTask(action.title, categories[0]!, priorities[1]!);
      if (!created) throw new Error('ToDoを作成できませんでした');
      linkedId = created.id;
      const next = tasksRef.current.map(task => task.id === created.id ? { ...task, origin } : task);
      tasksRef.current = next;
      setTasks(next);
      if (source.completed) completeTaskIds([created.id]);
    }
    // Reuse the main save receipt/queue. Retrying a failed creation persists
    // the existing explicit link rather than generating another task.
    const saved = waitForSettingsSave(state => Boolean(state.tasks?.some(task => task.id === linkedId && sameWishTaskOrigin(task.origin, origin))));
    setSaveRetry(value => value + 1);
    await saved;
  };

  const createEmptyPlanDraft = (): DeparturePlan => ({ ...initialPlan, title: '', planMode: 'calendar_only', countdownEnabled: false, date: todayInputValue() });

  const closePlanEditor = React.useCallback(() => {
    if (departureSavingRef.current) return;
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
    if (!hydrated) return;
    void enqueueNotificationOperation('routine-remaining', async () => {
      const day = dateKey(new Date());
      const remaining = getTodayRemainingRoutines(tasksRef.current, day);
      const pending = await getPendingNotificationRequests();
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
    });
  }, [hydrated, now, tasks]);

  useEffect(() => {
    if (screen !== 'wish') setVoiceWishDraft(undefined);
  }, [screen]);

  const saveDeparturePlan = async (): Promise<boolean> => {
    if (departureSavingRef.current) return false;
    departureSavingRef.current = true;
    try {
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
    const nextPlans = editTarget
      ? departurePlansRef.current.map((item) => item.id === editTarget.id ? saved : item)
      : [...departurePlansRef.current, saved];
    departurePlansRef.current = nextPlans;
    const persisted = waitForSettingsSave((state) => state.departurePlans?.some((item) => item.id === saved.id && JSON.stringify(item) === JSON.stringify(saved)) === true);
    setDeparturePlans(nextPlans);
    // Keep the generated ID in the draft so a failed write can be retried
    // without creating a second plan. The global save queue owns durability.
    setPlan((current) => ({ ...current, id: saved.id }));
    await persisted;
    if (editTarget?.id) {
      await cancelPendingDepartureNotifications(editTarget.id).catch((error) => console.warn('Departure notification cancellation failed.', error));
      await cancelScheduleSwitchNotificationsForPlan(editTarget.id).catch((error) => console.warn('Schedule switch notification cancellation failed.', error));
    }
    try {
      await scheduleDeparture(saved);
    } catch {
      Alert.alert('予定は保存しました', '通知を設定できませんでした。端末の通知設定を確認してください。');
    }
    if (saved.id) void syncScheduleSwitchNotificationsForPlan(saved.id);
    if (mode === 'calendar_only') Alert.alert(plan.id ? '予定を保存しました' : '予定を追加しました', '予定表に表示しました。');
    departureSavingRef.current = false;
    closePlanEditor();
    void onboarding.complete('planRegistration');
    queuePlanConflictCheck(saved, tasksRef.current);
    return true;
    } catch (error) {
      if (__DEV__) console.warn('Departure plan save failed.', error);
      Alert.alert('予定を保存できませんでした', '入力内容は残っています。もう一度保存してください。');
      return false;
    } finally {
      departureSavingRef.current = false;
    }
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
            void cancelPendingDepartureNotifications(id).catch((error) => console.warn('Departure notification cancellation failed.', error));
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
    setFocusCompletionPromptOpen(focusCompletionCanPresentRef.current);
    return true;
  }, []);

  useEffect(() => {
    if (!focusTaskCompletionPrompt) return;
    const target = tasksRef.current.find((task) => task.id === focusTaskCompletionPrompt.taskId);
    if (!target || target.done || target.status === 'skipped') { setFocusTaskCompletionPrompt(undefined); setFocusCompletionPromptOpen(false); }
  }, [focusTaskCompletionPrompt, tasks]);

  useEffect(() => {
    if (!scheduleConflictPrompt) return;
    if (!tasks.some((task) => task.id === scheduleConflictPrompt.task.id) || !departurePlans.some((plan) => plan.id === scheduleConflictPrompt.plan.id)) {
      setScheduleConflictPrompt(undefined);
    }
  }, [departurePlans, scheduleConflictPrompt, tasks]);

  const navigateWithinApp = React.useCallback((nextScreen: Screen) => {
    if (nextScreen !== 'analysis') {
      setOpenTodayReview(false);
      setAnalysisInitialTab('records');
    }
    // The timer is owned by App. Timeline tabs may unmount their views safely.
    if (nextScreen === 'wish') openWish();
    else setScreen(nextScreen);
  }, [openWish, screen]);
  navigateWithinAppRef.current = navigateWithinApp;

  // Premium previews reuse the production screens with fixed, read-only demo
  // data.  The parent preview surface disables pointer events, so these
  // callbacks are no-ops, so these screens cannot save tasks, schedule
  // notifications, request permissions, or mutate the user's state while
  // still showing the real layout, scroll behavior, and tokens.
  const renderWishCapturePreview = (premium: boolean, embedded = false): React.ReactNode => {
    const wishId = 'capture-preview-wish';
    const actions: WishAction[] = [
      { id: 'capture-preview-action-1', wishId, title: '少し時間をとる', completed: premium },
      ...(premium ? [{ id: 'capture-preview-action-2', wishId, title: 'できる範囲で続ける', completed: false }] : []),
    ];
    return (
      <View pointerEvents="none" style={{ width: '100%', height: embedded ? 440 : premium ? 740 : 620 }}>
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
        <View style={tileStyle}>{previewSavedBackgroundUri ? <Image source={{ uri: previewSavedBackgroundUri }} resizeMode="cover" style={{ width: '100%', height: 62 }} /> : <View style={{ height: 62, alignItems: 'center', justifyContent: 'center', backgroundColor: chicPalette.surfaceSubtle }}><Text style={{ color: chicPalette.textSecondary, fontSize: 18 }}>▧</Text></View>}<Text style={tileLabel}>写真</Text></View>
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
    const colors = getThemeTokens('minimal', chicPalette.id).colors;
    const previewColors = { background: colors.screenBackground, surface: colors.surface, border: colors.border, text: colors.primaryText, muted: colors.secondaryText, accent: colors.primaryAccent, soft: colors.softAccent, onAccent: '#FFFFFF' };
    return <View pointerEvents="none" style={{ width: '100%' }}>
      <DesignAppliedPreview showcase showcaseBackground={designFloralAssets.floral.source} tab="chic" selectedMode="chic" designMode="minimal" monoAppearance="light" monoPattern="plain" chicPattern="floral" chicCheckColor={chicCheckColor} chicPalette={chicPalette} photoTheme={{ placement: 'background' }} colors={previewColors} styles={styles} helpers={{ getThemeTokens: getThemedThemeTokens, getChicPatternVisual, getChicCheckColor, getNightSkyPalette }} components={{ ChicPatternDecor, BThemeRibbonDecoration, CThemeRibbonDecoration }} />
      <Text style={{ textAlign: 'center', color: theme.colors.secondaryText, fontSize: 12, lineHeight: 18, marginTop: 10 }}>シンプル・デザイン・写真</Text>
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
      photoTheme={displayPhotoTheme}
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

  const renderOnboardingEmbeddedStep = (id: IntroCardId | 'customize'): React.ReactNode => {
    if (id === 'customize') return renderEmbeddedAppearancePreview();
    if (id === 'today') return <View pointerEvents="none" style={{ padding: 8 }}><TodayWinStrip tasks={guideDemoTasks} designMode={uiDesignMode} chicPattern={effectiveChicPattern} chicPalette={chicPalette} onRestore={() => undefined} /></View>;
    if (id === 'voice') return <View pointerEvents="none"><VoiceInputModal visible={false} inlinePreview dateKey={dateKey} designMode={uiDesignMode} chicPalette={chicPalette} remainingUses={3} onClose={() => undefined} onRoute={() => false} hapticsEnabled={false} /></View>;
    if (id === 'schedule') {
      const previewDate = dateKey(now);
      const plans: DeparturePlan[] = [
        { id: 'intro-schedule-1', title: '朝の打ち合わせ', date: previewDate, arrival: '09:30', planMode: 'calendar_only', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0 },
        { id: 'intro-schedule-2', title: '自分の時間', date: previewDate, arrival: '11:00', planMode: 'calendar_only', travelMinutes: 0, preparationMinutes: 0, bufferMinutes: 0 },
      ];
      return <View pointerEvents="none" style={{ padding: 8 }}><DailyScheduleTimeline date={previewDate} tasks={[]} plans={plans} externalEvents={[]} now={now} designMode={uiDesignMode} chicPalette={chicPalette} planTier="premium" onEditTask={() => undefined} onEditPlan={() => undefined} visibleStartHour={9} visibleEndHour={12} /></View>;
    }
    if (id === 'records') return renderWishCapturePreview(false, true);
    return renderOnboardingCaptureStep(id);
  };

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
  // Premium does not opt a user into the old automatic multi-screen tour.
  // Normal users receive the same contextual, dismissible help as Free users.
  const premiumTourReady = firstRunDemoActive && planTier === 'premium' && onboarding.isCompleted('intro') && onboarding.isCompleted('design');
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
    // before the five-page introduction. A fresh skip now explicitly hands
    // off to the optional Design step just like the final CTA.
    if (!onboarding.ready || onboarding.introVisible || introDismissing || !onboarding.isCompleted('intro')) return;
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
  }, [onboarding.introVisible, onboarding.ready, onboarding.state.completed.intro, onboarding.state.firstRunStage, onboardingDesignSelectionPending, screen, introDismissing]);

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
    if (!productionGuideFeature || onboarding.introVisible || introDismissing || onboarding.state.firstRunStage === 'design' || onboardingDesignSelectionPending || guideTransitioning) return;
    navigateToGuideFeature(productionGuideFeature);
  }, [guideTransitioning, navigateToGuideFeature, onboarding.introVisible, onboarding.state.firstRunStage, introDismissing, onboardingDesignSelectionPending, productionGuideFeature]);

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
    if (!onboarding.ready || onboarding.introVisible || introDismissing || onboarding.state.firstRunStage === 'design' || onboardingDesignSelectionPending || guideTransitioning || pendingGuideFeature) return;
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
  }, [activeGuideTour, advanceGuide, contextualGuideFeature, currentGuideFeature, firstIncompleteGuide, guideTransitioning, introDismissing, navigateToGuideFeature, onboarding, onboardingDesignSelectionPending, pendingGuideFeature]);

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
    setFocusCompletionPromptOpen(false);
    setFocusCompletionNotice(false);
    if (!target) return;
    if (action === 'complete') completeTaskIds([target.id], 'manual');
    if (action === 'continue') { setTimelineInitialTab('focus'); setScreen('timeline'); }
  };

  const focusAvailableTasks = React.useMemo(() => getFocusAvailableTasks(tasks), [tasks, dateKey(now)]);
  const focusScreenVisible = screen === 'timeline' && timelineInitialTab === 'focus';

  const savedTodayJournal = reviewsForMonth(getMonthlyWishState(savedJournalMonths, dateKey(now).slice(0, 7))).find(review => review.date === dateKey(now));
  const currentTodayJournal = reviewsForMonth(getMonthlyWishState(wishMonths, dateKey(now).slice(0, 7))).find(review => review.date === dateKey(now));
  const journalReceiptSignature = (review?: MonthlyReview) => review ? JSON.stringify([review.id ?? '', review.date ?? '', review.shortNote ?? '', review.memo ?? '', review.satisfaction ?? 0, [...new Set([...(review.photos ?? []), review.photo ?? ''].filter(Boolean))]]) : '';
  const journalHasPendingChanges = journalReceiptSignature(savedTodayJournal) !== journalReceiptSignature(currentTodayJournal);
  const closeTodayJournal = () => { Keyboard.dismiss(); setOpenTodayReview(false); };
  const focusCompletionCanPresent = focusScreenVisible && !planEditorOpen && !editingTask && !addOpen && !bulkAddOpen && !voiceOpen && !premiumOpen && !designCustomizeOpen && !designPreviewPattern && !designTrialNoticeOpen && !openTodayReview && !sharedEventOpen && !recoveryTargetPlanId && !noticeCenterOpen && !tomorrowPrepOpen && !rewardedPrompt && !onboarding.introVisible && !firstRunDemoActive;
  focusCompletionCanPresentRef.current = focusCompletionCanPresent;
  const focusControllerOptions = {
    tasks, availableTasks: focusAvailableTasks, designMode: uiDesignMode, planTier,
    enabled: hydrated && !persistenceDisabledRef.current,
    customDurationMinutes: focusCustomDurationMinutes, onCustomDurationChange: setFocusCustomDurationMinutes,
    voiceStartRequest: voiceFocusRequest, focusPersistedState: focusState, onFocusStateChange: setFocusState,
    onFocusCompleted: completeFocusSession, onFocusTaskFinished: handleFocusTaskFinished,
    onFocusStarted: () => { setVoiceFocusRequest(undefined); setFocusCompletionNotice(false); setFocusTaskCompletionPrompt(undefined); setFocusCompletionPromptOpen(false); void onboarding.complete('focus'); },
    onFocusNotificationPermission: ensureNotifications, onFocusRunningChange: setFocusTimerActive,
    onFocusActivityChange: setFocusActivity, onBehaviorEvent: recordBehaviorEvent,
    hapticsEnabled, onHaptic: triggerHaptic, onCompletionAlert: (taskTitle?: string) => {
      if (focusCompletionCanPresentRef.current) showFocusCompletionAlert(taskTitle);
      else setFocusCompletionNotice(true);
    },
  };

  const photoEntryHint = usePhotoEntryHint(hydrated && onboarding.ready && !onboarding.introVisible && !introDismissing && onboarding.state.firstRunStage !== 'design' && !onboardingDesignSelectionPending && !firstRunDemoActive && screen === 'home', Boolean(photoTheme.imageUri || photoTheme.focusBackgroundUri || Object.values(photoTheme.topImageUris ?? {}).some(Boolean) || Object.values(photoTheme.topImageOriginalUris ?? {}).some(Boolean)));
  const noteSyncInteraction = useICloudStateSync({
    hydrated: hydrated && !persistenceDisabledRef.current,
    blocked: screen !== 'home' || syncHomeEditing || selectionMode || Boolean(persistenceIssue) || focusTimerActive || Boolean(focusTaskCompletionPrompt) || Boolean(scheduleConflictPrompt) || addOpen || bulkAddOpen || voiceOpen || Boolean(editingTask) || planEditorOpen || premiumOpen || designCustomizeOpen || Boolean(designPreviewPattern) || designTrialNoticeOpen || openTodayReview || sharedEventOpen || Boolean(recoveryTargetPlanId) || noticeCenterOpen || tomorrowPrepOpen || Boolean(photoEntryTarget) || Boolean(pendingTopPhoto) || topImageProcessing || firstRunDemoActive || onboardingDesignSelectionPending || captureStudioOpen,
    epoch: syncHydrationCompletedRef.current,
    loadedMissing: syncHydrationLoadedMissingRef.current,
    hadPendingActions: syncHydrationHadActionsRef.current,
    snapshot: createPersistedSnapshot,
    onRehydrate: () => setHydrationRetry(value => value + 1),
  });
  const openScreenPhotoEntry = (target: PhotoThemePhotoTarget) => { if (target === 'home') photoEntryHint.dismiss(); setPhotoEntryTarget(target); };

  if (persistenceIssue === 'read') return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.screenBackground, justifyContent: 'center', padding: 24 }}><Text accessibilityRole="alert" style={{ color: theme.colors.primaryText, fontSize: 20, fontWeight: '800' }}>保存データを読み込めませんでした</Text><Text style={{ color: theme.colors.secondaryText, fontSize: 14, lineHeight: 22, marginTop: 12 }}>データは消去していません。誤った上書きを防ぐため、読込ができるまで編集を停止しています。</Text><Pressable accessibilityRole="button" disabled={persistenceRetrying} onPress={() => { if (persistenceRetrying) return; setPersistenceRetrying(true); setHydrationRetry((value) => value + 1); }} style={{ minHeight: 48, marginTop: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.colors.primaryAccent }}><Text style={{ color: uiDesignMode === 'chic' ? chicPalette.onAccent : uiDesignMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF', fontSize: 14, fontWeight: '800' }}>{persistenceRetrying ? '読み込み中…' : 'もう一度読み込む'}</Text></Pressable></SafeAreaView>;

  return (
    <FocusRuntimeProvider options={focusControllerOptions}>
    <View onTouchStart={noteSyncInteraction} style={{ flex: 1, backgroundColor: imageDesignBackground?.background ?? (uiDesignMode === 'chic' ? getChicPatternVisual(effectiveChicPattern, chicPalette).background : theme.colors.screenBackground) }}>
      {imageDesignBackground && imageDesignBackgroundSize && <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { overflow: 'hidden', backgroundColor: imageDesignBackground.background }]}><Image source={imageDesignBackground.source} style={[imageDesignBackgroundSize, { position: 'absolute', top: 0, alignSelf: 'center' }]} /></View>}
      <SafeAreaView style={[styles.safe, uiDesignMode === 'minimal' && styles.safeMinimal, uiDesignMode === 'dark' && styles.safeDark, designMode === 'photo' && styles.safePhoto, !hydrated && { opacity: 0 }, { backgroundColor: 'transparent' }]}>
      <StatusBar style={uiDesignMode === 'dark' || (designMode === 'chic' && effectiveChicPattern === 'nightSky') ? 'light' : 'dark'} />
      {isMonoDesign && effectiveMonoPattern === 'looseLeaf' && <MonoLooseLeafBackground dark={uiDesignMode === 'dark'} />}
      {isMonoDesign && effectiveMonoPattern === 'chic' && <MonoChicBackground dark={uiDesignMode === 'dark'} />}
      {photoBackgroundUri && <View pointerEvents="none" style={styles.photoThemeBackgroundWrap}><Image source={{ uri: photoBackgroundUri }} resizeMode="cover" style={styles.photoThemeBackground} /></View>}
      <View style={styles.app} pointerEvents={hydrated ? 'auto' : 'none'}>
      {persistenceIssue === 'write' && <View accessibilityRole="alert" style={{ padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.danger, backgroundColor: theme.colors.surface }}><Text style={{ color: theme.colors.primaryText, fontSize: 13, lineHeight: 19 }}>未保存の変更があります。アプリを閉じる前に保存を再試行してください。</Text><Pressable accessibilityRole="button" disabled={persistenceRetrying} style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => { if (persistenceRetrying) return; setPersistenceRetrying(true); setSaveRetry((value) => value + 1); }}><Text style={{ color: theme.colors.primaryAccent, fontSize: 14, fontWeight: '800' }}>{persistenceRetrying ? '保存を再試行中…' : '保存を再試行'}</Text></Pressable></View>}
        <BThemeRibbonPreload />
        <CThemeRibbonPreload />
        {uiDesignMode === 'chic' && !photoThemeEnabled && !isImageDesignPattern(effectiveChicPattern) && <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><ChicPatternDecor pattern={effectiveChicPattern} accent={chicPalette.accent} warm={chicPalette.accentSoft} checkColor={chicCheckColor} /></View>}
        {backgroundVeilVisible && <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: backgroundVeilColor, opacity: backgroundVeilOpacity }]} />}
        {photoTopImageUri && screen !== 'wish' ? <><PhotoReadableBand enabled={Boolean(photoBackgroundUri)} testID="photo-header-band"><Header designMode={uiDesignMode} now={now} compact chicPalette={headerChicPalette} onVoice={handleHeaderVoice} onPremium={planTier === 'premium' ? undefined : () => openPremiumFeature('voice')} onNotifications={screen === 'settings' ? () => setNoticeCenterOpen(true) : undefined} hasUnreadNotifications={screen === 'settings' && unreadNoticeCount > 0} /></PhotoReadableBand>{screen === 'settings' || firstRunDemoActive ? <View style={styles.photoThemeTopImage}><Image source={{ uri: photoTopImageUri }} resizeMode="cover" style={styles.photoThemeTopImageContent} /></View> : <PhotoTopEntry uri={photoTopImageUri} label={screen === 'home' ? 'ホームのトップ画' : screen === 'timeline' ? '予定のトップ画' : '分析のトップ画'} hint={screen === 'home' && photoEntryHint.visible} onPress={() => openScreenPhotoEntry(screen)} designMode={uiDesignMode} chicPalette={chicPalette} style={styles.photoThemeTopImage} imageStyle={styles.photoThemeTopImageContent} />}</> : <PhotoReadableBand enabled={Boolean(photoBackgroundUri)} testID="photo-header-band"><Header designMode={uiDesignMode} now={now} chicPalette={headerChicPalette} onVoice={handleHeaderVoice} onPremium={planTier === 'premium' ? undefined : () => openPremiumFeature('voice')} onNotifications={screen === 'settings' ? () => setNoticeCenterOpen(true) : undefined} hasUnreadNotifications={screen === 'settings' && unreadNoticeCount > 0} /></PhotoReadableBand>}

        {!firstRunDemoActive && !photoTopImageUri && (screen === 'home' || screen === 'timeline' || screen === 'analysis') && <PhotoTopEntry label={screen === 'home' ? 'ホームのトップ画' : screen === 'timeline' ? '予定のトップ画' : '分析のトップ画'} hint={screen === 'home' && photoEntryHint.visible} onPress={() => openScreenPhotoEntry(screen)} designMode={uiDesignMode} chicPalette={chicPalette} />}
        <ScrollView testID="app-main-scroll" contentInsetAdjustmentBehavior={screen === 'settings' ? 'never' : undefined} automaticallyAdjustContentInsets={screen === 'settings' ? false : undefined} style={screen === 'settings' ? { overflow: 'hidden' } : undefined} contentContainerStyle={[styles.content, screen === 'settings' && { paddingTop: 24 }, screen === 'timeline' && styles.contentTimeline, statusNoticeHeight > 0 && { paddingBottom: Math.max(screen === 'timeline' ? styles.contentTimeline.paddingBottom : styles.content.paddingBottom, getBottomNavTopOffset(uiDesignMode) + 8 + statusNoticeHeight + 16) }]} keyboardShouldPersistTaps="handled">
          {screen === 'home' && (
            <HomeScreen
              photoBackgroundVisible={Boolean(photoBackgroundUri)}
              tasks={firstRunDemoActive ? activeGuideDemoTasks : visibleTasks}
              allTasks={firstRunDemoActive ? activeGuideDemoTasks : tasks}
              now={now}
              designMode={uiDesignMode}
              chicPalette={chicPalette}
              completionIcon={completionIcon}
              selectionMode={selectionMode}
              selectedTaskIds={selectedTaskIds}
              onSyncEditingChange={setSyncHomeEditing}
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
                delete duplicate.origin;
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
              todayReviewExists={Boolean(savedTodayJournal)}
              todayReviewSummary={planTier === 'premium' ? savedTodayJournal?.shortNote || savedTodayJournal?.memo : undefined}
              todayReviewPhotoUri={planTier === 'premium' ? savedTodayJournal?.photo || savedTodayJournal?.photos?.[0] : undefined}
              todayReviewSaveStatus={journalHasPendingChanges ? persistenceIssue === 'write' ? 'error' : 'saving' : undefined}
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
              onSaveEditor={firstRunDemoActive ? undefined : saveCurrentWishEditor}
              onDeleteAction={firstRunDemoActive ? undefined : (action, includeTask, taskId) => deleteWishAction(currentWishMonthKey, action, includeTask, taskId)}
              onCreateTaskFromAction={firstRunDemoActive ? () => undefined : createTaskFromWishAction}
              linkedTaskIdsByAction={firstRunDemoActive ? {} : Object.fromEntries(currentWishState.actions.flatMap(action => {
                const matches = tasks.filter(task => sameWishTaskOrigin(task.origin, { monthKey: currentWishMonthKey, wishId: action.wishId, actionId: action.id }));
                return matches.length === 1 ? [[action.id, matches[0]!.id]] : [];
              }))}
              onOpenRelatedTask={firstRunDemoActive ? undefined : taskId => {
                const target = tasksRef.current.find(task => task.id === taskId);
                if (!target) return;
                setScreen('home');
                setEditingTask(target);
              }}
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
              onOpenTopPhoto={firstRunDemoActive ? undefined : () => setPhotoEntryTarget('wish')}
              onPickTopImage={firstRunDemoActive ? undefined : () => { void pickPhotoTheme('wish'); }}
              initialEditor={firstRunDemoActive ? undefined : voiceWishDraft}
              onPremium={(featureId = 'wish') => { if (!firstRunDemoActive) openPremiumFeature(featureId); }}
              onAIShare={firstRunDemoActive ? undefined : (wishId) => { setAiShareWishId(wishId); setAiShareOpen(true); }}
            />
          )}

          {screen === 'timeline' && (
            <TimelineScreen
              onPickFocusPhoto={firstRunDemoActive ? undefined : () => setPhotoEntryTarget('focus')}
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
              focusRuntimeShared={!firstRunDemoActive}
              onFocusStateChange={firstRunDemoActive ? () => undefined : setFocusState}
              focusCustomDurationMinutes={focusCustomDurationMinutes}
              onFocusCustomDurationChange={firstRunDemoActive ? () => undefined : setFocusCustomDurationMinutes}
              focusVoiceRequest={voiceFocusRequest}
              focusTimerActive={focusTimerActive}
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
              photoTheme={displayPhotoTheme}
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
              onWidgetGuide={markWidgetGuideSeen}
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
                  photoUri={designPreviewPhotoUri ?? previewSavedBackgroundUri}
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
                 const samplePhotoIds = { ...current.samplePhotoIds }; delete samplePhotoIds[target];
                 if (target === 'background') {
                   deleteManagedPhotoUri(current.imageUri, [current.focusBackgroundUri, ...Object.values(current.topImageUris ?? {}), ...Object.values(current.topImageOriginalUris ?? {})]);
                   return { ...current, samplePhotoIds, imageUri: undefined };
                 }
                 if (target === 'focus') {
                   deleteManagedPhotoUri(current.focusBackgroundUri, [current.imageUri, ...Object.values(current.topImageUris ?? {}), ...Object.values(current.topImageOriginalUris ?? {})]);
                   return { ...current, samplePhotoIds, focusBackgroundUri: undefined };
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
                 return { ...current, samplePhotoIds, topImageUris, topImageOriginalUris, topImageAdjustments, topImageCropRects };
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
               onDeferInitialAppearance={deferInitialDesignSelection}
               onOpenIntro={onboarding.openIntro}
               currentScreen={screen}
                          styles={styles}
              helpers={{ colors: themedColors, getThemeTokens: getThemedThemeTokens, getChicPatternVisual, getNightSkyPalette, hasPremiumAccess, getChicCheckColor, chicCheckColorChoices, countdownToClock, getUrgencyStatus, getNextBestAction, designModes, completionIcons, summarizePremiumTaskTemplate }}
              components={{ BThemeRibbonDecoration, CThemeRibbonDecoration, ChicPatternDecor, ChicPatternSelector, ThemeColorSelector, SettingsDisclosure, NotificationManagerCard, PremiumFeatureIcon }}
            />
          )}

          {screen === 'analysis' && (
            <AnalysisScreen
              onStartRecords={firstRunDemoActive ? undefined : () => { setTimelineInitialTab('departure'); navigateWithinAppRef.current('timeline'); }}
              onStartRoutine={firstRunDemoActive ? undefined : () => { setHomeInitialTab('routine'); navigateWithinAppRef.current('home'); }}
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
                addTask(template.title, template.category, template.priority, resumedRemindDate, template.remindAt, resumedDeadlineDate, template.deadlineTime, template.deadlineNotifyBefore, template.navigationEnabled, template.preparationMinutes, template.travelMinutes, template.bufferMinutes, template.repeatRule ?? 'none', template.nudgeMode ?? 'once', resumedScheduledDate, template.scheduledTime, template.endAt, true, resetSubtasks, template.estimatedMinutes, resetListItems, archive.routineId);
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
              onAIShare={firstRunDemoActive ? undefined : () => { setAiShareWishId(undefined); setAiShareOpen(true); }}
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

        {/* Reserve transient layout space inside SafeAreaView, above navigation
            and status notices, instead of covering the date/add controls. */}
        {completionAffirmation && <Animated.View testID="completion-affirmation" style={{ flexShrink: 1, marginTop: 8, marginBottom: getBottomNavTopOffset(uiDesignMode) + 16 + statusNoticeHeight, paddingHorizontal: 20, opacity: completionAffirmationOpacity, alignItems: 'center' }}><ScrollView testID="completion-affirmation-scroll" style={{ width: '100%', maxWidth: 340, maxHeight: Math.min(160, screenHeight * 0.2), flexShrink: 1 }} contentContainerStyle={{ alignItems: 'center' }}><View style={{ width: '100%', maxWidth: 340, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18, backgroundColor: uiDesignMode === 'dark' ? '#20293A' : uiDesignMode === 'chic' ? chicPalette.cardSurface : '#FFFFFF', borderWidth: 1, borderColor: uiDesignMode === 'dark' ? '#40506A' : uiDesignMode === 'chic' ? chicPalette.border : '#E5E0E5', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}><Text style={{ textAlign: 'center', color: uiDesignMode === 'dark' ? '#F4F7FC' : uiDesignMode === 'chic' ? chicPalette.textPrimary : '#282538', fontSize: 14, fontWeight: '600' }}>{completionAffirmation}</Text></View></ScrollView></Animated.View>}

        {productionGuideOverlay}

      <View testID="app-status-notices" pointerEvents="box-none" onLayout={event => { const height = Math.ceil(event.nativeEvent.layout.height); setStatusNoticeHeight(current => current === height ? current : height); }} style={{ position: 'absolute', bottom: getBottomNavTopOffset(uiDesignMode) + 8, left: 16, right: 16, zIndex: 100, gap: 8 }}>
        {earnedRewardPending && <View accessibilityRole="alert" style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}><Text style={{ color: theme.colors.primaryText, fontSize: 13, lineHeight: 19 }}>{earnedRewardSaving ? '視聴済み広告の記録を保存しています。保存が終わるまでアプリを閉じないでください。' : '広告は視聴済みですが、記録を保存できていません。アプリを閉じずに再試行してください。'}</Text><Pressable accessibilityRole="button" accessibilityLabel="広告の保存を再試行" disabled={earnedRewardSaving} style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => { void retryEarnedRewardRef.current(); }}><Text style={{ color: theme.colors.primaryAccent, fontSize: 14, fontWeight: '800' }}>{earnedRewardSaving ? '保存中…' : '広告を見直さずに保存する'}</Text></Pressable></View>}
      {deletedTaskUndo && <View accessibilityLiveRegion="polite" style={{ paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text numberOfLines={1} style={{ flex: 1, color: theme.colors.primaryText, fontSize: 14 }}>ToDoを削除しました</Text><Pressable accessibilityRole="button" accessibilityLabel="ToDoの削除を元に戻す" onPress={undoTaskDeletion} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={{ color: theme.colors.primaryAccent, fontSize: 14, fontWeight: '800' }}>元に戻す</Text></Pressable></View>}
        <FocusRuntimeStatus visible={!focusScreenVisible} colors={theme.colors} onReturn={() => { setTimelineInitialTab('focus'); setScreen('timeline'); }} />
        {(focusCompletionNotice || (focusTaskCompletionPrompt && !focusCompletionPromptOpen)) && <View accessibilityLiveRegion="polite" style={{ paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ flex: 1, color: theme.colors.primaryText, fontSize: 14 }}>集中タイムが終了しました</Text><Pressable accessibilityRole="button" accessibilityLabel="集中の結果を確認" onPress={() => { setTimelineInitialTab('focus'); setScreen('timeline'); setFocusCompletionNotice(false); if (focusTaskCompletionPrompt) setFocusCompletionPromptOpen(true); }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={{ color: theme.colors.primaryAccent, fontSize: 14, fontWeight: '800' }}>確認</Text></Pressable></View>}
      </View>
        <BottomNav screen={screen} designMode={uiDesignMode} chicPalette={chicPalette} onChange={navigateWithinApp} />
      </View>

      <Modal visible={openTodayReview && planTier === 'premium'} transparent animationType="slide" onRequestClose={closeTodayJournal}>
        <KeyboardAvoidingView testID="daily-journal-keyboard-avoidance" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={styles.modalBackdrop} onPress={closeTodayJournal}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, maxHeight: '92%', flexShrink: 1 }]} onPress={(event) => event.stopPropagation()}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}><Pressable accessibilityRole="button" accessibilityLabel="キーボードを閉じる" style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }} onPress={Keyboard.dismiss}><Text style={{ color: theme.colors.primaryAccent, fontSize: 14, fontWeight: '700' }}>キーボードを閉じる⌄</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="日記を閉じる" style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }} onPress={closeTodayJournal}><Text style={{ color: theme.colors.primaryAccent, fontSize: 13, fontWeight: '800' }}>閉じる</Text></Pressable></View>
            <ScrollView testID="daily-journal-scroll" style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled">
              <HistoryScreen dailyReviewOnly openDailyReview={openTodayReview} initialDate={dateKey(now)} tasks={tasks} wishMonths={wishMonths} calendarMarks={calendarMarks} onSetCalendarMark={(date, mark) => setCalendarMarks((current) => { const next = { ...current }; if (mark) next[date] = mark; else delete next[date]; return next; })} recoveryHistory={recoveryHistory} focusSessions={focusSessions} departureCheckIns={departureCheckIns} departurePlans={departurePlans} behaviorEvents={behaviorEvents} completionIcon={completionIcon} designMode={uiDesignMode} chicPattern={effectiveChicPattern} chicPalette={chicPalette} planTier={planTier} onPremium={openPremiumFeature} onSaveTemplate={saveTaskAsTemplate} onRestore={restoreTaskById} onSaveDailyReview={saveDailyReview} onSaveMonthlyReflectionCard={saveMonthlyReflectionCard} onUpdateReview={updateWishReview} onDeleteReview={deleteWishReview} guideOverlay={productionGuideFeature === 'photoLog' ? productionGuideCard : undefined} styles={styles} helpers={{ dateKey, formatLiveTime, getThemeTokens: getThemedThemeTokens }} components={{ AchievementVessel, CalendarMarkPicker }} />
            </ScrollView>
          </Pressable>
        </Pressable>

        </KeyboardAvoidingView>
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
        rewardButtonLabel={rewardedPrompt.featureId === 'widgetPhoto' ? '広告を見て3日間使う' : rewardedPrompt.featureId === 'premiumDesign' || rewardedPrompt.featureId === 'premiumDesignTrialExpired' ? '広告を見て3日間使う' : isPhotoRewardFeature(rewardedPrompt.featureId) ? '広告を見て写真を使う' : undefined}
        onClose={() => {
          if (isPhotoRewardFeature(rewardedPrompt.featureId)) {
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
          if (isPhotoRewardFeature(rewardedPrompt.featureId) && rewardedPromptClosing) finishTopImageRewardPrompt();
        }}
        onPremium={() => {
          const designFeature = rewardedPrompt.featureId === 'photoBackground' || rewardedPrompt.featureId === 'photoFocus' || rewardedPrompt.featureId === 'photoTop' || rewardedPrompt.featureId === 'premiumDesign' || rewardedPrompt.featureId === 'premiumDesignTrialExpired' || rewardedPrompt.featureId === 'widgetPhoto';
          if (isPhotoRewardFeature(rewardedPrompt.featureId)) {
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
        session={focusCompletionPromptOpen && focusCompletionCanPresent ? focusTaskCompletionPrompt : undefined}
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
      <AIShareSheet
        visible={aiShareOpen}
        onClose={() => setAiShareOpen(false)}
        initialWishId={aiShareWishId}
        tasks={tasks}
        departurePlans={departurePlans}
        behaviorEvents={behaviorEvents}
        focusSessions={focusSessions}
        wishState={currentWishState}
        designMode={uiDesignMode}
        chicPalette={chicPalette}
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
        designTrialAfterDismissRef.current = () => startTrial?.();
        setDesignTrialNoticeOpen(false);
        if (Platform.OS !== 'ios') InteractionManager.runAfterInteractions(() => { const pending = designTrialAfterDismissRef.current; designTrialAfterDismissRef.current = undefined; pending?.(); });
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
      <PhotoEntrySheet onRenew={target => { void pickPhotoTheme(target, { restoreExisting: true, sampleId: photoKind(photoTheme, target) === 'sample' ? photoTheme.samplePhotoIds?.[target] : undefined }); }} accessLabel={target => photoAccessLabel(rewardedAccess, planTier === 'premium' || hasDesignCustomizeAccess, target, now)} canChooseSampleWithoutReward={target => canPickPhotoKind('sample', target)} onPickSample={(target, sampleId) => { void pickPhotoTheme(target, { sampleId }); }} onRemove={(target) => setPhotoTheme(current => withoutTopPhoto(current, target))} canChooseWithoutReward={target => canPickPhotoKind('personal', target)} visible={Boolean(photoEntryTarget)} initialTarget={photoEntryTarget ?? 'home'} canShowPhoto={target => canUsePhoto(photoKind(photoTheme, target), target)} photoTheme={photoTheme} designMode={uiDesignMode} chicPalette={chicPalette} onClose={() => setPhotoEntryTarget(undefined)} onPick={(target) => { void pickPhotoTheme(target); }} onAdjust={adjustTopPhoto} />
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
        beginInitialDesignFromIntro();
      }
  }
  finalActionLabel={onboarding.isCompleted('intro') ? '閉じる' : 'デザインを選ぶ'}
  busy={introDismissing}
  onDismissComplete={() => { introTransitionRef.current = false; setIntroDismissing(false); }}
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
    beginInitialDesignFromIntro();
  }}
  renderStep={renderOnboardingEmbeddedStep}
/>
      </SafeAreaView>
    </View>
    </FocusRuntimeProvider>
  );
}
