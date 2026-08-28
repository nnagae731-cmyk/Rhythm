import React from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../../theme';
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

  /** First-run tour control. It marks the current guide as seen without
   * requiring the feature's real operation. */
  onNext?: () => void;
  nextLabel?: string;
  /** Ends the current first-run/Premium tour without changing the UI flow. */
  onExitTour?: () => void;

  /**
   * onboardingSteps.ts の actionLabel を
   * 画面ごとに一時的に変えたい場合だけ指定する。
   */
  actionLabel?: string;
  /** Current persisted/effective design; the GUIDE must follow it. */
  designMode?: DesignMode;
  chicPalette?: ChicThemePalette;
  /** Development-only inline rendering for Capture Studio review. */
  inline?: boolean;
  /** Short label for the real UI control highlighted by this guide. */
  targetLabel?: string;
};

const theme = getThemeTokens(
  ONBOARDING_DESIGN_MODE,
);

export function OnboardingHint({
  featureId,
  visible = true,
  onDismiss,
  onAction,
  onNext,
  nextLabel = '次へ',
  onExitTour,
  actionLabel,
  designMode = ONBOARDING_DESIGN_MODE,
  chicPalette,
  inline = false,
  targetLabel,
}: Props) {
  const [open, setOpen] = React.useState(visible);
  const pulse = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => setOpen(visible), [visible]);
  React.useEffect(() => {
    if (!targetLabel) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, targetLabel]);
  if (!visible || !open) return null;

  const step = getOnboardingStep(featureId);
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const colors = designMode === 'chic' && chicPalette ? {
    surface: chicPalette.cardSurface,
    border: chicPalette.border,
    text: chicPalette.textPrimary,
    muted: chicPalette.textSecondary,
    accent: chicPalette.accent,
    soft: chicPalette.accentSoft,
  } : {
    surface: theme.colors.surface,
    border: theme.colors.border,
    text: theme.colors.primaryText,
    muted: theme.colors.secondaryText,
    accent: theme.colors.primaryAccent,
    soft: theme.colors.softAccent,
  };
  const buttonLabel =
    actionLabel ?? step.actionLabel;

  const dismiss = () => { setOpen(false); onDismiss?.(); };
  const action = () => { setOpen(false); onAction?.(); };
  const next = () => { setOpen(false); onNext?.(); };
  const card = <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole="summary">
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { color: colors.accent }]}>
            GUIDE
          </Text>
        </View>

        <Pressable
            accessibilityRole="button"
            accessibilityLabel="案内を閉じる"
            hitSlop={10}
            onPress={dismiss}
            style={({ pressed }) => [
              styles.closeButton,
              pressed &&
                styles.closeButtonPressed,
            ]}
          >
            <Text style={[styles.closeText, { color: colors.muted }]}>
              ×
            </Text>
          </Pressable>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        {step.title}
      </Text>

      <Text style={[styles.description, { color: colors.muted }]}>
        {step.description}
      </Text>

      {onAction && buttonLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          onPress={action}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.accent },
            pressed &&
              styles.actionButtonPressed,
          ]}
        >
          <Text style={styles.actionText}>
            {buttonLabel}
          </Text>
      </Pressable>
      ) : null}
      {onNext ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          onPress={next}
          style={({ pressed }) => [
            styles.nextButton,
            { borderColor: colors.border },
            pressed && styles.actionButtonPressed,
          ]}
        >
          <Text style={[styles.nextText, { color: colors.accent }]}>{nextLabel}</Text>
        </Pressable>
      ) : null}
      {onExitTour ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="GUIDEを終了"
          onPress={() => { setOpen(false); onExitTour(); }}
          style={styles.exitTourButton}
        >
          <Text style={[styles.exitTourText, { color: colors.muted }]}>GUIDEを終了</Text>
        </Pressable>
      ) : null}
      </View>;
  const targetHint = targetLabel ? <Animated.View pointerEvents="none" style={[styles.targetHint, { borderColor: colors.accent, backgroundColor: colors.soft, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }] }]}><Text style={[styles.targetHintText, { color: colors.accent }]}>ここをタップ · {targetLabel}</Text></Animated.View> : null;
  if (inline) return <View style={styles.inlineWrap}>{targetHint}{card}</View>;
  return <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
    <Pressable style={styles.backdrop} onPress={dismiss}>
      <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>{card}</Pressable>
    </Pressable>
  </Modal>;
}

const styles = StyleSheet.create({
  inlineWrap: { marginTop: 10 },
  targetHint: { alignSelf: 'flex-start', marginBottom: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  targetHintText: { fontSize: 11, fontWeight: '800' },
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

  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(23, 24, 28, 0.18)',
    paddingHorizontal: 14,
    paddingBottom: 18,
  },

  sheet: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
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

  nextButton: {
    minHeight: 44,
    marginTop: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.button,
    borderWidth: 1,
  },

  nextText: {
    fontSize: 13,
    fontWeight: '800',
  },

  exitTourButton: {
    alignSelf: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  exitTourText: {
    fontSize: 11,
    fontWeight: '700',
  },

  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
