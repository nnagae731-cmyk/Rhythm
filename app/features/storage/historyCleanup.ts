import type { BehaviorEvent } from '../../behaviorEvents';
import type { FocusSession } from '../../focusSession';
import type { RecoveryRecord } from '../../recovery';
import type { RoutineArchive } from '../../types';

export const HISTORY_RETENTION_DAYS = 90;
const HISTORY_RETENTION_MS = HISTORY_RETENTION_DAYS * 86_400_000;

/**
 * Retains malformed and future timestamps conservatively. The existing
 * routine-archive rule uses a strict less-than comparison, so exactly 90 days
 * old expires while a record newer than that remains.
 */
function keepWithinRetention(value: string | undefined, now: number) {
  const timestamp = value ? Date.parse(value) : NaN;
  if (!Number.isFinite(timestamp) || timestamp > now) return true;
  return now - timestamp < HISTORY_RETENTION_MS;
}

export function pruneBehaviorEvents(items: BehaviorEvent[], now = Date.now()) {
  return items.filter((item) => keepWithinRetention(item.actualAt ?? item.occurredAt, now));
}

export function pruneFocusSessions(items: FocusSession[], now = Date.now()) {
  return items.filter((item) => keepWithinRetention(item.completedAt, now));
}

export function pruneRecoveryHistory(items: RecoveryRecord[], now = Date.now()) {
  return items.filter((item) => keepWithinRetention(item.occurredAt, now));
}

export function pruneRoutineArchives(items: RoutineArchive[], now = Date.now()) {
  return items.filter((item) => keepWithinRetention(item.removedAt, now));
}
