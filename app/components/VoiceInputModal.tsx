import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, InteractionManager, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import { VoiceIntent, VoiceParseResult, parseVoiceInput } from '../features/voiceParser';

type SpeechRecognitionModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  getPermissionsAsync?: () => Promise<{ granted: boolean }>;
  isRecognitionAvailable?: () => boolean;
  start: (options: { lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number }) => void;
  stop: () => void;
  addListener?: (eventName: string, listener: (event: SpeechEvent) => void) => { remove: () => void };
};
type SpeechEvent = { results?: Array<{ transcript?: string }>; isFinal?: boolean; error?: string };
const VOICE_DEBUG_PREFIX = '[Rhythm Voice Debug]';
const logVoiceDebug = (message: string, details?: Record<string, unknown>) => {
  console.info(VOICE_DEBUG_PREFIX, message, details ?? '');
};

// Expo Go does not include this native module. Keep the import lazy so the
// rest of Rhythm remains usable there; a Development Build enables recognition.
let speechModule: SpeechRecognitionModule | undefined;
try {
  speechModule = (require('expo-speech-recognition') as { ExpoSpeechRecognitionModule: SpeechRecognitionModule }).ExpoSpeechRecognitionModule;
} catch {
  speechModule = undefined;
}

function useSpeechEvent(eventName: string, listener: (event: SpeechEvent) => void) {
  useEffect(() => {
    const subscription = speechModule?.addListener?.(eventName, listener);
    return () => subscription?.remove();
  }, [eventName, listener]);
}

type Props = { visible: boolean; designMode: DesignMode; chicPalette?: ChicThemePalette; dateKey: (date: Date) => string; onClose: () => void; onRoute: (result: VoiceParseResult) => void };
const INTENT_LABELS: Array<[VoiceIntent, string]> = [['todo', 'ToDo'], ['schedule', '予定'], ['routine', 'Routine'], ['wish', 'Wish'], ['wishAction', 'Wish Action']];

