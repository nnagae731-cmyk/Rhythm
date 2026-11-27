jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-notifications',()=>({...jest.requireActual('expo-notifications'),addNotificationResponseReceivedListener:jest.fn(()=>({remove:jest.fn()})),getPermissionsAsync:jest.fn(async()=>({status:'granted'})),getAllScheduledNotificationsAsync:jest.fn(async()=>[]),cancelScheduledNotificationAsync:jest.fn(async()=>{}),scheduleNotificationAsync:jest.fn(async()=> 'qa-notification'),setNotificationCategoryAsync:jest.fn(async()=>{}),setNotificationChannelAsync:jest.fn(async()=>{})}));
jest.mock('react-native-google-mobile-ads',()=>({__esModule:true,default:()=>({initialize:jest.fn(async()=>{})}),BannerAd:()=>null,BannerAdSize:{BANNER:'banner'},TestIds:{BANNER:'test',REWARDED:'test'},AdEventType:{CLOSED:'closed',ERROR:'error'},RewardedAdEventType:{LOADED:'loaded',EARNED_REWARD:'earned'},RewardedAd:{createForAdRequest:jest.fn()}}));
jest.mock('expo-iap', () => {
  const state = { connected: true, products: [], subscriptions: [], availablePurchases: [], activeSubscriptions: [], fetchProducts: jest.fn(async () => []), requestPurchase: jest.fn(), finishTransaction: jest.fn(), getAvailablePurchases: jest.fn(async () => []), getActiveSubscriptions: jest.fn(async () => []) };
  return { __state: state, ErrorCode: { UserCancelled: 'cancelled' }, useIAP: () => state, getStorefront: jest.fn(async () => 'JPN'), isEligibleForIntroOfferIOS: jest.fn(async () => false) };
});
jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('../features/photo/persistentPhoto', () => ({ ...jest.requireActual('../features/photo/persistentPhoto'), persistPhotoUri: jest.fn((uri, target) => `file:///saved-${target}.jpg`), isPersistedPhotoAvailable: jest.fn(() => true), deleteManagedPhotoUri: jest.fn(), deleteTemporaryPhotoUri: jest.fn() }));
const React = require('react');
const { render, fireEvent, act, waitFor, cleanup, within } = require('@testing-library/react-native');
const { Modal, Platform, Alert, Image } = require('react-native');
const storage = require('@react-native-async-storage/async-storage');
const picker = require('expo-image-picker');
const ads = require('react-native-google-mobile-ads');
const iap = require('expo-iap');
const { DesignTrialExpiredModal } = require('../components/DesignModals');
const { PhotoEntrySheet } = require('../components/PhotoEntry');
const { RewardedAccessModal } = require('../components/RewardedAccessModal');
const { TopImageCropModal } = require('../components/TopImageCropModal');
const { SettingsScreen } = require('../screens/SettingsScreen');
const { saveRhythmState, loadRhythmState } = require('../storage/rhythmStorage');
const { DEFAULT_REWARDED_ACCESS_STATE, saveRewardedAccessState, loadRewardedAccessState } = require('../features/ads/rewardedAccessStorage');
const { ONBOARDING_STORAGE_KEY } = require('../features/onboarding/onboardingStorage');
const { STORE_PRODUCT_IDS } = require('../features/purchases/storeProducts');
const App = require('../App').default;
const previousPlan = process.env.EXPO_PUBLIC_RHYTHM_PLAN;
const marker = { id: 'photo-marker', title: '写真入口の読込目印', done: false, category: 'その他', priority: '中', bucket: 'now' };
let earn = false;
beforeEach(() => {
  jest.clearAllMocks(); earn = false;
  iap.__state.availablePurchases = [];
  picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
  picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true });
  require('expo-image-manipulator').manipulateAsync.mockResolvedValue({ uri: 'file:///cropped.jpg' });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  ads.RewardedAd.createForAdRequest.mockImplementation(() => { const listeners = {}; return { addAdEventListener: (type, cb) => { listeners[type] = cb; return () => {}; }, load: () => Promise.resolve().then(() => listeners.loaded()), show: () => { if (earn) listeners.earned(); listeners.closed(); return Promise.resolve(); } }; });
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); if (previousPlan === undefined) delete process.env.EXPO_PUBLIC_RHYTHM_PLAN; else process.env.EXPO_PUBLIC_RHYTHM_PLAN = previousPlan; });
async function mount({ tier = 'free', access, photoTheme, purchased = false, designMode = 'photo', state = {} } = {}) {
  process.env.EXPO_PUBLIC_RHYTHM_PLAN = tier;
  if (purchased) iap.__state.availablePurchases = [{ productId: STORE_PRODUCT_IDS.designCustomize, purchaseState: 'purchased' }];
  await storage.clear();
  await saveRhythmState({ ...state, tasks: [marker], designMode, photoTheme: photoTheme ?? { placement: 'background' } });
  await saveRewardedAccessState(access ?? JSON.parse(JSON.stringify(DEFAULT_REWARDED_ACCESS_STATE)));
  await storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ version: 1, firstRunStage: 'done', completed: { intro: '2026-01-01', todo: '2026-01-01', todoComplete: '2026-01-01' } }));
  const view = render(<App />);
  await waitFor(() => expect(view.getAllByText(marker.title).length).toBeGreaterThan(0), { timeout: 10000 });
  const prompt = view.queryByText('今日はしない'); if (prompt) fireEvent.press(prompt);
  return view;
}
function openEntry(view, target) {
  const tab = target === 'home' ? 'ToDo' : target === 'wish' ? '叶えたいこと' : target === 'analysis' ? '分析' : '予定';
  fireEvent.press(view.getByRole('tab', { name: tab }));
  if (target === 'focus') { fireEvent.press(view.getByText('集中')); fireEvent.press(view.getByRole('button', { name: /背景に写真を設定|背景写真を変更/ })); }
  else if (target === 'wish') fireEvent.press(view.getByRole('button', { name: /トップ画を設定|写真を変更/ }));
  else fireEvent.press(view.getByRole('button', { name: `${{ home: 'ホーム', timeline: '予定', analysis: '分析' }[target]}のトップ画を設定` }));
  const label = { home: 'ホームのトップ画', timeline: '予定のトップ画', analysis: '分析のトップ画', wish: '叶えたいことのトップ画', focus: '集中タイマーの背景' }[target];
  expect(view.getByRole('radio', { name: label }).props.accessibilityState.checked).toBe(true);
}
async function choosePhoto(view) {
  fireEvent.press(view.getByLabelText('この適用先の写真を選ぶ'));
  if (Platform.OS === 'ios') await act(async () => view.UNSAFE_getByType(PhotoEntrySheet).findByType(Modal).props.onDismiss());
  else await act(async () => {});
}
function activeReward(view) { return view.UNSAFE_queryAllByType(RewardedAccessModal).find(node => node.props.visible); }
function closeReward(view) {
  const title = activeReward(view).props.title;
  act(() => activeReward(view).props.onClose());
  const remaining = view.UNSAFE_queryAllByType(RewardedAccessModal).find(node => node.props.title === title);
  if (remaining && Platform.OS === 'ios') act(() => remaining.props.onDismiss?.());
}

