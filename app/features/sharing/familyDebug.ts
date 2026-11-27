import type { FamilyResult } from './familySharing';
import type { RecordAddress } from './records';

export type FamilyDebugAdapter = { perform(operation: string, json: string): Promise<string> };
type Diagnostics = { conflicts: number; permissionFailures: number; automaticallySync?: boolean };
type PermissionProbe = { serverRejected: boolean; cloudKitErrorCode?: number; unexpectedWrite: boolean; cleanupSucceeded?: boolean };

// Explicit debug opt-in in JS AND #if DEBUG in Native. No private-state access.
export function createFamilyDebugTools(adapter: FamilyDebugAdapter | null, enabled: boolean) {
  async function call<T>(operation: string, args: unknown = {}): Promise<FamilyResult<T>> {
    if (!enabled || !adapter) return { ok: false, code: 'unavailable', message: 'Family QA tools are disabled.' };
    try {
      const value = JSON.parse(await adapter.perform(operation, JSON.stringify(args)));
      if (value?.unavailable === true) return { ok: false, code: 'unavailable', message: 'iCloud is unavailable.' };
      return { ok: true, value: value as T };
    }
    catch { return { ok: false, code: 'failed', message: 'Family QA operation failed.' }; }
  }
  return {
    setAutomaticSync: (enabled: boolean) => call<{ automaticallySync: boolean }>('debugSetAutomaticSync', { enabled }),
    sendPending: () => call<Diagnostics>('debugSendPending'),
    diagnostics: () => call<Diagnostics>('debugDiagnostics'),
    probeReadOnlyWrite: (group: RecordAddress) => call<PermissionProbe>('debugProbeReadOnlyWrite', { group }),
  };
}
