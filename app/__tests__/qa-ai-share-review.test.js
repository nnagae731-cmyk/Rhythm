const React = require('react');
const { render, cleanup, fireEvent, waitFor, act } = require('@testing-library/react-native');
const { Share, Modal } = require('react-native');
const { AIShareSheet } = require('../components/AIShareSheet');
const props = { visible: true, onClose: jest.fn(), tasks: [{ id: 'share', title: '共有前に確認するTODO', done: false, category: 'その他', priority: '中', bucket: 'now' }], departurePlans: [], behaviorEvents: [], focusSessions: [], wishState: { monthlyGoal: '', wishes: [], actions: [], review: {} }, designMode: 'dark' };
beforeEach(() => { jest.clearAllMocks(); jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction }); });
afterEach(() => { cleanup(); jest.restoreAllMocks(); });
test('全文確認前に送信せず、編集した文章だけを共有する', async () => {
  const view = render(<AIShareSheet {...props} />);
  fireEvent.press(view.getByText('共有内容を確認'));
  expect(view.getByLabelText('共有する文章').props.value).toContain('共有前に確認するTODO');
  expect(Share.share).not.toHaveBeenCalled();
  fireEvent.changeText(view.getByLabelText('共有する文章'), '必要な情報だけを共有');
  fireEvent.press(view.getByText('この内容で共有'));
  expect(props.onClose).toHaveBeenCalledTimes(1);
  expect(Share.share).not.toHaveBeenCalled();
  view.rerender(<AIShareSheet {...props} visible={false} />);
  act(() => view.UNSAFE_getByType(Modal).props.onDismiss());
  await waitFor(() => expect(Share.share).toHaveBeenCalledWith({ title: 'RhythmPace 今日のTODO', message: '必要な情報だけを共有' }));
});
test('確認画面をキャンセルしても共有しない', () => {
  const view = render(<AIShareSheet {...props} />);
  fireEvent.press(view.getByText('共有内容を確認'));
  fireEvent.press(view.getByText('閉じる'));
  view.rerender(<AIShareSheet {...props} visible={false} />);
  act(() => view.UNSAFE_getByType(Modal).props.onDismiss());
  expect(Share.share).not.toHaveBeenCalled();
});
test('空の文章を共有せず、内容選択へ戻れる', () => {
  const view = render(<AIShareSheet {...props} />);
  fireEvent.press(view.getByText('共有内容を確認'));
  fireEvent.changeText(view.getByLabelText('共有する文章'), '   ');
  fireEvent.press(view.getByText('この内容で共有'));
  expect(props.onClose).not.toHaveBeenCalled();
  expect(Share.share).not.toHaveBeenCalled();
  fireEvent.press(view.getByText('内容を選び直す'));
  expect(view.getByText('共有内容を確認')).toBeTruthy();
});