test.each(['minimal', 'dark'])('シンプルでも控えめな入口から写真設定を開ける: %s', async designMode => {
  const view = await mount({ tier: 'premium', designMode, photoTheme: { placement: 'background', topImageUris: { home: 'file:///home.jpg', timeline: 'file:///timeline.jpg', analysis: 'file:///analysis.jpg', wish: 'file:///wish.jpg' } } });
  for (const tab of ['ToDo', '予定', '分析', '叶えたいこと']) {
    fireEvent.press(view.getByRole('tab', { name: tab }));
    expect(view.getByRole('button', { name: /トップ画を変更|写真を変更/ })).toBeTruthy();
  }
  fireEvent.press(view.getByRole('tab', { name: 'ToDo' }));
  fireEvent.press(view.getByRole('button', { name: 'ホームのトップ画を変更' }));
  expect(view.getByRole('radio', { name: 'ホームのトップ画' }).props.accessibilityState.checked).toBe(true);
  expect((await loadRhythmState()).photoTheme.topImageUris.home).toBe('file:///home.jpg');
  expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
}, 60000);

test.each(['free', 'premium'])('全5入口は正しい適用先で開く。未解放Freeは広告案内、Premiumは広告なしで既存pickerへ: %s', async tier => {
  const view = await mount({ tier });
  await waitFor(() => expect(view.getByTestId('photo-entry-hint')).toBeTruthy());
  for (const target of ['home', 'timeline', 'analysis', 'wish', 'focus']) {
    openEntry(view, target);
    expect(view.queryByTestId('photo-entry-hint')).toBeNull();
    expect(JSON.parse(await storage.getItem(ONBOARDING_STORAGE_KEY)).photoEntryHintShown).toBe(true);
    if (tier === 'free') expect(view.getByText('広告・購入の案内へ')).toBeTruthy();
    await choosePhoto(view);
    if (tier === 'free') {
      await waitFor(() => expect(activeReward(view)?.props.visible).toBe(true));
      expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
      expect((await loadRhythmState()).photoTheme.topImageUris ?? {}).toEqual({});
      closeReward(view);
    } else {
      await waitFor(() => expect(picker.launchImageLibraryAsync).toHaveBeenCalled());
      expect(view.UNSAFE_queryAllByType(RewardedAccessModal).filter(node => node.props.visible)).toHaveLength(0);
      picker.launchImageLibraryAsync.mockClear();
    }
  }
  expect(ads.RewardedAd.createForAdRequest).not.toHaveBeenCalled();
}, 90000);

