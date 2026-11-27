import { hasSyncUserData, resolveSyncDecision, validatedRemote, type LocalSyncSnapshot } from './resolveSyncDecision';
import { syncBodyHash } from './syncCodec';

export const LOCAL_SYNC_META_KEY = 'rhythm-state-local-sync-meta-v1';
export type SyncView = {
  hydrated: boolean; blocked: boolean; body: string | null;
  epoch: number; initialBody: string | null; hadPendingActions: boolean; idleUntil: number;
  loadedMissing?: boolean;
};
export type StateSyncIO = {
  view(): SyncView;
  available(): boolean;
  readBody(): Promise<string | null>;
  readMeta(): Promise<string | null>;
  writeMeta(meta: string): Promise<void>;
  readRemote(): unknown;
  version(): number;
  adopt(expected: string | null, body: string, guard: () => boolean): Promise<string>;
  upload(body: string, updatedAt: number): void;
  cancelUpload(): boolean | void;
  rehydrate(): void;
};

/** No UI or Native dependencies: ordering/adoption rules are testable with IO fakes. */
export function createStateSyncCoordinator(io: StateSyncIO) {
  let stopped = false;
  let initialized = false;
  let initializing: Promise<void> | undefined;
  let local: LocalSyncSnapshot = { body: null, updatedAt: 0 };
  let committedViewBody: string | null = null;
  let pendingSave: { body: string; at: number; normalization: boolean } | undefined;
  let saveEpoch: number | undefined;
  let normalizationToUpload = false;
  let checking = false;
  let rerun = false;
  let awaitingHydration: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let metadataQueue: Promise<void> = Promise.resolve();
  let requestVersion = 0;
  let lastUpload = '';
  let lastReason = '';

  function persistMeta() {
    const captured = { ...local };
    if (captured.body === null) return;
    metadataQueue = metadataQueue.then(() => io.writeMeta(JSON.stringify({ updatedAt: captured.updatedAt, bodyHash: syncBodyHash(captured.body!) }))).catch(error => {
      console.warn('[iCloud] Local sync metadata could not be saved. State data is unchanged.', error);
    });
  }
  function initialize(): Promise<void> {
    if (initialized) return Promise.resolve();
    if (!initializing) initializing = (async () => {
      const [body, rawMeta] = await Promise.all([io.readBody(), io.readMeta()]);
      if (stopped) return;
      const loadedMissing = io.view().loadedMissing === true;
      let updatedAt = body === null || loadedMissing ? 0 : Date.now();
      try {
        const meta = rawMeta && JSON.parse(rawMeta);
        if (body !== null && !loadedMissing && meta && Number.isSafeInteger(meta.updatedAt) && meta.updatedAt >= 0 && meta.bodyHash === syncBodyHash(body)) updatedAt = meta.updatedAt;
        else if (body !== null && !loadedMissing) console.warn('[iCloud] Unknown local save time; keeping existing data conservatively on first Phase C launch.');
      } catch { console.warn('[iCloud] Invalid local sync metadata; keeping local state conservatively.'); }
      local = { body, updatedAt };
      initialized = true;
      if (pendingSave) {
        const saved = pendingSave; pendingSave = undefined;
        applySave(saved.body, saved.at, saved.normalization);
      }
    })().finally(() => { initializing = undefined; });
    return initializing;
  }
  function applySave(body: string, at: number, normalization: boolean) {
    const changed = local.body !== body;
    normalizationToUpload ||= normalization && changed;
    local = { body, updatedAt: !changed || normalization ? local.updatedAt : at };
    persistMeta();
  }
  function onLocalSave(body: string, at: number) {
    if (stopped) return;
    const view = io.view();
    const normalization = saveEpoch !== view.epoch && body === view.initialBody && !(view.hadPendingActions && hasSyncUserData(body));
    saveEpoch = view.epoch;
    committedViewBody = body;
    lastUpload = '';
    if (!initialized) pendingSave = { body, at, normalization };
    else applySave(body, at, normalization);
    requestCheck();
  }
  function dirty(view: SyncView) {
    return !view.hydrated || view.blocked || view.body !== committedViewBody || Date.now() < view.idleUntil;
  }
  function requestCheck() {
    if (stopped) return;
    requestVersion += 1;
    if (io.cancelUpload()) lastUpload = '';
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => { timer = undefined; void check(); }, 250);
  }
  async function check() {
    if (stopped || !io.available()) return;
    if (checking) { rerun = true; return; }
    checking = true;
    try {
      await initialize();
      await metadataQueue;
      if (stopped || !initialized) return;
      const view = io.view();
      if (awaitingHydration !== undefined) {
        if (!view.hydrated || view.epoch === awaitingHydration) return;
        awaitingHydration = undefined;
      }
      if (dirty(view)) {
        if (view.hydrated && !view.blocked && Date.now() < view.idleUntil) {
          if (timer !== undefined) clearTimeout(timer);
          timer = setTimeout(() => { timer = undefined; void check(); }, view.idleUntil - Date.now() + 1);
        }
        return;
      }
      const actual = await io.readBody();
      if (stopped || dirty(io.view())) return;
      if (actual !== local.body) {
        // A writer outside this process/view cannot be assumed older.
        console.warn('[iCloud] Local disk changed during sync; deferred.');
        return;
      }
      const rawRemote = io.readRemote();
      const decision = resolveSyncDecision(local, rawRemote);
      const remote = validatedRemote(rawRemote);
      if (decision.reason !== lastReason && ['invalid-remote', 'empty-remote-protected', 'legacy-without-hash'].includes(decision.reason)) console.warn('[iCloud] Remote state not adopted.', { reason: decision.reason });
      lastReason = decision.reason;
      if (decision.action === 'adopt' && remote) {
        const version = io.version();
        const revision = requestVersion;
        const expectedView = committedViewBody;
        const remoteIdentity = JSON.stringify(rawRemote);
        const guard = () => {
          try { return !stopped && requestVersion === revision && io.version() === version && !dirty(io.view()) && io.view().body === expectedView && JSON.stringify(io.readRemote()) === remoteIdentity; }
          catch { return false; }
        };
        const result = await io.adopt(actual, remote.body, guard);
        if (result === 'adopted') {
          local = { body: remote.body, updatedAt: remote.meta.updatedAt };
          normalizationToUpload = false; lastUpload = '';
          persistMeta();
          awaitingHydration = view.epoch;
          io.rehydrate();
          if (__DEV__) console.log('[iCloud] Remote state adopted after backup.', { updatedAt: local.updatedAt, bodyBytes: remote.meta.bodyBytes });
        } else {
          console.warn('[iCloud] Remote adoption deferred/aborted.', { result });
          // A normal local save/view change will retry. No busy retry loop.
        }
      } else if (decision.action === 'upload' || (normalizationToUpload && decision.action === 'keep' && decision.reason === 'same-time' && remote?.meta.bodyHash)) {
        if (local.body === null) return;
        const signature = `${local.updatedAt}:${syncBodyHash(local.body)}:${JSON.stringify(rawRemote)}`;
        if (signature === lastUpload) return;
        lastUpload = signature;
        normalizationToUpload = false;
        io.upload(local.body, local.updatedAt);
      }
    } catch (error) { console.warn('[iCloud] Sync check failed; kept local state.', error); }
    finally {
      checking = false;
      if (rerun && !stopped) { rerun = false; requestCheck(); }
    }
  }
  return {
    start() { void initialize().then(requestCheck).catch(error => console.warn('[iCloud] Sync initialization deferred.', error)); },
    onLocalSave, requestCheck,
    stop() { stopped = true; io.cancelUpload(); if (timer !== undefined) clearTimeout(timer); },
  };
}
