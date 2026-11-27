jest.mock('expo-file-system', () => {
  const files = new Set();
  class File { constructor(uri) { this.uri = uri; } get exists() { return files.has(this.uri); } }
  return { File, Paths: { document: 'file:///current/Documents' }, __files: files };
});
const React = require('react');
const { render, fireEvent, act, cleanup } = require('@testing-library/react-native');
const { Image, Modal } = require('react-native');
const files = require('expo-file-system').__files;
const { visiblePhotoSettings } = require('../features/photo/photoSamples');
const { isDisplayPhotoAvailable } = require('../features/photo/persistentPhoto');
const { PhotoEntrySheet } = require('../components/PhotoEntry');
const { MonthlyReflectionCardView } = require('../screens/HistoryScreen');
const { getThemeTokens } = require('../theme');
const { styles } = require('../styles/appStyles');
const { WidgetSettingsCard } = require('../components/WidgetSettingsCard');
const foreign = 'file:///other/Documents/rhythm-photos/foreign.jpg';
const own = 'file:///current/Documents/rhythm-photos/own.jpg';
beforeEach(() => { files.clear(); files.add(own); });
afterEach(cleanup);
test('管理対象で無いライブラリ・HTTP・同梱URIは従来扱いで、欠損managedだけ未設定になる', () => {
  expect(isDisplayPhotoAvailable(foreign)).toBe(false); expect(isDisplayPhotoAvailable(own)).toBe(true);
  for (const uri of ['ph://library', 'https://example.test/sample.jpg', 'asset:/bundle.jpg']) expect(isDisplayPhotoAvailable(uri)).toBe(true);
});
test('全枠表示用コピーだけを隠し、元URIとcropは保存参照として不変', () => {
  const raw = { imageUri: foreign, focusBackgroundUri: foreign, topImageUris: { home: foreign, timeline: foreign, analysis: foreign, wish: foreign }, topImageOriginalUris: { home: foreign }, topImageCropRects: { home: { x: 0, y: 0.2, width: 1, height: 0.4 } } };
  const serialized = JSON.stringify(raw); const display = visiblePhotoSettings(raw, () => true);
  expect(display.imageUri).toBeUndefined(); expect(display.focusBackgroundUri).toBeUndefined(); expect(display.topImageUris).toEqual({}); expect(display.topImageOriginalUris).toEqual({});
  expect(JSON.stringify(raw)).toBe(serialized); expect(display.topImageCropRects).toEqual(raw.topImageCropRects);
});
test('写真シートも欠損写真を未設定表示にし、再解放でなく新しい選択へ進む', () => {
  const onPick = jest.fn(), onRenew = jest.fn();
  const view = render(<PhotoEntrySheet visible initialTarget="home" photoTheme={{ topImageUris: { home: foreign } }} designMode="minimal" onClose={jest.fn()} onPick={onPick} onRenew={onRenew} onAdjust={jest.fn()} canChooseWithoutReward={() => true} canShowPhoto={() => true} />);
  expect(view.queryByLabelText('選択中の適用先の写真')).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'この適用先の写真を選ぶ' }));
  act(() => view.UNSAFE_getByType(Modal).props.onDismiss());
  expect(onPick).toHaveBeenCalledWith('home'); expect(onRenew).not.toHaveBeenCalled();
});
test('同じ枠の利用可能な原本は表示のfallbackに使う', () => {
  const view = render(<PhotoEntrySheet visible initialTarget="home" photoTheme={{ topImageUris: { home: foreign }, topImageOriginalUris: { home: own } }} designMode="minimal" onClose={jest.fn()} onPick={jest.fn()} onAdjust={jest.fn()} canChooseWithoutReward={() => true} />);
  expect(view.getByLabelText('選択中の適用先の写真').props.source.uri).toBe(own);
});
test('振り返りカードでも欠損写真は描画せず、元の保存モデルを変更しない', () => {
  const model = { monthKey: '2026-11', monthLabel: '2026年11月', photos: [foreign, own], template: 'gallery', palette: 'lavender', phrase: '今月', bestMemory: '' };
  const view = render(<MonthlyReflectionCardView model={model} cardRef={{ current: null }} onReady={jest.fn()} />);
  expect(view.UNSAFE_getAllByType(Image).every(node => node.props.source.uri !== foreign)).toBe(true);
  expect(model.photos).toEqual([foreign, own]);
});
test('Widget写真設定の描画でも欠損managedをImageへ渡さず、設定は書き換えない', () => {
  const onChange = jest.fn();
  const settings = { widgetType: 'current', style: 'photo', photoSource: 'widget', widgetCustomizations: { current: { photoUri: foreign } }, affirmationPhotoUris: [foreign] };
  const view = render(<WidgetSettingsCard settings={settings} onChange={onChange} colors={getThemeTokens('minimal').colors} styles={styles} planTier="premium" entitlementsResolved />);
  expect(view.UNSAFE_queryAllByType(Image).every(node => node.props.source?.uri !== foreign)).toBe(true);
  expect(onChange).not.toHaveBeenCalled(); expect(settings.widgetCustomizations.current.photoUri).toBe(foreign);
});
