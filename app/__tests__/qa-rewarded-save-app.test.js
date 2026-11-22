jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-notifications',()=>({...jest.requireActual('expo-notifications'),addNotificationResponseReceivedListener:jest.fn(()=>({remove:jest.fn()})),getPermissionsAsync:jest.fn(async()=>({status:'granted'})),getAllScheduledNotificationsAsync:jest.fn(async()=>[]),cancelScheduledNotificationAsync:jest.fn(async()=>{}),scheduleNotificationAsync:jest.fn(async()=> 'qa-notification'),setNotificationCategoryAsync:jest.fn(async()=>{}),setNotificationChannelAsync:jest.fn(async()=>{})}));
jest.mock('react-native-google-mobile-ads',()=>({__esModule:true,default:()=>({initialize:jest.fn(async()=>{})}),BannerAd:()=>null,BannerAdSize:{BANNER:'banner'},TestIds:{BANNER:'test',REWARDED:'test'},AdEventType:{CLOSED:'closed',ERROR:'error'},RewardedAdEventType:{LOADED:'loaded',EARNED_REWARD:'earned'},RewardedAd:{createForAdRequest:jest.fn()}}));
jest.mock('expo-iap',()=>{const result={connected:false,products:[],subscriptions:[],availablePurchases:[],activeSubscriptions:[],fetchProducts:jest.fn(),requestPurchase:jest.fn(),finishTransaction:jest.fn(),getAvailablePurchases:jest.fn(),getActiveSubscriptions:jest.fn()};return {ErrorCode:{UserCancelled:'cancelled'},useIAP:()=>result};});
const React=require('react');
const {render,fireEvent,waitFor,act,cleanup}=require('@testing-library/react-native');
const {Alert,Platform}=require('react-native');
const storage=require('@react-native-async-storage/async-storage');
const ads=require('react-native-google-mobile-ads');
const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage');
const {saveRewardedAccessState,loadRewardedAccessState,DEFAULT_REWARDED_ACCESS_STATE,REWARDED_ACCESS_STORAGE_KEY}=require('../features/ads/rewardedAccessStorage');
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
 await waitFor(()=>expect(view.getByText('広告を見て12時間使う')).toBeTruthy(),{timeout:10000});fireEvent.press(view.getByText('広告を見て12時間使う'));
 if(Platform.OS==='ios')act(()=>view.UNSAFE_getByType(DesignCustomizeModal).props.onDismiss());
}
const actualPattern=view=>view.UNSAFE_root.findAll(n=>typeof n.type==='function'&&n.type.name==='TodayWinStrip')[0].props.chicPattern;
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
