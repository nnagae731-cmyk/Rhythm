// Family records are intentionally unrelated to PersistedState/legacy share packets.
export type FamilyScope = 'private' | 'shared';
export type FamilyRecordType = 'FamilyGroup' | 'SharedEvent' | 'SharedTodo' | 'FamilyMember';
export type RecordAddress = { scope: FamilyScope; zoneName: string; ownerName: string; recordName: string };
export type FamilyRecord = RecordAddress & {
  type: FamilyRecordType;
  fields: Record<string, string | number>;
};
export type SyncStatus = 'synced' | 'pending' | 'failed';
export type FamilyAccess = { group: RecordAddress; role: 'owner' | 'participant'; permission: 'readWrite' | 'readOnly' | 'none'; status: 'accepted' | 'left' | 'revoked' | 'stopped'; checkedAt: number; verified: boolean };
export type FamilySnapshot = { userId: string; records: FamilyRecord[]; pendingCount: number; syncStates: Array<{ record: RecordAddress; state: SyncStatus; errorCode?: number }>; access: FamilyAccess[] };
export type SharedEventInput = { id?: string; title: string; location?: string; note?: string } & (
  { allDay: false; startAt: number; endAt: number; timeZoneID: string } |
  { allDay: true; startDate: string; endDateExclusive: string }
);
export type SharedTodoInput = { id?: string; title: string; done: boolean; dueAt?: number };
export type FamilyMember = { id: string | null; role: 'owner' | 'participant' | 'unknown'; status: 'accepted' | 'pending' | 'removed' | 'unknown'; permission: 'readWrite' | 'readOnly' | 'none'; displayName: string | null; color: string | null };

const types: FamilyRecordType[] = ['FamilyGroup', 'SharedEvent', 'SharedTodo', 'FamilyMember'];
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const time = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 8_640_000_000_000_000;
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value || /^[+-]/.test(value)) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}
export function parseFamilyRecord(value: unknown): FamilyRecord {
  const r = value as Partial<FamilyRecord> | null;
  if (!r || !types.includes(r.type!) || !['private', 'shared'].includes(r.scope!) || ![r.zoneName, r.ownerName, r.recordName].every(text) || !r.fields || Array.isArray(r.fields)) throw Error('Invalid family record');
  const f = r.fields;
  if (Object.values(f).some(v => typeof v !== 'string' && (typeof v !== 'number' || !Number.isFinite(v)))) throw Error('Invalid fields');
  if (!time(f.updatedAt) || !text(f.mutationId) || ![0, 1].includes(Number(f.isDeleted))) throw Error('Invalid record version');
  if (r.type === 'FamilyGroup' && (!text(f.name) || !text(f.creatorId) || !time(f.createdAt))) throw Error('Invalid group');
  if (r.type === 'SharedEvent') {
    if (!text(f.title) || !text(f.creatorId)) throw Error('Invalid event');
    if (f.allDay === 1) {
      if (!isCalendarDate(f.startDate) || !isCalendarDate(f.endDateExclusive) || f.endDateExclusive <= f.startDate) throw Error('Invalid all-day dates');
    } else if (f.allDay !== 0 || !time(f.startAt) || !time(f.endAt) || f.endAt < f.startAt || !isTimeZone(f.timeZoneID)) throw Error('Invalid event dates/timezone');
  }
  if (r.type === 'SharedTodo' && (!text(f.title) || !text(f.creatorId) || ![0, 1].includes(Number(f.done)) || (f.dueAt !== undefined && !time(f.dueAt)))) throw Error('Invalid todo');
  if (r.type === 'FamilyMember' && (!text(f.userId) || typeof f.displayName !== 'string' || typeof f.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(f.color))) throw Error('Invalid member');
  return { ...r, fields: { ...f } } as FamilyRecord;
}
export function recordKey(r: RecordAddress) { return JSON.stringify([r.scope, r.ownerName, r.zoneName, r.recordName]); }
/** Called only after optimistic concurrency (recordChangeTag) detects conflict.
 * Tombstones never lose to a live edit; otherwise LWW + deterministic tie break. */
export function resolveFamilyConflict(local: FamilyRecord, remote: FamilyRecord): FamilyRecord {
  if (recordKey(local) !== recordKey(remote) || local.type !== remote.type) throw Error('Different records');
  if (local.fields.isDeleted !== remote.fields.isDeleted) return local.fields.isDeleted === 1 ? local : remote;
  const a = Number(local.fields.updatedAt), b = Number(remote.fields.updatedAt);
  return a > b || (a === b && String(local.fields.mutationId) > String(remote.fields.mutationId)) ? local : remote;
}
export function visibleFamilyRecords(records: FamilyRecord[]) { return records.filter(r => r.fields.isDeleted !== 1); }
export function participantStatus(value: number): FamilyMember['status'] { return ({ 1: 'pending', 2: 'accepted', 3: 'removed' } as const)[value as 1 | 2 | 3] ?? 'unknown'; }
export function invitationAction(status: FamilyMember['status']): 'accept' | 'fetch' | 'reject' { return status === 'pending' ? 'accept' : status === 'accepted' ? 'fetch' : 'reject'; }
export function parseFamilyMember(value: unknown): FamilyMember {
  const m = value as FamilyMember | null;
  if (!m || (m.id !== null && !text(m.id)) || !['owner', 'participant', 'unknown'].includes(m.role) || !['pending', 'accepted', 'removed', 'unknown'].includes(m.status) || !['readWrite', 'readOnly', 'none'].includes(m.permission) || (m.displayName !== null && typeof m.displayName !== 'string') || (m.color !== null && (typeof m.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(m.color)))) throw Error('Invalid family participant');
  return { id: m.id, role: m.role, status: m.status, permission: m.permission, displayName: m.displayName, color: m.color };
}
export function validateEvent(input: SharedEventInput) {
  if (!input.title.trim() || input.title.length > 500 || typeof input.allDay !== 'boolean' || (input.note?.length ?? 0) > 10000 || (input.location?.length ?? 0) > 1000) throw Error('Invalid event input');
  if (input.allDay) {
    if (!isCalendarDate(input.startDate) || !isCalendarDate(input.endDateExclusive) || input.endDateExclusive <= input.startDate) throw Error('Invalid all-day range');
  } else if (!time(input.startAt) || !time(input.endAt) || input.endAt < input.startAt || !isTimeZone(input.timeZoneID)) throw Error('Invalid event instants/timezone');
  return { ...input, title: input.title.trim() };
}
export function familySyncStatus(pending: boolean, errorCode?: number): SyncStatus { return errorCode !== undefined ? 'failed' : pending ? 'pending' : 'synced'; }
export function canUseFamily(access: FamilyAccess, _now: number, writing = false): boolean {
  // No offline time limit (owner decision). Revocation is enforced on reconnect.
  return access.verified && access.status === 'accepted' && access.permission !== 'none' && (!writing || access.permission === 'readWrite');
}
export function validateTodo(input: SharedTodoInput) {
  if (!input.title.trim() || input.title.length > 500 || typeof input.done !== 'boolean' || (input.dueAt !== undefined && !time(input.dueAt))) throw Error('Invalid todo input');
  return { ...input, title: input.title.trim() };
}
export function validateShareURL(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['www.icloud.com', 'icloud.com'].includes(url.hostname) || !url.pathname.startsWith('/share/') || url.username || url.password || url.port) throw Error('Invalid CloudKit share URL');
  return value;
}
