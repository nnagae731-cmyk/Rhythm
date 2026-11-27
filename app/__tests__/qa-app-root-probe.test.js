jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-notifications',()=>({...jest.requireActual('expo-notifications'),addNotificationResponseReceivedListener:jest.fn(()=>({remove:jest.fn()})),getPermissionsAsync:jest.fn(async()=>({status:'granted'})),getAllScheduledNotificationsAsync:jest.fn(async()=>[]),cancelScheduledNotificationAsync:jest.fn(async()=>{}),scheduleNotificationAsync:jest.fn(async()=> 'qa-notification'),setNotificationCategoryAsync:jest.fn(async()=>{}),setNotificationChannelAsync:jest.fn(async()=>{})}));
jest.mock('react-native-google-mobile-ads',()=>({__esModule:true,default:()=>({initialize:jest.fn(async()=>{})}),BannerAd:()=>null,BannerAdSize:{BANNER:'banner'},TestIds:{BANNER:'test',REWARDED:'test'},AdEventType:{CLOSED:'closed',ERROR:'error'},RewardedAdEventType:{LOADED:'loaded',EARNED_REWARD:'earned'},RewardedAd:{createForAdRequest:jest.fn()}}));
jest.mock('expo-iap',()=>{const result={connected:false,products:[],subscriptions:[],availablePurchases:[],activeSubscriptions:[],fetchProducts:jest.fn(),requestPurchase:jest.fn(),finishTransaction:jest.fn(),getAvailablePurchases:jest.fn(),getActiveSubscriptions:jest.fn()};return {ErrorCode:{UserCancelled:'cancelled'},useIAP:()=>result};});
const React=require('react');
const {render,cleanup,waitFor,fireEvent,act}=require('@testing-library/react-native');
const storage=require('@react-native-async-storage/async-storage');
const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage');
const {ONBOARDING_STORAGE_KEY}=require('../features/onboarding/onboardingStorage');
const {STORAGE_KEY}=require('../storage/rhythmState');
const {Alert,Modal,Platform}=require('react-native');
const Notifications=require('expo-notifications');
// Load/transpile the production dependency tree during suite setup, not
// inside the first UI scenario's timeout (especially on a cold Windows run).
require('../App');

test('本番Appでルーティンの間隔をその場で選び、保存・再起動・再編集でも保持する',async()=>{
 const {within}=require('@testing-library/react-native'),{TaskModal}=require('../components/TaskModal'),App=require('../App').default;
 await storage.clear();await saveRhythmState({tasks:[{id:'routine-form-marker',title:'ルーティン読込の目印',done:false,category:'その他',priority:'中',bucket:'now'}]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,firstRunStage:'done',completed:Object.fromEntries(['intro','todo','todoComplete','taskDetails'].map(id=>[id,'2026-01-01']))}));
 let view=render(<App/>);await waitFor(()=>expect(view.getAllByText('ルーティン読込の目印').length).toBeGreaterThan(0),{timeout:10000});dismissTomorrowPrompt(view);
 fireEvent.press(view.getByLabelText('タスクを追加'));let form=within(view.UNSAFE_getByType(TaskModal));fireEvent.changeText(form.getByPlaceholderText('例：資料をバッグに入れる'),'皿を洗う習慣QA');
 fireEvent.press(form.getByRole('switch',{name:'ルーティンにする'}));expect(form.queryByTestId('task-optional-details')).toBeNull();
 expect(form.getByRole('button',{name:'登録する'}).props.accessibilityState.disabled).toBe(true);fireEvent.press(form.getByRole('radio',{name:'平日'}));fireEvent.press(form.getByText('登録する'));
 const saved=async()=>(await loadRhythmState()).tasks.find(t=>t.title==='皿を洗う習慣QA');
 await waitFor(async()=>{expect((await saved())?.isRoutine).toBe(true);expect((await saved())?.repeatRule).toBe('weekdays');});
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('ルーティン読込の目印').length).toBeGreaterThan(0),{timeout:10000});dismissTomorrowPrompt(view);
 fireEvent.press(view.getByText('ルーティン'));await waitFor(()=>expect(view.getByText('皿を洗う習慣QA')).toBeTruthy());
 fireEvent.press(view.getByText('皿を洗う習慣QA'),{stopPropagation:()=>{}});fireEvent.press(view.getByText('編集'));dismissTaskAction(view);
 form=within(view.UNSAFE_getByType(TaskModal));expect(form.getByRole('radio',{name:'平日'}).props.accessibilityState.checked).toBe(true);
 fireEvent.press(form.getByRole('radio',{name:'毎月'}));fireEvent.press(form.getByText('詳しい設定を閉じる'));expect(form.queryByTestId('task-optional-details')).toBeNull();
 fireEvent.press(form.getByText('変更を保存'));await waitFor(async()=>expect((await saved()).repeatRule).toBe('monthly'));expect((await saved()).isRoutine).toBe(true);
},60000);
afterEach(()=>{cleanup();jest.restoreAllMocks();Notifications.getAllScheduledNotificationsAsync.mockReset().mockResolvedValue([]);});
function dismissTomorrowPrompt(view){const button=view.queryByText('今日はしない');if(button)fireEvent.press(button);}
function dailyJournal(view){const {within}=require('@testing-library/react-native'),{HistoryScreen}=require('../screens/HistoryScreen');return within(view.UNSAFE_getAllByType(HistoryScreen).find(node=>node.props.dailyReviewOnly&&!node.props.previewJournal));}

test.each(['minimal','dark','chic'])('本番Appでタイトル直下の関連メモを登録・表に表示し、編集・取消・削除と再読込が一致する：%s',async designMode=>{
 const {within}=require('@testing-library/react-native'),{TaskModal}=require('../components/TaskModal'),App=require('../App').default;
 await storage.clear();await saveRhythmState({designMode,monoAppearance:designMode==='dark'?'dark':'light',chicPattern:'plain',tasks:[{id:'memo-marker',title:'メモ読込の目印',done:false,category:'その他',priority:'中',bucket:'now'}]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,firstRunStage:'done',completed:Object.fromEntries(['intro','todo','todoComplete','taskDetails'].map(id=>[id,'2026-01-01']))}));
 let view=render(<App/>);await waitFor(()=>expect(view.getAllByText('メモ読込の目印').length).toBeGreaterThan(0),{timeout:10000});dismissTomorrowPrompt(view);
 const form=()=>within(view.UNSAFE_getByType(TaskModal)),section=()=>within(view.getByTestId('task-memos-section'));
 const add=text=>{fireEvent.changeText(section().getByPlaceholderText('メモを追加'),text);fireEvent.press(section().getByRole('button',{name:'関連メモを追加する'}));};
 fireEvent.press(view.getByLabelText('タスクを追加'));fireEvent.changeText(form().getByPlaceholderText('例：資料をバッグに入れる'),'買い物とメモQA');
 expect(form().queryByText('サブタスク')).toBeNull();expect(form().queryByText('詳しい設定')).toBeNull();
 const json=JSON.stringify(view.toJSON());expect(json.indexOf('task-memos-section')).toBeLessThan(json.indexOf('実行する日'));
 fireEvent.press(section().getByRole('button',{name:'関連メモ'}));add('牛乳を買う');add('パンを買う');
 fireEvent.press(form().getByText('登録する'));
 const saved=async()=>(await loadRhythmState()).tasks.find(t=>t.title==='買い物とメモQA');
 // Real storage receipt + full themed App render can exceed waitFor's 1s default.
 await waitFor(async()=>expect((await saved())?.listItems.map(i=>i.text)).toEqual(['牛乳を買う','パンを買う']),{timeout:7000});
 expect(view.getByText('牛乳を買う')).toBeTruthy();expect(view.getByText('パンを買う')).toBeTruthy();expect((await saved()).subtasks).toEqual([]);
 fireEvent.press(view.getByText('牛乳を買う'));fireEvent.press(view.getByText('パンを買う'));
 await waitFor(async()=>expect((await saved()).listItems.every(i=>i.checked)).toBe(true));expect((await saved()).done).toBe(false);
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('買い物とメモQA').length).toBeGreaterThan(0),{timeout:10000});dismissTomorrowPrompt(view);
 fireEvent.press(view.getAllByText('買い物とメモQA')[0],{stopPropagation:()=>{}});fireEvent.press(view.getByText('編集'));dismissTaskAction(view);
 expect(section().getByRole('button',{name:'関連メモ'}).props.accessibilityState.expanded).toBe(true);
 fireEvent.changeText(section().getByDisplayValue('牛乳を買う'),'牛乳と卵を買う');add('財布を用意');
 fireEvent.press(section().getByRole('button',{name:'財布を用意を上へ'}));expect(section().getAllByLabelText('関連メモの内容').map(i=>i.props.value)).toEqual(['牛乳と卵を買う','財布を用意','パンを買う']);
 fireEvent.press(section().getByRole('button',{name:'パンを買うを削除'}));fireEvent.press(form().getByText('変更を保存'));
 await waitFor(async()=>expect((await saved()).listItems.map(i=>i.text)).toEqual(['牛乳と卵を買う','財布を用意']));
 const edited=(await saved()).listItems;expect(edited[0].checked).toBe(true);expect(edited[1].checked).toBe(false);
 fireEvent.press(view.getAllByText('買い物とメモQA')[0],{stopPropagation:()=>{}});fireEvent.press(view.getByText('編集'));dismissTaskAction(view);
 fireEvent.changeText(section().getByDisplayValue('牛乳と卵を買う'),'保存しない変更');fireEvent.press(form().getByText('キャンセル'));expect((await saved()).listItems).toEqual(edited);
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('買い物とメモQA').length).toBeGreaterThan(0),{timeout:10000});dismissTomorrowPrompt(view);
 expect(view.getByText('財布を用意')).toBeTruthy();fireEvent.press(view.getByText('完了した関連メモ 1件'));expect(view.getByText('牛乳と卵を買う')).toBeTruthy();expect((await saved()).listItems).toEqual(edited);
},90000);

