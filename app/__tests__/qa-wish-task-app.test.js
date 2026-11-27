jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-notifications',()=>({...jest.requireActual('expo-notifications'),addNotificationResponseReceivedListener:jest.fn(()=>({remove:jest.fn()})),getPermissionsAsync:jest.fn(async()=>({status:'granted'})),getAllScheduledNotificationsAsync:jest.fn(async()=>[]),cancelScheduledNotificationAsync:jest.fn(async()=>{}),scheduleNotificationAsync:jest.fn(async()=> 'qa-notification'),setNotificationCategoryAsync:jest.fn(async()=>{}),setNotificationChannelAsync:jest.fn(async()=>{})}));
jest.mock('react-native-google-mobile-ads',()=>({__esModule:true,default:()=>({initialize:jest.fn(async()=>{})}),BannerAd:()=>null,BannerAdSize:{BANNER:'banner'},TestIds:{BANNER:'test',REWARDED:'test'},AdEventType:{CLOSED:'closed',ERROR:'error'},RewardedAdEventType:{LOADED:'loaded',EARNED_REWARD:'earned'},RewardedAd:{createForAdRequest:jest.fn()}}));
jest.mock('expo-iap',()=>{const result={connected:true,products:[],subscriptions:[],availablePurchases:[],activeSubscriptions:[],fetchProducts:jest.fn(async()=>[]),requestPurchase:jest.fn(),finishTransaction:jest.fn(),getAvailablePurchases:jest.fn(async()=>[]),getActiveSubscriptions:jest.fn(async()=>[])};return {ErrorCode:{UserCancelled:'cancelled'},getStorefront:jest.fn(async()=>''),useIAP:()=>result};});
jest.mock('expo',()=>({...jest.requireActual('expo'),requireOptionalNativeModule:jest.fn()}));
const React=require('react');
const {render,fireEvent,waitFor,act,cleanup,within}=require('@testing-library/react-native');
const {Alert,Modal,Platform,AppState}=require('react-native');
const storage=require('@react-native-async-storage/async-storage');
const Notifications=require('expo-notifications'),expo=require('expo');
const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage');
const {STORAGE_KEY}=require('../storage/rhythmState');
const {ONBOARDING_STORAGE_KEY}=require('../features/onboarding/onboardingStorage');
const {WishScreen}=require('../WishScreen');
const {wishMonthKey,calculateWishProgress}=require('../features/wish/wishUtils');
const App=require('../App').default;
const key=wishMonthKey(),origin={monthKey:key,wishId:'wish',actionId:'action'};
const originalWrite=storage.setItem.getMockImplementation(),oldPlan=process.env.EXPO_PUBLIC_RHYTHM_PLAN;
let pending=[];
const native={saveSnapshot:jest.fn(async()=>true),getPendingWidgetActions:jest.fn(async()=>JSON.stringify(pending)),acknowledgePendingWidgetActions:jest.fn(async(ids)=>{pending=pending.filter(a=>!ids.includes(a.id));return true}),isLiveActivityAvailable:jest.fn(async()=>false),endLiveActivity:jest.fn(async()=>true)};
const ordinary=(id='sentinel',title='読込完了の目印')=>({id,title,done:false,category:'その他',priority:'中',bucket:'now',repeatRule:'none'});
const makeMonth=()=>({wishes:[{id:'wish',title:'健康的な生活',completed:false,createdAt:new Date().toISOString()}],actions:[{id:'action',wishId:'wish',title:'歩く',completed:false}],review:{}});
const linked=()=>({...ordinary('linked','歩く'),origin});
beforeEach(async()=>{process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';pending=[];jest.clearAllMocks();Notifications.getAllScheduledNotificationsAsync.mockReset().mockResolvedValue([]);Notifications.cancelScheduledNotificationAsync.mockReset().mockResolvedValue(undefined);expo.requireOptionalNativeModule.mockReturnValue(native);await storage.clear();jest.spyOn(Alert,'alert').mockImplementation(()=>{});});
afterEach(()=>{cleanup();storage.setItem.mockImplementation(originalWrite);jest.restoreAllMocks();if(oldPlan===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=oldPlan;});
async function seed(tasks=[ordinary()],months={[key]:makeMonth()}){
 await saveRhythmState({tasks,wishMonths:months,designMode:'minimal'});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',design:'2026-01-01',todo:'2026-01-01',todoComplete:'2026-01-01',completedTasks:'2026-01-01',wish:'2026-01-01'},firstRunStage:'done'}));
}
async function boot(){const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('読込完了の目印').length).toBeGreaterThan(0),{timeout:10000});const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);return view;}
const action=async(k=key)=>(await loadRhythmState()).wishMonths[k].actions[0];
async function openWish(view){fireEvent.press(view.getByText('叶えたいこと'));await waitFor(()=>expect(view.getAllByText('健康的な生活').length).toBeGreaterThan(0));return within(view.UNSAFE_getByType(WishScreen));}
function closeWishEditor(w){fireEvent.press(w.getByText('閉じる'));}
function chooseActionDeletion(label){
 const call=[...Alert.alert.mock.calls].reverse().find(args=>args[0]==='行動を削除しますか？');
 expect(call).toBeDefined();const button=call[2].find(b=>b.text===label);expect(button).toBeDefined();act(()=>button.onPress());
}
async function finishTodoSave(view,w){
 const editorModal=()=>view.UNSAFE_getByType(WishScreen).findAllByType(Modal).find(m=>m.props.animationType==='fade'&&m.props.onDismiss);
 await waitFor(()=>expect(editorModal().props.visible).toBe(false),{timeout:10000});
 if(Platform.OS==='ios'){
  act(()=>editorModal().props.onDismiss());
 }
 expect(w.getByText('行動を保存してToDoに追加しました')).toBeTruthy();
 expect(Alert.alert.mock.calls.some(a=>a[0]==='タスクに追加しました'||a[0]==='関連するToDoがあります')).toBe(false);
}

