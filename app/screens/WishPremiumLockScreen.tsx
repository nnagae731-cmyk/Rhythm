import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';

type Props = {
  designMode: DesignMode;
  chicPalette?: ChicThemePalette;
  onOpenPremium: () => void;
  styles: any;
};

// Free users keep an independent Wish tab and deliberately choose whether to
// open the full Premium guide. This avoids a guide modal covering the route.
export function WishPremiumLockScreen({ designMode, chicPalette, onOpenPremium, styles }: Props) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isMono = designMode !== 'chic';
  const isDark = designMode === 'dark';
  const designSurface = designMode === 'chic' && chicPalette ? { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border } : undefined;

  return (
    <View style={[styles.premiumFeatureBlock, isMono && styles.premiumFeatureMinimal, isDark && styles.premiumFeatureDark, designMode === 'chic' && styles.premiumFeatureChic, designSurface]}>
      <View style={styles.premiumFeatureInner}>
        <View style={styles.premiumFeatureTop}>
          <Text style={[styles.premiumFeatureNumber, designMode === 'minimal' && styles.premiumFeatureNumberMinimal, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>WISH</Text>
          <Text style={styles.premiumFeatureLabel}>Premium機能</Text>
        </View>
        <View style={styles.premiumPreview}>
          <Text style={styles.previewImageLabel}>表示イメージ</Text>
          <View style={styles.previewTemplateSource}>
            <Text style={styles.previewCompareTag}>今月のテーマ</Text>
            <Text style={styles.previewTemplateTitle}>自分のペースを整える</Text>
          </View>
          <Text style={styles.previewArrow}>↓</Text>
          <View style={styles.previewTemplateSaved}>
            <View>
              <Text style={styles.previewCompareTag}>叶えたいこと</Text>
              <Text style={styles.previewTemplateTitle}>週に1冊、本を読む</Text>
            </View>
            <Text style={styles.previewTemplateChoose}>✓</Text>
          </View>
          <Text style={styles.previewTemplateReady}>今日につながる行動　10分読む</Text>
        </View>
        <View style={[styles.premiumFeatureTextPlate, isMono && styles.premiumFeatureTextMinimal, isDark && styles.premiumFeatureTextDark, designMode === 'chic' && styles.premiumFeatureTextChic]}>
          <Text style={[styles.premiumFeatureTitle, isMono && styles.premiumFeatureTitleMinimal, isDark && styles.premiumFeatureTitleDark]}>今月の叶えたいこと</Text>
          <Text style={[styles.premiumFeatureDescription, isMono && styles.premiumFeatureDescriptionMinimal, isDark && styles.premiumFeatureDescriptionDark]}>今月のテーマ、叶えたいこと、今日につながる行動をまとめて整理できます。</Text>
        </View>
        <Pressable style={[styles.premiumCloseButton, { borderColor: theme.colors.primaryAccent }]} onPress={onOpenPremium}>
          <Text style={[styles.premiumCloseButtonText, { color: theme.colors.primaryAccent }]}>Premiumの内容を見る</Text>
        </Pressable>
      </View>
    </View>
  );
}
