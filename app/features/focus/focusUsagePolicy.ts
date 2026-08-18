export const FOCUS_USAGE_POLICY = {
  blockInAppNavigationWhileActive: true,
  allowBackgroundWhileActive: true,
} as const;

export type FocusNavigationBlockReason =
  | 'focus_timer_active';

export type FocusNavigationDecision =
  | {
      allowed: true;
      reason: null;
    }
  | {
      allowed: false;
      reason: FocusNavigationBlockReason;
    };

export const FOCUS_NAVIGATION_GUARD_COPY = {
  title: '集中タイマー実行中',
  message:
    '集中タイマー中はRhythm内の別画面へ移動できません。ほかのアプリを開いたり、Rhythmをバックグラウンドにすることはできます。',
  confirm: '集中に戻る',
} as const;

/**
 * 集中タイマー中にRhythm内の別画面へ
 * 遷移してよいかを判定する。
 *
 * allowed === false の場合は、
 * 案内を表示するだけではなく
 * 実際の画面遷移を中断すること。
 */
export function getFocusNavigationDecision(
  isFocusTimerActive: boolean,
): FocusNavigationDecision {
  if (
    isFocusTimerActive &&
    FOCUS_USAGE_POLICY.blockInAppNavigationWhileActive
  ) {
    return {
      allowed: false,
      reason: 'focus_timer_active',
    };
  }

  return {
    allowed: true,
    reason: null,
  };
}

export function shouldBlockFocusNavigation(
  isFocusTimerActive: boolean,
): boolean {
  return !getFocusNavigationDecision(
    isFocusTimerActive,
  ).allowed;
}

export function canBackgroundAppDuringFocus(): boolean {
  return FOCUS_USAGE_POLICY.allowBackgroundWhileActive;
}