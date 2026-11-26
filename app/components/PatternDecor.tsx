import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { styles } from '../styles/appStyles';
import { ChicCheckColor, ChicPattern, getChicCheckColor, getDesignCheckThemeTokens, getDesignPatternThemeTokens } from '../theme';
import { designFloralAssets, FloralPatternId } from '../features/design/designAssets';

export function isCheckChicPattern(pattern: ChicPattern): boolean {
  return pattern === 'checkLavenderSatin' || pattern === 'checkBeigeNoir' || pattern === 'checkMauveFrame';
}

export function isFloralPattern(pattern: ChicPattern | 'flower' | 'stripe'): pattern is FloralPatternId {
  return pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark';
}

export const HEART_DECORATIONS = [
  // Keep the upper third visibly heart-led while leaving the title, buttons,
  // and tab labels readable. Positions are fixed so a rerender never changes
  // the pattern's rhythm.
  { left: '4%', top: '5%', size: 16, glyph: '♥', opacity: 0.34, rotate: '-12deg' },
  { left: '17%', top: '2%', size: 10, glyph: '♡', opacity: 0.28, rotate: '9deg' },
  { left: '8%', top: '12%', size: 18, glyph: '♥', opacity: 0.27, rotate: '6deg' },
  { left: '31%', top: '7%', size: 23, glyph: '♥', opacity: 0.3, rotate: '-8deg' },
  { left: '38%', top: '2%', size: 15, glyph: '♥', opacity: 0.25, rotate: '-10deg' },
  { left: '47%', top: '3%', size: 11, glyph: '♡', opacity: 0.26, rotate: '12deg' },
  { left: '61%', top: '9%', size: 15, glyph: '♥', opacity: 0.31, rotate: '-10deg' },
  { left: '68%', top: '13%', size: 11, glyph: '♡', opacity: 0.24, rotate: '8deg' },
  { left: '76%', top: '3%', size: 10, glyph: '♡', opacity: 0.3, rotate: '8deg' },
  { left: '91%', top: '8%', size: 22, glyph: '♥', opacity: 0.32, rotate: '11deg' },
  { left: '97%', top: '16%', size: 16, glyph: '♥', opacity: 0.26, rotate: '-7deg' },
  { left: '10%', top: '17%', size: 12, glyph: '♡', opacity: 0.27, rotate: '-7deg' },
  { left: '23%', top: '20%', size: 17, glyph: '♥', opacity: 0.32, rotate: '8deg' },
  { left: '40%', top: '15%', size: 10, glyph: '♥', opacity: 0.24, rotate: '-12deg' },
  { left: '55%', top: '22%', size: 26, glyph: '♡', opacity: 0.29, rotate: '7deg' },
  { left: '70%', top: '16%', size: 13, glyph: '♥', opacity: 0.3, rotate: '-8deg' },
  { left: '84%', top: '22%', size: 17, glyph: '♡', opacity: 0.28, rotate: '10deg' },
  { left: '96%', top: '28%', size: 11, glyph: '♥', opacity: 0.25, rotate: '-10deg' },
  { left: '14%', top: '26%', size: 22, glyph: '♡', opacity: 0.23, rotate: '8deg' },
  { left: '32%', top: '29%', size: 12, glyph: '♥', opacity: 0.22, rotate: '-8deg' },
  { left: '5%', top: '31%', size: 20, glyph: '♥', opacity: 0.3, rotate: '8deg' },
  { left: '18%', top: '37%', size: 10, glyph: '♡', opacity: 0.23, rotate: '-12deg' },
  { left: '38%', top: '33%', size: 14, glyph: '♥', opacity: 0.27, rotate: '6deg' },
  { left: '58%', top: '31%', size: 18, glyph: '♥', opacity: 0.25, rotate: '-6deg' },
  { left: '67%', top: '35%', size: 12, glyph: '♡', opacity: 0.24, rotate: '-8deg' },
  { left: '88%', top: '39%', size: 21, glyph: '♥', opacity: 0.29, rotate: '10deg' },
  { left: '2%', top: '51%', size: 13, glyph: '♡', opacity: 0.25, rotate: '-9deg' },
  { left: '27%', top: '54%', size: 16, glyph: '♥', opacity: 0.26, rotate: '9deg' },
  { left: '52%', top: '49%', size: 10, glyph: '♡', opacity: 0.23, rotate: '-7deg' },
  { left: '76%', top: '56%', size: 18, glyph: '♥', opacity: 0.28, rotate: '-11deg' },
  { left: '94%', top: '61%', size: 12, glyph: '♡', opacity: 0.25, rotate: '8deg' },
  { left: '14%', top: '61%', size: 15, glyph: '♥', opacity: 0.24, rotate: '-8deg' },
  { left: '43%', top: '63%', size: 23, glyph: '♡', opacity: 0.24, rotate: '7deg' },
  { left: '9%', top: '69%', size: 22, glyph: '♥', opacity: 0.3, rotate: '-8deg' },
  { left: '34%', top: '72%', size: 11, glyph: '♡', opacity: 0.23, rotate: '10deg' },
  { left: '59%', top: '68%', size: 15, glyph: '♥', opacity: 0.27, rotate: '-6deg' },
  { left: '83%', top: '73%', size: 24, glyph: '♡', opacity: 0.28, rotate: '8deg' },
  { left: '18%', top: '87%', size: 17, glyph: '♥', opacity: 0.3, rotate: '-8deg' },
  { left: '47%', top: '91%', size: 12, glyph: '♡', opacity: 0.25, rotate: '7deg' },
  { left: '72%', top: '88%', size: 20, glyph: '♥', opacity: 0.28, rotate: '-10deg' },
  { left: '31%', top: '95%', size: 16, glyph: '♥', opacity: 0.25, rotate: '8deg' },
  { left: '69%', top: '79%', size: 11, glyph: '♥', opacity: 0.23, rotate: '-6deg' },
  { left: '94%', top: '94%', size: 10, glyph: '♡', opacity: 0.24, rotate: '9deg' },
] as const;

