import * as Notifications from 'expo-notifications';

export async function cancelPendingTaskNotifications(taskId: string) {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const matches = pending.filter((request) => request.content.data?.taskId === taskId);
  await Promise.all(matches.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
}
