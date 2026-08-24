import * as Calendar from 'expo-calendar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { ChicPattern, ChicThemePalette, DesignMode } from '../theme';
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

const DepartureCountdownCard = React.memo(function DepartureCountdownCard({ plan, now, planTier, designMode, chicPalette, status, prepared, departed, checkIn, styles, helpers, onPrepare, onDepart, onStill, onRecover, onShare, onPremium, onEdit, onDelete, travelApps, onOpenTravelAppSettings }: PlanCardProps) {
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
  const secondaryActionStyle = [styles.planActionSecondary, { backgroundColor: isDark ? '#26365F' : theme.colors.secondarySurface, borderColor: theme.colors.border }];
  const textPrimary = isDark ? styles.darkBodyText : undefined;
  const textSecondary = isDark ? styles.darkMutedText : undefined;
  const statusLabel = reverse && !isPremium ? 'Premium' : checkIn ? '出発済み' : departed ? '移動中' : status === 'prepared' ? '準備中' : prepared ? '準備中' : passed ? '確認が必要' : direct ? '出発予定' : '準備前';
  const showRecovery = reverse && isPremium && !checkIn && moments && moments.leave.getTime() <= now.getTime();

  const accent = designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent;
  return <View style={[styles.departureCountdownCard, styles.planCountdownCardNew, isDark && styles.departureCountdownCardDark, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border, shadowColor: chicPalette.accent }, passed && !checkIn && styles.departurePassed, { borderLeftColor: passed && !checkIn ? theme.colors.secondaryText : accent }]}>
    <View style={styles.planCardTopRow}>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.departureCountdownTitle, textPrimary]}>{plan.title}</Text>
        <Text style={[styles.departureCountdownDate, textSecondary]}>{planDateKey(plan).replaceAll('-', '.')}</Text>
      </View>
      <View style={[styles.planStatusBadge, { backgroundColor: isDark ? '#26365F' : theme.colors.softAccent }]}><Text style={[styles.planStatusBadgeText, { color: theme.colors.primaryAccent }]}>{statusLabel}</Text></View>
    </View>

    {mode === 'departure_reminder' ? <View style={[styles.planTimeSingle, { borderColor: isDark ? '#40506A' : theme.colors.border }]}>
      <View><Text style={[styles.departureCountdownMeta, textSecondary]}>出発時刻</Text><Text style={[styles.planTimeSingleValue, textPrimary]}>{formatLiveTime(countdownAt)}</Text></View>
      <Text style={[styles.planCountdownValue, textPrimary]}>{passed ? '出発時刻を過ぎました' : countdownToDate(countdownAt, now)}</Text>
    </View> : canUseReverse && moments ? <View style={[styles.planTimeGrid, { borderColor: isDark ? '#40506A' : theme.colors.border }]}>
      <View style={styles.planTimeColumnBase}><Text style={[styles.departureCountdownMeta, textSecondary]}>準備開始</Text><Text style={[styles.planTimeValue, textPrimary]}>{formatLiveTime(moments.prepare)}</Text></View>
      <View style={[styles.planTimeColumn, { borderColor: isDark ? '#40506A' : theme.colors.border }]}><Text style={[styles.departureCountdownMeta, textSecondary]}>出発</Text><Text style={[styles.planTimeValue, textPrimary]}>{formatLiveTime(moments.leave)}</Text></View>
      <View style={[styles.planTimeColumn, { borderColor: isDark ? '#40506A' : theme.colors.border }]}><Text style={[styles.departureCountdownMeta, textSecondary]}>到着</Text><Text style={[styles.planTimeValue, textPrimary]}>{formatLiveTime(moments.arrival)}</Text></View>
    </View> : null}

    {plan.destination ? <Text style={[styles.planDestination, textSecondary]}>目的地　{plan.destination}</Text> : null}
    {canUseReverse && <Text style={[styles.planCountdownValue, textPrimary]}>{checkIn ? '出発済みです' : passed ? '予定の確認が必要です' : countdownToDate(countdownAt, now)}</Text>}
    {reverse && !isPremium && <Pressable accessibilityRole="button" style={[styles.planPremiumNotice, { borderColor: isDark ? '#40506A' : theme.colors.border, backgroundColor: isDark ? '#20293A' : theme.colors.secondarySurface }]} onPress={() => onPremium('route')}><Text style={[styles.planPremiumNoticeText, { color: theme.colors.primaryAccent }]}>到着からの逆算はPremiumで確認できます</Text></Pressable>}

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
      {plan.destination?.trim() ? <Pressable accessibilityRole="button" style={[styles.planUtilityButton, isDark && styles.planUtilityButtonDark]} onPress={() => void openMap()}><Text style={[styles.planUtilityText, { color: theme.colors.primaryAccent }]}>地図</Text></Pressable> : null}
      {reverse && isPremium && <Pressable accessibilityRole="button" style={[styles.planUtilityButton, isDark && styles.planUtilityButtonDark]} onPress={() => onShare(plan)}><Text style={[styles.planUtilityText, { color: theme.colors.primaryAccent }]}>共有</Text></Pressable>}
      <Pressable accessibilityRole="button" style={[styles.planUtilityButton, isDark && styles.planUtilityButtonDark]} onPress={() => onEdit(plan)}><Text style={[styles.planUtilityText, { color: theme.colors.primaryAccent }]}>編集</Text></Pressable>
      {plan.id && <Pressable accessibilityRole="button" style={[styles.planUtilityButton, isDark && styles.planUtilityButtonDark]} onPress={() => onDelete(plan.id!)}><Text style={[styles.planDeleteText, { color: isDark ? '#FF8F9C' : '#B85060' }]}>削除</Text></Pressable>}
      {plan.destination?.trim() ? <TravelAppLaunchActions settings={travelApps} category="transit" destination={plan.destination} planTier={planTier} designMode={designMode} chicPalette={chicPalette} onPremium={onPremium} onOpenSettings={onOpenTravelAppSettings} /> : null}
      <TravelAppLaunchActions settings={travelApps} category="taxi" destination={plan.destination} planTier={planTier} designMode={designMode} chicPalette={chicPalette} onPremium={onPremium} onOpenSettings={onOpenTravelAppSettings} />
    </View>
  </View>;
});

