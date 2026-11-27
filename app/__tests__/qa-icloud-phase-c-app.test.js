jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo', () => ({ ...jest.requireActual('expo'), requireOptionalNativeModule: jest.fn() }));
jest.mock('expo-av', () => ({ Audio: {} }));
jest.mock('expo-notifications', () => ({ ...jest.requireActual('expo-notifications'), addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })), getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })), getAllScheduledNotificationsAsync: jest.fn(async () => []), cancelScheduledNotificationAsync: jest.fn(async () => {}), scheduleNotificationAsync: jest.fn(async () => 'test'), setNotificationCategoryAsync: jest.fn(async () => {}), setNotificationChannelAsync: jest.fn(async () => {}) }));
jest.mock('react-native-google-mobile-ads', () => ({ BannerAd: () => null, BannerAdSize: { BANNER: 'banner' }, TestIds: { BANNER: 'test', REWARDED: 'test' }, RewardedAd: { createForAdRequest: jest.fn() } }));
jest.mock('expo-iap', () => {
  const state = { connected: true, products: [], subscriptions: [], availablePurchases: [], activeSubscriptions: [], fetchProducts: jest.fn(async () => []), getAvailablePurchases: jest.fn(async () => []), getActiveSubscriptions: jest.fn(async () => []) };
  return { ErrorCode: {}, getStorefront: jest.fn(async () => ''), useIAP: () => state };
});
jest.mock('expo-file-system', () => {
  const files = new Set(), removed = [];
  class File { constructor(uri) { this.uri = uri; } get exists() { return files.has(this.uri); } delete() { files.delete(this.uri); removed.push(this.uri); } }
  class Directory { constructor(base, name) { this.uri = `${base}/${name}`; } get exists() { return true; } list() { return [...files].map(uri => new File(uri)); } }
  return { File, Directory, Paths: { document: 'file:///restored/Documents' }, __files: files, __removed: removed };
});
const React = require('react');
const { render, waitFor, cleanup, act, fireEvent } = require('@testing-library/react-native');
const { Image } = require('react-native');
const storage = require('@react-native-async-storage/async-storage');
const expo = require('expo');
const fs = require('expo-file-system');
const { saveRhythmState, loadRhythmState, PRE_SYNC_BACKUP_KEY } = require('../storage/rhythmStorage');
const { ONBOARDING_STORAGE_KEY } = require('../features/onboarding/onboardingStorage');
const { LOCAL_SYNC_META_KEY } = require('../features/sync/stateSyncCoordinator');
const { syncBodyHash } = require('../features/sync/syncCodec');
const { ICLOUD_STATE_BODY_KEY: BODY, ICLOUD_STATE_META_KEY: META } = require('../features/sync/icloudStateSync');
const { TaskModal } = require('../components/TaskModal');
const { HomeScreen } = require('../screens/HomeScreen');
const App = require('../App').default;
jest.setTimeout(60000);
let map, listener, native;
const previousPlan = process.env.EXPO_PUBLIC_RHYTHM_PLAN;
const originalGet = storage.getItem.getMockImplementation();
const data = title => ({ tasks: [{ id: title, title, done: false, category: 'その他', priority: '中', bucket: 'now' }], designMode: 'minimal' });
function cloud(state, at) { const body = JSON.stringify(state); map.set(BODY, body); map.set(META, JSON.stringify({ updatedAt: at, deviceId: 'device-A', bodyBytes: Buffer.byteLength(body), bodyHash: syncBodyHash(body) })); }
beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 27, 12));
  process.env.EXPO_PUBLIC_RHYTHM_PLAN = 'premium';
  storage.getItem.mockReset().mockImplementation(originalGet);
  jest.clearAllMocks(); await storage.clear(); fs.__files.clear(); fs.__removed.length = 0;
  map = new Map(); listener = undefined;
  native = { isAvailable: jest.fn(() => true), getString: jest.fn(key => map.get(key) ?? null), setString: jest.fn((key, value) => map.set(key, value)), addListener: jest.fn((event, callback) => { listener = callback; return { remove: jest.fn() }; }) };
  expo.requireOptionalNativeModule.mockImplementation(name => name === 'ExpoCloudSettings' ? native : null);
  await storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ version: 1, completed: { intro: 'done', todo: 'done', todoComplete: 'done' }, firstRunStage: 'done' }));
  jest.spyOn(console, 'warn').mockImplementation(() => {}); jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => { cleanup(); jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); if (previousPlan === undefined) delete process.env.EXPO_PUBLIC_RHYTHM_PLAN; else process.env.EXPO_PUBLIC_RHYTHM_PLAN = previousPlan; });
async function seed(state, at) { await saveRhythmState(state); await storage.setItem(LOCAL_SYNC_META_KEY, JSON.stringify({ updatedAt: at, bodyHash: syncBodyHash(JSON.stringify(state)) })); }

