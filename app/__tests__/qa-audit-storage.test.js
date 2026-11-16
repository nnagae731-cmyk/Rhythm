jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const storage=require('@react-native-async-storage/async-storage');
const {STORAGE_KEY}=require('../storage/rhythmState');
const {loadRhythmState,saveRhythmState}=require('../storage/rhythmStorage');
beforeEach(async()=>{jest.restoreAllMocks();await storage.clear();jest.spyOn(console,'warn').mockImplementation(()=>{});});
test('破損JSONの読込失敗時に既存データを書き換えない',async()=>{
 await storage.setItem(STORAGE_KEY,'{broken');await expect(loadRhythmState()).rejects.toThrow();expect(await storage.getItem(STORAGE_KEY)).toBe('{broken');
});
test('保存失敗後は直前に保存されたデータを保持する',async()=>{
 await saveRhythmState({tasks:[{id:'old'}]});jest.spyOn(storage,'setItem').mockRejectedValueOnce(Error('disk'));
 await expect(saveRhythmState({tasks:[{id:'new'}]})).rejects.toThrow('disk');expect((await loadRhythmState()).tasks[0].id).toBe('old');
});
test('不正なルート配列は正常な保存データとして読み込まない',async()=>{
 await storage.setItem(STORAGE_KEY,'[]');await expect(loadRhythmState()).rejects.toThrow('unsupported root');expect(await storage.getItem(STORAGE_KEY)).toBe('[]');
});
