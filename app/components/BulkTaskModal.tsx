import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ChicThemePalette, DesignMode } from '../theme';

type Props = { visible: boolean; designMode: DesignMode; chicPalette?: ChicThemePalette; styles: any; today: string; onClose: () => void; onSave: (titles: string[], scheduledDate: string) => void };

export function BulkTaskModal({ visible, designMode, chicPalette, styles, today, onClose, onSave }: Props) {
  const isDark = designMode === 'dark';
  const surface = designMode === 'chic' && chicPalette ? chicPalette.cardSurface : isDark ? '#181F2E' : '#FFFFFF';
  const text = designMode === 'chic' && chicPalette ? chicPalette.textPrimary : isDark ? '#F4F7FC' : '#182235';
  const muted = designMode === 'chic' && chicPalette ? chicPalette.textSecondary : isDark ? '#B4C0D4' : '#68748A';
  const accent = designMode === 'chic' && chicPalette ? chicPalette.accent : isDark ? '#8EA6FF' : '#4F6FED';
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
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><Pressable style={styles.modalBackdrop} onPress={onClose}><Pressable style={[styles.modalSheet, { backgroundColor: surface, maxHeight: '78%' }]} onPress={(event) => event.stopPropagation()}><View style={styles.modalHandle} /><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Text style={[styles.modalTitle, isDark && styles.modalTitleDark, { color: text }]}>複数まとめて追加</Text><Text style={{ color: muted, marginTop: 4 }}>1行に1件ずつ入力できます</Text></View><Pressable onPress={onClose}><Text style={{ color: accent, fontWeight: '700' }}>閉じる</Text></Pressable></View><TextInput autoFocus={false} multiline value={value} onChangeText={setValue} placeholder="例：資料を確認\nメールを返す\n買い物をする" placeholderTextColor={isDark ? '#8F9BB0' : '#A29DAA'} style={[styles.modalInput, { minHeight: 180, marginTop: 16, textAlignVertical: 'top', color: text }]} /><Text style={{ color: muted, marginTop: 12 }}>共通の実行日</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><Pressable onPress={() => setScheduledDate(today)} style={[styles.taskDateQuick, { borderColor: accent }]}><Text style={{ color: accent }}>今日</Text></Pressable><Pressable onPress={() => { const date = pickerValue(); date.setDate(date.getDate() + 1); setScheduledDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`); }} style={[styles.taskDateQuick, { borderColor: accent }]}><Text style={{ color: accent }}>明日</Text></Pressable><Pressable onPress={() => setDatePickerOpen((open) => !open)} style={[styles.taskDatePickerButton, { flex: 1, borderColor: accent }]}><Text style={{ color: text }}>{scheduledDate}</Text></Pressable></View>{datePickerOpen && <DateTimePicker value={pickerValue()} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'inline' : 'default'} themeVariant={isDark ? 'dark' : undefined} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios' || event.type !== 'set') setDatePickerOpen(false); if (event.type === 'set' && selected) { setScheduledDate(`${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`); if (Platform.OS === 'ios') setDatePickerOpen(false); } }} /> }<Text style={{ color: muted, marginTop: 8 }}>{titles.length}件・実行日 {scheduledDate}</Text><Pressable disabled={saving} style={[styles.primaryButton, { marginTop: 14, backgroundColor: accent, opacity: saving ? 0.6 : 1 }]} onPress={save}><Text style={styles.primaryButtonText}>{saving ? '追加中…' : `${titles.length || ''}件を追加する`}</Text></Pressable></Pressable></Pressable></KeyboardAvoidingView></Modal>;
}
