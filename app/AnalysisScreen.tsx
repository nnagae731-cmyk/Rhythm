import React, { ReactNode, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { BehaviorEvent } from './behaviorEvents';
import { buildInsightDashboard, formatComparison, formatMetricAverage, formatPointValue, InsightCondition, InsightConditionView, InsightMetric, InsightRange, InsightRate, InsightSuggestion, insightPointDateLabel } from './features/analytics/insightDashboard';
import { buildRoutineInterruptionSummary, formatRoutineDate, getRoutineHistories as getRoutineHistoryList, RoutineInterruptionSummary } from './features/analytics/routineInterruptionAnalysis';
import { hasPremiumAccess, PlanTier } from './premiumAccess';
import { PremiumGuideFeatureId } from './premiumGuide';
import { ChicCheckColor, ChicPattern, ChicThemePalette, DesignMode, getDesignCheckThemeTokens, getPremiumFeatureCardTheme, getThemeTokens } from './theme';
import { DeparturePlan, Task } from './types';

type AnalysisTab = 'records' | 'insights' | 'routine';

function PremiumGate({ onPremium, dark = false, chicPalette, chicPattern = 'plain', PatternDecor }: { onPremium: () => void; dark?: boolean; chicPalette?: ChicThemePalette; chicPattern?: ChicPattern; PatternDecor?: (props: { pattern: ChicPattern; accent: string; warm: string; checkColor?: ChicCheckColor }) => ReactNode }) {
  const mode: DesignMode = chicPalette ? 'chic' : dark ? 'dark' : 'minimal';
  const cardTheme = getPremiumFeatureCardTheme(mode, chicPalette, chicPattern);
  return (
    <Pressable style={[styles.premiumGate, { backgroundColor: cardTheme.surface, borderColor: cardTheme.border }]} onPress={onPremium}>
      {cardTheme.showPatternDecor && PatternDecor && <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><PatternDecor pattern={chicPattern} accent={cardTheme.accent} warm={chicPalette?.accentSoft ?? cardTheme.border} checkColor={chicPalette && ['monochrome', 'cool', 'warm', 'green'].includes(chicPalette.id) ? chicPalette.id as ChicCheckColor : undefined} /></View>}
      <Text style={[styles.premiumLock, { color: cardTheme.accent }]}>🔒</Text>
      <Text style={[styles.premiumTitle, { color: cardTheme.text }]}>Premium限定</Text>
      <Text style={[styles.premiumCopy, { color: cardTheme.mutedText }]}>詳細な分析はPremiumで利用できます</Text>
      <Text style={[styles.premiumButton, { color: cardTheme.text, backgroundColor: cardTheme.accent }]}>Premiumで利用できます</Text>
    </Pressable>
  );
}

function RoutineHistoryModal({ summary, title, designMode, chicPalette, onClose }: { summary?: RoutineInterruptionSummary; title?: string; designMode: DesignMode; chicPalette?: ChicThemePalette; onClose: () => void }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  if (!summary) return null;
  return <Modal transparent animationType="slide" visible onRequestClose={onClose}>
    <View style={styles.routineHistoryBackdrop}>
      <View style={[styles.routineHistorySheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, isDark && styles.routineHistorySheetDark]}>
        <View style={styles.routineHistoryHeader}><View style={styles.routineHistoryHeading}><Text style={[styles.routineHistoryTitle, { color: theme.colors.primaryText }]}>{title}</Text><Text style={[styles.routineHistorySubtitle, { color: theme.colors.secondaryText }]}>中断・再開の履歴</Text></View><Pressable onPress={onClose} accessibilityLabel="履歴を閉じる" style={[styles.routineHistoryClose, { borderColor: theme.colors.border }]}><Text style={[styles.routineHistoryCloseText, { color: theme.colors.primaryText }]}>閉じる</Text></Pressable></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.routineHistoryList}>
          {summary.history.map((record) => <View key={`${record.interruptionStart}:${record.resumedAt ?? 'current'}`} style={[styles.routineHistoryItem, { backgroundColor: isDark ? '#20293A' : theme.colors.secondarySurface, borderColor: theme.colors.border }]}>
            <Text style={[styles.routineHistoryDate, { color: theme.colors.primaryText }]}>{formatRoutineDate(record.interruptionStart)}〜{formatRoutineDate(record.interruptionEnd)}</Text>
            {record.resumedAt ? <><Text style={[styles.routineHistoryCopy, { color: theme.colors.secondaryText }]}>{record.offDays}日お休みして、{formatRoutineDate(record.resumedAt)}に再開</Text><Text style={[styles.routineHistoryMeta, { color: theme.colors.secondaryText }]}>再開後 {record.postResumeStreak}日継続</Text></> : <Text style={[styles.routineHistoryCopy, { color: theme.colors.secondaryText }]}>現在 {record.offDays}日お休み中です。今日からまた始められます</Text>}
          </View>)}
          {summary.deactivatedAt && <View style={[styles.routineHistoryItem, { backgroundColor: isDark ? '#20293A' : theme.colors.secondarySurface, borderColor: theme.colors.border }]}><Text style={[styles.routineHistoryDate, { color: theme.colors.primaryText }]}>{formatRoutineDate(summary.deactivatedAt)}</Text><Text style={[styles.routineHistoryCopy, { color: theme.colors.secondaryText }]}>この日にルーティンを解除しました</Text></View>}
          {!summary.history.length && <Text style={[styles.routineHistoryEmpty, { color: theme.colors.secondaryText }]}>まだ中断・再開の記録はありません</Text>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function RoutineProgressPanel({ events, tasks, designMode, chicPalette, onRemoveRoutine }: { events: BehaviorEvent[]; tasks: Task[]; designMode: DesignMode; chicPalette?: ChicThemePalette; onRemoveRoutine: (taskId: string) => void }) {
  const routineTasks = useMemo(() => getRoutineHistoryList(events, tasks), [events, tasks]);
  const [historyTarget, setHistoryTarget] = useState<{ title: string; summary: RoutineInterruptionSummary }>();
  const resolvedChicPalette = chicPalette ?? getDesignCheckThemeTokens('cool');
  const palette = designMode === 'chic' ? [resolvedChicPalette.accent, resolvedChicPalette.statusAccent, resolvedChicPalette.patternStripe, resolvedChicPalette.accentSoft, resolvedChicPalette.border] : designMode === 'dark' ? ['#8EA6FF', '#AFC2FF', '#7ED6C4', '#C5B4FF', '#8EA6FF'] : ['#171717', '#3A3A3A', '#5C5C5C', '#7A7A7A', '#A0A0A0'];
  const isDark = designMode === 'dark';
  if (routineTasks.length === 0) return <View style={[styles.routineCard, isDark && styles.routineCardDark, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}><Text style={[styles.sectionTitle, isDark && styles.darkMetricText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>ルーティンの継続</Text><Text style={[styles.sectionCopy, isDark && styles.darkSecondaryText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>タスク登録時に「ルーティンにする」を選ぶと、継続率を確認できます。</Text></View>;
  return <>
    <View style={[styles.routineCard, isDark && styles.routineCardDark, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
      <Text style={[styles.sectionTitle, isDark && styles.darkMetricText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>ルーティンの継続</Text>
      <Text style={[styles.sectionCopy, isDark && styles.darkSecondaryText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>続けられた日が丸で増えていきます。連続日数と継続率を確認できます。</Text>
      <View style={styles.routineTaskGrid}>{routineTasks.map((routine, taskIndex) => {
        const summary = buildRoutineInterruptionSummary(events, tasks, routine);
        const representativeTask = tasks.find((task) => routine.memberIds.has(task.id) && task.isRoutine);
        const color = palette[taskIndex % palette.length]!;
        const latest = summary.latestRecord;
        const latestCopy = latest ? latest.resumedAt
          ? `${formatRoutineDate(latest.interruptionStart)}に中断・${formatRoutineDate(latest.resumedAt)}に再開`
          : `${formatRoutineDate(latest.interruptionStart)}からお休み中`
          : '中断・再開の記録はまだありません';
        const statusColor = summary.status === 'interrupted' ? (designMode === 'chic' && chicPalette ? chicPalette.statusAccent : isDark ? '#F4C983' : '#B16C76') : summary.status === 'deactivated' ? (designMode === 'chic' && chicPalette ? chicPalette.textMuted : isDark ? '#8F9BB0' : '#777772') : summary.status === 'waiting' ? (designMode === 'chic' && chicPalette ? chicPalette.textSecondary : isDark ? '#B4C0D4' : '#68636D') : color;
        return <View key={routine.id} style={[styles.routineTaskRow, isDark && styles.routineTaskRowDark, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.taskBackground, borderColor: chicPalette.border }]}>
          <View style={styles.routineTaskHeader}>
            <Text numberOfLines={1} style={[styles.routineTaskTitle, isDark && styles.darkMetricText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{routine.title}</Text>
            <View style={styles.routineTaskActions}><Text style={[styles.routineTaskRate, { color }]}>{summary.completionRate}%</Text>{routine.active && representativeTask && <Pressable accessibilityLabel={`${routine.title}をルーティンから外す`} hitSlop={8} onPress={() => onRemoveRoutine(representativeTask.id)} style={[styles.routineRemoveButton, isDark && styles.routineRemoveButtonDark]}><Text style={[styles.routineRemoveText, isDark && styles.routineRemoveTextDark]}>×</Text></Pressable>}</View>
          </View>
          <Text style={[styles.routineRateCaption, isDark && styles.darkSecondaryText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>継続率　{summary.completedCycleDays} / {summary.cycleDays}日</Text>
          <View style={styles.routineDots}>{summary.displayDays.map((day) => <View key={day.key} style={styles.routineDay}><View style={[styles.routineDot, isDark && styles.routineDotDark, day.completed && { backgroundColor: color, borderColor: color }, day.future && styles.routineDotFuture, day.today && styles.routineDotToday]} /><Text style={[styles.routineDayLabel, isDark && styles.darkMetricText, designMode === 'chic' && chicPalette && { color: chicPalette.textMuted }]}>{day.label}</Text></View>)}</View>
          <Text style={[styles.routineStreak, isDark && styles.routineStreakDark, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>連続 {summary.currentStreak}日 ・ 累計 {summary.totalCompletedDays}日</Text>
          <View style={[styles.routineStatusRow, isDark && styles.routineStatusRowDark, designMode === 'chic' && chicPalette && { borderTopColor: chicPalette.border }]}><Text style={[styles.routineStatusLabel, { color: statusColor }]}>{summary.statusLabel}</Text><Text style={[styles.routineStatusCopy, isDark && styles.darkSecondaryText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{summary.statusCopy}</Text></View>
          {summary.status !== 'before' && <Text style={[styles.routineLatest, isDark && styles.darkMutedMetricText, designMode === 'chic' && chicPalette && { color: chicPalette.textMuted }]}>{latestCopy}</Text>}
          <Text style={[styles.routineResumeCount, isDark && styles.darkSecondaryText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>今月：中断 {summary.interruptionsThisMonth}回・再開 {summary.resumesThisMonth}回</Text>
          {summary.history.length > 1 && <Pressable onPress={() => setHistoryTarget({ title: routine.title, summary })} style={styles.routineHistoryLink}><Text style={[styles.routineHistoryLinkText, { color }]}>中断・再開の履歴を見る 〉</Text></Pressable>}
        </View>;
      })}</View>
    </View>
    <RoutineHistoryModal summary={historyTarget?.summary} title={historyTarget?.title} designMode={designMode} chicPalette={chicPalette} onClose={() => setHistoryTarget(undefined)} />
  </>;
}

function DashboardCard({ children, designMode, chicPalette, style }: { children: ReactNode; designMode: DesignMode; chicPalette?: ChicThemePalette; style?: any }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  return <View style={[styles.dashboardCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, designMode === 'dark' && styles.dashboardCardDark, style]}>{children}</View>;
}

function TrendStatus({ status, designMode, chicPalette }: { status: 'improved' | 'maintain' | 'attention' | 'insufficient'; designMode: DesignMode; chicPalette?: ChicThemePalette }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const label = status === 'improved' ? '改善' : status === 'attention' ? '要確認' : status === 'maintain' ? '維持' : '記録中';
  const color = status === 'improved' ? theme.colors.success : status === 'attention' ? theme.colors.danger : theme.colors.primaryAccent;
  return <View style={[styles.trendStatus, { backgroundColor: designMode === 'dark' ? theme.colors.softAccent : `${color}18` }]}><Text style={[styles.trendStatusText, { color }]}>{label}</Text></View>;
}

function ProgressRing({ rate, designMode, chicPalette }: { rate: InsightRate; designMode: DesignMode; chicPalette?: ChicThemePalette }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const radius = 29;
  const circumference = 2 * Math.PI * radius;
  const dash = rate.percent === undefined ? 0 : circumference * rate.percent / 100;
  const isDark = designMode === 'dark';
  return <View style={styles.rateItem}>
    <View style={styles.ringWrap}>
      <Svg width={72} height={72} viewBox="0 0 72 72">
        <Circle cx="36" cy="36" r={radius} stroke={isDark ? '#303B50' : theme.colors.secondarySurface} strokeWidth="7" fill="none" />
        {rate.percent !== undefined && <Circle cx="36" cy="36" r={radius} stroke={theme.colors.primaryAccent} strokeWidth="7" strokeLinecap="round" fill="none" strokeDasharray={`${dash} ${circumference}`} rotation="-90" origin="36,36" />}
      </Svg>
      <Text style={[styles.ringValue, { color: theme.colors.primaryText }]}>{rate.percent === undefined ? '—' : `${rate.percent}%`}</Text>
    </View>
    <Text style={[styles.rateLabel, { color: theme.colors.primaryText }]}>{rate.label}</Text>
    <Text style={[styles.rateDetail, { color: theme.colors.secondaryText }]}>{rate.percent === undefined ? '記録なし' : `${rate.numerator} / ${rate.denominator}`}</Text>
  </View>;
}

function LineChart({ points, metric, selectedDate, onSelect, designMode, chicPalette }: { points: { date: string; value: number; sampleCount: number }[]; metric: InsightMetric; selectedDate?: string; onSelect: (date: string) => void; designMode: DesignMode; chicPalette?: ChicThemePalette }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const width = 320;
  const height = 148;
  const padding = { top: 14, right: 12, bottom: 22, left: 30 };
  const baseline = metric === 'preparation' || metric === 'departure' ? 0 : undefined;
  const values = [...points.map((point) => point.value), ...(baseline === undefined ? [] : [baseline])];
  if (!points.length) return <View style={[styles.chartEmpty, { backgroundColor: theme.colors.secondarySurface, borderColor: theme.colors.border }]}><Text style={[styles.chartEmptyText, { color: theme.colors.secondaryText }]}>この期間の{metric === 'preparation' ? '準備' : metric === 'departure' ? '出発' : metric === 'notification' ? '通知への反応' : '集中'}記録はまだありません</Text></View>;
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const range = Math.max(2, rawMax - rawMin);
  const min = rawMin - range * 0.16;
  const max = rawMax + range * 0.16;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xFor = (index: number) => points.length === 1 ? padding.left + plotWidth / 2 : padding.left + index / (points.length - 1) * plotWidth;
  const yFor = (value: number) => padding.top + (max - value) / (max - min) * plotHeight;
  const dateGap = (left: string, right: string) => Math.round((new Date(`${right}T12:00:00`).getTime() - new Date(`${left}T12:00:00`).getTime()) / 86_400_000);
  const path = points.map((point, index) => `${index === 0 || dateGap(points[index - 1]!.date, point.date) > 1 ? 'M' : 'L'}${xFor(index)},${yFor(point.value)}`).join(' ');
  const selected = points.find((point) => point.date === selectedDate) ?? points.at(-1)!;
  return <>
    <View style={[styles.chartArea, { backgroundColor: designMode === 'dark' ? '#20293A' : theme.colors.secondarySurface, borderColor: theme.colors.border }]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0.2, 0.5, 0.8].map((ratio) => <Line key={ratio} x1={padding.left} x2={width - padding.right} y1={padding.top + plotHeight * ratio} y2={padding.top + plotHeight * ratio} stroke={designMode === 'dark' ? '#303B50' : theme.colors.border} strokeWidth="1" />)}
        {baseline !== undefined && <Line x1={padding.left} x2={width - padding.right} y1={yFor(baseline)} y2={yFor(baseline)} stroke={theme.colors.primaryAccent} strokeWidth="1" strokeDasharray="4 4" opacity={0.85} />}
        <Path d={path} fill="none" stroke={theme.colors.primaryAccent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => <Circle key={point.date} cx={xFor(index)} cy={yFor(point.value)} r={point.date === selected.date ? 5.5 : 3.8} fill={point.date === selected.date ? theme.colors.surface : theme.colors.primaryAccent} stroke={theme.colors.primaryAccent} strokeWidth={point.date === selected.date ? 3 : 1} onPress={() => onSelect(point.date)} />)}
        <SvgText x="2" y={padding.top + 4} fill={theme.colors.secondaryText} fontSize="9">{Math.round(max)}</SvgText>
        {baseline !== undefined && <SvgText x="7" y={yFor(baseline) - 4} fill={theme.colors.secondaryText} fontSize="9">0</SvgText>}
        <SvgText x="2" y={height - padding.bottom + 1} fill={theme.colors.secondaryText} fontSize="9">{Math.round(min)}</SvgText>
      </Svg>
      <View style={styles.chartDates}><Text style={[styles.chartDate, { color: theme.colors.secondaryText }]}>{insightPointDateLabel(points[0]!.date)}</Text><Text style={[styles.chartDate, { color: theme.colors.secondaryText }]}>{insightPointDateLabel(points.at(-1)!.date)}</Text></View>
    </View>
    <View style={[styles.selectedPoint, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}><Text style={[styles.selectedPointLabel, { color: theme.colors.secondaryText }]}>選択した日</Text><Text style={[styles.selectedPointValue, { color: theme.colors.primaryText }]}>{insightPointDateLabel(selected.date)}　{formatPointValue(metric, selected.value)}</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pointSelector}>
      {points.map((point) => <Pressable key={point.date} onPress={() => onSelect(point.date)} style={[styles.pointChip, { borderColor: theme.colors.border, backgroundColor: theme.colors.secondarySurface }, point.date === selected.date && { backgroundColor: theme.colors.primaryAccent, borderColor: theme.colors.primaryAccent }]}><Text style={[styles.pointChipText, { color: theme.colors.secondaryText }, point.date === selected.date && styles.pointChipTextActive]}>{insightPointDateLabel(point.date)}</Text></Pressable>)}
    </ScrollView>
  </>;
}

function ConditionChart({ data, designMode, chicPalette }: { data: InsightCondition[]; designMode: DesignMode; chicPalette?: ChicThemePalette }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  return <View style={styles.conditionChart}>{data.map((item) => {
    const fill = item.onTimePercent === undefined ? 0 : item.onTimePercent;
    return <View key={item.id} style={styles.conditionItem}>
      <View style={[styles.conditionRail, { backgroundColor: designMode === 'dark' ? '#20293A' : theme.colors.secondarySurface, borderColor: theme.colors.border }]}><View style={[styles.conditionFill, { height: `${fill}%`, backgroundColor: theme.colors.primaryAccent }]} /></View>
      <Text style={[styles.conditionLabel, { color: theme.colors.primaryText }]}>{item.label}</Text>
      <Text style={[styles.conditionMeta, { color: theme.colors.secondaryText }]}>{item.onTimePercent === undefined ? '—' : `${item.onTimePercent}%`}</Text>
      <Text style={[styles.conditionMeta, { color: theme.colors.secondaryText }]}>{item.averageLateMinutes === undefined ? '記録なし' : item.averageLateMinutes > 0 ? `平均${Math.round(item.averageLateMinutes)}分遅れ` : '予定どおり'}</Text>
    </View>;
  })}</View>;
}

function InsightDashboardView({ events, tasks, plans, designMode, chicPalette, onApplySuggestion }: { events: BehaviorEvent[]; tasks: Task[]; plans: DeparturePlan[]; designMode: DesignMode; chicPalette?: ChicThemePalette; onApplySuggestion: (suggestion: InsightSuggestion) => void }) {
  const [range, setRange] = useState<InsightRange>('30d');
  const [metric, setMetric] = useState<InsightMetric>('preparation');
  const [conditionView, setConditionView] = useState<InsightConditionView>('weekday');
  const [selectedPointDate, setSelectedPointDate] = useState<string>();
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const dashboard = useMemo(() => buildInsightDashboard(events, plans, range), [events, plans, range]);
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const activeMetric = dashboard.metrics[metric];
  const conditionData = conditionView === 'weekday' ? dashboard.weekdayConditions : dashboard.timeOfDayConditions;
  const isDark = designMode === 'dark';

  return <View style={styles.dashboard}>
    <View style={[styles.rangeControl, { backgroundColor: isDark ? '#20293A' : theme.colors.secondarySurface, borderColor: theme.colors.border }]}>
      {([['7d', '7日'], ['30d', '30日'], ['all', '全期間']] as [InsightRange, string][]).map(([id, label]) => <Pressable key={id} onPress={() => setRange(id)} style={[styles.rangeButton, range === id && { backgroundColor: theme.colors.primaryAccent }]}><Text style={[styles.rangeButtonText, { color: range === id ? '#FFFFFF' : theme.colors.secondaryText }]}>{label}</Text></Pressable>)}
    </View>
    <Text style={[styles.dashboardRangeLabel, { color: theme.colors.secondaryText }]}>{dashboard.rangeLabel}</Text>

    <DashboardCard designMode={designMode} chicPalette={chicPalette}>
      <View style={styles.cardTitleRow}><Text style={[styles.dashboardKicker, { color: theme.colors.primaryAccent }]}>今の傾向</Text><TrendStatus status={dashboard.trend.status} designMode={designMode} chicPalette={chicPalette} /></View>
      <Text style={[styles.trendMessage, { color: theme.colors.primaryText }]}>{dashboard.trend.message}</Text>
      <Text style={[styles.dashboardCaption, { color: theme.colors.secondaryText }]}>{dashboard.trend.comparison}</Text>
    </DashboardCard>

    <DashboardCard designMode={designMode} chicPalette={chicPalette}>
      <View style={styles.cardTitleRow}><View><Text style={[styles.dashboardTitle, { color: theme.colors.primaryText }]}>時間の変化</Text><Text style={[styles.dashboardCaption, { color: theme.colors.secondaryText }]}>予定どおりは基準線の0です</Text></View><Text style={[styles.metricAverage, { color: theme.colors.primaryAccent }]}>{formatMetricAverage(metric, activeMetric.average)}</Text></View>
      <View style={styles.metricSwitcher}>{([['preparation', '準備'], ['departure', '出発'], ['notification', '通知'], ['focus', '集中']] as [InsightMetric, string][]).map(([id, label]) => <Pressable key={id} onPress={() => { setMetric(id); setSelectedPointDate(undefined); }} style={[styles.metricSwitch, { borderColor: theme.colors.border, backgroundColor: isDark ? '#20293A' : theme.colors.secondarySurface }, metric === id && { backgroundColor: theme.colors.primaryAccent, borderColor: theme.colors.primaryAccent }]}><Text style={[styles.metricSwitchText, { color: metric === id ? '#FFFFFF' : theme.colors.secondaryText }]}>{label}</Text></Pressable>)}</View>
      <LineChart points={activeMetric.points} metric={metric} selectedDate={selectedPointDate} onSelect={setSelectedPointDate} designMode={designMode} chicPalette={chicPalette} />
      <View style={[styles.chartFooter, { borderTopColor: theme.colors.border }]}><Text style={[styles.chartFooterText, { color: theme.colors.secondaryText }]}>平均 {formatMetricAverage(metric, activeMetric.average)}</Text><Text style={[styles.chartFooterText, { color: theme.colors.secondaryText }]}>{formatComparison(metric, activeMetric.average, activeMetric.previousAverage)}</Text></View>
    </DashboardCard>

    <DashboardCard designMode={designMode} chicPalette={chicPalette}>
      <Text style={[styles.dashboardTitle, { color: theme.colors.primaryText }]}>行動率</Text>
      <View style={styles.rateRow}>{dashboard.rates.map((rate) => <ProgressRing key={rate.id} rate={rate} designMode={designMode} chicPalette={chicPalette} />)}</View>
    </DashboardCard>

    <DashboardCard designMode={designMode} chicPalette={chicPalette}>
      <Text style={[styles.dashboardTitle, { color: theme.colors.primaryText }]}>通知後の行動</Text>
      {dashboard.notificationResponses.total === 0 ? <Text style={[styles.emptyDashboardCopy, { color: theme.colors.secondaryText }]}>この期間の通知記録はまだありません</Text> : <>
        <View style={styles.stackedBar}>{([['completed', '完了', theme.colors.success], ['later', 'あとで', theme.colors.primaryAccent], ['noResponse', '反応なし', isDark ? '#536077' : '#C6CDD9']] as const).map(([id, label, color]) => {
          const count = dashboard.notificationResponses[id];
          if (!count) return null;
          return <View key={id} style={{ flex: count, backgroundColor: color }} />;
        })}</View>
        <View style={styles.legendRow}>{([['completed', '完了', theme.colors.success], ['later', 'あとで', theme.colors.primaryAccent], ['noResponse', '反応なし', isDark ? '#536077' : '#C6CDD9']] as const).map(([id, label, color]) => <View key={id} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={[styles.legendText, { color: theme.colors.secondaryText }]}>{label} {dashboard.notificationResponses[id]}件</Text></View>)}</View>
        <Text style={[styles.dashboardCaption, { color: theme.colors.secondaryText }]}>同じ通知への複数操作は、最初の操作だけを集計しています</Text>
      </>}
    </DashboardCard>

    <DashboardCard designMode={designMode} chicPalette={chicPalette}>
      <View style={styles.cardTitleRow}><View><Text style={[styles.dashboardTitle, { color: theme.colors.primaryText }]}>曜日・時間帯別の傾向</Text><Text style={[styles.dashboardCaption, { color: theme.colors.secondaryText }]}>出発記録をもとに表示します</Text></View><View style={styles.conditionSwitch}>{([['weekday', '曜日'], ['timeOfDay', '時間帯']] as [InsightConditionView, string][]).map(([id, label]) => <Pressable key={id} onPress={() => setConditionView(id)} style={[styles.conditionSwitchButton, conditionView === id && { backgroundColor: theme.colors.primaryAccent }]}><Text style={[styles.conditionSwitchText, { color: conditionView === id ? '#FFFFFF' : theme.colors.secondaryText }]}>{label}</Text></Pressable>)}</View></View>
      <ConditionChart data={conditionData} designMode={designMode} chicPalette={chicPalette} />
      <Text style={[styles.dashboardCaption, { color: theme.colors.secondaryText }]}>記録が少ない曜日・時間帯は、傾向として断定しません</Text>
    </DashboardCard>

    {dashboard.suggestion && <DashboardCard designMode={designMode} chicPalette={chicPalette} style={[styles.suggestionCard, { borderColor: theme.colors.primaryAccent }]}>
      <Text style={[styles.dashboardKicker, { color: theme.colors.primaryAccent }]}>Rhythmからの提案</Text>
      <Text style={[styles.suggestionTitle, { color: theme.colors.primaryText }]}>{dashboard.suggestion.title}</Text>
      <Text style={[styles.dashboardCaption, { color: theme.colors.secondaryText }]}>{dashboard.suggestion.reason}</Text>
      <View style={styles.suggestionValues}><View><Text style={[styles.suggestionValueLabel, { color: theme.colors.secondaryText }]}>現在</Text><Text style={[styles.suggestionValue, { color: theme.colors.primaryText }]}>{dashboard.suggestion.currentValue}</Text></View><Text style={[styles.suggestionArrow, { color: theme.colors.primaryAccent }]}>→</Text><View><Text style={[styles.suggestionValueLabel, { color: theme.colors.secondaryText }]}>変更後</Text><Text style={[styles.suggestionValue, { color: theme.colors.primaryAccent }]}>{dashboard.suggestion.nextValue}</Text></View></View>
      <Pressable onPress={() => setSuggestionOpen(true)} style={[styles.applySuggestionButton, { backgroundColor: theme.colors.primaryAccent }]}><Text style={styles.applySuggestionText}>設定へ反映</Text></Pressable>
    </DashboardCard>}

    <Modal visible={suggestionOpen} transparent animationType="fade" onRequestClose={() => setSuggestionOpen(false)}>
      <View style={styles.suggestionModalBackdrop}><View style={[styles.suggestionModal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.suggestionModalTitle, { color: theme.colors.primaryText }]}>変更内容を確認</Text>
        <Text style={[styles.suggestionModalCopy, { color: theme.colors.secondaryText }]}>{dashboard.suggestion ? `${dashboard.suggestion.currentValue}から${dashboard.suggestion.nextValue}へ変更します。` : ''}</Text>
        <View style={styles.suggestionModalButtons}><Pressable onPress={() => setSuggestionOpen(false)} style={[styles.suggestionModalButton, { borderColor: theme.colors.border }]}><Text style={[styles.suggestionModalButtonText, { color: theme.colors.secondaryText }]}>キャンセル</Text></Pressable><Pressable onPress={() => { if (dashboard.suggestion) onApplySuggestion(dashboard.suggestion); setSuggestionOpen(false); }} style={[styles.suggestionModalButton, { backgroundColor: theme.colors.primaryAccent, borderColor: theme.colors.primaryAccent }]}><Text style={styles.suggestionModalButtonPrimary}>変更する</Text></Pressable></View>
      </View></View>
    </Modal>
  </View>;
}

export function AnalysisScreen({
  events,
  tasks,
  onRemoveRoutine,
  designMode,
  planTier,
  recordContent,
  onPremium,
  departurePlans,
  chicPalette,
  chicPattern,
  PatternDecor,
  onApplySuggestion,
  onAnalysisUsed,
  initialTab,
}: {
  events: BehaviorEvent[];
  tasks: Task[];
  onRemoveRoutine: (taskId: string) => void;
  designMode: DesignMode;
  planTier: PlanTier;
  recordContent: ReactNode;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  departurePlans: DeparturePlan[];
  chicPalette?: ChicThemePalette;
  chicPattern?: ChicPattern;
  PatternDecor?: (props: { pattern: ChicPattern; accent: string; warm: string; checkColor?: ChicCheckColor }) => ReactNode;
  onApplySuggestion: (suggestion: InsightSuggestion) => void;
  onAnalysisUsed?: () => void;
  initialTab?: AnalysisTab;
}) {
  const [tab, setTab] = useState<AnalysisTab>(initialTab ?? 'records');
  const departureActivity = useMemo(() => {
    const preparationEvents = events.filter((item) => item.type === 'departure_preparation_started');
    const departureEvents = events.filter((item) => item.type === 'departure_started');
    const latest = [...preparationEvents, ...departureEvents].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];
    return { preparationCount: preparationEvents.length, departureCount: departureEvents.length, latest };
  }, [events]);
  const premium = hasPremiumAccess(planTier, 'time_analysis');
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isChic = designMode === 'chic' && !!chicPalette;

  return (
    <>
      <View style={styles.tabs}>
        {([
          ['records', '記録'],
          ['routine', 'ルーティン'],
          ['insights', '時間と行動'],
        ] as [AnalysisTab, string][]).map(([id, label]) => (
          <Pressable key={id} style={[styles.tab, designMode === 'dark' && styles.tabDark, isChic && chicPalette && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }, tab === id && (designMode === 'dark' ? styles.tabDarkActive : { backgroundColor: theme.colors.primaryAccent, borderColor: theme.colors.primaryAccent }), tab === id && isChic && chicPalette && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }]} onPress={() => { setTab(id); onAnalysisUsed?.(); }}>
            <Text style={[styles.tabText, designMode === 'dark' && styles.tabTextDark, isChic && chicPalette && { color: chicPalette.textSecondary }, tab === id && styles.tabTextActive, tab === id && designMode === 'dark' && styles.tabTextActiveDark, tab === id && isChic && chicPalette && { color: chicPalette.onAccent }]}>{label}{id === 'insights' && planTier === 'free' ? ' 🔒' : ''}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'records' ? (
        <>
          <View style={[styles.activityCard, designMode === 'dark' && styles.activityCardDark, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.activityTitle, { color: theme.colors.primaryText }]}>出発・準備の実績</Text>
            <View style={styles.activityRow}>
              <View style={styles.activityMetric}>
                <Text style={[styles.activityValue, { color: designMode === 'dark' ? '#8EA6FF' : theme.colors.primaryAccent }]}>{departureActivity.preparationCount}</Text>
                <Text style={[styles.activityLabel, { color: theme.colors.secondaryText }]}>準備開始</Text>
              </View>
              <View style={styles.activityMetric}>
                <Text style={[styles.activityValue, { color: designMode === 'dark' ? '#8EA6FF' : theme.colors.primaryAccent }]}>{departureActivity.departureCount}</Text>
                <Text style={[styles.activityLabel, { color: theme.colors.secondaryText }]}>出発</Text>
              </View>
              <View style={[styles.activityLatest, designMode === 'dark' && styles.activityLatestDark, { borderLeftColor: theme.colors.border }]}>
                <Text style={[styles.activityLatestLabel, { color: designMode === 'chic' && chicPalette ? chicPalette.textMuted : theme.colors.secondaryText }]}>最新の記録</Text>
                <Text style={[styles.activityLatestValue, { color: theme.colors.primaryText }]}>
                  {departureActivity.latest ? departureActivity.latest.type === 'departure_started' ? '出発しました' : '準備を始めました' : 'まだ記録はありません'}
                </Text>
              </View>
            </View>
          </View>
          {recordContent}
        </>
      ) : tab === 'insights' && !premium ? (
        <PremiumGate dark={designMode === 'dark'} chicPalette={chicPalette} chicPattern={chicPattern} PatternDecor={PatternDecor} onPremium={() => onPremium('time')} />
      ) : tab === 'insights' ? (
        <InsightDashboardView events={events} tasks={tasks} plans={departurePlans} designMode={designMode} chicPalette={chicPalette} onApplySuggestion={onApplySuggestion} />
      ) : tab === 'routine' ? (
        <RoutineProgressPanel events={events} tasks={tasks} designMode={designMode} chicPalette={chicPalette} onRemoveRoutine={onRemoveRoutine} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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
  routineCard: { padding: 18, borderRadius: 18, borderWidth: 1, borderColor: '#E5DFEC', backgroundColor: '#FFF', },
  routineCardDark: { backgroundColor: '#181F2E', borderColor: '#303B50' },
  routineTaskGrid: { gap: 10 },
  routineDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 8 },
  routineDay: { alignItems: 'center', gap: 2, width: '13.4%' },
  routineDot: { width: 15, height: 15, borderRadius: 999, borderWidth: 1, borderColor: '#DAD4E2', backgroundColor: 'transparent' },
  routineDotDark: { borderColor: '#65738D' },
  routineDotFuture: { opacity: 0.35 },
  routineDotToday: { borderWidth: 2 },
  routineDayLabel: { color: '#817A88', fontSize: 7, fontWeight: '700' },
  routineTaskRow: { width: '100%', borderWidth: 1, borderColor: '#ECE8F0', borderRadius: 14, padding: 11, backgroundColor: '#FFFFFF' },
  routineTaskRowDark: { backgroundColor: '#20293A', borderColor: '#303B50' },
  routineTaskHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routineTaskActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routineTaskTitle: { color: '#292530', fontSize: 12, fontWeight: '900', flex: 1, marginRight: 5 },
  routineTaskRate: { fontSize: 14, fontWeight: '900' },
  routineRateCaption: { color: '#817A88', fontSize: 10, fontWeight: '800', marginTop: 3 },
  routineRemoveButton: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1EDF4' },
  routineRemoveButtonDark: { backgroundColor: '#303B50' },
  routineRemoveText: { color: '#7D7386', fontSize: 16, fontWeight: '700', lineHeight: 18 },
  routineRemoveTextDark: { color: '#FF8F9C' },
  routineStreak: { color: '#817A88', fontSize: 9, fontWeight: '800', marginTop: 7 },
  routineStreakDark: { color: '#B4C0D4' },
  routineStatusRow: { borderTopWidth: 1, borderTopColor: '#ECE8F0', marginTop: 10, paddingTop: 9, gap: 4 },
  routineStatusRowDark: { borderTopColor: '#303B50' },
  routineStatusLabel: { fontSize: 12, fontWeight: '900' },
  routineStatusCopy: { color: '#625D68', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  routineLatest: { color: '#817A88', fontSize: 10, lineHeight: 15, marginTop: 8, fontWeight: '700' },
  routineResumeCount: { color: '#756F7C', fontSize: 10, marginTop: 7, fontWeight: '800' },
  routineHistoryLink: { alignSelf: 'flex-start', marginTop: 9, paddingVertical: 3 },
  routineHistoryLinkText: { fontSize: 11, fontWeight: '900' },
  routineHistoryBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 12, 20, 0.48)' },
  routineHistorySheet: { maxHeight: '72%', minHeight: 260, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  routineHistorySheetDark: { backgroundColor: '#181F2E' },
  routineHistoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  routineHistoryHeading: { flex: 1 },
  routineHistoryTitle: { fontSize: 18, fontWeight: '900' },
  routineHistorySubtitle: { fontSize: 11, fontWeight: '800', marginTop: 3 },
  routineHistoryClose: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8 },
  routineHistoryCloseText: { fontSize: 11, fontWeight: '900' },
  routineHistoryList: { gap: 9, paddingBottom: 16 },
  routineHistoryItem: { borderWidth: 1, borderRadius: 14, padding: 12 },
  routineHistoryDate: { fontSize: 13, fontWeight: '900' },
  routineHistoryCopy: { fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 5 },
  routineHistoryMeta: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  routineHistoryEmpty: { fontSize: 12, fontWeight: '700', textAlign: 'center', paddingVertical: 22 },
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
  darkMetricText: { color: '#F4F7FC' },
  darkSecondaryText: { color: '#B4C0D4' },
  darkMutedMetricText: { color: '#8F9BB0' },
  dashboard: { gap: 12, paddingBottom: 18 },
  dashboardCard: { borderWidth: 1, borderRadius: 18, padding: 16, overflow: 'hidden' },
  dashboardCardDark: { backgroundColor: '#181F2E', borderColor: '#303B50' },
  rangeControl: { flexDirection: 'row', gap: 4, borderWidth: 1, borderRadius: 14, padding: 4 },
  rangeButton: { flex: 1, minHeight: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rangeButtonText: { fontSize: 12, fontWeight: '900' },
  dashboardRangeLabel: { fontSize: 11, fontWeight: '700', marginTop: -5 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  dashboardKicker: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  dashboardTitle: { fontSize: 17, fontWeight: '900' },
  dashboardCaption: { fontSize: 11, fontWeight: '700', lineHeight: 17, marginTop: 4 },
  trendStatus: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  trendStatusText: { fontSize: 10, fontWeight: '900' },
  trendMessage: { fontSize: 20, fontWeight: '900', lineHeight: 29, marginTop: 10 },
  metricAverage: { fontSize: 14, fontWeight: '900', marginTop: 3 },
  metricSwitcher: { flexDirection: 'row', gap: 6, marginTop: 15, marginBottom: 12 },
  metricSwitch: { flex: 1, minHeight: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  metricSwitchText: { fontSize: 11, fontWeight: '900' },
  chartArea: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', paddingTop: 3 },
  chartDates: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 13, paddingBottom: 8, marginTop: -11 },
  chartDate: { fontSize: 10, fontWeight: '700' },
  chartEmpty: { minHeight: 148, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  chartEmptyText: { fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 19 },
  selectedPoint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 9, marginTop: 9 },
  selectedPointLabel: { fontSize: 10, fontWeight: '800' },
  selectedPointValue: { fontSize: 12, fontWeight: '900' },
  pointSelector: { gap: 6, paddingTop: 9 },
  pointChip: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  pointChipText: { fontSize: 10, fontWeight: '800' },
  pointChipTextActive: { color: '#FFFFFF' },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, marginTop: 13, paddingTop: 11 },
  chartFooterText: { flex: 1, fontSize: 10, fontWeight: '800', lineHeight: 15 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginTop: 14 },
  rateItem: { flex: 1, alignItems: 'center', minWidth: 0 },
  ringWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  ringValue: { position: 'absolute', fontSize: 13, fontWeight: '900' },
  rateLabel: { fontSize: 10, fontWeight: '900', textAlign: 'center', marginTop: 7 },
  rateDetail: { fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 3 },
  emptyDashboardCopy: { fontSize: 12, fontWeight: '700', lineHeight: 19, marginTop: 13 },
  stackedBar: { height: 18, flexDirection: 'row', overflow: 'hidden', borderRadius: 9, marginTop: 15 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '800' },
  conditionSwitch: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden' },
  conditionSwitchButton: { paddingHorizontal: 8, paddingVertical: 6 },
  conditionSwitchText: { fontSize: 10, fontWeight: '900' },
  conditionChart: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginTop: 16 },
  conditionItem: { flex: 1, alignItems: 'center', minWidth: 0 },
  conditionRail: { height: 78, width: 21, borderRadius: 10, borderWidth: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  conditionFill: { width: '100%', minHeight: 0, borderRadius: 9 },
  conditionLabel: { fontSize: 11, fontWeight: '900', marginTop: 7 },
  conditionMeta: { fontSize: 8, lineHeight: 12, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  suggestionCard: { borderWidth: 2 },
  suggestionTitle: { fontSize: 18, fontWeight: '900', marginTop: 8 },
  suggestionValues: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 15 },
  suggestionValueLabel: { fontSize: 10, fontWeight: '800' },
  suggestionValue: { fontSize: 17, fontWeight: '900', marginTop: 2 },
  suggestionArrow: { fontSize: 19, fontWeight: '900' },
  applySuggestionButton: { minHeight: 43, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  applySuggestionText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  suggestionModalBackdrop: { flex: 1, backgroundColor: 'rgba(8, 13, 25, 0.48)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  suggestionModal: { width: '100%', maxWidth: 360, borderWidth: 1, borderRadius: 20, padding: 20 },
  suggestionModalTitle: { fontSize: 19, fontWeight: '900' },
  suggestionModalCopy: { fontSize: 13, lineHeight: 20, marginTop: 9 },
  suggestionModalButtons: { flexDirection: 'row', gap: 8, marginTop: 20 },
  suggestionModalButton: { flex: 1, minHeight: 43, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  suggestionModalButtonText: { fontSize: 13, fontWeight: '900' },
  suggestionModalButtonPrimary: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  premiumGate: { alignItems: 'center', borderRadius: 22, padding: 25, borderWidth: 1, overflow: 'hidden' },
  premiumLock: { fontSize: 28 },
  premiumTitle: { fontSize: 22, fontWeight: '900', marginTop: 8 },
  premiumCopy: { fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 9 },
  premiumButton: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 14, fontWeight: '900', marginTop: 16 },
});
