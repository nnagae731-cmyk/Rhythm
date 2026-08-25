import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { ChicThemePalette, DesignMode } from '../theme';
import { Category, Priority, Task, TaskBucket, TaskListItem } from '../types';
import { categories } from '../features/tasks/taskUtils';
import { OnboardingHint } from '../features/onboarding/OnboardingHint';
import { TaskListSheet } from '../components/TaskListSheet';
type TaskSortOrder = 'recommended' | 'scheduled' | 'priority' | 'created';
const taskSortOptions: { id: TaskSortOrder; label: string }[] = [
  { id: 'recommended', label: 'おすすめ' },
  { id: 'scheduled', label: '実行日が近い順' },
  { id: 'priority', label: '優先度順' },
  { id: 'created', label: '登録順' },
];
export function HomeScreen({
  tasks,
  allTasks,
  now,
  completionIcon,
  designMode,
  chicPalette,
  selectionMode,
  selectedTaskIds,
  onAdd,
  onOpenFocus,
  todayReviewExists = false,
  onOpenTodayRecord,
  onOpenSchedule,
  onToggle,
  onToggleSubtask,
  onUpdateTaskList,
  onCompleteParent,
  onEdit,
  onToggleSelection,
  onSelectionMode,
  onClearSelection,
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
  showTodoCompleteOnboarding,
  showCompletedTasksOnboarding,
  showTaskBucketsOnboarding,
  showTaskDetailsOnboarding,
  helpers,
}: {
  tasks: Task[];
  allTasks: Task[];
  now: Date;
  designMode: DesignMode;
  chicPalette: ChicThemePalette;
  completionIcon: string;
  selectionMode: boolean;
  selectedTaskIds: string[];
  onAdd: () => void;
  onOpenFocus: () => void;
  todayReviewExists?: boolean;
  onOpenTodayRecord?: () => void;
  onOpenSchedule?: () => void;
  onToggle: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onUpdateTaskList: (taskId: string, items: TaskListItem[]) => void;
  onCompleteParent: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onToggleSelection: (id: string) => void;
  onSelectionMode: () => void;
  onClearSelection?: () => void;
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
  renderTodayWinStrip: (tasks: Task[], onOpenFocus?: () => void, onToggleNowTask?: (id: string) => void, onOpenTaskActions?: (task: Task) => void, selectionMode?: boolean, selectedTaskIds?: string[]) => React.ReactNode;
  showTodoOnboarding?: boolean;
  onTodoOnboardingAction?: () => void;
  showTodoCompleteOnboarding?: boolean;
  showCompletedTasksOnboarding?: boolean;
  showTaskBucketsOnboarding?: boolean;
  showTaskDetailsOnboarding?: boolean;
  helpers: any;
}) {
  const { dateKey } = helpers;
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
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [sortPickerOpen, setSortPickerOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<TaskSortOrder>('recommended');
  const bucketTasks = tasks.filter((task) => (task.bucket ?? 'now') === bucketFilter);
  const categoryTasks = categoryFilter === 'すべて' ? bucketTasks : bucketTasks.filter((task) => task.category === categoryFilter);
  const displayTasks = [...categoryTasks].sort((a, b) => {
    if (sortOrder === 'priority') return priorityOrder[a.priority] - priorityOrder[b.priority];
    if (sortOrder === 'created') return tasks.indexOf(a) - tasks.indexOf(b);
    const aDate = a.scheduledDate ?? '9999-99-99';
    const bDate = b.scheduledDate ?? '9999-99-99';
    const dateResult = (aDate + (a.scheduledTime ?? '99:99')).localeCompare(bDate + (b.scheduledTime ?? '99:99'));
    if (sortOrder === 'scheduled' && dateResult !== 0) return dateResult;
    if (sortOrder === 'recommended' && dateResult !== 0) return dateResult;
    return priorityOrder[a.priority] - priorityOrder[b.priority] || tasks.indexOf(a) - tasks.indexOf(b);
  });
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
  const nowTasks = tasks.filter((task) => (task.bucket ?? 'now') === 'now');
  const featuredNowTask = [...nowTasks].filter((task) => !task.done).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])[0];
  const remainingNowTasks = nowTasks.filter((task) => !task.done && task.id !== featuredNowTask?.id);
  const handleTaskCheck = (id: string) => {
    if (selectionMode) {
      onToggleSelection(id);
      return;
    }
    const task = allTasks.find((item) => item.id === id);
    if (task?.subtasks?.some((item) => !item.done)) onCompleteParent(id);
    else onToggle(id);
  };
  const clearSelectionForViewChange = () => onClearSelection?.();
  const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: designMode === 'chic' ? chicPalette.textPrimary : theme?.colors?.primaryText ?? '#182235', fontSize: 18, fontWeight: '900' }}>{now.getMonth() + 1}月{now.getDate()}日（{weekdayLabels[now.getDay()]}）</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="タスクを追加" onPress={onAdd} style={{ minHeight: 40, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: focusShortcutBorder, backgroundColor: designMode === 'chic' ? chicPalette.accentSoft : theme?.colors?.softAccent ?? '#E8EEFF', justifyContent: 'center' }}><Text style={{ color: focusShortcutAccent, fontSize: 13, fontWeight: '900' }}>＋追加</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={selectionMode ? '選択を終了' : 'タスクを選択'} onPress={onSelectionMode} style={{ minHeight: 40, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: selectionMode ? focusShortcutAccent : focusShortcutBorder, backgroundColor: selectionMode ? focusShortcutAccent : focusShortcutBackground, justifyContent: 'center' }}><Text style={{ color: selectionMode ? (designMode === 'chic' ? chicPalette.onAccent : theme?.colors?.screenBackground ?? '#FFFFFF') : focusShortcutText, fontSize: 13, fontWeight: '900' }}>{selectionMode ? '取消' : '選択'}</Text></Pressable>
        </View>
      </View>
       <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: focusShortcutBorder, marginBottom: 14 }}>
        {(['now', 'list'] as const).map((tab) => <Pressable key={tab} onPress={() => { clearSelectionForViewChange(); setHomeTab(tab); if (tab === 'now') setBucketFilter('now'); else if (bucketFilter === 'now') setBucketFilter('later'); }} style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderBottomWidth: homeTab === tab ? 2 : 0, borderBottomColor: focusShortcutAccent }}><Text style={{ color: homeTab === tab ? focusShortcutAccent : focusShortcutMuted, fontSize: 13, fontWeight: homeTab === tab ? '900' : '700' }}>{tab === 'now' ? '今' : '一覧'}</Text></Pressable>)}
       </View>
       {selectionBar}
      {homeTab === 'now' && <>
      {renderTodayWinStrip(allTasks, onOpenFocus, handleTaskCheck, (task) => selectionMode ? onToggleSelection(task.id) : setActionTask(task), selectionMode, selectedTaskIds)}
      {remainingNowTasks.length > 0 && <View style={{ marginTop: 12, paddingHorizontal: 4 }}><Text style={{ color: focusShortcutMuted, fontSize: 11, fontWeight: '800', marginBottom: 4 }}>今やる</Text>{remainingNowTasks.map((task) => <TodoTaskRow key={`now-task-${task.id}`} task={task} styles={styles} designMode={designMode} chicPalette={chicPalette} isDark={isDark} selected={selectedTaskIds.includes(task.id)} selectionMode={selectionMode} completionIcon={completionIcon} textColor={focusShortcutText} accentColor={focusShortcutAccent} borderColor={focusShortcutBorder} onPress={() => selectionMode ? onToggleSelection(task.id) : setActionTask(task)} onCheck={() => handleTaskCheck(task.id)} />)}</View>}
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
        return <Pressable key={item.id} style={[styles.bucketTab, designMode === 'minimal' && styles.bucketTabMinimal, designMode === 'chic' && styles.bucketTabChic, isDark && styles.darkSurface, designMode === 'chic' && { backgroundColor: activeChic ? chicPalette.accent : chicPalette.cardSurface, borderColor: activeChic ? chicPalette.accent : chicPalette.border }, bucketFilter === item.id && styles.bucketTabActive, bucketFilter === item.id && isDark && styles.bucketTabActiveDark, bucketFilter === item.id && designMode === 'chic' && styles.bucketTabActiveChic, activeChic && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }]} onPress={() => { clearSelectionForViewChange(); setBucketFilter(item.id); }}><Text style={[styles.bucketTabText, isDark && styles.darkBodyText, bucketFilter === item.id && styles.bucketTabTextActive, designMode === 'chic' && { color: activeChic ? chicPalette.onAccent : chicPalette.textSecondary }, activeChic && { color: chicPalette.onAccent }]}>{item.label} {count}</Text></Pressable>;
      })}</View>

      <Pressable accessibilityRole="button" onPress={() => setCategoryPickerOpen(true)} style={{ minHeight: 44, marginBottom: 2, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: focusShortcutBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: focusShortcutText, fontSize: 13, fontWeight: '800' }}>絞り込み</Text><Text style={{ color: focusShortcutAccent, fontSize: 13, fontWeight: '800' }}>{categoryFilter} ›</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setSortPickerOpen(true)} style={{ minHeight: 44, marginBottom: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: focusShortcutBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: focusShortcutText, fontSize: 13, fontWeight: '800' }}>並び順</Text><Text style={{ color: focusShortcutAccent, fontSize: 13, fontWeight: '800' }}>{taskSortOptions.find((item) => item.id === sortOrder)?.label ?? 'おすすめ'} ›</Text></Pressable>

      {displayTasks.length === 0 ? (
        <View style={[styles.emptyCard, designMode === 'minimal' && styles.emptyCardMinimal, designMode === 'chic' && styles.emptyCardChic, isDark && styles.darkEmptyCard, designMode === 'chic' && { backgroundColor: chicPalette.cardSurface, borderColor: chicPalette.border }]}>
          <View style={designMode === 'chic' ? styles.emptyChicGlass : styles.emptyPlainContent}><Text style={[styles.emptyIcon, isDark && styles.darkAccentText, designMode === 'chic' && { color: chicPalette.accent }]}>○</Text><Text style={[styles.emptyTitle, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textPrimary }]}>最初のタスクを追加しよう</Text><Text style={[styles.emptyCopy, isDark && styles.darkMutedText, designMode === 'chic' && { color: chicPalette.textSecondary }]}>忘れたくないことを、ここに置いておけます。</Text></View>
        </View>
      ) : displayTasks.map((task) => { const taskSubtasks = task.subtasks?.slice().sort((a, b) => a.order - b.order) ?? []; const hasSubtasks = taskSubtasks.length > 0; const isSubtasksExpanded = expandedSubtasks[task.id] === true; const completedSubtaskCount = taskSubtasks.filter((item) => item.done).length; return (
        <React.Fragment key={task.id}>
        <TodoTaskRow task={task} styles={styles} designMode={designMode} chicPalette={chicPalette} isDark={isDark} selected={selectedTaskIds.includes(task.id)} selectionMode={selectionMode} completionIcon={completionIcon} textColor={focusShortcutText} accentColor={focusShortcutAccent} borderColor={focusShortcutBorder} onPress={() => selectionMode ? onToggleSelection(task.id) : setActionTask(task)} onCheck={() => handleTaskCheck(task.id)} />
        {hasSubtasks && <Pressable accessibilityRole="button" style={[{ minHeight: 40, marginTop: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, isDark ? styles.darkSurface : styles.filterChip, designMode === 'chic' && { backgroundColor: chicPalette.accentSoft, borderColor: chicPalette.border }]} onPress={() => { clearSelectionForViewChange(); setExpandedSubtasks((current) => ({ ...current, [task.id]: !isSubtasksExpanded })); }}><Text style={[styles.taskMeta, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.accentStrong }]}>サブタスク {taskSubtasks.length}件 ・ 完了 {completedSubtaskCount}件</Text><Text style={[styles.taskMeta, isDark && styles.darkAccentText, designMode === 'chic' && { color: chicPalette.accent }]}>{isSubtasksExpanded ? '閉じる' : '開く'}⌄</Text></Pressable>}
         {isSubtasksExpanded && <ScrollView nestedScrollEnabled style={{ maxHeight: 280, marginTop: 2 }} showsVerticalScrollIndicator={taskSubtasks.length > 6}>{taskSubtasks.map((item) => <Pressable key={`${task.id}:${item.id}`} style={[styles.taskCard, designMode === 'minimal' && styles.taskCardMinimal, isDark && styles.darkSurface, designMode === 'chic' && styles.taskCardChic, { marginLeft: 18, borderLeftWidth: 3, borderLeftColor: designMode === 'chic' ? chicPalette.accent : theme?.colors?.primaryAccent ?? '#68748A' }, item.done && styles.taskCardDone]} onPress={() => onToggleSubtask(task.id, item.id)}><View style={[styles.taskCardInner, designMode === 'chic' && styles.taskCardInnerChic, designMode === 'chic' && { backgroundColor: chicPalette.cardSurface }]}><Pressable style={[styles.check, isDark && styles.checkDark, item.done && styles.checkDone, item.done && isDark && styles.checkDoneDark, designMode === 'chic' && { backgroundColor: item.done ? chicPalette.accent : chicPalette.cardTint, borderColor: chicPalette.accent }]} onPress={() => onToggleSubtask(task.id, item.id)}><Text style={styles.checkMark}>{item.done ? completionIcon : ''}</Text></Pressable><View style={styles.taskBody}><Text style={[styles.taskTitle, item.done && styles.taskTitleDone, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textPrimary }]}>{item.title}</Text><Text style={[styles.taskMeta, isDark && styles.darkMutedText, designMode === 'chic' && { color: chicPalette.taskMeta }]}>サブタスク ・ 親: {task.title}</Text><View style={styles.taskInfoRow}><View style={[styles.categoryPill, isDark && styles.darkSurface, designMode === 'chic' && { backgroundColor: chicPalette.accentSoft, borderColor: chicPalette.border }]}><Text style={[styles.categoryText, isDark && styles.darkBodyText, designMode === 'chic' && { color: chicPalette.textSecondary }]}>次の一歩</Text></View><Text style={[styles.taskMeta, isDark && styles.darkAccentText, designMode === 'chic' && { color: chicPalette.taskMeta }]}>{(task.bucket ?? 'now') === 'now' ? '今やる' : task.bucket === 'later' ? 'あとで' : '待ち'}</Text></View></View></View></Pressable>)}</ScrollView>}
        </React.Fragment>
      ); })}
      </>}
      <Modal visible={categoryPickerOpen} transparent animationType="fade" onRequestClose={() => setCategoryPickerOpen(false)}>
        <Pressable style={styles.bucketModalBackdrop} onPress={() => setCategoryPickerOpen(false)}>
          <Pressable style={[styles.bucketModalCard, { backgroundColor: popupSurface, borderColor: popupBorder }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.bucketModalTitle, { color: popupText }]}>絞り込み</Text>
            {(['すべて', ...categories] as const).map((category) => <Pressable key={category} style={{ minHeight: 42, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: popupBorder }} onPress={() => { clearSelectionForViewChange(); setCategoryFilter(category); setCategoryPickerOpen(false); }}><Text style={{ color: categoryFilter === category ? popupAccent : popupText, fontSize: 14, fontWeight: categoryFilter === category ? '800' : '500' }}>{category}{categoryFilter === category ? '  ✓' : ''}</Text></Pressable>)}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={sortPickerOpen} transparent animationType="fade" onRequestClose={() => setSortPickerOpen(false)}>
        <Pressable style={styles.bucketModalBackdrop} onPress={() => setSortPickerOpen(false)}>
          <Pressable style={[styles.bucketModalCard, { backgroundColor: popupSurface, borderColor: popupBorder }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.bucketModalTitle, { color: popupText }]}>並び順</Text>
            {taskSortOptions.map((option) => <Pressable key={option.id} style={{ minHeight: 42, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: popupBorder }} onPress={() => { setSortOrder(option.id); setSortPickerOpen(false); }}><Text style={{ color: sortOrder === option.id ? popupAccent : popupText, fontSize: 14, fontWeight: sortOrder === option.id ? '800' : '500' }}>{option.label}{sortOrder === option.id ? '  ✓' : ''}</Text></Pressable>)}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={Boolean(bucketTask)} transparent animationType="fade" onRequestClose={() => setBucketTask(null)}>
        <Pressable style={styles.bucketModalBackdrop} onPress={() => setBucketTask(null)}>
          <Pressable style={[styles.bucketModalCard, { backgroundColor: popupSurface, borderColor: popupBorder }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.bucketModalTitle, { color: popupText }]}>どこに振り分ける？</Text>
            <Text numberOfLines={1} style={[styles.bucketModalTask, { color: popupText }]}>{bucketTask?.title}</Text>
            {([{ id: 'now', label: '今やる', copy: '今日、優先して取り組む' }, { id: 'later', label: 'あとで', copy: '今日中だけど、今ではない' }, { id: 'waiting', label: '待ち', copy: '返事や条件が揃うまで保留' }] as { id: TaskBucket; label: string; copy: string }[]).map((item) => <Pressable key={item.id} style={[styles.bucketModalOption, { backgroundColor: popupSoft, borderColor: popupBorder }, (bucketTask?.bucket ?? 'now') === item.id && { borderColor: popupAccent }]} onPress={() => { if (bucketTask) onBucket(bucketTask.id, item.id); clearSelectionForViewChange(); setBucketTask(null); setBucketFilter(item.id); }}><View><Text style={[styles.bucketModalOptionTitle, { color: popupText }]}>{item.label}</Text><Text style={[styles.bucketModalOptionCopy, { color: popupMuted }]}>{item.copy}</Text></View><Text style={[styles.bucketModalOptionCheck, { color: popupAccent }]}>{(bucketTask?.bucket ?? 'now') === item.id ? '✓' : '›'}</Text></Pressable>)}
          </Pressable>
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
              <Pressable style={[styles.taskActionOption, { backgroundColor: popupSoft, borderColor: popupBorder }]} onPress={() => { const target = actionTask; setActionTask(null); if (target) setTimeout(() => setBucketTask(target), 0); }}><Text style={[styles.taskActionIcon, { color: popupAccent }]}>⇄</Text><Text style={[styles.taskActionLabel, { color: popupText }]}>移動・振り分け</Text></Pressable>
            </View>
            {actionTask?.isRoutine && skipBonusAdded < skipBonusMax && onOpenSkipBonusReward && <Pressable style={[styles.taskActionOption, { backgroundColor: popupSoft, borderColor: popupBorder }]} onPress={() => { onOpenSkipBonusReward(); setActionTask(null); }}><Text style={[styles.taskActionIcon, { color: popupAccent }]}>＋</Text><Text style={[styles.taskActionLabel, { color: popupText }]}>Skip Bonusを取得</Text></Pressable>}
            <Pressable style={[styles.taskTemplateSaveAction, { backgroundColor: popupSoft, borderColor: popupBorder }]} onPress={() => { if (actionTask) onSaveTemplate(actionTask); setActionTask(null); }}><View><Text style={[styles.taskTemplateSaveTitle, { color: popupText }]}>設定ごとひな型に保存</Text><Text style={[styles.taskTemplateSaveCopy, { color: popupMuted }]}>カテゴリ・通知・間に合うナビも再利用</Text></View><Text style={[styles.taskTemplateSavePremium, { color: popupAccent }]}>Premium</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <TaskListSheet visible={Boolean(listTask)} task={listTask} designMode={designMode} chicPalette={chicPalette} styles={styles} onClose={() => setListTask(undefined)} onSave={onUpdateTaskList} />
      <Modal visible={tomorrowOpen} transparent animationType="fade" onRequestClose={() => setTomorrowOpen(false)}>
        <Pressable style={styles.bucketModalBackdrop} onPress={() => setTomorrowOpen(false)}>
          <Pressable style={[styles.bucketModalCard, { backgroundColor: popupSurface, borderColor: popupBorder }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.bucketModalTitle, { color: popupText }]}>明日のタスク</Text>
            <Text style={[styles.taskMeta, { color: popupMuted }]}>{tomorrowKey.replace('-', '/')} ・ {tomorrowTasks.length}件</Text>
            <ScrollView style={{ maxHeight: 420, marginTop: 12 }} showsVerticalScrollIndicator={false}>
              {tomorrowTasks.length === 0 ? <Text style={[styles.emptyCopy, { color: popupMuted }]}>明日のタスクはまだありません。</Text> : tomorrowTasks.map((task) => <View key={task.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: popupBorder }}><Text style={[styles.taskTitle, { color: popupText }]}>{task.title}</Text><Text style={[styles.taskMeta, { color: popupMuted }]}>{task.scheduledTime ?? '時間指定なし'} ・ {(task.bucket ?? 'now') === 'now' ? '今やる' : task.bucket === 'later' ? 'あとで' : '待ち'}{task.subtasks?.length ? ` ・ サブタスク${task.subtasks.filter((item) => item.done).length}/${task.subtasks.length}` : ''}</Text></View>)}
            </ScrollView>
            <Pressable style={[styles.taskTemplateSaveAction, { marginTop: 14, backgroundColor: popupSoft, borderColor: popupBorder }]} onPress={() => setTomorrowOpen(false)}><Text style={[styles.taskTemplateSaveTitle, { color: popupText }]}>閉じる</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function TodoTaskRow({ task, styles, designMode, chicPalette, isDark, selected, selectionMode, completionIcon, textColor, accentColor, borderColor, onPress, onCheck }: { task: Task; styles: any; designMode: DesignMode; chicPalette: ChicThemePalette; isDark: boolean; selected: boolean; selectionMode: boolean; completionIcon: string; textColor: string; accentColor: string; borderColor: string; onPress: () => void; onCheck: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: borderColor, paddingVertical: 4 }}>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selectionMode ? selected : task.done }} onPress={(event) => { event.stopPropagation(); onCheck(); }} style={[styles.check, isDark && styles.checkDark, task.done && !selectionMode && styles.checkDone, selected && styles.selectionChecked, designMode === 'chic' && (selected || task.done) && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }]}><Text style={styles.checkMark}>{selectionMode ? (selected ? '✓' : '') : (task.done ? completionIcon : '')}</Text></Pressable>
    <Text numberOfLines={2} style={{ flex: 1, color: textColor, fontSize: 13, fontWeight: '700', marginLeft: 9 }}>{task.title}</Text>
    <Text style={{ color: accentColor, fontSize: 18, marginLeft: 8 }}>›</Text>
  </Pressable>;
}
