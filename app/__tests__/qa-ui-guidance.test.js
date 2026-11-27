const React = require('react');
const { render, fireEvent, cleanup, act, within } = require('@testing-library/react-native');
const { Text, View, ScrollView, StyleSheet, Modal } = require('react-native');
const { AnalysisScreen } = require('../AnalysisScreen');
const { HomeScreen } = require('../screens/HomeScreen');
const { TimeTabButton } = require('../components/TimeTabButton');
const { TaskModal } = require('../components/TaskModal');
const { PremiumModal } = require('../components/PremiumModal');
const { PhotoReadableBand, SurfaceFade, OverflowHintScroll } = require('../components/SurfaceFade');
const { AchievementVessel } = require('../components/AchievementVessel');
const { WishScreen } = require('../WishScreen');
const { styles } = require('../styles/appStyles');
const theme = require('../theme');
const dates = require('../features/schedule/dateTimeUtils');
const noop = () => {};
const palette = theme.getDesignCheckThemeTokens('cool');
const now = new Date();
const day = dates.dateKey(now);
const task = { id: 'routine', routineId: 'r', title: '朝の散歩', isRoutine: true, done: false, category: '健康', priority: '中', bucket: 'now', repeatRule: 'daily', scheduledDate: day, createdAt: now.toISOString() };
const analysisProps = { events: [], tasks: [], routineArchives: [], departurePlans: [], planTier: 'premium', onRemoveRoutine: noop, onResumeRoutine: noop, onDeleteRoutineArchive: noop, onPremium: noop, onApplySuggestion: noop, recordContent: <Text>既存の日記と履歴</Text>, onStartRecords: jest.fn(), onStartRoutine: jest.fn() };
const homeProps = { tasks: [], allTasks: [], now, completionIcon: '✓', chicPalette: palette, styles, helpers: { ...dates, getThemeTokens: theme.getThemeTokens }, renderTodayWinStrip: () => <Text>TODAY</Text>, selectedTaskIds: [], onAdd: jest.fn(), onOpenFocus: noop, onToggle: noop, onToggleSubtask: noop, onUpdateTaskList: noop, onCompleteParent: noop, onRestore: noop, onEdit: noop, onToggleSelection: noop, onSelectionMode: noop, onClearSelection: noop, onCompleteSelected: noop, onDeleteSelected: noop, onDelete: noop, onSkip: noop, onRemoveRoutine: noop, onDuplicate: noop, onSaveTemplate: noop, onPostpone: noop, onBucket: noop };
afterEach(() => { cleanup(); jest.restoreAllMocks(); jest.clearAllMocks(); });

test.each(['minimal', 'dark', 'chic'])('分析は空の可視化を1枚に集約し、1記録で既存表示に戻る: %s', designMode => {
  const props = { ...analysisProps, designMode, chicPalette: palette, initialTab: 'insights' };
  const view = render(<AnalysisScreen {...props} />);
  expect(view.getByTestId('analysis-dashboard-guidance')).toBeTruthy();
  expect(view.queryByText('行動率')).toBeNull(); expect(view.queryByText('記録なし')).toBeNull();
  fireEvent.press(view.getByText('予定を確認する')); expect(props.onStartRecords).toHaveBeenCalledTimes(1);
  const event = { id: 'event', eventKey: 'event', version: 1, source: 'manual', type: 'departure_started', occurredAt: now.toISOString(), actualAt: now.toISOString(), scheduledAt: now.toISOString(), deltaMinutes: 0, departurePlanId: 'p', departurePlanDate: day };
  view.rerender(<AnalysisScreen {...props} events={[event]} />);
  expect(view.queryByTestId('analysis-dashboard-guidance')).toBeNull(); expect(view.getByText('行動率')).toBeTruthy();
  view.rerender(<AnalysisScreen {...props} initialTab="records" />);
  expect(view.getByTestId('analysis-records-guidance')).toBeTruthy(); expect(view.getByText('既存の日記と履歴')).toBeTruthy();
  view.rerender(<AnalysisScreen {...props} initialTab="records" events={[event]} />);
  expect(view.queryByTestId('analysis-records-guidance')).toBeNull(); expect(view.getByText('最新の記録')).toBeTruthy();
});

