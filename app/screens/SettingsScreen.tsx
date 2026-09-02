import React, { useState } from 'react';
import { Alert, DevSettings, Image, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChicCheckColor, ChicPattern, ChicThemePalette, DesignMode, getDesignCheckColorLabel, getThemeTokens } from '../theme';
import { Affirmation, AffirmationCustomText, PhotoThemePhotoTarget, PhotoThemeSettings, Task, WidgetSettings, WidgetSize, WidgetType } from '../types';
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

// Keep the production unit configurable without scattering IDs through the UI.
// Development builds use Google's test unit unless an explicit test/production
// override is supplied by the build environment.
const SETTINGS_BANNER_AD_UNIT_ID = process.env.EXPO_PUBLIC_RHYTHM_BANNER_AD_UNIT_ID ?? TestIds.BANNER;

function DesignCustomizeCard({ designMode, chicPalette, planTier, purchased, localizedPrice, priceStatus, onOpen, onTry }: { designMode: DesignMode; chicPalette?: ChicThemePalette; planTier: PlanTier; purchased: boolean; localizedPrice?: string; priceStatus?: 'loading' | 'ready' | 'unavailable'; onOpen?: () => void; onTry: () => void }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const colors = designMode === 'chic' && chicPalette
    ? { surface: chicPalette.cardSurface, border: chicPalette.border, text: chicPalette.textPrimary, muted: chicPalette.textSecondary, accent: chicPalette.accent, soft: chicPalette.accentSoft, onAccent: chicPalette.onAccent }
    : { surface: theme.colors.surface, border: theme.colors.border, text: theme.colors.primaryText, muted: theme.colors.secondaryText, accent: theme.colors.primaryAccent, soft: theme.colors.softAccent, onAccent: designMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF' };
  return <View style={{ marginTop: 14, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>Design Customize</Text>
    {planTier === 'premium' ? <Text style={{ color: colors.accent, marginTop: 6, fontSize: 12, fontWeight: '800' }}>Premiumで利用できます</Text> : purchased ? <Text style={{ color: colors.accent, marginTop: 6, fontSize: 12, fontWeight: '800' }}>購入済み</Text> : <>
      <Text style={{ color: colors.muted, marginTop: 6, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>RhythmPaceの見た目を、もっと自分らしく。{ '\n' }花柄・チェック・ドット・写真カスタマイズを買い切りで利用できます。Widgetごとの写真設定は順次対応予定です。</Text>
      <Text style={{ color: colors.accent, marginTop: 8, fontSize: 14, fontWeight: '900' }}>{priceStatus === 'loading' ? '価格を取得中…' : localizedPrice ? `買い切り ${localizedPrice}` : '価格は購入画面で確認'}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 11 }}>
        <Pressable onPress={onTry} style={{ flex: 1, minHeight: 40, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.accent, fontSize: 12, fontWeight: '900' }}>試してみる</Text></Pressable>
        <Pressable onPress={onOpen} style={{ flex: 1, minHeight: 40, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.onAccent, fontSize: 12, fontWeight: '900' }}>購入画面を開く</Text></Pressable>
      </View>
      <Text style={{ color: colors.muted, marginTop: 8, fontSize: 10, lineHeight: 15 }}>広告やTrialで無料で試すこともできます。</Text>
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
  hapticsEnabled,
  premiumTrialReminderEnabled = true,
  chicPalette,
  chicPattern,
  chicCheckColor,
  affirmations,
  affirmationCustomTexts,
  photoTheme,
  travelApps,
  widgetSettings,
  onPickWidgetPhoto,
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
  onHapticsEnabled,
  onPremiumTrialReminderEnabled,
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
  hapticsEnabled: boolean;
  premiumTrialReminderEnabled?: boolean;
  chicPalette?: ChicThemePalette;
  chicPattern: ChicPattern;
  chicCheckColor: ChicCheckColor;
  affirmations: Affirmation[];
  affirmationCustomTexts: AffirmationCustomText[];
  photoTheme: PhotoThemeSettings;
  travelApps: TravelAppSettings;
  widgetSettings: WidgetSettings;
  onPickWidgetPhoto?: (widgetType?: WidgetType) => void;
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
  onHapticsEnabled: (value: boolean) => void;
  onPremiumTrialReminderEnabled?: (value: boolean) => void;
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
  const { getChicPatternVisual, hasPremiumAccess, getChicCheckColor, chicCheckColorChoices, countdownToClock, getUrgencyStatus, getNextBestAction, designModes, completionIcons, summarizePremiumTaskTemplate } = helpers;
  const { BThemeRibbonDecoration, CThemeRibbonDecoration, ChicPatternDecor, ChicPatternSelector, SettingsDisclosure, NotificationManagerCard } = components;
  const [newTemplate, setNewTemplate] = useState('');
  const selectedMode = selectedDesignMode ?? designMode;
  const isDark = designMode === 'dark';
  const isDesign = selectedMode === 'chic' || selectedMode === 'photo';
  const [expandedSetting, setExpandedSetting] = useState<'appearance' | 'travelApps' | 'notifications' | 'taskDisplay' | 'quick' | 'widget' | 'premium' | 'about' | null>(captureDesignOnly || initialAppearanceOpen ? 'appearance' : null);
  const previewTasks = tasks.filter((task) => showCompleted || !task.done).slice(0, size === 'small' ? 2 : 3);
  const isCheckPattern = chicPattern === 'checkLavenderSatin' || chicPattern === 'checkBeigeNoir' || chicPattern === 'checkMauveFrame';
  const patternVisual = isCheckPattern ? getChicCheckColor(chicCheckColor) : getChicPatternVisual(chicPattern, chicPalette);
  const checkColorLabel = getDesignCheckColorLabel(chicCheckColor);
  const baseTheme = helpers.getThemeTokens(designMode).colors;
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
      {__DEV__ && !captureDesignOnly && <View style={[styles.settingsCard, isDark && styles.darkSurface]}><Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>開発用確認環境</Text><Text style={[styles.switchCopy, isDark && styles.darkAccentText]}>開発用の固定プランで動作を確認できます。</Text><Text style={[styles.devPlanCurrent, isDark && styles.darkAccentText]}>現在：{planTier === 'premium' ? 'Premium版' : '無料版'}</Text>{onOpenCaptureStudio ? <Pressable onPress={onOpenCaptureStudio} style={{ minHeight: 42, marginTop: 10, borderRadius: 11, backgroundColor: isDark ? '#40506A' : '#EEF1F7', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: isDark ? '#F4F7FC' : '#33415D', fontSize: 12, fontWeight: '800' }}>Onboarding Capture Studio</Text></Pressable> : null}<Pressable onPress={resetDevelopmentData} style={{ minHeight: 42, marginTop: 10, borderRadius: 11, borderWidth: 1, borderColor: isDark ? '#8F9BB0' : '#C9D0DD', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: isDark ? '#F4F7FC' : '#33415D', fontSize: 12, fontWeight: '800' }}>初回起動状態に戻す</Text></Pressable></View>}
      <SettingsDisclosure designMode={designMode} title="見た目" subtitle="Mono / Design / 写真を選ぶ" expanded={expandedSetting === 'appearance'} onPress={() => setExpandedSetting((current) => current === 'appearance' ? null : 'appearance')}>
      <View accessibilityLabel={isDesign ? `Design ${checkColorLabel}` : 'Mono'} style={[styles.modeCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
        {selectedMode === 'chic' && chicPattern === 'checkLavenderSatin' && <BThemeRibbonDecoration compact />}
        {selectedMode === 'chic' && chicPattern === 'checkBeigeNoir' && <CThemeRibbonDecoration compact />}
        {selectedMode === 'chic' && <ChicPatternSelector designMode={designMode} chicPattern={chicPattern} chicCheckColor={chicCheckColor} planTier={planTier} designCustomizePurchased={designCustomizePurchased} onPattern={onChicPattern} onCheckColor={onChicCheckColor} onPremium={onPremium} onPreview={onDesignPreview} />}
        <View style={styles.modeChoices}>
          {designModes.map((mode: { id: 'minimal' | 'chic'; description: string }) => (
            <Pressable key={mode.id} style={[styles.modeChoice, (selectedMode === mode.id || (mode.id === 'minimal' && selectedMode === 'dark')) && styles.modeChoiceActive, mode.id === 'minimal' && selectedMode === 'dark' && styles.modeChoiceActiveDark, mode.id === 'minimal' && selectedMode === 'minimal' && !isDark && { borderColor: baseTheme.primaryAccent, backgroundColor: baseTheme.softAccent }, mode.id === 'chic' && selectedMode === 'chic' && chicPalette && { borderColor: chicPalette.accent, backgroundColor: chicPalette.cardTint }]} onPress={() => onDesignMode(mode.id === 'minimal' && selectedMode === 'dark' ? 'dark' : mode.id)}>
              <View style={[styles.modeMiniPreview, mode.id === 'minimal' && styles.modeMiniMinimal, isDark && mode.id === 'minimal' && styles.modeMiniMinimalDark, mode.id === 'chic' && styles.modeMiniChic, ]}>
                {mode.id === 'minimal' ? <><View style={[styles.modeMiniBlackBlock, isDark && styles.modeMiniDarkBlock]} /><Text style={[styles.modeMiniNumber, isDark && styles.modeMiniDarkNumber]}>03</Text><View style={[styles.modeMiniLine, isDark && styles.modeMiniDarkLine]} /></> : <>{selectedMode === 'chic' && <ChicPatternDecor pattern={chicPattern} accent={patternVisual.accent} warm={patternVisual.warm} checkColor={chicCheckColor} preview />}<View style={styles.modeMiniGlass} /><Text style={styles.modeMiniSparkle}>✦</Text></>}
              </View>
              <Text style={[styles.modeName, (selectedMode === mode.id || (mode.id === 'minimal' && selectedMode === 'dark')) && styles.modeNameActive, mode.id === 'minimal' && selectedMode === 'minimal' && !isDark && { color: baseTheme.primaryAccent }, mode.id === 'minimal' && selectedMode === 'dark' && styles.modeNameDark, mode.id === 'chic' && selectedMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{mode.id === 'minimal' ? 'Mono' : 'Design'}</Text>
              <Text style={[styles.modeDescription, isDark && styles.darkAccentText]}>{mode.description}</Text>
               {mode.id === 'minimal' && <View style={styles.monoThemeChoices}>
                 <Pressable style={[styles.monoThemeChoice, monoAppearance === 'auto' && styles.monoThemeChoiceActive]} onPress={() => { onDesignMode('minimal'); onMonoAppearance('auto'); }}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.monoThemeChoiceText, monoAppearance === 'auto' && styles.monoThemeChoiceTextActive]}>自動</Text></Pressable>
                <Pressable accessibilityLabel="Mono Light" style={[styles.monoThemeChoice, selectedMode === 'minimal' && monoAppearance === 'light' && styles.monoThemeChoiceActive]} onPress={() => { onDesignMode('minimal'); onMonoAppearance('light'); }}><Text style={[styles.monoThemeChoiceText, selectedMode === 'minimal' && monoAppearance === 'light' && styles.monoThemeChoiceTextActive]}>白</Text></Pressable>
                <Pressable accessibilityLabel="Mono Dark" style={[styles.monoThemeChoice, selectedMode === 'dark' && monoAppearance === 'dark' && styles.monoThemeChoiceActiveDark]} onPress={() => { onDesignMode('dark'); onMonoAppearance('dark'); }}><Text style={[styles.monoThemeChoiceText, selectedMode === 'dark' && monoAppearance === 'dark' && styles.monoThemeChoiceTextActive]}>黒</Text></Pressable>
              </View>}
            </Pressable>
          ))}
        </View>
        <Pressable style={[styles.savedTemplateLocked, selectedMode === 'photo' && styles.patternChoiceActive]} onPress={() => onDesignMode('photo')}>
          {photoTheme.imageUri ? <Image source={{ uri: photoTheme.imageUri }} style={{ width: 54, height: 42, borderRadius: 9, marginRight: 10 }} /> : <View style={{ width: 54, height: 42, borderRadius: 9, marginRight: 10, backgroundColor: '#F2DDE5', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#9C5D79', fontSize: 17 }}>▧</Text></View>}
          <View style={{ flex: 1 }}><Text style={styles.savedTemplateLockedTitle}>写真デザイン</Text><Text style={styles.savedTemplateLockedCopy}>好きな写真を背景やトップ画像に使う</Text></View>
          <Text style={planTier === 'premium' ? styles.affirmationEdit : styles.taskTemplateSavePremium}>{planTier === 'premium' ? (selectedMode === 'photo' ? '選択中' : '選ぶ') : designCustomizePurchased ? (selectedMode === 'photo' ? '選択中' : '選ぶ') : (selectedMode === 'photo' ? '広告で解放' : '試す')}</Text>
        </Pressable>
          {selectedMode === 'photo' && <PhotoThemeSettingsCard photoTheme={photoTheme} designMode={designMode} chicPalette={chicPalette} planTier={planTier} designCustomizePurchased={designCustomizePurchased} onPremium={onPremium} onPick={onPickPhotoTheme} onAdjust={onAdjustPhotoTheme} onClear={onClearPhotoTheme} styles={styles} />}
        {!captureDesignOnly && <DesignCustomizeCard designMode={designMode} chicPalette={chicPalette} planTier={planTier} purchased={designCustomizePurchased} localizedPrice={designCustomizePrice} priceStatus={designCustomizePriceStatus} onOpen={onOpenDesignCustomize} onTry={() => onDesignPreview('floral')} />}
      </View>
      </SettingsDisclosure>
      {!captureDesignOnly && <>
       <SettingsDisclosure designMode={designMode} title="移動アプリ連携" subtitle="乗換・タクシーアプリを登録" expanded={expandedSetting === 'travelApps'} onPress={() => setExpandedSetting((current) => current === 'travelApps' ? null : 'travelApps')}>
         <TravelAppsSettingsCard settings={travelApps} onChange={onTravelAppsChange} planTier={planTier} designMode={designMode} chicPalette={chicPalette} onPremium={onPremium} />
       </SettingsDisclosure>
       <SettingsDisclosure designMode={designMode} title="通知・フィードバック" subtitle="通知管理・触覚フィードバック" expanded={expandedSetting === 'notifications'} onPress={() => setExpandedSetting((current) => current === 'notifications' ? null : 'notifications')}>
         <NotificationManagerCard designMode={designMode} />
       {onPremiumTrialReminderEnabled ? <View style={[styles.settingsCard, isDark && styles.darkSurface]}><View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={[styles.switchTitle, isDark && styles.darkBodyText]}>無料期間終了前のお知らせ</Text><Text style={[styles.switchCopy, isDark && styles.darkMutedText]}>StoreKitで終了日時を確認できた場合、前日に通知します</Text></View><Switch value={premiumTrialReminderEnabled !== false} onValueChange={onPremiumTrialReminderEnabled} trackColor={{ false: isDark ? '#40506A' : baseTheme.border, true: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent }} thumbColor={premiumTrialReminderEnabled !== false ? (isDesign && chicPalette ? chicPalette.onAccent : '#FFFFFF') : (isDark ? '#8F9BB0' : '#FFFFFF')} /></View></View> : null}
       <View style={[styles.settingsCard, isDark && styles.darkSurface]}><View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={[styles.switchTitle, isDark && styles.darkBodyText]}>触覚フィードバック</Text><Text style={[styles.switchCopy, isDark && styles.darkMutedText]}>完了や集中開始を振動で知らせます</Text></View><Switch value={hapticsEnabled} onValueChange={(value) => onHapticsEnabled(value)} trackColor={{ false: isDark ? '#40506A' : baseTheme.border, true: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent }} thumbColor={hapticsEnabled ? (isDesign && chicPalette ? chicPalette.onAccent : '#FFFFFF') : (isDark ? '#8F9BB0' : '#FFFFFF')} /></View></View>
       </SettingsDisclosure>
        <SettingsDisclosure designMode={designMode} title="タスク" subtitle="完了アイコンを設定" expanded={expandedSetting === 'taskDisplay'} onPress={() => setExpandedSetting((current) => current === 'taskDisplay' ? null : 'taskDisplay')}>
        <View style={[styles.settingsCard, isDark && styles.darkSurface]}>
          <Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>完了アイコンを設定</Text>
          <View style={styles.iconChoices}>{completionIcons.map((icon: string) => <Pressable key={icon} style={[styles.iconChoice, { backgroundColor: isDesign && chicPalette ? chicPalette.surfaceSubtle : baseTheme.secondarySurface, borderColor: isDesign && chicPalette ? chicPalette.border : baseTheme.border }, completionIcon === icon && { backgroundColor: isDesign && chicPalette ? chicPalette.accentSoft : baseTheme.softAccent, borderColor: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent }]} onPress={() => onCompletionIcon(icon)}><Text style={[styles.iconChoiceText, { color: isDesign && chicPalette ? chicPalette.textSecondary : baseTheme.secondaryText }, completionIcon === icon && { color: isDesign && chicPalette ? chicPalette.accent : baseTheme.primaryAccent }]}>{icon}</Text></Pressable>)}</View>
        </View>
        </SettingsDisclosure>
        <SettingsDisclosure designMode={designMode} title="ひな型" subtitle="よく使うタスクや設定を保存" expanded={expandedSetting === 'quick'} onPress={() => setExpandedSetting((current) => current === 'quick' ? null : 'quick')}>
      <View style={[styles.settingsCard, isDark && styles.darkSurface]}>
        <Text style={[styles.switchCopy, isDark && styles.darkMutedText]}>よく登録するタスクを自分用に保存できます</Text>
        <View style={styles.templateAddRow}><TextInput value={newTemplate} onChangeText={setNewTemplate} placeholder="例：水筒をバッグに入れる" placeholderTextColor={baseTheme.secondaryText} style={[styles.templateInput, { color: baseTheme.primaryText }]} /><Pressable style={[styles.templateAddButton, { backgroundColor: baseTheme.primaryAccent }]} onPress={() => { const clean = newTemplate.trim(); if (!clean) return; onAddTemplate(clean); setNewTemplate(''); }}><Text style={styles.templateAddButtonText}>追加</Text></Pressable></View>
        <View style={styles.templateList}>{templates.map((item) => <View key={item} style={[styles.templateRow, isDark && styles.darkSurface]}><Text style={[styles.templateRowText, isDark && styles.darkBodyText]}>{item}</Text><Pressable onPress={() => onDeleteTemplate(item)}><Text style={[styles.templateDelete, isDark && styles.darkAccentText]}>×</Text></Pressable></View>)}</View>
      </View>
      <View style={[styles.settingsCard, isDark && styles.darkSurface]}>
        <View style={styles.historyHeader}><View><Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>マイひな型</Text><Text style={[styles.switchCopy, isDark && styles.darkAccentText]}>設定ごと保存して、次回そのまま呼び出す</Text></View><Text style={styles.taskTemplateSavePremium}>Premium</Text></View>
       {hasPremiumAccess(planTier, 'saved_task_templates') ? savedTemplates.length === 0 ? <Text style={[styles.savedTemplateEmpty, isDark && styles.darkMutedText]}>タスクの「•••」から「設定ごとひな型に保存」を選べます。</Text> : savedTemplates.map((template) => <View key={template.id} style={[styles.savedTemplateSettingRow, isDark && styles.darkSurface]}><View style={{ flex: 1 }}><Text style={[styles.savedTemplateSettingTitle, isDark && styles.darkBodyText]}>{template.title}</Text><Text style={[styles.savedTemplateSettingCopy, isDark && styles.darkMutedText]}>{summarizePremiumTaskTemplate(template)}</Text></View><Pressable onPress={() => onDeleteSavedTemplate(template)}><Text style={[styles.templateDelete, isDark && styles.darkAccentText]}>削除</Text></Pressable></View>) : <Pressable style={[styles.savedTemplateLocked, isDark && styles.darkSurface]} onPress={() => onPremium('templates')}><View style={{ flex: 1 }}><Text style={[styles.savedTemplateLockedTitle, isDark && styles.darkBodyText]}>この機能を見る</Text><Text style={[styles.savedTemplateLockedCopy, isDark && styles.darkMutedText]}>保存済みデータは無料へ戻っても消えません</Text></View><Text style={[styles.guideCardArrow, isDark && styles.darkAccentText]}>›</Text></Pressable>}
       </View>
       </SettingsDisclosure>
       <SettingsDisclosure designMode={designMode} title="ホーム画面のWidget" subtitle="追加・管理・使い方" expanded={expandedSetting === 'widget'} onPress={() => {
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
        designPattern={isDesign ? chicPattern : 'plain'}
        designCheckColor={chicCheckColor}
        PatternDecor={ChicPatternDecor}
        planTier={planTier}
        designCustomizePurchased={designCustomizePurchased}
      />
      </SettingsDisclosure>
       <View style={styles.settingsDisclosure}>
         <Pressable style={[styles.settingsDisclosureHeader, isDark && styles.darkSurface]} onPress={() => onPremium()} accessibilityRole="button">
           <View style={{ flex: 1 }}><Text style={[styles.settingsDisclosureTitle, { color: baseTheme.primaryText }]}>{planTier === 'premium' ? 'Premium利用中' : 'Rhythm Premium'}</Text><Text style={[styles.settingsDisclosureSubtitle, { color: baseTheme.secondaryText }]}>{planTier === 'premium' ? 'Premiumの機能を利用中です' : 'もっとRhythmを便利に使う'}</Text></View>
           <Text style={[styles.settingsDisclosureChevron, { color: baseTheme.primaryAccent }]}>›</Text>
         </Pressable>
       </View>
       <SettingsDisclosure designMode={designMode} title="アプリについて" subtitle="使い方・レビュー" expanded={expandedSetting === 'about'} onPress={() => setExpandedSetting((current) => current === 'about' ? null : 'about')}>
         <Pressable style={[styles.guideCard, { backgroundColor: guideColors.surface, borderColor: guideColors.border, borderWidth: 1 }]} onPress={onGuide}><View><Text style={[styles.guideCardTitle, { color: guideColors.textPrimary }]}>使い方を見る</Text><Text style={[styles.guideCardCopy, { color: guideColors.textSecondary }]}>登録・振り分け・出発・集中の流れを見る</Text></View><Text style={[styles.guideCardArrow, { color: guideColors.accent }]}>›</Text></Pressable>
         <Pressable style={[styles.settingsCard, isDark && styles.darkSurface]} onPress={onReview}><Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>アプリを評価する</Text><Text style={[styles.switchCopy, isDark && styles.darkMutedText]}>短いレビューでRhythmの改善を応援できます</Text></Pressable>
       </SettingsDisclosure>
      </>}
      {!captureDesignOnly && <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 12, paddingVertical: 8 }} accessibilityLabel="広告">
        <BannerAd
          unitId={SETTINGS_BANNER_AD_UNIT_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      </View>}
    </>
  );
}
