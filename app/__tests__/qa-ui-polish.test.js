const React = require('react');
const { render, fireEvent, cleanup, act, waitFor } = require('@testing-library/react-native');
const { StyleSheet, Modal } = require('react-native');
const { BottomNav } = require('../components/BottomNav');
const { HomeScreen } = require('../screens/HomeScreen');
const { PhotoThemeSettingsCard } = require('../components/PhotoThemeSettingsCard');
const { AffirmationSettingsCard } = require('../components/AffirmationSettingsCard');
const Svg = require('react-native-svg').default;
const { Header } = require('../components/Header');
const { ICON_METRICS } = require('../components/iconMetrics');
const { getChicThemePalette } = require('../theme');

afterEach(()=>{cleanup();jest.restoreAllMocks();});

test.each([
 ['Mono Light','minimal',false,390,1],['Mono Dark','dark',false,390,1],
 ['Design','chic',false,390,1],['Photo','chic',true,390,1],['小画面・拡大文字','dark',false,320,1.3],
])('共通ヘッダーは主張を抑えても44ptの操作と各導線を維持する：%s',(_name,designMode,compact,width,fontScale)=>{
 jest.spyOn(require('react-native'),'useWindowDimensions').mockReturnValue({width,height:700,scale:2,fontScale});
 const voice=jest.fn(),premium=jest.fn(),notices=jest.fn();
 const props={designMode,compact,now:new Date('2026-11-26T10:00:00+09:00'),chicPalette:designMode==='chic'?getChicThemePalette('cool'):undefined,onVoice:voice,onPremium:premium,onNotifications:notices,hasUnreadNotifications:true};
 const view=render(<Header {...props}/>);
 for(const button of view.getAllByRole('button')){
  const s=StyleSheet.flatten(button.props.style);
  expect(Math.max(s.width??0,s.minWidth??0)).toBeGreaterThanOrEqual(44);
  expect(Math.max(s.height??0,s.minHeight??0)).toBeGreaterThanOrEqual(44);
  expect(button.props.hitSlop).toBeUndefined();
 }
 const brand=StyleSheet.flatten(view.getByText('Rhythm').props.style);
 expect(brand.fontSize).toBeLessThanOrEqual(26);expect(Number(brand.fontWeight)).toBeLessThanOrEqual(800);
 expect(StyleSheet.flatten(view.getByLabelText('共通音声入力').props.style).shadowOpacity??0).toBe(0);
 expect(view.UNSAFE_getAllByType(Svg)).toHaveLength(3);
 for(const icon of view.UNSAFE_getAllByType(Svg))expect(icon.props.accessible).toBe(false);
 const {Path,Rect}=require('react-native-svg');
 for(const shape of [...view.UNSAFE_getAllByType(Path),...view.UNSAFE_getAllByType(Rect)])expect(shape.props.strokeWidth).toBe(ICON_METRICS.strokeWidth);
 if(width<360||fontScale>1.2)expect(view.queryByText('Premium')).toBeNull();else expect(view.getByText('Premium')).toBeTruthy();
 fireEvent.press(view.getByLabelText('共通音声入力'));fireEvent.press(view.getByLabelText('Rhythm Premium'));fireEvent.press(view.getByLabelText('お知らせ'));
 expect(voice).toHaveBeenCalledTimes(1);expect(premium).toHaveBeenCalledTimes(1);expect(notices).toHaveBeenCalledTimes(1);
 view.rerender(<Header {...props} onPremium={undefined}/>);expect(view.queryByLabelText('Rhythm Premium')).toBeNull();
});

test.each(['minimal','dark','chic'])('下部ナビは弱い影と選択表示を両立し、配置基準と5タブを維持する：%s',designMode=>{
 const {View}=require('react-native'),{getBottomNavTopOffset}=require('../components/BottomNav'),change=jest.fn();
 const view=render(<BottomNav screen="analysis" designMode={designMode} chicPalette={designMode==='chic'?getChicThemePalette('cool'):undefined} onChange={change}/>);
 const container=view.UNSAFE_getAllByType(View).find(n=>StyleSheet.flatten(n.props.style)?.position==='absolute');
 const s=StyleSheet.flatten(container.props.style);
 expect(s.shadowOpacity).toBeLessThanOrEqual(0.12);expect(s.borderWidth).toBeLessThanOrEqual(1);
 expect(s.height+s.bottom).toBe(getBottomNavTopOffset(designMode));
 for(const label of ['ToDo','予定','分析','叶えたいこと','設定']){
  const tab=view.getByRole('tab',{name:label});expect(tab.props.accessibilityState.selected).toBe(label==='分析');
  expect(StyleSheet.flatten(view.getByText(label).props.style).fontWeight).toBe(label==='分析'?'700':'500');
  const iconWrap=tab.findAll(n=>StyleSheet.flatten(n.props.style)?.width===32)[0];
  expect(iconWrap).toBeTruthy();
  if(label==='分析')expect(StyleSheet.flatten(iconWrap.props.style).backgroundColor).toBe(designMode==='chic'?getChicThemePalette('cool').accentSoft:require('../theme').getThemeTokens(designMode).colors.softAccent);
  else expect(StyleSheet.flatten(iconWrap.props.style).backgroundColor).toBeUndefined();
  expect(StyleSheet.flatten(tab.props.style).minHeight).toBeGreaterThanOrEqual(44);fireEvent.press(tab);
 }
 expect(change.mock.calls.map(([id])=>id)).toEqual(['home','timeline','analysis','wish','settings']);
 const {Path,Line,Rect,Circle}=require('react-native-svg');
 for(const type of [Path,Line,Rect,Circle])for(const shape of view.UNSAFE_queryAllByType(type))expect(shape.props.strokeWidth).toBe(ICON_METRICS.strokeWidth);
});

test('下部ナビは選択状態を伝え、各タブの操作領域を48確保する', () => {
  const change = jest.fn();
  const view = render(<BottomNav screen="home" designMode="dark" onChange={change} />);
  const tabs = view.getAllByRole('tab');
  expect(tabs).toHaveLength(5);
  expect(view.UNSAFE_getAllByType(Svg)).toHaveLength(5);
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
  for (const label of view.getAllByText('選ぶ')) expect(StyleSheet.flatten(label.props.style).fontSize).toBeGreaterThanOrEqual(13);
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
