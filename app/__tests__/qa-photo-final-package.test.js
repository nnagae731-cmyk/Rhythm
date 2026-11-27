jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-file-system', () => {
  class MockFile { constructor(...parts) { this.uri = parts.join('/'); } }
  MockFile.downloadFileAsync = jest.fn(async (url, destination) => destination);
  return { File: MockFile, Paths: { cache: 'file:///Caches' } };
});
const React = require('react');
const { render, fireEvent, act, cleanup } = require('@testing-library/react-native');
const { Image, Modal, Platform, Alert } = require('react-native');
const storage = require('@react-native-async-storage/async-storage');
const { applyEarnedReward, recordEarnedReward, recoverEarnedReward } = require('../features/ads/earnedRewardStorage');
const { DEFAULT_REWARDED_ACCESS_STATE, normalizeRewardedAccessState, saveRewardedAccessState, loadRewardedAccessState, REWARDED_ACCESS_STORAGE_KEY } = require('../features/ads/rewardedAccessStorage');
const { STORAGE_KEY } = require('../storage/rhythmState');
const { saveRhythmState, loadRhythmState } = require('../storage/rhythmStorage');
const { canUsePhotoKind, photoRewardProgress, photoAccessLabel } = require('../features/photo/photoAccess');
const { withoutTopPhoto, visiblePhotoSettings, PHOTO_SAMPLES, restoreSamplePhotoUris, editableSamplePhotoUri } = require('../features/photo/photoSamples');
const { PhotoEntrySheet } = require('../components/PhotoEntry');
const now = new Date('2026-11-27T00:00:00Z');
const receipt = (id, featureId = 'photoTop', earnedAt = now.toISOString()) => ({ id, featureId, earnedAt, widgetType: null, ...(featureId === 'photoTop' ? { photoTarget: 'home' } : {}) });
const base = () => JSON.parse(JSON.stringify(DEFAULT_REWARDED_ACCESS_STATE));
const photos = () => ({ placement: 'background', imageUri: 'file:///background', focusBackgroundUri: 'file:///focus', topImageUris: { home: 'file:///home', timeline: 'file:///timeline', analysis: 'file:///analysis', wish: 'file:///wish' }, topImageOriginalUris: { home: 'file:///original' }, topImageCropRects: { home: { x: 0, y: 0.2, width: 1, height: 0.4 } }, samplePhotoIds: { home: 'flowers' } });
beforeEach(async () => { await storage.clear(); });
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

test('同じ枠の1回でサンプル、2回でその枠の自分画像72時間。閉じるだけの付与経路はない', () => {
  const one = applyEarnedReward(base(), receipt('one', 'photoFocus'));
  expect(canUsePhotoKind(one, 'sample', 'focus', now)).toBe(true);
  expect(canUsePhotoKind(one, 'personal', 'focus', now)).toBe(false);
  expect(photoRewardProgress(one, 'personal', 'focus', now)).toEqual({ current: 1, required: 2 });
  expect(applyEarnedReward(one, receipt('one', 'photoFocus'))).toBe(one);
  const two = applyEarnedReward(one, receipt('two', 'photoFocus'));
  expect(two.photoAccessByTarget.focus.personalUnlockedUntil).toBe('2026-11-30T00:00:00.000Z');
  expect(canUsePhotoKind(two, 'personal', 'focus', now)).toBe(true);
  expect(photoAccessLabel(two, false, 'focus', now)).toBe('この枠の自分の画像：残り3日');
  const expiry = new Date('2026-11-30T00:00:00Z');
  expect(canUsePhotoKind(two, 'personal', 'focus', expiry)).toBe(false);
  expect(canUsePhotoKind(two, 'sample', 'focus', expiry)).toBe(true);
  expect(photoRewardProgress(two, 'personal', 'focus', expiry)).toEqual({ current: 0, required: 2 });
  const three = applyEarnedReward(two, receipt('three', 'photoFocus', expiry.toISOString()));
  expect(canUsePhotoKind(three, 'personal', 'focus', expiry)).toBe(false);
  const four = applyEarnedReward(three, receipt('four', 'photoFocus', expiry.toISOString()));
  expect(four.photoAccessByTarget.focus.personalUnlockedUntil).toBe('2026-12-03T00:00:00.000Z');
});