test('本番Appで旧サブタスクを関連メモとして表に出し、保存失敗・再試行・再起動でも文章と状態を失わない',async()=>{
 const App=require('../App').default,legacy={id:'legacy-steps',title:'旧手順を持つTODO',done:false,category:'その他',priority:'中',bucket:'now',subtasks:[{id:'old-a',title:'旧手順の文章',done:false,order:0},{id:'old-b',title:'以前にチェックした文章',done:true,order:1}],listItems:[{id:'existing-note',text:'元からあるメモ',checked:false,order:0}]};
 await storage.clear();await saveRhythmState({tasks:[legacy]});await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,firstRunStage:'done',completed:{intro:'2026-01-01',todo:'2026-01-01',todoComplete:'2026-01-01'}}));
 const original=storage.setItem.getMockImplementation(),before=await storage.getItem(STORAGE_KEY);let fail=true;
 jest.spyOn(console,'warn').mockImplementation(()=>{});jest.spyOn(Alert,'alert').mockImplementation(()=>{});
 jest.spyOn(storage,'setItem').mockImplementation((key,value)=>key===STORAGE_KEY&&fail?Promise.reject(Error('disk full')):original(key,value));
 let view=render(<App/>);await waitFor(()=>expect(view.getAllByText(legacy.title).length).toBeGreaterThan(0),{timeout:10000});dismissTomorrowPrompt(view);
 expect(view.getByText('旧手順の文章')).toBeTruthy();expect(view.getByText('元からあるメモ')).toBeTruthy();
 await waitFor(()=>expect(view.getByText('保存を再試行')).toBeTruthy());expect(await storage.getItem(STORAGE_KEY)).toBe(before);
 fireEvent.press(view.getByText('旧手順の文章'));fireEvent.press(view.getByText('元からあるメモ'));
 fail=false;fireEvent.press(view.getByText('保存を再試行'));
 await waitFor(async()=>{const task=(await loadRhythmState()).tasks[0];expect(task.subtasks).toEqual([]);expect(task.listItems).toHaveLength(3);expect(task.listItems.every(i=>i.checked)).toBe(true);expect(task.done).toBe(false);});
 const saved=(await loadRhythmState()).tasks[0];view.unmount();view=render(<App/>);
 await waitFor(()=>expect(view.getAllByText(legacy.title).length).toBeGreaterThan(0),{timeout:10000});dismissTomorrowPrompt(view);
 fireEvent.press(view.getByText('完了した関連メモ 3件'));expect(view.getByText('旧手順の文章')).toBeTruthy();expect(view.getByText('以前にチェックした文章')).toBeTruthy();expect(view.getByText('元からあるメモ')).toBeTruthy();expect((await loadRhythmState()).tasks[0].listItems).toEqual(saved.listItems);
},90000);

test('本番Appで長いTODOを折り返して入力・保存し、再読込後も全文を保持する',async()=>{
 await storage.clear();await saveRhythmState({tasks:[{id:'long-todo-marker',title:'長文TODOの読込目印',done:false,category:'その他',priority:'中',bucket:'now'}]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',todoComplete:'2026-01-01',taskDetails:'2026-01-01'},firstRunStage:'done'}));
 const title='長いTODOの内容を最後まで確認する'.repeat(6),App=require('../App').default;
 let view=render(<App/>);await waitFor(()=>expect(view.getAllByText('長文TODOの読込目印').length).toBeGreaterThan(0),{timeout:10000});dismissTomorrowPrompt(view);
 fireEvent.press(view.getByLabelText('タスクを追加'));const input=view.getByPlaceholderText('例：資料をバッグに入れる');
 expect(input.props.multiline).toBe(true);expect(view.getByText('必要なら詳しく設定')).toBeTruthy();
 fireEvent.changeText(input,title);fireEvent.press(view.getByText('登録する'));
 await waitFor(async()=>expect((await loadRhythmState()).tasks.some(task=>task.title===title)).toBe(true));
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText(title).length).toBeGreaterThan(0),{timeout:10000});
 expect((await loadRhythmState()).tasks.find(task=>task.title===title).title).toBe(title);
},90000);

