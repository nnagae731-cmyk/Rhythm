import * as Notifications from 'expo-notifications';

export type RhythmNotificationPermissionStatus =
  | 'authorized'
  | 'provisional'
  | 'denied'
  | 'notDetermined';

function mapPermissionStatus(
  settings: Awaited<
    ReturnType<typeof Notifications.getPermissionsAsync>
  >,
): RhythmNotificationPermissionStatus {
  if (
    settings.ios?.status ===
    Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return 'provisional';
  }

  if (settings.status === 'granted') {
    return 'authorized';
  }

  if (settings.status === 'denied') {
    return 'denied';
  }

  return 'notDetermined';
}

export async function getNotificationPermissionStatus(): Promise<RhythmNotificationPermissionStatus> {
  const settings =
    await Notifications.getPermissionsAsync();

  return mapPermissionStatus(settings);
}

export function canUseNotifications(
  status: RhythmNotificationPermissionStatus,
): boolean {
  return (
    status === 'authorized' ||
    status === 'provisional'
  );
}

export async function requestRhythmNotificationPermission(): Promise<RhythmNotificationPermissionStatus> {
  const current =
    await getNotificationPermissionStatus();

  if (
    current === 'authorized' ||
    current === 'provisional' ||
    current === 'denied'
  ) {
    return current;
  }

  const result =
    await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: true,
      },
    });

  return mapPermissionStatus(result);
}

export type NotificationPermissionAction =
  | 'none'
  | 'request'
  | 'openSettings';

export function getNotificationPermissionAction(
  status: RhythmNotificationPermissionStatus,
): NotificationPermissionAction {
  if (
    status === 'authorized' ||
    status === 'provisional'
  ) {
    return 'none';
  }

  if (status === 'denied') {
    return 'openSettings';
  }

  return 'request';
}