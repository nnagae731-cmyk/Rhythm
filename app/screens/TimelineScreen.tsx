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
  onPremium: () => void;
  onEdit: (plan: DeparturePlan) => void;
  onDelete: (id: string) => void;
};

const DepartureCountdownCard = React.memo(function DepartureCountdownCard({ plan, now, planTier, designMode, chicPalette, status, prepared, departed, checkIn, styles, helpers, onPrepare, onDepart, onStill, onRecover, onShare, onPremium, onEdit, onDelete }: PlanCardProps) {
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
    {reverse && !isPremium && <Pressable accessibilityRole="button" style={[styles.planPremiumNotice, { borderColor: isDark ? '#40506A' : theme.colors.border, backgroundColor: isDark ? '#20293A' : theme.colors.secondarySurface }]} onPress={onPremium}><Text style={[styles.planPremiumNoticeText, { color: theme.colors.primaryAccent }]}>到着からの逆算はPremiumで確認できます</Text></Pressable>}

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
    </View>
  </View>;
});

export function TimelineScreen({
  plan, plans, planEditorOpen, departureCheckIns, departurePreparationStatuses, behaviorEvents, tasks, now, designMode, focusBackgroundUri, initialTab, chicPattern, chicPalette, planTier, focusCustomDurationMinutes, onFocusCustomDurationChange, recoveryTargetPlanId, onChange, onSchedule, onScheduleUsed, onOpenNewPlan, onClosePlanEditor, onImportCalendarEvent, onEdit, onSharePlan, onDelete, onEditTask, onDeleteTask, onPremium, onRecovery, onRecoveryClosed, onFocusCompleted, onFocusStarted, onFocusNotificationPermission, onFocusRunningChange, focusTimerActive, onFocusNavigationBlocked, onBehaviorEvent, onDeparted, onPreparationStarted, onStill, calendarMarks, onSetCalendarMark, hapticsEnabled, styles, helpers, components,
}: any) {
  const { getThemeTokens, dateKey, planDateKey, hasPremiumAccess, formatLiveDate, formatLiveTime, getDepartureMoments, countdownToDate, dateForReminder, getMapSearchTarget, openMapSearch, getPlanCountdownAt } = helpers;
  const { TimeTabButton, FocusMode, TaskScheduleCalendar, DailyScheduleTimeline, RecoveryModal } = components;
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  const [timeTab, setTimeTab] = useState<TimeTab>(initialTab);
  const [calendarEvents, setCalendarEvents] = useState<Calendar.Event[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
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

  const importCalendarEvents = async () => {
    if (!hasPremiumAccess(planTier, 'external_calendar')) { onPremium('calendar'); return; }
    setCalendarLoading(true);
    try {
      const permission = await Calendar.requestCalendarPermissionsAsync();
      if (!permission.granted) { Alert.alert('カレンダーへのアクセスが必要です', '設定からカレンダーへのアクセスを許可してください。'); return; }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const start = new Date();
      const end = new Date(start.getTime() + 14 * 24 * 60 * 60_000);
      const events = await Calendar.getEventsAsync(calendars.map((item) => item.id), start, end);
      setCalendarEvents(events.filter((event) => !event.allDay).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 12));
    } catch { Alert.alert('カレンダーを読み込めませんでした'); } finally { setCalendarLoading(false); }
  };
  const selectCalendarEvent = (event: Calendar.Event) => {
    const start = new Date(event.startDate);
    if (!onImportCalendarEvent(event)) return;
    setCalendarEvents((current) => current.filter((item) => item.id !== event.id));
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
      <Pressable style={[styles.calendarImportButton, designMode === 'minimal' && styles.calendarImportButtonMinimal, isDark && styles.calendarImportButtonDark, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]} onPress={importCalendarEvents}><Text style={[styles.calendarImportIcon, designMode !== 'chic' && styles.calendarImportIconMono, isDark && styles.calendarImportIconDark, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>▣</Text><View style={{ flex: 1 }}><Text style={[styles.calendarImportTitle, isDark && styles.darkBodyText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{calendarLoading ? '読み込み中…' : 'いつものカレンダーとつなぐ'}</Text><Text style={[styles.calendarImportCopy, isDark && styles.darkMutedText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{hasPremiumAccess(planTier, 'external_calendar') ? '端末の予定をRhythmへ取り込む' : 'Premium'}</Text></View><Text style={[styles.calendarImportArrow, designMode !== 'chic' && styles.calendarImportArrowMono, isDark && styles.calendarImportArrowDark, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>›</Text></Pressable>
      {calendarEvents.length > 0 && <View style={[styles.calendarEventPicker, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}><Text style={[styles.calendarEventPickerTitle, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>取り込む予定を選択</Text>{calendarEvents.map((event) => <Pressable key={event.id} style={[styles.calendarEventRow, designMode === 'chic' && chicPalette && { borderBottomColor: chicPalette.border }]} onPress={() => selectCalendarEvent(event)}><View><Text style={[styles.calendarEventTitle, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{event.title || '名称なし'}</Text><Text style={[styles.calendarEventDate, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{formatLiveDate(new Date(event.startDate))} {formatLiveTime(new Date(event.startDate))}</Text></View><Text style={[styles.calendarImportArrow, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>＋</Text></Pressable>)}</View>}
      <View style={[styles.departureListHeader, isDark && styles.darkPanel]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>カウントダウン</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{countdownPlans.length}件の予定</Text></View>
      {countdownPlans.length === 0 ? <View style={[styles.departureEmpty, isDark && styles.departureEmptyDark]}><Text style={[styles.emptyCopy, isDark && styles.darkMutedText]}>出発時刻を登録した予定が、ここに表示されます。</Text></View> : countdownPlans.map((item: DeparturePlan) => {
        const key = `${item.id}:${planDateKey(item)}`;
        return <DepartureCountdownCard key={item.id} plan={item} now={now} planTier={planTier} designMode={designMode} chicPalette={chicPalette} status={item.id && planDateKey(item) === todayKey ? departurePreparationStatuses[item.id] : undefined} prepared={preparedByPlanDay.has(key)} departed={departedByPlanDay.has(key)} checkIn={checkInsByPlanDay.get(key)} styles={styles} helpers={{ getThemeTokens, planDateKey, formatLiveTime, getDepartureMoments, countdownToDate, getMapSearchTarget, openMapSearch, getPlanCountdownAt }} onPrepare={onPreparationStarted} onDepart={onDeparted} onStill={onStill} onRecover={setRecoveryPlan} onShare={onSharePlan} onPremium={() => onPremium('route')} onEdit={openPlanEditor} onDelete={onDelete} />;
      })}
    </>}

    {planEditorOpen && <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClosePlanEditor}>
      <View style={[styles.planEditorModal, { backgroundColor: theme.colors.screenBackground }]}><ScrollView contentContainerStyle={styles.planEditorScroll} keyboardShouldPersistTaps="handled"><DeparturePlanForm plan={plan} plans={plans} behaviorEvents={behaviorEvents} designMode={designMode} chicPattern={chicPattern} planTier={planTier} onChange={onChange} onSubmit={onSchedule} onClose={onClosePlanEditor} onPremium={onPremium} dateKey={dateKey} formatLiveDate={formatLiveDate} formatLiveTime={formatLiveTime} dateForReminder={dateForReminder} getDepartureMoments={getDepartureMoments} getMapSearchTarget={getMapSearchTarget} openMapSearch={openMapSearch} /></ScrollView></View>
    </Modal>}
    <RecoveryModal visible={Boolean(recoveryPlan)} plan={recoveryPlan} now={now} designMode={designMode} styles={styles} onPremium={() => onPremium('recovery')} onClose={() => { setRecoveryPlan(undefined); onRecoveryClosed(); }} onApply={(record: RecoveryRecord) => { onRecovery(record); setRecoveryPlan(undefined); }} />
  </>;
}
