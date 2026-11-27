const React = require('react');
const { render, cleanup } = require('@testing-library/react-native');
const { formatJapaneseDateKey } = require('../features/schedule/dateDisplay');
const { TaskScheduleCalendar } = require('../components/ScheduleCalendar');
afterEach(cleanup);

test.each(['2026-11-27', '2024-02-29', '2027-01-01'])('日付キーを変更せず和式の表示だけを生成する: %s', key => {
  const [year, month, day] = key.split('-');
  expect(formatJapaneseDateKey(key)).toBe(`${year}年${Number(month)}月${Number(day)}日`);
  expect(key).toBe([year, month, day].join('-'));
});

test.each(['free', 'premium'])('予定表の日別見出しは和式、calendar keyは元のまま: %s', planTier => {
  const onSetCalendarMark = jest.fn();
  const view = render(<TaskScheduleCalendar tasks={[]} plans={[]} externalEvents={[]} now={new Date(2026, 10, 27, 12)} designMode="minimal" chicPattern="plain" planTier={planTier} calendarMarks={{}} onSetCalendarMark={onSetCalendarMark} onPremium={jest.fn()} onEditTask={jest.fn()} onDeleteTask={jest.fn()} onEditPlan={jest.fn()} onDeletePlan={jest.fn()} onOpenMap={jest.fn()} behaviorEvents={[]} departureCheckIns={[]} departurePreparationStatuses={{}} />);
  expect(view.getByText('2026年11月27日 の予定')).toBeTruthy();
  expect(view.queryByText('2026.11.27 の予定')).toBeNull();
  expect(onSetCalendarMark).not.toHaveBeenCalled();
});
