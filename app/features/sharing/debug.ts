import { familySharing } from './familySharing';
import { requireOptionalNativeModule } from 'expo';
import { createFamilyDebugTools, type FamilyDebugAdapter } from './familyDebug';
// Explicit opt-in only, no screens/buttons/sample data in production.
if (__DEV__ && process.env.EXPO_PUBLIC_RHYTHM_SHARING_DEBUG === '1') {
  let adapter: FamilyDebugAdapter | null = null;
  try { adapter = requireOptionalNativeModule<FamilyDebugAdapter>('RhythmFamily'); } catch { /* Old binaries have no QA operations. */ }
  const api = { ...familySharing, debug: createFamilyDebugTools(adapter, true) };
  (globalThis as typeof globalThis & { rhythmFamily?: typeof api }).rhythmFamily = api;
  console.info('[Family] Dev console: globalThis.rhythmFamily (no records are created automatically).');
}
