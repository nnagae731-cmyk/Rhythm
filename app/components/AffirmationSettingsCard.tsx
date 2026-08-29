import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { Affirmation, AffirmationCustomText, ThemeMode } from '../types';
import { formatLiveTime } from '../features/tasks/taskUtils';
import { affirmationTemplateCategories, affirmationTemplates, AffirmationTemplateCategory } from '../features/affirmations/affirmationTemplates';
import { ChicThemePalette, getThemeTokens } from '../theme';

type Props = {
  affirmations: Affirmation[];
  customTexts: AffirmationCustomText[];
  designMode: ThemeMode;
  chicPalette?: ChicThemePalette;
  planTier: PlanTier;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onSave: (affirmation: Affirmation) => Promise<void> | void;
  onDelete: (affirmation: Affirmation) => Promise<void> | void;
  onSaveCustomText: (text: AffirmationCustomText) => void;
  onDeleteCustomText: (id: string) => void;
  styles: any;
  compact?: boolean;
  previewMode?: boolean;
};

export const MAX_AFFIRMATIONS = 20;

function clockToDate(time: string) {
  const [hour = '9', minute = '0'] = time.split(':');
  const value = new Date();
  value.setHours(Math.max(0, Math.min(23, Number(hour) || 9)), Math.max(0, Math.min(59, Number(minute) || 0)), 0, 0);
  return value;
}

