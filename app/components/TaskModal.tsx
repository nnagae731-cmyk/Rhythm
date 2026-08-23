import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { ChicThemePalette, DesignMode } from '../theme';
import { Category, NudgeMode, Priority, RepeatRule, Subtask, Task, TaskListItem } from '../types';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { PremiumTaskTemplate } from '../taskTemplates';
import { categories, priorities, repeatOptions } from '../features/tasks/taskUtils';
import { parseSmartTaskInput, SmartTaskParseResult } from '../features/tasks/smartTaskInput';
export function TaskModal({ visible, task, templates, savedTemplates, designMode, chicPalette, planTier, onPremium, onClose, onOpenBulkAdd, onSave, readOnlyPreview = false, styles, helpers, components }: { visible: boolean; task?: Task; templates: string[]; savedTemplates: PremiumTaskTemplate[]; designMode: DesignMode; chicPalette?: ChicThemePalette; planTier: PlanTier; onPremium: (featureId?: PremiumGuideFeatureId) => void; onClose: () => void; onOpenBulkAdd?: () => void; onSave: (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule?: RepeatRule, nudgeMode?: NudgeMode, scheduledDate?: string, scheduledTime?: string, endAt?: string, isRoutine?: boolean, subtasks?: Subtask[], listItems?: TaskListItem[]) => void; readOnlyPreview?: boolean; styles: any; helpers: any; components: any }) {
  const { getThemeTokens, todayInputValue, hasPremiumAccess, dateForReminder, dateKey, formatLiveTime, colors, summarizePremiumTaskTemplate } = helpers;
  const { CompactNumberSetting } = components;
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  const isChic = designMode === 'chic' && !!chicPalette;
  const [title, setTitle] = useState('');
  const [remind, setRemind] = useState(false);
  const [time, setTime] = useState('09:00');
  const [remindDate, setRemindDate] = useState(todayInputValue());
  const [category, setCategory] = useState<Category>('その他');
  const [priority, setPriority] = useState<Priority>('中');
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState(todayInputValue());
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [deadlineNotify, setDeadlineNotify] = useState(true);
  const [deadlineNotifyBefore, setDeadlineNotifyBefore] = useState(30);
  const [showDeadlineDatePicker, setShowDeadlineDatePicker] = useState(false);
  const [showDeadlineTimePicker, setShowDeadlineTimePicker] = useState(false);
  const [navigationEnabled, setNavigationEnabled] = useState(false);
  const [preparationMinutes, setPreparationMinutes] = useState(30);
  const [travelMinutes, setTravelMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(10);
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('none');
  const [nudgeMode, setNudgeMode] = useState<NudgeMode>('once');
  const [scheduledDate, setScheduledDate] = useState(todayInputValue());
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');
  const [isRoutine, setIsRoutine] = useState(false);
  const [showScheduledDatePicker, setShowScheduledDatePicker] = useState(false);
  const [showScheduledTimePicker, setShowScheduledTimePicker] = useState(false);
  const [smartResult, setSmartResult] = useState<SmartTaskParseResult>({ title: '', matched: [] });
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [listItems, setListItems] = useState<TaskListItem[]>([]);
  const [listEditorOpen, setListEditorOpen] = useState(false);
  const [newListItem, setNewListItem] = useState('');
  const titleInputRef = useRef<TextInput>(null);
  const saveGuardRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    saveGuardRef.current = false;
    setTitle(task?.title ?? '');
    setRemind(Boolean(task?.remindAt));
    setTime(task?.remindAt ?? '09:00');
    setRemindDate(task?.remindDate ?? todayInputValue());
    setCategory(task?.category ?? 'その他');
    setPriority(task?.priority ?? '中');
    setHasDeadline(Boolean(task?.deadlineDate));
    setDeadlineDate(task?.deadlineDate ?? todayInputValue());
    setDeadlineTime(task?.deadlineTime ?? '23:59');
    setDeadlineNotify(task?.deadlineNotifyBefore !== undefined || !task);
    setDeadlineNotifyBefore(task?.deadlineNotifyBefore ?? 30);
    setShowDeadlineDatePicker(false);
    setShowDeadlineTimePicker(false);
    setNavigationEnabled(task?.navigationEnabled ?? false);
    setPreparationMinutes(task?.preparationMinutes ?? 30);
    setTravelMinutes(task?.travelMinutes ?? 30);
    setBufferMinutes(task?.bufferMinutes ?? 10);
    setRepeatRule(task?.repeatRule ?? 'none');
    setNudgeMode(task?.nudgeMode ?? 'once');
    setScheduledDate(task?.scheduledDate ?? todayInputValue());
    setScheduledTime(task?.scheduledTime ?? '');
    setScheduledEndTime(task?.endAt ?? '');
    setIsRoutine(task?.isRoutine ?? false);
    setSubtasks((task?.subtasks ?? []).map((item, index) => ({ ...item, order: item.order ?? index })));
    setListItems((task?.listItems ?? []).map((item, index) => ({ ...item, text: item.text ?? '', checked: Boolean(item.checked), order: item.order ?? index })).filter((item) => item.text.trim()));
    setListEditorOpen(false);
    setNewListItem('');
    setNewSubtask('');
    setSmartResult({ title: task?.title ?? '', matched: [] });
    setShowScheduledDatePicker(false);
    setShowScheduledTimePicker(false);
    const focusTimer = setTimeout(() => { if (!readOnlyPreview) titleInputRef.current?.focus(); }, 120);
    return () => clearTimeout(focusTimer);
  }, [readOnlyPreview, visible, task]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setSmartResult(parseSmartTaskInput(title, new Date(), dateKey)), 120);
    return () => clearTimeout(timer);
  }, [dateKey, title, visible]);

  const updateTitle = (value: string) => {
    setTitle(value);
  };

  const save = () => {
    if (saveGuardRef.current) return;
    const clean = title.trim();
    if (!clean) {
      Alert.alert('タスクを入力してください');
      return;
    }
    // Parse once on submit so quick templates and pasted text are always
    // reflected, while the input path itself remains debounced.
    const parsed = parseSmartTaskInput(title, new Date(), dateKey);
    const startForRange = parsed.scheduledTime ?? scheduledTime;
    const endForRange = parsed.endTime ?? scheduledEndTime;
    if (startForRange && endForRange && /^\d{2}:\d{2}$/.test(endForRange) && endForRange <= startForRange) {
      Alert.alert('終了時間を確認してください', '終了時間は開始時間より後にしてください。');
      return;
    }
    if (parsed.scheduledDate && parsed.scheduledTime && dateForReminder(parsed.scheduledDate, parsed.scheduledTime).getTime() <= Date.now()) {
      Alert.alert('日時を確認してください', '指定した日時が過去になっています。保存しますか？', [{ text: '修正する', style: 'cancel' }, { text: '保存する', onPress: () => saveTask(parsed) }]);
      return;
    }
    saveGuardRef.current = true;
    const parsedReminder = parsed.remindAt ? true : remind;
    onSave(parsed.title || clean, category, priority, parsedReminder ? parsed.remindDate ?? remindDate : undefined, parsedReminder ? parsed.remindAt ?? time : undefined, hasDeadline ? deadlineDate : undefined, hasDeadline ? deadlineTime : undefined, hasDeadline && deadlineNotify ? deadlineNotifyBefore : undefined, hasDeadline && navigationEnabled, preparationMinutes, travelMinutes, bufferMinutes, parsed.repeatRule ?? repeatRule, nudgeMode, parsed.scheduledDate ?? scheduledDate, parsed.scheduledTime ?? (scheduledTime || undefined), parsed.endTime ?? (scheduledEndTime || undefined), isRoutine, subtasks.filter((item) => item.title.trim()).map((item, index) => ({ ...item, title: item.title.trim(), order: index })), listItems.filter((item) => item.text.trim()).map((item, index) => ({ ...item, text: item.text.trim(), order: index })));
    requestAnimationFrame(() => { saveGuardRef.current = false; });
  };

  const saveTask = (parsed: SmartTaskParseResult) => {
    const clean = title.trim();
    onSave(parsed.title || clean, category, priority, parsed.remindAt ? parsed.remindDate ?? remindDate : remind ? remindDate : undefined, parsed.remindAt ? parsed.remindAt : remind ? time : undefined, hasDeadline ? deadlineDate : undefined, hasDeadline ? deadlineTime : undefined, hasDeadline && deadlineNotify ? deadlineNotifyBefore : undefined, hasDeadline && navigationEnabled, preparationMinutes, travelMinutes, bufferMinutes, parsed.repeatRule ?? repeatRule, nudgeMode, parsed.scheduledDate ?? scheduledDate, parsed.scheduledTime ?? (scheduledTime || undefined), parsed.endTime ?? (scheduledEndTime || undefined), isRoutine, subtasks.filter((item) => item.title.trim()).map((item, index) => ({ ...item, title: item.title.trim(), order: index })), listItems.filter((item) => item.text.trim()).map((item, index) => ({ ...item, text: item.text.trim(), order: index })));
  };

  const addSubtask = () => {
    const clean = newSubtask.trim();
    if (!clean) return;
    setSubtasks((current) => [...current, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title: clean, done: false, order: current.length }]);
    setNewSubtask('');
  };
  const moveSubtask = (index: number, direction: -1 | 1) => setSubtasks((current) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) return current;
    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
    return next.map((item, itemIndex) => ({ ...item, order: itemIndex }));
  });
  const addListItem = () => {
    const text = newListItem.trim();
    if (!text) return;
    setListItems((current) => [...current, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text, checked: false, order: current.length }]);
    setNewListItem('');
  };

  const applySavedTemplate = (template: PremiumTaskTemplate) => {
    setTitle(template.title);
    setCategory(template.category);
    setPriority(template.priority);
    setRepeatRule(template.repeatRule);
    setRemind(Boolean(template.remindAt));
    setTime(template.remindAt ?? '09:00');
    setRemindDate(todayInputValue());
    setNudgeMode(template.nudgeMode);
    setNavigationEnabled(template.navigationEnabled);
    setPreparationMinutes(template.preparationMinutes ?? 30);
    setTravelMinutes(template.travelMinutes ?? 30);
    setBufferMinutes(template.bufferMinutes ?? 10);
    setScheduledDate(todayInputValue());
    setScheduledTime('');
    setIsRoutine(false);
    setHasDeadline(false);
    setDeadlineDate(todayInputValue());
    setDeadlineTime('23:59');
    setDeadlineNotify(false);
    setListItems((template.listItems ?? []).map((item, index) => ({
      id: `${Date.now()}-template-list-${index}-${Math.random().toString(16).slice(2)}`,
      text: item.text,
      checked: false,
      order: index,
    })));
  };

  const closeForm = () => {
    setShowScheduledDatePicker(false);
    setShowScheduledTimePicker(false);
    setShowDeadlineDatePicker(false);
    setShowDeadlineTimePicker(false);
    setHasDeadline(false);
    onClose();
  };

  const toggleScheduledDatePicker = () => {
    setShowScheduledTimePicker(false);
    setShowDeadlineDatePicker(false);
    setShowDeadlineTimePicker(false);
    setShowScheduledDatePicker((value) => !value);
  };

  const toggleScheduledTimePicker = () => {
    setShowScheduledDatePicker(false);
    setShowDeadlineDatePicker(false);
    setShowDeadlineTimePicker(false);
    setShowScheduledTimePicker((value) => !value);
  };

  const toggleDeadlineDatePicker = () => {
    setShowScheduledDatePicker(false);
    setShowScheduledTimePicker(false);
    setShowDeadlineTimePicker(false);
    setShowDeadlineDatePicker((value) => !value);
  };

  const toggleDeadlineTimePicker = () => {
    setShowScheduledDatePicker(false);
    setShowScheduledTimePicker(false);
    setShowDeadlineDatePicker(false);
    setShowDeadlineTimePicker((value) => !value);
  };

  const modalContent = (
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={8}>
      <Pressable style={styles.modalBackdrop} onPress={closeForm}>
        <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, borderRadius: theme.radius.modal }]} onPress={(event) => event.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.modalScroll, isDark && styles.taskModalScrollDark]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, designMode === 'dark' && styles.modalTitleDark]}>{task ? 'タスクを編集' : '新しいタスク'}</Text>
          {!task && onOpenBulkAdd && <Pressable style={{ alignSelf: 'flex-start', marginTop: 8, marginBottom: 2 }} onPress={() => { closeForm(); onOpenBulkAdd(); }}><Text style={{ color: isChic && chicPalette ? chicPalette.accent : theme.colors.primaryAccent, fontWeight: '700' }}>複数まとめて追加 ›</Text></Pressable>}
          {!task && templates.length > 0 && <><Text style={styles.templateGroupLabel}>クイックひな型</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.taskTemplates}>{templates.map((item) => <Pressable key={item} style={styles.taskTemplateChip} onPress={() => setTitle(item)}><Text style={styles.taskTemplateText}>＋ {item}</Text></Pressable>)}</ScrollView></>}
          {!task && (hasPremiumAccess(planTier, 'saved_task_templates') ? <View style={styles.savedTemplatePicker}><Text style={styles.templateGroupLabel}>マイひな型</Text>{savedTemplates.length === 0 ? <Text style={styles.savedTemplateEmpty}>タスクの「•••」から設定ごと保存できます。</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedTemplateChips}>{savedTemplates.map((template) => <Pressable key={template.id} style={styles.savedTemplateChip} onPress={() => applySavedTemplate(template)}><Text numberOfLines={1} style={styles.savedTemplateChipTitle}>{template.title}</Text><Text numberOfLines={2} style={styles.savedTemplateChipCopy}>{summarizePremiumTaskTemplate(template)}</Text><Text style={styles.savedTemplateChoose}>選ぶ ›</Text></Pressable>)}</ScrollView>}</View> : <Pressable style={styles.savedTemplateLocked} onPress={() => onPremium('templates')}><View style={{ flex: 1 }}><Text style={styles.savedTemplateLockedTitle}>マイひな型</Text><Text style={styles.savedTemplateLockedCopy}>一度作った設定を、次からそのまま使う</Text></View><Text style={styles.taskTemplateSavePremium}>Premium機能</Text></Pressable>)}
          <Text style={[styles.fieldLabel, designMode === 'dark' && styles.fieldLabelDark]}>やること・忘れたくないこと</Text>
          <View style={styles.voiceAddInputRow}>
          <TextInput
            ref={titleInputRef}
            value={title}
            onChangeText={updateTitle}
            placeholder="例：資料をバッグに入れる"
            placeholderTextColor={designMode === 'dark' ? '#9CA8BC' : '#69758A'}
            style={[styles.modalInput, designMode === 'dark' && styles.darkInput]}
            selectionColor={isChic && chicPalette ? chicPalette.accent : colors.violet}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="音声入力"
            style={[styles.voiceAddMicButton, isDark && styles.voiceAddMicButtonDark]}
            onPress={() => titleInputRef.current?.focus()}
          >
            <Text style={styles.voiceAddMicText}>🎙</Text>
          </Pressable>
          </View>
          <Text style={[styles.voiceAddHint, isDark && styles.darkMutedText]}>マイクで話した内容も日時・通知・繰り返しを解析します</Text>
          {smartResult.matched.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}><Text style={[styles.fieldLabel, designMode === 'dark' && styles.fieldLabelDark]}>解析結果</Text>{smartResult.scheduledDate && <Pressable style={styles.taskTemplateChip} onPress={() => { setScheduledDate(''); setSmartResult((current) => ({ ...current, scheduledDate: undefined })); }}><Text style={styles.taskTemplateText}>日付 {smartResult.scheduledDate} ×</Text></Pressable>}{smartResult.scheduledTime && <Pressable style={styles.taskTemplateChip} onPress={() => { setScheduledTime(''); setSmartResult((current) => ({ ...current, scheduledTime: undefined })); }}><Text style={styles.taskTemplateText}>時刻 {smartResult.scheduledTime} ×</Text></Pressable>}{smartResult.endTime && <Pressable style={styles.taskTemplateChip} onPress={() => { setScheduledEndTime(''); setSmartResult((current) => ({ ...current, endTime: undefined })); }}><Text style={styles.taskTemplateText}>終了 {smartResult.endTime} ×</Text></Pressable>}{smartResult.remindAt && <Pressable style={styles.taskTemplateChip} onPress={() => setSmartResult((current) => ({ ...current, remindAt: undefined, remindDate: undefined }))}><Text style={styles.taskTemplateText}>通知 {smartResult.remindDate} {smartResult.remindAt} ×</Text></Pressable>}{smartResult.repeatRule && <Pressable style={styles.taskTemplateChip} onPress={() => setSmartResult((current) => ({ ...current, repeatRule: undefined }))}><Text style={styles.taskTemplateText}>繰り返し {smartResult.repeatRule} ×</Text></Pressable>}</View>}
          <Text style={[styles.fieldLabel, { marginTop: 18 }, designMode === 'dark' && styles.fieldLabelDark]}>ジャンル</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChoices}>
            {categories.map((item) => (
              <Pressable key={item} style={[styles.categoryChoice, { backgroundColor: theme.colors.secondarySurface }, category === item && styles.categoryChoiceActive, category === item && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.primaryAccent }]} onPress={() => setCategory(item)}>
                <Text style={[styles.categoryChoiceText, designMode === 'dark' && styles.categoryChoiceTextDark]}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={[styles.fieldLabel, { marginTop: 17 }, designMode === 'dark' && styles.fieldLabelDark]}>優先度</Text>
          <View style={styles.priorityChoices}>
            {priorities.map((item) => (
              <Pressable key={item} style={[styles.priorityChoice, designMode === 'dark' && styles.priorityChoiceDark, { backgroundColor: designMode === 'dark' ? undefined : theme.colors.secondarySurface }, priority === item && styles.priorityChoiceActive, priority === item && designMode === 'dark' && styles.priorityChoiceActiveDark, priority === item && designMode !== 'dark' && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.primaryAccent }]} onPress={() => setPriority(item)}>
                <Text style={[styles.priorityChoiceText, designMode === 'dark' && styles.priorityChoiceTextDark, priority === item && styles.priorityChoiceTextActive, priority === item && designMode === 'dark' && styles.priorityChoiceTextActiveDark]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.fieldLabel, { marginTop: 17 }, designMode === 'dark' && styles.fieldLabelDark]}>実行する日</Text>
          <View style={styles.taskDateQuickRow}>
            <Pressable style={[styles.taskDateQuick, designMode === 'dark' && styles.quickDateButtonDark]} onPress={() => setScheduledDate(todayInputValue())}><Text style={[styles.taskDateQuickText, designMode === 'dark' && styles.quickDateTextDark]}>今日</Text></Pressable>
            <Pressable style={[styles.taskDateQuick, designMode === 'dark' && styles.quickDateButtonDark]} onPress={() => setScheduledDate(todayInputValue(1))}><Text style={[styles.taskDateQuickText, designMode === 'dark' && styles.quickDateTextDark]}>明日</Text></Pressable>
            <Pressable style={[styles.taskDatePickerButton, isDark && styles.pickerButtonDark]} onPress={toggleScheduledDatePicker}><Text style={[styles.taskDatePickerText, isDark && styles.pickerButtonTextDark]}>▣ {scheduledDate}</Text></Pressable>
          </View>
          {showScheduledDatePicker && <DateTimePicker value={dateForReminder(scheduledDate, '12:00')} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'inline' : 'default'} themeVariant={isDark ? 'dark' : undefined} textColor={isDark ? '#F4F7FC' : undefined} accentColor={isDark ? '#8EA6FF' : undefined} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowScheduledDatePicker(false); if (event.type === 'set' && selected) setScheduledDate(dateKey(selected)); }} />}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}><View style={{ flex: 1 }}><Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>実行する時間（任意）</Text><Text style={[styles.switchCopy, isDark && styles.switchCopyDark]}>指定したタスクだけスケジュールに表示</Text></View><Pressable style={[styles.taskDatePickerButton, { minWidth: 108 }, isDark && styles.pickerButtonDark]} onPress={toggleScheduledTimePicker}><Text style={[styles.taskDatePickerText, isDark && styles.pickerButtonTextDark]}>{scheduledTime || '開始時間'}</Text></Pressable><TextInput value={scheduledEndTime} onChangeText={setScheduledEndTime} placeholder="終了時間" placeholderTextColor={isDark ? '#8F9BB0' : '#A29DAA'} keyboardType="numbers-and-punctuation" style={[styles.taskDatePickerButton, { minWidth: 92, paddingHorizontal: 10, color: isDark ? '#F4F7FC' : theme.colors.primaryText }, isDark && styles.pickerButtonDark]} /></View>
          {showScheduledTimePicker && <DateTimePicker value={dateForReminder(scheduledDate, scheduledTime || '09:00')} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} themeVariant={isDark ? 'dark' : undefined} textColor={isDark ? '#F4F7FC' : undefined} accentColor={isDark ? '#8EA6FF' : undefined} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowScheduledTimePicker(false); if (event.type === 'set' && selected) { setScheduledTime(formatLiveTime(selected)); setShowScheduledTimePicker(false); } }} />}
          <Text style={[styles.fieldLabel, { marginTop: 17 }, designMode === 'dark' && styles.fieldLabelDark]}>繰り返し・ルーティン</Text>
          <View style={styles.repeatChoices}>
            {repeatOptions.map((option) => <Pressable key={option.id} style={[styles.repeatChoice, designMode === 'dark' && styles.repeatChoiceDark, { backgroundColor: designMode === 'dark' ? undefined : theme.colors.secondarySurface }, repeatRule === option.id && styles.repeatChoiceActive, repeatRule === option.id && designMode === 'dark' && styles.repeatChoiceActiveDark, repeatRule === option.id && designMode !== 'dark' && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.primaryAccent }]} onPress={() => setRepeatRule(option.id)}><Text style={[styles.repeatChoiceText, designMode === 'dark' && styles.repeatChoiceTextDark, repeatRule === option.id && styles.repeatChoiceTextActive, repeatRule === option.id && designMode === 'dark' && styles.repeatChoiceTextActiveDark]}>{option.label}</Text></Pressable>)}
          </View>
          <Pressable style={styles.routineToggleRow} onPress={() => setIsRoutine((value) => !value)}><View style={[styles.routineToggleBox, isRoutine && styles.routineToggleBoxActive]}><Text style={styles.routineToggleCheck}>{isRoutine ? '✓' : ''}</Text></View><View><Text style={[styles.routineToggleTitle, designMode === 'dark' && styles.routineToggleTitleDark]}>ルーティンにする</Text><Text style={[styles.routineToggleCopy, designMode === 'dark' && styles.routineToggleCopyDark]}>継続率と連続日数を分析に表示</Text></View></Pressable>
          <View style={{ marginTop: 14 }}><Text style={[styles.fieldLabel, designMode === 'dark' && styles.fieldLabelDark]}>サブタスク</Text>{subtasks.map((item, index) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}><TextInput value={item.title} onChangeText={(value) => setSubtasks((current) => current.map((entry) => entry.id === item.id ? { ...entry, title: value } : entry))} style={[styles.modalInput, { flex: 1, minHeight: 42 }]} placeholder="サブタスク" /><Pressable onPress={() => moveSubtask(index, -1)}><Text>↑</Text></Pressable><Pressable onPress={() => moveSubtask(index, 1)}><Text>↓</Text></Pressable><Pressable onPress={() => setSubtasks((current) => current.filter((entry) => entry.id !== item.id))}><Text style={styles.taskActionDeleteText}>削除</Text></Pressable></View>)}<View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><TextInput value={newSubtask} onChangeText={setNewSubtask} onSubmitEditing={addSubtask} placeholder="サブタスクを追加" style={[styles.modalInput, { flex: 1, minHeight: 42 }]} /><Pressable style={styles.taskTemplateSaveAction} onPress={addSubtask}><Text style={styles.taskTemplateSaveTitle}>追加</Text></Pressable></View></View>
          <Pressable style={{ marginTop: 14, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: isChic && chicPalette ? chicPalette.border : theme.colors.border, backgroundColor: isChic && chicPalette ? chicPalette.cardTint : theme.colors.secondarySurface }} onPress={() => setListEditorOpen(true)}><Text style={[styles.fieldLabel, designMode === 'dark' && styles.fieldLabelDark]}>リスト {listItems.length}件　編集 ›</Text></Pressable>
          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.switchTitle, designMode === 'dark' && styles.switchTitleDark]}>追加リマインド</Text>
              <Text style={[styles.switchCopy, isDark && styles.switchCopyDark]}>期限とは別の日時にも通知します</Text>
            </View>
            <Switch value={remind} onValueChange={setRemind} trackColor={{ true: isChic && chicPalette ? chicPalette.accent : colors.violet }} />
          </View>
          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.switchTitle, designMode === 'dark' && styles.switchTitleDark]}>期限を設定</Text>
              <Text style={[styles.switchCopy, isDark && styles.switchCopyDark]}>残り時間と期限超過を表示します</Text>
            </View>
            <Switch value={hasDeadline} onValueChange={setHasDeadline} trackColor={{ true: isChic && chicPalette ? chicPalette.accent : isDark ? '#8EA6FF' : colors.coral }} />
          </View>
          {hasDeadline && (
            <View style={[styles.deadlinePanel, isDark && styles.deadlinePanelDark]}>
              <View style={styles.quickDates}>
                <Pressable style={[styles.quickDeadlineButton, isDark && styles.quickDeadlineButtonDark]} onPress={() => setDeadlineDate(todayInputValue())}><Text style={[styles.quickDeadlineText, isDark && styles.quickDeadlineTextDark]}>今日まで</Text></Pressable>
                <Pressable style={[styles.quickDeadlineButton, isDark && styles.quickDeadlineButtonDark]} onPress={() => setDeadlineDate(todayInputValue(1))}><Text style={[styles.quickDeadlineText, isDark && styles.quickDeadlineTextDark]}>明日まで</Text></Pressable>
                <Pressable style={[styles.quickDeadlineButton, isDark && styles.quickDeadlineButtonDark]} onPress={() => setDeadlineDate(todayInputValue(7))}><Text style={[styles.quickDeadlineText, isDark && styles.quickDeadlineTextDark]}>1週間後</Text></Pressable>
              </View>
              <View style={[styles.remindTimeRow, isDark && styles.taskDateTimeRowDark]}>
                <Text style={[styles.numberLabel, isDark && styles.numberLabelDark]}>期限日</Text>
                <Pressable style={[styles.pickerButton, isDark && styles.pickerButtonDark]} onPress={toggleDeadlineDatePicker}><Text style={[styles.pickerButtonText, isDark && styles.pickerButtonTextDark]}>▣ {deadlineDate}</Text></Pressable>
              </View>
              {showDeadlineDatePicker && <DateTimePicker value={dateForReminder(deadlineDate, deadlineTime)} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'inline' : 'default'} themeVariant={isDark ? 'dark' : undefined} textColor={isDark ? '#F4F7FC' : undefined} accentColor={isDark ? '#8EA6FF' : undefined} onChange={(event: DateTimePickerEvent, selected) => {
                if (Platform.OS !== 'ios') setShowDeadlineDatePicker(false);
                if (event.type === 'set' && selected) setDeadlineDate(dateKey(selected));
              }} />}
              <View style={[styles.remindTimeRow, isDark && styles.taskDateTimeRowDark]}>
                <Text style={[styles.numberLabel, isDark && styles.numberLabelDark]}>リミット時刻</Text>
                <Pressable style={[styles.pickerButton, isDark && styles.pickerButtonDark]} onPress={toggleDeadlineTimePicker}><Text style={[styles.pickerButtonText, isDark ? styles.pickerButtonTextDark : isChic && chicPalette ? { color: chicPalette.accentStrong } : { color: colors.coral }]}>◷ {deadlineTime}</Text></Pressable>
              </View>
              {showDeadlineTimePicker && <DateTimePicker value={dateForReminder(deadlineDate, deadlineTime)} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} themeVariant={isDark ? 'dark' : undefined} textColor={isDark ? '#F4F7FC' : undefined} accentColor={isDark ? '#8EA6FF' : undefined} onChange={(event: DateTimePickerEvent, selected) => {
                if (Platform.OS !== 'ios') setShowDeadlineTimePicker(false);
                if (event.type === 'set' && selected) setDeadlineTime(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
              }} />}
              <View style={[styles.deadlineNotifyRow, isDark && styles.deadlineNotifyRowDark]}>
                <View><Text style={[styles.numberLabel, isDark && styles.numberLabelDark]}>期限前に通知</Text><Text style={[styles.switchCopy, isDark && styles.switchCopyDark]}>期限の設定と連動します</Text></View>
                <Switch value={deadlineNotify} onValueChange={setDeadlineNotify} trackColor={{ true: isChic && chicPalette ? chicPalette.accent : isDark ? '#8EA6FF' : colors.coral }} />
              </View>
              {deadlineNotify && <View style={styles.notifyChoices}>
                {[0, 10, 30, 60, 1440].map((minutes) => (
                  <Pressable key={minutes} style={[styles.notifyChoice, isDark && styles.notifyChoiceDark, deadlineNotifyBefore === minutes && styles.notifyChoiceActive, deadlineNotifyBefore === minutes && isDark && styles.notifyChoiceActiveDark]} onPress={() => setDeadlineNotifyBefore(minutes)}>
                    <Text style={[styles.notifyChoiceText, isDark && styles.notifyChoiceTextDark, deadlineNotifyBefore === minutes && styles.notifyChoiceTextActive, deadlineNotifyBefore === minutes && isDark && styles.notifyChoiceTextActiveDark]}>{minutes === 0 ? '時刻通り' : minutes === 1440 ? '1日前' : minutes >= 60 ? `${minutes / 60}時間前` : `${minutes}分前`}</Text>
                  </Pressable>
                ))}
              </View>}
              <View style={[styles.deadlineNotifyRow, isDark && styles.deadlineNotifyRowDark]}>
                <View><Text style={[styles.numberLabel, isDark && styles.darkAccentText]}>間に合うナビ</Text><Text style={[styles.switchCopy, isDark && styles.switchCopyDark]}>準備・移動時間から危険度を判定</Text></View>
                <Switch value={navigationEnabled} onValueChange={setNavigationEnabled} trackColor={{ true: isChic && chicPalette ? chicPalette.accent : colors.violet }} />
              </View>
              {navigationEnabled && <View style={[styles.navigationDurations, isDark && styles.navigationDurationsDark]}>
                <CompactNumberSetting label="準備" value={preparationMinutes} onChange={setPreparationMinutes} isDark={isDark} />
                <CompactNumberSetting label="移動" value={travelMinutes} onChange={setTravelMinutes} isDark={isDark} />
                <CompactNumberSetting label="余裕" value={bufferMinutes} onChange={setBufferMinutes} isDark={isDark} />
              </View>}
            </View>
          )}
          {remind && (
            <View style={styles.reminderPanel}>
              <View style={styles.quickDates}>
                <Pressable style={styles.quickDateButton} onPress={() => setRemindDate(todayInputValue())}><Text style={styles.quickDateText}>今日</Text></Pressable>
                <Pressable style={styles.quickDateButton} onPress={() => setRemindDate(todayInputValue(1))}><Text style={styles.quickDateText}>明日</Text></Pressable>
              </View>
              <View style={styles.remindTimeRow}>
                <View><Text style={[styles.numberLabel, designMode === 'dark' && styles.numberLabelDark]}>日付</Text><Text style={[styles.inputHint, designMode === 'dark' && styles.inputHintDark]}>YYYY-MM-DD</Text></View>
                <TextInput style={styles.remindDateInput} value={remindDate} onChangeText={setRemindDate} maxLength={10} keyboardType="numbers-and-punctuation" selectionColor={isChic && chicPalette ? chicPalette.accent : colors.violet} />
              </View>
              <View style={styles.remindTimeRow}>
                <Text style={[styles.numberLabel, isDark && styles.numberLabelDark]}>時刻</Text>
                <TextInput style={styles.remindTimeInput} value={time} onChangeText={setTime} maxLength={5} keyboardType="numbers-and-punctuation" selectionColor={isChic && chicPalette ? chicPalette.accent : colors.violet} />
              </View>
              <Text style={[styles.numberLabel, { marginTop: 13, marginBottom: 8 }, designMode === 'dark' && styles.numberLabelDark]}>通知スルー防止</Text>
              <View style={styles.nudgeChoices}>
                {([{ id: 'once', label: '1回', copy: '通常' }, { id: 'repeat', label: '2回', copy: 'Premium' }, { id: 'strong', label: '3回', copy: 'Premium' }] as { id: NudgeMode; label: string; copy: string }[]).map((item) => { const locked = item.id !== 'once' && !hasPremiumAccess(planTier, item.id === 'repeat' ? 'repeat_nudge' : 'strong_nudge'); return <Pressable key={item.id} style={[styles.nudgeChoice, designMode === 'dark' && styles.nudgeChoiceDark, nudgeMode === item.id && styles.nudgeChoiceActive, nudgeMode === item.id && designMode === 'dark' && styles.nudgeChoiceActiveDark]} onPress={() => locked ? onPremium('nudge') : setNudgeMode(item.id)}><Text style={[styles.nudgeChoiceTitle, designMode === 'dark' && styles.nudgeChoiceTitleDark, nudgeMode === item.id && styles.nudgeChoiceTitleActive, nudgeMode === item.id && designMode === 'dark' && styles.nudgeChoiceTitleActiveDark]}>{item.label}{locked ? ' 🔒' : ''}</Text><Text style={[styles.nudgeChoiceCopy, designMode === 'dark' && styles.nudgeChoiceCopyDark, nudgeMode === item.id && styles.nudgeChoiceCopyActive, nudgeMode === item.id && designMode === 'dark' && styles.nudgeChoiceCopyActiveDark]}>{item.copy}</Text></Pressable>; })}
              </View>
            </View>
          )}
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryAccent, borderRadius: theme.radius.button }]} onPress={save}><Text style={styles.primaryButtonText}>{task ? '変更を保存' : '登録する'}</Text></Pressable>
          <Pressable onPress={closeForm}><Text style={styles.cancelText}>キャンセル</Text></Pressable>
          </ScrollView>
          {listEditorOpen && <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, maxHeight: '82%', borderRadius: 18, padding: 16, backgroundColor: theme.colors.screenBackground, borderWidth: 1, borderColor: isChic && chicPalette ? chicPalette.border : theme.colors.border }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={[styles.modalTitle, designMode === 'dark' && styles.modalTitleDark]}>リスト</Text><Pressable onPress={() => setListEditorOpen(false)}><Text style={{ color: isChic && chicPalette ? chicPalette.accent : theme.colors.primaryAccent, fontWeight: '700' }}>閉じる</Text></Pressable></View><ScrollView style={{ marginTop: 10 }} keyboardShouldPersistTaps="handled">{listItems.map((item, index) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}><Pressable onPress={() => setListItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, checked: !entry.checked } : entry))} style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: isChic && chicPalette ? chicPalette.accent : theme.colors.border, alignItems: 'center', justifyContent: 'center' }}><Text>{item.checked ? '✓' : ''}</Text></Pressable><TextInput value={item.text} onChangeText={(value) => setListItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, text: value } : entry))} style={[styles.modalInput, { flex: 1, minHeight: 40 }]} /><Pressable onPress={() => setListItems((current) => current.filter((entry) => entry.id !== item.id).map((entry, itemIndex) => ({ ...entry, order: itemIndex })))}><Text style={styles.taskActionDeleteText}>削除</Text></Pressable></View>)}<View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><TextInput value={newListItem} onChangeText={setNewListItem} onSubmitEditing={addListItem} placeholder="項目を追加" style={[styles.modalInput, { flex: 1, minHeight: 42 }]} /><Pressable style={styles.taskTemplateSaveAction} onPress={addListItem}><Text style={styles.taskTemplateSaveTitle}>追加</Text></Pressable></View></ScrollView></View>}
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
  );
  return readOnlyPreview ? <View style={{ width: '100%' }} pointerEvents="none">{modalContent}</View> : <Modal visible={visible} transparent animationType="slide" onRequestClose={closeForm}>{modalContent}</Modal>;
}
