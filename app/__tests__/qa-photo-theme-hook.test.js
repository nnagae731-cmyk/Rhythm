jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-image-picker',()=>({requestMediaLibraryPermissionsAsync:jest.fn(),launchImageLibraryAsync:jest.fn()}));
jest.mock('expo-image-manipulator',()=>({manipulateAsync:jest.fn(),SaveFormat:{JPEG:'jpeg'}}));
// Managed-file IO is the boundary; state updates and crop orchestration are real.
jest.mock('../features/photo/persistentPhoto',()=>({persistPhotoUri:jest.fn((uri,target)=>`file:///managed-${target}.jpg`),isPersistedPhotoAvailable:jest.fn(()=>true),deleteManagedPhotoUri:jest.fn(),deleteTemporaryPhotoUri:jest.fn()}));
const React=require('react');
const {renderHook,act,cleanup}=require('@testing-library/react-native');
const {Alert,InteractionManager,Image}=require('react-native');
const picker=require('expo-image-picker'),manipulator=require('expo-image-manipulator');
const files=require('../features/photo/persistentPhoto');
const {DEFAULT_REWARDED_ACCESS_STATE}=require('../features/ads/rewardedAccessStorage');
const {usePhotoTheme}=require('../features/photo/usePhotoTheme');
const slotGrants=(targets,grant)=>({photoAccessByTarget:Object.fromEntries(targets.map(target=>[target,{...grant}]))});
const access=()=>JSON.parse(JSON.stringify(DEFAULT_REWARDED_ACCESS_STATE));
function mount(overrides={}){
 const defaults={planTier:'premium',hasDesignCustomizeAccess:false,rewardedAccess:access(),now:new Date('2026-11-27T10:00:00+09:00'),openRewardedPrompt:jest.fn(),initialPhoto:{placement:'background'}};
 const initial={...defaults,...overrides};
 const hook = renderHook(props=>{const [photoTheme,setPhotoTheme]=React.useState(props.initialPhoto);const [designMode,setDesignMode]=React.useState(props.initialDesignMode??'minimal'); return {...usePhotoTheme({...props,photoTheme,setPhotoTheme,setDesignMode}),photoTheme,designMode};},{initialProps:initial}); hook.initialProps=initial; return hook;
}
beforeEach(()=>{
 jest.clearAllMocks();
 picker.requestMediaLibraryPermissionsAsync.mockReset().mockResolvedValue({granted:true});
 picker.launchImageLibraryAsync.mockReset().mockResolvedValue({canceled:true});
 manipulator.manipulateAsync.mockReset().mockResolvedValue({uri:'file:///cropped.jpg'});
 files.persistPhotoUri.mockReset().mockImplementation((uri,target)=>`file:///managed-${target}.jpg`);
 files.isPersistedPhotoAvailable.mockReset().mockReturnValue(true);
 jest.spyOn(Alert,'alert').mockImplementation(()=>{});
 jest.spyOn(InteractionManager,'runAfterInteractions').mockImplementation(callback=>{callback();return {cancel:jest.fn()};});
});
afterEach(()=>{cleanup();jest.restoreAllMocks();});

test.each(['minimal','dark','chic'])('背景設定の成功時だけPhotoへ。元の色柄のsetterには触れない: %s', async mode => {
 const view=mount({initialDesignMode:mode});
 picker.launchImageLibraryAsync.mockResolvedValue({canceled:false,assets:[{uri:'file:///new.jpg',width:1000,height:600}]});
 await act(async()=>view.result.current.pickPhotoTheme('background'));
 expect(view.result.current.designMode).toBe('photo');
 expect(view.result.current.photoTheme.imageUri).toBe('file:///managed-background.jpg');
});

