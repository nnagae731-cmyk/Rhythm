import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enqueueNotificationOperation } from '../notifications/notificationOperationQueue';

async function cancelPendingTaskNotificationsUnsafe(taskId: string) {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const matches = pending.filter((request) => request.content.data?.taskId === taskId);
  await Promise.all(matches.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
}

const DIRTY_PREFIX = 'rhythm-task-notification-dirty-v1:';
const dirtyKey = (taskId: string) => DIRTY_PREFIX + encodeURIComponent(taskId);

export async function reconcileTaskNotificationsUnsafe(taskId: string, operation: () => Promise<void>) {
  await AsyncStorage.setItem(dirtyKey(taskId), '1');
  await operation();
  await AsyncStorage.removeItem(dirtyKey(taskId));
}

export async function getUnreconciledTaskNotificationIds(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((key) => key.startsWith(DIRTY_PREFIX)).map((key) => decodeURIComponent(key.slice(DIRTY_PREFIX.length)));
}

export async function cancelPendingTaskNotifications(taskId: string) {
  return enqueueNotificationOperation(`task:${taskId}`, () => reconcileTaskNotificationsUnsafe(taskId, () => cancelPendingTaskNotificationsUnsafe(taskId)));
}

export { cancelPendingTaskNotificationsUnsafe };
