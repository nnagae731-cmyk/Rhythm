import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BehaviorEvent } from '../behaviorEvents';
import { getDeparturePlanMode, getPlanScheduledTime, isArrivalReversePlan, isDepartureReminderPlan } from '../features/departure/departurePlanMode';
import { recommendPreparationMinutes } from '../features/departure/preparationLearning';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { ChicPattern, DesignMode, getThemeTokens } from '../theme';
import { DeparturePlan } from '../types';

type DurationField = 'preparationMinutes' | 'travelMinutes' | 'bufferMinutes';
type DurationEditor = { field: DurationField; label: string; values: number[] };

type Props = {
  plan: DeparturePlan;
  plans: DeparturePlan[];
  behaviorEvents: BehaviorEvent[];
  designMode: DesignMode;
  chicPattern: ChicPattern;
  planTier: PlanTier;
  onChange: (plan: DeparturePlan) => void;
  onSubmit: () => Promise<boolean> | boolean | void;
  onClose: () => void;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  dateKey: (date: Date | string) => string;
  formatLiveDate: (date: Date) => string;
  formatLiveTime: (date: Date) => string;
  dateForReminder: (date: string, time: string) => Date;
  getDepartureMoments: (plan: DeparturePlan) => { prepare: Date; leave: Date; arrival: Date };
  getMapSearchTarget: (plan: DeparturePlan) => string;
  openMapSearch: (query: string) => Promise<void> | void;
};

const DEFAULT_PREPARATION_MINUTES = 30;
const PREPARATION_AND_TRAVEL_VALUES = [15, 30, 45, 60];
const BUFFER_VALUES = [0, 5, 10, 15, 30];

