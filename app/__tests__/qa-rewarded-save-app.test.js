jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-notifications',()=>({...jest.requireActual('expo-notifications'),addNotificationResponseReceivedListener:jest.fn(()=>({remove:jest.fn()})),getPermissionsAsync:jest.fn(async()=>({status:'granted'})),getAllScheduledNotificationsAsync:jest.fn(async()=>[]),cancelScheduledNotificationAsync:jest.fn(async()=>{}),scheduleNotificationAsync:jest.fn(async()=> 'qa-notification'),setNotificationCategoryAsync:jest.fn(async()=>{}),setNotificationChannelAsync:jest.fn(async()=>{})}));
jest.mock('react-native-google-mobile-ads',()=>({__esModule:true,default:()=>({initialize:jest.fn(async()=>{})}),BannerAd:()=>null,BannerAdSize:{BANNER:'banner'},TestIds:{BANNER:'test',REWARDED:'test'},AdEventType:{CLOSED:'closed',ERROR:'error'},RewardedAdEventType:{LOADED:'loaded',EARNED_REWARD:'earned'},RewardedAd:{createForAdRequest:jest.fn()}}));
jest.mock('expo-iap',()=>{const result={connected:false,products:[],subscriptions:[],availablePurchases:[],activeSubscriptions:[],fetchProducts:jest.fn(),requestPurchase:jest.fn(),finishTransaction:jest.fn(),getAvailablePurchases:jest.fn(),getActiveSubscriptions:jest.fn()};return {ErrorCode:{UserCancelled:'cancelled'},useIAP:()=>result};});
const React=require('react');
const {render,fireEvent,waitFor,act,cleanup}=require('@testing-library/react-native');
const {Alert,Platform,AppState}=require('react-native');
const storage=require('@react-native-async-storage/async-storage');
const ads=require('react-native-google-mobile-ads');
const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage');
const {saveRewardedAccessState,loadRewardedAccessState,DEFAULT_REWARDED_ACCESS_STATE,REWARDED_ACCESS_STORAGE_KEY,REWARD_STORAGE_PROBE_KEY}=require('../features/ads/rewardedAccessStorage');
const {EARNED_REWARD_STORAGE_KEY}=require('../features/ads/earnedRewardStorage');
const {ONBOARDING_STORAGE_KEY}=require('../features/onboarding/onboardingStorage');
const {DesignCustomizeModal}=require('../components/DesignCustomizeModal');
const App=require('../App').default;
const oldPlan=process.env.EXPO_PUBLIC_RHYTHM_PLAN;
const originalWrite=storage.setItem.getMockImplementation();
beforeEach(async()=>{
 process.env.EXPO_PUBLIC_RHYTHM_PLAN='free';await storage.clear();ads.RewardedAd.createForAdRequest.mockClear();
 await saveRhythmState({tasks:[{id:'earned-save',title:'報酬保存の読込目印',done:false,category:'その他',priority:'中',bucket:'now'}],designMode:'chic',chicPattern:'dot'});
 await saveRewardedAccessState({...DEFAULT_REWARDED_ACCESS_STATE,premiumDesignTrial:{used:true,designId:null,expiresAt:null}});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 jest.spyOn(Alert,'alert').mockImplementation(()=>{});
 ads.RewardedAd.createForAdRequest.mockImplementation(()=>{const listeners={};return{addAdEventListener:(event,cb)=>{listeners[event]=cb;return()=>{}},load:()=>Promise.resolve().then(()=>listeners.loaded()),show:()=>{listeners.earned();listeners.closed();return Promise.resolve()}}});
});
afterEach(()=>{cleanup();storage.setItem.mockImplementation(originalWrite);jest.restoreAllMocks();if(oldPlan===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=oldPlan;});
async function boot(){const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('報酬保存の読込目印').length).toBeGreaterThan(0),{timeout:10000});const skip=view.queryByText('今日はしない');if(skip)fireEvent.press(skip);return view;}
async function request(view){
 fireEvent.press(view.getByText('設定'));fireEvent.press(view.getByLabelText('デザイン設定を開く'));
 await waitFor(()=>expect(view.getByLabelText('デザインカスタマイズを開く')).toBeTruthy(),{timeout:10000});fireEvent.press(view.getByLabelText('デザインカスタマイズを開く'));
 await waitFor(()=>expect(view.getByText('広告を見て3日間使う')).toBeTruthy(),{timeout:10000});fireEvent.press(view.getByText('広告を見て3日間使う'));
 if(Platform.OS==='ios')act(()=>view.UNSAFE_getByType(DesignCustomizeModal).props.onDismiss());
}
const actualPattern=view=>view.UNSAFE_root.findAll(n=>typeof n.type==='function'&&n.type.name==='TodayWinStrip')[0].props.chicPattern;

