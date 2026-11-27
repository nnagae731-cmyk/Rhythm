jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-notifications',()=>({...jest.requireActual('expo-notifications'),addNotificationResponseReceivedListener:jest.fn(()=>({remove:jest.fn()})),getPermissionsAsync:jest.fn(async()=>({status:'granted'})),getAllScheduledNotificationsAsync:jest.fn(async()=>[]),cancelScheduledNotificationAsync:jest.fn(async()=>{}),scheduleNotificationAsync:jest.fn(async()=> 'qa-notification'),setNotificationCategoryAsync:jest.fn(async()=>{}),setNotificationChannelAsync:jest.fn(async()=>{})}));
jest.mock('react-native-google-mobile-ads',()=>({__esModule:true,default:()=>({initialize:jest.fn(async()=>{})}),BannerAd:()=>null,BannerAdSize:{BANNER:'banner'},TestIds:{BANNER:'test',REWARDED:'test'},AdEventType:{CLOSED:'closed',ERROR:'error'},RewardedAdEventType:{LOADED:'loaded',EARNED_REWARD:'earned'},RewardedAd:{createForAdRequest:jest.fn()}}));
jest.mock('expo-iap',()=>{const result={connected:false,products:[],subscriptions:[],availablePurchases:[],activeSubscriptions:[],fetchProducts:jest.fn(),requestPurchase:jest.fn(),finishTransaction:jest.fn(),getAvailablePurchases:jest.fn(),getActiveSubscriptions:jest.fn()};return {ErrorCode:{UserCancelled:'cancelled'},useIAP:()=>result};});
const React = require('react');
const { render, fireEvent, cleanup, act, waitFor, within } = require('@testing-library/react-native');
const { StyleSheet } = require('react-native');
const storage = require('@react-native-async-storage/async-storage');
const { saveRhythmState, loadRhythmState } = require('../storage/rhythmStorage');
const { ONBOARDING_STORAGE_KEY } = require('../features/onboarding/onboardingStorage');
const { saveRewardedAccessState, DEFAULT_REWARDED_ACCESS_STATE } = require('../features/ads/rewardedAccessStorage');
const { HomeScreen } = require('../screens/HomeScreen');
const { TimelineScreen } = require('../screens/TimelineScreen');
const { TaskModal } = require('../components/TaskModal');
const App = require('../App').default;
const oldPlan = process.env.EXPO_PUBLIC_RHYTHM_PLAN;
const marker = { id: 'ui-marker', title: 'UI読込の目印', done: false, category: 'その他', priority: '中', bucket: 'now' };
async function mount(state = {}) {
  process.env.EXPO_PUBLIC_RHYTHM_PLAN = 'premium';
  await storage.clear();
  await saveRhythmState({ tasks: [marker], ...state });
  await saveRewardedAccessState({ ...DEFAULT_REWARDED_ACCESS_STATE, photoCustomization: { ...DEFAULT_REWARDED_ACCESS_STATE.photoCustomization, backgroundUnlocked: true, topExtraSlotsUnlocked: 1 } });
  await storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ version: 1, firstRunStage: 'done', completed: { intro: '2026-01-01', todo: '2026-01-01', todoComplete: '2026-01-01' } }));
  const view = render(<App />);
  await waitFor(() => expect(view.getAllByText(marker.title).length).toBeGreaterThan(0), { timeout: 10000 });
  const prompt = view.queryByText('今日はしない'); if (prompt) fireEvent.press(prompt);
  return view;
}
afterEach(() => { cleanup(); jest.restoreAllMocks(); if (oldPlan === undefined) delete process.env.EXPO_PUBLIC_RHYTHM_PLAN; else process.env.EXPO_PUBLIC_RHYTHM_PLAN = oldPlan; });

