import React, { ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { analyzeDepartureDelay, analyzeFocusDuration, analyzeNotificationResponse, analyzePreparationStartDelay, analyzeSnoozeBehavior, AnalysisResult } from './behaviorAnalysis';
import { BehaviorEvent } from './behaviorEvents';
import { hasPremiumAccess, PlanTier } from './premiumAccess';
import { PremiumGuideFeatureId } from './premiumGuide';
import { DesignMode, getThemeTokens } from './theme';
import { Task } from './types';

type AnalysisTab = 'records' | 'insights' | 'routine';

function DataState({ result, dark = false }: { result: AnalysisResult; dark?: boolean }) {
  if (result.status === 'insufficient') {
    return (
      <View style={[styles.dataState, dark && styles.dataStateDark]}>
        <Text style={[styles.dataStateTitle, dark && styles.darkMetricText]}>まだ記録中です</Text>
        <Text style={[styles.dataStateCopy, dark && styles.darkSecondaryText]}>Rhythmを使うと、少しずつ傾向が見えてきます</Text>
        <Text style={[styles.sample, dark && styles.darkSecondaryText]}>記録 {result.sampleCount}回</Text>
      </View>
    );
  }
  if (result.status === 'early') {
    return (
      <View style={[styles.early, dark && styles.earlyDark]}>
        <Text style={[styles.earlyTitle, dark && styles.darkMetricText]}>少しずつ見えてきました</Text>
        <Text style={[styles.dataStateCopy, dark && styles.darkSecondaryText]}>まだ記録が少ないため、参考として表示しています</Text>
        <Text style={[styles.sample, dark && styles.darkSecondaryText]}>記録 {result.sampleCount}回</Text>
      </View>
    );
  }
  return null;
}

function MetricCard({ title, value, result, designMode }: { title: string; value?: string; result: AnalysisResult; designMode: DesignMode }) {
  const theme = getThemeTokens(designMode);
  return (
    <View style={[styles.metricCard, designMode !== 'chic' && styles.metricMinimal, designMode === 'chic' && styles.metricChic, { borderColor: theme.colors.border }]}> 
      <Text style={[styles.metricLabel, designMode === 'dark' && styles.darkMetricText]}>{title}</Text>
      {result.status === 'insufficient' || result.status === 'early' ? (
        <DataState result={result} dark={designMode === 'dark'} />
      ) : (
        <>
          <Text style={[styles.metricValue, { color: theme.colors.primaryAccent }]}>{value ?? result.summary}</Text>
          <Text style={[styles.metricSummary, designMode === 'dark' && styles.darkMetricText]}>{result.summary}</Text>
          <Text style={styles.sample}>記録 {result.sampleCount}回</Text>
        </>
      )}
    </View>
  );
}

function PremiumGate({ onPremium }: { onPremium: () => void }) {
  return (
    <Pressable style={styles.premiumGate} onPress={onPremium}>
      <Text style={styles.premiumLock}>🔒</Text>
      <Text style={styles.premiumTitle}>Rhythm Premium</Text>
      <Text style={styles.premiumCopy}>詳細な分析はPremiumで見られます</Text>
      <Text style={styles.premiumButton}>くわしく見る</Text>
    </Pressable>
  );
}

function RoutineProgressPanel({ events, tasks, designMode, onRemoveRoutine }: { events: BehaviorEvent[]; tasks: Task[]; designMode: DesignMode; onRemoveRoutine: (taskId: string) => void }) {
  const routineTasks = tasks.filter((task) => task.isRoutine && !task.done);
  const today = new Date();
  const palette = designMode === 'chic' ? ['#E68BA8', '#E7B56A', '#8EC7B3', '#9FA8E8', '#C39BD3'] : ['#171717', '#3A3A3A', '#5C5C5C', '#7A7A7A', '#A0A0A0'];
  if (routineTasks.length === 0) return <View style={[styles.routineCard, designMode === 'dark' && styles.routineCardDark]}><Text style={[styles.sectionTitle, designMode === 'dark' && styles.darkPanelText]}>ルーティンの継続</Text><Text style={[styles.sectionCopy, designMode === 'dark' && styles.darkPanelText]}>タスク登録時に「ルーティンにする」を選ぶと、継続率を確認できます。</Text></View>;
  return <View style={[styles.routineCard, designMode === 'dark' && styles.routineCardDark]}><Text style={[styles.sectionTitle, designMode === 'dark' && styles.darkPanelText]}>ルーティンの継続</Text><Text style={[styles.sectionCopy, designMode === 'dark' && styles.darkPanelText]}>続けられた日が丸で増えていきます。連続日数と継続率を確認できます。</Text><View style={styles.routineTaskGrid}>{routineTasks.map((task, taskIndex) => {
    const routineKey = task.routineId ?? task.id;
    const routineMemberIds = new Set(tasks.filter((candidate) => candidate.routineId === routineKey || (!candidate.routineId && candidate.isRoutine && candidate.title === task.title)).map((candidate) => candidate.id));
    routineMemberIds.add(task.id);
    const routineEvents = events.filter((event) => event.type === 'task_completed' && event.taskId && routineMemberIds.has(event.taskId));
    const completedDays = new Set(routineEvents.map((event) => event.occurredAt.slice(0, 10)));
    const firstCompletion = routineEvents.map((event) => new Date(event.occurredAt)).sort((a, b) => a.getTime() - b.getTime())[0];
    const created = task.createdAt ? new Date(task.createdAt) : firstCompletion ?? today;
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const createdStart = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    const ageDays = Math.max(0, Math.floor((todayStart.getTime() - createdStart.getTime()) / 86400000));
    const cycleDay = (ageDays % 21) + 1;
    const cycleStart = new Date(createdStart);
    cycleStart.setDate(cycleStart.getDate() + Math.floor(ageDays / 21) * 21);
    const taskDays = Array.from({ length: 21 }, (_, index) => {
      const date = new Date(cycleStart);
      date.setDate(cycleStart.getDate() + index);
      return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, label: `${date.getMonth() + 1}/${date.getDate()}` };
    });
    const activeDays = taskDays.slice(0, cycleDay).filter((day) => completedDays.has(day.key)).length;
    const totalCompletedDays = completedDays.size;
    let streak = 0;
    for (let index = cycleDay - 1; index >= 0 && completedDays.has(taskDays[index]!.key); index -= 1) streak += 1;
    const color = palette[taskIndex % palette.length]!;
    return <View key={task.id} style={[styles.routineTaskRow, designMode === 'dark' && styles.routineTaskRowDark]}><View style={styles.routineTaskHeader}><Text numberOfLines={1} style={[styles.routineTaskTitle, designMode === 'dark' && styles.darkMetricText]}>{task.title}</Text><View style={styles.routineTaskActions}><Text style={[styles.routineTaskRate, { color }]}>{Math.round((activeDays / cycleDay) * 100)}%</Text><Pressable accessibilityLabel={`${task.title}をルーティンから外す`} hitSlop={8} onPress={() => onRemoveRoutine(task.id)} style={styles.routineRemoveButton}><Text style={styles.routineRemoveText}>×</Text></Pressable></View></View><View style={styles.routineDots}>{taskDays.map((day, index) => { const active = index < cycleDay && completedDays.has(day.key); return <View key={day.key} style={styles.routineDay}><View style={[styles.routineDot, active && { backgroundColor: color, borderColor: color }]}><Text style={[styles.routineDotText, !active && styles.routineDotTextInactive]}>{active ? '✓' : ''}</Text></View><Text style={[styles.routineDayLabel, designMode === 'dark' && styles.darkMetricText]}>{day.label}</Text></View>; })}</View><Text style={[styles.routineStreak, designMode === 'dark' && styles.routineStreakDark]}>今のサイクル {activeDays} / {cycleDay}日 ・ 連続 {streak}日 ・ 累計 {totalCompletedDays}日</Text></View>;
  })}</View></View>;
}