test('保存先の事前確認が失敗した場合は広告を開始せず、再試行後だけ視聴・付与できる',async()=>{
 let writable=false;
 storage.setItem.mockImplementation((key,value,...rest)=>key===REWARD_STORAGE_PROBE_KEY&&!writable?Promise.reject(Error('storage unavailable')):originalWrite(key,value,...rest));
 const view=await boot();await request(view);
 await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('広告を完了できませんでした',expect.stringContaining('広告は開始していません')),{timeout:10000});
 expect(ads.RewardedAd.createForAdRequest).not.toHaveBeenCalled();expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeNull();
 writable=true;await request(view);await waitFor(async()=>expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeTruthy(),{timeout:10000});expect(ads.RewardedAd.createForAdRequest).toHaveBeenCalledTimes(1);
},90000);

test('広告を閉じる前のEARNED時点で記録し、重複イベントでは増やさない',async()=>{
 let listeners={};ads.RewardedAd.createForAdRequest.mockImplementation(()=>({addAdEventListener:(event,cb)=>{listeners[event]=cb;return()=>{};},load:()=>Promise.resolve().then(()=>listeners.loaded()),show:async()=>{}}));
 const view=await boot();await request(view);
 try{
  await waitFor(()=>expect(typeof listeners.earned).toBe('function'),{timeout:10000});
  const count=storage.setItem.mock.calls.filter(([key])=>key===EARNED_REWARD_STORAGE_KEY).length;
  act(()=>{listeners.earned();listeners.earned();});
  await waitFor(async()=>expect(await storage.getItem(EARNED_REWARD_STORAGE_KEY)).toBeTruthy(),{timeout:10000});
  expect(storage.setItem.mock.calls.filter(([key])=>key===EARNED_REWARD_STORAGE_KEY)).toHaveLength(count+1);
  expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeNull();
  act(()=>listeners.closed());await waitFor(async()=>expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeTruthy(),{timeout:10000});
  fireEvent.press(view.getByText('ToDo'));await waitFor(()=>expect(actualPattern(view)).toBe('dot'));
 }finally{listeners.closed?.();}
},90000);

test('記録保存失敗後は他画面にも未保存案内を残し、App activeで広告なしに再保存する',async()=>{
 const listeners=[];jest.spyOn(AppState,'addEventListener').mockImplementation((event,listener)=>{listeners.push(listener);return{remove:()=>{}};});
 let writable=false;storage.setItem.mockImplementation((key,value,...rest)=>key===EARNED_REWARD_STORAGE_KEY&&!writable?Promise.reject(Error('journal unavailable')):originalWrite(key,value,...rest));
 const view=await boot();await request(view);
 await waitFor(()=>expect(view.getByLabelText('広告の保存を再試行')).toBeTruthy(),{timeout:10000});
 fireEvent.press(view.getByText('ToDo'));expect(view.getByLabelText('広告の保存を再試行')).toBeTruthy();expect(actualPattern(view)).toBe('plain');
 writable=true;act(()=>listeners.forEach(listener=>listener('active')));
 await waitFor(()=>expect(actualPattern(view)).toBe('dot'),{timeout:10000});
 expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeTruthy();expect(view.queryByLabelText('広告の保存を再試行')).toBeNull();expect(ads.RewardedAd.createForAdRequest).toHaveBeenCalledTimes(1);
},90000);

