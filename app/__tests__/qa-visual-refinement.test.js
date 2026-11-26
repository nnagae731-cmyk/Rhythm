jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo',()=>({...jest.requireActual('expo'),requireOptionalNativeModule:jest.fn()}));
jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-notifications',()=>({...jest.requireActual('expo-notifications'),addNotificationResponseReceivedListener:jest.fn(()=>({remove:jest.fn()})),getPermissionsAsync:jest.fn(async()=>({status:'granted'})),getAllScheduledNotificationsAsync:jest.fn(async()=>[]),cancelScheduledNotificationAsync:jest.fn(async()=>{}),scheduleNotificationAsync:jest.fn(async()=> 'qa-notification'),setNotificationCategoryAsync:jest.fn(async()=>{}),setNotificationChannelAsync:jest.fn(async()=>{})}));
jest.mock('react-native-google-mobile-ads',()=>({BannerAd:()=>null,BannerAdSize:{BANNER:'banner'},TestIds:{BANNER:'test',REWARDED:'test'},RewardedAd:{createForAdRequest:jest.fn()}}));
jest.mock('expo-iap',()=>{const result={connected:true,products:[],subscriptions:[],availablePurchases:[],activeSubscriptions:[],fetchProducts:jest.fn(async()=>[]),requestPurchase:jest.fn(),finishTransaction:jest.fn(),getAvailablePurchases:jest.fn(async()=>[]),getActiveSubscriptions:jest.fn(async()=>[])};return {ErrorCode:{UserCancelled:'cancelled'},getStorefront:jest.fn(async()=>''),useIAP:()=>result};});

const React=require('react');
const {render,fireEvent,act,cleanup}=require('@testing-library/react-native');
const {StyleSheet,View,ScrollView}=require('react-native');
const {StatusBar}=require('expo-status-bar');
const {DesignTryOnModal,FloralPatternDecor}=require('../App');
const {OnboardingPreviewViewport,OnboardingCarousel}=require('../features/onboarding/OnboardingCarousel');
const {INTRO_CARDS}=require('../features/onboarding/onboardingSteps');
const {WishScreen}=require('../WishScreen');
afterEach(()=>{cleanup();jest.restoreAllMocks();jest.useRealTimers();});

