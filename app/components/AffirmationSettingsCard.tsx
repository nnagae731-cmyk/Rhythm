import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { Affirmation, ThemeMode } from '../types';
import { formatLiveTime } from '../features/tasks/taskUtils';
import { ChicThemePalette } from '../theme';

type Props = {
  affirmations: Affirmation[];
  designMode: ThemeMode;
  chicPalette?: ChicThemePalette;
  planTier: PlanTier;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onSave: (affirmation: Affirmation) => Promise<void> | void;
  onDelete: (affirmation: Affirmation) => Promise<void> | void;
  styles: any;
};

function clockToDate(time: string) {
  const [hour = '9', minute = '0'] = time.split(':');
  const value = new Date();
  value.setHours(Math.max(0, Math.min(23, Number(hour) || 9)), Math.max(0, Math.min(59, Number(minute) || 0)), 0, 0);
  return value;
}

export function AffirmationSettingsCard({ affirmations, designMode, chicPalette, planTier, onPremium, onSave, onDelete, styles }: Props) {
  const [text, setText] = useState('');
  const [time, setTime] = useState('09:00');
  const [enabled, setEnabled] = useState(true);
  const [editingId, setEditingId] = useState<string>();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const isDark = designMode === 'dark';
  const isChic = designMode === 'chic' && !!chicPalette;
  const canUse = planTier === 'premium';
  const editing = affirmations.find((item) => item.id === editingId);

  const reset = () => {
    setText('');
    setTime('09:00');
    setEnabled(true);
    setEditingId(undefined);
    setShowTimePicker(false);
  };

  const submit = async () => {
    const clean = text.trim();
    if (!clean) {
      Alert.alert('言葉を入力してね');
      return;
    }
    const next: Affirmation = {
      id: editing?.id ?? `affirmation:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      text: clean,
      time,
      enabled,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      notificationId: editing?.notificationId,
    };
    await onSave(next);
    reset();
  };

  if (!canUse) {
    return <Pressable style={styles.savedTemplateLocked} onPress={() => onPremium('affirmation')}>
      <View style={{ flex: 1 }}><Text style={styles.savedTemplateLockedTitle}>今日のアファメーション</Text><Text style={styles.savedTemplateLockedCopy}>好きな言葉を、選んだ時間に届けます</Text></View>
      <Text style={styles.taskTemplateSavePremium}>Premium</Text>
    </Pressable>;
  }

  return <View style={[styles.settingsCard, isDark && styles.darkSurface, isChic && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
    <View style={styles.historyHeader}>
      <View><Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>今日のアファメーション</Text><Text style={[styles.switchCopy, isDark && styles.darkAccentText]}>毎日、選んだ時間に自分の言葉を届けます</Text></View>
      <Text style={styles.taskTemplateSavePremium}>Premium</Text>
    </View>
    <TextInput value={text} onChangeText={setText} placeholder="例：私は、自分のペースで進める" placeholderTextColor="#A29DAA" style={styles.templateInput} />
    <View style={styles.affirmationControls}>
      <Pressable style={styles.pickerButton} onPress={() => setShowTimePicker((current) => !current)}><Text style={styles.pickerButtonText}>通知 {time}</Text></Pressable>
      <View style={styles.affirmationEnabled}><Text style={[styles.switchCopy, isDark && styles.darkAccentText]}>毎日通知</Text><Switch value={enabled} onValueChange={setEnabled} /></View>
      <Pressable style={styles.templateAddButton} onPress={() => void submit()}><Text style={styles.templateAddButtonText}>{editing ? '保存' : '追加'}</Text></Pressable>
    </View>
    {showTimePicker && <DateTimePicker value={clockToDate(time)} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowTimePicker(false); if (event.type === 'set' && selected) { setTime(formatLiveTime(selected)); if (Platform.OS !== 'ios') setShowTimePicker(false); } }} />}
    {editing && <Pressable onPress={reset}><Text style={styles.affirmationCancel}>編集をやめる</Text></Pressable>}
    <View style={styles.templateList}>
      {affirmations.length === 0 ? <Text style={[styles.savedTemplateEmpty, isDark && styles.darkAccentText]}>最初の言葉を登録すると、毎日通知できます。</Text> : affirmations.map((item) => <View key={item.id} style={styles.affirmationRow}>
        <View style={{ flex: 1 }}><Text numberOfLines={2} style={[styles.templateRowText, isDark && styles.darkBodyText]}>{item.text}</Text><Text style={[styles.switchCopy, isDark && styles.darkAccentText]}>{item.time} ・ {item.enabled ? '通知中' : '停止中'}</Text></View>
        <Switch value={item.enabled} onValueChange={(value) => void onSave({ ...item, enabled: value })} />
        <Pressable onPress={() => { setEditingId(item.id); setText(item.text); setTime(item.time); setEnabled(item.enabled); }}><Text style={styles.affirmationEdit}>編集</Text></Pressable>
        <Pressable onPress={() => Alert.alert('この言葉を削除しますか？', '予約済みの通知も停止します。', [{ text: 'キャンセル', style: 'cancel' }, { text: '削除', style: 'destructive', onPress: () => void onDelete(item) }])}><Text style={styles.templateDelete}>削除</Text></Pressable>
      </View>)}
    </View>
  </View>;
}
