import * as Notifications from 'expo-notifications';
import { enqueueNotificationOperation } from '../notifications/notificationOperationQueue';
import { reconcileNotificationOperation } from '../notifications/pendingReconciliation';

async function cancelPendingDepartureNotificationsUnsafe(planId: string) {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const matches = pending.filter((request) => request.content.data?.departurePlanId === planId);
  await Promise.all(matches.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
}

export async function cancelPendingDepartureNotifications(planId: string) {
  return enqueueNotificationOperation(`departure:${planId}`, () => reconcileNotificationOperation('departure', planId, () => cancelPendingDepartureNotificationsUnsafe(planId)));
}

export { cancelPendingDepartureNotificationsUnsafe };