test.each(['minimal','dark','chic'])('小画面の本番Appで予定タブ・集中時間・デザイン状態を自動縮小しない：%s',async mode=>{
 const {waitFor,within}=require('@testing-library/react-native'),storage=require('@react-native-async-storage/async-storage');
 const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage'),{ONBOARDING_STORAGE_KEY}=require('../features/onboarding/onboardingStorage');
 jest.spyOn(require('react-native'),'useWindowDimensions').mockReturnValue({width:320,height:568,scale:2,fontScale:1.3});
 // Custom duration is Premium-only; exercise the real editor with valid access.
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='premium';
 try {
  await storage.clear();await saveRhythmState({designMode:mode,monoAppearance:mode==='dark'?'dark':'light',chicPattern:'plain',tasks:[{id:'readable-controls',title:'読みやすさの読込目印',done:false,category:'その他',priority:'中',bucket:'now'}]});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',todoComplete:'2026-01-01'},firstRunStage:'done'}));
  const App=require('../App').default,view=render(<App/>);
  await waitFor(()=>expect(view.getAllByText('読みやすさの読込目印').length).toBeGreaterThan(0),{timeout:10000});
  const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);
  fireEvent.press(view.getByRole('tab',{name:'予定'}));
  const tabs=view.UNSAFE_root.findAll(n=>typeof n.type==='function'&&n.type.name==='TimeTabButton');
  expect(tabs).toHaveLength(4);
  for(const tab of tabs){
   const label=within(tab).getByText({departure:'出発',deadline:'スケジュール',calendar:'予定表',focus:'集中'}[tab.props.tab]);
   expect(label.props.adjustsFontSizeToFit).toBe(false);expect(label.props.minimumFontScale).toBeUndefined();expect(label.props.numberOfLines).toBeUndefined();
   expect(StyleSheet.flatten(label.props.style).fontSize).toBeGreaterThanOrEqual(13);
   expect(label.props.allowFontScaling).not.toBe(false);
  }
  fireEvent.press(within(tabs.find(tab=>tab.props.tab==='focus')).getByText('集中'));
  const custom=view.getByLabelText('カスタム集中時間を設定'),label=within(custom).getByText('カスタム');
  expect(label.props.adjustsFontSizeToFit).toBe(false);expect(label.props.numberOfLines).toBeUndefined();
  expect(StyleSheet.flatten(label.props.style).fontSize).toBeGreaterThanOrEqual(13);
  fireEvent.press(custom);expect(view.getByPlaceholderText('例：47')).toBeTruthy();
  fireEvent.press(view.getByText('キャンセル'));
  fireEvent.press(view.getByRole('tab',{name:'設定'}));fireEvent.press(view.getByLabelText('デザイン設定を開く'));
  const status=view.UNSAFE_root.findAll(n=>typeof n.type==='function'&&n.type.name==='DesignStatusCards')[0];expect(status).toBeTruthy();
  for(const text of [within(status).getByText(status.props.label),within(status).getByText(status.props.accessStatus)]){
   expect(text.props.adjustsFontSizeToFit).toBe(false);expect(text.props.numberOfLines).toBeUndefined();expect(text.props.minimumFontScale).toBeUndefined();
   const style=StyleSheet.flatten(text.props.style);expect(style.fontSize).toBeGreaterThanOrEqual(14);expect(style.lineHeight).toBeGreaterThanOrEqual(21);
   expect(StyleSheet.flatten(text.parent.props.style).height).toBeUndefined();
  }
  expect((await loadRhythmState()).tasks[0].id).toBe('readable-controls');
 } finally {if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);

test('通知本文は読みやすいサイズで折り返し、更新・取消の操作を維持する',async()=>{
 const {waitFor}=require('@testing-library/react-native'),notifications=require('expo-notifications');
 const {NotificationManagerCard}=require('../components/NotificationManagerCard');
 const body='長い通知本文も自動縮小せず確認するための説明です。'.repeat(3);
 notifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce([{identifier:'readable-notice',content:{title:'長い通知タイトル',body}}]);
 const view=render(<NotificationManagerCard designMode="dark"/>);
 await waitFor(()=>expect(view.getByText(body)).toBeTruthy());
 const text=view.getByText(body),style=StyleSheet.flatten(text.props.style);
 expect(style.fontSize).toBeGreaterThanOrEqual(12);expect(style.lineHeight).toBeGreaterThanOrEqual(18);expect(text.props.numberOfLines).toBe(2);expect(text.props.adjustsFontSizeToFit).not.toBe(true);
 const count=notifications.getAllScheduledNotificationsAsync.mock.calls.length;fireEvent.press(view.getByRole('button',{name:'更新'}));
 await waitFor(()=>expect(notifications.getAllScheduledNotificationsAsync.mock.calls.length).toBe(count+1));
 expect(StyleSheet.flatten(view.getByRole('button',{name:'現在の予約をすべて取り消す'}).props.style).minHeight).toBeGreaterThanOrEqual(44);
});

test('履歴・遅刻対応・通知・予定の補足文字は12pt以上で固定高さに閉じ込めない',()=>{
 const {styles}=require('../styles/appStyles');
 for(const name of ['recoveryOptionCopy','recoveryNote','historyTemplateButtonText','historyTemplatePremium','notificationRefreshText','notificationPendingTitle','notificationPendingBody','notificationMore','notificationStopText','scheduleAgendaEdit']){
  const style=StyleSheet.flatten(styles[name]);expect(style.fontSize).toBeGreaterThanOrEqual(12);expect(style.lineHeight).toBeGreaterThanOrEqual(18);
 }
 for(const name of ['notificationRefresh','notificationStopButton','focusDurationChip','historyTemplateButton'])expect(StyleSheet.flatten(styles[name]).height).toBeUndefined();
});

test.each(['minimal','dark','chic'].flatMap(mode=>[[mode,false],[mode,true]]))('今日カードは小画面・文字拡大でも自動縮小せず表示する：%s タスクあり=%s',async(mode,hasTask)=>{
 const {waitFor}=require('@testing-library/react-native'),storage=require('@react-native-async-storage/async-storage');
 const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage'),{ONBOARDING_STORAGE_KEY}=require('../features/onboarding/onboardingStorage'),{HomeScreen}=require('../screens/HomeScreen');
 jest.spyOn(require('react-native'),'useWindowDimensions').mockReturnValue({width:320,height:568,scale:2,fontScale:1.3});
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='free';
 try {
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
  const date=[tomorrow.getFullYear(),String(tomorrow.getMonth()+1).padStart(2,'0'),String(tomorrow.getDate()).padStart(2,'0')].join('-');
  const future={id:'title-fit-future',title:'未来日の読込完了目印',done:false,category:'その他',priority:'中',bucket:'now',scheduledDate:date};
  const longTitle='長いタスク名でも文字を小さくせずに確認する'.repeat(4);
  const tasks=hasTask?[future,{id:'title-fit-current',title:longTitle,done:false,category:'その他',priority:'中',bucket:'now'}]:[future];
  await storage.clear();await saveRhythmState({designMode:mode,monoAppearance:mode==='dark'?'dark':'light',chicPattern:'plain',tasks});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',todoComplete:'2026-01-01'},firstRunStage:'done'}));
  const App=require('../App').default,view=render(<App/>);
  await waitFor(()=>expect(view.UNSAFE_getByType(HomeScreen).props.allTasks.some(task=>task.id===future.id)).toBe(true),{timeout:10000});
  const strip=view.UNSAFE_root.findAll(n=>typeof n.type==='function'&&n.type.name==='TodayWinStrip')[0];expect(strip.props.designMode).toBe(mode);
  const title=view.getByTestId('today-current-task-title');
  expect(title.props.adjustsFontSizeToFit).toBe(false);expect(title.props.allowFontScaling).not.toBe(false);
  expect(title.props.minimumFontScale).toBeUndefined();
  expect(title.props.numberOfLines).toBe(hasTask?2:undefined);
  expect(StyleSheet.flatten(title.props.style).fontSize).toBe(15);
  expect(view.getByText(hasTask?longTitle:'今日はまだ未登録')).toBeTruthy();
  let container=title.parent;while(container&&StyleSheet.flatten(container.props.style)?.minHeight!==44)container=container.parent;
  expect(container).toBeTruthy();expect(StyleSheet.flatten(container.props.style).minWidth).toBe(0);
  expect(view.getByText(new RegExp(`完了\\s*0\\s*(?:/\\s*)?今やる残り\\s*${hasTask?1:0}`))).toBeTruthy();
  expect((await loadRhythmState()).tasks.map(task=>task.id)).toEqual(tasks.map(task=>task.id));
 } finally {if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);

test('共通スタイルは見出しと補足の強弱を分け、空状態は固定高さなしでコンパクトにする',()=>{
 const {styles}=require('../styles/appStyles');
 for(const name of ['sectionTitle','settingsTitle','settingsDisclosureTitle','focusTitle'])expect(StyleSheet.flatten(styles[name]).fontWeight).toBe('700');
 expect(StyleSheet.flatten(styles.focusCopy).fontWeight).toBe('400');
 expect(StyleSheet.flatten(styles.switchCopy).fontSize).toBeGreaterThanOrEqual(12);
 const empty=StyleSheet.flatten(styles.emptyCard);
 expect(empty.minHeight).toBe(96);expect(empty.height).toBeUndefined();expect(empty.borderStyle).toBe('solid');
});

test('本番Appの予定表でシールを直接選択・保存・再読込・解除できる',async()=>{
 const {waitFor}=require('@testing-library/react-native'),storage=require('@react-native-async-storage/async-storage');
 const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage'),{ONBOARDING_STORAGE_KEY}=require('../features/onboarding/onboardingStorage');
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='free';
 try {
  await storage.clear();await saveRhythmState({designMode:'dark',monoAppearance:'dark',calendarMarks:{},tasks:[{id:'mark-marker',title:'目印の再読込目印',done:false,category:'その他',priority:'中',bucket:'now'}]});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',todoComplete:'2026-01-01'},firstRunStage:'done'}));
  const App=require('../App').default;let view=render(<App/>);
  await waitFor(()=>expect(view.getAllByText('目印の再読込目印').length).toBeGreaterThan(0),{timeout:10000});
  const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);
  fireEvent.press(view.getByRole('tab',{name:'予定'}));fireEvent.press(view.getByText('予定表'));
  expect(view.getByText('この日の目印')).toBeTruthy();
  expect(view.queryByLabelText('目印をつける')).toBeNull();
  for(const sticker of ['🌸','💗','☕','⭐','🎯','📌'])expect(view.getByLabelText(sticker+'を目印にする')).toBeTruthy();
  const choice=view.getByLabelText('🌸を目印にする');expect(StyleSheet.flatten(choice.props.style).width).toBeGreaterThanOrEqual(44);
  fireEvent.press(choice);
  expect(view.getByLabelText('🌸を目印にする').props.accessibilityState.selected).toBe(true);
  await waitFor(async()=>expect(Object.values((await loadRhythmState()).calendarMarks)).toEqual(['🌸']));
  view.unmount();view=render(<App/>);
  await waitFor(()=>expect(view.getAllByText('目印の再読込目印').length).toBeGreaterThan(0),{timeout:10000});
  fireEvent.press(view.getByRole('tab',{name:'予定'}));fireEvent.press(view.getByText('予定表'));
  expect(view.getByLabelText('🌸を目印にする').props.accessibilityState.selected).toBe(true);
  fireEvent.press(view.getByLabelText('目印を外す'));
  await waitFor(async()=>expect((await loadRhythmState()).calendarMarks).toEqual({}));
  expect(view.getByLabelText('🌸を目印にする').props.accessibilityState.selected).toBe(false);
  expect(view.queryByLabelText('目印を外す')).toBeNull();
  expect((await loadRhythmState()).tasks[0].title).toBe('目印の再読込目印');
 } finally {if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);

test('Wishのページ位置は0・1件では非表示、複数件では件数分表示する',()=>{
 const props={designMode:'minimal',chicPattern:'plain',monthLabel:'2026年11月',onSaveState:jest.fn(),affirmations:[],affirmationCustomTexts:[],planTier:'premium'};
 const wishes=[{id:'one',title:'ひとつ目',completed:false},{id:'two',title:'ふたつ目',completed:false}];
 const state=count=>({wishes:wishes.slice(0,count),actions:[],review:{}});
 const view=render(<WishScreen {...props} state={state(0)}/>);
 expect(view.queryByTestId('wish-page-indicators')).toBeNull();
 view.rerender(<WishScreen {...props} state={state(1)}/>);
 expect(view.queryByTestId('wish-page-indicators')).toBeNull();
 view.rerender(<WishScreen {...props} state={state(2)}/>);
 expect(view.getByTestId('wish-page-indicators').children).toHaveLength(2);
 view.rerender(<WishScreen {...props} state={state(1)}/>);
 expect(view.queryByTestId('wish-page-indicators')).toBeNull();
});

test.each(['minimal','dark','chic','photo'])('Wish未登録でも表紙と追加欄・言葉カードを整え、登録操作は維持する：%s',designMode=>{
 const view=render(<WishScreen designMode={designMode} chicPattern="plain" monthLabel="2026年11月" state={{wishes:[],actions:[],review:{}}} onSaveState={jest.fn()} affirmations={[]} affirmationCustomTexts={[]} planTier="free" onPremium={jest.fn()}/>);
 expect(view.getByText('ここから、一歩ずつ。')).toBeTruthy();
 let empty=view.getByText('叶えたいことを追加しよう').parent;
 while(empty && StyleSheet.flatten(empty.props.style)?.borderRadius===undefined)empty=empty.parent;
 expect(StyleSheet.flatten(empty.props.style).borderRadius).toBe(20);
 expect(StyleSheet.flatten(empty.props.style).borderWidth).toBe(1);
 expect(StyleSheet.flatten(view.getByTestId('wish-affirmation-card').props.style).borderRadius).toBe(20);
 expect(StyleSheet.flatten(view.getByTestId('wish-management-card').props.style).borderRadius).toBe(22);
 expect(StyleSheet.flatten(view.getByTestId('wish-history-card').props.style).borderRadius).toBe(20);
 expect(view.queryByText('好きな言葉を、選んだ時間に届けられます。')).toBeNull();
 fireEvent.press(view.getByText('＋ 追加する'));
 expect(view.getByPlaceholderText('叶えたいこと')).toBeTruthy();
});
const tryOnProps=()=>({visible:true,initialMode:'chic',initialPattern:'plain',initialColor:'cool',initialMonoAppearance:'light',initialMonoPattern:'plain',onClose:jest.fn(),onApply:jest.fn()});

test('Darkの補助文字は暗い各surfaceでも7対1以上のコントラストを持ち、Lightの配色は維持する',()=>{
 const {getThemeTokens}=require('../theme');
 const luminance=hex=>{const channels=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;};
 const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
 const dark=getThemeTokens('dark').colors;
 for(const background of [dark.screenBackground,dark.surface,dark.secondarySurface])expect(contrast(dark.secondaryText,background)).toBeGreaterThanOrEqual(7);
 expect(getThemeTokens('minimal').colors).toEqual(expect.objectContaining({screenBackground:'#F7F7F5',surface:'#FFFFFF',primaryText:'#182235',secondaryText:'#68748A'}));
});

test('Darkの本番Appで空予定・非選択フィルタ・目印・ルーティン説明・Wishを読みやすく表示する',async()=>{
 const {waitFor,within}=require('@testing-library/react-native'),storage=require('@react-native-async-storage/async-storage');
 const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage'),{ONBOARDING_STORAGE_KEY}=require('../features/onboarding/onboardingStorage'),{getThemeTokens}=require('../theme');
 const previous=process.env.EXPO_PUBLIC_RHYTHM_PLAN;process.env.EXPO_PUBLIC_RHYTHM_PLAN='free';
 try{
  await storage.clear();await saveRhythmState({designMode:'dark',monoAppearance:'dark',tasks:[{id:'night-marker',title:'夜間読みやすさの目印',done:false,category:'その他',priority:'中',bucket:'now'}]});
  await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01',todoComplete:'2026-01-01'},firstRunStage:'done'}));
  const App=require('../App').default,view=render(<App/>),colors=getThemeTokens('dark').colors;
  await waitFor(()=>expect(view.getAllByText('夜間読みやすさの目印').length).toBeGreaterThan(0),{timeout:10000});
  const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);
  const nav=view.getByRole('tab',{name:'叶えたいこと'});
  expect(StyleSheet.flatten(within(nav).getByText('叶えたいこと').props.style).fontSize).toBe(12);
  fireEvent.press(view.getByRole('tab',{name:'予定'}));fireEvent.press(view.getByText('予定表'));
  const chips=view.UNSAFE_root.findAll(n=>typeof n.type==='function'&&n.type.name==='ScheduleFilterChips')[0];
  expect(StyleSheet.flatten(within(chips).getByText('やること').props.style).color).toBe(colors.secondaryText);
  expect(StyleSheet.flatten(within(chips).getByText('やること').props.style).fontSize).toBe(13);
  fireEvent.press(within(chips).getByText('予定'));
  const empty=view.getByText('この日はまだ空いています。');expect(StyleSheet.flatten(empty.props.style).fontSize).toBe(14);expect(StyleSheet.flatten(empty.props.style).color).toBe(colors.secondaryText);
  let card=empty.parent;while(card&&!StyleSheet.flatten(card.props.style)?.backgroundColor)card=card.parent;
  expect(StyleSheet.flatten(card.props.style).backgroundColor).toBe(colors.surface);
  expect(StyleSheet.flatten(view.getByText('この日の目印').props.style).fontSize).toBe(14);
  fireEvent.press(view.getByText('スケジュール'));
  expect(StyleSheet.flatten(view.getByText('予定がなくても時間の流れを確認できます').props.style).fontSize).toBe(12);
  fireEvent.press(view.getByRole('tab',{name:'分析'}));fireEvent.press(view.getByText('ルーティン'));
  expect(StyleSheet.flatten(view.getByText('タスク登録時に「ルーティンにする」を選ぶと、継続率を確認できます。').props.style).fontSize).toBe(14);
  fireEvent.press(view.getByRole('tab',{name:'叶えたいこと'}));
  const wish=within(view.UNSAFE_getByType(WishScreen));expect(StyleSheet.flatten(wish.getByText('叶えたいことを追加しよう').props.style).fontSize).toBe(14);
  expect(StyleSheet.flatten(wish.getByText('自分に届ける言葉').props.style).fontSize).toBe(12);
  expect((await loadRhythmState()).tasks[0].done).toBe(false);
 }finally{if(previous===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previous;}
},90000);

test('花柄サムネイルは読込が遅くても時間切れで画像を隠さず、実エラー時だけ元画像へフォールバックする',()=>{
 jest.useFakeTimers();
 const view=render(<FloralPatternDecor pattern="floral" accent="#8877aa" warm="#eee" compact preview previewTopCrop={false}/>);
 const image=view.getByTestId('floral-image-floral');
 expect(StyleSheet.flatten(image.props.style).opacity).not.toBe(0);
 act(()=>jest.advanceTimersByTime(3000));
 expect(view.getByTestId('floral-image-floral')).toBeTruthy();
 const first=view.getByTestId('floral-image-floral').props.source;
 fireEvent(view.getByTestId('floral-image-floral'),'error',{nativeEvent:{error:'decode failed'}});
 const fallback=view.queryByTestId('floral-image-floral');
 if(fallback){expect(fallback.props.source).not.toBe(first);fireEvent(fallback,'error',{nativeEvent:{error:'also failed'}});}
 expect(view.getByLabelText('花柄の画像を読み込めません')).toBeTruthy();
 view.rerender(<FloralPatternDecor pattern="floralSoft" accent="#8877aa" warm="#eee" compact preview previewTopCrop/>);
 expect(view.getByTestId('floral-image-floralSoft')).toBeTruthy();
 expect(StyleSheet.flatten(view.getByTestId('floral-image-floralSoft').props.style).height).toBe('100%');
});

test.each([['chic','plain','dark'],['dark','plain','light'],['chic','nightSky','light']])('試着 %s / %s はSafe Area背景に合わせてStatusBarを %s にする',(mode,pattern,style)=>{
 const view=render(<DesignTryOnModal {...tryOnProps()} initialMode={mode} initialPattern={pattern} initialMonoAppearance={mode==='dark'?'dark':'light'}/>);
 expect(view.UNSAFE_getByType(StatusBar).props.style).toBe(style);
 view.rerender(<DesignTryOnModal {...tryOnProps()} visible={false}/>);
 expect(view.UNSAFE_queryAllByType(StatusBar)).toHaveLength(0);
});

test('写真なしの試着は適用と誤認させず既存の写真選択処理へ進み、写真ありでは正式適用へ渡す',()=>{
 const props=tryOnProps(),view=render(<DesignTryOnModal {...props} initialMode="photo"/>);
 expect(view.getByText('写真を選ぶと試着できます')).toBeTruthy();
 fireEvent.press(view.getByLabelText('写真を選んで試す'));
 expect(props.onClose).toHaveBeenCalledTimes(1);
 expect(props.onApply).toHaveBeenCalledWith(expect.objectContaining({mode:'photo',photoUri:undefined}));
 expect(props.onClose.mock.invocationCallOrder[0]).toBeLessThan(props.onApply.mock.invocationCallOrder[0]);
 view.rerender(<DesignTryOnModal {...props} initialMode="photo" photoUri="file:///photo.jpg"/>);
 fireEvent.press(view.getByLabelText('このデザインを使う'));
 expect(props.onApply).toHaveBeenLastCalledWith(expect.objectContaining({mode:'photo',photoUri:'file:///photo.jpg'}));
});

test('小画面の試着は選択欄の高さを制限し、適用ボタンをスクロール領域の外へ残す',()=>{
 jest.spyOn(require('react-native'),'useWindowDimensions').mockReturnValue({width:320,height:568,scale:2,fontScale:1.2});
 const view=render(<DesignTryOnModal {...tryOnProps()}/>);
 expect(StyleSheet.flatten(view.getByTestId('design-tryon-controls').props.style).maxHeight).toBe(Math.round(568*0.36));
 expect(view.getByTestId('design-tryon-options').findAll(n=>n.props.accessibilityLabel==='このデザインを使う')).toHaveLength(0);
 for(const label of ['シンプル','デザイン','写真'])expect(view.getByText(label)).toBeTruthy();
});

test('Darkのカレンダー取り込み空表示は白いカードにならずテーマのsurfaceを使う',async()=>{
 const {TimelineScreen}=require('../screens/TimelineScreen'),{getThemeTokens}=require('../theme');
 const {waitFor}=require('@testing-library/react-native'),storage=require('@react-native-async-storage/async-storage');
 const {saveRhythmState}=require('../storage/rhythmStorage'),{ONBOARDING_STORAGE_KEY}=require('../features/onboarding/onboardingStorage');
 await storage.clear();await saveRhythmState({designMode:'dark',monoAppearance:'dark',tasks:[{id:'palette-marker',title:'テーマ復元確認',category:'その他',priority:'中',done:false,bucket:'now'}]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 const App=require('../App').default,view=render(<App/>);
 await waitFor(()=>expect(view.getAllByText('テーマ復元確認').length).toBeGreaterThan(0),{timeout:10000});
 const tomorrow=view.queryByText('今日はしない');if(tomorrow)fireEvent.press(tomorrow);
 fireEvent.press(view.getByRole('tab',{name:'予定'}));
 const props=view.UNSAFE_getByType(TimelineScreen).props;view.unmount();
 const timeline=render(<TimelineScreen {...props} designMode="dark" initialTab="departure" previewMode previewCalendarOptions={[]} previewCalendarEvents={[]}/>);
 const text=timeline.getByText('新しく取り込める予定はありません');
 expect(StyleSheet.flatten(text.props.style).color).toBe(getThemeTokens('dark').colors.primaryText);
 let card=text.parent;
 while(card&&!StyleSheet.flatten(card.props.style)?.backgroundColor)card=card.parent;
 expect(StyleSheet.flatten(card.props.style).backgroundColor).toBe(getThemeTokens('dark').colors.surface);
},90000);

test('初回プレビューは一定幅の本番canvas全体を計測して収め、紹介本文は小画面で縦スクロールできる',()=>{
 const view=render(<OnboardingPreviewViewport height={200} colors={{surface:'#fff',border:'#ddd'}}><View style={{height:400}}/></OnboardingPreviewViewport>);
 fireEvent(view.getByTestId('onboarding-preview-viewport'),'layout',{nativeEvent:{layout:{width:280,height:200}}});
 fireEvent(view.getByTestId('onboarding-preview-canvas'),'layout',{nativeEvent:{layout:{width:360,height:400}}});
 expect(StyleSheet.flatten(view.getByTestId('onboarding-preview-canvas').props.style).transform[0].scale).toBeCloseTo(184/400);
 expect(view.getByTestId('onboarding-preview-viewport').props.pointerEvents).toBe('none');
 view.unmount();
 jest.spyOn(require('react-native'),'useWindowDimensions').mockReturnValue({width:320,height:568,scale:2,fontScale:1.3});
 const intro=render(<OnboardingCarousel visible cards={[INTRO_CARDS[2]]} renderStep={()=> <View style={{height:300}}/>} onDismiss={()=>{}}/>);
 expect(intro.getByText(INTRO_CARDS[2].title)).toBeTruthy();expect(INTRO_CARDS[2].title).toContain('\n自分のペースで。');
 expect(intro.UNSAFE_getAllByType(ScrollView).some(v=>StyleSheet.flatten(v.props.contentContainerStyle)?.flexGrow===1)).toBe(true);
});

test('Wishは写真未設定の表紙をコンパクトにし、画像の調整は明示操作で開く',()=>{
 const props={designMode:'dark',chicPattern:'plain',monthLabel:'2026年11月',state:{wishes:[{id:'w',title:'目標',completed:false}],actions:[],review:{}},onSaveState:jest.fn(),onPickTopImage:jest.fn(),affirmations:[],affirmationCustomTexts:[],planTier:'premium',onSaveAffirmation:jest.fn(),onDeleteAffirmation:jest.fn(),onSaveAffirmationCustomText:jest.fn(),onDeleteAffirmationCustomText:jest.fn(),onPremium:jest.fn()};
 const view=render(<WishScreen {...props}/>);
 expect(StyleSheet.flatten(view.getByTestId('wish-cover').props.style).minHeight).toBe(96);
 expect(StyleSheet.flatten(view.getByTestId('wish-actions-w').props.style).borderTopWidth).toBe(1);
 expect(StyleSheet.flatten(view.getByTestId('wish-actions-w').props.style).borderRadius).toBeUndefined();
 const pins=view.getAllByTestId('wish-pin');expect(pins).toHaveLength(2);
 for(const pin of pins){
  expect(pin.props.pointerEvents).toBe('none');expect(pin.props.accessible).toBe(false);
  expect(StyleSheet.flatten(pin.props.style).width).toBe(30);
  expect(pin.findAll(n=>StyleSheet.flatten(n.props.style)?.width===22&&StyleSheet.flatten(n.props.style)?.height===22).length).toBeGreaterThan(0);
 }
 const pager=view.UNSAFE_getAllByType(ScrollView).find(v=>v.props.horizontal&&v.props.onMomentumScrollEnd);
 expect(pager.props.contentContainerStyle.paddingTop).toBeGreaterThanOrEqual(11);
 expect(view.queryByText('文字位置')).toBeNull();
 fireEvent.press(view.getByLabelText('画像と文字位置を設定'));
 expect(view.getByText('文字位置')).toBeTruthy();
 fireEvent.press(view.getByText('トップ画像を設定'));expect(props.onPickTopImage).toHaveBeenCalledTimes(1);
 view.rerender(<WishScreen {...props} topImageUri="file:///cover.jpg"/>);
 expect(StyleSheet.flatten(view.getByTestId('wish-cover').props.style).minHeight).toBe(190);
});
