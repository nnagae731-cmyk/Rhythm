import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { Affirmation, AffirmationCustomText, ThemeMode } from '../types';
import { formatLiveTime } from '../features/tasks/taskUtils';
import { affirmationTemplateCategories, affirmationTemplates, AffirmationTemplateCategory } from '../features/affirmations/affirmationTemplates';
import { ChicThemePalette } from '../theme';

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
};

function clockToDate(time: string) {
  const [hour = '9', minute = '0'] = time.split(':');
  const value = new Date();
  value.setHours(Math.max(0, Math.min(23, Number(hour) || 9)), Math.max(0, Math.min(59, Number(minute) || 0)), 0, 0);
  return value;
}

export function AffirmationSettingsCard({ affirmations, customTexts, designMode, chicPalette, planTier, onPremium, onSave, onDelete, onSaveCustomText, onDeleteCustomText, styles, compact = false }: Props) {
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
  const surface = isChic ? chicPalette?.cardSurface : isDark ? '#181F2E' : '#FFFFFF';
  const surfaceSoft = isChic ? chicPalette?.cardTint : isDark ? '#20293A' : '#F8F5FA';
  const border = isChic ? chicPalette?.border : isDark ? '#40506A' : '#E5E0E5';
  const primary = isChic ? chicPalette?.textPrimary : isDark ? '#F4F7FC' : '#282538';
  const secondary = isChic ? chicPalette?.textSecondary : isDark ? '#B4C0D4' : '#777285';
  const accent = isChic ? chicPalette?.accent : isDark ? '#8EA6FF' : '#7559E8';

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

  if (!canUse) return compact
    ? <Pressable style={[styles.lockedFeatureCard, isDark && styles.lockedFeatureCardDark, isChic && { backgroundColor: chicPalette?.surfaceSubtle, borderColor: chicPalette?.border }]} onPress={() => onPremium('affirmation')}><Text style={[styles.lockedFeatureTitle, isDark && styles.lockedFeatureTitleDark, isChic && { color: chicPalette?.textPrimary }]}>🔒 アファメーション</Text><Text style={[styles.lockedFeatureText, isDark && styles.lockedFeatureTextDark, isChic && { color: chicPalette?.textSecondary }]}>好きな言葉を、選んだ時間に届けます。</Text><Text style={[styles.lockedFeatureCta, { color: isChic ? chicPalette?.accent : accent }]}>Premiumで利用できます</Text></Pressable>
    : <Pressable style={[styles.settingsCard, isDark && styles.darkSurface]} onPress={() => onPremium('affirmation')}><Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>アファメーション</Text><Text style={[styles.switchCopy, isDark && styles.darkMutedText]}>好きな言葉を、選んだ時間に届けます</Text><Text style={styles.taskTemplateSavePremium}>Premium</Text></Pressable>;

  return <>
    {compact ? <Pressable style={[styles.itemCard, designMode === 'minimal' && styles.itemCardMinimal, isDark && styles.itemCardDark, isChic && { backgroundColor: chicPalette?.cardSurface, borderColor: chicPalette?.border }]} onPress={() => setSheetOpen(true)}><View style={{ flex: 1 }}><Text style={[styles.itemMeta, { color: primary, fontSize: 13, marginTop: 0 }]}>{affirmations.length}/5件を設定中</Text><Text style={[styles.itemMeta, { color: secondary, marginTop: 4 }]}>好きな言葉を、選んだ時間に届ける</Text></View><Text style={{ color: accent, fontSize: 13, fontWeight: '900' }}>管理する ›</Text></Pressable> : <Pressable style={[styles.settingsCard, isDark && styles.darkSurface, isChic && { backgroundColor: surface, borderColor: border }]} onPress={() => setSheetOpen(true)}><View style={{ flex: 1 }}><Text style={[styles.settingsTitle, { color: primary }]}>アファメーション</Text><Text style={[styles.switchCopy, { color: secondary }]}>{affirmations.length}/5件を設定中 ・ タップして管理</Text></View><Text style={{ color: accent, fontSize: 22 }}>›</Text></Pressable>}
    <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={closeSheet}>
      <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={closeSheet}>
        <View onStartShouldSetResponder={() => true} style={{ maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, backgroundColor: surface, borderColor: border, borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: primary, fontSize: 20, fontWeight: '800' }}>アファメーション</Text><Pressable onPress={closeSheet}><Text style={{ color: accent, fontWeight: '800' }}>閉じる</Text></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={{ color: secondary, marginTop: 4 }}>最大5件・同じ時刻の重複は登録できません</Text>
            {affirmations.map((item) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 14, backgroundColor: surfaceSoft, borderColor: border, borderWidth: 1 }}><View style={{ flex: 1 }}><Text numberOfLines={2} style={{ color: primary, fontWeight: '700' }}>{item.text}</Text><Text style={{ color: secondary, marginTop: 3 }}>{item.time}</Text></View><Switch value={item.enabled} onValueChange={(value) => void onSave({ ...item, enabled: value })} /><Pressable onPress={() => beginEdit(item)}><Text style={{ color: accent, fontWeight: '700' }}>編集</Text></Pressable><Pressable onPress={() => Alert.alert('この通知を削除しますか？', '予約済みの通知も停止します。', [{ text: 'キャンセル', style: 'cancel' }, { text: '削除', style: 'destructive', onPress: () => void onDelete(item) }])}><Text style={{ color: isDark ? '#FF8F9C' : '#A55E66', fontWeight: '700' }}>削除</Text></Pressable></View>)}
            <Text style={{ color: primary, fontWeight: '800', marginTop: 18 }}>通知を追加・編集</Text>
            <TextInput value={text} onChangeText={(value) => { setText(value); setTemplateId(undefined); }} placeholder="文章を選ぶか、自分で入力" placeholderTextColor={secondary} style={{ minHeight: 48, marginTop: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: surfaceSoft, color: primary }} multiline />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}><Pressable onPress={() => setShowTimePicker((value) => !value)} style={{ flex: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: surfaceSoft }}><Text style={{ color: primary }}>通知時刻 {time}</Text></Pressable><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={{ color: secondary }}>通知</Text><Switch value={enabled} onValueChange={setEnabled} /></View></View>
            {showTimePicker && <DateTimePicker themeVariant={isDark ? 'dark' : 'light'} value={clockToDate(time)} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowTimePicker(false); if (event.type === 'set' && selected) { setTime(formatLiveTime(selected)); if (Platform.OS !== 'ios') setShowTimePicker(false); } }} />}
            <Pressable disabled={!editing && affirmations.length >= 5} onPress={() => void submit()} style={{ minHeight: 46, marginTop: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: !editing && affirmations.length >= 5 ? border : accent }}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{editing ? '保存' : '通知を追加'}</Text></Pressable>
            <Text style={{ color: primary, fontWeight: '800', marginTop: 18 }}>ジャンル別テンプレート</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 8 }}>{affirmationTemplateCategories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: category === item ? accent : surfaceSoft, borderColor: border, borderWidth: 1 }}><Text style={{ color: category === item ? '#FFFFFF' : secondary, fontSize: 12 }}>{item}</Text></Pressable>)}</ScrollView>
            {selectedTemplates.map((item) => <Pressable key={item.id} onPress={() => chooseTemplate(item.id, item.text)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: border }}><Text style={{ color: text === item.text ? accent : primary }}>{item.text}</Text></Pressable>)}
            <Text style={{ color: primary, fontWeight: '800', marginTop: 18 }}>自分で追加</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><TextInput value={customDraft} onChangeText={setCustomDraft} placeholder="自分の言葉を追加" placeholderTextColor={secondary} style={{ flex: 1, minHeight: 44, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: surfaceSoft, color: primary }} /><Pressable onPress={saveCustom} style={{ minWidth: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: accent }}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>保存</Text></Pressable></View>
            {customTexts.map((item) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}><Pressable style={{ flex: 1 }} onPress={() => chooseCustom(item)}><Text numberOfLines={2} style={{ color: text === item.text ? accent : primary }}>{item.text}</Text></Pressable><Pressable onPress={() => { setCustomDraft(item.text); setEditingCustomId(item.id); }}><Text style={{ color: accent }}>編集</Text></Pressable><Pressable onPress={() => onDeleteCustomText(item.id)}><Text style={{ color: isDark ? '#FF8F9C' : '#A55E66' }}>削除</Text></Pressable></View>)}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  </>;
}
