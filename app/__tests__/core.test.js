const { getDepartureMoments } = require('../features/departure/departureUtils');
const { getRecoveryOptions } = require('../recovery');
const { hasPremiumAccess, getEffectiveChicPattern, isWithinFreeSchedule } = require('../premiumAccess');
const { isUnlockActive, addHours, isPremiumDesignTrialActive, canStartPremiumDesignTrial } = require('../features/ads/rewardedAccessLogic');
const { pruneFocusSessions, pruneBehaviorEvents, pruneRecoveryHistory, pruneRoutineArchives } = require('../features/storage/historyCleanup');
const { calculateWishProgress, createEmptyMonthlyWishState, normalizeMonthlyReview } = require('../features/wish/wishUtils');
const { appendBehaviorEvent, createTaskCompletedBehaviorEvent, createTaskCompletionRevertedBehaviorEvent } = require('../behaviorEvents');
const { buildBehaviorAnalysisShareText, buildTodayOptimizationShareText } = require('../features/aiShare/aiShareText');
const { normalizeWidgetSettings } = require('../features/widget/widgetSettings');
const { selectCurrentTasks } = require('../features/tasks/taskSelectors');
const { createCompletedFocusSession } = require('../focusSession');

const now = new Date(2026, 4, 20, 12);
const task = (id, extra = {}) => ({ id, title: id, done: false, category: '仕事', priority: '中', ...extra });
const plan = { title: '予定', date: '2026-05-20', arrival: '10:00', travelMinutes: 40, preparationMinutes: 30, bufferMinutes: 10 };

describe('予定・タスク', () => {
  test('準備開始と出発を逆算する', () => { const x = getDepartureMoments(plan); expect(x.leave.getHours()).toBe(9); expect(x.leave.getMinutes()).toBe(10); expect(x.prepare.getHours()).toBe(8); expect(x.prepare.getMinutes()).toBe(40); });
  test('逆算が前日へまたがる', () => { const x = getDepartureMoments({ ...plan, arrival: '00:20' }); expect(x.leave.getDate()).toBe(19); expect(x.leave.getHours()).toBe(23); expect(x.leave.getMinutes()).toBe(30); });
  test('遅延時の到着見込みを再計算する', () => { const x = getRecoveryOptions(plan, now); expect(x[0].estimatedArrival).toBe('12:50'); });
  test('同名タスクもID別に保持して優先順にする', () => { const a = task('a', { title: '同名', priority: '低' }); const b = task('b', { title: '同名', priority: '高' }); expect(selectCurrentTasks([a,b], now).map(x => x.id)).toEqual(['b','a']); });
  test('完了イベント重複を追加しない', () => { const e = createTaskCompletedBehaviorEvent({ taskId: 'a', taskTitle: 'a', occurredAt: now }); expect(appendBehaviorEvent([e], e)).toHaveLength(1); });
  test('完了取消を別イベントとして記録', () => { const e = createTaskCompletedBehaviorEvent({ taskId: 'a', taskTitle: 'a', occurredAt: now }); const undo = createTaskCompletionRevertedBehaviorEvent({ taskId: 'a', taskTitle: 'a', occurredAt: now }); expect(appendBehaviorEvent([e], undo)).toHaveLength(2); });
});

describe('利用権・日付境界', () => {
  test.each([['free',false],['premium',true]])('%s Premium権限', (tier, expected) => expect(hasPremiumAccess(tier,'full_history')).toBe(expected));
  test('デザイン購入で有料柄を利用できる', () => { expect(getEffectiveChicPattern('free','dot',true)).toBe('dot'); expect(getEffectiveChicPattern('free','dot',false)).toBe('plain'); });
  test('無料予定は今日から7日間', () => { expect(isWithinFreeSchedule('2026-05-26',now)).toBe(true); expect(isWithinFreeSchedule('2026-05-27',now)).toBe(false); });
  test('広告解放は期限ちょうどで失効', () => { const end=addHours(now,12); expect(isUnlockActive(end,now)).toBe(true); expect(isUnlockActive(end,new Date(end))).toBe(false); expect(isUnlockActive('invalid',now)).toBe(false); });
  test('Trialは未使用時のみ開始可能', () => { const s={premiumDesignTrial:{used:false,expiresAt:null}}; expect(canStartPremiumDesignTrial(s)).toBe(true); expect(isPremiumDesignTrialActive(s,now)).toBe(false); s.premiumDesignTrial={used:true,expiresAt:addHours(now,24)}; expect(isPremiumDesignTrialActive(s,now)).toBe(true); expect(canStartPremiumDesignTrial(s)).toBe(false); });
});

describe('保存データ・分析', () => {
  test.each([[pruneFocusSessions,'completedAt'],[pruneBehaviorEvents,'occurredAt'],[pruneRecoveryHistory,'occurredAt'],[pruneRoutineArchives,'removedAt']])('90日境界と不正日を安全に扱う', (prune,key) => { const day=86400000, t=now.getTime(); const xs=[89,90,91,-1].map(n=>({[key]:new Date(t-n*day).toISOString()})).concat([{[key]:'invalid'}]); expect(prune(xs,t)).toEqual([xs[0],xs[3],xs[4]]); });
  test('目標と行動の進捗を計算', () => { const s=createEmptyMonthlyWishState(); s.wishes=[{completed:true},{completed:false}]; s.actions=[{completed:true},{completed:false}]; expect(calculateWishProgress(s).progress).toBe(50); });
  test('日記の旧photoとphotosを重複除去', () => expect(normalizeMonthlyReview({photo:'a',photos:['a','b']}).photos).toEqual(['a','b']));
  test('集中記録は入力された時刻と長さを保持', () => { const x=createCompletedFocusSession({id:'f',durationMinutes:25,startedAt:new Date(now-1500000),completedAt:now}); expect(x.durationMinutes).toBe(25); expect(x.completedAt).toBe(now.toISOString()); });
  test('空の行動分析は0除算しない', () => expect(buildBehaviorAnalysisShareText({tasks:[],behaviorEvents:[],focusSessions:[],now})).toContain('達成率：—'));
  test('20件中12件完了は60%', () => { const tasks=Array.from({length:20},(_,i)=>task(String(i),{scheduledDate:'2026-05-20',...(i<12?{done:true,completedAt:now.toISOString()}: {})})); expect(buildBehaviorAnalysisShareText({tasks,behaviorEvents:[],focusSessions:[],now})).toContain('達成率：60%'); });
  test('今日共有には未来予定のTODOを含めない', () => { const s=buildTodayOptimizationShareText({tasks:[task('未来',{bucket:'now',scheduledDate:'2026-05-21'})],departurePlans:[],behaviorEvents:[],now}); expect(s).not.toContain('・未来'); });
  test('未来予定の未完了TODOは30日分析に含めない', () => { const tasks=[task('未来',{createdAt:now.toISOString(),scheduledDate:'2026-05-21'})]; expect(buildBehaviorAnalysisShareText({tasks,behaviorEvents:[],focusSessions:[],now})).toContain('対象：0件'); });
  test('Widgetの旧cutoutのみでも写真を復元', () => { const s=normalizeWidgetSettings({widgetCustomizations:{current:{cutoutUri:'file:///old.jpg'}}}); expect(s.widgetCustomizations.current.photoUri).toBe('file:///old.jpg'); expect(s.widgetCustomizations.current.cutoutUri).toBeUndefined(); });
});