export function VoiceInputModal({ visible, designMode, chicPalette, dateKey, onClose, onRoute }: Props) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isChic = designMode === 'chic' && !!chicPalette;
  const surface = isChic ? chicPalette!.cardSurface : theme.colors.surface;
  const background = isChic ? chicPalette!.cardSurface : theme.colors.screenBackground;
  const border = isChic ? chicPalette!.border : theme.colors.border;
  const text = isChic ? chicPalette!.textPrimary : theme.colors.primaryText;
  const muted = isChic ? chicPalette!.textSecondary : theme.colors.secondaryText;
  const accent = isChic ? chicPalette!.accent : theme.colors.primaryAccent;
  const onAccent = isChic ? chicPalette!.onAccent : designMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF';
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'recognized' | 'error'>('idle');
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<VoiceParseResult>();
  const [permissionReady, setPermissionReady] = useState(false);
  const recognitionStartingRef = useRef(false);
  const routedRef = useRef(false);

  const waitForRecognitionReady = async () => {
    logVoiceDebug('waiting for recognition readiness', { appState: AppState.currentState });
    if (AppState.currentState !== 'active') {
      await new Promise<void>((resolve) => {
        const subscription = AppState.addEventListener('change', (state) => {
          logVoiceDebug('app state changed', { state });
          if (state === 'active') {
            subscription.remove();
            resolve();
          }
        });
      });
    }
    await new Promise<void>((resolve) => InteractionManager.runAfterInteractions(resolve));
    // iOS can resolve the permission promise just before its dialog finishes
    // dismissing. Give that transition one short frame before starting audio.
    await new Promise<void>((resolve) => setTimeout(resolve, 120));
  };

  useSpeechEvent('start', () => { logVoiceDebug('speech start event', { appState: AppState.currentState }); setStatus('listening'); });
  useSpeechEvent('audiostart', () => logVoiceDebug('audio start event', { appState: AppState.currentState }));
  useSpeechEvent('result', (event) => {
    const next = event.results?.[0]?.transcript ?? '';
    if (!next) return;
    setTranscript(next);
    if (event.isFinal) { setStatus('processing'); setParsed(parseVoiceInput(next, new Date(), dateKey)); }
  });
  useSpeechEvent('end', () => setStatus((current) => current === 'processing' || current === 'recognized' ? current : transcript ? 'processing' : 'idle'));
  useSpeechEvent('error', (event) => { logVoiceDebug('speech error event', { error: event.error, appState: AppState.currentState }); if (event.error !== 'aborted') setStatus('error'); });

  const startRecognition = () => {
    if (!speechModule) { setStatus('error'); return; }
    if (!permissionReady || recognitionStartingRef.current) return;
    recognitionStartingRef.current = true;
    setTranscript('');
    setParsed(undefined);
    setStatus('idle');
    void (async () => {
      try {
        await waitForRecognitionReady();
        if (AppState.currentState !== 'active') throw new Error('app-not-active');
        const available = speechModule.isRecognitionAvailable ? speechModule.isRecognitionAvailable() : true;
        logVoiceDebug('recognition availability checked', { available, appState: AppState.currentState });
        if (!available) { setStatus('error'); return; }
        logVoiceDebug('start recognition before native call', { appState: AppState.currentState });
        speechModule.start({ lang: 'ja-JP', interimResults: true, continuous: false, maxAlternatives: 1 });
        logVoiceDebug('start recognition returned', { appState: AppState.currentState });
      } catch (error) {
        logVoiceDebug('start recognition failed', { error: error instanceof Error ? error.message : String(error), appState: AppState.currentState });
        setStatus('error');
      } finally {
        recognitionStartingRef.current = false;
      }
    })();
  };

  useEffect(() => {
    if (!visible) { routedRef.current = false; setPermissionReady(false); setStatus('idle'); setTranscript(''); setParsed(undefined); return; }
    let active = true;
    void (async () => {
      try {
        if (!speechModule) throw new Error('native-module-unavailable');
        logVoiceDebug('permission check started', { appState: AppState.currentState });
        const currentPermission = speechModule.getPermissionsAsync ? await speechModule.getPermissionsAsync() : undefined;
        const permission = currentPermission?.granted ? currentPermission : await speechModule.requestPermissionsAsync();
        if (!active) return;
        logVoiceDebug('permission check completed', { granted: permission.granted, appState: AppState.currentState });
        if (!permission.granted) { setPermissionReady(false); setStatus('error'); Alert.alert('音声入力を使えません', '音声入力を使うにはマイクと音声認識の許可が必要です。'); return; }
        // Do not start while iOS is dismissing the permission dialog. The
        // user starts recognition explicitly from the modal microphone button.
        setPermissionReady(true);
        setStatus('idle');
        logVoiceDebug('permission ready; waiting for manual start', { appState: AppState.currentState });
      } catch (error) {
        logVoiceDebug('permission check failed', { error: error instanceof Error ? error.message : String(error), appState: AppState.currentState });
        setStatus('error');
        Alert.alert('音声入力を使えません', 'Development Buildで音声認識を利用できます。');
      }
    })();
    return () => { active = false; try { speechModule?.stop(); } catch { /* Expo Go has no native module. */ } };
  }, [dateKey, visible]);

  useEffect(() => {
    if (!parsed || status !== 'processing') return;
    setStatus('recognized');
    if (parsed.intent !== 'ambiguous' && !routedRef.current) { routedRef.current = true; onRoute(parsed); }
  }, [onRoute, parsed, status]);

  const chooseIntent = (intent: VoiceIntent) => { if (!parsed || intent === 'ambiguous') return; routedRef.current = true; onRoute({ ...parsed, intent }); };
  const stop = () => { try { speechModule?.stop(); } catch { /* no-op */ } if (transcript && !parsed) { setParsed(parseVoiceInput(transcript, new Date(), dateKey)); setStatus('processing'); } };
  const statusLabel = status === 'listening' ? '聞いています…' : status === 'processing' ? '解析しています…' : status === 'recognized' ? '認識しました' : status === 'error' ? '音声入力を利用できません' : '話してください';

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.backdrop} onPress={onClose}><Pressable style={[styles.sheet, { backgroundColor: background, borderColor: border }]} onPress={(event) => event.stopPropagation()}>
    <View style={styles.header}><Text style={[styles.title, { color: text }]}>何を登録する？</Text><Pressable onPress={onClose}><Text style={[styles.close, { color: muted }]}>閉じる</Text></Pressable></View>
    <Text style={[styles.status, { color: muted }]}>{statusLabel}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={status === 'listening' ? '音声入力を停止' : '音声入力を開始'} onPress={status === 'listening' ? stop : startRecognition} style={[styles.mic, { backgroundColor: accent }]}>{status === 'processing' ? <ActivityIndicator color={onAccent} /> : <Text style={[styles.micGlyph, { color: onAccent }]}>⌕</Text>}</Pressable>
    {transcript ? <Text style={[styles.transcript, { color: text }]}>{transcript}</Text> : <Text style={[styles.example, { color: muted }]}>「明日の18時に美容院」{`\n`}「今日中に資料まとめる」</Text>}
    {parsed?.intent === 'ambiguous' ? <View style={styles.choiceWrap}><Text style={[styles.choiceTitle, { color: muted }]}>どこに登録する？</Text><View style={styles.choiceRow}>{INTENT_LABELS.map(([intent, label]) => <Pressable key={intent} onPress={() => chooseIntent(intent)} style={[styles.choice, { backgroundColor: surface, borderColor: border }]}><Text style={[styles.choiceText, { color: text }]}>{label}</Text></Pressable>)}</View></View> : null}
    <Pressable onPress={onClose} style={styles.cancel}><Text style={[styles.cancelText, { color: muted }]}>キャンセル</Text></Pressable>
  </Pressable></Pressable></Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)', padding: 14 },
  sheet: { borderWidth: 1, borderRadius: 24, padding: 20, paddingBottom: 26 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 19, fontWeight: '900' }, close: { fontSize: 12, fontWeight: '800' }, status: { textAlign: 'center', fontSize: 13, fontWeight: '800', marginTop: 16 }, mic: { width: 68, height: 68, borderRadius: 34, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 14 }, micGlyph: { fontSize: 33, fontWeight: '900', transform: [{ rotate: '-20deg' }] }, transcript: { textAlign: 'center', fontSize: 15, lineHeight: 22, fontWeight: '800', marginTop: 18 }, example: { textAlign: 'center', fontSize: 12, lineHeight: 19, marginTop: 18 }, choiceWrap: { marginTop: 18 }, choiceTitle: { fontSize: 12, fontWeight: '800', marginBottom: 8 }, choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: 38, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, choiceText: { fontSize: 12, fontWeight: '800' }, cancel: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, cancelText: { fontSize: 13, fontWeight: '800' },
});