test.each(['cancel','denied','write-failed','unavailable'])('背景設定の不成立ではモード・写真を変更しない: %s', async failure => {
 const view=mount({initialDesignMode:'dark',initialPhoto:{placement:'background',imageUri:'file:///old.jpg'}});
 if(failure==='denied') picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({granted:false});
 if(failure==='unavailable') { picker.launchImageLibraryAsync.mockResolvedValue({canceled:false,assets:[{uri:'file:///new.jpg'}]});files.isPersistedPhotoAvailable.mockReturnValue(false); }
 if(failure==='write-failed') { picker.launchImageLibraryAsync.mockResolvedValue({canceled:false,assets:[{uri:'file:///new.jpg'}]});files.persistPhotoUri.mockImplementation(()=>{throw Error('disk full');}); }
 await act(async()=>view.result.current.pickPhotoTheme('background'));
 expect(view.result.current.designMode).toBe('dark');expect(view.result.current.photoTheme.imageUri).toBe('file:///old.jpg');
});

test('トップ・集中の設定はモードを変えず、広告後の古いcallbackも最新権限を使う', async()=>{
 const prompt=jest.fn(),view=mount({planTier:'free',openRewardedPrompt:prompt,initialDesignMode:'minimal'});
 await act(async()=>view.result.current.pickPhotoTheme('focus'));
 expect(prompt).toHaveBeenCalledTimes(1);expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
 const continuation=prompt.mock.calls[0][3];
 view.rerender({...view.initialProps,rewardedAccess:{...access(),...slotGrants(['focus','home'],{sampleUnlocked:true,personalProgress:0,personalUnlockedUntil:'2026-11-30T01:00:00Z'})}});
 picker.launchImageLibraryAsync.mockResolvedValue({canceled:false,assets:[{uri:'file:///own.jpg',width:1000,height:600}]});
 await act(async()=>continuation());
 expect(prompt).toHaveBeenCalledTimes(1);expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);expect(view.result.current.designMode).toBe('minimal');
 await act(async()=>view.result.current.pickPhotoTheme('home'));
 await act(async()=>view.result.current.applyPendingTopPhoto());
 expect(view.result.current.photoTheme.topImageUris.home).toBe('file:///managed-top-home.jpg');expect(view.result.current.designMode).toBe('minimal');
});

