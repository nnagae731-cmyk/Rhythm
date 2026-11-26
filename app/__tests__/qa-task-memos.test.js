jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const storage=require('@react-native-async-storage/async-storage');
const {taskWithUnifiedMemos,mergeTaskMemoEdit}=require('../features/tasks/taskMemos');
const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage');
const {STORAGE_KEY}=require('../storage/rhythmState');
const base=extra=>({id:'task',title:'買い物',done:false,category:'その他',priority:'中',...extra});
afterEach(()=>jest.restoreAllMocks());

test('メモ編集開始後の外部チェック・追加・削除を古い編集内容で上書きしない',()=>{
 const base=[{id:'a',text:'変更しない',checked:false,order:0},{id:'b',text:'外部で消す',checked:false,order:1},{id:'c',text:'元の文章',checked:false,order:2}];
 const latest=[{...base[0],text:'外部の新しい文章',checked:true},{...base[2],checked:true},{id:'new',text:'外部で追加',checked:false,order:2}];
 const draft=[...base.slice(0,2),{...base[2],text:'ユーザーが編集中の文章'}];
 expect(mergeTaskMemoEdit(base,draft,latest)).toEqual([{...latest[0],order:0},{...latest[1],text:'ユーザーが編集中の文章',order:1},{...latest[2],order:2}]);
 expect(mergeTaskMemoEdit(base,[base[2]],latest).map(i=>i.id)).toEqual(['c','new']);
});

test('旧サブタスクの文章・チェック・順番・未知フィールドをメモへ保持し、元を変更せず再実行しても増殖しない',()=>{
 const task=base({origin:{monthKey:'2026-01',wishId:'wish',actionId:'action'},subtasks:[{id:'later',title:'同じ名前',done:true,order:1,extra:'keep'},{id:'first',title:'同じ名前',done:false,order:0}]});
 const original=JSON.parse(JSON.stringify(task)),next=taskWithUnifiedMemos(task);
 expect(next.listItems).toEqual([{id:'first',text:'同じ名前',checked:false,order:0},{id:'later',text:'同じ名前',checked:true,order:1,extra:'keep'}]);
 expect(task).toEqual(original);expect(next.origin).toBe(task.origin);expect(next.done).toBe(false);expect(next.subtasks).toEqual([]);expect(taskWithUnifiedMemos(next)).toBe(next);
});
test('既存メモとID・名前が重複しても削除・上書き・推測統合しない',()=>{
 const task=base({listItems:[{id:'same',text:'同名',checked:true,order:0},{id:'legacy-subtask:same',text:'別項目',checked:false,order:1}],subtasks:[{id:'same',title:'同名',done:false,order:0}]});
 const next=taskWithUnifiedMemos(task);expect(next.listItems).toHaveLength(3);expect(next.listItems.slice(0,2)).toEqual(task.listItems);expect(next.listItems[2]).toMatchObject({id:'legacy-subtask:legacy-subtask:same',text:'同名',checked:false});
});
test('通常TODOは同じ参照で保持し、破損部分を勝手に捨てない',()=>{
 for(const task of [base({}),base({subtasks:[]}),base({subtasks:[null]}),base({subtasks:[{id:'a',title:'有効',done:false}],listItems:[null]})])expect(taskWithUnifiedMemos(task)).toBe(task);
});
test('引継ぎの保存が失敗しても元データを保持し、再試行・再読込後も重複しない',async()=>{
 await storage.clear();const state={tasks:[base({subtasks:[{id:'s',title:'必要なもの',done:true,order:0}]})]};
 await saveRhythmState(state);const original=await storage.getItem(STORAGE_KEY),next={tasks:state.tasks.map(taskWithUnifiedMemos)};
 jest.spyOn(console,'warn').mockImplementation(()=>{});jest.spyOn(storage,'setItem').mockRejectedValueOnce(Error('disk full'));
 await expect(saveRhythmState(next)).rejects.toThrow('disk full');expect(await storage.getItem(STORAGE_KEY)).toBe(original);
 await saveRhythmState(next);const restored=await loadRhythmState();expect(restored).toEqual(next);expect(taskWithUnifiedMemos(restored.tasks[0]).listItems).toHaveLength(1);
});
