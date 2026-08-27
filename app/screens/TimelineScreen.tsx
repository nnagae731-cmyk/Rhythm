import * as Calendar from 'expo-calendar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { ChicPattern, ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import { CalendarMarks, DeparturePlan, DeparturePreparationStatus, Task, TimeTab } from '../types';
import { DepartureCheckIn } from '../departureCheckIn';
import { BehaviorEvent } from '../behaviorEvents';
import { FocusSession } from '../focusSession';
import { RecoveryRecord } from '../recovery';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { DeparturePlanForm } from '../components/DeparturePlanForm';
import { getDeparturePlanMode, getPlanScheduledTime, isArrivalReversePlan, isDepartureReminderPlan } from '../features/departure/departurePlanMode';
import { TravelAppLaunchActions } from '../components/TravelAppLaunchActions';
import { TravelAppSettings } from '../features/travel/travelApps';

type PlanCardProps = {
  plan: DeparturePlan;
  now: Date;
  planTier: PlanTier;
  completionIcon?: string;
  designMode: DesignMode;
  chicPalette?: ChicThemePalette;
  status?: DeparturePreparationStatus;
  prepared: boolean;
  departed: boolean;
  checkIn?: DepartureCheckIn;
  styles: any;
  helpers: any;
  onPrepare: (id: string) => void;
  onDepart: (id: string) => void;
  onStill: (id: string, phase: 'preparation' | 'departure') => void;
  onRecover: (plan: DeparturePlan) => void;
  onShare: (plan: DeparturePlan) => void;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onEdit: (plan: DeparturePlan) => void;
  onDelete: (id: string) => void;
  travelApps?: TravelAppSettings;
  onOpenTravelAppSettings?: () => void;
};

type TaskCountdownCardProps = {
  task: Task;
  now: Date;
  designMode: DesignMode;
  chicPalette?: ChicThemePalette;
  styles: any;
  onEdit: (task: Task) => void;
  onBucket?: (id: string, bucket: 'now' | 'later') => void;
};

export const TaskCountdownCard = React.memo(function TaskCountdownCard({ task, now, designMode, chicPalette, styles, onEdit, onBucket }: TaskCountdownCardProps) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isChic = designMode === 'chic' && !!chicPalette;
  const isDark = designMode === 'dark';
  const target = task.deadlineDate && task.deadlineTime ? new Date(`${task.deadlineDate}T${task.deadlineTime}:00`) : undefined;
  if (!target || Number.isNaN(target.getTime())) return null;
  const minutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60000));
  const isOverdue = target.getTime() < now.getTime();
  const countdown = isOverdue ? '期限を過ぎています' : minutes < 60 ? `あと${minutes}分` : `あと${Math.floor(minutes / 60)}時間${minutes % 60 ? `${minutes % 60}分` : ''}`;
  const accent = isChic ? chicPalette!.accent : theme.colors.primaryAccent;
  const onAccent = isChic ? chicPalette!.onAccent : isDark ? theme.colors.screenBackground : theme.colors.surface;
  return <View style={[styles.departureCountdownCard, styles.planCountdownCardNew, { backgroundColor: isChic ? chicPalette!.cardSurface : theme.colors.surface, borderColor: isOverdue ? theme.colors.danger : theme.colors.border, borderLeftColor: isOverdue ? theme.colors.danger : accent }]}>
    <View style={styles.planCardTopRow}><View style={{ flex: 1 }}><Text style={[styles.departureCountdownMeta, { color: isChic ? chicPalette!.textSecondary : theme.colors.secondaryText }]}>やること</Text><Text numberOfLines={2} style={[styles.departureCountdownTitle, { color: isChic ? chicPalette!.textPrimary : theme.colors.primaryText }]}>{task.title}</Text><Text style={[styles.departureCountdownDate, { color: isOverdue ? theme.colors.danger : accent }]}>今日 {task.deadlineTime}まで</Text></View><Text style={[styles.planTaskCountdownValue, { color: isOverdue ? theme.colors.danger : accent }]}>{countdown}</Text></View>
    <View style={styles.planTaskActionRow}><Pressable style={[styles.planTaskActionPrimary, { backgroundColor: accent }]} onPress={() => onBucket?.(task.id, 'now')}><Text style={{ color: onAccent, fontSize: 12, fontWeight: '900' }}>今やる</Text></Pressable><Pressable style={[styles.planTaskActionSecondary, { borderColor: theme.colors.border, backgroundColor: theme.colors.secondarySurface }]} onPress={() => onBucket?.(task.id, 'later')}><Text style={{ color: isChic ? chicPalette!.textPrimary : theme.colors.primaryText, fontSize: 12, fontWeight: '900' }}>あとで</Text></Pressable><Pressable accessibilityLabel="タスクを編集" onPress={() => onEdit(task)} style={styles.planTaskEdit}><Text style={{ color: accent, fontSize: 11, fontWeight: '900' }}>編集 ›</Text></Pressable></View>
  </View>;
});

