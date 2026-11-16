jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-notifications', () => ({getAllScheduledNotificationsAsync:jest.fn(),cancelScheduledNotificationAsync:jest.fn()}));
const storage=require('@react-native-async-storage/async-storage');
const N=require('expo-notifications');
const { markOnboardingCompleted,loadOnboardingState }=require('../features/onboarding/onboardingStorage');
const { cancelPendingTaskNotificationsUnsafe }=require('../features/tasks/taskNotifications');
const { normalizeVoiceUsage,grantVoiceReward,consumeVoiceUsage,remainingVoiceUses }=require('../features/voice/voiceUsage');
const { normalizeOnboardingState }=require('../features/onboarding/onboardingStorage');
const { getFocusNavigationDecision }=require('../features/focus/focusUsagePolicy');
beforeEach(async()=>{jest.restoreAllMocks();await storage.clear();jest.clearAllMocks();});
test('初回案内の未完了状態はデザイン画面へ進まない',()=>{expect(normalizeOnboardingState({firstRunStage:'design',completed:{}}).firstRunStage).toBeUndefined();});
test('音声利用回数は日付変更でリセットされ広告報酬上限を超えない',()=>{let s=normalizeVoiceUsage(null,'2026-05-20');for(let i=0;i<3;i++)s=grantVoiceReward(s,'2026-05-20');expect(s.bonusUses).toBe(6);for(let i=0;i<20;i++)s=consumeVoiceUsage(s,'2026-05-20');expect(remainingVoiceUses(s,'2026-05-20')).toBe(0);expect(normalizeVoiceUsage(s,'2026-05-21').count).toBe(0);});
test('Focus中の画面移動だけを制限する',()=>{expect(getFocusNavigationDecision(true).allowed).toBe(false);expect(getFocusNavigationDecision(false).allowed).toBe(true);});
test('異なるガイドを同時完了しても双方の完了が保持される',async()=>{
 const original=storage.getItem.getMockImplementation(); let release; const gate=new Promise(r=>{release=r;}); let reads=0; setTimeout(()=>release(),20);
 jest.spyOn(storage,'getItem').mockImplementation(async (...args)=>{const value=await original(...args);if(++reads===2)release();await gate;return value;});
 await Promise.all([markOnboardingCompleted('todo'),markOnboardingCompleted('voice')]);jest.restoreAllMocks();const state=await loadOnboardingState();expect(state.completed.todo).toBeTruthy();expect(state.completed.voice).toBeTruthy();
});
test('通知一覧が読めない場合は取消完了扱いにしない',async()=>{
 N.getAllScheduledNotificationsAsync.mockRejectedValueOnce(Error('unavailable'));
 await expect(cancelPendingTaskNotificationsUnsafe('task')).rejects.toThrow();
});
