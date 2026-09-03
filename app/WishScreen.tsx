import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ChicPattern, ChicThemePalette, DesignMode, getThemeTokens } from './theme';
import { Affirmation, AffirmationCustomText, MonthlyWishState, Wish, WishAction, WishMonthMap, WishTopImageTitlePosition } from './types';
import { PlanTier } from './premiumAccess';
import { PremiumGuideFeatureId } from './premiumGuide';
import { calculateWishProgress, wishMonthKey } from './features/wish/wishUtils';
import { RewardedAccessModal, RewardedAccessResult } from './components/RewardedAccessModal';
import { AffirmationSettingsCard } from './components/AffirmationSettingsCard';

type WishScreenProps = {
  designMode: DesignMode;
  chicPattern: ChicPattern;
  chicPalette?: ChicThemePalette;
  monthLabel: string;
  state: MonthlyWishState;
  wishMonths?: WishMonthMap;
  onSaveState: (updater: (current: MonthlyWishState) => MonthlyWishState) => void;
  onCreateTaskFromAction?: (action: WishAction) => void;
  canCreateWish?: boolean;
  wishRewardProgress?: { current: number; required: number };
  onRequestWishReward?: () => Promise<RewardedAccessResult> | RewardedAccessResult;
  onWishCreated?: () => void;
  wishActionRewardProgress?: { current: number; required: number };
  onRequestWishActionReward?: () => Promise<RewardedAccessResult> | RewardedAccessResult;
  onWishActionCreated?: () => void;
  affirmations: Affirmation[];
  affirmationCustomTexts: AffirmationCustomText[];
  planTier: PlanTier;
  onSaveAffirmation: (affirmation: Affirmation) => Promise<void> | void;
  onDeleteAffirmation: (affirmation: Affirmation) => Promise<void> | void;
  onSaveAffirmationCustomText: (text: AffirmationCustomText) => void;
  onDeleteAffirmationCustomText: (id: string) => void;
  canCreateWishAction?: boolean;
  topImageUri?: string;
  onPickTopImage?: () => void;
  initialEditor?: { mode: EditorMode; title: string; wishId?: string };
  onPremium?: (featureId?: PremiumGuideFeatureId) => void;
};

type EditorMode = 'wish' | 'action';

type EditorState = {
  visible: boolean;
  mode: EditorMode;
  id?: string;
  title: string;
  wishId?: string;
  completed: boolean;
};

const emptyEditor: EditorState = {
  visible: false,
  mode: 'wish',
  id: undefined,
  title: '',
  wishId: undefined,
  completed: false,
};

function patternSymbol(pattern: ChicPattern) {
  if (pattern === 'dot') return '✦';
  if (pattern === 'checkLavenderSatin') return '▦';
  if (pattern === 'checkBeigeNoir') return '▩';
  if (pattern === 'checkMauveFrame') return '❖';
  return '✿';
}

function formatHistoryMonth(monthKey: string) {
  const match = /^(\d{4})-(\d{1,2})$/.exec(monthKey);
  return match ? `${match[1]}年${Number(match[2])}月` : monthKey;
}

function formatHistoryDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.getMonth() + 1}/${date.getDate()} 完了`;
}

export function WishScreen({ designMode: rawDesignMode, chicPalette, monthLabel, state, wishMonths = {}, onSaveState, onCreateTaskFromAction, canCreateWish = true, wishRewardProgress, onRequestWishReward, onWishCreated, wishActionRewardProgress, onRequestWishActionReward, onWishActionCreated, affirmations, affirmationCustomTexts, planTier, onSaveAffirmation, onDeleteAffirmation, onSaveAffirmationCustomText, onDeleteAffirmationCustomText, canCreateWishAction = true, topImageUri, onPickTopImage, initialEditor, onPremium }: WishScreenProps) {
  // Mono DarkはMono Lightと同じレイアウトを使い、色だけを反転する。
  const isDark = rawDesignMode === 'dark';
  const theme = getThemeTokens(rawDesignMode, chicPalette?.id ?? 'cool');
  const palette = chicPalette;
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [rewardPrompt, setRewardPrompt] = useState<'wish' | 'wishAction' | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMonthKey, setHistoryMonthKey] = useState<string>();
  const [heroMenuOpen, setHeroMenuOpen] = useState(false);
  const [selectedWishIndex, setSelectedWishIndex] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  // The outer app content and this screen's own scroll inset together leave
  // roughly 76px outside the pager. Keep the pager inside that effective
  // width so the selected card is never clipped while the next Wish peeks in.
  const wishPagerWidth = Math.max(220, windowWidth - 76);
  const wishCardGap = 12;
  const wishCardWidth = Math.max(220, Math.round(wishPagerWidth * 0.9));
  const wishSnapInterval = wishCardWidth + wishCardGap;

  useEffect(() => {
    setSelectedWishIndex((current) => Math.min(current, Math.max(0, state.wishes.length - 1)));
  }, [state.wishes.length]);

  useEffect(() => {
    if (!initialEditor) return;
    setEditor({ visible: true, mode: initialEditor.mode, title: initialEditor.title, wishId: initialEditor.wishId, completed: false });
  }, [initialEditor]);

  const commit = (updater: (current: MonthlyWishState) => MonthlyWishState) => {
    onSaveState(updater);
  };

  const openWishEditor = (wish?: Wish) => {
    if (!wish && !canCreateWish) {
      setRewardPrompt('wish');
      return;
    }
    setEditor({
      visible: true,
      mode: 'wish',
      id: wish?.id,
      title: wish?.title ?? '',
      wishId: undefined,
      completed: wish?.completed ?? false,
    });
  };

  const openActionEditor = (action?: WishAction, wishId = selectedWish?.id) => {
    if (!canCreateWishAction && !action) {
      setRewardPrompt('wishAction');
      return;
    }
    setEditor({
      visible: true,
      mode: 'action',
      id: action?.id,
      title: action?.title ?? '',
      wishId: action?.wishId ?? wishId ?? state.wishes[0]?.id,
      completed: action?.completed ?? false,
    });
  };

  const saveEditor = () => {
    const title = editor.title.trim();
    if (!title) return;
    const isEditing = Boolean(editor.id);

    if (editor.mode === 'wish') {
      const wish: Wish = {
        id: editor.id ?? `${Date.now()}-wish`,
        title,
        completed: editor.completed,
        createdAt: editor.id ? state.wishes.find((item) => item.id === editor.id)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
        completedAt: editor.completed ? state.wishes.find((item) => item.id === editor.id)?.completedAt ?? new Date().toISOString() : undefined,
      };
      commit((current) => {
        const isNewWish = !current.wishes.some((item) => item.id === wish.id);
        const wishes = isNewWish ? [wish, ...current.wishes] : current.wishes.map((item) => (item.id === wish.id ? wish : item));
        // Keep the currently displayed top Wish stable when a new Wish is
        // inserted. Older months without an id pin their existing first Wish.
        const topWishId = current.topWishId ?? current.wishes[0]?.id ?? wish.id;
        return { ...current, wishes, topWishId };
      });
      if (!isEditing) onWishCreated?.();
    } else {
      if (!editor.wishId) {
        Alert.alert('先にWishを1つ選んでね');
        return;
      }
      const action: WishAction = {
        id: editor.id ?? `${Date.now()}-action`,
        wishId: editor.wishId,
        title,
        completed: editor.completed,
        completedAt: editor.completed ? state.actions.find((item) => item.id === editor.id)?.completedAt ?? new Date().toISOString() : undefined,
      };
      commit((current) => ({
        ...current,
        actions: current.actions.some((item) => item.id === action.id)
          ? current.actions.map((item) => (item.id === action.id ? action : item))
        : [action, ...current.actions],
      }));
      if (!isEditing) onWishActionCreated?.();
    }

    // Saving either a new item or an edit finishes the current operation.
    // A new item can be added again from the compact add row when needed.
    setEditor(emptyEditor);
    Keyboard.dismiss();
    Alert.alert('保存しました', editor.mode === 'wish' ? '叶えたいことを保存しました。' : '叶えるための行動を保存しました。');
  };

  const createTaskFromActionEditor = () => {
    if (!onCreateTaskFromAction) return;
    const title = editor.title.trim();
    const savedAction = editor.id ? actions.find((item) => item.id === editor.id) : undefined;
    if (!savedAction) {
      Alert.alert('先に行動を保存してね', '保存した行動からToDoを作成できます。');
      return;
    }
    onCreateTaskFromAction({ ...savedAction, title: title || savedAction.title });
  };

  const toggleWish = (id: string) => {
    commit((current) => ({
      ...current,
      wishes: current.wishes.map((wish) => wish.id === id ? { ...wish, completed: !wish.completed, completedAt: !wish.completed ? new Date().toISOString() : undefined } : wish),
    }));
  };

  const toggleAction = (id: string) => {
    commit((current) => ({
      ...current,
      actions: current.actions.map((action) => action.id === id ? { ...action, completed: !action.completed, completedAt: !action.completed ? new Date().toISOString() : undefined } : action),
    }));
  };

  const deleteWish = (id: string) => {
    commit((current) => {
      const wishes = current.wishes.filter((wish) => wish.id !== id);
      const currentTopStillExists = current.topWishId ? wishes.some((wish) => wish.id === current.topWishId) : false;
      return {
        ...current,
        wishes,
        topWishId: currentTopStillExists ? current.topWishId : wishes[0]?.id,
        actions: current.actions.filter((action) => action.wishId !== id),
      };
    });
  };

  const deleteAction = (id: string) => {
    commit((current) => ({ ...current, actions: current.actions.filter((action) => action.id !== id) }));
  };

  const wishes = state.wishes;
  const actions = state.actions;
  const selectedWish = wishes[selectedWishIndex];
  const topDisplayedWish = (state.topWishId ? wishes.find((wish) => wish.id === state.topWishId) : undefined) ?? wishes[0];
  const topImageTitlePosition: WishTopImageTitlePosition = state.topImageTitlePosition ?? 'bottom';
  const topVisualJustifyContent = topImageTitlePosition === 'top' ? 'flex-start' : topImageTitlePosition === 'center' ? 'center' : 'flex-end';
  const selectedActions = selectedWish ? actions.filter((action) => action.wishId === selectedWish.id) : [];
  const historyMonths = useMemo(() => Object.entries(wishMonths)
    .filter(([monthKey, monthState]) => monthKey !== wishMonthKey() && (Boolean(monthState.monthlyGoal?.trim()) || (monthState.wishes ?? []).length > 0 || (monthState.actions ?? []).length > 0))
    .sort(([left], [right]) => right.localeCompare(left)), [wishMonths]);
  const closeHistory = () => { setHistoryOpen(false); setHistoryMonthKey(undefined); };
  const selectedHistory = historyMonthKey ? wishMonths[historyMonthKey] : undefined;
  const textPrimary = rawDesignMode === 'chic' && palette ? palette.textPrimary : theme.colors.primaryText;
  const textSecondary = rawDesignMode === 'chic' && palette ? palette.textSecondary : theme.colors.secondaryText;
  const accent = rawDesignMode === 'chic' && palette ? palette.accent : theme.colors.primaryAccent;
  const surface = rawDesignMode === 'chic' && palette ? palette.cardSurface : theme.colors.surface;
  const subtleSurface = rawDesignMode === 'chic' && palette ? palette.surfaceSubtle : theme.colors.secondarySurface;
  const border = rawDesignMode === 'chic' && palette ? palette.border : theme.colors.border;

  const renderWishModals = () => <>
    <Modal visible={historyOpen} transparent animationType="slide" onRequestClose={closeHistory}>
      <Pressable style={styles.modalBackdrop} onPress={closeHistory}><Pressable style={[styles.historySheet, { backgroundColor: surface, borderColor: border }]} onPress={(event) => event.stopPropagation()}>
        <View style={styles.historyHeaderRow}>{selectedHistory ? <Pressable onPress={() => setHistoryMonthKey(undefined)}><Text style={[styles.historyBack, { color: accent }]}>〈 これまで</Text></Pressable> : <Text style={[styles.historyTitle, { color: textPrimary }]}>これまで</Text>}<Pressable onPress={closeHistory}><Text style={[styles.editorCancelText, { color: textSecondary }]}>閉じる</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.historyList}>{selectedHistory ? <><Text style={[styles.historyDetailMonth, { color: textPrimary }]}>{formatHistoryMonth(historyMonthKey!)}</Text><Text style={[styles.historySectionTitle, { color: textPrimary }]}>今月の目標</Text><Text style={[styles.historyGoalDetail, { color: textSecondary }]}>{selectedHistory.monthlyGoal || '未設定'}</Text><Text style={[styles.historySectionTitle, { color: textPrimary }]}>叶えたこと</Text>{selectedHistory.wishes.filter((wish) => wish.completed).map((wish) => <HistoryReadOnlyRow key={wish.id} title={wish.title} completed theme={theme} palette={palette} />)}<Text style={[styles.historySectionTitle, { color: textPrimary }]}>叶えるための行動</Text>{selectedHistory.actions.map((action) => <HistoryReadOnlyRow key={action.id} title={action.title} completed={action.completed} theme={theme} palette={palette} />)}</> : historyMonths.length === 0 ? <Text style={[styles.emptyText, { color: textSecondary }]}>まだ過去の記録はありません。</Text> : historyMonths.map(([key, monthState]) => <Pressable key={key} style={[styles.historyMonthRow, { borderBottomColor: border }]} onPress={() => setHistoryMonthKey(key)}><View style={styles.itemBody}><Text style={[styles.historyMonthTitle, { color: textPrimary }]}>{formatHistoryMonth(key)}</Text><Text style={[styles.historyCounts, { color: textSecondary }]}>叶えたこと {monthState.wishes.filter((wish) => wish.completed).length} / {monthState.wishes.length}　行動 {monthState.actions.filter((action) => action.completed).length} / {monthState.actions.length}</Text></View><Text style={[styles.itemChevron, { color: textSecondary }]}>›</Text></Pressable>)}</ScrollView>
      </Pressable></Pressable>
    </Modal>
    <Modal visible={editor.visible} transparent animationType="fade" onRequestClose={() => setEditor(emptyEditor)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setEditor(emptyEditor)}><Pressable style={[styles.editorSheet, { backgroundColor: surface, borderColor: border }]} onPress={(event) => event.stopPropagation()}><Text style={[styles.editorTitle, { color: textPrimary }]}>{editor.mode === 'wish' ? (editor.id ? '叶えたいことを編集' : '叶えたいことを追加') : editor.id ? '行動を編集' : '行動を追加'}</Text><TextInput value={editor.title} onChangeText={(value) => setEditor((current) => ({ ...current, title: value }))} placeholder={editor.mode === 'wish' ? '叶えたいこと' : '叶えるための行動'} placeholderTextColor={textSecondary} style={[styles.editorInput, { color: textPrimary, backgroundColor: subtleSurface, borderColor: border }]} />{editor.mode === 'action' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wishSelectRow}>{state.wishes.map((wish) => <Pressable key={wish.id} style={[styles.wishChip, { backgroundColor: editor.wishId === wish.id ? (rawDesignMode === 'chic' && palette ? palette.accentSoft : theme.colors.softAccent) : subtleSurface, borderColor: editor.wishId === wish.id ? accent : border }]} onPress={() => setEditor((current) => ({ ...current, wishId: wish.id }))}><Text style={[styles.wishChipText, { color: textSecondary }]}>{wish.title}</Text></Pressable>)}</ScrollView> : null}{editor.mode === 'action' && onCreateTaskFromAction ? <Pressable style={[styles.editorTaskLink, { borderColor: border }]} onPress={createTaskFromActionEditor}><Text style={[styles.editorTaskLinkText, { color: accent }]}>ToDoに追加 ›</Text></Pressable> : null}<View style={styles.editorToggleRow}><Pressable style={[styles.toggleChip, { backgroundColor: editor.completed ? accent : subtleSurface, borderColor: border }]} onPress={() => setEditor((current) => ({ ...current, completed: !current.completed }))}><Text style={{ color: editor.completed ? (rawDesignMode === 'chic' && palette ? palette.onAccent : '#FFFFFF') : textSecondary, fontWeight: '900' }}>完了</Text></Pressable>{editor.id ? <Pressable onPress={() => { editor.mode === 'wish' ? deleteWish(editor.id!) : deleteAction(editor.id!); setEditor(emptyEditor); }}><Text style={styles.editorDeleteText}>削除</Text></Pressable> : null}<Pressable onPress={() => setEditor(emptyEditor)}><Text style={[styles.editorCancelText, { color: textSecondary }]}>閉じる</Text></Pressable><Pressable style={[styles.primaryButton, { backgroundColor: accent }]} onPress={saveEditor}><Text style={[styles.primaryButtonText, { color: rawDesignMode === 'chic' && palette ? palette.onAccent : isDark ? theme.colors.screenBackground : '#FFFFFF' }]}>保存</Text></Pressable></View></Pressable></Pressable>
    </Modal>
  </>;

  const onAccent = rawDesignMode === 'chic' && palette ? palette.onAccent : isDark ? theme.colors.screenBackground : '#FFFFFF';
  const renderWishBoardV2 = () => (
    <View style={[styles.screen, { backgroundColor: rawDesignMode === 'chic' ? 'transparent' : theme.colors.screenBackground }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.topVisual, { backgroundColor: surface, borderColor: border }]}>
            {topImageUri ? <Image source={{ uri: topImageUri }} resizeMode="cover" style={styles.topVisualImage} /> : null}
            <View pointerEvents="none" style={[styles.topVisualVeil, { backgroundColor: topImageUri ? '#101318' : surface, opacity: topImageUri ? 0.32 : 1 }]} />
            <View style={styles.topVisualContent}>
              <Text style={[styles.topVisualMonth, { color: topImageUri ? '#FFFFFF' : textSecondary }, topImageUri && styles.topVisualTextOnImage]}>{monthLabel}</Text>
              {topDisplayedWish ? <View style={[styles.topVisualTitleWrap, { justifyContent: topVisualJustifyContent }]}><Text numberOfLines={2} style={[styles.topVisualGoal, { color: topImageUri ? '#FFFFFF' : textPrimary }, topImageUri && styles.topVisualTextOnImage]}>{topDisplayedWish.title}</Text></View> : null}
            </View>
          </View>
          <View style={styles.pageHeader}>
            <Text style={[styles.pageHeaderTitle, { color: textPrimary }]}>叶えたいこと</Text>
            <View style={styles.pageHeaderActions}>
              <Pressable onPress={() => openWishEditor()} hitSlop={8}><Text style={[styles.pageHeaderAdd, { color: accent }]}>＋追加</Text></Pressable>
              <Pressable onPress={() => { setHistoryMonthKey(undefined); setHistoryOpen(true); }} hitSlop={8}><Text style={[styles.pageHeaderLink, { color: textSecondary }]}>過去を見る ›</Text></Pressable>
            </View>
          </View>
          {onPickTopImage ? <View style={styles.topImagePositionRow}>
            <Pressable onPress={onPickTopImage} style={[styles.topImageSettingRow, { flex: 1, alignSelf: 'auto', minWidth: 0, borderColor: border, backgroundColor: subtleSurface }]}>
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.topImageSettingText, { color: textSecondary }]}>{windowWidth < 360 ? (topImageUri ? '画像を変更' : '画像を設定') : (topImageUri ? '画像を変更' : 'トップ画像を設定')}</Text>
              <Text style={[styles.topImageSettingChevron, { color: accent }]}>›</Text>
            </Pressable>
            <Text style={[styles.titlePositionLabel, { color: textSecondary }]}>文字位置</Text>
            <View style={[styles.titlePositionControl, { backgroundColor: subtleSurface, borderColor: border }]}>
              {([{ id: 'top', label: '上' }, { id: 'center', label: '中央' }, { id: 'bottom', label: '下' }] as const).map((option) => {
                const selected = topImageTitlePosition === option.id;
                return <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => commit((current) => ({ ...current, topImageTitlePosition: option.id }))}
                  style={[styles.titlePositionOption, selected ? { backgroundColor: rawDesignMode === 'chic' && palette ? palette.accentSoft : theme.colors.softAccent, borderColor: accent, borderWidth: 1 } : { backgroundColor: surface }]}
                >
                  <Text style={[styles.titlePositionOptionText, { color: selected ? accent : textSecondary }]}>{option.label}</Text>
                </Pressable>;
              })}
            </View>
          </View> : null}
          {wishes.length > 0 ? <>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToAlignment="start"
              snapToInterval={wishSnapInterval}
              disableIntervalMomentum
              style={[styles.wishPager, { width: wishPagerWidth }]}
              onMomentumScrollEnd={(event) => {
                const width = Math.max(1, wishSnapInterval);
                setHeroMenuOpen(false);
                setSelectedWishIndex(Math.round(event.nativeEvent.contentOffset.x / width));
              }}
            >
              {wishes.map((wish, index) => {
                const wishActions = actions.filter((action) => action.wishId === wish.id);
                const wishProgress = calculateWishProgress({ ...state, wishes: [wish], actions: wishActions });
                const isSelected = index === selectedWishIndex;
                return <View key={wish.id} style={[styles.wishCardPage, { width: wishCardWidth, marginRight: index === wishes.length - 1 ? 0 : wishCardGap }]}>
                  <View style={[styles.wishCard, { backgroundColor: surface, borderColor: border }, !isSelected && styles.wishCardCompact]}>
                    <View style={styles.wishCardHeader}>
                      <View style={styles.itemBody}>
                        <Text style={[styles.wishCardEyebrow, { color: textSecondary }]}>{monthLabel}</Text>
                        <Text style={[styles.wishCardTitle, { color: textPrimary }, wish.completed && styles.itemTitleDone]}>{wish.title}</Text>
                        <Text style={[styles.wishCardHint, { color: textSecondary }]}>{wish.completed ? '叶いました' : 'ここから一歩ずつ'}</Text>
                        <Pressable onPress={() => toggleWish(wish.id)} hitSlop={8} style={styles.wishCompletionToggle}><Text style={[styles.wishCompletionText, { color: accent }]}>{wish.completed ? '✓ 完了を戻す' : '○ 叶えたらチェック'}</Text></Pressable>
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: topDisplayedWish?.id === wish.id }}
                          onPress={(event) => { event.stopPropagation(); commit((current) => ({ ...current, topWishId: wish.id })); }}
                          hitSlop={6}
                          style={styles.topWishToggle}
                        >
                          <Text style={[styles.topWishToggleText, { color: topDisplayedWish?.id === wish.id ? accent : textSecondary }]}>{topDisplayedWish?.id === wish.id ? '✓ トップ' : '□ トップ'}</Text>
                        </Pressable>
                      </View>
                      <Pressable onPress={() => { setSelectedWishIndex(index); setHeroMenuOpen((value) => isSelected ? !value : true); }} style={styles.heroMenuButton} hitSlop={8}>
                        <Text style={[styles.heroMenuText, { color: textPrimary }]}>•••</Text>
                      </Pressable>
                    </View>
                    {heroMenuOpen && isSelected ? <View style={[styles.heroMenu, { backgroundColor: subtleSurface, borderColor: border }]}>
                      <Pressable onPress={() => { setHeroMenuOpen(false); openWishEditor(wish); }}><Text style={[styles.heroMenuItem, { color: textPrimary }]}>編集</Text></Pressable>
                      <Pressable onPress={() => { setHeroMenuOpen(false); Alert.alert('削除しますか？', undefined, [{ text: 'キャンセル', style: 'cancel' }, { text: '削除', style: 'destructive', onPress: () => deleteWish(wish.id) }]); }}><Text style={[styles.heroMenuItem, { color: theme.colors.danger }]}>削除</Text></Pressable>
                    </View> : null}
                    {isSelected ? <View style={[styles.wishCardSection, { borderTopColor: border }]}>
                      <Text style={[styles.wishCardSectionTitle, { color: textPrimary }]}>叶えるための一歩</Text>
                      {wishActions.length > 0 ? <View>{wishActions.map((action) => <Pressable key={action.id} style={[styles.actionRow, { borderBottomColor: border }]} onPress={() => openActionEditor(action, wish.id)}>
                        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: action.completed }} onPress={(event) => { event.stopPropagation(); toggleAction(action.id); }} style={[styles.actionCheck, { borderColor: accent, backgroundColor: action.completed ? accent : 'transparent' }]}>
                          <Text style={{ color: onAccent, fontWeight: '900' }}>{action.completed ? '✓' : ''}</Text>
                        </Pressable>
                        <Text style={[styles.actionTitle, { color: textPrimary }, action.completed && styles.itemTitleDone]}>{action.title}</Text>
                        <Text style={[styles.itemChevron, { color: textSecondary }]}>›</Text>
                      </Pressable>)}</View> : <Text style={[styles.visionEmptyText, { color: textSecondary }]}>今日できる一歩を決めてみよう。</Text>}
                      {canCreateWishAction ? <Pressable onPress={() => openActionEditor(undefined, wish.id)} style={styles.lightActionRow}><Text style={[styles.lightAction, { color: accent }]}>＋ 行動を追加</Text></Pressable> : <Pressable onPress={() => setRewardPrompt('wishAction')} style={styles.quietFeatureRow}><View style={styles.itemBody}><Text style={[styles.quietFeatureText, { color: textSecondary }]}>広告を2回見て、行動を1件追加できます。{wishActionRewardProgress?.current ? `（${wishActionRewardProgress.current} / ${wishActionRewardProgress.required} 回視聴済み）` : ''}</Text></View><Text style={[styles.lightAction, { color: accent }]}>広告を見て追加 ›</Text></Pressable>}
                    </View> : <View style={styles.wishCardCompactSummary}><Text style={[styles.wishCardHint, { color: textSecondary }]}>{wishActions.length > 0 ? `${wishActions.filter((action) => action.completed).length}/${wishActions.length}件の一歩` : '一歩を決めていこう'}</Text><Text style={[styles.heroProgressValue, { color: accent }]}>{wishProgress.progress}%</Text></View>}
                    {isSelected && canCreateWishAction ? <View style={[styles.wishCardProgress, { borderTopColor: border }]}>
                      <View style={styles.heroProgressHeader}><Text style={[styles.heroProgressLabel, { color: textSecondary }]}>今月の進み具合</Text><Text style={[styles.heroProgressValue, { color: accent }]}>{wishProgress.progress}%</Text></View>
                      <View style={[styles.progressTrack, { backgroundColor: subtleSurface }]}><View style={[styles.progressFill, { width: `${wishProgress.progress}%`, backgroundColor: accent }]} /></View>
                    </View> : null}
                  </View>
                </View>;
              })}
            </ScrollView>
            <View style={styles.pageIndicators}>{wishes.map((wish, index) => <View key={wish.id} style={[styles.pageIndicator, { backgroundColor: index === selectedWishIndex ? accent : border }]} />)}</View>
          </> : <View style={[styles.emptyWish, { backgroundColor: surface, borderColor: border }]}><Text style={[styles.emptyWishText, { color: textSecondary }]}>叶えたいことを追加しよう</Text><Pressable onPress={() => openWishEditor()}><Text style={[styles.lightAction, { color: accent }]}>＋ 追加する</Text></Pressable></View>}
          <View style={[styles.visionSection, { borderBottomColor: border }]}>
            <View style={styles.sectionHeaderInline}><View><Text style={[styles.visionSectionTitle, { color: textPrimary }]}>今月の言葉</Text><Text style={[styles.sectionSubtitle, { color: textSecondary }]}>自分に届ける言葉</Text></View></View>
            {planTier === 'premium' ? <AffirmationSettingsCard affirmations={affirmations} customTexts={affirmationCustomTexts} designMode={rawDesignMode} chicPalette={palette} planTier={planTier} onPremium={onPremium ?? (() => undefined)} onSave={onSaveAffirmation} onDelete={onDeleteAffirmation} onSaveCustomText={onSaveAffirmationCustomText} onDeleteCustomText={onDeleteAffirmationCustomText} styles={styles} compact /> : <Pressable style={styles.quietFeatureRow} onPress={() => onPremium?.('affirmation')}><View style={styles.itemBody}><Text style={[styles.quietFeatureText, { color: textSecondary }]}>好きな言葉を、選んだ時間に届けられます。</Text></View><Text style={[styles.lightAction, { color: accent }]}>Premiumで設定 ›</Text></Pressable>}
          </View>
          <Pressable style={[styles.historyLinkRow, { borderBottomColor: border }]} onPress={() => { setHistoryMonthKey(undefined); setHistoryOpen(true); }}><View><Text style={[styles.historyLinkTitle, { color: textPrimary }]}>過去を見る</Text><Text style={[styles.historyLinkHint, { color: textSecondary }]}>これまでの願いと一歩を振り返る</Text></View><Text style={[styles.itemChevron, { color: textSecondary }]}>›</Text></Pressable>
        </ScrollView>
        <RewardedAccessModal
          visible={rewardPrompt !== null}
          title={rewardPrompt === 'wishAction' ? '叶えるための行動を追加' : '叶えたいことを追加'}
          description={rewardPrompt === 'wishAction' ? '広告を2回見ると、叶えるための行動を1件追加できます。' : '広告を2回見ると、叶えたいことを1件追加できます。'}
          current={rewardPrompt === 'wishAction' ? wishActionRewardProgress?.current ?? 0 : wishRewardProgress?.current ?? 0}
          required={rewardPrompt === 'wishAction' ? wishActionRewardProgress?.required ?? 2 : wishRewardProgress?.required ?? 2}
          designMode={rawDesignMode}
          chicPalette={palette}
          onClose={() => setRewardPrompt(null)}
          onPremium={onPremium}
          onReward={async () => {
            const mode = rewardPrompt;
            const result = mode === 'wishAction'
              ? await onRequestWishActionReward?.() ?? { success: false, message: '広告を利用できません。' }
              : await onRequestWishReward?.() ?? { success: false, message: '広告を利用できません。' };
            if (result.completed) {
              setRewardPrompt(null);
              setEditor({ visible: true, mode: mode === 'wishAction' ? 'action' : 'wish', id: undefined, title: '', wishId: selectedWish?.id, completed: false });
            }
            return result;
          }}
        />
        {renderWishModals()}
      </KeyboardAvoidingView>
    </View>
  );

  return renderWishBoardV2();

}

function HistoryReadOnlyRow({ title, meta, completed, theme, palette }: { title: string; meta?: string; completed?: boolean; theme: ReturnType<typeof getThemeTokens>; palette?: ChicThemePalette }) {
  return <View style={styles.historyReadOnlyRow}>
    <Text style={[styles.historyCheck, { color: palette?.accent ?? theme.colors.primaryAccent }]}>{completed ? '✓' : '□'}</Text>
    <View style={styles.itemBody}><Text style={[styles.itemTitle, completed && styles.itemTitleDone, { color: palette?.textPrimary ?? theme.colors.primaryText }]}>{title}</Text>{meta ? <Text style={[styles.itemMeta, { color: palette?.textSecondary ?? theme.colors.secondaryText }]}>{meta}</Text> : null}</View>
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 144, gap: 12 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 34 },
  pageHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pageHeaderAdd: { fontSize: 14, fontWeight: '900' },
  pageHeaderEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  pageHeaderTitle: { fontSize: 20, fontWeight: '900' },
  pageHeaderLink: { fontSize: 12, fontWeight: '900' },
  topVisual: { minHeight: 190, borderRadius: 24, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  topVisualImage: { ...StyleSheet.absoluteFillObject },
  topVisualVeil: { ...StyleSheet.absoluteFillObject },
  topVisualContent: { flex: 1, padding: 20, gap: 7 },
  topVisualTitleWrap: { flex: 1 },
  topVisualMonth: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  topVisualTitle: { fontSize: 20, fontWeight: '900' },
  // Keep the Wish title prominent without overwhelming the cover image.
  // Two-line truncation and the existing veil/shadow remain unchanged.
  topVisualGoal: { fontSize: 22, lineHeight: 29, fontWeight: '900', marginTop: 8 },
  topVisualTextOnImage: { textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  topVisualHint: { fontSize: 13, lineHeight: 20, fontWeight: '800', marginTop: 2 },
  topVisualEdit: { position: 'absolute', right: 16, bottom: 14 },
  topVisualEditText: { fontSize: 11, fontWeight: '900' },
  heroBoard: { borderRadius: 24, borderWidth: 1, padding: 18, gap: 12 },
  heroBoardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroBoardEyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  heroBoardHint: { fontSize: 10, fontWeight: '700', marginTop: 3 },
  heroMenuButton: { minWidth: 36, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  heroMenuText: { fontSize: 17, letterSpacing: 2, fontWeight: '900' },
  heroMenu: { borderWidth: 1, borderRadius: 14, padding: 4, gap: 2 },
  heroMenuItem: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, fontWeight: '800' },
  wishCardPage: { paddingBottom: 2 },
  wishCard: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 14 },
  wishCardCompact: { paddingVertical: 13, gap: 9 },
  wishCardCompactSummary: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  wishCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  wishCardEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  wishCardTitle: { fontSize: 23, lineHeight: 31, fontWeight: '900', marginTop: 5 },
  wishCardHint: { fontSize: 11, lineHeight: 17, fontWeight: '700', marginTop: 5 },
  wishCompletionToggle: { alignSelf: 'flex-start', marginTop: 8 },
  wishCompletionText: { fontSize: 11, fontWeight: '900' },
  topWishToggle: { alignSelf: 'flex-start', marginTop: 5, minHeight: 28, justifyContent: 'center' },
  topWishToggleText: { fontSize: 11, fontWeight: '900' },
  wishCardSection: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
  wishCardSectionTitle: { fontSize: 13, fontWeight: '900' },
  wishCardProgress: { borderTopWidth: 1, paddingTop: 12, gap: 7 },
  topImagePositionRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8 },
  topImageSettingRow: { minHeight: 38, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  topImageSettingText: { fontSize: 11, fontWeight: '800' },
  topImageSettingChevron: { fontSize: 17, lineHeight: 18, fontWeight: '400' },
  titlePositionControl: { flexShrink: 1, width: '46%', minWidth: 140, maxWidth: 180, minHeight: 38, flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderRadius: 11, overflow: 'hidden' },
  titlePositionLabel: { flexShrink: 0, fontSize: 10, fontWeight: '800' },
  titlePositionOption: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  titlePositionOptionText: { fontSize: 12, fontWeight: '900' },
  goalInline: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  goalInlineText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  goalInlineAction: { fontSize: 11, fontWeight: '900' },
  emptyWish: { paddingVertical: 20, gap: 10 },
  emptyWishText: { fontSize: 12, lineHeight: 19, fontWeight: '700' },
  quietFeatureRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  quietFeatureTitle: { fontSize: 14, fontWeight: '900' },
  quietFeatureText: { fontSize: 11, lineHeight: 17, fontWeight: '700', marginTop: 3 },
  historyLinkRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingVertical: 10 },
  historyLinkTitle: { fontSize: 14, fontWeight: '900' },
  historyLinkHint: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  goalSheet: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10 },
  topImageLink: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingVertical: 8 },
  topImageLinkCopy: { flex: 1, gap: 2 },
  topImageLinkTitle: { fontSize: 13, fontWeight: '900' },
  topImageLinkHint: { fontSize: 10, fontWeight: '700' },
  visionHero: { paddingTop: 10, paddingBottom: 20, borderBottomWidth: 1 },
  visionEyebrow: { fontSize: 12, fontWeight: '900', marginBottom: 8 },
  visionHeroText: { fontSize: 28, lineHeight: 36, fontWeight: '900', letterSpacing: 0.2 },
  visionEditHint: { fontSize: 10, fontWeight: '800', marginTop: 8 },
  heroWishBlock: { marginTop: 22, gap: 4 },
  heroWishPager: { width: '100%' },
  heroWishLabel: { fontSize: 11, fontWeight: '800' },
  heroWishTitle: { fontSize: 25, lineHeight: 33, fontWeight: '900' },
  heroWishMeta: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  heroProgress: { marginTop: 18, gap: 7 },
  heroProgressHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  heroProgressLabel: { fontSize: 11, fontWeight: '800' },
  heroProgressValue: { fontSize: 24, lineHeight: 28, fontWeight: '800' },
  visionEmptyText: { fontSize: 12, lineHeight: 19, fontWeight: '700' },
  visionSection: { paddingVertical: 16, borderBottomWidth: 1, gap: 10 },
  sectionHeaderInline: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  visionSectionTitle: { fontSize: 17, fontWeight: '900' },
  lightAction: { fontSize: 12, fontWeight: '900' },
  lightActionRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8 },
  wishPager: { width: '100%' },
  wishPage: { width: 320, minHeight: 92, justifyContent: 'center', paddingVertical: 8, paddingRight: 18 },
  wishHeroTitle: { fontSize: 23, lineHeight: 31, fontWeight: '900' },
  wishHeroMeta: { fontSize: 11, fontWeight: '700', marginTop: 8 },
  pageIndicators: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 10 },
  wishSummaryRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wishSummaryText: { fontSize: 12, fontWeight: '700' },
  pageIndicator: { width: 6, height: 6, borderRadius: 3 },
  actionList: { gap: 0 },
  actionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D8D8D3' },
  actionCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  lockedInlineRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  lockedInlineTitle: { fontSize: 14, fontWeight: '800' },
  lockedInlineText: { flex: 1, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  sectionHeader: { marginBottom: 10, zIndex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionSubtitle: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  themePanel: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10, backgroundColor: '#FFFFFF' },
  themePanelMinimal: { borderColor: '#111111', borderRadius: 16 },
  themePanelChic: { borderColor: '#E8D9E2' },
  themePanelDark: { backgroundColor: '#20293A', borderColor: '#303B50' },
  savedThemeCard: { minHeight: 92, paddingHorizontal: 2, paddingVertical: 4, backgroundColor: 'transparent' },
  savedThemeCardDark: { backgroundColor: 'transparent' },
  savedThemeHint: { fontSize: 10, fontWeight: '800', marginBottom: 6 },
  savedThemeText: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
  savedThemeEdit: { alignSelf: 'flex-end', fontSize: 11, fontWeight: '900', marginTop: 7 },
  themeInput: { minHeight: 78, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontWeight: '800', color: '#282538', textAlignVertical: 'top', backgroundColor: '#FFFFFF' },
  sectionTitleDark: { color: '#F4F7FC' },
  sectionSubtitleDark: { color: '#B4C0D4' },
  themeInputMinimal: { borderColor: '#111111', borderRadius: 14 },
  themeInputChic: { borderColor: '#E7D9E3' },
  themeInputDark: { backgroundColor: '#181F2E', borderColor: '#40506A', color: '#F4F7FC' },
  rowActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  secondaryButton: { minWidth: 82, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, alignItems: 'center', backgroundColor: '#F0EDF4' },
  secondaryButtonMinimal: { borderColor: '#111111', borderWidth: 1, backgroundColor: '#FFFFFF', borderRadius: 12 },
  secondaryButtonChic: { backgroundColor: '#F7F0F4' },
  secondaryButtonDark: { backgroundColor: '#20293A', borderColor: '#40506A', borderWidth: 1 },
  secondaryButtonText: { fontSize: 12, fontWeight: '900' },
  primaryButton: { minWidth: 82, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, alignItems: 'center', backgroundColor: '#7559E8' },
  primaryButtonMinimal: { backgroundColor: '#111111', borderRadius: 12 },
  primaryButtonChic: { backgroundColor: '#7057B3' },
  primaryButtonDark: { backgroundColor: '#26365F', borderColor: '#8EA6FF', borderWidth: 1 },
  primaryButtonText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
  listGap: { gap: 8 },
  emptyText: { fontSize: 11, lineHeight: 17, fontWeight: '700' },
  itemRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2, paddingVertical: 10, borderBottomWidth: 1 },
  itemRowMinimal: { borderBottomColor: '#D8D8D3' },
  itemRowChic: { borderBottomColor: '#E5DFEA' },
  itemRowDark: { borderBottomColor: '#303B50' },
  itemRowDone: { opacity: 0.62 },
  // Shared with the compact affirmation entry card.
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 12, backgroundColor: '#FFFFFF' },
  itemCardMinimal: { borderColor: '#111111', borderRadius: 16 },
  itemCardDark: { backgroundColor: '#20293A', borderColor: '#303B50' },
  completionCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#D986A1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  completionCheckActive: { backgroundColor: '#D986A1', borderColor: '#D986A1' },
  completionCheckMinimal: { borderColor: '#111111' },
  completionCheckDark: { backgroundColor: '#181F2E', borderColor: '#40506A' },
  completionCheckActiveDark: { backgroundColor: '#26365F', borderColor: '#8EA6FF' },
  completionCheckText: { color: '#D986A1', fontSize: 17, lineHeight: 20, fontWeight: '900' },
  completionCheckTextDark: { color: '#8EA6FF' },
  completionCheckTextActive: { color: '#FFFFFF' },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '900', color: '#282538' },
  itemTitleDark: { color: '#F4F7FC' },
  itemTitleDone: { textDecorationLine: 'line-through' },
  itemMeta: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  itemChevron: { fontSize: 24, lineHeight: 28, fontWeight: '400', paddingHorizontal: 4 },
  deleteText: { color: '#B95B67' },
  deleteTextDark: { color: '#FF8F9C' },
  addRow: { marginTop: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderRadius: 14, backgroundColor: '#FFFFFF' },
  addRowMinimal: { borderColor: '#111111', borderRadius: 14 },
  addRowChic: { borderColor: '#E0D5E1', backgroundColor: '#FFF8FA' },
  addRowDark: { borderColor: '#40506A', backgroundColor: '#20293A' },
  addRowDisabled: { opacity: 0.45 },
  addRowText: { fontSize: 13, fontWeight: '900' },
  lockedFeatureCard: { borderWidth: 1, borderColor: '#D9D4DC', borderRadius: 16, padding: 14, backgroundColor: '#F7F5F8', gap: 6 },
  lockedFeatureCardDark: { borderColor: '#40506A', backgroundColor: '#20293A' },
  lockedFeatureTitle: { fontSize: 14, fontWeight: '900', color: '#282538' },
  lockedFeatureTitleDark: { color: '#F4F7FC' },
  lockedFeatureText: { fontSize: 12, lineHeight: 18, fontWeight: '700', color: '#6F6873' },
  lockedFeatureTextDark: { color: '#B4C0D4' },
  lockedFeatureCta: { fontSize: 12, fontWeight: '900', marginTop: 4 },
  progressMinimal: { gap: 12 },
  progressNumberMinimal: { fontSize: 42, lineHeight: 46, fontWeight: '300', color: '#111111' },
  progressNumberDark: { color: '#F4F7FC' },
  progressCompact: { gap: 10 },
  progressSummaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  progressNumberCompact: { fontSize: 32, lineHeight: 36, fontWeight: '800', color: '#111111' },
  progressSummary: { fontSize: 11, lineHeight: 17, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(32,25,40,0.45)', justifyContent: 'center', padding: 16 },
  historySheet: { maxHeight: '88%', borderRadius: 18, padding: 16, gap: 10 },
  historyHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 30 },
  historyTitle: { fontSize: 20, fontWeight: '900' },
  historyBack: { fontSize: 13, fontWeight: '900' },
  historyList: { paddingBottom: 12 },
  historyEmpty: { paddingVertical: 34, gap: 8 },
  historyEmptyHint: { fontSize: 11, lineHeight: 17, fontWeight: '700' },
  historyMonthRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  historyMonthTitle: { fontSize: 15, fontWeight: '900' },
  historyGoal: { fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 4 },
  historyCounts: { fontSize: 10, fontWeight: '800', marginTop: 5 },
  historyDetailMonth: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  historyDetailSection: { paddingVertical: 10, gap: 6 },
  historySectionTitle: { fontSize: 13, fontWeight: '900' },
  historyGoalDetail: { fontSize: 14, lineHeight: 21, fontWeight: '800' },
  historyEmptyLine: { fontSize: 11, fontWeight: '700' },
  historyReadOnlyRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D8D8D3' },
  historyCheck: { width: 22, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  editorSheet: { borderRadius: 18, padding: 16, gap: 10 },
  editorSheetMinimal: { borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#111111' },
  editorSheetChic: { backgroundColor: '#FFF3F5', borderWidth: 1, borderColor: '#F0DFE5' },
  editorSheetDark: { backgroundColor: '#181F2E', borderColor: '#303B50' },
  editorTitle: { fontSize: 16, fontWeight: '900' },
  editorInput: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF', fontSize: 13, fontWeight: '800', color: '#282538' },
  editorInputMinimal: { borderColor: '#111111', borderRadius: 14 },
  editorInputChic: { borderColor: '#E7D9E3' },
  editorInputDark: { backgroundColor: '#20293A', borderColor: '#40506A', color: '#F4F7FC' },
  wishSelectWrap: { gap: 6 },
  editorMeta: { fontSize: 10, fontWeight: '800' },
  wishSelectRow: { gap: 8, paddingVertical: 4 },
  wishChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#FFFFFF' },
  wishChipMinimal: { borderColor: '#111111', borderRadius: 999 },
  wishChipChic: { borderColor: '#DDD7E1' },
  wishChipDark: { backgroundColor: '#20293A', borderColor: '#40506A' },
  wishChipActive: { backgroundColor: '#F4D8E2', borderColor: '#D986A1' },
  wishChipActiveDark: { backgroundColor: '#26365F', borderColor: '#8EA6FF' },
  wishChipText: { fontSize: 11, fontWeight: '800', color: '#777772' },
  wishChipTextDark: { color: '#B4C0D4' },
  wishChipTextActive: { color: '#392F34' },
  wishChipTextActiveDark: { color: '#FFFFFF' },
  editorToggleRow: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  toggleChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#FFFFFF' },
  toggleChipMinimal: { borderColor: '#111111', borderRadius: 999 },
  toggleChipChic: { borderColor: '#DDD7E1' },
  toggleChipActive: { backgroundColor: '#F4D8E2', borderColor: '#D986A1' },
  toggleChipDark: { backgroundColor: '#20293A', borderColor: '#40506A' },
  toggleChipActiveDark: { backgroundColor: '#26365F', borderColor: '#8EA6FF' },
  toggleChipText: { fontSize: 12, fontWeight: '900', color: '#777772' },
  toggleChipTextActive: { color: '#392F34' },
  toggleChipTextDark: { color: '#B4C0D4' },
  toggleChipTextActiveDark: { color: '#FFFFFF' },
  editorCancel: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', backgroundColor: '#FFFFFF' },
  editorCancelMinimal: { borderColor: '#111111', borderRadius: 12 },
  editorCancelChic: { borderColor: '#DDD7E1' },
  editorCancelDark: { backgroundColor: '#20293A', borderColor: '#40506A' },
  editorCancelText: { fontSize: 12, fontWeight: '900' },
  editorDeleteButton: { paddingHorizontal: 8, paddingVertical: 11, alignItems: 'center' },
  editorDeleteText: { color: '#B95B67', fontSize: 12, fontWeight: '900' },
  editorTaskLink: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  editorTaskLinkText: { fontSize: 12, fontWeight: '900' },
  editorSaveButton: { flex: 1 },
});
