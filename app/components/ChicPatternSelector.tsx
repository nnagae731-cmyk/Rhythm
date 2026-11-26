import { ChicPatternDecor, isCheckChicPattern } from './PatternDecor';
import { designBackgroundAssets, designPatternChoices, isImageDesignPattern } from '../features/design/designAssets';
import { getChicPatternVisual, getNightSkyPalette } from '../features/design/designVisuals';
import { PlanTier, hasPremiumAccess } from '../premiumAccess';
import { styles } from '../styles/appStyles';
import { ChicCheckColor, ChicPattern, DesignMode, getChicCheckColor } from '../theme';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export function ChicPatternSelector({ designMode, chicPattern, chicCheckColor, planTier, designCustomizePurchased = false, onPattern, onCheckColor, onPremium, onPreview }: { designMode: DesignMode; chicPattern: ChicPattern; chicCheckColor: ChicCheckColor; planTier: PlanTier; designCustomizePurchased?: boolean; onPattern: (pattern: ChicPattern) => void; onCheckColor: (color: ChicCheckColor) => void; onPremium: () => void; onPreview: (pattern: ChicPattern) => void }) {
  const visiblePatterns = designMode === 'photo' ? designPatternChoices.filter((item) => item.id === 'plain') : designPatternChoices;
  const selectedPalette = chicPattern === 'nightSky' ? getNightSkyPalette(getChicCheckColor(chicCheckColor)) : getChicCheckColor(chicCheckColor);
  return <View style={[styles.patternSelectorNew, designMode === 'dark' && styles.darkSurface, { borderTopColor: selectedPalette.border }]}>
    <Text style={[styles.fieldLabel, designMode === 'dark' && styles.darkAccentText, { color: designMode === 'dark' ? '#B4C0D4' : selectedPalette.textPrimary }]}>背景の柄</Text>
    <View style={styles.patternChoices}>
      {visiblePatterns.map((item) => {
        const locked = !!item.feature && !hasPremiumAccess(planTier, item.feature) && !designCustomizePurchased;
        const isCheck = isCheckChicPattern(item.id);
        const visual = isCheck ? getChicCheckColor(chicCheckColor) : getChicPatternVisual(item.id, getChicCheckColor(chicCheckColor));
        const patternBase = isCheck ? getChicCheckColor(chicCheckColor).patternBase : visual.background;
        const patternStripe = isCheck ? getChicCheckColor(chicCheckColor).patternStripe : visual.warm;
        const choicePalette = selectedPalette;
        const selected = chicPattern === item.id;
        const imageAsset = isImageDesignPattern(item.id) ? designBackgroundAssets[item.id] : undefined;
        return <Pressable key={item.id} style={[styles.patternChoice, { backgroundColor: choicePalette.cardSurface, borderColor: selected ? choicePalette.accent : choicePalette.border }, selected && { borderWidth: 2 }]} onPress={() => { if (locked) { onPreview(item.id); return; } onPattern(item.id); }}>
          <View style={[styles.patternSwatch, styles.patternSwatchLarge, { backgroundColor: imageAsset?.background ?? patternBase, borderColor: choicePalette.border, borderWidth: 1 }]}>{imageAsset ? <Image source={imageAsset.previewSource} resizeMode="contain" style={StyleSheet.absoluteFillObject} /> : <ChicPatternDecor pattern={item.id} accent={visual.accent} warm={patternStripe} density="compact" checkColor={chicCheckColor} preview previewTopCrop={item.id === 'floralSoft'} />}</View>
          <Text numberOfLines={2} ellipsizeMode="clip" style={[styles.patternChoiceText, { color: selected ? choicePalette.accentStrong : choicePalette.textSecondary }]}>{item.label}{locked ? ' 🔒' : ''}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}
