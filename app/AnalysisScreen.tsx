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
        <Text style={[styles.sample, dark && styles.darkMutedMetricText]}>記録 {result.sampleCount}回</Text>
      </View>
    );
  }
  if (result.status === 'early') {
    return (
      <View style={[styles.early, dark && styles.earlyDark]}>
        <Text style={[styles.earlyTitle, dark && styles.darkMetricText]}>少しずつ見えてきました</Text>
        <Text style={[styles.dataStateCopy, dark && styles.darkSecondaryText]}>まだ記録が少ないため、参考として表示しています</Text>
        <Text style={[styles.sample, dark && styles.darkMutedMetricText]}>記録 {result.sampleCount}回</Text>
      </View>
    );
  }
  return null;
}

function MetricCard({ title, value, result, designMode }: { title: string; value?: string; result: AnalysisResult; designMode: DesignMode }) {
  const theme = getThemeTokens(designMode);
  const isDark = designMode === 'dark';
  return (
    <View style={[styles.metricCard, designMode !== 'chic' && styles.metricMinimal, designMode === 'chic' && styles.metricChic, { borderColor: theme.colors.border }, isDark && styles.metricCardDark]}>
      <Text style={[styles.metricLabel, isDark && styles.darkSecondaryText]}>{title}</Text>
      {result.status === 'insufficient' || result.status === 'early' ? (
        <DataState result={result} dark={isDark} />
      ) : (
        <>
          <Text style={[styles.metricValue, { color: theme.colors.primaryAccent }, isDark && styles.darkMetricValue]}>{value ?? result.summary}</Text>
          <Text style={[styles.metricSummary, isDark && styles.darkSecondaryText]}>{result.summary}</Text>
          <Text style={[styles.sample, isDark && styles.darkMutedMetricText]}>記録 {result.sampleCount}回</Text>
        </>
      )}
    </View>
  );
}

function PremiumGate({ onPremium, dark = false }: { onPremium: () => void; dark?: boolean }) {
  return (
    <Pressable style={[styles.premiumGate, dark && styles.premiumGateDark]} onPress={onPremium}>
      <Text style={[styles.premiumLock, dark && styles.premiumLockDark]}>🔒</Text>
      <Text style={[styles.premiumTitle, dark && styles.premiumTitleDark]}>Rhythm Premium</Text>
      <Text style={[styles.premiumCopy, dark && styles.premiumCopyDark]}>詳細な分析はPremiumで見られます</Text>
      <Text style={[styles.premiumButton, dark && styles.premiumButtonDark]}>くわしく見る</Text>
    </Pressable>
  );
}

function localDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFromLocalKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? new Date().getFullYear(), (month ?? 1) - 1, day ?? 1);
}

