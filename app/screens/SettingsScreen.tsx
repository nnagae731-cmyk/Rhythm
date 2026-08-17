import React, { useState } from 'react';
import { Image, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { ChicCheckColor, ChicPattern, ChicThemePalette, DesignMode, getDesignCheckColorLabel } from '../theme';
import { Affirmation, PhotoThemePhotoTarget, PhotoThemeSettings, Task, WidgetSize } from '../types';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { PremiumTaskTemplate } from '../taskTemplates';
import { AffirmationSettingsCard } from '../components/AffirmationSettingsCard';
import { PhotoThemeSettingsCard } from '../components/PhotoThemeSettingsCard';
export function SettingsScreen({
  tasks,
  timeline,
  now,
  dangerousTask,
  size,
  showCompleted,
  completionIcon,
  designMode,
  monoAppearance,
  chicPalette,
  chicPattern,
  chicCheckColor,
  affirmations,
  photoTheme,
  onSize,
  onShowCompleted,
  onCompletionIcon,
  onDesignMode,
  onMonoAppearance,
  onChicPattern,
  onChicCheckColor,
  onSaveAffirmation,
  onDeleteAffirmation,
  onPickPhotoTheme,
  onAdjustPhotoTheme,
  onClearPhotoTheme,
  templates,
  savedTemplates,
  onAddTemplate,
  onDeleteTemplate,
  onGuide,
  onPremium,
  onDeleteSavedTemplate,
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
  monoAppearance: 'auto' | 'light' | 'dark';
  chicPalette?: ChicThemePalette;
  chicPattern: ChicPattern;
  chicCheckColor: ChicCheckColor;
  affirmations: Affirmation[];
  photoTheme: PhotoThemeSettings;
  onSize: (size: WidgetSize) => void;
  onShowCompleted: (value: boolean) => void;
  onCompletionIcon: (icon: string) => void;
  onDesignMode: (mode: DesignMode) => void;
  onMonoAppearance: (appearance: 'auto' | 'light' | 'dark') => void;
  onChicPattern: (pattern: ChicPattern) => void;
  onChicCheckColor: (color: ChicCheckColor) => void;
  onSaveAffirmation: (affirmation: Affirmation) => Promise<void> | void;
  onDeleteAffirmation: (affirmation: Affirmation) => Promise<void> | void;
  onPickPhotoTheme: (target: PhotoThemePhotoTarget) => void;
  onAdjustPhotoTheme: (target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>) => void;
  onClearPhotoTheme: (target: PhotoThemePhotoTarget) => void;
  templates: string[];
  savedTemplates: PremiumTaskTemplate[];
  onAddTemplate: (title: string) => void;
  onDeleteTemplate: (title: string) => void;
  onGuide: () => void;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onDeleteSavedTemplate: (template: PremiumTaskTemplate) => void;
  planTier: PlanTier;
  styles: any;
  helpers: any;
  components: any;
}) {
  const { colors, getChicPatternVisual, hasPremiumAccess, getChicCheckColor, chicCheckColorChoices, countdownToClock, getUrgencyStatus, getNextBestAction, designModes, completionIcons, summarizePremiumTaskTemplate } = helpers;
  const { BThemeRibbonDecoration, CThemeRibbonDecoration, ChicPatternDecor, ChicPatternSelector, SettingsDisclosure, NotificationManagerCard } = components;
  const [newTemplate, setNewTemplate] = useState('');
  const isDark = designMode === 'dark';
  const isDesign = designMode === 'chic' || designMode === 'photo';
  const [expandedSetting, setExpandedSetting] = useState<'design' | 'notifications' | 'affirmations' | 'quick' | 'templates' | 'widget' | null>('design');
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
  return (
    <>
      {__DEV__ && <View style={[styles.settingsCard, isDark && styles.darkSurface]}><Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>Expo Go 確認環境</Text><Text style={[styles.switchCopy, isDark && styles.darkAccentText]}>このQRコードは、利用プランが固定された確認用環境です。</Text><Text style={[styles.devPlanCurrent, isDark && styles.darkAccentText]}>現在：{planTier === 'premium' ? 'Premium版' : '無料版'}</Text></View>}
      <SettingsDisclosure designMode={designMode} title="デザインモード" subtitle="Mono / Design / 写真を選ぶ" expanded={expandedSetting === 'design'} onPress={() => setExpandedSetting((current) => current === 'design' ? null : 'design')}>
      <View accessibilityLabel={isDesign ? `Design ${checkColorLabel}` : 'Mono'} style={[styles.modeCard, isDark && styles.darkSurface, isDesign && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
        {designMode === 'chic' && chicPattern === 'checkLavenderSatin' && <BThemeRibbonDecoration compact />}
        {designMode === 'chic' && chicPattern === 'checkBeigeNoir' && <CThemeRibbonDecoration compact />}
        {isDesign && <ChicPatternSelector designMode={designMode} chicPattern={chicPattern} chicCheckColor={chicCheckColor} planTier={planTier} onPattern={onChicPattern} onCheckColor={onChicCheckColor} />}
        <View style={styles.modeChoices}>
          {designModes.map((mode: { id: 'minimal' | 'chic'; description: string }) => (
            <Pressable key={mode.id} style={[styles.modeChoice, (designMode === mode.id || (mode.id === 'minimal' && designMode === 'dark')) && styles.modeChoiceActive, mode.id === 'minimal' && designMode === 'dark' && styles.modeChoiceActiveDark, mode.id === 'chic' && designMode === 'chic' && chicPalette && { borderColor: chicPalette.accent, backgroundColor: chicPalette.cardTint }]} onPress={() => onDesignMode(mode.id === 'minimal' && designMode === 'dark' ? 'dark' : mode.id)}>
              <View style={[styles.modeMiniPreview, mode.id === 'minimal' && styles.modeMiniMinimal, designMode === 'dark' && mode.id === 'minimal' && styles.modeMiniMinimalDark, mode.id === 'chic' && styles.modeMiniChic, ]}>
                {mode.id === 'minimal' ? <><View style={[styles.modeMiniBlackBlock, designMode === 'dark' && styles.modeMiniDarkBlock]} /><Text style={[styles.modeMiniNumber, designMode === 'dark' && styles.modeMiniDarkNumber]}>03</Text><View style={[styles.modeMiniLine, designMode === 'dark' && styles.modeMiniDarkLine]} /></> : <>{designMode === 'chic' && <ChicPatternDecor pattern={chicPattern} accent={patternVisual.accent} warm={patternVisual.warm} checkColor={chicCheckColor} />}<View style={styles.modeMiniGlass} /><Text style={styles.modeMiniSparkle}>✦</Text></>}
              </View>
              <Text style={[styles.modeName, (designMode === mode.id || (mode.id === 'minimal' && designMode === 'dark')) && styles.modeNameActive, mode.id === 'minimal' && designMode === 'dark' && styles.modeNameDark, mode.id === 'chic' && designMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{mode.id === 'minimal' ? 'Mono' : 'Design'}</Text>
              <Text style={[styles.modeDescription, isDark && styles.darkAccentText]}>{mode.description}</Text>
               {mode.id === 'minimal' && <View style={styles.monoThemeChoices}>
                 <Pressable style={[styles.monoThemeChoice, monoAppearance === 'auto' && styles.monoThemeChoiceActive]} onPress={() => { onDesignMode('minimal'); onMonoAppearance('auto'); }}><Text style={[styles.monoThemeChoiceText, monoAppearance === 'auto' && styles.monoThemeChoiceTextActive]}>自動（端末に合わせる）</Text></Pressable>
                <Pressable style={[styles.monoThemeChoice, designMode === 'minimal' && styles.monoThemeChoiceActive]} onPress={() => onDesignMode('minimal')}><Text style={[styles.monoThemeChoiceText, designMode === 'minimal' && styles.monoThemeChoiceTextActive]}>ライト</Text></Pressable>
                <Pressable style={[styles.monoThemeChoice, designMode === 'dark' && styles.monoThemeChoiceActiveDark]} onPress={() => onDesignMode('dark')}><Text style={[styles.monoThemeChoiceText, designMode === 'dark' && styles.monoThemeChoiceTextActive]}>ダーク</Text></Pressable>
              </View>}
            </Pressable>
          ))}
        </View>
        <Pressable style={[styles.savedTemplateLocked, designMode === 'photo' && styles.patternChoiceActive]} onPress={() => { if (planTier !== 'premium') { onPremium('photo_design'); return; } onDesignMode('photo'); }}>
          {photoTheme.imageUri ? <Image source={{ uri: photoTheme.imageUri }} style={{ width: 54, height: 42, borderRadius: 9, marginRight: 10 }} /> : <View style={{ width: 54, height: 42, borderRadius: 9, marginRight: 10, backgroundColor: '#F2DDE5', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#9C5D79', fontSize: 17 }}>▧</Text></View>}
          <View style={{ flex: 1 }}><Text style={styles.savedTemplateLockedTitle}>写真デザイン</Text><Text style={styles.savedTemplateLockedCopy}>好きな写真を背景やトップ画像に使う</Text></View>
          <Text style={planTier === 'premium' ? styles.affirmationEdit : styles.taskTemplateSavePremium}>{planTier === 'premium' ? (designMode === 'photo' ? '選択中' : '選ぶ') : 'Premium'}</Text>
        </Pressable>
          {designMode === 'photo' && <PhotoThemeSettingsCard photoTheme={photoTheme} designMode={designMode} planTier={planTier} onPremium={onPremium} onPick={onPickPhotoTheme} onAdjust={onAdjustPhotoTheme} onClear={onClearPhotoTheme} styles={styles} />}
        {(designMode === 'minimal' || designMode === 'dark') && <View style={styles.monoInlinePreview}><Text style={[styles.fieldLabel, isDark && styles.darkAccentText]}>Monoの表示</Text><View style={styles.monoInlineChoices}><Pressable style={[styles.monoInlineChoice, styles.monoInlineLight, designMode === 'minimal' && styles.monoInlineChoiceActive]} onPress={() => onDesignMode('minimal')}><Text style={styles.monoInlineLightEyebrow}>LIGHT</Text><Text style={styles.monoInlineLightBrand}>Rhythm</Text><View style={styles.monoInlineLightLine} /><Text style={styles.monoInlineLightMeta}>白・黒・余白</Text><Text style={styles.monoInlineSelect}>{designMode === 'minimal' ? '選択中' : '選ぶ'}</Text></Pressable><Pressable style={[styles.monoInlineChoice, styles.monoInlineDark, designMode === 'dark' && styles.monoInlineChoiceActiveDark]} onPress={() => onDesignMode('dark')}><Text style={styles.monoInlineDarkEyebrow}>DARK</Text><Text style={styles.monoInlineDarkBrand}>Rhythm</Text><View style={styles.monoInlineDarkLine} /><Text style={styles.monoInlineDarkMeta}>黒・白・紫</Text><Text style={styles.monoInlineDarkSelect}>{designMode === 'dark' ? '選択中' : '選ぶ'}</Text></Pressable></View></View>}
      {designMode === 'chic' && <View style={styles.patternSelector}><Text style={[styles.fieldLabel, isDark && styles.darkAccentText]}>Chicの柄</Text><View style={styles.patternChoices}>{(['floral', 'dot', 'checkLavenderSatin', 'checkBeigeNoir', 'checkMauveFrame'] as ChicPattern[]).map((pattern) => { const feature = pattern === 'floral' ? undefined : pattern === 'dot' ? 'chic_dot' : pattern === 'checkLavenderSatin' ? 'chic_check_lavender_satin' : pattern === 'checkBeigeNoir' ? 'chic_check_beige_noir' : 'chic_check_mauve_frame'; const locked = !!feature && !hasPremiumAccess(planTier, feature); const label = pattern === 'floral' ? '花柄' : pattern === 'dot' ? `ドット${locked ? ' 🔒' : ''}` : pattern === 'checkLavenderSatin' ? `くすみラベンダーチェック${locked ? ' 🔒' : ''}` : pattern === 'checkBeigeNoir' ? `ベージュ×ブラックチェック${locked ? ' 🔒' : ''}` : `モーブフレームチェック${locked ? ' 🔒' : ''}`; return <Pressable key={pattern} style={[styles.patternChoice, chicPattern === pattern && styles.patternChoiceActive]} onPress={() => onChicPattern(pattern)}><View style={styles.patternSwatch}><ChicPatternDecor pattern={pattern} accent={getChicCheckColor(chicCheckColor).accent} warm={getChicCheckColor(chicCheckColor).warm} checkColor={chicCheckColor} /></View><Text style={[styles.patternChoiceText, chicPattern === pattern && styles.patternChoiceTextActive]}>{label}</Text></Pressable>; })}</View><Text style={[styles.fieldLabel, { marginTop: 12 }, isDark && styles.darkAccentText]}>チェックの色</Text><View style={styles.patternChoices}>{chicCheckColorChoices.map((choice: any) => <Pressable key={choice.id} style={[styles.patternChoice, chicCheckColor === choice.id && styles.patternChoiceActive]} onPress={() => onChicCheckColor(choice.id)}><View style={[styles.checkColorSwatch, { backgroundColor: choice.background, borderColor: choice.accent }]}><View style={[styles.checkColorSwatchBand, { backgroundColor: choice.accent }]} /><View style={[styles.checkColorSwatchBandHorizontal, { backgroundColor: choice.warm }]} /></View><Text style={[styles.patternChoiceText, chicCheckColor === choice.id && styles.patternChoiceTextActive]}>{choice.label}</Text></Pressable>)}</View></View>}
      </View>
      </SettingsDisclosure>
      <Pressable style={[styles.guideCard, { backgroundColor: guideColors.surface, borderColor: guideColors.border, borderWidth: 1 }]} onPress={onGuide}><View><Text style={[styles.guideCardTitle, { color: guideColors.textPrimary }]}>Rhythmの使い方</Text><Text style={[styles.guideCardCopy, { color: guideColors.textSecondary }]}>登録・振り分け・出発・集中の流れを見る</Text></View><Text style={[styles.guideCardArrow, { color: guideColors.accent }]}>›</Text></Pressable>
      <SettingsDisclosure designMode={designMode} title="通知管理" subtitle="予約中の通知を確認・停止" expanded={expandedSetting === 'notifications'} onPress={() => setExpandedSetting((current) => current === 'notifications' ? null : 'notifications')}>
        <NotificationManagerCard designMode={designMode} />
      </SettingsDisclosure>
      <SettingsDisclosure designMode={designMode} title="今日のアファメーション" subtitle="好きな言葉を、選んだ時間に届ける" expanded={expandedSetting === 'affirmations'} onPress={() => setExpandedSetting((current) => current === 'affirmations' ? null : 'affirmations')}>
        <AffirmationSettingsCard affirmations={affirmations} designMode={designMode} chicPalette={chicPalette} planTier={planTier} onPremium={onPremium} onSave={onSaveAffirmation} onDelete={onDeleteAffirmation} styles={styles} />
      </SettingsDisclosure>
      <SettingsDisclosure designMode={designMode} title="クイック雛形" subtitle="よく使うタスクを保存" expanded={expandedSetting === 'quick'} onPress={() => setExpandedSetting((current) => current === 'quick' ? null : 'quick')}>
      <View style={[styles.settingsCard, isDark && styles.darkSurface]}>
        <Text style={[styles.switchCopy, isDark && styles.darkMutedText]}>よく登録するタスクを自分用に保存できます</Text>
        <View style={styles.templateAddRow}><TextInput value={newTemplate} onChangeText={setNewTemplate} placeholder="例：水筒をバッグに入れる" placeholderTextColor="#A29DAA" style={styles.templateInput} /><Pressable style={styles.templateAddButton} onPress={() => { const clean = newTemplate.trim(); if (!clean) return; onAddTemplate(clean); setNewTemplate(''); }}><Text style={styles.templateAddButtonText}>追加</Text></Pressable></View>
        <View style={styles.templateList}>{templates.map((item) => <View key={item} style={[styles.templateRow, isDark && styles.darkSurface]}><Text style={[styles.templateRowText, isDark && styles.darkBodyText]}>{item}</Text><Pressable onPress={() => onDeleteTemplate(item)}><Text style={[styles.templateDelete, isDark && styles.darkAccentText]}>×</Text></Pressable></View>)}</View>
      </View>
      </SettingsDisclosure>
      <SettingsDisclosure designMode={designMode} title="マイひな型" subtitle="設定ごと保存して次回呼び出す" expanded={expandedSetting === 'templates'} onPress={() => setExpandedSetting((current) => current === 'templates' ? null : 'templates')}>
      <View style={[styles.settingsCard, isDark && styles.darkSurface]}>
        <View style={styles.historyHeader}><View><Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>マイひな型</Text><Text style={[styles.switchCopy, isDark && styles.darkAccentText]}>設定ごと保存して、次回そのまま呼び出す</Text></View><Text style={styles.taskTemplateSavePremium}>Premium</Text></View>
        {hasPremiumAccess(planTier, 'saved_task_templates') ? savedTemplates.length === 0 ? <Text style={[styles.savedTemplateEmpty, isDark && styles.darkMutedText]}>タスクの「•••」から「設定ごとひな型に保存」を選べます。</Text> : savedTemplates.map((template) => <View key={template.id} style={[styles.savedTemplateSettingRow, isDark && styles.darkSurface]}><View style={{ flex: 1 }}><Text style={[styles.savedTemplateSettingTitle, isDark && styles.darkBodyText]}>{template.title}</Text><Text style={[styles.savedTemplateSettingCopy, isDark && styles.darkMutedText]}>{summarizePremiumTaskTemplate(template)}</Text></View><Pressable onPress={() => onDeleteSavedTemplate(template)}><Text style={[styles.templateDelete, isDark && styles.darkAccentText]}>削除</Text></Pressable></View>) : <Pressable style={[styles.savedTemplateLocked, isDark && styles.darkSurface]} onPress={() => onPremium('templates')}><View style={{ flex: 1 }}><Text style={[styles.savedTemplateLockedTitle, isDark && styles.darkBodyText]}>この機能を見る</Text><Text style={[styles.savedTemplateLockedCopy, isDark && styles.darkMutedText]}>保存済みデータは無料へ戻っても消えません</Text></View><Text style={[styles.guideCardArrow, isDark && styles.darkAccentText]}>›</Text></Pressable>}
      </View>
      </SettingsDisclosure>
      <Text style={[styles.settingsSectionLabel, isDark && styles.darkBodyText]}>ウィジェット設定</Text>
      <Text style={[styles.previewLabel, isDark && styles.darkAccentText]}>WIDGET PREVIEW</Text>

      <View style={[styles.phonePreview, designMode === 'minimal' && styles.phonePreviewMinimal, designMode === 'chic' && { backgroundColor: chicPalette?.accent ?? patternVisual.accent }, ]}>
        <Text style={styles.phoneClock}>9:41</Text>
        <View style={[styles.widget, size === 'small' && styles.widgetSmall, designMode === 'minimal' && styles.widgetMinimal, designMode === 'chic' && { backgroundColor: chicPalette?.cardSurface ?? patternVisual.background }, ]}>
          {designMode === 'chic' && <View pointerEvents="none" style={styles.widgetChicWash} />}
          <View style={styles.widgetTop}>
            <View>
              <Text style={[styles.widgetBrand, designMode === 'minimal' && styles.widgetBrandMinimal]}>Rhythm</Text>
              <Text style={styles.widgetDate}>{designMode !== 'chic' ? 'SAT / JUL 04' : 'TODAY'}</Text>
            </View>
            <View style={styles.widgetDeparture}>
              <Text style={styles.widgetDepartureLabel}>出発まで</Text>
              <Text style={styles.widgetDepartureTime}>{countdownToClock(timeline.leave, now)}</Text>
            </View>
          </View>
          <View style={styles.widgetDivider} />
          
          {dangerousTask && <View style={styles.widgetUrgency}>
            <Text style={styles.widgetUrgencyStatus}>{getUrgencyStatus(dangerousTask, now)}</Text>
            <Text numberOfLines={1} style={styles.widgetUrgencyAction}>{getNextBestAction(dangerousTask, now)}</Text>
          </View>}
          {previewTasks.length === 0 ? (
            <Text style={styles.widgetEmpty}>今日のタスクはありません ✦</Text>
          ) : previewTasks.map((task) => (
            <View key={task.id} style={styles.widgetTask}>
              <View style={[styles.widgetCheck, task.done && styles.widgetCheckDone]}><Text style={styles.widgetCheckText}>{task.done ? completionIcon : ''}</Text></View>
              <Text numberOfLines={1} style={[styles.widgetTaskText, task.done && styles.widgetTaskDone]}>{task.title}</Text>
            </View>
          ))}
        </View>
      </View>

      <SettingsDisclosure designMode={designMode} title="ウィジェット設定" subtitle="サイズ・完了表示・アイコン" expanded={expandedSetting === 'widget'} onPress={() => setExpandedSetting((current) => current === 'widget' ? null : 'widget')}>
      <View style={[styles.settingsCard, isDark && styles.darkSurface]}>
        <Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>ウィジェット設定</Text>
        <Text style={[styles.fieldLabel, isDark && styles.darkAccentText]}>サイズ</Text>
        <View style={styles.segment}>
          <Pressable style={[styles.segmentButton, size === 'small' && styles.segmentActive]} onPress={() => onSize('small')}>
            <Text style={[styles.segmentText, size === 'small' && styles.segmentTextActive]}>小</Text>
          </Pressable>
          <Pressable style={[styles.segmentButton, size === 'medium' && styles.segmentActive]} onPress={() => onSize('medium')}>
            <Text style={[styles.segmentText, size === 'medium' && styles.segmentTextActive]}>中</Text>
          </Pressable>
        </View>
        <View style={styles.switchRow}>
          <View>
            <Text style={[styles.switchTitle, isDark && styles.darkBodyText]}>完了したタスクも表示</Text>
            <Text style={[styles.switchCopy, isDark && styles.darkAccentText]}>チェック済みの項目を残します</Text>
          </View>
          <Switch value={showCompleted} onValueChange={onShowCompleted} trackColor={{ true: designMode === 'chic' && chicPalette ? chicPalette.accent : colors.violet }} />
        </View>
        <Text style={[styles.fieldLabel, { marginTop: 20 }, isDark && styles.darkAccentText]}>完了アイコン</Text>
        <View style={styles.iconChoices}>
          {completionIcons.map((icon: string) => (
            <Pressable key={icon} style={[styles.iconChoice, completionIcon === icon && styles.iconChoiceActive]} onPress={() => onCompletionIcon(icon)}>
              <Text style={[styles.iconChoiceText, completionIcon === icon && styles.iconChoiceTextActive]}>{icon}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.lockedSetting} onPress={() => onPremium()}>
          <View>
            <Text style={[styles.switchTitle, isDark && styles.darkBodyText]}>カスタムテーマ</Text>
            <Text style={[styles.switchCopy, isDark && styles.darkAccentText]}>色・背景・フォントを自由に変更</Text>
          </View>
          <Text style={styles.smallLock}>▣ PREMIUM</Text>
        </Pressable>
      </View>
      </SettingsDisclosure>
    </>
  );
}
