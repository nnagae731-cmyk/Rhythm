import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, InteractionManager, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { BehaviorEvent } from '../behaviorEvents';
import { FocusSession } from '../focusSession';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import { DeparturePlan, MonthlyWishState, Task } from '../types';
import { AIShareKind, buildBehaviorAnalysisShareText, buildTodayOptimizationShareText, buildWishProgressShareText } from '../features/aiShare/aiShareText';

type AIShareSheetProps = {
  visible: boolean;
  onClose: () => void;
  initialWishId?: string;
  tasks: Task[];
  departurePlans: DeparturePlan[];
  behaviorEvents: BehaviorEvent[];
  focusSessions: FocusSession[];
  wishState: MonthlyWishState;
  designMode: DesignMode;
  chicPalette?: ChicThemePalette;
};

const choices: Array<{ id: AIShareKind; title: string; description: string }> = [
  { id: 'today', title: '今日のTODOを効率よくしたい', description: '今日のTODO・予定をもとに、無理のない順番を相談します。' },
  { id: 'analysis', title: '最近うまく進まない原因を分析したい', description: '直近30日の記録から、停滞しやすい行動を相談します。' },
  { id: 'wish', title: '叶えたいことの達成方法を考えたい', description: '選んだ目標と行動の進み具合を共有します。' },
];

/**
 * Creates opt-in text locally, then hands it to the system Share Sheet.
 * No network request or AI SDK is involved in this component.
 */
