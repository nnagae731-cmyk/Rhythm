import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { getThemeTokens } from '../../theme';
import type { ChicThemePalette, DesignMode } from '../../theme';
import {
  INTRO_CARDS,
  IntroCard,
  ONBOARDING_DESIGN_MODE,
} from './onboardingSteps';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /** The final CTA opens the real design selector instead of ending on Today. */
  onFinalAction?: () => void;
  /** Production screen renderer used by the app and Capture Studio. */
  renderStep?: (id: IntroCard['id']) => React.ReactNode;
  showSkip?: boolean;
  finalActionLabel?: string;
  designMode?: DesignMode;
  chicPalette?: ChicThemePalette;
};

const theme = getThemeTokens(ONBOARDING_DESIGN_MODE);

function IntroPreview({
  card,
}: {
  card: IntroCard;
}) {
  return (
    <View style={styles.preview}>
      <Text style={styles.previewHeader}>{card.id === 'quickTodo' ? 'やること追加' : card.id === 'voice' ? '音声入力' : card.id === 'today' ? '今日' : card.id === 'schedule' ? '予定' : card.id === 'focus' ? '集中' : card.id === 'recovery' ? '立て直し' : '記録'}</Text>
      {card.id === 'quickTodo' && <><View style={styles.previewInput}><Text style={styles.previewInputText}>明日15時に美容院</Text><Text style={styles.previewInputHint}>日時を読み取りました</Text></View><View style={styles.previewButton}><Text style={styles.previewButtonText}>追加する</Text></View></>}
      {card.id === 'voice' && <><View style={styles.previewVoice}><Text style={styles.previewVoiceMic}>◉</Text><Text style={styles.previewVoiceStatus}>話しかけてください</Text></View><View style={styles.previewInput}><Text style={styles.previewInputText}>明日の18時に美容院</Text><Text style={styles.previewInputHint}>予定として整理します</Text></View></>}
      {card.id === 'today' && <><View style={styles.previewHero}><Text style={styles.previewLabel}>今はこれ</Text><Text style={styles.previewTask}>資料をまとめる</Text><Text style={styles.previewMeta}>完了 2　残り 1</Text></View><View style={styles.previewTabs}><Text style={styles.previewTabActive}>今やる 1</Text><Text style={styles.previewTab}>あとで 2</Text><Text style={styles.previewTab}>待ち 0</Text></View></>}
      {card.id === 'schedule' && <View style={styles.previewTimeline}>{[['09:00', '朝会'], ['14:00', '資料提出'], ['18:30', '帰宅']].map(([time, title]) => <View key={time} style={styles.previewTimelineRow}><Text style={styles.previewTime}>{time}</Text><View style={styles.previewTimelineCard}><Text style={styles.previewTimelineTitle}>{title}</Text><Text style={styles.previewTimelineMeta}>予定表の予定</Text></View></View>)}</View>}
      {card.id === 'focus' && <><View style={styles.previewFocus}><Text style={styles.previewFocusTime}>25:00</Text><Text style={styles.previewFocusTask}>資料をまとめる</Text><View style={styles.previewButton}><Text style={styles.previewButtonText}>スタート</Text></View></View></>}
      {card.id === 'recovery' && <View style={styles.previewRecovery}><Text style={styles.previewLabel}>予定が崩れても</Text><Text style={styles.previewRecoveryTitle}>ここから立て直す</Text><Text style={styles.previewRecoveryText}>今の状況から、次にできることを選べます。</Text><View style={styles.previewRecoveryActions}><Text style={styles.previewRecoveryAction}>今から出発</Text><Text style={styles.previewRecoveryAction}>予定を変更</Text><Text style={styles.previewRecoveryAction}>連絡する</Text></View></View>}
      {card.id === 'records' && <><View style={styles.previewCalendar}><Text style={styles.previewCalendarTitle}>2026年 8月</Text><View style={styles.previewCalendarRow}>{['18', '19', '20', '21', '22', '23'].map((day) => <Text key={day} style={day === '23' ? styles.previewCalendarDayActive : styles.previewCalendarDay}>{day}</Text>)}</View></View><View style={styles.previewRecord}><Text style={styles.previewRecordTitle}>今日できたこと</Text><Text style={styles.previewRecordText}>写真・ひとこと・メモ</Text></View></>}
    </View>
  );
}

/**
 * Fits a production screen preview into the intro card without changing the
 * production screen's layout or clipping its content before it is measured.
 */
