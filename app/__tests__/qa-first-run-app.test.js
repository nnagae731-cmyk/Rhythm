jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-notifications',()=>({...jest.requireActual('expo-notifications'),addNotificationResponseReceivedListener:jest.fn(()=>({remove:jest.fn()})),getPermissionsAsync:jest.fn(async()=>({status:'granted'})),getAllScheduledNotificationsAsync:jest.fn(async()=>[]),cancelScheduledNotificationAsync:jest.fn(async()=>{}),scheduleNotificationAsync:jest.fn(async()=> 'qa-notification'),setNotificationCategoryAsync:jest.fn(async()=>{}),setNotificationChannelAsync:jest.fn(async()=>{})}));
jest.mock('react-native-google-mobile-ads',()=>({__esModule:true,default:()=>({initialize:jest.fn(async()=>{})}),BannerAd:()=>null,BannerAdSize:{BANNER:'banner'},TestIds:{BANNER:'test',REWARDED:'test'},AdEventType:{CLOSED:'closed',ERROR:'error'},RewardedAdEventType:{LOADED:'loaded',EARNED_REWARD:'earned'},RewardedAd:{createForAdRequest:jest.fn()}}));
jest.mock('expo-iap',()=>{const result={connected:false,products:[],subscriptions:[],availablePurchases:[],activeSubscriptions:[],fetchProducts:jest.fn(),requestPurchase:jest.fn(),finishTransaction:jest.fn(),getAvailablePurchases:jest.fn(),getActiveSubscriptions:jest.fn()};return {ErrorCode:{UserCancelled:'cancelled'},useIAP:()=>result};});

