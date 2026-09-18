import React, { useEffect, useState } from 'react';
import { Alert, DevSettings, Image, InteractionManager, Linking, Modal, Pressable, ScrollView, Switch, Text, TextInput, View, useColorScheme } from 'react-native';
import Constants from 'expo-constants';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChicCheckColor, ChicPattern, ChicThemePalette, DesignMode, getDesignCheckColorLabel, getThemeTokens } from '../theme';
import { Affirmation, AffirmationCustomText, LiveActivityCustomizationSettings, LiveActivityDisplayOptions, PhotoThemePhotoTarget, PhotoThemeSettings, Task, WidgetSettings, WidgetSize, WidgetType } from '../types';
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
import { WIDGET_TYPE_OPTIONS } from '../features/widget/widgetSettings';
import type { WidgetEntitlementOverride } from '../features/widget/widgetSettings';
import { LiveActivitySettingsSheet } from '../components/LiveActivitySettingsSheet';

// Keep the production unit configurable without scattering IDs through the UI.
// Development builds use Google's test unit unless an explicit test/production
// override is supplied by the build environment.
const isProductionAds = process.env.EXPO_PUBLIC_RHYTHM_ADS_ENV === 'production' || process.env.RHYTHM_ADS_ENV === 'production';
const SETTINGS_BANNER_AD_UNIT_ID = process.env.EXPO_PUBLIC_RHYTHM_BANNER_AD_UNIT_ID ?? (isProductionAds ? undefined : TestIds.BANNER);

const PRIVACY_POLICY_URL = 'https://rhythm-app-support-jp-nnagae731-5982s-projects.vercel.app/privacy.html';
const SUPPORT_URL = 'https://rhythm-app-support-jp-nnagae731-5982s-projects.vercel.app/support.html';
const SUPPORT_EMAIL = 'rhythmsupport2@gmail.com';

type AboutDetailId = 'about' | 'privacyPolicy' | 'contact' | 'version';

function AboutAppSheet({ visible, onClose, colors }: { visible: boolean; onClose: () => void; colors: { background: string; surface: string; border: string; text: string; muted: string; accent: string; onAccent: string } }) {
  const [detail, setDetail] = useState<AboutDetailId>();
  useEffect(() => { if (!visible) setDetail(undefined); }, [visible]);
  if (!visible) return null;
  const version = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '確認できません';
  const rows: Array<{ id: AboutDetailId; title: string; subtitle?: string; external?: string }> = [
    { id: 'about', title: 'RhythmPaceについて', subtitle: '毎日を、自分のリズムで整える' },
    { id: 'privacyPolicy', title: 'プライバシーポリシー', subtitle: 'Webで詳しく確認', external: PRIVACY_POLICY_URL },
    { id: 'contact', title: 'お問い合わせ・サポート', subtitle: 'サポートページとメール' },
    { id: 'version', title: 'バージョン情報', subtitle: `RhythmPace ${version}` },
  ];
  const openExternal = (url: string) => { void Linking.openURL(url).catch(() => Alert.alert('ページを開けませんでした', '通信状態を確認して、もう一度お試しください。')); };
  const detailBody = (id: AboutDetailId) => {
    switch (id) {
      case 'about': return <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 21 }}>RhythmPaceは、タスク・予定・習慣・集中などをまとめて、自分のペースで毎日を整えるためのアプリです。</Text>;
      case 'privacyPolicy': return <View><Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>情報の取扱いを詳しく確認できます。</Text><Pressable accessibilityRole="link" onPress={() => openExternal(PRIVACY_POLICY_URL)} style={{ marginTop: 12 }}><Text style={{ color: colors.accent, fontSize: 13, fontWeight: '800' }}>プライバシーポリシーを開く ↗</Text></Pressable></View>;
      case 'contact': return <View><Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>不具合のお問い合わせには、発生した画面、操作内容、発生日時、iPhone機種、iOSバージョン、RhythmPaceバージョンがあると確認しやすくなります。Taskの内容など、不要な個人情報は送らないでください。</Text><Pressable accessibilityRole="link" onPress={() => openExternal(SUPPORT_URL)} style={{ marginTop: 12 }}><Text style={{ color: colors.accent, fontSize: 13, fontWeight: '800' }}>サポートページを開く ↗</Text></Pressable><Pressable accessibilityRole="link" onPress={() => openExternal(`mailto:${SUPPORT_EMAIL}`)} style={{ marginTop: 10 }}><Text style={{ color: colors.accent, fontSize: 13, fontWeight: '800' }}>メールで問い合わせる</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>{SUPPORT_EMAIL}</Text></Pressable></View>;
      case 'version': return <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 21 }}>RhythmPace{`\n`}バージョン {version}</Text>;
    }
  };
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' }}>
      <View style={{ height: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, backgroundColor: colors.background }}>
        <View style={{ alignSelf: 'center', width: 42, height: 4, borderRadius: 3, backgroundColor: colors.border }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>アプリについて</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>アプリ情報とサポート</Text></View><Pressable accessibilityRole="button" accessibilityLabel="アプリについてを閉じる" onPress={onClose} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted, fontSize: 26, fontWeight: '300' }}>×</Text></Pressable></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 36 }}>
          {rows.map((row) => { const expanded = detail === row.id; return <View key={row.id} style={{ marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, overflow: 'hidden' }}><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => row.external ? openExternal(row.external) : setDetail(expanded ? undefined : row.id)} style={{ minHeight: 60, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{row.title}</Text>{row.subtitle ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>{row.subtitle}</Text> : null}</View><Text style={{ color: colors.accent, fontSize: 20 }}>{row.external ? '↗' : row.id === 'version' ? '' : '›'}</Text></Pressable>{expanded ? <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 14, paddingVertical: 13 }}>{detailBody(row.id)}</View> : null}</View>; })}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

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
    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>デザインカスタマイズ</Text>
    {planTier === 'premium' ? <Text style={{ color: colors.accent, marginTop: 6, fontSize: 12, fontWeight: '800' }}>Premiumで利用できます</Text> : purchased ? <Text style={{ color: colors.accent, marginTop: 6, fontSize: 12, fontWeight: '800' }}>購入済み</Text> : <>
      <Text style={{ color: colors.muted, marginTop: 6, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>RhythmPaceの見た目を、もっと自分らしく。{ '\n' }花柄・チェック・ドット・写真カスタマイズを買い切りで利用できます。Widgetごとに写真レイアウトも設定できます。</Text>
      <Text style={{ color: colors.accent, marginTop: 8, fontSize: 14, fontWeight: '900' }}>{priceStatus === 'loading' ? '価格を取得中…' : localizedPrice ? `買い切り ${localizedPrice}` : '価格は購入画面で確認'}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 11 }}>
        <Pressable onPress={onTry} style={{ flex: 1, minHeight: 40, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.accent, fontSize: 12, fontWeight: '900' }}>試してみる</Text></Pressable>
        <Pressable onPress={onOpen} style={{ flex: 1, minHeight: 40, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.onAccent, fontSize: 12, fontWeight: '900' }}>購入画面を開く</Text></Pressable>
      </View>
      <Text style={{ color: colors.muted, marginTop: 8, fontSize: 10, lineHeight: 15 }}>広告やお試しで無料で試すこともできます。</Text>
    </>}
    {planTier === 'premium' || purchased ? <Text style={{ color: colors.muted, marginTop: 6, fontSize: 11 }}>デザイン・写真の見た目機能を利用できます。</Text> : null}
  </View>;
}