function OnboardingPreviewViewport({ children, colors }: { children: React.ReactNode; colors: { surface: string; border: string } }) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [canvas, setCanvas] = useState({ width: 0, height: 0 });
  const availableWidth = Math.max(0, viewport.width - 16);
  const availableHeight = Math.max(0, viewport.height - 16);
  const scale = canvas.width > 0 && canvas.height > 0 && availableWidth > 0 && availableHeight > 0
    ? Math.min(1, availableWidth / canvas.width, availableHeight / canvas.height)
    : 1;
  const scaledWidth = canvas.width > 0 ? canvas.width * scale : undefined;
  const scaledHeight = canvas.height > 0 ? canvas.height * scale : undefined;

  return (
    <View
      style={[styles.productionPreviewViewport, { backgroundColor: colors.surface, borderColor: colors.border }]}
      pointerEvents="none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width !== viewport.width || height !== viewport.height) setViewport({ width, height });
      }}
    >
      <View style={styles.productionPreviewViewportContent}>
        <View style={{ width: scaledWidth ?? '100%', height: scaledHeight ?? '100%', alignItems: 'center', justifyContent: 'center' }}>
          <View
            collapsable={false}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              if (width !== canvas.width || height !== canvas.height) setCanvas({ width, height });
            }}
            style={{ width: canvas.width || '100%', transform: [{ scale }] }}
          >
            {children}
          </View>
        </View>
      </View>
    </View>
  );
}

