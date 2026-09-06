import React, { useState } from 'react';
import { Alert, DevSettings, Image, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChicCheckColor, ChicPattern, ChicThemePalette, DesignMode, getDesignCheckColorLabel, getThemeTokens } from '../theme';
import { Affirmation, AffirmationCustomText, DevDesignCustomizeOverride, LiveActivityCustomizationSettings, LiveActivityDisplayOptions, PhotoThemePhotoTarget, PhotoThemeSettings, Task, WidgetSettings, WidgetSize, WidgetType } from '../types';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { PremiumTaskTemplate } from '../taskTemplates';
import { PhotoThemeSettingsCard } from '../components/PhotoThemeSettingsCard';
import { TravelAppsSettingsCard } from '../components/TravelAppsSettingsCard';
import { TravelAppSettings } from '../features/travel/travelApps';
import { STORAGE_KEY } from '../storage/rhythmState';
import { ONBOARDING_STORAGE_KEY } from '../features/onboarding/onboardingStorage';
import { REWARDED_ACCESS_STORAGE_KEY } from '../features/ads/rewardedAccessStorage';
import { WidgetSettingsCard } from '../components/WidgetSettingsCard';
import type { WidgetEntitlementOverride } from '../features/widget/widgetSettings';
import { LiveActivitySettingsSheet } from '../components/LiveActivitySettingsSheet';

// Keep the production unit configurable without scattering IDs through the UI.
// Development builds use Google's test unit unless an explicit test/production
// override is supplied by the build environment.
const isProductionAds = process.env.EXPO_PUBLIC_RHYTHM_ADS_ENV === 'production' || process.env.RHYTHM_ADS_ENV === 'production';
const SETTINGS_BANNER_AD_UNIT_ID = process.env.EXPO_PUBLIC_RHYTHM_BANNER_AD_UNIT_ID ?? (isProductionAds ? undefined : TestIds.BANNER);

function LiveActivityDisplayOptionsCard({ options, onChange, colors, isDark }: { options: LiveActivityDisplayOptions; onChange: (next: LiveActivityDisplayOptions) => void; colors: { surface: string; border: string; text: string; muted: string; accent: string; soft: string; onAccent: string }; isDark: boolean }) {
  const labels: Array<[keyof LiveActivityDisplayOptions, string]> = [
    ['currentTask', '今はこれ'],
    ['nextSchedule', '次の予定'],
    ['departureCountdown', '出発カウントダウン'],
    ['focusRemaining', '集中の残り時間'],
    ['affirmation', 'アファメーション'],
  ];
  const toggle = (key: keyof LiveActivityDisplayOptions) => {
    if (options[key] && Object.values(options).filter(Boolean).length <= 1) {
      Alert.alert('表示する内容', '1つ以上選択してください');
      return;
    }
    onChange({ ...options, [key]: !options[key] });
  };
  return <View style={{ marginTop: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '900' }}>表示する内容</Text>
    <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }}>PremiumのLive Activityで表示する情報を選べます。</Text>
    {labels.map(([key, label]) => <View key={key} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 7, paddingTop: 7 }}><Text style={{ flex: 1, color: colors.text, fontSize: 12, fontWeight: '700' }}>{label}</Text><Switch value={options[key]} onValueChange={() => toggle(key)} trackColor={{ false: isDark ? '#40506A' : colors.border, true: colors.accent }} thumbColor={options[key] ? colors.onAccent : (isDark ? '#8F9BB0' : '#FFFFFF')} /></View>)}
  </View>;
}

