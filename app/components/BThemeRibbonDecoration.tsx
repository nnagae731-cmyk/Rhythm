import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

// Bテーマ（くすみラベンダーチェック）専用の完成済み素材。
// 装飾レイヤーは操作を受け取らず、カードの中でのみ描画する。
const bow = require('../assets/themes/b/B_01_lavender_bow.png');
const diagonal = require('../assets/themes/b/B_02_diagonal_ribbon.png');

export function BThemeRibbonPreload() {
  return <View pointerEvents="none" style={styles.preload}><Image source={bow} fadeDuration={0} resizeMode="contain" style={styles.preloadBow} /><Image source={diagonal} fadeDuration={0} resizeMode="contain" style={styles.preloadDiagonal} /></View>;
}

export function BThemeRibbonDecoration({ compact = false, journal = false, today = false }: { compact?: boolean; journal?: boolean; today?: boolean }) {
  return (
    <View pointerEvents="none" style={styles.layer}>
      <Image
        source={bow}
        fadeDuration={0}
        resizeMode="contain"
        style={[styles.bow, compact && styles.bowCompact, journal && styles.bowJournal, today && styles.bowToday]}
      />
      <Image
        source={diagonal}
        fadeDuration={0}
        resizeMode="contain"
        style={[styles.diagonal, compact && styles.diagonalCompact, journal && styles.diagonalJournal]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 実寸で一度だけデコードし、画面遷移時の後出し表示を防ぐ。
  preload: { position: 'absolute', left: -400, top: -400, width: 120, height: 100, opacity: 0.01, overflow: 'hidden' },
  preloadBow: { width: 120, height: 100 },
  preloadDiagonal: { position: 'absolute', left: 0, top: 0, width: 100, height: 70 },
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 4 },
  bow: { position: 'absolute', right: -2, top: -8, width: 112, height: 86 },
  bowCompact: { right: 0, top: -5, width: 84, height: 64 },
  bowJournal: { right: 0, top: -4, width: 92, height: 70 },
  bowToday: { right: 0, top: -3, width: 68, height: 52 },
  diagonal: { position: 'absolute', left: -20, bottom: -22, width: 92, height: 54, transform: [{ rotate: '0deg' }] },
  diagonalCompact: { left: -14, bottom: -16, width: 70, height: 42 },
  diagonalJournal: { left: -14, bottom: -16, width: 76, height: 44 },
});