export function AffirmationSettingsCard({ affirmations, customTexts, designMode, chicPalette, planTier, onPremium, onSave, onDelete, onSaveCustomText, onDeleteCustomText, styles, compact = false, previewMode = false }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [text, setText] = useState('');
  const [time, setTime] = useState('09:00');
  const [enabled, setEnabled] = useState(true);
  const [editingId, setEditingId] = useState<string>();
  const [editingCustomId, setEditingCustomId] = useState<string>();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [category, setCategory] = useState<AffirmationTemplateCategory>('元気が出る');
  const [templateId, setTemplateId] = useState<string>();
  const [customDraft, setCustomDraft] = useState('');
  const isDark = designMode === 'dark';
  const isChic = designMode === 'chic' && !!chicPalette;
  const canUse = planTier === 'premium';
  const editing = affirmations.find((item) => item.id === editingId);
  const selectedTemplates = useMemo(() => affirmationTemplates.filter((item) => item.category === category), [category]);
  const baseTheme = getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const surface = isChic ? chicPalette?.cardSurface : baseTheme.surface;
  const surfaceSoft = isChic ? chicPalette?.cardTint : baseTheme.secondarySurface;
  const border = isChic ? chicPalette?.border : baseTheme.border;
  const primary = isChic ? chicPalette?.textPrimary : baseTheme.primaryText;
  const secondary = isChic ? chicPalette?.textSecondary : baseTheme.secondaryText;
  const accent = isChic && chicPalette ? chicPalette.accent : baseTheme.primaryAccent;
  const onAccent = isChic && chicPalette ? chicPalette.onAccent : isDark ? baseTheme.screenBackground : '#FFFFFF';
  const switchTrackColor = { false: baseTheme.border, true: accent };
  const switchThumbColor = (value: boolean) => value ? (isChic && chicPalette ? chicPalette.onAccent : isDark ? baseTheme.screenBackground : baseTheme.surface) : baseTheme.secondarySurface;

  const reset = () => {
    setText(''); setTime('09:00'); setEnabled(true); setEditingId(undefined); setEditingCustomId(undefined); setShowTimePicker(false); setTemplateId(undefined); setCustomDraft('');
  };
  const closeSheet = () => { setSheetOpen(false); reset(); };
  const chooseTemplate = (id: string, value: string) => { setText(value); setTemplateId(id); setEditingCustomId(undefined); };
  const chooseCustom = (item: AffirmationCustomText) => { setText(item.text); setTemplateId(undefined); setEditingCustomId(item.id); };
  const submit = async () => {
    const clean = text.trim();
    if (!clean) { Alert.alert('言葉を入力してね'); return; }
    await onSave({ id: editing?.id ?? `affirmation:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`, text: clean, time, enabled, createdAt: editing?.createdAt ?? new Date().toISOString(), notificationId: editing?.notificationId, templateId, source: templateId ? 'template' : editingCustomId ? 'custom' : undefined, customTextId: editingCustomId });
    closeSheet();
  };
  const saveCustom = () => {
    const clean = customDraft.trim();
    if (!clean) return;
    const item = { id: editingCustomId ?? `affirmation-custom:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`, text: clean, createdAt: new Date().toISOString() };
    onSaveCustomText(item);
    setText(clean); setTemplateId(undefined); setEditingCustomId(item.id); setCustomDraft('');
  };
  const beginEdit = (item: Affirmation) => { setEditingId(item.id); setText(item.text); setTime(item.time); setEnabled(item.enabled); setTemplateId(item.templateId); setEditingCustomId(item.customTextId); setSheetOpen(true); };

  const managementContentBody = <>
    <Text style={{ color: secondary, marginTop: 4 }}>最大{MAX_AFFIRMATIONS}件・同じ時刻の重複は登録できません</Text>
    {affirmations.map((item) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 14, backgroundColor: surfaceSoft, borderColor: border, borderWidth: 1 }}><View style={{ flex: 1 }}><Text numberOfLines={2} style={{ color: primary, fontWeight: '700' }}>{item.text}</Text><Text style={{ color: secondary, marginTop: 3 }}>{item.time}</Text></View><Switch value={item.enabled} onValueChange={(value) => void onSave({ ...item, enabled: value })} trackColor={switchTrackColor} thumbColor={switchThumbColor(item.enabled)} /><Pressable onPress={() => beginEdit(item)}><Text style={{ color: accent, fontWeight: '700' }}>編集</Text></Pressable><Pressable onPress={() => Alert.alert('この通知を削除しますか？', '予約済みの通知も停止します。', [{ text: 'キャンセル', style: 'cancel' }, { text: '削除', style: 'destructive', onPress: () => void onDelete(item) }])}><Text style={{ color: isDark ? '#FF8F9C' : '#A55E66', fontWeight: '700' }}>削除</Text></Pressable></View>)}
    <Text style={{ color: primary, fontWeight: '800', marginTop: 18 }}>通知を追加・編集</Text>
    <TextInput value={text} onChangeText={(value) => { setText(value); setTemplateId(undefined); }} placeholder="文章を選ぶか、自分で入力" placeholderTextColor={secondary} style={{ minHeight: 48, marginTop: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: surfaceSoft, color: primary }} multiline />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}><Pressable onPress={() => setShowTimePicker((value) => !value)} style={{ flex: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: surfaceSoft }}><Text style={{ color: primary }}>通知時刻 {time}</Text></Pressable><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={{ color: secondary }}>通知</Text><Switch value={enabled} onValueChange={setEnabled} trackColor={switchTrackColor} thumbColor={switchThumbColor(enabled)} /></View></View>
    {showTimePicker && <DateTimePicker themeVariant={isDark ? 'dark' : 'light'} value={clockToDate(time)} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} textColor={primary} accentColor={accent} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowTimePicker(false); if (event.type === 'set' && selected) { setTime(formatLiveTime(selected)); if (Platform.OS !== 'ios') setShowTimePicker(false); } }} />}
    <Pressable disabled={!editing && affirmations.length >= MAX_AFFIRMATIONS} onPress={() => void submit()} style={{ minHeight: 46, marginTop: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: !editing && affirmations.length >= MAX_AFFIRMATIONS ? border : accent }}><Text style={{ color: !editing && affirmations.length >= MAX_AFFIRMATIONS ? secondary : onAccent, fontWeight: '800' }}>{editing ? '保存' : '通知を追加'}</Text></Pressable>
    <Text style={{ color: primary, fontWeight: '800', marginTop: 18 }}>ジャンル別テンプレート</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 8 }}>{affirmationTemplateCategories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: category === item ? accent : surfaceSoft, borderColor: border, borderWidth: 1 }}><Text style={{ color: category === item ? onAccent : secondary, fontSize: 12 }}>{item}</Text></Pressable>)}</ScrollView>
    {selectedTemplates.map((item) => <Pressable key={item.id} onPress={() => chooseTemplate(item.id, item.text)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: border }}><Text style={{ color: text === item.text ? accent : primary }}>{item.text}</Text></Pressable>)}
    <Text style={{ color: primary, fontWeight: '800', marginTop: 18 }}>自分で追加</Text>
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><TextInput value={customDraft} onChangeText={setCustomDraft} placeholder="自分の言葉を追加" placeholderTextColor={secondary} style={{ flex: 1, minHeight: 44, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: surfaceSoft, color: primary }} /><Pressable onPress={saveCustom} style={{ minWidth: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: accent }}><Text style={{ color: onAccent, fontWeight: '800' }}>保存</Text></Pressable></View>
    {customTexts.map((item) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}><Pressable style={{ flex: 1 }} onPress={() => chooseCustom(item)}><Text numberOfLines={2} style={{ color: text === item.text ? accent : primary }}>{item.text}</Text></Pressable><Pressable onPress={() => { setCustomDraft(item.text); setEditingCustomId(item.id); }}><Text style={{ color: accent }}>編集</Text></Pressable><Pressable onPress={() => onDeleteCustomText(item.id)}><Text style={{ color: isDark ? '#FF8F9C' : '#A55E66' }}>削除</Text></Pressable></View>)}
  </>;
  const managementContent = <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>{managementContentBody}</ScrollView>;

  if (!canUse) return compact
    ? <Pressable style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: border }} onPress={() => onPremium('affirmation')}><View style={{ flex: 1 }}><Text style={{ color: primary, fontSize: 14, fontWeight: '800' }}>アファメーション</Text><Text style={{ color: secondary, fontSize: 11, lineHeight: 17, fontWeight: '700', marginTop: 2 }}>好きな言葉を、選んだ時間に届けます。</Text></View><Text style={{ color: accent, fontSize: 12, fontWeight: '900' }}>Premiumで設定 ›</Text></Pressable>
    : <Pressable style={[styles.settingsCard, isDark && styles.darkSurface]} onPress={() => onPremium('affirmation')}><Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>アファメーション</Text><Text style={[styles.switchCopy, isDark && styles.darkMutedText]}>好きな言葉を、選んだ時間に届けます</Text><Text style={styles.taskTemplateSavePremium}>Premium</Text></Pressable>;

  if (previewMode) return <View style={[styles.premiumPreview, { backgroundColor: surface, borderColor: border, borderWidth: 1, padding: 14, maxHeight: undefined, overflow: 'visible' }]} pointerEvents="none"><Text style={{ color: primary, fontSize: 20, fontWeight: '800' }}>アファメーション</Text>{managementContentBody}</View>;

  return <>
    {compact ? <Pressable style={[styles.itemCard, designMode === 'minimal' && styles.itemCardMinimal, isDark && styles.itemCardDark, isChic && { backgroundColor: chicPalette?.cardSurface, borderColor: chicPalette?.border }]} onPress={() => setSheetOpen(true)}><View style={{ flex: 1 }}>{affirmations[0] ? <><Text numberOfLines={2} style={{ color: primary, fontSize: 16, lineHeight: 23, fontWeight: '800' }}>{affirmations[0].text}</Text><Text style={[styles.itemMeta, { color: secondary, marginTop: 5 }]}>{affirmations[0].enabled ? `通知 ${affirmations[0].time}` : '通知オフ'} ・ {affirmations.length}/{MAX_AFFIRMATIONS}件</Text></> : <><Text style={{ color: primary, fontSize: 14, fontWeight: '800' }}>好きな言葉を、選んだ時間に届ける</Text><Text style={[styles.itemMeta, { color: secondary, marginTop: 5 }]}>まだ言葉は設定されていません</Text></>}</View><Text style={{ color: accent, fontSize: 13, fontWeight: '900' }}>管理する ›</Text></Pressable> : <Pressable style={[styles.settingsCard, isDark && styles.darkSurface, isChic && { backgroundColor: surface, borderColor: border }]} onPress={() => setSheetOpen(true)}><View style={{ flex: 1 }}><Text style={[styles.settingsTitle, { color: primary }]}>アファメーション</Text><Text style={[styles.switchCopy, { color: secondary }]}>{affirmations.length}/{MAX_AFFIRMATIONS}件を設定中 ・ タップして管理</Text></View><Text style={{ color: accent, fontSize: 22 }}>›</Text></Pressable>}
    <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={closeSheet}>
      <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={closeSheet}>
        <View onStartShouldSetResponder={() => true} style={{ maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, backgroundColor: surface, borderColor: border, borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: primary, fontSize: 20, fontWeight: '800' }}>アファメーション</Text><Pressable onPress={closeSheet}><Text style={{ color: accent, fontWeight: '800' }}>閉じる</Text></Pressable></View>
          {managementContent}
        </View>
      </Pressable>
    </Modal>
  </>;
}