export function TimelineScreen({
  plan, plans, planEditorOpen, departureCheckIns, departurePreparationStatuses, behaviorEvents, tasks, now, designMode, focusBackgroundUri, initialTab, chicPattern, chicPalette, planTier, focusCustomDurationMinutes, onFocusCustomDurationChange, recoveryTargetPlanId, onChange, onSchedule, onScheduleUsed, onOpenNewPlan, onClosePlanEditor, onImportCalendarEvent, onEdit, onSharePlan, onDelete, onEditTask, onDeleteTask, onPremium, onRecovery, onRecoveryClosed, onFocusCompleted, onFocusStarted, onFocusNotificationPermission, onFocusRunningChange, focusTimerActive, onFocusNavigationBlocked, onBehaviorEvent, onDeparted, onPreparationStarted, onStill, calendarMarks, onSetCalendarMark, travelApps, onOpenTravelAppSettings, hapticsEnabled, calendarImportCalendarIds, calendarImportKnownCalendarIds, onCalendarImportCalendarIdsChange, onCalendarImportKnownCalendarIdsChange, styles, helpers, components,
}: any) {
  const { getThemeTokens, dateKey, planDateKey, hasPremiumAccess, formatLiveDate, formatLiveTime, getDepartureMoments, countdownToDate, dateForReminder, getMapSearchTarget, openMapSearch, getPlanCountdownAt } = helpers;
  const { TimeTabButton, FocusMode, TaskScheduleCalendar, DailyScheduleTimeline, RecoveryModal } = components;
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  const [timeTab, setTimeTab] = useState<TimeTab>(initialTab);
  const [calendarEvents, setCalendarEvents] = useState<Calendar.Event[]>([]);
  const [calendarOptions, setCalendarOptions] = useState<Calendar.Calendar[]>([]);
  const [calendarSelectorOpen, setCalendarSelectorOpen] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarLoaded, setCalendarLoaded] = useState(false);
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

  return <>
    <View style={[styles.timeTabs, designMode === 'minimal' && styles.timeTabsMinimal, designMode === 'dark' && styles.darkPanel, designMode === 'chic' && styles.timeTabsChic, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
      {(['departure', 'deadline', 'calendar', 'focus'] as TimeTab[]).map((tab) => <TimeTabButton key={tab} tab={tab} active={timeTab === tab} designMode={designMode} chicPattern={chicPattern} chicPalette={chicPalette} themeAccent={theme.colors.primaryAccent} secondaryText={theme.colors.secondaryText} onPress={() => { if (focusTimerActive && tab !== 'focus') { onFocusNavigationBlocked?.(); return; } setTimeTab(tab); onScheduleUsed?.(); }} />)}
    </View>

    {timeTab === 'focus' ? <FocusMode tasks={tasks} designMode={designMode} chicPalette={chicPalette} backgroundImageUri={focusBackgroundUri} planTier={planTier} onPremium={onPremium} customDurationMinutes={focusCustomDurationMinutes} onCustomDurationChange={onFocusCustomDurationChange} onFocusCompleted={onFocusCompleted} onFocusStarted={onFocusStarted} onFocusNotificationPermission={onFocusNotificationPermission} onFocusRunningChange={onFocusRunningChange} onBehaviorEvent={onBehaviorEvent} hapticsEnabled={hapticsEnabled} /> : timeTab === 'calendar' ? <TaskScheduleCalendar tasks={tasks} plans={plans} externalEvents={calendarEvents} now={now} designMode={designMode} chicPattern={chicPattern} chicPalette={chicPalette} planTier={planTier} focusDate={calendarFocusDate} calendarMarks={calendarMarks} onSetCalendarMark={onSetCalendarMark} onPremium={onPremium} onEditTask={onEditTask} onDeleteTask={onDeleteTask} onEditPlan={openPlanEditor} onDeletePlan={onDelete} onOpenMap={(item: DeparturePlan) => void openMapSearch(getMapSearchTarget(item))} behaviorEvents={behaviorEvents} departureCheckIns={departureCheckIns} departurePreparationStatuses={departurePreparationStatuses} /> : timeTab === 'deadline' ? <>
      <View style={[styles.departureListHeader, isDark && styles.darkPanel]}><View><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>今日のスケジュール</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>予定がなくても時間の流れを確認できます</Text></View><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{dateKey(now).replaceAll('-', '.')}</Text></View>
      <DailyScheduleTimeline date={dateKey(now)} tasks={tasks} plans={plans} externalEvents={calendarEvents} now={now} designMode={designMode} chicPalette={chicPalette} planTier={planTier} onEditTask={onEditTask} onEditPlan={openPlanEditor} />
    </> : <>
      <Pressable accessibilityRole="button" style={[styles.planAddButton, { backgroundColor: theme.colors.primaryAccent }]} onPress={onOpenNewPlan}><Text style={styles.planAddButtonText}>＋ 予定を追加</Text></Pressable>
      <Pressable style={[styles.calendarImportButton, designMode === 'minimal' && styles.calendarImportButtonMinimal, isDark && styles.calendarImportButtonDark, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]} onPress={importCalendarEvents}><Text style={[styles.calendarImportIcon, designMode !== 'chic' && styles.calendarImportIconMono, isDark && styles.calendarImportIconDark, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>▣</Text><View style={{ flex: 1 }}><Text style={[styles.calendarImportTitle, isDark && styles.darkBodyText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{calendarLoading ? '読み込み中…' : 'いつものカレンダーとつなぐ'}</Text><Text style={[styles.calendarImportCopy, isDark && styles.darkMutedText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{hasPremiumAccess(planTier, 'external_calendar') ? '今日から30日先までの予定を選べます' : '今日から30日先まで表示・取り込みは広告で1回'}</Text></View><Text style={[styles.calendarImportArrow, designMode !== 'chic' && styles.calendarImportArrowMono, isDark && styles.calendarImportArrowDark, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>›</Text></Pressable>
      {calendarLoaded && calendarOptions.filter((item) => !isBirthdayCalendar(item)).length > 0 && <Pressable style={[styles.calendarEventPicker, { paddingVertical: 11 }, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]} onPress={() => setCalendarSelectorOpen(true)}><Text style={[styles.calendarEventPickerTitle, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>取り込むカレンダー {calendarImportCalendarIds?.length ?? 0}件　変更する ›</Text></Pressable>}
      <Modal visible={calendarSelectorOpen} transparent animationType="slide" onRequestClose={() => setCalendarSelectorOpen(false)}><Pressable style={styles.modalBackdrop} onPress={() => setCalendarSelectorOpen(false)}><Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, maxHeight: '72%' }]} onPress={(event) => event.stopPropagation()}><View style={styles.modalHandle} /><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>取り込むカレンダー</Text><Pressable onPress={() => setCalendarSelectorOpen(false)}><Text style={[styles.calendarImportArrow, { color: theme.colors.primaryAccent }]}>閉じる</Text></Pressable></View><Text style={[styles.calendarImportCopy, isDark && styles.darkMutedText]}>通常のカレンダーは初期選択、購読カレンダーは必要な場合だけ選択できます。</Text><ScrollView style={{ marginTop: 10 }}>{calendarOptions.filter((item) => !isBirthdayCalendar(item)).map((calendar) => { const selected = calendarImportCalendarIds?.includes(calendar.id) ?? false; const subscribed = isSubscribedCalendar(calendar); return <Pressable key={calendar.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#303B50' : '#E5E0E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={() => void toggleCalendarSelection(calendar)}><View style={{ flex: 1, paddingRight: 12 }}><Text style={[styles.calendarEventTitle, isDark && styles.darkBodyText]}>{calendar.title}</Text><Text style={[styles.calendarEventDate, isDark && styles.darkMutedText]}>{subscribed ? '購読カレンダー' : '通常カレンダー'}</Text></View><Text style={{ color: selected ? theme.colors.primaryAccent : (isDark ? '#8F9BB0' : '#9AA3B3'), fontSize: 20 }}>{selected ? '✓' : '○'}</Text></Pressable>; })}</ScrollView></Pressable></Pressable></Modal>
      {calendarLoaded && calendarEvents.length === 0 && <View style={[styles.calendarEventPicker, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}><Text style={[styles.calendarEventPickerTitle, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>新しく取り込める予定はありません</Text><Text style={[styles.calendarEventDate, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{calendarExcludedCount > 0 ? '登録済みの予定は一覧から除外しています。' : '今日から30日以内のカレンダー予定がありません。'}</Text></View>}
      {calendarLoaded && calendarEvents.length > 0 && <View style={[styles.calendarEventPicker, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}><Text style={[styles.calendarEventPickerTitle, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>取り込む予定を選択（{calendarEvents.length}件）</Text><Text style={[styles.calendarEventDate, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>登録済みの予定は表示されません。</Text>{calendarEvents.map((event) => { const eventStart = new Date(event.startDate); return <Pressable key={calendarEventOccurrenceKey(event)} style={[styles.calendarEventRow, designMode === 'chic' && chicPalette && { borderBottomColor: chicPalette.border }]} onPress={() => selectCalendarEvent(event)}><View style={{ flex: 1 }}><Text style={[styles.calendarEventTitle, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{event.title || '名称なし'}</Text><Text style={[styles.calendarEventDate, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{formatLiveDate(eventStart)} ・ {event.allDay ? '終日' : formatLiveTime(eventStart)}</Text></View><Text style={[styles.calendarImportArrow, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>＋</Text></Pressable>; })}</View>}
      <View style={[styles.departureListHeader, isDark && styles.darkPanel]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>カウントダウン</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{countdownPlans.length}件の予定</Text></View>
      {countdownPlans.length === 0 ? <View style={[styles.departureEmpty, isDark && styles.departureEmptyDark]}><Text style={[styles.emptyCopy, isDark && styles.darkMutedText]}>出発時刻を登録した予定が、ここに表示されます。</Text></View> : countdownPlans.map((item: DeparturePlan) => {
        const key = `${item.id}:${planDateKey(item)}`;
        return <DepartureCountdownCard key={item.id} plan={item} now={now} planTier={planTier} designMode={designMode} chicPalette={chicPalette} status={item.id && planDateKey(item) === todayKey ? departurePreparationStatuses[item.id] : undefined} prepared={preparedByPlanDay.has(key)} departed={departedByPlanDay.has(key)} checkIn={checkInsByPlanDay.get(key)} styles={styles} helpers={{ getThemeTokens, planDateKey, formatLiveTime, getDepartureMoments, countdownToDate, getMapSearchTarget, openMapSearch, getPlanCountdownAt }} onPrepare={onPreparationStarted} onDepart={onDeparted} onStill={onStill} onRecover={setRecoveryPlan} onShare={onSharePlan} onPremium={() => onPremium('route')} onEdit={openPlanEditor} onDelete={onDelete} travelApps={travelApps} onOpenTravelAppSettings={onOpenTravelAppSettings} />;
      })}
    </>}

    {planEditorOpen && <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClosePlanEditor}>
      <View style={[styles.planEditorModal, { backgroundColor: theme.colors.screenBackground }]}><ScrollView contentContainerStyle={styles.planEditorScroll} keyboardShouldPersistTaps="handled"><DeparturePlanForm plan={plan} plans={plans} behaviorEvents={behaviorEvents} designMode={designMode} chicPattern={chicPattern} chicPalette={chicPalette} planTier={planTier} onChange={onChange} onSubmit={onSchedule} onClose={onClosePlanEditor} onPremium={onPremium} dateKey={dateKey} formatLiveDate={formatLiveDate} formatLiveTime={formatLiveTime} dateForReminder={dateForReminder} getDepartureMoments={getDepartureMoments} getMapSearchTarget={getMapSearchTarget} openMapSearch={openMapSearch} travelApps={travelApps} onOpenTravelAppSettings={onOpenTravelAppSettings} /></ScrollView></View>
    </Modal>}
    <RecoveryModal visible={Boolean(recoveryPlan)} plan={recoveryPlan} now={now} designMode={designMode} styles={styles} travelApps={travelApps} planTier={planTier} chicPalette={chicPalette} onOpenTravelAppSettings={onOpenTravelAppSettings} onPremium={(featureId?: PremiumGuideFeatureId) => onPremium(featureId ?? 'recovery')} onClose={() => { setRecoveryPlan(undefined); onRecoveryClosed(); }} onApply={(record: RecoveryRecord) => { onRecovery(record); setRecoveryPlan(undefined); }} />
  </>;
}
