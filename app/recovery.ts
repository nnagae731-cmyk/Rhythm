export type RecoveryAction = 'leave_now' | 'delay_arrival' | 'contact' | 'reschedule';

export type RecoverySourcePlan = {
  id?: string;
  title: string;
  date: string;
  arrival: string;
  travelMinutes: number;
  bufferMinutes: number;
};

export type RecoveryOption = {
  action: RecoveryAction;
  title: string;
  description: string;
  estimatedArrival: string;
  newArrival?: string;
  contactMessage?: string;
};

export type RecoveryRecord = {
  id: string;
  planId: string;
  planTitle: string;
  action: RecoveryAction;
  occurredAt: string;
  originalArrival: string;
  estimatedArrival: string;
  newArrival?: string;
};

const formatClock = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export function getRecoveryOptions(plan: RecoverySourcePlan, now = new Date()): RecoveryOption[] {
  const estimated = new Date(now.getTime() + (plan.travelMinutes + plan.bufferMinutes) * 60_000);
  const reorganized = new Date(estimated.getTime() + 15 * 60_000);
  const estimatedArrival = formatClock(estimated);
  const reorganizedArrival = formatClock(reorganized);
  return [
    { action: 'leave_now', title: '今すぐ出発', description: `${estimatedArrival}ごろの到着見込みです`, estimatedArrival },
    { action: 'delay_arrival', title: '到着予定を変更', description: `到着予定を${estimatedArrival}へ変更します`, estimatedArrival, newArrival: estimatedArrival },
    { action: 'contact', title: '遅れる連絡をする', description: 'そのまま共有できる連絡文を作ります', estimatedArrival, contactMessage: `申し訳ありません。到着が遅れており、${estimatedArrival}ごろになる見込みです。` },
    { action: 'reschedule', title: '予定を組み直す', description: `余裕を含めて${reorganizedArrival}へ変更します`, estimatedArrival, newArrival: reorganizedArrival },
  ];
}

export function createRecoveryRecord(plan: RecoverySourcePlan, option: RecoveryOption, occurredAt = new Date()): RecoveryRecord | undefined {
  if (!plan.id) return undefined;
  const occurredAtIso = occurredAt.toISOString();
  return {
    id: `recovery:${plan.id}:${occurredAtIso}:${option.action}`,
    planId: plan.id,
    planTitle: plan.title,
    action: option.action,
    occurredAt: occurredAtIso,
    originalArrival: plan.arrival,
    estimatedArrival: option.estimatedArrival,
    newArrival: option.newArrival,
  };
}