function isClock(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function durationLabel(minutes: number) {
  return `${minutes}分`;
}

export function DeparturePlanForm({
  plan,
  plans,
  behaviorEvents,
  designMode,
  chicPattern: _chicPattern,
  planTier,
  onChange,
  onSubmit,
  onClose,
  onPremium,
  dateKey,
  formatLiveDate,
  formatLiveTime,
  dateForReminder,
  getDepartureMoments,
  getMapSearchTarget,
  openMapSearch,
}: Props) {
  const theme = getThemeTokens(designMode);
  const isDark = designMode === 'dark';
  const isDesign = designMode === 'chic' || designMode === 'photo';
  const mode = getDeparturePlanMode(plan);
  const isReverse = isArrivalReversePlan(plan);
  const canUseReverse = isReverse && planTier === 'premium';
  const isDirectDeparture = isDepartureReminderPlan(plan);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [durationEditor, setDurationEditor] = useState<DurationEditor>();
  const [showOtherDuration, setShowOtherDuration] = useState(false);
  const [learningMessage, setLearningMessage] = useState<string>();
  const manuallyAdjustedPreparationRef = useRef(false);
  const autoAppliedRef = useRef(false);
  const previousPlanIdRef = useRef<string | undefined>(plan.id);
  const previousDraftTitleRef = useRef(plan.title);

  const recommendation = useMemo(() => recommendPreparationMinutes({
    draft: plan,
    plans,
    events: behaviorEvents,
    standardMinutes: plan.preparationMinutes || DEFAULT_PREPARATION_MINUTES,
  }), [behaviorEvents, plan, plans]);

  useEffect(() => {
    if (previousPlanIdRef.current !== plan.id) {
      previousPlanIdRef.current = plan.id;
      manuallyAdjustedPreparationRef.current = false;
      autoAppliedRef.current = false;
      setLearningMessage(undefined);
    }
  }, [plan.id]);

  useEffect(() => {
    const resetForNextNewPlan = !plan.id
      && plan.title.trim() === ''
      && previousDraftTitleRef.current.trim() !== '';
    if (resetForNextNewPlan) {
      manuallyAdjustedPreparationRef.current = false;
      autoAppliedRef.current = false;
      setLearningMessage(undefined);
    }
    previousDraftTitleRef.current = plan.title;
  }, [plan.id, plan.title]);

  useEffect(() => {
    if (!plan.id) return;
    setLearningMessage(recommendation.sampleCount > 0 ? `実績では準備時間 ${recommendation.minutes}分がおすすめです` : undefined);
  }, [plan.id, recommendation.minutes, recommendation.sampleCount]);

  useEffect(() => {
    if (!canUseReverse || plan.id || manuallyAdjustedPreparationRef.current || autoAppliedRef.current) return;
    const hasMeaningfulInput = plan.title.trim() !== '' || Boolean(plan.destination?.trim());
    if (!hasMeaningfulInput) return;

    const timer = setTimeout(() => {
      autoAppliedRef.current = true;
      setLearningMessage(recommendation.message);
      if (plan.preparationMinutes !== recommendation.minutes) {
        onChange({ ...plan, preparationMinutes: recommendation.minutes });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [canUseReverse, onChange, plan, recommendation]);

  const updatePlan = (patch: Partial<DeparturePlan>) => onChange({ ...plan, ...patch });
  const selectMode = (nextMode: 'calendar_only' | 'departure_reminder' | 'arrival_reverse') => {
    if (nextMode === 'arrival_reverse' && planTier !== 'premium') {
      onPremium('route');
      return;
    }
    const nextTime = getPlanScheduledTime(plan);
    updatePlan({
      planMode: nextMode,
      countdownEnabled: nextMode !== 'calendar_only',
      ...(nextMode === 'departure_reminder' ? { departureTime: nextTime, arrival: nextTime } : {}),
    });
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowEndTimePicker(false);
    setDurationEditor(undefined);
    setShowOtherDuration(false);
  };
  const selectedTime = getPlanScheduledTime(plan);
  const currentDuration = durationEditor ? plan[durationEditor.field] : 0;
  const durationChoiceValues = durationEditor?.field === 'preparationMinutes'
    ? [...new Set([...(durationEditor.values ?? []), recommendation.minutes])].sort((left, right) => left - right)
    : durationEditor?.values ?? [];
  const moments = getDepartureMoments(plan);

  const openDurationEditor = (field: DurationField, label: string, values: number[]) => {
    setDurationEditor({ field, label, values });
    setShowOtherDuration(false);
  };

  const applyDuration = (field: DurationField, value: number, manual = false) => {
    if (field === 'preparationMinutes' && manual) {
      manuallyAdjustedPreparationRef.current = true;
      setLearningMessage('手入力した準備時間を使います');
    }
    updatePlan({ [field]: Math.max(0, Math.round(value / 5) * 5) } as Partial<DeparturePlan>);
    setDurationEditor(undefined);
    setShowOtherDuration(false);
  };

  const adjustCustomDuration = (amount: number) => {
    if (!durationEditor) return;
    if (durationEditor.field === 'preparationMinutes') {
      manuallyAdjustedPreparationRef.current = true;
      setLearningMessage('手入力した準備時間を使います');
    }
    updatePlan({ [durationEditor.field]: Math.max(0, currentDuration + amount) } as Partial<DeparturePlan>);
  };

  const handleSubmit = async () => {
    if (!plan.title.trim()) {
      Alert.alert('予定名を入力してください');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.date) || !isClock(selectedTime)) {
      Alert.alert('日付と時刻を確認してください');
      return;
    }
    if (plan.endAt && (!isClock(plan.endAt) || plan.endAt <= selectedTime)) {
      Alert.alert('終了時間を確認してください', '終了時間は開始時間より後にしてください。');
      return;
    }
    await onSubmit();
  };

  const fieldText = isDark ? styles.darkPrimaryText : { color: theme.colors.primaryText };
  const secondaryText = isDark ? styles.darkSecondaryText : { color: theme.colors.secondaryText };
  const panel = { backgroundColor: theme.colors.surface, borderColor: theme.colors.border };
  const input = { backgroundColor: isDark ? theme.colors.secondarySurface : theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.primaryText };

  return <View style={styles.root}>
    <View style={[styles.editorHeader, { borderColor: theme.colors.border }]}>
      <View style={styles.editorTitleRow}><View style={{ flex: 1 }}><Text style={[styles.editorTitle, fieldText]}>{plan.id ? '予定を編集' : '予定を追加'}</Text><Text style={[styles.editorCopy, secondaryText]}>予定の形に合わせて、必要な項目だけ登録できます</Text></View></View>
    </View>

    <View style={[styles.segmented, styles.segmentedThree, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.secondarySurface : '#F6F7FB' }, isDesign && styles.segmentedDesign]}>
      <Pressable
        onPress={() => selectMode('calendar_only')}
        style={[styles.segmentButton, mode === 'calendar_only' && { backgroundColor: theme.colors.primaryAccent }, mode === 'calendar_only' && styles.segmentActive]}
      >
        <Text style={[styles.segmentText, { color: mode === 'calendar_only' ? '#FFFFFF' : theme.colors.primaryText }]}>予定表だけ</Text>
      </Pressable>
      <Pressable
        onPress={() => selectMode('departure_reminder')}
        style={[styles.segmentButton, mode === 'departure_reminder' && { backgroundColor: theme.colors.primaryAccent }, mode === 'departure_reminder' && styles.segmentActive]}
      >
        <Text style={[styles.segmentText, { color: mode === 'departure_reminder' ? '#FFFFFF' : theme.colors.primaryText }]}>出発時刻</Text>
      </Pressable>
      <Pressable
        onPress={() => selectMode('arrival_reverse')}
        style={[styles.segmentButton, isReverse && { backgroundColor: theme.colors.primaryAccent }, isReverse && styles.segmentActive]}
      >
        <Text style={[styles.segmentText, { color: isReverse ? '#FFFFFF' : theme.colors.primaryText }]}>到着から逆算{planTier === 'free' ? '\nPremium' : ''}</Text>
      </Pressable>
    </View>

    <View style={[styles.sectionCard, panel]}>
      <Text style={[styles.cardTitle, fieldText]}>基本情報</Text>
      <View style={styles.labelRow}><Text style={[styles.fieldLabel, fieldText]}>予定名</Text><Text style={[styles.required, { color: theme.colors.primaryAccent }]}>必須</Text></View>
      <TextInput
        style={[styles.titleInput, input]}
        value={plan.title}
        onChangeText={(title) => updatePlan({ title })}
        placeholder="例：友人と待ち合わせ"
        placeholderTextColor={theme.colors.secondaryText}
        returnKeyType="next"
      />
      <View style={styles.dateTimeRow}>
        <View style={styles.dateTimeField}>
          <View style={styles.labelRow}><Text style={[styles.fieldLabel, fieldText]}>日付</Text><Text style={[styles.required, { color: theme.colors.primaryAccent }]}>必須</Text></View>
          <Pressable style={[styles.dateTimeButton, input]} onPress={() => setShowDatePicker((current) => !current)}>
            <Text style={[styles.dateTimeIcon, { color: theme.colors.primaryAccent }]}>□</Text>
            <Text numberOfLines={1} style={[styles.dateTimeValue, fieldText]}>{formatLiveDate(dateForReminder(plan.date, selectedTime))}</Text>
          </Pressable>
        </View>
        <View style={styles.dateTimeField}>
          <View style={styles.labelRow}><Text style={[styles.fieldLabel, fieldText]}>{canUseReverse ? '到着時刻' : isDirectDeparture ? '出発時刻' : '予定時刻'}</Text><Text style={[styles.required, { color: theme.colors.primaryAccent }]}>必須</Text></View>
          <Pressable style={[styles.dateTimeButton, input]} onPress={() => setShowTimePicker((current) => !current)}>
            <Text style={[styles.dateTimeIcon, { color: theme.colors.primaryAccent }]}>◷</Text>
            <Text numberOfLines={1} style={[styles.dateTimeValue, fieldText]}>{formatLiveTime(dateForReminder(plan.date, selectedTime))}{canUseReverse ? ' 到着' : ''}</Text>
          </Pressable>
        </View>
      </View>
      {showDatePicker && <DateTimePicker
        value={dateForReminder(plan.date, selectedTime)}
        mode="date"
        minimumDate={new Date()}
        display={Platform.OS === 'ios' ? 'inline' : 'default'}
        themeVariant={isDark ? 'dark' : 'light'}
        onChange={(event, selected) => {
          if (Platform.OS !== 'ios') setShowDatePicker(false);
          if (event.type === 'set' && selected) updatePlan({ date: dateKey(selected) });
        }}
      />}
      {showTimePicker && <DateTimePicker
        value={dateForReminder(plan.date, selectedTime)}
        mode="time"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        themeVariant={isDark ? 'dark' : 'light'}
        onChange={(event, selected) => {
          if (Platform.OS !== 'ios') setShowTimePicker(false);
          if (event.type === 'set' && selected) {
            const time = `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`;
            updatePlan(isDirectDeparture ? { departureTime: time, arrival: time } : { arrival: time });
          }
        }}
      />}
      <View style={styles.endTimeRow}>
        <View style={{ flex: 1 }}><Text style={[styles.fieldLabel, secondaryText]}>終了時間（任意）</Text><Text style={[styles.destinationNote, secondaryText]}>設定するとスケジュールの表示時間が伸びます</Text></View>
        <Pressable style={[styles.dateTimeButton, input, styles.endTimeButton]} onPress={() => { setShowDatePicker(false); setShowTimePicker(false); setShowEndTimePicker((current) => !current); }}>
          <Text style={[styles.dateTimeValue, fieldText]}>{plan.endAt ?? '設定なし'}</Text>
        </Pressable>
      </View>
      {showEndTimePicker && <DateTimePicker
        value={dateForReminder(plan.date, plan.endAt ?? selectedTime)}
        mode="time"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        themeVariant={isDark ? 'dark' : 'light'}
        onChange={(event, selected) => {
          if (Platform.OS !== 'ios') setShowEndTimePicker(false);
          if (event.type === 'set' && selected) {
            const time = `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`;
            updatePlan({ endAt: time });
            if (Platform.OS === 'ios') setShowEndTimePicker(false);
          }
        }}
      />}
    </View>

    <View style={[styles.sectionCard, panel]}>
      <Text style={[styles.cardTitle, fieldText]}>目的地</Text>
      <View style={styles.labelRow}><Text style={[styles.fieldLabel, fieldText]}>目的地</Text><Text style={[styles.optional, secondaryText]}>任意</Text></View>
      <TextInput
        style={[styles.titleInput, input]}
        value={plan.destination ?? ''}
        onChangeText={(destination) => updatePlan({ destination })}
        placeholder="例：博多駅"
        placeholderTextColor={theme.colors.secondaryText}
      />
      <Pressable
        style={[styles.mapButton, { borderColor: theme.colors.primaryAccent, backgroundColor: isDark ? theme.colors.secondarySurface : 'transparent' }]}
        onPress={() => void openMapSearch(getMapSearchTarget(plan))}
      >
        <Text style={[styles.mapButtonText, { color: theme.colors.primaryAccent }]}>地図で確認</Text>
        <Text style={[styles.mapChevron, { color: theme.colors.primaryAccent }]}>〉</Text>
      </Pressable>
      <Text style={[styles.destinationNote, secondaryText]}>地図アプリで目的地を確認できます</Text>
    </View>

    {canUseReverse && <View style={[styles.sectionCard, panel]}>
      <Text style={[styles.cardTitle, fieldText]}>Rhythmが逆算</Text>
      <View style={[styles.durationRows, { borderColor: theme.colors.border }]}>
        <Pressable style={styles.durationRow} onPress={() => openDurationEditor('preparationMinutes', '準備時間', PREPARATION_AND_TRAVEL_VALUES)}>
          <View><Text style={[styles.durationLabel, secondaryText]}>準備</Text><Text style={[styles.durationValue, fieldText]}>{durationLabel(plan.preparationMinutes)}</Text></View><Text style={[styles.durationChevron, { color: theme.colors.secondaryText }]}>〉</Text>
        </Pressable>
        <Pressable style={[styles.durationRow, styles.durationRowBorder, { borderColor: theme.colors.border }]} onPress={() => openDurationEditor('travelMinutes', '移動時間', PREPARATION_AND_TRAVEL_VALUES)}>
          <View><Text style={[styles.durationLabel, secondaryText]}>移動</Text><Text style={[styles.durationValue, fieldText]}>{durationLabel(plan.travelMinutes)}</Text></View><Text style={[styles.durationChevron, { color: theme.colors.secondaryText }]}>〉</Text>
        </Pressable>
        <Pressable style={styles.durationRow} onPress={() => openDurationEditor('bufferMinutes', '余裕時間', BUFFER_VALUES)}>
          <View><Text style={[styles.durationLabel, secondaryText]}>余裕</Text><Text style={[styles.durationValue, fieldText]}>{durationLabel(plan.bufferMinutes)}</Text></View><Text style={[styles.durationChevron, { color: theme.colors.secondaryText }]}>〉</Text>
        </Pressable>
      </View>
      {learningMessage && <View style={[styles.learningHint, { backgroundColor: isDark ? theme.colors.secondarySurface : theme.colors.softAccent }]}>
        <Text style={[styles.learningHintText, { color: theme.colors.primaryAccent }]}>{learningMessage}</Text>
      </View>}
      <View style={[styles.timelineLine, { backgroundColor: theme.colors.primaryAccent }]}>
        <View style={[styles.timelineDot, { borderColor: theme.colors.primaryAccent, backgroundColor: theme.colors.surface }]} />
        <View style={[styles.timelineDot, styles.timelineMiddleDot, { borderColor: theme.colors.primaryAccent, backgroundColor: theme.colors.surface }]} />
        <View style={[styles.timelineDot, styles.timelineLastDot, { borderColor: theme.colors.primaryAccent, backgroundColor: theme.colors.surface }]} />
      </View>
      <View style={styles.momentRow}>
        <View style={styles.momentItem}><Text style={[styles.momentTime, fieldText]}>{formatLiveTime(moments.prepare)}</Text><Text style={[styles.momentLabel, secondaryText]}>準備開始</Text></View>
        <View style={[styles.momentItem, styles.momentCenter]}><Text style={[styles.momentTime, fieldText]}>{formatLiveTime(moments.leave)}</Text><Text style={[styles.momentLabel, secondaryText]}>出発</Text></View>
        <View style={[styles.momentItem, styles.momentLast]}><Text style={[styles.momentTime, fieldText]}>{formatLiveTime(moments.arrival)}</Text><Text style={[styles.momentLabel, secondaryText]}>到着</Text></View>
      </View>
    </View>}

    <View style={[styles.submitArea, { borderColor: theme.colors.border }]}>
      {canUseReverse && <Text style={[styles.finalTimeline, secondaryText]}>{formatLiveTime(moments.prepare)} 準備開始 ・ {formatLiveTime(moments.leave)} 出発</Text>}
      <Pressable accessibilityRole="button" style={[styles.submitButton, { backgroundColor: theme.colors.primaryAccent }]} onPress={() => void handleSubmit()}>
        <Text style={styles.submitButtonText}>{plan.id ? '変更を保存' : canUseReverse ? 'この予定を登録' : isDirectDeparture ? '出発時刻を登録' : '予定表に追加'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="予定の追加を閉じる" style={[styles.bottomCloseButton, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.secondarySurface : theme.colors.surface }]} onPress={onClose}>
        <Text style={[styles.bottomCloseButtonText, fieldText]}>閉じる</Text>
      </Pressable>
    </View>

    <Modal visible={Boolean(durationEditor)} transparent animationType="slide" onRequestClose={() => setDurationEditor(undefined)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setDurationEditor(undefined)}>
        <Pressable style={[styles.durationSheet, { backgroundColor: theme.colors.surface }]} onPress={(event) => event.stopPropagation()}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.sheetTitle, fieldText]}>{durationEditor?.label}</Text>
          <Text style={[styles.sheetCopy, secondaryText]}>5分単位で選べます</Text>
          <View style={styles.durationChoices}>
            {durationChoiceValues.map((value) => <Pressable key={value} style={[styles.durationChoice, { borderColor: theme.colors.border }, currentDuration === value && { borderColor: theme.colors.primaryAccent, backgroundColor: theme.colors.softAccent }]} onPress={() => durationEditor && applyDuration(durationEditor.field, value, true)}><Text style={[styles.durationChoiceText, { color: currentDuration === value ? theme.colors.primaryAccent : theme.colors.primaryText }]}>{durationLabel(value)}{durationEditor?.field === 'preparationMinutes' && value === recommendation.minutes && !durationEditor.values.includes(value) ? ' おすすめ' : ''}</Text></Pressable>)}
            <Pressable style={[styles.durationChoice, { borderColor: theme.colors.border }, showOtherDuration && { borderColor: theme.colors.primaryAccent, backgroundColor: theme.colors.softAccent }]} onPress={() => setShowOtherDuration(true)}><Text style={[styles.durationChoiceText, { color: theme.colors.primaryText }]}>その他</Text></Pressable>
          </View>
          {showOtherDuration && durationEditor && <View style={[styles.customDuration, { backgroundColor: theme.colors.secondarySurface }]}>
            <Pressable style={[styles.adjustButton, { borderColor: theme.colors.border }]} onPress={() => adjustCustomDuration(-5)}><Text style={[styles.adjustButtonText, { color: theme.colors.primaryAccent }]}>−</Text></Pressable>
            <Text style={[styles.customDurationValue, fieldText]}>{durationLabel(currentDuration)}</Text>
            <Pressable style={[styles.adjustButton, { borderColor: theme.colors.border }]} onPress={() => adjustCustomDuration(5)}><Text style={[styles.adjustButtonText, { color: theme.colors.primaryAccent }]}>＋</Text></Pressable>
          </View>}
          {showOtherDuration && durationEditor && <Pressable style={[styles.applyDurationButton, { backgroundColor: theme.colors.primaryAccent }]} onPress={() => applyDuration(durationEditor.field, currentDuration, true)}><Text style={styles.applyDurationButtonText}>この時間にする</Text></Pressable>}
        </Pressable>
      </Pressable>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 16, paddingBottom: 12 },
  editorHeader: { paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  editorTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  editorTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.6 },
  editorCopy: { marginTop: 5, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  segmented: { flexDirection: 'row', padding: 3, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  segmentedThree: { gap: 2 },
  segmentedDesign: { borderRadius: 18 },
  segmentButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  segmentActive: { shadowColor: '#4F6FED', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 2 },
  segmentText: { fontSize: 12, fontWeight: '900', textAlign: 'center', lineHeight: 16 },
  sectionCard: { borderWidth: 1, borderRadius: 18, padding: 16, shadowColor: '#1B2B4A', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 1 },
  cardTitle: { fontSize: 19, fontWeight: '900', marginBottom: 14, letterSpacing: -0.25 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  fieldLabel: { fontSize: 13, fontWeight: '800' },
  required: { fontSize: 12, fontWeight: '900' },
  optional: { fontSize: 12, fontWeight: '700' },
  titleInput: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, fontWeight: '700' },
  dateTimeRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  dateTimeField: { flex: 1, minWidth: 0 },
  dateTimeButton: { minHeight: 54, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11 },
  dateTimeIcon: { fontSize: 20, fontWeight: '900' },
  dateTimeValue: { flex: 1, fontSize: 14, fontWeight: '800' },
  endTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  endTimeButton: { minWidth: 112, flexGrow: 0 },
  mapButton: { marginTop: 12, minHeight: 48, borderWidth: 1.4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  mapButtonText: { fontSize: 15, fontWeight: '900' },
  mapChevron: { fontSize: 24, fontWeight: '500', marginTop: -2 },
  destinationNote: { marginTop: 8, fontSize: 12, fontWeight: '600' },
  durationRows: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  durationRow: { flex: 1, minHeight: 72, paddingHorizontal: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 3 },
  durationRowBorder: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth },
  durationLabel: { fontSize: 12, fontWeight: '800' },
  durationValue: { marginTop: 5, fontSize: 19, fontWeight: '900' },
  durationChevron: { fontSize: 22, fontWeight: '400' },
  timelineLine: { height: 2, marginHorizontal: 10, marginTop: 31, position: 'relative' },
  timelineDot: { position: 'absolute', width: 17, height: 17, borderRadius: 9, borderWidth: 3, left: -8, top: -7 },
  timelineMiddleDot: { left: '50%', marginLeft: -8 },
  timelineLastDot: { left: undefined, right: -8 },
  momentRow: { flexDirection: 'row', marginTop: 18 },
  momentItem: { flex: 1 },
  momentCenter: { alignItems: 'center' },
  momentLast: { alignItems: 'flex-end' },
  momentTime: { fontSize: 16, fontWeight: '900' },
  momentLabel: { marginTop: 3, fontSize: 12, fontWeight: '700' },
  learningHint: { marginTop: 16, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  learningHintText: { fontSize: 12, fontWeight: '800', lineHeight: 18 },
  submitArea: { paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth },
  finalTimeline: { marginBottom: 10, textAlign: 'center', fontSize: 13, fontWeight: '800' },
  submitButton: { minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  bottomCloseButton: { minHeight: 52, marginTop: 10, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bottomCloseButtonText: { fontSize: 15, fontWeight: '900' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 14, 28, 0.42)' },
  durationSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  sheetHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 3, marginBottom: 18 },
  sheetTitle: { fontSize: 20, fontWeight: '900' },
  sheetCopy: { marginTop: 5, fontSize: 13, fontWeight: '600' },
  durationChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 18 },
  durationChoice: { minWidth: '30%', flexGrow: 1, height: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  durationChoiceText: { fontSize: 14, fontWeight: '900' },
  customDuration: { marginTop: 16, borderRadius: 14, minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  adjustButton: { width: 38, height: 38, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  adjustButtonText: { fontSize: 23, fontWeight: '500', marginTop: -2 },
  customDurationValue: { fontSize: 18, fontWeight: '900' },
  applyDurationButton: { marginTop: 14, minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  applyDurationButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  darkPrimaryText: { color: '#F4F7FC' },
  darkSecondaryText: { color: '#B4C0D4' },
});