export function OnboardingCarousel({
  visible,
  onDismiss,
  onFinalAction,
  renderStep,
  showSkip = true,
  finalActionLabel = 'デザインを選ぶ',
  designMode = ONBOARDING_DESIGN_MODE,
  chicPalette,
}: Props) {
  const { width } = useWindowDimensions();
  const appearance = designMode === 'chic' && chicPalette
    ? { screenBackground: chicPalette.background, surface: chicPalette.cardSurface, secondarySurface: chicPalette.cardTint, primaryText: chicPalette.textPrimary, secondaryText: chicPalette.textSecondary, primaryAccent: chicPalette.accent, border: chicPalette.border, onAccent: chicPalette.onAccent }
    : { ...getThemeTokens(designMode).colors, onAccent: designMode === 'dark' ? getThemeTokens(designMode).colors.screenBackground : '#FFFFFF' };

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
      (onFinalAction ?? onDismiss)();
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
      <SafeAreaView style={[styles.screen, { backgroundColor: appearance.screenBackground }]}>
        <View style={styles.top}>
          <Text style={[styles.brand, { color: appearance.primaryText }]}>
            Rhythm
          </Text>

          {showSkip && !isLast ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="使い方をスキップ"
              hitSlop={10}
              style={[styles.skipButton, { backgroundColor: appearance.secondarySurface }]}
              onPress={onDismiss}
            >
              <Text style={[styles.skip, { color: appearance.secondaryText }]}>
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
              <View style={[styles.card, { backgroundColor: appearance.surface, borderColor: appearance.border }]}>
                {renderStep ? <View style={styles.productionPreview}><OnboardingPreviewViewport colors={{ surface: appearance.surface, border: appearance.border }}>{renderStep(item.id)}</OnboardingPreviewViewport></View> : <IntroPreview card={item} />}

                <Text style={[styles.title, { color: appearance.primaryText }]}>
                  {item.title}
                </Text>

                <Text style={[styles.description, { color: appearance.secondaryText }]}>
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
                    { backgroundColor: appearance.border },
                    dotIndex === index && { width: 20, backgroundColor: appearance.primaryAccent },
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
              { backgroundColor: appearance.primaryAccent },
              pressed &&
                styles.nextButtonPressed,
            ]}
            onPress={goNext}
          >
            <Text style={[styles.nextButtonText, { color: appearance.onAccent }]}>
              {isLast
                ? finalActionLabel
                : '次へ'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor:
      theme.colors.screenBackground,
  },

  top: {
    minHeight: 54,
    paddingHorizontal: 18,
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

  skipButton: {
    width: 68,
    height: 46,
    borderRadius: 12,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 10,
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
    minHeight: 190,
    borderRadius: theme.radius.large,
    backgroundColor:
      theme.colors.secondarySurface,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'stretch',
    marginBottom: 28,
  },

  productionPreview: {
    width: '100%',
    marginBottom: 12,
  },

  productionPreviewViewport: {
    width: '100%',
    height: 320,
    minHeight: 240,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },

  productionPreviewViewportContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewHeader: { color: theme.colors.primaryText, fontSize: 13, fontWeight: '900', marginBottom: 10 },
  previewInput: { minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 9 },
  previewInputText: { color: theme.colors.primaryText, fontSize: 13, fontWeight: '800' },
  previewInputHint: { color: theme.colors.secondaryText, fontSize: 10, marginTop: 4 },
  previewVoice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, padding: 10, borderRadius: 12, backgroundColor: theme.colors.softAccent },
  previewVoiceMic: { width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, color: theme.colors.primaryAccent, fontSize: 16, fontWeight: '900' },
  previewVoiceStatus: { color: theme.colors.primaryText, fontSize: 11, fontWeight: '800' },
  previewButton: { minHeight: 34, marginTop: 10, borderRadius: 10, backgroundColor: theme.colors.primaryAccent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  previewButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  previewHero: { borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 12 },
  previewLabel: { color: theme.colors.secondaryText, fontSize: 10, fontWeight: '800' },
  previewTask: { color: theme.colors.primaryText, fontSize: 17, fontWeight: '900', marginTop: 5 },
  previewMeta: { color: theme.colors.secondaryText, fontSize: 11, marginTop: 9 },
  previewTabs: { flexDirection: 'row', gap: 6, marginTop: 9 },
  previewTab: { flex: 1, borderRadius: 9, borderWidth: 1, borderColor: theme.colors.border, color: theme.colors.secondaryText, fontSize: 10, paddingVertical: 7, textAlign: 'center' },
  previewTabActive: { flex: 1, borderRadius: 9, borderWidth: 1, borderColor: theme.colors.primaryAccent, backgroundColor: theme.colors.softAccent, color: theme.colors.primaryAccent, fontSize: 10, fontWeight: '800', paddingVertical: 7, textAlign: 'center' },
  previewTimeline: { gap: 6 },
  previewTimelineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewTime: { width: 42, color: theme.colors.secondaryText, fontSize: 10, fontWeight: '800' },
  previewTimelineCard: { flex: 1, borderLeftWidth: 3, borderLeftColor: theme.colors.primaryAccent, borderRadius: 9, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 10, paddingVertical: 7 },
  previewTimelineTitle: { color: theme.colors.primaryText, fontSize: 12, fontWeight: '800' },
  previewTimelineMeta: { color: theme.colors.secondaryText, fontSize: 9, marginTop: 2 },
  previewFocus: { alignItems: 'center', borderRadius: 15, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 13 },
  previewFocusTime: { color: theme.colors.primaryText, fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  previewFocusTask: { color: theme.colors.secondaryText, fontSize: 11, marginTop: 2 },
  previewRecovery: { borderRadius: 15, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 14 },
  previewRecoveryTitle: { color: theme.colors.primaryText, fontSize: 18, fontWeight: '900', marginTop: 5 },
  previewRecoveryText: { color: theme.colors.secondaryText, fontSize: 11, lineHeight: 17, marginTop: 7 },
  previewRecoveryActions: { flexDirection: 'row', gap: 6, marginTop: 12 },
  previewRecoveryAction: { flex: 1, borderRadius: 9, borderWidth: 1, borderColor: theme.colors.border, color: theme.colors.primaryAccent, fontSize: 10, fontWeight: '800', paddingVertical: 8, textAlign: 'center' },
  previewCalendar: { borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 11 },
  previewCalendarTitle: { color: theme.colors.primaryText, fontSize: 12, fontWeight: '900' },
  previewCalendarRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  previewCalendarDay: { color: theme.colors.secondaryText, fontSize: 11, padding: 4 },
  previewCalendarDayActive: { color: '#FFFFFF', backgroundColor: theme.colors.primaryAccent, borderRadius: 9, fontSize: 11, padding: 4 },
  previewRecord: { borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 10, marginTop: 8 },
  previewRecordTitle: { color: theme.colors.primaryText, fontSize: 12, fontWeight: '900' },
  previewRecordText: { color: theme.colors.secondaryText, fontSize: 10, marginTop: 4 },
  previewWish: { borderRadius: 11, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 10, marginBottom: 7 },
  previewWishLocked: { borderRadius: 11, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.secondarySurface, padding: 10, marginBottom: 7 },
  previewWishTitle: { color: theme.colors.primaryText, fontSize: 13, fontWeight: '900', marginTop: 4 },
  previewWishMeta: { color: theme.colors.secondaryText, fontSize: 10, marginTop: 5 },
  previewDesignOptions: { flexDirection: 'row', gap: 6 },
  previewDesignOption: { flex: 1, minHeight: 58, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  previewDesignOptionActive: { borderColor: theme.colors.primaryAccent, backgroundColor: theme.colors.softAccent },
  previewDesignText: { color: theme.colors.primaryText, fontSize: 11, fontWeight: '800' },

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
