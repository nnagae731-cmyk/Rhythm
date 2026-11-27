import { parseRhythmStateBody } from '../../storage/rhythmStateValidation';
import { ICLOUD_MAX_BODY_BYTES, syncBodyHash, utf8ByteLength } from './syncCodec';

export type SyncMeta = { updatedAt: number; deviceId: string; bodyBytes: number; bodyHash?: string };
export type RemoteSyncSnapshot = { body: string; meta: SyncMeta };
export type LocalSyncSnapshot = { body: string | null; updatedAt: number; dirty?: boolean; backupFailed?: boolean };
export type SyncDecision = { action: 'adopt' | 'upload' | 'keep' | 'defer'; reason: string };
const object = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));

/** Reject obvious shapes that would otherwise throw in the existing hydration. */
export function validRemoteBody(body: string): boolean {
  try {
    const state = parseRhythmStateBody(body) as Record<string, unknown>;
    for (const field of ['tasks', 'departurePlans', 'focusSessions', 'behaviorEvents', 'recoveryHistory', 'departureCheckIns', 'routineArchives', 'sharedEvents', 'affirmations', 'affirmationCustomTexts', 'savedTaskTemplates']) {
      const value = state[field];
      if (value !== undefined && (!Array.isArray(value) || value.some(item => !object(item)))) return false;
    }
    for (const field of ['plan', 'photoTheme', 'widgetSettings', 'wishMonths', 'calendarMarks', 'travelApps']) if (state[field] !== undefined && !object(state[field])) return false;
    if (Array.isArray(state.tasks) && state.tasks.some(task => !object(task) || typeof task.title !== 'string' || typeof task.id !== 'string' || ['subtasks', 'listItems'].some(field => task[field] !== undefined && (!Array.isArray(task[field]) || task[field].some(item => !object(item)))))) return false;
    if (object(state.wishMonths) && Object.values(state.wishMonths).some(month => !object(month) || ['wishes', 'actions', 'reviews'].some(field => month[field] !== undefined && (!Array.isArray(month[field]) || month[field].some(item => !object(item)))))) return false;
    return true;
  } catch { return false; }
}
export function validatedRemote(remote: unknown): RemoteSyncSnapshot | null {
  if (!object(remote) || typeof remote.body !== 'string' || !object(remote.meta)) return null;
  const { updatedAt, deviceId, bodyBytes, bodyHash } = remote.meta;
  if (!Number.isSafeInteger(updatedAt) || (updatedAt as number) < 0 || typeof deviceId !== 'string' || !deviceId.trim() || deviceId.length > 256 || !Number.isSafeInteger(bodyBytes) || (bodyBytes as number) < 2 || (bodyBytes as number) > ICLOUD_MAX_BODY_BYTES) return null;
  if (utf8ByteLength(remote.body) !== bodyBytes || !validRemoteBody(remote.body)) return null;
  if (bodyHash !== undefined && (typeof bodyHash !== 'string' || !/^[a-f0-9]{64}$/.test(bodyHash) || syncBodyHash(remote.body) !== bodyHash)) return null;
  return remote as RemoteSyncSnapshot;
}

/** Defaults/settings-only snapshots do not count as actual task/journal/history data. */
export function hasSyncUserData(body: string): boolean {
  const state = parseRhythmStateBody(body) as Record<string, unknown>;
  for (const field of ['tasks', 'departurePlans', 'focusSessions', 'behaviorEvents', 'recoveryHistory', 'departureCheckIns', 'routineArchives', 'sharedEvents', 'affirmations', 'affirmationCustomTexts', 'savedTaskTemplates']) if (Array.isArray(state[field]) && state[field].length > 0) return true;
  if (object(state.plan) && typeof state.plan.title === 'string' && state.plan.title.trim()) return true;
  if (object(state.calendarMarks) && Object.keys(state.calendarMarks).length > 0) return true;
  if (object(state.wishMonths)) {
    for (const month of Object.values(state.wishMonths)) {
      if (!object(month)) continue;
      if (['wishes', 'actions'].some(field => Array.isArray(month[field]) && month[field].length > 0)) return true;
      const reviews = [month.review, ...(Array.isArray(month.reviews) ? month.reviews : [])];
      if (reviews.some(review => object(review) && [review.shortNote, review.memo, review.photo, ...(Array.isArray(review.photos) ? review.photos : [])].some(value => typeof value === 'string' && value.trim()))) return true;
      if (typeof month.monthlyGoal === 'string' && month.monthlyGoal.trim()) return true;
      if (object(month.reflectionCard) && [month.reflectionCard.phrase, month.reflectionCard.bestMemory, ...(Array.isArray(month.reflectionCard.photoIds) ? month.reflectionCard.photoIds : [])].some(value => typeof value === 'string' && value.trim())) return true;
    }
  }
  return false;
}

export function resolveSyncDecision(local: LocalSyncSnapshot, remote: unknown): SyncDecision {
  if (local.dirty) return { action: 'defer', reason: 'unsaved-or-editing' };
  if (local.backupFailed) return { action: 'keep', reason: 'backup-failed' };
  if (local.body !== null && !validRemoteBody(local.body)) return { action: 'keep', reason: 'invalid-local' };
  if (!Number.isSafeInteger(local.updatedAt) || local.updatedAt < 0) return { action: 'keep', reason: 'invalid-local-time' };
  if (remote === null || remote === undefined) return { action: local.body === null ? 'keep' : 'upload', reason: 'remote-missing' };
  const candidate = validatedRemote(remote);
  if (!candidate) return { action: 'keep', reason: 'invalid-remote' };
  if (!candidate.meta.bodyHash) return { action: local.body !== null && local.updatedAt > candidate.meta.updatedAt ? 'upload' : 'keep', reason: 'legacy-without-hash' };
  if (local.body === null) return { action: 'adopt', reason: 'local-missing' };
  if (candidate.meta.updatedAt > local.updatedAt) {
    if (hasSyncUserData(local.body) && !hasSyncUserData(candidate.body)) return { action: 'keep', reason: 'empty-remote-protected' };
    return { action: 'adopt', reason: 'remote-newer' };
  }
  return { action: local.updatedAt > candidate.meta.updatedAt ? 'upload' : 'keep', reason: local.updatedAt === candidate.meta.updatedAt ? 'same-time' : 'local-newer' };
}