function addLocalDays(key: string, amount: number): string {
  const date = dateFromLocalKey(key);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function dayDistance(startKey: string, endKey: string): number {
  return Math.max(0, Math.round((dateFromLocalKey(endKey).getTime() - dateFromLocalKey(startKey).getTime()) / 86_400_000));
}

function shortDate(key?: string): string {
  if (!key) return '—';
  const date = dateFromLocalKey(key);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

type RoutineResumeSummary = {
  state: 'continuing' | 'interrupted' | 'resumed' | 'before' | 'deactivated';
  latestInterruptionStart?: string;
  latestResumeDate?: string;
  latestResumeFrom?: string;
  latestGapDays?: number;
  currentInterruptionDays: number;
  interruptionsThisMonth: number;
  resumesThisMonth: number;
  longestStreak: number;
  postResumeStreak: number;
};

type RoutineHistory = { id: string; title: string; memberIds: Set<string>; endedAt?: string; active: boolean };

function routineEventDay(event: BehaviorEvent) {
  return event.routineTargetDate ?? localDateKey(event.type === 'task_completion_reverted' && event.taskCompletionDate ? event.taskCompletionDate : event.occurredAt);
}

function isRoutineStateEvent(event: BehaviorEvent) {
  return event.type === 'routine_state_changed' || event.type === 'task_completed' || event.type === 'task_completion_reverted';
}

function routineEventsFor(events: BehaviorEvent[], routine: RoutineHistory) {
  return events.filter((event) => isRoutineStateEvent(event) && (event.routineId === routine.id || (!event.routineId && event.taskId && routine.memberIds.has(event.taskId))));
}

/** An explicitly ended routine never gains blank days after its final recorded day. */
function routineAnalysisEndKey(events: BehaviorEvent[], tasks: Task[], routine: RoutineHistory, today = new Date()) {
  const todayKey = localDateKey(today);
  if (routine.active || !routine.endedAt) return todayKey;
  const endedKey = localDateKey(routine.endedAt);
  const recordedKeys = [
    ...routineEventsFor(events, routine).map(routineEventDay),
    ...tasks.filter((task) => routine.memberIds.has(task.id) && task.done && task.completedAt).map((task) => localDateKey(task.completedAt!)),
  ].filter((key) => key <= endedKey).sort();
  return recordedKeys.at(-1) ?? endedKey;
}

function routineDayCompleted(events: BehaviorEvent[], tasks: Task[], routine: RoutineHistory, dayKey: string): boolean {
  const dayEvents = events
    .filter((event) => isRoutineStateEvent(event) && (event.routineId === routine.id || (!event.routineId && event.taskId && routine.memberIds.has(event.taskId))))
    .filter((event) => routineEventDay(event) === dayKey)
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  let completed = false;
  dayEvents.forEach((event) => {
    if (event.type === 'routine_state_changed') completed = Boolean(event.routineCompleted);
    else if (event.type === 'task_completed') completed = true;
    else if (event.type === 'task_completion_reverted') completed = false;
  });
  const current = tasks
    .filter((task) => routine.memberIds.has(task.id) && task.done && task.completedAt && localDateKey(task.completedAt) === dayKey)
    .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())
    .at(-1);
  if (current && (!dayEvents.at(-1) || new Date(current.completedAt!).getTime() >= new Date(dayEvents.at(-1)!.occurredAt).getTime())) completed = true;
  return completed;
}

function getRoutineResumeSummary(events: BehaviorEvent[], tasks: Task[], routine: RoutineHistory, today = new Date()): RoutineResumeSummary {
  const routineEvents = routineEventsFor(events, routine);
  const relevantDayKeys = [
    ...routineEvents.map((event) => localDateKey(event.type === 'task_completion_reverted' && event.taskCompletionDate ? event.taskCompletionDate : event.occurredAt)),
    ...tasks.filter((task) => routine.memberIds.has(task.id) && task.done && task.completedAt).map((task) => localDateKey(task.completedAt!)),
  ].sort();
  const empty: RoutineResumeSummary = { state: routine.active ? 'before' : 'deactivated', currentInterruptionDays: 0, interruptionsThisMonth: 0, resumesThisMonth: 0, longestStreak: 0, postResumeStreak: 0 };
  const firstCompletionKey = relevantDayKeys.find((key) => routineDayCompleted(routineEvents, tasks, routine, key));
  if (!firstCompletionKey) return empty;

  const todayKey = localDateKey(today);
  const endKey = routineAnalysisEndKey(events, tasks, routine, today);
  const currentMonth = todayKey.slice(0, 7);
  const dayStates: Array<{ key: string; completed: boolean }> = [];
  for (let key = firstCompletionKey; key <= endKey; key = addLocalDays(key, 1)) {
    dayStates.push({ key, completed: routineDayCompleted(routineEvents, tasks, routine, key) });
  }

  let latestInterruptionStart: string | undefined;
  let latestResumeDate: string | undefined;
  let latestResumeFrom: string | undefined;
  let latestGapDays: number | undefined;
  let interruptionsThisMonth = 0;
  let resumesThisMonth = 0;
  let activeInterruptionStart: string | undefined;
  let longestStreak = 0;
  let currentRun = 0;

  dayStates.forEach((day, index) => {
    if (day.completed) {
      currentRun += 1;
      longestStreak = Math.max(longestStreak, currentRun);
      if (index > 0 && !dayStates[index - 1]!.completed && activeInterruptionStart) {
        latestResumeDate = day.key;
        latestResumeFrom = activeInterruptionStart;
        latestGapDays = dayDistance(activeInterruptionStart, day.key);
        if (day.key.startsWith(currentMonth)) resumesThisMonth += 1;
        activeInterruptionStart = undefined;
      }
      return;
    }

    currentRun = 0;
    if (index > 0 && dayStates[index - 1]!.completed) {
      activeInterruptionStart = day.key;
      latestInterruptionStart = day.key;
      if (day.key.startsWith(currentMonth)) interruptionsThisMonth += 1;
    }
  });

  const todayCompleted = dayStates.at(-1)?.completed ?? false;
  const postResumeStreak = todayCompleted
    ? [...dayStates].reverse().findIndex((day) => !day.completed) === -1
      ? dayStates.length
      : [...dayStates].reverse().findIndex((day) => !day.completed)
    : 0;
  const state = !routine.active
    ? 'deactivated'
    : !todayCompleted
    ? 'interrupted'
    : latestResumeDate
      ? 'resumed'
      : 'continuing';
  return {
    state,
    latestInterruptionStart,
    latestResumeDate,
    latestResumeFrom,
    latestGapDays,
    currentInterruptionDays: activeInterruptionStart ? dayDistance(activeInterruptionStart, todayKey) + 1 : 0,
    interruptionsThisMonth,
    resumesThisMonth,
    longestStreak,
    postResumeStreak,
  };
}

function getRoutineHistories(events: BehaviorEvent[], tasks: Task[]): RoutineHistory[] {
  const active = new Map<string, RoutineHistory>();
  tasks.filter((task) => task.isRoutine).forEach((task) => {
    const id = task.routineId ?? task.id;
    const current = active.get(id) ?? { id, title: task.title, memberIds: new Set<string>(), active: true };
    current.memberIds.add(task.id);
    current.title = task.title || current.title;
    active.set(id, current);
  });
  const histories = new Map<string, RoutineHistory>(active);
  events.filter((event) => event.routineId).sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()).forEach((event) => {
    const id = event.routineId!;
    const current = histories.get(id) ?? { id, title: event.routineTitleSnapshot ?? event.taskTitleSnapshot ?? 'ルーティン', memberIds: new Set<string>(), active: false };
    if (event.taskId) current.memberIds.add(event.taskId);
    current.title = event.routineTitleSnapshot ?? current.title;
    if (event.type === 'routine_deactivated') {
      current.active = false;
      current.endedAt = event.occurredAt;
    } else if (event.type === 'routine_state_changed' && current.endedAt && new Date(event.occurredAt).getTime() > new Date(current.endedAt).getTime()) {
      current.active = true;
      current.endedAt = undefined;
    }
    histories.set(id, current);
  });
  tasks.filter((task) => task.routineId && task.routineEndedAt).forEach((task) => {
    const id = task.routineId!;
    const current = histories.get(id) ?? { id, title: task.title, memberIds: new Set<string>(), active: false };
    current.memberIds.add(task.id);
    current.title = task.title || current.title;
    current.active = false;
    current.endedAt = task.routineEndedAt;
    histories.set(id, current);
  });
  // 現在のタスクが再び有効なルーティンなら、過去の解除イベントより現在の状態を優先する。
  // これにより同じ routineId を再開した場合も、履歴を分断せず継続中として扱える。
  tasks.filter((task) => task.isRoutine).forEach((task) => {
    const id = task.routineId ?? task.id;
    const current = histories.get(id);
    if (!current) return;
    current.active = true;
    current.endedAt = undefined;
  });
  return [...histories.values()];
}

