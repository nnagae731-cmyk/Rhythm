import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';

export function GuidanceCard({ title, description, actionLabel, onAction, designMode, chicPalette, testID }: { title: string; description: string; actionLabel: string; onAction?: () => void; designMode: DesignMode; chicPalette?: ChicThemePalette; testID: string }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const palette = designMode === 'chic' ? chicPalette : undefined;
  const accent = palette?.accent ?? theme.primaryAccent;
  return <View testID={testID} style={{ padding: 18, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: palette?.border ?? theme.border, backgroundColor: palette?.cardSurface ?? theme.surface }}>
    <Text accessibilityRole="header" style={{ color: palette?.textPrimary ?? theme.primaryText, fontSize: 16, lineHeight: 24, fontWeight: '800' }}>{title}</Text>
    <Text style={{ color: palette?.textSecondary ?? theme.secondaryText, fontSize: 14, lineHeight: 22, marginTop: 8 }}>{description}</Text>
    {onAction && <Pressable accessibilityRole="button" onPress={onAction} style={{ minHeight: 44, paddingHorizontal: 14, marginTop: 14, borderRadius: 12, backgroundColor: palette?.accentSoft ?? theme.softAccent, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: palette?.accentStrong ?? accent, fontSize: 14, lineHeight: 22, fontWeight: '800', flexShrink: 1 }}>{actionLabel}</Text><Text style={{ color: accent, fontSize: 20 }}>›</Text></Pressable>}
  </View>;
}
