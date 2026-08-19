import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { getThemeTokens } from '../../theme';
import {
  INTRO_CARDS,
  IntroCard,
  ONBOARDING_DESIGN_MODE,
} from './onboardingSteps';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  showSkip?: boolean;
  finalActionLabel?: string;
};

const theme = getThemeTokens(ONBOARDING_DESIGN_MODE);

const previewContent: Record<
  IntroCard['id'],
  {
    symbol: string;
    main: string;
    sub?: string;
  }
> = {
  quickTodo: {
    symbol: '＋',
    main: '明日15時に美容院',
    sub: '日時を自動で設定',
  },

  today: {
    symbol: '✓',
    main: '今やる　あとで　待ち',
    sub: '今日できたことも確認',
  },

  schedule: {
    symbol: '↗',
    main: '09:00 → 14:00 → 18:30',
    sub: '予定を時間の流れで確認',
  },

  focus: {
    symbol: '◷',
    main: '25:00',
    sub: '今やる1つに集中',
  },

  records: {
    symbol: '▦',
    main: '✓ 3件　▧ 写真',
    sub: '今日のできたことを記録',
  },

  wish: {
    symbol: '✿',
    main: 'テーマ → 叶えたいこと',
    sub: '→ 今日の行動へ',
  },

  customize: {
    symbol: 'Aa',
    main: 'Mono　Design　Photo',
    sub: '自分らしいRhythmに',
  },
};

function IntroPreview({
  card,
}: {
  card: IntroCard;
}) {
  const preview = previewContent[card.id];

  return (
    <View style={styles.preview}>
      <View style={styles.previewSymbol}>
        <Text style={styles.previewSymbolText}>
          {preview.symbol}
        </Text>
      </View>

      <View style={styles.previewContent}>
        <Text style={styles.previewMain}>
          {preview.main}
        </Text>

        {preview.sub ? (
          <Text style={styles.previewSub}>
            {preview.sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function OnboardingCarousel({
  visible,
  onDismiss,
  showSkip = true,
  finalActionLabel = 'Rhythmをはじめる',
}: Props) {
  const { width } = useWindowDimensions();

  const listRef =
    useRef<FlatList<IntroCard>>(null);

  const [index, setIndex] = useState(0);

  const lastIndex = INTRO_CARDS.length - 1;
  const isLast = index === lastIndex;

  useEffect(() => {
    if (!visible) return;

    setIndex(0);

    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: 0,
        animated: false,
      });
    });
  }, [visible]);

  const goNext = () => {
    if (isLast) {
      onDismiss();
      return;
    }

    const nextIndex = Math.min(
      index + 1,
      lastIndex,
    );

    listRef.current?.scrollToIndex({
      index: nextIndex,
      animated: true,
    });

    setIndex(nextIndex);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onDismiss}
    >
      <View style={styles.screen}>
        <View style={styles.top}>
          <Text style={styles.brand}>
            Rhythm
          </Text>

          {showSkip && !isLast ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="使い方をスキップ"
              hitSlop={10}
              onPress={onDismiss}
            >
              <Text style={styles.skip}>
                スキップ
              </Text>
            </Pressable>
          ) : (
            <View style={styles.skipSpacer} />
          )}
        </View>

        <FlatList
          ref={listRef}
          data={INTRO_CARDS}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(
              event.nativeEvent.contentOffset.x /
                width,
            );

            setIndex(
              Math.max(
                0,
                Math.min(
                  nextIndex,
                  lastIndex,
                ),
              ),
            );
          }}
          getItemLayout={(_, itemIndex) => ({
            length: width,
            offset: width * itemIndex,
            index: itemIndex,
          })}
          renderItem={({ item }) => (
            <View
              style={[
                styles.page,
                { width },
              ]}
            >
              <View style={styles.card}>
                <IntroPreview card={item} />

                <Text style={styles.title}>
                  {item.title}
                </Text>

                <Text style={styles.description}>
                  {item.description}
                </Text>

                {item.premiumNote ? (
                  <View style={styles.premiumNote}>
                    <Text
                      style={
                        styles.premiumNoteText
                      }
                    >
                      {item.premiumNote}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        />

        <View style={styles.bottom}>
          <View
            style={styles.dots}
            accessibilityLabel={`${index + 1} / ${INTRO_CARDS.length}`}
          >
            {INTRO_CARDS.map(
              (card, dotIndex) => (
                <View
                  key={card.id}
                  style={[
                    styles.dot,
                    dotIndex === index &&
                      styles.dotActive,
                  ]}
                />
              ),
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isLast
                ? finalActionLabel
                : '次へ'
            }
            style={({ pressed }) => [
              styles.nextButton,
              pressed &&
                styles.nextButtonPressed,
            ]}
            onPress={goNext}
          >
            <Text style={styles.nextButtonText}>
              {isLast
                ? finalActionLabel
                : '次へ'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor:
      theme.colors.screenBackground,
    paddingTop: 22,
  },

  top: {
    minHeight: 54,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: {
    color: theme.colors.primaryText,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  skip: {
    color: theme.colors.secondaryText,
    fontSize: 14,
    fontWeight: '700',
  },

  skipSpacer: {
    width: 70,
  },

  page: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 12,
    justifyContent: 'center',
  },

  card: {
    minHeight: 430,
    backgroundColor:
      theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    padding: 22,
    justifyContent: 'center',
  },

  preview: {
    minHeight: 150,
    borderRadius: theme.radius.large,
    backgroundColor:
      theme.colors.secondarySurface,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },

  previewSymbol: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      theme.colors.softAccent,
    marginBottom: 14,
  },

  previewSymbolText: {
    color: theme.colors.primaryAccent,
    fontSize: 24,
    fontWeight: '900',
  },

  previewContent: {
    alignItems: 'center',
  },

  previewMain: {
    color: theme.colors.primaryText,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  previewSub: {
    color: theme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },

  title: {
    color: theme.colors.primaryText,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
  },

  description: {
    color: theme.colors.secondaryText,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 12,
  },

  premiumNote: {
    alignSelf: 'stretch',
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: theme.radius.small,
    backgroundColor:
      theme.colors.softAccent,
  },

  premiumNoteText: {
    color: theme.colors.primaryAccent,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },

  bottom: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 26,
  },

  dots: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 14,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      theme.colors.border,
  },

  dotActive: {
    width: 20,
    backgroundColor:
      theme.colors.primaryAccent,
  },

  nextButton: {
    minHeight: 52,
    borderRadius: theme.radius.button,
    backgroundColor:
      theme.colors.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  nextButtonPressed: {
    opacity: 0.82,
  },

  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});