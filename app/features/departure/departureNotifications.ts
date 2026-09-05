import * as Notifications from 'expo-notifications';
import { enqueueNotificationOperation } from '../notifications/notificationOperationQueue';

async function cancelPendingDepartureNotificationsUnsafe(planId: string) {
  // Cancellation is best-effort: the native notification store may be
  // unavailable during app backgrounding, and callers commonly fire-and-
  // forget this cleanup after updating the plan state.
  const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  const matches = pending.filter((request) => request.content.data?.departurePlanId === planId);
  await Promise.all(matches.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined)));
}

export async function cancelPendingDepartureNotifications(planId: string) {
  return enqueueNotificationOperation(`departure:${planId}`, () => cancelPendingDepartureNotificationsUnsafe(planId));
}

export { cancelPendingDepartureNotificationsUnsafe };
