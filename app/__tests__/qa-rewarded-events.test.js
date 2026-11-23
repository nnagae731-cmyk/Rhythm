jest.mock('react-native-google-mobile-ads',()=>({__esModule:true,default:()=>({initialize:async()=>{}}),TestIds:{REWARDED:'google-test-rewarded'},RewardedAdEventType:{LOADED:'loaded',EARNED_REWARD:'earned'},AdEventType:{CLOSED:'closed',ERROR:'error'},RewardedAd:{createForAdRequest:jest.fn()}}));
const ads=require('react-native-google-mobile-ads');
const {showTestRewardedAd}=require('../services/rewardedAds');
beforeEach(()=>jest.useFakeTimers());
afterEach(()=>{jest.clearAllTimers();jest.useRealTimers();});
async function launch(onEarned){
 let ready;const loaded=new Promise(resolve=>{ready=resolve;});const events={};
 ads.RewardedAd.createForAdRequest.mockImplementation(()=>({addAdEventListener:(name,cb)=>{events[name]=cb;return()=>{};},load:()=>ready(),show:async()=>{}}));
 const result=showTestRewardedAd(onEarned);await loaded;events.loaded();return {events,result};
}
test('報酬イベント時点で記録コールバックを一度だけ呼び、CLOSEDを待たない',async()=>{
 const record=jest.fn();const {events,result}=await launch(record);
 expect(record).not.toHaveBeenCalled();events.earned();events.earned();expect(record).toHaveBeenCalledTimes(1);
 events.closed();await expect(result).resolves.toBe(true);
});
test('報酬なしのキャンセル・エラーでは記録コールバックを呼ばない',async()=>{
 const record=jest.fn();let ad=await launch(record);ad.events.closed();await expect(ad.result).resolves.toBe(false);
 ad=await launch(record);ad.events.error(Error('native ad failed'));await expect(ad.result).resolves.toBe(false);expect(record).not.toHaveBeenCalled();
});
