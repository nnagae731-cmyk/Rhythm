import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { PhotoThemeSettings, ThemeMode } from '../types';

type Props = {
  photoTheme: PhotoThemeSettings;
  designMode: ThemeMode;
  planTier: PlanTier;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onPick: () => void;
  onPlacement: (placement: PhotoThemeSettings['placement']) => void;
  onClear: () => void;
  styles: any;
};

export function PhotoThemeSettingsCard({ photoTheme, designMode, planTier, onPremium, onPick, onPlacement, onClear, styles }: Props) {
  const isDark = designMode === 'dark';
  if (planTier !== 'premium') return <Pressable style={styles.savedTemplateLocked} onPress={() => onPremium('photo_design')}>
    <View style={{ flex: 1 }}><Text style={styles.savedTemplateLockedTitle}>写真デザイン</Text><Text style={styles.savedTemplateLockedCopy}>好きな写真を背景やトップ画像に使えます</Text></View>
    <Text style={styles.taskTemplateSavePremium}>Premium</Text>
  </Pressable>;

  return <View style={[styles.settingsCard, isDark && styles.darkSurface]}>
    <View style={styles.historyHeader}><View><Text style={[styles.settingsTitle, isDark && styles.darkBodyText]}>写真デザイン</Text><Text style={[styles.switchCopy, isDark && styles.darkAccentText]}>好きな写真を、Rhythmの景色にします</Text></View><Text style={styles.taskTemplateSavePremium}>Premium</Text></View>
    {photoTheme.imageUri ? <Image source={{ uri: photoTheme.imageUri }} style={localStyles.preview} /> : <View style={localStyles.emptyPreview}><Text style={localStyles.emptyPreviewText}>選んだ写真がここに表示されます</Text></View>}
    <View style={localStyles.controls}><Pressable style={styles.templateAddButton} onPress={onPick}><Text style={styles.templateAddButtonText}>{photoTheme.imageUri ? '写真を変更' : '写真を選ぶ'}</Text></Pressable>{photoTheme.imageUri && <Pressable style={localStyles.clearButton} onPress={onClear}><Text style={localStyles.clearText}>外す</Text></Pressable>}</View>
    <Text style={[styles.fieldLabel, isDark && styles.darkAccentText]}>写真の見せ方</Text>
    <View style={styles.segment}><Pressable style={[styles.segmentButton, photoTheme.placement === 'background' && styles.segmentActive]} onPress={() => onPlacement('background')}><Text style={[styles.segmentText, photoTheme.placement === 'background' && styles.segmentTextActive]}>背景にする</Text></Pressable><Pressable style={[styles.segmentButton, photoTheme.placement === 'top' && styles.segmentActive]} onPress={() => onPlacement('top')}><Text style={[styles.segmentText, photoTheme.placement === 'top' && styles.segmentTextActive]}>トップにする</Text></Pressable></View>
  </View>;
}

const localStyles = StyleSheet.create({
  preview: { width: '100%', height: 126, borderRadius: 14, marginBottom: 10, backgroundColor: '#EEE7E8' },
  emptyPreview: { height: 104, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D9C8CF', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF9F8' },
  emptyPreviewText: { color: '#8A737B', fontSize: 11, fontWeight: '800' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  clearButton: { paddingVertical: 9, paddingHorizontal: 12 },
  clearText: { color: '#B85060', fontSize: 12, fontWeight: '900' },
});
