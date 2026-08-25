import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ChicThemePalette, DesignMode } from '../theme';
import { Category, Priority, RepeatRule, Subtask, Task, TaskBucket, TaskListItem } from '../types';
import { categories, categoryColors, priorities, repeatOptions } from '../features/tasks/taskUtils';
import { TaskDateTimePickerSheet } from '../components/TaskDateTimePickerSheet';
import { parseSmartTaskInput, SmartTaskParseResult } from '../features/tasks/smartTaskInput';
import { OnboardingHint } from '../features/onboarding/OnboardingHint';
import { TaskListSheet } from '../components/TaskListSheet';
const HomeRuntimeContext = React.createContext<any>(null);

function useHomeRuntime() {
  const runtime = React.useContext(HomeRuntimeContext);
  if (!runtime) throw new Error('Home runtime is unavailable.');
  return runtime;
}
export function HomeScreen({
  tasks,
  allTasks,
  remaining,
  now,
  completionIcon,
  designMode,
  chicPalette,
  selectionMode,
  selectedTaskIds,
  onAdd,
  onOpenBulkAdd,
  onOpenFocus,
  todayReviewExists = false,
  onOpenTodayRecord,
  onOpenSchedule,
  onOpenCompleted,
  onQuickAdd,
  onToggle,
  onToggleSubtask,
  onUpdateTaskList,
  onCompleteParent,
  onEdit,
  onToggleSelection,
  onSelectionMode,
  onCompleteSelected,
  onDeleteSelected,
  onDelete,
  onSkip,
  onOpenSkipBonusReward,
  skipBonusAdded = 0,
  skipBonusMax = 2,
  onDuplicate,
  onSaveTemplate,
  onPostpone,
  onBucket,
  styles,
  renderTodayWinStrip,
  showTodoOnboarding,
  onTodoOnboardingAction,
  onTodoOnboardingCompleted,
  showTodoCompleteOnboarding,
  showCompletedTasksOnboarding,
  showTaskBucketsOnboarding,
  showTaskDetailsOnboarding,
  helpers,
}: {
  tasks: Task[];
  allTasks: Task[];
  remaining: number;
  now: Date;
  designMode: DesignMode;
  chicPalette: ChicThemePalette;
  completionIcon: string;
  selectionMode: boolean;
  selectedTaskIds: string[];
  onAdd: () => void;
  onOpenBulkAdd: () => void;
  onOpenFocus: () => void;
  todayReviewExists?: boolean;
  onOpenTodayRecord?: () => void;
  onOpenSchedule?: () => void;
  onOpenCompleted?: () => void;
  onQuickAdd: (title: string, category: Category, priority: Priority, scheduledDate?: string, scheduledTime?: string, endAt?: string, isRoutine?: boolean, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, remindDate?: string, remindAt?: string, repeatRule?: RepeatRule, subtasks?: Subtask[]) => void;
  onToggle: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onUpdateTaskList: (taskId: string, items: TaskListItem[]) => void;
  onCompleteParent: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onToggleSelection: (id: string) => void;
  onSelectionMode: () => void;
  onCompleteSelected: () => void;
  onDeleteSelected: () => void;
  onDelete: (id: string) => void;
  onSkip: (id: string) => void;
  onOpenSkipBonusReward?: () => void;
  skipBonusAdded?: number;
  skipBonusMax?: number;
  onDuplicate: (task: Task) => void;
  onSaveTemplate: (task: Task) => void;
  onPostpone: (id: string) => void;
  onBucket: (id: string, bucket: TaskBucket) => void;
  styles: any;
  renderTodayWinStrip: (tasks: Task[], onOpenFocus?: () => void, onToggleNowTask?: (id: string) => void, onOpenTaskActions?: (task: Task) => void) => React.ReactNode;
  showTodoOnboarding?: boolean;
  onTodoOnboardingAction?: () => void;
  onTodoOnboardingCompleted?: () => void;
  showTodoCompleteOnboarding?: boolean;
  showCompletedTasksOnboarding?: boolean;
  showTaskBucketsOnboarding?: boolean;
  showTaskDetailsOnboarding?: boolean;
  helpers: any;
}) {
  const { deadlineLabel, getUrgencyStatus, getLateRiskMessage, dateKey } = helpers;
  const priorityOrder: Record<Priority, number> = { 高: 0, 中: 1, 低: 2 };
  const isDark = designMode === 'dark';
  const theme = helpers.getThemeTokens?.(designMode);
  const [categoryFilter, setCategoryFilter] = useState<'すべて' | Category>('すべて');
  const [bucketFilter, setBucketFilter] = useState<TaskBucket>('now');
  const [bucketTask, setBucketTask] = useState<Task | null>(null);
  const [actionTask, setActionTask] = useState<Task | null>(null);
  const [tomorrowOpen, setTomorrowOpen] = useState(false);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [listTask, setListTask] = useState<Task | undefined>();
  const [homeTab, setHomeTab] = useState<'now' | 'list'>('now');
  const bucketTasks = tasks.filter((task) => (task.bucket ?? 'now') === bucketFilter);
  const categoryTasks = categoryFilter === 'すべて' ? bucketTasks : bucketTasks.filter((task) => task.category === categoryFilter);
  const displayTasks = [...categoryTasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const focusShortcutBackground = designMode === 'chic' ? chicPalette.cardSurface : theme?.colors?.surface ?? '#FFFFFF';
  const focusShortcutBorder = designMode === 'chic' ? chicPalette.border : theme?.colors?.border ?? '#DCE2EC';
  const focusShortcutAccent = designMode === 'chic' ? chicPalette.accent : theme?.colors?.primaryAccent ?? '#4F6FED';
  const focusShortcutText = designMode === 'chic' ? chicPalette.textPrimary : theme?.colors?.primaryText ?? '#182235';
  const focusShortcutMuted = designMode === 'chic' ? chicPalette.textSecondary : theme?.colors?.secondaryText ?? '#68748A';
  const selectionSurface = designMode === 'chic' ? chicPalette.cardSurface : theme?.colors?.surface ?? '#FFFFFF';
  const selectionBorder = designMode === 'chic' ? chicPalette.border : theme?.colors?.border ?? '#DCE2EC';
  const selectionAccent = designMode === 'chic' ? chicPalette.accent : theme?.colors?.primaryAccent ?? '#4F6FED';
  const selectionDanger = theme?.colors?.danger ?? '#C65E67';
  const selectionOnAccent = designMode === 'chic' ? chicPalette.onAccent : designMode === 'dark' ? theme?.colors?.screenBackground ?? '#FFFFFF' : '#FFFFFF';
  const popupSurface = designMode === 'chic' ? chicPalette.cardSurface : theme?.colors?.surface ?? '#FFFFFF';
  const popupBorder = designMode === 'chic' ? chicPalette.border : theme?.colors?.border ?? '#DCE2EC';
  const popupText = designMode === 'chic' ? chicPalette.textPrimary : theme?.colors?.primaryText ?? '#182235';
  const popupMuted = designMode === 'chic' ? chicPalette.textSecondary : theme?.colors?.secondaryText ?? '#68748A';
  const popupAccent = designMode === 'chic' ? chicPalette.accent : theme?.colors?.primaryAccent ?? '#4F6FED';
  const popupSoft = designMode === 'chic' ? chicPalette.accentSoft : theme?.colors?.softAccent ?? '#E8EEFF';
  const popupDanger = theme?.colors?.danger ?? '#C65E67';
  const selectionBar = selectionMode ? <View style={[styles.batchBar, { backgroundColor: selectionSurface, borderColor: selectionBorder }]}>
    <Text style={[styles.batchCount, { color: focusShortcutText }]}>{selectedTaskIds.length}件を選択中</Text>
    <View style={styles.batchActions}>
      <Pressable disabled={selectedTaskIds.length === 0} style={[styles.batchComplete, { backgroundColor: selectionAccent, borderColor: selectionAccent }, selectedTaskIds.length === 0 && styles.batchDisabled]} onPress={onCompleteSelected}><Text style={[styles.batchCompleteText, { color: selectionOnAccent }]}>選択した項目を完了</Text></Pressable>
      <Pressable disabled={selectedTaskIds.length === 0} style={[styles.batchDelete, { backgroundColor: selectionSurface, borderColor: selectionDanger }, selectedTaskIds.length === 0 && styles.batchDisabled]} onPress={onDeleteSelected}><Text style={[styles.batchDeleteText, { color: selectionDanger }]}>選択した項目を削除</Text></Pressable>
    </View>
  </View> : null;
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowKey = dateKey(tomorrowDate);
  const tomorrowTasks = allTasks.filter((task) => task.scheduledDate === tomorrowKey).sort((a, b) => (a.scheduledTime ?? '99:99').localeCompare(b.scheduledTime ?? '99:99'));
  const todayKey = dateKey(now);
  const nowClock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const nextScheduledTask = allTasks.filter((task) => task.scheduledDate === todayKey && task.scheduledTime && !task.done && task.scheduledTime >= nowClock).sort((a, b) => (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? ''))[0];
  const todayScheduledTasks = allTasks.filter((task) => task.scheduledDate === todayKey && task.scheduledTime).sort((a, b) => (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? ''));
  const nowTasks = tasks.filter((task) => (task.bucket ?? 'now') === 'now');
  const featuredNowTask = [...nowTasks].filter((task) => !task.done).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])[0];
  const remainingNowTasks = nowTasks.filter((task) => !task.done && task.id !== featuredNowTask?.id);
  const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
  return (
    <HomeRuntimeContext.Provider value={{ styles, helpers, chicPalette }}>
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: designMode === 'chic' ? chicPalette.textPrimary : theme?.colors?.primaryText ?? '#182235', fontSize: 18, fontWeight: '900' }}>{now.getMonth() + 1}月{now.getDate()}日（{weekdayLabels[now.getDay()]}）</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="タスクを追加" onPress={onAdd} style={{ minHeight: 40, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: focusShortcutBorder, backgroundColor: designMode === 'chic' ? chicPalette.accentSoft : theme?.colors?.softAccent ?? '#E8EEFF', justifyContent: 'center' }}><Text style={{ color: focusShortcutAccent, fontSize: 13, fontWeight: '900' }}>＋追加</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={selectionMode ? '選択を終了' : 'タスクを選択'} onPress={onSelectionMode} style={{ minHeight: 40, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: selectionMode ? focusShortcutAccent : focusShortcutBorder, backgroundColor: selectionMode ? focusShortcutAccent : focusShortcutBackground, justifyContent: 'center' }}><Text style={{ color: selectionMode ? (designMode === 'chic' ? chicPalette.onAccent : theme?.colors?.screenBackground ?? '#FFFFFF') : focusShortcutText, fontSize: 13, fontWeight: '900' }}>{selectionMode ? '取消' : '選択'}</Text></Pressable>
        </View>
      </View>
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: focusShortcutBorder, marginBottom: 14 }}>
        {(['now', 'list'] as const).map((tab) => <Pressable key={tab} onPress={() => { setHomeTab(tab); if (tab === 'now') setBucketFilter('now'); else if (bucketFilter === 'now') setBucketFilter('later'); }} style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderBottomWidth: homeTab === tab ? 2 : 0, borderBottomColor: focusShortcutAccent }}><Text style={{ color: homeTab === tab ? focusShortcutAccent : focusShortcutMuted, fontSize: 13, fontWeight: homeTab === tab ? '900' : '700' }}>{tab === 'now' ? '今' : '一覧'}</Text></Pressable>)}
      </View>
      {homeTab === 'now' && <>
      {renderTodayWinStrip(allTasks, onOpenFocus, (id) => selectionMode ? onToggleSelection(id) : onToggle(id), (task) => selectionMode ? onToggleSelection(task.id) : setActionTask(task))}
      {remainingNowTasks.length > 0 && <View style={{ marginTop: 12, paddingHorizontal: 4 }}><Text style={{ color: focusShortcutMuted, fontSize: 11, fontWeight: '800', marginBottom: 4 }}>今やる</Text>{remainingNowTasks.map((task) => <Pressable key={`now-task-${task.id}`} onPress={() => selectionMode ? onToggleSelection(task.id) : setActionTask(task)} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: focusShortcutBorder }}><Pressable onPress={(event) => { event.stopPropagation(); selectionMode ? onToggleSelection(task.id) : onToggle(task.id); }} style={[styles.check, isDark && styles.checkDark, selectionMode && selectedTaskIds.includes(task.id) && styles.selectionChecked, selectionMode && selectedTaskIds.includes(task.id) && designMode === 'chic' && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }]}><Text style={styles.checkMark}>{selectionMode && selectedTaskIds.includes(task.id) ? '✓' : ''}</Text></Pressable><Text numberOfLines={2} style={{ flex: 1, color: focusShortcutText, fontSize: 13, fontWeight: '700', marginLeft: 9 }}>{task.title}</Text><Text style={{ color: focusShortcutAccent, fontSize: 18 }}>›</Text></Pressable>)}</View>}
      {selectionBar}
      <View style={{ minHeight: 58, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: focusShortcutBorder }}>
        <Text style={{ color: focusShortcutMuted, fontSize: 11, fontWeight: '800' }}>次の予定</Text>
        {nextScheduledTask ? <Pressable onPress={onOpenSchedule} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}><Text style={{ color: focusShortcutText, fontSize: 14, fontWeight: '800' }}>{nextScheduledTask.scheduledTime}　{nextScheduledTask.title}</Text><Text style={{ marginLeft: 'auto', color: focusShortcutAccent, fontSize: 20 }}>›</Text></Pressable> : <Text style={{ color: focusShortcutMuted, fontSize: 13, marginTop: 5 }}>今日の次の予定はありません</Text>}
      </View>
      <Pressable onPress={() => setTomorrowOpen(true)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 }}><Text style={{ color: focusShortcutText, fontSize: 13, fontWeight: '800' }}>明日の予定を見る</Text><Text style={{ color: focusShortcutAccent, fontSize: 20 }}>›</Text></Pressable>
      <Pressable disabled={!onOpenTodayRecord} onPress={onOpenTodayRecord} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8, borderTopWidth: 1, borderTopColor: focusShortcutBorder }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: focusShortcutText, fontSize: 13, fontWeight: '800' }}>{todayReviewExists ? '今日の記録を編集' : '今日を記録'}</Text>
          <Text style={{ color: focusShortcutMuted, fontSize: 12, marginTop: 3 }}>{todayReviewExists ? '今日残した内容を確認・編集できます' : '写真やひとことを残す'}</Text>
        </View>
        <Text style={{ color: focusShortcutAccent, fontSize: 20 }}>›</Text>
      </Pressable>
      </>}
      {homeTab === 'list' && <>
      {showTodoOnboarding && (
       <View style={{ marginBottom: 12 }}>
        <OnboardingHint
          featureId="todo"
          designMode={designMode}
          chicPalette={chicPalette}
          onAction={onTodoOnboardingAction}
     />
      </View>
      )}
      {showTodoCompleteOnboarding && (
       <View style={{ marginBottom: 12 }}>
        <OnboardingHint featureId="todoComplete" designMode={designMode} chicPalette={chicPalette} />
       </View>
      )}
      {showCompletedTasksOnboarding && (
       <View style={{ marginBottom: 12 }}>
        <OnboardingHint featureId="completedTasks" designMode={designMode} chicPalette={chicPalette} />
       </View>
      )}
      {showTaskBucketsOnboarding && (
       <View style={{ marginBottom: 12 }}>
        <OnboardingHint featureId="taskBuckets" designMode={designMode} chicPalette={chicPalette} />
       </View>
      )}
      {showTaskDetailsOnboarding && (
       <View style={{ marginBottom: 12 }}>
        <OnboardingHint featureId="taskDetails" designMode={designMode} chicPalette={chicPalette} />
       </View>
      )}
      <View style={[styles.sectionHeader, designMode === 'minimal' && styles.sectionHeaderMinimal, isDark && styles.darkPanel]}>
        <View>
          <Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>今日のタスク</Text>
        </View>
      </View>

      <View style={styles.bucketTabs}>{([{ id: 'later', label: 'あとで' }, { id: 'waiting', label: '待ち' }] as { id: TaskBucket; label: string }[]).map((item) => {
        const count = tasks.filter((task) => (task.bucket ?? 'now') === item.id).length;
        const activeChic = designMode === 'chic' && bucketFilter === item.id;
        return <Pressable key={item.id} style={[styles.bucketTab, designMode === 'minimal' && styles.bucketTabMinimal, designMode === 'chic' && styles.bucketTabChic, isDark && styles.darkSurface, designMode === 'chic' && { backgroundColor: activeChic ? chicPalette.accent : chicPalette.cardSurface, borderColor: activeChic ? chicPalette.accent : chicPalette.border }, bucketFilter === item.id && styles.bucketTabActive, bucketFilter === item.id && isDark && styles.bucketTabActiveDark, bucketFilter === item.id && designMode === 'chic' && styles.bucketTabActiveChic, activeChic && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }]} onPress={() => setBucketFilter(item.id)}><Text style={[styles.bucketTabText, isDark && styles.darkBodyText, bucketFilter === item.id && styles.bucketTabTextActive, designMode === 'chic' && { color: activeChic ? chicPalette.onAccent : chicPalette.textSecondary }, activeChic && { color: chicPalette.onAccent }]}>{item.label} {count}</Text></Pressable>;
      })}</View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
        {(['すべて', ...categories] as const).map((category) => <Pressable key={category} style={[styles.filterChip, isDark && styles.filterChipDark, categoryFilter === category && styles.filterChipActive, categoryFilter === category && isDark && styles.filterChipActiveDark, designMode === 'chic' && { backgroundColor: categoryFilter === category ? chicPalette.accentSoft : chicPalette.cardSurface, borderColor: categoryFilter === category ? chicPalette.accent : chicPalette.border }]} onPress={() => setCategoryFilter(category)}><Text style={[styles.filterChipText, isDark && styles.darkMutedText, categoryFilter === category && styles.filterChipTextActive, categoryFilter === category && isDark && styles.filterChipTextActiveDark, designMode === 'chic' && { color: categoryFilter === category ? chicPalette.accentStrong : chicPalette.textSecondary }]}>{category}</Text></Pressable>)}
      </ScrollView>

      <View style={{ marginBottom: 12, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>今日の予定</Text><Pressable onPress={onOpenSchedule}><Text style={{ color: focusShortcutAccent, fontSize: 12, fontWeight: '800' }}>予定をすべて見る ›</Text></Pressable></View>
        {todayScheduledTasks.length === 0 ? <Text style={{ color: focusShortcutMuted, fontSize: 12, marginTop: 6 }}>時間を指定した予定はありません</Text> : todayScheduledTasks.slice(0, 5).map((task) => <View key={`schedule-row-${task.id}`} style={{ minHeight: 34, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: focusShortcutBorder }}><Text style={{ width: 58, color: focusShortcutAccent, fontSize: 12, fontWeight: '800' }}>{task.scheduledTime}</Text><Text numberOfLines={1} style={{ flex: 1, color: focusShortcutText, fontSize: 13, fontWeight: '700' }}>{task.title}</Text></View>)}
      </View>

      {selectionBar}

      {displayTasks.length === 0 ? (
        <View style={[styles.emptyCard, designMode === 'minimal' && styles.emptyCardMinimal, designMode === 'chic' && styles.emptyCardChic, isDark && styles.darkEmptyCard, designMode === 'chic' && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
          <View style={designMode === 'chic' ? styles.emptyChicGlass : styles.emptyPlainContent}><Text style={[styles.emptyIcon, isDark && styles.darkAccentText, designMode === 'chic' && { color: chicPalette.accent }]}>○</Text><Text style={[styles.emptyTitle, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textPrimary }]}>最初のタスクを追加しよう</Text><Text style={[styles.emptyCopy, isDark && styles.darkMutedText, designMode === 'chic' && { color: chicPalette.textSecondary }]}>忘れたくないことを、ここに置いておけます。</Text></View>
        </View>
      ) : displayTasks.map((task) => { const taskSubtasks = task.subtasks?.slice().sort((a, b) => a.order - b.order) ?? []; const hasSubtasks = taskSubtasks.length > 0; const isSubtasksExpanded = expandedSubtasks[task.id] === true; const completedSubtaskCount = taskSubtasks.filter((item) => item.done).length; return (
        <React.Fragment key={task.id}>
        <Pressable key={task.id} style={[styles.taskCard, designMode === 'minimal' && styles.taskCardMinimal, designMode === 'dark' && styles.darkSurface, designMode === 'chic' && styles.taskCardChic, designMode === 'chic' && { backgroundColor: task.done ? chicPalette.surfaceSubtle : chicPalette.taskBackground, borderColor: chicPalette.border }, task.done && designMode !== 'chic' && styles.taskCardDone, task.done && isDark && styles.taskCardDoneDark, task.done && designMode === 'chic' && styles.taskCardChicDone, { minHeight: 48, paddingVertical: 4, backgroundColor: 'transparent', borderWidth: 0, borderBottomWidth: 1, borderBottomColor: focusShortcutBorder, borderRadius: 0 }]} onPress={() => selectionMode ? onToggleSelection(task.id) : setActionTask(task)}>
          <View style={[styles.taskCardInner, designMode === 'chic' && styles.taskCardInnerChic, designMode === 'chic' && { backgroundColor: chicPalette.cardSurface }, task.done && designMode === 'chic' && styles.taskCardInnerChicDone, { paddingHorizontal: 0, paddingVertical: 0, backgroundColor: 'transparent', borderWidth: 0 }]}>
          <Pressable style={[styles.check, isDark && styles.checkDark, task.done && styles.checkDone, task.done && isDark && styles.checkDoneDark, task.done && designMode === 'chic' && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }, selectionMode && selectedTaskIds.includes(task.id) && styles.selectionChecked, selectionMode && selectedTaskIds.includes(task.id) && isDark && styles.selectionCheckedDark, selectionMode && selectedTaskIds.includes(task.id) && designMode === 'chic' && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }]} onPress={(event) => { event.stopPropagation(); selectionMode ? onToggleSelection(task.id) : (task.subtasks?.some((item) => !item.done) ? onCompleteParent(task.id) : onToggle(task.id)); }}>
            <Text style={styles.checkMark}>{selectionMode ? (selectedTaskIds.includes(task.id) ? '✓' : '') : (task.done ? completionIcon : '')}</Text>
          </Pressable>
          <View style={styles.taskBody}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={[styles.taskTitle, task.done && styles.taskTitleDone, isDark && styles.darkBodyText, { flex: 1 }]}>{task.title}</Text></View>
            {task.navigationEnabled && !task.done && <View style={styles.inlineUrgency}><Text style={styles.inlineUrgencyText}>{getUrgencyStatus(task, now)}</Text><Text style={styles.inlineRisk}>{getLateRiskMessage(task, now)}</Text></View>}
            <View style={[styles.taskInfoRow, { display: 'none' }]}>
              <View style={[styles.priorityPill, task.priority === '高' && styles.priorityHigh, designMode === 'chic' && { backgroundColor: chicPalette.accentSoft, borderColor: chicPalette.accent }]}><Text style={[styles.priorityText, task.priority === '高' && styles.priorityHighText, designMode === 'chic' && { color: chicPalette.textPrimary }]}>{task.priority === '高' ? '！重要' : task.priority}</Text></View>
              <View style={[styles.categoryPill, { backgroundColor: categoryColors[task.category] }, designMode === 'chic' && styles.categoryPillChic, designMode === 'chic' && { backgroundColor: chicPalette.accentSoft, borderColor: chicPalette.accent }]}><Text style={[styles.categoryText, designMode === 'chic' && { color: chicPalette.statusAccent }]}>{task.category}</Text></View>
              {task.repeatRule && task.repeatRule !== 'none' && <View style={[styles.routinePill, designMode === 'chic' && { backgroundColor: chicPalette.accentSoft, borderColor: chicPalette.border }]}><Text style={[styles.routinePillText, designMode === 'chic' && { color: chicPalette.statusAccent }]}>↻ {repeatOptions.find((option) => option.id === task.repeatRule)?.label}</Text></View>}
              {task.scheduledDate && <Text style={[styles.taskMeta, isDark && styles.darkAccentText, designMode === 'chic' && { color: chicPalette.taskMeta }]}>▣ {task.scheduledDate.slice(5).replace('-', '/')}</Text>}
              {task.scheduledTime && <Text style={[styles.taskMeta, isDark && styles.darkAccentText, designMode === 'chic' && { color: chicPalette.taskMeta }]}>◷ 実行 {task.scheduledTime}</Text>}
              {task.remindAt && <Text style={[styles.taskMeta, isDark && styles.darkAccentText, designMode === 'chic' && { color: chicPalette.taskMeta }]}>◷ {task.remindDate?.slice(5).replace('-', '/')} {task.remindAt}</Text>}
              {task.remindAt && task.nudgeMode && task.nudgeMode !== 'once' && <View style={[styles.nudgeBadge, designMode === 'chic' && { backgroundColor: chicPalette.accentSoft, borderColor: chicPalette.border }]}><Text style={[styles.nudgeBadgeText, designMode === 'chic' && { color: chicPalette.statusAccent }]}>{task.nudgeMode === 'strong' ? '通知×3' : '通知×2'}</Text></View>}
              {task.deadlineDate && (() => { const status = deadlineLabel(task); return <Text style={[styles.deadlineMeta, status?.overdue && styles.deadlineOverdue]}>⌛ {task.deadlineDate.slice(5).replace('-', '/')} {task.deadlineTime ?? '23:59'} · {status?.text}</Text>; })()}
            </View>
            {hasSubtasks && <Pressable accessibilityRole="button" style={[{ minHeight: 40, marginTop: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, isDark ? styles.darkSurface : styles.filterChip, designMode === 'chic' && { backgroundColor: chicPalette.accentSoft, borderColor: chicPalette.border }]} onPress={(event) => { event.stopPropagation(); setExpandedSubtasks((current) => ({ ...current, [task.id]: !isSubtasksExpanded })); }}><Text style={[styles.taskMeta, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.accentStrong }]}>サブタスク {taskSubtasks.length}件 ・ 完了 {completedSubtaskCount}件</Text><Text style={[styles.taskMeta, isDark && styles.darkAccentText, designMode === 'chic' && { color: chicPalette.accent }]}>{isSubtasksExpanded ? '閉じる' : '開く'}⌄</Text></Pressable>}
            {task.listItems && task.listItems.length > 0 && <Pressable accessibilityRole="button" onStartShouldSetResponder={() => true} style={[{ marginTop: 8, minHeight: 34, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, isDark ? styles.darkSurface : styles.filterChip, designMode === 'chic' && { backgroundColor: chicPalette.cardTint, borderColor: chicPalette.border }]} onPress={(event) => { event.stopPropagation(); setListTask(task); }}><Text style={[styles.taskMeta, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.accentStrong }]}>リスト {task.listItems.filter((item) => item.checked).length} / {task.listItems.length}</Text><Text style={[styles.taskMeta, isDark && styles.darkAccentText, designMode === 'chic' && { color: chicPalette.accent }]}>›</Text></Pressable>}
          </View>
          {!selectionMode && <Pressable style={{ display: 'none' }} onPress={() => setBucketTask(task)}><Text style={styles.taskBucketButtonText}>{(task.bucket ?? 'now') === 'now' ? '今やる' : task.bucket === 'later' ? 'あとで' : '待ち'}⌄</Text></Pressable>}
          {!selectionMode && <Pressable style={[styles.taskMoreButton, { minWidth: 26, alignItems: 'flex-end' }]} onPress={() => setActionTask(task)} hitSlop={8}><Text style={[styles.taskMoreText, { color: focusShortcutAccent }]}>›</Text></Pressable>}
           </View>
         </Pressable>
         {isSubtasksExpanded && <ScrollView nestedScrollEnabled style={{ maxHeight: 280, marginTop: 2 }} showsVerticalScrollIndicator={taskSubtasks.length > 6}>{taskSubtasks.map((item) => <Pressable key={`${task.id}:${item.id}`} style={[styles.taskCard, designMode === 'minimal' && styles.taskCardMinimal, isDark && styles.darkSurface, designMode === 'chic' && styles.taskCardChic, { marginLeft: 18, borderLeftWidth: 3, borderLeftColor: designMode === 'chic' ? chicPalette.accent : theme?.colors?.primaryAccent ?? '#68748A' }, item.done && styles.taskCardDone]} onPress={() => onToggleSubtask(task.id, item.id)}><View style={[styles.taskCardInner, designMode === 'chic' && styles.taskCardInnerChic, designMode === 'chic' && { backgroundColor: chicPalette.cardSurface }]}><Pressable style={[styles.check, isDark && styles.checkDark, item.done && styles.checkDone, item.done && isDark && styles.checkDoneDark, designMode === 'chic' && { backgroundColor: item.done ? chicPalette.accent : chicPalette.cardTint, borderColor: chicPalette.accent }]} onPress={() => onToggleSubtask(task.id, item.id)}><Text style={styles.checkMark}>{item.done ? completionIcon : ''}</Text></Pressable><View style={styles.taskBody}><Text style={[styles.taskTitle, item.done && styles.taskTitleDone, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textPrimary }]}>{item.title}</Text><Text style={[styles.taskMeta, isDark && styles.darkMutedText, designMode === 'chic' && { color: chicPalette.taskMeta }]}>サブタスク ・ 親: {task.title}</Text><View style={styles.taskInfoRow}><View style={[styles.categoryPill, isDark && styles.darkSurface, designMode === 'chic' && { backgroundColor: chicPalette.accentSoft, borderColor: chicPalette.border }]}><Text style={[styles.categoryText, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textSecondary }]}>次の一歩</Text></View><Text style={[styles.taskMeta, isDark && styles.darkAccentText, designMode === 'chic' && { color: chicPalette.taskMeta }]}>{(task.bucket ?? 'now') === 'now' ? '今やる' : task.bucket === 'later' ? 'あとで' : '待ち'}</Text></View></View></View></Pressable>)}</ScrollView>}
        </React.Fragment>
      ); })}
      <Modal visible={Boolean(bucketTask)} transparent animationType="fade" onRequestClose={() => setBucketTask(null)}>
        <Pressable style={styles.bucketModalBackdrop} onPress={() => setBucketTask(null)}>
          <View style={styles.bucketModalCard}>
            <Text style={styles.bucketModalTitle}>どこに振り分ける？</Text>
            <Text numberOfLines={1} style={styles.bucketModalTask}>{bucketTask?.title}</Text>
            {([{ id: 'now', label: '今やる', copy: '今日、優先して取り組む' }, { id: 'later', label: 'あとで', copy: '今日中だけど、今ではない' }, { id: 'waiting', label: '待ち', copy: '返事や条件が揃うまで保留' }] as { id: TaskBucket; label: string; copy: string }[]).map((item) => <Pressable key={item.id} style={[styles.bucketModalOption, (bucketTask?.bucket ?? 'now') === item.id && styles.bucketModalOptionActive]} onPress={() => { if (bucketTask) onBucket(bucketTask.id, item.id); setBucketTask(null); setBucketFilter(item.id); }}><View><Text style={styles.bucketModalOptionTitle}>{item.label}</Text><Text style={styles.bucketModalOptionCopy}>{item.copy}</Text></View><Text style={styles.bucketModalOptionCheck}>{(bucketTask?.bucket ?? 'now') === item.id ? '✓' : '›'}</Text></Pressable>)}
          </View>
        </Pressable>
      </Modal>
      <Modal visible={Boolean(actionTask)} transparent animationType="fade" onRequestClose={() => setActionTask(null)}>
        <Pressable style={styles.bucketModalBackdrop} onPress={() => setActionTask(null)}>
          <Pressable style={[styles.taskActionCard, { backgroundColor: popupSurface, borderColor: popupBorder }]} onPress={(event) => event.stopPropagation()}>
            <Text numberOfLines={1} style={[styles.bucketModalTitle, { color: popupText }]}>{actionTask?.title}</Text>
            <Text style={[styles.taskActionHint, { color: popupMuted }]}>タスクの操作</Text>
            <View style={styles.taskActionGrid}>
              <Pressable style={[styles.taskActionOption, { backgroundColor: popupSoft, borderColor: popupBorder }]} onPress={() => { if (actionTask) onEdit(actionTask); setActionTask(null); }}><Text style={[styles.taskActionIcon, { color: popupAccent }]}>✎</Text><Text style={[styles.taskActionLabel, { color: popupText }]}>編集</Text></Pressable>
              <Pressable style={[styles.taskActionOption, { backgroundColor: popupSoft, borderColor: popupBorder }]} onPress={() => { if (actionTask) onDuplicate(actionTask); setActionTask(null); }}><Text style={[styles.taskActionIcon, { color: popupAccent }]}>▣</Text><Text style={[styles.taskActionLabel, { color: popupText }]}>複製</Text></Pressable>
              <Pressable style={[styles.taskActionOption, { backgroundColor: popupSoft, borderColor: popupBorder }]} onPress={() => { if (actionTask) onPostpone(actionTask.id); setActionTask(null); }}><Text style={[styles.taskActionIcon, { color: popupAccent }]}>→</Text><Text style={[styles.taskActionLabel, { color: popupText }]}>明日へ</Text></Pressable>
              <Pressable style={[styles.taskActionOption, styles.taskActionDelete, { backgroundColor: popupSurface, borderColor: popupDanger }]} onPress={() => { if (actionTask) onDelete(actionTask.id); setActionTask(null); }}><Text style={[styles.taskActionIcon, styles.taskActionDeleteText, { color: popupDanger }]}>×</Text><Text style={[styles.taskActionLabel, styles.taskActionDeleteText, { color: popupDanger }]}>削除</Text></Pressable>
            </View>
            <View style={styles.taskActionGrid}>
              <Pressable style={[styles.taskActionOption, { backgroundColor: popupSoft, borderColor: popupBorder }]} onPress={() => { if (actionTask) onSkip(actionTask.id); setActionTask(null); }}><Text style={[styles.taskActionIcon, { color: popupAccent }]}>☾</Text><Text style={[styles.taskActionLabel, { color: popupText }]}>今日はスキップ</Text></Pressable>
              <Pressable style={[styles.taskActionOption, { backgroundColor: popupSoft, borderColor: popupBorder }]} onPress={() => { const target = actionTask; setActionTask(null); if (target) setTimeout(() => setListTask(target), 0); }}><Text style={[styles.taskActionIcon, { color: popupAccent }]}>☷</Text><Text style={[styles.taskActionLabel, { color: popupText }]}>リスト・メモ</Text></Pressable>
            </View>
            {actionTask?.isRoutine && skipBonusAdded < skipBonusMax && onOpenSkipBonusReward && <Pressable style={[styles.taskActionOption, { backgroundColor: popupSoft, borderColor: popupBorder }]} onPress={() => { onOpenSkipBonusReward(); setActionTask(null); }}><Text style={[styles.taskActionIcon, { color: popupAccent }]}>＋</Text><Text style={[styles.taskActionLabel, { color: popupText }]}>Skip Bonusを取得</Text></Pressable>}
            <Pressable style={[styles.taskTemplateSaveAction, { backgroundColor: popupSoft, borderColor: popupBorder }]} onPress={() => { if (actionTask) onSaveTemplate(actionTask); setActionTask(null); }}><View><Text style={[styles.taskTemplateSaveTitle, { color: popupText }]}>設定ごとひな型に保存</Text><Text style={[styles.taskTemplateSaveCopy, { color: popupMuted }]}>カテゴリ・通知・間に合うナビも再利用</Text></View><Text style={[styles.taskTemplateSavePremium, { color: popupAccent }]}>Premium</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <TaskListSheet visible={Boolean(listTask)} task={listTask} designMode={designMode} chicPalette={chicPalette} styles={styles} onClose={() => setListTask(undefined)} onSave={onUpdateTaskList} />
      <Modal visible={tomorrowOpen} transparent animationType="fade" onRequestClose={() => setTomorrowOpen(false)}>
        <Pressable style={styles.bucketModalBackdrop} onPress={() => setTomorrowOpen(false)}>
          <Pressable style={[styles.bucketModalCard, isDark && styles.darkSurface, designMode === 'chic' && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.bucketModalTitle, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textPrimary }]}>明日のタスク</Text>
            <Text style={[styles.taskMeta, isDark && styles.darkMutedText, designMode === 'chic' && { color: chicPalette.textSecondary }]}>{tomorrowKey.replace('-', '/')} ・ {tomorrowTasks.length}件</Text>
            <ScrollView style={{ maxHeight: 420, marginTop: 12 }} showsVerticalScrollIndicator={false}>
              {tomorrowTasks.length === 0 ? <Text style={[styles.emptyCopy, isDark && styles.darkMutedText, designMode === 'chic' && { color: chicPalette.textSecondary }]}>明日のタスクはまだありません。</Text> : tomorrowTasks.map((task) => <View key={task.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: isDark ? '#303B50' : '#E5E0E5' }}><Text style={[styles.taskTitle, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textPrimary }]}>{task.title}</Text><Text style={[styles.taskMeta, isDark && styles.darkMutedText, designMode === 'chic' && { color: chicPalette.taskMeta }]}>{task.scheduledTime ?? '時間指定なし'} ・ {(task.bucket ?? 'now') === 'now' ? '今やる' : task.bucket === 'later' ? 'あとで' : '待ち'}{task.subtasks?.length ? ` ・ サブタスク${task.subtasks.filter((item) => item.done).length}/${task.subtasks.length}` : ''}</Text></View>)}
            </ScrollView>
            <Pressable style={[styles.taskTemplateSaveAction, { marginTop: 14 }]} onPress={() => setTomorrowOpen(false)}><Text style={styles.taskTemplateSaveTitle}>閉じる</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      </>}
    </>
    </HomeRuntimeContext.Provider>
  );
}

