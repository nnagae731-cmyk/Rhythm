import React, { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import type { IntroCard } from './onboardingSteps';

const CAPTURE_STEPS: IntroCard['id'][] = ['quickTodo', 'today', 'schedule', 'focus', 'records', 'wish', 'customize'];

type Props = {
  visible: boolean;
  onClose: () => void;
  renderStep: (id: IntroCard['id']) => React.ReactNode;
  colors?: { background: string; surface: string; border: string; text: string; muted: string; accent: string; onAccent: string };
};

/**
 * Development-only capture surface. It deliberately keeps all generated files
 * in the native temporary directory returned by view-shot. The files can be
 * exported with the platform share sheet and are never written to app state.
 */
export function OnboardingCaptureStudio({ visible, onClose, renderStep, colors = { background: '#F7F8FA', surface: '#FFFFFF', border: '#DCE2EC', text: '#182235', muted: '#68748A', accent: '#4F6FED', onAccent: '#FFFFFF' } }: Props) {
  const targetRef = useRef<View>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [capturedUris, setCapturedUris] = useState<Partial<Record<IntroCard['id'], string>>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const captureCurrent = async (id: IntroCard['id']) => {
    if (!targetRef.current) return undefined;
    try {
      const viewShot = require('react-native-view-shot') as { captureRef?: (view: View, options: { format: 'jpg'; quality: number; width: number; height: number; result: 'tmpfile' }) => Promise<string> };
      if (!viewShot.captureRef) throw new Error('capture-unavailable');
      const uri = await viewShot.captureRef(targetRef.current, { format: 'jpg', quality: 0.82, width: 900, height: 1600, result: 'tmpfile' });
      setCapturedUris((current) => ({ ...current, [id]: uri }));
      return uri;
    } catch {
      setMessage('画像生成にはDevelopment Buildが必要です。');
      return undefined;
    }
  };

  const captureAll = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('7枚を順番に生成しています…');
    const next: Partial<Record<IntroCard['id'], string>> = {};
    try {
      for (let index = 0; index < CAPTURE_STEPS.length; index += 1) {
        const id = CAPTURE_STEPS[index]!;
        setStepIndex(index);
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const uri = await captureCurrent(id);
        if (uri) next[id] = uri;
      }
      setCapturedUris(next);
      setMessage(Object.keys(next).length === CAPTURE_STEPS.length ? '7枚の生成が完了しました。共有からPCへ取り出せます。' : '一部の画像を生成できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  const shareCurrent = async () => {
    const id = CAPTURE_STEPS[stepIndex]!;
    const uri = capturedUris[id];
    if (!uri) {
      setMessage('先に画像を生成してください。');
      return;
    }
    await Share.share({ url: uri, message: `Rhythm onboarding ${id}` }).catch(() => undefined);
  };

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}><View><Text style={[styles.title, { color: colors.text }]}>Onboarding Capture Studio</Text><Text style={[styles.subtitle, { color: colors.muted }]}>固定デモデータ・保存なし</Text></View><Pressable onPress={onClose} hitSlop={10}><Text style={[styles.close, { color: colors.accent }]}>閉じる</Text></Pressable></View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View ref={targetRef} collapsable={false} style={[styles.captureFrame, { backgroundColor: colors.surface, borderColor: colors.border }]}>{renderStep(CAPTURE_STEPS[stepIndex]!)}</View>
        <View style={styles.stepRow}>{CAPTURE_STEPS.map((id, index) => <Pressable key={id} disabled={busy} onPress={() => setStepIndex(index)} style={[styles.stepChip, { borderColor: colors.border }, index === stepIndex && { backgroundColor: colors.accent, borderColor: colors.accent }]}><Text style={[styles.stepText, { color: index === stepIndex ? colors.onAccent : colors.muted }]}>{index + 1}</Text><Text style={[styles.stepName, { color: index === stepIndex ? colors.onAccent : colors.text }]}>{id}</Text>{capturedUris[id] ? <Text style={[styles.done, { color: index === stepIndex ? colors.onAccent : colors.accent }]}>✓</Text> : null}</Pressable>)}</View>
        <Pressable disabled={busy} onPress={() => void captureAll()} style={[styles.primaryButton, { backgroundColor: colors.accent }, busy && styles.disabled]}>{busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={[styles.primaryText, { color: colors.onAccent }]}>7枚を生成</Text>}</Pressable>
        <Pressable disabled={busy} onPress={() => void captureCurrent(CAPTURE_STEPS[stepIndex]!)} style={[styles.secondaryButton, { borderColor: colors.accent }]}><Text style={[styles.secondaryText, { color: colors.accent }]}>表示中の1枚を生成</Text></Pressable>
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