test('視聴済み記録そのものの保存失敗でも権限を公開せず、起動中は同じ広告を再視聴せず再試行する',async()=>{
 let failed=false;
 storage.setItem.mockImplementation((key,value,...rest)=>{
  if(key===EARNED_REWARD_STORAGE_KEY&&!failed){failed=true;return Promise.reject(Error('journal write failed'));}
  return originalWrite(key,value,...rest);
 });
 const view=await boot();await request(view);
 await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('広告の保存を再試行してください',expect.stringContaining('アプリを閉じずに')),{timeout:10000});
 expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeNull();
 await request(view);await waitFor(async()=>expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeTruthy(),{timeout:10000});
 expect(ads.RewardedAd.createForAdRequest).toHaveBeenCalledTimes(1);
 fireEvent.press(view.getByText('ToDo'));await waitFor(()=>expect(actualPattern(view)).toBe('dot'));
},90000);

test('視聴済み記録を保存後に権限保存が失敗しても、App再起動で広告なしに復旧する',async()=>{
 let failed=false;
 storage.setItem.mockImplementation((key,value,...rest)=>{
  if(key===REWARDED_ACCESS_STORAGE_KEY&&JSON.parse(value).premiumDesign.unlockedUntil&&!failed){failed=true;return Promise.reject(Error('access write failed'));}
  return originalWrite(key,value,...rest);
 });
 let view=await boot();await request(view);
 await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('広告の保存を再試行してください',expect.any(String)),{timeout:10000});
 expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeNull();
 view.unmount();view=await boot();await waitFor(()=>expect(actualPattern(view)).toBe('dot'),{timeout:10000});
 expect((await loadRewardedAccessState()).lastAppliedRewardId).toBeTruthy();
 expect(ads.RewardedAd.createForAdRequest).toHaveBeenCalledTimes(1);
 view.unmount();view=await boot();await waitFor(()=>expect(actualPattern(view)).toBe('dot'));expect(ads.RewardedAd.createForAdRequest).toHaveBeenCalledTimes(1);
},90000);
test('視聴後の保存保留・失敗では権限を公開せず、再試行は広告なしで保存・実表示・再読込へ反映する',async()=>{
 let rejectSave,held=false;
 storage.setItem.mockImplementation((key,value,...rest)=>{
  if(key===REWARDED_ACCESS_STORAGE_KEY&&JSON.parse(value).premiumDesign.unlockedUntil&&!held){held=true;return new Promise((resolve,reject)=>{rejectSave=reject});}
  return originalWrite(key,value,...rest);
 });
 let view=await boot();await request(view);await waitFor(()=>expect(held).toBe(true),{timeout:10000});
 expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeNull();
 fireEvent.press(view.getByText('ToDo'));await waitFor(()=>expect(actualPattern(view)).toBe('plain'));
 await act(async()=>rejectSave(new Error('write unavailable')));
 await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('広告の保存を再試行してください',expect.stringContaining('広告を見直す必要はありません')),{timeout:10000});
 expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeNull();expect(actualPattern(view)).toBe('plain');
 await request(view);await waitFor(async()=>expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeTruthy(),{timeout:10000});
 expect(ads.RewardedAd.createForAdRequest).toHaveBeenCalledTimes(1);
 fireEvent.press(view.getByText('ToDo'));await waitFor(()=>expect(actualPattern(view)).toBe('dot'));
 expect((await loadRhythmState()).chicPattern).toBe('dot');view.unmount();view=await boot();expect(actualPattern(view)).toBe('dot');
},90000);