test('設定だけは自動insetを無効にし、ヘッダー直下の先頭余白とクリップを確保する', async () => {
  const { StyleSheet } = require('react-native');
  const view = await mount();
  expect(view.getByTestId('app-main-scroll').props.contentInsetAdjustmentBehavior).toBeUndefined();
  fireEvent.press(view.getByRole('tab', { name: '設定' }));
  const scroll = view.getByTestId('app-main-scroll');
  expect(scroll.props.contentInsetAdjustmentBehavior).toBe('never');
  expect(scroll.props.automaticallyAdjustContentInsets).toBe(false);
  expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingTop).toBe(24);
  expect(StyleSheet.flatten(scroll.props.style).overflow).toBe('hidden');
  fireEvent.press(view.getByRole('tab', { name: 'ToDo' }));
  expect(view.getByTestId('app-main-scroll').props.contentInsetAdjustmentBehavior).toBeUndefined();
}, 60000);

test('本番Appで空ガイダンスは既存の追加/記録へ接続し、予定1件で従来表示に戻る。見出しと日付アイコンも整理', async () => {
  const view = await mount();
  fireEvent.press(view.getByText('ルーティン'));
  fireEvent.press(view.getByText('ルーティンを追加する'));
  expect(view.getByText('新しいタスク')).toBeTruthy();
  act(() => view.UNSAFE_getByType(TaskModal).props.onClose());
  fireEvent.press(view.getByRole('tab', { name: '分析' }));
  expect(view.getByTestId('analysis-records-guidance')).toBeTruthy();
  fireEvent.press(view.getByText('予定を確認する'));
  expect(view.getByTestId('departure-guidance')).toBeTruthy();
  fireEvent.press(view.getByText('予定を追加する'));
  expect(view.getByTestId('plan-date-calendar-icon')).toBeTruthy();
  const props = view.UNSAFE_getByType(TimelineScreen).props;
  act(() => props.onClosePlanEditor());
  fireEvent.press(view.getByText('スケジュール'));
  expect(view.getByText('今日のスケジュール')).toBeTruthy();
  expect(view.queryByText('今日の流れ')).toBeNull(); expect(view.queryByText('今日のタイムライン')).toBeNull();
  expect((await loadRhythmState()).tasks.map(t => t.id)).toEqual([marker.id]);
  view.unmount();
  const plan = { id: 'plan', title: '1件の出発予定', destination: '駅', planMode: 'arrival_reverse', date: require('../features/schedule/dateTimeUtils').dateKey(), arrival: '23:59', travelMinutes: 10, preparationMinutes: 10, bufferMinutes: 5 };
  const timeline = render(<TimelineScreen {...props} planEditorOpen={false} initialTab="departure" plans={[plan]} />);
  expect(timeline.queryByTestId('departure-guidance')).toBeNull(); expect(timeline.getByText(plan.title)).toBeTruthy();
}, 60000);

test.each([
  ['明るい石の写真', 'photo', 'background', 'file:///bright-stone.jpg', true],
  ['暗い木目の写真', 'photo', 'background', 'file:///dark-wood.jpg', true],
  ['トップ画バナー', 'photo', 'top', 'file:///portrait.jpg', false],
  ['通常デザイン', 'minimal', 'background', undefined, false],
])('本番Appでは全面写真だけ帯を出し、カードの背景・配置は維持する: %s', async (_label, designMode, placement, imageUri, expected) => {
  const view = await mount({ designMode, monoAppearance: 'light', photoTheme: { placement, imageUri, topImageUris: placement === 'top' ? { home: imageUri } : {} } });
  expect(Boolean(view.queryByTestId('photo-header-band'))).toBe(expected);
  expect(Boolean(view.queryByTestId('photo-home-tabs-band'))).toBe(expected);
  const home = view.UNSAFE_getByType(HomeScreen);
  expect(home.props.photoBackgroundVisible).toBe(expected);
  const diary = StyleSheet.flatten(view.getByTestId('home-journal-card').props.style);
  expect(diary.borderRadius).toBe(16); expect(diary.backgroundColor).toBeTruthy();
  const layout = JSON.stringify(view.toJSON());
  expect(layout.indexOf('home-journal-card')).toBeLessThan(layout.indexOf('today-current-task-title'));
  if (imageUri) expect((await loadRhythmState()).photoTheme.imageUri).toBe(imageUri);
}, 60000);
