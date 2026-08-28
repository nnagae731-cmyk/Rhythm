import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { ChicThemePalette, getThemeTokens } from '../theme';
import { Screen, ThemeMode } from '../types';

export function BottomNav({ screen, designMode, chicPalette, onChange, onVoice }: { screen: Screen; designMode: ThemeMode; chicPalette?: ChicThemePalette; onChange: (screen: Screen) => void; onVoice?: () => void }) {
  const theme = getThemeTokens(designMode);
  const designColors = designMode === 'chic' ? chicPalette : undefined;
  const items: { id: Screen; icon: string; label: string }[] = [
    { id: 'home', icon: '✓', label: 'ToDo' },
    { id: 'timeline', icon: '↗', label: '予定' },
    { id: 'analysis', icon: '▦', label: '分析' },
    { id: 'wish', icon: '✿', label: '叶えたいこと' },
    { id: 'settings', icon: '⚙', label: '設定' },
  ];

  const renderIcon = (item: { id: Screen; icon: string }, color: string) => {
    if (item.id !== 'timeline' && item.id !== 'analysis') {
      return <Text style={[styles.navIcon, { color }]}>{item.icon}</Text>;
    }
    const stroke = { stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
    const content = item.id === 'timeline'
      ? <><Rect x="4" y="5" width="16" height="15" rx="2" {...stroke} /><Line x1="8" y1="3" x2="8" y2="7" {...stroke} /><Line x1="16" y1="3" x2="16" y2="7" {...stroke} /><Line x1="4" y1="9" x2="20" y2="9" {...stroke} /><Circle cx="15.5" cy="15" r="2.5" {...stroke} /><Line x1="15.5" y1="15" x2="15.5" y2="13.5" {...stroke} /><Line x1="15.5" y1="15" x2="17" y2="15.8" {...stroke} /></>
      : <><Line x1="4" y1="20" x2="20" y2="20" {...stroke} /><Line x1="5" y1="20" x2="5" y2="12" {...stroke} /><Line x1="10" y1="20" x2="10" y2="7" {...stroke} /><Line x1="15" y1="20" x2="15" y2="10" {...stroke} /><Line x1="20" y1="20" x2="20" y2="4" {...stroke} /><Path d="M5 9l5-4 5 2 5-4" {...stroke} /></>;
    return <Svg width={22} height={22} viewBox="0 0 24 24" accessibilityRole="image">{content}</Svg>;
  };

  return (
    <View style={[styles.bottomNav, designMode !== 'chic' && styles.bottomNavMinimal, designMode === 'dark' && styles.bottomNavDark, designMode === 'chic' && styles.bottomNavChic, designColors && { backgroundColor: designColors.cardSurface, borderColor: designColors.border, shadowColor: designColors.accent }]}>
      {items.map((item) => {
        const active = item.id === screen;
        return (
          <Pressable key={item.id} style={styles.navItem} onPress={() => onChange(item.id)}>
            {renderIcon(item, active ? (designColors?.accent ?? theme.colors.primaryAccent) : (designColors?.textSecondary ?? theme.colors.secondaryText))}
            <Text style={[styles.navLabel, { color: active ? (designColors?.accent ?? theme.colors.primaryAccent) : (designColors?.textSecondary ?? theme.colors.secondaryText) }]}>{item.label}</Text>
          </Pressable>
        );
      })}
      {onVoice ? <Pressable accessibilityRole="button" accessibilityLabel="共通音声入力" onPress={onVoice} style={[styles.voiceButton, { backgroundColor: designColors?.cardSurface ?? theme.colors.surface, borderColor: designColors?.border ?? theme.colors.border }]}><Svg width={24} height={24} viewBox="0 0 24 24"><Rect x="9" y="3" width="6" height="11" rx="3" stroke={designColors?.accent ?? theme.colors.primaryAccent} strokeWidth="1.8" fill="none" /><Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" stroke={designColors?.accent ?? theme.colors.primaryAccent} strokeWidth="1.8" strokeLinecap="round" fill="none" /></Svg></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: { position: 'absolute', left: 18, right: 18, bottom: 14, height: 74, backgroundColor: '#FFFFFF', borderRadius: 25, flexDirection: 'row', alignItems: 'center', shadowColor: '#372F4A', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8, overflow: 'visible' },
  bottomNavMinimal: { left: 12, right: 12, bottom: 12, borderRadius: 18, height: 70, borderWidth: 1, borderColor: '#DCE2EC', shadowColor: '#1B2B4A', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  bottomNavChic: { backgroundColor: '#FFF7FA', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#D96C9B', shadowOpacity: 0.16 },
  bottomNavDark: { backgroundColor: '#181F2E', borderColor: '#303B50', shadowColor: '#000000', shadowOpacity: 0.3 },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { color: '#A39DAA', fontSize: 20, fontWeight: '900' },
  navLabel: { color: '#A39DAA', fontSize: 10, fontWeight: '800' },
  voiceButton: { position: 'absolute', left: '50%', top: -19, marginLeft: -25, width: 50, height: 50, borderRadius: 25, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
});
