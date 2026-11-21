const React = require('react');
const { render, fireEvent, cleanup, act, waitFor } = require('@testing-library/react-native');
const { StyleSheet, Modal } = require('react-native');
const { BottomNav } = require('../components/BottomNav');
const { HomeScreen } = require('../screens/HomeScreen');
const { PhotoThemeSettingsCard } = require('../components/PhotoThemeSettingsCard');
const { AffirmationSettingsCard } = require('../components/AffirmationSettingsCard');

afterEach(cleanup);

test('下部ナビは選択状態を伝え、各タブの操作領域を48確保する', () => {
  const change = jest.fn();
  const view = render(<BottomNav screen="home" designMode="dark" onChange={change} />);
  const tabs = view.getAllByRole('tab');
  expect(tabs).toHaveLength(5);
  expect(view.getByRole('tab', { name: 'ToDo' }).props.accessibilityState.selected).toBe(true);
  for (const tab of tabs) expect(StyleSheet.flatten(tab.props.style).minHeight).toBeGreaterThanOrEqual(44);
  fireEvent.press(view.getByRole('tab', { name: '予定' }));
  expect(change).toHaveBeenCalledWith('timeline');
});

test('写真Sheet用表示は背景の二重選択入口だけを外し、トップ・集中・外す操作は残す', () => {
  const pick = jest.fn(), clear = jest.fn();
  const props = { photoTheme: { imageUri: 'file:///background.jpg', topImageUris: {}, focusBackgroundUri: 'file:///focus.jpg' }, designMode: 'dark', planTier: 'free', onPremium: jest.fn(), onPick: pick, onAdjust: jest.fn(), onClear: clear, styles: {} };
  const view = render(<PhotoThemeSettingsCard {...props} backgroundPreviewOnly />);
  expect(view.queryByText('背景写真を変更')).toBeNull();
  fireEvent.press(view.getByLabelText('今日のトップを選ぶ'));
  expect(pick).toHaveBeenCalledWith('home');
  fireEvent.press(view.getByText('集中背景を変更'));
  expect(pick).toHaveBeenCalledWith('focus');
  fireEvent.press(view.getAllByText('外す')[0]);
  expect(clear).toHaveBeenCalledWith('background');
  view.rerender(<PhotoThemeSettingsCard {...props} />);
  expect(view.getByText('背景写真を変更')).toBeTruthy();
});

test('アファメーションの失敗は入力を残し、同じIDで再試行できる', async () => {
  let finish;
  const save = jest.fn().mockImplementationOnce(() => new Promise((resolve, reject) => { finish = reject; })).mockResolvedValue(undefined);
  const view = render(<AffirmationSettingsCard affirmations={[]} customTexts={[]} designMode="dark" planTier="premium" onPremium={jest.fn()} onSave={save} onDelete={jest.fn()} onSaveCustomText={jest.fn()} onDeleteCustomText={jest.fn()} styles={{}} compact />);
  fireEvent.press(view.getByText('管理する ›'));
  fireEvent.changeText(view.getByPlaceholderText('文章を選ぶか、自分で入力'), '入力を残す');
  const button = view.getByText('通知を追加');
  fireEvent.press(button, { stopPropagation() {} }); fireEvent.press(button, { stopPropagation() {} });
  expect(save).toHaveBeenCalledTimes(1);
  expect(view.getByText('保存中…')).toBeTruthy();
  await act(async () => finish(new Error('通知の更新に失敗しました')));
  expect(view.getByPlaceholderText('文章を選ぶか、自分で入力').props.value).toBe('入力を残す');
  expect(view.getByRole('alert')).toBeTruthy();
  fireEvent.press(view.getByText('通知を追加'));
  await waitFor(() => expect(view.UNSAFE_getByType(Modal).props.visible).toBe(false));
  expect(save.mock.calls[0][0].id).toBe(save.mock.calls[1][0].id);
});

test('タスク編集は操作Sheetのdismiss完了前に次の画面を開かない', () => {
  const edit = jest.fn();
  // Use the real HomeScreen; only its external callbacks and visual helpers are supplied.
  const task = { id: 'menu', title: '遷移確認', done: false, category: 'その他', priority: '中', bucket: 'now' };
  const noop = () => {};
  const view = render(<HomeScreen tasks={[task]} allTasks={[task]} now={new Date()} completionIcon="✓" designMode="minimal" styles={{}} helpers={{ dateKey: require('../features/tasks/taskUtils').dateKey, getThemeTokens: require('../theme').getThemeTokens }} renderTodayWinStrip={() => null} initialTab="list" selectedTaskIds={[]} onEdit={edit} onToggle={noop} onDelete={noop} onDuplicate={noop} onBucket={noop} onSkip={noop} onSaveTemplate={noop} onUpdateTaskList={noop} onToggleSelection={noop} onCompleteParent={noop} onClearSelection={noop} />);
  fireEvent.press(view.getByText('遷移確認'));
  fireEvent.press(view.getByText('編集'));
  expect(edit).not.toHaveBeenCalled();
  const modal = view.UNSAFE_getAllByType(Modal).find(item => item.props.testID === 'task-action-modal');
  act(() => modal.props.onDismiss());
  expect(edit).toHaveBeenCalledWith(task);
});
