import * as Notifications from 'expo-notifications';

export const PREMIUM_TRIAL_REMINDER_ID = 'premium-trial-reminder';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Remove the single reminder owned by the Premium trial setting. */
export async function cancelPremiumTrialReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PREMIUM_TRIAL_REMINDER_ID).catch(() => undefined);
}

/**
 * Schedule a local reminder one day before the StoreKit-provided trial end.
 * No reminder is created when StoreKit did not provide a trustworthy date or
 * when the date is already too close/past.
 */
export async function schedulePremiumTrialReminder(trialEndAt: number): Promise<boolean> {
  if (!Number.isFinite(trialEndAt)) {
    await cancelPremiumTrialReminder();
    return false;
  }
  const reminderAt = trialEndAt - ONE_DAY_MS;
  if (!Number.isFinite(reminderAt) || reminderAt <= Date.now()) {
    await cancelPremiumTrialReminder();
    return false;
  }
  await cancelPremiumTrialReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: PREMIUM_TRIAL_REMINDER_ID,
    content: {
      title: 'Premiumの無料期間は明日までです',
      body: '継続・解約状況はApp Storeで確認できます。',
      data: { kind: 'premium_trial_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminderAt),
    },
  });
  return true;
}