test('買い切りの実StoreKit解放判定を通ったFreeも広告なし。保存上の購入フラグだけには依存しない', async () => {
  const view = await mount({ purchased: true });
  openEntry(view, 'home');
  await waitFor(() => expect(view.getByText('写真を選ぶ')).toBeTruthy(), { timeout: 10000 });
  await choosePhoto(view);
  await waitFor(() => expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1));
  expect(view.UNSAFE_queryAllByType(RewardedAccessModal).filter(node => node.props.visible)).toHaveLength(0); expect(ads.RewardedAd.createForAdRequest).not.toHaveBeenCalled();
}, 60000);

test('旧枠は権限を与えず、背景と集中の広告進捗は別々。Native終了後だけ復帰', async () => {
  const access = JSON.parse(JSON.stringify(DEFAULT_REWARDED_ACCESS_STATE)); access.photoCustomization.topExtraSlotsUnlocked = 1;
  const view = await mount({ access, designMode: 'minimal' });
  openEntry(view, 'home'); fireEvent.press(view.getByRole('radio', { name: '全体の背景' })); await choosePhoto(view);
  expect(activeReward(view).props.title).toBe('自分の写真を使う'); expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  earn = true;
  let first; await act(async () => { first = await activeReward(view).props.onReward(); });
  expect(first.completed).toBe(false); expect((await loadRewardedAccessState()).photoAccessByTarget.background.personalProgress).toBe(1); closeReward(view);
  openEntry(view, 'focus'); await choosePhoto(view);
  expect(activeReward(view).props.current).toBe(0);
  let focusFirst; await act(async () => { focusFirst = await activeReward(view).props.onReward(); });
  expect(focusFirst.completed).toBe(false);
  picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///focus.jpg', width: 1000, height: 700 }] });
  let second; await act(async () => { second = await activeReward(view).props.onReward(); });
  expect(second.completed).toBe(true); expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  closeReward(view);
  await waitFor(async () => expect((await loadRhythmState()).photoTheme.focusBackgroundUri).toBe('file:///saved-focus.jpg'), { timeout: 7000 });
  expect((await loadRhythmState()).designMode).toBe('minimal');
  expect((await loadRewardedAccessState()).photoAccessByTarget.focus.personalUnlockedUntil).toBeTruthy();
  expect((await loadRewardedAccessState()).photoAccessByTarget.background.personalUnlockedUntil).toBeNull();
}, 60000);

