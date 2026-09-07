import * as Notifications from 'expo-notifications';
import { enqueueNotificationOperation } from './notificationOperationQueue';
import { buildPremiumTrialReminderContent } from './notificationContent';

export const PREMIUM_TRIAL_REMINDER_ID = 'premium-trial-reminder';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Remove the single reminder owned by the Premium trial setting. */
async function cancelPremiumTrialReminderUnsafe(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PREMIUM_TRIAL_REMINDER_ID).catch(() => undefined);
}

export function cancelPremiumTrialReminder(): Promise<void> {
  return enqueueNotificationOperation('premium-trial', cancelPremiumTrialReminderUnsafe);
}

/**
 * Schedule a local reminder one day before the StoreKit-provided trial end.
 * No reminder is created when StoreKit did not provide a trustworthy date or
 * when the date is already too close/past.
 */
export async function schedulePremiumTrialReminder(trialEndAt: number): Promise<boolean> {
  return enqueueNotificationOperation('premium-trial', async () => {
    if (!Number.isFinite(trialEndAt)) {
      await cancelPremiumTrialReminderUnsafe();
      return false;
    }
    const reminderAt = trialEndAt - ONE_DAY_MS;
    if (!Number.isFinite(reminderAt) || reminderAt <= Date.now()) {
      await cancelPremiumTrialReminderUnsafe();
      return false;
    }
    await cancelPremiumTrialReminderUnsafe();
    await Notifications.scheduleNotificationAsync({
      identifier: PREMIUM_TRIAL_REMINDER_ID,
      content: {
        ...buildPremiumTrialReminderContent(),
        data: { kind: 'premium_trial_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminderAt),
      },
    });
    return true;
  });
}
