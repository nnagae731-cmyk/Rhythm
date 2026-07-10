import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeMode } from '../types';

export function Header({ designMode, now }: { designMode: ThemeMode; now: Date }) {
  return (
    <View style={[styles.header, designMode === 'minimal' && styles.headerMinimal]}>
      <View>
        <Text style={styles.dateLabel}>{`${now.getMonth() + 1}月${now.getDate()}日 ${['日', '月', '火', '水', '木', '金', '土'][now.getDay()]}曜日 · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`}</Text>
        <Text style={[styles.brand, designMode === 'minimal' && styles.brandMinimal]}>Rhythm</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerMinimal: { marginBottom: 14 },
  dateLabel: { color: '#7B7686', fontSize: 9, fontWeight: '800', marginBottom: 3 },
  brand: { color: '#282538', fontSize: 29, fontWeight: '900', letterSpacing: -1.2 },
  brandMinimal: { color: '#111111' },
});
