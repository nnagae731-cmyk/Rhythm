import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { DesignMode } from '../theme';
import { Category, NudgeMode, Priority, RepeatRule, Task } from '../types';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { PremiumTaskTemplate } from '../taskTemplates';
import { categories, priorities, repeatOptions } from '../features/tasks/taskUtils';
export function TaskModal({ visible, task, templates, savedTemplates, designMode, planTier, onPremium, onClose, onSave, styles, helpers, components }: { visible: boolean; task?: Task; templates: string[]; savedTemplates: PremiumTaskTemplate[]; designMode: DesignMode; planTier: PlanTier; onPremium: (featureId?: PremiumGuideFeatureId) => void; onClose: () => void; onSave: (title: string, category: Category, priority: Priority, remindDate?: string, remindAt?: string, deadlineDate?: string, deadlineTime?: string, deadlineNotifyBefore?: number, navigationEnabled?: boolean, preparationMinutes?: number, travelMinutes?: number, bufferMinutes?: number, repeatRule?: RepeatRule, nudgeMode?: NudgeMode, scheduledDate?: string, scheduledTime?: string, isRoutine?: boolean) => void; styles: any; helpers: any; components: any }) {
  const { getThemeTokens, todayInputValue, hasPremiumAccess, dateForReminder, dateKey, formatLiveTime, colors, summarizePremiumTaskTemplate } = helpers;
  const { CompactNumberSetting } = components;
  const theme = getThemeTokens(designMode);
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
  const [isRoutine, setIsRoutine] = useState(false);
  const [showScheduledDatePicker, setShowScheduledDatePicker] = useState(false);
  const [showScheduledTimePicker, setShowScheduledTimePicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
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
    setIsRoutine(task?.isRoutine ?? false);
    setShowScheduledDatePicker(false);
    setShowScheduledTimePicker(false);
  }, [visible, task]);

  const save = () => {
    const clean = title.trim();
    if (!clean) {
      Alert.alert('タスクを入力してください');
      return;
    }
    onSave(clean, category, priority, remind ? remindDate : undefined, remind ? time : undefined, hasDeadline ? deadlineDate : undefined, hasDeadline ? deadlineTime : undefined, hasDeadline && deadlineNotify ? deadlineNotifyBefore : undefined, hasDeadline && navigationEnabled, preparationMinutes, travelMinutes, bufferMinutes, repeatRule, nudgeMode, scheduledDate, scheduledTime || undefined, isRoutine);
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
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={8}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.screenBackground, borderRadius: theme.radius.modal }]} onPress={(event) => event.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{task ? 'タスクを編集' : '新しいタスク'}</Text>
          {!task && templates.length > 0 && <><Text style={styles.templateGroupLabel}>クイックひな型</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.taskTemplates}>{templates.map((item) => <Pressable key={item} style={styles.taskTemplateChip} onPress={() => setTitle(item)}><Text style={styles.taskTemplateText}>＋ {item}</Text></Pressable>)}</ScrollView></>}
          {!task && (hasPremiumAccess(planTier, 'saved_task_templates') ? <View style={styles.savedTemplatePicker}><Text style={styles.templateGroupLabel}>マイひな型</Text>{savedTemplates.length === 0 ? <Text style={styles.savedTemplateEmpty}>タスクの「•••」から設定ごと保存できます。</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedTemplateChips}>{savedTemplates.map((template) => <Pressable key={template.id} style={styles.savedTemplateChip} onPress={() => applySavedTemplate(template)}><Text numberOfLines={1} style={styles.savedTemplateChipTitle}>{template.title}</Text><Text numberOfLines={2} style={styles.savedTemplateChipCopy}>{summarizePremiumTaskTemplate(template)}</Text><Text style={styles.savedTemplateChoose}>選ぶ ›</Text></Pressable>)}</ScrollView>}</View> : <Pressable style={styles.savedTemplateLocked} onPress={() => onPremium('templates')}><View style={{ flex: 1 }}><Text style={styles.savedTemplateLockedTitle}>マイひな型</Text><Text style={styles.savedTemplateLockedCopy}>一度作った設定を、次からそのまま使う</Text></View><Text style={styles.taskTemplateSavePremium}>Premium機能</Text></Pressable>)}
          <Text style={styles.fieldLabel}>やること・忘れたくないこと</Text>
          <TextInput
            autoFocus
            value={title}
            onChangeText={setTitle}
            placeholder="例：資料をバッグに入れる"
            placeholderTextColor="#A29DAA"
            style={styles.modalInput}
            selectionColor={colors.violet}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>ジャンル</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChoices}>
            {categories.map((item) => (
              <Pressable key={item} style={[styles.categoryChoice, { backgroundColor: theme.colors.secondarySurface }, category === item && styles.categoryChoiceActive, category === item && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.primaryAccent }]} onPress={() => setCategory(item)}>
                <Text style={styles.categoryChoiceText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={[styles.fieldLabel, { marginTop: 17 }]}>優先度</Text>
          <View style={styles.priorityChoices}>
            {priorities.map((item) => (
              <Pressable key={item} style={[styles.priorityChoice, { backgroundColor: theme.colors.secondarySurface }, priority === item && styles.priorityChoiceActive, priority === item && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.primaryAccent }]} onPress={() => setPriority(item)}>
                <Text style={[styles.priorityChoiceText, priority === item && styles.priorityChoiceTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.fieldLabel, { marginTop: 17 }]}>実行する日</Text>
          <View style={styles.taskDateQuickRow}>
            <Pressable style={styles.taskDateQuick} onPress={() => setScheduledDate(todayInputValue())}><Text style={styles.taskDateQuickText}>今日</Text></Pressable>
            <Pressable style={styles.taskDateQuick} onPress={() => setScheduledDate(todayInputValue(1))}><Text style={styles.taskDateQuickText}>明日</Text></Pressable>
            <Pressable style={styles.taskDatePickerButton} onPress={() => setShowScheduledDatePicker((value) => !value)}><Text style={styles.taskDatePickerText}>▣ {scheduledDate}</Text></Pressable>
          </View>
          {showScheduledDatePicker && <DateTimePicker value={dateForReminder(scheduledDate, '12:00')} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowScheduledDatePicker(false); if (event.type === 'set' && selected) setScheduledDate(dateKey(selected)); }} />}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}><View><Text style={styles.fieldLabel}>実行する時間（任意）</Text><Text style={styles.switchCopy}>指定したタスクだけスケジュールに表示</Text></View><Pressable style={[styles.taskDatePickerButton, { minWidth: 115 }]} onPress={() => setShowScheduledTimePicker((value) => !value)}><Text style={styles.taskDatePickerText}>{scheduledTime || '時間を指定'}</Text></Pressable></View>
          {showScheduledTimePicker && <DateTimePicker value={dateForReminder(scheduledDate, scheduledTime || '09:00')} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event: DateTimePickerEvent, selected) => { if (Platform.OS !== 'ios') setShowScheduledTimePicker(false); if (event.type === 'set' && selected) { setScheduledTime(formatLiveTime(selected)); setShowScheduledTimePicker(false); } }} />}
          <Text style={[styles.fieldLabel, { marginTop: 17 }]}>繰り返し・ルーティン</Text>
          <View style={styles.repeatChoices}>
            {repeatOptions.map((option) => <Pressable key={option.id} style={[styles.repeatChoice, { backgroundColor: theme.colors.secondarySurface }, repeatRule === option.id && styles.repeatChoiceActive, repeatRule === option.id && { backgroundColor: theme.colors.softAccent, borderColor: theme.colors.primaryAccent }]} onPress={() => setRepeatRule(option.id)}><Text style={[styles.repeatChoiceText, repeatRule === option.id && styles.repeatChoiceTextActive]}>{option.label}</Text></Pressable>)}
          </View>
          <Pressable style={styles.routineToggleRow} onPress={() => setIsRoutine((value) => !value)}><View style={[styles.routineToggleBox, isRoutine && styles.routineToggleBoxActive]}><Text style={styles.routineToggleCheck}>{isRoutine ? '✓' : ''}</Text></View><View><Text style={styles.routineToggleTitle}>ルーティンにする</Text><Text style={styles.routineToggleCopy}>継続率と連続日数を分析に表示</Text></View></Pressable>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>追加リマインド</Text>
              <Text style={styles.switchCopy}>期限とは別の日時にも通知します</Text>
            </View>
            <Switch value={remind} onValueChange={setRemind} trackColor={{ true: colors.violet }} />
          </View>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>期限を設定</Text>
              <Text style={styles.switchCopy}>残り時間と期限超過を表示します</Text>
            </View>
            <Switch value={hasDeadline} onValueChange={setHasDeadline} trackColor={{ true: colors.coral }} />
          </View>
          {hasDeadline && (
            <View style={styles.deadlinePanel}>
              <View style={styles.quickDates}>
                <Pressable style={styles.quickDeadlineButton} onPress={() => setDeadlineDate(todayInputValue())}><Text style={styles.quickDeadlineText}>今日まで</Text></Pressable>
                <Pressable style={styles.quickDeadlineButton} onPress={() => setDeadlineDate(todayInputValue(1))}><Text style={styles.quickDeadlineText}>明日まで</Text></Pressable>
                <Pressable style={styles.quickDeadlineButton} onPress={() => setDeadlineDate(todayInputValue(7))}><Text style={styles.quickDeadlineText}>1週間後</Text></Pressable>
              </View>
              <View style={styles.remindTimeRow}>
                <Text style={styles.numberLabel}>期限日</Text>
                <Pressable style={styles.pickerButton} onPress={() => setShowDeadlineDatePicker((value) => !value)}><Text style={styles.pickerButtonText}>▣ {deadlineDate}</Text></Pressable>
              </View>
              {showDeadlineDatePicker && <DateTimePicker value={dateForReminder(deadlineDate, deadlineTime)} mode="date" minimumDate={new Date()} display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={(event: DateTimePickerEvent, selected) => {
                if (Platform.OS !== 'ios') setShowDeadlineDatePicker(false);
                if (event.type === 'set' && selected) setDeadlineDate(dateKey(selected));
              }} />}
              <View style={styles.remindTimeRow}>
                <Text style={styles.numberLabel}>リミット時刻</Text>
                <Pressable style={styles.pickerButton} onPress={() => setShowDeadlineTimePicker((value) => !value)}><Text style={[styles.pickerButtonText, { color: colors.coral }]}>◷ {deadlineTime}</Text></Pressable>
              </View>
              {showDeadlineTimePicker && <DateTimePicker value={dateForReminder(deadlineDate, deadlineTime)} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event: DateTimePickerEvent, selected) => {
                if (Platform.OS !== 'ios') setShowDeadlineTimePicker(false);
                if (event.type === 'set' && selected) setDeadlineTime(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
              }} />}
              <View style={styles.deadlineNotifyRow}>
                <View><Text style={styles.numberLabel}>期限前に通知</Text><Text style={styles.switchCopy}>期限の設定と連動します</Text></View>
                <Switch value={deadlineNotify} onValueChange={setDeadlineNotify} trackColor={{ true: colors.coral }} />
              </View>
              {deadlineNotify && <View style={styles.notifyChoices}>
                {[0, 10, 30, 60, 1440].map((minutes) => (
                  <Pressable key={minutes} style={[styles.notifyChoice, deadlineNotifyBefore === minutes && styles.notifyChoiceActive]} onPress={() => setDeadlineNotifyBefore(minutes)}>
                    <Text style={[styles.notifyChoiceText, deadlineNotifyBefore === minutes && styles.notifyChoiceTextActive]}>{minutes === 0 ? '時刻通り' : minutes === 1440 ? '1日前' : minutes >= 60 ? `${minutes / 60}時間前` : `${minutes}分前`}</Text>
                  </Pressable>
                ))}
              </View>}
              <View style={styles.deadlineNotifyRow}>
                <View><Text style={[styles.numberLabel, designMode === 'dark' && styles.darkAccentText]}>間に合うナビ</Text><Text style={[styles.switchCopy, designMode === 'dark' && styles.darkAccentText]}>準備・移動時間から危険度を判定</Text></View>
                <Switch value={navigationEnabled} onValueChange={setNavigationEnabled} trackColor={{ true: colors.violet }} />
              </View>
              {navigationEnabled && <View style={styles.navigationDurations}>
                <CompactNumberSetting label="準備" value={preparationMinutes} onChange={setPreparationMinutes} />
                <CompactNumberSetting label="移動" value={travelMinutes} onChange={setTravelMinutes} />
                <CompactNumberSetting label="余裕" value={bufferMinutes} onChange={setBufferMinutes} />
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
                <View><Text style={styles.numberLabel}>日付</Text><Text style={styles.inputHint}>YYYY-MM-DD</Text></View>
                <TextInput style={styles.remindDateInput} value={remindDate} onChangeText={setRemindDate} maxLength={10} keyboardType="numbers-and-punctuation" selectionColor={colors.violet} />
              </View>
              <View style={styles.remindTimeRow}>
                <Text style={styles.numberLabel}>時刻</Text>
                <TextInput style={styles.remindTimeInput} value={time} onChangeText={setTime} maxLength={5} keyboardType="numbers-and-punctuation" selectionColor={colors.violet} />
              </View>
              <Text style={[styles.numberLabel, { marginTop: 13, marginBottom: 8 }]}>通知スルー防止</Text>
              <View style={styles.nudgeChoices}>
                {([{ id: 'once', label: '1回', copy: '通常' }, { id: 'repeat', label: '2回', copy: 'Premium' }, { id: 'strong', label: '3回', copy: 'Premium' }] as { id: NudgeMode; label: string; copy: string }[]).map((item) => { const locked = item.id !== 'once' && !hasPremiumAccess(planTier, item.id === 'repeat' ? 'repeat_nudge' : 'strong_nudge'); return <Pressable key={item.id} style={[styles.nudgeChoice, nudgeMode === item.id && styles.nudgeChoiceActive]} onPress={() => locked ? onPremium('nudge') : setNudgeMode(item.id)}><Text style={[styles.nudgeChoiceTitle, nudgeMode === item.id && styles.nudgeChoiceTitleActive]}>{item.label}{locked ? ' 🔒' : ''}</Text><Text style={[styles.nudgeChoiceCopy, nudgeMode === item.id && styles.nudgeChoiceCopyActive]}>{item.copy}</Text></Pressable>; })}
              </View>
            </View>
          )}
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryAccent, borderRadius: theme.radius.button }]} onPress={save}><Text style={styles.primaryButtonText}>{task ? '変更を保存' : '登録する'}</Text></Pressable>
          <Pressable onPress={onClose}><Text style={styles.cancelText}>キャンセル</Text></Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
