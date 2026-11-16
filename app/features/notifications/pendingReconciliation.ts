import AsyncStorage from '@react-native-async-storage/async-storage';

type Kind = 'departure' | 'focus';
const prefix = (kind: Kind) => `rhythm-notification-reconcile-v1:${kind}:`;
const key = (kind: Kind, id: string) => prefix(kind) + encodeURIComponent(id);

export async function reconcileNotificationOperation(kind: Kind, id: string, operation: () => Promise<void>): Promise<void> {
  await AsyncStorage.setItem(key(kind, id), '1');
  await operation();
  await AsyncStorage.removeItem(key(kind, id));
}

export async function pendingNotificationReconciliations(kind: Kind): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((item) => item.startsWith(prefix(kind))).map((item) => decodeURIComponent(item.slice(prefix(kind).length)));
}
