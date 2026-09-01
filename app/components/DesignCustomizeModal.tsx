import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';

type Props = {
  visible: boolean;
  designMode: DesignMode;
  chicPalette?: ChicThemePalette;
  purchased: boolean;
  isDevelopment?: boolean;
  onPurchase: () => void;
  onRestore: () => void;
  onPremium: () => void;
  onClose: () => void;
  localizedPrice?: string;
  purchaseError?: string;
};

export function DesignCustomizeModal({ visible, designMode, chicPalette, purchased, isDevelopment = false, onPurchase, onRestore, onPremium, onClose, localizedPrice, purchaseError }: Props) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const colors = designMode === 'chic' && chicPalette
    ? { background: chicPalette.cardSurface, surface: chicPalette.surfaceSubtle, text: chicPalette.textPrimary, muted: chicPalette.textSecondary, border: chicPalette.border, accent: chicPalette.accent, onAccent: chicPalette.onAccent }
    : { background: theme.colors.screenBackground, surface: theme.colors.surface, text: theme.colors.primaryText, muted: theme.colors.secondaryText, border: theme.colors.border, accent: theme.colors.primaryAccent, onAccent: designMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF' };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={(event) => event.stopPropagation()}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.title, { color: colors.text }]}>好きなデザインで、{ '\n' }Rhythmをもっと自分らしく。</Text>
            <Text style={[styles.description, { color: colors.muted }]}>一度購入すると、</Text>
            <View style={[styles.featureList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {['花柄・チェック・ドット', '写真背景', '画面ごとのトップ画像', '集中タイマー背景'].map((label) => <Text key={label} style={[styles.feature, { color: colors.text }]}>• {label}</Text>)}
            </View>
            <Text style={[styles.description, { color: colors.muted }]}>を買い切りで利用できます。Premiumなら対象デザインも利用できます。</Text>
            <Text style={[styles.price, { color: colors.accent }]}>{localizedPrice ? `${localizedPrice} 買い切り` : '買い切り（価格はApp Storeで表示）'}</Text>
            {purchaseError ? <Text style={[styles.note, { color: colors.muted }]}>{purchaseError}</Text> : null}
            {purchased ? <View style={[styles.purchased, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[styles.purchasedText, { color: colors.accent }]}>購入済み</Text></View> : <>
              <Pressable accessibilityRole="button" onPress={onPurchase} style={[styles.primaryButton, { backgroundColor: colors.accent }]}><Text style={[styles.primaryText, { color: colors.onAccent }]}>{localizedPrice ? `${localizedPrice}で買い切る` : '価格を確認して購入'}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={onRestore} style={[styles.secondaryButton, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.accent }]}>購入を復元</Text></Pressable>
            </>}
            <Pressable accessibilityRole="button" onPress={onPremium} style={styles.linkButton}><Text style={[styles.linkText, { color: colors.accent }]}>Premiumを見る</Text></Pressable>
            <Text style={[styles.note, { color: colors.muted }]}>広告やTrialで無料で使うこともできます。</Text>
            {isDevelopment && !purchased ? <Text style={[styles.devNote, { color: colors.muted }]}>開発環境では購入ボタンから動作確認できます。</Text> : null}
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}><Text style={[styles.closeText, { color: colors.muted }]}>閉じる</Text></Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,24,32,0.34)', paddingTop: 36 },
  sheet: { maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, overflow: 'hidden' },
  content: { padding: 20, paddingBottom: 30 },
  handle: { width: 44, height: 4, borderRadius: 4, alignSelf: 'center', marginBottom: 18, opacity: 0.7 },
  title: { fontSize: 22, lineHeight: 31, fontWeight: '900' },
  description: { marginTop: 12, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  featureList: { marginTop: 10, padding: 13, borderRadius: 14, borderWidth: 1, gap: 7 },
  feature: { fontSize: 13, lineHeight: 19, fontWeight: '800' },
  price: { marginTop: 18, fontSize: 18, fontWeight: '900' },
  primaryButton: { minHeight: 50, marginTop: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 14, fontWeight: '900' },
  secondaryButton: { minHeight: 48, marginTop: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '900' },
  linkButton: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  linkText: { fontSize: 13, fontWeight: '900' },
  note: { textAlign: 'center', fontSize: 11, lineHeight: 17, fontWeight: '600' },
  devNote: { textAlign: 'center', marginTop: 8, fontSize: 10, fontWeight: '600' },
  purchased: { minHeight: 50, marginTop: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  purchasedText: { fontSize: 14, fontWeight: '900' },
  closeButton: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  closeText: { fontSize: 13, fontWeight: '800' },
});