test('新端末で起動自動保存にremoteを上書きさせず、退避→queue→再hydrationする', async () => {
  const incoming = data('クラウドから復元'); const at = Date.now() - 10000; cloud(incoming, at);
  const view = render(<App />);
  await waitFor(() => expect(view.getAllByText('クラウドから復元').length).toBeGreaterThan(0), { timeout: 10000 });
  expect((await loadRhythmState()).tasks[0].id).toBe('クラウドから復元');
  const backup = await storage.getItem(PRE_SYNC_BACKUP_KEY); expect(backup).not.toBeNull(); expect(JSON.parse(backup).tasks ?? []).toHaveLength(0);
  await act(async () => jest.advanceTimersByTimeAsync(4000));
  const writes = native.setString.mock.calls.filter(([key]) => key === META).map(([, value]) => JSON.parse(value));
  expect(writes.length).toBeGreaterThan(0);
  expect(writes.every(meta => meta.updatedAt === at)).toBe(true);
});
test('追加フォームの未送信入力をKVS通知で差し替えず、閉じた後に採用する', async () => {
  const initial = data('手元のデータ'); const at = Date.now() - 20000; await seed(initial, at); cloud(initial, at);
  const view = render(<App />);
  await waitFor(() => expect(view.getAllByText('手元のデータ').length).toBeGreaterThan(0));
  fireEvent.press(view.getByRole('button', { name: 'タスクを追加' }));
  fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'), '入力途中の下書き');
  cloud(data('通知からのデータ'), Date.now() - 10000);
  await act(async () => { listener({ changedKeys: [BODY, META], reason: 'serverChange' }); await jest.advanceTimersByTimeAsync(600); });
  expect(view.getByDisplayValue('入力途中の下書き')).toBeTruthy(); expect(view.queryByText('通知からのデータ')).toBeNull();
  act(() => view.UNSAFE_getAllByType(TaskModal).find(node => node.props.visible).props.onClose());
  await waitFor(() => expect(view.getAllByText('通知からのデータ').length).toBeGreaterThan(0), { timeout: 10000 });
});
test('他端末の写真は未設定表示、URI/cropと退避元の写真ファイルは再起動後も保持', async () => {
  const own = 'file:///restored/Documents/rhythm-photos/own.jpg'; fs.__files.add(own);
  const initial = { ...data('元の写真'), photoTheme: { placement: 'background', imageUri: own } }; await seed(initial, Date.now() - 20000);
  const foreign = 'file:///other/Documents/rhythm-photos/foreign.jpg';
  const photo = { placement: 'background', imageUri: foreign, focusBackgroundUri: foreign, topImageUris: { home: foreign }, topImageOriginalUris: { home: foreign }, topImageCropRects: { home: { x: 0, y: 0.2, width: 1, height: 0.4 } } };
  cloud({ ...data('写真参照を受信'), designMode: 'photo', photoTheme: photo }, Date.now() - 10000);
  let view = render(<App />);
  await waitFor(() => expect(view.getAllByText('写真参照を受信').length).toBeGreaterThan(0), { timeout: 10000 });
  expect(view.getByRole('button', { name: 'ホームのトップ画を設定' })).toBeTruthy();
  expect(view.UNSAFE_getAllByType(Image).some(node => node.props.source?.uri === foreign)).toBe(false);
  await waitFor(async () => expect((await loadRhythmState()).photoTheme).toMatchObject(photo));
  view.unmount(); view = render(<App />);
  await waitFor(() => expect(view.getAllByText('写真参照を受信').length).toBeGreaterThan(0));
  await act(async () => jest.advanceTimersByTimeAsync(1300));
  expect(fs.__files.has(own)).toBe(true); expect(fs.__removed).not.toContain(own);
  expect((await loadRhythmState()).photoTheme).toMatchObject(photo);
});
test('新端末で同期メタの初回readが失敗しても、再試行時に初回自動保存を新しい実データと誤認しない', async () => {
  const original = storage.getItem.getMockImplementation(); let fail = true;
  jest.spyOn(storage, 'getItem').mockImplementation(key => {
    if (key === LOCAL_SYNC_META_KEY && fail) { fail = false; return Promise.reject(Error('transient metadata read')); }
    return original(key);
  });
  cloud(data('遅れて復元できたデータ'), Date.now() - 10000);
  const view = render(<App />);
  await waitFor(() => expect(view.getAllByText('遅れて復元できたデータ').length).toBeGreaterThan(0), { timeout: 10000 });
});
test('iCloud未ログインでもローカル保存時刻を記録し、KVS読み書き/購読はしない', async () => {
  const initial = data('オフラインのタスク'); const at = Date.now() - 20000; await seed(initial, at);
  native.isAvailable.mockReturnValue(false);
  const view = render(<App />);
  await waitFor(() => expect(view.getAllByText('オフラインのタスク').length).toBeGreaterThan(0));
  await waitFor(async () => expect(JSON.parse(await storage.getItem(LOCAL_SYNC_META_KEY)).bodyHash).toBe(syncBodyHash(JSON.stringify(await loadRhythmState()))));
  expect(JSON.parse(await storage.getItem(LOCAL_SYNC_META_KEY)).updatedAt).toBe(at);
  act(() => view.UNSAFE_getByType(HomeScreen).props.onToggle('オフラインのタスク'));
  await waitFor(async () => expect((await loadRhythmState()).tasks[0].done).toBe(true));
  await waitFor(async () => expect(JSON.parse(await storage.getItem(LOCAL_SYNC_META_KEY)).updatedAt).toBeGreaterThan(at));
  expect(native.getString).not.toHaveBeenCalled(); expect(native.setString).not.toHaveBeenCalled(); expect(native.addListener).not.toHaveBeenCalled();
});
