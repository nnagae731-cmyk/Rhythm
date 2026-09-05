import * as Notifications from 'expo-notifications';
import { enqueueNotificationOperation } from './notificationOperationQueue';

async function cancelPendingAffirmationNotificationsUnsafe(affirmationId: string, notificationId?: string) {
  let pending: Notifications.NotificationRequest[] = [];
  let lookupFailed = false;
  try {
    pending = await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    // Enumeration can fail while the app is backgrounding. The deterministic
    // id below is still cancelled directly, but surface the lookup failure so
    // callers do not mistake an incomplete cleanup for success.
    if (__DEV__) console.warn('[Notifications] affirmation pending lookup failed', error);
    lookupFailed = true;
  }
  const ids = new Set<string>();
  if (notificationId) ids.add(notificationId);
  ids.add(`affirmation:${affirmationId}`);
  pending.forEach((request) => {
    if (request.content.data?.affirmationId === affirmationId) ids.add(request.identifier);
  });
  const failures: string[] = [];
  await Promise.all([...ids].map(async (id) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      failures.push(id);
      if (__DEV__) console.warn('[Notifications] affirmation cancellation failed', id, error);
    }
  }));
  if (lookupFailed || failures.length) {
    const detail = failures.length ? `: ${failures.join(', ')}` : '';
    throw new Error(`Affirmation notification cleanup incomplete${detail}`);
  }
}

export function cancelPendingAffirmationNotifications(affirmationId: string, notificationId?: string) {
  return enqueueNotificationOperation(`affirmation:${affirmationId}`, () => cancelPendingAffirmationNotificationsUnsafe(affirmationId, notificationId));
}

export { cancelPendingAffirmationNotificationsUnsafe };
