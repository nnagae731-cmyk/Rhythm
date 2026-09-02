import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  priceStatus?: 'loading' | 'ready' | 'unavailable';
  purchaseError?: string;
};

export function DesignCustomizeModal({ visible, designMode, chicPalette, purchased, isDevelopment = false, onPurchase, onRestore, onPremium, onClose, localizedPrice, priceStatus = localizedPrice ? 'ready' : 'unavailable', purchaseError }: Props) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const colors = designMode === 'chic' && chicPalette
    ? { background: chicPalette.cardSurface, surface: chicPalette.surfaceSubtle, text: chicPalette.textPrimary, muted: chicPalette.textSecondary, border: chicPalette.border, accent: chicPalette.accent, accentSoft: chicPalette.accentSoft, onAccent: chicPalette.onAccent }
    : { background: theme.colors.screenBackground, surface: theme.colors.surface, text: theme.colors.primaryText, muted: theme.colors.secondaryText, border: theme.colors.border, accent: theme.colors.primaryAccent, accentSoft: theme.colors.softAccent, onAccent: designMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF' };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={(event) => event.stopPropagation()}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.eyebrow, { color: colors.accent }]}>DESIGN CUSTOMIZE</Text>
            <Text style={[styles.title, { color: colors.text }]}>RhythmPaceを、{ '\n' }もっと自分らしく。</Text>
            <Text style={[styles.description, { color: colors.muted }]}>一度購入すると、毎日の画面とウィジェットを自分のスタイルに整えられます。</Text>
            <View style={styles.designPreviewRow} accessibilityLabel="既存デザインと写真の例">
              <Image source={require('../assets/themes/floral/vintage-bloom-preview.jpg')} style={styles.designPreviewImage} />
              <Image source={require('../assets/themes/floral/botanical-line.jpg')} style={styles.designPreviewImage} />
              <Image source={require('../assets/themes/floral/sheer-floral-preview.jpg')} style={styles.designPreviewImage} />
              <View style={[styles.designPreviewPhoto, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}><Text style={{ color: colors.accent, fontSize: 18 }}>▧</Text></View>
            </View>
            <View style={[styles.featureList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[
                '全デザインを解放（花柄・チェック・ドットなど）',
                'ウィジェットが8種類に',
                'ウィジェットごとに写真を設定',
                '写真レイアウト5種類（全面背景・右側・上部・カード・丸型）',
              ].map((label) => <Text key={label} style={[styles.feature, { color: colors.text }]}>• {label}</Text>)}
            </View>
            <Text style={[styles.description, { color: colors.muted }]}>トップ画像・集中画面背景などのカスタマイズも利用できます。</Text>
            <Text style={[styles.price, { color: colors.accent }]}>{priceStatus === 'loading' ? '価格を取得中…' : localizedPrice ? `買い切り ${localizedPrice}` : '価格は購入画面で確認'}</Text>
            {purchaseError ? <Text style={[styles.note, { color: colors.muted }]}>App Storeの商品情報を取得できませんでした。時間をおいてもう一度お試しください。</Text> : null}
            {purchased ? <View style={[styles.purchased, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[styles.purchasedText, { color: colors.accent }]}>購入済み</Text></View> : <>
              <Pressable accessibilityRole="button" onPress={onPurchase} style={[styles.primaryButton, { backgroundColor: colors.accent }]}><Text style={[styles.primaryText, { color: colors.onAccent }]}>{priceStatus === 'loading' ? '価格を取得中…' : localizedPrice ? `${localizedPrice}で買い切る` : '価格を確認して購入'}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={onRestore} style={[styles.secondaryButton, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.accent }]}>購入を復元</Text></Pressable>
            </>}
            <Text style={[styles.premiumNote, { color: colors.accent }]}>PremiumにはDesign Customizeの全機能が含まれます</Text>
            <Pressable accessibilityRole="button" onPress={onPremium} style={styles.linkButton}><Text style={[styles.linkText, { color: colors.accent }]}>Premiumを見る</Text></Pressable>
            <Text style={[styles.note, { color: colors.muted }]}>広告やトライアルで無料で試すこともできます。</Text>
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
  eyebrow: { fontSize: 11, letterSpacing: 1.1, fontWeight: '900', marginBottom: 7 },
  designPreviewRow: { flexDirection: 'row', gap: 7, marginTop: 12 },
  designPreviewImage: { flex: 1, height: 58, borderRadius: 10 },
  designPreviewPhoto: { flex: 1, height: 58, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, lineHeight: 31, fontWeight: '900' },
  description: { marginTop: 12, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  featureList: { marginTop: 10, padding: 13, borderRadius: 14, borderWidth: 1, gap: 7 },
  feature: { fontSize: 13, lineHeight: 19, fontWeight: '800' },
  price: { marginTop: 18, fontSize: 18, fontWeight: '900' },
  primaryButton: { minHeight: 50, marginTop: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 14, fontWeight: '900' },
  secondaryButton: { minHeight: 48, marginTop: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '900' },
  premiumNote: { textAlign: 'center', marginTop: 10, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  linkButton: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  linkText: { fontSize: 13, fontWeight: '900' },
  note: { textAlign: 'center', fontSize: 11, lineHeight: 17, fontWeight: '600' },
  devNote: { textAlign: 'center', marginTop: 8, fontSize: 10, fontWeight: '600' },
  purchased: { minHeight: 50, marginTop: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  purchasedText: { fontSize: 14, fontWeight: '900' },
  closeButton: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  closeText: { fontSize: 13, fontWeight: '800' },
});
