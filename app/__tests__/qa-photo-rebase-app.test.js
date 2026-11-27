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
  class File { constructor(uri) { this.uri = uri; } get exists() { return this.uri.startsWith('file:///restored/Documents/rhythm-photos/'); } }
  class Directory { constructor(base, name) { this.uri = `${base}/${name}`; } get exists() { return true; } list() { return []; } }
  return { File, Directory, Paths: { document: 'file:///restored/Documents' } };
});
const React = require('react');
const { render, waitFor, cleanup } = require('@testing-library/react-native');
const storage = require('@react-native-async-storage/async-storage');
const expo = require('expo');
const { saveRhythmState, loadRhythmState } = require('../storage/rhythmStorage');
const { ONBOARDING_STORAGE_KEY } = require('../features/onboarding/onboardingStorage');
const { PhotoEntrySheet } = require('../components/PhotoEntry');
const App = require('../App').default;
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

test('本番hydrationで再ベース後の写真を適用・通常保存し、Widgetに新URIを渡して再起動でも保持', async () => {
  const previous = process.env.EXPO_PUBLIC_RHYTHM_PLAN;
  process.env.EXPO_PUBLIC_RHYTHM_PLAN = 'premium';
  const old = name => `file:///old/Documents/rhythm-photos/${name}.jpg`;
  const current = name => `file:///restored/Documents/rhythm-photos/${name}.jpg`;
  const native = { saveSnapshot: jest.fn(async () => true), savePhoto: jest.fn(async () => true), saveWidgetPhoto: jest.fn(async () => true), saveAffirmationPhoto: jest.fn(async () => true), getPendingWidgetActions: jest.fn(async () => '[]') };
  expo.requireOptionalNativeModule.mockReturnValue(native);
  await storage.clear();
  await storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ version: 1, completed: { intro: 'done', todo: 'done', todoComplete: 'done' }, firstRunStage: 'done' }));
  await saveRhythmState({ tasks: [{ id: 'restore', title: '復元の目印', category: 'その他', priority: '中', done: false }], designMode: 'photo', photoTheme: { placement: 'background', imageUri: old('bg'), focusBackgroundUri: old('focus'), topImageUris: { home: old('home') }, topImageCropRects: { home: { x: 0, y: 0.2, width: 1, height: 0.4 } } }, widgetSettings: { style: 'photo', photoSource: 'widget', widgetCustomizations: { current: { photoUri: old('widget') } }, affirmationPhotoUris: [old('affirmation')] } });
  try {
    let view = render(<App />);
    await waitFor(() => expect(view.getAllByText('復元の目印').length).toBeGreaterThan(0), { timeout: 10000 });
    expect(view.UNSAFE_getByType(PhotoEntrySheet).props.photoTheme).toMatchObject({ imageUri: current('bg'), focusBackgroundUri: current('focus'), topImageUris: { home: current('home') }, topImageCropRects: { home: { x: 0, y: 0.2, width: 1, height: 0.4 } } });
    await waitFor(async () => expect((await loadRhythmState()).photoTheme.imageUri).toBe(current('bg')), { timeout: 7000 });
    await waitFor(() => expect(native.saveAffirmationPhoto).toHaveBeenCalledWith(current('affirmation'), 1), { timeout: 7000 });
    await waitFor(() => expect(native.saveWidgetPhoto).toHaveBeenCalledWith(current('widget'), 'current'), { timeout: 7000 });
    view.unmount(); view = render(<App />);
    await waitFor(() => expect(view.getAllByText('復元の目印').length).toBeGreaterThan(0), { timeout: 10000 });
    expect(view.UNSAFE_getByType(PhotoEntrySheet).props.photoTheme.topImageUris.home).toBe(current('home'));
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_RHYTHM_PLAN; else process.env.EXPO_PUBLIC_RHYTHM_PLAN = previous;
  }
}, 60000);
