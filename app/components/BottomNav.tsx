import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { ChicThemePalette, getThemeTokens } from '../theme';
import { Screen, ThemeMode } from '../types';
import { ICON_METRICS } from './iconMetrics';

export function BottomNav({ screen, designMode, chicPalette, onChange }: { screen: Screen; designMode: ThemeMode; chicPalette?: ChicThemePalette; onChange: (screen: Screen) => void }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const designColors = designMode === 'chic' ? chicPalette : undefined;
  const items: { id: Screen; label: string }[] = [
    { id: 'home', label: 'ToDo' },
    { id: 'timeline', label: '予定' },
    { id: 'analysis', label: '分析' },
    { id: 'wish', label: '叶えたいこと' },
    { id: 'settings', label: '設定' },
  ];

  const renderIcon = (item: { id: Screen }, color: string) => {
    const stroke = { stroke: color, strokeWidth: ICON_METRICS.strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
    const content = item.id === 'home' ? <Path d="m5 12 4.5 4.5L19 7" {...stroke} />
      : item.id === 'wish' ? <>{[0, 60, 120, 180, 240, 300].map(angle => <Circle key={angle} cx="12" cy="6.5" r="3" transform={`rotate(${angle} 12 12)`} {...stroke} />)}<Circle cx="12" cy="12" r="2" {...stroke} /></>
      : item.id === 'settings' ? <><Path d="m10 3-.5 2-2 .9-1.9-.6-2 3.4 1.5 1.5v2.3L3.6 14l2 3.4 2-.6 1.9 1 .5 2.2h4l.5-2.2 1.9-1 2 .6 2-3.4-1.5-1.5v-2.3L20.4 8l-2-3.4-1.9.6-2-.9L14 3Z" {...stroke} /><Circle cx="12" cy="11.5" r="3" {...stroke} /></>
      : item.id === 'timeline'
      ? <><Rect x="4" y="5" width="16" height="15" rx="2" {...stroke} /><Line x1="8" y1="3" x2="8" y2="7" {...stroke} /><Line x1="16" y1="3" x2="16" y2="7" {...stroke} /><Line x1="4" y1="9" x2="20" y2="9" {...stroke} /><Circle cx="15.5" cy="15" r="2.5" {...stroke} /><Line x1="15.5" y1="15" x2="15.5" y2="13.5" {...stroke} /><Line x1="15.5" y1="15" x2="17" y2="15.8" {...stroke} /></>
      : <><Line x1="4" y1="20" x2="20" y2="20" {...stroke} /><Line x1="5" y1="20" x2="5" y2="12" {...stroke} /><Line x1="10" y1="20" x2="10" y2="7" {...stroke} /><Line x1="15" y1="20" x2="15" y2="10" {...stroke} /><Line x1="20" y1="20" x2="20" y2="4" {...stroke} /><Path d="M5 9l5-4 5 2 5-4" {...stroke} /></>;
    return <Svg width={ICON_METRICS.size} height={ICON_METRICS.size} viewBox="0 0 24 24" accessible={false}>{content}</Svg>;
  };

  return (
    <View style={[styles.bottomNav, designMode !== 'chic' && styles.bottomNavMinimal, designMode === 'dark' && styles.bottomNavDark, designMode === 'chic' && styles.bottomNavChic, designColors && { backgroundColor: designColors.cardSurface, borderColor: designColors.border, shadowColor: designColors.accent }]}>
      {items.map((item) => {
        const active = item.id === screen;
        return (
          <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: active }} style={[styles.navItem, item.id === 'wish' && { flex: 1.2 }]} onPress={() => onChange(item.id)}>
            <View style={[styles.navIconWrap, active && { backgroundColor: designColors?.accentSoft ?? theme.colors.softAccent }]}>{renderIcon(item, active ? (designColors?.accent ?? theme.colors.primaryAccent) : (designColors?.textSecondary ?? theme.colors.secondaryText))}</View>
            <Text numberOfLines={2} style={[styles.navLabel, active && { fontWeight: '700' }, { color: active ? (designColors?.accent ?? theme.colors.primaryAccent) : (designColors?.textSecondary ?? theme.colors.secondaryText) }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Relative to the same Safe Area parent as the navigation itself. */
export function getBottomNavTopOffset(designMode: ThemeMode) {
  const layout = designMode === 'chic' ? styles.bottomNav : styles.bottomNavMinimal;
  return layout.bottom + layout.height;
}

const styles = StyleSheet.create({
  bottomNav: { position: 'absolute', left: 18, right: 18, bottom: 14, height: 74, backgroundColor: '#FFFFFF', borderRadius: 22, flexDirection: 'row', alignItems: 'center', shadowColor: '#372F4A', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3, overflow: 'visible' },
  bottomNavMinimal: { left: 12, right: 12, bottom: 12, borderRadius: 18, height: 70, borderWidth: StyleSheet.hairlineWidth, borderColor: '#DCE2EC', shadowColor: '#1B2B4A', shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  bottomNavChic: { backgroundColor: '#FFF7FA', borderWidth: StyleSheet.hairlineWidth, borderColor: '#FFFFFF', shadowColor: '#D96C9B', shadowOpacity: 0.06 },
  bottomNavDark: { backgroundColor: '#181F2E', borderColor: getThemeTokens('dark').colors.border, shadowColor: '#000000', shadowOpacity: 0.12 },
  navItem: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center', alignItems: 'center', gap: 2, paddingHorizontal: 1 },
  navIconWrap: { width: 32, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navLabel: { color: '#A39DAA', fontSize: 12, lineHeight: 16, fontWeight: '500', textAlign: 'center' },
});