test('広告CLOSEDだけは無効。EARNED1回はサンプルのみ、2回目のNative終了後にcrop保存。他枠には改めて広告が必要', async () => {
  const view = await mount();
  openEntry(view, 'home'); await choosePhoto(view);
  let result;
  await act(async () => { result = await activeReward(view).props.onReward(); });
  expect(result.completed).not.toBe(true); expect((await loadRewardedAccessState()).photoAccessByTarget).toBeUndefined(); expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  earn = true;
  await act(async () => { result = await activeReward(view).props.onReward(); });
  expect(result.completed).toBe(false); expect((await loadRewardedAccessState()).photoAccessByTarget.home.sampleUnlocked).toBe(true); expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///selected.jpg', width: 1000, height: 700 }] });
  await act(async () => { result = await activeReward(view).props.onReward(); });
  expect(result.completed).toBe(true); expect((await loadRewardedAccessState()).photoAccessByTarget.home.personalUnlockedUntil).toBeTruthy();
  expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled(); closeReward(view);
  await waitFor(() => expect(view.UNSAFE_getByType(TopImageCropModal).props.visible).toBe(true), { timeout: 7000 });
  await act(async () => view.UNSAFE_getByType(TopImageCropModal).props.onUse({ x: 0, y: 0, width: 1, height: 0.5 }));
  await waitFor(async () => expect((await loadRhythmState()).photoTheme.topImageUris.home).toBe('file:///saved-top-home.jpg'), { timeout: 7000 });
  expect((await loadRhythmState()).tasks.map(t => t.id)).toEqual([marker.id]);
  fireEvent.press(view.getByRole('button', { name: 'ホームのトップ画を変更' }));
  fireEvent.press(view.getByRole('radio', { name: '予定のトップ画' })); await choosePhoto(view);
  expect(activeReward(view).props.required).toBe(2);
  expect(activeReward(view).props.current).toBe(0);
  expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
}, 90000);

test('背景成功後のPhotoモード・URIを再起動で復元し、元のMono/Designの色柄は保持する', async () => {
  const view = await mount({ tier: 'premium', designMode: 'chic', state: { monoAppearance: 'dark', monoPattern: 'looseLeaf', chicPattern: 'dot', chicCheckColor: 'pink' } });
  picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///background.jpg', width: 1200, height: 800 }] });
  openEntry(view, 'home'); fireEvent.press(view.getByRole('radio', { name: '全体の背景' })); await choosePhoto(view);
  await waitFor(async () => expect((await loadRhythmState()).designMode).toBe('photo'));
  const saved = await loadRhythmState();
  expect(saved.photoTheme.imageUri).toBe('file:///saved-background.jpg');
  expect(saved).toMatchObject({ monoAppearance: 'dark', monoPattern: 'looseLeaf', chicPattern: 'dot', chicCheckColor: 'pink' });
  view.unmount();
  const again = render(<App />); await waitFor(() => expect(again.getAllByText(marker.title).length).toBeGreaterThan(0));
  fireEvent.press(again.getByRole('tab', { name: '設定' }));
  expect(again.UNSAFE_getByType(SettingsScreen).props.selectedDesignMode).toBe('photo');
  act(() => again.UNSAFE_getByType(SettingsScreen).props.onDesignMode('minimal'));
  expect(again.UNSAFE_getByType(SettingsScreen).props.monoPattern).toBe('looseLeaf');
  act(() => again.UNSAFE_getByType(SettingsScreen).props.onDesignMode('chic'));
  expect(again.UNSAFE_getByType(SettingsScreen).props.chicPattern).toBe('dot');
  expect(again.UNSAFE_getByType(SettingsScreen).props.chicCheckColor).toBe('pink');
}, 60000);

