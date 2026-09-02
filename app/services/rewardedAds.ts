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
      await initializeMobileAds();
    } catch {
      rewardedRequestActive = false;
      return false;
    }
    return new Promise<boolean>((resolve) => {
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
        // A missing native callback must never leave the RN modal blocked.
        timeoutId = setTimeout(() => finish(false), 15_000);
        rewardedAd.load();
      } catch {
        finish(false);
      }
    });
  })();
}
