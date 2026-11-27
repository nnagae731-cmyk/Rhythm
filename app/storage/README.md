# Root state persistence

- `rhythmStorage.ts` retains the existing storage key, format and serial write queue.
- `useRhythmPersistence.ts` owns the 80ms save debounce, background flush, failure/retry state and save waiters. Hydration and root snapshot fields remain in `App.tsx`.
- `createSnapshot` runs only after hydration and creates a fresh snapshot on every save attempt, including retries. Snapshot identity guards and time-dependent normalization retain their original behavior.
- Settings predicates and exact Wish-state references identify save waiters. Superseded requests reject; successful disk writes alone settle receipts and update `savedJournalMonths`.
- Read-failure protection prevents writes until recovery. Native background execution still requires iPhone verification; Jest and JS export do not verify OS lifecycle behavior.
