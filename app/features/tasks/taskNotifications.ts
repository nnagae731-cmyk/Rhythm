import * as Notifications from 'expo-notifications';
import { enqueueNotificationOperation } from '../notifications/notificationOperationQueue';

async function cancelPendingTaskNotificationsUnsafe(taskId: string) {
  // Notification APIs can reject while the app is backgrounding or before
  // the native module is ready. Cancellation is best-effort and must not
  // become an unhandled rejection in fire-and-forget callers.
  const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  const matches = pending.filter((request) => request.content.data?.taskId === taskId);
  await Promise.all(matches.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined)));
}

export async function cancelPendingTaskNotifications(taskId: string) {
  return enqueueNotificationOperation(`task:${taskId}`, () => cancelPendingTaskNotificationsUnsafe(taskId));
}

export { cancelPendingTaskNotificationsUnsafe };
