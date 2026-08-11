import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChicPattern, DesignMode, getThemeTokens } from './theme';
import { MonthlyReview, MonthlyWishState, Wish, WishAction } from './types';
import { calculateWishProgress, normalizeMonthlyReview, wishDateKey } from './features/wish/wishUtils';
import { BThemeRibbonDecoration } from './components/BThemeRibbonDecoration';
import { CThemeRibbonDecoration } from './components/CThemeRibbonDecoration';

type WishScreenProps = {
  designMode: DesignMode;
  chicPattern: ChicPattern;
  monthLabel: string;
  state: MonthlyWishState;
  onSaveState: (updater: (current: MonthlyWishState) => MonthlyWishState) => void;
  onCreateTaskFromAction?: (action: WishAction) => void;
  onBack: () => void;
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

function sectionText(mode: DesignMode, chic: string, minimal: string) {
  return mode === 'minimal' ? minimal : chic;
}

function createEmptyReviewDraft(): MonthlyReview {
  return { photo: '', date: '', shortNote: '', memo: '', satisfaction: 0 };
}

function hasReviewContent(review: MonthlyReview) {
  return Boolean(review.photo || review.date || review.shortNote || review.memo || review.satisfaction);
}

function monthDays(month: string) {
  const parts = month.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const monthNumber = parts[1] ?? new Date().getMonth() + 1;
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
  const totalDays = new Date(year, monthNumber, 0).getDate();
  return [...Array(firstWeekday).fill(null), ...Array.from({ length: totalDays }, (_, index) => String(index + 1).padStart(2, '0'))];
}

export function WishScreen({ designMode: rawDesignMode, chicPattern, monthLabel, state, onSaveState, onCreateTaskFromAction, onBack }: WishScreenProps) {
  // Mono DarkはMono Lightと同じレイアウトを使い、色だけを反転する。
  const designMode: 'minimal' | 'chic' = rawDesignMode === 'dark' || rawDesignMode === 'photo' ? 'minimal' : rawDesignMode;
  const theme = getThemeTokens(rawDesignMode);
  const darkAccent = rawDesignMode === 'dark' ? '#C7B7FF' : theme.colors.primaryAccent;
  const progress = useMemo(() => calculateWishProgress(state), [state]);
  const [themeDraft, setThemeDraft] = useState(state.theme ?? '');
  const [reviewDraft, setReviewDraft] = useState<MonthlyReview>(normalizeMonthlyReview(state.review));
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [showReviewDatePicker, setShowReviewDatePicker] = useState(false);
  const suppressReviewSyncRef = useRef(false);

  useEffect(() => {
    setThemeDraft(state.theme ?? '');
    if (suppressReviewSyncRef.current) {
      suppressReviewSyncRef.current = false;
      return;
    }
    setReviewDraft(normalizeMonthlyReview(state.review));
  }, [state.review, state.theme]);

  const commit = (updater: (current: MonthlyWishState) => MonthlyWishState) => {
    onSaveState(updater);
  };

  const openWishEditor = (wish?: Wish) => {
    setEditor({
      visible: true,
      mode: 'wish',
      id: wish?.id,
      title: wish?.title ?? '',
      wishId: undefined,
      completed: wish?.completed ?? false,
    });
  };

  const openActionEditor = (action?: WishAction) => {
    setEditor({
      visible: true,
      mode: 'action',
      id: action?.id,
      title: action?.title ?? '',
      wishId: action?.wishId ?? state.wishes[0]?.id,
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
      commit((current) => ({
        ...current,
        wishes: current.wishes.some((item) => item.id === wish.id)
          ? current.wishes.map((item) => (item.id === wish.id ? wish : item))
          : [wish, ...current.wishes],
      }));
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
    }

    if (isEditing) {
      setEditor(emptyEditor);
    } else {
      setEditor((current) => ({
        ...current,
        visible: true,
        mode: editor.mode,
        id: undefined,
        title: '',
        wishId: editor.mode === 'action' ? editor.wishId ?? state.wishes[0]?.id : undefined,
        completed: false,
      }));
    }
    Keyboard.dismiss();
    Alert.alert('保存しました', editor.mode === 'wish' ? '叶えたいことを保存しました。' : '叶えるための行動を保存しました。');
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
    commit((current) => ({
      ...current,
      wishes: current.wishes.filter((wish) => wish.id !== id),
      actions: current.actions.filter((action) => action.wishId !== id),
    }));
  };

  const deleteAction = (id: string) => {
    commit((current) => ({ ...current, actions: current.actions.filter((action) => action.id !== id) }));
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('写真へのアクセスが必要です');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;
    setReviewDraft((current) => ({ ...current, photo: asset.uri }));
  };

  const saveReview = () => {
    const nextReview: MonthlyReview = {
      id: `${Date.now()}-review`,
      photo: reviewDraft.photo?.trim() ?? '',
      date: reviewDraft.date?.trim() || wishDateKey(),
      shortNote: reviewDraft.shortNote?.trim() ?? '',
      memo: reviewDraft.memo?.trim() ?? '',
      satisfaction: reviewDraft.satisfaction ?? 0,
    };
    suppressReviewSyncRef.current = true;
    commit((current) => ({
      ...current,
      // 保存済み履歴は reviews に積み、入力欄用の draft は空のまま維持する。
      // review は旧形式データとの互換用なので、保存直後に最新レビューを戻さない。
      review: {},
      reviews: [...(current.reviews?.length ? current.reviews : (hasReviewContent(current.review) ? [normalizeMonthlyReview(current.review)] : [])), nextReview],
    }));
    setReviewDraft(createEmptyReviewDraft());
    Keyboard.dismiss();
    Alert.alert('保存しました', '今月を残す記録を保存しました。');
  };

  const wishes = state.wishes;
  const actions = state.actions;
  const savedReviews: Array<{ month: string; review: MonthlyReview }> = [];
  const reviewMonths: string[] = [];

  return (
    <View style={[styles.screen, designMode === 'minimal' ? styles.screenMinimal : styles.screenChic, rawDesignMode === 'dark' && styles.screenDark]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable style={[styles.backButton, designMode === 'minimal' ? styles.backButtonMinimal : styles.backButtonChic]} onPress={onBack}>
            <Text style={[styles.backButtonText, { color: darkAccent }]}>ホームへ戻る</Text>
          </Pressable>

          <SectionCard
            designMode={designMode}
            chicPattern={chicPattern}
            showBRibbon={designMode === 'chic' && chicPattern === 'checkLavenderSatin'}
            showCRibbon={designMode === 'chic' && chicPattern === 'checkBeigeNoir'}
            title="今月のテーマ"
            subtitle={monthLabel}
          >
            <View style={[styles.themePanel, designMode === 'minimal' ? styles.themePanelMinimal : styles.themePanelChic]}>
              <TextInput
                value={themeDraft}
                onChangeText={setThemeDraft}
                placeholder="今月は、どんな自分でいたい？"
                placeholderTextColor={theme.colors.secondaryText}
                style={[styles.themeInput, designMode === 'minimal' ? styles.themeInputMinimal : styles.themeInputChic]}
                multiline
              />
              <View style={styles.rowActions}>
                <Pressable style={[styles.secondaryButton, designMode === 'minimal' ? styles.secondaryButtonMinimal : styles.secondaryButtonChic]} onPress={() => { setThemeDraft(''); commit((current) => ({ ...current, theme: '' })); }}>
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.secondaryText }]}>削除</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, designMode === 'minimal' ? styles.primaryButtonMinimal : styles.primaryButtonChic]}
                  onPress={() => {
                    commit((current) => ({ ...current, theme: themeDraft.trim() }));
                    Keyboard.dismiss();
                    Alert.alert('保存しました', '今月のテーマを保存しました。');
                  }}
                >
                  <Text style={styles.primaryButtonText}>保存</Text>
                </Pressable>
              </View>
            </View>
          </SectionCard>

          <SectionCard
            designMode={designMode}
            chicPattern={chicPattern}
            title="叶えたいこと"
            subtitle="今月の願い"
          >
            <View style={styles.listGap}>
              {wishes.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>まだありません。今月の願いを1つ書いてみよう。</Text>
              ) : wishes.map((wish) => (
                <Pressable
                  key={wish.id}
                  style={[
                    styles.itemCard,
                    designMode === 'minimal' ? styles.itemCardMinimal : styles.itemCardChic,
                    wish.completed && styles.itemCardDone,
                  ]}
                  onPress={() => undefined}
                >
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: wish.completed }}
                    style={[styles.completionCheck, wish.completed && styles.completionCheckActive, designMode === 'minimal' && styles.completionCheckMinimal]}
                    onPress={() => toggleWish(wish.id)}
                  >
                    <Text style={[styles.completionCheckText, wish.completed && styles.completionCheckTextActive]}>✓</Text>
                  </Pressable>
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemTitle, wish.completed && styles.itemTitleDone]}>{wish.title}</Text>
                      <Text style={[styles.itemMeta, { color: theme.colors.secondaryText }]}>{wish.completed ? `完了${wish.completedAt ? ` ・ ${new Date(wish.completedAt).getMonth() + 1}/${new Date(wish.completedAt).getDate()}` : ''}` : '進行中'}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <Pressable onPress={() => openWishEditor(wish)}>
                      <Text style={[styles.itemActionText, { color: theme.colors.primaryAccent }]}>編集</Text>
                    </Pressable>
                    <Pressable onPress={() => deleteWish(wish.id)}>
                      <Text style={[styles.itemActionText, styles.deleteText]}>削除</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>

            <Pressable style={[styles.addRow, designMode === 'minimal' ? styles.addRowMinimal : styles.addRowChic]} onPress={() => openWishEditor()}>
              <Text style={[styles.addRowText, { color: darkAccent }]}>＋ 叶えたいことを追加</Text>
            </Pressable>
          </SectionCard>

          <SectionCard
            designMode={designMode}
            chicPattern={chicPattern}
            title="叶えるための行動"
            subtitle="行動"
          >
            {wishes.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>先に叶えたいことを1つ作ると、行動を結びつけられます。</Text>
            ) : null}
            <View style={styles.listGap}>
              {actions.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>行動はまだありません。</Text>
              ) : actions.map((action) => {
                const wish = wishes.find((item) => item.id === action.wishId);
                return (
                  <Pressable
                    key={action.id}
                    style={[
                      styles.itemCard,
                      designMode === 'minimal' ? styles.itemCardMinimal : styles.itemCardChic,
                      action.completed && styles.itemCardDone,
                    ]}
                    onPress={() => undefined}
                  >
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: action.completed }}
                      style={[styles.completionCheck, action.completed && styles.completionCheckActive, designMode === 'minimal' && styles.completionCheckMinimal]}
                      onPress={() => toggleAction(action.id)}
                    >
                      <Text style={[styles.completionCheckText, action.completed && styles.completionCheckTextActive]}>✓</Text>
                    </Pressable>
                    <View style={styles.itemBody}>
                      <Text style={[styles.itemTitle, action.completed && styles.itemTitleDone]}>{action.title}</Text>
                      <Text style={[styles.itemMeta, { color: theme.colors.secondaryText }]}>{wish ? `願い: ${wish.title}` : '願い未選択'}</Text>
                    </View>
                    <View style={styles.itemActions}>
                      {onCreateTaskFromAction && <Pressable onPress={() => onCreateTaskFromAction(action)}>
                        <Text style={[styles.itemActionText, { color: theme.colors.primaryAccent }]}>タスク化</Text>
                      </Pressable>}
                      <Pressable onPress={() => openActionEditor(action)}>
                        <Text style={[styles.itemActionText, { color: theme.colors.primaryAccent }]}>編集</Text>
                      </Pressable>
                      <Pressable onPress={() => deleteAction(action.id)}>
                        <Text style={[styles.itemActionText, styles.deleteText]}>削除</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.addRow, designMode === 'minimal' ? styles.addRowMinimal : styles.addRowChic, !wishes.length && styles.addRowDisabled]}
              onPress={() => wishes.length ? openActionEditor() : Alert.alert('先に叶えたいことを1つ作ってね')}
            >
              <Text style={[styles.addRowText, { color: rawDesignMode === 'dark' ? darkAccent : wishes.length ? theme.colors.primaryAccent : theme.colors.secondaryText }]}>＋ 行動を追加</Text>
            </Pressable>
          </SectionCard>

          <SectionCard
            designMode={designMode}
            chicPattern={chicPattern}
            title="今月の進捗"
            subtitle={`${progress.progress}%`}
          >
            {designMode === 'minimal' ? (
              <View style={styles.progressMinimal}>
                <Text style={styles.progressNumberMinimal}>{progress.progress}%</Text>
                <View style={styles.statGrid}>
                  <StatCard label="叶えたいこと" value={`${progress.wishCompleted} / ${progress.wishTotal}`} minimal />
                  <StatCard label="行動" value={`${progress.actionCompleted} / ${progress.actionTotal}`} minimal />
                </View>
              </View>
            ) : (
              <View style={styles.progressChic}>
                <View style={styles.ring}>
                  <View style={styles.ringInner}>
                    <Text style={styles.progressNumberChic}>{progress.progress}%</Text>
                  </View>
                </View>
                <View style={styles.statColumn}>
                  <StatCard label="叶えたいこと" value={`${progress.wishCompleted} / ${progress.wishTotal}`} />
                  <StatCard label="行動" value={`${progress.actionCompleted} / ${progress.actionTotal}`} />
                </View>
              </View>
            )}
          </SectionCard>

          <SectionCard
            designMode={designMode}
            chicPattern={chicPattern}
            showBRibbon={designMode === 'chic' && chicPattern === 'checkLavenderSatin'}
            showCRibbon={designMode === 'chic' && chicPattern === 'checkBeigeNoir'}
            title="今月を残す"
            subtitle="今月の記録"
          >
            <View style={[styles.reviewPanel, designMode === 'minimal' ? styles.reviewPanelMinimal : styles.reviewPanelChic]}>
              <Pressable style={[styles.photoBox, designMode === 'minimal' ? styles.photoBoxMinimal : styles.photoBoxChic]} onPress={choosePhoto}>
                {reviewDraft.photo ? <Image source={{ uri: reviewDraft.photo }} style={styles.photoImage} /> : <Text style={[styles.photoText, { color: theme.colors.secondaryText }]}>写真1枚</Text>}
              </Pressable>

              <Pressable style={[styles.reviewDateRow, designMode === 'minimal' ? styles.reviewDateRowMinimal : styles.reviewDateRowChic]} onPress={() => setShowReviewDatePicker(true)}>
                <View>
                  <Text style={[styles.reviewDateLabel, { color: theme.colors.secondaryText }]}>記録日</Text>
                  <Text style={[styles.reviewDateValue, { color: theme.colors.primaryText }]}>{reviewDraft.date || wishDateKey()}</Text>
                  <Text style={[styles.reviewDateHint, { color: theme.colors.secondaryText }]}>カレンダーで見返す日の目印</Text>
                </View>
                <Text style={[styles.reviewDateArrow, { color: theme.colors.primaryAccent }]}>›</Text>
              </Pressable>

              <TextInput
                value={reviewDraft.shortNote ?? ''}
                onChangeText={(value) => setReviewDraft((current) => ({ ...current, shortNote: value }))}
                placeholder="一言"
                placeholderTextColor={theme.colors.secondaryText}
                style={[styles.reviewInput, designMode === 'minimal' ? styles.reviewInputMinimal : styles.reviewInputChic]}
              />
              <TextInput
                value={reviewDraft.memo ?? ''}
                onChangeText={(value) => setReviewDraft((current) => ({ ...current, memo: value }))}
                placeholder="振り返りメモ"
                placeholderTextColor={theme.colors.secondaryText}
                style={[styles.reviewInput, styles.reviewMemo, designMode === 'minimal' ? styles.reviewInputMinimal : styles.reviewInputChic]}
                multiline
              />

              <View style={styles.satisfactionRow}>
                {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => (
                  <Pressable
                    key={value}
                    style={[styles.satisfactionPill, reviewDraft.satisfaction === value && styles.satisfactionPillActive, designMode === 'minimal' ? styles.satisfactionPillMinimal : styles.satisfactionPillChic]}
                    onPress={() => setReviewDraft((current) => ({ ...current, satisfaction: value }))}
                  >
                    <Text style={[styles.satisfactionText, reviewDraft.satisfaction === value && styles.satisfactionTextActive]}>{value}</Text>
                  </Pressable>
                ))}
                <Text style={[styles.satisfactionLabel, { color: theme.colors.secondaryText }]}>満足度</Text>
              </View>

              <Pressable style={[styles.primaryButton, designMode === 'minimal' ? styles.primaryButtonMinimal : styles.primaryButtonChic, styles.reviewSaveButton]} onPress={saveReview}>
                <Text style={styles.primaryButtonText}>保存</Text>
              </Pressable>
            </View>
          </SectionCard>

          {savedReviews.length > 0 && (
            <SectionCard
              designMode={designMode}
              chicPattern={chicPattern}
              title="保存した記録"
              subtitle={`${savedReviews.length}か月分`}
            >
              <View style={styles.reviewHistoryList}>
                {reviewMonths.map((month) => (
                  <View key={`calendar-${month}`} style={[styles.reviewCalendar, designMode === 'minimal' ? styles.reviewCalendarMinimal : styles.reviewCalendarChic]}>
                    <Text style={[styles.reviewCalendarTitle, { color: theme.colors.primaryText }]}>{month.replace('-', '年')}月</Text>
                    <View style={styles.reviewCalendarGrid}>
                      {monthDays(month).map((day, index) => {
                        const marked = Boolean(day && savedReviews.some((entry) => entry.month === month && entry.review.date?.endsWith(`-${day}`)));
                        return <View key={`${month}-${index}`} style={[styles.reviewCalendarDay, marked && styles.reviewCalendarDayMarked]}><Text style={[styles.reviewCalendarDayText, { color: theme.colors.secondaryText }, marked && { color: theme.colors.primaryAccent }]}>{day ?? ''}</Text>{marked && <View style={[styles.reviewCalendarDot, { backgroundColor: theme.colors.primaryAccent }]} />}</View>;
                      })}
                    </View>
                  </View>
                ))}
                {savedReviews.map(({ month, review }, index) => (
                  <View key={review.id ?? `${month}-${review.date}-${index}`} style={[styles.reviewHistoryItem, designMode === 'minimal' ? styles.reviewHistoryItemMinimal : styles.reviewHistoryItemChic]}>
                    {review.photo ? <Image source={{ uri: review.photo }} style={styles.reviewHistoryPhoto} /> : <View style={[styles.reviewHistoryPhoto, styles.reviewHistoryPhotoEmpty]}><Text style={styles.reviewHistoryPhotoText}>記録</Text></View>}
                    <View style={styles.reviewHistoryBody}>
                      <Text style={[styles.reviewHistoryMonth, { color: theme.colors.primaryText }]}>{month.replace('-', '年')}月</Text>
                      {review.shortNote ? <Text style={[styles.reviewHistoryNote, { color: theme.colors.primaryText }]}>{review.shortNote}</Text> : null}
                      {review.memo ? <Text numberOfLines={2} style={[styles.reviewHistoryMemo, { color: theme.colors.secondaryText }]}>{review.memo}</Text> : null}
                      {review.satisfaction ? <Text style={[styles.reviewHistorySatisfaction, { color: theme.colors.primaryAccent }]}>満足度 {review.satisfaction} / 5</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            </SectionCard>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={editor.visible} transparent animationType="fade" onRequestClose={() => setEditor(emptyEditor)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditor(emptyEditor)}>
          <Pressable style={[styles.editorSheet, designMode === 'minimal' ? styles.editorSheetMinimal : styles.editorSheetChic]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.editorTitle, { color: theme.colors.primaryText }]}>{editor.mode === 'wish' ? (editor.id ? '叶えたいことを編集' : '叶えたいことを追加') : editor.id ? '行動を編集' : '行動を追加'}</Text>
            <TextInput
              value={editor.title}
              onChangeText={(value) => setEditor((current) => ({ ...current, title: value }))}
                placeholder={editor.mode === 'wish' ? '叶えたいこと' : '叶えるための行動'}
              placeholderTextColor={theme.colors.secondaryText}
              style={[styles.editorInput, designMode === 'minimal' ? styles.editorInputMinimal : styles.editorInputChic]}
            />
            {editor.mode === 'action' && (
              <View style={styles.wishSelectWrap}>
              <Text style={[styles.editorMeta, { color: theme.colors.secondaryText }]}>関連する願い</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wishSelectRow}>
                  {state.wishes.map((wish) => (
                    <Pressable
                      key={wish.id}
                      style={[styles.wishChip, editor.wishId === wish.id && styles.wishChipActive, designMode === 'minimal' ? styles.wishChipMinimal : styles.wishChipChic]}
                      onPress={() => setEditor((current) => ({ ...current, wishId: wish.id }))}
                    >
                      <Text style={[styles.wishChipText, editor.wishId === wish.id && styles.wishChipTextActive]}>{wish.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={styles.editorToggleRow}>
              <Pressable style={[styles.toggleChip, editor.completed && styles.toggleChipActive, designMode === 'minimal' ? styles.toggleChipMinimal : styles.toggleChipChic]} onPress={() => setEditor((current) => ({ ...current, completed: !current.completed }))}>
                <Text style={[styles.toggleChipText, editor.completed && styles.toggleChipTextActive]}>完了</Text>
              </Pressable>
              <Pressable style={[styles.editorCancel, designMode === 'minimal' ? styles.editorCancelMinimal : styles.editorCancelChic]} onPress={() => setEditor(emptyEditor)}>
                <Text style={[styles.editorCancelText, { color: theme.colors.secondaryText }]}>閉じる</Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, designMode === 'minimal' ? styles.primaryButtonMinimal : styles.primaryButtonChic, styles.editorSaveButton]} onPress={saveEditor}>
                <Text style={styles.primaryButtonText}>保存</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showReviewDatePicker} transparent animationType="fade" onRequestClose={() => setShowReviewDatePicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowReviewDatePicker(false)}>
          <Pressable style={[styles.editorSheet, designMode === 'minimal' ? styles.editorSheetMinimal : styles.editorSheetChic]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.editorTitle, { color: theme.colors.primaryText }]}>記録日を選ぶ</Text>
            <DateTimePicker
              value={dateFromKey(reviewDraft.date || wishDateKey())}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                if (!selected) return;
                setReviewDraft((current) => ({ ...current, date: formatDateKey(selected) }));
                if (Platform.OS !== 'ios') setShowReviewDatePicker(false);
              }}
            />
            <View style={styles.editorToggleRow}>
              <Pressable style={[styles.editorCancel, designMode === 'minimal' ? styles.editorCancelMinimal : styles.editorCancelChic]} onPress={() => setShowReviewDatePicker(false)}>
                <Text style={[styles.editorCancelText, { color: theme.colors.secondaryText }]}>閉じる</Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, designMode === 'minimal' ? styles.primaryButtonMinimal : styles.primaryButtonChic]} onPress={() => setShowReviewDatePicker(false)}>
                <Text style={styles.primaryButtonText}>決定</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function formatDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function SectionCard({
  title,
  subtitle,
  designMode,
  chicPattern,
  showBRibbon = false,
  showCRibbon = false,
  children,
}: {
  title: string;
  subtitle?: string;
  designMode: DesignMode;
  chicPattern: ChicPattern;
  showBRibbon?: boolean;
  showCRibbon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.sectionCard, designMode === 'minimal' ? styles.sectionCardMinimal : styles.sectionCardChic]}>
      {showBRibbon && <BThemeRibbonDecoration journal={title.includes('九☆')} />}
      {showCRibbon && <CThemeRibbonDecoration journal={title.includes('九☆')} />}
      {designMode === 'chic' && <WishBackdrop pattern={chicPattern} />}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: sectionText(designMode, '#392F34', '#171715') }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: sectionText(designMode, '#8B7B82', '#777772') }]}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function StatCard({ label, value, minimal = false }: { label: string; value: string; minimal?: boolean }) {
  return (
    <View style={[styles.statCard, minimal ? styles.statCardMinimal : styles.statCardChic]}>
      <Text style={[styles.statLabel, minimal ? styles.statLabelMinimal : styles.statLabelChic]}>{label}</Text>
      <Text style={[styles.statValue, minimal ? styles.statValueMinimal : styles.statValueChic]}>{value}</Text>
    </View>
  );
}

