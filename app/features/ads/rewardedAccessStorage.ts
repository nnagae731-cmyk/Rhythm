import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetType } from '../../types';

export const REWARDED_ACCESS_STORAGE_KEY =
  'rhythm-rewarded-access-v1';

export type RewardedAccessState = {
  version: 1;

  wishMonthlyGoal: {
    progress: number;
    monthKey: string | null;
    unlockedUntil: string | null;
  };

  wishCreateProgress: number;

  wishActionCreateProgress: number;

  premiumDesign: {
    unlockedUntil: string | null;
  };

  /** One-time 24-hour Design trial. Kept in rewarded storage for compatibility. */
  premiumDesignTrial: {
    used: boolean;
    designId: string | null;
    expiresAt: string | null;
  };

  /** The last Design access expiry for which the automatic notice was shown. */
  premiumDesignNoticeSeenFor: string | null;

  premiumDesignTrialCredits: Record<string, number>;

  calendarImportCredits: number;

  photoCustomization: {
    topExtraSlotsUnlocked: number;
    backgroundUnlocked: boolean;
    focusUnlocked: boolean;
  };

  /** One Widget photo customization unlocked by a rewarded ad. */
  widgetPhotoCustomization: {
    widgetType: WidgetType | null;
    unlockedAt: string | null;
    expiresAt: string | null;
  };

  routine: {
    skipStock: number;
    skipBonusAdded: number;
    skipBonusProgress: number;
  };
};

export const DEFAULT_REWARDED_ACCESS_STATE: RewardedAccessState = {
  version: 1,

  wishMonthlyGoal: {
    progress: 0,
    monthKey: null,
    unlockedUntil: null,
  },

  wishCreateProgress: 0,

  wishActionCreateProgress: 0,

  premiumDesign: {
    unlockedUntil: null,
  },

  premiumDesignTrial: {
    used: false,
    designId: null,
    expiresAt: null,
  },

  premiumDesignNoticeSeenFor: null,

  premiumDesignTrialCredits: {},

  calendarImportCredits: 0,

  photoCustomization: {
    topExtraSlotsUnlocked: 0,
    backgroundUnlocked: false,
    focusUnlocked: false,
  },

  widgetPhotoCustomization: {
    widgetType: null,
    unlockedAt: null,
    expiresAt: null,
  },

  routine: {
    skipStock: 0,
    skipBonusAdded: 0,
    skipBonusProgress: 0,
  },
};

function normalizeNonNegativeInteger(
  value: unknown,
  fallback = 0,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeNullableString(
  value: unknown,
): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizeTrialCredits(
  value: unknown,
): Record<string, number> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {};
  }

  const result: Record<string, number> = {};

  for (const [key, credit] of Object.entries(value)) {
    result[key] = normalizeNonNegativeInteger(credit);
  }

  return result;
}

export function normalizeRewardedAccessState(
  value: unknown,
): RewardedAccessState {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return DEFAULT_REWARDED_ACCESS_STATE;
  }

  const raw = value as Partial<RewardedAccessState>;

  return {
    version: 1,

    wishMonthlyGoal: {
      progress: Math.min(
        normalizeNonNegativeInteger(
          raw.wishMonthlyGoal?.progress,
        ),
        5,
      ),
      monthKey: typeof raw.wishMonthlyGoal?.monthKey === 'string' ? raw.wishMonthlyGoal.monthKey : null,
      unlockedUntil: normalizeNullableString(
        raw.wishMonthlyGoal?.unlockedUntil,
      ),
    },

    wishCreateProgress: Math.min(
      normalizeNonNegativeInteger(
        raw.wishCreateProgress,
      ),
      2,
    ),

    wishActionCreateProgress: Math.min(
      normalizeNonNegativeInteger(
        raw.wishActionCreateProgress,
      ),
      2,
    ),

    premiumDesign: {
      unlockedUntil: normalizeNullableString(
        raw.premiumDesign?.unlockedUntil,
      ),
    },

    premiumDesignTrial: {
      used: raw.premiumDesignTrial?.used === true,
      designId: typeof raw.premiumDesignTrial?.designId === 'string' ? raw.premiumDesignTrial.designId : null,
      expiresAt: normalizeNullableString(raw.premiumDesignTrial?.expiresAt),
    },

    premiumDesignNoticeSeenFor: normalizeNullableString(raw.premiumDesignNoticeSeenFor),

    premiumDesignTrialCredits:
      normalizeTrialCredits(
        raw.premiumDesignTrialCredits,
      ),

    calendarImportCredits:
      normalizeNonNegativeInteger(
        raw.calendarImportCredits,
      ),

    photoCustomization: {
      topExtraSlotsUnlocked: Math.min(
        normalizeNonNegativeInteger(
          raw.photoCustomization
            ?.topExtraSlotsUnlocked,
        ),
        5,
      ),

      backgroundUnlocked:
        raw.photoCustomization
          ?.backgroundUnlocked === true,

      focusUnlocked:
        raw.photoCustomization
          ?.focusUnlocked === true,
    },

    widgetPhotoCustomization: {
      widgetType: typeof raw.widgetPhotoCustomization?.widgetType === 'string' ? raw.widgetPhotoCustomization.widgetType : null,
      unlockedAt: normalizeNullableString(raw.widgetPhotoCustomization?.unlockedAt),
      expiresAt: normalizeNullableString(raw.widgetPhotoCustomization?.expiresAt),
    },

    routine: {
      skipStock: normalizeNonNegativeInteger(
        raw.routine?.skipStock,
      ),

      skipBonusAdded: Math.min(
        normalizeNonNegativeInteger(
          raw.routine?.skipBonusAdded,
        ),
        2,
      ),

      skipBonusProgress: Math.min(
        normalizeNonNegativeInteger(
          raw.routine?.skipBonusProgress,
        ),
        2,
      ),
    },
  };
}

export async function loadRewardedAccessState(): Promise<RewardedAccessState> {
  try {
    const raw = await AsyncStorage.getItem(
      REWARDED_ACCESS_STORAGE_KEY,
    );

    if (!raw) {
      return DEFAULT_REWARDED_ACCESS_STATE;
    }

    return normalizeRewardedAccessState(
      JSON.parse(raw),
    );
  } catch (error) {
    console.warn(
      '[Ads] Rewarded access state could not be loaded.',
      error,
    );

    return DEFAULT_REWARDED_ACCESS_STATE;
  }
}

export async function saveRewardedAccessState(
  state: RewardedAccessState,
): Promise<void> {
  await AsyncStorage.setItem(
    REWARDED_ACCESS_STORAGE_KEY,
    JSON.stringify(
      normalizeRewardedAccessState(state),
    ),
  );
}

export async function resetRewardedAccessState(): Promise<void> {
  await AsyncStorage.removeItem(
    REWARDED_ACCESS_STORAGE_KEY,
  );
}
