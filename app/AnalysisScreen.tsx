import React, { ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { analyzeDepartureDelay, analyzeFocusDuration, analyzeNotificationResponse, analyzePreparationStartDelay, analyzeSnoozeBehavior, AnalysisResult } from './behaviorAnalysis';
import { BehaviorEvent } from './behaviorEvents';
import { hasPremiumAccess, PlanTier } from './premiumAccess';
import { DesignMode, getThemeTokens } from './theme';

type AnalysisTab = 'records' | 'time' | 'behavior';

function DataState({ result, designMode }: { result: AnalysisResult; designMode: DesignMode }) {
  if (result.status === 'insufficient') return <View style={styles.dataState}><Text style={styles.dataStateTitle}>まだ記録中です</Text><Text style={styles.dataStateCopy}>{designMode === 'companion' ? '🥚 相棒も記録を集めてるみたい' : 'Rhythmを使うと、少しずつ傾向が見えてきます'}</Text><Text style={styles.sample}>記録 {result.sampleCount}回</Text></View>;
  if (result.status === 'early') return <View style={styles.early}><Text style={styles.earlyTitle}>少し傾向が見えてきました</Text><Text style={styles.dataStateCopy}>まだ記録が少ないため、参考として表示しています</Text><Text style={styles.sample}>記録 {result.sampleCount}回・参考</Text></View>;
  return null;
}

function MetricCard({ title, value, result, designMode }: { title: string; value?: string; result: AnalysisResult; designMode: DesignMode }) {
  const theme = getThemeTokens(designMode);
  return <View style={[styles.metricCard, designMode === 'minimal' && styles.metricMinimal, designMode === 'chic' && styles.metricChic, designMode === 'companion' && styles.metricCompanion, { borderColor: theme.colors.border }]}>
    <Text style={styles.metricLabel}>{title}</Text>
    {result.status === 'insufficient' ? <DataState result={result} designMode={designMode} /> : <><Text style={[styles.metricValue, { color: theme.colors.primaryAccent }]}>{value ?? result.summary}</Text><Text style={styles.metricSummary}>{result.summary}</Text><Text style={styles.sample}>記録 {result.sampleCount}回{result.status === 'early' ? '・参考' : ''}</Text></>}
  </View>;
}

function PremiumGate({ onPremium }: { onPremium: () => void }) {
  return <Pressable style={styles.premiumGate} onPress={onPremium}><Text style={styles.premiumLock}>♢</Text><Text style={styles.premiumTitle}>Rhythm Premium</Text><Text style={styles.premiumCopy}>実際の記録から、時間のズレや最近の行動傾向を確認できます。</Text><Text style={styles.premiumButton}>詳しく見る</Text></Pressable>;
}

export function AnalysisScreen({ events, designMode, planTier, recordContent, onPremium }: { events: BehaviorEvent[]; designMode: DesignMode; planTier: PlanTier; recordContent: ReactNode; onPremium: () => void }) {
  const [tab, setTab] = useState<AnalysisTab>('records');
  const preparation = useMemo(() => analyzePreparationStartDelay(events), [events]);
  const departure = useMemo(() => analyzeDepartureDelay(events), [events]);
  const notification = useMemo(() => analyzeNotificationResponse(events), [events]);
  const focus = useMemo(() => analyzeFocusDuration(events), [events]);
  const snooze = useMemo(() => analyzeSnoozeBehavior(events), [events]);
  const premium = hasPremiumAccess(planTier, tab === 'time' ? 'time_analysis' : 'behavior_analysis');
  const theme = getThemeTokens(designMode);

  return <>
    <View style={[styles.hero, designMode === 'minimal' && styles.heroMinimal, designMode === 'chic' && styles.heroChic, designMode === 'companion' && styles.heroCompanion]}>
      <Text style={[styles.kicker, designMode === 'minimal' && styles.kickerMinimal]}>最近の記録から</Text><Text style={[styles.title, designMode === 'minimal' && styles.titleMinimal]}>自分のリズムを知る</Text><Text style={[styles.heroCopy, designMode === 'minimal' && styles.heroCopyMinimal]}>できたことと、動いた時間を少しずつ振り返ります。</Text>
    </View>
    <View style={styles.tabs}>{([['records', '記録'], ['time', '時間'], ['behavior', '行動']] as [AnalysisTab, string][]).map(([id, label]) => <Pressable key={id} style={[styles.tab, tab === id && { backgroundColor: theme.colors.primaryAccent }]} onPress={() => setTab(id)}><Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}{id !== 'records' && planTier === 'free' ? ' ♢' : ''}</Text></Pressable>)}</View>
    {tab === 'records' ? recordContent : !premium ? <PremiumGate onPremium={onPremium} /> : tab === 'time' ? <>
      <Text style={styles.sectionTitle}>時間のズレを見つける</Text><Text style={styles.sectionCopy}>通知から動くまでの時間や、支度・出発のズレを確認できます。</Text>
      <View style={styles.grid}>
        <MetricCard title="準備開始" value={preparation.averageMinutes === undefined ? undefined : `${Math.abs(preparation.averageMinutes)}分${preparation.averageMinutes > 2 ? '遅め' : preparation.averageMinutes < -2 ? '早め' : 'ほぼ予定どおり'}`} result={preparation} designMode={designMode} />
        <MetricCard title="出発" value={departure.averageMinutes === undefined ? undefined : `${Math.abs(departure.averageMinutes)}分${departure.averageMinutes > 2 ? '遅め' : departure.averageMinutes < -2 ? '早め' : 'ほぼ予定どおり'}`} result={departure} designMode={designMode} />
        <MetricCard title="通知への反応" value={notification.averageMinutes === undefined ? undefined : `平均${Math.max(0, notification.averageMinutes)}分`} result={notification} designMode={designMode} />
        <MetricCard title="集中" value={focus.averageMinutes === undefined ? undefined : `平均${focus.averageMinutes}分実行`} result={focus} designMode={designMode} />
      </View>
    </> : <>
      <Text style={styles.sectionTitle}>最近の行動傾向</Text><Text style={styles.sectionCopy}>実際に記録された行動だけを使っています。</Text>
      <View style={styles.behaviorList}>
        <MetricCard title="動き始め" result={notification} designMode={designMode} />
        <MetricCard title="出発" value={departure.sampleCount ? `${departure.sampleCount}回中${departure.lateCount}回、予定時刻より後` : undefined} result={departure} designMode={designMode} />
        <MetricCard title="集中" result={focus} designMode={designMode} />
        <MetricCard title="延長" value={snooze.summary} result={snooze} designMode={designMode} />
      </View>
    </>}
  </>;
}

