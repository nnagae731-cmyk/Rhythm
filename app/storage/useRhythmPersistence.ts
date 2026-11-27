import React, { useEffect, useState } from 'react';
import { Alert, AppState } from 'react-native';
import type { PersistedState, WishMonthMap } from '../types';
import { saveRhythmState } from './rhythmStorage';

export type RhythmPersistenceDeps = {
  hydrated: boolean;
  hydratedRef: React.RefObject<boolean>;
  // Build after hydration and afresh on retries: completion guards use snapshot identity.
  createSnapshot: () => PersistedState;
  wishMonths: WishMonthMap;
  setSavedJournalMonths: React.Dispatch<React.SetStateAction<WishMonthMap>>;
};

export function useRhythmPersistence(deps: RhythmPersistenceDeps) {
  const { hydrated, hydratedRef, createSnapshot, wishMonths, setSavedJournalMonths } = deps;

  const persistenceDisabledRef = React.useRef(false);

  const saveFailureNotifiedRef = React.useRef(false);

  const [persistenceIssue, setPersistenceIssue] = useState<'read' | 'write' | undefined>(undefined);

  const [hydrationRetry, setHydrationRetry] = useState(0);

  const [saveRetry, setSaveRetry] = useState(0);

  const [persistenceRetrying, setPersistenceRetrying] = useState(false);

  const persistenceTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const latestPersistedStateRef = React.useRef<PersistedState | undefined>(undefined);

  const latestPersistedWishMonthsRef = React.useRef<WishMonthMap | undefined>(undefined);

  const pendingWishSavesRef = React.useRef<Array<{ expected?: WishMonthMap; resolve: () => void; reject: (error: Error) => void }>>([]);

  const pendingSettingsSavesRef = React.useRef<Array<{ matches: (state: PersistedState) => boolean; resolve: () => void; reject: (error: Error) => void }>>([]);

  const waitForSettingsSave = (matches: (state: PersistedState) => boolean) => new Promise<void>((resolve, reject) => {
    if (!hydratedRef.current || persistenceDisabledRef.current) { reject(new Error('保存データを確認できません')); return; }
    pendingSettingsSavesRef.current.push({ matches, resolve, reject });
  });

  const settleSettingsSave = (state: PersistedState, error?: unknown, snapshotPending = pendingSettingsSavesRef.current) => {
    const pending = snapshotPending.filter((item) => pendingSettingsSavesRef.current.includes(item) && item.matches(state));
    pendingSettingsSavesRef.current = pendingSettingsSavesRef.current.filter((item) => !pending.includes(item));
    pending.forEach((item) => error ? item.reject(error instanceof Error ? error : new Error('保存に失敗しました')) : item.resolve());
  };

  useEffect(() => {
    if (!hydrated) return;
    const state = createSnapshot();
    latestPersistedStateRef.current = state;
    latestPersistedWishMonthsRef.current = wishMonths;
    if (persistenceDisabledRef.current) return;
    const supersededSettingsSaves = pendingSettingsSavesRef.current.filter((item) => !item.matches(state));
    pendingSettingsSavesRef.current = pendingSettingsSavesRef.current.filter((item) => !supersededSettingsSaves.includes(item));
    supersededSettingsSaves.forEach((item) => item.reject(new Error('保存中に設定が変更されました。もう一度お試しください。')));
    const supersededWishSaves = pendingWishSavesRef.current.filter((item) => item.expected && item.expected !== wishMonths);
    pendingWishSavesRef.current = pendingWishSavesRef.current.filter((item) => !supersededWishSaves.includes(item));
    supersededWishSaves.forEach((item) => item.reject(new Error('保存中にデータが変更されました。もう一度お試しください。')));
    if (persistenceTimerRef.current) clearTimeout(persistenceTimerRef.current);
    persistenceTimerRef.current = setTimeout(() => {
      persistenceTimerRef.current = undefined;
      const pendingForSnapshot = pendingWishSavesRef.current.filter((item) => item.expected === wishMonths);
      const pendingSettingsForSnapshot = pendingSettingsSavesRef.current.filter((item) => item.matches(state));
      void saveRhythmState(state).then(() => {

        setSavedJournalMonths(state.wishMonths ?? {});
        if (!persistenceDisabledRef.current && latestPersistedStateRef.current === state) { setPersistenceIssue(undefined); setPersistenceRetrying(false); saveFailureNotifiedRef.current = false; }
        settleSettingsSave(state, undefined, pendingSettingsForSnapshot);
        const unsettled = pendingForSnapshot.filter((item) => pendingWishSavesRef.current.includes(item));
        pendingWishSavesRef.current = pendingWishSavesRef.current.filter((item) => !unsettled.includes(item));
        unsettled.forEach((item) => item.resolve());
      }).catch((error) => {
        if (!persistenceDisabledRef.current) { setPersistenceIssue('write'); setPersistenceRetrying(false); }
        settleSettingsSave(state, error, pendingSettingsForSnapshot);
        const unsettled = pendingForSnapshot.filter((item) => pendingWishSavesRef.current.includes(item));
        pendingWishSavesRef.current = pendingWishSavesRef.current.filter((item) => !unsettled.includes(item));
        unsettled.forEach((item) => item.reject(error instanceof Error ? error : new Error('保存に失敗しました')));
        console.warn('Rhythm state save failed.', error);
        if (!saveFailureNotifiedRef.current) {
          saveFailureNotifiedRef.current = true;
          Alert.alert('保存できませんでした', '空き容量や端末の設定を確認して、もう一度お試しください。');
        }
      });
    }, 80);
    return () => {
      if (persistenceTimerRef.current) clearTimeout(persistenceTimerRef.current);
    };
  }, [hydrated, createSnapshot, wishMonths, saveRetry]);

  useEffect(() => {
    if (!hydrated) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'inactive' && nextState !== 'background') return;
      if (persistenceTimerRef.current) {
        clearTimeout(persistenceTimerRef.current);
        persistenceTimerRef.current = undefined;
      }
      const pending = latestPersistedStateRef.current;
      if (pending && !persistenceDisabledRef.current) {
        const pendingForSnapshot = pendingWishSavesRef.current.filter((item) => item.expected === latestPersistedWishMonthsRef.current);
        const pendingSettingsForSnapshot = pendingSettingsSavesRef.current.filter((item) => item.matches(pending));
        void saveRhythmState(pending).then(() => {

          setSavedJournalMonths(pending.wishMonths ?? {});
          if (!persistenceDisabledRef.current && latestPersistedStateRef.current === pending) { setPersistenceIssue(undefined); setPersistenceRetrying(false); saveFailureNotifiedRef.current = false; }
          settleSettingsSave(pending, undefined, pendingSettingsForSnapshot);
          const unsettled = pendingForSnapshot.filter((item) => pendingWishSavesRef.current.includes(item));
          pendingWishSavesRef.current = pendingWishSavesRef.current.filter((item) => !unsettled.includes(item));
          unsettled.forEach((item) => item.resolve());
        }).catch((error) => {
          if (!persistenceDisabledRef.current) { setPersistenceIssue('write'); setPersistenceRetrying(false); }
          settleSettingsSave(pending, error, pendingSettingsForSnapshot);
          const unsettled = pendingForSnapshot.filter((item) => pendingWishSavesRef.current.includes(item));
          pendingWishSavesRef.current = pendingWishSavesRef.current.filter((item) => !unsettled.includes(item));
          unsettled.forEach((item) => item.reject(error instanceof Error ? error : new Error('保存に失敗しました')));
          console.warn('Rhythm background save failed.', error);
        });
      }
    });
    return () => subscription.remove();
  }, [hydrated]);

  return { persistenceDisabledRef, persistenceIssue, setPersistenceIssue, hydrationRetry, setHydrationRetry, setSaveRetry, persistenceRetrying, setPersistenceRetrying, pendingWishSavesRef, latestPersistedStateRef, waitForSettingsSave };
}