function DesignCustomizeCard({ designMode, chicPalette, planTier, purchased, localizedPrice, priceStatus, onOpen, onTry }: { designMode: DesignMode; chicPalette?: ChicThemePalette; planTier: PlanTier; purchased: boolean; localizedPrice?: string; priceStatus?: 'loading' | 'ready' | 'unavailable'; onOpen?: () => void; onTry: () => void }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const colors = designMode === 'chic' && chicPalette
    ? { surface: chicPalette.cardSurface, border: chicPalette.border, text: chicPalette.textPrimary, muted: chicPalette.textSecondary, accent: chicPalette.accent, soft: chicPalette.accentSoft, onAccent: chicPalette.onAccent }
    : { surface: theme.colors.surface, border: theme.colors.border, text: theme.colors.primaryText, muted: theme.colors.secondaryText, accent: theme.colors.primaryAccent, soft: theme.colors.softAccent, onAccent: designMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF' };
  return <View style={{ marginTop: 14, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>Design Customize</Text>
    {planTier === 'premium' ? <Text style={{ color: colors.accent, marginTop: 6, fontSize: 12, fontWeight: '800' }}>Premiumで利用できます</Text> : purchased ? <Text style={{ color: colors.accent, marginTop: 6, fontSize: 12, fontWeight: '800' }}>購入済み</Text> : <>
      <Text style={{ color: colors.muted, marginTop: 6, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>RhythmPaceの見た目を、もっと自分らしく。{ '\n' }花柄・チェック・ドット・写真カスタマイズを買い切りで利用できます。Widgetごとに写真レイアウトも設定できます。</Text>
      <Text style={{ color: colors.accent, marginTop: 8, fontSize: 14, fontWeight: '900' }}>{priceStatus === 'loading' ? '価格を取得中…' : localizedPrice ? `買い切り ${localizedPrice}` : '価格は購入画面で確認'}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 11 }}>
        <Pressable onPress={onTry} style={{ flex: 1, minHeight: 40, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.accent, fontSize: 12, fontWeight: '900' }}>試してみる</Text></Pressable>
        <Pressable onPress={onOpen} style={{ flex: 1, minHeight: 40, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.onAccent, fontSize: 12, fontWeight: '900' }}>購入画面を開く</Text></Pressable>
      </View>
      <Text style={{ color: colors.muted, marginTop: 8, fontSize: 10, lineHeight: 15 }}>広告やお試しで無料で試すこともできます。</Text>
    </>}
    {planTier === 'premium' || purchased ? <Text style={{ color: colors.muted, marginTop: 6, fontSize: 11 }}>Design / Photoの見た目機能を利用できます。</Text> : null}
  </View>;
}

export function SettingsScreen({
  tasks,
  timeline,
  now,
  dangerousTask,
  size,
  showCompleted,
  completionIcon,
  designMode,
  selectedDesignMode,
  monoAppearance,
  monoPattern,
  hapticsEnabled,
  premiumTrialReminderEnabled = true,
  liveActivityEnabled = false,
  liveActivityDisplayOptions,
  onLiveActivityDisplayOptionsChange,
  liveActivityCustomization,
  onLiveActivityCustomizationChange,
  chicPalette,
  chicPattern,
  chicCheckColor,
  affirmations,
  affirmationCustomTexts,
  photoTheme,
  travelApps,
  widgetSettings,
  onPickWidgetPhoto,
  onUnlockWidgetPhoto,
  onRemoveWidgetPhotoBackground,
  widgetPhotoUnlock,
  entitlementsResolved,
  onRemoveAffirmationPhoto,
  onWidgetGuide,
  onRefreshWidget,
  onWidgetSectionOpened,
  onSize,
  onWidgetSettings,
  onShowCompleted,
  onCompletionIcon,
  onDesignMode,
  onMonoAppearance,
  onMonoPattern,
  onHapticsEnabled,
  onPremiumTrialReminderEnabled,
  onLiveActivityEnabled,
  onReview,
  onChicPattern,
  onDesignPreview,
  onChicCheckColor,
  onSaveAffirmation,
  onDeleteAffirmation,
  onSaveAffirmationCustomText,
  onDeleteAffirmationCustomText,
  onPickPhotoTheme,
  onAdjustPhotoTheme,
  onClearPhotoTheme,
  onTravelAppsChange,
  templates,
  savedTemplates,
  onAddTemplate,
  onDeleteTemplate,
  onGuide,
  onPremium,
  onDeleteSavedTemplate,
  onOpenCaptureStudio,
  designCustomizePurchased = false,
  widgetPlanTier,
  widgetDesignCustomizePurchased,
  widgetEntitlementOverride,
  onWidgetEntitlementOverrideChange,
  devDesignCustomizeOverride = 'actual',
  storeDesignCustomizeAccess = false,
  onDevDesignCustomizeOverrideChange,
  onResetDesignCustomizeOverride,
  onResetWidgetPhotoUnlock,
  designCustomizePrice,
  designCustomizePriceStatus,
  onOpenDesignCustomize,
  initialAppearanceOpen = false,
  captureDesignOnly = false,
  planTier,
  styles,
  helpers,
  components,
}: {
  tasks: Task[];
  timeline: { start: string; leave: string; arrival: string };
  now: Date;
  dangerousTask?: Task;
  size: WidgetSize;
  showCompleted: boolean;
  completionIcon: string;
  designMode: DesignMode;
  /** Persisted mode used for selection labels; designMode is the effective visual mode. */
  selectedDesignMode?: DesignMode;
  monoAppearance: 'auto' | 'light' | 'dark';
  monoPattern: 'plain' | 'looseLeaf' | 'chic';
  hapticsEnabled: boolean;
  premiumTrialReminderEnabled?: boolean;
  liveActivityEnabled?: boolean;
  chicPalette?: ChicThemePalette;
  chicPattern: ChicPattern;
  chicCheckColor: ChicCheckColor;
  affirmations: Affirmation[];
  affirmationCustomTexts: AffirmationCustomText[];
  photoTheme: PhotoThemeSettings;
  travelApps: TravelAppSettings;
  widgetSettings: WidgetSettings;
  onPickWidgetPhoto?: (widgetType?: WidgetType, override?: WidgetEntitlementOverride) => void;
  onUnlockWidgetPhoto?: (widgetType: WidgetType, override?: WidgetEntitlementOverride) => void;
  onRemoveWidgetPhotoBackground?: (widgetType: WidgetType, override?: WidgetEntitlementOverride) => Promise<boolean>;
  widgetPhotoUnlock?: { widgetType: WidgetType | null; expiresAt: string | null };
  entitlementsResolved?: boolean;
  onRemoveAffirmationPhoto?: (index?: number) => void;
  onWidgetGuide?: () => void;
  onRefreshWidget?: () => void;
  onWidgetSectionOpened?: () => void;
  onSize: (size: WidgetSize) => void;
  onWidgetSettings: (settings: WidgetSettings) => void;
  onShowCompleted: (value: boolean) => void;
  onCompletionIcon: (icon: string) => void;
  onDesignMode: (mode: DesignMode) => void;
  onMonoAppearance: (appearance: 'auto' | 'light' | 'dark') => void;
  onMonoPattern: (pattern: 'plain' | 'looseLeaf' | 'chic') => void;
  onHapticsEnabled: (value: boolean) => void;
  onPremiumTrialReminderEnabled?: (value: boolean) => void;
  onLiveActivityEnabled?: (value: boolean) => void;
  liveActivityDisplayOptions?: LiveActivityDisplayOptions;
  onLiveActivityDisplayOptionsChange?: (value: LiveActivityDisplayOptions) => void;
  liveActivityCustomization?: LiveActivityCustomizationSettings;
  onLiveActivityCustomizationChange?: (value: LiveActivityCustomizationSettings) => void;
  onReview: () => void;
  onChicPattern: (pattern: ChicPattern) => void;
  onDesignPreview: (pattern: ChicPattern) => void;
  onChicCheckColor: (color: ChicCheckColor) => void;
  onSaveAffirmation: (affirmation: Affirmation) => Promise<void> | void;
  onDeleteAffirmation: (affirmation: Affirmation) => Promise<void> | void;
  onSaveAffirmationCustomText: (text: AffirmationCustomText) => void;
  onDeleteAffirmationCustomText: (id: string) => void;
  onPickPhotoTheme: (target: PhotoThemePhotoTarget) => void;
  onAdjustPhotoTheme: (target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>) => void;
  onClearPhotoTheme: (target: PhotoThemePhotoTarget) => void;
  onTravelAppsChange: (settings: TravelAppSettings) => void;
  templates: string[];
  savedTemplates: PremiumTaskTemplate[];
  onAddTemplate: (title: string) => void;
  onDeleteTemplate: (title: string) => void;
  onGuide: () => void;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onDeleteSavedTemplate: (template: PremiumTaskTemplate) => void;
  onOpenCaptureStudio?: () => void;
  designCustomizePurchased?: boolean;
  widgetPlanTier?: PlanTier;
  widgetDesignCustomizePurchased?: boolean;
  widgetEntitlementOverride?: WidgetEntitlementOverride;
  onWidgetEntitlementOverrideChange?: (override: WidgetEntitlementOverride) => void;
  /** DEV-only app-level Design Customize QA override. */
  devDesignCustomizeOverride?: DevDesignCustomizeOverride;
  storeDesignCustomizeAccess?: boolean;
  onDevDesignCustomizeOverrideChange?: (override: DevDesignCustomizeOverride) => void;
  onResetDesignCustomizeOverride?: () => void;
  onResetWidgetPhotoUnlock?: () => void;
  designCustomizePrice?: string;
  designCustomizePriceStatus?: 'loading' | 'ready' | 'unavailable';
  onOpenDesignCustomize?: () => void;
  /** Opens the appearance section for the first-run design choice. */
  initialAppearanceOpen?: boolean;
  /** Development capture only: stop after the production design selector. */
  captureDesignOnly?: boolean;
  planTier: PlanTier;
  styles: any;
  helpers: any;
  components: any;
}) {
  const { getChicPatternVisual, hasPremiumAccess, getChicCheckColor, countdownToClock, getUrgencyStatus, getNextBestAction, designModes, completionIcons, summarizePremiumTaskTemplate } = helpers;
  const { BThemeRibbonDecoration, CThemeRibbonDecoration, ChicPatternDecor, ChicPatternSelector, ThemeColorSelector, SettingsDisclosure, NotificationManagerCard } = components;
  const [newTemplate, setNewTemplate] = useState('');
  const [liveActivitySettingsOpen, setLiveActivitySettingsOpen] = useState(false);
  const selectedMode = selectedDesignMode ?? designMode;
  const isDark = designMode === 'dark';
  const isDesign = selectedMode === 'chic' || selectedMode === 'photo';
  const isMono = selectedMode === 'minimal' || selectedMode === 'dark';
  const canUseMonoPaidPattern = planTier === 'premium' || designCustomizePurchased;
  const effectiveMonoPattern = (monoPattern === 'looseLeaf' || monoPattern === 'chic') && canUseMonoPaidPattern ? monoPattern : 'plain';
  const [expandedSetting, setExpandedSetting] = useState<'appearance' | 'travelApps' | 'notifications' | 'quick' | 'widget' | 'premium' | 'about' | null>(captureDesignOnly || initialAppearanceOpen ? 'appearance' : null);
  const previewTasks = tasks.filter((task) => showCompleted || !task.done).slice(0, size === 'small' ? 2 : 3);
  const isCheckPattern = chicPattern === 'checkLavenderSatin' || chicPattern === 'checkBeigeNoir' || chicPattern === 'checkMauveFrame';
  const patternVisual = isCheckPattern ? getChicCheckColor(chicCheckColor) : getChicPatternVisual(chicPattern, chicPalette);
  const checkColorLabel = getDesignCheckColorLabel(chicCheckColor);
  // Pass the effective Design palette through so Night Sky settings controls
  // do not fall back to the default cool theme before their local overrides.
  const baseTheme = helpers.getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const guideColors = isDesign && chicPalette ? {
    surface: chicPalette.cardSurface,
    border: chicPalette.border,
    textPrimary: chicPalette.textPrimary,
    textSecondary: chicPalette.textSecondary,
    accent: chicPalette.accent,
    onAccent: chicPalette.onAccent,
  } : {
    surface: baseTheme.surface,
    border: baseTheme.border,
    textPrimary: baseTheme.primaryText,
    textSecondary: baseTheme.secondaryText,
    accent: baseTheme.primaryAccent,
    onAccent: '#FFFFFF',
  };
  const resetDevelopmentData = () => {
    Alert.alert(
      '初回起動状態に戻す',
      'この端末のRhythm保存データ、Onboarding、Rewarded状態を削除して再起動します。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '初期化する',
          style: 'destructive',
          onPress: () => {
            void AsyncStorage.multiRemove([
              STORAGE_KEY,
              ONBOARDING_STORAGE_KEY,
              REWARDED_ACCESS_STORAGE_KEY,
            ]).then(() => DevSettings.reload());
          },
        },
      ],
    );
  };
  return (
    <>
      {__DEV__ && !captureDesignOnly && <View style={[styles.settingsCard, isDark && styles.darkSurface]}>
        <Text style={[styles.settingsTitle, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>開発用確認環境</Text>
        <Text style={[styles.switchCopy, isDark && styles.darkAccentText, isDesign && chicPalette && { color: guideColors.accent }]}>開発用の固定プランで動作を確認できます。</Text>
        <Text style={[styles.devPlanCurrent, isDark && styles.darkAccentText, isDesign && chicPalette && { color: guideColors.accent }]}>現在：{planTier === 'premium' ? 'Premium版' : '無料版'}</Text>
        <Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }, { marginTop: 12 }]}>Design Customize</Text>
        <Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }, { marginTop: 4 }]}>StoreKit：{storeDesignCustomizeAccess ? '購入済み' : '未購入'} ／ アプリ確認：{devDesignCustomizeOverride === 'actual' ? '実際の状態' : devDesignCustomizeOverride === 'free' ? '未購入として確認中' : '購入済みとして確認中'}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          {([
            ['actual', '実際の購入状態'],
            ['free', '未購入として確認'],
            ['purchased', '購入済みとして確認'],
          ] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: devDesignCustomizeOverride === value }} onPress={() => onDevDesignCustomizeOverrideChange?.(value)} style={{ flex: 1, minHeight: 38, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1, borderColor: devDesignCustomizeOverride === value ? (isDark ? '#B4C0D4' : '#7559E8') : (isDark ? '#40506A' : '#D8DCE5'), backgroundColor: devDesignCustomizeOverride === value ? (isDark ? '#40506A' : '#EEE9FF') : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Text numberOfLines={2} style={{ textAlign: 'center', color: isDark ? '#F4F7FC' : '#33415D', fontSize: 10, fontWeight: '800' }}>{label}</Text></Pressable>)}
        </View>
        <Pressable onPress={onResetDesignCustomizeOverride} style={{ minHeight: 42, marginTop: 10, borderRadius: 11, borderWidth: 1, borderColor: isDark ? '#8F9BB0' : '#C9D0DD', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: isDark ? '#F4F7FC' : '#33415D', fontSize: 12, fontWeight: '800' }}>Design Customize状態をリセット</Text></Pressable>
        <Pressable onPress={onResetWidgetPhotoUnlock} style={{ minHeight: 42, marginTop: 10, borderRadius: 11, borderWidth: 1, borderColor: isDark ? '#8F9BB0' : '#C9D0DD', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: isDark ? '#F4F7FC' : '#33415D', fontSize: 12, fontWeight: '800' }}>Widget広告状態をリセット</Text></Pressable>
        {onOpenCaptureStudio ? <Pressable onPress={onOpenCaptureStudio} style={{ minHeight: 42, marginTop: 10, borderRadius: 11, backgroundColor: isDark ? '#40506A' : '#EEF1F7', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: isDark ? '#F4F7FC' : '#33415D', fontSize: 12, fontWeight: '800' }}>Onboarding Capture Studio</Text></Pressable> : null}
        <Pressable onPress={resetDevelopmentData} style={{ minHeight: 42, marginTop: 10, borderRadius: 11, borderWidth: 1, borderColor: isDark ? '#8F9BB0' : '#C9D0DD', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: isDark ? '#F4F7FC' : '#33415D', fontSize: 12, fontWeight: '800' }}>初回起動状態に戻す</Text></Pressable>
      </View>}
      <SettingsDisclosure designMode={designMode} chicPalette={chicPalette} title="見た目" subtitle="Mono / Design / 写真を選ぶ" expanded={expandedSetting === 'appearance'} onPress={() => setExpandedSetting((current) => current === 'appearance' ? null : 'appearance')}>
      <View accessibilityLabel={isDesign ? `Design ${checkColorLabel}` : 'Mono'} style={[styles.modeCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
        {selectedMode === 'chic' && chicPattern === 'checkLavenderSatin' && <BThemeRibbonDecoration compact />}
        {selectedMode === 'chic' && chicPattern === 'checkBeigeNoir' && <CThemeRibbonDecoration compact />}
        {selectedMode === 'chic' && <ChicPatternSelector designMode={designMode} chicPattern={chicPattern} chicCheckColor={chicCheckColor} planTier={planTier} designCustomizePurchased={designCustomizePurchased} onPattern={onChicPattern} onCheckColor={onChicCheckColor} onPremium={onPremium} onPreview={onDesignPreview} />}
        <View style={styles.modeChoices}>
          {designModes.map((mode: { id: 'minimal' | 'chic'; description: string }) => (
            <Pressable key={mode.id} style={[styles.modeChoice, (selectedMode === mode.id || (mode.id === 'minimal' && selectedMode === 'dark')) && styles.modeChoiceActive, mode.id === 'minimal' && selectedMode === 'dark' && styles.modeChoiceActiveDark, mode.id === 'minimal' && selectedMode === 'minimal' && !isDark && { borderColor: baseTheme.primaryAccent, backgroundColor: baseTheme.softAccent }, mode.id === 'chic' && selectedMode === 'chic' && chicPalette && { borderColor: chicPalette.accent, backgroundColor: chicPalette.cardTint }]} onPress={() => onDesignMode(mode.id === 'minimal' && selectedMode === 'dark' ? 'dark' : mode.id)}>
              <View style={[styles.modeMiniPreview, mode.id === 'minimal' && styles.modeMiniMinimal, isDark && mode.id === 'minimal' && styles.modeMiniMinimalDark, mode.id === 'chic' && styles.modeMiniChic, ]}>
                {mode.id === 'minimal' ? <><View style={[styles.modeMiniBlackBlock, isDark && styles.modeMiniDarkBlock]} />{effectiveMonoPattern === 'looseLeaf' && <>{[0, 1, 2].map((index) => <View key={`mini-line-${index}`} style={{ position: 'absolute', left: 8, right: 8, top: 14 + index * 16, height: 1, backgroundColor: isDark ? 'rgba(190,200,220,0.22)' : 'rgba(120,110,90,0.18)' }} />)}<View style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 1, backgroundColor: isDark ? 'rgba(220,150,160,0.28)' : 'rgba(190,120,125,0.28)' }} /></>}{effectiveMonoPattern === 'chic' && <><View style={{ position: 'absolute', left: -20, top: 25, width: 150, height: 22, backgroundColor: isDark ? 'rgba(42,61,86,0.7)' : 'rgba(210,208,199,0.6)', transform: [{ rotate: '-24deg' }] }} /><View style={{ position: 'absolute', right: 18, top: 10, width: 3, height: 3, borderRadius: 2, backgroundColor: isDark ? '#DDBB70' : '#806B3D' }} /><View style={{ position: 'absolute', right: 25, top: 16, width: 3, height: 3, borderRadius: 2, backgroundColor: isDark ? '#DDBB70' : '#806B3D' }} /></>}<Text style={[styles.modeMiniNumber, isDark && styles.modeMiniDarkNumber]}>03</Text><View style={[styles.modeMiniLine, isDark && styles.modeMiniDarkLine]} /></> : <>{selectedMode === 'chic' && <ChicPatternDecor pattern={chicPattern} accent={patternVisual.accent} warm={patternVisual.warm} checkColor={chicCheckColor} preview />}<View style={styles.modeMiniGlass} /><Text style={styles.modeMiniSparkle}>✦</Text></>}
              </View>
              <Text style={[styles.modeName, (selectedMode === mode.id || (mode.id === 'minimal' && selectedMode === 'dark')) && styles.modeNameActive, mode.id === 'minimal' && selectedMode === 'minimal' && !isDark && { color: baseTheme.primaryAccent }, mode.id === 'minimal' && selectedMode === 'dark' && styles.modeNameDark, mode.id === 'chic' && selectedMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{mode.id === 'minimal' ? 'Mono' : 'Design'}</Text>
              <Text style={[styles.modeDescription, isDark && styles.darkAccentText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>{mode.description}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {isMono && <View style={[styles.settingsCard, isDark && styles.darkSurface, { marginTop: 8, marginBottom: 20 }]}>
        <Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>Monoの設定</Text>
        <Text style={[styles.fieldLabel, isDark && styles.darkAccentText, { marginTop: 10 }]}>カラー</Text>
        <View style={[styles.monoThemeChoices, { marginTop: 6, gap: 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Mono 自動" accessibilityState={{ selected: monoAppearance === 'auto' }} style={[styles.monoThemeChoice, { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' }, monoAppearance === 'auto' && styles.monoThemeChoiceActive]} onPress={() => { onDesignMode('minimal'); onMonoAppearance('auto'); }}><Text style={[styles.monoThemeChoiceText, monoAppearance === 'auto' && styles.monoThemeChoiceTextActive]}>自動</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Mono 白" accessibilityState={{ selected: selectedMode === 'minimal' && monoAppearance === 'light' }} style={[styles.monoThemeChoice, { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' }, selectedMode === 'minimal' && monoAppearance === 'light' && styles.monoThemeChoiceActive]} onPress={() => { onDesignMode('minimal'); onMonoAppearance('light'); }}><Text style={[styles.monoThemeChoiceText, selectedMode === 'minimal' && monoAppearance === 'light' && styles.monoThemeChoiceTextActive]}>白</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Mono 黒" accessibilityState={{ selected: designMode === 'dark' && monoAppearance === 'dark' }} style={[styles.monoThemeChoice, { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' }, designMode === 'dark' && monoAppearance === 'dark' && styles.monoThemeChoiceActiveDark]} onPress={() => { onDesignMode('dark'); onMonoAppearance('dark'); }}><Text style={[styles.monoThemeChoiceText, designMode === 'dark' && monoAppearance === 'dark' && styles.monoThemeChoiceTextActive]}>黒</Text></Pressable>
        </View>
        <Text style={[styles.fieldLabel, isDark && styles.darkAccentText, { marginTop: 14 }]}>背景</Text>
        <View style={[styles.monoThemeChoices, { marginTop: 6, gap: 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Mono プレーン" accessibilityState={{ selected: effectiveMonoPattern === 'plain' }} style={[styles.monoThemeChoice, { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' }, effectiveMonoPattern === 'plain' && styles.monoThemeChoiceActive]} onPress={() => onMonoPattern('plain')}><Text style={[styles.monoThemeChoiceText, effectiveMonoPattern === 'plain' && styles.monoThemeChoiceTextActive]}>プレーン</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Mono ルーズリーフ" accessibilityState={{ selected: effectiveMonoPattern === 'looseLeaf', disabled: !canUseMonoPaidPattern }} style={[styles.monoThemeChoice, { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' }, effectiveMonoPattern === 'looseLeaf' && styles.monoThemeChoiceActive, !canUseMonoPaidPattern && { opacity: 0.58 }]} onPress={() => { if (!canUseMonoPaidPattern) { if (onOpenDesignCustomize) onOpenDesignCustomize(); else onPremium('photo_design'); return; } onMonoPattern('looseLeaf'); }}><Text style={[styles.monoThemeChoiceText, effectiveMonoPattern === 'looseLeaf' && styles.monoThemeChoiceTextActive]}>{canUseMonoPaidPattern ? 'ルーズリーフ' : 'ルーズリーフ · ロック'}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Mono シック" accessibilityState={{ selected: effectiveMonoPattern === 'chic', disabled: !canUseMonoPaidPattern }} style={[styles.monoThemeChoice, { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' }, effectiveMonoPattern === 'chic' && styles.monoThemeChoiceActiveDark, !canUseMonoPaidPattern && { opacity: 0.58 }]} onPress={() => { if (!canUseMonoPaidPattern) { if (onOpenDesignCustomize) onOpenDesignCustomize(); else onPremium('photo_design'); return; } onMonoPattern('chic'); }}><Text style={[styles.monoThemeChoiceText, effectiveMonoPattern === 'chic' && styles.monoThemeChoiceTextActive]}>{canUseMonoPaidPattern ? 'シック' : 'シック · ロック'}</Text></Pressable>
        </View>
      </View>}
        {isDesign && <View style={{ marginTop: 12 }}>
          <Text style={[styles.fieldLabel, designMode === 'dark' && styles.darkAccentText, { color: designMode === 'dark' ? '#B4C0D4' : isDesign && chicPalette ? chicPalette.textPrimary : getChicCheckColor(chicCheckColor).textPrimary }]}>テーマカラー</Text>
          <ThemeColorSelector color={chicCheckColor} onChange={onChicCheckColor} designMode={designMode} />
        </View>}
        <Pressable style={[styles.savedTemplateLocked, selectedMode === 'photo' && styles.patternChoiceActive, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]} onPress={() => onDesignMode('photo')}>
          {photoTheme.imageUri ? <Image source={{ uri: photoTheme.imageUri }} style={{ width: 54, height: 42, borderRadius: 9, marginRight: 10 }} /> : <View style={{ width: 54, height: 42, borderRadius: 9, marginRight: 10, backgroundColor: '#F2DDE5', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#9C5D79', fontSize: 17 }}>▧</Text></View>}
          <View style={{ flex: 1 }}><Text style={[styles.savedTemplateLockedTitle, isDesign && chicPalette && { color: guideColors.textPrimary }]}>写真デザイン</Text><Text style={[styles.savedTemplateLockedCopy, isDesign && chicPalette && { color: guideColors.textSecondary }]}>好きな写真を背景やトップ画像に使う</Text></View>
          <Text style={[planTier === 'premium' ? styles.affirmationEdit : styles.taskTemplateSavePremium, isDesign && chicPalette && { color: guideColors.accent }]}>{planTier === 'premium' ? (selectedMode === 'photo' ? '選択中' : '選ぶ') : designCustomizePurchased ? (selectedMode === 'photo' ? '選択中' : '選ぶ') : (selectedMode === 'photo' ? '広告で解放' : '試す')}</Text>
        </Pressable>
          {selectedMode === 'photo' && <PhotoThemeSettingsCard photoTheme={photoTheme} designMode={designMode} chicPalette={chicPalette} planTier={planTier} designCustomizePurchased={designCustomizePurchased} onPremium={onPremium} onPick={onPickPhotoTheme} onAdjust={onAdjustPhotoTheme} onClear={onClearPhotoTheme} styles={styles} />}
        <View style={[styles.settingsCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }, { marginTop: 12 }]}>
          <Text style={[styles.settingsTitle, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>完了アイコン</Text>
          <Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>タスク完了時に表示するマーク</Text>
          <View style={styles.iconChoices}>{completionIcons.map((icon: string) => <Pressable key={icon} accessibilityRole="button" accessibilityLabel={`完了アイコン ${icon}`} style={[styles.iconChoice, { backgroundColor: isDesign && chicPalette ? chicPalette.surfaceSubtle : baseTheme.secondarySurface, borderColor: isDesign && chicPalette ? chicPalette.border : baseTheme.border }, completionIcon === icon && { backgroundColor: isDesign && chicPalette ? chicPalette.accentSoft : baseTheme.softAccent, borderColor: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent }]} onPress={() => onCompletionIcon(icon)}><Text style={[styles.iconChoiceText, { color: isDesign && chicPalette ? chicPalette.textSecondary : baseTheme.secondaryText }, completionIcon === icon && { color: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent }]}>{icon}</Text></Pressable>)}</View>
        </View>
        {!captureDesignOnly && <DesignCustomizeCard designMode={designMode} chicPalette={chicPalette} planTier={planTier} purchased={designCustomizePurchased} localizedPrice={designCustomizePrice} priceStatus={designCustomizePriceStatus} onOpen={onOpenDesignCustomize} onTry={() => onDesignPreview('floral')} />}
      </SettingsDisclosure>
      {!captureDesignOnly && <>
       <SettingsDisclosure designMode={designMode} chicPalette={chicPalette} title="ホーム画面のWidget" subtitle="追加・管理・使い方" expanded={expandedSetting === 'widget'} onPress={() => {
         const opening = expandedSetting !== 'widget';
         setExpandedSetting((current) => current === 'widget' ? null : 'widget');
         if (opening) onWidgetSectionOpened?.();
       }}>
       <View style={[styles.settingsCard, { backgroundColor: guideColors.surface, borderColor: guideColors.border, borderWidth: 1 }]}>
         <Text style={[styles.settingsTitle, { color: guideColors.textPrimary }]}>Widget</Text>
         <Text style={[styles.switchCopy, { color: guideColors.textSecondary, marginTop: 6 }]}>ホーム画面から、RhythmPaceをもっと使いやすく。</Text>
         <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
           <Pressable accessibilityRole="button" onPress={onWidgetGuide} style={{ flex: 1, minHeight: 42, borderRadius: 11, borderWidth: 1, borderColor: guideColors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: guideColors.accent, fontSize: 12, fontWeight: '800' }}>追加方法を見る</Text></Pressable>
           <Pressable accessibilityRole="button" onPress={onRefreshWidget} style={{ flex: 1, minHeight: 42, borderRadius: 11, backgroundColor: guideColors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: guideColors.onAccent, fontSize: 12, fontWeight: '800' }}>Widgetを更新</Text></Pressable>
         </View>
       </View>
       <WidgetSettingsCard
         settings={widgetSettings}
         onChange={onWidgetSettings}
         onPickPhoto={onPickWidgetPhoto}
         onUnlockWidgetPhoto={onUnlockWidgetPhoto}
         onRemoveWidgetPhotoBackground={onRemoveWidgetPhotoBackground}
         widgetPhotoUnlock={widgetPhotoUnlock}
         entitlementsResolved={entitlementsResolved}
         onRemoveAffirmationPhoto={onRemoveAffirmationPhoto}
         styles={styles}
         colors={isDesign && chicPalette ? {
           surface: chicPalette.cardSurface,
           border: chicPalette.border,
           primaryText: chicPalette.textPrimary,
           secondaryText: chicPalette.textSecondary,
           primaryAccent: chicPalette.accent,
           softAccent: chicPalette.accentSoft,
           screenBackground: chicPalette.background,
         } : {
           surface: baseTheme.surface,
           border: baseTheme.border,
           primaryText: baseTheme.primaryText,
           secondaryText: baseTheme.secondaryText,
           primaryAccent: baseTheme.primaryAccent,
           softAccent: baseTheme.softAccent,
           screenBackground: baseTheme.screenBackground,
         }}
         // These completed image backgrounds are app-only Design patterns;
         // keep the native Widget configuration on its existing safe patterns.
         designPattern={isDesign && !(['stationery', 'botanicalBackground', 'ocean', 'nightSky'] as string[]).includes(chicPattern) ? chicPattern : 'plain'}
         designCheckColor={chicCheckColor}
         PatternDecor={ChicPatternDecor}
         planTier={widgetPlanTier ?? planTier}
         designCustomizePurchased={widgetDesignCustomizePurchased ?? designCustomizePurchased}
         widgetEntitlementOverride={widgetEntitlementOverride}
         onWidgetEntitlementOverrideChange={onWidgetEntitlementOverrideChange}
         onLockedWidget={(access) => access === 'premium' ? onPremium('widget') : onOpenDesignCustomize ? onOpenDesignCustomize() : onPremium('photo_design')}
       />
       </SettingsDisclosure>
       <SettingsDisclosure designMode={designMode} chicPalette={chicPalette} title="通知・フィードバック" subtitle="通知管理・触覚フィードバック" expanded={expandedSetting === 'notifications'} onPress={() => setExpandedSetting((current) => current === 'notifications' ? null : 'notifications')}>
       <NotificationManagerCard designMode={designMode} chicPalette={chicPalette} />
       <View style={[styles.settingsCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]}>
         <View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={[styles.switchTitle, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>ライブアクティビティ</Text><Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>ロック画面とDynamic Islandに「今はこれ」を表示します</Text>{planTier === 'premium' ? <Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }, { marginTop: 4 }]}>Premiumでは次の予定・出発・集中・アファメーションも表示します</Text> : designCustomizePurchased ? <Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }, { marginTop: 4 }]}>Design Customizeではアクセントカラーを変更できます</Text> : <Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }, { marginTop: 4 }]}>無料版は今やることの基本表示に対応しています</Text>}</View><Switch value={liveActivityEnabled} onValueChange={(value) => onLiveActivityEnabled?.(value)} trackColor={{ false: isDark ? '#40506A' : baseTheme.border, true: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent }} thumbColor={liveActivityEnabled ? (isDesign && chicPalette ? chicPalette.onAccent : '#FFFFFF') : (isDark ? '#8F9BB0' : '#FFFFFF')} /></View>
       </View>
       {liveActivityDisplayOptions && onLiveActivityDisplayOptionsChange && liveActivityCustomization && onLiveActivityCustomizationChange ? <>
         <Pressable accessibilityRole="button" onPress={() => setLiveActivitySettingsOpen(true)} style={[styles.settingsCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }, { marginTop: 10 }]}>
           <View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={[styles.switchTitle, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>表示内容・文字・チェック操作</Text><Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>Live Activityの詳細設定を開く</Text></View><Text style={{ color: guideColors.accent, fontSize: 22, fontWeight: '800' }}>›</Text></View>
         </Pressable>
         <LiveActivitySettingsSheet
           visible={liveActivitySettingsOpen}
           options={liveActivityDisplayOptions}
           customization={liveActivityCustomization}
           onClose={() => setLiveActivitySettingsOpen(false)}
           onSave={(nextOptions, nextCustomization) => { onLiveActivityDisplayOptionsChange(nextOptions); onLiveActivityCustomizationChange(nextCustomization); setLiveActivitySettingsOpen(false); }}
           colors={{ background: isDesign && chicPalette ? chicPalette.background : baseTheme.screenBackground, surface: isDesign && chicPalette ? chicPalette.cardSurface : baseTheme.surface, secondarySurface: isDesign && chicPalette ? chicPalette.surfaceSubtle : baseTheme.secondarySurface, border: isDesign && chicPalette ? chicPalette.border : baseTheme.border, text: isDesign && chicPalette ? chicPalette.textPrimary : baseTheme.primaryText, muted: isDesign && chicPalette ? chicPalette.textSecondary : baseTheme.secondaryText, accent: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent, soft: isDesign && chicPalette ? chicPalette.accentSoft : baseTheme.softAccent, onAccent: isDesign && chicPalette ? chicPalette.onAccent : (isDark ? baseTheme.screenBackground : '#FFFFFF') }}
           canCustomize={planTier === 'premium' || designCustomizePurchased || (__DEV__ && widgetEntitlementOverride === 'premium')}
           canInteractive={planTier === 'premium' || (__DEV__ && widgetEntitlementOverride === 'premium')}
           taskTitle={tasks.find((task) => task.done !== true && task.isRoutine !== true)?.title}
           nextTitle={timeline.arrival ? `次の予定 ${timeline.arrival}` : undefined}
         />
       </> : null}
       {onPremiumTrialReminderEnabled ? <View style={[styles.settingsCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]}><View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={[styles.switchTitle, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>無料期間終了前のお知らせ</Text><Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>StoreKitで終了日時を確認できた場合、前日に通知します</Text></View><Switch value={premiumTrialReminderEnabled !== false} onValueChange={onPremiumTrialReminderEnabled} trackColor={{ false: isDark ? '#40506A' : baseTheme.border, true: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent }} thumbColor={premiumTrialReminderEnabled !== false ? (isDesign && chicPalette ? chicPalette.onAccent : '#FFFFFF') : (isDark ? '#8F9BB0' : '#FFFFFF')} /></View></View> : null}
       <View style={[styles.settingsCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]}><View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={[styles.switchTitle, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>触覚フィードバック</Text><Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>完了や集中開始を振動で知らせます</Text></View><Switch value={hapticsEnabled} onValueChange={(value) => onHapticsEnabled(value)} trackColor={{ false: isDark ? '#40506A' : baseTheme.border, true: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent }} thumbColor={hapticsEnabled ? (isDesign && chicPalette ? chicPalette.onAccent : '#FFFFFF') : (isDark ? '#8F9BB0' : '#FFFFFF')} /></View></View>
       </SettingsDisclosure>
       <SettingsDisclosure designMode={designMode} chicPalette={chicPalette} title="移動アプリ連携" subtitle="乗換・タクシーアプリを登録" expanded={expandedSetting === 'travelApps'} onPress={() => setExpandedSetting((current) => current === 'travelApps' ? null : 'travelApps')}>
         <TravelAppsSettingsCard settings={travelApps} onChange={onTravelAppsChange} planTier={planTier} designMode={designMode} chicPalette={chicPalette} onPremium={onPremium} />
       </SettingsDisclosure>
        <SettingsDisclosure designMode={designMode} chicPalette={chicPalette} title="ひな型" subtitle="よく使うタスクや設定を保存" expanded={expandedSetting === 'quick'} onPress={() => setExpandedSetting((current) => current === 'quick' ? null : 'quick')}>
      <View style={[styles.settingsCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]}>
        <Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>よく登録するタスクを自分用に保存できます</Text>
        <View style={styles.templateAddRow}><TextInput value={newTemplate} onChangeText={setNewTemplate} placeholder="例：水筒をバッグに入れる" placeholderTextColor={baseTheme.secondaryText} style={[styles.templateInput, { color: baseTheme.primaryText }]} /><Pressable style={[styles.templateAddButton, { backgroundColor: baseTheme.primaryAccent }]} onPress={() => { const clean = newTemplate.trim(); if (!clean) return; onAddTemplate(clean); setNewTemplate(''); }}><Text style={[styles.templateAddButtonText, { color: isDesign && chicPalette ? chicPalette.onAccent : isDark ? baseTheme.screenBackground : '#FFFFFF' }]}>追加</Text></Pressable></View>
        <View style={styles.templateList}>{templates.map((item) => <View key={item} style={[styles.templateRow, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]}><Text style={[styles.templateRowText, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>{item}</Text><Pressable onPress={() => onDeleteTemplate(item)}><Text style={[styles.templateDelete, isDark && styles.darkAccentText, isDesign && chicPalette && { color: guideColors.accent }]}>×</Text></Pressable></View>)}</View>
      </View>
      <View style={[styles.settingsCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]}>
        <View style={styles.historyHeader}><View><Text style={[styles.settingsTitle, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>マイひな型</Text><Text style={[styles.switchCopy, isDark && styles.darkAccentText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>設定ごと保存して、次回そのまま呼び出す</Text></View><Text style={[styles.taskTemplateSavePremium, isDesign && chicPalette && { color: guideColors.accent }]}>Premium</Text></View>
       {hasPremiumAccess(planTier, 'saved_task_templates') ? savedTemplates.length === 0 ? <Text style={[styles.savedTemplateEmpty, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>タスクの「•••」から「設定ごとひな型に保存」を選べます。</Text> : savedTemplates.map((template) => <View key={template.id} style={[styles.savedTemplateSettingRow, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]}><View style={{ flex: 1 }}><Text style={[styles.savedTemplateSettingTitle, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>{template.title}</Text><Text style={[styles.savedTemplateSettingCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>{summarizePremiumTaskTemplate(template)}</Text></View><Pressable onPress={() => onDeleteSavedTemplate(template)}><Text style={[styles.templateDelete, isDark && styles.darkAccentText, isDesign && chicPalette && { color: guideColors.accent }]}>削除</Text></Pressable></View>) : <Pressable style={[styles.savedTemplateLocked, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]} onPress={() => onPremium('templates')}><View style={{ flex: 1 }}><Text style={[styles.savedTemplateLockedTitle, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>この機能を見る</Text><Text style={[styles.savedTemplateLockedCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>保存済みデータは無料へ戻っても消えません</Text></View><Text style={[styles.guideCardArrow, isDark && styles.darkAccentText, isDesign && chicPalette && { color: guideColors.accent }]}>›</Text></Pressable>}
       </View>
       </SettingsDisclosure>
       <View style={styles.settingsDisclosure}>
         <Pressable style={[styles.settingsDisclosureHeader, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]} onPress={() => onPremium()} accessibilityRole="button">
           <View style={{ flex: 1 }}><Text style={[styles.settingsDisclosureTitle, { color: isDesign && chicPalette ? guideColors.textPrimary : baseTheme.primaryText }]}>{planTier === 'premium' ? 'Premium利用中' : 'Rhythm Premium'}</Text><Text style={[styles.settingsDisclosureSubtitle, { color: isDesign && chicPalette ? guideColors.textSecondary : baseTheme.secondaryText }]}>{planTier === 'premium' ? 'Premiumの機能を利用中です' : 'もっとRhythmを便利に使う'}</Text></View>
           <Text style={[styles.settingsDisclosureChevron, { color: isDesign && chicPalette ? guideColors.accent : baseTheme.primaryAccent }]}>›</Text>
         </Pressable>
       </View>
       <SettingsDisclosure designMode={designMode} chicPalette={chicPalette} title="アプリについて" subtitle="使い方・レビュー" expanded={expandedSetting === 'about'} onPress={() => setExpandedSetting((current) => current === 'about' ? null : 'about')}>
         <Pressable style={[styles.guideCard, { backgroundColor: guideColors.surface, borderColor: guideColors.border, borderWidth: 1 }]} onPress={onGuide}><View><Text style={[styles.guideCardTitle, { color: guideColors.textPrimary }]}>使い方を見る</Text><Text style={[styles.guideCardCopy, { color: guideColors.textSecondary }]}>登録・振り分け・出発・集中の流れを見る</Text></View><Text style={[styles.guideCardArrow, { color: guideColors.accent }]}>›</Text></Pressable>
         <Pressable style={[styles.settingsCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]} onPress={onReview}><Text style={[styles.settingsTitle, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>アプリを評価する</Text><Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>短いレビューでRhythmの改善を応援できます</Text></Pressable>
       </SettingsDisclosure>
      </>}
      {!captureDesignOnly && SETTINGS_BANNER_AD_UNIT_ID && <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 12, paddingVertical: 8 }} accessibilityLabel="広告">
        <BannerAd
          unitId={SETTINGS_BANNER_AD_UNIT_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      </View>}
    </>
  );
}
