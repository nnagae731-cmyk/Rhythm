import DateTimePicker from '@react-native-community/datetimepicker';
import * as Calendar from 'expo-calendar';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { ChicPattern, DesignMode } from '../theme';
import { CalendarMarks, DeparturePlan, DeparturePreparationStatus, Task, TimeTab } from '../types';
import { DepartureCheckIn } from '../departureCheckIn';
import { BehaviorEvent } from '../behaviorEvents';
import { FocusSession } from '../focusSession';
import { RecoveryRecord } from '../recovery';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
export function TimelineScreen({
  plan,
  plans,
  departureCheckIns,
  departurePreparationStatuses,
  behaviorEvents,
  tasks,
  now,
  designMode,
  focusBackgroundUri,
  initialTab,
  chicPattern,
  planTier,
  recoveryTargetPlanId,
  onChange,
  onSchedule,
  onImportCalendarEvent,
  onEdit,
  onSharePlan,
  onDelete,
  onEditTask,
  onDeleteTask,
  onPremium,
  onRecovery,
  onRecoveryClosed,
  onFocusCompleted,
  onBehaviorEvent,
  onDeparted,
  onPreparationStarted,
  calendarMarks,
  onSetCalendarMark,
  styles,
  helpers,
  components,
}: {
  plan: DeparturePlan;
  plans: DeparturePlan[];
  departureCheckIns: DepartureCheckIn[];
  departurePreparationStatuses: Record<string, DeparturePreparationStatus>;
  behaviorEvents: BehaviorEvent[];
  tasks: Task[];
  now: Date;
  designMode: DesignMode;
  focusBackgroundUri?: string;
  initialTab: TimeTab;
  chicPattern: ChicPattern;
  planTier: PlanTier;
  recoveryTargetPlanId?: string;
  onChange: (plan: DeparturePlan) => void;
  onSchedule: () => void;
  onImportCalendarEvent: (event: Calendar.Event) => boolean;
  onEdit: (plan: DeparturePlan) => void;
  onSharePlan: (plan: DeparturePlan) => void;
  onDelete: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onRecovery: (record: RecoveryRecord) => void;
  onRecoveryClosed: () => void;
  onFocusCompleted: (session: FocusSession) => void;
  onBehaviorEvent: (event: BehaviorEvent) => void;
  onDeparted: (planId: string) => void;
  onPreparationStarted: (planId: string) => void;
  calendarMarks: CalendarMarks;
  onSetCalendarMark: (date: string, mark?: string) => void;
  styles: any;
  helpers: any;
  components: any;
}) {
  const { getThemeTokens, dateKey, planDateKey, hasPremiumAccess, formatLiveDate, formatLiveTime, getDepartureMoments, normalizePlanDate, countdownToDate, dateForReminder, getMapSearchTarget, openMapSearch, colors } = helpers;
  const { TimeTabButton, FocusMode, TaskScheduleCalendar, DailyScheduleTimeline, PremiumRoutePreview, ScheduleSettingCard, RecoveryModal } = components;
  const theme = getThemeTokens(designMode);
  const isDark = designMode === 'dark';
  const [showPlanDatePicker, setShowPlanDatePicker] = useState(false);
  const [timeTab, setTimeTab] = useState<TimeTab>(initialTab);
  const [calendarEvents, setCalendarEvents] = useState<Calendar.Event[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarFocusDate, setCalendarFocusDate] = useState<string>();
  const [recoveryPlan, setRecoveryPlan] = useState<DeparturePlan>();
  const [statusMessage, setStatusMessage] = useState('');
  const countdownEnabled = plan.countdownEnabled !== false;
  useEffect(() => setTimeTab(initialTab), [initialTab]);
  useEffect(() => {
    if (!recoveryTargetPlanId) return;
    const target = plans.find((item) => item.id === recoveryTargetPlanId);
    if (target) setRecoveryPlan(target);
  }, [plans, recoveryTargetPlanId]);
  // 当日分は履歴として残し、日付をまたいだ終了済み予定はカウントダウンから除外する。
  const todayKey = dateKey(now);
  const countdownPlans = plans.filter((item) => item.countdownEnabled !== false && planDateKey(item) >= todayKey);
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
    if (!onImportCalendarEvent(event)) return;
    setCalendarEvents((current) => current.filter((item) => item.id !== event.id));
    setCalendarFocusDate(dateKey(start));
    setTimeTab('calendar');
  };
  const openPlanEditor = (target: DeparturePlan) => {
    onEdit(target);
    setTimeTab('departure');
  };
  return (
    <>
      <View style={[styles.timeTabs, designMode === 'minimal' && styles.timeTabsMinimal, designMode === 'dark' && styles.darkPanel, designMode === 'chic' && styles.timeTabsChic, ]}>
        {(['departure', 'deadline', 'calendar', 'focus'] as TimeTab[]).map((tab) => <TimeTabButton key={tab} tab={tab} active={timeTab === tab} designMode={designMode} chicPattern={chicPattern} themeAccent={theme.colors.primaryAccent} secondaryText={theme.colors.secondaryText} onPress={() => setTimeTab(tab)} />)}
      </View>

      {timeTab === 'focus' ? <FocusMode tasks={tasks} designMode={designMode} backgroundImageUri={focusBackgroundUri} onFocusCompleted={onFocusCompleted} onBehaviorEvent={onBehaviorEvent} /> : timeTab === 'calendar' ? <TaskScheduleCalendar tasks={tasks} plans={plans} externalEvents={calendarEvents} now={now} designMode={designMode} chicPattern={chicPattern} planTier={planTier} focusDate={calendarFocusDate} calendarMarks={calendarMarks} onSetCalendarMark={onSetCalendarMark} onPremium={onPremium} onEditTask={onEditTask} onDeleteTask={onDeleteTask} onEditPlan={openPlanEditor} onDeletePlan={onDelete} onOpenMap={(item: DeparturePlan) => void openMapSearch(getMapSearchTarget(item))} behaviorEvents={behaviorEvents} departureCheckIns={departureCheckIns} departurePreparationStatuses={departurePreparationStatuses} /> : timeTab === 'deadline' ? <>
        <View style={[styles.departureListHeader, isDark && styles.darkPanel]}><View><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>今日のスケジュール</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>予定がなくても時間の流れを確認できます</Text></View><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{dateKey(now).replaceAll('-', '.')}</Text></View>
        <DailyScheduleTimeline date={dateKey(now)} tasks={tasks} plans={plans} externalEvents={calendarEvents} now={now} designMode={designMode} onEditTask={onEditTask} onEditPlan={openPlanEditor} />
      </> : <>
      <Pressable style={styles.calendarImportButton} onPress={importCalendarEvents}><Text style={styles.calendarImportIcon}>▣</Text><View style={{ flex: 1 }}><Text style={styles.calendarImportTitle}>{calendarLoading ? '読み込み中…' : 'いつものカレンダーとつなぐ'}</Text><Text style={styles.calendarImportCopy}>{hasPremiumAccess(planTier, 'external_calendar') ? '端末の予定をRhythmへ取り込む' : 'Premium'}</Text></View><Text style={styles.calendarImportArrow}>›</Text></Pressable>
      {calendarEvents.length > 0 && <View style={styles.calendarEventPicker}><Text style={styles.calendarEventPickerTitle}>取り込む予定を選択</Text>{calendarEvents.map((event) => { const start = new Date(event.startDate); return <Pressable key={event.id} style={styles.calendarEventRow} onPress={() => selectCalendarEvent(event)}><View><Text style={styles.calendarEventTitle}>{event.title || '名称なし'}</Text><Text style={styles.calendarEventDate}>{formatLiveDate(start)} {formatLiveTime(start)}</Text></View><Text style={styles.calendarImportArrow}>＋</Text></Pressable>; })}</View>}
      {planTier === 'premium' ? (() => {
        const previewPlan = plan.id && plan.countdownEnabled !== false
          ? plan
          : [...plans].filter((item) => item.countdownEnabled !== false).sort((a, b) => getDepartureMoments(a).arrival.getTime() - getDepartureMoments(b).arrival.getTime())[0] ?? plan;
        return <PremiumRoutePreview plan={previewPlan} now={now} designMode={designMode} onOpenMap={(query: string) => void openMapSearch(query)} />;
      })() : <Pressable onPress={() => onPremium('route')} style={{ marginBottom: 14, padding: 16, borderRadius: designMode === 'minimal' || isDark ? 3 : 20, borderWidth: 1, borderColor: isDark ? '#B9A8D8' : '#DDD4F5', backgroundColor: isDark ? '#FFFFFF' : '#F7F3FF' }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View style={{ flex: 1, paddingRight: 10 }}><Text style={{ color: isDark ? '#5A3E9B' : colors.violet, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>PREMIUM</Text><Text style={{ color: isDark ? '#161421' : colors.ink, fontSize: 15, fontWeight: '900', marginTop: 5 }}>間に合う出発プラン</Text><Text style={{ color: isDark ? '#5A5364' : colors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 }}>登録した移動時間から、準備・出発・余裕時間をまとめて整えます。</Text></View><Text style={{ color: isDark ? '#5A3E9B' : colors.violet, fontSize: 24, fontWeight: '700' }}>›</Text></View><View style={{ flexDirection: 'row', gap: 7, marginTop: 12 }}><View style={{ flex: 1, backgroundColor: isDark ? '#F2EFF8' : '#FFFFFF', borderRadius: 10, padding: 8 }}><Text style={{ color: colors.muted, fontSize: 9 }}>無料</Text><Text style={{ color: colors.ink, fontSize: 11, fontWeight: '800', marginTop: 3 }}>地図を開く</Text></View><View style={{ flex: 1, backgroundColor: isDark ? '#E8E0FA' : '#EEE9FF', borderRadius: 10, padding: 8 }}><Text style={{ color: colors.violet, fontSize: 9 }}>Premium</Text><Text style={{ color: colors.ink, fontSize: 11, fontWeight: '800', marginTop: 3 }}>行動時間を逆算</Text></View></View></Pressable>}
      <View style={[styles.departureListHeader, isDark && styles.darkPanel]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>カウントダウン</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{countdownPlans.length}件の予定</Text></View>
      {countdownPlans.length === 0 ? <View style={styles.departureEmpty}><Text style={styles.emptyCopy}>予定を追加すると、ここに出発までの時間が並びます。</Text></View> : [...countdownPlans].sort((a, b) => getDepartureMoments(a).leave.getTime() - getDepartureMoments(b).leave.getTime()).map((item) => {
        const moments = getDepartureMoments(item);
        const passed = moments.arrival.getTime() < now.getTime();
        const checkIn = item.id ? departureCheckIns.find((record) => record.planId === item.id && normalizePlanDate(record.date) === planDateKey(item)) : undefined;
        const preparationEvent = item.id ? behaviorEvents.find((event) => event.type === 'departure_preparation_started' && event.departurePlanId === item.id && normalizePlanDate(event.departurePlanDate) === planDateKey(item)) : undefined;
        const departureEvent = item.id ? behaviorEvents.find((event) => event.type === 'departure_started' && event.departurePlanId === item.id && normalizePlanDate(event.departurePlanDate) === planDateKey(item)) : undefined;
        const preparationStatus = item.id ? departurePreparationStatuses[item.id] : undefined;
        const progressLabel = checkIn ? '到着済み' : departureEvent ? '移動中' : preparationStatus === 'prepared' ? '準備完了' : preparationEvent ? '準備中' : passed ? '終了' : '未準備';
        return <View key={item.id} style={[styles.departureCountdownCard, { flexDirection: 'column', alignItems: 'stretch' }, passed && styles.departurePassed]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}><View style={{ flex: 1 }}><Text style={[styles.departureCountdownTitle, isDark && styles.darkBodyText]}>{item.title}</Text><Text style={[styles.departureCountdownDate, isDark && styles.darkMutedText]}>{planDateKey(item).replaceAll('-', '.')}</Text></View><View style={{ backgroundColor: isDark ? '#E8E0FA' : '#F0EBFF', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }}><Text style={{ color: isDark ? '#5A3E9B' : colors.violet, fontSize: 10, fontWeight: '800' }}>{progressLabel}</Text></View></View>
            <View style={{ flexDirection: 'row', marginTop: 13, borderTopWidth: 1, borderBottomWidth: 1, borderColor: isDark ? '#E4E1E8' : '#EEEAF2', paddingVertical: 10 }}><View style={{ flex: 1 }}><Text style={[styles.departureCountdownMeta, isDark && styles.darkMutedText]}>準備</Text><Text style={[styles.departureCountdownTitle, isDark && styles.darkBodyText, { fontSize: 15, marginTop: 2 }]}>{formatLiveTime(moments.prepare)}</Text></View><View style={{ flex: 1, borderLeftWidth: 1, borderColor: isDark ? '#E4E1E8' : '#EEEAF2', paddingLeft: 12 }}><Text style={[styles.departureCountdownMeta, isDark && styles.darkMutedText]}>出発</Text><Text style={[styles.departureCountdownTitle, isDark && styles.darkBodyText, { fontSize: 15, marginTop: 2 }]}>{formatLiveTime(moments.leave)}</Text></View><View style={{ flex: 1, borderLeftWidth: 1, borderColor: isDark ? '#E4E1E8' : '#EEEAF2', paddingLeft: 12 }}><Text style={[styles.departureCountdownMeta, isDark && styles.darkMutedText]}>到着</Text><Text style={[styles.departureCountdownTitle, isDark && styles.darkBodyText, { fontSize: 15, marginTop: 2 }]}>{item.arrival}</Text></View></View>
            {checkIn && <Text style={styles.taskMeta}>{checkIn.onTime ? '予定どおり到着' : '遅れて到着'} · {formatLiveTime(new Date(checkIn.departedAt))}出発</Text>}
          </View>
          <View style={[styles.departureCountdownRight, { width: '100%', marginTop: 10, alignItems: 'stretch' }]}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={[styles.departureCountdownValue, isDark && styles.darkBodyText]}>{checkIn ? '出発済み' : passed ? '終了' : countdownToDate(moments.leave, now)}</Text>{!preparationEvent && !checkIn && item.id ? <View style={styles.twoChoiceRow}><Pressable style={styles.recoveryMiniButton} onPress={() => onPreparationStarted(item.id!)}><Text style={styles.recoveryMiniButtonText}>準備した</Text></Pressable><Pressable style={styles.recoveryMiniButtonSecondary} onPress={() => setStatusMessage('今の時間から、次に準備するタイミングを考えます。')}><Text style={[styles.recoveryMiniButtonSecondaryText, isDark && styles.darkBodyText]}>まだ</Text></Pressable></View> : !checkIn && item.id ? <View style={styles.twoChoiceRow}><Pressable style={styles.recoveryMiniButton} onPress={() => onDeparted(item.id!)}><Text style={styles.recoveryMiniButtonText}>出発した</Text></Pressable><Pressable style={styles.recoveryMiniButtonSecondary} onPress={() => setStatusMessage('5分後にもう一度確認します。')}><Text style={[styles.recoveryMiniButtonSecondaryText, isDark && styles.darkBodyText]}>まだ</Text></Pressable></View> : null}</View>{!checkIn && moments.leave.getTime() <= now.getTime() && <Pressable style={[styles.recoveryMiniButton, { marginTop: 8 }]} onPress={() => hasPremiumAccess(planTier, 'late_recovery') ? setRecoveryPlan(item) : onPremium('recovery')}><Text style={styles.recoveryMiniButtonText}>立て直す {hasPremiumAccess(planTier, 'late_recovery') ? '' : 'Premium'}</Text></Pressable>}<View style={[styles.departureActions, { justifyContent: 'flex-end', marginTop: 8 }]}><Pressable onPress={() => void openMapSearch(getMapSearchTarget(item))}><Text style={[styles.departureEdit, isDark && styles.darkAccentText]}>地図</Text></Pressable><Pressable onPress={() => item.id && onSharePlan(item)}><Text style={[styles.departureEdit, isDark && styles.darkAccentText]}>共有</Text></Pressable><Pressable onPress={() => onEdit(item)}><Text style={[styles.departureEdit, isDark && styles.darkAccentText]}>編集</Text></Pressable><Pressable onPress={() => item.id && onDelete(item.id)}><Text style={styles.departureDelete}>削除</Text></Pressable></View></View>
        </View>;
      })}
      {!!statusMessage && <Text style={styles.timelineStatusMessage}>{statusMessage}</Text>}

      <View style={[styles.formCard, { marginTop: 22, padding: 18, borderRadius: designMode === 'minimal' || isDark ? 4 : 22, borderWidth: 1, borderColor: isDark ? '#D8D4E0' : '#ECE5F0' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}><View><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>{plan.id ? '予定を編集' : '予定を追加'}</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText, { marginTop: 3 }]}>{countdownEnabled ? '登録した移動時間から準備と出発を逆算します' : '予定表に日時だけを表示します'}</Text></View><Text style={{ color: isDark ? '#7B6BE8' : colors.violet, fontSize: 12, fontWeight: '900' }}>PLAN</Text></View>
        <Text style={[styles.fieldLabel, { marginTop: 0 }]}>予定の種類</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <Pressable onPress={() => onChange({ ...plan, countdownEnabled: true })} style={{ flex: 1, padding: 11, borderWidth: 1, borderRadius: 12, borderColor: countdownEnabled ? (isDark ? '#7B6BE8' : colors.violet) : (isDark ? '#D8D4E0' : '#E8E1F0'), backgroundColor: countdownEnabled ? (isDark ? '#E8E0FA' : '#F2EDFF') : (isDark ? '#FFFFFF' : '#FCFBFE') }}><Text style={{ color: isDark ? '#161421' : colors.ink, fontSize: 12, fontWeight: '900' }}>出発を逆算</Text><Text style={{ color: isDark ? '#5A3E9B' : colors.muted, fontSize: 10, marginTop: 3 }}>カウントダウン・通知あり</Text></Pressable>
          <Pressable onPress={() => onChange({ ...plan, countdownEnabled: false })} style={{ flex: 1, padding: 11, borderWidth: 1, borderRadius: 12, borderColor: !countdownEnabled ? (isDark ? '#7B6BE8' : colors.violet) : (isDark ? '#D8D4E0' : '#E8E1F0'), backgroundColor: !countdownEnabled ? (isDark ? '#E8E0FA' : '#F2EDFF') : (isDark ? '#FFFFFF' : '#FCFBFE') }}><Text style={{ color: isDark ? '#161421' : colors.ink, fontSize: 12, fontWeight: '900' }}>予定表だけ</Text><Text style={{ color: isDark ? '#5A3E9B' : colors.muted, fontSize: 10, marginTop: 3 }}>カウントダウンなし</Text></Pressable>
        </View>
        <Text style={[styles.fieldLabel, { marginTop: 0 }]}>1　基本情報</Text>
        <Text style={styles.fieldLabel}>予定の名前</Text>
      <TextInput
        style={[styles.titleInput, { borderWidth: 1, borderColor: isDark ? '#D8D4E0' : '#E8E1F0', borderRadius: 12, paddingHorizontal: 12, backgroundColor: isDark ? '#FAFAFC' : '#FCFBFE' }]}
        value={plan.title}
        onChangeText={(title) => onChange({ ...plan, title })}
        placeholder="予定を入力"
      />
      <Text style={styles.fieldLabel}>目的地</Text>
      <TextInput
        style={[styles.titleInput, { borderWidth: 1, borderColor: isDark ? '#D8D4E0' : '#E8E1F0', borderRadius: 12, paddingHorizontal: 12, backgroundColor: isDark ? '#FAFAFC' : '#FCFBFE' }]}
        value={plan.destination ?? ''}
        onChangeText={(destination) => onChange({ ...plan, destination })}
        placeholder="地図で開きたい場所"
      />
      <Text style={[styles.sectionSub, isDark && styles.darkMutedText, { marginTop: 5, marginBottom: 5 }]}>目的地を入れると、地図アプリで確認できます</Text>
      <Pressable style={[styles.departureDateButton, { marginTop: 6 }]} onPress={() => void openMapSearch(getMapSearchTarget(plan))}><Text style={styles.departureDateButtonText}>地図で開く  ›</Text></Pressable>
      <Text style={styles.fieldLabel}>{countdownEnabled ? '2　到着の設定' : '2　日時'}</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText, { marginBottom: 5 }]}>{countdownEnabled ? 'この時刻から準備・出発を自動で逆算' : '予定表に表示する日時を設定'}</Text>
      <Text style={styles.fieldLabel}>{countdownEnabled ? '到着する日' : '予定の日'}</Text>
      <Pressable style={styles.departureDateButton} onPress={() => setShowPlanDatePicker((value) => !value)}><Text style={styles.departureDateButtonText}>▣ {plan.date}</Text></Pressable>
        {showPlanDatePicker && <DateTimePicker value={dateForReminder(plan.date, plan.arrival)} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={(event, selected) => {
          if (Platform.OS !== 'ios') setShowPlanDatePicker(false);
          if (event.type === 'set' && selected) onChange({ ...plan, date: dateKey(selected) });
        }} />}
        <Text style={styles.fieldLabel}>{countdownEnabled ? '到着する時刻' : '予定の時刻'}</Text><TextInput
          style={[styles.arrivalInput, { fontSize: 24, letterSpacing: 0, borderWidth: 1, borderColor: isDark ? '#D8D4E0' : '#E1D8F3', borderRadius: 14, paddingHorizontal: 14, backgroundColor: isDark ? '#FAFAFC' : '#FBF9FF' }]}
          value={plan.arrival}
          onChangeText={(arrival) => onChange({ ...plan, arrival })}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          placeholder="例 18:30"
        />
        {countdownEnabled && <><Text style={[styles.fieldLabel, { marginTop: 16 }]}>3　逆算に使う時間</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}><ScheduleSettingCard label="移動" value={plan.travelMinutes} onChange={(travelMinutes: number) => onChange({ ...plan, travelMinutes })} /><ScheduleSettingCard label="準備" value={plan.preparationMinutes} onChange={(preparationMinutes: number) => onChange({ ...plan, preparationMinutes })} /><ScheduleSettingCard label="余裕" value={plan.bufferMinutes} onChange={(bufferMinutes: number) => onChange({ ...plan, bufferMinutes })} /></View></>}
      </View>

      <Pressable style={styles.primaryButton} onPress={onSchedule}>
        <Text style={styles.primaryButtonText}>{plan.id ? (countdownEnabled ? '変更を保存して通知' : '変更を保存') : (countdownEnabled ? '予定を追加して通知' : '予定を追加')}</Text>
      </Pressable>
      </>}

      <RecoveryModal visible={Boolean(recoveryPlan)} plan={recoveryPlan} now={now} designMode={designMode} styles={styles} onPremium={() => onPremium('recovery')} onClose={() => { setRecoveryPlan(undefined); onRecoveryClosed(); }} onApply={(record: RecoveryRecord) => { onRecovery(record); setRecoveryPlan(undefined); }} />
    </>
  );
}
