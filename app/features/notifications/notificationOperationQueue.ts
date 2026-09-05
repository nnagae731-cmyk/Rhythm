const queues = new Map<string, Promise<void>>();

/**
 * Serialize notification read/cancel/schedule transactions per logical item.
 * Notification APIs are asynchronous, so a later edit must not be overtaken
 * by an earlier request that happens to finish last.
 */
export function enqueueNotificationOperation<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const current = previous.then(operation, operation);
  const tail = current.then(() => undefined, () => undefined);
  queues.set(key, tail);
  void tail.then(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });
  return current;
}
