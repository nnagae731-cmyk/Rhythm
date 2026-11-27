import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { parseFamilyRecord, parseFamilyMember, recordKey, validateEvent, validateTodo, validateShareURL, type FamilyMember, type FamilySnapshot, type RecordAddress, type SharedEventInput, type SharedTodoInput } from './records';

export const FAMILY_CONTAINER = 'iCloud.app.rhythm.daily.family';
export type FamilyResult<T> = { ok: true; value: T } | { ok: false; code: 'unavailable' | 'failed'; message: string };
type Adapter = { perform(operation: string, json: string): Promise<string>; presentInvite(json: string): Promise<void>; addListener(event: string, listener: () => void): { remove(): void } };
export function createFamilySharing(adapter: Adapter | null) {
  async function call<T>(operation: string, args: unknown = {}): Promise<FamilyResult<T>> {
    if (!adapter) return { ok: false, code: 'unavailable', message: 'Family sharing is unavailable on this build/platform.' };
    try {
      const reply = JSON.parse(await adapter.perform(operation, JSON.stringify(args)));
      if (reply.unavailable) return { ok: false, code: 'unavailable', message: 'iCloud is unavailable.' };
      return { ok: true, value: reply as T };
    } catch { return { ok: false, code: 'failed', message: 'Family sharing operation failed. Personal data is unchanged.' }; }
  }
  return {
    availability: () => call<{ available: boolean }>('availability'),
    initialize: () => call<{ available: boolean }>('initialize'),
    async snapshot(): Promise<FamilyResult<FamilySnapshot>> {
      const result = await call<FamilySnapshot>('snapshot');
      if (!result.ok) return result;
      try {
        if (!Array.isArray(result.value.records) || !Array.isArray(result.value.syncStates) || !Array.isArray(result.value.access) || typeof result.value.userId !== 'string' || !Number.isSafeInteger(result.value.pendingCount)) throw Error();
        const records = result.value.records.map(parseFamilyRecord);
        if (new Set(records.map(recordKey)).size !== records.length) throw Error('Duplicate records');
        return { ok: true, value: { ...result.value, records } };
      } catch { return { ok: false, code: 'failed', message: 'Invalid family snapshot.' }; }
    },
    createGroup: (name: string, displayName: string, color: string) => {
      if (!name.trim() || name.length > 100 || !displayName.trim() || displayName.length > 100 || !/^#[0-9a-f]{6}$/i.test(color)) throw Error('Invalid group/profile');
      return call<RecordAddress>('createGroup', { name: name.trim(), displayName: displayName.trim(), color });
    },
    async members(group: RecordAddress): Promise<FamilyResult<FamilyMember[]>> {
      const result = await call<FamilyMember[]>('members', { group });
      if (!result.ok) return result;
      try { return { ok: true, value: result.value.map(parseFamilyMember) }; }
      catch { return { ok: false, code: 'failed', message: 'Invalid family participants.' }; }
    },
    setProfile: (group: RecordAddress, displayName: string, color: string) => {
      if (!displayName.trim() || displayName.length > 100 || !/^#[0-9a-f]{6}$/i.test(color)) throw Error('Invalid profile');
      return call<RecordAddress>('setProfile', { group, displayName: displayName.trim(), color });
    },
    setMemberProfile: (group: RecordAddress, userId: string, displayName: string, color: string) => {
      if (!userId || !displayName.trim() || displayName.length > 100 || !/^#[0-9a-f]{6}$/i.test(color)) throw Error('Invalid member profile');
      return call<RecordAddress>('setMemberProfile', { group, userId, displayName: displayName.trim(), color });
    },
    saveEvent: (group: RecordAddress, event: SharedEventInput) => call<RecordAddress>('saveEvent', { group, input: validateEvent(event) }),
    saveTodo: (group: RecordAddress, todo: SharedTodoInput) => call<RecordAddress>('saveTodo', { group, input: validateTodo(todo) }),
    removeRecord: (record: RecordAddress) => call<boolean>('removeRecord', { record }),
    leaveGroup: (group: RecordAddress) => call<boolean>('leaveGroup', { group }),
    stopGroup: (group: RecordAddress) => call<boolean>('stopGroup', { group }),
    acceptURL: (url: string) => call<boolean>('acceptURL', { url: validateShareURL(url) }),
    sync: () => call<boolean>('sync'),
    async presentInvite(group: RecordAddress): Promise<FamilyResult<boolean>> {
      if (!adapter) return { ok: false, code: 'unavailable', message: 'Family sharing is unavailable.' };
      try { await adapter.presentInvite(JSON.stringify(group)); return { ok: true, value: true }; }
      catch { return { ok: false, code: 'failed', message: 'Could not present family invitation.' }; }
    },
    subscribe(listener: () => void) {
      if (!adapter) return { remove() {} };
      try { return adapter.addListener('onFamilyChange', listener); } catch { return { remove() {} }; }
    },
  };
}
let nativeAdapter: Adapter | null = null;
if (Platform.OS === 'ios') { try { nativeAdapter = requireOptionalNativeModule<Adapter>('RhythmFamily'); } catch { /* Native module absent: no-op. */ } }
export const familySharing = createFamilySharing(nativeAdapter);
