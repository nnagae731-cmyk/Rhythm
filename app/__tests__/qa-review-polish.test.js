const React = require('react');
const { render, fireEvent, cleanup } = require('@testing-library/react-native');
const DateTimePicker = require('@react-native-community/datetimepicker').default;
const { AffirmationSettingsCard } = require('../components/AffirmationSettingsCard');
const { calculateWishProgress } = require('../features/wish/wishUtils');
const { buildRhythmWidgetSnapshot } = require('../features/widget/rhythmWidgetSnapshot');

afterEach(cleanup);

test.each(['00:00', '00:30', '12:00', '23:45'])('通知時刻%sを編集しても時・分を変更せず表示する', time => {
  const view = render(<AffirmationSettingsCard compact affirmations={[{ id: 'a', text: '好きな言葉', time, enabled: true }]} customTexts={[]} designMode="minimal" planTier="premium" onPremium={() => {}} onSave={() => {}} onDelete={() => {}} onSaveCustomText={() => {}} onDeleteCustomText={() => {}} styles={{}} />);
  fireEvent.press(view.getByText('管理する ›'));
  fireEvent.press(view.getByLabelText('「好きな言葉」を編集'));
  fireEvent.press(view.getByText(`通知時刻 ${time}`));
  const selected = view.UNSAFE_getByType(DateTimePicker).props.value;
  expect([selected.getHours(), selected.getMinutes()]).toEqual(time.split(':').map(Number));
});

test.each([[false, false, 0], [false, true, 50], [true, false, 50], [true, true, 100]])('目標・行動の完了(%s/%s)を画面とWidgetで同じ進捗%sにする', (wishDone, actionDone, expected) => {
  const state = { wishes: [{ id: 'wish', title: '健康', completed: wishDone }], actions: [{ id: 'action', wishId: 'wish', title: '歩く', completed: actionDone }], review: {} };
  const snapshot = buildRhythmWidgetSnapshot({ tasks: [], departurePlans: [], departureCheckIns: [], canShowArrivalReverseCountdown: true, wishMonths: { '2026-11': state }, now: new Date(2026, 10, 23, 12) });
  expect(calculateWishProgress(state).progress).toBe(expected);
  expect(snapshot.goal.progress).toBe(expected);
  expect(snapshot.goalMonths['2026-11'].progress).toBe(expected);
});
