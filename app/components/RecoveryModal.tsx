import React from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { DesignMode, getThemeTokens } from '../theme';
import { createRecoveryRecord, getRecoveryOptions, RecoveryOption, RecoveryRecord } from '../recovery';
import { DeparturePlan } from '../types';

type RecoveryModalProps = {
  visible: boolean;
  plan?: DeparturePlan;
  now: Date;
  designMode: DesignMode;
  onClose: () => void;
  onApply: (record: RecoveryRecord) => void;
  onPremium: () => void;
  styles: any;
};

export function RecoveryModal({ visible, plan, now, designMode, onClose, onApply, onPremium, styles }: RecoveryModalProps) {
  if (!plan) return null;
  const theme = getThemeTokens(designMode);
  const options = getRecoveryOptions(plan, now);
  const estimatedArrival = options[0]?.estimatedArrival ?? plan.arrival;
  const applyOption = async (option: RecoveryOption) => {
    const record = createRecoveryRecord(plan, option);
    if (!record) {
      Alert.alert('この予定はまだ保存されていません');
      return;
    }
    if (option.action === 'contact' && option.contactMessage) {
      const result = await Share.share({ message: option.contactMessage });
      if (result.action !== Share.sharedAction) return;
    }
    onApply(record);
    Alert.alert('リカバリープランを反映しました', option.description);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, borderRadius: theme.radius.modal }]} onPress={(event) => event.stopPropagation()}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHandle} />
            <View style={[styles.recoveryHeader, { backgroundColor: theme.colors.softAccent }]}>
              <Text style={[styles.recoveryEyebrow, { color: theme.colors.primaryAccent }]}>遅れても、ここから立て直せます</Text>
              <Text style={styles.recoveryTitle}>{plan.title}</Text>
              <Text style={styles.recoverySummary}>予定到着 {plan.arrival}　→　今出ると {estimatedArrival}ごろ</Text>
            </View>
            <Text style={styles.recoveryPrompt}>次の行動を選んでください</Text>
            {options.map((option) => {
              const locked = option.action === 'delay_arrival' || option.action === 'reschedule';
              return (
                <Pressable key={option.action} style={[styles.recoveryOption, { borderColor: theme.colors.border }]} onPress={() => {
                  if (locked) {
                    onClose();
                    onPremium();
                  } else {
                    void applyOption(option);
                  }
                }}>
                  <View style={[styles.recoveryOptionIcon, { backgroundColor: theme.colors.secondarySurface }]}>
                    <Text style={[styles.recoveryOptionIconText, { color: theme.colors.primaryAccent }]}>{option.action === 'leave_now' ? '↗' : option.action === 'delay_arrival' ? '◷' : option.action === 'contact' ? '✉' : '↻'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recoveryOptionTitle}>{option.title}</Text>
                    <Text style={styles.recoveryOptionCopy}>{option.description}</Text>
                  </View>
                  <Text style={[styles.recoveryOptionArrow, { color: theme.colors.primaryAccent }]}>{locked ? '▣' : '›'}</Text>
                </Pressable>
              );
            })}
            <Text style={styles.recoveryNote}>位置情報や経路検索はまだ使わず、登録済みの移動時間から計算しています。</Text>
            <Pressable onPress={onClose}><Text style={styles.cancelText}>閉じる</Text></Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
