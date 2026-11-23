export const FOCUS_USAGE_POLICY = {
  blockInAppNavigationWhileActive: false,
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
    '集中タイマーは別画面へ移動しても継続します。「集中へ」からタイマーに戻れます。',
  confirm: '閉じる',
} as const;

/**
 * 集中タイマー中にRhythm内の別画面へ
 * 遷移してよいかを判定する。
 *
 * 実行処理はApp配下のProviderで保持するため、現在は画面移動を許可する。
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
