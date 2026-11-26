import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { LiveActivityCustomizationSettings, LiveActivityDisplayOptions, RhythmFontDesign } from '../types';
import { RHYTHM_FONT_DESIGN_OPTIONS, reactNativeFontFamily, reactNativeFontWeight } from '../features/fontDesign';
import type { RhythmLiveActivityRuntimeStatus } from '../features/widget/rhythmLiveActivity';

type PopupColors = {
  background: string;
  surface: string;
  secondarySurface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  soft: string;
  onAccent: string;
};

const DISPLAY_OPTIONS: Array<[keyof LiveActivityDisplayOptions, string]> = [
  ['currentTask', '今日のTODO'],
  ['nextSchedule', '次の予定'],
  ['departureCountdown', '出発カウントダウン'],
  ['focusRemaining', '集中の残り時間'],
  ['affirmation', 'アファメーション'],
];

const SIZE_OPTIONS: Array<[LiveActivityCustomizationSettings['fontSize'], string]> = [
  ['small', '小さめ'],
  ['medium', '標準'],
  ['large', '大きめ'],
];

const INTERVAL_OPTIONS: Array<[30 | 60 | 120, string]> = [[30, '30分'], [60, '1時間'], [120, '2時間']];

export function LiveActivitySettingsSheet({
  visible,
  options,
  customization,
  onClose,
  onSave,
  colors,
  canCustomize,
  canInteractive,
  taskTitle,
  nextTitle,
  runtimeStatus = 'off',
  enabled = false,
  onEnabledChange,
}: {
  visible: boolean;
  options: LiveActivityDisplayOptions;
  customization: LiveActivityCustomizationSettings;
  onClose: () => void;
  onSave: (options: LiveActivityDisplayOptions, customization: LiveActivityCustomizationSettings) => void;
  colors: PopupColors;
  canCustomize: boolean;
  canInteractive: boolean;
  taskTitle?: string;
  nextTitle?: string;
  runtimeStatus?: RhythmLiveActivityRuntimeStatus;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
}) {
  const [draftOptions, setDraftOptions] = useState(options);
  const [showAppearance, setShowAppearance] = useState(false);
  const [draftCustomization, setDraftCustomization] = useState(customization);

  useEffect(() => {
    if (visible) {
      setShowAppearance(false);
      setDraftOptions(options);
      setDraftCustomization(customization);
    }
  }, [customization, options, visible]);

  const previewFontFamily = useMemo(() => reactNativeFontFamily(draftCustomization.fontDesign), [draftCustomization.fontDesign]);
  const previewFontWeight = useMemo(() => reactNativeFontWeight(draftCustomization.fontDesign), [draftCustomization.fontDesign]);
  const previewSizes = useMemo(() => {
    if (draftCustomization.fontSize === 'small') return { title: 15, body: 11, meta: 10, aa: 22 };
    if (draftCustomization.fontSize === 'large') return { title: 21, body: 15, meta: 13, aa: 30 };
    return { title: 17, body: 13, meta: 11, aa: 26 };
  }, [draftCustomization.fontSize]);
  const canEditDisplayOptions = canInteractive;
  const runtimeLabel = runtimeStatus === 'active'
    ? '表示中'
    : runtimeStatus === 'starting' || runtimeStatus === 'waiting'
      ? '表示を開始しています'
      : runtimeStatus === 'native-missing'
        ? 'このビルドには連携機能が含まれていません（無料版の制限ではありません）'
      : runtimeStatus === 'unavailable'
        ? 'この端末・OS・システム設定では利用できません（無料版の制限ではありません）'
        : runtimeStatus === 'failed'
          ? '開始できませんでした。設定を確認し、スイッチを入れ直してください'
          : 'オフ';
  const updateOption = (key: keyof LiveActivityDisplayOptions) => {
    if (!canEditDisplayOptions) return;
    if (draftOptions[key] && Object.values(draftOptions).filter(Boolean).length <= 1) return;
    setDraftOptions((current) => ({ ...current, [key]: !current[key] }));
  };
  const updateCustomization = <K extends keyof LiveActivityCustomizationSettings>(key: K, value: LiveActivityCustomizationSettings[K]) => {
    setDraftCustomization((current) => ({ ...current, [key]: value }));
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' }}>
      <View style={{ maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.background, paddingTop: 12 }}>
        <View style={{ alignItems: 'center', paddingBottom: 8 }}><View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border }} /></View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>ライブアクティビティ</Text><Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>ロック画面・Dynamic Islandに表示する内容を設定</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose} hitSlop={12}><Text style={{ color: colors.muted, fontSize: 24, lineHeight: 24 }}>×</Text></Pressable>
          </View>

          {onEnabledChange ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingVertical: 10 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>使用する</Text></View><Switch accessibilityLabel="ライブアクティビティを使う" value={enabled} onValueChange={onEnabledChange} trackColor={{ false: colors.border, true: colors.accent }} /></View> : null}
          <View style={{ marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '800' }}>表示イメージ（サンプル）</Text>

            <Text style={{ color: colors.text, fontSize: previewSizes.title, fontWeight: previewFontWeight, fontFamily: previewFontFamily, marginTop: 8 }} numberOfLines={1}>{taskTitle || '今日のTODO'}</Text>
            {draftOptions.nextSchedule ? <Text style={{ color: colors.muted, fontSize: previewSizes.body, fontWeight: previewFontWeight, fontFamily: previewFontFamily, marginTop: 4 }} numberOfLines={1}>{nextTitle || '次の予定を表示'}</Text> : null}
            {draftCustomization.interactiveChecks && canInteractive ? <Text style={{ color: colors.accent, fontSize: previewSizes.body, fontWeight: previewFontWeight, fontFamily: previewFontFamily, marginTop: 7 }}>□ checklist ・ ✓ 完了</Text> : null}
            {draftOptions.affirmation ? <Text style={{ color: colors.muted, fontSize: previewSizes.meta, fontWeight: previewFontWeight, fontFamily: previewFontFamily, marginTop: 7 }} numberOfLines={1}>今日も自分のペースで</Text> : null}
          </View>

          <View style={{ marginTop: 10, padding: 11, borderRadius: 12, backgroundColor: runtimeStatus === 'active' ? colors.soft : colors.secondarySurface, borderWidth: 1, borderColor: runtimeStatus === 'active' ? colors.accent : colors.border }}>
            <Text style={{ color: runtimeStatus === 'active' ? colors.accent : colors.text, fontSize: 13, fontWeight: '900' }}>現在の表示状態：{runtimeLabel}</Text>
            {runtimeStatus === 'native-missing' || runtimeStatus === 'unavailable' || runtimeStatus === 'failed' ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{runtimeStatus === 'native-missing'
        ? 'このビルドには連携機能が含まれていません（無料版の制限ではありません）'
      : runtimeStatus === 'unavailable' ? '無料版の制限ではありません。端末の対応状況または、インストール済みのBuildの構成を確認してください。' : '表示を開始できませんでした。OFFにしてから、もう一度ONにしてください。'}</Text> : null}
          </View>

          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 17 }}>表示する内容</Text>
          {!canEditDisplayOptions ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>内容の変更はPremium限定</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 }}>
            {DISPLAY_OPTIONS.map(([key, label]) => {
              const selected = canEditDisplayOptions && draftOptions[key];

              return <Pressable key={key} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={!canEditDisplayOptions ? 'Premium限定' : undefined} accessibilityState={{ disabled: !canEditDisplayOptions, selected }} disabled={!canEditDisplayOptions} onPress={() => updateOption(key)} style={{ width: '100%', minHeight: 48, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.soft : colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{label}</Text></View><Text style={{ color: selected ? colors.accent : colors.muted, fontSize: 13, fontWeight: '700' }}>{!canEditDisplayOptions ? '🔒' : selected ? '✓' : '—'}</Text></Pressable>;
            })}
          </View>


          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>TODOを完了する</Text><Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>{canInteractive ? 'ロック画面からチェック' : 'Premium限定'}</Text></View><Switch value={draftCustomization.interactiveChecks && canInteractive} disabled={!canInteractive} onValueChange={(value) => updateCustomization('interactiveChecks', value)} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={draftCustomization.interactiveChecks && canInteractive ? colors.onAccent : colors.muted} /></View>

          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAppearance }} onPress={() => setShowAppearance((value) => !value)} style={{ minHeight: 52, marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>文字・言葉の詳細設定</Text></View><Text style={{ color: colors.accent, fontSize: 20 }}>{showAppearance ? '−' : '＋'}</Text></Pressable>
          {showAppearance ? <View>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 10 }}>アファメーション</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {(['fixed', 'automatic'] as const).map((mode) => <Pressable key={mode} disabled={!canInteractive} onPress={() => { if (canInteractive) updateCustomization('affirmationRotationMode', mode); }} style={{ flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: draftCustomization.affirmationRotationMode === mode ? colors.accent : colors.border, backgroundColor: draftCustomization.affirmationRotationMode === mode ? colors.soft : colors.secondarySurface, alignItems: 'center', justifyContent: 'center', opacity: canInteractive ? 1 : 0.65 }}><Text style={{ color: draftCustomization.affirmationRotationMode === mode ? colors.accent : colors.text, fontSize: 13, fontWeight: '800' }}>{mode === 'fixed' ? '固定' : '自動'}</Text></Pressable>)}
          </View>
          {draftCustomization.affirmationRotationMode === 'automatic' ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>{INTERVAL_OPTIONS.map(([value, label]) => <Pressable key={value} disabled={!canInteractive} onPress={() => { if (canInteractive) updateCustomization('affirmationRotationIntervalMinutes', value); }} style={{ flex: 1, minHeight: 44, borderRadius: 9, borderWidth: 1, borderColor: draftCustomization.affirmationRotationIntervalMinutes === value ? colors.accent : colors.border, alignItems: 'center', justifyContent: 'center', opacity: canInteractive ? 1 : 0.65 }}><Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{label}</Text></Pressable>)}</View> : null}

          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 16 }}>文字</Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>プレビューのAaで見た目を確認できます</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{RHYTHM_FONT_DESIGN_OPTIONS.map((option) => <Pressable key={option.id} disabled={!canCustomize} onPress={() => updateCustomization('fontDesign', option.id)} style={{ width: '47%', minHeight: 55, borderRadius: 11, borderWidth: 1, borderColor: draftCustomization.fontDesign === option.id ? colors.accent : colors.border, backgroundColor: draftCustomization.fontDesign === option.id ? colors.soft : colors.secondarySurface, alignItems: 'center', justifyContent: 'center', opacity: canCustomize ? 1 : 0.6 }}><Text style={{ color: draftCustomization.fontDesign === option.id ? colors.accent : colors.text, fontFamily: reactNativeFontFamily(option.id), fontSize: previewSizes.aa, fontWeight: reactNativeFontWeight(option.id) }}>Aa</Text><Text style={{ color: colors.muted, fontFamily: reactNativeFontFamily(option.id), fontSize: 13, fontWeight: reactNativeFontWeight(option.id), marginTop: 1 }}>{option.label}</Text></Pressable>)}</View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>{SIZE_OPTIONS.map(([value, label]) => <Pressable key={value} disabled={!canCustomize} onPress={() => updateCustomization('fontSize', value)} style={{ flex: 1, minHeight: 44, borderRadius: 9, borderWidth: 1, borderColor: draftCustomization.fontSize === value ? colors.accent : colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{label}</Text></Pressable>)}</View>

          </View> : null}
          <Pressable accessibilityRole="button" onPress={() => { onSave(draftOptions, { ...draftCustomization, interactiveChecks: canInteractive && draftCustomization.interactiveChecks }); }} style={{ minHeight: 48, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}><Text style={{ color: colors.onAccent, fontSize: 15, fontWeight: '900' }}>設定を保存</Text></Pressable>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