test('本番Appの予定で任意の目的地と長文を保持し、保存保留・失敗表示・再試行・再読込が一致する',async()=>{
 await storage.clear();await saveRhythmState({tasks:[{id:'form-plan-marker',title:'予定フォームの読込目印',done:false,category:'その他',priority:'中',bucket:'now'}],departurePlans:[]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',schedule:'2026-01-01',planRegistration:'2026-01-01'},firstRunStage:'done'}));
 const title='重要な予定の内容を最後まで確認する'.repeat(6),original=storage.setItem.getMockImplementation();
 let failing=true,started=false,settle;
 jest.spyOn(Alert,'alert').mockImplementation(()=>{});
 jest.spyOn(storage,'setItem').mockImplementation((key,value)=>{
  if(key===STORAGE_KEY&&value.includes(title)&&failing){
   if(!started){started=true;return new Promise((_resolve,reject)=>{settle=()=>reject(Error('disk full'));});}
   return Promise.reject(Error('disk full'));
  }
  return original(key,value);
 });
 try {
  const App=require('../App').default;let view=render(<App/>);
  await waitFor(()=>expect(view.getAllByText('予定フォームの読込目印').length).toBeGreaterThan(0),{timeout:10000});dismissTomorrowPrompt(view);
  fireEvent.press(view.getByText('予定'));fireEvent.press(view.getByText('＋ 予定を追加'));
  expect(view.queryByPlaceholderText('例：東京')).toBeNull();
  expect(view.getByLabelText('目的地の設定').props.accessibilityState.expanded).toBe(false);
  fireEvent.press(view.getByLabelText('目的地の設定'));fireEvent.changeText(view.getByPlaceholderText('例：東京'),'東京');
  fireEvent.press(view.getByLabelText('目的地の設定'));fireEvent.press(view.getByLabelText('目的地の設定'));
  expect(view.getByPlaceholderText('例：東京').props.value).toBe('東京');
  const input=view.getByPlaceholderText('例：友人と待ち合わせ');expect(input.props.multiline).toBe(true);fireEvent.changeText(input,title);
  const submit=view.getByRole('button',{name:'予定表に追加'});fireEvent.press(submit);fireEvent.press(submit);
  await waitFor(()=>expect(started).toBe(true));
  expect(view.getByText('保存中…')).toBeTruthy();expect(view.getByPlaceholderText('例：友人と待ち合わせ').props.editable).toBe(false);
  expect((await loadRhythmState()).departurePlans).toHaveLength(0);
  const reject=settle;settle=null;await act(async()=>reject());
  await waitFor(()=>expect(view.getByRole('alert')).toBeTruthy());
  expect(view.getByPlaceholderText('例：友人と待ち合わせ').props.value).toBe(title);
  expect(view.getByPlaceholderText('例：東京').props.value).toBe('東京');
  failing=false;fireEvent.press(view.getByText('変更を保存'));
  await waitFor(async()=>expect((await loadRhythmState()).departurePlans.filter(plan=>plan.title===title)).toHaveLength(1));
  expect((await loadRhythmState()).departurePlans.find(plan=>plan.title===title).destination).toBe('東京');
  view.unmount();view=render(<App/>);
  await waitFor(()=>expect(view.getAllByText('予定フォームの読込目印').length).toBeGreaterThan(0),{timeout:10000});dismissTomorrowPrompt(view);
  fireEvent.press(view.getByText('予定'));fireEvent.press(view.getByText('予定表'));
  await waitFor(()=>expect(view.getAllByText(title).length).toBeGreaterThan(0));
 } finally {if(settle)await act(async()=>settle());}
},90000);
function dismissTaskAction(view){if(Platform.OS==='ios'){const modal=view.UNSAFE_getAllByType(Modal).find(item=>item.props.testID==='task-action-modal'&&!item.props.visible);if(modal)act(()=>modal.props.onDismiss());}}
test('あとで・待ちの未完了TODOを今日全体の完了と案内しない',async()=>{
 await storage.clear();await saveRhythmState({tasks:[{id:'later-review',title:'あとで必要',done:false,category:'その他',priority:'中',bucket:'later'},{id:'waiting-review',title:'返事待ち',done:false,category:'その他',priority:'中',bucket:'waiting'}],departurePlans:[],designMode:'minimal'});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getByText('今やる分は完了。あとで・待ちは一覧へ')).toBeTruthy(),{timeout:7000});expect((await loadRhythmState()).tasks.filter(t=>!t.done)).toHaveLength(2);expect(view.queryByText('今日の分は完了。いい感じ')).toBeNull();
},30000);
test('Widgetへ書けない環境で手動更新の成功を表示しない',async()=>{
 const {saveRhythmWidgetSnapshot}=require('../features/widget/rhythmWidgetSnapshot');expect(await saveRhythmWidgetSnapshot({updatedAt:new Date().toISOString()})).toBe(false);
 await storage.clear();await saveRhythmState({tasks:[{id:'widget-false',title:'Widget失敗の読込目印',done:false,category:'その他',priority:'中',bucket:'now'}]});await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('Widget失敗の読込目印').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('設定'));fireEvent.press(view.getByLabelText('ウィジェットを更新'));await waitFor(()=>expect(alert).toHaveBeenCalled(),{timeout:7000});expect(alert.mock.calls.some(a=>a[0]==='Widgetを更新しました')).toBe(false);expect(alert.mock.calls.some(a=>/Widget.*(確認中|更新できません)/.test(a[0]))).toBe(true);
},30000);
test('読込失敗中は編集を開かず、既存データを上書きせずに再読込できる',async()=>{
 await storage.clear();await saveRhythmState({tasks:[{id:'read-retry',title:'失わない既存TODO',done:false,category:'その他',priority:'中',bucket:'now'}]});await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 let fail=true;const original=storage.getItem.getMockImplementation();jest.spyOn(storage,'getItem').mockImplementation(key=>key===STORAGE_KEY&&fail?Promise.reject(Error('read failed')):original(key));storage.setItem.mockClear();jest.spyOn(Alert,'alert').mockImplementation(()=>{});
 const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getByText('もう一度読み込む')).toBeTruthy(),{timeout:7000});expect(view.queryByLabelText('タスクを追加')).toBeNull();expect(storage.setItem.mock.calls.filter(([key])=>key===STORAGE_KEY)).toHaveLength(0);
 fail=false;fireEvent.press(view.getByText('もう一度読み込む'));await waitFor(()=>expect(view.getAllByText('失わない既存TODO').length).toBeGreaterThan(0),{timeout:7000});expect(view.getByLabelText('タスクを追加')).toBeTruthy();expect((await loadRhythmState()).tasks.map(t=>t.id)).toEqual(['read-retry']);
},30000);
test('書込失敗を未保存表示で知らせ、保存の再試行で最新TODOを保持する',async()=>{
 await storage.clear();await saveRhythmState({tasks:[{id:'write-retry',title:'書込復帰の読込目印',done:false,category:'その他',priority:'中',bucket:'now'}]});await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 let fail=true;const original=storage.setItem.getMockImplementation();jest.spyOn(storage,'setItem').mockImplementation((key,value)=>key===STORAGE_KEY&&value.includes('未保存を復帰するTODO')&&fail?Promise.reject(Error('write failed')):original(key,value));const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});
 const App=require('../App').default;let view=render(<App/>);await waitFor(()=>expect(view.getAllByText('書込復帰の読込目印').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByLabelText('タスクを追加'));fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'未保存を復帰するTODO');fireEvent.press(view.getByText('登録する'));
 await waitFor(()=>expect(view.getByText('保存を再試行')).toBeTruthy(),{timeout:7000});expect((await loadRhythmState()).tasks.some(t=>t.title==='未保存を復帰するTODO')).toBe(false);
 fail=false;fireEvent.press(view.getByText('保存を再試行'));await waitFor(async()=>expect((await loadRhythmState()).tasks.map(t=>t.title)).toEqual(expect.arrayContaining(['書込復帰の読込目印','未保存を復帰するTODO'])),{timeout:7000});await waitFor(()=>expect(view.queryByText('保存を再試行')).toBeNull(),{timeout:7000});
 fail=true;fireEvent.press(view.getByLabelText('タスクを追加'));fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'二度目の失敗も通知');fireEvent.press(view.getByText('登録する'));await waitFor(()=>expect(alert.mock.calls.filter(a=>a[0]==='保存できませんでした').length).toBeGreaterThanOrEqual(2),{timeout:7000});fail=false;fireEvent.press(view.getByText('保存を再試行'));await waitFor(async()=>expect((await loadRhythmState()).tasks.some(t=>t.title==='二度目の失敗も通知')).toBe(true),{timeout:7000});
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('未保存を復帰するTODO').length).toBeGreaterThan(0),{timeout:7000});
},60000);
test('日記削除は永続化完了を待ち、失敗時に文章と写真参照を復元して再試行できる',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';let release;const gate=new Promise(resolve=>{release=resolve});let writing=false;let fail=true;
 try{
  const day=require('../features/tasks/taskUtils').dateKey(new Date()),month=day.slice(0,7),photo='file:///journal-shared-review.jpg';await storage.clear();await saveRhythmState({tasks:[{id:'delete-retry',title:'日記削除の読込目印',done:false,category:'その他',priority:'中',bucket:'now'}],wishMonths:{[month]:{monthlyGoal:'',wishes:[],actions:[],review:{},reviews:[{id:'delete-review',date:day,shortNote:'削除失敗でも残る文章',memo:'写真も保持',photo,photos:[photo]}]}}});await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',photoLog:'2026-01-01'},firstRunStage:'done'}));
  const original=storage.setItem.getMockImplementation();jest.spyOn(storage,'setItem').mockImplementation((key,value)=>{if(key===STORAGE_KEY&&!value.includes('削除失敗でも残る文章')){writing=true;return gate.then(()=>{if(fail)throw Error('delete write failed');return original(key,value)});}return original(key,value)});const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});
  const App=require('../App').default;let view=render(<App/>);await waitFor(()=>expect(view.getAllByText('日記削除の読込目印').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByRole('button',{name:'今日の日記を見る'}));await waitFor(()=>expect(dailyJournal(view).getByText('削除失敗でも残る文章')).toBeTruthy(),{timeout:7000});fireEvent.press(view.getByText('削除'));act(()=>alert.mock.calls.filter(a=>a[0]==='記録を削除しますか？').at(-1)[2].find(b=>b.style==='destructive').onPress());
  await waitFor(()=>expect(writing).toBe(true),{timeout:7000});expect(view.queryByText('この日の記録を削除しました')).toBeNull();expect((await loadRhythmState()).wishMonths[month].reviews[0].photos).toEqual([photo]);release();await waitFor(()=>expect(alert.mock.calls.some(a=>a[0]==='削除できませんでした')).toBe(true),{timeout:7000});await waitFor(()=>expect(dailyJournal(view).getByText('削除失敗でも残る文章')).toBeTruthy(),{timeout:7000});expect((await loadRhythmState()).wishMonths[month].reviews[0].photos).toEqual([photo]);
  fail=false;fireEvent.press(view.getByText('削除'));act(()=>alert.mock.calls.filter(a=>a[0]==='記録を削除しますか？').at(-1)[2].find(b=>b.style==='destructive').onPress());await waitFor(async()=>expect((await loadRhythmState()).wishMonths[month].reviews||[]).toHaveLength(0),{timeout:7000});await waitFor(()=>expect(view.getByText('この日の記録を削除しました')).toBeTruthy(),{timeout:7000});
  view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('日記削除の読込目印').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);expect(view.getByText('今日の日記を書く')).toBeTruthy();
 }finally{release();if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},60000);
test('予定の保存待ち中にTODOが完了しても両方の変更を永続化する',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve});let writing=false;
 try{
  await storage.clear();await saveRhythmState({tasks:[{id:'plan-parallel',title:'予定と並行するTODO',done:false,category:'その他',priority:'中',bucket:'now'}],departurePlans:[]});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',todoComplete:'2026-01-01',schedule:'2026-01-01',planRegistration:'2026-01-01'},firstRunStage:'done'}));
  const original=storage.setItem.getMockImplementation();jest.spyOn(storage,'setItem').mockImplementation((key,value)=>{if(key===STORAGE_KEY&&value.includes('並行保存する予定')){writing=true;return gate.then(()=>original(key,value));}return original(key,value)});const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});
  const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('予定と並行するTODO').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('予定'));fireEvent.press(view.getByText('＋ 予定を追加'));fireEvent.changeText(view.getByPlaceholderText('例：友人と待ち合わせ'),'並行保存する予定');fireEvent.press(view.getByText('予定表に追加'));
  await waitFor(()=>expect(writing).toBe(true),{timeout:7000});expect(alert.mock.calls.some(a=>a[0]==='予定を追加しました')).toBe(false);
  const listener=Notifications.addNotificationResponseReceivedListener.mock.calls.at(-1)[0];await act(async()=>listener({actionIdentifier:'DONE',notification:{request:{identifier:'parallel-n',content:{data:{taskId:'plan-parallel'}}}}}));
  release();await waitFor(async()=>{const saved=await loadRhythmState();expect(saved.tasks.find(t=>t.id==='plan-parallel').done).toBe(true);expect(saved.departurePlans.filter(p=>p.title==='並行保存する予定')).toHaveLength(1);},{timeout:7000});await waitFor(()=>expect(view.queryByPlaceholderText('例：友人と待ち合わせ')).toBeNull(),{timeout:7000});
 }finally{release();}
},90000);
test('アファメーションは実ストレージの完了まで保存中の編集画面を維持する',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';let release;const gate=new Promise(resolve=>{release=resolve});let writing=false;
 try{
  await storage.clear();await saveRhythmState({tasks:[{id:'affirm-pending',title:'言葉保留の読込目印',done:false,category:'その他',priority:'中',bucket:'now'}],affirmations:[]});await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',wish:'2026-01-01',affirmation:'2026-01-01'},firstRunStage:'done'}));
  const original=storage.setItem.getMockImplementation();jest.spyOn(storage,'setItem').mockImplementation((key,value)=>{if(key===STORAGE_KEY&&value.includes('永続化を待つ言葉QA')){writing=true;return gate.then(()=>original(key,value));}return original(key,value)});
  const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('言葉保留の読込目印').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('叶えたいこと'));fireEvent.press(view.getByText('管理する ›'));fireEvent.changeText(view.getByPlaceholderText('文章を選ぶか、自分で入力'),'永続化を待つ言葉QA');fireEvent.press(view.getByText('通知を追加'));
  await waitFor(()=>expect(writing).toBe(true),{timeout:7000});expect(view.getByText('保存中…')).toBeTruthy();expect(view.getByPlaceholderText('文章を選ぶか、自分で入力').props.editable).toBe(false);expect((await loadRhythmState()).affirmations||[]).toHaveLength(0);
  release();await waitFor(async()=>expect((await loadRhythmState()).affirmations.filter(a=>a.text==='永続化を待つ言葉QA')).toHaveLength(1),{timeout:7000});await waitFor(()=>expect(view.queryByPlaceholderText('文章を選ぶか、自分で入力')).toBeNull(),{timeout:7000});
 }finally{release();if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);
