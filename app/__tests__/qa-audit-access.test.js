jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const storage=require('@react-native-async-storage/async-storage');
const {loadRewardedAccessState,saveRewardedAccessState,normalizeRewardedAccessState}=require('../features/ads/rewardedAccessStorage');
const {isPremiumDesignTrialActive,canStartPremiumDesignTrial,isWidgetPhotoUnlockActive,addHours}=require('../features/ads/rewardedAccessLogic');
const {normalizeVoiceUsage,grantVoiceReward,remainingVoiceUses,consumeVoiceUsage}=require('../features/voice/voiceUsage');
const {detectRoutineCandidate,detectRoutineRepeatRule,parseVoiceInput}=require('../features/voiceParser');
const {normalizeOnboardingState}=require('../features/onboarding/onboardingStorage');
beforeEach(async()=>{jest.restoreAllMocks();await storage.clear();});
test('未使用Trialと期限は保存・再読込で保持される',async()=>{
 const start=new Date('2026-05-20T00:00:00Z');const s=normalizeRewardedAccessState({premiumDesignTrial:{used:true,designId:'dot',expiresAt:addHours(start,24)}});
 await saveRewardedAccessState(s);const loaded=await loadRewardedAccessState();
 expect(canStartPremiumDesignTrial(loaded)).toBe(false);expect(isPremiumDesignTrialActive(loaded,new Date('2026-05-20T23:59:59Z'))).toBe(true);expect(isPremiumDesignTrialActive(loaded,new Date('2026-05-21T00:00:00Z'))).toBe(false);
});
test('利用権読み込み失敗時に未使用Trialと誤認しない',async()=>{
 jest.spyOn(console,'warn').mockImplementation(()=>{});jest.spyOn(storage,'getItem').mockRejectedValueOnce(Error('read failure'));
 const state=await loadRewardedAccessState();expect(canStartPremiumDesignTrial(state)).toBe(false);
});
test('Widget写真利用権はWidget種類と期限をともに満たす場合だけ有効',()=>{
 const s=normalizeRewardedAccessState({widgetPhotoCustomization:{widgetType:'today',expiresAt:'2026-05-21T00:00:00Z'}});
 expect(isWidgetPhotoUnlockActive(s,'today',new Date('2026-05-20T23:59:59Z'))).toBe(true);
 expect(isWidgetPhotoUnlockActive(s,'goal',new Date('2026-05-20T23:59:59Z'))).toBe(false);
 expect(isWidgetPhotoUnlockActive(s,'today',new Date('2026-05-21T00:00:00Z'))).toBe(false);
});
test('音声利用上限に達したら残回数0、広告を2回まで追加できる',()=>{
 const day='2026-05-20';let s=normalizeVoiceUsage(null,day);for(let i=0;i<5;i++)s=consumeVoiceUsage(s,day);expect(remainingVoiceUses(s,day)).toBe(0);
 s=grantVoiceReward(grantVoiceReward(grantVoiceReward(s,day),day),day);expect(remainingVoiceUses(s,day)).toBe(6);expect(s.rewardedCount).toBe(2);
});
test('音声入力で表現できない隔週は毎週に変換しない',()=>{
 expect(detectRoutineCandidate('隔週で掃除')).toBe(true);expect(detectRoutineRepeatRule('隔週で掃除')).toBeUndefined();
});
test('音声入力の空文字を空タイトルとして扱う',()=>{expect(parseVoiceInput('',new Date('2026-05-20T12:00:00Z')).title).toBe('');});
test('新規はdesignへ昇格せず、intro完了後のdesignは復元する',()=>{
 expect(normalizeOnboardingState({firstRunStage:'design',completed:{}}).firstRunStage).toBeUndefined();
 expect(normalizeOnboardingState({firstRunStage:'design',completed:{intro:'2026-05-20'}}).firstRunStage).toBe('design');
});
