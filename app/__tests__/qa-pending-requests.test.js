jest.mock('expo-notifications', () => ({getAllScheduledNotificationsAsync:jest.fn()}));
const N=require('expo-notifications');
const {getPendingNotificationRequests}=require('../features/notifications/pendingRequests');
test('通知一覧0件とAPIエラーを区別する',async()=>{
 N.getAllScheduledNotificationsAsync.mockResolvedValueOnce([]).mockRejectedValueOnce(Error('unavailable'));
 await expect(getPendingNotificationRequests()).resolves.toEqual([]);
 await expect(getPendingNotificationRequests()).rejects.toThrow('unavailable');
});
