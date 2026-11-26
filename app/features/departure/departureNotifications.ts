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

// PREPARED is retained only to safely receive actions from notifications that
// were scheduled by earlier app versions.
export type DepartureNotificationAction = 'DEPARTED' | 'PREPARING' | 'PREPARED' | 'PREPARE_LATER' | 'DEPARTURE_SNOOZE' | 'PREPARATION_SNOOZE';

export const departureNotificationActions: readonly DepartureNotificationAction[] = ['DEPARTED', 'PREPARING', 'PREPARED', 'PREPARE_LATER', 'DEPARTURE_SNOOZE', 'PREPARATION_SNOOZE'];
