import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

// Cテーマ（ベージュ×ブラックチェック）専用素材。
// 既存のBテーマ素材・配置には触れず、C選択時だけ表示する。
const bow = require('../assets/themes/c/materials/C_01_black_corner_bow.png');
const diagonal = require('../assets/themes/c/materials/C_02_black_diagonal_band.png');

export function CThemeRibbonPreload() {
  return <View pointerEvents="none" style={styles.preload}>
    <Image source={bow} fadeDuration={0} resizeMode="contain" style={styles.preloadBow} />
    <Image source={diagonal} fadeDuration={0} resizeMode="contain" style={styles.preloadDiagonal} />
  </View>;
}

export function CThemeRibbonDecoration({ compact = false, journal = false, today = false }: { compact?: boolean; journal?: boolean; today?: boolean }) {
  return <View pointerEvents="none" style={styles.layer}>
    <Image source={bow} fadeDuration={0} resizeMode="contain" style={[styles.bow, compact && styles.bowCompact, journal && styles.bowJournal, today && styles.bowToday]} />
    {!compact && <Image source={diagonal} fadeDuration={0} resizeMode="contain" style={[styles.diagonal, journal && styles.diagonalJournal]} />}
  </View>;
}

const styles = StyleSheet.create({
  preload: { position: 'absolute', left: -400, top: -400, width: 120, height: 100, opacity: 0.01, overflow: 'hidden' },
  preloadBow: { width: 120, height: 100 },
  preloadDiagonal: { position: 'absolute', left: 0, top: 0, width: 100, height: 70 },
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 4 },
  bow: { position: 'absolute', right: -2, top: -7, width: 112, height: 86 },
  bowCompact: { right: 0, top: -5, width: 82, height: 62 },
  bowJournal: { right: 0, top: -4, width: 92, height: 70 },
  bowToday: { right: 0, top: -3, width: 68, height: 52 },
  diagonal: { position: 'absolute', left: -18, bottom: -19, width: 88, height: 58 },
  diagonalJournal: { left: -14, bottom: -16, width: 74, height: 48 },
});
