import React, { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import type { IntroCard, OnboardingFeatureId } from './onboardingSteps';
import type { PremiumGuideFeatureId } from '../../premiumGuide';

type CaptureMode = 'onboarding' | 'guide' | 'premium';
type GuideId = Exclude<OnboardingFeatureId, 'intro'>;
type CaptureItem = { id: string; label: string; mode: CaptureMode };
const ONBOARDING_ITEMS: CaptureItem[] = ['quickTodo', 'today', 'schedule', 'focus', 'recovery', 'records'].map((id) => ({ id, label: id, mode: 'onboarding' as const }));
const GUIDE_ITEMS: CaptureItem[] = ['todo', 'todoComplete', 'completedTasks', 'taskBuckets', 'taskDetails', 'schedule', 'planRegistration', 'calendarImport', 'focus', 'analysis', 'routine', 'history', 'photoLog', 'wish', 'affirmation', 'recovery'].map((id) => ({ id, label: id, mode: 'guide' as const }));
const PREMIUM_ITEMS: CaptureItem[] = ['focus_custom_duration', 'records', 'reflection', 'calendar', 'route', 'travel_apps', 'nudge', 'time', 'behavior', 'month', 'history', 'recovery', 'templates', 'wish', 'affirmation', 'photo_design'].map((id) => ({ id, label: id, mode: 'premium' as const }));

type Props = {
  visible: boolean;
  onClose: () => void;
  renderStep: (id: IntroCard['id']) => React.ReactNode;
  renderGuideStep?: (id: GuideId) => React.ReactNode;
  renderPremiumStep?: (id: PremiumGuideFeatureId) => React.ReactNode;
  colors?: { background: string; surface: string; border: string; text: string; muted: string; accent: string; onAccent: string };
};

/**
 * Development-only capture surface. It deliberately keeps all generated files
 * in the native temporary directory returned by view-shot. The files can be
 * exported with the platform share sheet and are never written to app state.
 */
export function OnboardingCaptureStudio({ visible, onClose, renderStep, renderGuideStep, renderPremiumStep, colors = { background: '#F7F8FA', surface: '#FFFFFF', border: '#DCE2EC', text: '#182235', muted: '#68748A', accent: '#4F6FED', onAccent: '#FFFFFF' } }: Props) {
  const targetRef = useRef<View>(null);
  const [mode, setMode] = useState<CaptureMode>('onboarding');
  const [stepIndex, setStepIndex] = useState(0);
  const [capturedUris, setCapturedUris] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const items = mode === 'onboarding' ? ONBOARDING_ITEMS : mode === 'guide' ? GUIDE_ITEMS : PREMIUM_ITEMS;
  const current = items[stepIndex] ?? items[0]!;
  const renderCurrent = () => {
    if (current.mode === 'onboarding') return renderStep(current.id as IntroCard['id']);
    if (current.mode === 'guide') return renderGuideStep?.(current.id as GuideId) ?? <Text style={{ color: colors.muted }}>Guide Preview renderer unavailable.</Text>;
    return renderPremiumStep?.(current.id as PremiumGuideFeatureId) ?? <Text style={{ color: colors.muted }}>Premium Preview renderer unavailable.</Text>;
  };
  const selectMode = (nextMode: CaptureMode) => { if (busy) return; setMode(nextMode); setStepIndex(0); setMessage(''); };

  const captureCurrent = async (item: CaptureItem) => {
    if (!targetRef.current) return undefined;
    try {
      const viewShot = require('react-native-view-shot') as { captureRef?: (view: View, options: { format: 'jpg'; quality: number; width: number; height: number; result: 'tmpfile' }) => Promise<string> };
      if (!viewShot.captureRef) throw new Error('capture-unavailable');
      const uri = await viewShot.captureRef(targetRef.current, { format: 'jpg', quality: 0.82, width: 900, height: 1600, result: 'tmpfile' });
      setCapturedUris((current) => ({ ...current, [`${item.mode}:${item.id}`]: uri }));
      return uri;
    } catch {
      setMessage('画像を生成できませんでした。もう一度お試しください。');
      return undefined;
    }
  };

  const captureAll = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(`${mode === 'onboarding' ? 'Onboarding' : mode === 'guide' ? 'Guide' : 'Premium'}を順番に生成しています…`);
    try {
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]!;
        setStepIndex(index);
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        await captureCurrent(item);
      }
      setMessage(`${items.length}件の生成が完了しました。共有からレビュー用に取り出せます。`);
    } finally {
      setBusy(false);
    }
  };

  const shareCurrent = async () => {
    const key = `${current.mode}:${current.id}`;
    const uri = capturedUris[key];
    if (!uri) {
      setMessage('先に画像を生成してください。');
      return;
    }
    await Share.share({ url: uri, message: `Rhythm ${current.mode} ${current.id}` }).catch(() => undefined);
  };

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}><View><Text style={[styles.title, { color: colors.text }]}>Content Capture Studio</Text><Text style={[styles.subtitle, { color: colors.muted }]}>実画面・固定デモデータ・保存なし</Text></View><Pressable onPress={onClose} hitSlop={10}><Text style={[styles.close, { color: colors.accent }]}>閉じる</Text></Pressable></View>
      <View style={styles.modeRow}>{(['onboarding', 'guide', 'premium'] as CaptureMode[]).map((itemMode) => <Pressable key={itemMode} disabled={busy} onPress={() => selectMode(itemMode)} style={[styles.modeButton, { borderColor: colors.border }, mode === itemMode && { backgroundColor: colors.accent, borderColor: colors.accent }]}><Text style={[styles.modeText, { color: mode === itemMode ? colors.onAccent : colors.text }]}>{itemMode === 'onboarding' ? 'Onboarding' : itemMode === 'guide' ? 'Guide Preview' : 'Premium Preview'}</Text></Pressable>)}</View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View ref={targetRef} collapsable={false} style={[styles.captureFrame, { backgroundColor: colors.surface, borderColor: colors.border }]}>{renderCurrent()}</View>
        <View style={styles.stepRow}>{items.map((item, index) => { const key = `${item.mode}:${item.id}`; return <Pressable key={key} disabled={busy} onPress={() => setStepIndex(index)} style={[styles.stepChip, { borderColor: colors.border }, index === stepIndex && { backgroundColor: colors.accent, borderColor: colors.accent }]}><Text style={[styles.stepText, { color: index === stepIndex ? colors.onAccent : colors.muted }]}>{index + 1}</Text><Text style={[styles.stepName, { color: index === stepIndex ? colors.onAccent : colors.text }]}>{item.label}</Text>{capturedUris[key] ? <Text style={[styles.done, { color: index === stepIndex ? colors.onAccent : colors.accent }]}>✓</Text> : null}</Pressable>; })}</View>
        <Pressable disabled={busy} onPress={() => void captureAll()} style={[styles.primaryButton, { backgroundColor: colors.accent }, busy && styles.disabled]}>{busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={[styles.primaryText, { color: colors.onAccent }]}>このモードを一括生成</Text>}</Pressable>
        <Pressable disabled={busy} onPress={() => void captureCurrent(current)} style={[styles.secondaryButton, { borderColor: colors.accent }]}><Text style={[styles.secondaryText, { color: colors.accent }]}>表示中の1枚を生成</Text></Pressable>
        <Pressable disabled={busy} onPress={() => void shareCurrent()} style={[styles.secondaryButton, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.muted }]}>現在の画像を共有・保存</Text></Pressable>
        {message ? <Text style={[styles.message, { color: colors.muted }]}>{message}</Text> : null}
        <Text style={[styles.note, { color: colors.muted }]}>生成画像は一時ファイルです。正式Asset化する場合は共有からPCへ取り出し、リポジトリのassetsへ追加してください。</Text>
      </ScrollView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 19, fontWeight: '900' },
  subtitle: { marginTop: 3, fontSize: 11 },
  close: { fontSize: 13, fontWeight: '800' },
  modeRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 20, paddingBottom: 7 },
  modeButton: { flex: 1, minHeight: 38, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  modeText: { fontSize: 10, fontWeight: '800' },
  content: { padding: 20, paddingBottom: 40 },
  captureFrame: { width: '100%', minHeight: 420, borderWidth: 1, borderRadius: 18, padding: 14, overflow: 'hidden' },
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  stepChip: { minWidth: 86, minHeight: 36, paddingHorizontal: 8, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepText: { fontSize: 11, fontWeight: '900' },
  stepName: { flex: 1, fontSize: 9 },
  done: { fontSize: 12, fontWeight: '900' },
  primaryButton: { minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { fontSize: 13, fontWeight: '900' },
  secondaryButton: { minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  secondaryText: { fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  message: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 12 },
  note: { fontSize: 10, lineHeight: 16, marginTop: 15 },
});
