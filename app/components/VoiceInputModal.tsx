import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, InteractionManager, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import { VoiceIntent, VoiceParseResult, parseVoiceInput } from '../features/voiceParser';

type SpeechRecognitionModule = {
  requestPermissionsAsync: () => Promise<SpeechPermission>;
  getPermissionsAsync?: () => Promise<SpeechPermission>;
  requestMicrophonePermissionsAsync?: () => Promise<SpeechPermission>;
  getMicrophonePermissionsAsync?: () => Promise<SpeechPermission>;
  isRecognitionAvailable?: () => boolean;
  start: (options: { lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number; requiresOnDeviceRecognition?: boolean }) => void;
  stop: () => void;
  addListener?: (eventName: string, listener: (event: SpeechEvent) => void) => { remove: () => void };
};
type SpeechPermission = { granted: boolean; status?: string; canAskAgain?: boolean };
type SpeechEvent = { results?: Array<{ transcript?: string }>; isFinal?: boolean; error?: string };
const VOICE_DEBUG_PREFIX = '[Rhythm Voice Debug]';
const VOICE_DEBUG_CHECKPOINT_KEY = 'rhythm.voiceDebug.lastCheckpoint';
type VoiceDebugCheckpointName =
  | 'voice modal opened'
  | 'microphone permission check started'
  | 'before getMicrophonePermissionsAsync()'
  | 'after getMicrophonePermissionsAsync()'
  | 'before requestMicrophonePermissionsAsync()'
  | 'after requestMicrophonePermissionsAsync()'
  | 'before Audio.getPermissionsAsync()'
  | 'after Audio.getPermissionsAsync()'
  | 'before microphone permission request'
  | 'after microphone permission request'
  | 'microphone permission granted'
  | 'recognition availability checked'
  | 'startRecognition function entered'
  | 'before native start()'
  | 'start() returned'
  | 'speech start event'
  | 'audiostart event'
  | 'result event';
type VoiceDebugCheckpoint = {
  checkpoint: VoiceDebugCheckpointName;
  timestamp: string;
  appState: string;
  platform: string;
  permissionState: string;
  recognitionAvailable: boolean | null;
  requiresOnDeviceRecognition: boolean;
  granted?: boolean;
  status?: string;
  canAskAgain?: boolean;
};
let voiceCheckpointWriteChain = Promise.resolve();
const logVoiceDebug = (message: string, details?: Record<string, unknown>) => {
  console.info(VOICE_DEBUG_PREFIX, message, details ?? '');
};

const saveVoiceCheckpoint = (checkpoint: VoiceDebugCheckpointName, details: Partial<Omit<VoiceDebugCheckpoint, 'checkpoint' | 'timestamp' | 'appState' | 'platform'>> = {}) => {
  const value: VoiceDebugCheckpoint = {
    checkpoint,
    timestamp: new Date().toISOString(),
    appState: AppState.currentState,
    platform: Platform.OS,
    permissionState: details.permissionState ?? 'unknown',
    recognitionAvailable: details.recognitionAvailable ?? null,
    requiresOnDeviceRecognition: details.requiresOnDeviceRecognition ?? Platform.OS === 'ios',
  };
  logVoiceDebug(checkpoint, value);
  voiceCheckpointWriteChain = voiceCheckpointWriteChain
    .then(() => AsyncStorage.setItem(VOICE_DEBUG_CHECKPOINT_KEY, JSON.stringify(value)))
    .catch((error) => {
      logVoiceDebug('checkpoint persistence failed', { error: error instanceof Error ? error.message : String(error) });
    });
};

