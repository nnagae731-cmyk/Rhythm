import React, { useState } from 'react';
import { ActivityIndicator, InteractionManager, Modal, Pressable, Text, View } from 'react-native';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';

type Props = {
  visible: boolean;
  designMode: DesignMode;
  chicPalette?: ChicThemePalette;
  canWatchReward: boolean;
  onReward: () => Promise<boolean>;
  onPremium: () => void;
  onClose: () => void;
};

export function VoiceUsageLimitModal({ visible, designMode, chicPalette, canWatchReward, onReward, onPremium, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [adActive, setAdActive] = useState(false);
  const [error, setError] = useState('');
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const colors = designMode === 'chic' && chicPalette
    ? { surface: chicPalette.cardSurface, border: chicPalette.border, text: chicPalette.textPrimary, muted: chicPalette.textSecondary, accent: chicPalette.accent, onAccent: chicPalette.onAccent }
    : { surface: theme.colors.surface, border: theme.colors.border, text: theme.colors.primaryText, muted: theme.colors.secondaryText, accent: theme.colors.primaryAccent, onAccent: designMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF' };
  const handleReward = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setAdActive(true);
    try {
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => setTimeout(resolve, 250));
      });
      if (!await onReward()) setError('広告を完了できませんでした。もう一度お試しください。');
    } finally {
      setAdActive(false);
      setBusy(false);
    }
  };
  return <Modal visible={visible && !adActive} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 }}>
      <Pressable onPress={(event) => event.stopPropagation()} style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 20 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>今日の無料音声入力を使い切りました</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 10 }}>広告を見て3回追加するか、Premiumなら回数を気にせず使えます。</Text>
        {error ? <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800', marginTop: 10 }}>{error}</Text> : null}
        {canWatchReward && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void handleReward()} style={{ minHeight: 50, marginTop: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, opacity: busy ? 0.65 : 1 }}>
          {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={{ color: colors.onAccent, fontSize: 14, fontWeight: '900' }}>広告を見て＋3回</Text>}
        </Pressable>}
        <Pressable onPress={onPremium} style={{ minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: canWatchReward ? 4 : 18, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.accent, fontSize: 13, fontWeight: '900' }}>Premiumを見る</Text></Pressable>
        <Pressable onPress={onClose} style={{ minHeight: 42, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted, fontSize: 13, fontWeight: '800' }}>閉じる</Text></Pressable>
      </Pressable>
    </Pressable>
  </Modal>;
}
