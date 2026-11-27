jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../features/sync/icloudStateUpload', () => ({ queueICloudStateUpload: jest.fn() }));
jest.mock('expo', () => ({ ...jest.requireActual('expo'), requireOptionalNativeModule: jest.fn() }));
const { Platform } = require('react-native');
const expo = require('expo');
const sync = require('../features/sync/icloudStateSync');
const { withEntitlementsPlist } = require('expo/config-plugins');
const plugin = require('../plugins/with-rhythm-icloud-kvs');
const native = { isAvailable: jest.fn(() => true), getString: jest.fn(() => 'raw-json'), setString: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) };
beforeEach(() => { jest.clearAllMocks(); expo.requireOptionalNativeModule.mockReturnValue(native); native.isAvailable.mockReturnValue(true); });
afterEach(() => { jest.restoreAllMocks(); jest.dontMock('../features/sync/syncConfig'); });
function enabled(value = true) {
  let module;
  jest.isolateModules(() => {
    jest.doMock('expo', () => expo);
    jest.doMock('react-native', () => ({ Platform }));
    jest.doMock('../features/sync/syncConfig', () => ({ ICLOUD_STATE_SYNC_ENABLED: value }));
    module = require('../features/sync/icloudStateSync');
  });
  return module;
}
test('Phase Bは有効。無効flagのread/write/購読/利用判定は引き続きNativeを解決しない', () => {
  expect(sync.ICLOUD_STATE_SYNC_ENABLED).toBe(true);
  const disabled = enabled(false);
  expect(disabled.isICloudStateSyncAvailable()).toBe(false);
  expect(disabled.readICloudStateValue(sync.ICLOUD_STATE_BODY_KEY)).toBeNull();
  expect(disabled.writeICloudStateValue(sync.ICLOUD_STATE_BODY_KEY, '{}')).toBe(false);
  disabled.subscribeToICloudStateChanges(jest.fn()).remove();
  expect(expo.requireOptionalNativeModule).not.toHaveBeenCalled();
});
test('サイズ測定fixtureは本番保存と同じJSONバイト列を測り、状態同期は起動しない', async () => {
  const storage = require('@react-native-async-storage/async-storage');
  const { saveRhythmState } = require('../storage/rhythmStorage');
  const { STORAGE_KEY } = require('../storage/rhythmState');
  const { createState, profiles, measure } = require('../scripts/measure-icloud-state.cjs');
  const state = createState(profiles.representative);
  await saveRhythmState(state);
  const body = await storage.getItem(STORAGE_KEY);
  expect(body).toBe(JSON.stringify(state));
  expect(Buffer.byteLength(body, 'utf8')).toBe(measure().find(row => row.name === 'representative').bodyBytes);
  expect(expo.requireOptionalNativeModule).not.toHaveBeenCalled();
});
test('日本語・emojiを含む測定fixtureと重い状態の900KB超過を識別できる', () => {
  const { measure } = require('../scripts/measure-icloud-state.cjs');
  const rows = measure();
  expect(rows.find(row => row.name === 'representative').exceeds900KB).toBe(false);
  expect(rows.find(row => row.name === 'heavy').exceeds900KB).toBe(true);
  expect(Buffer.byteLength('日🌸', 'utf8')).toBe(7);
});
test('Androidはテストでflagを有効にしてもno-op', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  expect(enabled().isICloudStateSyncAvailable()).toBe(false);
  expect(expo.requireOptionalNativeModule).not.toHaveBeenCalled();
});
test('モジュール無しの古いビルド/Expo Goはno-op', () => {
  expo.requireOptionalNativeModule.mockReturnValue(null);
  const module = enabled();
  expect(module.isICloudStateSyncAvailable()).toBe(false);
  expect(module.readICloudStateValue(sync.ICLOUD_STATE_BODY_KEY)).toBeNull();
  expect(module.writeICloudStateValue(sync.ICLOUD_STATE_META_KEY, '{}')).toBe(false);
  module.subscribeToICloudStateChanges(jest.fn()).remove();
});
test('iCloud未ログインならNative読み書きも購読もしない', () => {
  native.isAvailable.mockReturnValue(false);
  const module = enabled();
  expect(module.readICloudStateValue(sync.ICLOUD_STATE_BODY_KEY)).toBeNull();
  expect(module.writeICloudStateValue(sync.ICLOUD_STATE_BODY_KEY, '{}')).toBe(false);
  module.subscribeToICloudStateChanges(jest.fn()).remove();
  expect(native.getString).not.toHaveBeenCalled(); expect(native.setString).not.toHaveBeenCalled(); expect(native.addListener).not.toHaveBeenCalled();
});
test('テストで有効化した場合のみ同じ文字列を読み書きする', () => {
  const module = enabled();
  expect(module.isICloudStateSyncAvailable()).toBe(true);
  expect(module.readICloudStateValue(sync.ICLOUD_STATE_BODY_KEY)).toBe('raw-json');
  expect(module.writeICloudStateValue(sync.ICLOUD_STATE_META_KEY, '{"updatedAt":1}')).toBe(true);
  expect(native.setString).toHaveBeenCalledWith(sync.ICLOUD_STATE_META_KEY, '{"updatedAt":1}');
});
test('Nativeの利用判定/読み取り/書き込み失敗を外にthrowしない', () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const module = enabled();
  expo.requireOptionalNativeModule.mockImplementationOnce(() => { throw Error('missing'); });
  expect(module.isICloudStateSyncAvailable()).toBe(false);
  native.getString.mockImplementationOnce(() => { throw Error('read'); });
  native.setString.mockImplementationOnce(() => { throw Error('write'); });
  expect(module.readICloudStateValue(sync.ICLOUD_STATE_BODY_KEY)).toBeNull();
  expect(module.writeICloudStateValue(sync.ICLOUD_STATE_BODY_KEY, '{}')).toBe(false);
});
test('変更通知は状態2キーだけを通し、購読解除をNativeへ委譲する', () => {
  const module = enabled(), listener = jest.fn();
  const subscription = module.subscribeToICloudStateChanges(listener);
  const callback = native.addListener.mock.calls[0][1];
  callback({ changedKeys: ['other'], reason: 'serverChange' }); expect(listener).not.toHaveBeenCalled();
  const event = { changedKeys: [sync.ICLOUD_STATE_BODY_KEY], reason: 'initialSync' };
  callback(event); expect(listener).toHaveBeenCalledWith(event);
  subscription.remove(); expect(native.addListener.mock.results[0].value.remove).toHaveBeenCalledTimes(1);
});
test('購読失敗でも安全なremoveを返す', () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  native.addListener.mockImplementationOnce(() => { throw Error('subscribe'); });
  expect(() => enabled().subscribeToICloudStateChanges(jest.fn()).remove()).not.toThrow();
});
test('pluginはKVS entitlementのみ追加し、既存App Group等を保持する。再適用も同じ', async () => {
  const groups = ['group.app.rhythm.daily'];
  const config = plugin({ name: 'Rhythm', slug: 'rhythm' });
  const input = { modResults: { 'com.apple.security.application-groups': groups } };
  const first = await config.mods.ios.entitlements(input);
  expect(first.modResults).toEqual({ 'com.apple.security.application-groups': groups, 'com.apple.developer.ubiquity-kvstore-identifier': '$(TeamIdentifierPrefix)$(CFBundleIdentifier)' });
  expect((await config.mods.ios.entitlements(first)).modResults).toEqual(first.modResults);
  expect(withEntitlementsPlist).toBeDefined();
});
test('既存の別KVS識別子を無断で上書きしない', async () => {
  const config = plugin({ name: 'Rhythm', slug: 'rhythm' });
  await expect(config.mods.ios.entitlements({ modResults: { 'com.apple.developer.ubiquity-kvstore-identifier': 'other' } })).rejects.toThrow('Unexpected');
});
