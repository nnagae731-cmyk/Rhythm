import mobileAds, {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

let initialized = false;
let rewardedRequestActive = false;
const REWARDED_OPERATION_TIMEOUT_MS = 15_000;

function describeAdError(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { code?: unknown; message?: unknown };
    if (candidate.code !== undefined || candidate.message !== undefined) {
      try {
        return JSON.stringify({ code: candidate.code, message: candidate.message });
      } catch {
        return String(error);
      }
    }
  }
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function initializeMobileAds() {
  if (initialized) {
    return;
  }
  if (__DEV__) console.log('[Ads] initialize:start');
  try {
    await mobileAds().initialize();
    initialized = true;
    if (__DEV__) console.log('[Ads] initialize:success');
  } catch (error) {
    if (__DEV__) console.log('[Ads] initialize:error', describeAdError(error));
    throw error;
  }
}

export function createTestRewardedAd() {
  return RewardedAd.createForAdRequest(TestIds.REWARDED, {
    requestNonPersonalizedAdsOnly: true,
  });
}

/**
 * Shows one test rewarded ad and resolves only when EARNED_REWARD fires.
 * Closing or failing the ad never grants access.
 */
export function showTestRewardedAd(): Promise<boolean> {
  if (rewardedRequestActive) {
    return Promise.resolve(false);
  }
  rewardedRequestActive = true;
  return (async () => {
    try {
      // The native SDK can remain pending when a development build has no
      // network/ad callback. Bound initialization as well as the ad itself so
      // callers never leave their modal permanently locked.
      await Promise.race([
        initializeMobileAds(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Rewarded SDK initialization timed out')), REWARDED_OPERATION_TIMEOUT_MS)),
      ]);
    } catch (error) {
      if (__DEV__) {
        if (error instanceof Error && error.message.includes('timed out')) console.log('[Ads] timeout');
        else console.log('[Ads] initialize:error', describeAdError(error));
      }
      rewardedRequestActive = false;
      return false;
    }
    return new Promise<boolean>((resolve) => {
      let rewardedAd: ReturnType<typeof createTestRewardedAd>;
      try {
        rewardedAd = createTestRewardedAd();
      } catch (error) {
        if (__DEV__) console.log('[Ads] show:error', describeAdError(error));
        rewardedRequestActive = false;
        resolve(false);
        return;
      }
      let settled = false;
      let earned = false;
      let unsubscribeLoaded: () => void = () => undefined;
      let unsubscribeReward: () => void = () => undefined;
      let unsubscribeClosed: () => void = () => undefined;
      let unsubscribeError: () => void = () => undefined;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        unsubscribeLoaded();
        unsubscribeReward();
        unsubscribeClosed();
        unsubscribeError();
        rewardedRequestActive = false;
        resolve(value);
      };
      try {
        unsubscribeLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
          if (__DEV__) console.log('[Ads] loaded');
          if (__DEV__) console.log('[Ads] show:start');
          try {
            void rewardedAd.show().catch((error) => {
              if (__DEV__) console.log('[Ads] show:error', describeAdError(error));
              finish(false);
            });
          } catch (error) {
            if (__DEV__) console.log('[Ads] show:error', describeAdError(error));
            finish(false);
          }
        });
        unsubscribeReward = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
          if (__DEV__) console.log('[Ads] earned');
        });
        unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
          if (__DEV__) console.log('[Ads] closed');
          finish(earned);
        });
        unsubscribeError = rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
          if (__DEV__) console.log('[Ads] show:error', describeAdError(error));
          finish(false);
        });
        // A missing native callback must never leave the RN modal blocked.
        timeoutId = setTimeout(() => {
          if (__DEV__) console.log('[Ads] timeout');
          finish(false);
        }, REWARDED_OPERATION_TIMEOUT_MS);
        if (__DEV__) console.log('[Ads] load:start');
        rewardedAd.load();
      } catch (error) {
        if (__DEV__) console.log('[Ads] show:error', describeAdError(error));
        finish(false);
      }
    });
  })();
}