test('予定は保存失敗時に入力を残し、同じIDで再試行して復元できる',async()=>{
 await storage.clear();await saveRhythmState({tasks:[{id:'plan-retry',title:'予定再試行の読込目印',done:false,category:'その他',priority:'中',bucket:'now'}],departurePlans:[]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',schedule:'2026-01-01',planRegistration:'2026-01-01'},firstRunStage:'done'}));
 let failing=true;const original=storage.setItem.getMockImplementation();jest.spyOn(storage,'setItem').mockImplementation((key,value)=>key===STORAGE_KEY&&value.includes('予定の再試行QA')&&failing?Promise.reject(Error('disk full')):original(key,value));
 const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});const App=require('../App').default;let view=render(<App/>);
 await waitFor(()=>expect(view.getAllByText('予定再試行の読込目印').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('予定'));fireEvent.press(view.getByText('＋ 予定を追加'));fireEvent.changeText(view.getByPlaceholderText('例：友人と待ち合わせ'),'予定の再試行QA');
 fireEvent.press(view.getByText('予定表に追加'));
 await waitFor(()=>expect(alert.mock.calls.some(args=>args[0]==='予定を保存できませんでした')).toBe(true),{timeout:7000});
 expect(view.getByPlaceholderText('例：友人と待ち合わせ').props.value).toBe('予定の再試行QA');expect((await loadRhythmState()).departurePlans).toHaveLength(0);expect(alert.mock.calls.some(args=>args[0]==='予定を追加しました'||args[0]==='予定を保存しました')).toBe(false);
 failing=false;fireEvent.press(view.getByText('変更を保存'));
 await waitFor(async()=>expect((await loadRhythmState()).departurePlans.filter(p=>p.title==='予定の再試行QA')).toHaveLength(1),{timeout:7000});
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('予定再試行の読込目印').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('予定'));fireEvent.press(view.getByText('予定表'));await waitFor(()=>expect(view.getAllByText('予定の再試行QA').length).toBeGreaterThan(0),{timeout:7000});
},90000);
test('アファメーションは永続化失敗後も入力を保持し、再試行・再読込できる',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';
 try{
  await storage.clear();await saveRhythmState({tasks:[{id:'affirm-retry',title:'言葉再試行の読込目印',done:false,category:'その他',priority:'中',bucket:'now'}],affirmations:[]});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',wish:'2026-01-01',affirmation:'2026-01-01'},firstRunStage:'done'}));
  let failing=true;const original=storage.setItem.getMockImplementation();jest.spyOn(storage,'setItem').mockImplementation((key,value)=>key===STORAGE_KEY&&value.includes('再試行する言葉QA')&&failing?Promise.reject(Error('disk full')):original(key,value));jest.spyOn(Alert,'alert').mockImplementation(()=>{});
  const App=require('../App').default;let view=render(<App/>);await waitFor(()=>expect(view.getAllByText('言葉再試行の読込目印').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('叶えたいこと'));fireEvent.press(view.getByText('管理する ›'));fireEvent.changeText(view.getByPlaceholderText('文章を選ぶか、自分で入力'),'再試行する言葉QA');fireEvent.press(view.getByText('通知を追加'));
  await waitFor(()=>expect(view.getByRole('alert')).toBeTruthy(),{timeout:7000});expect(view.getByPlaceholderText('文章を選ぶか、自分で入力').props.value).toBe('再試行する言葉QA');expect((await loadRhythmState()).affirmations||[]).toHaveLength(0);
  failing=false;fireEvent.press(view.getByText('通知を追加'));await waitFor(async()=>expect((await loadRhythmState()).affirmations.filter(a=>a.text==='再試行する言葉QA')).toHaveLength(1),{timeout:7000});
  await waitFor(()=>expect(view.queryByPlaceholderText('文章を選ぶか、自分で入力')).toBeNull(),{timeout:7000});
  view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('言葉再試行の読込目印').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('叶えたいこと'));expect(view.getAllByText('再試行する言葉QA').length).toBeGreaterThan(0);
 }finally{if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);
test('予定追加の永続化が保留中は保存成功Alertを出さない',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve});let pending;let writing=false;
 try {
  await storage.clear();await saveRhythmState({tasks:[{id:'plan-audit',title:'予定保存監査QA',done:false,category:'その他',priority:'中',bucket:'now'}],departurePlans:[]});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',schedule:'2026-01-01',planRegistration:'2026-01-01'},firstRunStage:'done'}));
  const original=storage.setItem.getMockImplementation();jest.spyOn(storage,'setItem').mockImplementation((key,value)=>{if(key===STORAGE_KEY&&value.includes('未保存予定QA')){writing=true;pending=gate.then(()=>original(key,value));return pending;}return original(key,value)});
  const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('予定保存監査QA').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('予定'));fireEvent.press(view.getByText('＋ 予定を追加'));fireEvent.changeText(view.getByPlaceholderText('例：友人と待ち合わせ'),'未保存予定QA');fireEvent.press(view.getByText('予定表に追加'));
  await waitFor(()=>expect(writing).toBe(true),{timeout:7000});expect((await loadRhythmState()).departurePlans).toHaveLength(0);expect(alert.mock.calls.some(args=>args[0]==='予定を追加しました')).toBe(false);
 } finally {release();if(pending)await pending;}
},90000);
test('アファメーション通知の取消失敗時は編集文章を保持する',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';
 try {
  await storage.clear();await saveRhythmState({tasks:[{id:'affirm-audit',title:'言葉監査QA',done:false,category:'その他',priority:'中',bucket:'now'}],affirmations:[]});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',wish:'2026-01-01',affirmation:'2026-01-01'},firstRunStage:'done'}));
  const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('言葉監査QA').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('叶えたいこと'));fireEvent.press(view.getByText('管理する ›'));
  fireEvent.changeText(view.getByPlaceholderText('文章を選ぶか、自分で入力'),'失敗しても保持する言葉');Notifications.getAllScheduledNotificationsAsync.mockRejectedValue(Error('API unavailable'));fireEvent.press(view.getByText('通知を追加'));
  await waitFor(()=>expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalled(),{timeout:7000});await act(async()=>{await Promise.resolve();await Promise.resolve();});
  expect(view.getByPlaceholderText('文章を選ぶか、自分で入力').props.value).toBe('失敗しても保持する言葉');expect((await loadRhythmState()).affirmations||[]).toHaveLength(0);
 } finally {Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);
