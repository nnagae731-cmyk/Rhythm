import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, Easing, InteractionManager, Linking, Modal, Platform, Pressable, StyleSheet, Text, View, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import { VoiceIntent, VoiceParseResult, parseVoiceInput } from '../features/voiceParser';

type SpeechRecognitionModule = {
  requestPermissionsAsync: () => Promise<SpeechPermission>;
  getPermissionsAsync?: () => Promise<SpeechPermission>;
  getMicrophonePermissionsAsync?: () => Promise<SpeechPermission>;
  requestMicrophonePermissionsAsync?: () => Promise<SpeechPermission>;
  getSpeechRecognizerPermissionsAsync?: () => Promise<SpeechPermission>;
  requestSpeechRecognizerPermissionsAsync?: () => Promise<SpeechPermission>;
  isRecognitionAvailable?: () => boolean;
  supportsOnDeviceRecognition?: () => boolean;
  start: (options: { lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number; requiresOnDeviceRecognition?: boolean }) => void;
  stop: () => void;
  addListener?: (eventName: string, listener: (event: SpeechEvent) => void) => { remove: () => void };
};
type SpeechPermission = { granted: boolean; status?: string; canAskAgain?: boolean };
type SpeechEvent = { results?: Array<{ transcript?: string }>; isFinal?: boolean; error?: string };
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

type Props = { visible: boolean; designMode: DesignMode; chicPalette?: ChicThemePalette; dateKey: (date: Date) => string; onClose: () => void; onRoute: (result: VoiceParseResult) => boolean; hapticsEnabled?: boolean; isPremium?: boolean; remainingUses?: number; onRecognitionAccepted?: () => void; autoStart?: boolean };
const INTENT_LABELS: Array<[VoiceIntent, string]> = [['todo', 'ToDo'], ['schedule', '予定'], ['routine', 'Routine'], ['focus', '集中'], ['wish', 'Wish'], ['wishAction', 'Wish Action']];

