jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const storage = require('@react-native-async-storage/async-storage');
const crypto = require('crypto');
const { resolveSyncDecision: decide, validatedRemote } = require('../features/sync/resolveSyncDecision');
const { syncBodyHash, utf8ByteLength } = require('../features/sync/syncCodec');
const { createStateSyncCoordinator } = require('../features/sync/stateSyncCoordinator');
const { adoptRemoteRhythmState, saveRhythmState, loadRhythmState, PRE_SYNC_BACKUP_KEY } = require('../storage/rhythmStorage');
const { STORAGE_KEY } = require('../storage/rhythmState');
const originalSet = storage.setItem.getMockImplementation();
const body = title => JSON.stringify({ tasks: title ? [{ id: title, title, done: false }] : [], wishMonths: {} });
const remote = (text = body('remote'), updatedAt = 20) => ({ body: text, meta: { updatedAt, deviceId: 'other-device', bodyBytes: Buffer.byteLength(text), bodyHash: crypto.createHash('sha256').update(text).digest('hex') } });
beforeEach(async () => { storage.setItem.mockReset().mockImplementation(originalSet); await storage.clear(); jest.spyOn(console, 'warn').mockImplementation(() => {}); jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test.each([
  [{ body: body('local'), updatedAt: 10 }, null, 'upload', 'remote-missing'],
  [{ body: null, updatedAt: 0 }, null, 'keep', 'remote-missing'],
  [{ body: null, updatedAt: 0 }, remote(), 'adopt', 'local-missing'],
  [{ body: body('local'), updatedAt: 10 }, remote(), 'adopt', 'remote-newer'],
  [{ body: body('local'), updatedAt: 30 }, remote(), 'upload', 'local-newer'],
  [{ body: body('local'), updatedAt: 20 }, remote(), 'keep', 'same-time'],
  [{ body: body('local'), updatedAt: 10 }, remote(body('')), 'keep', 'empty-remote-protected'],
  [{ body: body(''), updatedAt: 10 }, remote(body('')), 'adopt', 'remote-newer'],
  [{ body: body('local'), updatedAt: 30 }, remote(body('')), 'upload', 'local-newer'],
  [{ body: body('local'), updatedAt: 10, dirty: true }, remote(), 'defer', 'unsaved-or-editing'],
  [{ body: body('local'), updatedAt: 10, backupFailed: true }, remote(), 'keep', 'backup-failed'],
])('純粋判定 %s -> %s', (local, incoming, action, reason) => { expect(decide(local, incoming)).toEqual({ action, reason }); });
test.each([
  null, [], {}, { updatedAt: NaN, deviceId: 'x', bodyBytes: 2 }, { updatedAt: -1, deviceId: 'x', bodyBytes: 2 }, { updatedAt: 2, deviceId: '', bodyBytes: 2 }, { updatedAt: '2', deviceId: 'x', bodyBytes: 2 }, { updatedAt: 2, deviceId: 'x', bodyBytes: 900001 },
])('不正metaを採用しない %p', meta => {
  expect(decide({ body: null, updatedAt: 0 }, { body: '{}', meta }).action).toBe('keep');
});
test.each(['null', '[]', '3', '"text"', '{bad', '{"tasks":"bad"}', '{"tasks":[null]}', '{"tasks":[{"id":"x"}]}', '{"photoTheme":[]}', '{"wishMonths":{"2026-01":null}}'])('不正bodyを採用しない %s', invalid => {
  expect(decide({ body: null, updatedAt: 0 }, remote(invalid)).action).toBe('keep');
});
test('同じbyte数の別bodyでもhash不一致は採用しない', () => {
  const incoming = remote(body('aaaa')); incoming.body = body('bbbb');
  expect(Buffer.byteLength(incoming.body)).toBe(incoming.meta.bodyBytes);
  expect(validatedRemote(incoming)).toBeNull();
});
test('旧hashなしmetaは採用せず、より新しいローカルなら新形式へ送信できる', () => {
  const incoming = remote(); delete incoming.meta.bodyHash;
  expect(decide({ body: null, updatedAt: 0 }, incoming).action).toBe('keep');
  expect(decide({ body: body('local'), updatedAt: 30 }, incoming).action).toBe('upload');
});
test.each(['', 'abc', '日本語🌸', '\uD800', 'a'.repeat(900000)])('SHA-256/UTF-8がNodeの実装と一致する #%#', value => {
  expect(syncBodyHash(value)).toBe(crypto.createHash('sha256').update(value).digest('hex'));
  expect(utf8ByteLength(value)).toBe(Buffer.byteLength(value));
});
test.each([
  { wishMonths: { m: { review: { memo: '日記' } } } },
  { wishMonths: { m: { reviews: [{ photos: ['file:///saved'] }] } } },
  { wishMonths: { m: { wishes: [{ id: 'w', title: 'wish' }] } } },
  { routineArchives: [{ routineId: 'r' }] }, { focusSessions: [{ id: 'f' }] }, { plan: { title: '予定' } },
])('実データは空remoteから保護する %p', state => {
  expect(decide({ body: JSON.stringify(state), updatedAt: 10 }, remote(body(''))).reason).toBe('empty-remote-protected');
});

test('退避成功→既存queue書込み→ロードの順で、元JSONを一世代そのまま残す', async () => {
  const previous = body('local'), incoming = body('remote'); await storage.setItem(STORAGE_KEY, previous);
  const calls = []; const original = storage.setItem.getMockImplementation();
  jest.spyOn(storage, 'setItem').mockImplementation(async (key, value) => { calls.push(key); return original(key, value); });
  expect(await adoptRemoteRhythmState(previous, incoming, () => true)).toBe('adopted');
  expect(calls).toEqual([PRE_SYNC_BACKUP_KEY, STORAGE_KEY]);
  expect(await storage.getItem(PRE_SYNC_BACKUP_KEY)).toBe(previous);
  expect((await loadRhythmState()).tasks[0].title).toBe('remote');
});
test('退避失敗ではmainを書かない', async () => {
  const previous = body('local'); await storage.setItem(STORAGE_KEY, previous);
  jest.spyOn(storage, 'setItem').mockRejectedValueOnce(Error('backup'));
  expect(await adoptRemoteRhythmState(previous, body('remote'), () => true)).toBe('backup-failed');
  expect(await storage.getItem(STORAGE_KEY)).toBe(previous);
});
test('新端末の無データはnullとして退避し、不正remoteは書込み前に拒否', async () => {
  expect(await adoptRemoteRhythmState(null, body('remote'), () => true)).toBe('adopted');
  expect(await storage.getItem(PRE_SYNC_BACKUP_KEY)).toBe('null');
  await expect(adoptRemoteRhythmState(body('remote'), '[]', () => true)).rejects.toThrow();
});
test('比較後にlocalが変わればCASで拒否する', async () => {
  await storage.setItem(STORAGE_KEY, body('changed'));
  expect(await adoptRemoteRhythmState(body('old'), body('remote'), () => true)).toBe('changed');
  expect(await storage.getItem(PRE_SYNC_BACKUP_KEY)).toBeNull();
});
test('退避中に編集中となったらmainを書かない', async () => {
  const previous = body('local'); await storage.setItem(STORAGE_KEY, previous);
  let allowed = true; const original = storage.setItem.getMockImplementation();
  jest.spyOn(storage, 'setItem').mockImplementation(async (key, value) => { await original(key, value); if (key === PRE_SYNC_BACKUP_KEY) allowed = false; });
  expect(await adoptRemoteRhythmState(previous, body('remote'), () => allowed)).toBe('blocked');
  expect(await storage.getItem(STORAGE_KEY)).toBe(previous);
});
test('main書込み中に編集が始まってもqueue内で元へ戻してhydrateしない', async () => {
  const previous = body('local'); await storage.setItem(STORAGE_KEY, previous);
  let allowed = true; const original = storage.setItem.getMockImplementation();
  jest.spyOn(storage, 'setItem').mockImplementation(async (key, value) => { await original(key, value); if (key === STORAGE_KEY && value === body('remote')) allowed = false; });
  expect(await adoptRemoteRhythmState(previous, body('remote'), () => allowed)).toBe('blocked');
  expect(await storage.getItem(STORAGE_KEY)).toBe(previous);
});
test('remoteの書込み失敗で元mainとbackupが残る', async () => {
  const previous = body('local'); await storage.setItem(STORAGE_KEY, previous);
  const original = storage.setItem.getMockImplementation();
  jest.spyOn(storage, 'setItem').mockImplementation((key, value) => key === STORAGE_KEY ? Promise.reject(Error('disk')) : original(key, value));
  expect(await adoptRemoteRhythmState(previous, body('remote'), () => true)).toBe('write-failed');
  expect(await storage.getItem(STORAGE_KEY)).toBe(previous); expect(await storage.getItem(PRE_SYNC_BACKUP_KEY)).toBe(previous);
});
test('同時のローカル保存を追い越してremoteを書かない', async () => {
  const previous = body('old'); await storage.setItem(STORAGE_KEY, previous);
  const adopting = adoptRemoteRhythmState(previous, body('remote'), () => true);
  const saving = saveRhythmState({ tasks: [{ id: 'latest', title: 'latest', done: false }] });
  expect(await adopting).toBe('changed'); await saving;
  expect((await loadRhythmState()).tasks[0].title).toBe('latest');
});

function machineFixture({ initial = body('local'), at = 10, incoming = remote(), missingMeta = false, badMeta = false } = {}) {
  jest.useFakeTimers().setSystemTime(1000);
  let disk = initial, meta = initial === null || missingMeta ? null : JSON.stringify({ updatedAt: at, bodyHash: syncBodyHash(badMeta ? 'wrong' : initial) });
  let version = 0;
  const view = { hydrated: true, blocked: false, body: initial ?? body(''), initialBody: initial ?? body(''), epoch: 0, hadPendingActions: false, idleUntil: 0 };
  const io = { view: () => view, available: jest.fn(() => true), readBody: jest.fn(async () => disk), readMeta: jest.fn(async () => meta), writeMeta: jest.fn(async text => { meta = text; }), readRemote: jest.fn(() => incoming), version: () => version, adopt: jest.fn(async (expected, next, guard) => { if (!guard()) return 'blocked'; if (disk !== expected) return 'changed'; disk = next; return 'adopted'; }), upload: jest.fn(), cancelUpload: jest.fn(), rehydrate: jest.fn() };
  const machine = createStateSyncCoordinator(io); machine.start();
  return { io, view, machine, commit(text = view.body, time = Date.now()) { disk = text; view.body = text; version++; machine.onLocalSave(text, time); }, async tick(ms = 600) { await jest.advanceTimersByTimeAsync(ms); }, disk: () => disk };
}
test('起動normalizationは更新時刻を勝手に新しくせず、remoteを退避採用してhydrateする', async () => {
  const f = machineFixture(); f.commit(); await f.tick();
  expect(f.io.adopt).toHaveBeenCalledTimes(1); expect(f.io.rehydrate).toHaveBeenCalledTimes(1); expect(f.disk()).toBe(body('remote')); expect(f.io.upload).not.toHaveBeenCalled();
  f.machine.stop();
});
test('新端末の初回自動保存よりremoteを優先する', async () => {
  const f = machineFixture({ initial: null }); f.commit(); await f.tick();
  expect(f.io.rehydrate).toHaveBeenCalledTimes(1); expect(f.disk()).toBe(body('remote')); f.machine.stop();
});
test('KVS更新は編集中は保留し、解除後に判定する', async () => {
  const f = machineFixture(); f.view.blocked = true; f.commit(); await f.tick(); expect(f.io.adopt).not.toHaveBeenCalled();
  f.view.blocked = false; f.machine.requestCheck(); await f.tick(); expect(f.io.adopt).toHaveBeenCalledTimes(1); f.machine.stop();
});
test('未保存のviewは保留し、ローカル成功後は新しいlocalの時刻を使う', async () => {
  const f = machineFixture(); f.commit(); f.view.body = body('editing'); await f.tick(); expect(f.io.adopt).not.toHaveBeenCalled();
  f.commit(); await f.tick(); expect(f.io.adopt).not.toHaveBeenCalled(); expect(f.io.upload).toHaveBeenCalledWith(body('editing'), expect.any(Number)); f.machine.stop();
});
test('退避失敗ではhydrateもuploadもしない', async () => {
  const f = machineFixture(); f.io.adopt.mockResolvedValue('backup-failed'); f.commit(); await f.tick();
  expect(f.io.rehydrate).not.toHaveBeenCalled(); expect(f.io.upload).not.toHaveBeenCalled(); f.machine.stop();
});
test('空remote保護とhash不一致ではlocalを保持する', async () => {
  const f = machineFixture({ incoming: remote(body('')) }); f.commit(); await f.tick(); expect(f.io.adopt).not.toHaveBeenCalled(); expect(f.io.upload).not.toHaveBeenCalled(); f.machine.stop();
  const broken = remote(); broken.body = body('broken');
  const g = machineFixture({ incoming: broken }); g.commit(); await g.tick(); expect(g.io.adopt).not.toHaveBeenCalled(); expect(g.io.upload).not.toHaveBeenCalled(); g.machine.stop();
});
test('旧ローカル更新時刻が不明なら初回はlocal優先で新しいメタを保存する', async () => {
  const f = machineFixture({ missingMeta: true }); f.commit(); await f.tick();
  expect(f.io.adopt).not.toHaveBeenCalled(); expect(f.io.upload).toHaveBeenCalledWith(body('local'), 1000); expect(f.io.writeMeta).toHaveBeenCalled(); f.machine.stop();
});
test('remote無しはlocalを送信し、読込エラーでは送らない', async () => {
  const f = machineFixture({ incoming: null }); f.commit(); await f.tick(); expect(f.io.upload).toHaveBeenCalledWith(body('local'), 10); f.machine.stop();
  const g = machineFixture(); g.io.readBody.mockRejectedValueOnce(Error('read')); g.commit(); await g.tick(); expect(g.io.upload).not.toHaveBeenCalled(); expect(g.io.adopt).not.toHaveBeenCalled(); g.machine.stop();
});
test('採用後normalizationはremote時刻を維持し、古いview/同時刻でping-pongしない', async () => {
  const f = machineFixture(); f.commit(); await f.tick();
  f.view.epoch = 1; f.view.initialBody = f.disk(); f.commit(f.disk()); f.machine.requestCheck(); await f.tick();
  expect(f.io.adopt).toHaveBeenCalledTimes(1); expect(f.io.upload).not.toHaveBeenCalled(); f.machine.stop();
});
test('一時的な画面変更で予約を取り消した後もアップロードを再予約できる', async () => {
  const f = machineFixture({ incoming: null }); f.commit(); await f.tick(); expect(f.io.upload).toHaveBeenCalledTimes(1);
  f.machine.requestCheck(); await f.tick(); expect(f.io.upload).toHaveBeenCalledTimes(1);
  f.io.cancelUpload.mockReturnValueOnce(true); f.machine.requestCheck(); await f.tick(); expect(f.io.upload).toHaveBeenCalledTimes(2); f.machine.stop();
});
test('KVS読取り例外をremote無しと誤認してlocalで上書きしない', async () => {
  const f = machineFixture(); f.io.readRemote.mockImplementation(() => { throw Error('KVS read'); }); f.commit(); await f.tick();
  expect(f.io.adopt).not.toHaveBeenCalled(); expect(f.io.upload).not.toHaveBeenCalled(); f.machine.stop();
});
test('localメタと本文のhashが違う場合も未知時刻として安全側に保持する', async () => {
  const f = machineFixture({ badMeta: true });
  f.commit(); await f.tick(); expect(f.io.adopt).not.toHaveBeenCalled(); f.machine.stop();
});
test('TextEncoder無しでも日本語とemojiをSHA-256で結び付けられる', () => {
  const previous = global.TextEncoder;
  try { global.TextEncoder = undefined; expect(syncBodyHash('日🌸')).toBe(crypto.createHash('sha256').update('日🌸').digest('hex')); }
  finally { global.TextEncoder = previous; }
});
