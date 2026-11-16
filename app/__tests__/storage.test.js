jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const AsyncStorage = require('@react-native-async-storage/async-storage');
const { loadRhythmState, saveRhythmState } = require('../storage/rhythmStorage');

beforeEach(async () => { await AsyncStorage.clear(); jest.restoreAllMocks(); });
test('保存後に再読込してデータを保持', async () => { const state={tasks:[{id:'1',title:'買い物'}]}; await saveRhythmState(state); expect(await loadRhythmState()).toEqual(state); });
test('連続保存の最終値は最後の書込み', async () => { await Promise.all([saveRhythmState({tasks:[{id:'old'}]}),saveRhythmState({tasks:[{id:'new'}]})]); expect((await loadRhythmState()).tasks[0].id).toBe('new'); });
test('保存失敗を呼出元に通知し、次の保存は成功する', async () => { jest.spyOn(console,'warn').mockImplementation(()=>{}); jest.spyOn(AsyncStorage,'setItem').mockRejectedValueOnce(new Error('storage failure')); await expect(saveRhythmState({tasks:[]})).rejects.toThrow('storage failure'); await expect(saveRhythmState({tasks:[{id:'ok'}]})).resolves.toBeUndefined(); expect((await loadRhythmState()).tasks[0].id).toBe('ok'); });
