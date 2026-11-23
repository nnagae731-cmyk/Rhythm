jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo',()=>({...jest.requireActual('expo'),requireOptionalNativeModule:jest.fn()}));
jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-notifications',()=>({...jest.requireActual('expo-notifications'),addNotificationResponseReceivedListener:jest.fn(()=>({remove:jest.fn()})),getPermissionsAsync:jest.fn(async()=>({status:'granted'})),getAllScheduledNotificationsAsync:jest.fn(async()=>[]),cancelScheduledNotificationAsync:jest.fn(async()=>{}),scheduleNotificationAsync:jest.fn(async()=> 'qa-notification'),setNotificationCategoryAsync:jest.fn(async()=>{}),setNotificationChannelAsync:jest.fn(async()=>{})}));
jest.mock('react-native-google-mobile-ads',()=>({BannerAd:()=>null,BannerAdSize:{BANNER:'banner'},TestIds:{BANNER:'test',REWARDED:'test'},RewardedAd:{createForAdRequest:jest.fn()}}));
jest.mock('expo-iap',()=>{const result={connected:true,products:[],subscriptions:[],availablePurchases:[],activeSubscriptions:[],fetchProducts:jest.fn(async()=>[]),requestPurchase:jest.fn(),finishTransaction:jest.fn(),getAvailablePurchases:jest.fn(async()=>[]),getActiveSubscriptions:jest.fn(async()=>[])};return {ErrorCode:{UserCancelled:'cancelled'},getStorefront:jest.fn(async()=>''),useIAP:()=>result};});
const React=require('react');
const {render,cleanup,waitFor,fireEvent,act}=require('@testing-library/react-native');
const storage=require('@react-native-async-storage/async-storage');
const expo=require('expo');
const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage');
const {Modal,Platform,StyleSheet}=require('react-native');
const {HomeScreen}=require('../screens/HomeScreen');
const {BottomNav,getBottomNavTopOffset}=require('../components/BottomNav');
const {getThemeTokens}=require('../theme');
const focusPrompt=view=>view.UNSAFE_root.findAll(n=>typeof n.type==='function'&&n.type.name==='FocusTaskCompletionModal')[0];
const {ONBOARDING_STORAGE_KEY}=require('../features/onboarding/onboardingStorage');
const native={saveSnapshot:jest.fn(async()=>true),isLiveActivityAvailable:jest.fn(async()=>true),startOrUpdateLiveActivity:jest.fn(async()=>true),endLiveActivity:jest.fn(async()=>true),getLiveActivityStatus:jest.fn(async()=>JSON.stringify({available:true,active:true})),getPendingWidgetActions:jest.fn(async()=> '[]')};
beforeEach(async()=>{jest.clearAllMocks();expo.requireOptionalNativeModule.mockReturnValue(native);await storage.clear();await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',todoComplete:'2026-01-01'},firstRunStage:'done'}));});
afterEach(()=>cleanup());

async function openFocusApp(title){
 const App=require('../App').default;const view=render(<App/>);
 await waitFor(()=>expect(view.getAllByText(title).length).toBeGreaterThan(0),{timeout:10000});
 const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);
 return view;
}
async function editFocusTask(view,title){
 fireEvent.press(view.getAllByText(title)[0],{stopPropagation:()=>{}});
 await waitFor(()=>expect(view.getByText('編集')).toBeTruthy());fireEvent.press(view.getByText('編集'));
 if(Platform.OS==='ios'){const modal=view.UNSAFE_getAllByType(Modal).find(m=>m.props.testID==='task-action-modal'&&!m.props.visible);if(modal)act(()=>modal.props.onDismiss());}
 await waitFor(()=>expect(view.getByPlaceholderText('例：資料をバッグに入れる')).toBeTruthy());
}

test('Darkのタスクなし集中は一時停止を正しく表示し、時間選択・空表示・リセットと案内バーをテーマに揃える',async()=>{
 const next=new Date();next.setDate(next.getDate()+1);const tomorrow=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
 await saveRhythmState({designMode:'dark',monoAppearance:'dark',tasks:[{id:'future-only',title:'未来の復元目印',scheduledDate:tomorrow,done:false,category:'その他',priority:'中',bucket:'now'}]});
 const App=require('../App').default;const view=render(<App/>);
 // Home deliberately excludes future tasks; restored Dark mode is the
 // observable hydration marker here, rather than a task Home must hide.
 await waitFor(()=>expect(view.UNSAFE_getByType(HomeScreen).props.designMode).toBe('dark'),{timeout:10000});
 const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);
 fireEvent.press(view.getByLabelText('集中する'),{stopPropagation:()=>{}});await waitFor(()=>expect(view.getByText('スタート')).toBeTruthy());
 const colors=getThemeTokens('dark').colors;
 expect(view.getByText('自分の時間に集中')).toBeTruthy();expect(view.getByTestId('focus-timer-state').props.children).toBe('準備OK');
 expect(StyleSheet.flatten(view.getByTestId('focus-empty-tasks').props.style).backgroundColor).toBe(colors.surface);
 expect(StyleSheet.flatten(view.getByRole('button',{name:'集中時間を15分に設定'}).props.style).backgroundColor).toBe(colors.surface);
 expect(StyleSheet.flatten(view.getByRole('button',{name:'カスタム集中時間を設定'}).props.style).backgroundColor).toBe(colors.surface);
 expect(view.getByText('カスタム').props.numberOfLines).toBe(1);expect(view.queryByText('好きな時間')).toBeNull();
 expect(StyleSheet.flatten(view.getByRole('button',{name:'集中時間を15分に設定'}).props.style).minHeight).toBeGreaterThanOrEqual(44);
 expect(StyleSheet.flatten(view.getByText('リセット').props.style).color).toBe(colors.primaryText);
 fireEvent.press(view.getByRole('button',{name:'集中時間を5分に設定'}));fireEvent.press(view.getByText('スタート'));
 await waitFor(()=>expect(view.getByTestId('focus-timer-state').props.children).toBe('集中中'));
 fireEvent.press(view.getByText('一時停止'));await waitFor(()=>expect(view.getByTestId('focus-timer-state').props.children).toBe('一時停止中'));
 expect(view.getByText('再開')).toBeTruthy();expect(view.queryByText('準備OK')).toBeNull();
 fireEvent.press(view.getByRole('tab',{name:'ToDo'}));await waitFor(()=>expect(view.getByLabelText('集中タイマーを開く')).toBeTruthy());
 const notices=view.getByTestId('app-status-notices'),nav=view.UNSAFE_getByType(BottomNav);
 expect(StyleSheet.flatten(notices.props.style).bottom).toBe(getBottomNavTopOffset('dark')+8);
 expect(nav.parent.findAll(n=>n.props.testID==='app-status-notices').length).toBeGreaterThan(0);
 fireEvent(notices,'layout',{nativeEvent:{layout:{x:16,y:500,width:280,height:72}}});
 expect(StyleSheet.flatten(view.getByTestId('app-main-scroll').props.contentContainerStyle).paddingBottom).toBeGreaterThanOrEqual(getBottomNavTopOffset('dark')+8+72+16);
 expect((await loadRhythmState()).tasks[0].scheduledDate).toBe(tomorrow);
},90000);