function DesignStatusCards({ label, previewing, colors, purchased, planTier, onOpen }: { label: string; previewing: boolean; colors: { surface: string; border: string; text: string; muted: string; accent: string; soft: string }; purchased: boolean; planTier: PlanTier; onOpen?: () => void }) {
  const hasAccess = planTier === 'premium' || purchased;
  const customizeCard = <View style={{ flex: 1, minHeight: 72, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' }}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>デザインカスタマイズ</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={{ color: hasAccess ? colors.accent : colors.text, fontSize: 14, fontWeight: '900', marginTop: 4 }}>{hasAccess ? '購入済み' : '未購入 ›'}</Text></View>;
  return <View style={{ flexDirection: 'row', gap: 9, marginTop: 10 }}>
    <View style={{ flex: 1, minHeight: 72, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' }}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>{previewing ? '試着中' : '現在'}</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 4 }}>{label}</Text></View>
    {hasAccess || !onOpen ? customizeCard : <Pressable accessibilityRole="button" accessibilityLabel="デザインカスタマイズを開く" onPress={onOpen} style={{ flex: 1 }}>{customizeCard}</Pressable>}
  </View>;
}

function WidgetSettingsSheet({ visible, onClose, widgetSettings, onWidgetSettings, onPickWidgetPhoto, onUnlockWidgetPhoto, widgetPhotoUnlock, entitlementsResolved, onRemoveAffirmationPhoto, widgetColors, styles, designPattern, designCheckColor, PatternDecor, planTier, designCustomizePurchased, widgetEntitlementOverride, onWidgetEntitlementOverrideChange, onLockedWidget, onWidgetGuide }: {
  visible: boolean;
  onClose: () => void;
  widgetSettings: WidgetSettings;
  onWidgetSettings: (settings: WidgetSettings) => void;
  onPickWidgetPhoto?: (widgetType?: WidgetType, override?: WidgetEntitlementOverride) => void;
  onUnlockWidgetPhoto?: (widgetType: WidgetType, override?: WidgetEntitlementOverride) => void;
  widgetPhotoUnlock?: { widgetType: WidgetType | null; expiresAt: string | null };
  entitlementsResolved?: boolean;
  onRemoveAffirmationPhoto?: (index?: number) => void;
  widgetColors: { surface: string; border: string; primaryText: string; secondaryText: string; primaryAccent: string; softAccent: string; screenBackground: string };
  styles: any;
  designPattern: ChicPattern;
  designCheckColor: ChicCheckColor;
  PatternDecor: React.ComponentType<any>;
  planTier: PlanTier;
  designCustomizePurchased: boolean;
  widgetEntitlementOverride?: WidgetEntitlementOverride;
  onWidgetEntitlementOverrideChange?: (override: WidgetEntitlementOverride) => void;
  onLockedWidget: (access: 'design' | 'premium') => void;
  onWidgetGuide?: () => void;
}) {
  const currentWidget = WIDGET_TYPE_OPTIONS.find((item) => item.id === widgetSettings.widgetType);
  const stableWidgetColors = React.useMemo(() => widgetColors, [widgetColors.surface, widgetColors.border, widgetColors.primaryText, widgetColors.secondaryText, widgetColors.primaryAccent, widgetColors.softAccent, widgetColors.screenBackground]);
  const [contentReady, setContentReady] = useState(false);
  useEffect(() => {
    if (!visible) {
      setContentReady(false);
      return;
    }
    const task = InteractionManager.runAfterInteractions(() => setContentReady(true));
    return () => task.cancel();
  }, [visible]);
  if (!visible) return null;
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' }}>
      <View style={{ height: '92%', maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, backgroundColor: widgetColors.screenBackground }}>
        <View style={{ alignSelf: 'center', width: 42, height: 4, borderRadius: 3, backgroundColor: widgetColors.border }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 }}><View style={{ flex: 1 }}><Text style={{ color: widgetColors.primaryText, fontSize: 20, fontWeight: '900' }}>ウィジェット</Text><Text style={{ color: widgetColors.secondaryText, fontSize: 11, marginTop: 3 }}>ホーム画面に表示する内容と見た目を設定</Text></View><Pressable accessibilityRole="button" accessibilityLabel="ウィジェット設定を閉じる" onPress={onClose} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: widgetColors.secondaryText, fontSize: 26, fontWeight: '300' }}>×</Text></Pressable></View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 4 }}><View style={{ flex: 1, minHeight: 64, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: widgetColors.border, backgroundColor: widgetColors.surface, justifyContent: 'center' }}><Text style={{ color: widgetColors.secondaryText, fontSize: 11, fontWeight: '800' }}>現在</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={{ color: widgetColors.primaryText, fontSize: 14, fontWeight: '900', marginTop: 4 }}>{currentWidget?.label ?? 'Widget'}</Text></View><View style={{ flex: 1, minHeight: 64, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: widgetColors.border, backgroundColor: widgetColors.surface, justifyContent: 'center' }}><Text style={{ color: widgetColors.secondaryText, fontSize: 11, fontWeight: '800' }}>サイズ</Text><Text style={{ color: widgetColors.primaryText, fontSize: 14, fontWeight: '900', marginTop: 4 }}>{currentWidget?.sizes ?? '—'}</Text></View></View>
          {contentReady ? <>
            {onWidgetGuide ? <Pressable accessibilityRole="button" onPress={onWidgetGuide} style={{ marginTop: 10, minHeight: 42, borderRadius: 11, borderWidth: 1, borderColor: widgetColors.primaryAccent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: widgetColors.primaryAccent, fontSize: 12, fontWeight: '800' }}>追加方法を見る</Text></Pressable> : null}
            <WidgetSettingsCard settings={widgetSettings} onChange={onWidgetSettings} onPickPhoto={onPickWidgetPhoto} onUnlockWidgetPhoto={onUnlockWidgetPhoto} widgetPhotoUnlock={widgetPhotoUnlock} entitlementsResolved={entitlementsResolved} onRemoveAffirmationPhoto={onRemoveAffirmationPhoto} styles={styles} colors={stableWidgetColors} designPattern={designPattern} designCheckColor={designCheckColor} PatternDecor={PatternDecor} planTier={planTier} designCustomizePurchased={designCustomizePurchased} widgetEntitlementOverride={widgetEntitlementOverride} onWidgetEntitlementOverrideChange={onWidgetEntitlementOverrideChange} onLockedWidget={onLockedWidget} showSelectedPreview />
          </> : <Text style={{ color: widgetColors.secondaryText, fontSize: 11, marginTop: 16 }}>Widget設定を読み込んでいます…</Text>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

type DesignSettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
  selectedMode: DesignMode;
  designMode: DesignMode;
  chicPalette?: ChicThemePalette;
  monoAppearance: 'auto' | 'light' | 'dark';
  monoPattern: 'plain' | 'looseLeaf' | 'chic';
  previewMonoPattern?: 'plain' | 'looseLeaf' | 'chic';
  canUseMonoPaidPattern?: boolean;
  chicPattern: ChicPattern;
  chicCheckColor: ChicCheckColor;
  photoTheme: PhotoThemeSettings;
  previewPhotoUri?: string;
  planTier: PlanTier;
  designCustomizePurchased: boolean;
  designCustomizePrice?: string;
  designCustomizePriceStatus?: 'loading' | 'ready' | 'unavailable';
  onDesignMode: (mode: DesignMode) => void;
  onMonoAppearance: (appearance: 'auto' | 'light' | 'dark') => void;
  onMonoPattern: (pattern: 'plain' | 'looseLeaf' | 'chic') => void;
  onMonoPreview?: (pattern: 'looseLeaf' | 'chic') => void;
  onChicPattern: (pattern: ChicPattern) => void;
  onChicCheckColor: (color: ChicCheckColor) => void;
  onDesignPreview: (pattern: ChicPattern) => void;
  onPickPhotoTheme: (target: PhotoThemePhotoTarget) => void;
  onPickPhotoPreview?: () => void;
  onAdjustPhotoTheme: (target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>) => void;
  onClearPhotoTheme: (target: PhotoThemePhotoTarget) => void;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onOpenDesignCustomize?: () => void;
  onOpenDesignAccess?: () => void;
  fullscreenPreview?: (onBack: () => void, sheetVisible: boolean) => React.ReactNode;
  styles: any;
  helpers: any;
  components: any;
};

const designSheetBackgroundSources: Partial<Record<ChicPattern, number>> = {
  stationery: require('../assets/themes/design-backgrounds/design-stationery-background.jpg'),
  botanicalBackground: require('../assets/themes/design-backgrounds/design-botanical-background.jpg'),
  ocean: require('../assets/themes/design-backgrounds/design-ocean-background.jpg'),
  nightSky: require('../assets/themes/design-backgrounds/design-night-sky-background.jpg'),
};

