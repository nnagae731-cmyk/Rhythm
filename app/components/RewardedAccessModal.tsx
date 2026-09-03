import React, { useState } from 'react';
import { ActivityIndicator, InteractionManager, Modal, Pressable, Text, View } from 'react-native';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';

export type RewardedAccessResult = {
  success: boolean;
  completed?: boolean;
  message?: string;
};

type Props = {
  visible: boolean;
  title: string;
  description: string;
  current?: number;
  required?: number;
  designMode: DesignMode;
  chicPalette?: ChicThemePalette;
  onReward: () => Promise<RewardedAccessResult>;
  onClose: () => void;
  onPremium?: () => void;
};

export function RewardedAccessModal({ visible, title, description, current = 0, required = 1, designMode, chicPalette, onReward, onClose, onPremium }: Props) {
  const [busy, setBusy] = useState(false);
  const [adActive, setAdActive] = useState(false);
  const [message, setMessage] = useState('');
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const colors = designMode === 'chic' && chicPalette ? {
    surface: chicPalette.cardSurface,
    border: chicPalette.border,
    text: chicPalette.textPrimary,
    muted: chicPalette.textSecondary,
    accent: chicPalette.accent,
    soft: chicPalette.accentSoft,
    onAccent: chicPalette.onAccent,
  } : {
    surface: theme.colors.surface,
    border: theme.colors.border,
    text: theme.colors.primaryText,
    muted: theme.colors.secondaryText,
    accent: theme.colors.primaryAccent,
    soft: theme.colors.softAccent,
    onAccent: designMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF',
  };

  const handleReward = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setAdActive(true);
    try {
      // Do not present Google Mobile Ads above this React Native Modal. Hide
      // the confirmation sheet first, then allow its dismissal animation to
      // finish before the native SDK presents its own view controller.
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => setTimeout(resolve, 250));
      });
      const result = await onReward();
      setAdActive(false);
      if (result.success && result.completed) {
        setMessage(result.message ?? '取得しました');
        setTimeout(onClose, 350);
      } else if (result.success) {
        setMessage(result.message ?? '広告を1回確認しました');
      } else {
        setMessage(result.message ?? '広告を読み込めませんでした。もう一度お試しください。');
      }
    } finally {
      setAdActive(false);
      setBusy(false);
    }
  };

  return <Modal visible={visible && !adActive} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 }}>
      <Pressable onPress={(event) => event.stopPropagation()} style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 20 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{title}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 10 }}>{description}</Text>
        {required > 1 && <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 14 }}>{current} / {required} 回視聴済み</Text>}
        {message ? <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800', marginTop: 12 }}>{message}</Text> : null}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void handleReward()} style={{ minHeight: 50, marginTop: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, opacity: busy ? 0.65 : 1 }}>
          {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={{ color: colors.onAccent, fontSize: 14, fontWeight: '900' }}>広告を見て取得</Text>}
        </Pressable>
        {onPremium && <Pressable onPress={onPremium} style={{ minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}><Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>Premiumなら広告なしで使えます</Text></Pressable>}
        <Pressable onPress={onClose} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted, fontSize: 13, fontWeight: '800' }}>閉じる</Text></Pressable>
      </Pressable>
    </Pressable>
  </Modal>;
}