test('未保存の行動を一度の操作で保存してToDoに追加し、再読込と双方向連動を維持する',async()=>{
 await seed();let view=await boot(),w=await openWish(view);
 fireEvent.press(w.getByText('＋ 行動を追加'));
 fireEvent.changeText(w.getByPlaceholderText('叶えるための行動'),'開き直さず追加');
 fireEvent.press(w.getByText('保存してToDoに追加 ›'));await finishTodoSave(view,w);
 const saved=await loadRhythmState(),created=saved.wishMonths[key].actions.find(a=>a.title==='開き直さず追加');
 expect(created).toBeTruthy();expect(saved.tasks.filter(t=>t.origin?.actionId===created.id)).toHaveLength(1);
 expect(saved.tasks.find(t=>t.origin?.actionId===created.id).title).toBe('開き直さず追加');
 fireEvent.press(w.getByText('開き直さず追加'));
 fireEvent.press(w.getByText('保存してToDoに追加 ›'));await finishTodoSave(view,w);
 expect((await loadRhythmState()).tasks.filter(t=>t.origin?.actionId===created.id)).toHaveLength(1);
 view.unmount();view=await boot();w=await openWish(view);expect(w.getByText('開き直さず追加')).toBeTruthy();
 fireEvent.press(view.getByText('ToDo'));fireEvent.press(view.getByText('一覧'));
 let row=view.getByText('開き直さず追加');
 while(row&&within(row).queryAllByRole('checkbox').length!==1)row=row.parent;
 expect(Boolean(row)).toBe(true);fireEvent.press(within(row).getByRole('checkbox'),{stopPropagation:()=>{}});
 await waitFor(async()=>expect((await loadRhythmState()).wishMonths[key].actions.find(a=>a.id===created.id).completed).toBe(true),{timeout:10000});
},90000);

