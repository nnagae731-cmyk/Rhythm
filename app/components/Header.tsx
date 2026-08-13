import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatLiveDate, formatLiveTime } from '../features/tasks/taskUtils';
import { ThemeMode } from '../types';

export function Header({ designMode, now, compact = false }: { designMode: ThemeMode; now: Date; compact?: boolean }) {
  if (compact) return (
    <View style={styles.photoHeader}>
      <Text style={styles.photoBrand}>Rhythm</Text>
      <Text style={styles.photoDate}>{formatLiveDate(now)} ・ {formatLiveTime(now)}</Text>
    </View>
  );
  return (
    <View style={[styles.header, designMode !== 'chic' && styles.headerMinimal, designMode === 'dark' && styles.headerDark]}>
      <View>
        <Text style={[styles.dateLabel, designMode === 'dark' && styles.dateLabelDark]}>{formatLiveDate(now)} · {formatLiveTime(now)}</Text>
        <Text style={[styles.brand, designMode !== 'chic' && styles.brandMinimal, designMode === 'dark' && styles.brandDark]}>Rhythm</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerMinimal: { marginBottom: 14 },
  dateLabel: { color: '#7B7686', fontSize: 9, fontWeight: '800', marginBottom: 3 },
  dateLabelDark: { color: '#C9D3E5' },
  brand: { color: '#282538', fontSize: 29, fontWeight: '900', letterSpacing: -1.2 },
  brandMinimal: { color: '#111111' },
  headerDark: {},
  brandDark: { color: '#F4F7FC' },
  photoHeader: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  photoBrand: { color: '#5B4352', fontSize: 18, fontWeight: '900', letterSpacing: -0.6 },
  photoDate: { color: '#756875', fontSize: 9, fontWeight: '800', letterSpacing: 0.35 },
});