test('集中を継続したまま全タブと予定表へ移動し、ToDo編集・一時停止・再開・再読込を行える',async()=>{
 await saveRhythmState({liveActivityEnabled:true,tasks:[{id:'focus-nav',title:'画面移動中の集中',done:false,category:'その他',priority:'中',bucket:'now'}]});
 let view=await openFocusApp('画面移動中の集中');
 fireEvent.press(view.getByLabelText('集中する'),{stopPropagation:()=>{}});await waitFor(()=>expect(view.getByText('スタート')).toBeTruthy());fireEvent.press(view.getByText('スタート'));
 await waitFor(async()=>expect((await loadRhythmState()).focusState?.running).toBe(true),{timeout:10000});
 const original=(await loadRhythmState()).focusState;
 fireEvent.press(view.getByRole('tab',{name:'ToDo'}));await waitFor(()=>expect(view.getByLabelText('集中タイマーを開く')).toBeTruthy());
 await editFocusTask(view,'画面移動中の集中');fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'集中中に編集済み');fireEvent.press(view.getByText('変更を保存'));
 await waitFor(async()=>expect((await loadRhythmState()).tasks[0].title).toBe('集中中に編集済み'),{timeout:10000});
 for(const name of ['設定','分析','叶えたいこと','予定']){fireEvent.press(view.getByRole('tab',{name}));expect(view.getByRole('tab',{name}).props.accessibilityState.selected).toBe(true);}
 fireEvent.press(view.getByText('予定表'));await waitFor(()=>expect(view.queryByText('一時停止')).toBeNull());
 expect((await loadRhythmState()).focusState.endAt).toBe(original.endAt);
 fireEvent.press(view.getByText('集中'));await waitFor(()=>expect(view.getByText('一時停止')).toBeTruthy());fireEvent.press(view.getByText('一時停止'));
 await waitFor(async()=>expect((await loadRhythmState()).focusState.running).toBe(false));
 fireEvent.press(view.getByRole('tab',{name:'ToDo'}));expect(view.getByLabelText('集中タイマーを開く')).toBeTruthy();
 fireEvent.press(view.getByLabelText('集中タイマーを開く'));await waitFor(()=>expect(view.getByText('再開')).toBeTruthy());fireEvent.press(view.getByText('再開'));
 await waitFor(async()=>expect((await loadRhythmState()).focusState.running).toBe(true));
 expect((await loadRhythmState()).focusState.sessionId).toBe(original.sessionId);
 fireEvent.press(view.getByRole('tab',{name:'設定'}));view.unmount();view=await openFocusApp('集中中に編集済み');
 await waitFor(()=>expect(view.getByLabelText('集中タイマーを開く')).toBeTruthy());
 expect((await loadRhythmState()).focusState.sessionId).toBe(original.sessionId);
 fireEvent.press(view.getByLabelText('集中タイマーを開く'));await waitFor(()=>expect(view.getByText('一時停止')).toBeTruthy());fireEvent.press(view.getByText('リセット'));
 await waitFor(async()=>expect((await loadRhythmState()).focusState).toBeUndefined());
 expect((await loadRhythmState()).focusSessions).toHaveLength(0);
},90000);

