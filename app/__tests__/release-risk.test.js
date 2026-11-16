jest.mock('expo-file-system', () => {
  const files = new Map();
  class File { constructor(...parts) { this.uri = parts.length === 1 ? parts[0] : `${parts[0].uri}/${parts[1]}`; } get exists(){return files.has(this.uri);} copy(dest){files.set(dest.uri,true);} delete(){files.delete(this.uri);} }
  class Directory { constructor(base,name){this.uri=`${base.uri}/${name}`;} get exists(){return true;} create(){} list(){return [...files.keys()].filter(uri=>uri.startsWith(`${this.uri}/`)).map(uri=>new File(uri));} }
  return { File, Directory, Paths:{document:{uri:'file:///Documents'}}, __files:files };
});
jest.mock('expo-notifications', () => ({SchedulableTriggerInputTypes:{DATE:'date'},scheduleNotificationAsync:jest.fn(),cancelScheduledNotificationAsync:jest.fn(),getAllScheduledNotificationsAsync:jest.fn()}));
const fs = require('expo-file-system');
const N = require('expo-notifications');
const { persistPhotoUri, cleanupUnreferencedManagedPhotos, collectReferencedManagedPhotoUris, deleteManagedPhotoUri } = require('../features/photo/persistentPhoto');
const { scheduleFocusCompletionNotification, cancelFocusCompletionNotification, cancelPendingFocusCompletionNotifications } = require('../features/focus/focusNotifications');
const { buildRhythmWidgetSnapshot } = require('../features/widget/rhythmWidgetSnapshot');
beforeEach(()=>{fs.__files.clear(); jest.clearAllMocks();});
test('編集中の未保存日記写真は、別設定変更に伴うcleanup後も残る',()=>{
 const draft = persistPhotoUri('file:///library/image.jpg','journal');
 const refs = collectReferencedManagedPhotoUris({photoTheme:{placement:'background',imageUri:'file:///Documents/rhythm-photos/background.jpg'},wishMonths:{}});
 cleanupUnreferencedManagedPhotos(refs);
 expect(fs.__files.has(draft)).toBe(true);
});
test('背景画像の変更時、日記からも参照中の同一管理写真は残る',()=>{
 const shared=persistPhotoUri('file:///library/shared.jpg','journal');
 const current={imageUri:shared,focusBackgroundUri:undefined,topImageUris:{},topImageOriginalUris:{}};
 // This is the existing applyPhotoDesign call's retained-URI input. The same
 // URI is also present in a daily review, but that state is not passed here.
 deleteManagedPhotoUri(current.imageUri,['file:///Documents/rhythm-photos/new.jpg',current.focusBackgroundUri,...Object.values(current.topImageUris),...Object.values(current.topImageOriginalUris)]);
 expect(fs.__files.has(shared)).toBe(true);
});
test('保存済みの背景・日記・Widgetの共有写真は繰り返しcleanupしても残る',()=>{
 const uri='file:///Documents/rhythm-photos/previous-shared.jpg'; fs.__files.set(uri,true);
 const state={photoTheme:{placement:'background',imageUri:uri},widgetSettings:{widgetCustomizations:{today:{photoUri:uri}}},wishMonths:{'2026-05':{review:{photo:uri}}}};
 const refs=collectReferencedManagedPhotoUris(state); cleanupUnreferencedManagedPhotos(refs); cleanupUnreferencedManagedPhotos(refs); expect(fs.__files.has(uri)).toBe(true);
 delete state.photoTheme.imageUri; delete state.widgetSettings.widgetCustomizations.today.photoUri;
 cleanupUnreferencedManagedPhotos(collectReferencedManagedPhotoUris(state)); expect(fs.__files.has(uri)).toBe(true);
 delete state.wishMonths['2026-05'].review.photo; cleanupUnreferencedManagedPhotos(collectReferencedManagedPhotoUris(state)); expect(fs.__files.has(uri)).toBe(false);
});
test('cleanupは管理外の写真を触らず削除失敗しても中断しない',()=>{
 const managed='file:///Documents/rhythm-photos/old.jpg', outside='file:///library/user.jpg'; fs.__files.set(managed,true); fs.__files.set(outside,true);
 const original=fs.File.prototype.delete; const warn=jest.spyOn(console,'warn').mockImplementation(()=>{}); fs.File.prototype.delete=function(){if(this.uri===managed) throw Error('failed'); return original.call(this);};
 try { expect(()=>cleanupUnreferencedManagedPhotos([])).not.toThrow(); expect(fs.__files.has(outside)).toBe(true); expect(fs.__files.has(managed)).toBe(true); } finally {fs.File.prototype.delete=original;warn.mockRestore();}
});
test('参照収集が不可能なら失敗を返し削除判断に使わない',()=>{const input={};input.self=input;expect(()=>collectReferencedManagedPhotoUris(input)).toThrow();});
test('古いコンテナの同名写真参照を保護する',()=>{const uri='file:///Documents/rhythm-photos/legacy.jpg';fs.__files.set(uri,true);cleanupUnreferencedManagedPhotos(['file:///old-container/rhythm-photos/legacy.jpg']);expect(fs.__files.has(uri)).toBe(true);});
test('起動直後のcleanup実行中にコピーされた写真は同じ走査で削除されない',()=>{
 const original=fs.Directory.prototype.list; let created;
 fs.Directory.prototype.list=function(){created=persistPhotoUri('file:///library/new.jpg','journal'); return original.call(this);};
 try {cleanupUnreferencedManagedPhotos([]);expect(fs.__files.has(created)).toBe(true);} finally {fs.Directory.prototype.list=original;}
});
test('写真コピー失敗は例外として通知し、次の試行を妨げない',()=>{
 const original=fs.File.prototype.copy;fs.File.prototype.copy=function(){throw Error('copy failed');};
 try {expect(()=>persistPhotoUri('file:///library/fail.jpg','journal')).toThrow('copy failed');} finally {fs.File.prototype.copy=original;}
 const uri=persistPhotoUri('file:///library/retry.jpg','journal');cleanupUnreferencedManagedPhotos([]);expect(fs.__files.has(uri)).toBe(true);
});
test('強制終了後の再起動相当では保存済み参照が写真を保持する',()=>{
 const uri='file:///Documents/rhythm-photos/restart-saved.jpg';
 jest.isolateModules(()=>{const freshFs=require('expo-file-system');const photo=require('../features/photo/persistentPhoto');freshFs.__files.set(uri,true);const saved=JSON.parse(JSON.stringify({wishMonths:{'2026-05':{review:{photo:uri}}}}));photo.cleanupUnreferencedManagedPhotos(photo.collectReferencedManagedPhotoUris(saved));expect(freshFs.__files.has(uri)).toBe(true);});
});
test('参照を全て削除して正常保存した後の次回起動相当では不要画像を整理',()=>{
 const uri='file:///Documents/rhythm-photos/restart-orphan.jpg';
 jest.isolateModules(()=>{const freshFs=require('expo-file-system');const photo=require('../features/photo/persistentPhoto');freshFs.__files.set(uri,true);photo.cleanupUnreferencedManagedPhotos(photo.collectReferencedManagedPhotoUris({wishMonths:{}}));expect(freshFs.__files.has(uri)).toBe(false);});
});
test('Focus通知は未来かつ許可時のみ指定時刻で予約',async()=>{
 const future=new Date(Date.now()+3600000).toISOString(); N.scheduleNotificationAsync.mockResolvedValue('id');
 await expect(scheduleFocusCompletionNotification({timerId:'x',endAt:future,permissionGranted:true})).resolves.toBe('id');
 expect(N.scheduleNotificationAsync.mock.calls[0][0].trigger.date.toISOString()).toBe(future);
 await expect(scheduleFocusCompletionNotification({timerId:'x',endAt:future,permissionGranted:false})).resolves.toBeNull();
 await expect(scheduleFocusCompletionNotification({timerId:'x',endAt:'bad',permissionGranted:true})).resolves.toBeNull();
 expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
});
test('Focus取消は指定IDおよび同じタイマーの通知だけを対象にする',async()=>{
 N.cancelScheduledNotificationAsync.mockResolvedValue(); N.getAllScheduledNotificationsAsync.mockResolvedValue([{identifier:'a',content:{data:{kind:'focus_timer_complete',focusTimerId:'x'}}},{identifier:'b',content:{data:{kind:'focus_timer_complete',focusTimerId:'y'}}}]);
 await cancelFocusCompletionNotification('specific'); await cancelPendingFocusCompletionNotifications('x');
 expect(N.cancelScheduledNotificationAsync.mock.calls.map(x=>x[0])).toEqual(['specific','a']);
});
test('Widgetは完了・スキップ済みのタスクを現在表示しない',()=>{
 const base={title:'a',category:'仕事',priority:'中',scheduledDate:'2026-05-20'};
 const snapshot=buildRhythmWidgetSnapshot({tasks:[{...base,id:'1',done:true},{...base,id:'2',done:false,status:'skipped'}],departurePlans:[],departureCheckIns:[],canShowArrivalReverseCountdown:true,now:new Date(2026,4,20,12)});
 expect(snapshot.currentTask).toBeUndefined();
});