function RoutineResumePanel({ events, tasks, designMode }: { events: BehaviorEvent[]; tasks: Task[]; designMode: DesignMode }) {
  const routines = getRoutineHistories(events, tasks);
  const isDark = designMode === 'dark';
  if (routines.length === 0) return null;
  return <>
    <Text style={[styles.sectionTitle, { marginTop: 22 }, isDark && styles.darkMetricText]}>ルーティンの中断・再開</Text>
    <Text style={[styles.sectionCopy, isDark && styles.darkSecondaryText]}>お休みの期間も、戻れた日を大切に記録します。</Text>
    <View style={styles.routineResumeList}>{routines.map((routine) => {
      const summary = getRoutineResumeSummary(events, tasks, routine);
      const stateLabel = summary.state === 'continuing' ? '継続中' : summary.state === 'interrupted' ? '中断中' : summary.state === 'resumed' ? '再開済み' : summary.state === 'deactivated' ? '解除済み' : '開始前';
      const stateCopy = summary.state === 'before'
        ? '最初の1回を記録すると、ここから流れを振り返れます。'
        : summary.state === 'deactivated'
          ? 'ルーティンを外した日までの記録を残しています。'
          : summary.state === 'interrupted'
          ? `現在${summary.currentInterruptionDays}日間お休み中です。戻るタイミングはいつでも大丈夫。`
          : summary.state === 'resumed' && summary.latestResumeDate && summary.latestResumeFrom
            ? `${shortDate(summary.latestResumeFrom)}に中断し、${shortDate(summary.latestResumeDate)}に再開しました。`
            : '今の流れを、そのまま続けられています。';
      const resumeCopy = summary.latestResumeDate && summary.latestGapDays !== undefined
        ? `${summary.latestGapDays}日ぶりに再開できています。`
        : '戻れた日が増えるほど、あなたのペースが見えてきます。';
      return <View key={routine.id} style={[styles.routineResumeCard, isDark && styles.routineResumeCardDark]}>
        <View style={styles.routineResumeHeader}><Text numberOfLines={1} style={[styles.routineResumeTitle, isDark && styles.darkMetricText]}>{routine.title}</Text><Text style={[styles.routineResumeState, isDark && styles.routineResumeStateDark]}>{stateLabel}</Text></View>
        <Text style={[styles.routineResumeCopy, isDark && styles.darkSecondaryText]}>{stateCopy}</Text>
        {summary.state !== 'before' && <Text style={[styles.routineResumeCopy, styles.routineResumeSubcopy, isDark && styles.darkMutedMetricText]}>{resumeCopy}</Text>}
        <View style={styles.routineResumeFacts}>
          <View style={[styles.routineResumeFact, isDark && styles.routineResumeFactDark]}><Text style={[styles.routineResumeFactLabel, isDark && styles.darkMutedMetricText]}>直近の中断</Text><Text style={[styles.routineResumeFactValue, isDark && styles.darkMetricText]}>{shortDate(summary.latestInterruptionStart)}</Text></View>
          <View style={[styles.routineResumeFact, isDark && styles.routineResumeFactDark]}><Text style={[styles.routineResumeFactLabel, isDark && styles.darkMutedMetricText]}>直近の再開</Text><Text style={[styles.routineResumeFactValue, isDark && styles.darkMetricText]}>{shortDate(summary.latestResumeDate)}</Text></View>
          <View style={[styles.routineResumeFact, isDark && styles.routineResumeFactDark]}><Text style={[styles.routineResumeFactLabel, isDark && styles.darkMutedMetricText]}>中断日数</Text><Text style={[styles.routineResumeFactValue, isDark && styles.darkMetricText]}>{summary.state === 'interrupted' ? `${summary.currentInterruptionDays}日` : summary.latestGapDays === undefined ? '—' : `${summary.latestGapDays}日`}</Text></View>
        </View>
        <Text style={[styles.routineResumeStats, isDark && styles.darkSecondaryText]}>今月は中断 {summary.interruptionsThisMonth}回 ・ 再開 {summary.resumesThisMonth}回</Text>
        <Text style={[styles.routineResumeStats, isDark && styles.darkSecondaryText]}>最長連続 {summary.longestStreak}日 ・ 再開後の連続 {summary.postResumeStreak}日</Text>
      </View>;
    })}</View>
  </>;
}

