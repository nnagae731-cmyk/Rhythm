jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const storage=require('@react-native-async-storage/async-storage');
const {loadRewardedAccessState,saveRewardedAccessState,isRewardedAccessLoadFailure,normalizeRewardedAccessState}=require('../features/ads/rewardedAccessStorage');
const {canStartPremiumDesignTrial,isPremiumDesignTrialActive}=require('../features/ads/rewardedAccessLogic');
const {normalizeWishMonthsForSave}=require('../features/wish/wishUtils');
const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage');
beforeEach(async()=>{jest.restoreAllMocks();await storage.clear();jest.spyOn(console,'warn').mockImplementation(()=>{});});
test('利用権読込失敗と未使用を区別し、再読込成功で既存Trialを復元する',async()=>{
 const state=normalizeRewardedAccessState({premiumDesignTrial:{used:true,expiresAt:'2099-01-01T00:00:00Z',designId:'dot'}});await saveRewardedAccessState(state);
 jest.spyOn(storage,'getItem').mockRejectedValueOnce(Error('failed'));
 const failed=await loadRewardedAccessState();expect(isRewardedAccessLoadFailure(failed)).toBe(true);expect(canStartPremiumDesignTrial(failed)).toBe(false);
 const restored=await loadRewardedAccessState();expect(isRewardedAccessLoadFailure(restored)).toBe(false);expect(isPremiumDesignTrialActive(restored,new Date('2026-01-01'))).toBe(true);expect(restored.premiumDesignTrial.designId).toBe('dot');
});
test('正常な月を編集保存しても破損月と他月の既存データを保つ',async()=>{
 const valid={monthlyGoal:'old',wishes:[{id:'w'}],actions:[{id:'a'}],review:{memo:'history'},legacy:'preserve'};
 const months={'2026-01':null,'2026-02':valid,'2026-03':{...valid,monthlyGoal:'other'}};
 await saveRhythmState({wishMonths:months});const loaded=await loadRhythmState();
 loaded.wishMonths['2026-02'].monthlyGoal='edited';await saveRhythmState({wishMonths:normalizeWishMonthsForSave(loaded.wishMonths)});
 const restored=await loadRhythmState();expect(restored.wishMonths['2026-01']).toBeNull();expect(restored.wishMonths['2026-02']).toEqual({...valid,monthlyGoal:'edited'});expect(restored.wishMonths['2026-03'].monthlyGoal).toBe('other');
});