test('トップ解除のキャンセル/確定・他枠保持・再起動後の解除・再設定を本番Appで確認', async () => {
  const photo = { placement: 'background', imageUri: 'file:///bg', focusBackgroundUri: 'file:///focus', topImageUris: { home: 'file:///home', timeline: 'file:///timeline', analysis: 'file:///analysis', wish: 'file:///wish' }, topImageOriginalUris: { home: 'file:///original' }, topImageCropRects: { home: { x: 0, y: 0, width: 1, height: 0.4 } } };
  let view = await mount({ tier: 'premium', designMode: 'chic', photoTheme: photo });
  const beforeAccess = await loadRewardedAccessState();
  async function confirm(remove) {
    fireEvent.press(view.getByRole('button', { name: 'ホームのトップ画を変更' }));
    fireEvent.press(view.getByLabelText('トップ画像を外す'));
    if (Platform.OS === 'ios') await act(async () => view.UNSAFE_getByType(PhotoEntrySheet).findByType(Modal).props.onDismiss());
    const buttons = Alert.alert.mock.calls.findLast(call => call[0] === 'このトップ画像を外しますか？')[2];
    if (remove) act(() => buttons[1].onPress());
  }
  await confirm(false); expect(view.getByRole('button', { name: 'ホームのトップ画を変更' })).toBeTruthy();
  await confirm(true); expect(view.queryByRole('button', { name: 'ホームのトップ画を変更' })).toBeNull();
  await waitFor(async () => expect((await loadRhythmState()).photoTheme.topImageUris.home).toBeUndefined());
  expect((await loadRhythmState()).photoTheme).toMatchObject({ imageUri: photo.imageUri, focusBackgroundUri: photo.focusBackgroundUri, topImageUris: { timeline: 'file:///timeline', analysis: 'file:///analysis', wish: 'file:///wish' } });
  expect((await loadRhythmState()).designMode).toBe('chic'); expect(await loadRewardedAccessState()).toEqual(beforeAccess);
  view.unmount(); view = render(<App />); await waitFor(() => expect(view.getAllByText(marker.title).length).toBeGreaterThan(0));
  expect(view.getByRole('button', { name: 'ホームのトップ画を設定' })).toBeTruthy();
  picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///again.jpg', width: 1200, height: 800 }] });
  openEntry(view, 'home'); await choosePhoto(view);
  await waitFor(() => expect(view.UNSAFE_getByType(TopImageCropModal).props.visible).toBe(true));
  await act(async () => view.UNSAFE_getByType(TopImageCropModal).props.onUse({ x: 0, y: 0, width: 1, height: 0.4 }));
  await waitFor(() => expect(view.getByRole('button', { name: 'ホームのトップ画を変更' })).toBeTruthy());
}, 60000);

test('期限切れ写真は非表示だけでURI/cropを保存し、再解放後にpicker/cropなしで復帰する', async () => {
  const access = JSON.parse(JSON.stringify(DEFAULT_REWARDED_ACCESS_STATE)); access.photoAccessByTarget = { home: { sampleUnlocked: true, personalProgress: 0, personalUnlockedUntil: '2000-01-01T00:00:00Z' } };
  const photo = { placement: 'background', topImageUris: { home: 'file:///kept.jpg' }, topImageCropRects: { home: { x: 0, y: 0.2, width: 1, height: 0.4 } } };
  const view = await mount({ access, photoTheme: photo, designMode: 'minimal' });
  expect(view.getByRole('button', { name: 'ホームのトップ画を設定' })).toBeTruthy();
  expect((await loadRhythmState()).photoTheme).toMatchObject(photo);
  openEntry(view, 'home'); await choosePhoto(view); earn = true;
  let result; await act(async () => { result = await activeReward(view).props.onReward(); }); expect(result.completed).toBe(false);
  await act(async () => { result = await activeReward(view).props.onReward(); }); expect(result.completed).toBe(true); closeReward(view);
  await waitFor(() => expect(view.getByRole('button', { name: 'ホームのトップ画を変更' })).toBeTruthy());
  expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled(); expect((await loadRhythmState()).photoTheme).toMatchObject(photo);
  view.unmount(); const again = render(<App />);
  await waitFor(() => expect(again.getByRole('button', { name: 'ホームのトップ画を変更' })).toBeTruthy());
  expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled(); expect((await loadRhythmState()).photoTheme).toMatchObject(photo);
}, 60000);

