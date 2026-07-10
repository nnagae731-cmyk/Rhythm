import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getThemeTokens } from '../theme';
import { Screen, ThemeMode } from '../types';

export function BottomNav({ screen, designMode, onChange }: { screen: Screen; designMode: ThemeMode; onChange: (screen: Screen) => void }) {
  const items: { id: Screen; icon: string; label: string }[] = [
    { id: 'home', icon: '✓', label: '今日' },
    { id: 'timeline', icon: '↗', label: 'タイム' },
    { id: 'analysis', icon: '◫', label: '分析' },
    { id: 'settings', icon: '⚙', label: '設定' },
  ];
  const theme = getThemeTokens(designMode);
  return (
    <View style={[styles.bottomNav, designMode === 'minimal' && styles.bottomNavMinimal, designMode === 'chic' && styles.bottomNavChic]}>
      {items.map((item) => {
        const active = screen === item.id;
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
  bottomNavMinimal: { left: 0, right: 0, bottom: 0, borderRadius: 0, height: 66, borderTopWidth: 1, borderTopColor: '#C8C8C8', shadowOpacity: 0 },
  bottomNavChic: { backgroundColor: '#FFF7FA', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#D96C9B', shadowOpacity: 0.16 },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { color: '#A39DAA', fontSize: 20, fontWeight: '900' },
  navLabel: { color: '#A39DAA', fontSize: 10, fontWeight: '800' },
  navActive: { color: '#282538' },
  navLabelActive: { color: '#282538' },
});
