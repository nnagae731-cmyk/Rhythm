import type { PersistedState } from '../types';

/** Same root validation for local load and remote adoption; no format migration. */
export function parseRhythmStateBody(raw: string): Partial<PersistedState> {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Rhythm storage has an unsupported root value.');
  return parsed as Partial<PersistedState>;
}
