import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { ChicThemePalette, DesignMode } from '../theme';
import { Category, NudgeMode, Priority, RepeatRule, Subtask, Task } from '../types';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { PremiumTaskTemplate } from '../taskTemplates';
import { categories, priorities, repeatOptions } from '../features/tasks/taskUtils';
import { parseSmartTaskInput, SmartTaskParseResult } from '../features/tasks/smartTaskInput';
export function TaskModal({ visible, task, templates, savedTemplates, designMode, chicPalette, planTier, onPremium, onClose, onOpenBulkAdd, onSave, readOnlyPreview = false, previewSection, styles, helpers, components }: { visible: boolean; task?: Task; templates: string[]; savedTemplates: PremiumTaskTemplate[]; designMode: DesignMode; chicPalette?: ChicThemePalette; planTier: PlanTier; onPremium: (featureId?: PremiumGuideFeatureId) => void; onClose: () => void; onOpenBulkAdd?: () => void; onSave: (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule?: RepeatRule, nudgeMode?: NudgeMode, scheduledDate?: string, scheduledTime?: string, endAt?: string, isRoutine?: boolean, subtasks?: Subtask[]) => void; readOnlyPreview?: boolean; previewSection?: 'savedTemplates'; styles: any; helpers: any; components: any }) {
  const { getThemeTokens, todayInputValue, hasPremiumAccess, dateForReminder, dateKey, formatLiveTime, summarizePremiumTaskTemplate } = helpers;
  const { CompactNumberSetting } = components;
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  const isChic = designMode === 'chic' && !!chicPalette;
  const taskAccent = isChic && chicPalette ? chicPalette.accent : theme.colors.primaryAccent;
  const taskBorder = isChic && chicPalette ? chicPalette.border : theme.colors.border;
  const taskTemplateSurface = isChic && chicPalette ? chicPalette.surfaceSubtle : theme.colors.secondarySurface;
  const taskTemplateText = isChic && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent;
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
  const scheduledDateLabel = scheduledDate ? String(Number(scheduledDate.slice(5, 7))) + '月' + String(Number(scheduledDate.slice(8, 10))) + '日' : '今日';
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');
  const [isRoutine, setIsRoutine] = useState(false);
  const [showScheduledDatePicker, setShowScheduledDatePicker] = useState(false);
  const [showScheduledTimePicker, setShowScheduledTimePicker] = useState(false);
  const [smartResult, setSmartResult] = useState<SmartTaskParseResult>({ title: '', matched: [] });
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [expandedSetting, setExpandedSetting] = useState<null | 'date' | 'category' | 'priority' | 'time' | 'repeat' | 'deadline' | 'reminder' | 'subtasks' | 'navigation'>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(task));
  const titleInputRef = useRef<TextInput>(null);
  const saveGuardRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    saveGuardRef.current = false;
    setDetailsOpen(Boolean(task));
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
    setNewSubtask('');
    setSmartResult({ title: task?.title ?? '', matched: [] });
    setShowScheduledDatePicker(false);
    setShowScheduledTimePicker(false);
    setExpandedSetting(null);
    setTemplatePickerOpen(false);
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
    onSave(parsed.title || clean, category, priority, parsedReminder ? parsed.remindDate ?? remindDate : undefined, parsedReminder ? parsed.remindAt ?? time : undefined, hasDeadline ? deadlineDate : undefined, hasDeadline ? deadlineTime : undefined, hasDeadline && deadlineNotify ? deadlineNotifyBefore : undefined, hasDeadline && navigationEnabled, preparationMinutes, travelMinutes, bufferMinutes, parsed.repeatRule ?? repeatRule, nudgeMode, parsed.scheduledDate ?? scheduledDate, parsed.scheduledTime ?? (scheduledTime || undefined), parsed.endTime ?? (scheduledEndTime || undefined), isRoutine, subtasks.filter((item) => item.title.trim()).map((item, index) => ({ ...item, title: item.title.trim(), order: index })));
    requestAnimationFrame(() => { saveGuardRef.current = false; });
  };

  const saveTask = (parsed: SmartTaskParseResult) => {
    const clean = title.trim();
    onSave(parsed.title || clean, category, priority, parsed.remindAt ? parsed.remindDate ?? remindDate : remind ? remindDate : undefined, parsed.remindAt ? parsed.remindAt : remind ? time : undefined, hasDeadline ? deadlineDate : undefined, hasDeadline ? deadlineTime : undefined, hasDeadline && deadlineNotify ? deadlineNotifyBefore : undefined, hasDeadline && navigationEnabled, preparationMinutes, travelMinutes, bufferMinutes, parsed.repeatRule ?? repeatRule, nudgeMode, parsed.scheduledDate ?? scheduledDate, parsed.scheduledTime ?? (scheduledTime || undefined), parsed.endTime ?? (scheduledEndTime || undefined), isRoutine, subtasks.filter((item) => item.title.trim()).map((item, index) => ({ ...item, title: item.title.trim(), order: index })));
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
  };

  const savedTemplateContent = !task && (hasPremiumAccess(planTier, 'saved_task_templates') ? <View style={styles.savedTemplatePicker}><Text style={styles.templateGroupLabel}>マイひな型</Text>{savedTemplates.length === 0 ? <Text style={styles.savedTemplateEmpty}>タスクの「•••」から設定ごと保存できます。</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedTemplateChips}>{savedTemplates.map((template) => <Pressable key={template.id} style={styles.savedTemplateChip} onPress={() => applySavedTemplate(template)}><Text numberOfLines={1} style={styles.savedTemplateChipTitle}>{template.title}</Text><Text numberOfLines={2} style={styles.savedTemplateChipCopy}>{summarizePremiumTaskTemplate(template)}</Text><Text style={styles.savedTemplateChoose}>選ぶ ›</Text></Pressable>)}</ScrollView>}</View> : <Pressable style={styles.savedTemplateLocked} onPress={() => onPremium('templates')}><View style={{ flex: 1 }}><Text style={styles.savedTemplateLockedTitle}>マイひな型</Text><Text style={styles.savedTemplateLockedCopy}>一度作った設定を、次からそのまま使う</Text></View><Text style={styles.taskTemplateSavePremium}>Premium機能</Text></Pressable>);

  const closeForm = () => {
    setShowScheduledDatePicker(false);
    setShowScheduledTimePicker(false);
    setShowDeadlineDatePicker(false);
    setShowDeadlineTimePicker(false);
    setHasDeadline(false);
    setExpandedSetting(null);
    setTemplatePickerOpen(false);
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

  if (readOnlyPreview && previewSection === 'savedTemplates') return <View style={[styles.premiumPreview, { backgroundColor: theme.colors.surface, padding: 14 }]} pointerEvents="none"><Text style={[styles.modalTitle, designMode === 'dark' && styles.modalTitleDark]}>マイひな型</Text>{savedTemplateContent}</View>;

  const modalContent = (
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={8}>
      <Pressable style={styles.modalBackdrop} onPress={closeForm}>
        <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, borderRadius: theme.radius.modal }]} onPress={(event) => event.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.modalScroll, isDark && styles.taskModalScrollDark]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, designMode === 'dark' && styles.modalTitleDark]}>{task ? 'タスクを編集' : '新しいタスク'}</Text>
          <Text style={[styles.fieldLabel, designMode === 'dark' && styles.fieldLabelDark]}>やること・忘れたくないこと</Text>
          <View style={styles.voiceAddInputRow}>
            <TextInput ref={titleInputRef} value={title} onChangeText={updateTitle} placeholder="例：資料をバッグに入れる" placeholderTextColor={designMode === 'dark' ? '#9CA8BC' : '#69758A'} style={[styles.modalInput, { flex: 1, minWidth: 0 }, designMode === 'dark' && styles.darkInput]} selectionColor={isChic && chicPalette ? chicPalette.accent : theme.colors.primaryAccent} returnKeyType="done" onSubmitEditing={save} />
            <Pressable accessibilityRole="button" accessibilityLabel="音声入力" style={[styles.voiceAddMicButton, isDark && styles.voiceAddMicButtonDark]} onPress={() => titleInputRef.current?.focus()}><Text style={styles.voiceAddMicText}>🎙</Text></Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={() => titleInputRef.current?.focus()}><Text style={[styles.voiceAddHint, isDark && styles.darkMutedText]}>🎙 音声で入力する　日時・通知・繰り返しを解析します</Text></Pressable>
          {!task && onOpenBulkAdd && <Pressable accessibilityRole="button" onPress={() => { closeForm(); onOpenBulkAdd(); }} style={{ minHeight: 42, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13, fontWeight: '800' }}>複数まとめて追加</Text><Text style={{ color: taskAccent, fontSize: 18 }}>›</Text></Pressable>}
          {!task && templates.length > 0 && <Pressable accessibilityRole="button" onPress={() => setTemplatePickerOpen((value) => !value)} style={{ minHeight: 44, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13, fontWeight: '800' }}>ひな型から選ぶ</Text><Text style={{ color: taskAccent, fontSize: 18 }}>{templatePickerOpen ? '⌃' : '›'}</Text></Pressable>}
          {!task && templatePickerOpen && <View style={{ paddingVertical: 8 }}>{templates.map((item) => <Pressable key={item} onPress={() => { setTitle(item); setTemplatePickerOpen(false); }} style={{ minHeight: 42, paddingHorizontal: 8, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: taskBorder }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>{item}</Text></Pressable>)}</View>}
          {!task && templatePickerOpen && savedTemplateContent}
          {smartResult.matched.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}><Text style={[styles.fieldLabel, designMode === 'dark' && styles.fieldLabelDark]}>解析結果</Text>{smartResult.scheduledDate && <Pressable style={[styles.taskTemplateChip, { backgroundColor: taskTemplateSurface, borderColor: taskBorder }]} onPress={() => { setScheduledDate(''); setSmartResult((current) => ({ ...current, scheduledDate: undefined })); }}><Text style={[styles.taskTemplateText, { color: taskTemplateText }]}>日付 {smartResult.scheduledDate} ×</Text></Pressable>}{smartResult.scheduledTime && <Pressable style={[styles.taskTemplateChip, { backgroundColor: taskTemplateSurface, borderColor: taskBorder }]} onPress={() => { setScheduledTime(''); setSmartResult((current) => ({ ...current, scheduledTime: undefined })); }}><Text style={[styles.taskTemplateText, { color: taskTemplateText }]}>時刻 {smartResult.scheduledTime} ×</Text></Pressable>}{smartResult.endTime && <Pressable style={[styles.taskTemplateChip, { backgroundColor: taskTemplateSurface, borderColor: taskBorder }]} onPress={() => { setScheduledEndTime(''); setSmartResult((current) => ({ ...current, endTime: undefined })); }}><Text style={[styles.taskTemplateText, { color: taskTemplateText }]}>終了 {smartResult.endTime} ×</Text></Pressable>}{smartResult.remindAt && <Pressable style={[styles.taskTemplateChip, { backgroundColor: taskTemplateSurface, borderColor: taskBorder }]} onPress={() => setSmartResult((current) => ({ ...current, remindAt: undefined, remindDate: undefined }))}><Text style={[styles.taskTemplateText, { color: taskTemplateText }]}>通知 {smartResult.remindDate} {smartResult.remindAt} ×</Text></Pressable>}{smartResult.repeatRule && <Pressable style={[styles.taskTemplateChip, { backgroundColor: taskTemplateSurface, borderColor: taskBorder }]} onPress={() => setSmartResult((current) => ({ ...current, repeatRule: undefined }))}><Text style={[styles.taskTemplateText, { color: taskTemplateText }]}>繰り返し {smartResult.repeatRule} ×</Text></Pressable>}</View>}
          <Pressable accessibilityRole="button" onPress={() => setExpandedSetting((value) => value === 'date' ? null : 'date')} style={{ minHeight: 46, marginTop: 12, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13, fontWeight: '800' }}>実行する日</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ color: taskAccent, fontSize: 13, fontWeight: '800' }}>{scheduledDateLabel}</Text><Text style={{ color: taskAccent, fontSize: 18 }}>›</Text></View></Pressable>
          {expandedSetting === 'date' && <View style={{ paddingVertical: 6 }}>{[{ label: '今日', value: todayInputValue() }, { label: '明日', value: todayInputValue(1) }].map((item) => <Pressable key={item.value} onPress={() => { setScheduledDate(item.value); setExpandedSetting(null); }} style={{ minHeight: 40, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: taskBorder, justifyContent: 'center' }}><Text style={{ color: scheduledDate === item.value ? taskAccent : theme.colors.primaryText, fontSize: 13, fontWeight: scheduledDate === item.value ? '800' : '500' }}>{item.label}</Text></Pressable>)}<Pressable onPress={toggleScheduledDatePicker} style={{ minHeight: 40, paddingHorizontal: 8, justifyContent: 'center' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>日付を選ぶ ›</Text></Pressable>{showScheduledDatePicker && <DateTimePicker value={dateForReminder(scheduledDate, '12:00')} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'inline' : 'default'} themeVariant={isDark ? 'dark' : undefined} textColor={isDark ? theme.colors.primaryText : undefined} accentColor={theme.colors.primaryAccent} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowScheduledDatePicker(false); if (event.type === 'set' && selected) { setScheduledDate(dateKey(selected)); setExpandedSetting(null); } }} />}</View>}
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: isRoutine }} onPress={() => setIsRoutine((value) => !value)} style={{ minHeight: 54, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={[styles.routineToggleBox, isRoutine && styles.routineToggleBoxActive]}><Text style={styles.routineToggleCheck}>{isRoutine ? '✓' : ''}</Text></View><View><Text style={[styles.switchTitle, designMode === 'dark' && styles.switchTitleDark]}>ルーティンにする</Text><Text style={[styles.switchCopy, isDark && styles.switchCopyDark]}>継続率と連続日数を記録</Text></View></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setDetailsOpen((value) => !value)} style={{ minHeight: 46, marginTop: 10, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13, fontWeight: '800' }}>{detailsOpen ? '詳しい設定を閉じる' : '必要なら詳しく設定'}</Text><Text style={{ color: taskAccent, fontSize: 18 }}>{detailsOpen ? '⌃' : '›'}</Text></Pressable>
          {(Boolean(task) || detailsOpen) && <View style={{ marginTop: 4 }}>
            <Text style={[styles.fieldLabel, { marginTop: 10 }, designMode === 'dark' && styles.fieldLabelDark]}>詳しい設定</Text>
            <Pressable onPress={() => setExpandedSetting((value) => value === 'category' ? null : 'category')} style={{ minHeight: 44, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>ジャンル</Text><Text style={{ color: taskAccent, fontSize: 13 }}>{category} ›</Text></Pressable>
            {expandedSetting === 'category' && <View style={{ paddingVertical: 4 }}>{categories.map((item) => <Pressable key={item} onPress={() => { setCategory(item); setExpandedSetting(null); }} style={{ minHeight: 38, paddingHorizontal: 8, justifyContent: 'center' }}><Text style={{ color: category === item ? taskAccent : theme.colors.primaryText, fontSize: 13, fontWeight: category === item ? '800' : '500' }}>{item}</Text></Pressable>)}</View>}
            <Pressable onPress={() => setExpandedSetting((value) => value === 'priority' ? null : 'priority')} style={{ minHeight: 44, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>優先度</Text><Text style={{ color: taskAccent, fontSize: 13 }}>{priority} ›</Text></Pressable>
            {expandedSetting === 'priority' && <View style={{ paddingVertical: 4 }}>{priorities.map((item) => <Pressable key={item} onPress={() => { setPriority(item); setExpandedSetting(null); }} style={{ minHeight: 38, paddingHorizontal: 8, justifyContent: 'center' }}><Text style={{ color: priority === item ? taskAccent : theme.colors.primaryText, fontSize: 13, fontWeight: priority === item ? '800' : '500' }}>{item}</Text></Pressable>)}</View>}
            <Pressable onPress={() => setExpandedSetting((value) => value === 'time' ? null : 'time')} style={{ minHeight: 44, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>時間</Text><Text style={{ color: taskAccent, fontSize: 13 }}>{scheduledTime ? scheduledTime + (scheduledEndTime ? '–' + scheduledEndTime : '') : '指定なし'} ›</Text></Pressable>
            {expandedSetting === 'time' && <View style={{ paddingVertical: 6 }}><Pressable onPress={toggleScheduledTimePicker} style={{ minHeight: 40, paddingHorizontal: 8, justifyContent: 'center' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>開始時間 {scheduledTime || '指定なし'} ›</Text></Pressable><TextInput value={scheduledEndTime} onChangeText={setScheduledEndTime} placeholder="終了時間（任意）" placeholderTextColor={isDark ? '#8F9BB0' : '#A29DAA'} keyboardType="numbers-and-punctuation" style={[styles.modalInput, { marginTop: 4, minHeight: 40 }]} />{showScheduledTimePicker && <DateTimePicker value={dateForReminder(scheduledDate, scheduledTime || '09:00')} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} themeVariant={isDark ? 'dark' : undefined} textColor={isDark ? theme.colors.primaryText : undefined} accentColor={theme.colors.primaryAccent} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowScheduledTimePicker(false); if (event.type === 'set' && selected) { setScheduledTime(formatLiveTime(selected)); setShowScheduledTimePicker(false); } }} />}</View>}
            <Pressable onPress={() => setExpandedSetting((value) => value === 'repeat' ? null : 'repeat')} style={{ minHeight: 44, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>繰り返し</Text><Text style={{ color: taskAccent, fontSize: 13 }}>{repeatOptions.find((option) => option.id === repeatRule)?.label || 'なし'} ›</Text></Pressable>
            {expandedSetting === 'repeat' && <View style={{ paddingVertical: 4 }}>{repeatOptions.map((option) => <Pressable key={option.id} onPress={() => { setRepeatRule(option.id); setExpandedSetting(null); }} style={{ minHeight: 38, paddingHorizontal: 8, justifyContent: 'center' }}><Text style={{ color: repeatRule === option.id ? taskAccent : theme.colors.primaryText, fontSize: 13, fontWeight: repeatRule === option.id ? '800' : '500' }}>{option.label}</Text></Pressable>)}</View>}
            <Pressable onPress={() => setExpandedSetting((value) => value === 'deadline' ? null : 'deadline')} style={{ minHeight: 44, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>期限</Text><Text style={{ color: taskAccent, fontSize: 13 }}>{hasDeadline ? deadlineDate.slice(5).replace('-', '/') + ' ' + deadlineTime : '指定なし'} ›</Text></Pressable>
            {expandedSetting === 'deadline' && <View style={{ paddingVertical: 6 }}><View style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>期限を設定</Text><Switch value={hasDeadline} onValueChange={setHasDeadline} trackColor={{ true: taskAccent }} /></View>{hasDeadline && <><Pressable onPress={toggleDeadlineDatePicker} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>期限日 {deadlineDate} ›</Text></Pressable>{showDeadlineDatePicker && <DateTimePicker value={dateForReminder(deadlineDate, deadlineTime)} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'inline' : 'default'} themeVariant={isDark ? 'dark' : undefined} textColor={isDark ? theme.colors.primaryText : undefined} accentColor={theme.colors.primaryAccent} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowDeadlineDatePicker(false); if (event.type === 'set' && selected) setDeadlineDate(dateKey(selected)); }} />}<Pressable onPress={toggleDeadlineTimePicker} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>リミット時刻 {deadlineTime} ›</Text></Pressable>{showDeadlineTimePicker && <DateTimePicker value={dateForReminder(deadlineDate, deadlineTime)} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} themeVariant={isDark ? 'dark' : undefined} textColor={isDark ? theme.colors.primaryText : undefined} accentColor={theme.colors.primaryAccent} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowDeadlineTimePicker(false); if (event.type === 'set' && selected) setDeadlineTime(String(selected.getHours()).padStart(2, '0') + ':' + String(selected.getMinutes()).padStart(2, '0')); }} />}<View style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>期限前に通知</Text><Switch value={deadlineNotify} onValueChange={setDeadlineNotify} trackColor={{ true: taskAccent }} /></View>{deadlineNotify && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 4 }}>{[0, 10, 30, 60, 1440].map((minutes) => <Pressable key={minutes} onPress={() => setDeadlineNotifyBefore(minutes)} style={{ paddingHorizontal: 9, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: deadlineNotifyBefore === minutes ? taskAccent : taskBorder }}><Text style={{ color: deadlineNotifyBefore === minutes ? taskAccent : theme.colors.secondaryText, fontSize: 12 }}>{minutes === 0 ? '時刻通り' : minutes === 1440 ? '1日前' : minutes >= 60 ? minutes / 60 + '時間前' : minutes + '分前'}</Text></Pressable>)}</View>}</>}</View>}
            <Pressable onPress={() => setExpandedSetting((value) => value === 'reminder' ? null : 'reminder')} style={{ minHeight: 44, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>通知</Text><Text style={{ color: taskAccent, fontSize: 13 }}>{remind ? remindDate + ' ' + time : '指定なし'} ›</Text></Pressable>
            {expandedSetting === 'reminder' && <View style={{ paddingVertical: 6 }}><View style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>追加リマインド</Text><Switch value={remind} onValueChange={setRemind} trackColor={{ true: taskAccent }} /></View>{remind && <><TextInput style={[styles.modalInput, { minHeight: 40, marginTop: 4 }]} value={remindDate} onChangeText={setRemindDate} maxLength={10} keyboardType="numbers-and-punctuation" placeholder="日付 YYYY-MM-DD" placeholderTextColor={theme.colors.secondaryText} /><TextInput style={[styles.modalInput, { minHeight: 40, marginTop: 6 }]} value={time} onChangeText={setTime} maxLength={5} keyboardType="numbers-and-punctuation" placeholder="時刻 HH:MM" placeholderTextColor={theme.colors.secondaryText} />{[{ id: 'once', label: '1回', copy: '通常' }, { id: 'repeat', label: '2回', copy: 'Premium' }, { id: 'strong', label: '3回', copy: 'Premium' }].map((item) => { const locked = item.id !== 'once' && !hasPremiumAccess(planTier, item.id === 'repeat' ? 'repeat_nudge' : 'strong_nudge'); return <Pressable key={item.id} onPress={() => locked ? onPremium('nudge') : setNudgeMode(item.id as NudgeMode)} style={{ minHeight: 38, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}><Text style={{ color: nudgeMode === item.id ? taskAccent : theme.colors.primaryText, fontSize: 13 }}>{item.label}{locked ? ' 🔒' : ''} <Text style={{ color: theme.colors.secondaryText, fontSize: 12 }}>{item.copy}</Text></Text></Pressable>; })}</>}</View>}
            <Pressable onPress={() => setExpandedSetting((value) => value === 'subtasks' ? null : 'subtasks')} style={{ minHeight: 44, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>サブタスク</Text><Text style={{ color: taskAccent, fontSize: 13 }}>{subtasks.filter((item) => item.title.trim()).length}件 ›</Text></Pressable>
            {expandedSetting === 'subtasks' && <View style={{ paddingVertical: 6 }}>{subtasks.map((item, index) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}><TextInput value={item.title} onChangeText={(value) => setSubtasks((current) => current.map((entry) => entry.id === item.id ? { ...entry, title: value } : entry))} style={[styles.modalInput, { flex: 1, minHeight: 40 }]} placeholder="サブタスク" /><Pressable onPress={() => moveSubtask(index, -1)}><Text style={{ color: taskAccent }}>↑</Text></Pressable><Pressable onPress={() => moveSubtask(index, 1)}><Text style={{ color: taskAccent }}>↓</Text></Pressable><Pressable onPress={() => setSubtasks((current) => current.filter((entry) => entry.id !== item.id))}><Text style={{ color: theme.colors.danger }}>削除</Text></Pressable></View>)}<View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><TextInput value={newSubtask} onChangeText={setNewSubtask} onSubmitEditing={addSubtask} placeholder="サブタスクを追加" style={[styles.modalInput, { flex: 1, minHeight: 40 }]} /><Pressable style={[styles.taskTemplateSaveAction, { backgroundColor: taskTemplateSurface, borderColor: taskBorder }]} onPress={addSubtask}><Text style={{ color: taskTemplateText }}>追加</Text></Pressable></View></View>}
            <Pressable onPress={() => setExpandedSetting((value) => value === 'navigation' ? null : 'navigation')} style={{ minHeight: 44, borderBottomWidth: 1, borderBottomColor: taskBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>間に合うナビ</Text><Text style={{ color: taskAccent, fontSize: 13 }}>{navigationEnabled ? 'ON' : 'OFF'} ›</Text></Pressable>
            {expandedSetting === 'navigation' && <View style={{ paddingVertical: 6 }}><View style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.primaryText, fontSize: 13 }}>間に合うナビ</Text><Switch value={navigationEnabled} onValueChange={(value) => { setNavigationEnabled(value); if (value) setHasDeadline(true); }} trackColor={{ true: taskAccent }} /></View>{navigationEnabled && <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 6 }}><CompactNumberSetting label="準備" value={preparationMinutes} onChange={setPreparationMinutes} isDark={isDark} /><CompactNumberSetting label="移動" value={travelMinutes} onChange={setTravelMinutes} isDark={isDark} /><CompactNumberSetting label="余裕" value={bufferMinutes} onChange={setBufferMinutes} isDark={isDark} /></View>}</View>}
          </View>}

          <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryAccent, borderRadius: theme.radius.button }]} onPress={save}><Text style={styles.primaryButtonText}>{task ? '変更を保存' : '登録する'}</Text></Pressable>
          <Pressable onPress={closeForm}><Text style={styles.cancelText}>キャンセル</Text></Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
  );
  return readOnlyPreview ? <View style={{ width: '100%' }} pointerEvents="none">{modalContent}</View> : <Modal visible={visible} transparent animationType="slide" onRequestClose={closeForm}>{modalContent}</Modal>;
}