export function PlanLocationShareActions({ plan, planTier, designMode, chicPalette, styles, onOpenMap, onShare }: { plan: DeparturePlan; planTier: PlanTier; designMode: DesignMode; chicPalette?: ChicThemePalette; styles: any; onOpenMap: () => void; onShare: () => void }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  const accent = theme.colors.primaryAccent;
  return <>
    {plan.destination?.trim() ? <Pressable accessibilityRole="button" style={[styles.planUtilityButton, isDark && styles.planUtilityButtonDark]} onPress={onOpenMap}><Text style={[styles.planUtilityText, { color: accent }]}>地図</Text></Pressable> : null}
    {planTier === 'premium' && <Pressable accessibilityRole="button" style={[styles.planUtilityButton, isDark && styles.planUtilityButtonDark]} onPress={onShare}><Text style={[styles.planUtilityText, { color: accent }]}>共有</Text></Pressable>}
  </>;
}

export const DepartureCountdownCard = React.memo(function DepartureCountdownCard({ plan, now, planTier, designMode, chicPalette, status, prepared, departed, checkIn, completionIcon, styles, helpers, onPrepare, onDepart, onStill, onRecover, onShare, onPremium, onEdit, onDelete, travelApps, onOpenTravelAppSettings }: PlanCardProps) {
  const { getThemeTokens, planDateKey, formatLiveTime, getDepartureMoments, countdownToDate, getMapSearchTarget, openMapSearch, getPlanCountdownAt } = helpers;
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  const isPremium = planTier === 'premium';
  const mode = getDeparturePlanMode(plan);
  const reverse = isArrivalReversePlan(plan);
  const direct = isDepartureReminderPlan(plan);
  const canUseReverse = reverse && isPremium;
  const moments = reverse ? getDepartureMoments(plan) : undefined;
  const countdownAt = getPlanCountdownAt(plan);
  const passed = countdownAt.getTime() <= now.getTime();
  const mapOpeningRef = useRef(false);
  const openMap = async () => {
    if (mapOpeningRef.current) return;
    mapOpeningRef.current = true;
    try { await openMapSearch(getMapSearchTarget(plan)); } finally { setTimeout(() => { mapOpeningRef.current = false; }, 700); }
  };
  const actionStyle = [styles.planActionMain, { backgroundColor: theme.colors.primaryAccent }];
  const secondaryActionStyle = [styles.planActionSecondary, { backgroundColor: theme.colors.secondarySurface, borderColor: theme.colors.border }];
  const textPrimary = isDark ? styles.darkBodyText : undefined;
  const textSecondary = isDark ? styles.darkMutedText : undefined;
  const accent = designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent;
  const onAccent = designMode === 'chic' && chicPalette ? chicPalette.onAccent : isDark ? theme.colors.screenBackground : theme.colors.surface;
  const statusLabel = reverse && !isPremium ? 'Premium' : checkIn || departed ? '移動中' : status === 'prepared' || prepared ? '準備中' : passed ? '確認が必要' : direct ? '出発予定' : '準備前';
  const showRecovery = reverse && isPremium && !checkIn && moments && moments.leave.getTime() <= now.getTime();
  const minutesBetween = (target: Date) => Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60000));
  const delayMinutes = moments ? Math.max(1, Math.floor((now.getTime() - moments.arrival.getTime()) / 60000)) : 0;
  const phase = !reverse || !moments ? 'single' : now.getTime() >= moments.arrival.getTime() && !checkIn && !departed ? 'late' : checkIn || departed || now.getTime() >= moments.leave.getTime() || status === 'prepared' ? 'travel' : status === 'preparing' || prepared || now.getTime() >= moments.prepare.getTime() ? 'prepare' : 'before';
  const phaseCopy = phase === 'before' ? `あと${minutesBetween(moments!.prepare)}分で準備開始` : phase === 'prepare' ? `あと${minutesBetween(moments!.leave)}分で出発` : phase === 'travel' ? `到着まであと${minutesBetween(moments!.arrival)}分` : phase === 'late' ? `予定より${delayMinutes}分遅れています` : passed ? '出発時刻を過ぎました' : countdownToDate(countdownAt, now);
  const phaseNames = reverse && moments ? [{ label: '準備', time: moments.prepare, active: phase !== 'before' }, { label: '出発', time: moments.leave, active: phase === 'travel' || phase === 'late' }, { label: '到着', time: moments.arrival, active: phase === 'late' || Boolean(checkIn) }] : [];
  const phaseProgress = moments ? Math.min(1, Math.max(0, Math.floor((now.getTime() - moments.prepare.getTime()) / 900000) * 900000 / Math.max(1, moments.arrival.getTime() - moments.prepare.getTime()))) : 0;
  return <View style={[styles.departureCountdownCard, styles.planCountdownCardNew, isDark && styles.departureCountdownCardDark, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border, shadowColor: chicPalette.accent }, passed && !checkIn && !reverse && styles.departurePassed, { borderLeftColor: phase === 'late' ? theme.colors.danger : accent }]}>
    <View style={styles.planCardTopRow}>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.departureCountdownTitle, textPrimary]}>{plan.title}</Text>
        <Text style={[styles.departureCountdownDate, textSecondary]}>{planDateKey(plan).replaceAll('-', '.')} {plan.destination ? `・ ${plan.destination}` : ''}</Text>
      </View>
      <View style={[styles.planStatusBadge, { backgroundColor: phase === 'late' ? theme.colors.secondarySurface : theme.colors.softAccent }]}><Text style={[styles.planStatusBadgeText, { color: phase === 'late' ? theme.colors.danger : accent }]}>{statusLabel}</Text></View>
    </View>

    {mode === 'departure_reminder' ? <View style={[styles.planTimeSingle, { borderColor: theme.colors.border }]}>
      <View><Text style={[styles.departureCountdownMeta, textSecondary]}>出発時刻</Text><Text style={[styles.planTimeSingleValue, textPrimary]}>{formatLiveTime(countdownAt)}</Text></View>
      <Text style={[styles.planCountdownValue, textPrimary]}>{phaseCopy}</Text>
    </View> : canUseReverse && moments ? <>
      <View style={[styles.planPhaseSummary, { backgroundColor: theme.colors.secondarySurface, borderColor: theme.colors.border }]}><Text style={[styles.planPhaseLabel, { color: accent }]}>{phase === 'late' ? '遅延' : phase === 'travel' ? '移動中' : phase === 'prepare' ? '準備中' : '準備前'}</Text><Text style={[styles.planCountdownValue, textPrimary]}>{phaseCopy}</Text></View>
      <View style={styles.planPhaseTimeline}><View style={[styles.planPhaseTrack, { backgroundColor: theme.colors.border }]}><View style={[styles.planPhaseFill, { width: `${phaseProgress * 100}%`, backgroundColor: accent }]} /></View>{phaseNames.map((item, index) => <View key={item.label} style={styles.planPhaseItem}><View style={styles.planPhaseNodeRow}><View style={[styles.planPhaseNode, { borderColor: item.active ? accent : theme.colors.border, backgroundColor: item.active ? accent : theme.colors.surface }]}>{item.active ? <Text style={{ color: onAccent, fontSize: 10, fontWeight: '900' }}>{(designMode === 'chic' || designMode === 'photo') ? completionIcon ?? '✓' : '✓'}</Text> : null}</View>{index < phaseNames.length - 1 ? <View style={[styles.planPhaseConnector, { backgroundColor: phase === 'late' || item.active ? accent : theme.colors.border }]} /> : null}</View><Text style={[styles.planPhaseTime, { color: item.active ? accent : theme.colors.secondaryText }]}>{formatLiveTime(item.time)}</Text><Text style={[styles.planPhaseName, { color: theme.colors.primaryText }]}>{item.label}</Text></View>)}</View>
    </> : null}

    {reverse && !isPremium && <Pressable accessibilityRole="button" style={[styles.planPremiumNotice, { borderColor: theme.colors.border, backgroundColor: theme.colors.secondarySurface }]} onPress={() => onPremium('route')}><Text style={[styles.planPremiumNoticeText, { color: accent }]}>到着からの逆算はPremiumで確認できます</Text></Pressable>}

    {reverse && isPremium && !checkIn && !showRecovery && <View style={styles.planActionRow}>
      {!prepared && status !== 'prepared' ? <>
        <Pressable accessibilityRole="button" style={actionStyle} onPress={() => plan.id && onPrepare(plan.id)}><Text style={styles.planActionMainText}>準備を始める</Text></Pressable>
        <Pressable accessibilityRole="button" style={secondaryActionStyle} onPress={() => plan.id && onStill(plan.id, 'preparation')}><Text style={[styles.planActionSecondaryText, { color: theme.colors.primaryText }]}>まだ</Text></Pressable>
      </> : <>
        <Pressable accessibilityRole="button" style={actionStyle} onPress={() => plan.id && onDepart(plan.id)}><Text style={styles.planActionMainText}>出発した</Text></Pressable>
        <Pressable accessibilityRole="button" style={secondaryActionStyle} onPress={() => plan.id && onStill(plan.id, 'departure')}><Text style={[styles.planActionSecondaryText, { color: theme.colors.primaryText }]}>まだ</Text></Pressable>
      </>}
    </View>}
    {showRecovery && <View style={styles.planActionRow}><Pressable accessibilityRole="button" style={actionStyle} onPress={() => onRecover(plan)}><Text style={styles.planActionMainText}>今から立て直す</Text></Pressable><Pressable accessibilityRole="button" style={secondaryActionStyle} onPress={() => void openMap()}><Text style={[styles.planActionSecondaryText, { color: theme.colors.primaryText }]}>地図</Text></Pressable></View>}
    {reverse && isPremium && (checkIn || departed) && <Pressable accessibilityRole="button" style={actionStyle} onPress={() => void openMap()}><Text style={styles.planActionMainText}>地図を開く</Text></Pressable>}

    <View style={[styles.planUtilityRow, { flexWrap: 'wrap' }]}>
      <PlanLocationShareActions plan={plan} planTier={planTier} designMode={designMode} chicPalette={chicPalette} styles={styles} onOpenMap={() => void openMap()} onShare={() => onShare(plan)} />
      <Pressable accessibilityRole="button" style={[styles.planUtilityButton, isDark && styles.planUtilityButtonDark]} onPress={() => onEdit(plan)}><Text style={[styles.planUtilityText, { color: theme.colors.primaryAccent }]}>編集</Text></Pressable>
      {plan.id && <Pressable accessibilityRole="button" style={[styles.planUtilityButton, isDark && styles.planUtilityButtonDark]} onPress={() => onDelete(plan.id!)}><Text style={[styles.planDeleteText, { color: theme.colors.danger }]}>削除</Text></Pressable>}
      {plan.destination?.trim() ? <TravelAppLaunchActions settings={travelApps} category="transit" destination={plan.destination} planTier={planTier} designMode={designMode} chicPalette={chicPalette} onPremium={onPremium} onOpenSettings={onOpenTravelAppSettings} /> : null}
      <TravelAppLaunchActions settings={travelApps} category="taxi" destination={plan.destination} planTier={planTier} designMode={designMode} chicPalette={chicPalette} onPremium={onPremium} onOpenSettings={onOpenTravelAppSettings} />
    </View>
  </View>;
});