function parseVoiceSchedule(value: string, today: Date, dateKey: (date: Date) => string) {
  const result: { date?: string; time?: string } = {};
  if (/明後日/.test(value)) { const date = new Date(today); date.setDate(date.getDate() + 2); result.date = dateKey(date); }
  else if (/明日|あした/.test(value)) { const date = new Date(today); date.setDate(date.getDate() + 1); result.date = dateKey(date); }
  else if (/今日/.test(value)) result.date = dateKey(today);
  const monthDay = value.match(/(\d{1,2})月(\d{1,2})日/);
  if (monthDay) { const date = new Date(today.getFullYear(), Number(monthDay[1]) - 1, Number(monthDay[2])); result.date = dateKey(date); }
  const weekday = value.match(/(日|月|火|水|木|金|土)曜日?/);
  if (weekday && !result.date) { const target = ['日', '月', '火', '水', '木', '金', '土'].indexOf(weekday[1] ?? ''); const date = new Date(today); const distance = (target - date.getDay() + 7) % 7 || 7; date.setDate(date.getDate() + distance); result.date = dateKey(date); }
  const clock = value.match(/(?:午前|午後)?\s*(\d{1,2})(?:時|:\s*)(\d{0,2})/);
  if (clock) { let hour = Number(clock[1]); const minute = clock[2] ? Number(clock[2]) : 0; if (/午後/.test(clock[0]) && hour < 12) hour += 12; if (/午前/.test(clock[0]) && hour === 12) hour = 0; if (hour < 24 && minute < 60) result.time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`; }
  return result;
}

function VoiceQuickAddCard({ designMode, chicPalette, onQuickAdd, onOpenBulkAdd }: { designMode: DesignMode; chicPalette: ChicThemePalette; onQuickAdd: (title: string, category: Category, priority: Priority, scheduledDate?: string, scheduledTime?: string, endAt?: string, isRoutine?: boolean, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, remindDate?: string, remindAt?: string, repeatRule?: RepeatRule, subtasks?: Subtask[]) => void; onOpenBulkAdd: () => void }) {
  const { styles, helpers } = useHomeRuntime();
  const { dateForReminder, dateKey, formatLiveTime, todayInputValue } = helpers;
  const theme = helpers.getThemeTokens?.(designMode);
  const isDark = designMode === 'dark';
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('その他');
  const [priority, setPriority] = useState<Priority>('中');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');
  const [isRoutine, setIsRoutine] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fieldOpen, setFieldOpen] = useState<null | 'category' | 'priority'>(null);
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [deadlineNotifyBefore, setDeadlineNotifyBefore] = useState(10);
  const [activePicker, setActivePicker] = useState<null | 'date' | 'time' | 'deadlineDate' | 'deadlineTime'>(null);
  const [smartResult, setSmartResult] = useState<SmartTaskParseResult>({ title: '', matched: [] });
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const titleInputRef = React.useRef<TextInput>(null);

  const resetDraft = () => {
    setTitle(''); setCategory('その他'); setPriority('中'); setScheduledDate(''); setScheduledTime(''); setScheduledEndTime(''); setIsRoutine(false);
    setDetailsOpen(false); setDeadlineEnabled(false); setDeadlineDate(''); setDeadlineTime(''); setDeadlineNotifyBefore(10); setFieldOpen(null); setActivePicker(null); setSmartResult({ title: '', matched: [] }); setSubtasks([]); setNewSubtask('');
  };
  const submit = () => {
    const clean = title.trim();
    if (!clean) return;
    onQuickAdd(smartResult.title.trim() || clean, category, priority, (smartResult.scheduledDate ?? scheduledDate) || undefined, (smartResult.scheduledTime ?? scheduledTime) || undefined, (smartResult.endTime ?? scheduledEndTime) || undefined, isRoutine, deadlineEnabled ? deadlineDate || undefined : undefined, deadlineEnabled ? deadlineTime || undefined : undefined, deadlineEnabled && deadlineDate && deadlineTime ? deadlineNotifyBefore : undefined, smartResult.remindDate, smartResult.remindAt, smartResult.repeatRule, subtasks.filter((item) => item.title.trim()).map((item, index) => ({ ...item, title: item.title.trim(), order: index })));
    resetDraft();
  };
  const updateTitle = (value: string) => {
    setTitle(value);
    const suggestion = parseSmartTaskInput(value, new Date(), dateKey);
    setSmartResult(suggestion);
    if (suggestion.scheduledDate) setScheduledDate(suggestion.scheduledDate);
    if (suggestion.scheduledTime) setScheduledTime(suggestion.scheduledTime);
    if (suggestion.endTime) setScheduledEndTime(suggestion.endTime);
    if (value.trim()) setDetailsOpen(true);
  };
  const setPicker = (picker: typeof activePicker) => setActivePicker((current) => current === picker ? null : picker);
  const addSubtask = () => {
    const clean = newSubtask.trim();
    if (!clean) return;
    setSubtasks((current) => [...current, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title: clean, done: false, order: current.length }]);
    setNewSubtask('');
  };
  const pickerValue = (picker: typeof activePicker) => {
    if (picker === 'deadlineDate') return dateForReminder(deadlineDate || scheduledDate || todayInputValue(), deadlineTime || '23:59');
    if (picker === 'deadlineTime') return dateForReminder(deadlineDate || scheduledDate || todayInputValue(), deadlineTime || '23:59');
    if (picker === 'time') return dateForReminder(scheduledDate || todayInputValue(), scheduledTime || '09:00');
    return dateForReminder(scheduledDate || todayInputValue(), '12:00');
  };
  const applyPicker = (picker: typeof activePicker, selected: Date) => {
    if (picker === 'date') setScheduledDate(dateKey(selected));
    if (picker === 'time') setScheduledTime(formatLiveTime(selected));
    if (picker === 'deadlineDate') setDeadlineDate(dateKey(selected));
    if (picker === 'deadlineTime') setDeadlineTime(formatLiveTime(selected));
  };
  const renderPicker = (picker: typeof activePicker) => {
    if (!picker) return null;
    const mode = picker.endsWith('Date') || picker === 'date' ? 'date' : 'time';
    const titleText = picker === 'date' ? '実行日を選択' : picker === 'time' ? '実行時間を選択' : picker === 'deadlineDate' ? '期限日を選択' : 'リミット時間を選択';
    if (isDark) return <TaskDateTimePickerSheet visible mode={mode} title={titleText} value={pickerValue(picker)} minimumDate={mode === 'date' ? new Date() : undefined} designMode={designMode} onClose={() => setActivePicker(null)} onConfirm={(selected) => { applyPicker(picker, selected); setActivePicker(null); }} />;
    return <DateTimePicker value={pickerValue(picker)} mode={mode} minimumDate={mode === 'date' ? new Date() : undefined} display={Platform.OS === 'ios' ? (mode === 'date' ? 'inline' : 'spinner') : 'default'} onChange={(event: DateTimePickerEvent, selected) => { if (event.type === 'set' && selected) applyPicker(picker, selected); if (Platform.OS !== 'ios' || event.type === 'set' || event.type === 'dismissed') setActivePicker(null); }} />;
  };

  return <View style={[styles.voiceAddCard, designMode === 'minimal' && styles.voiceAddCardMinimal, isDark && styles.voiceAddCardDark, designMode === 'chic' && styles.voiceAddCardChic, designMode === 'chic' && { backgroundColor: chicPalette.cardTint, borderColor: chicPalette.border }]}>
    <View style={[designMode === 'chic' ? styles.voiceAddPaperChic : styles.voiceAddPaperMinimal, designMode === 'chic' && { backgroundColor: chicPalette.cardSurface }]}>
      <View style={styles.voiceAddHeading}><Text style={[styles.quickAddTitle, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textPrimary }]}>やることを追加</Text><Text style={[styles.voiceAddHint, isDark && styles.darkMutedText, designMode === 'chic' && { color: chicPalette.textSecondary }]}>キーボードのマイクで音声入力できます</Text></View>
      {!detailsOpen && !title && <><Pressable style={[styles.voiceAddCompact, isDark && styles.voiceAddCompactDark]} onPress={() => setDetailsOpen(true)}><Text style={[styles.voiceAddCompactTitle, isDark && styles.darkBodyText]}>タップして入力</Text><Text style={[styles.voiceAddCompactCopy, isDark && styles.darkMutedText]}>内容を確認してから追加できます</Text><Text style={[styles.voiceAddMicText, isDark && styles.darkAccentText]}>🎙</Text></Pressable><Pressable accessibilityRole="button" style={{ minHeight: 38, marginTop: 8, alignItems: 'center', justifyContent: 'center' }} onPress={onOpenBulkAdd}><Text style={[styles.voiceAddDetailsToggleText, isDark && styles.darkAccentText]}>複数まとめて追加 ›</Text></Pressable></>}
       {(detailsOpen || Boolean(title)) && <>
         <View style={styles.voiceAddInputRow}><TextInput ref={titleInputRef} autoFocus={!title} value={title} onChangeText={updateTitle} placeholder="話してそのまま入力" placeholderTextColor={isDark ? '#8F9BB0' : '#A29DAA'} style={[styles.voiceAddInput, designMode === 'minimal' && styles.voiceAddInputMinimal, isDark && styles.voiceAddInputDark, designMode === 'chic' && styles.voiceAddInputChic]} returnKeyType="done" /><Pressable accessibilityRole="button" style={[styles.voiceAddMicButton, isDark && styles.voiceAddMicButtonDark]} onPress={() => { setDetailsOpen(true); titleInputRef.current?.focus(); }}><Text style={styles.voiceAddMicText}>🎙</Text></Pressable></View>
        {smartResult.matched.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}><Text style={[styles.voiceAddHint, isDark && styles.darkMutedText]}>解析:</Text>{smartResult.scheduledDate && <Pressable style={styles.voiceAddQuickChip} onPress={() => { setScheduledDate(''); setSmartResult((current) => ({ ...current, scheduledDate: undefined })); }}><Text style={[styles.voiceAddQuickText, isDark && styles.darkBodyText]}>日付 {smartResult.scheduledDate} ×</Text></Pressable>}{smartResult.scheduledTime && <Pressable style={styles.voiceAddQuickChip} onPress={() => { setScheduledTime(''); setSmartResult((current) => ({ ...current, scheduledTime: undefined })); }}><Text style={[styles.voiceAddQuickText, isDark && styles.darkBodyText]}>時刻 {smartResult.scheduledTime} ×</Text></Pressable>}{smartResult.endTime && <Pressable style={styles.voiceAddQuickChip} onPress={() => { setScheduledEndTime(''); setSmartResult((current) => ({ ...current, endTime: undefined })); }}><Text style={[styles.voiceAddQuickText, isDark && styles.darkBodyText]}>終了 {smartResult.endTime} ×</Text></Pressable>}{smartResult.remindAt && <Pressable style={styles.voiceAddQuickChip} onPress={() => setSmartResult((current) => ({ ...current, remindDate: undefined, remindAt: undefined }))}><Text style={[styles.voiceAddQuickText, isDark && styles.darkBodyText]}>通知 {smartResult.remindAt} ×</Text></Pressable>}{smartResult.repeatRule && <Pressable style={styles.voiceAddQuickChip} onPress={() => setSmartResult((current) => ({ ...current, repeatRule: undefined }))}><Text style={[styles.voiceAddQuickText, isDark && styles.darkBodyText]}>繰り返し {smartResult.repeatRule} ×</Text></Pressable>}</View>}
        <View style={styles.voiceAddQuickRow}><Pressable style={[styles.voiceAddQuickChip, isDark && styles.voiceAddChoiceDark, designMode === 'chic' && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]} onPress={() => setScheduledDate(todayInputValue())}><Text style={[styles.voiceAddQuickText, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textSecondary }]}>今日</Text></Pressable><Pressable style={[styles.voiceAddQuickChip, isDark && styles.voiceAddChoiceDark, designMode === 'chic' && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]} onPress={() => setScheduledDate(todayInputValue(1))}><Text style={[styles.voiceAddQuickText, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textSecondary }]}>明日</Text></Pressable><Pressable style={[styles.voiceAddQuickChip, isDark && styles.voiceAddChoiceDark, designMode === 'chic' && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]} onPress={() => setPicker('date')}><Text style={[styles.voiceAddQuickText, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textSecondary }]}>{scheduledDate || '日付指定'}</Text></Pressable><Pressable style={[styles.voiceAddQuickChip, isDark && styles.voiceAddChoiceDark, designMode === 'chic' && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]} onPress={() => setScheduledTime('')}><Text style={[styles.voiceAddQuickText, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textSecondary }]}>時間なし</Text></Pressable><Pressable style={[styles.voiceAddQuickChip, isDark && styles.voiceAddChoiceDark, designMode === 'chic' && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]} onPress={() => setPicker('time')}><Text style={[styles.voiceAddQuickText, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textSecondary }]}>{scheduledTime || '時間指定'}</Text></Pressable>{scheduledTime && <TextInput value={scheduledEndTime} onChangeText={setScheduledEndTime} placeholder="終了時間" placeholderTextColor={isDark ? '#8F9BB0' : '#A29DAA'} keyboardType="numbers-and-punctuation" style={[styles.voiceAddQuickChip, { minWidth: 82, color: theme?.colors?.primaryText ?? '#182235' }, isDark && styles.voiceAddChoiceDark]} />}</View>
        <Pressable style={[styles.voiceAddDetailsToggle, isDark && styles.voiceAddDetailsToggleDark]} onPress={() => setDetailsOpen((value) => !value)}><Text style={[styles.voiceAddDetailsToggleText, isDark && styles.darkBodyText]}>詳細設定</Text><Text style={[styles.voiceAddDetailsToggleText, isDark && styles.darkMutedText]}>{detailsOpen ? '⌃' : '⌄'}</Text></Pressable>
        {detailsOpen && <View style={[styles.voiceAddDetailsPanel, isDark && styles.voiceAddDetailsPanelDark]}>
          <View style={styles.voiceAddChoicesRow}><Pressable style={[styles.voiceAddChoice, isDark && styles.voiceAddChoiceDark]} onPress={() => setFieldOpen('category')}><Text style={[styles.voiceAddChoiceLabel, isDark && styles.voiceAddChoiceLabelDark]}>ジャンル</Text><Text style={[styles.voiceAddChoiceValue, isDark && styles.voiceAddChoiceValueDark]}>{category}</Text></Pressable><Pressable style={[styles.voiceAddChoice, isDark && styles.voiceAddChoiceDark]} onPress={() => setFieldOpen('priority')}><Text style={[styles.voiceAddChoiceLabel, isDark && styles.voiceAddChoiceLabelDark]}>優先度</Text><Text style={[styles.voiceAddChoiceValue, isDark && styles.voiceAddChoiceValueDark]}>{priority}</Text></Pressable></View>
          <Pressable style={styles.routineToggleRow} onPress={() => setIsRoutine((value) => !value)}><View style={[styles.routineToggleBox, isRoutine && styles.routineToggleBoxActive, isRoutine && isDark && styles.routineToggleBoxActiveDark]}><Text style={styles.routineToggleCheck}>{isRoutine ? '✓' : ''}</Text></View><View><Text style={[styles.routineToggleTitle, isDark && styles.routineToggleTitleDark]}>ルーティンにする</Text><Text style={[styles.routineToggleCopy, isDark && styles.routineToggleCopyDark]}>毎日の継続状況を分析に表示</Text></View></Pressable>
          <Pressable style={[styles.deadlineToggleRow, isDark && styles.deadlinePanelDark]} onPress={() => setDeadlineEnabled((value) => !value)}><View style={[styles.routineToggleBox, deadlineEnabled && styles.routineToggleBoxActive, deadlineEnabled && isDark && styles.routineToggleBoxActiveDark]}><Text style={styles.routineToggleCheck}>{deadlineEnabled ? '✓' : ''}</Text></View><Text style={[styles.deadlineToggleTitle, isDark && styles.darkBodyText]}>期限を設定</Text></Pressable>
          {deadlineEnabled && <View style={[styles.deadlinePanel, isDark && styles.deadlinePanelDark]}><Pressable style={[styles.pickerButton, isDark && styles.pickerButtonDark]} onPress={() => setPicker('deadlineDate')}><Text style={[styles.pickerButtonLabel, isDark && styles.darkMutedText]}>期限日</Text><Text style={[styles.pickerButtonValue, isDark && styles.darkBodyText]}>{deadlineDate || '指定なし'}</Text></Pressable><Pressable style={[styles.pickerButton, isDark && styles.pickerButtonDark]} onPress={() => setPicker('deadlineTime')}><Text style={[styles.pickerButtonLabel, isDark && styles.darkMutedText]}>リミット時間</Text><Text style={[styles.pickerButtonValue, isDark && styles.darkBodyText]}>{deadlineTime || '指定なし'}</Text></Pressable><Pressable style={styles.routineToggleRow} onPress={() => setDeadlineNotifyBefore((value) => value === 10 ? 30 : 10)}><View style={[styles.routineToggleBox, isDark && styles.routineToggleBoxActiveDark]}><Text style={styles.routineToggleCheck}>✓</Text></View><Text style={[styles.routineToggleTitle, isDark && styles.darkBodyText]}>期限前に通知（{deadlineNotifyBefore}分前）</Text></Pressable></View>}
        </View>}
        <View style={styles.voiceAddActionRow}><Pressable style={styles.voiceAddCancel} onPress={resetDraft}><Text style={[styles.voiceAddCancelText, isDark && styles.darkMutedText]}>キャンセル</Text></Pressable><Pressable style={[styles.voiceAddRegister, designMode === 'minimal' && styles.voiceAddRegisterMinimal, isDark && styles.voiceAddRegisterDark, designMode === 'chic' && styles.voiceAddRegisterChic]} onPress={submit}><Text style={styles.voiceAddRegisterText}>追加する</Text></Pressable></View>
        <Pressable accessibilityRole="button" style={{ minHeight: 38, marginTop: 8, alignItems: 'center', justifyContent: 'center' }} onPress={onOpenBulkAdd}><Text style={[styles.voiceAddDetailsToggleText, isDark && styles.darkAccentText]}>複数まとめて追加 ›</Text></Pressable>
      </>}
    </View>
    {fieldOpen && <Modal visible transparent animationType="fade" onRequestClose={() => setFieldOpen(null)}><Pressable style={styles.bucketModalBackdrop} onPress={() => setFieldOpen(null)}><View style={[styles.bucketModalCard, isDark && styles.darkSurface]}><Text style={[styles.bucketModalTitle, isDark && styles.darkBodyText]}>{fieldOpen === 'category' ? 'ジャンル' : '優先度'}</Text>{(fieldOpen === 'category' ? categories : priorities).map((item) => <Pressable key={item} style={styles.voiceChoiceOption} onPress={() => { if (fieldOpen === 'category') setCategory(item as Category); else setPriority(item as Priority); setFieldOpen(null); }}><Text style={[styles.voiceChoiceOptionText, isDark && styles.darkBodyText]}>{item}</Text></Pressable>)}</View></Pressable></Modal>}
    {detailsOpen && <View style={[styles.voiceAddDetailsPanel, isDark && styles.voiceAddDetailsPanelDark]}><Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>サブタスク</Text>{subtasks.map((item) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}><TextInput value={item.title} onChangeText={(value) => setSubtasks((current) => current.map((entry) => entry.id === item.id ? { ...entry, title: value } : entry))} placeholder="サブタスク" placeholderTextColor={isDark ? '#8F9BB0' : '#A29DAA'} style={[styles.voiceAddInput, { flex: 1, minHeight: 42 }, isDark && styles.voiceAddInputDark]} /><Pressable accessibilityRole="button" onPress={() => setSubtasks((current) => current.filter((entry) => entry.id !== item.id))}><Text style={[styles.taskActionDeleteText, isDark && styles.darkAccentText]}>削除</Text></Pressable></View>)}<View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><TextInput value={newSubtask} onChangeText={setNewSubtask} onSubmitEditing={addSubtask} placeholder="サブタスクを追加" placeholderTextColor={isDark ? '#8F9BB0' : '#A29DAA'} style={[styles.voiceAddInput, { flex: 1, minHeight: 42 }, isDark && styles.voiceAddInputDark]} /><Pressable accessibilityRole="button" style={styles.taskTemplateSaveAction} onPress={addSubtask}><Text style={styles.taskTemplateSaveTitle}>追加</Text></Pressable></View></View>}
    {activePicker && renderPicker(activePicker)}
  </View>;
}