test('他画面のToDo編集中に集中が終了してもModalを重ねず、記録・Live Activityを更新して再読込する',async()=>{
 await saveRhythmState({liveActivityEnabled:true,tasks:[{id:'focus-away-end',title:'別画面で終了する集中',done:false,category:'その他',priority:'中',bucket:'now'}]});
 let view=await openFocusApp('別画面で終了する集中'),clock;
 try{
  fireEvent.press(view.getByLabelText('集中する'),{stopPropagation:()=>{}});await waitFor(()=>expect(view.getByText('スタート')).toBeTruthy());fireEvent.press(view.getByText('5分'));fireEvent.press(view.getByText('スタート'));
  await waitFor(async()=>expect((await loadRhythmState()).focusState?.running).toBe(true),{timeout:10000});const sessionId=(await loadRhythmState()).focusState.sessionId;
  fireEvent.press(view.getByRole('tab',{name:'ToDo'}));await editFocusTask(view,'別画面で終了する集中');fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'終了時も入力を保持');
  const later=Date.now()+6*60*1000;clock=jest.spyOn(Date,'now').mockReturnValue(later);
  await waitFor(async()=>expect((await loadRhythmState()).focusSessions?.filter(s=>s.id===sessionId)).toHaveLength(1),{timeout:10000});
  expect(view.getByPlaceholderText('例：資料をバッグに入れる').props.value).toBe('終了時も入力を保持');
  expect(focusPrompt(view).props.session).toBeUndefined();
  await waitFor(()=>expect(JSON.parse(native.startOrUpdateLiveActivity.mock.calls.at(-1)[0]).mode).not.toBe('focus'),{timeout:10000});
  fireEvent.press(view.getByText('変更を保存'));await waitFor(async()=>expect((await loadRhythmState()).tasks[0].title).toBe('終了時も入力を保持'));
  fireEvent.press(view.getByLabelText('集中の結果を確認'));await waitFor(()=>expect(focusPrompt(view).props.session?.id).toBe(sessionId));
  fireEvent.press(view.getByText('後で'));expect((await loadRhythmState()).tasks[0].done).toBe(false);
  view.unmount();clock.mockRestore();clock=undefined;view=await openFocusApp('終了時も入力を保持');
  expect((await loadRhythmState()).focusState).toBeUndefined();expect((await loadRhythmState()).focusSessions.filter(s=>s.id===sessionId)).toHaveLength(1);
 }finally{clock?.mockRestore();}
},90000);
test('Widget手動更新はNative保存の失敗・成功を区別する',async()=>{
 const {Alert}=require('react-native');const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});native.saveSnapshot.mockResolvedValue(false);
 try{
  await saveRhythmState({tasks:[{id:'manual-widget',title:'Widget保存結果の目印',done:false,category:'その他',priority:'中',bucket:'now'}]});const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('Widget保存結果の目印').length).toBeGreaterThan(0),{timeout:7000});await waitFor(()=>expect(native.saveSnapshot).toHaveBeenCalled(),{timeout:7000});const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);fireEvent.press(view.getByText('設定'));fireEvent.press(view.getByLabelText('ウィジェットを更新'));
  await waitFor(()=>expect(alert.mock.calls.some(a=>a[0]==='Widgetを更新できませんでした')).toBe(true),{timeout:7000});expect(alert.mock.calls.some(a=>a[0]==='Widgetを更新しました')).toBe(false);await waitFor(()=>expect(view.getByLabelText('ウィジェットを更新').props.accessibilityState.busy).toBe(false));
  native.saveSnapshot.mockResolvedValue(true);fireEvent.press(view.getByLabelText('ウィジェットを更新'));await waitFor(()=>expect(alert.mock.calls.some(a=>a[0]==='Widgetを更新しました')).toBe(true),{timeout:7000});
 }finally{native.saveSnapshot.mockResolvedValue(true);alert.mockRestore();}
},30000);
test('Live Activity開始APIの実行中にOFFになっても最後は終了する',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve});native.startOrUpdateLiveActivity.mockImplementationOnce(()=>gate);
 try{
  await saveRhythmState({liveActivityEnabled:true,tasks:[{id:'inflight-live',title:'開始中のOFF確認',done:false,category:'その他',priority:'中',bucket:'now'}]});const App=require('../App').default;const view=render(<App/>);
  await waitFor(()=>expect(native.startOrUpdateLiveActivity).toHaveBeenCalled(),{timeout:7000});native.endLiveActivity.mockClear();fireEvent.press(view.getByText('設定'));fireEvent(view.getByLabelText('ライブアクティビティ'),'valueChange',false);
  expect(native.endLiveActivity).not.toHaveBeenCalled();await act(async()=>{release(true);await gate;});await waitFor(()=>expect(native.endLiveActivity).toHaveBeenCalledTimes(1),{timeout:7000});expect(native.getLiveActivityStatus).not.toHaveBeenCalled();
 }finally{release(true);native.startOrUpdateLiveActivity.mockResolvedValue(true);}
},90000);
test('Live Activityの利用不可理由はNative未搭載・システム非対応・API失敗を区別する',async()=>{
 const {getRhythmLiveActivityAvailability}=require('../features/widget/rhythmLiveActivity');
 expo.requireOptionalNativeModule.mockReturnValue(null);expect(await getRhythmLiveActivityAvailability()).toEqual({available:false,reason:'native-missing'});
 expo.requireOptionalNativeModule.mockReturnValue(native);native.isLiveActivityAvailable.mockResolvedValueOnce(false);expect(await getRhythmLiveActivityAvailability()).toEqual({available:false,reason:'unavailable'});
 native.isLiveActivityAvailable.mockRejectedValueOnce(Error('native failed'));expect(await getRhythmLiveActivityAvailability()).toEqual({available:false,reason:'failed'});
});
test('Live Activity開始の応答待ち中にOFFにしたら古い開始処理を実行しない',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve});native.isLiveActivityAvailable.mockImplementationOnce(()=>gate);
 try {
  await saveRhythmState({liveActivityEnabled:true,tasks:[{id:'race-live',title:'競合確認QA',done:false,category:'その他',priority:'中',bucket:'now'}]});const App=require('../App').default;const view=render(<App/>);
  await waitFor(()=>expect(native.isLiveActivityAvailable).toHaveBeenCalled(),{timeout:7000});native.endLiveActivity.mockClear();fireEvent.press(view.getByText('設定'));fireEvent(view.getByLabelText('ライブアクティビティ'),'valueChange',false);
  await waitFor(()=>expect(native.endLiveActivity).toHaveBeenCalled(),{timeout:7000});await act(async()=>{release(true);await gate;});expect(native.startOrUpdateLiveActivity).not.toHaveBeenCalled();
 } finally {release(true);native.isLiveActivityAvailable.mockResolvedValue(true);}
},90000);
test('本番AppのTODO登録・完了がWidget snapshotに反映される',async()=>{
 await saveRhythmState({tasks:[]});const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getByLabelText('タスクを追加')).toBeTruthy(),{timeout:7000});
 fireEvent.press(view.getByLabelText('タスクを追加'));fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'Widget連動QA');fireEvent.press(view.getByText('登録する'));
 await waitFor(()=>expect(native.saveSnapshot.mock.calls.some(([json])=>JSON.parse(json).currentTask?.title==='Widget連動QA')).toBe(true),{timeout:7000});
 const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);fireEvent.press(view.getByText('一覧'));fireEvent.press(view.getAllByRole('checkbox')[0],{stopPropagation:()=>{}});
 await waitFor(()=>expect(JSON.parse(native.saveSnapshot.mock.calls.at(-1)[0]).currentTask?.title).not.toBe('Widget連動QA'),{timeout:7000});
},90000);
test('本番AppのLive Activityはタスク開始・更新・OFFでNative境界に反映する',async()=>{
 await saveRhythmState({liveActivityEnabled:true,tasks:[{id:'live-qa',title:'Live連動QA',done:false,category:'その他',priority:'中',bucket:'now'}]});const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('Live連動QA').length).toBeGreaterThan(0),{timeout:7000});
 await waitFor(()=>expect(native.startOrUpdateLiveActivity).toHaveBeenCalled(),{timeout:7000});expect(JSON.parse(native.startOrUpdateLiveActivity.mock.calls.at(-1)[0]).mode).toBe('normal');native.endLiveActivity.mockClear();
 const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);fireEvent.press(view.getByText('一覧'));fireEvent.press(view.getAllByRole('checkbox')[0],{stopPropagation:()=>{}});
 await waitFor(()=>expect(JSON.parse(native.startOrUpdateLiveActivity.mock.calls.at(-1)[0]).currentTaskTitle).toBe('今日のTODOを追加'),{timeout:7000});
 fireEvent.press(view.getByText('設定'));fireEvent(view.getByLabelText('ライブアクティビティ'),'valueChange',false);await waitFor(()=>expect(native.endLiveActivity).toHaveBeenCalled(),{timeout:7000});
},90000);
test('集中開始・一時停止・再開がLive Activityのpayloadに反映される',async()=>{
 await saveRhythmState({liveActivityEnabled:true,tasks:[{id:'focus-live',title:'集中Widget QA',done:false,category:'その他',priority:'中',bucket:'now'}]});const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('集中Widget QA').length).toBeGreaterThan(0),{timeout:7000});
 const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);fireEvent.press(view.getByLabelText('集中する'),{stopPropagation:()=>{}});await waitFor(()=>expect(view.getByText('スタート')).toBeTruthy(),{timeout:7000});fireEvent.press(view.getByText('スタート'));
 await waitFor(()=>expect(native.startOrUpdateLiveActivity.mock.calls.some(([raw])=>{const p=JSON.parse(raw);return p.mode==='focus'&&p.focusRunning===true})).toBe(true),{timeout:7000});fireEvent.press(view.getByText('一時停止'));
 await waitFor(()=>expect(native.startOrUpdateLiveActivity.mock.calls.some(([raw])=>{const p=JSON.parse(raw);return p.mode==='focus'&&p.focusRunning===false})).toBe(true),{timeout:7000});fireEvent.press(view.getByText('再開'));
 await waitFor(()=>{const p=JSON.parse(native.startOrUpdateLiveActivity.mock.calls.at(-1)[0]);expect(p.mode).toBe('focus');expect(p.focusRunning).toBe(true);},{timeout:7000});
},90000);
