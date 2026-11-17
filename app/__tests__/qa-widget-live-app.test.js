jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo',()=>({...jest.requireActual('expo'),requireOptionalNativeModule:jest.fn()}));
jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-notifications',()=>({...jest.requireActual('expo-notifications'),addNotificationResponseReceivedListener:jest.fn(()=>({remove:jest.fn()})),getPermissionsAsync:jest.fn(async()=>({status:'granted'})),getAllScheduledNotificationsAsync:jest.fn(async()=>[]),cancelScheduledNotificationAsync:jest.fn(async()=>{}),scheduleNotificationAsync:jest.fn(async()=> 'qa-notification'),setNotificationCategoryAsync:jest.fn(async()=>{}),setNotificationChannelAsync:jest.fn(async()=>{})}));
jest.mock('react-native-google-mobile-ads',()=>({BannerAd:()=>null,BannerAdSize:{BANNER:'banner'},TestIds:{BANNER:'test',REWARDED:'test'},RewardedAd:{createForAdRequest:jest.fn()}}));
jest.mock('expo-iap',()=>{const result={connected:true,products:[],subscriptions:[],availablePurchases:[],activeSubscriptions:[],fetchProducts:jest.fn(async()=>[]),requestPurchase:jest.fn(),finishTransaction:jest.fn(),getAvailablePurchases:jest.fn(async()=>[]),getActiveSubscriptions:jest.fn(async()=>[])};return {ErrorCode:{UserCancelled:'cancelled'},getStorefront:jest.fn(async()=>''),useIAP:()=>result};});
const React=require('react');
const {render,cleanup,waitFor,fireEvent}=require('@testing-library/react-native');
const storage=require('@react-native-async-storage/async-storage');
const expo=require('expo');
const {saveRhythmState}=require('../storage/rhythmStorage');
const {ONBOARDING_STORAGE_KEY}=require('../features/onboarding/onboardingStorage');
const native={saveSnapshot:jest.fn(async()=>true),isLiveActivityAvailable:jest.fn(async()=>true),startOrUpdateLiveActivity:jest.fn(async()=>true),endLiveActivity:jest.fn(async()=>true),getLiveActivityStatus:jest.fn(async()=>JSON.stringify({available:true,active:true})),getPendingWidgetActions:jest.fn(async()=> '[]')};
beforeEach(async()=>{jest.clearAllMocks();expo.requireOptionalNativeModule.mockReturnValue(native);await storage.clear();await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',todoComplete:'2026-01-01'},firstRunStage:'done'}));});
afterEach(()=>cleanup());
test('本番AppのTODO登録・完了がWidget snapshotに反映される',async()=>{
 await saveRhythmState({tasks:[]});const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getByLabelText('タスクを追加')).toBeTruthy(),{timeout:7000});
 fireEvent.press(view.getByLabelText('タスクを追加'));fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'Widget連動QA');fireEvent.press(view.getByText('登録する'));
 await waitFor(()=>expect(native.saveSnapshot.mock.calls.some(([json])=>JSON.parse(json).currentTask?.title==='Widget連動QA')).toBe(true),{timeout:7000});
 const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);fireEvent.press(view.getByText('一覧'));fireEvent.press(view.getAllByRole('checkbox')[0],{stopPropagation:()=>{}});
 await waitFor(()=>expect(JSON.parse(native.saveSnapshot.mock.calls.at(-1)[0]).currentTask?.title).not.toBe('Widget連動QA'),{timeout:7000});
},90000);
test('本番AppのLive Activityはタスク開始・更新・OFFでNative境界に反映する',async()=>{
 await saveRhythmState({liveActivityEnabled:true,tasks:[{id:'live-qa',title:'Live連動QA',done:false,category:'その他',priority:'中',bucket:'now'}]});const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('Live連動QA').length).toBeGreaterThan(0),{timeout:7000});
 await waitFor(()=>expect(native.startOrUpdateLiveActivity).toHaveBeenCalled(),{timeout:7000});expect(JSON.parse(native.startOrUpdateLiveActivity.mock.calls.at(-1)[0]).mode).toBe('normal');native.endLiveActivity.mockClear();
 const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);fireEvent.press(view.getByText('一覧'));fireEvent.press(view.getAllByRole('checkbox')[0],{stopPropagation:()=>{}});
 await waitFor(()=>expect(JSON.parse(native.startOrUpdateLiveActivity.mock.calls.at(-1)[0]).currentTaskTitle).toBe('今日のTODOを追加'),{timeout:7000});
 fireEvent.press(view.getByText('設定'));fireEvent(view.getByLabelText('ライブアクティビティ'),'valueChange',false);await waitFor(()=>expect(native.endLiveActivity).toHaveBeenCalled(),{timeout:7000});
},90000);
test('集中開始・一時停止・再開がLive Activityのpayloadに反映される',async()=>{
 await saveRhythmState({liveActivityEnabled:true,tasks:[{id:'focus-live',title:'集中Widget QA',done:false,category:'その他',priority:'中',bucket:'now'}]});const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('集中Widget QA').length).toBeGreaterThan(0),{timeout:7000});
 const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);fireEvent.press(view.getByLabelText('集中する'),{stopPropagation:()=>{}});await waitFor(()=>expect(view.getByText('スタート')).toBeTruthy(),{timeout:7000});fireEvent.press(view.getByText('スタート'));
 await waitFor(()=>expect(native.startOrUpdateLiveActivity.mock.calls.some(([raw])=>{const p=JSON.parse(raw);return p.mode==='focus'&&p.focusRunning===true})).toBe(true),{timeout:7000});fireEvent.press(view.getByText('一時停止'));
 await waitFor(()=>expect(native.startOrUpdateLiveActivity.mock.calls.some(([raw])=>{const p=JSON.parse(raw);return p.mode==='focus'&&p.focusRunning===false})).toBe(true),{timeout:7000});fireEvent.press(view.getByText('スタート'));
 await waitFor(()=>{const p=JSON.parse(native.startOrUpdateLiveActivity.mock.calls.at(-1)[0]);expect(p.mode).toBe('focus');expect(p.focusRunning).toBe(true);},{timeout:7000});
},90000);
