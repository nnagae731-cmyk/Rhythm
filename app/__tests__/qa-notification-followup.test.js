jest.mock('expo-notifications', () => ({getAllScheduledNotificationsAsync:jest.fn(),cancelScheduledNotificationAsync:jest.fn()}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const N=require('expo-notifications');
const storage=require('@react-native-async-storage/async-storage');
const {pendingNotificationReconciliations,reconcileNotificationOperation}=require('../features/notifications/pendingReconciliation');
const {cancelPendingDepartureNotifications}=require('../features/departure/departureNotifications');
const {cancelPendingFocusCompletionNotifications,cancelFocusCompletionNotification}=require('../features/focus/focusNotifications');
beforeEach(async()=>{jest.restoreAllMocks();jest.clearAllMocks();await storage.clear();});
test('出発通知一覧の取得に失敗した場合は取消失敗を通知する',async()=>{
 N.getAllScheduledNotificationsAsync.mockRejectedValueOnce(Error('unavailable'));
 await expect(cancelPendingDepartureNotifications('plan')).rejects.toThrow();
});
test('集中通知一覧の取得に失敗した場合は取消失敗を通知する',async()=>{
 N.getAllScheduledNotificationsAsync.mockRejectedValueOnce(Error('unavailable'));
 await expect(cancelPendingFocusCompletionNotifications('session')).rejects.toThrow();
});
test('出発通知の個別取消失敗も呼び出し元に伝わる',async()=>{
 N.getAllScheduledNotificationsAsync.mockResolvedValueOnce([{identifier:'departure-1',content:{data:{departurePlanId:'plan'}}}]);
 N.cancelScheduledNotificationAsync.mockRejectedValueOnce(Error('cancel failed'));
 await expect(cancelPendingDepartureNotifications('plan')).rejects.toThrow('cancel failed');
});
test('集中通知の保存済みIDの取消失敗も呼び出し元に伝わる',async()=>{
 N.cancelScheduledNotificationAsync.mockRejectedValueOnce(Error('cancel failed'));
 await expect(cancelFocusCompletionNotification('focus-1')).rejects.toThrow('cancel failed');
});
test('出発取消失敗後は記録が残り、次回成功後に削除される',async()=>{
 N.getAllScheduledNotificationsAsync.mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce([]);
 await expect(cancelPendingDepartureNotifications('p')).rejects.toThrow('offline');
 expect(await pendingNotificationReconciliations('departure')).toEqual(['p']);
 await cancelPendingDepartureNotifications('p');
 expect(await pendingNotificationReconciliations('departure')).toEqual([]);
});
test('集中通知の未解決記録は失敗時に残り、成功後のみ解除される',async()=>{
 await expect(reconcileNotificationOperation('focus','f',async()=>{throw Error('cancel failed');})).rejects.toThrow();
 expect(await pendingNotificationReconciliations('focus')).toEqual(['f']);
 await reconcileNotificationOperation('focus','f',async()=>{});
 expect(await pendingNotificationReconciliations('focus')).toEqual([]);
});
test('未解決記録が保存できない場合は通知操作を実行しない',async()=>{
 jest.spyOn(storage,'setItem').mockRejectedValueOnce(Error('storage failed'));
 const operation=jest.fn();
 await expect(reconcileNotificationOperation('focus','f',operation)).rejects.toThrow('storage failed');
 expect(operation).not.toHaveBeenCalled();
});
