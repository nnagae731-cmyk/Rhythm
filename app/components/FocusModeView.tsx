import React from 'react';
import { getFocusCompletionAlertCopy, triggerHaptic } from '../features/feedback/completionFeedback';
import { FocusControllerContext, useFocusController, type FocusController, type FocusModeProps } from '../features/focus/useFocusController';
import { dateKey } from '../features/schedule/dateTimeUtils';
import { isRegularVisibleTask, normalizeTaskDateKey } from '../features/schedule/scheduleConflict';
import { isTaskSkippedOnDate } from '../features/tasks/repeatUtils';
import { categories } from '../features/tasks/taskUtils';
import { FocusSession } from '../focusSession';
import { styles } from '../styles/appStyles';
import { getThemeTokens } from '../theme';
import { Category, Task, TaskBucket } from '../types';
import { Alert, Image, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { type ModalPalette, popupSheetStyle } from './modalPalette';

export function FocusRuntimeStatus({ visible, colors, onReturn }: { visible: boolean; colors: { surface: string; border: string; primaryText: string; primaryAccent: string }; onReturn: () => void }) {
  const controller = React.useContext(FocusControllerContext);
  if (!visible || !controller?.session) return null;
  return <View accessibilityLiveRegion="none" style={{ paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text numberOfLines={1} style={{ flex: 1, color: colors.primaryText, fontSize: 14 }}>{controller.running ? '集中中' : '一時停止中'} {String(controller.minutes).padStart(2, '0')}:{String(controller.seconds).padStart(2, '0')}</Text><Pressable accessibilityRole="button" accessibilityLabel="集中タイマーを開く" onPress={onReturn} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={{ color: colors.primaryAccent, fontSize: 14, fontWeight: '800' }}>集中へ</Text></Pressable></View>;
}

export function getFocusAvailableTasks(tasks: Task[]) {
    const today = dateKey();
    const seenTitles = new Set<string>();
    const bucketOrder: Record<TaskBucket, number> = { now: 0, later: 1, waiting: 2 };
    return tasks.filter((task) => {
      const scheduledDate = normalizeTaskDateKey(task.scheduledDate);
      if (!isRegularVisibleTask(task) || task.done || isTaskSkippedOnDate(task, today) || (scheduledDate && scheduledDate > today)) return false;
      const titleKey = task.title.trim();
      if (seenTitles.has(titleKey)) return false;
      seenTitles.add(titleKey);
      return true;
    }).sort((a, b) => (bucketOrder[a.bucket ?? 'now'] - bucketOrder[b.bucket ?? 'now']) || a.title.localeCompare(b.title));
}

export function showFocusCompletionAlert(taskTitle?: string) {
  const copy = getFocusCompletionAlertCopy(taskTitle);
  Alert.alert(copy.title, copy.message);
}

export function FocusMode(props: FocusModeProps & { sharedRuntime?: boolean }) {
  const controller = React.useContext(FocusControllerContext);
  return props.sharedRuntime && controller ? <FocusModeView {...props} controller={controller} /> : <StandaloneFocusMode {...props} />;
}

export function StandaloneFocusMode(props: FocusModeProps) {
  const availableTasks = React.useMemo(() => getFocusAvailableTasks(props.tasks), [props.tasks]);
  const controller = useFocusController({ ...props, availableTasks, onHaptic: triggerHaptic, onCompletionAlert: showFocusCompletionAlert });
  return <FocusModeView {...props} controller={controller} />;
}

export function FocusModeView({ tasks, designMode, chicPalette, backgroundImageUri, planTier, onPremium, customDurationMinutes, onCustomDurationChange, voiceStartRequest, focusPersistedState, onFocusStateChange, onFocusCompleted, onFocusTaskFinished, onFocusStarted, onFocusNotificationPermission, onFocusRunningChange, onFocusActivityChange, onBehaviorEvent, hapticsEnabled = true, previewCustomDurationOpen = false, previewMode = false, controller }: FocusModeProps & { controller: FocusController }) {
  const { availableTasks, selectedTaskId, setSelectedTaskId, selectedTask, session, duration, secondsLeft, running, minutes, seconds, progress, customEditorOpen, setCustomEditorOpen, customDraft, setCustomDraft, reset, toggleTimer, chooseDuration, openCustomDurationEditor, applyCustomDuration } = controller;
  const isMinimal = designMode === 'minimal';
  const isDark = designMode === 'dark';
  const isChic = designMode === 'chic';
  const categoryColors = isChic && chicPalette ? Object.fromEntries(categories.map((category) => [category, chicPalette.accent])) as Record<Category, string> : Object.fromEntries(categories.map((category) => [category, isDark ? '#8EA6FF' : getThemeTokens(designMode).colors.primaryAccent])) as Record<Category, string>;
  const focusColors = getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const focusSurface = isChic && chicPalette ? chicPalette.cardSurface : focusColors.surface;
  const focusBorder = isChic && chicPalette ? chicPalette.border : focusColors.border;
  const focusSecondary = isChic && chicPalette ? chicPalette.textSecondary : focusColors.secondaryText;
  const focusAccent = isChic && chicPalette ? chicPalette.accent : focusColors.primaryAccent;
  const focusAccentSoft = isChic && chicPalette ? chicPalette.accentSoft : focusColors.softAccent;
  const focusOnAccent = isChic && chicPalette ? chicPalette.onAccent : isDark ? focusColors.primaryAccent : '#FFFFFF';
  const customDurationSelected = customDurationMinutes != null && duration === customDurationMinutes && ![5, 15, 25, 45].includes(duration);
  const taskGroups = (['now', 'later', 'waiting'] as TaskBucket[]).map((bucket) => ({
    bucket,
    label: bucket === 'now' ? '今やるタスク' : bucket === 'later' ? 'あとで' : '待ち',
    tasks: availableTasks.filter((task) => (task.bucket ?? 'now') === bucket),
  })).filter((group) => group.tasks.length > 0);
  const modeCopy = isMinimal ? '今はこれだけ' : isChic ? '静かな時間を、ひとつだけ。' : '自分のペースで、ひとつずつ。';
  return <>
    <View style={[styles.focusHero, isMinimal && styles.focusHeroMinimal, isDark && styles.focusHeroDark, isChic && styles.focusHeroChic, isChic && chicPalette && { backgroundColor: chicPalette.focusBackground, borderColor: chicPalette.border, shadowColor: chicPalette.accent }, backgroundImageUri && styles.focusHeroWithPhoto]}>
      {backgroundImageUri && <><Image source={{ uri: backgroundImageUri }} resizeMode="cover" style={styles.focusHeroPhoto} /><View pointerEvents="none" style={styles.focusHeroPhotoShade} /></>}
      {isChic && chicPalette && <><View style={styles.focusChicFlowerOne}><Text style={{ color: chicPalette.accent }}>✿</Text></View><View style={styles.focusChicFlowerTwo}><Text style={{ color: chicPalette.accentStrong }}>✦</Text></View></>}
      <Text style={[styles.focusEyebrow, isDark && styles.darkReadableMeta, isMinimal && styles.focusEyebrowMinimal, isDark && styles.focusEyebrowDark, isChic && styles.focusEyebrowLight, isChic && chicPalette && { color: chicPalette.textSecondary }]}>{running ? '集中中' : '集中タイマー'}</Text>
      <Text style={[styles.focusTitle, isMinimal && styles.focusTitleMinimal, !isMinimal && styles.focusTitleLight, isChic && chicPalette && { color: chicPalette.textPrimary }]}>{session?.taskTitle ?? selectedTask?.title ?? '自分の時間に集中'}</Text>
      <Text style={[styles.focusCopy, isMinimal && styles.focusCopyMinimal, isDark && styles.focusCopyDark, isChic && styles.focusCopyLight, isChic && chicPalette && { color: chicPalette.textSecondary }]}>{modeCopy}</Text>
      <View style={[styles.focusTimerRing, isMinimal && styles.focusTimerRingMinimal, isDark && styles.focusTimerRingDark, isChic && styles.focusTimerRingChic, isChic && chicPalette && { borderColor: chicPalette.accent, backgroundColor: chicPalette.focusSurface }]}>
        <Text style={[styles.focusTime, isMinimal && styles.focusTimeMinimal, !isMinimal && styles.focusTimeLight, isChic && chicPalette && { color: chicPalette.textPrimary }]}>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</Text>
        <Text testID="focus-timer-state" style={[styles.focusTimerState, isMinimal && styles.focusTimerStateMinimal, isDark && styles.focusTimerStateDark, isChic && styles.focusTimerStateChic, isChic && chicPalette && { color: chicPalette.accent }]}>{running ? '集中中' : secondsLeft === 0 ? 'できた！' : session ? '一時停止中' : '準備OK'}</Text>
      </View>
      <View style={[styles.focusProgressTrack, !isMinimal && styles.focusProgressTrackLight, isChic && chicPalette && { backgroundColor: chicPalette.accentSoft }]}><View style={[styles.focusProgressFill, isMinimal && styles.focusProgressFillMinimal, isDark && styles.focusProgressFillDark, isChic && styles.focusProgressFillChic, isChic && chicPalette && { backgroundColor: chicPalette.accent }, { width: `${Math.max(2, progress * 100)}%` }]} /></View>
      <View style={styles.focusActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="集中タイマーをリセット" style={[styles.focusResetButton, !isMinimal && styles.focusResetButtonLight, isDark && { backgroundColor: focusColors.secondarySurface, borderColor: focusBorder }, isChic && chicPalette && { borderColor: chicPalette.border, backgroundColor: chicPalette.cardSurface }]} onPress={reset}><Text style={[styles.focusResetText, isMinimal && styles.focusResetTextMinimal, !isMinimal && styles.focusResetTextLight, isDark && { color: focusColors.primaryText }, isChic && chicPalette && { color: chicPalette.textSecondary }]}>リセット</Text></Pressable>
        <Pressable style={[styles.focusStartButton, isMinimal && styles.focusStartButtonMinimal, isDark && styles.focusStartButtonDark, isChic && styles.focusStartButtonChic, isChic && chicPalette && { backgroundColor: chicPalette.accent }]} onPress={() => void toggleTimer()}><Text style={[styles.focusStartText, { color: isChic && chicPalette ? chicPalette.onAccent : isDark ? getThemeTokens('dark').colors.screenBackground : '#FFFFFF' }]}>{running ? '一時停止' : secondsLeft === 0 ? 'もう一度' : session ? '再開' : 'スタート'}</Text></Pressable>
      </View>
    </View>
    <Text style={[styles.focusSectionTitle, isMinimal && styles.focusSectionTitleMinimal, isDark && styles.focusSectionTitleDark, isChic && chicPalette && { color: chicPalette.textPrimary }]}>集中時間</Text>
    <View style={styles.focusDurationRow}>
      {[5, 15, 25, 45].map(minutesValue => {
        const selected = duration === minutesValue;
        return <Pressable key={minutesValue} accessibilityRole="button" accessibilityLabel={`集中時間を${minutesValue}分に設定`} accessibilityState={{ selected }} style={[styles.focusDurationChip, { backgroundColor: selected ? (isDark ? focusAccentSoft : focusAccent) : focusSurface, borderColor: selected ? focusAccent : focusBorder }]} onPress={() => chooseDuration(minutesValue)}><Text style={[styles.focusDurationText, { color: selected ? focusOnAccent : focusSecondary }]}>{minutesValue}分</Text></Pressable>;
      })}
      <Pressable accessibilityRole="button" accessibilityLabel="カスタム集中時間を設定" accessibilityValue={customDurationMinutes != null ? { text: `${customDurationMinutes}分` } : undefined} accessibilityState={{ selected: customDurationSelected }} style={[styles.focusDurationChip, { backgroundColor: customDurationSelected ? (isDark ? focusAccentSoft : focusAccent) : focusSurface, borderColor: customDurationSelected ? focusAccent : focusBorder }]} onPress={openCustomDurationEditor}><Text adjustsFontSizeToFit={false} style={[styles.focusDurationText, { color: customDurationSelected ? focusOnAccent : focusSecondary }]}>カスタム</Text>{customDurationMinutes != null && <Text style={[styles.focusDurationText, { color: customDurationSelected ? focusOnAccent : focusSecondary }]}>{customDurationMinutes}分</Text>}</Pressable>
    </View>
    {customEditorOpen && <View style={[{ marginHorizontal: 2, marginBottom: 12, padding: 12, borderRadius: 12, borderWidth: 1 }, isDark ? { backgroundColor: '#20293A', borderColor: '#40506A' } : isChic && chicPalette ? { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border } : { backgroundColor: '#FFFFFF', borderColor: '#DDD7E3' }]}><Text style={[{ fontSize: 12, fontWeight: '800', marginBottom: 8 }, isDark ? { color: '#F4F7FC' } : isChic && chicPalette ? { color: chicPalette.textPrimary } : { color: '#282538' }]}>カスタム時間（分）</Text><TextInput value={customDraft} onChangeText={(value) => setCustomDraft(value.replace(/[^0-9]/g, ''))} keyboardType="number-pad" returnKeyType="done" placeholder="例：47" placeholderTextColor={isDark ? '#8F9BB0' : '#777285'} style={[{ minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 }, isDark ? { backgroundColor: '#181F2E', borderColor: '#40506A', color: '#F4F7FC' } : isChic && chicPalette ? { backgroundColor: chicPalette.surface, borderColor: chicPalette.border, color: chicPalette.textPrimary } : { backgroundColor: '#FFFFFF', borderColor: '#DDD7E3', color: '#282538' }]} /><View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><Pressable style={[{ flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }, isDark ? { borderColor: '#40506A' } : isChic && chicPalette ? { borderColor: chicPalette.border } : { borderColor: '#DDD7E3' }]} onPress={() => setCustomEditorOpen(false)}><Text style={[{ fontWeight: '800' }, isDark ? { color: '#B4C0D4' } : isChic && chicPalette ? { color: chicPalette.textSecondary } : { color: '#777285' }]}>キャンセル</Text></Pressable><Pressable style={[{ flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, isDark ? { backgroundColor: '#8EA6FF' } : isChic && chicPalette ? { backgroundColor: chicPalette.accent } : { backgroundColor: getThemeTokens(designMode).colors.primaryAccent }]} onPress={applyCustomDuration}><Text style={{ color: isDark ? getThemeTokens('dark').colors.screenBackground : isChic && chicPalette ? chicPalette.onAccent : '#FFFFFF', fontWeight: '800' }}>決定</Text></Pressable></View></View>}
    {availableTasks.length === 0 ? <View testID="focus-empty-tasks" style={[styles.departureEmpty, { backgroundColor: focusSurface, borderColor: focusBorder }]}><Text style={[styles.emptyCopy, { color: focusSecondary, fontSize: isDark ? 14 : 13, lineHeight: isDark ? 22 : 20 }]}>未完了のToDoはありません。タスクなしでも集中タイマーを使えます。</Text></View> : taskGroups.map((group) => <View key={group.bucket}>
      <Text style={[styles.focusSectionTitle, isMinimal && styles.focusSectionTitleMinimal, isDark && styles.focusSectionTitleDark, isChic && chicPalette && { color: chicPalette.textPrimary }]}>{group.label}</Text>
      {group.tasks.map((task) => { const nextSubtask = task.subtasks?.find((item) => !item.done); return <Pressable key={task.id} style={[styles.focusTaskRow, isMinimal && styles.focusTaskRowMinimal, isDark && styles.focusTaskRowDark, selectedTaskId === task.id && styles.focusTaskRowActive, selectedTaskId === task.id && isMinimal && styles.focusTaskRowActiveMinimal, selectedTaskId === task.id && isDark && styles.focusTaskRowActiveDark, designMode === 'chic' && chicPalette && { backgroundColor: selectedTaskId === task.id ? chicPalette.accentSoft : chicPalette.taskBackground, borderColor: selectedTaskId === task.id ? chicPalette.accent : chicPalette.border }]} onPress={() => { setSelectedTaskId(task.id); reset(); }}><View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} /><View style={{ flex: 1 }}><Text style={[styles.focusTaskTitle, isDark && { color: focusColors.primaryText }, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{nextSubtask ? `${nextSubtask.title}（${task.title}）` : task.title}</Text><Text style={[styles.focusTaskMeta, isDark && { color: focusSecondary }, designMode === 'chic' && chicPalette && { color: chicPalette.taskMeta }]}>{task.category} ・ 優先度 {task.priority}</Text></View><Text style={[styles.focusTaskCheck, isDark && { color: focusAccent }, designMode === 'chic' && chicPalette && { color: chicPalette.accent }]}>{selectedTaskId === task.id ? '●' : '○'}</Text></Pressable>; })}
    </View>)}
  </>;
}

export function FocusTaskCompletionModal({ session, task, palette, onComplete, onContinue, onLater }: { session?: FocusSession; task?: Task; palette: ModalPalette; onComplete: () => void; onContinue: () => void; onLater: () => void }) {
  if (!session || !task) return null;
  return <Modal visible transparent animationType="fade" onRequestClose={onLater}>
    <Pressable style={styles.modalBackdrop} onPress={onLater}>
      <Pressable style={[styles.modalSheet, popupSheetStyle(palette)]} onPress={(event) => event.stopPropagation()}>
        <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
        <Text style={[styles.modalTitle, { color: palette.primaryText }]}>集中おつかれさま</Text>
        <Text style={[styles.emptyCopy, { color: palette.secondaryText }]}>{`「${task.title}」は終わった？`}</Text>
        <Pressable style={[styles.primaryButton, { backgroundColor: palette.primaryAccent, borderRadius: palette.buttonRadius }]} onPress={onComplete}><Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>完了</Text></Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={{ minHeight: 46, flex: 1, borderRadius: palette.buttonRadius, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 }} onPress={onContinue}><Text style={{ color: palette.primaryText, fontSize: 13, fontWeight: '900' }}>もう少し</Text></Pressable>
          <Pressable style={{ minHeight: 46, flex: 1, borderRadius: palette.buttonRadius, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.secondarySurface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 }} onPress={onLater}><Text style={{ color: palette.secondaryText, fontSize: 13, fontWeight: '900' }}>後で</Text></Pressable>
        </View>
      </Pressable>
    </Pressable>
  </Modal>;
}
