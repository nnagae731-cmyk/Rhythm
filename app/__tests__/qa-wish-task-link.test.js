jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const {readWishTaskOrigin,sameWishTaskOrigin,linkedWishAction,wishMonthsAfterTaskCompletion,taskChangesAfterWishEdit,wishTaskForActionDeletion}=require('../features/wish/wishTaskLink');
const {calculateWishProgress}=require('../features/wish/wishUtils');
const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage');
const {completeTasksWithRepeats}=require('../features/tasks/taskUtils');
const origin={monthKey:'2026-10',wishId:'w',actionId:'a'};
const month=()=>({wishes:[{id:'w',title:'健康',completed:false,createdAt:'2026-10-01'}],actions:[{id:'a',wishId:'w',title:'歩く',completed:false},{id:'other',wishId:'w',title:'歩く',completed:false}],review:{},reviews:[{id:'diary',shortNote:'保持'}]});
const task=(extra={})=>({id:'linked',title:'名前は変えてよい',category:'その他',priority:'中',done:false,status:'active',origin,...extra});

test('行動の同時削除は、月・目標・行動・確認時のTODO IDが一致する1件だけを対象にする',()=>{
 const target=task(),others=[task({id:'same-title',origin:undefined}),task({id:'other-month',origin:{...origin,monthKey:'2026-11'}})];
 expect(wishTaskForActionDeletion({'2026-10':month()},[target,...others],origin,'linked')).toBe(target);
 expect(wishTaskForActionDeletion({'2026-10':month()},others,origin,'linked')).toBeUndefined();
 expect(()=>wishTaskForActionDeletion({'2026-10':month()},[target,...others],origin,'same-title')).toThrow();
});
test.each([{repeatRule:'daily'},{isRoutine:true},{origin:undefined}])('確認中にTODOの関連や繰返しが変わった場合は削除しない：%j',change=>{
 expect(()=>wishTaskForActionDeletion({'2026-10':month()},[task(change)],origin,'linked')).toThrow('関連ToDoが変更');
});
test('重複リンク・消えた行動・破損関連を推測して削除しない',()=>{
 expect(()=>wishTaskForActionDeletion({'2026-10':month()},[task(),task({id:'duplicate'})],origin,'linked')).toThrow();
 expect(()=>wishTaskForActionDeletion({'2026-10':{...month(),actions:[]}},[task()],origin,'linked')).toThrow();
 expect(()=>wishTaskForActionDeletion({},[task()],null,'linked')).toThrow();
});
test('Task完了と取消はIDが一致する行動のみ更新し、進捗と履歴を保持する',()=>{
 const months={'2026-10':month()},tasks=[task({done:true,status:'completed',completedAt:'2026-11-22T03:00:00Z'}),task({id:'same-title',origin:undefined})];
 const done=wishMonthsAfterTaskCompletion(months,tasks,['linked']);
 expect(done['2026-10'].actions.map(a=>a.completed)).toEqual([true,false]);expect(calculateWishProgress(done['2026-10']).progress).toBe(33);
 expect(done['2026-10'].reviews).toBe(months['2026-10'].reviews);expect(wishMonthsAfterTaskCompletion(done,tasks,['linked'])).toBe(done);
 const undone=wishMonthsAfterTaskCompletion(done,[task(),tasks[1]],['linked']);expect(undone['2026-10'].actions[0].completed).toBe(false);expect(undone['2026-10'].actions[0].completedAt).toBeUndefined();
});
test('Wish側の明示的な完了差分だけをTask完了/取消の共通経路へ渡す',()=>{
 const before={'2026-10':month()},after=JSON.parse(JSON.stringify(before));after['2026-10'].actions[0].completed=true;
 expect(taskChangesAfterWishEdit(before,after,[task(),task({id:'same-title',origin:undefined})]).completeIds).toEqual(['linked']);
 expect(taskChangesAfterWishEdit(after,before,[task({done:true,status:'completed'})]).restoreIds).toEqual(['linked']);
 after['2026-10'].actions[0].title='文章だけ変更';expect(taskChangesAfterWishEdit(after,{...after},[task()]).completeIds).toEqual([]);
});
test.each([null,{},[],{...origin,monthKey:'2026-99'},{...origin,actionId:''},{...origin,wishId:7}])('破損origin %jを推測関連付けせず安全に無視する',value=>{
 expect(readWishTaskOrigin(value)).toBeUndefined();expect(sameWishTaskOrigin(origin,value)).toBe(false);
 const months={'2026-10':month()};expect(wishMonthsAfterTaskCompletion(months,[task({origin:value,done:true})],['linked'])).toBe(months);
});
test('過去月・存在しない目標・部分破損月は安全で他月に誤反映しない',()=>{
 expect(linkedWishAction({'2026-10':null},origin)).toBeUndefined();
 const data={'2026-10':month(),'2026-11':month()};expect(linkedWishAction(data,{...origin,wishId:'missing'})).toBeUndefined();
 const changed=wishMonthsAfterTaskCompletion(data,[task({done:true})],['linked']);expect(changed['2026-11']).toBe(data['2026-11']);expect(changed['2026-10'].actions[0].completed).toBe(true);
});
test('関連先削除ではTaskだけ独立化し、Task削除では行動の完了状態を変えない',()=>{
 const before={'2026-10':month()},after={'2026-10':{...month(),actions:[]}};
 const change=taskChangesAfterWishEdit(before,after,[task({done:true}),task({id:'ordinary',origin:undefined})]);
 expect(change.tasks).toHaveLength(2);expect(change.tasks[0].origin).toBeUndefined();expect(change.tasks[0].done).toBe(true);expect(change.completeIds).toEqual([]);
 expect(wishMonthsAfterTaskCompletion(before,[],['linked'])).toBe(before);
});
test('繰り返し・ルーティン・破損した重複関連は自動完了連動の対象外',()=>{
 const months={'2026-10':month()};
 for(const tasks of [[task({repeatRule:'daily',done:true})],[task({isRoutine:true,done:true})],[task({done:true}),task({id:'duplicate'})]]){
  expect(wishMonthsAfterTaskCompletion(months,tasks,['linked'])).toBe(months);
  const next={'2026-10':{...month(),actions:month().actions.map(a=>({...a,completed:true}))}};
  expect(taskChangesAfterWishEdit(months,next,tasks.map(t=>({...t,done:false}))).completeIds).toEqual([]);
 }
});
test('既存の繰り返し生成は維持し、次回インスタンスへoriginを複製しない',()=>{
 const next=completeTasksWithRepeats([task({repeatRule:'daily',scheduledDate:'2026-11-21'})],['linked']);
 expect(next.find(t=>t.id==='linked').done).toBe(true);const future=next.find(t=>t.id!=='linked');expect(future.done).toBe(false);expect(future.origin).toBeUndefined();
});
test('旧Task/旧WishActionと新しいoptional originを同じ保存形式で再読込する',async()=>{
 const legacy={id:'old',title:'歩く',done:false,category:'その他',priority:'中'};
 await saveRhythmState({tasks:[legacy,task()],wishMonths:{'2026-10':month()}});
 const loaded=await loadRhythmState();expect(loaded.tasks[0]).toEqual(legacy);expect(loaded.tasks[1].origin).toEqual(origin);expect(loaded.wishMonths['2026-10'].actions[0]).not.toHaveProperty('taskId');
});
