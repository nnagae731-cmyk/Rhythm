import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import { Task, TaskListItem } from '../types';

type Props = { visible: boolean; task?: Task; designMode: DesignMode; chicPalette?: ChicThemePalette; styles: any; onClose: () => void; onSave: (taskId: string, items: TaskListItem[]) => void };

export function TaskListSheet({ visible, task, designMode, chicPalette, styles, onClose, onSave }: Props) {
  const isDark = designMode === 'dark';
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const surface = designMode === 'chic' && chicPalette ? chicPalette.cardSurface : theme.surface;
  const border = designMode === 'chic' && chicPalette ? chicPalette.border : theme.border;
  const accent = designMode === 'chic' && chicPalette ? chicPalette.accent : theme.primaryAccent;
  const text = designMode === 'chic' && chicPalette ? chicPalette.textPrimary : theme.primaryText;
  const muted = designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.secondaryText;
  const [items, setItems] = useState<TaskListItem[]>([]);
  const [draft, setDraft] = useState('');
  useEffect(() => { if (!visible) return; setItems((task?.listItems ?? []).slice().sort((a, b) => a.order - b.order).map((item, index) => ({ ...item, order: index }))); setDraft(''); }, [task, visible]);
  const add = () => { const textValue = draft.trim(); if (!textValue) return; setItems((current) => [...current, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text: textValue, checked: false, order: current.length }]); setDraft(''); };
  const save = () => { if (!task) return; onSave(task.id, items.filter((item) => item.text.trim()).map((item, index) => ({ ...item, text: item.text.trim(), order: index }))); onClose(); };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.modalBackdrop} onPress={onClose}><Pressable style={[styles.modalSheet, { backgroundColor: surface, borderColor: border, borderWidth: 1, maxHeight: '78%' }]} onPress={(event) => event.stopPropagation()}><View style={styles.modalHandle} /><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><Text style={[styles.modalTitle, isDark && styles.modalTitleDark, { color: text }]}>リスト・メモ</Text><Text style={{ color: muted, marginTop: 2 }}>{task?.title}</Text></View><Pressable onPress={onClose}><Text style={{ color: accent, fontWeight: '700' }}>閉じる</Text></Pressable></View><ScrollView style={{ marginTop: 12 }} keyboardShouldPersistTaps="handled">{items.length === 0 && <Text style={{ color: muted, paddingVertical: 10 }}>まだ項目がありません</Text>}{items.map((item) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}><Pressable onPress={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, checked: !entry.checked } : entry))} style={{ width: 25, height: 25, borderRadius: 13, borderWidth: 1, borderColor: accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: accent }}>{item.checked ? '✓' : ''}</Text></Pressable><TextInput value={item.text} onChangeText={(value) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, text: value } : entry))} style={[styles.modalInput, { flex: 1, minHeight: 40, color: text }]} /><Pressable onPress={() => setItems((current) => current.filter((entry) => entry.id !== item.id).map((entry, index) => ({ ...entry, order: index })))}><Text style={styles.taskActionDeleteText}>削除</Text></Pressable></View>)}<View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><TextInput value={draft} onChangeText={setDraft} onSubmitEditing={add} placeholder="項目を追加" placeholderTextColor={muted} style={[styles.modalInput, { flex: 1, minHeight: 42, color: text }]} /><Pressable style={[styles.taskTemplateSaveAction, { borderColor: border }]} onPress={add}><Text style={[styles.taskTemplateSaveTitle, { color: accent }]}>＋ 項目を追加</Text></Pressable></View></ScrollView><Pressable style={[styles.primaryButton, { marginTop: 14, backgroundColor: accent }]} onPress={save}><Text style={styles.primaryButtonText}>保存する</Text></Pressable></Pressable></Pressable></Modal>;
}
