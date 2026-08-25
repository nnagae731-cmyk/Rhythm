import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChicPattern, ChicThemePalette, DesignMode, getThemeTokens } from './theme';
import { Affirmation, AffirmationCustomText, MonthlyWishState, Wish, WishAction } from './types';
import { PlanTier } from './premiumAccess';
import { calculateWishProgress } from './features/wish/wishUtils';
import { BThemeRibbonDecoration } from './components/BThemeRibbonDecoration';
import { CThemeRibbonDecoration } from './components/CThemeRibbonDecoration';
import { RewardedAccessModal, RewardedAccessResult } from './components/RewardedAccessModal';
import { AffirmationSettingsCard } from './components/AffirmationSettingsCard';

type WishScreenProps = {
  designMode: DesignMode;
  chicPattern: ChicPattern;
  chicPalette?: ChicThemePalette;
  monthLabel: string;
  state: MonthlyWishState;
  onSaveState: (updater: (current: MonthlyWishState) => MonthlyWishState) => void;
  onCreateTaskFromAction?: (action: WishAction) => void;
  canCreateWish?: boolean;
  wishRewardProgress?: { current: number; required: number };
  onRequestWishReward?: () => Promise<RewardedAccessResult> | RewardedAccessResult;
  onWishCreated?: () => void;
  affirmations: Affirmation[];
  affirmationCustomTexts: AffirmationCustomText[];
  planTier: PlanTier;
  onSaveAffirmation: (affirmation: Affirmation) => Promise<void> | void;
  onDeleteAffirmation: (affirmation: Affirmation) => Promise<void> | void;
  onSaveAffirmationCustomText: (text: AffirmationCustomText) => void;
  onDeleteAffirmationCustomText: (id: string) => void;
  canCreateWishAction?: boolean;
  monthlyGoalUnlocked?: boolean;
  monthlyGoalRewardProgress?: { current: number; required: number };
  onRequestMonthlyGoalReward?: () => Promise<RewardedAccessResult> | RewardedAccessResult;
  onPremium?: () => void;
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

export function WishScreen({ designMode: rawDesignMode, chicPattern, chicPalette, monthLabel, state, onSaveState, onCreateTaskFromAction, canCreateWish = true, wishRewardProgress, onRequestWishReward, onWishCreated, affirmations, affirmationCustomTexts, planTier, onSaveAffirmation, onDeleteAffirmation, onSaveAffirmationCustomText, onDeleteAffirmationCustomText, canCreateWishAction = true, monthlyGoalUnlocked = false, monthlyGoalRewardProgress, onRequestMonthlyGoalReward, onPremium, onBack }: WishScreenProps) {
  // Mono DarkはMono Lightと同じレイアウトを使い、色だけを反転する。
  const designMode: 'minimal' | 'chic' = rawDesignMode === 'dark' || rawDesignMode === 'photo' ? 'minimal' : rawDesignMode;
  const isDark = rawDesignMode === 'dark';
  const theme = getThemeTokens(rawDesignMode, chicPalette?.id ?? 'cool');
  const palette = chicPalette;
  const designSurface = rawDesignMode === 'chic' && palette ? { backgroundColor: palette.cardSurface, borderColor: palette.border } : undefined;
  const designSubtle = rawDesignMode === 'chic' && palette ? { backgroundColor: palette.surfaceSubtle, borderColor: palette.border } : undefined;
  const designAccent = rawDesignMode === 'chic' && palette ? { backgroundColor: palette.accent, borderColor: palette.accent } : undefined;
  const designText = rawDesignMode === 'chic' && palette ? { color: palette.textPrimary } : undefined;
  const darkAccent = rawDesignMode === 'dark' ? '#8EA6FF' : theme.colors.primaryAccent;
  const progress = useMemo(() => calculateWishProgress(state), [state]);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [rewardPrompt, setRewardPrompt] = useState<'wish' | 'monthlyGoal' | null>(null);
  const [monthlyGoalDraft, setMonthlyGoalDraft] = useState(state.monthlyGoal ?? '');
  const [monthlyGoalEditing, setMonthlyGoalEditing] = useState(!(state.monthlyGoal ?? '').trim());

  useEffect(() => {
    setMonthlyGoalDraft(state.monthlyGoal ?? '');
    if (!(state.monthlyGoal ?? '').trim()) setMonthlyGoalEditing(true);
  }, [state.monthlyGoal]);

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

  const openActionEditor = (action?: WishAction) => {
    // Actions are Premium-only. Keep the legacy Rewarded progress in storage
    // for compatibility, but never open the old action Rewarded flow.
    if (!canCreateWishAction) return;
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
    commit((current) => ({
      ...current,
      wishes: current.wishes.filter((wish) => wish.id !== id),
      actions: current.actions.filter((action) => action.wishId !== id),
    }));
  };

  const deleteAction = (id: string) => {
    commit((current) => ({ ...current, actions: current.actions.filter((action) => action.id !== id) }));
  };

  const wishes = state.wishes;
  const actions = state.actions;

  return (
    <View style={[styles.screen, designMode === 'minimal' ? styles.screenMinimal : styles.screenChic, rawDesignMode === 'dark' && styles.screenDark, rawDesignMode === 'chic' && { backgroundColor: 'transparent' }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <SectionCard
            designMode={designMode}
            dark={isDark}
            chicPattern={chicPattern}
            chicPalette={palette}
            title="今月の目標"
            subtitle={monthLabel}
          >
            {monthlyGoalUnlocked ? (
              monthlyGoalEditing ? (
                <View style={[styles.themePanel, designMode === 'minimal' ? styles.themePanelMinimal : styles.themePanelChic, isDark && styles.themePanelDark, designSubtle]}>
                  <TextInput value={monthlyGoalDraft} onChangeText={setMonthlyGoalDraft} placeholder="今月いちばん意識したいこと" placeholderTextColor={theme.colors.secondaryText} style={[styles.themeInput, designMode === 'minimal' ? styles.themeInputMinimal : styles.themeInputChic, isDark && styles.themeInputDark, designSurface, designText]} multiline />
                  <View style={styles.rowActions}>
                    <Pressable style={[styles.secondaryButton, designMode === 'minimal' ? styles.secondaryButtonMinimal : styles.secondaryButtonChic, isDark && styles.secondaryButtonDark, designSubtle]} onPress={() => { setMonthlyGoalDraft(''); commit((current) => ({ ...current, monthlyGoal: '' })); setMonthlyGoalEditing(false); }}><Text style={[styles.secondaryButtonText, { color: theme.colors.secondaryText }]}>削除</Text></Pressable>
                    <Pressable style={[styles.primaryButton, designMode === 'minimal' ? styles.primaryButtonMinimal : styles.primaryButtonChic, isDark && styles.primaryButtonDark, designAccent]} onPress={() => { const value = monthlyGoalDraft.trim(); commit((current) => ({ ...current, monthlyGoal: value })); setMonthlyGoalDraft(value); setMonthlyGoalEditing(false); Keyboard.dismiss(); Alert.alert('保存しました', '今月の目標を保存しました。'); }}><Text style={styles.primaryButtonText}>保存</Text></Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={[styles.savedThemeCard, isDark && styles.savedThemeCardDark]} onPress={() => setMonthlyGoalEditing(true)}>
                  <Text style={[styles.savedThemeText, { color: rawDesignMode === 'chic' && palette ? palette.textPrimary : theme.colors.primaryText }]}>{state.monthlyGoal}</Text>
                  <Text style={[styles.savedThemeEdit, { color: rawDesignMode === 'chic' && palette ? palette.accentStrong : theme.colors.primaryAccent }]}>編集</Text>
                </Pressable>
              )
            ) : (
              <View>
                <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>今月いちばん意識したいことを1つ決めて、毎日の行動につなげます。</Text>
                <Text style={[styles.itemMeta, { color: theme.colors.secondaryText, marginTop: 8 }]}>広告を5回見ると、今月の目標を設定できます。 {monthlyGoalRewardProgress?.current ?? 0} / {monthlyGoalRewardProgress?.required ?? 5} 回視聴済み</Text>
                <Pressable style={[styles.addRow, designMode === 'minimal' ? styles.addRowMinimal : styles.addRowChic, isDark && styles.addRowDark, designSubtle]} onPress={() => setRewardPrompt('monthlyGoal')}><Text style={[styles.addRowText, { color: darkAccent }]}>広告を見て取得</Text></Pressable>
              </View>
            )}
          </SectionCard>

          <AffirmationSettingsCard
            affirmations={affirmations}
            customTexts={affirmationCustomTexts}
            designMode={rawDesignMode}
            chicPalette={palette}
            planTier={planTier}
            onPremium={onPremium ?? (() => undefined)}
            onSave={onSaveAffirmation}
            onDelete={onDeleteAffirmation}
            onSaveCustomText={onSaveAffirmationCustomText}
            onDeleteCustomText={onDeleteAffirmationCustomText}
            styles={styles}
            compact
          />

          <SectionCard
            designMode={designMode}
            dark={isDark}
            chicPattern={chicPattern}
            chicPalette={palette}
            title="叶えたいこと"
            subtitle="今月の願い"
          >
            <View style={styles.listGap}>
              {wishes.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>まだありません。今月の願いを1つ書いてみよう。</Text>
              ) : wishes.map((wish) => (
                <Pressable
                  key={wish.id}
                  style={[styles.itemRow, designMode === 'minimal' ? styles.itemRowMinimal : styles.itemRowChic, isDark && styles.itemRowDark, wish.completed && styles.itemRowDone, designMode === 'chic' && palette && { borderBottomColor: palette.border }]}
                  onPress={() => openWishEditor(wish)}
                >
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: wish.completed }}
                    style={[styles.completionCheck, designMode === 'minimal' && styles.completionCheckMinimal, isDark && styles.completionCheckDark, wish.completed && styles.completionCheckActive, wish.completed && isDark && styles.completionCheckActiveDark, designMode === 'chic' && palette && { borderColor: palette.accent, backgroundColor: wish.completed ? palette.accent : palette.cardSurface }]}
                    onPress={(event) => { event.stopPropagation(); toggleWish(wish.id); }}
                  >
                    <Text style={[styles.completionCheckText, isDark && styles.completionCheckTextDark, designMode === 'minimal' && { color: theme.colors.primaryAccent }, rawDesignMode === 'chic' && palette && { color: palette.accent }, wish.completed && styles.completionCheckTextActive]}>{wish.completed ? '✓' : ''}</Text>
                  </Pressable>
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemTitle, isDark && styles.itemTitleDark, wish.completed && styles.itemTitleDone, designText]}>{wish.title}</Text>
                    {wish.completed ? <Text style={[styles.itemMeta, { color: theme.colors.secondaryText }]}>完了{wish.completedAt ? ` ・ ${new Date(wish.completedAt).getMonth() + 1}/${new Date(wish.completedAt).getDate()}` : ''}</Text> : null}
                  </View>
                  <Text style={[styles.itemChevron, { color: rawDesignMode === 'chic' && palette ? palette.accent : theme.colors.secondaryText }]}>›</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={[styles.addRow, designMode === 'minimal' ? styles.addRowMinimal : styles.addRowChic, isDark && styles.addRowDark, designSubtle]} onPress={() => openWishEditor()}>
              <Text style={[styles.addRowText, { color: darkAccent }]}>＋ 叶えたいことを追加</Text>
            </Pressable>
            {!canCreateWish && wishRewardProgress && <Text style={[styles.itemMeta, { color: theme.colors.secondaryText, marginTop: 8 }]}>広告を2回見ると、叶えたいことを1件追加できます。 {wishRewardProgress.current} / {wishRewardProgress.required}</Text>}
          </SectionCard>

          <SectionCard
            designMode={designMode}
            dark={isDark}
            chicPattern={chicPattern}
            chicPalette={palette}
            title="叶えるための行動"
            subtitle="行動"
          >
            {canCreateWishAction ? <>
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
                      style={[styles.itemRow, designMode === 'minimal' ? styles.itemRowMinimal : styles.itemRowChic, isDark && styles.itemRowDark, action.completed && styles.itemRowDone, designMode === 'chic' && palette && { borderBottomColor: palette.border }]}
                      onPress={() => openActionEditor(action)}
                    >
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: action.completed }}
                        style={[styles.completionCheck, designMode === 'minimal' && styles.completionCheckMinimal, isDark && styles.completionCheckDark, action.completed && styles.completionCheckActive, action.completed && isDark && styles.completionCheckActiveDark, designMode === 'chic' && palette && { borderColor: palette.accent, backgroundColor: action.completed ? palette.accent : palette.cardSurface }]}
                        onPress={(event) => { event.stopPropagation(); toggleAction(action.id); }}
                      >
                        <Text style={[styles.completionCheckText, isDark && styles.completionCheckTextDark, designMode === 'minimal' && { color: theme.colors.primaryAccent }, rawDesignMode === 'chic' && palette && { color: palette.accent }, action.completed && styles.completionCheckTextActive]}>{action.completed ? '✓' : ''}</Text>
                      </Pressable>
                      <View style={styles.itemBody}>
                        <Text style={[styles.itemTitle, isDark && styles.itemTitleDark, action.completed && styles.itemTitleDone, designText]}>{action.title}</Text>
                        <Text style={[styles.itemMeta, { color: theme.colors.secondaryText }]}>{wish ? wish.title : '願い未選択'}</Text>
                        {action.completed ? <Text style={[styles.itemMeta, { color: theme.colors.secondaryText }]}>完了{action.completedAt ? ` ・ ${new Date(action.completedAt).getMonth() + 1}/${new Date(action.completedAt).getDate()}` : ''}</Text> : null}
                      </View>
                      <Text style={[styles.itemChevron, { color: rawDesignMode === 'chic' && palette ? palette.accent : theme.colors.secondaryText }]}>›</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[styles.addRow, designMode === 'minimal' ? styles.addRowMinimal : styles.addRowChic, isDark && styles.addRowDark, !wishes.length && styles.addRowDisabled, designSubtle]}
                onPress={() => wishes.length ? openActionEditor() : Alert.alert('先に叶えたいことを1つ作ってね')}
              >
                <Text style={[styles.addRowText, { color: rawDesignMode === 'dark' ? darkAccent : wishes.length ? theme.colors.primaryAccent : theme.colors.secondaryText }]}>＋ 行動を追加</Text>
              </Pressable>
            </> : (
              <Pressable
                style={[styles.lockedFeatureCard, isDark && styles.lockedFeatureCardDark, rawDesignMode === 'chic' && palette && { backgroundColor: palette.surfaceSubtle, borderColor: palette.border }]}
                onPress={onPremium}
              >
                <Text style={[styles.lockedFeatureTitle, isDark && styles.lockedFeatureTitleDark, rawDesignMode === 'chic' && palette && { color: palette.textPrimary }]}>🔒 叶えるための行動</Text>
                <Text style={[styles.lockedFeatureText, isDark && styles.lockedFeatureTextDark, rawDesignMode === 'chic' && palette && { color: palette.textSecondary }]}>叶えたいことを、今日できる行動に分けられます。</Text>
                <Text style={[styles.lockedFeatureCta, { color: rawDesignMode === 'chic' && palette ? palette.accent : darkAccent }]}>Premiumで利用できます</Text>
              </Pressable>
            )}
          </SectionCard>

          <SectionCard
            designMode={designMode}
            chicPattern={chicPattern}
            chicPalette={palette}
            title="今月の進捗"
            dark={isDark}
            subtitle={canCreateWishAction ? `${progress.progress}%` : 'Premium限定'}
          >
            {canCreateWishAction ? (
              <View style={styles.progressCompact}>
                <View style={styles.progressSummaryRow}>
                  <Text style={[styles.progressNumberCompact, isDark && styles.progressNumberDark, rawDesignMode === 'chic' && palette && { color: palette.accent }]}>{progress.progress}%</Text>
                  <Text style={[styles.progressSummary, { color: rawDesignMode === 'chic' && palette ? palette.textSecondary : theme.colors.secondaryText }]}>{progress.wishCompleted}/{progress.wishTotal}件の願い ・ {progress.actionCompleted}/{progress.actionTotal}件の行動</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: rawDesignMode === 'chic' && palette ? palette.surfaceSubtle : theme.colors.secondarySurface }]}>
                  <View style={[styles.progressFill, { width: `${progress.progress}%`, backgroundColor: rawDesignMode === 'chic' && palette ? palette.accent : theme.colors.primaryAccent }]} />
                </View>
              </View>
            ) : (
              <Pressable
                style={[styles.lockedFeatureCard, isDark && styles.lockedFeatureCardDark, rawDesignMode === 'chic' && palette && { backgroundColor: palette.surfaceSubtle, borderColor: palette.border }]}
                onPress={onPremium}
              >
                <Text style={[styles.lockedFeatureTitle, isDark && styles.lockedFeatureTitleDark, rawDesignMode === 'chic' && palette && { color: palette.textPrimary }]}>🔒 今月の進捗</Text>
                <Text style={[styles.lockedFeatureText, isDark && styles.lockedFeatureTextDark, rawDesignMode === 'chic' && palette && { color: palette.textSecondary }]}>叶えたいことと行動の達成状況をまとめて振り返れます。</Text>
                <Text style={[styles.lockedFeatureCta, { color: rawDesignMode === 'chic' && palette ? palette.accent : darkAccent }]}>Premiumで確認</Text>
              </Pressable>
            )}
          </SectionCard>

        </ScrollView>
        <RewardedAccessModal
          visible={rewardPrompt !== null}
          title={rewardPrompt === 'monthlyGoal' ? '今月の目標' : '叶えたいことを追加'}
          description={rewardPrompt === 'monthlyGoal' ? '広告を5回見ると、今月の目標を設定できます。' : '広告を2回見ると、叶えたいことを1件追加できます。'}
          current={rewardPrompt === 'monthlyGoal' ? monthlyGoalRewardProgress?.current ?? 0 : wishRewardProgress?.current ?? 0}
          required={rewardPrompt === 'monthlyGoal' ? monthlyGoalRewardProgress?.required ?? 5 : 2}
          designMode={rawDesignMode}
          chicPalette={palette}
          onClose={() => setRewardPrompt(null)}
          onPremium={onPremium}
          onReward={async () => {
            const mode = rewardPrompt;
            if (mode === 'monthlyGoal') {
              const result = await onRequestMonthlyGoalReward?.() ?? { success: false, message: '広告を利用できません。' };
              if (result.completed) { setRewardPrompt(null); setMonthlyGoalEditing(true); }
              return result;
            }
            const result = await onRequestWishReward?.() ?? { success: false, message: '広告を利用できません。' };
            if (result.completed) {
              setRewardPrompt(null);
              setEditor({ visible: true, mode: 'wish', id: undefined, title: '', wishId: undefined, completed: false });
            }
            return result;
          }}
        />
      </KeyboardAvoidingView>

      <Modal visible={editor.visible} transparent animationType="fade" onRequestClose={() => setEditor(emptyEditor)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditor(emptyEditor)}>
          <Pressable style={[styles.editorSheet, designMode === 'minimal' ? styles.editorSheetMinimal : styles.editorSheetChic, isDark && styles.editorSheetDark, designSurface]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.editorTitle, { color: theme.colors.primaryText }]}>{editor.mode === 'wish' ? (editor.id ? '叶えたいことを編集' : '叶えたいことを追加') : editor.id ? '行動を編集' : '行動を追加'}</Text>
            <TextInput
              value={editor.title}
              onChangeText={(value) => setEditor((current) => ({ ...current, title: value }))}
                placeholder={editor.mode === 'wish' ? '叶えたいこと' : '叶えるための行動'}
              placeholderTextColor={theme.colors.secondaryText}
              style={[styles.editorInput, designMode === 'minimal' ? styles.editorInputMinimal : styles.editorInputChic, isDark && styles.editorInputDark, designSurface, designText]}
            />
            {editor.mode === 'action' && (
              <View style={styles.wishSelectWrap}>
              <Text style={[styles.editorMeta, { color: theme.colors.secondaryText }]}>関連する願い</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wishSelectRow}>
                  {state.wishes.map((wish) => (
                    <Pressable
                      key={wish.id}
                      style={[styles.wishChip, designMode === 'minimal' ? styles.wishChipMinimal : styles.wishChipChic, isDark && styles.wishChipDark, editor.wishId === wish.id && styles.wishChipActive, editor.wishId === wish.id && isDark && styles.wishChipActiveDark, designMode === 'chic' && palette && { backgroundColor: editor.wishId === wish.id ? palette.accentSoft : palette.cardSurface, borderColor: editor.wishId === wish.id ? palette.accent : palette.border }]}
                      onPress={() => setEditor((current) => ({ ...current, wishId: wish.id }))}
                    >
                      <Text style={[styles.wishChipText, isDark && styles.wishChipTextDark, editor.wishId === wish.id && styles.wishChipTextActive, editor.wishId === wish.id && isDark && styles.wishChipTextActiveDark, designMode === 'chic' && palette && { color: editor.wishId === wish.id ? palette.accentStrong : palette.textSecondary }]}>{wish.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            {editor.mode === 'action' && onCreateTaskFromAction && <Pressable style={[styles.editorTaskLink, { borderColor: rawDesignMode === 'chic' && palette ? palette.border : theme.colors.border }]} onPress={createTaskFromActionEditor}>
              <Text style={[styles.editorTaskLinkText, { color: rawDesignMode === 'chic' && palette ? palette.accent : theme.colors.primaryAccent }]}>ToDoに追加 ›</Text>
            </Pressable>}
            <View style={styles.editorToggleRow}>
              <Pressable style={[styles.toggleChip, designMode === 'minimal' ? styles.toggleChipMinimal : styles.toggleChipChic, isDark && styles.toggleChipDark, editor.completed && styles.toggleChipActive, editor.completed && isDark && styles.toggleChipActiveDark, designMode === 'chic' && palette && { backgroundColor: editor.completed ? palette.accentSoft : palette.cardSurface, borderColor: editor.completed ? palette.accent : palette.border }]} onPress={() => setEditor((current) => ({ ...current, completed: !current.completed }))}>
                <Text style={[styles.toggleChipText, isDark && styles.toggleChipTextDark, editor.completed && styles.toggleChipTextActive, editor.completed && isDark && styles.toggleChipTextActiveDark, designMode === 'chic' && palette && { color: editor.completed ? palette.accentStrong : palette.textSecondary }]}>完了</Text>
              </Pressable>
              <Pressable style={[styles.editorCancel, designMode === 'minimal' ? styles.editorCancelMinimal : styles.editorCancelChic, isDark && styles.editorCancelDark]} onPress={() => setEditor(emptyEditor)}>
                <Text style={[styles.editorCancelText, { color: theme.colors.secondaryText }]}>閉じる</Text>
              </Pressable>
              {editor.id && <Pressable style={styles.editorDeleteButton} onPress={() => Alert.alert('削除しますか？', undefined, [{ text: 'キャンセル', style: 'cancel' }, { text: '削除', style: 'destructive', onPress: () => { editor.mode === 'wish' ? deleteWish(editor.id!) : deleteAction(editor.id!); setEditor(emptyEditor); } }])}>
                <Text style={styles.editorDeleteText}>削除</Text>
              </Pressable>}
              <Pressable style={[styles.primaryButton, designMode === 'minimal' ? styles.primaryButtonMinimal : styles.primaryButtonChic, isDark && styles.primaryButtonDark, styles.editorSaveButton, designMode === 'chic' && palette && { backgroundColor: palette.accent, borderColor: palette.accent }]} onPress={saveEditor}>
                <Text style={styles.primaryButtonText}>保存</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  designMode,
  dark = false,
  chicPattern,
  chicPalette,
  showBRibbon = false,
  showCRibbon = false,
  children,
}: {
  title: string;
  subtitle?: string;
  designMode: DesignMode;
  dark?: boolean;
  chicPattern: ChicPattern;
  chicPalette?: ChicThemePalette;
  showBRibbon?: boolean;
  showCRibbon?: boolean;
  children: React.ReactNode;
}) {
  const tokens = designMode === 'chic' && chicPalette
    ? { primary: chicPalette.textPrimary, secondary: chicPalette.textSecondary }
    : (() => { const colors = getThemeTokens(designMode).colors; return { primary: colors.primaryText, secondary: colors.secondaryText }; })();
  return (
    <View style={[styles.sectionCard, designMode === 'minimal' ? styles.sectionCardMinimal : styles.sectionCardChic, dark && styles.sectionCardDark, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border, shadowColor: chicPalette.accent }]}>
      {showBRibbon && <BThemeRibbonDecoration journal={title.includes('九☆')} />}
      {showCRibbon && <CThemeRibbonDecoration journal={title.includes('九☆')} />}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.primary }, dark && styles.sectionTitleDark]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: tokens.secondary }, dark && styles.sectionSubtitleDark]}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  screenMinimal: { backgroundColor: '#F4F4F2' },
  screenDark: { backgroundColor: '#0E1117' },
  screenChic: { backgroundColor: '#FFF9F6' },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120, gap: 12 },
  sectionCard: { borderWidth: 1, borderRadius: 22, padding: 14, overflow: 'hidden', position: 'relative' },
  sectionCardMinimal: { backgroundColor: '#FFFFFF', borderColor: '#111111', borderRadius: 20 },
  sectionCardChic: { backgroundColor: '#FFF3F5', borderColor: '#F0DFE5', borderRadius: 26, shadowColor: '#D986A1', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  sectionCardDark: { backgroundColor: '#181F2E', borderColor: '#303B50', shadowColor: '#000000', shadowOpacity: 0.16 },
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
