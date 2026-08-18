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