export function TimelineScreen({
  plan, plans, planEditorOpen, departureCheckIns, departurePreparationStatuses, behaviorEvents, tasks, now, designMode, focusBackgroundUri, initialTab, chicPattern, chicPalette, planTier, completionIcon, focusCustomDurationMinutes, onFocusCustomDurationChange, recoveryTargetPlanId, onChange, onSchedule, onScheduleUsed, onTimeTabChange, onOpenNewPlan, onClosePlanEditor, onImportCalendarEvent, onEdit, onSharePlan, onDelete, onEditTask, onDeleteTask, onTaskBucketChange, onPremium, onRecovery, onRecoveryOpened, onRecoveryClosed, onFocusCompleted, onFocusStarted, onFocusNotificationPermission, onFocusRunningChange, focusTimerActive, onFocusNavigationBlocked, onBehaviorEvent, onDeparted, onPreparationStarted, onStill, calendarMarks, onSetCalendarMark, travelApps, onOpenTravelAppSettings, hapticsEnabled, previewCustomDurationOpen, previewMode, previewCalendarEvents, previewCalendarOptions, calendarImportCalendarIds, calendarImportKnownCalendarIds, onCalendarImportCalendarIdsChange, onCalendarImportKnownCalendarIdsChange, planEditorGuide, recoveryGuide, styles, helpers, components,
}: any) {
  const { getThemeTokens, dateKey, planDateKey, hasPremiumAccess, formatLiveDate, formatLiveTime, getDepartureMoments, countdownToDate, dateForReminder, getMapSearchTarget, openMapSearch, getPlanCountdownAt } = helpers;
  const { TimeTabButton, FocusMode, TaskScheduleCalendar, DailyScheduleTimeline, RecoveryModal } = components;
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  const [timeTab, setTimeTab] = useState<TimeTab>(initialTab);
  const [calendarEvents, setCalendarEvents] = useState<Calendar.Event[]>(previewMode ? (previewCalendarEvents ?? []) : []);
  const [calendarOptions, setCalendarOptions] = useState<Calendar.Calendar[]>(previewMode ? (previewCalendarOptions ?? []) : []);
  const [calendarSelectorOpen, setCalendarSelectorOpen] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarLoaded, setCalendarLoaded] = useState(Boolean(previewMode));
  const [calendarExcludedCount, setCalendarExcludedCount] = useState(0);
  const [calendarFocusDate, setCalendarFocusDate] = useState<string>();
  const [recoveryPlan, setRecoveryPlan] = useState<DeparturePlan>();
  useEffect(() => setTimeTab(initialTab), [initialTab]);
  useEffect(() => {
    if (!recoveryTargetPlanId) return;
    const target = plans.find((item: DeparturePlan) => item.id === recoveryTargetPlanId);
    if (target) setRecoveryPlan(target);
  }, [plans, recoveryTargetPlanId]);

  const todayKey = dateKey(now);
  const countdownPlans = useMemo(() => plans
    .filter((item: DeparturePlan) => {
      const mode = getDeparturePlanMode(item);
      const canShowCountdown = mode === 'departure_reminder'
        || (mode === 'arrival_reverse' && planTier === 'premium');
      return canShowCountdown && planDateKey(item) >= todayKey;
    })
    .sort((a: DeparturePlan, b: DeparturePlan) => getPlanCountdownAt(a).getTime() - getPlanCountdownAt(b).getTime()), [plans, planDateKey, todayKey, planTier, getPlanCountdownAt]);
  const countdownTasks = useMemo(() => tasks
    .filter((task: Task) => !task.done && task.deadlineDate === todayKey && Boolean(task.deadlineTime))
    .sort((a: Task, b: Task) => `${a.deadlineTime}`.localeCompare(`${b.deadlineTime}`)), [tasks, todayKey]);
  const { checkInsByPlanDay, preparedByPlanDay, departedByPlanDay } = useMemo(() => {
    const checkIns = new Map<string, DepartureCheckIn>();
    const prepared = new Set<string>();
    const departed = new Set<string>();
    departureCheckIns.forEach((item: DepartureCheckIn) => checkIns.set(`${item.planId}:${item.date}`, item));
    behaviorEvents.forEach((event: BehaviorEvent) => {
      if (!event.departurePlanId || !event.departurePlanDate) return;
      const key = `${event.departurePlanId}:${event.departurePlanDate}`;
      if (event.type === 'departure_preparation_started') prepared.add(key);
      if (event.type === 'departure_started') departed.add(key);
    });
    return { checkInsByPlanDay: checkIns, preparedByPlanDay: prepared, departedByPlanDay: departed };
  }, [behaviorEvents, departureCheckIns]);

  const isBirthdayCalendar = (calendar: Calendar.Calendar) => String(calendar.type ?? '').toLowerCase() === 'birthdays' || String(calendar.source?.type ?? '').toLowerCase() === 'birthdays';
  const isSubscribedCalendar = (calendar: Calendar.Calendar) => String(calendar.type ?? '').toLowerCase() === 'subscribed' || String(calendar.source?.type ?? '').toLowerCase() === 'subscribed';
  const calendarEventOccurrenceKey = (event: Calendar.Event) => {
    const calendarId = String((event as Calendar.Event & { calendarId?: string }).calendarId ?? '');
    const start = new Date(event.startDate).toISOString();
    const end = event.endDate ? new Date(event.endDate).toISOString() : '';
    return `${calendarId}:${String(event.id)}:${start}:${end}`;
  };
  const normalizeCalendarTitle = (value: string | undefined) => (value ?? '').trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
  const isAlreadyRegistered = (event: Calendar.Event) => {
    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : undefined;
    const endDate = end && !Number.isNaN(end.getTime()) ? dateKey(end) : '';
    const key = calendarEventOccurrenceKey(event);
    return plans.some((item: DeparturePlan) => {
      if (item.externalCalendarEventKey) return item.externalCalendarEventKey === key;
      if (item.externalCalendarEventId && item.externalCalendarEventId === event.id && !item.externalCalendarEventStartDate) return true;
      if (normalizeCalendarTitle(item.title) !== normalizeCalendarTitle(event.title)) return false;
      if (item.date !== dateKey(start) || Boolean(item.allDay) !== Boolean(event.allDay)) return false;
      if (!event.allDay && item.arrival !== formatLiveTime(start)) return false;
      const knownEndDate = item.endDate ?? item.externalCalendarEventEndDate;
      return !knownEndDate || knownEndDate === endDate;
    });
  };
  const resolveCalendarSelection = (calendars: Calendar.Calendar[]) => {
    const savedIds = Array.isArray(calendarImportCalendarIds) ? new Set(calendarImportCalendarIds) : undefined;
    const knownIds = new Set(calendarImportKnownCalendarIds ?? []);
    const selected = calendars.filter((calendar) => !isBirthdayCalendar(calendar) && (savedIds ? savedIds.has(calendar.id) || (!knownIds.has(calendar.id) && !isSubscribedCalendar(calendar)) : !isSubscribedCalendar(calendar))).map((calendar) => calendar.id);
    const known = calendars.map((calendar) => calendar.id);
    return { selected, known };
  };
  const fetchCalendarEvents = async (selectedIds: string[]) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 30);
    const events = selectedIds.length > 0 ? await Calendar.getEventsAsync(selectedIds, start, end) : [];
    const available = events.filter((event) => !isAlreadyRegistered(event));
    setCalendarExcludedCount(events.length - available.length);
    setCalendarEvents(available.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
    setCalendarLoaded(true);
  };
  const importCalendarEvents = async () => {
    setCalendarLoading(true);
    setCalendarLoaded(false);
    try {
      const permission = await Calendar.requestCalendarPermissionsAsync();
      if (!permission.granted) { Alert.alert('カレンダーへのアクセスが必要です', '設定からカレンダーへのアクセスを許可してください。'); return; }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      setCalendarOptions(calendars);
      const { selected, known } = resolveCalendarSelection(calendars);
      onCalendarImportCalendarIdsChange?.(selected);
      onCalendarImportKnownCalendarIdsChange?.(known);
      await fetchCalendarEvents(selected);
    } catch { Alert.alert('カレンダーを読み込めませんでした'); } finally { setCalendarLoading(false); }
  };
  const toggleCalendarSelection = async (calendar: Calendar.Calendar) => {
    const current = new Set(calendarImportCalendarIds ?? []);
    if (current.has(calendar.id)) current.delete(calendar.id); else current.add(calendar.id);
    const selected = calendarOptions.filter((item) => !isBirthdayCalendar(item) && current.has(item.id)).map((item) => item.id);
    onCalendarImportCalendarIdsChange?.(selected);
    setCalendarLoading(true);
    try { await fetchCalendarEvents(selected); } catch { Alert.alert('カレンダーを読み込めませんでした'); } finally { setCalendarLoading(false); }
  };
  const selectCalendarEvent = (event: Calendar.Event) => {
    const start = new Date(event.startDate);
    if (!onImportCalendarEvent(event)) return;
    const key = calendarEventOccurrenceKey(event);
    setCalendarEvents((current) => current.filter((item) => calendarEventOccurrenceKey(item) !== key));
    setCalendarFocusDate(dateKey(start));
    setTimeTab('calendar');
  };
  const openPlanEditor = (target: DeparturePlan) => { onEdit(target); setTimeTab('departure'); };
  // Capture previews must render directly from their fixed demo props.  The
  // production state is intentionally kept separate so opening the preview
  // cannot request permissions or mutate the user's calendar state.
  const displayedCalendarEvents: Calendar.Event[] = previewMode ? (previewCalendarEvents ?? []) : calendarEvents;
  const displayedCalendarOptions: Calendar.Calendar[] = previewMode ? (previewCalendarOptions ?? []) : calendarOptions;
  const displayedCalendarLoaded = previewMode ? true : calendarLoaded;
  const displayedCalendarImportIds: string[] | undefined = previewMode
    ? (calendarImportCalendarIds?.length
      ? calendarImportCalendarIds
      : displayedCalendarOptions.filter((item) => !isBirthdayCalendar(item)).map((item) => item.id))
    : calendarImportCalendarIds;
  const previewRecoveryPlan = previewMode && recoveryTargetPlanId
    ? plans.find((item: DeparturePlan) => item.id === recoveryTargetPlanId)
    : undefined;

  // Recovery capture is a modal-only preview.  Do not render the normal
  // timeline behind it, otherwise its date/time labels can leak into the
  // captured image.
  if (previewMode && previewRecoveryPlan) {
    return <RecoveryModal
      visible
      plan={previewRecoveryPlan}
      now={now}
      designMode={designMode}
      styles={styles}
      travelApps={travelApps}
      planTier={planTier}
      chicPalette={chicPalette}
      onOpenTravelAppSettings={onOpenTravelAppSettings}
      onPremium={(featureId?: PremiumGuideFeatureId) => onPremium(featureId ?? 'recovery')}
      onClose={() => undefined}
      onApply={() => undefined}
      inlinePreview
    />;
  }

  return <>
    <View style={[styles.timeTabs, designMode === 'minimal' && styles.timeTabsMinimal, designMode === 'dark' && styles.darkPanel, designMode === 'chic' && styles.timeTabsChic, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
      {(['departure', 'deadline', 'calendar', 'focus'] as TimeTab[]).map((tab) => <TimeTabButton key={tab} tab={tab} active={timeTab === tab} designMode={designMode} chicPattern={chicPattern} chicPalette={chicPalette} themeAccent={theme.colors.primaryAccent} secondaryText={theme.colors.secondaryText} onPress={() => { if (focusTimerActive && tab !== 'focus') { onFocusNavigationBlocked?.(); return; } setTimeTab(tab); onTimeTabChange?.(tab); onScheduleUsed?.(); }} />)}
    </View>

    {timeTab === 'focus' ? <FocusMode tasks={tasks} designMode={designMode} chicPalette={chicPalette} backgroundImageUri={focusBackgroundUri} planTier={planTier} onPremium={onPremium} customDurationMinutes={focusCustomDurationMinutes} onCustomDurationChange={onFocusCustomDurationChange} onFocusCompleted={onFocusCompleted} onFocusStarted={onFocusStarted} onFocusNotificationPermission={onFocusNotificationPermission} onFocusRunningChange={onFocusRunningChange} onBehaviorEvent={onBehaviorEvent} hapticsEnabled={hapticsEnabled} previewCustomDurationOpen={previewCustomDurationOpen} previewMode={previewMode} /> : timeTab === 'calendar' ? <TaskScheduleCalendar tasks={tasks} plans={plans} externalEvents={displayedCalendarEvents} now={now} designMode={designMode} chicPattern={chicPattern} chicPalette={chicPalette} planTier={planTier} focusDate={calendarFocusDate} calendarMarks={calendarMarks} onSetCalendarMark={onSetCalendarMark} onPremium={onPremium} onEditTask={onEditTask} onDeleteTask={onDeleteTask} onEditPlan={openPlanEditor} onDeletePlan={onDelete} onOpenMap={(item: DeparturePlan) => void openMapSearch(getMapSearchTarget(item))} behaviorEvents={behaviorEvents} departureCheckIns={departureCheckIns} departurePreparationStatuses={departurePreparationStatuses} /> : timeTab === 'deadline' ? <>
      <View style={[styles.departureListHeader, isDark && styles.darkPanel]}><View><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>今日のスケジュール</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>予定がなくても時間の流れを確認できます</Text></View><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{dateKey(now).replaceAll('-', '.')}</Text></View>
      <DailyScheduleTimeline date={dateKey(now)} tasks={tasks} plans={plans} externalEvents={displayedCalendarEvents} now={now} designMode={designMode} chicPalette={chicPalette} planTier={planTier} onEditTask={onEditTask} onEditPlan={openPlanEditor} />
    </> : <>
      {!previewMode && <Pressable accessibilityRole="button" style={[styles.planAddButton, { backgroundColor: theme.colors.primaryAccent }]} onPress={onOpenNewPlan}><Text style={styles.planAddButtonText}>＋ 予定を追加</Text></Pressable>}
      <Pressable style={[styles.calendarImportButton, designMode === 'minimal' && styles.calendarImportButtonMinimal, isDark && styles.calendarImportButtonDark, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]} onPress={previewMode ? undefined : importCalendarEvents}><Text style={[styles.calendarImportIcon, designMode !== 'chic' && styles.calendarImportIconMono, isDark && styles.calendarImportIconDark, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>▣</Text><View style={{ flex: 1 }}><Text style={[styles.calendarImportTitle, isDark && styles.darkBodyText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{calendarLoading ? '読み込み中…' : 'いつものカレンダーとつなぐ'}</Text><Text style={[styles.calendarImportCopy, isDark && styles.darkMutedText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{hasPremiumAccess(planTier, 'external_calendar') ? '今日から30日先までの予定を選べます' : '今日から30日先まで表示・取り込みは広告で1回'}</Text></View><Text style={[styles.calendarImportArrow, designMode !== 'chic' && styles.calendarImportArrowMono, isDark && styles.calendarImportArrowDark, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>›</Text></Pressable>
      {displayedCalendarLoaded && displayedCalendarOptions.filter((item) => !isBirthdayCalendar(item)).length > 0 && <Pressable style={[styles.calendarEventPicker, { paddingVertical: 11 }, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]} onPress={previewMode ? undefined : () => setCalendarSelectorOpen(true)}><Text style={[styles.calendarEventPickerTitle, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>取り込むカレンダー {displayedCalendarImportIds?.length ?? 0}件　変更する ›</Text></Pressable>}
      <Modal visible={calendarSelectorOpen} transparent animationType="slide" onRequestClose={() => setCalendarSelectorOpen(false)}><Pressable style={styles.modalBackdrop} onPress={() => setCalendarSelectorOpen(false)}><Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, maxHeight: '72%' }]} onPress={(event) => event.stopPropagation()}><View style={styles.modalHandle} /><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>取り込むカレンダー</Text><Pressable onPress={() => setCalendarSelectorOpen(false)}><Text style={[styles.calendarImportArrow, { color: theme.colors.primaryAccent }]}>閉じる</Text></Pressable></View><Text style={[styles.calendarImportCopy, isDark && styles.darkMutedText]}>通常のカレンダーは初期選択、購読カレンダーは必要な場合だけ選択できます。</Text><ScrollView style={{ marginTop: 10 }}>{displayedCalendarOptions.filter((item) => !isBirthdayCalendar(item)).map((calendar) => { const selected = displayedCalendarImportIds?.includes(calendar.id) ?? false; const subscribed = isSubscribedCalendar(calendar); return <Pressable key={calendar.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#303B50' : '#E5E0E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={previewMode ? undefined : () => void toggleCalendarSelection(calendar)}><View style={{ flex: 1, paddingRight: 12 }}><Text style={[styles.calendarEventTitle, isDark && styles.darkBodyText]}>{calendar.title}</Text><Text style={[styles.calendarEventDate, isDark && styles.darkMutedText]}>{subscribed ? '購読カレンダー' : '通常カレンダー'}</Text></View><Text style={{ color: selected ? theme.colors.primaryAccent : (isDark ? '#8F9BB0' : '#9AA3B3'), fontSize: 20 }}>{selected ? '✓' : '○'}</Text></Pressable>; })}</ScrollView></Pressable></Pressable></Modal>
      {displayedCalendarLoaded && displayedCalendarEvents.length === 0 && <View style={[styles.calendarEventPicker, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}><Text style={[styles.calendarEventPickerTitle, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>新しく取り込める予定はありません</Text><Text style={[styles.calendarEventDate, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{calendarExcludedCount > 0 ? '登録済みの予定は一覧から除外しています。' : '今日から30日以内のカレンダー予定がありません。'}</Text></View>}
      {displayedCalendarLoaded && displayedCalendarEvents.length > 0 && <View style={[styles.calendarEventPicker, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}><Text style={[styles.calendarEventPickerTitle, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>取り込む予定を選択（{displayedCalendarEvents.length}件）</Text><Text style={[styles.calendarEventDate, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>登録済みの予定は表示されません。</Text>{displayedCalendarEvents.map((event) => { const eventStart = new Date(event.startDate); return <Pressable key={calendarEventOccurrenceKey(event)} style={[styles.calendarEventRow, designMode === 'chic' && chicPalette && { borderBottomColor: chicPalette.border }]} onPress={previewMode ? undefined : () => selectCalendarEvent(event)}><View style={{ flex: 1 }}><Text style={[styles.calendarEventTitle, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{event.title || '名称なし'}</Text><Text style={[styles.calendarEventDate, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{formatLiveDate(eventStart)} ・ {event.allDay ? '終日' : formatLiveTime(eventStart)}</Text></View><Text style={[styles.calendarImportArrow, designMode !== 'chic' && styles.calendarImportArrowMono, isDark && styles.calendarImportArrowDark, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>＋</Text></Pressable>; })}</View>}
      {!previewMode && <><View style={[styles.departureListHeader, isDark && styles.darkPanel]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>カウントダウン</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{countdownPlans.length + countdownTasks.length}件</Text></View>
      {countdownPlans.length === 0 && countdownTasks.length === 0 ? <View style={[styles.departureEmpty, isDark && styles.departureEmptyDark]}><Text style={[styles.emptyCopy, isDark && styles.darkMutedText]}>出発時刻や期限を登録した予定が、ここに表示されます。</Text></View> : countdownPlans.map((item: DeparturePlan) => {
        const key = `${item.id}:${planDateKey(item)}`;
        return <DepartureCountdownCard key={item.id} plan={item} now={now} planTier={planTier} designMode={designMode} chicPalette={chicPalette} status={item.id && planDateKey(item) === todayKey ? departurePreparationStatuses[item.id] : undefined} prepared={preparedByPlanDay.has(key)} departed={departedByPlanDay.has(key)} checkIn={checkInsByPlanDay.get(key)} completionIcon={completionIcon} styles={styles} helpers={{ getThemeTokens, planDateKey, formatLiveTime, getDepartureMoments, countdownToDate, getMapSearchTarget, openMapSearch, getPlanCountdownAt }} onPrepare={onPreparationStarted} onDepart={onDeparted} onStill={onStill} onRecover={(target) => { if (target.id) onRecoveryOpened?.(target.id); setRecoveryPlan(target); }} onShare={onSharePlan} onPremium={() => onPremium('route')} onEdit={openPlanEditor} onDelete={onDelete} travelApps={travelApps} onOpenTravelAppSettings={onOpenTravelAppSettings} />;
      })}{countdownTasks.map((task: Task) => <TaskCountdownCard key={`task-countdown-${task.id}`} task={task} now={now} designMode={designMode} chicPalette={chicPalette} styles={styles} onEdit={onEditTask} onBucket={onTaskBucketChange} />)}</>}
    </>}

    {planEditorOpen && <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClosePlanEditor}>
      <SafeAreaView style={[styles.planEditorModal, { backgroundColor: theme.colors.screenBackground, position: 'relative' }]}><ScrollView contentContainerStyle={styles.planEditorScroll} keyboardShouldPersistTaps="handled"><DeparturePlanForm plan={plan} plans={plans} behaviorEvents={behaviorEvents} designMode={designMode} chicPattern={chicPattern} chicPalette={chicPalette} planTier={planTier} onChange={onChange} onSubmit={onSchedule} onClose={onClosePlanEditor} onPremium={onPremium} dateKey={dateKey} formatLiveDate={formatLiveDate} formatLiveTime={formatLiveTime} dateForReminder={dateForReminder} getDepartureMoments={getDepartureMoments} getMapSearchTarget={getMapSearchTarget} openMapSearch={openMapSearch} travelApps={travelApps} onOpenTravelAppSettings={onOpenTravelAppSettings} /></ScrollView>{planEditorGuide ? <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>{planEditorGuide}</View> : null}</SafeAreaView>
    </Modal>}
    <RecoveryModal visible={Boolean(recoveryPlan)} plan={recoveryPlan} now={now} designMode={designMode} styles={styles} travelApps={travelApps} planTier={planTier} chicPalette={chicPalette} onOpenTravelAppSettings={onOpenTravelAppSettings} onPremium={(featureId?: PremiumGuideFeatureId) => onPremium(featureId ?? 'recovery')} onClose={() => { setRecoveryPlan(undefined); onRecoveryClosed(); }} onApply={(record: RecoveryRecord) => { onRecovery(record); setRecoveryPlan(undefined); }} guideOverlay={recoveryGuide} inlinePreview={Boolean(previewMode && recoveryTargetPlanId)} />
  </>;
}
