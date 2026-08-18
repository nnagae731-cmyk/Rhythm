import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type RhythmNotificationPermission =
  | 'granted'
  | 'provisional'
  | 'denied'
  | 'undetermined';

export type NotificationHealth = {
  permission: RhythmNotificationPermission;
  scheduledCount: number;
};

function mapNotificationPermission(
  settings: Awaited<
    ReturnType<typeof Notifications.getPermissionsAsync>
  >,
): RhythmNotificationPermission {
  if (settings.granted) {
    return 'granted';
  }

  if (
    Platform.OS === 'ios' &&
    settings.ios?.status ===
      Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return 'provisional';
  }

  if (settings.status === 'denied') {
    return 'denied';
  }

  return 'undetermined';
}

/**
 * 現在の通知許可状態を確認する。
 *
 * この関数では許可ダイアログを表示しない。
 */
export async function getNotificationPermission(): Promise<
  RhythmNotificationPermission
> {
  const settings =
    await Notifications.getPermissionsAsync();

  return mapNotificationPermission(settings);
}

/**
 * ユーザー操作を起点として
 * 通知許可を要求するときに使用する。
 *
 * アプリ起動直後に自動実行しないこと。
 */
export async function requestNotificationPermission(): Promise<
  RhythmNotificationPermission
> {
  const settings =
    await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

  return mapNotificationPermission(settings);
}

/**
 * 通知設定画面などで使用する
 * 現在の簡易ステータス。
 */
export async function getNotificationHealth(): Promise<NotificationHealth> {
  const [permissionSettings, scheduled] =
    await Promise.all([
      Notifications.getPermissionsAsync(),
      Notifications.getAllScheduledNotificationsAsync(),
    ]);

  return {
    permission:
      mapNotificationPermission(permissionSettings),
    scheduledCount: scheduled.length,
  };
}

export type NotificationTestResult =
  | {
      scheduled: true;
      notificationId: string;
    }
  | {
      scheduled: false;
      reason: 'permission_required';
    };

/**
 * Rhythmの通知が実際に届くか確認するための
 * ローカルテスト通知。
 *
 * 既存のNotification Handlerを使用するため、
 * このファイルではsetNotificationHandlerを登録しない。
 */
export async function scheduleNotificationTest(): Promise<NotificationTestResult> {
  const permission =
    await getNotificationPermission();

  if (
    permission !== 'granted' &&
    permission !== 'provisional'
  ) {
    return {
      scheduled: false,
      reason: 'permission_required',
    };
  }

  const notificationId =
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rhythm 通知テスト',
        body: '通知は正常に動いています。',
        sound: 'default',
        data: {
          kind: 'rhythm_notification_test',
        },
      },

      trigger: {
        type:
          Notifications
            .SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
      },
    });

  return {
    scheduled: true,
    notificationId,
  };
}