function DesignAppliedPreview({ tab, selectedMode, designMode, systemColorScheme, monoAppearance, monoPattern, chicPattern, chicCheckColor, chicPalette, photoTheme, previewPhotoUri, colors, styles, helpers, components }: { tab: 'mono' | 'chic' | 'photo'; selectedMode: DesignMode; designMode: DesignMode; systemColorScheme?: 'light' | 'dark' | null; monoAppearance: 'auto' | 'light' | 'dark'; monoPattern: 'plain' | 'looseLeaf' | 'chic'; chicPattern: ChicPattern; chicCheckColor: ChicCheckColor; chicPalette?: ChicThemePalette; photoTheme: PhotoThemeSettings; previewPhotoUri?: string; colors: { background: string; surface: string; border: string; text: string; muted: string; accent: string; soft: string; onAccent: string }; styles: any; helpers: any; components: any }) {
  const { ChicPatternDecor, BThemeRibbonDecoration, CThemeRibbonDecoration } = components;
  const savedPalette = helpers.getChicCheckColor(chicCheckColor);
  const candidatePalette = tab === 'chic' && chicPattern === 'nightSky' && helpers.getNightSkyPalette
    ? helpers.getNightSkyPalette(savedPalette)
    : savedPalette;
  const photoPalette = savedPalette;
  const monoPreviewMode: 'minimal' | 'dark' = monoAppearance === 'dark'
    ? 'dark'
    : monoAppearance === 'light'
      ? 'minimal'
      : (systemColorScheme === 'dark' || (!systemColorScheme && designMode === 'dark')) ? 'dark' : 'minimal';
  const previewMode: DesignMode = tab === 'photo' ? 'photo' : tab === 'chic' ? 'chic' : monoPreviewMode;
  const monoColors = helpers.getThemeTokens(previewMode === 'dark' ? 'dark' : 'minimal', savedPalette.id).colors;
  const previewTheme = tab === 'chic'
    ? { background: candidatePalette.background, surface: candidatePalette.cardSurface, border: candidatePalette.border, text: candidatePalette.textPrimary, muted: candidatePalette.textSecondary, accent: candidatePalette.accent, soft: candidatePalette.accentSoft, onAccent: candidatePalette.onAccent }
      : tab === 'mono'
      ? { background: monoColors.screenBackground, surface: monoColors.surface, border: monoColors.border, text: monoColors.primaryText, muted: monoColors.secondaryText, accent: monoColors.primaryAccent, soft: monoColors.softAccent, onAccent: previewMode === 'dark' ? monoColors.screenBackground : '#FFFFFF' }
      : { background: photoPalette.background, surface: photoPalette.cardSurface, border: photoPalette.border, text: photoPalette.textPrimary, muted: photoPalette.textSecondary, accent: photoPalette.accent, soft: photoPalette.accentSoft, onAccent: photoPalette.onAccent };
  const isDarkPreview = previewMode === 'dark' || (tab === 'chic' && chicPattern === 'nightSky');
  const imageSource = tab === 'chic' ? designSheetBackgroundSources[chicPattern] : undefined;
  const visual = helpers.getChicPatternVisual(chicPattern, candidatePalette);
  const cardText = isDarkPreview || tab === 'photo' ? '#F4F7FC' : previewTheme.text;
  const cardMuted = isDarkPreview || tab === 'photo' ? '#B4C0D4' : previewTheme.muted;
  const cardSurface = isDarkPreview || tab === 'photo' ? 'rgba(18,28,42,0.92)' : previewTheme.surface;
  const cardBorder = isDarkPreview || tab === 'photo' ? 'rgba(220,225,230,0.42)' : previewTheme.border;
  const photoPreviewUri = previewPhotoUri ?? photoTheme.imageUri ?? photoTheme.topImageUris?.home ?? photoTheme.topImageOriginalUris?.home;
  const background = tab === 'photo' ? previewTheme.background : imageSource ? '#101722' : previewMode === 'dark' ? '#171B24' : previewTheme.background;
  const useDesignCard = tab === 'chic' || tab === 'photo';
  const monoCardSurface = tab === 'mono' && monoPattern === 'looseLeaf'
    ? (previewMode === 'dark' ? 'rgba(34,43,58,0.88)' : 'rgba(247,245,239,0.88)')
    : tab === 'mono' && monoPattern === 'chic'
      ? (previewMode === 'dark' ? 'rgba(31,48,70,0.86)' : 'rgba(246,245,240,0.88)')
      : cardSurface;
  return <View accessibilityLabel="デザイン適用イメージ" style={{ height: 214, marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: previewTheme.border, backgroundColor: background, overflow: 'hidden' }}>
    {imageSource ? <Image source={imageSource} resizeMode="contain" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.92 }} /> : null}
    {tab === 'mono' && monoPattern === 'looseLeaf' ? <View pointerEvents="none" style={{ position: 'absolute', left: 12, right: 12, top: 0, bottom: 0 }}>{[0, 1, 2, 3, 4].map((index) => <View key={index} style={{ position: 'absolute', left: 0, right: 0, top: 24 + index * 40, height: 1, backgroundColor: previewMode === 'dark' ? 'rgba(190,200,220,0.18)' : 'rgba(120,110,90,0.16)' }} />)}<View style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 1, backgroundColor: previewMode === 'dark' ? 'rgba(220,150,160,0.28)' : 'rgba(190,120,125,0.28)' }} /></View> : null}
    {tab === 'mono' && monoPattern === 'chic' ? <View pointerEvents="none" style={{ position: 'absolute', left: -24, top: 58, width: 240, height: 34, backgroundColor: previewMode === 'dark' ? 'rgba(42,61,86,0.7)' : 'rgba(210,208,199,0.6)', transform: [{ rotate: '-18deg' }] }} /> : null}
    {tab === 'chic' && !imageSource ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}><ChicPatternDecor pattern={chicPattern} accent={visual.accent} warm={visual.warm} checkColor={chicCheckColor} preview /></View> : null}
    {tab === 'photo' && photoPreviewUri ? <Image source={{ uri: photoPreviewUri }} resizeMode="cover" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} /> : null}
    {tab === 'photo' ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: photoPreviewUri ? 'rgba(15,20,28,0.34)' : 'rgba(15,20,28,0.06)' }} /> : null}
    {tab === 'photo' && !photoPreviewUri ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: previewTheme.muted, fontSize: 11, fontWeight: '800' }}>写真を選ぶとここに表示されます</Text></View> : null}
    <View pointerEvents="none" style={{ flex: 1, padding: 12 }}>
      {tab === 'chic' && chicPattern === 'checkLavenderSatin' ? <BThemeRibbonDecoration compact /> : null}
      {tab === 'chic' && chicPattern === 'checkBeigeNoir' ? <CThemeRibbonDecoration compact /> : null}
      {useDesignCard ? <View style={[styles.todayHeroCard, styles.todayHeroCardChic, { flex: 1, backgroundColor: tab === 'photo' ? 'rgba(18,28,42,0.88)' : candidatePalette.cardSurface, borderColor: tab === 'photo' ? 'rgba(220,225,230,0.42)' : candidatePalette.border, shadowColor: candidatePalette.accent }]}>
        <View style={styles.todayHeroChicLayout}>
          <View style={[styles.todayHeroChicPlate, { backgroundColor: tab === 'photo' ? 'rgba(18,28,42,0.82)' : candidatePalette.cardSurface }]}>
            <View style={[styles.todayChicMark, { backgroundColor: candidatePalette.accentSoft }]}><Text style={[styles.todayChicMarkText, { color: candidatePalette.accent }]}>✿</Text></View>
            <Text style={[styles.todayHeroKicker, { color: tab === 'photo' ? '#D7DEEA' : candidatePalette.textSecondary }]}>今はこれ</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={[styles.check, { borderColor: candidatePalette.accent }]} /><Text numberOfLines={1} style={[styles.todayHeroCopy, { color: tab === 'photo' ? '#F4F7FC' : candidatePalette.textPrimary, flex: 1 }]}>今日のタスクを確認</Text></View>
            <Text style={[styles.todayHeroStats, { color: tab === 'photo' ? '#B4C0D4' : candidatePalette.textSecondary }]}>完了 0　残り 1</Text>
          </View>
          <View style={styles.todayHeroJarWrap}><View style={styles.miniJarWrap}><View style={[styles.miniJarLid, { backgroundColor: candidatePalette.accent }]} /><View style={[styles.miniJar, styles.miniJarChicGlass, { borderColor: tab === 'photo' ? 'rgba(220,225,230,0.42)' : candidatePalette.border }]}><Text style={[styles.miniJarItem, { left: 8, bottom: 4, color: candidatePalette.accentSoft }]}>●</Text></View></View><Text style={[styles.todayHeroProgressLabel, { color: tab === 'photo' ? '#D7DEEA' : candidatePalette.textSecondary }]}>今日の進み</Text><Text style={[styles.todayHeroJarHint, { color: tab === 'photo' ? '#B4C0D4' : candidatePalette.textMuted }]}>今日できたことを確認</Text></View>
        </View>
        <View style={{ minHeight: 34, marginTop: 8, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: tab === 'photo' ? 'rgba(220,225,230,0.28)' : candidatePalette.border, borderRadius: 12, backgroundColor: candidatePalette.accentSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: candidatePalette.accent, fontSize: 11, fontWeight: '900' }}>集中する</Text><Text style={{ color: candidatePalette.accent, fontSize: 18 }}>›</Text></View>
      </View> : <View style={[styles.todayHeroCard, styles.todayHeroCardMinimal, previewMode === 'dark' && styles.todayHeroCardMinimalDark, { flex: 1, backgroundColor: monoCardSurface, borderColor: cardBorder }]}>
        <View style={styles.todayHeroMinimalLayout}>
          <View style={styles.todayHeroMinimalLeft}><Text style={[styles.todayHeroMinimalKicker, previewMode === 'dark' && styles.todayHeroMinimalKickerDark]}>TODAY</Text><Text style={[styles.todayHeroMinimalNowLabel, previewMode === 'dark' && styles.todayHeroMinimalTextDark]}>今はこれ</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={[styles.check, previewMode === 'dark' && styles.checkDark]} /><Text numberOfLines={1} style={[styles.todayHeroMinimalTask, previewMode === 'dark' && styles.todayHeroMinimalTextDark, { color: cardText, flex: 1 }]}>今日のタスクを確認</Text></View><Text style={[styles.todayHeroMinimalStats, previewMode === 'dark' && styles.todayHeroMinimalStatsDark, { color: cardMuted }]}>完了 0 / 残り 1</Text></View>
          <View style={styles.todayUnifiedAchievementMinimal}><Text style={[styles.todayHeroMinimalKicker, { color: previewTheme.accent }]}>達成グラフ</Text><Text style={[styles.todayHeroMinimalNumber, { color: cardText }]}>00</Text><View style={styles.minimalAchievementBars}>{Array.from({ length: 8 }, (_, index) => <View key={index} style={[styles.minimalAchievementBar, { backgroundColor: index === 0 ? previewTheme.accent : (previewMode === 'dark' ? '#2B3547' : monoColors.secondarySurface) }]} />)}</View><Text style={[styles.todayHeroMinimalStats, { color: cardMuted }]}>今日できたことを確認</Text></View>
        </View>
        <View style={{ minHeight: 34, marginTop: 8, borderTopWidth: 1, borderTopColor: previewTheme.border, borderRadius: 12, backgroundColor: previewTheme.soft, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: previewTheme.accent, fontSize: 11, fontWeight: '900' }}>集中する</Text><Text style={{ color: previewTheme.accent, fontSize: 18 }}>›</Text></View>
      </View>}
    </View>
  </View>;
}

