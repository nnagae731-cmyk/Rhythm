jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const storage = require('@react-native-async-storage/async-storage');
const { DEFAULT_REWARDED_ACCESS_STATE, REWARDED_ACCESS_STORAGE_KEY, loadRewardedAccessState, saveRewardedAccessState, resetRewardedAccessState } = require('../features/ads/rewardedAccessStorage');
const { EARNED_REWARD_STORAGE_KEY, recordEarnedReward, recoverEarnedReward, applyEarnedReward } = require('../features/ads/earnedRewardStorage');
const originalWrite = storage.setItem.getMockImplementation();
const originalRemove = storage.removeItem.getMockImplementation();
const receipt = (featureId = 'premiumDesign') => ({ id: 'earned-once', featureId, earnedAt: '2026-11-23T00:00:00.000Z', widgetType: null, ...(featureId === 'photoTop' ? { photoTarget: 'home' } : {}) });
beforeEach(async () => { await storage.clear(); });
afterEach(() => { storage.setItem.mockImplementation(originalWrite); storage.removeItem.mockImplementation(originalRemove); jest.restoreAllMocks(); });

test('報酬保存失敗後の再起動相当で視聴済み記録から復旧し、3日間の起点を延長しない', async () => {
  await saveRewardedAccessState(DEFAULT_REWARDED_ACCESS_STATE);
  await recordEarnedReward(receipt());
  storage.setItem.mockImplementation((key, ...args) => key === REWARDED_ACCESS_STORAGE_KEY ? Promise.reject(Error('disk full')) : originalWrite(key, ...args));
  await expect(recoverEarnedReward(await loadRewardedAccessState())).rejects.toThrow('disk full');
  expect(await storage.getItem(EARNED_REWARD_STORAGE_KEY)).toBeTruthy();
  expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeNull();
  storage.setItem.mockImplementation(originalWrite);
  const recovered = await recoverEarnedReward(await loadRewardedAccessState());
  expect(recovered.premiumDesign.unlockedUntil).toBe('2026-11-26T00:00:00.000Z');
  expect((await loadRewardedAccessState()).lastAppliedRewardId).toBe('earned-once');
  expect(await storage.getItem(EARNED_REWARD_STORAGE_KEY)).toBeNull();
});

test('付与後の記録削除失敗・再起動でも消費済みcreditを二重付与しない', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  await saveRewardedAccessState(DEFAULT_REWARDED_ACCESS_STATE);
  await recordEarnedReward(receipt('calendarImport'));
  storage.removeItem.mockRejectedValueOnce(Error('cleanup failed'));
  const granted = await recoverEarnedReward(await loadRewardedAccessState());
  expect(granted.calendarImportCredits).toBe(1);
  await saveRewardedAccessState({ ...granted, calendarImportCredits: 0 });
  expect(await storage.getItem(EARNED_REWARD_STORAGE_KEY)).toBeTruthy();
  const reloaded = await recoverEarnedReward(await loadRewardedAccessState());
  expect(reloaded.calendarImportCredits).toBe(0);
  expect((await recoverEarnedReward(await loadRewardedAccessState())).calendarImportCredits).toBe(0);
});

test('記録なしでは付与せず、不正な記録は保存済みTrialや写真権限を上書きしない', async () => {
  const base = { ...DEFAULT_REWARDED_ACCESS_STATE, premiumDesignTrial: { used: true, designId: 'dot', expiresAt: '2026-11-24T00:00:00Z' }, photoCustomization: { topExtraSlotsUnlocked: 3, backgroundUnlocked: true, focusUnlocked: true } };
  await saveRewardedAccessState(base);
  expect(await recoverEarnedReward(await loadRewardedAccessState())).toEqual(base);
  await storage.setItem(EARNED_REWARD_STORAGE_KEY, '{broken');
  await expect(recoverEarnedReward(await loadRewardedAccessState())).rejects.toThrow();
  expect(await loadRewardedAccessState()).toEqual(base);
});

