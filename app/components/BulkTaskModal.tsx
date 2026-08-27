import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';

type Props = { visible: boolean; designMode: DesignMode; chicPalette?: ChicThemePalette; styles: any; today: string; onClose: () => void; onSave: (titles: string[], scheduledDate: string) => void };

export function BulkTaskModal({ visible, designMode, chicPalette, styles, today, onClose, onSave }: Props) {
  const isDark = designMode === 'dark';
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const surface = designMode === 'chic' && chicPalette ? chicPalette.cardSurface : theme.surface;
  const text = designMode === 'chic' && chicPalette ? chicPalette.textPrimary : theme.primaryText;
  const muted = designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.secondaryText;
  const accent = designMode === 'chic' && chicPalette ? chicPalette.accent : theme.primaryAccent;
  const onAccent = designMode === 'chic' && chicPalette ? chicPalette.onAccent : isDark ? theme.screenBackground : '#FFFFFF';
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(today);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  useEffect(() => { if (visible) { setValue(''); setSaving(false); setScheduledDate(today); setDatePickerOpen(false); } }, [today, visible]);
  const titles = value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const save = () => {
    if (saving) return;
    if (titles.length === 0) { Alert.alert('タスクを入力してください', '1行に1件ずつ入力してください。'); return; }
    if (titles.length > 50) { Alert.alert('追加件数を確認してください', '一度に追加できるのは50件までです。空行は件数に含みません。'); return; }
    setSaving(true);
    onSave(titles, scheduledDate);
  };
  const pickerValue = () => { const [year, month, day] = scheduledDate.split('-').map(Number); return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1); };
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><SafeAreaView style={{ flex: 1, backgroundColor: surface }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={{ flex: 1, backgroundColor: surface }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 }} keyboardShouldPersistTaps="handled"><View style={styles.modalHandle} /><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Text style={[styles.modalTitle, isDark && styles.modalTitleDark, { color: text }]}>複数まとめて追加</Text><Text style={{ color: muted, marginTop: 4 }}>1行に1件ずつ入力できます</Text></View><Pressable onPress={onClose}><Text style={{ color: accent, fontWeight: '700' }}>戻る</Text></Pressable></View><TextInput autoFocus={false} multiline value={value} onChangeText={setValue} placeholder="例：資料を確認\nメールを返す\n買い物をする" placeholderTextColor={theme.secondaryText} style={[styles.modalInput, { minHeight: 180, marginTop: 16, textAlignVertical: 'top', color: text, backgroundColor: isDark ? theme.secondarySurface : undefined, borderColor: isDark ? theme.border : undefined }]} /><Text style={{ color: muted, marginTop: 12 }}>共通の実行日</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><Pressable onPress={() => setScheduledDate(today)} style={[styles.taskDateQuick, { borderColor: accent, backgroundColor: isDark ? theme.secondarySurface : undefined }]}><Text style={{ color: accent }}>今日</Text></Pressable><Pressable onPress={() => { const date = pickerValue(); date.setDate(date.getDate() + 1); setScheduledDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`); }} style={[styles.taskDateQuick, { borderColor: accent, backgroundColor: isDark ? theme.secondarySurface : undefined }]}><Text style={{ color: accent }}>明日</Text></Pressable><Pressable onPress={() => setDatePickerOpen((open) => !open)} style={[styles.taskDatePickerButton, { flex: 1, borderColor: isDark ? theme.border : accent, backgroundColor: isDark ? theme.surface : undefined }]}><Text style={{ color: text }}>{scheduledDate}</Text></Pressable></View>{datePickerOpen && <DateTimePicker value={pickerValue()} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'inline' : 'default'} themeVariant={isDark ? 'dark' : undefined} textColor={text} accentColor={accent} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios' || event.type !== 'set') setDatePickerOpen(false); if (event.type === 'set' && selected) { setScheduledDate(`${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`); if (Platform.OS === 'ios') setDatePickerOpen(false); } }} /> }<Text style={{ color: muted, marginTop: 8 }}>{titles.length}件・実行日 {scheduledDate}</Text><Pressable disabled={saving} style={[styles.primaryButton, { marginTop: 14, backgroundColor: accent, opacity: saving ? 0.6 : 1 }]} onPress={save}><Text style={[styles.primaryButtonText, { color: onAccent }]}>{saving ? '追加中…' : `${titles.length || ''}件を追加する`}</Text></Pressable></ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>;
}