test('無料の記録画面は重複見出しなしで振り返りを残し、写真案内はプレビュー外に表示する',async()=>{
 await storage.clear();await saveRhythmState({designMode:'dark',monoAppearance:'dark',tasks:[{id:'visual-qa',title:'表示QA準備',done:false,category:'その他',priority:'中',bucket:'now'}]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',analysis:'2026-01-01'},firstRunStage:'done'}));
 const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('表示QA準備').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('分析'));
 await waitFor(()=>expect(view.getByText('この月を振り返る')).toBeTruthy(),{timeout:7000});expect(view.queryByText('1か月を振り返ろう')).toBeNull();
 fireEvent.press(view.getByText('設定'));fireEvent.press(view.getByLabelText('デザイン設定を開く'));fireEvent.press(view.getByRole('tab',{name:'写真'}));expect(view.queryByText('写真を選ぶとここに表示されます')).toBeNull();expect(view.getByText('写真を選ぶとプレビューに反映されます')).toBeTruthy();
 const preview=view.getByLabelText('デザイン適用イメージ');expect(preview.findAll(node=>node.props.children==='写真を選ぶとプレビューに反映されます')).toHaveLength(0);
 expect(view.getByLabelText('全画面でプレビュー（無料）')).toBeTruthy();expect(view.getByText('タスクを確認')).toBeTruthy();
 expect(view.getByLabelText('写真を選んでプレビュー')).toBeTruthy();expect(view.queryByText(/写真デザインを適用/)).toBeNull();expect(view.queryByText('背景写真を選ぶ')).toBeNull();expect(view.getByText(/正式適用はプレビュー内から/)).toBeTruthy();
 const selector=view.UNSAFE_root.findAll(n=>typeof n.type==='function'&&n.type.name==='ThemeColorSelector'&&n.props.surfaceMode==='dark')[0];expect(selector).toBeTruthy();const rn=require('react-native');expect(rn.StyleSheet.flatten(selector.findAllByType(rn.View)[0].props.style).backgroundColor).toBe('#181F2E');
},90000);
test('日記のキーボードを閉じても入力を保持し、シートはキーボード回避とスクロールに対応する',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';
 try{
  const {Keyboard,KeyboardAvoidingView}=require('react-native'),dismiss=jest.spyOn(Keyboard,'dismiss').mockImplementation(()=>{});
  await storage.clear();await saveRhythmState({tasks:[{id:'journal-keyboard',title:'日記入力の目印',done:false,category:'その他',priority:'中',bucket:'now'}]});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,firstRunStage:'done',completed:Object.fromEntries(['intro','todo','todoComplete','photoLog'].map(id=>[id,'2026-01-01']))}));
  const App=require('../App').default,view=render(<App/>);await waitFor(()=>expect(view.getAllByText('日記入力の目印').length).toBeGreaterThan(0),{timeout:10000});dismissTomorrowPrompt(view);
  fireEvent.press(view.getByRole('button',{name:'今日の日記を書く'}));
  const input=view.getByLabelText('日記のひとこと'),memo=view.getByLabelText('日記の本文');
  fireEvent.changeText(input,'キーボードを閉じても残す文章');fireEvent.changeText(memo,'長い本文\n改行も残す');
  expect(view.UNSAFE_getAllByType(KeyboardAvoidingView).find(n=>n.props.testID==='daily-journal-keyboard-avoidance').props.behavior).toBe(Platform.OS==='ios'?'padding':'height');
  expect(view.getByTestId('daily-journal-scroll').props.keyboardDismissMode).toBe(Platform.OS==='ios'?'interactive':'on-drag');
  const keyboardClose=view.getByRole('button',{name:'キーボードを閉じる'});expect(view.getByTestId('daily-journal-scroll').findAll(node=>node===keyboardClose)).toHaveLength(0);fireEvent.press(keyboardClose);
  fireEvent.press(view.getByRole('button',{name:'入力を終える'}));fireEvent(input,'submitEditing');expect(dismiss).toHaveBeenCalled();
  expect(view.getByLabelText('日記のひとこと').props.value).toBe('キーボードを閉じても残す文章');expect(view.getByLabelText('日記の本文').props.value).toBe('長い本文\n改行も残す');
 }finally{if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},60000);

test('日記の本番保存中は成功表示しない',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';let release;const gate=new Promise(r=>{release=r});let pending;let writing=false;
 try {
  await storage.clear();await saveRhythmState({tasks:[{id:'journal-sentinel',title:'日記QA準備',done:false,category:'その他',priority:'中',bucket:'now'}],wishMonths:{}});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',photoLog:'2026-01-01'},firstRunStage:'done'}));
  const original=storage.setItem.getMockImplementation();jest.spyOn(storage,'setItem').mockImplementation((key,value)=>{if(key===STORAGE_KEY&&value.includes('保存中日記QA')){writing=true;pending=gate.then(()=>original(key,value));return pending;}return original(key,value)});
  const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('日記QA準備').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);
  fireEvent.press(view.getByText('今日の日記を書く'));await waitFor(()=>expect(view.getByPlaceholderText('今日のひとこと')).toBeTruthy(),{timeout:7000});fireEvent.changeText(view.getByPlaceholderText('今日のひとこと'),'保存中日記QA');fireEvent.press(view.getByText('保存する'));
  await waitFor(()=>expect(writing).toBe(true),{timeout:7000});expect(view.queryByText('記録を更新しました')).toBeNull();expect(view.getByPlaceholderText('今日のひとこと').props.value).toBe('保存中日記QA');expect(view.getByPlaceholderText('今日のひとこと').props.editable).toBe(false);expect(view.getByPlaceholderText('今日のことを少し残す').props.editable).toBe(false);
  const {within}=require('@testing-library/react-native');expect(within(view.getByTestId('home-journal-card')).queryByText('保存済み')).toBeNull();expect(view.queryByTestId('journal-saved-status')).toBeNull();
  await act(async()=>{release();if(pending)await pending;});
  await waitFor(()=>expect(view.getByTestId('journal-saved-status')).toBeTruthy(),{timeout:7000});
  fireEvent.press(view.getByRole('button',{name:'日記を閉じる'}));expect(within(view.getByTestId('home-journal-card')).getByText('保存済み')).toBeTruthy();expect(within(view.getByTestId('home-journal-card')).getByText('保存中日記QA')).toBeTruthy();
 } finally {release();if(pending)await pending;if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);

test('広告解放後の保存済みデザインが画面移動と再読込を経ても保持される',async()=>{
 const {saveRewardedAccessState,DEFAULT_REWARDED_ACCESS_STATE}=require('../features/ads/rewardedAccessStorage');
 await storage.clear();await saveRhythmState({tasks:[{id:'design-sentinel',title:'デザインQA準備',done:false,category:'その他',priority:'中',bucket:'now'}],designMode:'chic',chicPattern:'dot'});
 await saveRewardedAccessState({...DEFAULT_REWARDED_ACCESS_STATE,premiumDesign:{unlockedUntil:new Date(Date.now()+72*3600000).toISOString()},premiumDesignTrial:{used:true,designId:'floral',expiresAt:new Date(Date.now()-3600000).toISOString()}});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 const App=require('../App').default;let view=render(<App/>);await waitFor(()=>expect(view.getAllByText('デザインQA準備').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);
 await waitFor(()=>{const strips=view.UNSAFE_root.findAll(node=>typeof node.type==='function'&&node.type.name==='TodayWinStrip');expect(strips.length).toBeGreaterThan(0);expect(strips[0].props.chicPattern).toBe('dot');},{timeout:7000});
 fireEvent.press(view.getByText('予定'));fireEvent.press(view.getByText('ToDo'));await waitFor(()=>expect(view.UNSAFE_root.findAll(node=>typeof node.type==='function'&&node.type.name==='TodayWinStrip')[0].props.chicPattern).toBe('dot'),{timeout:7000});expect((await loadRhythmState()).chicPattern).toBe('dot');
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('デザインQA準備').length).toBeGreaterThan(0),{timeout:7000});await waitFor(()=>expect(view.UNSAFE_root.findAll(node=>typeof node.type==='function'&&node.type.name==='TodayWinStrip')[0].props.chicPattern).toBe('dot'),{timeout:7000});expect((await loadRhythmState()).chicPattern).toBe('dot');
},90000);
test.each([['free','plain'],['premium','dot']])('広告期限切れ後の %s 画面に適切な柄を表示し設定を保持する',async(plan,expected)=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN=plan;
 try {
  const {saveRewardedAccessState,DEFAULT_REWARDED_ACCESS_STATE}=require('../features/ads/rewardedAccessStorage');const expiry=new Date(Date.now()-3600000).toISOString();
  await storage.clear();await saveRhythmState({tasks:[{id:'expiry-sentinel',title:'期限切れQA',done:false,category:'その他',priority:'中',bucket:'now'}],designMode:'chic',chicPattern:'dot'});
  await saveRewardedAccessState({...DEFAULT_REWARDED_ACCESS_STATE,premiumDesign:{unlockedUntil:expiry},premiumDesignTrial:{used:true,designId:null,expiresAt:null},premiumDesignNoticeSeenFor:expiry});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
  const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('期限切れQA').length).toBeGreaterThan(0),{timeout:7000});
  await waitFor(()=>expect(view.UNSAFE_root.findAll(node=>typeof node.type==='function'&&node.type.name==='TodayWinStrip')[0].props.chicPattern).toBe(expected),{timeout:7000});expect((await loadRhythmState()).chicPattern).toBe('dot');
 } finally {if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);