test.each(['行動','ToDo'])('未保存の行動から直接ToDoを追加し、%s保存保留・失敗後も入力保持・連打防止・再試行・再読込できる',async(stage)=>{
 await seed();let release,held=false;
 storage.setItem.mockImplementation((k,v,...args)=>{
  if(k===STORAGE_KEY&&!held){
   const state=JSON.parse(v);
   const matches=stage==='行動'?state.wishMonths[key].actions.some(a=>a.title==='そのままToDoへ'):state.tasks.some(t=>t.title==='そのままToDoへ');
   if(matches){held=true;return new Promise((resolve,reject)=>{release=()=>reject(new Error('disk full'));});}
  }
  return originalWrite(k,v,...args);
 });
 let view=await boot(),w=await openWish(view);
 fireEvent.press(w.getByText('＋ 行動を追加'));
 fireEvent.changeText(w.getByPlaceholderText('叶えるための行動'),'そのままToDoへ');
 const add=w.getByText('保存してToDoに追加 ›');act(()=>{fireEvent.press(add);fireEvent.press(add);});
 await waitFor(()=>expect(held).toBe(true),{timeout:10000});
 expect(w.getByPlaceholderText('叶えるための行動').props.value).toBe('そのままToDoへ');
 expect(w.getByPlaceholderText('叶えるための行動').props.editable).toBe(false);
 expect(w.queryByText('行動を保存してToDoに追加しました')).toBeNull();
 expect((await loadRhythmState()).tasks.some(t=>t.title==='そのままToDoへ')).toBe(false);
 await act(async()=>release());
 await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('ToDoに追加できませんでした',expect.any(String)));
 expect(w.getByPlaceholderText('叶えるための行動').props.value).toBe('そのままToDoへ');
 fireEvent.press(w.getByText('保存してToDoに追加 ›'));await finishTodoSave(view,w);
 const saved=await loadRhythmState();const actions=saved.wishMonths[key].actions.filter(a=>a.title==='そのままToDoへ');
 expect(actions).toHaveLength(1);
 const tasks=saved.tasks.filter(t=>t.title==='そのままToDoへ');expect(tasks).toHaveLength(1);
 expect(tasks[0].origin).toEqual({monthKey:key,wishId:'wish',actionId:actions[0].id});
 view.unmount();view=await boot();w=await openWish(view);expect(w.getByText('そのままToDoへ')).toBeTruthy();
 expect((await loadRhythmState()).tasks.filter(t=>t.origin?.actionId===actions[0].id)).toHaveLength(1);
},90000);
function wishCheck(w){
 let row=w.getByText('歩く');
 while(row){const checks=within(row).queryAllByRole('checkbox');if(checks.length===1)return checks[0];row=row.parent;}
 throw new Error('行動のチェックボックスがありません');
}
function dismissTaskAction(view){if(Platform.OS==='ios'){const m=view.UNSAFE_getAllByType(Modal).find(m=>m.props.testID==='task-action-modal'&&!m.props.visible);if(m)act(()=>m.props.onDismiss());}}
async function openTaskEditor(view,title='歩く'){
 fireEvent.press(view.getAllByText(title)[0],{stopPropagation:()=>{}});await waitFor(()=>expect(view.getByText('編集')).toBeTruthy());fireEvent.press(view.getByText('編集'));dismissTaskAction(view);
 await waitFor(()=>expect(view.getByPlaceholderText('例：資料をバッグに入れる')).toBeTruthy());
}
async function taskCheck(view){fireEvent.press(view.getByText('一覧'));await waitFor(()=>expect(view.getAllByRole('checkbox').length).toBeGreaterThan(0));fireEvent.press(view.getAllByRole('checkbox')[0],{stopPropagation:()=>{}});}

test('関連ToDoを確認から名前変更済みの正しいToDoへ直接移動し、編集・保存・再読込できる',async()=>{
 await seed([{...linked(),title:'名前を変えた歩行'},ordinary(),ordinary('other','歩く')]);
 let view=await boot();const w=await openWish(view);
 fireEvent.press(w.getByLabelText('歩くの関連ToDoを確認'),{stopPropagation:()=>{}});
 await waitFor(()=>expect(view.getByPlaceholderText('例：資料をバッグに入れる').props.value).toBe('名前を変えた歩行'));
 fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'関連先から編集');fireEvent.press(view.getByText('変更を保存'));
 await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').title).toBe('関連先から編集'));
 expect((await loadRhythmState()).tasks.find(t=>t.id==='other').title).toBe('歩く');
 view.unmount();view=await boot();expect(view.getAllByText('関連先から編集').length).toBeGreaterThan(0);expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').origin).toEqual(origin);
},60000);