test('既存の写真・Trialを保ち、同じ報酬IDを再適用しても増やさない', async () => {
  const base = { ...DEFAULT_REWARDED_ACCESS_STATE, photoCustomization: { topExtraSlotsUnlocked: 2, backgroundUnlocked: true, focusUnlocked: false }, premiumDesignTrial: { used: true, designId: 'dot', expiresAt: null } };
  const next = applyEarnedReward(base, receipt('photoTop'));
  expect(next.photoCustomization).toEqual(base.photoCustomization);
  expect(next.photoAccessByTarget.home).toEqual({ sampleUnlocked: true, personalProgress: 1, personalUnlockedUntil: null });
  expect(next.premiumDesignTrial).toEqual(base.premiumDesignTrial);
  await saveRewardedAccessState(next);
  expect(applyEarnedReward(await loadRewardedAccessState(), receipt('photoTop')).photoAccessByTarget.home.personalProgress).toBe(1);
});

test('消費型の既存回数・Widget3日間を維持し、写真は新しい共通進捗を使う', () => {
  const base = DEFAULT_REWARDED_ACCESS_STATE;
  expect(applyEarnedReward(base, receipt('wishCreate')).wishCreateProgress).toBe(1);
  expect(applyEarnedReward(base, receipt('wishActionCreate')).wishActionCreateProgress).toBe(1);
  expect(applyEarnedReward({ ...base, wishCreateProgress: 2 }, receipt('wishCreate')).wishCreateProgress).toBe(2);
  expect(applyEarnedReward({ ...base, photoCustomization: { ...base.photoCustomization, topExtraSlotsUnlocked: 5 } }, receipt('photoTop')).photoCustomization.topExtraSlotsUnlocked).toBe(5);
  expect(applyEarnedReward(base, receipt('photoBackground')).photoAccessByTarget.background.personalProgress).toBe(1);
  expect(applyEarnedReward(base, receipt('photoFocus')).photoAccessByTarget.focus.sampleUnlocked).toBe(true);
  expect(applyEarnedReward(base, { ...receipt('widgetPhoto'), widgetType: 'current' }).widgetPhotoCustomization.expiresAt).toBe('2026-11-26T00:00:00.000Z');
  expect(applyEarnedReward(base, receipt('routineSkip')).routine.skipStock).toBe(1);
  expect(applyEarnedReward(base, receipt('routineSkipBonus')).routine).toEqual({ skipStock: 0, skipBonusAdded: 0, skipBonusProgress: 1 });
  expect(applyEarnedReward({ ...base, routine: { skipStock: 2, skipBonusAdded: 1, skipBonusProgress: 1 } }, receipt('routineSkipBonus')).routine).toEqual({ skipStock: 3, skipBonusAdded: 2, skipBonusProgress: 0 });
  expect(applyEarnedReward({ ...base, routine: { skipStock: 2, skipBonusAdded: 2, skipBonusProgress: 1 } }, receipt('routineSkipBonus')).routine.skipStock).toBe(2);
});

test('連続する権限保存は直列化し、最初の書込失敗でも後の保存を止めない', async () => {
  let fail, started = false;
  storage.setItem.mockImplementation((key, value, ...args) => {
    if (key === REWARDED_ACCESS_STORAGE_KEY && !started) { started = true; return new Promise((resolve, reject) => { fail = reject; }); }
    return originalWrite(key, value, ...args);
  });
  const first = saveRewardedAccessState({ ...DEFAULT_REWARDED_ACCESS_STATE, calendarImportCredits: 1 });
  const failure = expect(first).rejects.toThrow('first failed');
  const second = saveRewardedAccessState({ ...DEFAULT_REWARDED_ACCESS_STATE, calendarImportCredits: 2 });
  await Promise.resolve();
  expect(started).toBe(true);
  expect(await storage.getItem(REWARDED_ACCESS_STORAGE_KEY)).toBeNull();
  fail(Error('first failed'));
  await failure; await second;
  expect((await loadRewardedAccessState()).calendarImportCredits).toBe(2);
});

test('明示的なRewardedリセットでは視聴済み記録も消し、再読込で権限を復活させない', async () => {
  await recordEarnedReward(receipt());
  await resetRewardedAccessState();
  const reloaded = await recoverEarnedReward(await loadRewardedAccessState());
  expect(reloaded.premiumDesign.unlockedUntil).toBeNull();
  expect(await storage.getItem(EARNED_REWARD_STORAGE_KEY)).toBeNull();
});