test('旧永久解放・枠数やDesign広告/無料試着では写真利用権を付与しない', () => {
  const old = normalizeRewardedAccessState({ ...base(), photoCustomization: { topExtraSlotsUnlocked: 5, backgroundUnlocked: true, focusUnlocked: true }, premiumDesign: { unlockedUntil: '2099-01-01T00:00:00Z' }, premiumDesignTrial: { used: true, designId: 'photo', expiresAt: '2099-01-01T00:00:00Z' } });
  expect(canUsePhotoKind(old, 'sample', 'focus', now)).toBe(false); expect(canUsePhotoKind(old, 'personal', 'focus', now)).toBe(false);
  expect(photoAccessLabel(old, true, 'focus', now)).toBe('購入済み・期限なし');
});

test.each(['home', 'timeline', 'analysis', 'wish', 'background', 'focus'])('各枠の解放は他の全枠から独立する: %s', target => {
  const featureId = target === 'background' ? 'photoBackground' : target === 'focus' ? 'photoFocus' : 'photoTop';
  const one = applyEarnedReward(base(), { ...receipt('one', featureId), photoTarget: target });
  const two = applyEarnedReward(one, { ...receipt('two', featureId), photoTarget: target });
  for (const other of ['home', 'timeline', 'analysis', 'wish', 'background', 'focus']) {
    expect(canUsePhotoKind(two, 'sample', other, now)).toBe(other === target);
    expect(canUsePhotoKind(two, 'personal', other, now)).toBe(other === target);
  }
});

test('誤った共通解放は移植せず、対象不明/不一致の写真receiptも他枠へ付与しない', () => {
  const old = { ...base(), photoAccess: { sampleUnlocked: true, personalProgress: 1, personalUnlockedUntil: '2099-01-01T00:00:00Z' } };
  for (const target of ['home', 'timeline', 'analysis', 'wish', 'background', 'focus']) expect(canUsePhotoKind(old, 'personal', target, now)).toBe(false);
  expect(() => applyEarnedReward(old, { ...receipt('missing'), photoTarget: undefined })).toThrow('対象枠');
  expect(() => applyEarnedReward(old, { ...receipt('mismatch', 'photoFocus'), photoTarget: 'home' })).toThrow('対象枠');
});

test('期限切れでは表示用コピーだけを隠し、URIとcropを破壊せず再解放で復帰する', () => {
  const raw = photos(), before = JSON.stringify(raw);
  const hidden = visiblePhotoSettings(raw, () => false);
  expect(hidden.imageUri).toBeUndefined(); expect(hidden.focusBackgroundUri).toBeUndefined(); expect(hidden.topImageUris).toEqual({});
  expect(JSON.stringify(raw)).toBe(before);
  const samplesOnly = visiblePhotoSettings(raw, kind => kind === 'sample');
  expect(samplesOnly.topImageUris.home).toBe(raw.topImageUris.home); expect(samplesOnly.topImageUris.timeline).toBeUndefined();
  expect(visiblePhotoSettings(raw, () => true)).toEqual(raw);
});

test('2回目の報酬保存失敗後もreceiptから復旧し、再起動・重複受領で期限を延長しない', async () => {
  const one = applyEarnedReward(base(), receipt('one', 'photoFocus'));
  await saveRewardedAccessState(one); await recordEarnedReward(receipt('two', 'photoFocus'));
  const original = storage.setItem.getMockImplementation();
  storage.setItem.mockImplementation((key, ...args) => key === REWARDED_ACCESS_STORAGE_KEY ? Promise.reject(Error('disk full')) : original(key, ...args));
  await expect(recoverEarnedReward(await loadRewardedAccessState())).rejects.toThrow('disk full');
  storage.setItem.mockImplementation(original);
  const restored = await recoverEarnedReward(await loadRewardedAccessState());
  expect(restored.photoAccessByTarget.focus.personalUnlockedUntil).toBe('2026-11-30T00:00:00.000Z');
  expect((await recoverEarnedReward(await loadRewardedAccessState())).photoAccessByTarget.focus).toEqual(restored.photoAccessByTarget.focus);
});

test.each(['home', 'timeline', 'analysis', 'wish'])('トップ解除は選択中の参照だけを解除し他枠・背景・cropを保持する: %s', target => {
  const raw = photos(), next = withoutTopPhoto(raw, target);
  expect(next.topImageUris[target]).toBeUndefined(); expect(next.topImageOriginalUris[target]).toBeUndefined(); expect(next.topImageCropRects[target]).toBeUndefined(); expect(next.samplePhotoIds[target]).toBeUndefined();
  expect(next.imageUri).toBe(raw.imageUri); expect(next.focusBackgroundUri).toBe(raw.focusBackgroundUri);
  for (const other of ['home', 'timeline', 'analysis', 'wish'].filter(value => value !== target)) expect(next.topImageUris[other]).toBe(raw.topImageUris[other]);
  expect(raw.topImageUris[target]).toBeTruthy();
});