test.each(['minimal', 'dark', 'chic'])('分析ルーティンの空カレンダーを案内にし、登録済みの内容・解除・履歴導線を残す: %s', designMode => {
  const remove = jest.fn();
  const props = { ...analysisProps, onRemoveRoutine: remove, designMode, chicPalette: palette, initialTab: 'routine', tasks: [task] };
  const view = render(<AnalysisScreen {...props} />);
  expect(view.getByTestId('analysis-routine-guidance')).toBeTruthy(); expect(view.queryByText('開始前')).toBeNull();
  expect(view.getByText(task.title)).toBeTruthy(); expect(view.getByText('解除歴 〉')).toBeTruthy();
  expect(view.getByText('外す')).toBeTruthy(); expect(view.queryByText('×')).toBeNull();
  fireEvent.press(view.getByLabelText(`${task.title}をルーティンから外す`)); expect(remove).toHaveBeenCalledWith(task.id);
  fireEvent.press(view.getByText('ルーティンを確認する')); expect(props.onStartRoutine).toHaveBeenCalledTimes(1);
  view.rerender(<AnalysisScreen {...props} tasks={[{ ...task, done: true, completedAt: now.toISOString() }]} />);
  expect(view.queryByTestId('analysis-routine-guidance')).toBeNull(); expect(view.getByText('ルーティンの継続')).toBeTruthy();
  expect(view.getByText('外す')).toBeTruthy(); expect(view.queryByText('×')).toBeNull();
});

test.each(['minimal', 'dark', 'chic'])('ToDoルーティンは0件だけ案内を表示し、1件なら従来のチェック行へ戻る: %s', designMode => {
  const props = { ...homeProps, designMode, initialTab: 'routine' };
  const view = render(<HomeScreen {...props} />);
  fireEvent.press(view.getByText('ルーティンを追加する')); expect(props.onAdd).toHaveBeenCalledTimes(1);
  view.rerender(<HomeScreen {...props} tasks={[task]} allTasks={[task]} />);
  expect(view.queryByTestId('home-routine-guidance')).toBeNull(); expect(view.getByText(task.title)).toBeTruthy();
});

test.each(['minimal', 'dark', 'chic'])('4予定タブは幅配分と1行表示を使い、選択ドットを維持する: %s', designMode => {
  const change = jest.fn();
  const view = render(<View>{['departure', 'deadline', 'calendar', 'focus'].map(tab => <TimeTabButton key={tab} tab={tab} active={tab === 'deadline'} designMode={designMode} chicPalette={palette} themeAccent={palette.accent} secondaryText={palette.textSecondary} onPress={() => change(tab)} />)}</View>);
  for (const label of ['出発', 'スケジュール', '予定表', '集中']) { expect(view.getByText(label).props.numberOfLines).toBe(1); expect(view.getByText(label).props.adjustsFontSizeToFit).toBe(true); fireEvent.press(view.getByText(label)); }
  expect(change.mock.calls.map(([tab]) => tab)).toEqual(['departure', 'deadline', 'calendar', 'focus']);
  if (designMode === 'chic') expect(view.getByText('●')).toBeTruthy();
});

test.each(['minimal', 'dark', 'chic', 'photo'])('タイトルfocus枠はテーマの色だけ変え、太さ・角丸と入力を維持する: %s', designMode => {
  const props = { visible: true, templates: [], savedTemplates: [], designMode, chicPalette: palette, planTier: 'free', onPremium: noop, onClose: noop, onSave: noop, styles, helpers: { ...dates, getThemeTokens: theme.getThemeTokens, hasPremiumAccess: () => false, summarizePremiumTaskTemplate: () => '' }, components: {} };
  const view = render(<TaskModal {...props} />);
  const input = () => view.getByPlaceholderText('例：資料をバッグに入れる');
  const before = StyleSheet.flatten(input().props.style);
  fireEvent.changeText(input(), '入力した内容'); fireEvent(input(), 'focus');
  const focused = StyleSheet.flatten(input().props.style);
  expect(focused.borderColor).toBe(designMode === 'chic' ? palette.accent : theme.getThemeTokens(designMode).colors.primaryAccent);
  expect(focused.borderWidth).toBe(before.borderWidth); expect(focused.borderRadius).toBe(before.borderRadius);
  fireEvent(input(), 'blur'); expect(input().props.value).toBe('入力した内容');
});