export function AIShareSheet({ visible, onClose, initialWishId, tasks, departurePlans, behaviorEvents, focusSessions, wishState, designMode, chicPalette }: AIShareSheetProps) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isChic = designMode === 'chic' && Boolean(chicPalette);
  const [kind, setKind] = useState<AIShareKind>(initialWishId ? 'wish' : 'today');
  const [wishId, setWishId] = useState<string | undefined>(initialWishId);
  const [sharing, setSharing] = useState(false);
  const pendingShareRef = useRef<{ title: string; message: string } | undefined>(undefined);

  useEffect(() => {
    if (!visible) return;
    setKind(initialWishId ? 'wish' : 'today');
    setWishId(initialWishId ?? wishState.wishes.find((wish) => !wish.completed)?.id ?? wishState.wishes[0]?.id);
  }, [visible, initialWishId, wishState.wishes]);

  const selectedWish = useMemo(() => wishState.wishes.find((wish) => wish.id === wishId), [wishId, wishState.wishes]);
  const accent = isChic && chicPalette ? chicPalette.accent : theme.colors.primaryAccent;
  const textPrimary = isChic && chicPalette ? chicPalette.textPrimary : theme.colors.primaryText;
  const textSecondary = isChic && chicPalette ? chicPalette.textSecondary : theme.colors.secondaryText;
  const surface = isChic && chicPalette ? chicPalette.cardSurface : theme.colors.surface;
  const subtleSurface = isChic && chicPalette ? chicPalette.surfaceSubtle : theme.colors.secondarySurface;
  const border = isChic && chicPalette ? chicPalette.border : theme.colors.border;
  const onAccent = isChic && chicPalette ? chicPalette.onAccent : designMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF';

  const presentPendingShare = () => {
    const pending = pendingShareRef.current;
    pendingShareRef.current = undefined;
    if (!pending) return;
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        void Share.share(pending)
          .catch(() => Alert.alert('共有を開けませんでした', 'もう一度お試しください。'))
          .finally(() => setSharing(false));
      });
    });
  };

  const share = () => {
    if (sharing) return;
    if (kind === 'wish' && !selectedWish) {
      Alert.alert('叶えたいことを選んでください', '共有する目標を1つ選択してください。');
      return;
    }
    const message = kind === 'today'
      ? buildTodayOptimizationShareText({ tasks, departurePlans, behaviorEvents })
      : kind === 'analysis'
        ? buildBehaviorAnalysisShareText({ tasks, behaviorEvents, focusSessions })
        : buildWishProgressShareText({ wish: selectedWish!, state: wishState });
    const title = kind === 'today' ? 'RhythmPace 今日のTODO' : kind === 'analysis' ? 'RhythmPace 行動の記録' : 'RhythmPace 叶えたいこと';
    setSharing(true);
    // Present Share Sheet only after this sheet has dismissed; iOS does not
    // reliably present a second native sheet over an active Modal.
    pendingShareRef.current = { title, message };
    onClose();
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={presentPendingShare}>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="AIに共有を閉じる" />
      <View style={[styles.sheet, { backgroundColor: surface, borderColor: border }]}>
        <View style={[styles.handle, { backgroundColor: border }]} />
        <View style={styles.header}><View style={styles.headerCopy}><Text style={[styles.title, { color: textPrimary }]}>AIに共有</Text><Text style={[styles.subtitle, { color: textSecondary }]}>内容を作成してから、共有先を選びます</Text></View><Pressable accessibilityRole="button" onPress={onClose} hitSlop={10}><Text style={[styles.close, { color: accent }]}>閉じる</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.notice, { color: textSecondary, borderColor: border, backgroundColor: subtleSurface }]}>RhythmPaceがAIへ自動送信することはありません。共有先はこのあとiPhoneの共有画面で選択します。</Text>
          <View style={styles.choiceList}>{choices.map((choice) => {
            const selected = kind === choice.id;
            return <Pressable key={choice.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setKind(choice.id)} style={[styles.choice, { borderColor: selected ? accent : border, backgroundColor: selected ? subtleSurface : surface }]}><View style={styles.choiceCopy}><Text style={[styles.choiceTitle, { color: selected ? accent : textPrimary }]}>{choice.title}</Text><Text style={[styles.choiceDescription, { color: textSecondary }]}>{choice.description}</Text></View><Text style={[styles.choiceMark, { color: selected ? accent : textSecondary }]}>{selected ? '✓' : '○'}</Text></Pressable>;
          })}</View>
          {kind === 'wish' && <View style={[styles.wishPicker, { borderColor: border }]}><Text style={[styles.wishPickerTitle, { color: textPrimary }]}>共有する叶えたいこと</Text>{wishState.wishes.length ? <View style={styles.wishList}>{wishState.wishes.map((wish) => <Pressable key={wish.id} accessibilityRole="radio" accessibilityState={{ selected: wish.id === wishId }} onPress={() => setWishId(wish.id)} style={[styles.wishOption, { borderColor: wish.id === wishId ? accent : border, backgroundColor: wish.id === wishId ? subtleSurface : surface }]}><Text numberOfLines={1} style={[styles.wishOptionText, { color: wish.id === wishId ? accent : textPrimary }]}>{wish.title}</Text><Text style={[styles.wishOptionMark, { color: wish.id === wishId ? accent : textSecondary }]}>{wish.id === wishId ? '✓' : '○'}</Text></Pressable>)}</View> : <Text style={[styles.emptyWish, { color: textSecondary }]}>共有できる「叶えたいこと」がまだありません。</Text>}</View>}
        </ScrollView>
        <Pressable accessibilityRole="button" disabled={sharing || (kind === 'wish' && !selectedWish)} onPress={share} style={[styles.shareButton, { backgroundColor: sharing || (kind === 'wish' && !selectedWish) ? border : accent }]}><Text style={[styles.shareButtonText, { color: onAccent }]}>{sharing ? '共有を準備中…' : '共有内容を生成して開く'}</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 12, 20, 0.5)' },
  sheet: { maxHeight: '92%', borderTopWidth: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 32, gap: 13 },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 2 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1 },
  title: { fontSize: 20, fontWeight: '900' },
  subtitle: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  close: { fontSize: 13, fontWeight: '900', paddingVertical: 4 },
  content: { gap: 13, paddingBottom: 2 },
  notice: { borderWidth: 1, borderRadius: 12, padding: 10, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  choiceList: { gap: 8 },
  choice: { minHeight: 65, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  choiceCopy: { flex: 1 },
  choiceTitle: { fontSize: 13, fontWeight: '900' },
  choiceDescription: { fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 3 },
  choiceMark: { fontSize: 17, fontWeight: '900' },
  wishPicker: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
  wishPickerTitle: { fontSize: 12, fontWeight: '900' },
  wishList: { gap: 7 },
  wishOption: { minHeight: 38, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  wishOptionText: { flex: 1, fontSize: 12, fontWeight: '800' },
  wishOptionMark: { fontSize: 14, fontWeight: '900' },
  emptyWish: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
  shareButton: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  shareButtonText: { fontSize: 14, fontWeight: '900' },
});
