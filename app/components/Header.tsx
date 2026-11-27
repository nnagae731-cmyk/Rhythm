import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { formatLiveDate, formatLiveTime } from '../features/tasks/taskUtils';
import { ThemeMode } from '../types';
import { ChicThemePalette, getThemeTokens } from '../theme';
import { ICON_METRICS } from './iconMetrics';

function VoiceMicButton({ onPress, accent, surface, border }: { onPress: () => void; accent: string; surface: string; border: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="共通音声入力"
      onPress={onPress}
      style={({ pressed }) => [styles.voiceButton, { backgroundColor: surface, borderColor: border, opacity: pressed ? 0.72 : 1 }]}
    >
      <Svg width={ICON_METRICS.size} height={ICON_METRICS.size} viewBox="0 0 24 24" accessible={false}>
        <Rect x="9" y="3" width="6" height="11" rx="3" stroke={accent} strokeWidth={ICON_METRICS.strokeWidth} fill="none" />
        <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" stroke={accent} strokeWidth={ICON_METRICS.strokeWidth} strokeLinecap="round" fill="none" />
      </Svg>
    </Pressable>
  );
}

function PremiumEntryButton({ onPress, accent, iconOnly }: { onPress: () => void; accent: string; iconOnly: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Rhythm Premium" onPress={onPress} style={({ pressed }) => [styles.premiumEntry, { opacity: pressed ? 0.72 : 1 }]}>
    <Svg width={ICON_METRICS.smallSize} height={ICON_METRICS.smallSize} viewBox="0 0 24 24" accessible={false}><Path d="M12 3l2.4 6.1L20.5 12l-6.1 2.4L12 20.5l-2.4-6.1L3.5 12l6.1-2.9L12 3z" stroke={accent} strokeWidth={ICON_METRICS.strokeWidth} fill="none" strokeLinejoin="round" /></Svg>
    {!iconOnly ? <Text style={[styles.premiumEntryLabel, { color: accent }]}>Premium</Text> : null}
  </Pressable>;
}

function NotificationBell({ onPress, accent, danger, surface, hasUnread }: { onPress: () => void; accent: string; danger: string; surface: string; hasUnread: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="お知らせ" onPress={onPress} style={({ pressed }) => [styles.notificationBell, { opacity: pressed ? 0.72 : 1 }]}>
    <Svg width={ICON_METRICS.size} height={ICON_METRICS.size} viewBox="0 0 24 24" accessible={false}><Path d="M6.5 10.5a5.5 5.5 0 0 1 11 0c0 5 2 5.5 2 7H4.5c0-1.5 2-2 2-7ZM10 20h4" stroke={accent} strokeWidth={ICON_METRICS.strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
    {hasUnread ? <View style={[styles.notificationBellDot, { backgroundColor: danger, borderColor: surface }]} /> : null}
  </Pressable>;
}

export function Header({ designMode, now, compact = false, chicPalette, onVoice, onPremium, onNotifications, hasUnreadNotifications = false }: { designMode: ThemeMode; now: Date; compact?: boolean; chicPalette?: ChicThemePalette; onVoice?: () => void; onPremium?: () => void; onNotifications?: () => void; hasUnreadNotifications?: boolean }) {
  const { width, fontScale } = useWindowDimensions();
  const compactActions = width < 360 || fontScale > 1.2;
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const colors = designMode === 'chic' && chicPalette
    ? { surface: chicPalette.cardSurface, border: chicPalette.border, accent: chicPalette.accent, danger: chicPalette.danger }
    : { surface: theme.colors.surface, border: theme.colors.border, accent: theme.colors.primaryAccent, danger: theme.colors.danger };
  const voiceButton = onVoice ? <VoiceMicButton onPress={onVoice} {...colors} /> : null;
  const notificationButton = onNotifications ? <NotificationBell onPress={onNotifications} accent={colors.accent} danger={colors.danger} surface={colors.surface} hasUnread={hasUnreadNotifications} /> : null;
  const actions = <View style={styles.headerActions}>{onPremium ? <PremiumEntryButton onPress={onPremium} accent={colors.accent} iconOnly={compactActions} /> : null}{notificationButton}{voiceButton}</View>;

  if (compact) return (
    <View style={styles.photoHeader}>
      <View style={styles.photoHeaderInfo}>
        <Text style={[styles.photoBrand, { color: designMode === 'chic' && chicPalette ? chicPalette.textPrimary : theme.colors.primaryText }]}>{'Rhythm'}</Text>
        <Text numberOfLines={2} style={[styles.photoDate, { color: designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.colors.secondaryText }]}>{formatLiveDate(now)} ・ {formatLiveTime(now)}</Text>
      </View>
      {actions}
    </View>
  );
  return (
    <View style={[styles.header, designMode !== 'chic' && styles.headerMinimal, designMode === 'dark' && styles.headerDark, designMode === 'chic' && chicPalette && { borderBottomColor: chicPalette.border }]}>
      <View style={styles.headerInfo}>
        <Text numberOfLines={2} style={[styles.dateLabel, designMode === 'dark' && styles.dateLabelDark, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{formatLiveDate(now)} · {formatLiveTime(now)}</Text>
        <Text style={[styles.brand, designMode !== 'chic' && styles.brandMinimal, designMode === 'dark' && styles.brandDark, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>Rhythm</Text>
      </View>
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 14, paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headerInfo: { flexGrow: 1, flexShrink: 1, flexBasis: 116 },
  headerMinimal: { marginBottom: 12 },
  dateLabel: { color: '#7B7686', fontSize: 11, lineHeight: 16, fontWeight: '500', marginBottom: 2 },
  dateLabelDark: { color: '#C9D3E5' },
  brand: { color: '#282538', fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.7 },
  brandMinimal: { color: '#111111' },
  headerDark: {},
  brandDark: { color: '#F4F7FC' },
  photoHeader: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  photoHeaderInfo: { flexGrow: 1, flexShrink: 1, flexBasis: 116, gap: 2 },
  photoBrand: { color: '#5B4352', fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  photoDate: { color: '#756875', fontSize: 11, lineHeight: 16, fontWeight: '500' },
  voiceButton: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  premiumEntry: { minWidth: 44, height: 44, paddingHorizontal: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, zIndex: 2 },
  premiumEntryLabel: { fontSize: 11, fontWeight: '600' },
  notificationBell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notificationBellDot: { position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 4, borderWidth: 1 },
});
