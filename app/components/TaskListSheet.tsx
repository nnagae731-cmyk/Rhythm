import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import { Task, TaskListItem } from '../types';

type Props = { visible: boolean; task?: Task; designMode: DesignMode; chicPalette?: ChicThemePalette; styles: any; onClose: () => void; onSave: (taskId: string, items: TaskListItem[]) => void };

export function TaskListSheet({ visible, task, designMode, chicPalette, styles, onClose, onSave }: Props) {
  const isDark = designMode === 'dark';
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const surface = designMode === 'chic' && chicPalette ? chicPalette.cardSurface : theme.surface;
  const border = designMode === 'chic' && chicPalette ? chicPalette.border : theme.border;
  const accent = designMode === 'chic' && chicPalette ? chicPalette.accent : theme.primaryAccent;
  const onAccent = designMode === 'chic' && chicPalette ? chicPalette.onAccent : isDark ? theme.screenBackground : '#FFFFFF';
  const text = designMode === 'chic' && chicPalette ? chicPalette.textPrimary : theme.primaryText;
  const muted = designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.secondaryText;
  const [items, setItems] = useState<TaskListItem[]>([]);
  const [draft, setDraft] = useState('');
  const listScrollRef = useRef<ScrollView>(null);
  const draftInputRef = useRef<TextInput>(null);
  useEffect(() => { if (!visible) return; setItems((task?.listItems ?? []).slice().sort((a, b) => a.order - b.order).map((item, index) => ({ ...item, order: index }))); setDraft(''); }, [task, visible]);
  const inputStyle = { backgroundColor: designMode === 'chic' && chicPalette ? chicPalette.cardTint : theme.secondarySurface, borderColor: border, color: text };
  const add = () => {
    const textValue = draft.trim();
    if (!textValue) return;
    setItems((current) => [...current, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text: textValue, checked: false, order: current.length }]);
    setDraft('');
    setTimeout(() => { listScrollRef.current?.scrollToEnd({ animated: true }); draftInputRef.current?.focus(); }, 80);
  };
  const save = () => { if (!task) return; onSave(task.id, items.filter((item) => item.text.trim()).map((item, index) => ({ ...item, text: item.text.trim(), order: index }))); Keyboard.dismiss(); onClose(); };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}><Pressable style={styles.modalBackdrop} onPress={onClose}><Pressable style={[styles.modalSheet, { backgroundColor: surface, borderColor: border, borderWidth: 1, maxHeight: '86%', flexShrink: 1 }]} onPress={(event) => event.stopPropagation()}><View style={styles.modalHandle} /><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.modalTitle, isDark && styles.modalTitleDark, { color: text }]}>リスト・メモ</Text><Text numberOfLines={1} style={{ color: muted, marginTop: 2 }}>{task?.title}</Text></View><Pressable onPress={onClose}><Text style={{ color: accent, fontWeight: '700' }}>閉じる</Text></Pressable></View><ScrollView ref={listScrollRef} style={{ marginTop: 12, flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">{items.length === 0 && <Text style={{ color: muted, paddingVertical: 10 }}>まだ項目がありません</Text>}{items.map((item, index) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.checked }} onPress={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, checked: !entry.checked } : entry))} style={{ width: 25, height: 25, borderRadius: 13, borderWidth: 1, borderColor: accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: accent }}>{item.checked ? '✓' : ''}</Text></Pressable><TextInput value={item.text} onChangeText={(value) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, text: value } : entry))} onFocus={() => setTimeout(() => listScrollRef.current?.scrollTo({ y: Math.max(0, index * 58 - 80), animated: true }), 80)} placeholder="項目" placeholderTextColor={muted} style={[styles.modalInput, inputStyle, { flex: 1, minHeight: 40, height: 46, textDecorationLine: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.58 : 1 }]} /><Pressable accessibilityRole="button" onPress={() => setItems((current) => current.filter((entry) => entry.id !== item.id).map((entry, nextIndex) => ({ ...entry, order: nextIndex })))}><Text style={[styles.taskActionDeleteText, { color: theme.danger }]}>削除</Text></Pressable></View>)}<View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><TextInput ref={draftInputRef} value={draft} onChangeText={setDraft} onSubmitEditing={add} placeholder="項目を追加" placeholderTextColor={muted} returnKeyType="done" style={[styles.modalInput, inputStyle, { flex: 1, minHeight: 42, height: 48 }]} /><Pressable accessibilityRole="button" style={[styles.taskTemplateSaveAction, { borderColor: border }]} onPress={add}><Text style={[styles.taskTemplateSaveTitle, { color: accent }]}>＋ 項目を追加</Text></Pressable></View></ScrollView><Pressable accessibilityRole="button" style={[styles.primaryButton, { marginTop: 14, backgroundColor: accent }]} onPress={save}><Text style={[styles.primaryButtonText, { color: onAccent }]}>保存する</Text></Pressable></Pressable></Pressable></KeyboardAvoidingView></Modal>;
}