test.each([['earned',true],['cancelled',false]])('本番Appで広告 %s 後の利用権を保存する',async(result,earned)=>{
 const {saveRewardedAccessState,loadRewardedAccessState,DEFAULT_REWARDED_ACCESS_STATE}=require('../features/ads/rewardedAccessStorage');const ads=require('react-native-google-mobile-ads');
 await storage.clear();await saveRhythmState({tasks:[{id:'ad-grant',title:'広告確認準備',done:false,category:'その他',priority:'中',bucket:'now'}],designMode:'chic',chicPattern:'dot'});
 await saveRewardedAccessState({...DEFAULT_REWARDED_ACCESS_STATE,premiumDesignTrial:{used:true,designId:null,expiresAt:null}});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 ads.RewardedAd.createForAdRequest.mockImplementation(()=>{const listeners={};return {addAdEventListener:(event,cb)=>{listeners[event]=cb;return ()=>{}},load:()=>Promise.resolve().then(()=>listeners.loaded()),show:()=>{if(earned)listeners.earned();listeners.closed();return Promise.resolve()}}});
 const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('広告確認準備').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);
 fireEvent.press(view.getByText('設定'));fireEvent.press(view.getByLabelText('デザイン設定を開く'));await waitFor(()=>expect(view.getByLabelText('デザインカスタマイズを開く')).toBeTruthy(),{timeout:7000});fireEvent.press(view.getByLabelText('デザインカスタマイズを開く'));await waitFor(()=>expect(view.getByText('広告を見て3日間使う')).toBeTruthy(),{timeout:7000});fireEvent.press(view.getByText('広告を見て3日間使う'));
 if(Platform.OS==='ios'){const {DesignCustomizeModal}=require('../components/DesignCustomizeModal');act(()=>view.UNSAFE_getByType(DesignCustomizeModal).props.onDismiss());}
 if(earned){await waitFor(async()=>expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeTruthy(),{timeout:7000});const until=new Date((await loadRewardedAccessState()).premiumDesign.unlockedUntil).getTime();expect(until-Date.now()).toBeGreaterThan(72*3600000-10000);expect(until-Date.now()).toBeLessThanOrEqual(72*3600000);}else{await waitFor(()=>expect(alert).toHaveBeenCalledWith('広告を完了できませんでした',expect.any(String)),{timeout:7000});expect((await loadRewardedAccessState()).premiumDesign.unlockedUntil).toBeNull();}
 fireEvent.press(view.getByText('ToDo'));await waitFor(()=>expect(view.UNSAFE_root.findAll(node=>typeof node.type==='function'&&node.type.name==='TodayWinStrip')[0].props.chicPattern).toBe(earned?'dot':'plain'),{timeout:7000});
},90000);
test('日記を登録・編集・削除しそれぞれ再読込する',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';
 try {
  await storage.clear();await saveRhythmState({tasks:[{id:'diary-crud',title:'日記復元確認',done:false,category:'その他',priority:'中',bucket:'now'}],wishMonths:{}});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',photoLog:'2026-01-01'},firstRunStage:'done'}));
  const App=require('../App').default;let view=render(<App/>);const open=async()=>{await waitFor(()=>expect(view.getAllByText('日記復元確認').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('今日の日記を書く'));};
  const reviews=async()=>Object.values((await loadRhythmState()).wishMonths).flatMap(m=>m.reviews||[]);
  await open();fireEvent.changeText(view.getByPlaceholderText('今日のひとこと'),'日記登録QA');fireEvent.press(view.getByText('保存する'));await waitFor(async()=>expect((await reviews()).some(r=>r.shortNote==='日記登録QA')).toBe(true),{timeout:7000});await waitFor(()=>expect(view.getByText('記録を更新しました')).toBeTruthy(),{timeout:7000});
  view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('日記復元確認').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByRole('button',{name:'今日の日記を見る'}));await waitFor(()=>expect(dailyJournal(view).getByText('日記登録QA')).toBeTruthy(),{timeout:7000});fireEvent.press(view.getByText('編集'));dismissTaskAction(view);fireEvent.changeText(view.getByPlaceholderText('今日のひとこと'),'日記編集QA');fireEvent.press(view.getByText('更新する'));await waitFor(async()=>expect((await reviews()).some(r=>r.shortNote==='日記編集QA')).toBe(true),{timeout:7000});
  view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('日記復元確認').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByRole('button',{name:'今日の日記を見る'}));await waitFor(()=>expect(dailyJournal(view).getByText('日記編集QA')).toBeTruthy(),{timeout:7000});const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});fireEvent.press(view.getByText('削除'));dismissTaskAction(view);const call=alert.mock.calls.find(a=>a[0]==='記録を削除しますか？');act(()=>call[2].find(b=>b.style==='destructive').onPress());await waitFor(async()=>expect((await reviews()).some(r=>r.shortNote==='日記編集QA')).toBe(false),{timeout:7000});
  view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('日記復元確認').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);expect(view.getByText('今日の日記を書く')).toBeTruthy();
 } finally {if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);
test('日記保存失敗後に入力を保って再試行し再読込する',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';
 try {
  await storage.clear();await saveRhythmState({tasks:[{id:'diary-retry',title:'日記再試行準備',done:false,category:'その他',priority:'中',bucket:'now'}],wishMonths:{}});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',photoLog:'2026-01-01'},firstRunStage:'done'}));
  const original=storage.setItem.getMockImplementation();let failed=false;jest.spyOn(storage,'setItem').mockImplementation((key,value)=>{if(key===STORAGE_KEY&&value.includes('日記再試行QA')&&!failed){failed=true;return Promise.reject(Error('disk'));}return original(key,value)});
  const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});const App=require('../App').default;let view=render(<App/>);await waitFor(()=>expect(view.getAllByText('日記再試行準備').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('今日の日記を書く'));fireEvent.changeText(view.getByPlaceholderText('今日のひとこと'),'日記再試行QA');fireEvent.press(view.getByText('保存する'));
  await waitFor(()=>expect(alert).toHaveBeenCalled(),{timeout:7000});await waitFor(()=>expect(view.getByPlaceholderText('今日のひとこと').props.value).toBe('日記再試行QA'),{timeout:7000});expect(Object.values((await loadRhythmState()).wishMonths||{}).flatMap(m=>m.reviews||[]).some(r=>r.shortNote==='日記再試行QA')).toBe(false);
  fireEvent.press(view.getByText('更新する'));await waitFor(async()=>expect(Object.values((await loadRhythmState()).wishMonths).flatMap(m=>m.reviews||[]).some(r=>r.shortNote==='日記再試行QA')).toBe(true),{timeout:7000});
  view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('日記再試行準備').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByRole('button',{name:'今日の日記を見る'}));await waitFor(()=>expect(dailyJournal(view).getByText('日記再試行QA')).toBeTruthy(),{timeout:7000});
 } finally {if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);