const React=require('react');
const {render,cleanup,fireEvent,waitFor,act,within}=require('@testing-library/react-native');
const {Modal,Alert}=require('react-native');
const storage=require('@react-native-async-storage/async-storage');
const {saveRhythmState,loadRhythmState}=require('../storage/rhythmStorage');
const {ONBOARDING_STORAGE_KEY}=require('../features/onboarding/onboardingStorage');
const {INTRO_CARDS}=require('../features/onboarding/onboardingSteps');
const {OnboardingCarousel}=require('../features/onboarding/OnboardingCarousel');
const {TaskModal}=require('../components/TaskModal');
const {VoiceInputModal}=require('../components/VoiceInputModal');
const {DesignAppliedPreview}=require('../screens/SettingsScreen');
const {loadRewardedAccessState}=require('../features/ads/rewardedAccessStorage');
const App=require('../App').default;
const previousPlan=process.env.EXPO_PUBLIC_RHYTHM_PLAN;
beforeEach(async()=>{process.env.EXPO_PUBLIC_RHYTHM_PLAN='free';await storage.clear();jest.spyOn(Alert,'alert').mockImplementation(()=>{});});
afterEach(()=>{cleanup();jest.restoreAllMocks();if(previousPlan===undefined)delete process.env.EXPO_PUBLIC_RHYTHM_PLAN;else process.env.EXPO_PUBLIC_RHYTHM_PLAN=previousPlan;});
const savedIntro=async()=>JSON.parse(await storage.getItem(ONBOARDING_STORAGE_KEY)||'{}');
const sheet=view=>view.UNSAFE_root.findAll(node=>typeof node.type==='function'&&node.type.name==='DesignSettingsSheet')[0];
const intro=view=>view.UNSAFE_getByType(OnboardingCarousel);
async function fresh(){const view=render(<App/>);await waitFor(()=>expect(intro(view).props.visible).toBe(true),{timeout:10000});return view;}
function dismissIntro(view){act(()=>view.UNSAFE_getAllByType(Modal).find(m=>m.props.testID==='onboarding-intro-modal').props.onDismiss());}
function dismissSheet(view){act(()=>sheet(view).findByType(Modal).props.onDismiss());}
async function enterDesign(view,skipAt){
 if(skipAt!==undefined){for(let i=0;i<skipAt;i++)fireEvent.press(within(intro(view)).getByLabelText('次へ'));fireEvent.press(within(intro(view)).getByLabelText('使い方をスキップ'));}
 else{for(let i=0;i<4;i++)fireEvent.press(within(intro(view)).getByLabelText('次へ'));fireEvent.press(within(intro(view)).getByLabelText('デザインを選ぶ'));}
 await waitFor(async()=>expect((await savedIntro()).firstRunStage).toBe('design'),{timeout:10000});
 expect(sheet(view)?.props.visible===true).toBe(false);
 dismissIntro(view);
 await waitFor(()=>expect(view.getByText('あとで選ぶ')).toBeTruthy(),{timeout:10000});
}
test('初回は一元管理の5枚だけを表示し、本番プレビューが実データ・Modalを変更しない',async()=>{
 const view=await fresh();expect(INTRO_CARDS.map(c=>c.id)).toEqual(['today','voice','schedule','records','customize']);
 expect(INTRO_CARDS.map(c=>c.title.replace(/\n/g,''))).toEqual(['毎日のことを、ひとつに。','思いついたら、すぐ残せる。','予定も、やることも、自分のペースで。','毎日の積み重ねが、未来につながる。','毎日開きたくなる、私のRhythm。']);
 expect(sheet(view)).toBeUndefined();expect(view.UNSAFE_getAllByType(Modal).filter(m=>m.props.visible===true)).toHaveLength(1);
 const schedule=view.UNSAFE_root.findAll(n=>typeof n.type==='function'&&n.type.name==='DailyScheduleTimeline'&&n.props.visibleStartHour===9&&n.props.visibleEndHour===12);
 expect(schedule).toHaveLength(1);
 expect(view.UNSAFE_getAllByType(VoiceInputModal).some(m=>m.props.inlinePreview)).toBe(true);
 const designs=view.UNSAFE_getAllByType(DesignAppliedPreview);
 expect(designs).toHaveLength(1);expect(designs[0].props.tab).toBe('chic');expect(designs[0].props.showcase).toBe(true);
 const showcase=within(intro(view)).getByTestId('onboarding-design-preview');
 expect(showcase.findAll(n=>n.props.testID==='onboarding-preview-canvas')).toHaveLength(0);
 expect(within(showcase).getByTestId('design-showcase').props.style.height).toBe(300);
 expect(designs[0].props.showcaseBackground).toBeTruthy();
 await waitFor(async()=>expect((await loadRhythmState())?.tasks).toEqual([]),{timeout:10000});
 expect((await loadRhythmState()).departurePlans).toEqual([]);expect((await savedIntro()).completed?.intro).toBeUndefined();
 expect((await loadRewardedAccessState()).premiumDesignTrial.used).toBe(false);
},60000);
test.each([0,2])('新規紹介を%d枚目からスキップしてもDesignへ進み、あとで選ぶと無料標準で完了する',async(skipAt)=>{
 const view=await fresh();await enterDesign(view,skipAt);fireEvent.press(view.getByText('あとで選ぶ'));dismissSheet(view);
 await waitFor(async()=>expect((await savedIntro()).firstRunStage).toBe('done'),{timeout:10000});await waitFor(()=>expect(view.getByLabelText('タスクを追加')).toBeTruthy(),{timeout:10000});
 await waitFor(async()=>{const s=await loadRhythmState();expect(s.designMode).toBe('minimal');expect(s.monoPattern).toBe('plain');},{timeout:10000});
 expect((await loadRewardedAccessState()).premiumDesignTrial.used).toBe(false);expect((await savedIntro()).completed.design).toBeTruthy();
},60000);
test('5枚目のCTAから無料デザインを選び、再読込しても選択画面を再表示しない',async()=>{
 let view=await fresh();await enterDesign(view);fireEvent.press(view.getByText('ライト'));
 await waitFor(async()=>expect((await savedIntro()).firstRunStage).toBe('done'),{timeout:10000});await waitFor(()=>expect(sheet(view)).toBeUndefined(),{timeout:10000});
 view.unmount();view=render(<App/>);await waitFor(()=>expect(view.getByLabelText('タスクを追加')).toBeTruthy(),{timeout:10000});
 expect(intro(view).props.visible).toBe(false);expect(sheet(view)).toBeUndefined();expect((await savedIntro()).completed.design).toBeTruthy();
 expect(view.UNSAFE_queryAllByType(VoiceInputModal).some(n=>n.props.inlinePreview)).toBe(false);
},60000);
test('紹介途中の再描画では紹介へ、Design途中の再描画ではDesignへ復帰する',async()=>{
 let view=await fresh();fireEvent.press(within(intro(view)).getByLabelText('次へ'));view.unmount();view=await fresh();
 expect((await savedIntro()).completed?.intro).toBeUndefined();await enterDesign(view,0);view.unmount();view=render(<App/>);
 await waitFor(()=>expect(view.getByText('あとで選ぶ')).toBeTruthy(),{timeout:10000});expect(intro(view).props.visible).toBe(false);
},60000);
test.each(['free','premium'])('完了済みの%sユーザーは通常起動で紹介・Designを再表示しない',async(tier)=>{
 process.env.EXPO_PUBLIC_RHYTHM_PLAN=tier;await saveRhythmState({tasks:[{id:'old-user',title:'既存ユーザーの目印',done:false,category:'その他',priority:'中',bucket:'now'}]});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',design:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('既存ユーザーの目印').length).toBeGreaterThan(0),{timeout:10000});
 expect(intro(view).props.visible).toBe(false);expect(sheet(view)).toBeUndefined();expect((await savedIntro()).firstRunStage).toBe('done');
 const {OnboardingHint}=require('../features/onboarding/OnboardingHint');expect(view.UNSAFE_queryAllByType(OnboardingHint).every(h=>!h.props.onExitTour)).toBe(true);
},60000);
test('設定から紹介を再表示してスキップ・最終CTAを押しても完了状態とデザインを変更しない',async()=>{
 await saveRhythmState({tasks:[{id:'replay',title:'再表示の読込目印',done:false,category:'その他',priority:'中',bucket:'now'}],designMode:'dark',monoAppearance:'dark'});
 await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',design:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done',photoEntryHintShown:true}));
 const before=await savedIntro(),view=render(<App/>);await waitFor(()=>expect(view.getAllByText('再表示の読込目印').length).toBeGreaterThan(0),{timeout:10000});
 const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);fireEvent.press(view.getByText('設定'));fireEvent.press(view.getByText('RhythmPaceの使い方'));
 await waitFor(()=>expect(intro(view).props.visible).toBe(true));fireEvent.press(within(intro(view)).getByLabelText('使い方をスキップ'));await waitFor(()=>expect(intro(view).props.visible).toBe(false));dismissIntro(view);
 fireEvent.press(view.getByText('RhythmPaceの使い方'));for(let i=0;i<4;i++)fireEvent.press(within(intro(view)).getByLabelText('次へ'));fireEvent.press(within(intro(view)).getByLabelText('閉じる'));await waitFor(()=>expect(intro(view).props.visible).toBe(false));
 expect(await savedIntro()).toEqual(before);expect(sheet(view)?.props.visible===true).toBe(false);expect((await loadRhythmState()).designMode).toBe('dark');
},60000);
test('Freeの日記入口はPremium案内であり、無料登録を許可せず保存済みの本文・写真も表示しない',async()=>{
 const day=require('../features/schedule/dateTimeUtils').dateKey();
 await saveRhythmState({tasks:[{id:'diary-free',title:'無料日記判定の目印',done:false,category:'その他',priority:'中',bucket:'now'}],wishMonths:{[day.slice(0,7)]:{wishes:[],actions:[],review:{},reviews:[{id:'protected-journal',date:day,shortNote:'有料の日記本文保護',photo:'file:///protected-journal.jpg',photos:['file:///protected-journal.jpg']}]}}});await storage.setItem(ONBOARDING_STORAGE_KEY,JSON.stringify({version:1,completed:{intro:'2026-01-01',todo:'2026-01-01'},firstRunStage:'done'}));
 const view=render(<App/>);await waitFor(()=>expect(view.getAllByText('無料日記判定の目印').length).toBeGreaterThan(0),{timeout:10000});const prompt=view.queryByText('今日はしない');if(prompt)fireEvent.press(prompt);
 expect(view.queryByText('有料の日記本文保護')).toBeNull();expect(view.queryByLabelText('今日の日記の写真')).toBeNull();fireEvent.press(view.getByRole('button',{name:'今日の日記を見る'}));
 const {PremiumModal}=require('../components/PremiumModal');await waitFor(()=>expect(view.UNSAFE_getByType(PremiumModal).props.visible).toBe(true));
 // Inspect the actual dailyReviewOnly entry, not the read-only intro sample.
 const {HistoryScreen}=require('../screens/HistoryScreen');expect(view.UNSAFE_queryAllByType(HistoryScreen).filter(n=>n.props.dailyReviewOnly&&!n.props.previewJournal)).toHaveLength(0);
},60000);
