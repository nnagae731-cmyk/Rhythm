import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getThemeTokens } from '../theme';
import { Screen, ThemeMode } from '../types';

export function BottomNav({ screen, designMode, onChange }: { screen: Screen; designMode: ThemeMode; onChange: (screen: Screen) => void }) {
  const theme = getThemeTokens(designMode);
  const items: { id: Screen; icon: string; label: string }[] = [
    { id: 'home', icon: '✓', label: '今日' },
    { id: 'timeline', icon: '↗', label: '予定' },
    { id: 'analysis', icon: '▦', label: '分析' },
    { id: 'wish', icon: '✿', label: '叶えたいこと' },
    { id: 'settings', icon: '⚙', label: '設定' },
  ];

  return (
    <View style={[styles.bottomNav, designMode !== 'chic' && styles.bottomNavMinimal, designMode === 'dark' && styles.bottomNavDark, designMode === 'chic' && styles.bottomNavChic]}>
      {items.map((item) => {
        const active = item.id === screen;
        return (
          <Pressable key={item.id} style={styles.navItem} onPress={() => onChange(item.id)}>
            <Text style={[styles.navIcon, { color: active ? theme.colors.primaryAccent : theme.colors.secondaryText }]}>{item.icon}</Text>
            <Text style={[styles.navLabel, { color: active ? theme.colors.primaryAccent : theme.colors.secondaryText }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: { position: 'absolute', left: 18, right: 18, bottom: 14, height: 74, backgroundColor: '#FFFFFF', borderRadius: 25, flexDirection: 'row', alignItems: 'center', shadowColor: '#372F4A', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  bottomNavMinimal: { left: 12, right: 12, bottom: 12, borderRadius: 18, height: 70, borderWidth: 1, borderColor: '#DCE2EC', shadowColor: '#1B2B4A', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  bottomNavChic: { backgroundColor: '#FFF7FA', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#D96C9B', shadowOpacity: 0.16 },
  bottomNavDark: { backgroundColor: '#181F2E', borderColor: '#303B50', shadowColor: '#000000', shadowOpacity: 0.3 },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { color: '#A39DAA', fontSize: 20, fontWeight: '900' },
  navLabel: { color: '#A39DAA', fontSize: 10, fontWeight: '800' },
});
