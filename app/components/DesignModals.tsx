import React, { useEffect, useState } from 'react';
import { AnalysisScreen } from '../AnalysisScreen';
import { WishScreen } from '../WishScreen';
import { BThemeRibbonDecoration } from './BThemeRibbonDecoration';
import { CThemeRibbonDecoration } from './CThemeRibbonDecoration';
import { MonoChicBackground, MonoLooseLeafBackground } from './MonoBackgrounds';
import { ChicPatternDecor, isCheckChicPattern } from './PatternDecor';
import { getMapSearchTarget } from '../features/departure/mapSearch';
import { designBackgroundAssets, designFloralAssets, designPatternChoices, isImageDesignPattern } from '../features/design/designAssets';
import { getChicPatternVisual, getNightSkyPalette } from '../features/design/designVisuals';
import { countdownToDate, dateForReminder, dateKey, deadlineLabel, formatLiveDate, formatLiveTime, todayInputValue } from '../features/schedule/dateTimeUtils';
import { getDepartureMoments, getPlanCountdownAt, normalizePlanDate, planDateKey } from '../features/schedule/scheduleConflict';
import { getLateRiskMessage, getUrgencyStatus } from '../features/tasks/taskUtils';
import { PlanTier, hasPremiumAccess } from '../premiumAccess';
import { HomeScreen } from '../screens/HomeScreen';
import { DesignAppliedPreview } from '../screens/SettingsScreen';
import { TimelineScreen } from '../screens/TimelineScreen';
import { styles } from '../styles/appStyles';
import { ChicCheckColor, ChicPattern, ChicThemePalette, DesignMode, getDesignCheckThemeTokens, getDesignPatternThemeTokens, getThemeTokens } from '../theme';
import { DeparturePlan, MonoPattern, MonthlyWishState, Task, WishMonthMap } from '../types';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { TodayWinStrip } from './TodayWinStrip';
import { ThemeColorSelector } from './SettingsControls';

export type DesignPreviewMode = 'minimal' | 'dark' | 'chic' | 'photo';

export type DesignTryOnSelection = {
  mode: DesignPreviewMode;
  pattern: ChicPattern;
  color: ChicCheckColor;
  photoUri?: string;
  monoAppearance: 'auto' | 'light' | 'dark';
  monoPattern: MonoPattern;
};

