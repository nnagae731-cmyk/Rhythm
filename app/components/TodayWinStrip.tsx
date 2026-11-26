import React, { useEffect, useState } from 'react';
import { BThemeRibbonDecoration } from './BThemeRibbonDecoration';
import { CThemeRibbonDecoration } from './CThemeRibbonDecoration';
import { dateKey } from '../features/schedule/dateTimeUtils';
import { isRegularVisibleTask, normalizeTaskDateKey } from '../features/schedule/scheduleConflict';
import { isTaskSkippedOnDate } from '../features/tasks/repeatUtils';
import { selectCurrentTask } from '../features/tasks/taskSelectors';
import { styles } from '../styles/appStyles';
import { ChicPattern, ChicThemePalette, getThemeTokens } from '../theme';
import { Task, ThemeMode } from '../types';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';

export function TodayWinStrip({ tasks, designMode, chicPattern, chicPalette, onRestore, onOpenCompleted, onOpenFocus, onToggleTask, onOpenTaskActions, selectionMode = false, selectedTaskIds = [] }: { tasks: Task[]; designMode: ThemeMode; chicPattern: ChicPattern; chicPalette: ChicThemePalette; onRestore: (id: string) => void; onOpenCompleted?: () => void; onOpenFocus?: () => void; onToggleTask?: (id: string) => void; onOpenTaskActions?: (task: Task) => void; selectionMode?: boolean; selectedTaskIds?: string[] }) {
  const theme = getThemeTokens(designMode, chicPalette.id);
  // Completed-task cards use a light surface even when the surrounding sheet
  // is Mono Dark. Keep the card copy on the matching dark-on-light palette.
  const completedCardText = designMode === 'dark'
    ? getThemeTokens('minimal', chicPalette.id).colors
    : theme.colors;
  const now = new Date();
  const todayKey = dateKey(now);
  const scheduledToday = tasks.filter((task) => isRegularVisibleTask(task) && (!task.scheduledDate || normalizeTaskDateKey(task.scheduledDate)! <= todayKey)).filter((task) => !isTaskSkippedOnDate(task, todayKey));
  const completedToday = tasks.filter((task) => task.done && task.completedAt && dateKey(task.completedAt) === todayKey);
  const count = completedToday.reduce((sum, task) => sum + (task.subtasks?.length ? task.subtasks.filter((item) => item.done).length : 1), 0);
  const drop = React.useRef(new Animated.Value(1)).current;
  const previous = React.useRef(count);
  const [dropVisible, setDropVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const nextNowTask = selectCurrentTask(
    scheduledToday.filter((task) => !task.done && (task.bucket ?? 'now') === 'now'),
    now,
  );
  const nextNowTaskSelected = Boolean(nextNowTask && selectionMode && selectedTaskIds.includes(nextNowTask.id));
  const nextNowTaskChecked = selectionMode ? nextNowTaskSelected : Boolean(nextNowTask?.done);
  const remainingNow = scheduledToday.filter((task) => !task.done && (task.bucket ?? 'now') === 'now').reduce((sum, task) => sum + (task.subtasks?.length ? task.subtasks.filter((item) => !item.done).length : 1), 0);
  useEffect(() => {
    if (count > previous.current) {
      setDropVisible(true);
      drop.setValue(0);
      Animated.sequence([
        Animated.timing(drop, { toValue: 1, duration: 620, easing: Easing.bounce, useNativeDriver: true }),
        Animated.timing(drop, { toValue: 0.88, duration: 120, useNativeDriver: true }),
        Animated.timing(drop, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start(() => setDropVisible(false));
    }
    previous.current = count;
  }, [count, drop]);
  const fallingStyle = { transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-38, 18] }) }, { scale: drop.interpolate({ inputRange: [0, 1], outputRange: [1.25, 0.82] }) }], opacity: drop };
  const details = (
    <Modal visible={detailsOpen} transparent animationType="slide" onRequestClose={() => setDetailsOpen(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setDetailsOpen(false)}>
        <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, borderRadius: theme.radius.modal }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: theme.colors.primaryText }]}>今日できたこと</Text>
          {completedToday.length === 0 ? (
            <Text style={[styles.emptyCopy, { color: theme.colors.secondaryText }]}>完了したタスクはまだありません。</Text>
          ) : completedToday.map((task) => (
            <View key={task.id} style={[styles.completedDetailRow, designMode === 'minimal' && styles.completedDetailRowMinimal]}>
              <Text style={[styles.completedDetailIcon, { color: theme.colors.primaryAccent }]}>{designMode !== 'chic' ? '✓' : '✿'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, { color: completedCardText.primaryText }]}>{task.title}</Text>
                <Text style={[styles.taskMeta, { color: completedCardText.secondaryText }]}>{task.category}</Text>
              </View>
              <Pressable style={[styles.restoreButton, { backgroundColor: theme.colors.softAccent }]} onPress={() => onRestore(task.id)}>
                <Text style={[styles.restoreButtonText, { color: theme.colors.primaryAccent }]}>元に戻す</Text>
              </Pressable>
            </View>
          ))}
        <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryAccent, borderRadius: theme.radius.button }]} onPress={() => setDetailsOpen(false)}>
            <Text style={[styles.primaryButtonText, { color: designMode === 'chic' && chicPalette ? chicPalette.onAccent : designMode === 'dark' ? theme.colors.screenBackground : '#FFFFFF' }]}>閉じる</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
  if (designMode !== 'chic') {
    return (
      <>
        <View style={[styles.todayHeroCard, styles.todayHeroCardMinimal, designMode === 'dark' && styles.todayHeroCardMinimalDark]}>
          <View style={styles.todayHeroMinimalLayout}>
            <View style={styles.todayHeroMinimalLeft}>
              <Text style={[styles.todayHeroMinimalKicker, designMode === 'dark' && styles.todayHeroMinimalKickerDark]}>TODAY</Text>
              <Text style={[styles.todayHeroMinimalNowLabel, designMode === 'dark' && styles.todayHeroMinimalTextDark]}>今はこれ</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Pressable disabled={!nextNowTask || !onToggleTask} onPress={(event) => { event.stopPropagation(); if (nextNowTask) onToggleTask?.(nextNowTask.id); }} style={[styles.check, designMode === 'dark' && styles.checkDark, nextNowTaskChecked && styles.checkDone, nextNowTaskSelected && styles.selectionChecked]}><Text style={styles.checkMark}>{nextNowTaskChecked ? '✓' : ''}</Text></Pressable><Pressable disabled={!nextNowTask || !onOpenTaskActions} onPress={(event) => { event.stopPropagation(); if (nextNowTask) onOpenTaskActions?.(nextNowTask); }} style={styles.todayTaskTextButton}><Text testID="today-current-task-title" numberOfLines={nextNowTask ? 2 : undefined} ellipsizeMode="tail" adjustsFontSizeToFit={false} style={[styles.todayHeroMinimalTask, designMode === 'dark' && styles.todayHeroMinimalTextDark]}>{nextNowTask ? nextNowTask.title : scheduledToday.length === 0 ? '今日はまだ未登録' : remainingNow === 0 ? scheduledToday.some((task) => !task.done) ? '今やる分は完了。あとで・待ちは一覧へ' : '今日の分は完了。いい感じ' : '次にやる1つをここで決めます'}</Text></Pressable></View>
              <Text style={[styles.todayHeroMinimalStats, designMode === 'dark' && styles.todayHeroMinimalStatsDark]}>完了 {count} / 今やる残り {remainingNow}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="今日できたことを確認" onPress={() => { onOpenCompleted?.(); setDetailsOpen(true); }} style={styles.todayUnifiedAchievementMinimal}>
              <Text style={[styles.todayHeroMinimalKicker, { color: theme.colors.primaryAccent }]}>達成グラフ</Text>
              <Text style={[styles.todayHeroMinimalNumber, { color: theme.colors.primaryText }]}>{String(count).padStart(2, '0')}</Text>
              <View style={styles.minimalAchievementBars}>{Array.from({ length: 8 }, (_, index) => <View key={index} style={[styles.minimalAchievementBar, { backgroundColor: index < Math.min(8, count) ? theme.colors.primaryAccent : theme.colors.secondarySurface }]} />)}</View>
              <Text style={[styles.todayHeroMinimalStats, { color: theme.colors.secondaryText }]}>今日できたことを確認</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="集中する" onPress={(event) => { event.stopPropagation(); onOpenFocus?.(); }} style={{ minHeight: 46, marginTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.softAccent, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryAccent, fontSize: 13, fontWeight: '900' }}>集中する</Text><Text style={{ color: theme.colors.primaryAccent, fontSize: 20 }}>›</Text></Pressable>
        </View>
        {details}
      </>
    );
  }
  const item = '✿';
  const treasureColors = [chicPalette.accentSoft, chicPalette.patternStripe, chicPalette.border];
  return (
    <>
      <View style={[styles.todayHeroCard, styles.todayHeroCardChic, { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border, shadowColor: chicPalette.accent }]}>
        {designMode === 'chic' && chicPattern === 'checkLavenderSatin' && <BThemeRibbonDecoration today />}
        {designMode === 'chic' && chicPattern === 'checkBeigeNoir' && <CThemeRibbonDecoration today />}
        <View style={styles.todayHeroChicLayout}>
          <View style={[styles.todayHeroChicPlate, { backgroundColor: chicPalette.cardSurface }] }>
            <View style={[styles.todayChicMark, { backgroundColor: chicPalette.accentSoft }]}><Text style={[styles.todayChicMarkText, { color: chicPalette.accent }]}>✿</Text></View>
            <Text style={[styles.todayHeroKicker, { color: chicPalette.textSecondary }]}>今はこれ</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Pressable disabled={!nextNowTask || !onToggleTask} onPress={(event) => { event.stopPropagation(); if (nextNowTask) onToggleTask?.(nextNowTask.id); }} style={[styles.check, nextNowTaskChecked && styles.checkDone, nextNowTaskSelected && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }, { borderColor: chicPalette.accent }]}><Text style={styles.checkMark}>{nextNowTaskChecked ? '✓' : ''}</Text></Pressable><Pressable disabled={!nextNowTask || !onOpenTaskActions} onPress={(event) => { event.stopPropagation(); if (nextNowTask) onOpenTaskActions?.(nextNowTask); }} style={styles.todayTaskTextButton}><Text testID="today-current-task-title" numberOfLines={nextNowTask ? 2 : undefined} ellipsizeMode="tail" adjustsFontSizeToFit={false} style={[styles.todayHeroCopy, { color: chicPalette.textPrimary }]}>{nextNowTask ? nextNowTask.title : scheduledToday.length === 0 ? '今日はまだ未登録' : remainingNow === 0 ? scheduledToday.some((task) => !task.done) ? '今やる分は完了。あとで・待ちは一覧へ' : '今日の分は完了。いい感じ' : '次にやる1つをここで決めます'}</Text></Pressable></View>
            <Text style={[styles.todayHeroStats, { color: chicPalette.textSecondary }]}>完了 {count}　今やる残り {remainingNow}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="今日できたことを確認" onPress={() => { onOpenCompleted?.(); setDetailsOpen(true); }} style={styles.todayHeroJarWrap}>
            <View style={styles.miniJarWrap}>
              <View style={[styles.miniJarLid, { backgroundColor: chicPalette.accent }]} />
              <View style={[styles.miniJar, styles.miniJarChicGlass, { borderColor: chicPalette.border, shadowColor: chicPalette.accent }]}>{Array.from({ length: Math.min(12, count) }, (_, index) => <Text key={index} style={[styles.miniJarItem, { left: 8 + (index % 3) * 22, bottom: 4 + Math.floor(index / 3) * 14, color: treasureColors[index % treasureColors.length] }]}>{index % 2 ? '✦' : '●'}</Text>)}</View>
              {dropVisible && <Animated.Text style={[styles.fallingTreasure, fallingStyle]}>{item}</Animated.Text>}
            </View>
            <Text style={[styles.todayHeroProgressLabel, { color: chicPalette.textSecondary }]}>今日の進み</Text>
            <Text style={[styles.todayHeroJarHint, { color: chicPalette.textMuted }]}>タップして今日できたことを見る</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="集中する" onPress={(event) => { event.stopPropagation(); onOpenFocus?.(); }} style={{ minHeight: 46, marginTop: 12, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: chicPalette.border, borderRadius: 12, backgroundColor: chicPalette.accentSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: chicPalette.accentStrong, fontSize: 13, fontWeight: '900' }}>集中する</Text><Text style={{ color: chicPalette.accent, fontSize: 20 }}>›</Text></Pressable>
      </View>
      {details}
    </>
  );
}