test('サンプルはライブラリ権限も管理ファイルコピーも不要、背景だけPhotoへ切り替える', async()=>{
 jest.spyOn(Image,'resolveAssetSource').mockReturnValue({uri:'file:///bundle/texture.jpg',width:1280,height:640});
 const view=mount({planTier:'free',rewardedAccess:{...access(),...slotGrants(['home','background'],{sampleUnlocked:true,personalProgress:1,personalUnlockedUntil:null})}});
 await act(async()=>view.result.current.pickPhotoTheme('home',{sampleId:'flowers'}));
 expect(view.result.current.designMode).toBe('minimal');expect(view.result.current.photoTheme.samplePhotoIds.home).toBe('flowers');
 await act(async()=>view.result.current.pickPhotoTheme('background',{sampleId:'texture'}));
 expect(view.result.current.designMode).toBe('photo');expect(view.result.current.photoTheme.samplePhotoIds.background).toBe('texture');
 expect(picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();expect(files.persistPhotoUri).not.toHaveBeenCalled();
});

test('未解放Freeはbypass引数・旧枠・Design試着があっても自分の写真を設定できない', async()=>{
 const state=access();state.photoCustomization={topExtraSlotsUnlocked:5,backgroundUnlocked:true,focusUnlocked:true};state.premiumDesignTrial={used:true,designId:'photo',expiresAt:'2099-01-01T00:00:00Z'};
 const view=mount({planTier:'free',rewardedAccess:state});
 await act(async()=>view.result.current.pickPhotoTheme('background',{bypassRewarded:true}));
 expect(view.result.current.designMode).toBe('minimal');expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
});

test('picker待機中に期限が切れた場合も保存・Photo切替を実行しない', async()=>{
 let release;
 picker.launchImageLibraryAsync.mockImplementation(()=>new Promise(resolve=>{release=resolve;}));
 const state={...access(),...slotGrants(['background'],{sampleUnlocked:true,personalProgress:0,personalUnlockedUntil:'2026-11-28T00:00:00Z'})};
 const view=mount({planTier:'free',rewardedAccess:state});
 let operation; act(()=>{operation=view.result.current.pickPhotoTheme('background');});
 await act(async()=>{await Promise.resolve();});
 expect(typeof release).toBe('function');
 view.rerender({...view.initialProps,now:new Date('2026-11-29T00:00:00Z')});
 await act(async()=>{release({canceled:false,assets:[{uri:'file:///late.jpg',width:1200,height:800}]});await operation;});
 expect(view.result.current.designMode).toBe('minimal');expect(files.persistPhotoUri).not.toHaveBeenCalled();
});

test('サンプルの再cropでも同梱原本はコピー/削除せず、sample種別と元のモードを保持する', async()=>{
 jest.spyOn(Image,'resolveAssetSource').mockReturnValue({uri:'file:///bundle/flowers.jpg',width:1280,height:426});
 jest.spyOn(Image,'getSize').mockImplementation((uri,success)=>success(1280,426));
 const view=mount({planTier:'free',rewardedAccess:{...access(),...slotGrants(['home','background'],{sampleUnlocked:true,personalProgress:1,personalUnlockedUntil:null})}});
 await act(async()=>view.result.current.pickPhotoTheme('home',{sampleId:'flowers'}));
 await act(async()=>view.result.current.adjustTopPhoto('home'));
 expect(view.result.current.pendingTopPhoto.sampleId).toBe('flowers');
 await act(async()=>view.result.current.applyPendingTopPhoto({x:0,y:0,width:1,height:0.4}));
 expect(files.persistPhotoUri).toHaveBeenCalledTimes(1);
 expect(files.persistPhotoUri).toHaveBeenCalledWith('file:///cropped.jpg','top-home');
 expect(view.result.current.photoTheme.topImageOriginalUris.home).toBe('file:///bundle/flowers.jpg');
 expect(view.result.current.photoTheme.samplePhotoIds.home).toBe('flowers');
 expect(view.result.current.designMode).toBe('minimal');
});

test('Freeの既存写真も新規写真も新しい共通解放を要求し、旧写真は保持する',async()=>{
 const prompt=jest.fn();const view=mount({planTier:'free',openRewardedPrompt:prompt,initialPhoto:{placement:'background',topImageUris:{home:'file:///existing.jpg'}}});
 expect(view.result.current.canOpenTopImagePicker('home')).toBe(false);
 expect(view.result.current.canOpenTopImagePicker('wish')).toBe(false);
 await act(async()=>view.result.current.pickPhotoTheme('wish'));
 expect(prompt).toHaveBeenCalledWith('photoTop',expect.any(String),expect.any(String),expect.any(Function),'personal','wish');
 expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
 await act(async()=>view.result.current.pickPhotoTheme('home'));
 expect(view.result.current.topImageCropResumeToken).toBe(0);
 expect(prompt).toHaveBeenCalledTimes(2);
 expect(view.result.current.photoTheme.topImageUris.home).toBe('file:///existing.jpg');
 expect(files.persistPhotoUri).not.toHaveBeenCalled();
});

test('写真アクセス拒否でも既存設定を変更せず、購入フローからの再開は一度だけ行う',async()=>{
 picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({granted:false});
 const view=mount();await act(async()=>view.result.current.pickPhotoTheme('home'));
 expect(view.result.current.topImageCropResumeToken).toBe(1);
 expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
 act(()=>{view.result.current.topImageAccessPurchaseResumeRef.current=true;view.result.current.resumeTopImageAfterAccessFlow();view.result.current.resumeTopImageAfterAccessFlow();});
 expect(view.result.current.topImageCropResumeToken).toBe(2);
 expect(view.result.current.photoTheme).toEqual({placement:'background'});
});

test('背景の置換は他の写真参照を保持し、既存の管理ファイル削除へ保持リストを渡す',async()=>{
 picker.launchImageLibraryAsync.mockResolvedValue({canceled:false,assets:[{uri:'file:///new.jpg',width:1200,height:800}]});
 const view=mount({initialPhoto:{placement:'background',imageUri:'file:///old.jpg',focusBackgroundUri:'file:///focus.jpg',topImageUris:{home:'file:///top.jpg'}}});
 await act(async()=>view.result.current.pickPhotoTheme('background'));
 expect(view.result.current.photoTheme.imageUri).toBe('file:///managed-background.jpg');
 expect(view.result.current.photoTheme.focusBackgroundUri).toBe('file:///focus.jpg');
 expect(files.deleteManagedPhotoUri).toHaveBeenCalledWith('file:///old.jpg',expect.arrayContaining(['file:///focus.jpg','file:///top.jpg','file:///managed-background.jpg']));
});

test('crop保存の二重実行を抑止し、原本・表示画像・crop位置と他の写真設定を保持する',async()=>{
 let release;manipulator.manipulateAsync.mockImplementation(()=>new Promise(resolve=>{release=()=>resolve({uri:'file:///cropped.jpg'});}));
 const view=mount({initialPhoto:{placement:'background',imageUri:'file:///background.jpg',topImageUris:{analysis:'file:///analysis.jpg'}}});
 const crop={x:0,y:0.2,width:1,height:0.4};
 act(()=>view.result.current.setPendingTopPhoto({target:'home',originalUri:'file:///original.jpg',previewUri:'file:///preview.jpg',sourceWidth:1000,sourceHeight:1000}));
 let save;act(()=>{save=view.result.current.applyPendingTopPhoto(crop);void view.result.current.applyPendingTopPhoto(crop);});
 expect(view.result.current.topImageProcessing).toBe(true);expect(manipulator.manipulateAsync).toHaveBeenCalledTimes(1);
 await act(async()=>{release();await save;});
 expect(view.result.current.photoTheme).toMatchObject({imageUri:'file:///background.jpg',topImageUris:{analysis:'file:///analysis.jpg',home:'file:///managed-top-home.jpg'},topImageOriginalUris:{home:'file:///managed-top-original-home.jpg'},topImageCropRects:{home:crop}});
 expect(files.deleteTemporaryPhotoUri).toHaveBeenCalledWith('file:///preview.jpg');
 expect(view.result.current.pendingTopPhoto).toBeUndefined();expect(view.result.current.topImageProcessing).toBe(false);
 expect(view.result.current.topImageCropDismissActionRef.current).toEqual({type:'resume',target:'home'});
});

test('crop処理の失敗では旧設定を保持し、一時プレビューと処理中フラグを片付ける',async()=>{
 manipulator.manipulateAsync.mockRejectedValue(new Error('native crop failed'));
 const view=mount({initialPhoto:{placement:'background',topImageUris:{home:'file:///old-top.jpg'}}});
 act(()=>view.result.current.setPendingTopPhoto({target:'home',originalUri:'file:///original.jpg',previewUri:'file:///preview.jpg',sourceWidth:1000,sourceHeight:1000}));
 await act(async()=>view.result.current.applyPendingTopPhoto());
 expect(view.result.current.photoTheme.topImageUris.home).toBe('file:///old-top.jpg');
 expect(files.persistPhotoUri).not.toHaveBeenCalled();
 expect(files.deleteTemporaryPhotoUri).toHaveBeenCalledWith('file:///preview.jpg');
 expect(view.result.current.topImageProcessing).toBe(false);expect(view.result.current.pendingTopPhoto).toBeUndefined();
 expect(Alert.alert).toHaveBeenCalledWith('トップ画像を調整できませんでした',expect.any(String));
});
