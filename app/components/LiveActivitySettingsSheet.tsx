import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { LiveActivityCustomizationSettings, LiveActivityDisplayOptions, RhythmFontDesign } from '../types';
import { RHYTHM_FONT_DESIGN_OPTIONS, reactNativeFontFamily } from '../features/fontDesign';

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
  ['currentTask', '今はこれ'],
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
}) {
  const [draftOptions, setDraftOptions] = useState(options);
  const [draftCustomization, setDraftCustomization] = useState(customization);

  useEffect(() => {
    if (visible) {
      setDraftOptions(options);
      setDraftCustomization(customization);
    }
  }, [customization, options, visible]);

  const previewFontFamily = useMemo(() => reactNativeFontFamily(draftCustomization.fontDesign), [draftCustomization.fontDesign]);
  const updateOption = (key: keyof LiveActivityDisplayOptions) => {
    if (!canCustomize) return;
    if (draftOptions[key] && Object.values(draftOptions).filter(Boolean).length <= 1) return;
    setDraftOptions((current) => ({ ...current, [key]: !current[key] }));
  };
  const updateCustomization = <K extends keyof LiveActivityCustomizationSettings>(key: K, value: LiveActivityCustomizationSettings[K]) => {
    setDraftCustomization((current) => ({ ...current, [key]: value }));
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' }}>
      <View style={{ maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.background, paddingTop: 12 }}>
        <View style={{ alignItems: 'center', paddingBottom: 8 }}><View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border }} /></View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: '900' }}>ライブアクティビティ設定</Text>
          <View style={{ marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>プレビュー</Text>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '900', fontFamily: previewFontFamily, marginTop: 8 }} numberOfLines={1}>{taskTitle || '今はこれ'}</Text>
            {draftOptions.nextSchedule ? <Text style={{ color: colors.muted, fontSize: 12, fontFamily: previewFontFamily, marginTop: 4 }}>{nextTitle || '次の予定を表示'}</Text> : null}
            {draftCustomization.interactiveChecks && canInteractive ? <Text style={{ color: colors.accent, fontSize: 12, fontFamily: previewFontFamily, marginTop: 7 }}>□ checklist ・ ✓ 完了</Text> : null}
            {draftOptions.affirmation ? <Text style={{ color: colors.muted, fontSize: 11, fontFamily: previewFontFamily, marginTop: 7 }} numberOfLines={1}>今日も自分のペースで</Text> : null}
          </View>

          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 18 }}>表示する内容</Text>
          {DISPLAY_OPTIONS.map(([key, label]) => <View key={key} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 42, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: canCustomize ? 1 : 0.65 }}><Text style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' }}>{label}</Text><Switch value={draftOptions[key]} disabled={!canCustomize} onValueChange={() => updateOption(key)} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={draftOptions[key] ? colors.onAccent : colors.muted} /></View>)}

          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 18 }}>チェック操作</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Live Activityから完了する</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>{canInteractive ? 'Premiumで利用できます' : 'Premium限定です'}</Text></View><Switch value={draftCustomization.interactiveChecks && canInteractive} disabled={!canInteractive} onValueChange={(value) => updateCustomization('interactiveChecks', value)} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={draftCustomization.interactiveChecks && canInteractive ? colors.onAccent : colors.muted} /></View>

          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 10 }}>アファメーション</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {(['fixed', 'automatic'] as const).map((mode) => <Pressable key={mode} disabled={!canInteractive} onPress={() => { if (canInteractive) updateCustomization('affirmationRotationMode', mode); }} style={{ flex: 1, minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: draftCustomization.affirmationRotationMode === mode ? colors.accent : colors.border, backgroundColor: draftCustomization.affirmationRotationMode === mode ? colors.soft : colors.secondarySurface, alignItems: 'center', justifyContent: 'center', opacity: canInteractive ? 1 : 0.65 }}><Text style={{ color: draftCustomization.affirmationRotationMode === mode ? colors.accent : colors.text, fontSize: 12, fontWeight: '800' }}>{mode === 'fixed' ? '固定' : '自動'}</Text></Pressable>)}
          </View>
          {draftCustomization.affirmationRotationMode === 'automatic' ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>{INTERVAL_OPTIONS.map(([value, label]) => <Pressable key={value} disabled={!canInteractive} onPress={() => { if (canInteractive) updateCustomization('affirmationRotationIntervalMinutes', value); }} style={{ flex: 1, minHeight: 36, borderRadius: 9, borderWidth: 1, borderColor: draftCustomization.affirmationRotationIntervalMinutes === value ? colors.accent : colors.border, alignItems: 'center', justifyContent: 'center', opacity: canInteractive ? 1 : 0.65 }}><Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{label}</Text></Pressable>)}</View> : null}

          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 18 }}>文字</Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>標準・丸み・セリフ・等幅</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{RHYTHM_FONT_DESIGN_OPTIONS.map((option) => <Pressable key={option.id} disabled={!canCustomize} onPress={() => updateCustomization('fontDesign', option.id)} style={{ paddingHorizontal: 12, minHeight: 36, borderRadius: 9, borderWidth: 1, borderColor: draftCustomization.fontDesign === option.id ? colors.accent : colors.border, backgroundColor: draftCustomization.fontDesign === option.id ? colors.soft : colors.secondarySurface, justifyContent: 'center' }}><Text style={{ color: draftCustomization.fontDesign === option.id ? colors.accent : colors.text, fontFamily: reactNativeFontFamily(option.id), fontSize: 12, fontWeight: '700' }}>{option.label}</Text></Pressable>)}</View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>{SIZE_OPTIONS.map(([value, label]) => <Pressable key={value} disabled={!canCustomize} onPress={() => updateCustomization('fontSize', value)} style={{ flex: 1, minHeight: 36, borderRadius: 9, borderWidth: 1, borderColor: draftCustomization.fontSize === value ? colors.accent : colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{label}</Text></Pressable>)}</View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 22 }}><Pressable onPress={onClose} style={{ flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted, fontWeight: '800' }}>キャンセル</Text></Pressable><Pressable onPress={() => { onSave(draftOptions, { ...draftCustomization, interactiveChecks: canInteractive && draftCustomization.interactiveChecks }); }} style={{ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.onAccent, fontWeight: '900' }}>保存</Text></Pressable></View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
