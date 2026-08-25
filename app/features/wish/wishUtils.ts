import { MonthlyReview, MonthlyWishState, WishMonthMap } from '../../types';

const EMPTY_MONTHLY_WISH_STATE: MonthlyWishState = { monthlyGoal: '', wishes: [], actions: [], review: {} };

export function wishMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function wishDateKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function createEmptyMonthlyWishState(): MonthlyWishState {
  return {
    monthlyGoal: '',
    wishes: [],
    actions: [],
    review: {},
  };
}

/**
 * Remove the retired monthly theme field when the state is written again.
 * The rest of the object is intentionally preserved so unknown legacy fields
 * are not discarded by this small compatibility cleanup.
 */
export function normalizeWishMonthsForSave(months: WishMonthMap | undefined): WishMonthMap {
  if (!months) return {};
  return Object.fromEntries(Object.entries(months).map(([monthKey, monthState]) => {
    const { theme: _legacyTheme, ...withoutLegacyTheme } = monthState as MonthlyWishState & { theme?: string };
    return [monthKey, withoutLegacyTheme as MonthlyWishState];
  })) as WishMonthMap;
}

export function getMonthlyWishState(months: WishMonthMap | undefined, monthKey = wishMonthKey()) {
  return months?.[monthKey] ?? EMPTY_MONTHLY_WISH_STATE;
}

export function calculateWishProgress(state: MonthlyWishState) {
  const wishTotal = state.wishes.length;
  const wishCompleted = state.wishes.filter((wish) => wish.completed).length;
  const actionTotal = state.actions.length;
  const actionCompleted = state.actions.filter((action) => action.completed).length;
  const total = wishTotal + actionTotal;
  const completed = wishCompleted + actionCompleted;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { wishTotal, wishCompleted, actionTotal, actionCompleted, total, completed, progress };
}

export function normalizeMonthlyReview(review?: MonthlyReview): MonthlyReview {
  const photos = [...new Set([...(review?.photos ?? []), review?.photo ?? ''].filter(Boolean))];
  return {
    id: review?.id,
    photo: photos[0] ?? '',
    photos,
    date: review?.date ?? '',
    shortNote: review?.shortNote ?? '',
    memo: review?.memo ?? '',
    satisfaction: review?.satisfaction ?? 0,
  };
}