test('サンプルも枠ごとに広告1回が必要で、背景サンプル成功時だけPhotoへ。個人写真は未解放', async () => {
  jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({ uri: 'file:///bundle/sample.jpg', width: 1280, height: 640 });
  const view = await mount({ designMode: 'minimal' });
  openEntry(view, 'home'); fireEvent.press(view.getByLabelText('サンプル：花'));
  if (Platform.OS === 'ios') await act(async () => view.UNSAFE_getByType(PhotoEntrySheet).findByType(Modal).props.onDismiss());
  expect(activeReward(view).props.required).toBe(1); earn = true;
  let result; await act(async () => { result = await activeReward(view).props.onReward(); }); expect(result.completed).toBe(true);
  await act(async () => { result = await activeReward(view).props.onReward(); });
  expect(result.completed).toBe(true); expect(ads.RewardedAd.createForAdRequest).toHaveBeenCalledTimes(1);
  expect((await loadRewardedAccessState()).photoAccessByTarget.home.personalProgress).toBe(1);
  expect((await loadRhythmState()).photoTheme.topImageUris?.home).toBeUndefined(); closeReward(view);
  await waitFor(async () => expect((await loadRhythmState()).photoTheme.samplePhotoIds.home).toBe('flowers'));
  expect((await loadRhythmState()).designMode).toBe('minimal'); expect((await loadRewardedAccessState()).photoAccessByTarget.home.personalUnlockedUntil).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'ホームのトップ画を変更' })); fireEvent.press(view.getByRole('radio', { name: '全体の背景' }));
  fireEvent.press(view.getByLabelText('サンプル：質感')); if (Platform.OS === 'ios') await act(async () => view.UNSAFE_getByType(PhotoEntrySheet).findByType(Modal).props.onDismiss());
  expect(activeReward(view).props.required).toBe(1);
  await act(async () => { result = await activeReward(view).props.onReward(); });
  expect(result.completed).toBe(true); closeReward(view);
  await waitFor(async () => expect((await loadRhythmState()).designMode).toBe('photo'));
  expect((await loadRhythmState()).photoTheme.samplePhotoIds.background).toBe('texture'); expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  expect(ads.RewardedAd.createForAdRequest).toHaveBeenCalledTimes(2);
  expect((await loadRewardedAccessState()).photoAccessByTarget.focus).toBeUndefined();
}, 60000);

test('設定のPhoto試着からの正式適用も、試着案内のNative終了後に写真2広告へ進む', async () => {
  const view = await mount({ designMode: 'minimal' });
  fireEvent.press(view.getByRole('tab', { name: '設定' }));
  const preview = view.UNSAFE_getByType(SettingsScreen).props.fullscreenPreview(jest.fn(), true, action => action());
  act(() => preview.props.onApply({ mode: 'photo', pattern: 'plain', color: 'pink', photoUri: 'file:///preview.jpg', monoAppearance: 'light', monoPattern: 'plain' }));
  expect(view.UNSAFE_getByType(DesignTrialExpiredModal).props.visible).toBe(true);
  act(() => view.UNSAFE_getByType(DesignTrialExpiredModal).props.onTrial());
  if (Platform.OS === 'ios') {
    expect(activeReward(view)).toBeUndefined();
    act(() => view.UNSAFE_getByType(DesignTrialExpiredModal).props.onDismiss());
  }
  await waitFor(() => expect(activeReward(view)?.props.required).toBe(2));
  expect((await loadRhythmState()).designMode).toBe('minimal'); earn = true;
  let result; await act(async () => { result = await activeReward(view).props.onReward(); }); expect(result.completed).toBe(false);
  await act(async () => { result = await activeReward(view).props.onReward(); }); expect(result.completed).toBe(true);
  expect((await loadRhythmState()).designMode).toBe('minimal'); closeReward(view);
  await waitFor(async () => expect((await loadRhythmState()).designMode).toBe('photo'));
  expect((await loadRhythmState()).photoTheme.imageUri).toBe('file:///saved-design-background.jpg');
}, 60000);

test('設定→デザイン→写真の既存UIとtarget callbackも残る', async () => {
  const view = await mount({ tier: 'premium' });
  fireEvent.press(view.getByRole('tab', { name: '設定' }));
  expect(view.queryByRole('button', { name: 'ホームのトップ画を設定' })).toBeNull();
  fireEvent.press(view.getByLabelText('デザイン設定を開く'));
  fireEvent.press(view.getByText('写真'));
  expect(view.getByText('画面ごとのトップ画像')).toBeTruthy();
  expect(view.getByText('集中タイマーの背景')).toBeTruthy();
  fireEvent.press(view.getByLabelText('予定のトップを選ぶ'));
  await waitFor(() => expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1), { timeout: 7000 });
  expect(view.queryByTestId('photo-entry-sheet')).toBeNull();
}, 60000);
