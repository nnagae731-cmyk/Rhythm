jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-notifications', () => ({getAllScheduledNotificationsAsync:jest.fn(),cancelScheduledNotificationAsync:jest.fn()}));
const storage=require('@react-native-async-storage/async-storage');
const api=require('expo-notifications');
const {cancelPendingDepartureNotifications}=require('../features/departure/departureNotifications');
const {cancelPendingFocusCompletionNotifications}=require('../features/focus/focusNotifications');
const {pendingNotificationReconciliations,reconcileNotificationOperation}=require('../features/notifications/pendingReconciliation');
const {enqueueNotificationOperation}=require('../features/notifications/notificationOperationQueue');
beforeEach(async()=>{jest.restoreAllMocks();jest.clearAllMocks();await storage.clear();});
test('出発取消中の中断相当では処理開始前の復旧記録が残る',async()=>{
 let release;let entered;const started=new Promise(r=>entered=r);const gate=new Promise(r=>release=r);
 api.getAllScheduledNotificationsAsync.mockImplementation(async()=>{entered();await gate;throw Error('interrupted');});
 const op=cancelPendingDepartureNotifications('p');await started;
 expect(await pendingNotificationReconciliations('departure')).toEqual(['p']);
 release();await expect(op).rejects.toThrow('interrupted');expect(await pendingNotificationReconciliations('departure')).toEqual(['p']);
});
test('取消失敗後の再照合は古い出発通知を除き、繰り返しても追加しない',async()=>{
 let pending=[{identifier:'old',content:{data:{departurePlanId:'p'}}},{identifier:'other',content:{data:{departurePlanId:'q'}}}];
 api.getAllScheduledNotificationsAsync.mockRejectedValueOnce(Error('offline')).mockImplementation(async()=>pending);
 api.cancelScheduledNotificationAsync.mockImplementation(async id=>{pending=pending.filter(item=>item.identifier!==id);});
 await expect(cancelPendingDepartureNotifications('p')).rejects.toThrow();
 await cancelPendingDepartureNotifications('p');await cancelPendingDepartureNotifications('p');
 expect(pending.map(x=>x.identifier)).toEqual(['other']);expect(await pendingNotificationReconciliations('departure')).toEqual([]);
});
test('同一キーの通知操作は失敗後も順番を維持する',async()=>{
 let release;let entered;const started=new Promise(r=>entered=r);const gate=new Promise(r=>release=r);const order=[];
 const a=enqueueNotificationOperation('focus',async()=>{order.push('old');entered();await gate;throw Error('failed');});
 await started;const b=enqueueNotificationOperation('focus',async()=>{order.push('new');});expect(order).toEqual(['old']);
 release();await expect(a).rejects.toThrow();await b;expect(order).toEqual(['old','new']);
});
test('終了済み集中の取消では他セッションの通知を維持する',async()=>{
 let pending=[{identifier:'old',content:{data:{kind:'focus_timer_complete',focusTimerId:'old'}}},{identifier:'new',content:{data:{kind:'focus_timer_complete',focusTimerId:'new'}}}];
 api.getAllScheduledNotificationsAsync.mockImplementation(async()=>pending);
 api.cancelScheduledNotificationAsync.mockImplementation(async id=>{pending=pending.filter(item=>item.identifier!==id);});
 await reconcileNotificationOperation('focus','old',()=>cancelPendingFocusCompletionNotifications('old'));
 expect(pending.map(x=>x.identifier)).toEqual(['new']);expect(await pendingNotificationReconciliations('focus')).toEqual([]);
});
test('複数の未解決記録は別々に保持される',async()=>{
 await expect(reconcileNotificationOperation('focus','a',async()=>{throw Error('x');})).rejects.toThrow();
 await expect(reconcileNotificationOperation('focus','b',async()=>{throw Error('x');})).rejects.toThrow();
 await reconcileNotificationOperation('focus','a',async()=>{});
 expect(await pendingNotificationReconciliations('focus')).toEqual(['b']);
});
test('未解決情報の読み取り失敗は空一覧と区別する',async()=>{
 jest.spyOn(storage,'getAllKeys').mockRejectedValueOnce(Error('read failed'));
 await expect(pendingNotificationReconciliations('focus')).rejects.toThrow('read failed');
});