export const HEART_CONFETTI = [
  { left: '17%', top: '16%', rotate: '28deg' }, { left: '63%', top: '5%', rotate: '-24deg' },
  { left: '36%', top: '37%', rotate: '-18deg' }, { left: '88%', top: '24%', rotate: '22deg' },
  { left: '9%', top: '73%', rotate: '-26deg' }, { left: '55%', top: '73%', rotate: '18deg' },
];

export const FloralPatternDecor = React.memo(function FloralPatternDecor({ pattern, accent, warm, compact, previewTopCrop, preview = false, fallbackBackground }: { pattern: FloralPatternId; accent: string; warm: string; compact: boolean; previewTopCrop: boolean; preview?: boolean; fallbackBackground?: string }) {
  const asset = designFloralAssets[pattern];
  const [failedSources, setFailedSources] = useState<unknown[]>([]);
  // Native image loading is not a timed operation. Keep cached/slow images
  // visible, and fall back to the full bundled asset only on a real error.
  const candidates = preview ? [asset.thumbnailSource ?? asset.source, asset.source] : [asset.source];
  const imageSource = candidates.find(source => !failedSources.includes(source));
  const fallbackColor = fallbackBackground ?? warm;
  return <View pointerEvents="none" style={[styles.patternLayer, { width: '100%', height: '100%', backgroundColor: fallbackColor }]}>
    {imageSource !== undefined ? <Image
      key={String(imageSource)}
      testID={`floral-image-${pattern}`}
      source={imageSource}
      resizeMode="cover"
      fadeDuration={0}
      onError={() => setFailedSources(current => current.includes(imageSource) ? current : [...current, imageSource])}
      accessibilityLabel={asset.label}
      style={[styles.patternImageLayer, compact && styles.patternImageLayerCompact, !preview && previewTopCrop && styles.patternImageLayerPreviewTop]}
    /> : <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text accessibilityLabel="花柄の画像を読み込めません" style={{ color: accent, fontSize: compact ? 14 : 20 }}>✿</Text>
    </View>}
  </View>;
});

