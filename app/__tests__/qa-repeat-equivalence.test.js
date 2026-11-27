const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const task = require('../features/tasks/taskUtils');
const repeat = require('../features/tasks/repeatUtils');
const dates = require('../features/schedule/dateTimeUtils');
const before = require('./fixtures/task-utils-before-consolidation');

// Before consolidation, exercise the actual private helpers without expanding
// taskUtils' public API. Afterwards compare both consumers to the frozen oracle.
function taskInternals() {
  const file = path.join(__dirname, '../features/tasks/taskUtils.ts');
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const names = ['parseClock', 'dateKey', 'dateForReminder', 'advanceDateValue', 'isOccurrenceAfterToday', 'advanceDateBySteps', 'nextFutureOccurrence', 'repeatSeriesKey'];
  const declarations = ast.statements.filter(ts.isFunctionDeclaration).filter(n => names.includes(n.name.text));
  if (!declarations.some(n => n.name.text === 'repeatSeriesKey')) return require('../features/tasks/repeatDateUtils');
  const code = declarations.map(n => n.getText(ast)).join('\n') + '\nexport { isOccurrenceAfterToday, advanceDateBySteps, nextFutureOccurrence, repeatSeriesKey };';
  const output = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('exports', 'module', output)(module.exports, module);
  return module.exports;
}
const privateTask = taskInternals();
const rules = ['none', 'daily', 'weekdays', 'weekly', 'monthly'];
const days = [undefined, '2023-01-31', '2024-01-31', '2024-02-29', '2026-11-27', '2026-11-28', '2026-12-31'];
const now = new Date(2026, 10, 27, 23, 59, 59);
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(now); jest.spyOn(Math, 'random').mockReturnValue(0.25); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

const dateCases = {
  parseClock: [['00:00'], ['23:59'], ['25:88'], ['-1:-4'], ['bad'], ['7:5']],
  dateForClock: [['00:00'], ['23:59'], ['12:30'], ['bad']],
  dateKey: [[], [now], [new Date(2024, 1, 29)], ['2026-12-31T23:00:00Z']],
  dateForReminder: [['2024-02-29', '23:59'], ['2026-12-31', '24:00'], ['', 'bad']],
  todayInputValue: [[], [-1], [1], [35]],
  advanceDateValue: days.flatMap(day => rules.map(rule => [day, rule])),
  deadlineLabel: [[{}], [{ deadlineDate: '2026-11-27' }], [{ deadlineDate: '2026-11-28' }], [{ deadlineDate: '2027-01-01', deadlineTime: '10:30' }]],
  getTargetDate: [[{}], [{ deadlineDate: '2024-02-29' }], [{ deadlineDate: '2026-12-31', deadlineTime: '12:00' }]],
  formatLiveDate: [[now], [new Date(2024, 1, 29)]],
  formatLiveTime: [[now], [new Date(2024, 1, 29, 0, 5)]],
};
test.each(Object.keys(dateCases))('統合前後の日付ペアが一致する: %s', name => {
  for (const args of dateCases[name]) {
    expect(task[name](...args)).toEqual(before[name](...args));
    expect(dates[name](...args)).toEqual(before[name](...args));
  }
});

const helperCases = {
  isOccurrenceAfterToday: days.filter(Boolean).map(day => [day, now]),
  advanceDateBySteps: days.flatMap(day => rules.flatMap(rule => [0, 1, 3].map(steps => [day, rule, steps]))),
  nextFutureOccurrence: days.flatMap(day => rules.map(rule => [day, rule, '10:00', now])),
  repeatSeriesKey: [{ id: 'a' }, { id: 'a', createdAt: 'stamp' }, { id: 'a', routineId: 'routine', routineEndedAt: '2026-01-01' }].map(value => [value]),
};
test.each(Object.keys(helperCases))('内部ヘルパーも両経路と旧実装が一致する: %s', name => {
  for (const args of helperCases[name]) {
    expect(privateTask[name](...args)).toEqual(before[name](...args));
    expect(repeat[name](...args)).toEqual(before[name](...args));
  }
});