function WishBackdrop({ pattern }: { pattern: ChicPattern }) {
  const symbol = patternSymbol(pattern);
  return (
    <View pointerEvents="none" style={styles.patternBackdrop}>
      {Array.from({ length: 12 }, (_, index) => (
        <Text key={index} style={[styles.patternGlyph, { left: 14 + (index % 4) * 56, top: 12 + Math.floor(index / 4) * 30 }]}>{symbol}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  screenMinimal: { backgroundColor: '#F4F4F2' },
  screenDark: { backgroundColor: '#0E1117' },
  screenChic: { backgroundColor: '#FFF9F6' },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 12 },
  backButton: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 12, backgroundColor: '#FFFFFF' },
  backButtonMinimal: { borderRadius: 2, borderColor: '#111111' },
  backButtonChic: { borderColor: '#E8D9E2', backgroundColor: '#FFF3F5' },
  backButtonText: { fontSize: 12, fontWeight: '900' },
  sectionCard: { borderWidth: 1, borderRadius: 22, padding: 14, overflow: 'hidden', position: 'relative' },
  wishBowRibbon: { position: 'absolute', right: 4, top: 0, width: 112, height: 88, zIndex: 3 },
  wishFrameRibbon: { position: 'absolute', left: 5, right: 5, top: 5, bottom: 5, zIndex: 3 },
  sectionCardMinimal: { backgroundColor: '#FFFFFF', borderColor: '#111111', borderRadius: 4 },
  sectionCardChic: { backgroundColor: '#FFF3F5', borderColor: '#F0DFE5', borderRadius: 26, shadowColor: '#D986A1', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  sectionHeader: { marginBottom: 10, zIndex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionSubtitle: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  themePanel: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10, backgroundColor: '#FFFFFF' },
  themePanelMinimal: { borderColor: '#111111', borderRadius: 2 },
  themePanelChic: { borderColor: '#E8D9E2' },
  themeInput: { minHeight: 78, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontWeight: '800', color: '#282538', textAlignVertical: 'top', backgroundColor: '#FFFFFF' },
  themeInputMinimal: { borderColor: '#111111', borderRadius: 2 },
  themeInputChic: { borderColor: '#E7D9E3' },
  rowActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  secondaryButton: { minWidth: 82, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, alignItems: 'center', backgroundColor: '#F0EDF4' },
  secondaryButtonMinimal: { borderColor: '#111111', borderWidth: 1, backgroundColor: '#FFFFFF', borderRadius: 2 },
  secondaryButtonChic: { backgroundColor: '#F7F0F4' },
  secondaryButtonText: { fontSize: 12, fontWeight: '900' },
  primaryButton: { minWidth: 82, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, alignItems: 'center', backgroundColor: '#7559E8' },
  primaryButtonMinimal: { backgroundColor: '#111111', borderRadius: 2 },
  primaryButtonChic: { backgroundColor: '#7057B3' },
  primaryButtonText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
  listGap: { gap: 8 },
  emptyText: { fontSize: 11, lineHeight: 17, fontWeight: '700' },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 12, backgroundColor: '#FFFFFF' },
  completionCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#D986A1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  completionCheckActive: { backgroundColor: '#D986A1', borderColor: '#D986A1' },
  completionCheckMinimal: { borderRadius: 2, borderColor: '#111111' },
  completionCheckText: { color: '#D986A1', fontSize: 17, lineHeight: 20, fontWeight: '900' },
  completionCheckTextActive: { color: '#FFFFFF' },
  itemCardMinimal: { borderColor: '#111111', borderRadius: 2 },
  itemCardChic: { borderColor: '#E5DFEA' },
  itemCardDone: { opacity: 0.62 },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '900', color: '#282538' },
  itemTitleDone: { textDecorationLine: 'line-through' },
  itemMeta: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  itemActions: { alignItems: 'flex-end', gap: 6 },
  itemActionText: { fontSize: 11, fontWeight: '900' },
  deleteText: { color: '#B95B67' },
  addRow: { marginTop: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderRadius: 14, backgroundColor: '#FFFFFF' },
  addRowMinimal: { borderColor: '#111111', borderRadius: 2 },
  addRowChic: { borderColor: '#E0D5E1', backgroundColor: '#FFF8FA' },
  addRowDisabled: { opacity: 0.45 },
  addRowText: { fontSize: 13, fontWeight: '900' },
  progressMinimal: { gap: 12 },
  progressNumberMinimal: { fontSize: 42, lineHeight: 46, fontWeight: '300', color: '#111111' },
  statGrid: { flexDirection: 'row', gap: 10 },
  progressChic: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ring: { width: 122, height: 122, borderRadius: 61, borderWidth: 10, borderColor: '#E9D1DC', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  ringInner: { width: 94, height: 94, borderRadius: 47, backgroundColor: '#FFF3F5', alignItems: 'center', justifyContent: 'center' },
  progressNumberChic: { color: '#D986A1', fontSize: 28, fontWeight: '900' },
  statColumn: { flex: 1, gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, backgroundColor: '#FFFFFF' },
  statCardMinimal: { borderColor: '#111111', borderRadius: 2 },
  statCardChic: { borderColor: '#E5DFEA' },
  statLabel: { fontSize: 10, fontWeight: '900', color: '#777772' },
  statLabelMinimal: { color: '#171715' },
  statLabelChic: { color: '#8B7B82' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#171715', marginTop: 4 },
  statValueMinimal: { color: '#111111' },
  statValueChic: { color: '#392F34' },
  reviewPanel: { gap: 10, borderWidth: 1, borderRadius: 16, padding: 12, backgroundColor: '#FFFFFF' },
  reviewPanelMinimal: { borderColor: '#111111', borderRadius: 2 },
  reviewPanelChic: { borderColor: '#E8D9E2', backgroundColor: '#FFFFFF' },
  photoBox: { height: 160, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#F9F8FB' },
  photoBoxMinimal: { borderColor: '#111111', borderRadius: 2 },
  photoBoxChic: { borderColor: '#E8D9E2', backgroundColor: '#FFF7FA' },
  photoText: { fontSize: 12, fontWeight: '800' },
  photoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  reviewDateRow: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: '#FFFDFE' },
  reviewDateRowMinimal: { borderColor: '#111111', borderRadius: 2 },
  reviewDateRowChic: { borderColor: '#E8D9E2', backgroundColor: '#FFF8FB' },
  reviewDateLabel: { fontSize: 10, fontWeight: '800' },
  reviewDateValue: { fontSize: 13, fontWeight: '900', marginTop: 3 },
  reviewDateHint: { fontSize: 9, fontWeight: '700', marginTop: 2 },
  reviewDateArrow: { fontSize: 20, fontWeight: '900' },
  reviewInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF', fontSize: 13, fontWeight: '800', color: '#282538' },
  reviewInputMinimal: { borderColor: '#111111', borderRadius: 2 },
  reviewInputChic: { borderColor: '#DDD3DE' },
  reviewMemo: { minHeight: 92, textAlignVertical: 'top' },
  satisfactionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  satisfactionPill: { minWidth: 36, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 14, alignItems: 'center', backgroundColor: '#FFFFFF' },
  satisfactionPillMinimal: { borderColor: '#111111', borderRadius: 2 },
  satisfactionPillChic: { borderColor: '#DDD7E1' },
  satisfactionPillActive: { backgroundColor: '#F4D8E2', borderColor: '#D986A1' },
  satisfactionText: { fontSize: 12, fontWeight: '900', color: '#777772' },
  satisfactionTextActive: { color: '#392F34' },
  satisfactionLabel: { fontSize: 10, fontWeight: '800', marginLeft: 2 },
  reviewSaveButton: { alignSelf: 'flex-end', minWidth: 92 },
  reviewHistoryList: { gap: 10 },
  reviewHistoryItem: { flexDirection: 'row', gap: 10, padding: 10, borderWidth: 1, borderRadius: 14, backgroundColor: '#FFFFFF' },
  reviewHistoryItemMinimal: { borderColor: '#111111', borderRadius: 2 },
  reviewHistoryItemChic: { borderColor: '#E8D9E2', backgroundColor: '#FFF8FB' },
  reviewHistoryPhoto: { width: 64, height: 64, borderRadius: 10, resizeMode: 'cover' },
  reviewHistoryPhotoEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F1F4' },
  reviewHistoryPhotoText: { color: '#8F8792', fontSize: 10, fontWeight: '800' },
  reviewHistoryBody: { flex: 1, minWidth: 0 },
  reviewHistoryMonth: { fontSize: 12, fontWeight: '900' },
  reviewHistoryNote: { fontSize: 12, fontWeight: '800', marginTop: 5 },
  reviewHistoryMemo: { fontSize: 10, lineHeight: 15, marginTop: 4 },
  reviewHistorySatisfaction: { fontSize: 10, fontWeight: '900', marginTop: 5 },
  reviewCalendar: { padding: 10, borderWidth: 1, borderRadius: 14, backgroundColor: '#FFFFFF' },
  reviewCalendarMinimal: { borderColor: '#111111', borderRadius: 2 },
  reviewCalendarChic: { borderColor: '#E8D9E2', backgroundColor: '#FFF8FB' },
  reviewCalendarTitle: { fontSize: 12, fontWeight: '900', marginBottom: 8 },
  reviewCalendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  reviewCalendarDay: { width: '14.2857%', minHeight: 28, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  reviewCalendarDayMarked: { backgroundColor: '#F7E8EF', borderRadius: 8 },
  reviewCalendarDayText: { fontSize: 10, fontWeight: '800' },
  reviewCalendarDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(32,25,40,0.45)', justifyContent: 'center', padding: 16 },
  editorSheet: { borderRadius: 18, padding: 16, gap: 10 },
  editorSheetMinimal: { borderRadius: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#111111' },
  editorSheetChic: { backgroundColor: '#FFF3F5', borderWidth: 1, borderColor: '#F0DFE5' },
  editorTitle: { fontSize: 16, fontWeight: '900' },
  editorInput: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF', fontSize: 13, fontWeight: '800', color: '#282538' },
  editorInputMinimal: { borderColor: '#111111', borderRadius: 2 },
  editorInputChic: { borderColor: '#E7D9E3' },
  wishSelectWrap: { gap: 6 },
  editorMeta: { fontSize: 10, fontWeight: '800' },
  wishSelectRow: { gap: 8, paddingVertical: 4 },
  wishChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#FFFFFF' },
  wishChipMinimal: { borderColor: '#111111', borderRadius: 2 },
  wishChipChic: { borderColor: '#DDD7E1' },
  wishChipActive: { backgroundColor: '#F4D8E2', borderColor: '#D986A1' },
  wishChipText: { fontSize: 11, fontWeight: '800', color: '#777772' },
  wishChipTextActive: { color: '#392F34' },
  editorToggleRow: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  toggleChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#FFFFFF' },
  toggleChipMinimal: { borderColor: '#111111', borderRadius: 2 },
  toggleChipChic: { borderColor: '#DDD7E1' },
  toggleChipActive: { backgroundColor: '#F4D8E2', borderColor: '#D986A1' },
  toggleChipText: { fontSize: 12, fontWeight: '900', color: '#777772' },
  toggleChipTextActive: { color: '#392F34' },
  editorCancel: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', backgroundColor: '#FFFFFF' },
  editorCancelMinimal: { borderColor: '#111111', borderRadius: 2 },
  editorCancelChic: { borderColor: '#DDD7E1' },
  editorCancelText: { fontSize: 12, fontWeight: '900' },
  editorSaveButton: { flex: 1 },
  patternBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.16, overflow: 'hidden' },
  patternGlyph: { position: 'absolute', fontSize: 16, color: '#D986A1' },
});
