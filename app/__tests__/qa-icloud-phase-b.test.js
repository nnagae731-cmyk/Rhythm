jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../features/sync/icloudStateSync', () => ({ ICLOUD_STATE_BODY_KEY: 'rhythm-state-body-v1', ICLOUD_STATE_META_KEY: 'rhythm-state-meta-v1', isICloudStateSyncAvailable: jest.fn(() => true), writeICloudStateValue: jest.fn(() => true), readICloudStateValue: jest.fn(), subscribeToICloudStateChanges: jest.fn() }));
let uploader, storage, cloud, save, key;
beforeEach(async () => {
  jest.resetModules();
  jest.doMock('../features/sync/syncConfig', () => ({ ICLOUD_STATE_SYNC_ENABLED: true }));
  jest.useFakeTimers().setSystemTime(new Date('2026-11-27T00:00:00Z'));
  storage = require('@react-native-async-storage/async-storage'); await storage.clear(); jest.clearAllMocks();
  cloud = require('../features/sync/icloudStateSync');
  uploader = require('../features/sync/icloudStateUpload');
  save = require('../storage/rhythmStorage').saveRhythmState;
  key = require('../storage/rhythmState').STORAGE_KEY;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); jest.dontMock('../features/sync/syncConfig'); });
const state = title => ({ tasks: [{ id: 'a', title, done: false }] });
const flush = () => jest.advanceTimersByTimeAsync(3000);
const metadata = () => JSON.parse(cloud.writeICloudStateValue.mock.calls.findLast(call => call[0] === cloud.ICLOUD_STATE_META_KEY)[1]);

