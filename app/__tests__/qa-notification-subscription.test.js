jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-notifications',()=>({...jest.requireActual('expo-notifications'),addNotificationResponseReceivedListener:jest.fn(()=>({remove:jest.fn()})),getPermissionsAsync:jest.fn(async()=>({status:'granted'})),getAllScheduledNotificationsAsync:jest.fn(async()=>[]),cancelScheduledNotificationAsync:jest.fn(async()=>{}),scheduleNotificationAsync:jest.fn(async()=> 'qa-notification'),setNotificationCategoryAsync:jest.fn(async()=>{}),setNotificationChannelAsync:jest.fn(async()=>{})}));
jest.mock('react-native-google-mobile-ads',()=>({__esModule:true,default:()=>({initialize:jest.fn(async()=>{})}),BannerAd:()=>null,BannerAdSize:{BANNER:'banner'},TestIds:{BANNER:'test',REWARDED:'test'},AdEventType:{CLOSED:'closed',ERROR:'error'},RewardedAdEventType:{LOADED:'loaded',EARNED_REWARD:'earned'},RewardedAd:{createForAdRequest:jest.fn()}}));
jest.mock('expo-iap',()=>{const result={connected:false,products:[],subscriptions:[],availablePurchases:[],activeSubscriptions:[],fetchProducts:jest.fn(),requestPurchase:jest.fn(),finishTransaction:jest.fn(),getAvailablePurchases:jest.fn(),getActiveSubscriptions:jest.fn()};return {ErrorCode:{UserCancelled:'cancelled'},useIAP:()=>result};});
const React = require('react');
const { render, act, waitFor, cleanup } = require('@testing-library/react-native');
const { Alert } = require('react-native');
const Notifications = require('expo-notifications');
const storage = require('@react-native-async-storage/async-storage');
const rhythm = require('../storage/rhythmStorage');
const { STORAGE_KEY } = require('../storage/rhythmState');
const { ONBOARDING_STORAGE_KEY } = require('../features/onboarding/onboardingStorage');
const { PremiumModal } = require('../components/PremiumModal');
const App = require('../App').default;
const originalPlan = process.env.EXPO_PUBLIC_RHYTHM_PLAN;
const task = { id: 'listener-task', title: '通知分離の読込目印', done: false, category: 'その他', priority: '中', bucket: 'now' };
const response = (action, data) => ({ actionIdentifier: action, notification: { request: { identifier: 'listener-instance', content: { data, body: 'task' } } } });
beforeEach(async () => {
  process.env.EXPO_PUBLIC_RHYTHM_PLAN = 'premium';
  await storage.clear();
  await rhythm.saveRhythmState({ tasks: [task] });
  await storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ version: 1, firstRunStage: 'done', completed: { intro: '2026-01-01', todo: '2026-01-01', todoComplete: '2026-01-01' } }));
  Notifications.addNotificationResponseReceivedListener.mockReset().mockImplementation(() => ({ remove: jest.fn() }));
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  cleanup(); jest.restoreAllMocks();
  if (originalPlan === undefined) delete process.env.EXPO_PUBLIC_RHYTHM_PLAN; else process.env.EXPO_PUBLIC_RHYTHM_PLAN = originalPlan;
});

test('callback identityとplanTierの変更でも復元/登録は1回。最新callbackで応答しunmountだけで解除する', async () => {
  const load = jest.spyOn(rhythm, 'loadRhythmState');
  const remove = jest.fn();
  Notifications.addNotificationResponseReceivedListener.mockImplementation(() => ({ remove }));
  const actualUseCallback = React.useCallback;
  let revision = 0;
  const called = [];
  const identities = [];
  jest.spyOn(React, 'useCallback').mockImplementation((callback, deps) => {
    const memo = actualUseCallback(callback, deps);
    if (!String(callback).includes('pendingNotificationBehaviorActionsRef.current.push')) return memo;
    const currentRevision = revision;
    const wrapped = (...args) => { called.push(currentRevision); return memo(...args); };
    identities.push(wrapped);
    return wrapped;
  });
  const view = render(<App />);
  await waitFor(() => expect(view.getAllByText(task.title).length).toBeGreaterThan(0), { timeout: 10000 });
  expect(load).toHaveBeenCalledTimes(1);
  const listener = Notifications.addNotificationResponseReceivedListener.mock.calls[0][0];
  const firstIdentity = identities.at(-1);
  revision = 1;
  act(() => view.UNSAFE_getByType(PremiumModal).props.onMockPlanTier('free'));
  view.rerender(<App />);
  expect(identities.at(-1)).not.toBe(firstIdentity);
  act(() => view.UNSAFE_getByType(PremiumModal).props.onMockPlanTier('premium'));
  expect(load).toHaveBeenCalledTimes(1);
  await act(async () => listener(response('DONE', { taskId: task.id })));
  await waitFor(async () => expect((await rhythm.loadRhythmState()).tasks.find(t => t.id === task.id).done).toBe(true), { timeout: 7000 });
  expect(called).toContain(1);
  // Our direct verification read above is not an App hydration read.
  expect(load.mock.calls.length).toBeGreaterThanOrEqual(2);
  const reads = load.mock.calls.length;
  view.rerender(<App />);
  await act(async () => {});
  expect(load).toHaveBeenCalledTimes(reads);
  expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
  expect(remove).not.toHaveBeenCalled();
  view.unmount(); expect(remove).toHaveBeenCalledTimes(1);
}, 60000);

test('読込中のDONEは復元後に再生し、読込失敗は保存停止を維持。明示リトライでもリスナーを交換しない', async () => {
  const originalRead = rhythm.loadRhythmState;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let fail = true;
  const load = jest.spyOn(rhythm, 'loadRhythmState').mockImplementation(async () => { await gate; if (fail) throw Error('read failed'); return originalRead(); });
  const view = render(<App />);
  const listener = Notifications.addNotificationResponseReceivedListener.mock.calls[0][0];
  await act(async () => listener(response('DONE', { taskId: task.id })));
  const persisted = await storage.getItem(STORAGE_KEY);
  try {
    await act(async () => { release(); await gate; });
    await waitFor(() => expect(view.getByText('もう一度読み込む')).toBeTruthy(), { timeout: 7000 });
    expect(await storage.getItem(STORAGE_KEY)).toBe(persisted);
    expect(load).toHaveBeenCalledTimes(1);
    fail = false;
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(view.getByText('もう一度読み込む'));
    await waitFor(async () => expect((await originalRead()).tasks.find(t => t.id === task.id).done).toBe(true), { timeout: 7000 });
    expect(load).toHaveBeenCalledTimes(2);
    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
  } finally { await act(async () => { release(); await gate; }); }
}, 60000);
