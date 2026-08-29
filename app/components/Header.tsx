import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { formatLiveDate, formatLiveTime } from '../features/tasks/taskUtils';
import { ThemeMode } from '../types';
import { ChicThemePalette, getThemeTokens } from '../theme';

function VoiceMicButton({ onPress, accent, surface, border }: { onPress: () => void; accent: string; surface: string; border: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="共通音声入力"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.voiceButton, { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.72 : 1 }]}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" accessibilityRole="image">
        <Rect x="9" y="3" width="6" height="11" rx="3" stroke={accent} strokeWidth="1.8" fill="none" />
        <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" stroke={accent} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </Svg>
    </Pressable>
  );
}

export function Header({ designMode, now, compact = false, chicPalette, onVoice }: { designMode: ThemeMode; now: Date; compact?: boolean; chicPalette?: ChicThemePalette; onVoice?: () => void }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const colors = designMode === 'chic' && chicPalette
    ? { surface: chicPalette.cardSurface, border: chicPalette.border, accent: chicPalette.accent }
    : { surface: theme.colors.surface, border: theme.colors.border, accent: theme.colors.primaryAccent };
  const voiceButton = onVoice ? <VoiceMicButton onPress={onVoice} {...colors} /> : null;

  if (compact) return (
    <View style={styles.photoHeader}>
      <View style={styles.photoHeaderInfo}>
        <Text style={[styles.photoBrand, chicPalette && { color: chicPalette.textPrimary }]}>{'Rhythm'}</Text>
        <Text style={[styles.photoDate, chicPalette && { color: chicPalette.textSecondary }]}>{formatLiveDate(now)} ・ {formatLiveTime(now)}</Text>
      </View>
      {voiceButton}
    </View>
  );
  return (
    <View style={[styles.header, designMode !== 'chic' && styles.headerMinimal, designMode === 'dark' && styles.headerDark, designMode === 'chic' && chicPalette && { borderBottomColor: chicPalette.border }]}>
      <View>
        <Text style={[styles.dateLabel, designMode === 'dark' && styles.dateLabelDark, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{formatLiveDate(now)} · {formatLiveTime(now)}</Text>
        <Text style={[styles.brand, designMode !== 'chic' && styles.brandMinimal, designMode === 'dark' && styles.brandDark, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>Rhythm</Text>
      </View>
      {voiceButton}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 18, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerMinimal: { marginBottom: 14 },
  dateLabel: { color: '#7B7686', fontSize: 9, fontWeight: '800', marginBottom: 3 },
  dateLabelDark: { color: '#C9D3E5' },
  brand: { color: '#282538', fontSize: 29, fontWeight: '900', letterSpacing: -1.2 },
  brandMinimal: { color: '#111111' },
  headerDark: {},
  brandDark: { color: '#F4F7FC' },
  photoHeader: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoHeaderInfo: { flex: 1, gap: 2 },
  photoBrand: { color: '#5B4352', fontSize: 18, fontWeight: '900', letterSpacing: -0.6 },
  photoDate: { color: '#756875', fontSize: 9, fontWeight: '800', letterSpacing: 0.35 },
  voiceButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 12, zIndex: 2, shadowColor: '#000000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
});