export function VoiceInputModal({ visible, designMode, chicPalette, dateKey, onClose, onRoute, hapticsEnabled = true, isPremium = false, remainingUses, onRecognitionAccepted, autoStart = false }: Props) {
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
  const [errorMessage, setErrorMessage] = useState<string>();
  const pulse = useRef(new Animated.Value(0)).current;
  const recognitionStartingRef = useRef(false);
  const routedRef = useRef(false);
  const usageConsumedRef = useRef(false);
  const autoStartRunRef = useRef(false);
  const permissionCheckInFlightRef = useRef(false);

  const usesOnDeviceRecognition = () => Platform.OS === 'ios' && (speechModule?.supportsOnDeviceRecognition?.() ?? false);

  const waitForRecognitionReady = async () => {
    if (AppState.currentState !== 'active') {
      await new Promise<void>((resolve) => {
        const subscription = AppState.addEventListener('change', (state) => {
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

  useSpeechEvent('start', () => { if (hapticsEnabled) Vibration.vibrate(12); setStatus('listening'); });
  useSpeechEvent('result', (event) => {
    const next = event.results?.[0]?.transcript ?? '';
    if (!next) return;
    setTranscript(next);
    if (event.isFinal) { setStatus('processing'); setParsed(parseVoiceInput(next, new Date(), dateKey)); }
  });
  useSpeechEvent('end', () => { if (hapticsEnabled) Vibration.vibrate(10); setStatus((current) => current === 'processing' || current === 'recognized' ? current : transcript ? 'processing' : 'idle'); });
  useSpeechEvent('error', (event) => {
    if (event.error === 'aborted') return;
    setErrorMessage(
      event.error === 'not-allowed'
        ? 'マイクまたは音声認識の許可を確認してください。'
        : event.error === 'service-not-allowed' || event.error === 'language-not-supported'
          ? 'この端末または言語では音声認識を利用できません。'
          : event.error === 'busy'
            ? '音声認識が別の処理で使用中です。少し待ってからお試しください。'
            : '音声入力を開始できませんでした。もう一度お試しください。',
    );
    setStatus('error');
  });

  useEffect(() => {
    if (status !== 'listening') {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse, status]);

  const startRecognition = () => {
    if (!speechModule) { setErrorMessage('この環境では音声認識を利用できません。Development Buildでお試しください。'); setStatus('error'); return; }
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
        if (!available) {
          setErrorMessage('この端末では音声認識を利用できません。Siriと音声入力の設定を確認してください。');
          setStatus('error');
          return;
        }
        // Use on-device recognition only when the installed native module reports
        // support. Otherwise let Apple's regular recognizer handle the request.
        const requiresOnDeviceRecognition = usesOnDeviceRecognition();
        speechModule.start({ lang: 'ja-JP', interimResults: true, continuous: false, maxAlternatives: 1, requiresOnDeviceRecognition });
      } catch {
        setErrorMessage('音声入力を開始できませんでした。もう一度お試しください。');
        setStatus('error');
      } finally {
        recognitionStartingRef.current = false;
      }
    })();
  };

  const routeResult = React.useCallback((result: VoiceParseResult) => {
    const handled = onRoute(result);
    if (handled && !usageConsumedRef.current) {
      usageConsumedRef.current = true;
      onRecognitionAccepted?.();
    }
    return handled;
  }, [onRecognitionAccepted, onRoute]);

  useEffect(() => {
    if (!visible) { routedRef.current = false; usageConsumedRef.current = false; autoStartRunRef.current = false; setPermissionReady(false); setStatus('idle'); setErrorMessage(undefined); setTranscript(''); setParsed(undefined); return; }
    let active = true;
    const checkPermissions = async (requestMissing: boolean) => {
      if (permissionCheckInFlightRef.current) return;
      permissionCheckInFlightRef.current = true;
      try {
        if (!speechModule) throw new Error('native-module-unavailable');
        const requiresSpeechPermission = Platform.OS === 'ios' && !usesOnDeviceRecognition();
        const readMicrophonePermission = async () => speechModule?.getMicrophonePermissionsAsync
          ? speechModule.getMicrophonePermissionsAsync()
          : Audio.getPermissionsAsync();
        const requestMicrophonePermission = async () => speechModule?.requestMicrophonePermissionsAsync
          ? speechModule.requestMicrophonePermissionsAsync()
          : Audio.requestPermissionsAsync();
        const readSpeechPermission = async () => requiresSpeechPermission
          ? (speechModule?.getSpeechRecognizerPermissionsAsync ? speechModule.getSpeechRecognizerPermissionsAsync() : speechModule!.getPermissionsAsync?.() ?? { granted: false, canAskAgain: true })
          : { granted: true, canAskAgain: false };
        const requestSpeechPermission = async () => requiresSpeechPermission
          ? (speechModule?.requestSpeechRecognizerPermissionsAsync ? speechModule.requestSpeechRecognizerPermissionsAsync() : speechModule!.requestPermissionsAsync())
          : { granted: true, canAskAgain: false };

        let microphonePermission = await readMicrophonePermission();
        let speechPermission = await readSpeechPermission();
        if (requestMissing && !microphonePermission.granted && microphonePermission.canAskAgain !== false) {
          await requestMicrophonePermission();
          await waitForRecognitionReady();
          microphonePermission = await readMicrophonePermission();
        }
        if (requestMissing && requiresSpeechPermission && !speechPermission.granted && speechPermission.canAskAgain !== false) {
          await requestSpeechPermission();
          await waitForRecognitionReady();
          speechPermission = await readSpeechPermission();
        }
        if (!active) return;
        const microphoneMissing = !microphonePermission.granted;
        const speechMissing = requiresSpeechPermission && !speechPermission.granted;
        if (microphoneMissing || speechMissing) {
          const microphoneBlocked = microphoneMissing && microphonePermission.canAskAgain === false;
          const speechBlocked = speechMissing && speechPermission.canAskAgain === false;
          const message = microphoneMissing && speechMissing
            ? microphoneBlocked || speechBlocked
              ? 'マイクと音声認識を許可してください。iPhoneの設定からRhythmPaceを開いて変更できます。'
              : 'マイクと音声認識の使用を許可してください。'
            : microphoneMissing
              ? 'マイクの使用を許可してください。iPhoneの設定からRhythmPaceを開いて変更できます。'
              : speechBlocked
                ? '音声認識の使用を許可してください。iPhoneの設定からRhythmPaceを開いて変更できます。'
                : '音声認識の使用を許可してください。';
          setPermissionReady(false);
          setErrorMessage(message);
          setStatus('error');
          return;
        }
        // Do not start while iOS is dismissing the permission dialog. The
        // user starts recognition explicitly from the modal microphone button.
        setPermissionReady(true);
        setErrorMessage(undefined);
        setStatus('idle');
      } catch {
        setPermissionReady(false);
        setErrorMessage('音声認識モジュールを利用できません。Development Buildを確認してください。');
        setStatus('error');
      } finally {
        permissionCheckInFlightRef.current = false;
      }
    };
    void checkPermissions(true);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void checkPermissions(false);
    });
    return () => { active = false; appStateSubscription.remove(); try { speechModule?.stop(); } catch { /* Expo Go has no native module. */ } };
  }, [dateKey, visible]);

  useEffect(() => {
    if (!visible || !autoStart || !permissionReady || autoStartRunRef.current || status !== 'idle') return;
    autoStartRunRef.current = true;
    startRecognition();
  }, [autoStart, permissionReady, status, visible]);

  useEffect(() => {
    if (!parsed || status !== 'processing') return;
    setStatus('recognized');
    if (parsed.intent !== 'ambiguous' && !routedRef.current) {
      const handled = routeResult(parsed);
      routedRef.current = handled;
    }
  }, [parsed, routeResult, status]);

  const chooseIntent = (intent: VoiceIntent) => {
    if (!parsed || intent === 'ambiguous') return;
    routedRef.current = routeResult({ ...parsed, intent });
  };
  const stop = () => { try { speechModule?.stop(); } catch { /* no-op */ } if (transcript && !parsed) { setParsed(parseVoiceInput(transcript, new Date(), dateKey)); setStatus('processing'); } };
  const statusLabel = status === 'listening' ? '聞き取り中…' : status === 'processing' ? '解析しています…' : status === 'recognized' ? '認識しました' : status === 'error' ? (errorMessage ?? '音声入力を利用できません') : '話してください';

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.backdrop} onPress={onClose}><Pressable style={[styles.sheet, { backgroundColor: background, borderColor: border }]} onPress={(event) => event.stopPropagation()}>
    <View style={styles.header}><Text style={[styles.title, { color: text }]}>何を登録する？</Text><Pressable onPress={onClose}><Text style={[styles.close, { color: muted }]}>閉じる</Text></Pressable></View>
    <Text style={[styles.status, { color: muted }]}>{statusLabel}</Text>
    {status === 'error' && errorMessage?.includes('設定') ? <Pressable accessibilityRole="button" onPress={() => { void Linking.openSettings().catch(() => undefined); }}><Text style={[styles.settingsLink, { color: accent }]}>設定を開く</Text></Pressable> : null}
    <Text accessibilityLiveRegion="polite" style={[styles.usage, { color: muted }]}>{isPremium ? 'Premium・音声入力 無制限' : `Free・今日あと${Math.max(0, remainingUses ?? 0)}回`}</Text>
    <View style={styles.micWrap}><Animated.View pointerEvents="none" style={[styles.micPulse, { borderColor: accent, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }] }]} /><Animated.View style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }}><Pressable accessibilityRole="button" accessibilityLabel={status === 'listening' ? '音声入力を停止' : '音声入力を開始'} onPress={status === 'listening' ? stop : startRecognition} style={[styles.mic, { backgroundColor: accent }]}>{status === 'processing' ? <ActivityIndicator color={onAccent} /> : <Text style={[styles.micGlyph, { color: onAccent }]}>⌕</Text>}</Pressable></Animated.View></View>
    {transcript ? <Text style={[styles.transcript, { color: text }]}>{transcript}</Text> : <Text style={[styles.example, { color: muted }]}>「明日の18時に美容院」{`\n`}「今日中に資料まとめる」</Text>}
    {parsed?.intent === 'ambiguous' ? <View style={styles.choiceWrap}><Text style={[styles.choiceTitle, { color: muted }]}>どこに登録する？</Text><View style={styles.choiceRow}>{INTENT_LABELS.map(([intent, label]) => <Pressable key={intent} onPress={() => chooseIntent(intent)} style={[styles.choice, { backgroundColor: surface, borderColor: border }]}><Text style={[styles.choiceText, { color: text }]}>{label}</Text></Pressable>)}</View></View> : null}
    <Pressable onPress={onClose} style={styles.cancel}><Text style={[styles.cancelText, { color: muted }]}>キャンセル</Text></Pressable>
  </Pressable></Pressable></Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)', padding: 14 },
  sheet: { borderWidth: 1, borderRadius: 24, padding: 20, paddingBottom: 26 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 19, fontWeight: '900' }, close: { fontSize: 12, fontWeight: '800' }, status: { textAlign: 'center', fontSize: 13, fontWeight: '800', marginTop: 16 }, settingsLink: { textAlign: 'center', fontSize: 12, fontWeight: '800', marginTop: 8, textDecorationLine: 'underline' }, usage: { textAlign: 'center', fontSize: 11, fontWeight: '700', marginTop: 5 }, micWrap: { alignSelf: 'center', width: 92, height: 92, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, micPulse: { position: 'absolute', width: 82, height: 82, borderRadius: 41, borderWidth: 2 }, mic: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' }, micGlyph: { fontSize: 33, fontWeight: '900', transform: [{ rotate: '-20deg' }] }, transcript: { textAlign: 'center', fontSize: 15, lineHeight: 22, fontWeight: '800', marginTop: 18 }, example: { textAlign: 'center', fontSize: 12, lineHeight: 19, marginTop: 18 }, choiceWrap: { marginTop: 18 }, choiceTitle: { fontSize: 12, fontWeight: '800', marginBottom: 8 }, choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: 38, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, choiceText: { fontSize: 12, fontWeight: '800' }, cancel: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, cancelText: { fontSize: 13, fontWeight: '800' },
});