test('比較中だけ外側の×を隠し、列見出しを1行にし、比較を閉じると元へ戻る', () => {
  const close = jest.fn();
  const view = render(<PremiumModal visible initialFeatureId="time" designMode="minimal" planTier="free" styles={styles} helpers={{ getThemeTokens: theme.getThemeTokens }} onClose={close} />);
  expect(view.getByLabelText('プレミアム案内を閉じる')).toBeTruthy();
  fireEvent.press(view.getByText('無料版との違いを見る'));
  expect(view.queryByLabelText('プレミアム案内を閉じる')).toBeNull(); expect(view.getAllByLabelText('比較を閉じる')).toHaveLength(1); expect(within(view.getByLabelText('比較を閉じる')).getByText('×')).toBeTruthy();
  const heading = view.getAllByText('プレミアム').find(node => node.props.numberOfLines === 1);
  expect(heading).toBeTruthy(); expect(StyleSheet.flatten(heading.props.style).width).toBeGreaterThanOrEqual(72);
  act(() => view.UNSAFE_getByType(Modal).props.onRequestClose());
  expect(close).not.toHaveBeenCalled(); expect(view.getByLabelText('プレミアム案内を閉じる')).toBeTruthy();
});

test('全面写真の帯だけに白グラデーション。通常/バナーではwrapperも追加せず本文の順序は維持', () => {
  const view = render(<PhotoReadableBand enabled testID="band"><Text>写真上の文字</Text></PhotoReadableBand>);
  const { Stop } = require('react-native-svg');
  for (const stop of view.UNSAFE_getAllByType(Stop)) expect(stop.props.stopColor).toBe('#FFFFFF');
  expect(view.getByTestId('band')).toBeTruthy();
  view.rerender(<PhotoReadableBand enabled={false} testID="band"><Text>写真上の文字</Text></PhotoReadableBand>);
  expect(view.queryByTestId('band')).toBeNull(); expect(view.UNSAFE_queryAllByType(SurfaceFade)).toHaveLength(0);
  view.unmount();
  const home = render(<HomeScreen {...homeProps} designMode="chic" photoBackgroundVisible />);
  expect(home.getByTestId('photo-home-date-band')).toBeTruthy(); expect(home.getByTestId('photo-home-tabs-band')).toBeTruthy();
  const tree = JSON.stringify(home.toJSON()); expect(tree.indexOf('home-journal-card')).toBeLessThan(tree.indexOf('TODAY'));
  home.rerender(<HomeScreen {...homeProps} designMode="chic" photoBackgroundVisible={false} />);
  expect(home.queryByTestId('photo-home-tabs-band')).toBeNull();
});

test('横スクロールは続きがある時だけ右端をフェードし、末尾で消す', () => {
  const view = render(<OverflowHintScroll surface="#FFFFFF"><Text>写真レイアウト</Text></OverflowHintScroll>);
  const wrapper = view.UNSAFE_getAllByType(View).find(node => node.props.onLayout);
  act(() => wrapper.props.onLayout({ nativeEvent: { layout: { width: 300 } } }));
  const scroll = view.UNSAFE_getByType(ScrollView);
  act(() => scroll.props.onContentSizeChange(450, 70)); expect(view.getByTestId('scroll-continuation-fade')).toBeTruthy();
  act(() => scroll.props.onScroll({ nativeEvent: { contentOffset: { x: 150 } } })); expect(view.queryByTestId('scroll-continuation-fade')).toBeNull();
});

test('月表紙は月と件数、目標タイトルは目標カードに一度だけ。達成の瓶にも既存の実件数を表示', () => {
  const props = { designMode: 'chic', chicPalette: palette, chicPattern: 'plain', monthLabel: '2026年11月', state: { wishes: [{ id: 'w', title: 'アプリ完成', completed: false }], actions: [], review: {} }, onSaveState: noop, affirmations: [], affirmationCustomTexts: [], planTier: 'premium', onSaveAffirmation: noop, onDeleteAffirmation: noop, onSaveAffirmationCustomText: noop, onDeleteAffirmationCustomText: noop, onPremium: noop };
  const view = render(<WishScreen {...props} />);
  const cover = within(view.getByTestId('wish-cover'));
  expect(cover.getByText('2026年11月')).toBeTruthy(); expect(cover.getByText('叶えたいこと 1件　行動 0件')).toBeTruthy(); expect(cover.queryByText('アプリ完成')).toBeNull(); expect(view.getAllByText('アプリ完成')).toHaveLength(1);
  view.unmount();
  const vessel = render(<AchievementVessel tasks={[{ ...task, done: true, completedAt: now.toISOString() }]} designMode="chic" chicPalette={palette} />);
  expect(vessel.getByText('1個のできた！')).toBeTruthy();
});
