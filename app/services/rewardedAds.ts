import mobileAds, {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

let initialized = false;
let rewardedRequestActive = false;

export async function initializeMobileAds() {
  if (initialized) {
    return;
  }

  await mobileAds().initialize();
  initialized = true;

  console.log('[Ads] Google Mobile Ads initialized');
}

export function createTestRewardedAd() {
  return RewardedAd.createForAdRequest(TestIds.REWARDED, {
    requestNonPersonalizedAdsOnly: true,
  });
}

export function loadTestRewardedAd() {
  const rewardedAd = createTestRewardedAd();

  let earnedReward = false;

  const unsubscribeLoaded = rewardedAd.addAdEventListener(
    RewardedAdEventType.LOADED,
    () => {
      console.log('[Ads] Rewarded test ad loaded');
    },
  );

  const unsubscribeReward = rewardedAd.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    reward => {
      earnedReward = true;
      console.log('[Ads] Reward earned', reward);
    },
  );

  const unsubscribeClosed = rewardedAd.addAdEventListener(
    AdEventType.CLOSED,
    () => {
      console.log(
        earnedReward
          ? '[Ads] Ad closed after reward'
          : '[Ads] Ad closed without reward',
      );
    },
  );

  const unsubscribeError = rewardedAd.addAdEventListener(
    AdEventType.ERROR,
    error => {
      console.log('[Ads] Rewarded ad error', error);
    },
  );

  rewardedAd.load();

  return {
    rewardedAd,
    cleanup: () => {
      unsubscribeLoaded();
      unsubscribeReward();
      unsubscribeClosed();
      unsubscribeError();
    },
  };
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
  return new Promise((resolve) => {
    let rewardedAd: ReturnType<typeof createTestRewardedAd>;
    try {
      rewardedAd = createTestRewardedAd();
    } catch {
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
        void rewardedAd.show().catch(() => finish(false));
      });
      unsubscribeReward = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => finish(earned));
      unsubscribeError = rewardedAd.addAdEventListener(AdEventType.ERROR, () => finish(false));
      timeoutId = setTimeout(() => finish(false), 30_000);
      rewardedAd.load();
    } catch {
      finish(false);
    }
  });
}
