import { familySharing } from './familySharing';
// Explicit opt-in only, no screens/buttons/sample data in production.
if (__DEV__ && process.env.EXPO_PUBLIC_RHYTHM_SHARING_DEBUG === '1') {
  (globalThis as typeof globalThis & { rhythmFamily?: typeof familySharing }).rhythmFamily = familySharing;
  console.info('[Family] Dev console: globalThis.rhythmFamily (no records are created automatically).');
}
