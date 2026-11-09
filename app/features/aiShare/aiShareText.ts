import { BehaviorEvent } from '../../behaviorEvents';
import { FocusSession } from '../../focusSession';
import { DeparturePlan, MonthlyWishState, Task, Wish } from '../../types';

export type AIShareKind = 'today' | 'analysis' | 'wish';

type TodayShareInput = {
  tasks: Task[];
  departurePlans: DeparturePlan[];
  behaviorEvents: BehaviorEvent[];
  now?: Date;
};

type BehaviorShareInput = {
  tasks: Task[];
  behaviorEvents: BehaviorEvent[];
  focusSessions: FocusSession[];
  now?: Date;
};

type WishShareInput = {
  wish: Wish;
  state: MonthlyWishState;
  now?: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function atLocal(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return undefined;
  return new Date(year!, month! - 1, day!, hour!, minute!);
}

function formatNow(now: Date) {
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function formatDate(value?: Date | string) {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) return `${Number(dateOnly[2])}/${Number(dateOnly[3])}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function isCompleted(task: Task) {
  return task.done || task.status === 'completed' || task.status === 'skipped';
}

function isOpenTaskForToday(task: Task, today: string) {
  if (isCompleted(task)) return false;
  if ((task.scheduledDate && task.scheduledDate > today) || (task.deadlineDate && task.deadlineDate > today)) return false;
  return task.scheduledDate === today || task.deadlineDate === today || task.bucket === 'now';
}

function taskLines(task: Task, today: string) {
  const lines = [`・${task.title}`, `  優先度：${task.priority}`];
  if (task.category) lines.push(`  カテゴリ：${task.category}`);
  if (task.estimatedMinutes && Number.isFinite(task.estimatedMinutes) && task.estimatedMinutes >= 1) lines.push(`  見積時間：${Math.round(task.estimatedMinutes)}分`);
  if (task.deadlineDate) lines.push(`  締切：${formatDate(task.deadlineDate)}${task.deadlineTime ? ` ${task.deadlineTime}` : ''}`);
  if (task.scheduledTime) lines.push(`  開始予定：${task.scheduledTime}`);
  const carryOverDate = task.scheduledDate && task.scheduledDate < today ? task.scheduledDate : task.deadlineDate && task.deadlineDate < today ? task.deadlineDate : undefined;
  if (carryOverDate) lines.push(`  持ち越し：${formatDate(carryOverDate)}から`);
  return lines.join('\n');
}

function planLines(plan: DeparturePlan) {
  if (plan.allDay) return `・${plan.title}\n  終日`;
  const lines = [`・${plan.title}`];
  if (plan.arrival) lines.push(`  開始：${plan.arrival}${plan.endAt ? `〜${plan.endAt}` : ''}`);
  const departure = plan.departureTime || (() => {
    const arrival = atLocal(plan.date, plan.arrival);
    if (!arrival) return undefined;
    return new Date(arrival.getTime() - (plan.travelMinutes + plan.bufferMinutes) * 60_000).toTimeString().slice(0, 5);
  })();
  if (departure) lines.push(`  出発目安：${departure}`);
  if (plan.preparationMinutes > 0) {
    const departureAt = atLocal(plan.date, departure ?? '');
    if (departureAt) lines.push(`  準備開始目安：${new Date(departureAt.getTime() - plan.preparationMinutes * 60_000).toTimeString().slice(0, 5)}`);
    else lines.push(`  準備時間：${plan.preparationMinutes}分`);
  }
  if (plan.travelMinutes > 0) lines.push(`  移動時間：${plan.travelMinutes}分`);
  return lines.join('\n');
}

function timeBand(date: Date) {
  const hour = date.getHours();
  if (hour < 11) return '朝';
  if (hour < 16) return '昼';
  if (hour < 20) return '夕方';
  return '夜';
}

function recentBehaviorLines(events: BehaviorEvent[], now: Date) {
  const earliest = now.getTime() - 30 * DAY_MS;
  const recent = events.filter((event) => {
    const at = new Date(event.actualAt ?? event.occurredAt).getTime();
    return Number.isFinite(at) && at >= earliest && at <= now.getTime();
  });
  const completeTimes = recent
    .filter((event) => event.type === 'task_completed')
    .map((event) => new Date(event.actualAt ?? event.occurredAt))
    .filter((date) => !Number.isNaN(date.getTime()));
  const bands = new Map<string, number>();
  completeTimes.forEach((date) => bands.set(timeBand(date), (bands.get(timeBand(date)) ?? 0) + 1));
  const lines: string[] = [];
  if (completeTimes.length) lines.push(`・完了記録：${completeTimes.length}件`);
  if (bands.size) lines.push(`・完了した時間帯：${[...bands.entries()].map(([label, count]) => `${label} ${count}件`).join('、')}`);
  const snoozed = recent.filter((event) => event.type === 'notification_action' && event.notificationAction === 'snoozed').length;
  if (snoozed) lines.push(`・通知をあとでにした記録：${snoozed}件`);
  return lines;
}

/** Builds a human-readable, opt-in share payload. It never includes IDs, photos, locations, or account/device data. */
export function buildTodayOptimizationShareText({ tasks, departurePlans, behaviorEvents, now = new Date() }: TodayShareInput) {
  const today = localDateKey(now);
  const todayTasks = tasks.filter((task) => isOpenTaskForToday(task, today));
  const todayPlans = departurePlans.filter((plan) => plan.date === today).sort((left, right) => (left.arrival || left.departureTime || '').localeCompare(right.arrival || right.departureTime || ''));
  const sections = [
    '【RhythmPace 行動データ】',
    `現在：\n${formatNow(now)}`,
    `【今日の未完了TODO】\n${todayTasks.length ? todayTasks.map((task) => taskLines(task, today)).join('\n') : '今日に予定・締切・今やる設定がある未完了TODOはありません。'}`,
    `【今日の予定】\n${todayPlans.length ? todayPlans.map(planLines).join('\n') : '今日の予定はありません。'}`,
  ];
  const behavior = recentBehaviorLines(behaviorEvents, now);
  if (behavior.length) sections.push(`【最近の行動傾向】\n${behavior.join('\n')}`);
  sections.push('【相談したいこと】\n現在時刻、今日の予定、締切、優先度、見積時間、過去の行動傾向を考慮して、今日のTODOを現実的に終わらせる順番を提案してください。固定予定や出発時間には遅れないことを優先してください。必要なら長いTODOを複数回に分割し、休憩も含めて可能な範囲で「何時から何時まで何をするか」の形にしてください。すべて終わらせるのが現実的でない場合は、今日やるものと延期してよいものを分けてください。');
  return sections.join('\n\n');
}

/** Builds a thirty-day, evidence-only summary. Missing app data is omitted rather than inferred. */
export function buildBehaviorAnalysisShareText({ tasks, behaviorEvents, focusSessions, now = new Date() }: BehaviorShareInput) {
  const today = localDateKey(now);
  const start = new Date(now.getTime() - 29 * DAY_MS);
  const startDate = localDateKey(start);
  const completed = tasks.filter((task) => {
    const completedAt = task.completedAt ? new Date(task.completedAt).getTime() : NaN;
    return Number.isFinite(completedAt) && completedAt >= start.getTime() && completedAt <= now.getTime();
  });
  // The denominator contains only tasks whose relation to the last 30 days is
  // recorded: completed in the window, or still open with a created/scheduled/
  // deadline date in the window. Future dates never enter this set.
  const taskWindow = tasks.filter((task) => {
    if (completed.some((item) => item.id === task.id)) return true;
    if (isCompleted(task)) return false;
    return [task.createdAt, task.scheduledDate, task.deadlineDate]
      .some((date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date) && date.slice(0, 10) >= startDate && date.slice(0, 10) <= today);
  });
  const incomplete = taskWindow.filter((task) => !completed.some((item) => item.id === task.id));
  const overdue = incomplete.filter((task) => (task.scheduledDate && task.scheduledDate < today) || (task.deadlineDate && task.deadlineDate < today));
  const categories = new Map<string, { completed: number; total: number }>();
  taskWindow.forEach((task) => {
    const current = categories.get(task.category) ?? { completed: 0, total: 0 };
    current.total += 1;
    if (isCompleted(task)) current.completed += 1;
    categories.set(task.category, current);
  });
  const recentFocus = focusSessions.filter((session) => {
    const date = new Date(session.completedAt).getTime();
    return Number.isFinite(date) && date >= start.getTime() && date <= now.getTime();
  });
  const focusMinutes = recentFocus.reduce((sum, session) => sum + Math.max(0, session.durationMinutes || 0), 0);
  const actions = behaviorEvents.filter((event) => {
    const date = new Date(event.actualAt ?? event.occurredAt).getTime();
    return Number.isFinite(date) && date >= start.getTime() && date <= now.getTime();
  });
  const completedEvents = actions.filter((event) => event.type === 'task_completed');
  const snoozed = actions.filter((event) => event.type === 'notification_action' && event.notificationAction === 'snoozed');
  const timeBands = new Map<string, number>();
  completedEvents.forEach((event) => {
    const date = new Date(event.actualAt ?? event.occurredAt);
    if (!Number.isNaN(date.getTime())) timeBands.set(timeBand(date), (timeBands.get(timeBand(date)) ?? 0) + 1);
  });
  const sections = [
    '【RhythmPace 行動データ】',
    `集計期間：\n${formatDate(start)}〜${formatDate(now)}（直近30日）`,
    `【直近30日のTODO】\n・対象：${taskWindow.length}件\n・完了：${completed.length}件\n・未完了：${incomplete.length}件\n・達成率：${taskWindow.length ? `${Math.round(completed.length / taskWindow.length * 100)}%` : '—'}\n・期限または予定日を過ぎた未完了TODO：${overdue.length}件`,
    `【集中の記録】\n${recentFocus.length ? `・集中セッション：${recentFocus.length}回\n・合計集中時間：${focusMinutes}分` : '集中完了の記録はありません。'}`,
  ];
  if (categories.size) sections.push(`【カテゴリ別の状況】\n${[...categories.entries()].map(([category, value]) => `・${category}：${value.completed}/${value.total}件完了`).join('\n')}`);
  if (timeBands.size || snoozed.length) sections.push(`【行動記録】\n${timeBands.size ? `・完了した時間帯：${[...timeBands.entries()].map(([label, count]) => `${label} ${count}件`).join('、')}` : ''}${timeBands.size && snoozed.length ? '\n' : ''}${snoozed.length ? `・通知をあとでにした記録：${snoozed.length}件` : ''}`);
  if (overdue.length) {
    const snoozesByTask = new Map<string, number>();
    snoozed.forEach((event) => { if (event.taskId) snoozesByTask.set(event.taskId, (snoozesByTask.get(event.taskId) ?? 0) + 1); });
    sections.push(`【停滞しているTODO】\n${overdue.slice(0, 12).map((task) => {
      const referenceDate = task.deadlineDate && task.deadlineDate < today ? task.deadlineDate : task.scheduledDate;
      const overdueDays = referenceDate ? Math.max(1, Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${referenceDate}T12:00:00`).getTime()) / DAY_MS)) : undefined;
      const details = [referenceDate ? `${task.deadlineDate === referenceDate ? '締切' : '予定日'}超過：${overdueDays}日` : undefined, snoozesByTask.get(task.id) ? `通知をあとで：${snoozesByTask.get(task.id)}回` : undefined].filter(Boolean);
      return `・${task.title}${task.category ? `（${task.category}）` : ''}${details.length ? `：${details.join('、')}` : ''}`;
    }).join('\n')}`);
  }
  sections.push('【相談したいこと】\nこの直近30日の記録から、具体的に何が滞っているかを分析してください。達成率、未完了TODO、期限超過、時間帯、カテゴリ、集中時間などの記録に基づいて、ボトルネックを3〜5個挙げてください。性格や意志の弱さなどを推測せず、記録から確認できる行動パターンを中心に分析し、明日から実行できる改善方法を具体的に提案してください。');
  return sections.join('\n\n');
}

export function buildWishProgressShareText({ wish, state, now = new Date() }: WishShareInput) {
  const actions = state.actions.filter((action) => action.wishId === wish.id);
  const completed = actions.filter((action) => action.completed);
  const pending = actions.filter((action) => !action.completed);
  const progress = wish.completed ? 100 : actions.length ? Math.round(completed.length / actions.length * 100) : 0;
  const sections = [
    '【RhythmPace 叶えたいことの記録】',
    `現在：\n${formatNow(now)}`,
    `【叶えたいこと】\n・${wish.title}${state.monthlyGoal?.trim() ? `\n今月の目標：${state.monthlyGoal.trim()}` : ''}${wish.completed ? '\n状態：完了' : `\n進捗：${progress}%`}`,
    `【関連する行動】\n${actions.length ? actions.map((action) => {
      const createdAt = action.createdAt ? new Date(action.createdAt).getTime() : NaN;
      const pendingDays = !action.completed && Number.isFinite(createdAt) ? Math.max(0, Math.floor((now.getTime() - createdAt) / DAY_MS)) : undefined;
      return `・${action.completed ? '完了' : '未完了'}：${action.title}${action.completedAt ? `（${formatDate(action.completedAt)} 完了）` : pendingDays !== undefined ? `（${pendingDays === 0 ? '今日追加' : `${pendingDays}日前に追加`}）` : ''}`;
    }).join('\n') : '関連する行動はまだ登録されていません。'}`,
    `【現在の状況】\n・関連する行動：${actions.length}件\n・完了：${completed.length}件\n・未完了：${pending.length}件\n・達成率：${actions.length ? `${progress}%` : '—'}`,
    '【相談したいこと】\nこの目標と関連行動の記録をもとに、達成を妨げているボトルネックを分析してください。特に、長く未完了になっている行動や、完了済み行動との違いを確認してください。そのうえで、今から優先すべき行動を3つ以内に絞ってください。大きすぎる行動は、すぐ始められる小さな行動に分解してください。記録にない事情や性格は推測しないでください。',
  ];
  return sections.join('\n\n');
}
