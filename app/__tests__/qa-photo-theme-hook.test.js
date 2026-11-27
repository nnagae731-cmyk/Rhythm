jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-image-picker',()=>({requestMediaLibraryPermissionsAsync:jest.fn(),launchImageLibraryAsync:jest.fn()}));
jest.mock('expo-image-manipulator',()=>({manipulateAsync:jest.fn(),SaveFormat:{JPEG:'jpeg'}}));
// Managed-file IO is the boundary; state updates and crop orchestration are real.
jest.mock('../features/photo/persistentPhoto',()=>({persistPhotoUri:jest.fn((uri,target)=>`file:///managed-${target}.jpg`),isPersistedPhotoAvailable:jest.fn(()=>true),deleteManagedPhotoUri:jest.fn(),deleteTemporaryPhotoUri:jest.fn()}));
const React=require('react');
const {renderHook,act,cleanup}=require('@testing-library/react-native');
const {Alert,InteractionManager}=require('react-native');
const picker=require('expo-image-picker'),manipulator=require('expo-image-manipulator');
const files=require('../features/photo/persistentPhoto');
const {DEFAULT_REWARDED_ACCESS_STATE}=require('../features/ads/rewardedAccessStorage');
const {usePhotoTheme}=require('../features/photo/usePhotoTheme');
const access=()=>JSON.parse(JSON.stringify(DEFAULT_REWARDED_ACCESS_STATE));
function mount(overrides={}){
 const defaults={planTier:'premium',hasDesignCustomizeAccess:false,rewardedAccess:access(),now:new Date('2026-11-27T10:00:00+09:00'),openRewardedPrompt:jest.fn(),initialPhoto:{placement:'background'}};
 const initial={...defaults,...overrides};
 return renderHook(props=>{const [photoTheme,setPhotoTheme]=React.useState(props.initialPhoto);return {...usePhotoTheme({...props,photoTheme,setPhotoTheme}),photoTheme};},{initialProps:initial});
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

test('Freeの既存写真は編集可、新規枠は報酬を要求し、キャンセル後はcrop再開tokenだけを更新する',async()=>{
 const prompt=jest.fn();const view=mount({planTier:'free',openRewardedPrompt:prompt,initialPhoto:{placement:'background',topImageUris:{home:'file:///existing.jpg'}}});
 expect(view.result.current.canOpenTopImagePicker('home')).toBe(true);
 expect(view.result.current.canOpenTopImagePicker('wish')).toBe(false);
 await act(async()=>view.result.current.pickPhotoTheme('wish'));
 expect(prompt).toHaveBeenCalledWith('photoTop',expect.any(String),expect.any(String),expect.any(Function));
 expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
 await act(async()=>view.result.current.pickPhotoTheme('home'));
 expect(view.result.current.topImageCropResumeToken).toBe(1);
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
