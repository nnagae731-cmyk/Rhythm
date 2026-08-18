import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingFeatureId } from './onboardingSteps';

export const ONBOARDING_STORAGE_KEY =
  'rhythm-feature-onboarding-v1';

export type OnboardingState = {
  version: 1;

  completed: Partial<
    Record<OnboardingFeatureId, string>
  >;
};

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  version: 1,
  completed: {},
};

export function isOnboardingFeatureId(
  value: string,
): value is OnboardingFeatureId {
  return (
    value === 'todo' ||
    value === 'timeline' ||
    value === 'focus' ||
    value === 'analysis' ||
    value === 'wish' ||
    value === 'routine' ||
    value === 'design'
  );
}

export function normalizeOnboardingState(
  value: unknown,
): OnboardingState {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return DEFAULT_ONBOARDING_STATE;
  }

  const raw = value as Partial<OnboardingState>;

  const completed: Partial<
    Record<OnboardingFeatureId, string>
  > = {};

  if (
    raw.completed &&
    typeof raw.completed === 'object' &&
    !Array.isArray(raw.completed)
  ) {
    for (const [key, completedAt] of Object.entries(
      raw.completed,
    )) {
      if (
        isOnboardingFeatureId(key) &&
        typeof completedAt === 'string'
      ) {
        completed[key] = completedAt;
      }
    }
  }

  return {
    version: 1,
    completed,
  };
}

export async function loadOnboardingState(): Promise<OnboardingState> {
  try {
    const raw = await AsyncStorage.getItem(
      ONBOARDING_STORAGE_KEY,
    );

    if (!raw) {
      return DEFAULT_ONBOARDING_STATE;
    }

    return normalizeOnboardingState(
      JSON.parse(raw),
    );
  } catch (error) {
    console.warn(
      '[Onboarding] State could not be loaded.',
      error,
    );

    return DEFAULT_ONBOARDING_STATE;
  }
}

export function hasCompletedOnboarding(
  state: OnboardingState,
  featureId: OnboardingFeatureId,
): boolean {
  return Boolean(state.completed[featureId]);
}

export async function markOnboardingCompleted(
  featureId: OnboardingFeatureId,
): Promise<OnboardingState> {
  const current = await loadOnboardingState();

  const next: OnboardingState = {
    ...current,

    completed: {
      ...current.completed,
      [featureId]: new Date().toISOString(),
    },
  };

  await AsyncStorage.setItem(
    ONBOARDING_STORAGE_KEY,
    JSON.stringify(next),
  );

  return next;
}

export async function resetOnboardingFeature(
  featureId: OnboardingFeatureId,
): Promise<OnboardingState> {
  const current = await loadOnboardingState();

  const completed = {
    ...current.completed,
  };

  delete completed[featureId];

  const next: OnboardingState = {
    ...current,
    completed,
  };

  await AsyncStorage.setItem(
    ONBOARDING_STORAGE_KEY,
    JSON.stringify(next),
  );

  return next;
}

export async function resetAllOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(
    ONBOARDING_STORAGE_KEY,
  );
}