import React, { useEffect } from 'react';
import { AppState, Keyboard, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adoptRemoteRhythmState, getLocalStateWriteVersion, readCommittedRhythmStateBody } from '../../storage/rhythmStorage';
import { ICLOUD_STATE_SYNC_ENABLED, ICLOUD_STATE_BODY_KEY, ICLOUD_STATE_META_KEY, isICloudStateSyncAvailable, readICloudStateValue, subscribeToICloudStateChanges } from './icloudStateSync';
import { cancelPendingICloudUpload, installICloudUploadCoordinator, queuePreparedICloudStateUpload } from './icloudStateUpload';
import { createStateSyncCoordinator, LOCAL_SYNC_META_KEY, type SyncView } from './stateSyncCoordinator';

let localMetaWrites: Promise<void> = Promise.resolve();

export function readRemoteICloudSnapshot(): unknown {
  const before = readICloudStateValue(ICLOUD_STATE_META_KEY, true);
  const body = readICloudStateValue(ICLOUD_STATE_BODY_KEY, true);
  const after = readICloudStateValue(ICLOUD_STATE_META_KEY, true);
  if (body === null && before === null && after === null) return null;
  if (before !== after || body === null || after === null) return { invalid: true };
  try { return { body, meta: JSON.parse(after) }; } catch { return { invalid: true }; }
}

export function useICloudStateSync({ hydrated, blocked, epoch, loadedMissing, hadPendingActions, snapshot, onRehydrate }: { hydrated: boolean; blocked: boolean; epoch: number; loadedMissing?: boolean; hadPendingActions: boolean; snapshot: () => unknown; onRehydrate: () => void }) {
  const body = React.useMemo(() => { try { return hydrated ? JSON.stringify(snapshot()) : null; } catch { return null; } }, [hydrated, snapshot]);
  const keyboard = React.useRef(false);
  const idleUntil = React.useRef(0);
  const initial = React.useRef<{ epoch: number; body: string | null }>({ epoch: -1, body: null });
  if (hydrated && initial.current.epoch !== epoch) initial.current = { epoch, body };
  const view = React.useRef<SyncView>({ hydrated, blocked, body, epoch, initialBody: initial.current.body, hadPendingActions, idleUntil: 0 });
  view.current = { hydrated, blocked, body, epoch, loadedMissing, initialBody: initial.current.body, hadPendingActions, idleUntil: idleUntil.current };
  const rehydrate = React.useRef(onRehydrate); rehydrate.current = onRehydrate;
  const control = React.useRef<ReturnType<typeof createStateSyncCoordinator> | undefined>(undefined);
  const ensureRef = React.useRef<() => void>(() => {});
  useEffect(() => {
    if (!ICLOUD_STATE_SYNC_ENABLED || Platform.OS !== 'ios') return;
    let unsubscribe: (() => void) | undefined;
    let subscription: { remove(): void } | undefined;
    let subscribed = false;
    const ensure = () => {
      // Track local clocks even while signed out/offline; never guess an
      // offline edit's timestamp later when iCloud becomes available again.
      if (!control.current) {
        const machine = createStateSyncCoordinator({
          view: () => ({ ...view.current, blocked: view.current.blocked || keyboard.current, idleUntil: idleUntil.current }),
          available: isICloudStateSyncAvailable,
          readBody: readCommittedRhythmStateBody,
          readMeta: async () => { await localMetaWrites; return AsyncStorage.getItem(LOCAL_SYNC_META_KEY); },
          writeMeta: meta => {
            const write = localMetaWrites.then(() => AsyncStorage.setItem(LOCAL_SYNC_META_KEY, meta));
            localMetaWrites = write.catch(() => undefined);
            return write;
          },
          readRemote: readRemoteICloudSnapshot,
          version: getLocalStateWriteVersion,
          adopt: adoptRemoteRhythmState,
          upload: queuePreparedICloudStateUpload,
          cancelUpload: cancelPendingICloudUpload,
          rehydrate: () => rehydrate.current(),
        });
        control.current = machine;
        unsubscribe = installICloudUploadCoordinator(machine.onLocalSave);
        machine.start();
      }
      const available = isICloudStateSyncAvailable();
      if (available && !subscribed) {
        subscription = subscribeToICloudStateChanges(() => control.current?.requestCheck());
        subscribed = true;
      } else if (!available && subscribed) {
        subscription?.remove(); subscribed = false;
      }
      control.current?.requestCheck();
    };
    ensureRef.current = ensure;
    ensure();
    const active = AppState.addEventListener('change', state => { if (state === 'active') ensure(); });
    const show = () => { keyboard.current = true; control.current?.requestCheck(); };
    const hide = () => { keyboard.current = false; control.current?.requestCheck(); };
    const keys = [Keyboard.addListener('keyboardWillShow', show), Keyboard.addListener('keyboardDidShow', show), Keyboard.addListener('keyboardDidHide', hide)];
    return () => { control.current?.stop(); control.current = undefined; unsubscribe?.(); subscription?.remove(); active.remove(); keys.forEach(key => key.remove()); ensureRef.current = () => {}; };
  }, []);
  useEffect(() => { ensureRef.current(); }, [body, blocked, hydrated, epoch]);
  return React.useCallback(() => { idleUntil.current = Date.now() + 1_000; control.current?.requestCheck(); }, []);
}
