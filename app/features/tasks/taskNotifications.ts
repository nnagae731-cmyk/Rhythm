import * as Notifications from 'expo-notifications';
import { Task } from '../../types';

export async function cancelPendingTaskNotifications(taskId: string) {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const matches = pending.filter((request) => request.content.data?.taskId === taskId);
  await Promise.all(matches.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
}

export async function scheduleAllTaskNotifications(task: Task, ensureNotifications: () => Promise<boolean>, scheduleTaskReminder: (task: Task) => Promise<void>, scheduleDeadlineReminder: (task: Task) => Promise<void>) {
  await cancelPendingTaskNotifications(task.id);
  if (task.remindAt) await scheduleTaskReminder(task);
  if (task.deadlineDate && task.deadlineTime && task.deadlineNotifyBefore !== undefined) await scheduleDeadlineReminder(task);
}
