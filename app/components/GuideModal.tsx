import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';

type GuideModalProps = {
  visible: boolean;
  onClose: () => void;
  styles: any;
  designMode?: DesignMode;
  chicPalette?: ChicThemePalette;
};

export function GuideModal({ visible, onClose, styles, designMode, chicPalette }: GuideModalProps) {
  const isDesign = designMode === 'chic' && !!chicPalette;
  const baseColors = getThemeTokens(designMode ?? 'minimal').colors;
  const palette = isDesign && chicPalette ? {
    surface: chicPalette.cardSurface,
    border: chicPalette.border,
    textPrimary: chicPalette.textPrimary,
    textSecondary: chicPalette.textSecondary,
    accent: chicPalette.accent,
    onAccent: chicPalette.onAccent,
  } : {
    surface: baseColors.surface,
    border: baseColors.border,
    textPrimary: baseColors.primaryText,
    textSecondary: baseColors.secondaryText,
    accent: baseColors.primaryAccent,
    onAccent: '#FFFFFF',
  };
  const steps = [
    ['1', '今日に登録', '＋追加から実行日・期限・通知を設定します'],
    ['2', '今やるへ整理', '今やる／あとで／待ちに振り分けます'],
    ['3', '間に合う準備', '出発で準備・移動時間を逆算します'],
    ['4', 'ひとつに集中', '集中タイマーで今のタスクだけ進めます'],
    ['5', 'できたを確認', '完了は瓶と履歴にたまり、誤操作は戻せます'],
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Rhythmの使い方</Text>
          <Text style={[styles.guideIntro, { color: palette.textSecondary }]}>迷ったら、この順番だけで大丈夫。</Text>
          {steps.map(([number, title, copy]) => (
            <View key={number} style={styles.guideStep}>
              <View style={[styles.guideStepNumber, { backgroundColor: palette.accent }]}><Text style={[styles.guideStepNumberText, { color: palette.onAccent }]}>{number}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.guideStepTitle, { color: palette.textPrimary }]}>{title}</Text>
                <Text style={[styles.guideStepCopy, { color: palette.textSecondary }]}>{copy}</Text>
              </View>
            </View>
          ))}
          <Pressable style={[styles.primaryButton, { backgroundColor: palette.accent, borderColor: palette.accent }]} onPress={onClose}><Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>わかった</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