test('単体ToDo削除を取り消し、関連ID・他のToDo・Wishの状態を保持して保存・再読込する',async()=>{
 await seed([linked(),ordinary(),ordinary('other','残すToDo')]);let view=await boot();
 fireEvent.press(view.getAllByText('歩く')[0],{stopPropagation:()=>{}});await waitFor(()=>expect(view.getByText('削除')).toBeTruthy());fireEvent.press(view.getByText('削除'));dismissTaskAction(view);
 await waitFor(async()=>expect((await loadRhythmState()).tasks.some(t=>t.id==='linked')).toBe(false));
 const undo=view.getByLabelText('ToDoの削除を元に戻す');act(()=>{fireEvent.press(undo);fireEvent.press(undo)});
 await waitFor(async()=>expect((await loadRhythmState()).tasks.filter(t=>t.id==='linked')).toHaveLength(1));
 expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').origin).toEqual(origin);expect((await action()).completed).toBe(false);
 expect((await loadRhythmState()).tasks.find(t=>t.id==='other').title).toBe('残すToDo');
 view.unmount();view=await boot();expect(view.getAllByText('歩く').length).toBeGreaterThan(0);expect(view.queryByLabelText('ToDoの削除を元に戻す')).toBeNull();
},60000);
test('Wish UIで関連ID付きTODOを作成し連打・重複を防ぐ。同名TODOを関連付けず双方向完了と取消、進捗、編集、削除を再読込する',async()=>{
 await seed([ordinary(),ordinary('same','歩く')]);let view=await boot(),w=await openWish(view);
 fireEvent.press(w.getByText('歩く'));const add=w.getByText('保存してToDoに追加 ›');act(()=>{fireEvent.press(add);fireEvent.press(add)});
 await waitFor(async()=>expect((await loadRhythmState()).tasks.filter(t=>t.origin)).toHaveLength(1),{timeout:10000});
 await finishTodoSave(view,w);
 const id=(await loadRhythmState()).tasks.find(t=>t.origin).id;expect((await loadRhythmState()).tasks.find(t=>t.id===id).origin).toEqual(origin);expect((await loadRhythmState()).tasks.find(t=>t.id==='same').origin).toBeUndefined();
 fireEvent.press(w.getByText('歩く'));fireEvent.press(w.getByText('保存してToDoに追加 ›'));await finishTodoSave(view,w);
 expect((await loadRhythmState()).tasks.filter(t=>t.origin)).toHaveLength(1);fireEvent.press(view.getByText('ToDo'));await taskCheck(view);
 await waitFor(async()=>expect((await action()).completed).toBe(true));expect(calculateWishProgress((await loadRhythmState()).wishMonths[key]).progress).toBe(50);
 expect((await loadRhythmState()).tasks.find(t=>t.id==='same').done).toBe(false);
 fireEvent.press(view.getByText('今'));fireEvent.press(view.getByLabelText('今日できたことを確認'));await waitFor(()=>expect(view.getByText('元に戻す')).toBeTruthy());fireEvent.press(view.getByText('元に戻す'));await waitFor(async()=>expect((await action()).completed).toBe(false));
 w=await openWish(view);fireEvent.press(wishCheck(w),{stopPropagation:()=>{}});await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id===id).done).toBe(true));
 expect(wishCheck(w).props.accessibilityState.checked).toBe(true);expect(w.getAllByText('50%').length).toBeGreaterThan(0);fireEvent.press(wishCheck(w),{stopPropagation:()=>{}});await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id===id).done).toBe(false));
 fireEvent.press(view.getByText('ToDo'));await openTaskEditor(view);fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'ウォーキングに変更');fireEvent.press(view.getByText('変更を保存'));
 await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id===id).title).toBe('ウォーキングに変更'));expect((await action()).title).toBe('歩く');
 view.unmount();view=await boot();expect(view.getAllByText('ウォーキングに変更').length).toBeGreaterThan(0);expect((await loadRhythmState()).tasks.find(t=>t.id===id).origin).toEqual(origin);
 fireEvent.press(view.getAllByText('ウォーキングに変更')[0],{stopPropagation:()=>{}});await waitFor(()=>expect(view.getByText('削除')).toBeTruthy());fireEvent.press(view.getByText('削除'));dismissTaskAction(view);
 await waitFor(async()=>expect((await loadRhythmState()).tasks.some(t=>t.id===id)).toBe(false));expect((await action()).completed).toBe(false);
 view.unmount();view=await boot();expect(view.queryByText('ウォーキングに変更')).toBeNull();
},90000);
test('WishActionをUIで削除してもTODOは独立して残り、再読込して完了できる',async()=>{
 await seed([linked(),ordinary()]);let view=await boot(),w=await openWish(view);fireEvent.press(w.getByText('歩く'));fireEvent.press(w.getByText('削除'));
 chooseActionDeletion('行動だけ削除');
 await waitFor(async()=>expect((await loadRhythmState()).wishMonths[key].actions).toHaveLength(0));expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').origin).toBeUndefined();
 view.unmount();view=await boot();await taskCheck(view);await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').done).toBe(true));expect((await loadRhythmState()).wishMonths[key].actions).toHaveLength(0);
},60000);

test('行動削除の確認をキャンセルすると、行動・TODO・関連IDを変更しない',async()=>{
 await seed([linked(),ordinary()]);const view=await boot(),w=await openWish(view);
 fireEvent.press(w.getByText('歩く'));fireEvent.press(w.getByText('削除'));chooseActionDeletion('キャンセル');
 expect(w.getByPlaceholderText('叶えるための行動').props.value).toBe('歩く');
 const saved=await loadRhythmState();expect(saved.wishMonths[key].actions).toHaveLength(1);expect(saved.tasks.find(t=>t.id==='linked').origin).toEqual(origin);
});

