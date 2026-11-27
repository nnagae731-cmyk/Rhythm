const React = require('react');
const { render, fireEvent, cleanup } = require('@testing-library/react-native');
const { PanResponder, StyleSheet } = require('react-native');
const { TopImageCropModal } = require('../components/TopImageCropModal');
const { styles } = require('../styles/appStyles');

afterEach(() => { cleanup(); jest.restoreAllMocks(); });

test('白枠は切り取り範囲と同じ座標で移動し、固定の二重枠を描画しない', () => {
  jest.spyOn(PanResponder, 'create').mockImplementation(config => ({ panHandlers: {
    onResponderGrant: config.onPanResponderGrant,
    onResponderMove: config.onPanResponderMove,
    onResponderRelease: config.onPanResponderRelease,
  } }));
  const onUse = jest.fn();
  const view = render(<TopImageCropModal visible uri="file:///portrait.jpg" sourceWidth={1000} sourceHeight={1500} styles={styles} onCancel={jest.fn()} onReselect={jest.fn()} onUse={onUse} />);
  fireEvent(view.getByTestId('top-image-crop-canvas'), 'layout', { nativeEvent: { layout: { width: 400, height: 600 } } });
  const selection = () => view.getByTestId('top-image-crop-selection');
  expect(StyleSheet.flatten(selection().props.style)).toMatchObject({ left: 0, top: 220, width: 400, height: 160 });
  expect(selection().children).toHaveLength(1); // resize handle only; no duplicate frame
  fireEvent(selection(), 'responderGrant', { nativeEvent: { pageX: 100, pageY: 300 } });
  fireEvent(selection(), 'responderMove', { nativeEvent: { pageX: 100, pageY: 350 } });
  expect(StyleSheet.flatten(selection().props.style).top).toBe(270);
  fireEvent(selection(), 'responderRelease');
  fireEvent.press(view.getByText('この範囲を使用'));
  expect(onUse).toHaveBeenCalledWith({ x: 0, y: 0.45, width: 1, height: 160 / 600 });
  fireEvent.press(view.getByText('リセット'));
  expect(StyleSheet.flatten(selection().props.style).top).toBe(220);
});