test('ローカル保存が完了する前は発火せず、完了時刻と保存した正確なJSONを複製する', async () => {
  let release;
  const original = storage.setItem.getMockImplementation();
  storage.setItem.mockImplementationOnce((k, body) => new Promise(resolve => { release = async () => { await original(k, body); resolve(); }; }));
  const input = state('日記🌸'); const expected = JSON.stringify(input);
  const pending = save(input); input.tasks[0].title = '保存開始後の変更';
  await Promise.resolve(); await flush(); expect(cloud.writeICloudStateValue).not.toHaveBeenCalled();
  await release(); await pending;
  const savedAt = Date.now();
  expect(await storage.getItem(key)).toBe(expected);
  await flush();
  expect(cloud.writeICloudStateValue.mock.calls.map(call => call[0])).toEqual([cloud.ICLOUD_STATE_BODY_KEY, cloud.ICLOUD_STATE_META_KEY]);
  expect(cloud.writeICloudStateValue).toHaveBeenCalledWith(cloud.ICLOUD_STATE_BODY_KEY, expected);
  expect(metadata()).toEqual({ updatedAt: savedAt, deviceId: await storage.getItem(uploader.SYNC_DEVICE_ID_KEY), bodyBytes: Buffer.byteLength(expected, 'utf8'), bodyHash: require('crypto').createHash('sha256').update(expected).digest('hex') });
});
test('ローカル失敗はアップロードせず、以前のローカル値を保持する', async () => {
  await storage.setItem(key, JSON.stringify(state('old')));
  storage.setItem.mockRejectedValueOnce(Error('local failure'));
  await expect(save(state('new'))).rejects.toThrow('local failure');
  await flush(); expect(cloud.writeICloudStateValue).not.toHaveBeenCalled();
  expect(await storage.getItem(key)).toBe(JSON.stringify(state('old')));
});
test('最後の成功保存から3秒へデバウンスし、直近の内容/時刻だけを送る', async () => {
  await save(state('old')); await jest.advanceTimersByTimeAsync(2000);
  await save(state('new')); const savedAt = Date.now();
  await jest.advanceTimersByTimeAsync(2999); expect(cloud.writeICloudStateValue).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(cloud.writeICloudStateValue).toHaveBeenCalledTimes(2);
  expect(cloud.writeICloudStateValue).toHaveBeenCalledWith(cloud.ICLOUD_STATE_BODY_KEY, JSON.stringify(state('new')));
  expect(metadata().updatedAt).toBe(savedAt);
});
test.each([900000, 900001])('UTF-8 %i bytes境界：超過時もローカルは成功しID作成前にスキップする', async bytes => {
  const input = { memo: '' }; input.memo = 'x'.repeat(bytes - JSON.stringify(input).length);
  await expect(save(input)).resolves.toBeUndefined(); await flush();
  expect(Buffer.byteLength(await storage.getItem(key))).toBe(bytes);
  expect(cloud.writeICloudStateValue).toHaveBeenCalledTimes(bytes === 900000 ? 2 : 0);
  if (bytes > 900000) { expect(await storage.getItem(uploader.SYNC_DEVICE_ID_KEY)).toBeNull(); expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('size limit'), { bodyBytes: bytes, limit: 900000 }); }
});
test('新しい超過状態は古い小さな状態の予約も取り消す', async () => {
  await save(state('old')); await save({ memo: '日'.repeat(300001) }); await flush();
  expect(cloud.writeICloudStateValue).not.toHaveBeenCalled();
});
test.each(['', 'ascii', '日本語🌸', '\uD800', '\uDC00', '🌸🌸'])('Hermes用バイト計算がUTF-8と一致する: %p', value => {
  expect(uploader.utf8ByteLength(value)).toBe(Buffer.byteLength(value, 'utf8'));
});
test('body書き込み失敗はローカル成功としmetaを送らず、次回保存で再試行する', async () => {
  cloud.writeICloudStateValue.mockReturnValueOnce(false);
  await expect(save(state('one'))).resolves.toBeUndefined(); await flush();
  expect(cloud.writeICloudStateValue).toHaveBeenCalledTimes(1);
  const id = await storage.getItem(uploader.SYNC_DEVICE_ID_KEY);
  await save(state('two')); await flush();
  expect(metadata().deviceId).toBe(id); expect(await storage.getItem(key)).toBe(JSON.stringify(state('two')));
  expect(console.warn).toHaveBeenCalled();
});
test('meta書き込み失敗はローカル成功とし、次回保存でbody/metaを再送する', async () => {
  cloud.writeICloudStateValue.mockImplementationOnce(() => true).mockImplementationOnce(() => false);
  await save(state('one')); await flush(); expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Meta write failed'));
  await save(state('two')); await flush(); expect(metadata().bodyBytes).toBe(Buffer.byteLength(JSON.stringify(state('two'))));
  expect(cloud.writeICloudStateValue).toHaveBeenCalledTimes(4);
});
test('ID保存失敗もローカル成功のままで、次回保存時にはID生成から再試行する', async () => {
  const original = storage.setItem.getMockImplementation(); let fail = true;
  storage.setItem.mockImplementation((k, body) => k === uploader.SYNC_DEVICE_ID_KEY && fail ? Promise.reject(Error('id write')) : original(k, body));
  await save(state('one')); await flush(); expect(cloud.writeICloudStateValue).not.toHaveBeenCalled();
  fail = false; await save(state('two')); await flush(); expect(cloud.writeICloudStateValue).toHaveBeenCalledTimes(2);
  expect(metadata().deviceId).toMatch(/^sync-/);
});
test('ID読込中に新しい保存が成功したら古いuploadを破棄し、共通IDを再利用する', async () => {
  const original = storage.getItem.getMockImplementation(); let release;
  storage.getItem.mockImplementation(k => k === uploader.SYNC_DEVICE_ID_KEY ? new Promise(resolve => { release = resolve; }) : original(k));
  await save(state('old')); await flush();
  await save(state('new')); release('existing-id'); await Promise.resolve(); await Promise.resolve();
  expect(cloud.writeICloudStateValue).not.toHaveBeenCalled();
  await flush(); expect(metadata().deviceId).toBe('existing-id');
  expect(cloud.writeICloudStateValue).toHaveBeenCalledWith(cloud.ICLOUD_STATE_BODY_KEY, JSON.stringify(state('new')));
});
test('再起動相当で同じ端末IDを読み直し、本文に同期メタを追加しない', async () => {
  await save(state('one')); await flush(); const id = metadata().deviceId;
  jest.resetModules();
  // AsyncStorage is durable across a module reload, unlike the upload cache.
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  cloud = require('../features/sync/icloudStateSync');
  save = require('../storage/rhythmStorage').saveRhythmState;
  await save(state('two')); await flush(); expect(metadata().deviceId).toBe(id);
  expect(JSON.parse(await storage.getItem(key))).toEqual(state('two'));
});
test('無効時/利用不可ではローカルだけ保存する。KVS読取り・変更購読は一度もしない', async () => {
  cloud.isICloudStateSyncAvailable.mockReturnValue(false);
  await save(state('one')); await flush();
  expect(cloud.writeICloudStateValue).not.toHaveBeenCalled(); expect(await storage.getItem(uploader.SYNC_DEVICE_ID_KEY)).toBeNull();
  expect(cloud.readICloudStateValue).not.toHaveBeenCalled(); expect(cloud.subscribeToICloudStateChanges).not.toHaveBeenCalled();
});
test('flush時に利用不可なら送らず、次のローカル保存で復帰する', async () => {
  await save(state('one')); cloud.isICloudStateSyncAvailable.mockReturnValue(false); await flush();
  expect(cloud.writeICloudStateValue).not.toHaveBeenCalled();
  cloud.isICloudStateSyncAvailable.mockReturnValue(true); await save(state('two')); await flush();
  expect(cloud.writeICloudStateValue).toHaveBeenCalledTimes(2);
});
test('スケジュール時の同期例外さえローカルの成功をrejectしない', async () => {
  cloud.isICloudStateSyncAvailable.mockImplementationOnce(() => { throw Error('bridge'); });
  await expect(save(state('safe'))).resolves.toBeUndefined();
  expect(await storage.getItem(key)).toBe(JSON.stringify(state('safe')));
});
test('flag無効時はNative利用判定もID取得もせずローカルだけ保存する', async () => {
  jest.resetModules(); jest.doMock('../features/sync/syncConfig', () => ({ ICLOUD_STATE_SYNC_ENABLED: false }));
  cloud = require('../features/sync/icloudStateSync');
  save = require('../storage/rhythmStorage').saveRhythmState;
  await expect(save(state('disabled'))).resolves.toBeUndefined(); await flush();
  expect(cloud.isICloudStateSyncAvailable).not.toHaveBeenCalled();
  expect(cloud.writeICloudStateValue).not.toHaveBeenCalled();
});
test('並行するローカル保存の直列順序は変えず、KVSには最後の保存だけを複製する', async () => {
  await Promise.all([save(state('first')), save(state('second')), save(state('last'))]);
  expect(await storage.getItem(key)).toBe(JSON.stringify(state('last')));
  await flush();
  expect(cloud.writeICloudStateValue).toHaveBeenCalledTimes(2);
  expect(cloud.writeICloudStateValue).toHaveBeenCalledWith(cloud.ICLOUD_STATE_BODY_KEY, JSON.stringify(state('last')));
});
test('タイマー内のNative例外も未処理rejectにせずローカル値を保持する', async () => {
  cloud.writeICloudStateValue.mockImplementationOnce(() => { throw Error('native write'); });
  await expect(save(state('kept'))).resolves.toBeUndefined(); await flush();
  expect(await storage.getItem(key)).toBe(JSON.stringify(state('kept')));
  expect(console.warn).toHaveBeenCalled();
});