test('関連TODOも削除する本番経路は、同名・別月を保護し、通知取消失敗・保存保留中の別TODO完了でも一つのsnapshotを保存する',async()=>{
 const previousMonth=key==='2026-01'?'2025-12':'2026-01',otherMonthTask={...linked(),id:'past-linked',origin:{...origin,monthKey:previousMonth}};
 await seed([linked(),ordinary(),ordinary('same-name','歩く'),ordinary('other','別TODO'),otherMonthTask],{[key]:makeMonth(),[previousMonth]:makeMonth()});
 let view=await boot(),w=await openWish(view),release,held=false;const attempts=[];
 storage.setItem.mockImplementation((k,v,...args)=>{
  if(k===STORAGE_KEY){const snapshot=JSON.parse(v);attempts.push(snapshot);
   if(!held&&snapshot.wishMonths[key].actions.length===0&&!snapshot.tasks.some(t=>t.id==='linked')){held=true;return new Promise(resolve=>{release=()=>Promise.resolve(originalWrite(k,v,...args)).then(resolve);});}
  }return originalWrite(k,v,...args);
 });
 jest.spyOn(console,'warn').mockImplementation(()=>{});
 Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([{identifier:'linked-notice',content:{data:{taskId:'linked'}}}]);
 Notifications.cancelScheduledNotificationAsync.mockRejectedValue(Error('Native cancellation failed'));
 try {
  fireEvent.press(w.getByText('歩く'));fireEvent.press(w.getByText('削除'));chooseActionDeletion('関連TODOも一緒に削除');
  await waitFor(()=>expect(held).toBe(true),{timeout:10000});expect(w.getByPlaceholderText('叶えるための行動').props.value).toBe('歩く');expect(w.getByText('削除中…')).toBeTruthy();
  expect((await loadRhythmState()).tasks.some(t=>t.id==='linked')).toBe(true);expect((await loadRhythmState()).wishMonths[key].actions).toHaveLength(1);
  const callback=Notifications.addNotificationResponseReceivedListener.mock.calls.at(-1)[0];
  await act(async()=>callback({actionIdentifier:'DONE',notification:{request:{identifier:'other-note',content:{data:{taskId:'other'},body:'別TODO'}}}}));
  await act(async()=>{const finish=release;release=undefined;await finish();});
  await waitFor(async()=>{const saved=await loadRhythmState();expect(saved.wishMonths[key].actions).toHaveLength(0);expect(saved.tasks.some(t=>t.id==='linked')).toBe(false);expect(saved.tasks.find(t=>t.id==='other').done).toBe(true);},{timeout:10000});
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('linked-notice');
  for(const snapshot of attempts)expect(snapshot.wishMonths[key].actions.length===0).toBe(!snapshot.tasks.some(t=>t.id==='linked'));
  expect((await loadRhythmState()).tasks.find(t=>t.id==='same-name')).toBeTruthy();expect((await loadRhythmState()).tasks.find(t=>t.id==='past-linked').origin).toEqual(otherMonthTask.origin);
  expect((await loadRhythmState()).wishMonths[previousMonth].actions).toHaveLength(1);
  view.unmount();view=await boot();w=await openWish(view);expect(w.queryByText('歩く')).toBeNull();fireEvent.press(view.getByText('ToDo'));expect((await loadRhythmState()).tasks.some(t=>t.id==='linked')).toBe(false);
 }finally{if(release)await act(async()=>release());}
},90000);