export function AnalysisScreen({
  events,
  tasks,
  onRemoveRoutine,
  designMode,
  planTier,
  recordContent,
  onPremium,
}: {
  events: BehaviorEvent[];
  tasks: Task[];
  onRemoveRoutine: (taskId: string) => void;
  designMode: DesignMode;
  planTier: PlanTier;
  recordContent: ReactNode;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
}) {
  const [tab, setTab] = useState<AnalysisTab>('records');
  const preparation = useMemo(() => analyzePreparationStartDelay(events), [events]);
  const departure = useMemo(() => analyzeDepartureDelay(events), [events]);
  const notification = useMemo(() => analyzeNotificationResponse(events), [events]);
  const focus = useMemo(() => analyzeFocusDuration(events), [events]);
  const snooze = useMemo(() => analyzeSnoozeBehavior(events), [events]);
  const departureActivity = useMemo(() => {
    const preparationEvents = events.filter((item) => item.type === 'departure_preparation_started');
    const departureEvents = events.filter((item) => item.type === 'departure_started');
    const latest = [...preparationEvents, ...departureEvents].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];
    return { preparationCount: preparationEvents.length, departureCount: departureEvents.length, latest };
  }, [events]);
  const premium = hasPremiumAccess(planTier, 'time_analysis');
  const theme = getThemeTokens(designMode);

  return (
    <>
      <View style={styles.tabs}>
        {([
          ['records', '記録'],
          ['insights', '時間と行動'],
          ['routine', 'ルーティン'],
        ] as [AnalysisTab, string][]).map(([id, label]) => (
          <Pressable key={id} style={[styles.tab, tab === id && { backgroundColor: designMode === 'dark' ? '#26365F' : theme.colors.primaryAccent, borderColor: designMode === 'dark' ? '#6F8DFF' : theme.colors.primaryAccent }]} onPress={() => setTab(id)}>
            <Text style={[styles.tabText, tab === id && styles.tabTextActive, tab === id && designMode === 'dark' && styles.tabTextActiveDark]}>{label}{id === 'insights' && planTier === 'free' ? ' 🔒' : ''}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'records' ? (
        <>
          <View style={[styles.activityCard, designMode === 'dark' && styles.activityCardDark, { borderColor: theme.colors.border }]}> 
            <Text style={[styles.activityTitle, designMode === 'dark' && styles.darkMetricText]}>出発・準備の実績</Text>
            <View style={styles.activityRow}>
              <View style={styles.activityMetric}>
                <Text style={[styles.activityValue, { color: designMode === 'dark' ? '#8EA6FF' : theme.colors.primaryAccent }]}>{departureActivity.preparationCount}</Text>
                <Text style={[styles.activityLabel, designMode === 'dark' && styles.activityLabelDark]}>準備開始</Text>
              </View>
              <View style={styles.activityMetric}>
                <Text style={[styles.activityValue, { color: designMode === 'dark' ? '#8EA6FF' : theme.colors.primaryAccent }]}>{departureActivity.departureCount}</Text>
                <Text style={[styles.activityLabel, designMode === 'dark' && styles.activityLabelDark]}>出発</Text>
              </View>
              <View style={styles.activityLatest}>
                <Text style={[styles.activityLatestLabel, designMode === 'dark' && styles.activityLatestLabelDark]}>最新の記録</Text>
                <Text style={[styles.activityLatestValue, designMode === 'dark' && styles.darkMetricText]}>
                  {departureActivity.latest ? departureActivity.latest.type === 'departure_started' ? '出発しました' : '準備を始めました' : 'まだ記録はありません'}
                </Text>
              </View>
            </View>
          </View>
          {recordContent}
        </>
      ) : tab === 'insights' && !premium ? (
        <PremiumGate onPremium={() => onPremium('time')} />
      ) : tab === 'insights' ? (
        <>
          <Text style={[styles.sectionTitle, designMode === 'dark' && styles.darkPanelText]}>時間のズレ</Text>
          <Text style={[styles.sectionCopy, designMode === 'dark' && styles.darkPanelText]}>準備や出発のズレを見やすく表示します</Text>
          <View style={styles.grid}>
            <MetricCard title="準備開始" value={preparation.averageMinutes === undefined ? undefined : `${Math.abs(preparation.averageMinutes)}分${preparation.averageMinutes > 2 ? '遅め' : preparation.averageMinutes < -2 ? '早め' : 'ほぼ同じ'}`} result={preparation} designMode={designMode} />
            <MetricCard title="出発" value={departure.averageMinutes === undefined ? undefined : `${Math.abs(departure.averageMinutes)}分${departure.averageMinutes > 2 ? '遅め' : departure.averageMinutes < -2 ? '早め' : 'ほぼ同じ'}`} result={departure} designMode={designMode} />
            <MetricCard title="通知反応" value={notification.averageMinutes === undefined ? undefined : `平均 ${Math.max(0, notification.averageMinutes)}分`} result={notification} designMode={designMode} />
            <MetricCard title="集中" value={focus.averageMinutes === undefined ? undefined : `平均 ${focus.averageMinutes}分`} result={focus} designMode={designMode} />
          </View>
          <Text style={[styles.sectionTitle, { marginTop: 22 }, designMode === 'dark' && styles.darkPanelText]}>最近の行動</Text>
          <View style={styles.behaviorList}>
            <MetricCard title="動き始め" result={notification} designMode={designMode} />
            <MetricCard title="出発" value={departure.sampleCount ? `${departure.sampleCount}件中${departure.lateCount}件が遅め` : undefined} result={departure} designMode={designMode} />
            <MetricCard title="集中" result={focus} designMode={designMode} />
            <MetricCard title="通知の反応" value={snooze.summary} result={snooze} designMode={designMode} />
          </View>
        </>
      ) : tab === 'routine' ? (
        <RoutineProgressPanel events={events} tasks={tasks} designMode={designMode} onRemoveRoutine={onRemoveRoutine} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 18, marginBottom: 14, backgroundColor: '#F4F0FF', borderRadius: 22, position: 'relative', overflow: 'hidden' },
  analysisBowRibbon: { position: 'absolute', right: 6, top: 2, width: 108, height: 86, zIndex: 3 },
  analysisFrameRibbon: { position: 'absolute', left: 6, right: 6, top: 6, bottom: 6, zIndex: 3 },
  heroMinimal: { borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE2EC' },
  heroChic: { backgroundColor: '#FCE9EF', borderWidth: 1, borderColor: '#F2CAD7' },
  kicker: { color: '#80798B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  kickerMinimal: { color: '#4F6FED' },
  title: { color: '#292530', fontSize: 28, fontWeight: '900', marginTop: 5 },
  titleMinimal: { color: '#182235' },
  heroCopy: { color: '#6F6878', fontSize: 12, marginTop: 7, lineHeight: 19 },
  heroCopyMinimal: { color: '#68748A' },
  tabs: { flexDirection: 'row', gap: 7, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 11, backgroundColor: '#EEEAF0', borderRadius: 12, alignItems: 'center' },
  tabText: { color: '#625D68', fontWeight: '800' },
  tabTextActive: { color: '#FFF' },
  tabTextActiveDark: { color: '#FFFFFF' },
  sectionTitle: { color: '#292530', fontSize: 21, fontWeight: '900' },
  sectionCopy: { color: '#797280', fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 14 },
  darkPanelText: { color: '#F4F7FC', backgroundColor: '#20293A', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  grid: { gap: 10 },
  behaviorList: { gap: 10 },
  routineCard: { padding: 18, borderRadius: 18, borderWidth: 1, borderColor: '#E5DFEC', backgroundColor: '#FFF', },
  routineCardDark: { backgroundColor: '#181F2E', borderColor: '#303B50' },
  routineTaskGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  routineDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 8 },
  routineDay: { alignItems: 'center', gap: 2, width: 20 },
  routineDot: { width: 17, height: 17, borderRadius: 4, borderWidth: 1, borderColor: '#DAD4E2', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF8FC' },
  routineDotActive: { backgroundColor: '#7559E8', borderColor: '#7559E8' },
  routineDotActiveDark: { backgroundColor: '#6F8DFF', borderColor: '#6F8DFF' },
  routineDotText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  routineDayLabel: { color: '#817A88', fontSize: 7, fontWeight: '700' },
  routineTaskRow: { width: '48%', borderWidth: 1, borderColor: '#ECE8F0', borderRadius: 10, padding: 9, backgroundColor: '#FFFFFF' },
  routineTaskRowDark: { backgroundColor: '#20293A', borderColor: '#303B50' },
  routineTaskHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routineTaskActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routineTaskTitle: { color: '#292530', fontSize: 12, fontWeight: '900', flex: 1, marginRight: 5 },
  routineTaskRate: { fontSize: 14, fontWeight: '900' },
  routineRemoveButton: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1EDF4' },
  routineRemoveText: { color: '#7D7386', fontSize: 16, fontWeight: '700', lineHeight: 18 },
  routineStreak: { color: '#817A88', fontSize: 9, fontWeight: '800', marginTop: 7 },
  routineStreakDark: { color: '#B4C0D4' },
  routineDotTextInactive: { color: 'transparent' },
  routineSummary: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#ECE8F0', marginTop: 16, paddingTop: 14 },
  routineSummaryValue: { color: '#292530', fontSize: 20, fontWeight: '900' },
  routineSummaryUnit: { color: '#817A88', fontSize: 11, fontWeight: '700' },
  routineSummaryLabel: { color: '#817A88', fontSize: 9, fontWeight: '700', marginTop: 2 },
  activityCard: { padding: 16, marginBottom: 14, borderRadius: 18, borderWidth: 1, backgroundColor: '#FFF' },
  activityCardDark: { backgroundColor: '#181F2E' },
  activityTitle: { color: '#292530', fontSize: 15, fontWeight: '900', marginBottom: 12 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  activityMetric: { minWidth: 62 },
  activityValue: { fontSize: 25, fontWeight: '900' },
  activityLabel: { color: '#756F7C', fontSize: 11, fontWeight: '800', marginTop: 2 },
  activityLabelDark: { color: '#B4C0D4' },
  activityLatest: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#E5E0E8', paddingLeft: 14 },
  activityLatestLabel: { color: '#938C98', fontSize: 10, fontWeight: '800' },
  activityLatestLabelDark: { color: '#9CA8BC' },
  activityLatestValue: { color: '#3C3741', fontSize: 12, fontWeight: '800', marginTop: 4 },
  metricCard: { padding: 17, borderRadius: 18, borderWidth: 1, backgroundColor: '#FFF' },
  metricMinimal: { borderRadius: 1, borderColor: '#222', borderLeftWidth: 5 },
  metricChic: { backgroundColor: 'rgba(255,255,255,0.84)' },
  metricLabel: { color: '#756F7C', fontSize: 11, fontWeight: '900' },
  metricValue: { fontSize: 25, fontWeight: '900', marginTop: 8 },
  metricSummary: { color: '#5E5864', fontSize: 12, marginTop: 5 },
  darkMetricText: { color: '#F4F7FC' },
  darkSecondaryText: { color: '#B4C0D4' },
  sample: { color: '#938C98', fontSize: 10, fontWeight: '700', marginTop: 9 },
  dataState: { paddingVertical: 8 },
  dataStateDark: { backgroundColor: '#20293A', borderRadius: 10, paddingHorizontal: 10 },
  dataStateTitle: { color: '#3C3741', fontSize: 16, fontWeight: '900' },
  dataStateCopy: { color: '#7D7684', fontSize: 11, lineHeight: 17, marginTop: 4 },
  early: { marginTop: 8, padding: 10, backgroundColor: '#F8F3E8', borderRadius: 10 },
  earlyDark: { backgroundColor: '#20293A' },
  earlyTitle: { color: '#6E5932', fontSize: 14, fontWeight: '900' },
  premiumGate: { alignItems: 'center', backgroundColor: '#25202C', borderRadius: 22, padding: 25 },
  premiumLock: { color: '#F5D78B', fontSize: 28 },
  premiumTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 8 },
  premiumCopy: { color: '#D6CFDA', fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 9 },
  premiumButton: { color: '#25202C', backgroundColor: '#F5D78B', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 14, fontWeight: '900', marginTop: 16 },
});
