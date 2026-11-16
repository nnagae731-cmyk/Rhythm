import * as Notifications from 'expo-notifications';

/** A failed lookup is not an empty notification store. */
export async function getPendingNotificationRequests() {
  return Notifications.getAllScheduledNotificationsAsync();
}