function RoutineProgressPanel({ events, tasks, designMode, onRemoveRoutine }: { events: BehaviorEvent[]; tasks: Task[]; designMode: DesignMode; onRemoveRoutine: (taskId: string) => void }) {
  const routineTasks = getRoutineHistories(events, tasks);
  const today = new Date();
  const palette = designMode === 'chic' ? ['#E68BA8', '#E7B56A', '#8EC7B3', '#9FA8E8', '#C39BD3'] : designMode === 'dark' ? ['#8EA6FF', '#AFC2FF', '#7ED6C4', '#C5B4FF', '#F0A8BA'] : ['#171717', '#3A3A3A', '#5C5C5C', '#7A7A7A', '#A0A0A0'];
  if (routineTasks.length === 0) return <View style={[styles.routineCard, designMode === 'dark' && styles.routineCardDark]}><Text style={[styles.sectionTitle, designMode === 'dark' && styles.darkMetricText]}>ルーティンの継続</Text><Text style={[styles.sectionCopy, designMode === 'dark' && styles.darkSecondaryText]}>タスク登録時に「ルーティンにする」を選ぶと、継続率を確認できます。</Text></View>;
  return <View style={[styles.routineCard, designMode === 'dark' && styles.routineCardDark]}><Text style={[styles.sectionTitle, designMode === 'dark' && styles.darkMetricText]}>ルーティンの継続</Text><Text style={[styles.sectionCopy, designMode === 'dark' && styles.darkSecondaryText]}>続けられた日が丸で増えていきます。連続日数と継続率を確認できます。</Text><View style={styles.routineTaskGrid}>{routineTasks.map((routine, taskIndex) => {
    const routineEvents = routineEventsFor(events, routine);
    const firstCompletion = routineEvents.filter((event) => event.type === 'task_completed').map((event) => dateFromLocalKey(routineEventDay(event))).sort((a, b) => a.getTime() - b.getTime())[0];
    const representativeTask = tasks.find((task) => routine.memberIds.has(task.id));
    const created = representativeTask?.createdAt ? new Date(representativeTask.createdAt) : firstCompletion ?? today;
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const createdStart = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    const analysisEnd = new Date(`${routineAnalysisEndKey(events, tasks, routine, today)}T12:00:00`);
    const ageDays = Math.max(0, Math.floor((analysisEnd.getTime() - createdStart.getTime()) / 86400000));
    const cycleDay = (ageDays % 21) + 1;
    const cycleStart = new Date(createdStart);
    cycleStart.setDate(cycleStart.getDate() + Math.floor(ageDays / 21) * 21);
    const taskDays = Array.from({ length: 21 }, (_, index) => {
      const date = new Date(cycleStart);
      date.setDate(cycleStart.getDate() + index);
      return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, label: `${date.getMonth() + 1}/${date.getDate()}` };
    });
    const todayKey = localDateKey(today);
    const completionForDay = (dayKey: string) => {
      return routineDayCompleted(routineEvents, tasks, routine, dayKey);
    };
    const completedDays = new Set(taskDays.filter((day) => day.key <= todayKey && completionForDay(day.key)).map((day) => day.key));
    const activeDays = taskDays.slice(0, cycleDay).filter((day) => completedDays.has(day.key)).length;
    const historicalDays = new Set(routineEvents.map(routineEventDay));
    const totalCompletedDays = [...historicalDays].filter((dayKey) => completionForDay(dayKey)).length;
    let streak = 0;
    for (let index = cycleDay - 1; index >= 0 && completedDays.has(taskDays[index]!.key); index -= 1) streak += 1;
    const color = palette[taskIndex % palette.length]!;
    return <View key={routine.id} style={[styles.routineTaskRow, designMode === 'dark' && styles.routineTaskRowDark]}><View style={styles.routineTaskHeader}><Text numberOfLines={1} style={[styles.routineTaskTitle, designMode === 'dark' && styles.darkMetricText]}>{routine.title}</Text><View style={styles.routineTaskActions}><Text style={[styles.routineTaskRate, { color }]}>{Math.round((activeDays / cycleDay) * 100)}%</Text>{routine.active && representativeTask && <Pressable accessibilityLabel={`${routine.title}をルーティンから外す`} hitSlop={8} onPress={() => onRemoveRoutine(representativeTask.id)} style={[styles.routineRemoveButton, designMode === 'dark' && styles.routineRemoveButtonDark]}><Text style={[styles.routineRemoveText, designMode === 'dark' && styles.routineRemoveTextDark]}>×</Text></Pressable>}</View></View><View style={styles.routineDots}>{taskDays.map((day, index) => { const achieved = index < cycleDay && completedDays.has(day.key); const future = index >= cycleDay; const isToday = day.key === todayKey; return <View key={day.key} style={styles.routineDay}><View style={[styles.routineDot, designMode === 'dark' && styles.routineDotDark, achieved && { backgroundColor: color, borderColor: color }, future && styles.routineDotFuture, isToday && styles.routineDotToday]} /><Text style={[styles.routineDayLabel, designMode === 'dark' && styles.darkMetricText]}>{day.label}</Text></View>; })}</View><Text style={[styles.routineStreak, designMode === 'dark' && styles.routineStreakDark]}>今のサイクル {activeDays} / {cycleDay}日 ・ 連続 {streak}日 ・ 累計 {totalCompletedDays}日</Text></View>;
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
          ['routine', 'ルーティン'],
          ['insights', '時間と行動'],
        ] as [AnalysisTab, string][]).map(([id, label]) => (
          <Pressable key={id} style={[styles.tab, designMode === 'dark' && styles.tabDark, tab === id && (designMode === 'dark' ? styles.tabDarkActive : { backgroundColor: theme.colors.primaryAccent, borderColor: theme.colors.primaryAccent })]} onPress={() => setTab(id)}>
            <Text style={[styles.tabText, designMode === 'dark' && styles.tabTextDark, tab === id && styles.tabTextActive, tab === id && designMode === 'dark' && styles.tabTextActiveDark]}>{label}{id === 'insights' && planTier === 'free' ? ' 🔒' : ''}</Text>
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
              <View style={[styles.activityLatest, designMode === 'dark' && styles.activityLatestDark]}>
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
        <PremiumGate dark={designMode === 'dark'} onPremium={() => onPremium('time')} />
      ) : tab === 'insights' ? (
        <>
          <Text style={[styles.sectionTitle, designMode === 'dark' && styles.darkMetricText]}>時間のズレ</Text>
          <Text style={[styles.sectionCopy, designMode === 'dark' && styles.darkSecondaryText]}>準備や出発のズレを見やすく表示します</Text>
          <View style={styles.grid}>
            <MetricCard title="準備開始" value={preparation.averageMinutes === undefined ? undefined : `${Math.abs(preparation.averageMinutes)}分${preparation.averageMinutes > 2 ? '遅め' : preparation.averageMinutes < -2 ? '早め' : 'ほぼ同じ'}`} result={preparation} designMode={designMode} />
            <MetricCard title="出発" value={departure.averageMinutes === undefined ? undefined : `${Math.abs(departure.averageMinutes)}分${departure.averageMinutes > 2 ? '遅め' : departure.averageMinutes < -2 ? '早め' : 'ほぼ同じ'}`} result={departure} designMode={designMode} />
            <MetricCard title="通知反応" value={notification.averageMinutes === undefined ? undefined : `平均 ${Math.max(0, notification.averageMinutes)}分`} result={notification} designMode={designMode} />
            <MetricCard title="集中" value={focus.averageMinutes === undefined ? undefined : `平均 ${focus.averageMinutes}分`} result={focus} designMode={designMode} />
          </View>
          <Text style={[styles.sectionTitle, { marginTop: 22 }, designMode === 'dark' && styles.darkMetricText]}>最近の行動</Text>
          <View style={styles.behaviorList}>
            <MetricCard title="動き始め" result={notification} designMode={designMode} />
            <MetricCard title="出発" value={departure.sampleCount ? `${departure.sampleCount}件中${departure.lateCount}件が遅め` : undefined} result={departure} designMode={designMode} />
            <MetricCard title="集中" result={focus} designMode={designMode} />
            <MetricCard title="通知の反応" value={snooze.summary} result={snooze} designMode={designMode} />
          </View>
          <RoutineResumePanel events={events} tasks={tasks} designMode={designMode} />
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
  tabDark: { backgroundColor: '#181F2E', borderColor: '#303B50', borderWidth: 1 },
  tabDarkActive: { backgroundColor: '#26365F', borderColor: '#8EA6FF', borderWidth: 1 },
  tabText: { color: '#625D68', fontWeight: '800' },
  tabTextDark: { color: '#B4C0D4' },
  tabTextActive: { color: '#FFF' },
  tabTextActiveDark: { color: '#FFFFFF' },
  sectionTitle: { color: '#292530', fontSize: 21, fontWeight: '900' },
  sectionCopy: { color: '#797280', fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 14 },
  grid: { gap: 10 },
  behaviorList: { gap: 10 },
  routineCard: { padding: 18, borderRadius: 18, borderWidth: 1, borderColor: '#E5DFEC', backgroundColor: '#FFF', },
  routineCardDark: { backgroundColor: '#181F2E', borderColor: '#303B50' },
  routineTaskGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  routineDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 8 },
  routineDay: { alignItems: 'center', gap: 2, width: 20 },
  routineDot: { width: 17, height: 17, borderRadius: 999, borderWidth: 1, borderColor: '#DAD4E2', backgroundColor: 'transparent' },
  routineDotDark: { borderColor: '#65738D' },
  routineDotFuture: { opacity: 0.35 },
  routineDotToday: { borderWidth: 2 },
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
  routineRemoveButtonDark: { backgroundColor: '#303B50' },
  routineRemoveText: { color: '#7D7386', fontSize: 16, fontWeight: '700', lineHeight: 18 },
  routineRemoveTextDark: { color: '#FF8F9C' },
  routineStreak: { color: '#817A88', fontSize: 9, fontWeight: '800', marginTop: 7 },
  routineStreakDark: { color: '#B4C0D4' },
  routineDotTextInactive: { color: 'transparent' },
  routineSummary: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#ECE8F0', marginTop: 16, paddingTop: 14 },
  routineSummaryValue: { color: '#292530', fontSize: 20, fontWeight: '900' },
  routineSummaryUnit: { color: '#817A88', fontSize: 11, fontWeight: '700' },
  routineSummaryLabel: { color: '#817A88', fontSize: 9, fontWeight: '700', marginTop: 2 },
  routineResumeList: { gap: 10 },
  routineResumeCard: { padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#E5DFEC', backgroundColor: '#FFFFFF' },
  routineResumeCardDark: { backgroundColor: '#181F2E', borderColor: '#303B50' },
  routineResumeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  routineResumeTitle: { color: '#292530', fontSize: 14, fontWeight: '900', flex: 1 },
  routineResumeState: { color: '#6F51C8', backgroundColor: '#EEE9FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, fontSize: 10, fontWeight: '900' },
  routineResumeStateDark: { color: '#DDE5FF', backgroundColor: '#26365F' },
  routineResumeCopy: { color: '#5E5864', fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 10 },
  routineResumeSubcopy: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  routineResumeFacts: { flexDirection: 'row', gap: 7, marginTop: 13 },
  routineResumeFact: { flex: 1, minWidth: 0, borderRadius: 10, backgroundColor: '#F7F4F8', padding: 8 },
  routineResumeFactDark: { backgroundColor: '#20293A', borderWidth: 1, borderColor: '#303B50' },
  routineResumeFactLabel: { color: '#817A88', fontSize: 9, fontWeight: '800' },
  routineResumeFactValue: { color: '#38323F', fontSize: 12, fontWeight: '900', marginTop: 4 },
  routineResumeStats: { color: '#756F7C', fontSize: 10, fontWeight: '800', marginTop: 8 },
  activityCard: { padding: 16, marginBottom: 14, borderRadius: 18, borderWidth: 1, backgroundColor: '#FFF' },
  activityCardDark: { backgroundColor: '#181F2E' },
  activityTitle: { color: '#292530', fontSize: 15, fontWeight: '900', marginBottom: 12 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  activityMetric: { minWidth: 62 },
  activityValue: { fontSize: 25, fontWeight: '900' },
  activityLabel: { color: '#756F7C', fontSize: 11, fontWeight: '800', marginTop: 2 },
  activityLabelDark: { color: '#B4C0D4' },
  activityLatest: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#E5E0E8', paddingLeft: 14 },
  activityLatestDark: { borderLeftColor: '#303B50' },
  activityLatestLabel: { color: '#938C98', fontSize: 10, fontWeight: '800' },
  activityLatestLabelDark: { color: '#B4C0D4' },
  activityLatestValue: { color: '#3C3741', fontSize: 12, fontWeight: '800', marginTop: 4 },
  metricCard: { padding: 17, borderRadius: 18, borderWidth: 1, backgroundColor: '#FFF' },
  metricMinimal: { borderRadius: 1, borderColor: '#222', borderLeftWidth: 5 },
  metricCardDark: { backgroundColor: '#181F2E', borderColor: '#303B50', borderLeftColor: '#8EA6FF' },
  metricChic: { backgroundColor: 'rgba(255,255,255,0.84)' },
  metricLabel: { color: '#756F7C', fontSize: 11, fontWeight: '900' },
  metricValue: { fontSize: 25, fontWeight: '900', marginTop: 8 },
  metricSummary: { color: '#5E5864', fontSize: 12, marginTop: 5 },
  darkMetricText: { color: '#F4F7FC' },
  darkSecondaryText: { color: '#B4C0D4' },
  darkMutedMetricText: { color: '#8F9BB0' },
  darkMetricValue: { color: '#F4F7FC' },
  sample: { color: '#938C98', fontSize: 10, fontWeight: '700', marginTop: 9 },
  dataState: { paddingVertical: 8 },
  dataStateDark: { backgroundColor: '#20293A', borderColor: '#303B50', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10 },
  dataStateTitle: { color: '#3C3741', fontSize: 16, fontWeight: '900' },
  dataStateCopy: { color: '#7D7684', fontSize: 11, lineHeight: 17, marginTop: 4 },
  early: { marginTop: 8, padding: 10, backgroundColor: '#F8F3E8', borderRadius: 10 },
  earlyDark: { backgroundColor: '#20293A', borderColor: '#303B50', borderWidth: 1 },
  earlyTitle: { color: '#6E5932', fontSize: 14, fontWeight: '900' },
  premiumGate: { alignItems: 'center', backgroundColor: '#25202C', borderRadius: 22, padding: 25 },
  premiumGateDark: { backgroundColor: '#181F2E', borderWidth: 1, borderColor: '#40506A' },
  premiumLock: { color: '#F5D78B', fontSize: 28 },
  premiumLockDark: { color: '#8EA6FF' },
  premiumTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 8 },
  premiumTitleDark: { color: '#F4F7FC' },
  premiumCopy: { color: '#D6CFDA', fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 9 },
  premiumCopyDark: { color: '#B4C0D4' },
  premiumButton: { color: '#25202C', backgroundColor: '#F5D78B', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 14, fontWeight: '900', marginTop: 16 },
  premiumButtonDark: { color: '#F4F7FC', backgroundColor: '#26365F' },
});