test('解除の保存失敗では旧データが残り、既存保存キューで再試行すると解除状態を復元できる', async () => {
  const original = { tasks: [], designMode: 'photo', photoTheme: photos() };
  await saveRhythmState(original);
  const next = { ...original, photoTheme: withoutTopPhoto(original.photoTheme, 'home') };
  const write = storage.setItem.getMockImplementation();
  storage.setItem.mockImplementation((key, ...args) => key === STORAGE_KEY ? Promise.reject(Error('disk full')) : write(key, ...args));
  await expect(saveRhythmState(next)).rejects.toThrow();
  storage.setItem.mockImplementation(write);
  expect((await loadRhythmState()).photoTheme.topImageUris.home).toBe('file:///home');
  await saveRhythmState(next);
  expect((await loadRhythmState()).photoTheme.topImageUris.home).toBeUndefined();
  expect((await loadRhythmState()).designMode).toBe('photo');
});

test.each(['background', 'focus'])('背景には解除ボタンがなく、純粋関数も解除を受け付けない: %s', target => {
  const raw = photos(); expect(withoutTopPhoto(raw, target)).toBe(raw);
  const view = render(<PhotoEntrySheet visible initialTarget={target} photoTheme={raw} designMode="minimal" onClose={jest.fn()} onPick={jest.fn()} onAdjust={jest.fn()} onRemove={jest.fn()} canChooseWithoutReward={() => true} />);
  expect(view.queryByLabelText('トップ画像を外す')).toBeNull();
});

test('解除確認はiOSシート終了後。キャンセルは無変更、確定だけが対象を解除する', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {}), remove = jest.fn();
  const view = render(<PhotoEntrySheet visible initialTarget="home" photoTheme={photos()} designMode="minimal" onClose={jest.fn()} onPick={jest.fn()} onAdjust={jest.fn()} onRemove={remove} canChooseWithoutReward={() => true} />);
  fireEvent.press(view.getByLabelText('トップ画像を外す')); expect(alert).not.toHaveBeenCalled();
  act(() => view.UNSAFE_getByType(Modal).props.onDismiss());
  expect(alert.mock.calls[0][0]).toBe('このトップ画像を外しますか？');
  const buttons = alert.mock.calls[0][2]; expect(buttons[0].text).toBe('キャンセル'); expect(remove).not.toHaveBeenCalled();
  act(() => buttons[1].onPress()); expect(remove).toHaveBeenCalledWith('home');
});

test('7同梱画像を安定IDで復元し、サンプルURIを端末写真の管理フォルダへコピーしない', () => {
  expect(PHOTO_SAMPLES.map(item => item.id)).toEqual(['flowers', 'sky', 'sea', 'cafe', 'cat', 'dog', 'texture']);
  jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({ uri: 'file:///bundle/flowers.jpg', width: 1280, height: 426 });
  const restored = restoreSamplePhotoUris(photos());
  expect(restored.topImageUris.home).toBe('file:///home'); // adjusted display preserved
  expect(restored.topImageOriginalUris.home).toBe('file:///bundle/flowers.jpg');
  expect(restored.samplePhotoIds.home).toBe('flowers');
});

test('開発用HTTPサンプルはcrop前にcacheへ取得し、ローカルbundle URIはコピーしない', async () => {
  const { File } = require('expo-file-system');
  const resolve = jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({ uri: 'http://localhost:8081/assets/flowers.jpg' });
  expect(await editableSamplePhotoUri('flowers')).toBe('file:///Caches/rhythm-sample-flowers.jpg');
  expect(File.downloadFileAsync).toHaveBeenCalledWith('http://localhost:8081/assets/flowers.jpg', expect.any(File), { idempotent: true });
  const count = File.downloadFileAsync.mock.calls.length;
  resolve.mockReturnValue({ uri: 'file:///bundle/flowers.jpg' });
  expect(await editableSamplePhotoUri('flowers')).toBe('file:///bundle/flowers.jpg');
  expect(File.downloadFileAsync).toHaveBeenCalledTimes(count);
});