export function ChicPatternDecor({ pattern, accent, warm, density = 'regular', checkColor, preview = false, previewTopCrop = false }: { pattern: ChicPattern | 'flower' | 'stripe'; accent: string; warm: string; density?: 'regular' | 'compact'; checkColor?: ChicCheckColor; preview?: boolean; previewTopCrop?: boolean }) {
  const compact = density === 'compact';
  if (pattern === 'plain') return null;
  if (isFloralPattern(pattern)) {
    const fallbackBackground = getDesignPatternThemeTokens(pattern, checkColor ?? 'cool').background;
    return <FloralPatternDecor key={pattern} pattern={pattern} accent={accent} warm={warm} compact={compact} preview={preview} fallbackBackground={fallbackBackground} previewTopCrop={previewTopCrop} />;
  }
  if (pattern === 'checkLavenderSatin' || pattern === 'checkBeigeNoir' || pattern === 'checkMauveFrame') {
    const selectedCheckColor = checkColor ? getChicCheckColor(checkColor) : undefined;
    const fallbackCheck = getDesignCheckThemeTokens('cool');
    const backgroundColor = selectedCheckColor?.patternBase ?? fallbackCheck.patternBase;
    const cell = pattern === 'checkLavenderSatin' ? (compact ? 30 : 32) : pattern === 'checkBeigeNoir' ? (compact ? 12 : 14) : (compact ? 20 : 22);
    const verticalColor = `${(selectedCheckColor ?? fallbackCheck).patternStripe}30`;
    const horizontalColor = `${(selectedCheckColor ?? fallbackCheck).patternStripe}28`;
    const columns = Math.min(28, Math.ceil((compact ? 260 : 520) / cell) + 2);
    const rows = Math.min(48, Math.ceil((compact ? 420 : 1400) / cell) + 2);
    const overlapColor = `${(selectedCheckColor ?? fallbackCheck).patternStripe}42`;
    const bandSize = cell * 0.36;
    const bandOffset = (cell - bandSize) / 2;
    return <View pointerEvents="none" style={[styles.patternLayer, { backgroundColor }]}>
      {Array.from({ length: columns }, (_, index) => <View key={`v-${index}`} style={[styles.checkVerticalBand, { left: index * cell + bandOffset, width: bandSize, backgroundColor: verticalColor }]} />)}
      {Array.from({ length: rows }, (_, index) => <View key={`h-${index}`} style={[styles.checkHorizontalBand, { top: index * cell + bandOffset, height: bandSize, backgroundColor: horizontalColor }]} />)}
      {Array.from({ length: columns * rows }, (_, index) => { const column = index % columns; const row = Math.floor(index / columns); return <View key={`cross-${index}`} style={[styles.checkIntersection, { left: column * cell + bandOffset, top: row * cell + bandOffset, width: bandSize, height: bandSize, backgroundColor: overlapColor }]} />; })}
    </View>;
  }
  if (pattern === 'dot') return <View pointerEvents="none" style={styles.patternLayer}>
    {Array.from({ length: compact ? 160 : 144 }, (_, index) => { const columns = compact ? 22 : 18; const spacingX = compact ? 20 : 25; const spacingY = compact ? 18 : 22; const row = Math.floor(index / columns); const column = index % columns; const size = index % 3 === 0 ? (compact ? 5 : 6) : index % 2 === 0 ? 4 : 3; return <View key={index} style={[styles.patternDotSmall, { width: size, height: size, borderRadius: size / 2, backgroundColor: index % 2 ? warm : accent, left: 4 + column * spacingX + (row % 2 ? spacingX / 2 : 0), top: 5 + row * spacingY }]} />; })}
  </View>;
  if (pattern === 'heart') return <View pointerEvents="none" style={[styles.patternLayer, { backgroundColor: 'transparent' }]}>
    {HEART_DECORATIONS.map((item, index) => <Text key={`heart-${index}`} style={{ position: 'absolute', left: item.left as any, top: item.top as any, fontSize: compact ? Math.max(8, item.size - 3) : item.size, lineHeight: compact ? item.size : item.size + 3, color: accent, opacity: item.opacity, transform: [{ rotate: item.rotate }] }}>{item.glyph}</Text>)}
    {HEART_CONFETTI.map((item, index) => <View key={`heart-confetti-${index}`} style={{ position: 'absolute', left: item.left as any, top: item.top as any, width: compact ? 4 : 6, height: compact ? 9 : 13, borderRadius: 1, backgroundColor: warm, opacity: 0.45, transform: [{ rotate: item.rotate }] }} />)}
    {['18%', '48%', '79%'].map((left, index) => <View key={`heart-dot-${index}`} style={{ position: 'absolute', left: left as any, top: `${20 + index * 23}%` as any, width: compact ? 3 : 4, height: compact ? 3 : 4, borderRadius: 3, backgroundColor: accent, opacity: 0.3 }} />)}
  </View>;
  return null;
}
