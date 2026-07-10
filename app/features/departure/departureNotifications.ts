import * as Notifications from 'expo-notifications';

export async function cancelPendingDepartureNotifications(planId: string) {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const matches = pending.filter((request) => request.content.data?.departurePlanId === planId);
  await Promise.all(matches.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
}
