import React from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { DesignMode, getThemeTokens } from '../theme';
import { createRecoveryRecord, getRecoveryOptions, RecoveryOption, RecoveryRecord } from '../recovery';
import { DeparturePlan } from '../types';
import { PlanTier } from '../premiumAccess';
import { ChicThemePalette } from '../theme';
import { TravelAppLaunchActions } from './TravelAppLaunchActions';
import { TravelAppSettings } from '../features/travel/travelApps';
import { PremiumGuideFeatureId } from '../premiumGuide';

type RecoveryModalProps = {
  visible: boolean;
  plan?: DeparturePlan;
  now: Date;
  designMode: DesignMode;
  onClose: () => void;
  onApply: (record: RecoveryRecord) => void;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  styles: any;
  travelApps?: TravelAppSettings;
  planTier?: PlanTier;
  chicPalette?: ChicThemePalette;
  onOpenTravelAppSettings?: () => void;
  inlinePreview?: boolean;
};

export function RecoveryModal({ visible, plan, now, designMode, onClose, onApply, onPremium, styles, travelApps, planTier = 'free', chicPalette, onOpenTravelAppSettings, inlinePreview = false }: RecoveryModalProps) {
  const [contactEditing, setContactEditing] = React.useState(false);
  const [contactDraft, setContactDraft] = React.useState('');
  if (!plan) return null;
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const options = getRecoveryOptions(plan, now);
  const estimatedArrival = options[0]?.estimatedArrival ?? plan.arrival;
  const applyOption = async (option: RecoveryOption, customMessage?: string) => {
    const record = createRecoveryRecord(plan, option);
    if (!record) {
      Alert.alert('この予定はまだ保存されていません');
      return;
    }
    if (option.action === 'contact') {
      const message = customMessage?.trim();
      if (!message) {
        Alert.alert('連絡文を入力してね', '共有する文面を入力すると送信できます。');
        return;
      }
      const result = await Share.share({ message });
      if (result.action !== Share.sharedAction) return;
    }
    onApply(record);
    Alert.alert('リカバリープランを反映しました', option.description);
  };

  const content = <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHandle} />
            <View style={[styles.recoveryHeader, { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.border, borderWidth: 1 }]}>
              <Text style={[styles.recoveryEyebrow, { color: theme.colors.primaryAccent }]}>ここから立て直す</Text>
              <Text style={[styles.recoveryTitle, { color: theme.colors.primaryText }]}>{plan.title}</Text>
              <Text style={[styles.recoverySummary, { color: theme.colors.secondaryText }]}>予定到着 {plan.arrival}　→　今出ると {estimatedArrival}ごろ</Text>
            </View>
            <Text style={[styles.recoveryPrompt, { color: theme.colors.primaryText }]}>次の行動を選んでください</Text>
            {options.map((option) => {
              const locked = option.action === 'delay_arrival' || option.action === 'reschedule';
              return (
                <Pressable key={option.action} style={[styles.recoveryOption, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => {
                  if (locked) {
                    onClose();
                    onPremium();
                  } else if (option.action === 'contact') {
                    setContactEditing(true);
                    setContactDraft('');
                  } else {
                    void applyOption(option);
                  }
                }}>
                  <View style={[styles.recoveryOptionIcon, { backgroundColor: theme.colors.secondarySurface }]}>
                    <Text style={[styles.recoveryOptionIconText, { color: theme.colors.primaryAccent }]}>{option.action === 'leave_now' ? '↗' : option.action === 'delay_arrival' ? '◷' : option.action === 'contact' ? '✉' : '↻'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recoveryOptionTitle, { color: theme.colors.primaryText }]}>{option.title}</Text>
                    <Text style={[styles.recoveryOptionCopy, { color: theme.colors.secondaryText }]}>{option.description}</Text>
                  </View>
                  <Text style={[styles.recoveryOptionArrow, { color: theme.colors.primaryAccent }, locked && { fontSize: 9, fontWeight: '900' }]}>{locked ? 'Premium' : '›'}</Text>
                </Pressable>
              );
            })}
            {contactEditing && <View style={[styles.recoveryContactEditor, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.recoveryContactLabel, { color: theme.colors.primaryText }]}>共有する連絡文</Text>
              <TextInput value={contactDraft} onChangeText={setContactDraft} multiline placeholder="例：少し遅れます。到着は10分ほど遅れる見込みです。" placeholderTextColor={theme.colors.secondaryText} style={[styles.recoveryContactInput, { backgroundColor: theme.colors.secondarySurface, borderColor: theme.colors.border, color: theme.colors.primaryText }]} />
              <View style={styles.recoveryContactActions}>
                <Pressable onPress={() => setContactEditing(false)}><Text style={styles.cancelText}>戻る</Text></Pressable>
                <Pressable style={[styles.recoveryContactSend, { backgroundColor: theme.colors.primaryAccent }]} onPress={() => { const option = options.find((item) => item.action === 'contact'); if (option) void applyOption(option, contactDraft); }}><Text style={styles.recoveryContactSendText}>共有する</Text></Pressable>
              </View>
            </View>}
            <Text style={[styles.recoveryNote, { color: theme.colors.secondaryText }]}>位置情報や経路検索はまだ使わず、登録済みの移動時間から計算しています。</Text>
            {plan.destination?.trim() ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}><TravelAppLaunchActions settings={travelApps} category="transit" destination={plan.destination} planTier={planTier} designMode={designMode} chicPalette={chicPalette} onPremium={(featureId) => onPremium(featureId)} onOpenSettings={onOpenTravelAppSettings} /><TravelAppLaunchActions settings={travelApps} category="taxi" destination={plan.destination} planTier={planTier} designMode={designMode} chicPalette={chicPalette} onPremium={(featureId) => onPremium(featureId)} onOpenSettings={onOpenTravelAppSettings} /></View> : null}
            <Pressable onPress={onClose}><Text style={[styles.cancelText, { color: theme.colors.secondaryText }]}>閉じる</Text></Pressable>
  </ScrollView>;
  if (inlinePreview) return <View style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, borderRadius: theme.radius.modal, position: 'relative', width: '100%', zIndex: 20 }]} pointerEvents="none">{content}</View>;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.modalBackdrop} onPress={onClose}><Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, borderRadius: theme.radius.modal }]} onPress={(event) => event.stopPropagation()}>{content}</Pressable></Pressable></Modal>;
}
