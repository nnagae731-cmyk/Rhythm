import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChicPattern, ChicThemePalette, DesignMode, getThemeTokens } from './theme';
import { MonthlyWishState, Wish, WishAction } from './types';
import { calculateWishProgress } from './features/wish/wishUtils';
import { BThemeRibbonDecoration } from './components/BThemeRibbonDecoration';
import { CThemeRibbonDecoration } from './components/CThemeRibbonDecoration';

type WishScreenProps = {
  designMode: DesignMode;
  chicPattern: ChicPattern;
  chicPalette?: ChicThemePalette;
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

export function WishScreen({ designMode: rawDesignMode, chicPattern, chicPalette, monthLabel, state, onSaveState, onCreateTaskFromAction, onBack }: WishScreenProps) {
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
  const [themeDraft, setThemeDraft] = useState(state.theme ?? '');
  const [editor, setEditor] = useState<EditorState>(emptyEditor);

  useEffect(() => {
    setThemeDraft(state.theme ?? '');
  }, [state.theme]);

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

  const wishes = state.wishes;
  const actions = state.actions;

  return (
    <View style={[styles.screen, designMode === 'minimal' ? styles.screenMinimal : styles.screenChic, rawDesignMode === 'dark' && styles.screenDark, designMode === 'chic' && palette && { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable style={[styles.backButton, designMode === 'minimal' ? styles.backButtonMinimal : styles.backButtonChic, isDark && styles.backButtonDark]} onPress={onBack}>
            <Text style={[styles.backButtonText, { color: darkAccent }]}>ホームへ戻る</Text>
          </Pressable>

          <SectionCard
            designMode={designMode}
            dark={isDark}
            chicPattern={chicPattern}
            chicPalette={palette}
            showBRibbon={designMode === 'chic' && chicPattern === 'checkLavenderSatin'}
            showCRibbon={designMode === 'chic' && chicPattern === 'checkBeigeNoir'}
            title="今月のテーマ"
            subtitle={monthLabel}
          >
            <View style={[styles.themePanel, designMode === 'minimal' ? styles.themePanelMinimal : styles.themePanelChic, isDark && styles.themePanelDark, designSubtle]}>
              <TextInput
                value={themeDraft}
                onChangeText={setThemeDraft}
                placeholder="今月は、どんな自分でいたい？"
                placeholderTextColor={theme.colors.secondaryText}
                style={[styles.themeInput, designMode === 'minimal' ? styles.themeInputMinimal : styles.themeInputChic, isDark && styles.themeInputDark, designSurface, designText]}
                multiline
              />
              <View style={styles.rowActions}>
                <Pressable style={[styles.secondaryButton, designMode === 'minimal' ? styles.secondaryButtonMinimal : styles.secondaryButtonChic, isDark && styles.secondaryButtonDark, designSubtle]} onPress={() => { setThemeDraft(''); commit((current) => ({ ...current, theme: '' })); }}>
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.secondaryText }]}>削除</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, designMode === 'minimal' ? styles.primaryButtonMinimal : styles.primaryButtonChic, isDark && styles.primaryButtonDark, designAccent]}
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
                  style={[
                    styles.itemCard,
                    designMode === 'minimal' ? styles.itemCardMinimal : styles.itemCardChic,
                    isDark && styles.itemCardDark,
                    wish.completed && styles.itemCardDone,
                    designSurface,
                  ]}
                  onPress={() => undefined}
                >
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: wish.completed }}
                    style={[styles.completionCheck, designMode === 'minimal' && styles.completionCheckMinimal, isDark && styles.completionCheckDark, wish.completed && styles.completionCheckActive, wish.completed && isDark && styles.completionCheckActiveDark, designMode === 'chic' && palette && { borderColor: palette.accent, backgroundColor: wish.completed ? palette.accent : palette.cardSurface }]}
                    onPress={() => toggleWish(wish.id)}
                  >
                    <Text style={[styles.completionCheckText, isDark && styles.completionCheckTextDark, wish.completed && styles.completionCheckTextActive]}>✓</Text>
                  </Pressable>
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemTitle, isDark && styles.itemTitleDark, wish.completed && styles.itemTitleDone, designText]}>{wish.title}</Text>
                      <Text style={[styles.itemMeta, { color: theme.colors.secondaryText }]}>{wish.completed ? `完了${wish.completedAt ? ` ・ ${new Date(wish.completedAt).getMonth() + 1}/${new Date(wish.completedAt).getDate()}` : ''}` : '進行中'}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <Pressable onPress={() => openWishEditor(wish)}>
                      <Text style={[styles.itemActionText, { color: theme.colors.primaryAccent }]}>編集</Text>
                    </Pressable>
                    <Pressable onPress={() => deleteWish(wish.id)}>
                      <Text style={[styles.itemActionText, styles.deleteText, isDark && styles.deleteTextDark]}>削除</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>

            <Pressable style={[styles.addRow, designMode === 'minimal' ? styles.addRowMinimal : styles.addRowChic, isDark && styles.addRowDark, designSubtle]} onPress={() => openWishEditor()}>
              <Text style={[styles.addRowText, { color: darkAccent }]}>＋ 叶えたいことを追加</Text>
            </Pressable>
          </SectionCard>

          <SectionCard
            designMode={designMode}
            dark={isDark}
            chicPattern={chicPattern}
            chicPalette={palette}
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
                      isDark && styles.itemCardDark,
                    action.completed && styles.itemCardDone,
                    designSurface,
                    ]}
                    onPress={() => undefined}
                  >
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: action.completed }}
                      style={[styles.completionCheck, designMode === 'minimal' && styles.completionCheckMinimal, isDark && styles.completionCheckDark, action.completed && styles.completionCheckActive, action.completed && isDark && styles.completionCheckActiveDark, designMode === 'chic' && palette && { borderColor: palette.accent, backgroundColor: action.completed ? palette.accent : palette.cardSurface }]}
                      onPress={() => toggleAction(action.id)}
                    >
                    <Text style={[styles.completionCheckText, isDark && styles.completionCheckTextDark, action.completed && styles.completionCheckTextActive]}>✓</Text>
                    </Pressable>
                    <View style={styles.itemBody}>
                      <Text style={[styles.itemTitle, isDark && styles.itemTitleDark, action.completed && styles.itemTitleDone, designText]}>{action.title}</Text>
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
                        <Text style={[styles.itemActionText, styles.deleteText, isDark && styles.deleteTextDark]}>削除</Text>
                      </Pressable>
                    </View>
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
          </SectionCard>

          <SectionCard
            designMode={designMode}
            chicPattern={chicPattern}
            chicPalette={palette}
            title="今月の進捗"
            dark={isDark}
            subtitle={`${progress.progress}%`}
          >
            {designMode === 'minimal' ? (
              <View style={styles.progressMinimal}>
                <Text style={[styles.progressNumberMinimal, isDark && styles.progressNumberDark]}>{progress.progress}%</Text>
                <View style={styles.statGrid}>
                  <StatCard label="叶えたいこと" value={`${progress.wishCompleted} / ${progress.wishTotal}`} minimal dark={isDark} />
                  <StatCard label="行動" value={`${progress.actionCompleted} / ${progress.actionTotal}`} minimal dark={isDark} />
                </View>
              </View>
            ) : (
              <View style={styles.progressChic}>
                <View style={[styles.ring, designMode === 'chic' && palette && { borderColor: palette.accentSoft, backgroundColor: palette.cardSurface }]}>
                  <View style={[styles.ringInner, designMode === 'chic' && palette && { backgroundColor: palette.surfaceSubtle }]}>
                    <Text style={[styles.progressNumberChic, designMode === 'chic' && palette && { color: palette.accent }]}>{progress.progress}%</Text>
                  </View>
                </View>
                <View style={styles.statColumn}>
                  <StatCard label="叶えたいこと" value={`${progress.wishCompleted} / ${progress.wishTotal}`} chicPalette={palette} />
                  <StatCard label="行動" value={`${progress.actionCompleted} / ${progress.actionTotal}`} chicPalette={palette} />
                </View>
              </View>
            )}
          </SectionCard>

        </ScrollView>
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
            <View style={styles.editorToggleRow}>
              <Pressable style={[styles.toggleChip, designMode === 'minimal' ? styles.toggleChipMinimal : styles.toggleChipChic, isDark && styles.toggleChipDark, editor.completed && styles.toggleChipActive, editor.completed && isDark && styles.toggleChipActiveDark, designMode === 'chic' && palette && { backgroundColor: editor.completed ? palette.accentSoft : palette.cardSurface, borderColor: editor.completed ? palette.accent : palette.border }]} onPress={() => setEditor((current) => ({ ...current, completed: !current.completed }))}>
                <Text style={[styles.toggleChipText, isDark && styles.toggleChipTextDark, editor.completed && styles.toggleChipTextActive, editor.completed && isDark && styles.toggleChipTextActiveDark, designMode === 'chic' && palette && { color: editor.completed ? palette.accentStrong : palette.textSecondary }]}>完了</Text>
              </Pressable>
              <Pressable style={[styles.editorCancel, designMode === 'minimal' ? styles.editorCancelMinimal : styles.editorCancelChic, isDark && styles.editorCancelDark]} onPress={() => setEditor(emptyEditor)}>
                <Text style={[styles.editorCancelText, { color: theme.colors.secondaryText }]}>閉じる</Text>
              </Pressable>
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
  return (
    <View style={[styles.sectionCard, designMode === 'minimal' ? styles.sectionCardMinimal : styles.sectionCardChic, dark && styles.sectionCardDark, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border, shadowColor: chicPalette.accent }]}>
      {showBRibbon && <BThemeRibbonDecoration journal={title.includes('九☆')} />}
      {showCRibbon && <CThemeRibbonDecoration journal={title.includes('九☆')} />}
      {designMode === 'chic' && <WishBackdrop pattern={chicPattern} color={chicPalette?.accent} />}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: sectionText(designMode, '#392F34', '#171715') }, dark && styles.sectionTitleDark, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: sectionText(designMode, '#8B7B82', '#777772') }, dark && styles.sectionSubtitleDark, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function StatCard({ label, value, minimal = false, dark = false, chicPalette }: { label: string; value: string; minimal?: boolean; dark?: boolean; chicPalette?: ChicThemePalette }) {
  return (
    <View style={[styles.statCard, minimal ? styles.statCardMinimal : styles.statCardChic, dark && styles.statCardDark, chicPalette && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
      <Text style={[styles.statLabel, minimal ? styles.statLabelMinimal : styles.statLabelChic, dark && styles.statLabelDark, chicPalette && { color: chicPalette.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, minimal ? styles.statValueMinimal : styles.statValueChic, dark && styles.statValueDark, chicPalette && { color: chicPalette.accentStrong }]}>{value}</Text>
    </View>
  );
}

function WishBackdrop({ pattern, color }: { pattern: ChicPattern; color?: string }) {
  const symbol = patternSymbol(pattern);
  return (
    <View pointerEvents="none" style={styles.patternBackdrop}>
      {Array.from({ length: 12 }, (_, index) => (
        <Text key={index} style={[styles.patternGlyph, { left: 14 + (index % 4) * 56, top: 12 + Math.floor(index / 4) * 30, color: color ?? '#D986A1' }]}>{symbol}</Text>
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
  backButtonMinimal: { borderRadius: 12, borderColor: '#111111' },
  backButtonChic: { borderColor: '#E8D9E2', backgroundColor: '#FFF3F5' },
  backButtonDark: { backgroundColor: '#181F2E', borderColor: '#303B50' },
  backButtonText: { fontSize: 12, fontWeight: '900' },
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
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 12, backgroundColor: '#FFFFFF' },
  completionCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#D986A1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  completionCheckActive: { backgroundColor: '#D986A1', borderColor: '#D986A1' },
  completionCheckMinimal: { borderColor: '#111111' },
  completionCheckDark: { backgroundColor: '#181F2E', borderColor: '#40506A' },
  completionCheckActiveDark: { backgroundColor: '#26365F', borderColor: '#8EA6FF' },
  completionCheckText: { color: '#D986A1', fontSize: 17, lineHeight: 20, fontWeight: '900' },
  completionCheckTextDark: { color: '#8EA6FF' },
  completionCheckTextActive: { color: '#FFFFFF' },
  itemCardMinimal: { borderColor: '#111111', borderRadius: 16 },
  itemCardChic: { borderColor: '#E5DFEA' },
  itemCardDark: { backgroundColor: '#20293A', borderColor: '#303B50' },
  itemCardDone: { opacity: 0.62 },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '900', color: '#282538' },
  itemTitleDark: { color: '#F4F7FC' },
  itemTitleDone: { textDecorationLine: 'line-through' },
  itemMeta: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  itemActions: { alignItems: 'flex-end', gap: 6 },
  itemActionText: { fontSize: 11, fontWeight: '900' },
  deleteText: { color: '#B95B67' },
  deleteTextDark: { color: '#FF8F9C' },
  addRow: { marginTop: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderRadius: 14, backgroundColor: '#FFFFFF' },
  addRowMinimal: { borderColor: '#111111', borderRadius: 14 },
  addRowChic: { borderColor: '#E0D5E1', backgroundColor: '#FFF8FA' },
  addRowDark: { borderColor: '#40506A', backgroundColor: '#20293A' },
  addRowDisabled: { opacity: 0.45 },
  addRowText: { fontSize: 13, fontWeight: '900' },
  progressMinimal: { gap: 12 },
  progressNumberMinimal: { fontSize: 42, lineHeight: 46, fontWeight: '300', color: '#111111' },
  progressNumberDark: { color: '#F4F7FC' },
  statGrid: { flexDirection: 'row', gap: 10 },
  progressChic: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ring: { width: 122, height: 122, borderRadius: 61, borderWidth: 10, borderColor: '#E9D1DC', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  ringInner: { width: 94, height: 94, borderRadius: 47, backgroundColor: '#FFF3F5', alignItems: 'center', justifyContent: 'center' },
  progressNumberChic: { color: '#D986A1', fontSize: 28, fontWeight: '900' },
  statColumn: { flex: 1, gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, backgroundColor: '#FFFFFF' },
  statCardMinimal: { borderColor: '#111111', borderRadius: 14 },
  statCardChic: { borderColor: '#E5DFEA' },
  statLabel: { fontSize: 10, fontWeight: '900', color: '#777772' },
  statLabelMinimal: { color: '#171715' },
  statLabelChic: { color: '#8B7B82' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#171715', marginTop: 4 },
  statValueMinimal: { color: '#111111' },
  statValueChic: { color: '#392F34' },
  statCardDark: { backgroundColor: '#20293A', borderColor: '#40506A' },
  statLabelDark: { color: '#B4C0D4' },
  statValueDark: { color: '#F4F7FC' },
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
  editorSaveButton: { flex: 1 },
  patternBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.16, overflow: 'hidden' },
  patternGlyph: { position: 'absolute', fontSize: 16, color: '#D986A1' },
});