test('本番Appを描画するためのNative境界を検証する',()=>{
 const App=require('../App').default;
 const view=render(<App/>);
 expect(view.toJSON()).toBeTruthy();
});
test('保存済みのタスクを本番Appが読込み今日画面へ表示する',async()=>{
 await storage.clear();await saveRhythmState({tasks:[{id:'qa-task',title:'QA用タスク',done:false,category:'その他',priority:'中',bucket:'now'}]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01'},firstRunStage:'done'}));
 const App=require('../App').default;const view=render(<App/>);
 await waitFor(()=>expect(view.getAllByText('QA用タスク').length).toBeGreaterThan(0),{timeout:7000});
});
test('本番AppからTODOを登録し保存・再起動相当の再読込後も保持する',async()=>{
 await storage.clear();await saveRhythmState({tasks:[]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 const App=require('../App').default;const view=render(<App/>);
 await waitFor(()=>expect(view.getByLabelText('タスクを追加')).toBeTruthy(),{timeout:7000});
 fireEvent.press(view.getByLabelText('タスクを追加'));
 fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'連動テストの買い物');
 fireEvent.press(view.getByText('登録する'));
 await waitFor(()=>expect(view.getAllByText('連動テストの買い物').length).toBeGreaterThan(0),{timeout:7000});
 await waitFor(async()=>expect((await loadRhythmState()).tasks.some(t=>t.title==='連動テストの買い物')).toBe(true),{timeout:7000});
 view.unmount();const next=render(<App/>);
 await waitFor(()=>expect(next.getAllByText('連動テストの買い物').length).toBeGreaterThan(0),{timeout:7000});
},20000);
test('本番AppでTODO完了・取消・削除を操作し各状態を再読込する',async()=>{
 await storage.clear();await saveRhythmState({tasks:[{id:'life-task',title:'操作QA',done:false,category:'その他',priority:'高',bucket:'now'},{id:'sentinel',title:'復元確認QA',done:false,category:'その他',priority:'低',bucket:'now'}]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',todoComplete:'2026-01-01',completedTasks:'2026-01-01'},firstRunStage:'done'}));
 const App=require('../App').default;let view=render(<App/>);
 await waitFor(()=>expect(view.getAllByText('操作QA').length).toBeGreaterThan(0),{timeout:7000});
 dismissTomorrowPrompt(view);
 fireEvent.press(view.getByText('一覧'));
 await waitFor(()=>expect(view.getAllByRole('checkbox').length).toBeGreaterThan(0),{timeout:7000});
 fireEvent.press(view.getAllByRole('checkbox')[0],{stopPropagation:()=>{}});
 await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id==='life-task').done).toBe(true),{timeout:7000});
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getByLabelText('今日できたことを確認')).toBeTruthy(),{timeout:7000});dismissTomorrowPrompt(view);
 fireEvent.press(view.getByLabelText('今日できたことを確認'));await waitFor(()=>expect(view.getByText('操作QA')).toBeTruthy(),{timeout:7000});
 fireEvent.press(view.getByText('元に戻す'));await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id==='life-task').done).toBe(false),{timeout:7000});
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('操作QA').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);
 fireEvent.press(view.getAllByText('操作QA')[0],{stopPropagation:()=>{}});fireEvent.press(view.getByText('削除'));dismissTaskAction(view);
 await waitFor(async()=>expect((await loadRhythmState()).tasks.some(t=>t.id==='life-task')).toBe(false),{timeout:7000});
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('復元確認QA').length).toBeGreaterThan(0),{timeout:7000});expect(view.queryByText('操作QA')).toBeNull();
},90000);
test('本番Appで保存失敗を通知し、その後の操作で再保存できる',async()=>{
 await storage.clear();await saveRhythmState({tasks:[]});await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});const original=storage.setItem.getMockImplementation();let failed=false;
 jest.spyOn(storage,'setItem').mockImplementation((key,value)=>{if(key===STORAGE_KEY&&value.includes('失敗後のQA')&&!failed){failed=true;return Promise.reject(Error('disk'));}return original(key,value);});
 const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getByLabelText('タスクを追加')).toBeTruthy(),{timeout:7000});
 dismissTomorrowPrompt(view);
 fireEvent.press(view.getByLabelText('タスクを追加'));fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'失敗後のQA');fireEvent.press(view.getByText('登録する'));
 await waitFor(()=>expect(alert).toHaveBeenCalledWith('保存できませんでした',expect.any(String)),{timeout:7000});
 expect((await loadRhythmState()).tasks.some(t=>t.title==='失敗後のQA')).toBe(false);
 fireEvent.press(view.getByLabelText('タスクを追加'));fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'再試行QA');fireEvent.press(view.getByText('登録する'));
 await waitFor(async()=>expect((await loadRhythmState()).tasks.map(t=>t.title)).toEqual(expect.arrayContaining(['失敗後のQA','再試行QA'])),{timeout:7000});
 jest.restoreAllMocks();
},20000);
test('本番AppでTODOを編集し保存後の再読込でも維持する',async()=>{
 await storage.clear();await saveRhythmState({tasks:[{id:'edit-task',title:'変更前QA',done:false,category:'その他',priority:'中',bucket:'now'}]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 const App=require('../App').default;const view=render(<App/>);
 await waitFor(()=>expect(view.getAllByText('変更前QA').length).toBeGreaterThan(0),{timeout:7000});
 fireEvent.press(view.getAllByText('変更前QA')[0],{stopPropagation:()=>{}});fireEvent.press(view.getByText('編集'));dismissTaskAction(view);
 fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'変更後QA');fireEvent.press(view.getByText('変更を保存'));
 await waitFor(()=>expect(view.getAllByText('変更後QA').length).toBeGreaterThan(0),{timeout:7000});
 await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id==='edit-task').title).toBe('変更後QA'),{timeout:7000});
 view.unmount();const next=render(<App/>);await waitFor(()=>expect(next.getAllByText('変更後QA').length).toBeGreaterThan(0),{timeout:7000});
},20000);
test('複数TODOの一方を編集中にキャンセルしても元のデータを保持する',async()=>{
 await storage.clear();await saveRhythmState({tasks:[{id:'a',title:'キャンセル対象',done:false,category:'その他',priority:'中',bucket:'now'},{id:'b',title:'別のTODO',done:false,category:'その他',priority:'中',bucket:'later'}]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 const App=require('../App').default;let view=render(<App/>);await waitFor(()=>expect(view.getAllByText('キャンセル対象').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);
 fireEvent.press(view.getAllByText('キャンセル対象')[0],{stopPropagation:()=>{}});
 await waitFor(()=>expect(view.getByText('編集')).toBeTruthy(),{timeout:7000});
 fireEvent.press(view.getByText('編集'));dismissTaskAction(view);
 fireEvent.changeText(view.getByPlaceholderText('例：資料をバッグに入れる'),'変更を破棄');fireEvent.press(view.getByText('キャンセル'));
 await waitFor(()=>expect(view.getAllByText('キャンセル対象').length).toBeGreaterThan(0),{timeout:7000});
 const saved=await loadRhythmState();expect(saved.tasks.find(t=>t.id==='a').title).toBe('キャンセル対象');expect(saved.tasks.find(t=>t.id==='b').title).toBe('別のTODO');
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('キャンセル対象').length).toBeGreaterThan(0),{timeout:7000});
},20000);
test('本番Appから予定を追加し保存後に再読込する',async()=>{
 await storage.clear();await saveRhythmState({tasks:[{id:'plan-hydration',title:'予定復元確認',done:false,category:'その他',priority:'中',bucket:'now'}],departurePlans:[]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',schedule:'2026-01-01',planRegistration:'2026-01-01'},firstRunStage:'done'}));
 const App=require('../App').default;let view=render(<App/>);await waitFor(()=>expect(view.getAllByText('予定復元確認').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);
 fireEvent.press(view.getByText('予定'));await waitFor(()=>expect(view.getByText('＋ 予定を追加')).toBeTruthy(),{timeout:7000});
 fireEvent.press(view.getByText('＋ 予定を追加'));fireEvent.changeText(view.getByPlaceholderText('例：友人と待ち合わせ'),'予定連動QA');fireEvent.press(view.getByText('予定表に追加'));
 await waitFor(async()=>expect((await loadRhythmState()).departurePlans.some(p=>p.title==='予定連動QA')).toBe(true),{timeout:7000});
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('予定復元確認').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('予定'));fireEvent.press(view.getByText('予定表'));
 await waitFor(()=>expect(view.getAllByText('予定連動QA').length).toBeGreaterThan(0),{timeout:7000});
 fireEvent.press(view.getByText('編集'),{stopPropagation:()=>{}});dismissTaskAction(view);
 Notifications.getAllScheduledNotificationsAsync.mockRejectedValue(Error('notification unavailable'));
 fireEvent.changeText(view.getByPlaceholderText('例：友人と待ち合わせ'),'変更済み予定QA');fireEvent.press(view.getByText('変更を保存'));
 await waitFor(async()=>expect((await loadRhythmState()).departurePlans.some(p=>p.title==='変更済み予定QA')).toBe(true),{timeout:7000});
 Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('予定復元確認').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('予定'));fireEvent.press(view.getByText('予定表'));
 await waitFor(()=>expect(view.getAllByText('変更済み予定QA').length).toBeGreaterThan(0),{timeout:7000});
 const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});fireEvent.press(view.getByText('削除'),{stopPropagation:()=>{}});dismissTaskAction(view);
 const call=alert.mock.calls.find(args=>args[0]==='この予定を削除しますか？');expect(call).toBeTruthy();act(()=>call[2].find(button=>button.text==='削除する').onPress());
 await waitFor(async()=>expect((await loadRhythmState()).departurePlans.some(p=>p.title==='変更済み予定QA')).toBe(false),{timeout:7000});
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('予定復元確認').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('予定'));fireEvent.press(view.getByText('予定表'));expect(view.queryByText('変更済み予定QA')).toBeNull();
},30000);
test('Premiumの本番Appから準備と移動を伴う予定を保存し出発時刻を再計算する',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';
 try {
  await storage.clear();await saveRhythmState({tasks:[{id:'prem-sentinel',title:'逆算復元確認',done:false,category:'その他',priority:'中',bucket:'now'}],departurePlans:[]});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',schedule:'2026-01-01',planRegistration:'2026-01-01'},firstRunStage:'done'}));
  const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('逆算復元確認').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);
  fireEvent.press(view.getByText('予定'));fireEvent.press(view.getByText('＋ 予定を追加'));fireEvent.press(view.getByText(/到着から逆算/));
  fireEvent.changeText(view.getByPlaceholderText('例：友人と待ち合わせ'),'逆算QA');fireEvent.press(view.getByText('準備'));fireEvent.press(view.getByText('45分'));fireEvent.press(view.getByText('移動'));fireEvent.press(view.getByText('30分'));
  fireEvent.press(view.getByText('この予定を登録'));
  await waitFor(async()=>expect((await loadRhythmState()).departurePlans.some(p=>p.title==='逆算QA')).toBe(true),{timeout:7000});
  const plan=(await loadRhythmState()).departurePlans.find(p=>p.title==='逆算QA');expect(plan.preparationMinutes).toBe(45);expect(plan.travelMinutes).toBe(30);
  const {getDepartureMoments}=require('../features/departure/departureUtils');expect(getDepartureMoments(plan).arrival.getTime()-getDepartureMoments(plan).leave.getTime()).toBe((plan.travelMinutes+plan.bufferMinutes)*60000);
 } finally {if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);
test('本番AppでWish保存中は永続化完了前に成功を表示しない',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';let release;const gate=new Promise(resolve=>{release=resolve;});let writing;let pendingWrite;
 try {
  await storage.clear();await saveRhythmState({tasks:[{id:'wish-sentinel',title:'目標復元確認',done:false,category:'その他',priority:'中',bucket:'now'}],wishMonths:{}});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',wish:'2026-01-01'},firstRunStage:'done'}));
  const original=storage.setItem.getMockImplementation();jest.spyOn(storage,'setItem').mockImplementation((key,value)=>{if(key===STORAGE_KEY&&value.includes('保存保留QA')){writing=true;pendingWrite=gate.then(()=>original(key,value));return pendingWrite;}return original(key,value);});
  const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('目標復元確認').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);
  fireEvent.press(view.getByText('叶えたいこと'));fireEvent.press(view.getByText('＋ 追加する'));fireEvent.changeText(view.getByPlaceholderText('叶えたいこと'),'保存保留QA');fireEvent.press(view.getByText('保存'));
  if(Platform.OS==='ios'){const modal=view.UNSAFE_getAllByType(Modal).find(m=>typeof m.props.onDismiss==='function');if(modal)act(()=>modal.props.onDismiss());}
  await waitFor(()=>expect(writing).toBe(true),{timeout:7000});expect(view.queryByText('叶えたいことを保存しました')).toBeNull();
  expect(view.getByText('保存中…')).toBeTruthy();
  expect(view.getByRole('button',{name:'保存'}).props.accessibilityState.busy).toBe(true);
  expect(view.getByPlaceholderText('叶えたいこと').props.multiline).toBe(true);
 } finally {release();if(pendingWrite)await pendingWrite;if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);
