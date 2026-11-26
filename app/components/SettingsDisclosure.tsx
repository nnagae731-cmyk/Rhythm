import React from 'react';
import { styles } from '../styles/appStyles';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import { PremiumFeatureIcon, type PremiumFeatureIconName } from './PremiumModal';
import { Pressable, Text, View } from 'react-native';

export function SettingsDisclosure({ title, subtitle, expanded, onPress, children, designMode, chicPalette, icon, headerAction }: { title: string; subtitle: string; expanded: boolean; onPress: () => void; children: React.ReactNode; designMode?: DesignMode; chicPalette?: ChicThemePalette; icon?: PremiumFeatureIconName; headerAction?: React.ReactNode }) {
  const isDark = designMode === 'dark';
  const isChic = designMode === 'chic' && !!chicPalette;
  const theme = getThemeTokens(designMode ?? 'minimal', chicPalette?.id ?? 'cool').colors;
  const textPrimary = isChic ? chicPalette!.textPrimary : theme.primaryText;
  const textSecondary = isChic ? chicPalette!.textSecondary : theme.secondaryText;
  const accent = isChic ? chicPalette!.accent : theme.primaryAccent;
  const headerStyle = [styles.settingsDisclosureHeader, isDark && styles.darkSurface, isChic && { backgroundColor: chicPalette!.cardSurface, borderColor: chicPalette!.border }];
  const headerContent = <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
    {icon ? <View style={{ width: 32, alignItems: 'flex-start' }}><PremiumFeatureIcon name={icon} color={expanded ? accent : textSecondary} /></View> : null}
    <View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.settingsDisclosureTitle, { color: textPrimary }]}>{title}</Text><Text style={[styles.settingsDisclosureSubtitle, { color: textSecondary }]}>{subtitle}</Text></View>
  </View>;
  const chevron = <Text style={[styles.settingsDisclosureChevron, { color: accent }]}>{expanded ? '⌃' : '⌄'}</Text>;
  return <View style={styles.settingsDisclosure}>
    {headerAction ? <View style={headerStyle}>
      <Pressable style={{ flex: 1, minWidth: 0 }} onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded }}>{headerContent}</Pressable>
      {headerAction}
      <Pressable style={{ minWidth: 32, minHeight: 40, alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 4 }} onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded }}>{chevron}</Pressable>
    </View> : <Pressable style={headerStyle} onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded }}>
      {headerContent}
      {chevron}
    </Pressable>}
    {expanded && <View style={styles.settingsDisclosureBody}>{children}</View>}
  </View>;
}