const base = { id: 'task', title: 'repeat', done: false, createdAt: 'series', category: '家事', priority: '中', origin: { source: 'wish' }, subtasks: [{ id: 'sub', title: 'step', done: true }], listItems: [{ id: 'memo', text: 'note', checked: true }] };
function cases() {
  return days.flatMap(scheduledDate => rules.flatMap(repeatRule => [
    [{ ...base, scheduledDate, repeatRule, deadlineDate: scheduledDate, remindDate: scheduledDate, remindAt: '09:00' }],
    [{ ...base, scheduledDate, repeatRule, status: 'skipped', skippedAt: now.toISOString() }],
    [{ ...base, scheduledDate, repeatRule, done: true }],
    [{ ...base, scheduledDate, repeatRule, routineId: 'r', isRoutine: true, routineEndedAt: '2026-01-01' }],
    [{ ...base, scheduledDate, repeatRule, routineId: 'r', isRoutine: true, routineResumedAt: '2026-11-26' }],
    [{ ...base, scheduledDate, repeatRule }, { ...base, id: 'existing', repeatRule, scheduledDate: repeat.nextFutureOccurrence(scheduledDate, repeatRule, undefined, now).scheduledDate }],
  ]));
}
const completionNames = ['completeTasksWithRepeats', 'completeTasksAndCollectEvents'];
test.each(completionNames)('既存taskUtilsの完了契約を固定（統合しない）: %s', name => {
  for (const current of cases()) {
    const snapshot = JSON.parse(JSON.stringify(current));
    expect(task[name](current, ['task'])).toEqual(before[name](current, ['task']));
    expect(JSON.parse(JSON.stringify(current))).toEqual(snapshot);
  }
  const plain = [{ ...base, repeatRule: 'none' }, { ...base, id: 'skip', status: 'skipped' }];
  expect(repeat[name](plain, ['task', 'skip'])).toEqual(task[name](plain, ['task', 'skip']));
});

test.each(completionNames)('完了ペアの差異を固定: ID形式・remindAtなし/日付なしの補完 %s', name => {
  const getTasks = value => Array.isArray(value) ? value : value.tasks;
  for (const reminder of [{ remindDate: '2026-11-27' }, { remindAt: '09:00' }]) {
    const current = [{ ...base, scheduledDate: '2026-11-27', repeatRule: 'daily', ...reminder }];
    const oldNext = getTasks(task[name](current, ['task']))[0];
    const appNext = getTasks(repeat[name](current, ['task']))[0];
    expect(oldNext.id).not.toBe(appNext.id);
    expect(oldNext.listItems[0].id).not.toBe(appNext.listItems[0].id);
    expect(oldNext.remindDate).not.toBe(appNext.remindDate);
    expect(appNext.remindDate).toBe(reminder.remindAt ? '2026-11-28' : undefined);
    expect(oldNext.remindDate).toBe(reminder.remindDate ? '2026-11-28' : undefined);
  }
});

test.each(completionNames)('日付をまたぐバッチでも旧経路の時計とAppの各Task時計を混ぜない: %s', name => {
  const current = [
    { id: 'first', createdAt: 'series-a', done: false, repeatRule: 'daily', scheduledDate: '2026-11-27' },
    { id: 'second', createdAt: 'series-b', done: false, repeatRule: 'daily', scheduledDate: '2026-11-27' },
  ];
  const run = fn => {
    jest.setSystemTime(now);
    Math.random.mockReturnValue(0.25).mockImplementationOnce(() => {
      jest.setSystemTime(new Date(2026, 10, 28, 0, 0, 1));
      return 0.25;
    });
    const result = fn(current, ['first', 'second']);
    return (Array.isArray(result) ? result : result.tasks).slice(0, 2).map(t => t.scheduledDate);
  };
  expect(run(task[name])).toEqual(['2026-11-28', '2026-11-28']);
  expect(run(before[name])).toEqual(['2026-11-28', '2026-11-28']);
  expect(run(repeat[name])).toEqual(['2026-11-28', '2026-11-29']);
});

test('countdownToClockは正常値だけ一致。不正値の予定なし判定はApp側だけなので統合しない', () => {
  for (const clock of ['00:00', '12:30', '23:59']) expect(dates.countdownToClock(clock, now)).toBe(task.countdownToClock(clock, now));
  for (const clock of ['bad', '25:80', '7:5', '']) {
    expect(task.countdownToClock(clock, now)).toBe(before.countdownToClock(clock, now));
    expect(dates.countdownToClock(clock, now)).toBe('予定なし');
    expect(task.countdownToClock(clock, now)).not.toBe('予定なし');
  }
});
