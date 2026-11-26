import { buildAffirmationContent } from './notificationContent';
import { canUseNotifications, getNotificationPermissionAction, getNotificationPermissionStatus, requestRhythmNotificationPermission } from './notificationPermission';
import { parseClock } from '../schedule/dateTimeUtils';
import type { Affirmation } from '../../types';
import { Alert, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export async function ensureNotifications() {
  const status = await getNotificationPermissionStatus();
  if (!canUseNotifications(status)) {
    const action = getNotificationPermissionAction(status);
    const proceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        '通知を許可しますか？',
        '設定した時間や集中タイムの終了をRhythmからお知らせします。',
        action === 'openSettings'
          ? [{ text: 'あとで', style: 'cancel', onPress: () => resolve(false) }, { text: 'iPhoneの設定を開く', onPress: () => { void Linking.openSettings(); resolve(false); } }]
          : [{ text: 'あとで', style: 'cancel', onPress: () => resolve(false) }, { text: '通知を許可する', onPress: () => resolve(true) }],
      );
    });
    if (!proceed) return false;
    const requested = await requestRhythmNotificationPermission();
    if (!canUseNotifications(requested)) return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'リマインダー',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      sound: 'default',
    });
  }

  await Notifications.setNotificationCategoryAsync('TASK_ACTIONS', [
    {
      identifier: 'DONE',
      buttonTitle: '終わった',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'SNOOZE',
      buttonTitle: '10分後',
      options: { opensAppToForeground: false },
    },
  ]);
  await Notifications.setNotificationCategoryAsync('DEPARTURE_ACTIONS', [
    { identifier: 'DEPARTED', buttonTitle: '出発した', options: { opensAppToForeground: false } },
    { identifier: 'DEPARTURE_SNOOZE', buttonTitle: 'まだ', options: { opensAppToForeground: false } },
  ]);
  await Notifications.setNotificationCategoryAsync('PREPARATION_ACTIONS', [
    { identifier: 'PREPARING', buttonTitle: '準備を始める', options: { opensAppToForeground: false } },
    { identifier: 'PREPARE_LATER', buttonTitle: 'まだ', options: { opensAppToForeground: false } },
    { identifier: 'PREPARATION_SNOOZE', buttonTitle: '5分後に再通知', options: { opensAppToForeground: false } },
  ]);
  return true;
}

export async function scheduleAffirmationNotification(affirmation: Affirmation) {
  const minutes = parseClock(affirmation.time);
  return Notifications.scheduleNotificationAsync({
    identifier: `affirmation:${affirmation.id}`,
    content: {
      ...buildAffirmationContent(affirmation.text),
      data: { affirmationId: affirmation.id, kind: 'affirmation' },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: Math.floor(minutes / 60),
      minute: minutes % 60,
    },
  });
}
