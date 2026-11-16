jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-notifications', () => ({getAllScheduledNotificationsAsync:jest.fn(),cancelScheduledNotificationAsync:jest.fn()}));
const storage=require('@react-native-async-storage/async-storage');
const N=require('expo-notifications');
const onboarding=require('../features/onboarding/onboardingStorage');
const notifications=require('../features/tasks/taskNotifications');
beforeEach(async()=>{jest.restoreAllMocks();await storage.clear();jest.clearAllMocks();});
test('複数完了と部分リセットを呼び出し順で保存する',async()=>{
 await Promise.all([onboarding.markOnboardingCompleted('todo'),onboarding.markOnboardingCompleted('voice'),onboarding.resetOnboardingFeature('todo'),onboarding.markOnboardingCompleted('focus')]);
 const state=await onboarding.loadOnboardingState(); expect(state.completed.todo).toBeUndefined();expect(state.completed.voice).toBeTruthy();expect(state.completed.focus).toBeTruthy();
});
test('保存失敗後もガイド更新キューは続行する',async()=>{
 jest.spyOn(storage,'setItem').mockRejectedValueOnce(Error('write failed'));
 await expect(onboarding.markOnboardingCompleted('todo')).rejects.toThrow('write failed');
 await onboarding.markOnboardingCompleted('voice'); expect((await onboarding.loadOnboardingState()).completed.voice).toBeTruthy();
});
test('取消失敗は永続記録され再照合成功時のみ除去される',async()=>{
 N.getAllScheduledNotificationsAsync.mockRejectedValueOnce(Error('unavailable')).mockResolvedValueOnce([{identifier:'n',content:{data:{taskId:'a'}}}]);N.cancelScheduledNotificationAsync.mockResolvedValue();
 await expect(notifications.cancelPendingTaskNotifications('a')).rejects.toThrow('unavailable');
 expect(await notifications.getUnreconciledTaskNotificationIds()).toEqual(['a']);
 await notifications.cancelPendingTaskNotifications('a');expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith('n');expect(await notifications.getUnreconciledTaskNotificationIds()).toEqual([]);
});
test('取消APIの失敗は成功扱いにせず未解決状態を保持',async()=>{
 N.getAllScheduledNotificationsAsync.mockResolvedValue([{identifier:'n',content:{data:{taskId:'a'}}}]);N.cancelScheduledNotificationAsync.mockRejectedValueOnce(Error('cancel failed'));
 await expect(notifications.cancelPendingTaskNotifications('a')).rejects.toThrow('cancel failed');expect(await notifications.getUnreconciledTaskNotificationIds()).toEqual(['a']);
});
test('再予約途中の失敗は未解決として残り、次回成功時に消える',async()=>{
 await expect(notifications.reconcileTaskNotificationsUnsafe('a',async()=>{throw Error('schedule failed');})).rejects.toThrow('schedule failed');
 expect(await notifications.getUnreconciledTaskNotificationIds()).toEqual(['a']);
 await notifications.reconcileTaskNotificationsUnsafe('a',async()=>{});
 expect(await notifications.getUnreconciledTaskNotificationIds()).toEqual([]);
});
test('案内全体リセットと完了を同時に行うと呼び出し順で反映する',async()=>{
 await onboarding.markOnboardingCompleted('todo');
 await Promise.all([onboarding.resetAllOnboarding(),onboarding.markOnboardingCompleted('voice')]);
 const state=await onboarding.loadOnboardingState();expect(state.completed.todo).toBeUndefined();expect(state.completed.voice).toBeTruthy();
});