function DesignSettingsSheet({ visible, onClose, selectedMode, designMode, chicPalette, monoAppearance, monoPattern, previewMonoPattern, chicPattern, chicCheckColor, photoTheme, previewPhotoUri, canUseMonoPaidPattern = false, planTier, designCustomizePurchased, designCustomizePrice, designCustomizePriceStatus, onDesignMode, onMonoAppearance, onMonoPattern, onMonoPreview, onChicPattern, onChicCheckColor, onDesignPreview, onPickPhotoTheme, onPickPhotoPreview, onAdjustPhotoTheme, onClearPhotoTheme, onPremium, onOpenDesignCustomize, onOpenDesignAccess, fullscreenPreview, styles, helpers, components }: DesignSettingsSheetProps) {
  const { ChicPatternSelector, ThemeColorSelector, PremiumFeatureIcon } = components;
  const systemColorScheme = useColorScheme();
  const [tab, setTab] = useState<'mono' | 'chic' | 'photo'>(selectedMode === 'photo' ? 'photo' : selectedMode === 'chic' ? 'chic' : 'mono');
  const [sheetView, setSheetView] = useState<'settings' | 'fullscreenPreview'>('settings');
  useEffect(() => {
    if (!visible) {
      setSheetView('settings');
      return;
    }
    setTab(selectedMode === 'photo' ? 'photo' : selectedMode === 'chic' ? 'chic' : 'mono');
  }, [visible]);
  const isDark = designMode === 'dark';
  const base = helpers.getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const colors = {
    background: designMode === 'chic' && chicPalette ? chicPalette.background : base.screenBackground,
    surface: designMode === 'chic' && chicPalette ? chicPalette.cardSurface : base.surface,
    border: designMode === 'chic' && chicPalette ? chicPalette.border : base.border,
    text: designMode === 'chic' && chicPalette ? chicPalette.textPrimary : base.primaryText,
    muted: designMode === 'chic' && chicPalette ? chicPalette.textSecondary : base.secondaryText,
    accent: designMode === 'chic' && chicPalette ? chicPalette.accent : base.primaryAccent,
    soft: designMode === 'chic' && chicPalette ? chicPalette.accentSoft : base.softAccent,
    onAccent: designMode === 'chic' && chicPalette ? chicPalette.onAccent : (isDark ? base.screenBackground : '#FFFFFF'),
  };
  const monoPreviewMode: 'minimal' | 'dark' = monoAppearance === 'dark'
    ? 'dark'
    : monoAppearance === 'light'
      ? 'minimal'
      : (systemColorScheme === 'dark' || (!systemColorScheme && designMode === 'dark')) ? 'dark' : 'minimal';
  const visibleMonoPattern = previewMonoPattern ?? monoPattern;
  const currentMonoLabel = monoAppearance === 'auto'
    ? `シンプル ${designMode === 'dark' ? 'ダーク' : 'ライト'}（自動）`
    : monoAppearance === 'dark' ? 'シンプル ダーク' : 'シンプル ライト';
  const selectedLabel = selectedMode === 'minimal' || selectedMode === 'dark'
    ? currentMonoLabel
      : selectedMode === 'photo'
        ? `写真 / ${getDesignCheckColorLabel(chicCheckColor)}`
        : chicPattern === 'nightSky'
          ? 'Night Sky'
          : chicPattern === 'stationery'
            ? 'Stationery'
            : chicPattern === 'botanicalBackground'
              ? 'Botanical'
                : chicPattern === 'ocean'
                  ? 'Ocean'
                  : `デザイン / ${getDesignCheckColorLabel(chicCheckColor)}`;
  const previewCandidateLabel = tab === 'mono'
    ? (`シンプル ${monoPreviewMode === 'dark' ? 'ダーク' : 'ライト'} / ${visibleMonoPattern === 'plain' ? 'プレーン' : visibleMonoPattern === 'looseLeaf' ? 'ルーズリーフ' : 'シック'}`)
    : tab === 'photo'
      ? `写真 / ${getDesignCheckColorLabel(chicCheckColor)}`
      : chicPattern === 'nightSky'
        ? 'Night Sky'
        : chicPattern === 'stationery'
          ? 'Stationery'
          : chicPattern === 'botanicalBackground'
            ? 'Botanical'
            : chicPattern === 'ocean'
              ? 'Ocean'
              : `デザイン / ${getDesignCheckColorLabel(chicCheckColor)}`;
  const previewMatchesSaved = tab === 'mono'
    ? ((selectedMode === 'minimal' || selectedMode === 'dark') && visibleMonoPattern === monoPattern && (monoAppearance === 'auto' || (monoAppearance === 'dark' && selectedMode === 'dark') || (monoAppearance === 'light' && selectedMode === 'minimal')))
    : tab === 'photo'
      ? selectedMode === 'photo' && !previewPhotoUri
      : selectedMode === 'chic';
  const compactDesignLabel = (value: string) => value.replace(' / ', '・').replace('（自動）', '・自動');
  const statusLabel = compactDesignLabel(previewMatchesSaved ? selectedLabel : previewCandidateLabel);
  const tabButton = (value: 'mono' | 'chic' | 'photo', label: string) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: tab === value ? colors.soft : 'transparent', borderWidth: 1, borderColor: tab === value ? colors.accent : colors.border }}><Text style={{ color: tab === value ? colors.accent : colors.muted, fontSize: 12, fontWeight: '900' }}>{label}</Text></Pressable>;
  const monoCard = (mode: 'minimal' | 'dark', label: string) => {
    const active = selectedMode === mode && (monoAppearance === 'auto' ? monoPreviewMode === mode : (monoAppearance === 'dark' ? mode === 'dark' : mode === 'minimal'));
    return <Pressable key={mode} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { onDesignMode(mode); onMonoAppearance(mode === 'dark' ? 'dark' : 'light'); }} style={{ flex: 1, minHeight: 132, padding: 10, borderRadius: 15, borderWidth: active ? 2 : 1, borderColor: active ? colors.accent : colors.border, backgroundColor: mode === 'dark' ? '#171B24' : colors.surface }}>
      <View style={{ flex: 1, borderRadius: 10, padding: 10, justifyContent: 'space-between', backgroundColor: mode === 'dark' ? '#222B3A' : '#F7F5EF' }}><Text style={{ color: mode === 'dark' ? '#F4F7FC' : '#2F3542', fontSize: 11, fontWeight: '800' }}>Rhythm</Text><Text style={{ color: mode === 'dark' ? '#F4F7FC' : '#2F3542', fontSize: 16, fontWeight: '800' }}>今日のTask</Text><Text style={{ color: mode === 'dark' ? '#B4C0D4' : '#697386', fontSize: 10 }}>静かに整える</Text></View>
      <Text style={{ marginTop: 8, color: active ? colors.accent : colors.muted, fontSize: 12, fontWeight: '900' }}>{label}{active ? '  ✓' : ''}</Text>
    </Pressable>;
  };
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={sheetView === 'fullscreenPreview' ? () => setSheetView('settings') : onClose}>
    <View style={{ flex: 1, justifyContent: sheetView === 'fullscreenPreview' ? 'flex-start' : 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' }}>
      <View style={sheetView === 'fullscreenPreview'
        ? { flex: 1, height: '100%', maxHeight: '100%', backgroundColor: colors.background }
        : { height: '92%', maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, backgroundColor: colors.background }}>
        {fullscreenPreview ? <View style={{ flex: 1, display: sheetView === 'fullscreenPreview' ? 'flex' : 'none' }}>{fullscreenPreview(() => setSheetView('settings'), visible)}</View> : null}
        <View style={{ flex: 1, display: sheetView === 'settings' ? 'flex' : 'none' }}>
        <View style={{ alignSelf: 'center', width: 42, height: 4, borderRadius: 3, backgroundColor: colors.border }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>デザインを変更</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>Mono・Design・Photoをここから選べます</Text></View><Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted, fontSize: 26, fontWeight: '300' }}>×</Text></Pressable></View>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 12 }}>{tabButton('mono', 'シンプル')}{tabButton('chic', 'デザイン')}{tabButton('photo', '写真')}</View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 72 }} showsVerticalScrollIndicator={false}>
          <DesignAppliedPreview tab={tab} selectedMode={selectedMode} designMode={designMode} systemColorScheme={systemColorScheme} monoAppearance={monoAppearance} monoPattern={visibleMonoPattern} chicPattern={chicPattern} chicCheckColor={chicCheckColor} chicPalette={chicPalette} photoTheme={photoTheme} previewPhotoUri={previewPhotoUri} colors={colors} styles={styles} helpers={helpers} components={components} />
          {fullscreenPreview && <Pressable accessibilityRole="button" accessibilityLabel="Today画面を全画面で試す" onPress={() => setSheetView('fullscreenPreview')} style={{ marginTop: 9, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.accent, fontSize: 12, fontWeight: '900' }}>全画面で試す</Text></Pressable>}
          <DesignStatusCards label={statusLabel} previewing={!previewMatchesSaved} colors={colors} purchased={designCustomizePurchased} planTier={planTier} onOpen={onOpenDesignAccess ?? onOpenDesignCustomize ?? (() => onPremium('photo_design'))} />
          {tab === 'mono' && <View style={{ marginTop: 12 }}><Text style={{ color: colors.text, fontSize: 14, fontWeight: '900' }}>モノトーンテーマ</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>外観</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 7 }}>{(['auto', 'light', 'dark'] as const).map((appearance) => { const active = monoAppearance === appearance; const label = appearance === 'auto' ? '自動' : appearance === 'light' ? 'Light' : 'Dark'; return <Pressable key={appearance} accessibilityRole="button" accessibilityLabel={`Mono ${label}`} accessibilityState={{ selected: active }} onPress={() => { onDesignMode('minimal'); onMonoAppearance(appearance); }} style={{ flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: active ? 2 : 1, borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.soft : 'transparent' }}><Text style={{ color: active ? colors.accent : colors.muted, fontSize: 11, fontWeight: '900' }}>{label}</Text></Pressable>; })}</View><Text style={{ color: colors.muted, fontSize: 10, marginTop: 5 }}>{monoAppearance === 'auto' ? `iPhoneの外観に合わせています（現在は${monoPreviewMode === 'dark' ? 'ダーク' : 'ライト'}）` : monoAppearance === 'dark' ? '暗いMonoを固定' : '明るいMonoを固定'}</Text><View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>{monoCard('minimal', 'Mono Light')}{monoCard('dark', 'Mono Dark')}</View><View style={{ marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}><Text style={{ color: colors.muted, fontSize: 11 }}>背景</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>{(['plain', 'looseLeaf', 'chic'] as const).map((pattern) => { const active = visibleMonoPattern === pattern; const locked = pattern !== 'plain' && !canUseMonoPaidPattern; return <Pressable key={pattern} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { if (pattern === 'plain' || canUseMonoPaidPattern) onMonoPattern(pattern); else onMonoPreview?.(pattern); }} style={{ flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: active ? 2 : 1, borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.soft : 'transparent', opacity: locked ? 0.82 : 1 }}><Text numberOfLines={1} style={{ color: active ? colors.accent : colors.muted, fontSize: 10, fontWeight: '800' }}>{pattern === 'plain' ? 'プレーン' : pattern === 'looseLeaf' ? `ルーズリーフ${locked ? ' 🔒' : ''}` : `シック${locked ? ' 🔒' : ''}`}</Text></Pressable>; })}</View><Text style={{ color: colors.muted, fontSize: 10, marginTop: 7 }}>プレーンは無料、ルーズリーフとシックは正式適用時に利用権を確認します。</Text></View></View>}
          {tab === 'chic' && <View style={{ marginTop: 12 }}><View style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}><Text style={{ color: colors.text, fontSize: 13, fontWeight: '900' }}>テーマカラー</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>選択中のaccentをデザインに反映します</Text><View style={{ marginTop: 8 }}><ThemeColorSelector color={chicCheckColor} onChange={onChicCheckColor} designMode="chic" /></View></View><ChicPatternSelector designMode="chic" chicPattern={chicPattern} chicCheckColor={chicCheckColor} planTier={planTier} designCustomizePurchased={designCustomizePurchased} onPattern={(pattern: ChicPattern) => { onDesignMode('chic'); onChicPattern(pattern); }} onCheckColor={onChicCheckColor} onPremium={() => onPremium('photo_design')} onPreview={onDesignPreview} /></View>}
          {tab === 'photo' && <View style={{ marginTop: 12 }}><View style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}><Text style={{ color: colors.text, fontSize: 13, fontWeight: '900' }}>テーマカラー</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>写真の上に重ねるUIのaccentを選べます</Text><View style={{ marginTop: 8 }}><ThemeColorSelector color={chicCheckColor} onChange={onChicCheckColor} designMode="photo" /></View></View><Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 12 }}>写真を使う</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>正式利用はデザインカスタマイズ対象ですが、選択・Preview・全画面試着は無料です。</Text><Pressable accessibilityRole="button" accessibilityLabel={(previewPhotoUri ?? photoTheme.imageUri) ? '写真を変更して試す' : '写真を選んで試す'} onPress={() => onPickPhotoPreview ? onPickPhotoPreview() : onPickPhotoTheme('background')} style={{ marginTop: 9, minHeight: 42, borderRadius: 11, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.onAccent, fontSize: 12, fontWeight: '900' }}>{(previewPhotoUri ?? photoTheme.imageUri) ? '写真を変更して試す' : '写真を選んで試す'}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => onDesignMode('photo')} style={{ marginTop: 7, minHeight: 38, borderRadius: 11, backgroundColor: selectedMode === 'photo' ? colors.soft : 'transparent', borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '900' }}>{selectedMode === 'photo' ? '写真デザインを使用中' : '写真デザインを使う'}{selectedMode !== 'photo' && !designCustomizePurchased && planTier !== 'premium' ? ' 🔒' : ''}</Text></Pressable><PhotoThemeSettingsCard photoTheme={photoTheme} designMode={designMode} chicPalette={chicPalette} planTier={planTier} designCustomizePurchased={designCustomizePurchased} onPremium={onPremium} onPick={onPickPhotoTheme} onAdjust={onAdjustPhotoTheme} onClear={onClearPhotoTheme} styles={styles} /></View>}
        </ScrollView>
        <Pressable accessibilityRole="button" onPress={onClose} style={{ marginHorizontal: 18, marginBottom: 18, minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}><Text style={{ color: colors.onAccent, fontSize: 13, fontWeight: '900' }}>閉じる</Text></Pressable>
        </View>
      </View>
    </View>
  </Modal>;
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
  designPreviewPhotoUri,
  designPreviewMonoPattern,
  travelApps,
  widgetSettings,
  onPickWidgetPhoto,
  onUnlockWidgetPhoto,
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
  onMonoPreview,
  onHapticsEnabled,
  onPremiumTrialReminderEnabled,
  onLiveActivityEnabled,
  onChicPattern,
  onDesignPreview,
  onChicCheckColor,
  onSaveAffirmation,
  onDeleteAffirmation,
  onSaveAffirmationCustomText,
  onDeleteAffirmationCustomText,
  onPickPhotoTheme,
  onPickPhotoPreview,
  onAdjustPhotoTheme,
  onClearPhotoTheme,
  onTravelAppsChange,
  templates,
  savedTemplates,
  onAddTemplate,
  onDeleteTemplate,
  onPremium,
  onDeleteSavedTemplate,
  onOpenCaptureStudio,
  designCustomizePurchased = false,
  canUseMonoPaidPattern = false,
  widgetPlanTier,
  widgetDesignCustomizePurchased,
  widgetEntitlementOverride,
  onWidgetEntitlementOverrideChange,
  onResetWidgetPhotoUnlock,
  designCustomizePrice,
  designCustomizePriceStatus,
  onOpenDesignCustomize,
  onOpenDesignAccess,
  fullscreenPreview,
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
  designPreviewPhotoUri?: string;
  designPreviewMonoPattern?: 'plain' | 'looseLeaf' | 'chic';
  travelApps: TravelAppSettings;
  widgetSettings: WidgetSettings;
  onPickWidgetPhoto?: (widgetType?: WidgetType, override?: WidgetEntitlementOverride) => void;
  onUnlockWidgetPhoto?: (widgetType: WidgetType, override?: WidgetEntitlementOverride) => void;
  widgetPhotoUnlock?: { widgetType: WidgetType | null; expiresAt: string | null };
  entitlementsResolved?: boolean;
  onRemoveAffirmationPhoto?: (index?: number) => void;
  onWidgetGuide?: () => void;
  onRefreshWidget?: () => void | Promise<void>;
  onWidgetSectionOpened?: () => void;
  onSize: (size: WidgetSize) => void;
  onWidgetSettings: (settings: WidgetSettings) => void;
  onShowCompleted: (value: boolean) => void;
  onCompletionIcon: (icon: string) => void;
  onDesignMode: (mode: DesignMode) => void;
  onMonoAppearance: (appearance: 'auto' | 'light' | 'dark') => void;
  onMonoPattern: (pattern: 'plain' | 'looseLeaf' | 'chic') => void;
  onMonoPreview?: (pattern: 'looseLeaf' | 'chic') => void;
  onHapticsEnabled: (value: boolean) => void;
  onPremiumTrialReminderEnabled?: (value: boolean) => void;
  onLiveActivityEnabled?: (value: boolean) => void;
  liveActivityDisplayOptions?: LiveActivityDisplayOptions;
  onLiveActivityDisplayOptionsChange?: (value: LiveActivityDisplayOptions) => void;
  liveActivityCustomization?: LiveActivityCustomizationSettings;
  onLiveActivityCustomizationChange?: (value: LiveActivityCustomizationSettings) => void;
  onChicPattern: (pattern: ChicPattern) => void;
  onDesignPreview: (pattern: ChicPattern) => void;
  onChicCheckColor: (color: ChicCheckColor) => void;
  onSaveAffirmation: (affirmation: Affirmation) => Promise<void> | void;
  onDeleteAffirmation: (affirmation: Affirmation) => Promise<void> | void;
  onSaveAffirmationCustomText: (text: AffirmationCustomText) => void;
  onDeleteAffirmationCustomText: (id: string) => void;
  onPickPhotoTheme: (target: PhotoThemePhotoTarget) => void;
  onPickPhotoPreview?: () => void;
  onAdjustPhotoTheme: (target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>) => void;
  onClearPhotoTheme: (target: PhotoThemePhotoTarget) => void;
  onTravelAppsChange: (settings: TravelAppSettings) => void;
  templates: string[];
  savedTemplates: PremiumTaskTemplate[];
  onAddTemplate: (title: string) => void;
  onDeleteTemplate: (title: string) => void;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onDeleteSavedTemplate: (template: PremiumTaskTemplate) => void;
  onOpenCaptureStudio?: () => void;
  designCustomizePurchased?: boolean;
  canUseMonoPaidPattern?: boolean;
  widgetPlanTier?: PlanTier;
  widgetDesignCustomizePurchased?: boolean;
  widgetEntitlementOverride?: WidgetEntitlementOverride;
  onWidgetEntitlementOverrideChange?: (override: WidgetEntitlementOverride) => void;
  onResetWidgetPhotoUnlock?: () => void;
  designCustomizePrice?: string;
  designCustomizePriceStatus?: 'loading' | 'ready' | 'unavailable';
  onOpenDesignCustomize?: () => void;
  onOpenDesignAccess?: () => void;
  fullscreenPreview?: (onBack: () => void, sheetVisible: boolean) => React.ReactNode;
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
  const { BThemeRibbonDecoration, CThemeRibbonDecoration, ChicPatternDecor, ChicPatternSelector, ThemeColorSelector, SettingsDisclosure, NotificationManagerCard, PremiumFeatureIcon } = components;
  const [newTemplate, setNewTemplate] = useState('');
  const [liveActivitySettingsOpen, setLiveActivitySettingsOpen] = useState(false);
  const [widgetRefreshing, setWidgetRefreshing] = useState(false);
  const [widgetSheetOpen, setWidgetSheetOpen] = useState(false);
  const [aboutSheetOpen, setAboutSheetOpen] = useState(false);
  const [designSheetOpen, setDesignSheetOpen] = useState(initialAppearanceOpen || captureDesignOnly);
  const selectedMode = selectedDesignMode ?? designMode;
  const isDark = designMode === 'dark';
  const isDesign = selectedMode === 'chic' || selectedMode === 'photo';
  const isMono = selectedMode === 'minimal' || selectedMode === 'dark';
  // Mono Plain is free; Loose Leaf and Chic require Design access only when
  // formally applied. Their preview and try-on remain available to everyone.
  const effectiveMonoPattern = monoPattern;
  const [expandedSetting, setExpandedSetting] = useState<'appearance' | 'travelApps' | 'notifications' | 'quick' | 'premium' | 'about' | null>(captureDesignOnly || initialAppearanceOpen ? 'appearance' : null);
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
  const designSummary = selectedMode === 'minimal' || selectedMode === 'dark'
    ? (monoAppearance === 'auto' ? `Mono ${designMode === 'dark' ? 'Dark' : 'Light'}（自動）` : monoAppearance === 'dark' ? 'Mono Dark' : 'Mono Light')
      : selectedMode === 'photo'
        ? `Photo / ${checkColorLabel}`
        : chicPattern === 'nightSky'
          ? 'Night Sky'
          : chicPattern === 'stationery'
            ? 'Stationery'
            : chicPattern === 'botanicalBackground'
              ? 'Botanical'
              : chicPattern === 'ocean'
                ? 'Ocean'
                : `Design / ${checkColorLabel}`;
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
        <Pressable onPress={onResetWidgetPhotoUnlock} style={{ minHeight: 42, marginTop: 10, borderRadius: 11, borderWidth: 1, borderColor: isDark ? '#8F9BB0' : '#C9D0DD', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: isDark ? '#F4F7FC' : '#33415D', fontSize: 12, fontWeight: '800' }}>Widget広告状態をリセット</Text></Pressable>
        {onOpenCaptureStudio ? <Pressable onPress={onOpenCaptureStudio} style={{ minHeight: 42, marginTop: 10, borderRadius: 11, backgroundColor: isDark ? '#40506A' : '#EEF1F7', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: isDark ? '#F4F7FC' : '#33415D', fontSize: 12, fontWeight: '800' }}>Onboarding Capture Studio</Text></Pressable> : null}
        <Pressable onPress={resetDevelopmentData} style={{ minHeight: 42, marginTop: 10, borderRadius: 11, borderWidth: 1, borderColor: isDark ? '#8F9BB0' : '#C9D0DD', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: isDark ? '#F4F7FC' : '#33415D', fontSize: 12, fontWeight: '800' }}>初回起動状態に戻す</Text></Pressable>
      </View>}
      {!captureDesignOnly && <View style={styles.settingsDisclosure}>
        <Pressable accessibilityRole="button" accessibilityLabel="デザイン設定を開く" onPress={() => setDesignSheetOpen(true)} style={[styles.settingsDisclosureHeader, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}><View style={{ width: 32, alignItems: 'flex-start' }}><PremiumFeatureIcon name="palette" color={guideColors.accent} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.settingsDisclosureTitle, { color: guideColors.textPrimary }]}>デザイン</Text><Text style={[styles.settingsDisclosureSubtitle, { color: guideColors.textSecondary }]} numberOfLines={1}>{`現在：${designSummary}`}</Text></View></View>
          <Text style={[styles.settingsDisclosureChevron, { color: guideColors.accent }]}>›</Text>
        </Pressable>
      </View>}
      <DesignSettingsSheet
        visible={designSheetOpen}
        onClose={() => setDesignSheetOpen(false)}
        selectedMode={selectedMode}
        designMode={designMode}
        chicPalette={chicPalette}
        monoAppearance={monoAppearance}
        monoPattern={monoPattern}
        chicPattern={chicPattern}
        chicCheckColor={chicCheckColor}
        photoTheme={photoTheme}
        previewMonoPattern={designPreviewMonoPattern}
        previewPhotoUri={designPreviewPhotoUri}
        canUseMonoPaidPattern={canUseMonoPaidPattern}
        planTier={planTier}
        designCustomizePurchased={designCustomizePurchased}
        designCustomizePrice={designCustomizePrice}
        designCustomizePriceStatus={designCustomizePriceStatus}
        onDesignMode={onDesignMode}
        onMonoAppearance={onMonoAppearance}
        onMonoPattern={onMonoPattern}
        onMonoPreview={onMonoPreview}
        onChicPattern={onChicPattern}
        onChicCheckColor={onChicCheckColor}
        onDesignPreview={onDesignPreview}
        onPickPhotoTheme={onPickPhotoTheme}
        onPickPhotoPreview={onPickPhotoPreview}
        onAdjustPhotoTheme={onAdjustPhotoTheme}
        onClearPhotoTheme={onClearPhotoTheme}
        onPremium={onPremium}
        onOpenDesignCustomize={onOpenDesignCustomize}
        onOpenDesignAccess={onOpenDesignAccess}
        fullscreenPreview={fullscreenPreview}
        styles={styles}
        helpers={helpers}
        components={components}
      />
      {false && <SettingsDisclosure icon="palette" designMode={designMode} chicPalette={chicPalette} title="見た目" subtitle="Mono / Design / 写真を選ぶ" expanded={expandedSetting === 'appearance'} onPress={() => setExpandedSetting((current) => current === 'appearance' ? null : 'appearance')}>
      {!captureDesignOnly && <DesignCustomizeCard designMode={designMode} chicPalette={chicPalette} planTier={planTier} purchased={designCustomizePurchased} localizedPrice={designCustomizePrice} priceStatus={designCustomizePriceStatus} onOpen={onOpenDesignCustomize} onTry={() => onDesignPreview('floral')} />}
      <View accessibilityLabel={isDesign ? `Design ${checkColorLabel}` : 'Mono'} style={[styles.modeCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: chicPalette?.cardSurface, borderColor: chicPalette?.border }]}>
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
          <Pressable accessibilityRole="button" accessibilityLabel="Mono ルーズリーフ" accessibilityState={{ selected: effectiveMonoPattern === 'looseLeaf' }} style={[styles.monoThemeChoice, { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' }, effectiveMonoPattern === 'looseLeaf' && styles.monoThemeChoiceActive, !canUseMonoPaidPattern && { opacity: 0.82 }]} onPress={() => { if (canUseMonoPaidPattern) onMonoPattern('looseLeaf'); else onMonoPreview?.('looseLeaf'); }}><Text style={[styles.monoThemeChoiceText, effectiveMonoPattern === 'looseLeaf' && styles.monoThemeChoiceTextActive]}>{canUseMonoPaidPattern ? 'ルーズリーフ' : 'ルーズリーフ 🔒'}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Mono シック" accessibilityState={{ selected: effectiveMonoPattern === 'chic' }} style={[styles.monoThemeChoice, { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' }, effectiveMonoPattern === 'chic' && styles.monoThemeChoiceActiveDark, !canUseMonoPaidPattern && { opacity: 0.82 }]} onPress={() => { if (canUseMonoPaidPattern) onMonoPattern('chic'); else onMonoPreview?.('chic'); }}><Text style={[styles.monoThemeChoiceText, effectiveMonoPattern === 'chic' && styles.monoThemeChoiceTextActive]}>{canUseMonoPaidPattern ? 'シック' : 'シック 🔒'}</Text></Pressable>
        </View>
      </View>}
        {isDesign && <View style={{ marginTop: 12 }}>
          <Text style={[styles.fieldLabel, designMode === 'dark' && styles.darkAccentText, { color: designMode === 'dark' ? '#B4C0D4' : isDesign && chicPalette ? chicPalette?.textPrimary : getChicCheckColor(chicCheckColor).textPrimary }]}>テーマカラー</Text>
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
      </SettingsDisclosure>}
       {!captureDesignOnly && <>
        <SettingsDisclosure icon="widget" headerAction={<Pressable accessibilityRole="button" accessibilityLabel="ウィジェットを更新" accessibilityState={{ busy: widgetRefreshing, disabled: widgetRefreshing || !onRefreshWidget }} disabled={widgetRefreshing || !onRefreshWidget} onPress={() => {
         if (widgetRefreshing || !onRefreshWidget) return;
         setWidgetRefreshing(true);
         void Promise.resolve().then(() => onRefreshWidget()).finally(() => setWidgetRefreshing(false));
       }} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><PremiumFeatureIcon name="refresh" color={widgetRefreshing ? guideColors.accent : guideColors.textSecondary} /></Pressable>} designMode={designMode} chicPalette={chicPalette} title="ホーム画面のウィジェット" subtitle="追加・管理・使い方" expanded={false} onPress={() => {
         setWidgetSheetOpen(true);
         onWidgetSectionOpened?.();
       }} />
        <WidgetSettingsSheet
          visible={widgetSheetOpen}
          onClose={() => setWidgetSheetOpen(false)}
          widgetSettings={widgetSettings}
          onWidgetSettings={onWidgetSettings}
          onPickWidgetPhoto={onPickWidgetPhoto}
          onUnlockWidgetPhoto={onUnlockWidgetPhoto}
          widgetPhotoUnlock={widgetPhotoUnlock}
          entitlementsResolved={entitlementsResolved}
          onRemoveAffirmationPhoto={onRemoveAffirmationPhoto}
          widgetColors={isDesign && chicPalette ? {
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
          styles={styles}
          designPattern={isDesign && !(['stationery', 'botanicalBackground', 'ocean', 'nightSky'] as string[]).includes(chicPattern) ? chicPattern : 'plain'}
          designCheckColor={chicCheckColor}
          PatternDecor={ChicPatternDecor}
          planTier={widgetPlanTier ?? planTier}
          designCustomizePurchased={widgetDesignCustomizePurchased ?? designCustomizePurchased}
          widgetEntitlementOverride={widgetEntitlementOverride}
          onWidgetEntitlementOverrideChange={onWidgetEntitlementOverrideChange}
          onLockedWidget={(access) => {
            setWidgetSheetOpen(false);
            setTimeout(() => {
              if (access === 'premium') onPremium('widget');
              else if (onOpenDesignCustomize) onOpenDesignCustomize();
              else onPremium('photo_design');
            }, 180);
          }}
          onWidgetGuide={() => {
            setWidgetSheetOpen(false);
            setTimeout(() => onWidgetGuide?.(), 180);
          }}
        />
        <SettingsDisclosure icon="bellSparkle" headerAction={<View style={{ minWidth: 62, minHeight: 40, alignItems: 'flex-end', justifyContent: 'center' }}><Switch accessibilityRole="switch" accessibilityLabel="ライブアクティビティ" accessibilityState={{ checked: liveActivityEnabled }} value={liveActivityEnabled} onValueChange={(value) => onLiveActivityEnabled?.(value)} trackColor={{ false: isDark ? '#40506A' : baseTheme.border, true: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent }} thumbColor={liveActivityEnabled ? (isDesign && chicPalette ? chicPalette.onAccent : '#FFFFFF') : (isDark ? '#8F9BB0' : '#FFFFFF')} /></View>} designMode={designMode} chicPalette={chicPalette} title="ライブアクティビティ" subtitle="ロック画面・Dynamic Islandの表示" expanded={false} onPress={() => setLiveActivitySettingsOpen(true)} />
        {liveActivityDisplayOptions && onLiveActivityDisplayOptionsChange && liveActivityCustomization && onLiveActivityCustomizationChange ? <LiveActivitySettingsSheet
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
        /> : null}
        <SettingsDisclosure icon="bell" designMode={designMode} chicPalette={chicPalette} title="通知・フィードバック" subtitle="通知管理・触覚フィードバック" expanded={expandedSetting === 'notifications'} onPress={() => setExpandedSetting((current) => current === 'notifications' ? null : 'notifications')}>
        <NotificationManagerCard designMode={designMode} chicPalette={chicPalette} />
        {onPremiumTrialReminderEnabled ? <View style={[styles.settingsCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]}><View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={[styles.switchTitle, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>無料期間終了前のお知らせ</Text><Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>StoreKitで終了日時を確認できた場合、前日に通知します</Text></View><Switch value={premiumTrialReminderEnabled !== false} onValueChange={onPremiumTrialReminderEnabled} trackColor={{ false: isDark ? '#40506A' : baseTheme.border, true: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent }} thumbColor={premiumTrialReminderEnabled !== false ? (isDesign && chicPalette ? chicPalette.onAccent : '#FFFFFF') : (isDark ? '#8F9BB0' : '#FFFFFF')} /></View></View> : null}
       <View style={[styles.settingsCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: guideColors.surface, borderColor: guideColors.border }]}><View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={[styles.switchTitle, isDark && styles.darkBodyText, isDesign && chicPalette && { color: guideColors.textPrimary }]}>触覚フィードバック</Text><Text style={[styles.switchCopy, isDark && styles.darkMutedText, isDesign && chicPalette && { color: guideColors.textSecondary }]}>完了や集中開始を振動で知らせます</Text></View><Switch value={hapticsEnabled} onValueChange={(value) => onHapticsEnabled(value)} trackColor={{ false: isDark ? '#40506A' : baseTheme.border, true: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent }} thumbColor={hapticsEnabled ? (isDesign && chicPalette ? chicPalette.onAccent : '#FFFFFF') : (isDark ? '#8F9BB0' : '#FFFFFF')} /></View></View>
       </SettingsDisclosure>
       <SettingsDisclosure icon="pin" designMode={designMode} chicPalette={chicPalette} title="移動アプリ連携" subtitle="乗換・タクシーアプリを登録" expanded={expandedSetting === 'travelApps'} onPress={() => setExpandedSetting((current) => current === 'travelApps' ? null : 'travelApps')}>
         <TravelAppsSettingsCard settings={travelApps} onChange={onTravelAppsChange} planTier={planTier} designMode={designMode} chicPalette={chicPalette} onPremium={onPremium} />
       </SettingsDisclosure>
        <SettingsDisclosure icon="copy" designMode={designMode} chicPalette={chicPalette} title="ひな型" subtitle="よく使うタスクや設定を保存" expanded={expandedSetting === 'quick'} onPress={() => setExpandedSetting((current) => current === 'quick' ? null : 'quick')}>
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
           <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}><View style={{ width: 32, alignItems: 'flex-start' }}><PremiumFeatureIcon name="sparkle" color={isDesign && chicPalette ? guideColors.accent : baseTheme.primaryAccent} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.settingsDisclosureTitle, { color: isDesign && chicPalette ? guideColors.textPrimary : baseTheme.primaryText }]}>{planTier === 'premium' ? 'プレミアム利用中' : 'Rhythmプレミアム'}</Text><Text style={[styles.settingsDisclosureSubtitle, { color: isDesign && chicPalette ? guideColors.textSecondary : baseTheme.secondaryText }]}>{planTier === 'premium' ? 'プレミアムの機能を利用中です' : 'もっとRhythmを便利に使う'}</Text></View></View>
           <Text style={[styles.settingsDisclosureChevron, { color: isDesign && chicPalette ? guideColors.accent : baseTheme.primaryAccent }]}>›</Text>
         </Pressable>
       </View>
       <SettingsDisclosure icon="info" designMode={designMode} chicPalette={chicPalette} title="アプリについて" subtitle="情報・プライバシー・お問い合わせ" expanded={false} onPress={() => setAboutSheetOpen(true)} />
       <AboutAppSheet visible={aboutSheetOpen} onClose={() => setAboutSheetOpen(false)} colors={{ background: isDesign && chicPalette ? chicPalette.background : baseTheme.screenBackground, surface: isDesign && chicPalette ? chicPalette.cardSurface : baseTheme.surface, border: isDesign && chicPalette ? chicPalette.border : baseTheme.border, text: isDesign && chicPalette ? chicPalette.textPrimary : baseTheme.primaryText, muted: isDesign && chicPalette ? chicPalette.textSecondary : baseTheme.secondaryText, accent: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent, onAccent: isDesign && chicPalette ? chicPalette.onAccent : (isDark ? baseTheme.screenBackground : '#FFFFFF') }} />
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
