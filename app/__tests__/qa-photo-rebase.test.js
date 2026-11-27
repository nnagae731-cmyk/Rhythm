jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-file-system', () => {
  const files = new Set();
  const calls = { writes: jest.fn(), exists: jest.fn() };
  const join = parts => parts.map(p => typeof p === 'string' ? p : p.uri).join('/');
  class File {
    constructor(...parts) { this.uri = join(parts); }
    get exists() { calls.exists(this.uri); return files.has(this.uri); }
    delete() { calls.writes('delete', this.uri); files.delete(this.uri); }
    copy() { calls.writes('copy'); }
  }
  class Directory {
    constructor(...parts) { this.uri = join(parts); }
    get exists() { return true; }
    create() { calls.writes('mkdir'); }
    list() { return [...files].filter(uri => uri.startsWith(this.uri + '/')).map(uri => new File(uri)); }
  }
  return { File, Directory, Paths: { document: 'file:///current/Documents' }, __files: files, __calls: calls };
});
const fs = require('expo-file-system');
const storage = require('@react-native-async-storage/async-storage');
const { rebaseManagedPhotoUris: rebase, collectReferencedManagedPhotoUris: collect, cleanupUnreferencedManagedPhotos: cleanup } = require('../features/photo/persistentPhoto');
const { saveRhythmState, loadRhythmState } = require('../storage/rhythmStorage');
const old = name => `file:///old-container/Documents/rhythm-photos/${name}`;
const current = name => `file:///current/Documents/rhythm-photos/${name}`;
beforeEach(async () => { fs.__files.clear(); jest.clearAllMocks(); await storage.clear(); });
afterEach(() => jest.restoreAllMocks());

test('旧コンテナURIを現在の同名ファイルへ付け替え、入力は不変', () => {
  fs.__files.add(current('home.jpg'));
  const source = { photoTheme: { topImageUris: { home: old('home.jpg') } }, tasks: [{ id: 'kept' }] };
  const next = rebase(source);
  expect(next.photoTheme.topImageUris.home).toBe(current('home.jpg'));
  expect(source.photoTheme.topImageUris.home).toBe(old('home.jpg'));
  expect(next.tasks).toBe(source.tasks);
  expect(fs.__calls.writes).not.toHaveBeenCalled();
});
test('現在のURIなら実体ありでも無変更・同じ参照', () => {
  fs.__files.add(current('same.jpg'));
  const state = { uri: current('same.jpg') };
  expect(rebase(state)).toBe(state);
});
test.each([false, true])('候補が無ければ元URIを保持する（元ファイルあり=%s）', exists => {
  if (exists) fs.__files.add(old('kept.jpg'));
  const state = { uri: old('kept.jpg') };
  expect(rebase(state)).toBe(state);
});
test('候補と元が両方存在する場合は候補を優先する', () => {
  fs.__files.add(old('both.jpg')); fs.__files.add(current('both.jpg'));
  expect(rebase({ uri: old('both.jpg') }).uri).toBe(current('both.jpg'));
});
test('ライブラリ・cache・同梱・通常文字列とcropは不変', () => {
  const state = { values: ['ph://library', 'file:///Caches/photo.jpg', 'asset:/sample.jpg', '普通のメモ', null, 2, false], topImageCropRects: { home: { x: 0, y: 0.2, width: 1, height: 0.4 } } };
  expect(rebase(state)).toBe(state);
  expect(fs.__calls.exists).not.toHaveBeenCalled();
});
test('未知フィールド・Wish日記・Widgetなど深い配列とオブジェクトを全走査し冪等', () => {
  fs.__files.add(current('shared%20photo.jpg'));
  const uri = old('shared%20photo.jpg');
  const state = { unknown: [{ legacy: uri }], wishMonths: { '2026-11': { review: { photo: uri }, reviews: [{ photos: [uri] }], reflectionCard: { photoIds: [uri] } } }, widgetSettings: { photoUri: uri, affirmationPhotoUris: [uri], widgetCustomizations: { todo: { photoUri: uri, cutoutUri: uri } } } };
  const next = rebase(state);
  expect(JSON.stringify(next)).toBe(JSON.stringify(state).split(uri).join(current('shared%20photo.jpg')));
  expect(rebase(next)).toBe(next);
  expect(collect(next)).toEqual(new Set([current('shared%20photo.jpg')]));
});
test('循環で途中まで走査しても原本を無変更で返し例外を出さない', () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  fs.__files.add(current('home.jpg'));
  const state = { photo: old('home.jpg') }; state.cycle = state;
  expect(rebase(state)).toBe(state);
  expect(state.photo).toBe(old('home.jpg'));
  expect(console.warn).toHaveBeenCalled();
});
test('ファイルシステム例外・getter例外でも原本を返す', () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(fs.File.prototype, 'exists', 'get').mockImplementation(() => { throw Error('unavailable'); });
  const state = { photo: old('home.jpg') };
  expect(rebase(state)).toBe(state);
  const invalid = { get broken() { throw Error('getter'); } };
  expect(rebase(invalid)).toBe(invalid);
});
test('模擬JSON復元→再ベース→参照スキャン→通常保存→cleanup→再読込で全スロットを保持', async () => {
  const names = ['bg.jpg', 'home.jpg', 'focus.jpg', 'widget.jpg', 'diary.jpg'];
  names.forEach(name => fs.__files.add(current(name))); fs.__files.add(current('unused.jpg'));
  const raw = { tasks: [], photoTheme: { imageUri: old(names[0]), topImageUris: { home: old(names[1]) }, focusBackgroundUri: old(names[2]) }, widgetSettings: { photoUri: old(names[3]) }, wishMonths: { '2026-11': { reviews: [{ photos: [old(names[4])] }] } } };
  await saveRhythmState(raw);
  const next = rebase(await loadRhythmState());
  const references = collect(next);
  expect(references).toEqual(new Set(names.map(current)));
  await saveRhythmState(next);
  cleanup(references);
  expect(fs.__files).toEqual(new Set(names.map(current)));
  const restarted = rebase(await loadRhythmState());
  expect(restarted).toEqual(next);
  expect(collect(restarted)).toEqual(references);
});
test('旧パス参照でcleanupしても同名ファイル保護は従来どおり', () => {
  fs.__files.add(current('keep.jpg')); fs.__files.add(current('unused.jpg'));
  cleanup([old('keep.jpg')]);
  expect(fs.__files).toEqual(new Set([current('keep.jpg')]));
});
