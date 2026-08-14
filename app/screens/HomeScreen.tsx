import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ChicPattern, DesignMode } from '../theme';
import { Category, Priority, Task, TaskBucket, TimeTab } from '../types';
import { categories, categoryColors, getChicTaskPatternPalette, priorities, repeatOptions, chicUtilityPalettes } from '../features/tasks/taskUtils';
import { TaskDateTimePickerSheet } from '../components/TaskDateTimePickerSheet';

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
  timeline,
  now,
  completionIcon,
  designMode,
  chicPattern,
  selectionMode,
  selectedTaskIds,
  onAdd,
  onQuickAdd,
  onToggle,
  onEdit,
  onToggleSelection,
  onSelectionMode,
  onCompleteSelected,
  onDeleteSelected,
  onDelete,
  onDuplicate,
  onSaveTemplate,
  onPostpone,
  onBucket,
  onOpenTime,
  onOpenWish,
  styles,
  renderTodayWinStrip,
  PatternDecor,
  helpers,
}: {
  tasks: Task[];
  allTasks: Task[];
  remaining: number;
  timeline: { start: string; leave: string; arrival: string };
  now: Date;
  designMode: DesignMode;
  chicPattern: ChicPattern;
  completionIcon: string;
  selectionMode: boolean;
  selectedTaskIds: string[];
  onAdd: () => void;
  onQuickAdd: (title: string, category: Category, priority: Priority, scheduledDate?: string, scheduledTime?: string, isRoutine?: boolean) => void;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onToggleSelection: (id: string) => void;
  onSelectionMode: () => void;
  onCompleteSelected: () => void;
  onDeleteSelected: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (task: Task) => void;
  onSaveTemplate: (task: Task) => void;
  onPostpone: (id: string) => void;
  onBucket: (id: string, bucket: TaskBucket) => void;
  onOpenTime: (tab: TimeTab) => void;
  onOpenWish: () => void;
  styles: any;
  renderTodayWinStrip: (tasks: Task[]) => React.ReactNode;
  PatternDecor: React.ComponentType<{ pattern: ChicPattern; accent: string; warm: string; density?: 'regular' | 'compact' }>;
  helpers: any;
}) {
  const { deadlineLabel, getUrgencyStatus, getLateRiskMessage, isCheckChicPattern } = helpers;
  const priorityOrder: Record<Priority, number> = { 高: 0, 中: 1, 低: 2 };
  const isDark = designMode === 'dark';
  const [categoryFilter, setCategoryFilter] = useState<'すべて' | Category>('すべて');
  const [bucketFilter, setBucketFilter] = useState<TaskBucket>('now');
  const [bucketTask, setBucketTask] = useState<Task | null>(null);
  const [actionTask, setActionTask] = useState<Task | null>(null);
  const bucketTasks = tasks.filter((task) => (task.bucket ?? 'now') === bucketFilter);
  const categoryTasks = categoryFilter === 'すべて' ? bucketTasks : bucketTasks.filter((task) => task.category === categoryFilter);
  const displayTasks = [...categoryTasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  return (
    <HomeRuntimeContext.Provider value={{ styles, PatternDecor, helpers }}>
    <>
      {renderTodayWinStrip(allTasks)}

      <View style={[styles.taskHeaderButtons, { justifyContent: 'flex-end', marginBottom: 10 }]}>
        <Pressable style={styles.addButton} onPress={onAdd}><Text style={styles.addButtonText}>＋ 追加</Text></Pressable>
      </View>

      <VoiceQuickAddCard designMode={designMode} chicPattern={chicPattern} onQuickAdd={onQuickAdd} />

      <Pressable
        style={[styles.wishShortcut, designMode === 'minimal' && styles.wishShortcutMinimal, designMode === 'chic' && styles.wishShortcutChic, isDark && styles.wishShortcutDark]}
        onPress={onOpenWish}
      >
        <View>
          <Text style={[styles.wishShortcutLabel, isDark && styles.darkBodyText]}>今月の叶えたいこと</Text>
          <Text style={[styles.wishShortcutText, isDark && styles.darkMutedText]}>今日から、願いの画面へ飛べます</Text>
        </View>
        <Text style={[styles.wishShortcutArrow, isDark && styles.darkAccentText]}>›</Text>
      </Pressable>

      <View style={[styles.sectionHeader, designMode === 'minimal' && styles.sectionHeaderMinimal, isDark && styles.darkPanel]}>
        <View>
          <Text style={[styles.sectionTitle, isDark && styles.darkBodyText]}>今日のタスク</Text>
          <Text style={[styles.sectionSub, isDark && styles.darkMutedText]}>{remaining === 0 ? 'きれいに片づきました' : `あと${remaining}件です`}</Text>
        </View>
        <View style={styles.taskHeaderButtons}>
        <Pressable style={[styles.selectButton, isDark && styles.selectButtonDark]} onPress={onSelectionMode}><Text style={[styles.selectButtonText, isDark && styles.darkBodyText]}>{selectionMode ? '取消' : '選択'}</Text></Pressable>
        </View>
      </View>

      <View style={styles.bucketTabs}>{([{ id: 'now', label: '今やる' }, { id: 'later', label: 'あとで' }, { id: 'waiting', label: '待ち' }] as { id: TaskBucket; label: string }[]).map((item) => {
        const count = tasks.filter((task) => (task.bucket ?? 'now') === item.id).length;
        return <Pressable key={item.id} style={[styles.bucketTab, designMode === 'minimal' && styles.bucketTabMinimal, designMode === 'chic' && styles.bucketTabChic, isDark && styles.darkSurface, bucketFilter === item.id && styles.bucketTabActive, bucketFilter === item.id && isDark && styles.bucketTabActiveDark, bucketFilter === item.id && designMode === 'chic' && styles.bucketTabActiveChic]} onPress={() => setBucketFilter(item.id)}><Text style={[styles.bucketTabText, isDark && styles.darkBodyText, bucketFilter === item.id && styles.bucketTabTextActive]}>{item.label} {count}</Text></Pressable>;
      })}</View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
        {(['すべて', ...categories] as const).map((category) => <Pressable key={category} style={[styles.filterChip, isDark && styles.filterChipDark, categoryFilter === category && styles.filterChipActive, categoryFilter === category && isDark && styles.filterChipActiveDark]} onPress={() => setCategoryFilter(category)}><Text style={[styles.filterChipText, isDark && styles.darkMutedText, categoryFilter === category && styles.filterChipTextActive, categoryFilter === category && isDark && styles.filterChipTextActiveDark]}>{category}</Text></Pressable>)}
      </ScrollView>

      <View style={styles.homeToolRow}>
        <HomeToolCard designMode={designMode} chicPattern={chicPattern} kind="departure" icon="↗" title="出発" meta={timeline.leave} onPress={() => onOpenTime('departure')} />
        <HomeToolCard designMode={designMode} chicPattern={chicPattern} kind="calendar" icon="▦" title="予定表" meta="月を見る" onPress={() => onOpenTime('calendar')} />
        <HomeToolCard designMode={designMode} chicPattern={chicPattern} kind="focus" icon="◉" title="集中" meta="今だけ" onPress={() => onOpenTime('focus')} />
      </View>

      {selectionMode && (
        <View style={[styles.batchBar, isDark && styles.batchBarDark]}>
          <Text style={[styles.batchCount, isDark && styles.batchCountDark]}>{selectedTaskIds.length}件を選択中</Text>
          <View style={styles.batchActions}>
            <Pressable disabled={selectedTaskIds.length === 0} style={[styles.batchComplete, selectedTaskIds.length === 0 && styles.batchDisabled]} onPress={onCompleteSelected}>
              <Text style={styles.batchCompleteText}>選択した項目を完了</Text>
            </Pressable>
            <Pressable disabled={selectedTaskIds.length === 0} style={[styles.batchDelete, selectedTaskIds.length === 0 && styles.batchDisabled]} onPress={onDeleteSelected}>
              <Text style={styles.batchDeleteText}>選択した項目を削除</Text>
            </Pressable>
          </View>
        </View>
      )}

      {displayTasks.length === 0 ? (
        <Pressable style={[styles.emptyCard, designMode === 'minimal' && styles.emptyCardMinimal, designMode === 'chic' && styles.emptyCardChic, isDark && styles.darkEmptyCard]} onPress={onAdd}>
          {designMode === 'chic' && !isCheckChicPattern(chicPattern) && <PatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" />}
          <View style={designMode === 'chic' ? styles.emptyChicGlass : styles.emptyPlainContent}><Text style={[styles.emptyIcon, isDark && styles.darkAccentText]}>○</Text><Text style={[styles.emptyTitle, isDark && styles.darkBodyText]}>最初のタスクを追加しよう</Text><Text style={[styles.emptyCopy, isDark && styles.darkMutedText]}>忘れたくないことを、ここに置いておけます。</Text></View>
        </Pressable>
      ) : displayTasks.map((task) => { const chicPalette = getChicTaskPatternPalette(task.category); return (
        <Pressable key={task.id} style={[styles.taskCard, designMode === 'minimal' && styles.taskCardMinimal, designMode === 'dark' && styles.darkSurface, designMode === 'chic' && styles.taskCardChic, designMode === 'chic' && { backgroundColor: chicPalette.background }, task.done && designMode !== 'chic' && styles.taskCardDone, task.done && isDark && styles.taskCardDoneDark, task.done && designMode === 'chic' && styles.taskCardChicDone]} onPress={() => setActionTask(task)}>
          {designMode === 'chic' && !isCheckChicPattern(chicPattern) && <PatternDecor pattern={chicPattern} accent={chicPalette.accent} warm={chicPalette.warm} density="compact" />}
          <View style={[styles.taskCardInner, designMode === 'chic' && styles.taskCardInnerChic, task.done && designMode === 'chic' && styles.taskCardInnerChicDone]}>
          <Pressable style={[styles.check, isDark && styles.checkDark, task.done && styles.checkDone, task.done && isDark && styles.checkDoneDark, task.done && designMode === 'chic' && { backgroundColor: '#D986A1', borderColor: '#D986A1' }, selectionMode && selectedTaskIds.includes(task.id) && styles.selectionChecked, selectionMode && selectedTaskIds.includes(task.id) && isDark && styles.selectionCheckedDark]} onPress={() => selectionMode ? onToggleSelection(task.id) : onToggle(task.id)}>
            <Text style={styles.checkMark}>{selectionMode ? (selectedTaskIds.includes(task.id) ? '✓' : '') : (task.done ? completionIcon : '')}</Text>
          </Pressable>
          <Pressable style={styles.taskBody} onPress={() => setActionTask(task)}>
            <Text style={[styles.taskTitle, task.done && styles.taskTitleDone, isDark && styles.darkBodyText]}>{task.title}</Text>
            {task.navigationEnabled && !task.done && <View style={styles.inlineUrgency}><Text style={styles.inlineUrgencyText}>{getUrgencyStatus(task, now)}</Text><Text style={styles.inlineRisk}>{getLateRiskMessage(task, now)}</Text></View>}
            <View style={styles.taskInfoRow}>
              <View style={[styles.priorityPill, task.priority === '高' && styles.priorityHigh]}><Text style={[styles.priorityText, task.priority === '高' && styles.priorityHighText]}>{task.priority === '高' ? '！重要' : task.priority}</Text></View>
              <View style={[styles.categoryPill, { backgroundColor: categoryColors[task.category] }, designMode === 'chic' && styles.categoryPillChic, designMode === 'chic' && { borderColor: chicPalette.accent }]}><Text style={[styles.categoryText, designMode === 'chic' && { color: chicPalette.accent }]}>{task.category}</Text></View>
              {task.repeatRule && task.repeatRule !== 'none' && <View style={styles.routinePill}><Text style={styles.routinePillText}>↻ {repeatOptions.find((option) => option.id === task.repeatRule)?.label}</Text></View>}
              {task.scheduledDate && <Text style={[styles.taskMeta, isDark && styles.darkAccentText]}>▣ {task.scheduledDate.slice(5).replace('-', '/')}</Text>}
              {task.scheduledTime && <Text style={[styles.taskMeta, isDark && styles.darkAccentText]}>◷ 実行 {task.scheduledTime}</Text>}
              {task.remindAt && <Text style={[styles.taskMeta, isDark && styles.darkAccentText]}>◷ {task.remindDate?.slice(5).replace('-', '/')} {task.remindAt}</Text>}
              {task.remindAt && task.nudgeMode && task.nudgeMode !== 'once' && <View style={styles.nudgeBadge}><Text style={styles.nudgeBadgeText}>{task.nudgeMode === 'strong' ? '通知×3' : '通知×2'}</Text></View>}
              {task.deadlineDate && (() => { const status = deadlineLabel(task); return <Text style={[styles.deadlineMeta, status?.overdue && styles.deadlineOverdue]}>⌛ {task.deadlineDate.slice(5).replace('-', '/')} {task.deadlineTime ?? '23:59'} · {status?.text}</Text>; })()}
            </View>
          </Pressable>
          {!selectionMode && <Pressable style={styles.taskBucketButton} onPress={() => setBucketTask(task)}><Text style={styles.taskBucketButtonText}>{(task.bucket ?? 'now') === 'now' ? '今やる' : task.bucket === 'later' ? 'あとで' : '待ち'}⌄</Text></Pressable>}
          {!selectionMode && <Pressable style={styles.taskMoreButton} onPress={() => setActionTask(task)} hitSlop={8}><Text style={styles.taskMoreText}>•••</Text></Pressable>}
          </View>
        </Pressable>
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
          <View style={styles.taskActionCard}>
            <Text numberOfLines={1} style={styles.bucketModalTitle}>{actionTask?.title}</Text>
            <Text style={styles.taskActionHint}>タスクの操作</Text>
            <View style={styles.taskActionGrid}>
              <Pressable style={styles.taskActionOption} onPress={() => { if (actionTask) onEdit(actionTask); setActionTask(null); }}><Text style={styles.taskActionIcon}>✎</Text><Text style={styles.taskActionLabel}>編集</Text></Pressable>
              <Pressable style={styles.taskActionOption} onPress={() => { if (actionTask) onDuplicate(actionTask); setActionTask(null); }}><Text style={styles.taskActionIcon}>▣</Text><Text style={styles.taskActionLabel}>複製</Text></Pressable>
              <Pressable style={styles.taskActionOption} onPress={() => { if (actionTask) onPostpone(actionTask.id); setActionTask(null); }}><Text style={styles.taskActionIcon}>→</Text><Text style={styles.taskActionLabel}>明日へ</Text></Pressable>
              <Pressable style={[styles.taskActionOption, styles.taskActionDelete]} onPress={() => { if (actionTask) onDelete(actionTask.id); setActionTask(null); }}><Text style={[styles.taskActionIcon, styles.taskActionDeleteText]}>×</Text><Text style={[styles.taskActionLabel, styles.taskActionDeleteText]}>削除</Text></Pressable>
            </View>
            <Pressable style={styles.taskTemplateSaveAction} onPress={() => { if (actionTask) onSaveTemplate(actionTask); setActionTask(null); }}><View><Text style={styles.taskTemplateSaveTitle}>設定ごとひな型に保存</Text><Text style={styles.taskTemplateSaveCopy}>カテゴリ・通知・間に合うナビも再利用</Text></View><Text style={styles.taskTemplateSavePremium}>Premium</Text></Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
    </HomeRuntimeContext.Provider>
  );
}

function HomeToolCard({ designMode, chicPattern, kind, icon, title, meta, onPress }: { designMode: DesignMode; chicPattern: ChicPattern; kind: 'departure' | 'calendar' | 'focus' | 'wish'; icon: string; title: string; meta: string; onPress: () => void }) {
  const { styles, PatternDecor, helpers } = useHomeRuntime();
  const { isCheckChicPattern } = helpers;
  const palette = chicUtilityPalettes[kind];
  const isDark = designMode === 'dark';
  return <Pressable style={[styles.homeToolCard, designMode === 'minimal' && styles.homeToolCardMinimal, designMode === 'chic' && styles.homeToolCardChic, isDark && styles.darkSurface, designMode === 'chic' && { backgroundColor: palette.background }, ]} onPress={onPress}>
    {designMode === 'chic' && !isCheckChicPattern(chicPattern) && <PatternDecor pattern={chicPattern} accent={palette.accent} warm={palette.warm} density="compact" />}
    <View style={designMode === 'chic' ? styles.homeToolGlass : styles.homeToolPlain}><Text style={[styles.homeToolIcon, isDark && styles.darkAccentText, designMode === 'chic' && { color: palette.accent }]}>{icon}</Text><Text style={[styles.homeToolTitle, isDark && styles.darkBodyText]}>{title}</Text><Text numberOfLines={1} style={[styles.homeToolMeta, isDark && styles.darkMutedText]}>{meta}</Text></View>
  </Pressable>;
}

function VoiceQuickAddCard({ designMode, chicPattern, onQuickAdd }: { designMode: DesignMode; chicPattern: ChicPattern; onQuickAdd: (title: string, category: Category, priority: Priority, scheduledDate?: string, scheduledTime?: string, isRoutine?: boolean) => void }) {
  const { styles, PatternDecor, helpers } = useHomeRuntime();
  const { dateForReminder, dateKey, formatLiveTime, isCheckChicPattern, todayInputValue } = helpers;
  const isDark = designMode === 'dark';
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('その他');
  const [priority, setPriority] = useState<Priority>('中');
  const [scheduledDate, setScheduledDate] = useState(() => isDark ? '' : todayInputValue());
  const [scheduledTime, setScheduledTime] = useState('');
  const [isRoutine, setIsRoutine] = useState(false);
  const [fieldOpen, setFieldOpen] = useState<null | 'category' | 'priority'>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeDarkPicker, setActiveDarkPicker] = useState<null | 'date' | 'time'>(null);

  const submit = () => {
    const clean = title.trim();
    if (!clean) return;
    onQuickAdd(clean, category, priority, scheduledDate || undefined, scheduledTime || undefined, isRoutine);
    setTitle('');
    setCategory('その他');
    setPriority('中');
    setScheduledDate(isDark ? '' : todayInputValue());
    setScheduledTime('');
    setIsRoutine(false);
  };

  return (
    <View style={[styles.voiceAddCard, designMode === 'minimal' && styles.voiceAddCardMinimal, isDark && styles.voiceAddCardDark, designMode === 'chic' && styles.voiceAddCardChic]}>
      {designMode === 'chic' && !isCheckChicPattern(chicPattern) && <PatternDecor pattern={chicPattern} accent="#D986A1" warm="#A997C8" />}
      <View style={designMode === 'chic' ? styles.voiceAddPaperChic : styles.voiceAddPaperMinimal}>
        <View style={styles.voiceAddHeading}>
          <Text style={[styles.quickAddTitle, isDark && styles.darkBodyText]}>音声でひとつ追加</Text>
          <Text style={[styles.voiceAddHint, isDark && styles.darkMutedText]}>キーボードのマイクで話して、そのまま入力できます</Text>
        </View>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="話してそのまま追加"
          placeholderTextColor="#A29DAA"
          style={[styles.voiceAddInput, designMode === 'minimal' && styles.voiceAddInputMinimal, isDark && styles.voiceAddInputDark, designMode === 'chic' && styles.voiceAddInputChic]}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <View style={styles.voiceAddChoicesRow}>
          <Pressable style={[styles.voiceAddChoice, designMode === 'minimal' && styles.voiceAddChoiceMinimal, isDark && styles.voiceAddChoiceDark, designMode === 'chic' && styles.voiceAddChoiceChic]} onPress={() => setFieldOpen('category')}>
            <Text style={[styles.voiceAddChoiceLabel, isDark && styles.voiceAddChoiceLabelDark]}>ジャンル</Text>
            <Text numberOfLines={1} style={[styles.voiceAddChoiceValue, isDark && styles.voiceAddChoiceValueDark]}>{category}</Text>
          </Pressable>
          <Pressable style={[styles.voiceAddChoice, designMode === 'minimal' && styles.voiceAddChoiceMinimal, isDark && styles.voiceAddChoiceDark, designMode === 'chic' && styles.voiceAddChoiceChic]} onPress={() => setFieldOpen('priority')}>
            <Text style={[styles.voiceAddChoiceLabel, isDark && styles.voiceAddChoiceLabelDark]}>優先度</Text>
            <Text numberOfLines={1} style={[styles.voiceAddChoiceValue, isDark && styles.voiceAddChoiceValueDark]}>{priority}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={[styles.voiceAddChoice, designMode === 'minimal' && styles.voiceAddChoiceMinimal, isDark && styles.voiceAddChoiceDark, designMode === 'chic' && styles.voiceAddChoiceChic]} onPress={() => isDark ? setActiveDarkPicker('date') : setShowDatePicker(true)}>
            <Text style={[styles.voiceAddChoiceLabel, isDark && styles.voiceAddChoiceLabelDark]}>実行日</Text>
            <Text numberOfLines={1} style={[styles.voiceAddChoiceValue, isDark && styles.voiceAddChoiceValueDark]}>{scheduledDate || '指定なし'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={[styles.voiceAddChoice, designMode === 'minimal' && styles.voiceAddChoiceMinimal, isDark && styles.voiceAddChoiceDark, designMode === 'chic' && styles.voiceAddChoiceChic]} onPress={() => isDark ? setActiveDarkPicker('time') : setShowTimePicker(true)}><Text style={[styles.voiceAddChoiceLabel, isDark && styles.voiceAddChoiceLabelDark]}>実行時間</Text><Text numberOfLines={1} style={[styles.voiceAddChoiceValue, isDark && styles.voiceAddChoiceValueDark]}>{scheduledTime || '指定なし'}</Text></Pressable>
        </View>
        <Pressable style={styles.routineToggleRow} onPress={() => setIsRoutine((value) => !value)}><View style={[styles.routineToggleBox, isRoutine && styles.routineToggleBoxActive, isRoutine && designMode === 'minimal' && styles.routineToggleBoxActiveMinimal, isRoutine && isDark && styles.routineToggleBoxActiveDark]}><Text style={styles.routineToggleCheck}>{isRoutine ? '✓' : ''}</Text></View><View><Text style={[styles.routineToggleTitle, isDark && styles.routineToggleTitleDark]}>ルーティンにする</Text><Text style={[styles.routineToggleCopy, isDark && styles.routineToggleCopyDark]}>毎日の継続状況を分析に表示</Text></View></Pressable>
        <Pressable style={[styles.voiceAddRegister, designMode === 'minimal' && styles.voiceAddRegisterMinimal, isDark && styles.voiceAddRegisterDark, designMode === 'chic' && styles.voiceAddRegisterChic]} onPress={submit}>
          <Text style={styles.voiceAddRegisterText}>登録</Text>
        </Pressable>
      </View>

      {fieldOpen && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setFieldOpen(null)}>
          <Pressable style={styles.bucketModalBackdrop} onPress={() => setFieldOpen(null)}>
            <View style={styles.bucketModalCard}>
              <Text style={styles.bucketModalTitle}>{fieldOpen === 'category' ? 'ジャンル' : '優先度'}</Text>
              {(fieldOpen === 'category' ? categories : priorities).map((item) => (
                <Pressable
                  key={item}
                  style={styles.voiceChoiceOption}
                  onPress={() => {
                    if (fieldOpen === 'category') setCategory(item as Category);
                    else setPriority(item as Priority);
                    setFieldOpen(null);
                  }}
                >
                  <Text style={styles.voiceChoiceOptionText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      )}

      {!isDark && showDatePicker && (
        <DateTimePicker
          value={dateForReminder(scheduledDate || todayInputValue(), '12:00')}
          mode="date"
          minimumDate={new Date()}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event: DateTimePickerEvent, selected) => {
            if (Platform.OS !== 'ios') setShowDatePicker(false);
            if (event.type === 'set' && selected) setScheduledDate(dateKey(selected));
          }}
        />
      )}
      {!isDark && showTimePicker && <DateTimePicker value={dateForReminder(scheduledDate || todayInputValue(), scheduledTime || '09:00')} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowTimePicker(false); if (event.type === 'set' && selected) { setScheduledTime(formatLiveTime(selected)); setShowTimePicker(false); } }} />}
      {isDark && activeDarkPicker === 'date' && <TaskDateTimePickerSheet visible mode="date" title="実行日を選択" value={dateForReminder(scheduledDate || todayInputValue(), '12:00')} minimumDate={new Date()} designMode={designMode} onClose={() => setActiveDarkPicker(null)} onConfirm={(selected) => setScheduledDate(dateKey(selected))} />}
      {isDark && activeDarkPicker === 'time' && <TaskDateTimePickerSheet visible mode="time" title="実行時間を選択" value={dateForReminder(scheduledDate || todayInputValue(), scheduledTime || '09:00')} designMode={designMode} onClose={() => setActiveDarkPicker(null)} onConfirm={(selected) => setScheduledTime(formatLiveTime(selected))} />}
    </View>
  );
}
