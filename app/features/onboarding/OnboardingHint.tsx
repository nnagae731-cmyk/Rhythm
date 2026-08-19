import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getThemeTokens } from '../../theme';
import {
  getOnboardingStep,
  OnboardingFeatureId,
  ONBOARDING_DESIGN_MODE,
} from './onboardingSteps';

type HintFeatureId = Exclude<
  OnboardingFeatureId,
  'intro'
>;

type Props = {
  featureId: HintFeatureId;
  visible?: boolean;

  /**
   * 「×」を押した時の処理。
   * 閉じることと「案内完了」は別なので、
   * このコンポーネント内では保存状態を変更しない。
   */
  onDismiss?: () => void;

  /**
   * 実際の操作へ進ませたい時だけ指定する。
   * 例：予定を追加、集中を始める、写真を追加。
   */
  onAction?: () => void;

  /**
   * onboardingSteps.ts の actionLabel を
   * 画面ごとに一時的に変えたい場合だけ指定する。
   */
  actionLabel?: string;
};

const theme = getThemeTokens(
  ONBOARDING_DESIGN_MODE,
);

export function OnboardingHint({
  featureId,
  visible = true,
  onDismiss,
  onAction,
  actionLabel,
}: Props) {
  if (!visible) {
    return null;
  }

  const step = getOnboardingStep(featureId);
  const buttonLabel =
    actionLabel ?? step.actionLabel;

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
    >
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            GUIDE
          </Text>
        </View>

        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="案内を閉じる"
            hitSlop={10}
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.closeButton,
              pressed &&
                styles.closeButtonPressed,
            ]}
          >
            <Text style={styles.closeText}>
              ×
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.title}>
        {step.title}
      </Text>

      <Text style={styles.description}>
        {step.description}
      </Text>

      {onAction && buttonLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          onPress={onAction}
          style={({ pressed }) => [
            styles.actionButton,
            pressed &&
              styles.actionButtonPressed,
          ]}
        >
          <Text style={styles.actionText}>
            {buttonLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor:
      theme.colors.surface,
    borderWidth: 1,
    borderColor:
      theme.colors.border,
    borderRadius:
      theme.radius.large,
    padding: 16,
  },

  topRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius:
      theme.radius.chip,
    backgroundColor:
      theme.colors.softAccent,
  },

  badgeText: {
    color:
      theme.colors.primaryAccent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },

  closeButtonPressed: {
    backgroundColor:
      theme.colors.secondarySurface,
  },

  closeText: {
    color:
      theme.colors.secondaryText,
    fontSize: 21,
    lineHeight: 23,
  },

  title: {
    color:
      theme.colors.primaryText,
    fontSize: 17,
    fontWeight: '800',
  },

  description: {
    color:
      theme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },

  actionButton: {
    minHeight: 44,
    marginTop: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius:
      theme.radius.button,
    backgroundColor:
      theme.colors.primaryAccent,
  },

  actionButtonPressed: {
    opacity: 0.82,
  },

  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});