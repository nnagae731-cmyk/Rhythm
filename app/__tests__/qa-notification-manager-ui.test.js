jest.mock('expo-notifications', () => ({ getAllScheduledNotificationsAsync: jest.fn(), cancelScheduledNotificationAsync: jest.fn(), cancelAllScheduledNotificationsAsync: jest.fn() }));
const React = require('react');
const { render, cleanup, fireEvent, waitFor, act } = require('@testing-library/react-native');
const { Alert } = require('react-native');
const api = require('expo-notifications');
const { NotificationManagerCard } = require('../components/NotificationManagerCard');
const request = id => ({ identifier: id, content: { title: `予約${id}`, body: '通知本文', data: {} }, trigger: null });
beforeEach(() => { jest.clearAllMocks(); api.getAllScheduledNotificationsAsync.mockReset().mockResolvedValue([]); api.cancelScheduledNotificationAsync.mockReset().mockResolvedValue(undefined); });
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

test('取得失敗を予約0件と表示せず、更新で復帰できる', async () => {
  api.getAllScheduledNotificationsAsync.mockRejectedValueOnce(Error('list failed'));
  const view = render(<NotificationManagerCard designMode="dark" />);
  await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
  expect(view.queryByText('0件の通知を予約中')).toBeNull();
  api.getAllScheduledNotificationsAsync.mockResolvedValueOnce([request('a')]);
  fireEvent.press(view.getByText('更新'));
  await waitFor(() => expect(view.getByText('1件の通知を予約中')).toBeTruthy());
  expect(view.queryByRole('alert')).toBeNull();
});
test('現在予約されているIDだけを取り消し、連打・部分失敗から再試行できる', async () => {
  api.getAllScheduledNotificationsAsync.mockResolvedValueOnce([request('a'), request('b')]).mockResolvedValueOnce([request('a'), request('b')]).mockResolvedValueOnce([request('b'), request('new-focus')]);
  let release; const gate = new Promise(resolve => { release = resolve; });
  api.cancelScheduledNotificationAsync.mockImplementation(id => id === 'b' ? gate.then(() => { throw Error('cancel failed'); }) : Promise.resolve());
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = render(<NotificationManagerCard designMode="dark" />);
  await waitFor(() => expect(view.getByText('2件の通知を予約中')).toBeTruthy());
  fireEvent.press(view.getByText('現在の予約をすべて取り消す'));
  const confirmation = alert.mock.calls.at(-1);
  expect(confirmation[1]).toContain('アファメーション');
  expect(confirmation[1]).toContain('OFFになりません');
  const cancel = confirmation[2].find(button => button.style === 'destructive').onPress;
  act(() => { cancel(); cancel(); });
  await waitFor(() => expect(api.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2));
  await act(async () => { release(); await gate; });
  await waitFor(() => expect(view.getByText(/一部の予約を取り消せませんでした/)).toBeTruthy());
  expect(api.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  expect(api.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('new-focus');
  api.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
  api.getAllScheduledNotificationsAsync.mockResolvedValueOnce([request('b'), request('new-focus')]).mockResolvedValueOnce([]);
  fireEvent.press(view.getByText('現在の予約をすべて取り消す'));
  await act(async () => { alert.mock.calls.at(-1)[2].find(button => button.style === 'destructive').onPress(); });
  await waitFor(() => expect(view.getByText('0件の通知を予約中')).toBeTruthy());
});
test('取消直前の再取得が失敗したら不明な予約を操作しない', async () => {
  api.getAllScheduledNotificationsAsync.mockResolvedValueOnce([request('a')]).mockRejectedValueOnce(Error('list failed'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = render(<NotificationManagerCard />);
  await waitFor(() => expect(view.getByText('1件の通知を予約中')).toBeTruthy());
  fireEvent.press(view.getByText('現在の予約をすべて取り消す'));
  await act(async () => { alert.mock.calls.at(-1)[2].find(button => button.style === 'destructive').onPress(); });
  expect(api.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  expect(view.getByRole('alert')).toBeTruthy();
});
test('読み取り専用プレビューはユーザーの予約通知にアクセスしない', () => {
  const view = render(<NotificationManagerCard readOnly />);
  expect(view.getByText('高度な通知')).toBeTruthy();
  expect(api.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();
});