test('行動とTODOの同時削除が保存失敗した場合は編集画面を保持し、再試行・再起動後も両方の削除と他TODOの変更を保持する',async()=>{
 await seed([linked(),ordinary(),ordinary('other','別TODO')]);let view=await boot(),w=await openWish(view),fail=true;
 jest.spyOn(console,'warn').mockImplementation(()=>{});
 storage.setItem.mockImplementation((k,v,...args)=>k===STORAGE_KEY&&JSON.parse(v).wishMonths[key].actions.length===0&&fail?Promise.reject(Error('disk full')):originalWrite(k,v,...args));
 fireEvent.press(w.getByText('歩く'));fireEvent.press(w.getByText('削除'));chooseActionDeletion('関連TODOも一緒に削除');
 await waitFor(()=>expect(w.getByText('削除を再試行')).toBeTruthy(),{timeout:10000});
 expect(w.getByPlaceholderText('叶えるための行動').props.value).toBe('歩く');expect(w.getByPlaceholderText('叶えるための行動').props.editable).toBe(false);
 expect((await loadRhythmState()).wishMonths[key].actions).toHaveLength(1);expect((await loadRhythmState()).tasks.find(t=>t.id==='linked')).toBeTruthy();
 const callback=Notifications.addNotificationResponseReceivedListener.mock.calls.at(-1)[0];
 await act(async()=>callback({actionIdentifier:'DONE',notification:{request:{identifier:'other-note',content:{data:{taskId:'other'},body:'別TODO'}}}}));
 fail=false;fireEvent.press(w.getByText('削除を再試行'));
 await waitFor(async()=>{const saved=await loadRhythmState();expect(saved.wishMonths[key].actions).toHaveLength(0);expect(saved.tasks.some(t=>t.id==='linked')).toBe(false);expect(saved.tasks.find(t=>t.id==='other').done).toBe(true);},{timeout:10000});
 await waitFor(()=>expect(w.queryByPlaceholderText('叶えるための行動')).toBeNull());
 view.unmount();view=await boot();expect((await loadRhythmState()).wishMonths[key].actions).toHaveLength(0);expect((await loadRhythmState()).tasks.some(t=>t.id==='linked')).toBe(false);
},90000);
test('関連TODO作成の保存保留・失敗で成功を表示せず、入力を保持して重複なしで再試行・再読込する',async()=>{
 await seed();let release,held=false;storage.setItem.mockImplementation((k,v,...args)=>{if(k===STORAGE_KEY&&JSON.parse(v).tasks.some(t=>t.origin)&&!held){held=true;return new Promise((resolve,reject)=>{release=()=>reject(new Error('disk full'))})}return originalWrite(k,v,...args)});
 let view=await boot(),w=await openWish(view);fireEvent.press(w.getByText('歩く'));fireEvent.press(w.getByText('保存してToDoに追加 ›'));
 await waitFor(()=>expect(held).toBe(true),{timeout:10000});expect(Alert.alert.mock.calls.some(a=>a[0]==='タスクに追加しました')).toBe(false);expect(w.getByPlaceholderText('叶えるための行動').props.value).toBe('歩く');expect((await loadRhythmState()).tasks.some(t=>t.origin)).toBe(false);
 await act(async()=>release());await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('ToDoに追加できませんでした',expect.any(String)));expect(w.getByPlaceholderText('叶えるための行動').props.value).toBe('歩く');
 fireEvent.press(w.getByText('保存してToDoに追加 ›'));await finishTodoSave(view,w);expect((await loadRhythmState()).tasks.filter(t=>t.origin)).toHaveLength(1);
 view.unmount();view=await boot();expect((await loadRhythmState()).tasks.find(t=>t.origin).origin).toEqual(origin);
},60000);
test('過去月の関連だけを更新し、書込保留中の別TODO編集も同じ保存キューへ残す',async()=>{
 const past='2025-12';await seed([{...linked(),origin:{...origin,monthKey:past}},ordinary(),ordinary('edit-other','別TODO')],{[key]:makeMonth(),[past]:makeMonth()});
 let view=await boot(),release,held=false;const snapshots=[];
 storage.setItem.mockImplementation((k,v,...args)=>{if(k===STORAGE_KEY){const s=JSON.parse(v);snapshots.push(s);if(s.tasks.find(t=>t.id==='linked')?.done&&!held){held=true;return new Promise(resolve=>{release=()=>Promise.resolve(originalWrite(k,v,...args)).then(resolve)})}}return originalWrite(k,v,...args)});
 await taskCheck(view);await waitFor(()=>expect(held).toBe(true));
 await openTaskEditor(view,'別TODO');fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'保存中の別TODO編集');fireEvent.press(view.getByText('変更を保存'));
 await act(async()=>release());await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id==='edit-other').title).toBe('保存中の別TODO編集'),{timeout:10000});
 for(const s of snapshots){expect(s.wishMonths[past].actions[0].completed).toBe(s.tasks.find(t=>t.id==='linked').done)}
 expect((await action()).completed).toBe(false);expect((await action(past)).completed).toBe(true);view.unmount();view=await boot();expect((await action(past)).completed).toBe(true);
},60000);
test('関連TODOの繰り返し変更は確認取消で維持、明示確認後だけ解除して通常の次回生成を行う',async()=>{
 await seed([linked(),ordinary()]);const view=await boot();await openTaskEditor(view);
 const details=view.queryByText('必要なら詳しく設定');if(details)fireEvent.press(details);fireEvent.press(view.getByText('繰り返し'));fireEvent.press(view.getByText('毎日'));fireEvent.press(view.getByText('変更を保存'));
 await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('目標との連動を解除しますか？',expect.any(String),expect.any(Array)));
 let buttons=Alert.alert.mock.calls.find(a=>a[0]==='目標との連動を解除しますか？')[2];act(()=>buttons.find(b=>b.style==='cancel').onPress?.());expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').origin).toEqual(origin);
 fireEvent.press(view.getByText('変更を保存'));buttons=Alert.alert.mock.calls.filter(a=>a[0]==='目標との連動を解除しますか？').at(-1)[2];act(()=>buttons.find(b=>b.text==='連動を解除して変更').onPress());
 await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').repeatRule).toBe('daily'));expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').origin).toBeUndefined();
 await taskCheck(view);await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').done).toBe(true));expect((await action()).completed).toBe(false);expect((await loadRhythmState()).tasks.filter(t=>t.repeatRule==='daily')).toHaveLength(2);
},60000);
test('Widget/SiriのNative保留完了を本番Appで取り込み、行動・保存・Widget Snapshotへ反映する',async()=>{
 await seed([linked(),ordinary()]);pending=[{id:'native-complete',type:'completeTask',taskId:'linked'}];let view=await boot();
 await waitFor(async()=>expect((await action()).completed).toBe(true),{timeout:10000});expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').done).toBe(true);
 await waitFor(()=>expect(native.saveSnapshot.mock.calls.some(c=>JSON.parse(c[0]).goal?.completedActions===1)).toBe(true),{timeout:10000});
 expect(pending).toHaveLength(0);view.unmount();view=await boot();expect((await action()).completed).toBe(true);
},60000);
test('通知DONEの本番コールバックも関連行動を更新し、取消処理を維持する',async()=>{
 await seed([linked(),ordinary()]);const view=await boot();const cb=Notifications.addNotificationResponseReceivedListener.mock.calls.at(-1)[0];
 await act(async()=>cb({actionIdentifier:'DONE',notification:{request:{identifier:'notice',content:{data:{taskId:'linked'},body:'歩く'}}}}));
 await waitFor(async()=>expect((await action()).completed).toBe(true));expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalled();
},60000);
test('Nativeの関連完了は保存保留・失敗中にACKせず、再試行成功後だけキューから外す',async()=>{
 await seed([linked(),ordinary()]);pending=[{id:'durable-complete',type:'completeTask',taskId:'linked'}];let fail,held=false;
 storage.setItem.mockImplementation((k,v,...args)=>{
  if(k===STORAGE_KEY&&JSON.parse(v).tasks.find(t=>t.id==='linked')?.done&&!held){held=true;return new Promise((resolve,reject)=>{fail=()=>reject(new Error('native completion save failed'))})}
  return originalWrite(k,v,...args);
 });
 const view=await boot();await waitFor(()=>expect(held).toBe(true),{timeout:10000});expect(pending).toHaveLength(1);expect(native.acknowledgePendingWidgetActions).not.toHaveBeenCalled();
 await act(async()=>fail());await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('保存できませんでした',expect.any(String)),{timeout:10000});expect(pending).toHaveLength(1);
 fireEvent.press(view.getByText('保存を再試行'));await waitFor(async()=>expect((await action()).completed).toBe(true),{timeout:10000});await waitFor(()=>expect(pending).toHaveLength(0),{timeout:10000});
 expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').done).toBe(true);
},60000);
test('連動完了の保存失敗は両方未保存のまま残し、UI再試行と連続完了取消で整合して復元する',async()=>{
 await seed([linked(),ordinary()]);let failed=false;const writes=[];
 storage.setItem.mockImplementation((k,v,...args)=>{
  if(k===STORAGE_KEY){const state=JSON.parse(v);writes.push(state);if(state.tasks.find(t=>t.id==='linked')?.done&&!failed){failed=true;return Promise.reject(new Error('save unavailable'))}}
  return originalWrite(k,v,...args);
 });
 let view=await boot();await taskCheck(view);await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('保存できませんでした',expect.any(String)),{timeout:10000});
 expect((await action()).completed).toBe(false);expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').done).toBe(false);
 let w=await openWish(view);expect(wishCheck(w).props.accessibilityState.checked).toBe(true);
 fireEvent.press(view.getByText('保存を再試行'));await waitFor(async()=>expect((await action()).completed).toBe(true),{timeout:10000});
 const check=wishCheck(w);act(()=>{fireEvent.press(check,{stopPropagation:()=>{}});fireEvent.press(check,{stopPropagation:()=>{}})});
 await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').done).toBe(true));
 for(const state of writes)expect(state.tasks.find(t=>t.id==='linked').done).toBe(state.wishMonths[key].actions[0].completed);
 view.unmount();view=await boot();w=await openWish(view);expect(wishCheck(w).props.accessibilityState.checked).toBe(true);
},60000);
test('Native完了の保存中にWish側で取消しても古い完了を再適用せず最新状態の保存後にACKする',async()=>{
 await seed([linked(),ordinary()]);pending=[{id:'native-undo-race',type:'completeTask',taskId:'linked'}];let release,held=false;
 storage.setItem.mockImplementation((k,v,...args)=>{
  if(k===STORAGE_KEY&&JSON.parse(v).tasks.find(t=>t.id==='linked')?.done&&!held){held=true;return new Promise(resolve=>{release=()=>Promise.resolve(originalWrite(k,v,...args)).then(resolve)})}
  return originalWrite(k,v,...args);
 });
 let view=await boot();await waitFor(()=>expect(held).toBe(true),{timeout:10000});const w=await openWish(view);expect(wishCheck(w).props.accessibilityState.checked).toBe(true);
 fireEvent.press(wishCheck(w),{stopPropagation:()=>{}});expect(wishCheck(w).props.accessibilityState.checked).toBe(false);expect(pending).toHaveLength(1);
 await act(async()=>release());await waitFor(()=>expect(pending).toHaveLength(0),{timeout:10000});expect((await action()).completed).toBe(false);expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').done).toBe(false);
 view.unmount();view=await boot();expect((await action()).completed).toBe(false);
},60000);
test('Native ACK失敗・一時的な空キュー後の再取込でも、保存済みのWish取消を再完了しない',async()=>{
 const getImpl=native.getPendingWidgetActions.getMockImplementation(),ackImpl=native.acknowledgePendingWidgetActions.getMockImplementation();
 const listeners=[];jest.spyOn(AppState,'addEventListener').mockImplementation((_type,cb)=>{listeners.push(cb);return {remove:jest.fn()}});
 let readable=true,canAck=false;const ackStates=[];
 native.getPendingWidgetActions.mockImplementation(async()=>JSON.stringify(readable?pending:[]));
 native.acknowledgePendingWidgetActions.mockImplementation(async ids=>{
  if(!canAck){readable=false;return false;}
  ackStates.push(await loadRhythmState());pending=pending.filter(a=>!ids.includes(a.id));return true;
 });
 try{
  await seed([linked(),ordinary()]);pending=[{id:'ack-retry-undo',type:'completeTask',taskId:'linked'}];const view=await boot();
  await waitFor(()=>expect(native.acknowledgePendingWidgetActions).toHaveBeenCalled(),{timeout:10000});
  const w=await openWish(view);expect(wishCheck(w).props.accessibilityState.checked).toBe(true);
  fireEvent.press(wishCheck(w),{stopPropagation:()=>{}});
  await waitFor(async()=>expect((await action()).completed).toBe(false),{timeout:10000});
  expect(pending).toHaveLength(1);readable=true;canAck=true;
  await act(async()=>{listeners.forEach(cb=>cb('active'));});
  await waitFor(()=>expect(pending).toHaveLength(0),{timeout:10000});
  expect(ackStates).toHaveLength(1);expect(ackStates[0].tasks.find(t=>t.id==='linked').done).toBe(false);
  expect(ackStates[0].wishMonths[key].actions[0].completed).toBe(false);
  expect((await action()).completed).toBe(false);
  view.unmount();await boot();expect((await action()).completed).toBe(false);
 }finally{native.getPendingWidgetActions.mockImplementation(getImpl);native.acknowledgePendingWidgetActions.mockImplementation(ackImpl);}
},60000);

test('TODO編集中に通知から完了しても古い編集snapshotで完了・関連IDを巻き戻さない',async()=>{
 await seed([linked(),ordinary()]);let view=await boot();await openTaskEditor(view);fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'編集中の変更');
 const cb=Notifications.addNotificationResponseReceivedListener.mock.calls.at(-1)[0];await act(async()=>cb({actionIdentifier:'DONE',notification:{request:{identifier:'editing-notice',content:{data:{taskId:'linked'},body:'歩く'}}}}));
 await waitFor(async()=>expect((await action()).completed).toBe(true));fireEvent.press(view.getByText('変更を保存'));
 await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').title).toBe('編集中の変更'));
 const task=(await loadRhythmState()).tasks.find(t=>t.id==='linked');expect(task.done).toBe(true);expect(task.origin).toEqual(origin);expect((await action()).completed).toBe(true);
 view.unmount();view=await boot();expect((await loadRhythmState()).tasks.find(t=>t.id==='linked').done).toBe(true);
},60000);