test('本番AppでWish永続化が失敗しても編集内容を保持して再試行できる',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';
 try {
  await storage.clear();await saveRhythmState({tasks:[{id:'wish-error-sentinel',title:'失敗試験準備',done:false,category:'その他',priority:'中',bucket:'now'}],wishMonths:{}});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',wish:'2026-01-01'},firstRunStage:'done'}));
  const original=storage.setItem.getMockImplementation();jest.spyOn(storage,'setItem').mockImplementation((key,value)=>key===STORAGE_KEY&&value.includes('失敗しても残す目標')?Promise.reject(Error('disk failed')):original(key,value));
  const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});const App=require('../App').default;const view=render(<App/>);
  await waitFor(()=>expect(view.getAllByText('失敗試験準備').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);
  fireEvent.press(view.getByText('叶えたいこと'));fireEvent.press(view.getByText('＋ 追加する'));fireEvent.changeText(view.getByPlaceholderText('叶えたいこと'),'失敗しても残す目標');fireEvent.press(view.getByText('保存'));
  await waitFor(()=>expect(alert).toHaveBeenCalledWith('保存できませんでした',expect.any(String)),{timeout:7000});
  expect(view.getByPlaceholderText('叶えたいこと').props.value).toBe('失敗しても残す目標');
 } finally {if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);
test('本番AppでWishの保存失敗後に再試行し再読込しても重複しない',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';
 try {
  await storage.clear();await saveRhythmState({tasks:[{id:'retry-sentinel',title:'再試行復元確認',done:false,category:'その他',priority:'中',bucket:'now'}],wishMonths:{}});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',wish:'2026-01-01'},firstRunStage:'done'}));
  const original=storage.setItem.getMockImplementation();let failed=false;jest.spyOn(storage,'setItem').mockImplementation((key,value)=>{if(key===STORAGE_KEY&&value.includes('再試行目標')&&!failed){failed=true;return Promise.reject(Error('disk failed'));}return original(key,value);});
  const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});const App=require('../App').default;let view=render(<App/>);
  await waitFor(()=>expect(view.getAllByText('再試行復元確認').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('叶えたいこと'));fireEvent.press(view.getByText('＋ 追加する'));fireEvent.changeText(view.getByPlaceholderText('叶えたいこと'),'再試行目標');fireEvent.press(view.getByText('保存'));
  await waitFor(()=>expect(alert).toHaveBeenCalledWith('保存できませんでした',expect.any(String)),{timeout:7000});await waitFor(()=>expect(view.getByPlaceholderText('叶えたいこと').props.value).toBe('再試行目標'),{timeout:7000});
  fireEvent.press(view.getByText('保存'));await waitFor(async()=>{const data=await loadRhythmState();expect(Object.values(data.wishMonths).flatMap(m=>m.wishes).filter(w=>w.title==='再試行目標')).toHaveLength(1);},{timeout:7000});
  view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getAllByText('再試行復元確認').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);fireEvent.press(view.getByText('叶えたいこと'));await waitFor(()=>expect(view.getAllByText('再試行目標').length).toBeGreaterThan(0),{timeout:7000});
 } finally {if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);
test('Wish保存中の連打と通知からのTODO完了後も両方のデータを保持する',async()=>{
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';let release;const gate=new Promise(r=>{release=r;});let writing=false;
 try {
  await storage.clear();await saveRhythmState({tasks:[{id:'parallel-task',title:'同時タスク',done:false,category:'その他',priority:'中',bucket:'now'}],wishMonths:{}});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',wish:'2026-01-01',todoComplete:'2026-01-01'},firstRunStage:'done'}));
  const original=storage.setItem.getMockImplementation();jest.spyOn(storage,'setItem').mockImplementation((key,value)=>{if(key===STORAGE_KEY&&value.includes('同時Wish')){writing=true;return gate.then(()=>original(key,value));}return original(key,value);});
  const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('同時タスク').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);
  fireEvent.press(view.getByText('叶えたいこと'));fireEvent.press(view.getByText('＋ 追加する'));fireEvent.changeText(view.getByPlaceholderText('叶えたいこと'),'同時Wish');fireEvent.press(view.getByText('保存'));
  await waitFor(()=>expect(writing).toBe(true),{timeout:7000});expect(view.getByPlaceholderText('叶えたいこと').props.value).toBe('同時Wish');expect(view.queryByText('叶えたいことを保存しました')).toBeNull();fireEvent.press(view.getByRole('button',{name:'保存'}));
  const listener=Notifications.addNotificationResponseReceivedListener.mock.calls.at(-1)[0];
  await act(async()=>{listener({actionIdentifier:'DONE',notification:{request:{identifier:'n',content:{data:{taskId:'parallel-task'},body:'task'}}}});});
  release();await waitFor(async()=>{const saved=await loadRhythmState();expect(saved.tasks.find(t=>t.id==='parallel-task').done).toBe(true);expect(Object.values(saved.wishMonths).flatMap(m=>m.wishes).filter(w=>w.title==='同時Wish')).toHaveLength(1);},{timeout:7000});
  await waitFor(()=>expect(view.queryByPlaceholderText('叶えたいこと')).toBeNull(),{timeout:7000});
  if(Platform.OS==='ios'){const modal=view.UNSAFE_getAllByType(Modal).find(m=>typeof m.props.onDismiss==='function');if(modal)act(()=>modal.props.onDismiss());}
  expect(view.getByText('叶えたいことを保存しました')).toBeTruthy();
 } finally {release();if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);
test('本番Appの集中開始・一時停止・再開・終了を保存状態に反映する',async()=>{
 await storage.clear();await saveRhythmState({tasks:[{id:'f',title:'集中連動QA',done:false,category:'その他',priority:'中',bucket:'now'}]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',focus:'2026-01-01'},firstRunStage:'done'}));
 const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('集中連動QA').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);
 fireEvent.press(view.getByLabelText('集中する'),{stopPropagation:()=>{}});await waitFor(()=>expect(view.getByText('スタート')).toBeTruthy(),{timeout:7000});
 fireEvent.press(view.getByText('スタート'));await waitFor(()=>expect(view.getByText('一時停止')).toBeTruthy(),{timeout:7000});
 await waitFor(async()=>expect((await loadRhythmState()).focusState.running).toBe(true),{timeout:7000});
 fireEvent.press(view.getByText('一時停止'));await waitFor(async()=>expect((await loadRhythmState()).focusState.running).toBe(false),{timeout:7000});
 fireEvent.press(view.getByText('再開'));await waitFor(async()=>expect((await loadRhythmState()).focusState.running).toBe(true),{timeout:7000});
 const clock=Date.now();jest.spyOn(Date,'now').mockReturnValue(clock+60*60*1000);
 await waitFor(async()=>expect((await loadRhythmState()).focusSessions.some(s=>s.taskId==='f')).toBe(true),{timeout:7000});
 const saved=await loadRhythmState();expect(saved.behaviorEvents.some(e=>e.type==='focus_completed'&&e.taskId==='f')).toBe(true);expect(saved.focusState).toBeUndefined();
 view.unmount();jest.restoreAllMocks();const restored=render(<App/>);await waitFor(()=>expect(restored.getAllByText('集中連動QA').length).toBeGreaterThan(0),{timeout:7000});
 expect((await loadRhythmState()).focusSessions.some(s=>s.taskId==='f')).toBe(true);
},90000);
test('未来TODOを残数に含めず完了・取消・削除を表示に反映する',async()=>{
 const future=new Date();future.setDate(future.getDate()+1);const date=[future.getFullYear(),String(future.getMonth()+1).padStart(2,'0'),String(future.getDate()).padStart(2,'0')].join('-');
 await storage.clear();await saveRhythmState({tasks:[{id:'count',title:'残数QA',done:false,category:'その他',priority:'高',bucket:'now'},{id:'future',title:'未来QA',done:false,category:'その他',priority:'中',bucket:'now',scheduledDate:date}]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',todoComplete:'2026-01-01',completedTasks:'2026-01-01'},firstRunStage:'done'}));
 const App=require('../App').default;const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('残数QA').length).toBeGreaterThan(0),{timeout:7000});dismissTomorrowPrompt(view);
 expect(view.getByText(/残り\s*1/)).toBeTruthy();fireEvent.press(view.getByText('一覧'));fireEvent.press(view.getAllByRole('checkbox')[0],{stopPropagation:()=>{}});
 await waitFor(async()=>expect((await loadRhythmState()).tasks.find(t=>t.id==='count').done).toBe(true),{timeout:7000});fireEvent.press(view.getByText('今'));expect(view.getByText(/残り\s*0/)).toBeTruthy();
 fireEvent.press(view.getByLabelText('今日できたことを確認'));fireEvent.press(view.getByText('元に戻す'));fireEvent.press(view.getByText('閉じる'));
 await waitFor(()=>expect(view.getByText(/残り\s*1/)).toBeTruthy(),{timeout:7000});
 fireEvent.press(view.getAllByText('残数QA')[0],{stopPropagation:()=>{}});fireEvent.press(view.getByText('削除'));dismissTaskAction(view);await waitFor(()=>expect(view.getByText(/残り\s*0/)).toBeTruthy(),{timeout:7000});
},30000);