const logPreviousVoiceCheckpoint = async () => {
  try {
    const raw = await AsyncStorage.getItem(VOICE_DEBUG_CHECKPOINT_KEY);
    if (!raw) {
      logVoiceDebug('previous crash checkpoint', { checkpoint: null });
      return;
    }
    try {
      logVoiceDebug('previous crash checkpoint', JSON.parse(raw) as Record<string, unknown>);
    } catch {
      logVoiceDebug('previous crash checkpoint', { checkpoint: raw });
    }
  } catch (error) {
    logVoiceDebug('previous crash checkpoint read failed', { error: error instanceof Error ? error.message : String(error) });
  }
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

  useSpeechEvent('start', () => { saveVoiceCheckpoint('speech start event', { permissionState: permissionReady ? 'granted' : 'unknown' }); setStatus('listening'); });
  useSpeechEvent('audiostart', () => { logVoiceDebug('audio start event', { appState: AppState.currentState }); saveVoiceCheckpoint('audiostart event', { permissionState: permissionReady ? 'granted' : 'unknown' }); });
  useSpeechEvent('result', (event) => {
    saveVoiceCheckpoint('result event', { permissionState: permissionReady ? 'granted' : 'unknown' });
    const next = event.results?.[0]?.transcript ?? '';
    if (!next) return;
    setTranscript(next);
    if (event.isFinal) { setStatus('processing'); setParsed(parseVoiceInput(next, new Date(), dateKey)); }
  });
  useSpeechEvent('end', () => setStatus((current) => current === 'processing' || current === 'recognized' ? current : transcript ? 'processing' : 'idle'));
  useSpeechEvent('error', (event) => { logVoiceDebug('speech error event', { error: event.error, appState: AppState.currentState }); if (event.error !== 'aborted') setStatus('error'); });

  const startRecognition = () => {
    saveVoiceCheckpoint('startRecognition function entered', { permissionState: permissionReady ? 'granted' : 'unknown' });
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
        saveVoiceCheckpoint('recognition availability checked', { recognitionAvailable: available, permissionState: permissionReady ? 'granted' : 'unknown' });
        if (!available) { setStatus('error'); return; }
        const requiresOnDeviceRecognition = Platform.OS === 'ios';
        logVoiceDebug('start recognition before native call', { appState: AppState.currentState, requiresOnDeviceRecognition });
        saveVoiceCheckpoint('before native start()', { permissionState: permissionReady ? 'granted' : 'unknown', recognitionAvailable: available, requiresOnDeviceRecognition });
        speechModule.start({ lang: 'ja-JP', interimResults: true, continuous: false, maxAlternatives: 1, requiresOnDeviceRecognition });
        logVoiceDebug('start recognition returned', { appState: AppState.currentState });
        saveVoiceCheckpoint('start() returned', { permissionState: permissionReady ? 'granted' : 'unknown', recognitionAvailable: available, requiresOnDeviceRecognition });
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
        await logPreviousVoiceCheckpoint();
        saveVoiceCheckpoint('voice modal opened', { permissionState: 'unknown' });
        if (!speechModule) throw new Error('native-module-unavailable');
        logVoiceDebug('permission check started', { appState: AppState.currentState });
        saveVoiceCheckpoint('microphone permission check started', { permissionState: 'checking' });
        let permission: SpeechPermission;
        if (Platform.OS === 'ios') {
          logVoiceDebug('mode: expo-av microphone-only', { appState: AppState.currentState });
          saveVoiceCheckpoint('before Audio.getPermissionsAsync()', { permissionState: 'checking' });
          const currentMicrophonePermission = await Audio.getPermissionsAsync();
          logVoiceDebug('microphone permission checked', {
            granted: currentMicrophonePermission.granted,
            status: currentMicrophonePermission.status,
            canAskAgain: currentMicrophonePermission.canAskAgain,
            appState: AppState.currentState,
          });
          saveVoiceCheckpoint('after Audio.getPermissionsAsync()', {
            permissionState: currentMicrophonePermission.granted ? 'granted' : 'denied',
            granted: currentMicrophonePermission.granted,
            status: currentMicrophonePermission.status,
            canAskAgain: currentMicrophonePermission.canAskAgain,
          });
          if (currentMicrophonePermission.granted) {
            permission = currentMicrophonePermission;
          } else {
            saveVoiceCheckpoint('before microphone permission request', { permissionState: 'requesting' });
            const requestedMicrophonePermission = await Audio.requestPermissionsAsync();
            logVoiceDebug('microphone permission requested', {
              granted: requestedMicrophonePermission.granted,
              status: requestedMicrophonePermission.status,
              canAskAgain: requestedMicrophonePermission.canAskAgain,
              appState: AppState.currentState,
            });
            saveVoiceCheckpoint('after microphone permission request', {
              permissionState: requestedMicrophonePermission.granted ? 'granted' : 'denied',
              granted: requestedMicrophonePermission.granted,
              status: requestedMicrophonePermission.status,
              canAskAgain: requestedMicrophonePermission.canAskAgain,
            });
            permission = requestedMicrophonePermission;
          }
        } else {
          const currentPermission = speechModule.getPermissionsAsync ? await speechModule.getPermissionsAsync() : undefined;
          permission = currentPermission?.granted ? currentPermission : await speechModule.requestPermissionsAsync();
        }
        if (!active) return;
        saveVoiceCheckpoint('microphone permission granted', { permissionState: permission.granted ? 'granted' : 'denied' });
        logVoiceDebug('permission check completed', { granted: permission.granted, appState: AppState.currentState });
        if (!permission.granted) { setPermissionReady(false); setStatus('error'); Alert.alert('音声入力を使えません', '音声入力を使うにはマイクと音声認識の許可が必要です。'); return; }
        // Do not start while iOS is dismissing the permission dialog. The
        // user starts recognition explicitly from the modal microphone button.
        setPermissionReady(true);
        setStatus('idle');
        logVoiceDebug('permission ready', { appState: AppState.currentState, mode: Platform.OS === 'ios' ? 'microphone-only' : 'combined' });
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
