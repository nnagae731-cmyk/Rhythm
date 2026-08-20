import mobileAds, {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

let initialized = false;

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
  return new Promise((resolve) => {
    const rewardedAd = createTestRewardedAd();
    let settled = false;
    let earned = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      unsubscribeLoaded();
      unsubscribeReward();
      unsubscribeClosed();
      unsubscribeError();
      resolve(value);
    };
    const unsubscribeLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      void rewardedAd.show().catch(() => finish(false));
    });
    const unsubscribeReward = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => finish(earned));
    const unsubscribeError = rewardedAd.addAdEventListener(AdEventType.ERROR, () => finish(false));
    rewardedAd.load();
  });
}
