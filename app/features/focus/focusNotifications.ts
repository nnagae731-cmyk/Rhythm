import * as Notifications from 'expo-notifications';

export const FOCUS_COMPLETION_NOTIFICATION_KIND =
  'focus_timer_complete';

export type ScheduleFocusCompletionNotificationArgs = {
  timerId: string;
  endAt: string;
  taskTitle?: string;
  /** Permission UI is handled by the caller after showing Rhythm's explanation. */
  permissionGranted: boolean;
};

/**
 * 集中タイマー終了時刻に
 * ローカル通知を1件予約する。
 *
 * バックグラウンド中でも
 * iOS側が指定時刻に通知を処理できるようにする。
 */
export async function scheduleFocusCompletionNotification({
  timerId,
  endAt,
  taskTitle,
  permissionGranted,
}: ScheduleFocusCompletionNotificationArgs): Promise<
  string | null
> {
  const endDate = new Date(endAt);

  if (
    Number.isNaN(endDate.getTime()) ||
    endDate.getTime() <= Date.now()
  ) {
    return null;
  }

  if (!permissionGranted) {
    return null;
  }

  const cleanTaskTitle = taskTitle?.trim();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: '集中タイム終了',
      body: cleanTaskTitle
        ? `「${cleanTaskTitle}」の集中時間が終了しました。`
        : '集中時間が終了しました。',
      sound: 'default',
      data: {
        kind: FOCUS_COMPLETION_NOTIFICATION_KIND,
        focusTimerId: timerId,
      },
    },

    trigger: {
      type:
        Notifications
          .SchedulableTriggerInputTypes.DATE,
      date: endDate,
    },
  });
}

/**
 * 保存してある通知IDが分かる場合に
 * その1件だけキャンセルする。
 *
 * 一時停止・リセット等で使用する。
 */
export async function cancelFocusCompletionNotification(
  notificationId: string | null | undefined,
): Promise<void> {
  if (!notificationId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(
    notificationId,
  );
}

/**
 * timerIdから未実行のFocus通知を探して
 * キャンセルする。
 *
 * 通知IDを失った場合の安全策として使用可能。
 */
export async function cancelPendingFocusCompletionNotifications(
  timerId: string,
): Promise<void> {
  const pending =
    await Notifications.getAllScheduledNotificationsAsync();

  const matches = pending.filter(
    request =>
      request.content.data?.kind ===
        FOCUS_COMPLETION_NOTIFICATION_KIND &&
      request.content.data?.focusTimerId === timerId,
  );

  await Promise.all(
    matches.map(request =>
      Notifications.cancelScheduledNotificationAsync(
        request.identifier,
      ),
    ),
  );
}
