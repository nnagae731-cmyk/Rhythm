const React = require('react');
const { render, fireEvent, act, cleanup } = require('@testing-library/react-native');
const { Modal, Platform, StyleSheet, Image } = require('react-native');
const { PhotoEntrySheet, PhotoTopEntry } = require('../components/PhotoEntry');
const { getDesignCheckThemeTokens } = require('../theme');
const { styles } = require('../styles/appStyles');
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

test('設定中の写真の操作はサンプル一覧より前にまとまり、再調整はdismiss後に選択枠へ進む', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const onAdjust = jest.fn(), onClose = jest.fn();
  const props = { visible: true, initialTarget: 'home', photoTheme: { topImageUris: { home: 'file:///existing.jpg' } }, designMode: 'minimal', onPick: jest.fn(), onClose, onAdjust, onRemove: jest.fn(), onPickSample: jest.fn(), canChooseWithoutReward: () => true };
  const view = render(<PhotoEntrySheet {...props} />);
  const text = JSON.stringify(view.toJSON());
  expect(text.indexOf('写真を変更する')).toBeLessThan(text.indexOf('表示範囲を調整する'));
  expect(text.indexOf('表示範囲を調整する')).toBeLessThan(text.indexOf('トップ画像を外す'));
  expect(text.indexOf('トップ画像を外す')).toBeLessThan(text.indexOf('サンプル写真'));
  fireEvent.press(view.getByRole('button', { name: '表示範囲を調整する' }));
  expect(onClose).toHaveBeenCalledTimes(1); expect(onAdjust).not.toHaveBeenCalled();
  act(() => view.UNSAFE_getByType(Modal).props.onDismiss());
  expect(onAdjust).toHaveBeenCalledWith('home');
  view.rerender(<PhotoEntrySheet {...props} photoTheme={{}} />);
  expect(view.queryByTestId('photo-current-actions')).toBeNull();
  expect(view.queryByText('表示範囲を調整する')).toBeNull();
  expect(view.queryByLabelText('トップ画像を外す')).toBeNull();
  expect(view.getByLabelText('この適用先の写真を選ぶ')).toBeTruthy();
});

test.each(['minimal', 'dark', 'chic'])('適用先チップは事前選択され、全体背景に切替可。native dismiss完了前はpick/広告を呼ばない: %s', designMode => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const onPick = jest.fn(), onClose = jest.fn(), onAdjust = jest.fn();
  const props = { visible: true, initialTarget: 'timeline', photoTheme: { placement: 'background', topImageUris: { timeline: 'file:///existing.jpg' } }, designMode, chicPalette: getDesignCheckThemeTokens('cool'), onPick, onClose, onAdjust, canChooseWithoutReward: () => false };
  const view = render(<PhotoEntrySheet {...props} />);
  expect(view.getByRole('radio', { name: '予定のトップ画' }).props.accessibilityState.checked).toBe(true);
  expect(view.getByText('広告・購入の案内へ')).toBeTruthy();
  fireEvent.press(view.getByRole('radio', { name: '全体の背景' }));
  fireEvent.press(view.getByLabelText('この適用先の写真を選ぶ')); fireEvent.press(view.getByLabelText('この適用先の写真を選ぶ'));
  expect(onClose).toHaveBeenCalledTimes(1); expect(onPick).not.toHaveBeenCalled();
  act(() => view.UNSAFE_getByType(Modal).props.onDismiss()); act(() => view.UNSAFE_getByType(Modal).props.onDismiss());
  expect(onPick).toHaveBeenCalledTimes(1); expect(onPick).toHaveBeenCalledWith('background'); expect(onAdjust).not.toHaveBeenCalled();
});

test.each(['minimal', 'dark', 'chic'])('写真バナーは既存の高さ/表示styleを使い、未設定でも操作可能。タップ/長押しが同じ入口へ進む: %s', designMode => {
  const open = jest.fn(), props = { label: 'ホームのトップ画', onPress: open, designMode, chicPalette: getDesignCheckThemeTokens('cool'), style: styles.photoThemeTopImage, imageStyle: styles.photoThemeTopImageContent };
  const view = render(<PhotoTopEntry {...props} />);
  const entry = view.getByRole('button', { name: 'ホームのトップ画を設定' });
  expect(view.queryByText('＋ トップ画に好きな写真を設定')).toBeNull();
  expect(StyleSheet.flatten(entry.props.style)).toMatchObject({ width: 44, minHeight: 44 });
  expect(StyleSheet.flatten(entry.props.style).borderWidth).toBeUndefined();
  fireEvent.press(entry); expect(open).toHaveBeenCalledTimes(1);
  view.rerender(<PhotoTopEntry {...props} uri="file:///existing.jpg" />);
  const banner = view.getByRole('button', { name: 'ホームのトップ画を変更' });
  expect(StyleSheet.flatten(banner.props.style)).toEqual(styles.photoThemeTopImage);
  expect(view.UNSAFE_getByType(Image).props.resizeMode).toBe('cover'); expect(view.UNSAFE_getByType(Image).props.style).toBe(styles.photoThemeTopImageContent);
  expect(StyleSheet.flatten(styles.photoThemeTopImage).backgroundColor).toBe('transparent');
  fireEvent.press(banner); fireEvent(banner, 'longPress'); expect(open).toHaveBeenCalledTimes(3);
});
