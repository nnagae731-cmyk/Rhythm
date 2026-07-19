import { MonthlyReview, MonthlyWishState, WishMonthMap } from '../../types';

const EMPTY_MONTHLY_WISH_STATE: MonthlyWishState = { theme: '', wishes: [], actions: [], review: {} };

export function wishMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function wishDateKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function createEmptyMonthlyWishState(): MonthlyWishState {
  return {
    theme: '',
    wishes: [],
    actions: [],
    review: {},
  };
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
  return {
    photo: review?.photo ?? '',
    date: review?.date ?? '',
    shortNote: review?.shortNote ?? '',
    memo: review?.memo ?? '',
    satisfaction: review?.satisfaction ?? 0,
  };
}
