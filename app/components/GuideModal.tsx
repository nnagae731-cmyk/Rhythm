import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

type GuideModalProps = {
  visible: boolean;
  onClose: () => void;
  styles: any;
};

export function GuideModal({ visible, onClose, styles }: GuideModalProps) {
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
        <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Rhythmの使い方</Text>
          <Text style={styles.guideIntro}>迷ったら、この順番だけで大丈夫。</Text>
          {steps.map(([number, title, copy]) => (
            <View key={number} style={styles.guideStep}>
              <View style={styles.guideStepNumber}><Text style={styles.guideStepNumberText}>{number}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.guideStepTitle}>{title}</Text>
                <Text style={styles.guideStepCopy}>{copy}</Text>
              </View>
            </View>
          ))}
          <Pressable style={styles.primaryButton} onPress={onClose}><Text style={styles.primaryButtonText}>わかった</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
