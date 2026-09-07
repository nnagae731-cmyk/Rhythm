/**
 * Pure notification copy builders shared by production scheduling and the
 * temporary development notification catalog. Keeping copy here prevents the
 * QA preview from drifting away from the text shown by the real scheduler.
 */
export function buildCompletionFeedbackContent() {
  return { title: 'タスク完了' };
}

export function buildAffirmationContent(text: string) {
  return { title: '今日の言葉', body: text };
}

export function buildTaskReminderTitle(index: number, total: number) {
  return index === 0 ? '終わった？' : index === total - 1 ? 'まだなら、今確認しよう' : 'そろそろ終われそう？';
}

export function buildTaskActionContent(action: 'SNOOZE' | 'LATER', body: string) {
  return { title: action === 'SNOOZE' ? 'そろそろ、どう？' : 'あとで確認する時間です', body };
}

export function buildDeadlineTitle(minutesBefore: number) {
  return minutesBefore === 0 ? '期限時刻です' : `期限まであと${minutesBefore >= 60 ? `${minutesBefore / 60}時間` : `${minutesBefore}分`}`;
}

export function buildScheduleSwitchContent(planTitle: string, kind: 'preparation' | 'departure' | string, taskTitle: string) {
  const boundaryLabel = kind === 'preparation' ? '準備' : kind === 'departure' ? '出発' : '予定';
  return {
    title: 'そろそろ次の予定へ切り替える時間',
    body: `あと15分で「${planTitle}」の${boundaryLabel}時間です。「${taskTitle}」をそろそろ切り上げますか？`,
  };
}

export function buildDepartureFollowUpContent(phase: 'preparation' | 'departure', body: string) {
  return { title: phase === 'preparation' ? '準備、始められそう？' : '出発、できそう？', body };
}

export function buildDepartureReminderContent(planTitle: string) {
  return { title: '出発時刻です', body: planTitle };
}

export function buildDepartureStageContent(stage: 'wake_up' | 'prepare' | 'ten_minutes' | 'leave_now' | 'late_warning', planTitle: string, prepareTime: string, leaveTime: string, arrivalTime: string) {
  switch (stage) {
    case 'wake_up': return { title: '起きて、準備の時間です', body: `${prepareTime}から準備を始める予定です` };
    case 'prepare': return { title: '準備、始めた？', body: `${leaveTime}に出発すると安心です` };
    case 'ten_minutes': return { title: 'そろそろ出発しよう', body: `${planTitle}の持ち物を確認しよう` };
    case 'leave_now': return { title: '出発した？', body: `${arrivalTime}到着予定です` };
    case 'late_warning': return { title: 'まだなら、今出よう', body: '急いで出発するか、予定を組み直してください' };
  }
}

export function buildRoutineRemainingContent(count: number) {
  return { title: '今日のRoutineが残っています', body: `今日のRoutineがあと${count}件残っています。無理のないところまでやっておきますか？` };
}

export function buildFocusCompletionContent(taskTitle?: string) {
  const cleanTaskTitle = taskTitle?.trim();
  return { title: '集中タイム終了', body: cleanTaskTitle ? `「${cleanTaskTitle}」の集中時間が終了しました。` : '集中時間が終了しました。' };
}

export function buildPremiumTrialReminderContent() {
  return { title: 'Premiumの無料期間は明日までです', body: '継続・解約状況はApp Storeで確認できます。' };
}