export const designPreviewStyles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,24,28,0.28)', paddingHorizontal: 12, paddingBottom: 14 },
  sheet: { width: '100%', maxWidth: 520, alignSelf: 'center', maxHeight: '92%', borderRadius: 22, backgroundColor: '#FFFFFF', padding: 18 },
  trialSheetContent: { paddingBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: '#7A6C86', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#282538', fontSize: 21, fontWeight: '900', marginTop: 5 },
  close: { color: '#777285', fontSize: 26, lineHeight: 26 },
  copy: { color: '#777285', fontSize: 12, lineHeight: 18, marginTop: 8 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  modeChip: { borderWidth: 1, borderColor: '#DDD7E3', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  modeChipActive: {},
  modeChipText: { color: '#777285', fontSize: 10, fontWeight: '800' },
  modeChipTextActive: {},
  patternRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  patternChip: { width: '31.5%', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E4DFE3', borderRadius: 8, paddingHorizontal: 5 },
  patternDot: { width: 10, height: 10, borderRadius: 5 },
  patternText: { flex: 1, color: '#777285', fontSize: 9, fontWeight: '800' },
  preview: { minHeight: 190, borderRadius: 16, marginTop: 14, padding: 18, overflow: 'hidden', justifyContent: 'center' },
  floralSoftPreviewCard: { width: '100%', minHeight: 260, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFDFD', justifyContent: 'center' },
  floralSoftPreviewImage: { width: '100%', height: 190 },
  floralSoftPreviewFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F0EB' },
  floralSoftPreviewNotice: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(255,253,253,0.96)' },
  floralSoftPreviewName: { color: '#443E39', fontSize: 16, fontWeight: '900' },
  floralSoftPreviewPremium: { fontSize: 12, fontWeight: '900', marginTop: 2 },
  floralSoftPreviewCopy: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  floralSoftPreviewError: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  photoBackground: { ...StyleSheet.absoluteFillObject, opacity: 0.7 },
  photoHint: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  primaryButton: { minHeight: 46, flex: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 },
  trialActionButton: { flex: 0, width: '100%' },
  trialHint: { fontSize: 11, lineHeight: 16, marginTop: 8, textAlign: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  secondaryButton: { minHeight: 46, flex: 1, borderRadius: 11, borderWidth: 1, borderColor: '#DDD7E3', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 },
  secondaryButtonText: { fontSize: 13, fontWeight: '900' },
  textButton: { alignItems: 'center', paddingVertical: 10 },
  textButtonText: { color: '#777285', fontSize: 12, fontWeight: '800' },
});

export function DesignPreviewModal({ visible, initialPattern, initialMode = 'chic', chicCheckColor, planTier, designCustomizePurchased = false, photoUri, onPickPhoto, onClose, onUse }: { visible: boolean; initialPattern?: ChicPattern; initialMode?: DesignPreviewMode; chicCheckColor: ChicCheckColor; planTier: PlanTier; designCustomizePurchased?: boolean; photoUri?: string; onPickPhoto: () => void; onClose: () => void; onUse: (mode: DesignPreviewMode, pattern?: ChicPattern) => void }) {
  const [mode, setMode] = useState<DesignPreviewMode>('chic');
  const [pattern, setPattern] = useState<ChicPattern>(initialPattern ?? 'plain');
  const [floralSoftPreviewStatus, setFloralSoftPreviewStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setPattern(initialPattern ?? 'plain');
    }
  }, [initialMode, initialPattern, visible]);
  const hasDesignAccess = planTier === 'premium' || designCustomizePurchased;
  const isFreeFloralSoftPreview = !hasDesignAccess && mode === 'chic' && pattern === 'floralSoft';
  const isLockedPremiumPattern = !hasDesignAccess && mode === 'chic' && pattern !== 'plain';
  useEffect(() => {
    if (!visible || !isFreeFloralSoftPreview) {
      setFloralSoftPreviewStatus('idle');
      return;
    }
    setFloralSoftPreviewStatus('loading');
    const timeout = setTimeout(() => {
      setFloralSoftPreviewStatus((current) => current === 'loaded' ? current : 'error');
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isFreeFloralSoftPreview, visible]);
  const palette = pattern === 'nightSky' ? getNightSkyPalette(getDesignCheckThemeTokens(chicCheckColor)) : getDesignCheckThemeTokens(chicCheckColor);
  const previewVisual = getChicPatternVisual(pattern, palette);
  const previewTokens = mode === 'chic'
    ? (pattern === 'nightSky' ? palette : getDesignPatternThemeTokens(pattern, chicCheckColor))
    : undefined;
  const uiPreview = mode === 'chic' && previewTokens
    ? { background: previewTokens.background, surface: previewTokens.cardSurface, soft: previewTokens.accentSoft, border: previewTokens.border, text: previewTokens.textPrimary, muted: previewTokens.textSecondary, accent: previewTokens.accent, accentStrong: previewTokens.accentStrong, onAccent: previewTokens.onAccent }
    : (() => { const colors = getThemeTokens(mode).colors; return { background: colors.screenBackground, surface: colors.surface, soft: colors.softAccent, border: colors.border, text: colors.primaryText, muted: colors.secondaryText, accent: colors.primaryAccent, accentStrong: colors.primaryAccent, onAccent: mode === 'dark' ? colors.screenBackground : '#FFFFFF' }; })();
  if (!visible) return null;
  return <>
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={designPreviewStyles.backdrop} onPress={onClose}>
      <Pressable style={[designPreviewStyles.sheet, { backgroundColor: uiPreview.surface, borderColor: uiPreview.border }]} onPress={(event) => event.stopPropagation()}>
        <View style={designPreviewStyles.header}><View><Text style={[designPreviewStyles.eyebrow, { color: uiPreview.accent }]}>見た目を確認</Text><Text style={[designPreviewStyles.title, { color: uiPreview.text }]}>見た目を試してみよう</Text></View><Pressable onPress={onClose} hitSlop={10}><Text style={[designPreviewStyles.close, { color: uiPreview.muted }]}>×</Text></Pressable></View>
        <Text style={[designPreviewStyles.copy, { color: uiPreview.muted }]}>実際のRhythm画面で、シンプル・デザイン・写真の見え方を確認できます。</Text>
        <View style={designPreviewStyles.modeRow}>
          {([{ id: 'minimal', label: 'ライト' }, { id: 'dark', label: 'ダーク' }, { id: 'chic', label: 'デザイン' }, { id: 'photo', label: '写真' }] as { id: DesignPreviewMode; label: string }[]).map((item) => <Pressable key={item.id} style={[designPreviewStyles.modeChip, { borderColor: uiPreview.border }, mode === item.id && { borderColor: uiPreview.accent, backgroundColor: uiPreview.soft }]} onPress={() => setMode(item.id)}><Text style={[designPreviewStyles.modeChipText, { color: uiPreview.muted }, mode === item.id && { color: uiPreview.accentStrong }]}>{item.label}</Text></Pressable>)}
        </View>
        {mode === 'chic' && <View style={designPreviewStyles.patternRow}>{designPatternChoices.map((item) => { const imageAsset = isImageDesignPattern(item.id) ? designBackgroundAssets[item.id] : undefined; return <Pressable key={item.id} style={[designPreviewStyles.patternChip, pattern === item.id && { borderColor: palette.accent, backgroundColor: palette.accentSoft }]} onPress={() => setPattern(item.id)}>{imageAsset ? <Image source={imageAsset.previewSource} resizeMode="contain" style={designPreviewStyles.patternDot} /> : <View style={[designPreviewStyles.patternDot, { backgroundColor: item.id === 'plain' ? palette.accent : getChicPatternVisual(item.id, palette).accent }]} />}<Text numberOfLines={1} style={[designPreviewStyles.patternText, pattern === item.id && { color: palette.accentStrong }]}>{item.label}</Text></Pressable>; })}</View>}
        <View style={[designPreviewStyles.preview, { backgroundColor: mode === 'photo' ? '#202020' : uiPreview.background, borderColor: uiPreview.border }]}>
          {isFreeFloralSoftPreview ? <View style={designPreviewStyles.floralSoftPreviewCard}>
            {floralSoftPreviewStatus !== 'loaded' && <View style={[StyleSheet.absoluteFillObject, designPreviewStyles.floralSoftPreviewFallback, { backgroundColor: uiPreview.soft }]}>{floralSoftPreviewStatus === 'error' ? <Text style={[designPreviewStyles.floralSoftPreviewError, { color: uiPreview.muted }]}>プレビューを表示できませんでした</Text> : <ActivityIndicator color={uiPreview.accent} />}</View>}
            <Image source={designFloralAssets.floralSoft.previewSource ?? designFloralAssets.floralSoft.source} resizeMode="contain" onLoadStart={() => setFloralSoftPreviewStatus('loading')} onLoad={() => setFloralSoftPreviewStatus('loaded')} onError={() => setFloralSoftPreviewStatus('error')} style={[designPreviewStyles.floralSoftPreviewImage, floralSoftPreviewStatus !== 'loaded' && { opacity: 0 }]} />
            <View style={[designPreviewStyles.floralSoftPreviewNotice, { backgroundColor: uiPreview.surface, borderTopColor: uiPreview.border }]}><Text style={[designPreviewStyles.floralSoftPreviewName, { color: uiPreview.text }]}>花柄2</Text><Text style={[designPreviewStyles.floralSoftPreviewPremium, { color: uiPreview.accent }]}>プレミアム限定デザイン</Text><Text style={[designPreviewStyles.floralSoftPreviewCopy, { color: uiPreview.muted }]}>このデザインを使うにはプレミアム登録が必要です</Text></View>
          </View> : <>
            {mode === 'chic' && (isImageDesignPattern(pattern) ? <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><Image source={designBackgroundAssets[pattern].source} resizeMode="contain" style={StyleSheet.absoluteFillObject} /></View> : <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><ChicPatternDecor pattern={pattern} accent={previewVisual.accent} warm={previewVisual.warm} checkColor={chicCheckColor} preview previewTopCrop={pattern === 'floralSoft'} /></View>)}
          {mode === 'photo' && photoUri ? <Image source={{ uri: photoUri }} resizeMode="cover" style={designPreviewStyles.photoBackground} /> : null}
          <TodayWinStrip
            tasks={[]}
            designMode={mode === 'dark' ? 'dark' : mode === 'chic' ? 'chic' : 'minimal'}
            chicPattern={pattern}
            chicPalette={palette}
            onRestore={() => undefined}
          />
          {mode === 'photo' && !photoUri && <Text style={designPreviewStyles.photoHint}>写真を選ぶと、ここに試着表示されます。選択だけでは保存されません。</Text>}
          </>}
        </View>
        {mode === 'photo' && <Pressable style={[designPreviewStyles.secondaryButton, { borderColor: uiPreview.border, backgroundColor: uiPreview.surface }]} onPress={onPickPhoto}><Text style={[designPreviewStyles.secondaryButtonText, { color: uiPreview.accent }]}>{photoUri ? '写真を選び直す' : '写真で試す'}</Text></Pressable>}
        {isLockedPremiumPattern && <Text style={[designPreviewStyles.trialHint, { color: uiPreview.muted }]}>試着だけではお試し時間は開始されません。</Text>}
        <View style={designPreviewStyles.actions}><Pressable style={[designPreviewStyles.secondaryButton, { borderColor: uiPreview.border, backgroundColor: uiPreview.surface }]} onPress={onClose}><Text style={[designPreviewStyles.secondaryButtonText, { color: uiPreview.accent }]} >閉じる</Text></Pressable><Pressable style={[designPreviewStyles.primaryButton, { backgroundColor: uiPreview.accent }]} onPress={() => { if (mode === 'photo' && !photoUri) { onPickPhoto(); return; } onUse(mode, mode === 'chic' ? pattern : undefined); }}><Text style={[designPreviewStyles.primaryButtonText, { color: uiPreview.onAccent }]}>{mode === 'photo' ? (photoUri ? 'この写真を使う' : '写真で試す') : 'このデザインを使う'}</Text></Pressable></View>
      </Pressable>
    </Pressable>
    </Modal>
  </>;
}

export function DesignTrialExpiredModal({ visible, trialAvailable = false, designMode, chicPalette, onClose, onDismiss, onPremium, onTrial, onReward }: { visible: boolean; trialAvailable?: boolean; designMode: DesignMode; chicPalette?: ChicThemePalette; onClose: () => void; onDismiss?: () => void; onPremium: () => void; onTrial: () => void; onReward: () => void }) {
  const colors = chicPalette && designMode === 'chic' ? { surface: chicPalette.cardSurface, border: chicPalette.border, text: chicPalette.textPrimary, muted: chicPalette.textSecondary, accent: chicPalette.accent, onAccent: chicPalette.onAccent } : (() => { const theme = getThemeTokens(designMode).colors; return { surface: theme.surface, border: theme.border, text: theme.primaryText, muted: theme.secondaryText, accent: theme.primaryAccent, onAccent: designMode === 'dark' ? theme.screenBackground : '#FFFFFF' }; })();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}><Pressable style={designPreviewStyles.backdrop} onPress={onClose}><Pressable style={[designPreviewStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={(event) => event.stopPropagation()}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={designPreviewStyles.trialSheetContent}><Text style={[designPreviewStyles.eyebrow, { color: colors.accent }]}>デザインカスタマイズ</Text><Text style={[designPreviewStyles.title, { color: colors.text }]}>{trialAvailable ? '24時間無料で試してみますか？' : 'デザインの利用期限が終了しました'}</Text><Text style={[designPreviewStyles.copy, { color: colors.muted }]}>{trialAvailable ? '広告なしで24時間、今試着しているデザインを使えます。' : '広告を1回見ると、デザインを3日間使えます。写真の解放条件は「写真を添える」で確認できます。購入すると期限なく利用できます。'}</Text>{trialAvailable ? <Pressable style={[designPreviewStyles.primaryButton, designPreviewStyles.trialActionButton, { backgroundColor: colors.accent }]} onPress={onTrial}><Text style={[designPreviewStyles.primaryButtonText, { color: colors.onAccent }]}>24時間無料で使う</Text></Pressable> : <Pressable style={[designPreviewStyles.primaryButton, designPreviewStyles.trialActionButton, { backgroundColor: colors.accent }]} onPress={onReward}><Text style={[designPreviewStyles.primaryButtonText, { color: colors.onAccent }]}>広告を見て3日間使う</Text></Pressable>}<Pressable style={[designPreviewStyles.secondaryButton, designPreviewStyles.trialActionButton, { borderColor: colors.border }]} onPress={onPremium}><Text style={[designPreviewStyles.secondaryButtonText, { color: colors.accent }]}>デザインカスタマイズを購入</Text></Pressable><Pressable style={designPreviewStyles.textButton} onPress={onClose}><Text style={[designPreviewStyles.textButtonText, { color: colors.muted }]}>あとで</Text></Pressable></ScrollView></Pressable></Pressable></Modal>;
}

export function DesignTryOnModal({ visible, initialMode, initialPattern, initialColor, initialMonoAppearance, initialMonoPattern, photoUri, topImageUris, focusBackgroundUri, wishState, wishMonths, previewComponents, previewHelpers, systemColorScheme, onClose, onApply }: {
  visible: boolean;
  initialMode: DesignPreviewMode;
  initialPattern: ChicPattern;
  initialColor: ChicCheckColor;
  initialMonoAppearance: 'auto' | 'light' | 'dark';
  initialMonoPattern: MonoPattern;
  photoUri?: string;
  topImageUris?: Partial<Record<'home' | 'timeline' | 'analysis' | 'wish' | 'settings', string>>;
  focusBackgroundUri?: string;
  wishState?: MonthlyWishState;
  wishMonths?: WishMonthMap;
  previewComponents?: any;
  previewHelpers?: any;
  systemColorScheme?: 'light' | 'dark' | null;
  onClose: () => void;
  onApply: (selection: DesignTryOnSelection) => void;
}) {
  const [mode, setMode] = useState<DesignPreviewMode>(initialMode);
  const { height: tryOnHeight } = useWindowDimensions();
  const [pattern, setPattern] = useState<ChicPattern>(initialPattern);
  const [color, setColor] = useState<ChicCheckColor>(initialColor);
  const [monoAppearance, setMonoAppearance] = useState<'auto' | 'light' | 'dark'>(initialMonoAppearance);
  const [monoPattern, setMonoPattern] = useState<MonoPattern>(initialMonoPattern);
  const [photoTarget, setPhotoTarget] = useState<'background' | 'home' | 'timeline' | 'analysis' | 'wish' | 'settings' | 'focus'>('background');
  const photoTargetLabel = photoTarget === 'home' ? '今日' : photoTarget === 'timeline' ? '予定' : photoTarget === 'analysis' ? '分析' : photoTarget === 'wish' ? '叶えたいこと' : photoTarget === 'settings' ? '設定' : photoTarget === 'focus' ? '集中タイマー' : '背景';
  useEffect(() => {
    if (!visible) return;
    setMode(initialMode); setPattern(initialPattern); setColor(initialColor);
    setMonoAppearance(initialMonoAppearance); setMonoPattern(initialMonoPattern);
    setPhotoTarget('background');
  }, [visible, initialColor, initialMode, initialMonoAppearance, initialMonoPattern, initialPattern]);
  const resolvedMonoMode: 'minimal' | 'dark' = monoAppearance === 'dark' ? 'dark' : monoAppearance === 'light' ? 'minimal' : systemColorScheme === 'dark' ? 'dark' : 'minimal';
  const homeMode: DesignMode = mode === 'photo' || mode === 'chic' ? 'chic' : resolvedMonoMode;
  const basePalette = getDesignCheckThemeTokens(color);
  const previewPalette = mode === 'chic' && pattern === 'nightSky' ? getNightSkyPalette(basePalette) : basePalette;
  const imageBackground = mode === 'chic' && isImageDesignPattern(pattern) ? designBackgroundAssets[pattern] : undefined;
  const selectedTopImageUri = photoTarget === 'background' || photoTarget === 'focus' ? undefined : topImageUris?.[photoTarget];
  const sampleNow = new Date();
  const sampleDate = dateKey(sampleNow);
  const sampleTasks: Task[] = [
    { id: '__design_tryon_current', title: '今日のタスクを確認', done: false, status: 'active', category: '仕事', priority: '中', scheduledDate: sampleDate, scheduledTime: '10:00', endAt: '10:30', bucket: 'now' },
    { id: '__design_tryon_later', title: '今日の用事', done: false, status: 'active', category: 'その他', priority: '低', scheduledDate: sampleDate, bucket: 'later' },
  ];
  const samplePlans: DeparturePlan[] = [{ id: '__design_tryon_plan', title: '予定', destination: '予定の場所', date: sampleDate, arrival: '14:00', travelMinutes: 15, preparationMinutes: 10, bufferMinutes: 5, planMode: 'arrival_reverse' }];
  const previewBackground = mode === 'photo' ? previewPalette.background : imageBackground?.background ?? (mode === 'chic' ? previewPalette.background : getThemeTokens(homeMode, color).colors.screenBackground);
  const renderBackground = mode === 'photo' && photoUri
    ? <><Image source={{ uri: photoUri }} resizeMode="cover" style={StyleSheet.absoluteFillObject} /><View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(15,20,28,0.34)' }]} /></>
    : imageBackground ? <Image source={imageBackground.source} resizeMode="contain" style={StyleSheet.absoluteFillObject} />
      : mode === 'chic' ? <ChicPatternDecor pattern={pattern} accent={previewPalette.accent} warm={previewPalette.accentSoft} checkColor={color} />
        : monoPattern === 'looseLeaf' ? <MonoLooseLeafBackground dark={homeMode === 'dark'} /> : monoPattern === 'chic' ? <MonoChicBackground dark={homeMode === 'dark'} /> : null;
  const previewSurfaceStyle = { flex: 1, paddingHorizontal: 16, paddingTop: 8 };
  const topImage = selectedTopImageUri ? <Image source={{ uri: selectedTopImageUri }} resizeMode="cover" style={{ width: '100%', height: 108, borderRadius: 16, marginBottom: 8 }} /> : null;
  const homePreview = <View pointerEvents="none" style={previewSurfaceStyle}>
    {topImage}
    <HomeScreen
      tasks={sampleTasks} allTasks={sampleTasks} now={sampleNow} designMode={homeMode} chicPalette={previewPalette} completionIcon="✓"
      selectionMode={false} selectedTaskIds={[]} onAdd={() => undefined} onOpenFocus={() => undefined} initialTab="now"
      onOpenTodayRecord={() => undefined} onOpenSchedule={() => undefined} onToggle={() => undefined} onToggleSubtask={() => undefined}
      onUpdateTaskList={() => undefined} onCompleteParent={() => undefined} onRestore={() => undefined} onEdit={() => undefined}
      onToggleSelection={() => undefined} onSelectionMode={() => undefined} onClearSelection={() => undefined} onCompleteSelected={() => undefined}
      onDeleteSelected={() => undefined} onDelete={() => undefined} onSkip={() => undefined} onRemoveRoutine={() => undefined}
      onDuplicate={() => undefined} onSaveTemplate={() => undefined} onPostpone={() => undefined} departurePlans={samplePlans} onBucket={() => undefined}
      styles={styles}
      renderTodayWinStrip={(todayTasks) => <TodayWinStrip tasks={todayTasks} designMode={homeMode} chicPattern={mode === 'chic' ? pattern : 'plain'} chicPalette={previewPalette} onRestore={() => undefined} />}
      helpers={{ deadlineLabel, getUrgencyStatus, getLateRiskMessage, dateForReminder, dateKey, formatLiveTime, isCheckChicPattern, todayInputValue, getThemeTokens: (design: DesignMode) => getThemeTokens(design, color) }}
    />
  </View>;
  const timelineHelpers = previewHelpers ?? { getThemeTokens: (design: DesignMode) => getThemeTokens(design, color), dateKey, planDateKey, hasPremiumAccess, formatLiveDate, formatLiveTime, getDepartureMoments, normalizePlanDate, countdownToDate, dateForReminder, getMapSearchTarget, openMapSearch: async () => undefined, getPlanCountdownAt, colors: previewPalette };
  const timelineComponents = previewComponents ?? {};
  const timelinePreview = <View pointerEvents="none" style={previewSurfaceStyle}>
    {topImage}
    <TimelineScreen
      plan={samplePlans[0]} plans={samplePlans} planEditorOpen={false} departureCheckIns={[]} departurePreparationStatuses={{}} behaviorEvents={[]} tasks={sampleTasks} now={sampleNow}
      designMode={homeMode} focusBackgroundUri={photoTarget === 'focus' ? focusBackgroundUri : undefined} initialTab={photoTarget === 'focus' ? 'focus' : 'departure'} chicPattern={mode === 'chic' ? pattern : 'plain'} chicPalette={previewPalette} planTier="premium" completionIcon="✓"
      focusCustomDurationMinutes={25} onFocusCustomDurationChange={() => undefined} focusVoiceRequest={undefined} focusPersistedState={undefined} onFocusStateChange={() => undefined} recoveryTargetPlanId={undefined}
      onChange={() => undefined} onSchedule={() => undefined} onScheduleUsed={() => undefined} onTimeTabChange={() => undefined} onOpenNewPlan={() => undefined} onClosePlanEditor={() => undefined} onImportCalendarEvent={() => false} onEdit={() => undefined} onSharePlan={() => undefined} onDelete={() => undefined} onEditTask={() => undefined} onDeleteTask={() => undefined} onTaskBucketChange={() => undefined} onPremium={() => undefined} onRecovery={() => undefined} onRecoveryOpened={() => undefined} onRecoveryClosed={() => undefined}
      onFocusCompleted={() => undefined} onFocusTaskFinished={() => undefined} onFocusStarted={() => undefined} onFocusNotificationPermission={async () => false} onFocusRunningChange={() => undefined} onFocusActivityChange={() => undefined} focusTimerActive={false} onFocusNavigationBlocked={() => undefined} onBehaviorEvent={() => undefined} onDeparted={() => undefined} onPreparationStarted={() => undefined} onStill={() => undefined}
      calendarMarks={{}} onSetCalendarMark={() => undefined} travelApps={[]} onOpenTravelAppSettings={() => undefined} hapticsEnabled={false} previewCustomDurationOpen={false} previewMode previewCalendarEvents={[]} previewCalendarOptions={[]} calendarImportCalendarIds={[]} calendarImportKnownCalendarIds={[]} onCalendarImportCalendarIdsChange={() => undefined} onCalendarImportKnownCalendarIdsChange={() => undefined} planEditorGuide={undefined} recoveryGuide={undefined} styles={styles} helpers={timelineHelpers} components={timelineComponents}
    />
  </View>;
  const analysisPreview = <View pointerEvents="none" style={previewSurfaceStyle}>
    {topImage}
    <AnalysisScreen events={[]} tasks={sampleTasks} onRemoveRoutine={() => undefined} routineArchives={[]} onResumeRoutine={() => undefined} onDeleteRoutineArchive={() => undefined} designMode={homeMode} planTier="premium" recordContent={null} onPremium={() => undefined} departurePlans={samplePlans} chicPalette={previewPalette} chicPattern={mode === 'chic' ? pattern : 'plain'} PatternDecor={ChicPatternDecor} onApplySuggestion={() => undefined} onAnalysisUsed={() => undefined} initialTab="records" previewKind="time" />
  </View>;
  const wishPreview = wishState ? <View pointerEvents="none" style={previewSurfaceStyle}>
    {topImage}
    <WishScreen designMode={homeMode} chicPattern={mode === 'chic' ? pattern : 'plain'} chicPalette={previewPalette} monthLabel={`${sampleNow.getFullYear()}年${sampleNow.getMonth() + 1}月`} state={wishState} wishMonths={wishMonths ?? {}} onSaveState={() => undefined} onCreateTaskFromAction={() => undefined} canCreateWish planTier="premium" affirmations={[]} affirmationCustomTexts={[]} onSaveAffirmation={() => undefined} onDeleteAffirmation={() => undefined} onSaveAffirmationCustomText={() => undefined} onDeleteAffirmationCustomText={() => undefined} canCreateWishAction topImageUri={selectedTopImageUri} onPremium={() => undefined} />
  </View> : homePreview;
  const settingsPreview = <View pointerEvents="none" style={previewSurfaceStyle}>
    <DesignAppliedPreview
      tab={mode === 'photo' ? 'photo' : mode === 'chic' ? 'chic' : 'mono'}
      selectedMode={homeMode}
      designMode={homeMode}
      systemColorScheme={systemColorScheme}
      monoAppearance={monoAppearance}
      monoPattern={monoPattern}
      chicPattern={mode === 'chic' ? pattern : 'plain'}
      chicCheckColor={color}
      chicPalette={previewPalette}
      photoTheme={{ imageUri: photoUri, topImageUris: { settings: selectedTopImageUri } } as any}
      previewPhotoUri={photoUri}
      topImageUriOverride={selectedTopImageUri}
      colors={{ background: previewBackground, surface: previewPalette.cardSurface, border: previewPalette.border, text: previewPalette.textPrimary, muted: previewPalette.textSecondary, accent: previewPalette.accent, soft: previewPalette.accentSoft, onAccent: previewPalette.onAccent }}
      styles={styles}
      helpers={{ getChicCheckColor: (value: ChicCheckColor) => getDesignCheckThemeTokens(value), getNightSkyPalette, getThemeTokens: (design: DesignMode, paletteId?: ChicCheckColor) => getThemeTokens(design, paletteId), getChicPatternVisual }}
      components={{ ChicPatternDecor, BThemeRibbonDecoration, CThemeRibbonDecoration }}
    />
  </View>;
  const previewContent = photoTarget === 'timeline' || photoTarget === 'focus' ? timelinePreview : photoTarget === 'analysis' ? analysisPreview : photoTarget === 'wish' ? wishPreview : photoTarget === 'settings' ? settingsPreview : homePreview;
  const applySelection = () => {
    const selection = { mode: mode === 'photo' ? 'photo' : mode, pattern: mode === 'chic' ? pattern : 'plain', color, photoUri, monoAppearance, monoPattern } as DesignTryOnSelection;
    // Close the try-on surface before opening the Trial/Rewarded/purchase
    // surface. The parent queues the next action until the outer Design Sheet
    // has received its native onDismiss; delaying this callback with another
    // InteractionManager task can leave the iOS modal transition suspended.
    onClose();
    onApply(selection);
  };
  const monoChoices: Array<{ id: MonoPattern; label: string }> = [{ id: 'plain', label: 'プレーン' }, { id: 'looseLeaf', label: 'ルーズリーフ' }, { id: 'chic', label: 'シック' }];
  return <SafeAreaView style={{ flex: 1, backgroundColor: previewBackground }}>{visible && <StatusBar style={homeMode === 'dark' || (mode === 'chic' && pattern === 'nightSky') ? 'light' : 'dark'} />}<View style={{ flex: 1, overflow: 'hidden' }}>
      {renderBackground}
      <View style={{ flex: 1 }}>
        <View style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: previewPalette.border, backgroundColor: previewPalette.cardSurface }}>
          <View><Text style={{ color: previewPalette.textPrimary, fontSize: 17, fontWeight: '900' }}>{photoTarget === 'background' ? '今日を試着' : `${photoTargetLabel}を試着`}</Text><Text style={{ color: previewPalette.textSecondary, fontSize: 11, marginTop: 2 }}>試着中・正式設定はまだ変更されません</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="試着を閉じる" onPress={onClose} style={{ minWidth: 42, minHeight: 42, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: previewPalette.accent, fontSize: 25 }}>×</Text></Pressable>
        </View>
        <View style={{ flex: 1 }}>{previewContent}</View>
        <View testID="design-tryon-controls" style={{ maxHeight: Math.min(260, Math.round(tryOnHeight * 0.36)), paddingTop: 8, paddingBottom: 8, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: previewPalette.border, backgroundColor: previewPalette.cardSurface }}>
          <ScrollView testID="design-tryon-options" nestedScrollEnabled keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 7, marginBottom: 8 }}>{(['minimal', 'chic', 'photo'] as const).map((tab) => { const active = tab === 'minimal' ? mode === 'minimal' || mode === 'dark' : mode === tab; return <Pressable key={tab} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setMode(tab === 'minimal' ? 'minimal' : tab)} style={{ flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: active ? previewPalette.accent : previewPalette.border, backgroundColor: active ? previewPalette.accentSoft : previewPalette.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: active ? previewPalette.accentStrong : previewPalette.textSecondary, fontSize: 12, fontWeight: '900' }}>{tab === 'minimal' ? 'シンプル' : tab === 'chic' ? 'デザイン' : '写真'}</Text></Pressable>; })}</View>
          {(mode === 'minimal' || mode === 'dark') && <><View style={{ flexDirection: 'row', gap: 7, marginBottom: 8 }}>{(['auto', 'light', 'dark'] as const).map((item) => <Pressable key={item} onPress={() => setMonoAppearance(item)} style={{ paddingHorizontal: 12, minHeight: 30, borderRadius: 9, borderWidth: 1, borderColor: monoAppearance === item ? previewPalette.accent : previewPalette.border, backgroundColor: monoAppearance === item ? previewPalette.accentSoft : previewPalette.surface, justifyContent: 'center' }}><Text style={{ color: monoAppearance === item ? previewPalette.accentStrong : previewPalette.textSecondary, fontSize: 11, fontWeight: '800' }}>{item === 'auto' ? '自動' : item === 'light' ? 'ライト' : 'ダーク'}</Text></Pressable>)}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>{monoChoices.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: monoPattern === item.id }} onPress={() => setMonoPattern(item.id)} style={{ width: 108, minHeight: 42, borderRadius: 10, borderWidth: monoPattern === item.id ? 2 : 1, borderColor: monoPattern === item.id ? previewPalette.accent : previewPalette.border, backgroundColor: previewPalette.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: monoPattern === item.id ? previewPalette.accentStrong : previewPalette.textSecondary, fontSize: 11, fontWeight: '800' }}>{item.label}</Text></Pressable>)}</ScrollView></>}
          {mode === 'chic' && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>{designPatternChoices.map((item) => { const active = pattern === item.id; const imageAsset = isImageDesignPattern(item.id) ? designBackgroundAssets[item.id] : undefined; const visual = getChicPatternVisual(item.id, previewPalette); return <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setPattern(item.id)} style={{ width: 106, minHeight: 58, borderRadius: 10, borderWidth: active ? 2 : 1, borderColor: active ? previewPalette.accent : previewPalette.border, overflow: 'hidden', backgroundColor: imageAsset?.background ?? visual.background }}>{imageAsset ? <Image source={imageAsset.previewSource} resizeMode="cover" style={{ width: '100%', height: 34 }} /> : <View style={{ width: '100%', height: 34, overflow: 'hidden' }}><ChicPatternDecor pattern={item.id} accent={visual.accent} warm={visual.warm} checkColor={color} preview previewTopCrop={item.id === 'floralSoft'} /></View>}<Text style={{ color: active ? previewPalette.accentStrong : previewPalette.textSecondary, fontSize: 10, fontWeight: '800', textAlign: 'center', paddingVertical: 4 }}>{item.label}</Text></Pressable>; })}</ScrollView>}
          {mode === 'photo' && <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, marginBottom: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: previewPalette.border, backgroundColor: previewPalette.surface }}>{photoUri ? <Image source={{ uri: photoUri }} resizeMode="cover" style={{ width: 54, height: 36, borderRadius: 7 }} /> : <View style={{ width: 54, height: 36, borderRadius: 7, backgroundColor: previewPalette.accentSoft }} />}<Text style={{ color: previewPalette.textSecondary, fontSize: 11, marginLeft: 9 }}>{photoUri ? '保存済み写真を試着中' : '写真を選ぶと試着できます'}</Text></View>}
          {mode === 'photo' && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 7 }}><Text style={{ color: previewPalette.textSecondary, fontSize: 10, alignSelf: 'center', marginRight: 2 }}>写真の表示：</Text>{([{ id: 'background', label: '背景' }, { id: 'home', label: '今日' }, { id: 'timeline', label: '予定' }, { id: 'analysis', label: '分析' }, { id: 'wish', label: '叶えたいこと' }, { id: 'settings', label: '設定' }, { id: 'focus', label: '集中タイマー' }] as const).map((item) => { const active = photoTarget === item.id; const available = item.id === 'background' ? Boolean(photoUri) : item.id === 'focus' ? Boolean(focusBackgroundUri) : Boolean(topImageUris?.[item.id]); return <Pressable key={item.id} disabled={!available} onPress={() => setPhotoTarget(item.id)} style={{ minHeight: 30, paddingHorizontal: 10, borderRadius: 9, borderWidth: active ? 2 : 1, borderColor: active ? previewPalette.accent : previewPalette.border, backgroundColor: active ? previewPalette.accentSoft : previewPalette.surface, opacity: available ? 1 : 0.45, justifyContent: 'center' }}><Text style={{ color: active ? previewPalette.accentStrong : previewPalette.textSecondary, fontSize: 10, fontWeight: '800' }}>{item.label}</Text></Pressable>; })}</ScrollView>}
          {mode !== 'minimal' && mode !== 'dark' && <ThemeColorSelector color={color} onChange={setColor} designMode="chic" />}
          </ScrollView>
          <Pressable accessibilityRole="button" accessibilityLabel={mode === 'photo' && !photoUri ? '写真を選んで試す' : 'このデザインを使う'} onPress={applySelection} style={{ minHeight: 44, borderRadius: 12, marginTop: 6, backgroundColor: previewPalette.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: previewPalette.onAccent, fontSize: 13, fontWeight: '900' }}>{mode === 'photo' && !photoUri ? '写真を選んで試す' : 'このデザインを使う'}</Text></Pressable>
        </View>
      </View>
    </View></SafeAreaView>;
}