const styles = StyleSheet.create({
  hero: { padding: 18, marginBottom: 14, backgroundColor: '#F4F0FF', borderRadius: 22 },
  heroMinimal: { borderRadius: 2, backgroundColor: '#111', borderTopWidth: 4, borderTopColor: '#777' },
  heroChic: { backgroundColor: '#FCE9EF', borderWidth: 1, borderColor: '#F2CAD7' },
  heroCompanion: { backgroundColor: '#FFF0C9', borderColor: '#EBCB80', borderWidth: 1 },
  kicker: { color: '#80798B', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, title: { color: '#292530', fontSize: 28, fontWeight: '900', marginTop: 5 }, heroCopy: { color: '#6F6878', fontSize: 12, marginTop: 7, lineHeight: 19 },
  kickerMinimal: { color: '#A8A8A8' }, titleMinimal: { color: '#FFFFFF' }, heroCopyMinimal: { color: '#CFCFCF' },
  tabs: { flexDirection: 'row', gap: 7, marginBottom: 20 }, tab: { flex: 1, paddingVertical: 11, backgroundColor: '#EEEAF0', borderRadius: 12, alignItems: 'center' }, tabText: { color: '#625D68', fontWeight: '800' }, tabTextActive: { color: '#FFF' },
  sectionTitle: { color: '#292530', fontSize: 21, fontWeight: '900' }, sectionCopy: { color: '#797280', fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 14 }, grid: { gap: 10 }, behaviorList: { gap: 10 },
  metricCard: { padding: 17, borderRadius: 18, borderWidth: 1, backgroundColor: '#FFF' }, metricMinimal: { borderRadius: 1, borderColor: '#222', borderLeftWidth: 5 }, metricChic: { backgroundColor: 'rgba(255,255,255,0.84)' }, metricCompanion: { backgroundColor: '#FFF9E9' }, metricLabel: { color: '#756F7C', fontSize: 11, fontWeight: '900' }, metricValue: { fontSize: 25, fontWeight: '900', marginTop: 8 }, metricSummary: { color: '#5E5864', fontSize: 12, marginTop: 5 }, sample: { color: '#938C98', fontSize: 10, fontWeight: '700', marginTop: 9 },
  dataState: { paddingVertical: 8 }, dataStateTitle: { color: '#3C3741', fontSize: 16, fontWeight: '900' }, dataStateCopy: { color: '#7D7684', fontSize: 11, lineHeight: 17, marginTop: 4 }, early: { marginTop: 8, padding: 10, backgroundColor: '#F8F3E8', borderRadius: 10 }, earlyTitle: { color: '#6E5932', fontSize: 14, fontWeight: '900' },
  premiumGate: { alignItems: 'center', backgroundColor: '#25202C', borderRadius: 22, padding: 25 }, premiumLock: { color: '#F5D78B', fontSize: 28 }, premiumTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 8 }, premiumCopy: { color: '#D6CFDA', fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 9 }, premiumButton: { color: '#25202C', backgroundColor: '#F5D78B', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 14, fontWeight: '900', marginTop: 16 },
});
