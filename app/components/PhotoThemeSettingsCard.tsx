import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { PhotoThemePhotoTarget, PhotoThemeSettings, PhotoThemeTopSlot, ThemeMode } from '../types';

const topSlots: Array<{ id: PhotoThemeTopSlot; label: string }> = [
  { id: 'home', label: '今日' },
  { id: 'timeline', label: '予定' },
  { id: 'analysis', label: '分析' },
  { id: 'wish', label: '叶えたいこと' },
  { id: 'settings', label: '設定' },
];

type Props = {
  photoTheme: PhotoThemeSettings;
  designMode: ThemeMode;
  planTier: PlanTier;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onPick: (target: PhotoThemePhotoTarget) => void;
  onClear: (target: PhotoThemePhotoTarget) => void;
  styles: any;
};

function PhotoPreview({ uri, label }: { uri?: string; label: string }) {
  return uri ? <Image source={{ uri }} style={localStyles.preview} /> : <View style={localStyles.emptyPreview}><Text style={localStyles.emptyPreviewText}>{label}</Text></View>;
}

export function PhotoThemeSettingsCard({ photoTheme, designMode, planTier, onPremium, onPick, onClear, styles }: Props) {
  const isDark = designMode === 'dark';
  if (planTier !== 'premium') return <Pressable style={styles.savedTemplateLocked} onPress={() => onPremium('photo_design')}>
    <View style={{ flex: 1 }}><Text style={styles.savedTemplateLockedTitle}>写真デザイン</Text><Text style={styles.savedTemplateLockedCopy}>好きな写真を背景やトップ画像に使えます</Text></View>
    <Text style={styles.taskTemplateSavePremium}>Premium</Text>
  </Pressable>;

  return <View style={[styles.settingsCard, isDark && styles.darkSurface]}>
    <View style={styles.historyHeader}><View><Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>写真デザイン</Text><Text style={[styles.switchCopy, isDark && styles.darkAccentText]}>Designの雰囲気はそのままに、好きな一枚を添えます</Text></View><Text style={styles.taskTemplateSavePremium}>Premium</Text></View>

    <Text style={[styles.fieldLabel, isDark && styles.darkAccentText]}>背景写真</Text>
    <PhotoPreview uri={photoTheme.imageUri} label="背景にしたい写真を選ぶ" />
    <View style={localStyles.controls}>
      <Pressable style={styles.templateAddButton} onPress={() => onPick('background')}><Text style={styles.templateAddButtonText}>{photoTheme.imageUri ? '背景写真を変更' : '背景写真を選ぶ'}</Text></Pressable>
      {photoTheme.imageUri && <Pressable style={localStyles.clearButton} onPress={() => onClear('background')}><Text style={localStyles.clearText}>外す</Text></Pressable>}
    </View>
    <Text style={localStyles.note}>色味は変えず、そのまま背景に表示します。</Text>

    <View style={localStyles.divider} />
    <Text style={[styles.fieldLabel, isDark && styles.darkAccentText]}>画面ごとのトップ画像</Text>
    <Text style={localStyles.note}>今日・予定・分析・叶えたいこと・設定の5画面に、それぞれ1枚ずつ設定できます。</Text>
    <View style={localStyles.slotGrid}>
      {topSlots.map((slot) => {
        const uri = photoTheme.topImageUris?.[slot.id];
        return <View key={slot.id} style={localStyles.slotCard}>
          {uri ? <Image source={{ uri }} style={localStyles.slotPreview} /> : <View style={localStyles.slotEmpty}><Text style={localStyles.slotEmptyText}>＋</Text></View>}
          <Text style={localStyles.slotLabel}>{slot.label}</Text>
          <View style={localStyles.slotActions}>
            <Pressable onPress={() => onPick(slot.id)}><Text style={localStyles.slotActionText}>{uri ? '変更' : '選ぶ'}</Text></Pressable>
            {uri && <Pressable onPress={() => onClear(slot.id)}><Text style={localStyles.slotRemoveText}>外す</Text></Pressable>}
          </View>
        </View>;
      })}
    </View>

    <View style={localStyles.divider} />
    <Text style={[styles.fieldLabel, isDark && styles.darkAccentText]}>集中タイマーの背景</Text>
    <PhotoPreview uri={photoTheme.focusBackgroundUri} label="集中中に見たい写真を選ぶ" />
    <View style={localStyles.controls}>
      <Pressable style={styles.templateAddButton} onPress={() => onPick('focus')}><Text style={styles.templateAddButtonText}>{photoTheme.focusBackgroundUri ? '集中背景を変更' : '集中背景を選ぶ'}</Text></Pressable>
      {photoTheme.focusBackgroundUri && <Pressable style={localStyles.clearButton} onPress={() => onClear('focus')}><Text style={localStyles.clearText}>外す</Text></Pressable>}
    </View>
  </View>;
}

const localStyles = StyleSheet.create({
  preview: { width: '100%', height: 126, borderRadius: 14, marginBottom: 10, backgroundColor: '#EEE7E8' },
  emptyPreview: { height: 104, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D9C8CF', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF9F8' },
  emptyPreviewText: { color: '#8A737B', fontSize: 11, fontWeight: '800' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 },
  clearButton: { paddingVertical: 9, paddingHorizontal: 12 },
  clearText: { color: '#B85060', fontSize: 12, fontWeight: '900' },
  note: { color: '#7B7180', fontSize: 10, lineHeight: 16, fontWeight: '700', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#E8DCE3', marginVertical: 14 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotCard: { width: '31%', minHeight: 120, padding: 7, borderRadius: 12, borderWidth: 1, borderColor: '#E2D5DD', backgroundColor: '#FFFDFC' },
  slotPreview: { width: '100%', aspectRatio: 2.5, borderRadius: 8, backgroundColor: '#EEE7E8' },
  slotEmpty: { width: '100%', aspectRatio: 2.5, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8EFF2' },
  slotEmptyText: { color: '#A98797', fontSize: 20, fontWeight: '400' },
  slotLabel: { color: '#403644', fontSize: 10, fontWeight: '900', marginTop: 6 },
  slotActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  slotActionText: { color: '#7559E8', fontSize: 10, fontWeight: '900' },
  slotRemoveText: { color: '#B85060', fontSize: 10, fontWeight: '900' },
});
