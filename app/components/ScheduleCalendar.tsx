import { formatJapaneseDateKey } from '../features/schedule/dateDisplay';
import React, { useEffect, useMemo, useState } from 'react';
import { BehaviorEvent } from '../behaviorEvents';
import { DepartureCheckIn } from '../departureCheckIn';
import { getDeparturePlanMode, getPlanScheduledTime, isArrivalReversePlan } from '../features/departure/departurePlanMode';
import { dateForReminder, dateKey, formatLiveTime, getTargetDate, parseClock } from '../features/schedule/dateTimeUtils';
import { getDepartureMoments, isPlanOnDate, isRegularVisibleTask, normalizePlanDate, planDateKey } from '../features/schedule/scheduleConflict';
import { categories } from '../features/tasks/taskUtils';
import { PlanTier, hasPremiumAccess } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { styles } from '../styles/appStyles';
import { ChicPattern, ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import { CalendarMarks, Category, DeparturePlan, DeparturePreparationStatus, Task } from '../types';
import { CalendarMarkPicker, DesignCalendarPlanActions, withCalendarBandAlpha } from './CalendarMarkPicker';
import { Pressable, Text, View } from 'react-native';
import type * as Calendar from 'expo-calendar';

export function DailyScheduleTimeline({ date, tasks, plans, externalEvents, now, designMode, chicPalette, planTier, onEditTask, onEditPlan, visibleStartHour, visibleEndHour, showHeading = true }: { date: string; tasks: Task[]; plans: DeparturePlan[]; externalEvents: Calendar.Event[]; now: Date; designMode: DesignMode; chicPalette?: ChicThemePalette; planTier: PlanTier; onEditTask: (task: Task) => void; onEditPlan: (plan: DeparturePlan) => void; visibleStartHour?: number; visibleEndHour?: number; showHeading?: boolean }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  const categoryColors = Object.fromEntries(categories.map((category) => [category, designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent])) as Record<Category, string>;
  type ScheduleItem = { id: string; time?: string; endTime?: string; title: string; meta?: string; kind: 'task' | 'plan' | 'external' | 'done'; onPress?: () => void };
  const items: ScheduleItem[] = [];
  tasks.filter((task) => isRegularVisibleTask(task)).filter((task) => {
    const dates = [task.scheduledDate, task.deadlineDate, task.remindDate, task.done && task.completedAt ? dateKey(task.completedAt) : undefined];
    return dates.includes(date);
  }).forEach((task) => {
    const time = task.scheduledTime;
    if (!time) return;
    items.push({ id: `task-${task.id}`, time, endTime: task.endAt, title: task.title, meta: task.done ? '完了' : task.category, kind: task.done ? 'done' : 'task', onPress: task.done ? undefined : () => onEditTask(task) });
  });
  plans.filter((plan) => isPlanOnDate(plan, date)).forEach((plan, index) => {
    const mode = getDeparturePlanMode(plan);
    const time = getPlanScheduledTime(plan);
    const canUseReversePlan = isArrivalReversePlan(plan) && planTier === 'premium';
    const meta = mode === 'calendar_only'
      ? time ? undefined : '終日'
      : mode === 'departure_reminder'
        ? `出発 ${time}`
        : canUseReversePlan
          ? `出発 ${formatLiveTime(getDepartureMoments(plan).leave)} ・ 準備 ${formatLiveTime(getDepartureMoments(plan).prepare)}`
          : '到着からの逆算 ・ Premium';
    items.push({ id: `plan-${plan.id ?? index}`, time, endTime: plan.endAt ?? undefined, title: plan.title, meta, kind: 'plan', onPress: () => onEditPlan(plan) });
  });
  externalEvents.filter((event) => dateKey(new Date(event.startDate)) === date).forEach((event) => {
    const eventStart = new Date(event.startDate);
    items.push({ id: `external-${event.id}`, time: event.allDay ? undefined : formatLiveTime(eventStart), title: event.title || 'カレンダー予定', meta: event.allDay ? '終日' : undefined, kind: 'external' });
  });
  const allDayItems = items.filter((item) => !item.time);
  const timed = items.filter((item) => item.time).sort((a, b) => parseClock(a.time!) - parseClock(b.time!));
  const currentDate = dateKey(now);
  // Include each plan's end time when building the axis so the timeline
  // continues through the full displayed time range, not only its start hour.
  const axisHours = timed.flatMap((item) => {
    const startMinutes = parseClock(item.time!);
    const endMinutes = item.endTime ? Math.max(startMinutes, parseClock(item.endTime)) : startMinutes;
    return [Math.floor(startMinutes / 60), Math.ceil(endMinutes / 60)];
  });
  const firstHour = Math.min(visibleStartHour ?? 7, ...axisHours);
  const lastHour = Math.max(visibleEndHour ?? 22, ...axisHours);
  const timelineHours = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
  const hourHeight = 64;
  const axisStartMinutes = firstHour * 60;
  const timelineHeight = timelineHours.length * hourHeight;
  const placements = timed.reduce<Array<ScheduleItem & { startMinutes: number; endMinutes: number; column: number }>>((result, item) => {
    const startMinutes = parseClock(item.time!);
    const minimumCardMinutes = designMode === 'chic' ? 96 : item.kind === 'external' ? 45 : 30;
    const endMinutes = item.endTime ? Math.max(startMinutes + minimumCardMinutes, parseClock(item.endTime)) : startMinutes + minimumCardMinutes;
    let column = 0;
    while (result.some((placed) => placed.column === column && startMinutes < placed.endMinutes && endMinutes > placed.startMinutes)) column += 1;
    result.push({ ...item, startMinutes, endMinutes, column });
    return result;
  }, []);
  const columnCount = Math.max(1, ...placements.map((item) => item.column + 1));
  return <View style={{ marginTop: 12, marginBottom: 8 }}>
    {allDayItems.length > 0 && <View style={{ marginBottom: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.secondarySurface }}><Text style={{ color: theme.colors.primaryText, fontSize: 11, fontWeight: '800', marginBottom: 6 }}>終日の予定</Text>{allDayItems.map((item) => { const content = <View key={`all-day-${item.id}`} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.colors.border }}><Text style={{ color: theme.colors.primaryText, fontSize: 13, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: theme.colors.secondaryText, fontSize: 10, marginTop: 2 }}>{item.meta}</Text></View>; return item.onPress ? <Pressable key={`all-day-press-${item.id}`} onPress={item.onPress}>{content}</Pressable> : content; })}</View>}
    {showHeading && <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}><Text style={[styles.sectionTitle, { color: isDark ? '#F4F7FC' : theme.colors.primaryText }]}>今日の流れ</Text><Text style={{ color: theme.colors.primaryAccent, fontSize: isDark ? 12 : 11, fontWeight: '800' }}>{date === currentDate ? '今日のタイムライン' : '1日の予定'}</Text></View>}
    <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: designMode === 'minimal' || isDark ? 16 : 18, overflow: 'hidden', height: timelineHeight, position: 'relative' }}>
      {timelineHours.map((hour) => {
        const isCurrentHour = date === currentDate && now.getHours() === hour;
        const hourItems = timed.filter((item) => Math.floor(parseClock(item.time!) / 60) === hour);
        return <View key={`timeline-hour-${hour}`} style={{ flexDirection: 'row', height: hourHeight, minHeight: hourHeight, borderBottomColor: theme.colors.border, borderBottomWidth: 1 }}>
          <View style={{ width: 66, paddingTop: 11, alignItems: 'center' }}><Text style={{ color: isCurrentHour ? theme.colors.primaryAccent : theme.colors.secondaryText, fontSize: isDark ? 12 : 11, fontWeight: '700' }}>{String(hour).padStart(2, '0')}:00</Text></View>
          <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: theme.colors.border, paddingBottom: hourItems.length > 0 ? 7 : 0 }}>
            <View style={{ marginTop: 23, borderTopWidth: 1, borderTopColor: isCurrentHour ? theme.colors.primaryAccent : theme.colors.border, opacity: isCurrentHour ? 0.9 : 0.65 }} />
          </View>
        </View>;
      })}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 66, right: 0, top: 0, bottom: 0 }}>
      {placements.map((item) => {
        const accent = item.kind === 'plan' ? theme.colors.primaryAccent : item.kind === 'external' ? theme.colors.secondaryAccent : item.kind === 'done' ? theme.colors.secondaryText : categoryColors[tasks.find((task) => `task-${task.id}` === item.id)?.category ?? categories[0]!];
        const top = ((item.startMinutes - axisStartMinutes) / 60) * hourHeight + 4;
        const height = Math.max(designMode === 'chic' ? 96 : item.kind === 'external' ? 68 : 58, ((item.endMinutes - item.startMinutes) / 60) * hourHeight - 8);
        const content = <View style={{ flex: 1, padding: designMode === 'chic' ? 10 : 7, borderLeftWidth: 4, borderLeftColor: accent, borderRadius: 10, backgroundColor: theme.colors.secondarySurface, opacity: item.kind === 'done' ? 0.58 : 1, justifyContent: 'flex-start' }}><Text style={{ color: accent, fontSize: 10, lineHeight: 12, fontWeight: '900' }}>{item.time}</Text><Text numberOfLines={designMode === 'chic' ? 3 : 2} ellipsizeMode="tail" style={{ color: theme.colors.primaryText, fontSize: designMode === 'chic' ? 13 : 14, lineHeight: designMode === 'chic' ? 18 : 17, fontWeight: '800', marginTop: 2, flexShrink: 1 }}>{item.kind === 'done' ? '✓ ' : ''}{item.title}</Text></View>;
        const card = item.onPress ? <Pressable onPress={item.onPress} style={{ flex: 1 }}>{content}</Pressable> : <View style={{ flex: 1 }}>{content}</View>;
        return <View key={`timeline-item-${item.id}`} style={{ position: 'absolute', top, left: `${(item.column * 100) / columnCount}%`, width: `${100 / columnCount}%`, height, paddingHorizontal: 4 }}>{card}</View>;
      })}
      </View>
    </View>
  </View>;
}

export function CalendarPlanActions({ plan, isDark, onEdit, onDelete, onOpenMap }: { plan: DeparturePlan; isDark: boolean; onEdit: (plan: DeparturePlan) => void; onDelete: (id: string) => void; onOpenMap: (plan: DeparturePlan) => void }) {
  const theme = getThemeTokens(isDark ? 'dark' : 'minimal').colors;
  const buttonStyle = { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' as const, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.secondarySurface };
  return <View style={[styles.scheduleAgendaActions, { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }]}>
    {plan.destination?.trim() && <Pressable hitSlop={6} style={buttonStyle} onPress={(event) => { event.stopPropagation(); onOpenMap(plan); }}><Text style={{ color: theme.primaryAccent, fontSize: 10, fontWeight: '900' }}>地図</Text></Pressable>}
    <Pressable hitSlop={6} style={buttonStyle} onPress={(event) => { event.stopPropagation(); onEdit(plan); }}><Text style={{ color: theme.primaryText, fontSize: 10, fontWeight: '900' }}>編集</Text></Pressable>
    {plan.id && <Pressable hitSlop={6} style={[buttonStyle, { borderColor: isDark ? '#754657' : '#E3B9BF', backgroundColor: isDark ? '#35222D' : '#FFF7F7' }]} onPress={(event) => { event.stopPropagation(); onDelete(plan.id!); }}><Text style={{ color: isDark ? '#FF8F9C' : '#B85060', fontSize: 10, fontWeight: '900' }}>削除</Text></Pressable>}
  </View>;
}

export function ScheduleFilterChips({ value, designMode, chicPalette, onChange, compact = false }: { value: 'all' | 'tasks' | 'plans'; designMode: DesignMode; chicPalette?: ChicThemePalette; onChange: (value: 'all' | 'tasks' | 'plans') => void; compact?: boolean }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  return <View style={[styles.scheduleFilterRow, compact && styles.scheduleFilterRowInCalendar, designMode === 'dark' && styles.darkSurface, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]}>{([['all', 'すべて'], ['tasks', 'やること'], ['plans', '予定']] as const).map(([id, label]) => <Pressable key={id} onPress={() => onChange(id)} style={[styles.scheduleFilterChip, value === id && styles.scheduleFilterChipActive, value === id && designMode === 'minimal' && { backgroundColor: theme.colors.primaryAccent, borderColor: theme.colors.primaryAccent }, value === id && designMode === 'dark' && styles.scheduleFilterChipActiveDark, value === id && designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.accent, borderColor: chicPalette.accent }]}><Text style={[styles.scheduleFilterText, designMode === 'dark' && { color: theme.colors.secondaryText, fontSize: 13 }, value === id && styles.scheduleFilterTextActive, value === id && designMode === 'minimal' && { color: '#FFFFFF' }, value === id && designMode === 'dark' && styles.scheduleFilterTextActiveDark, value === id && designMode === 'chic' && chicPalette && { color: chicPalette.onAccent }, value !== id && designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{label}</Text></Pressable>)}</View>;
}

export function TaskScheduleCalendar({ tasks, plans, externalEvents, now, designMode, chicPattern, chicPalette, planTier, focusDate, calendarMarks, onSetCalendarMark, onPremium, onEditTask, onDeleteTask, onEditPlan, onDeletePlan, onOpenMap, behaviorEvents, departureCheckIns, departurePreparationStatuses }: { tasks: Task[]; plans: DeparturePlan[]; externalEvents: Calendar.Event[]; now: Date; designMode: DesignMode; chicPattern: ChicPattern; chicPalette?: ChicThemePalette; planTier: PlanTier; focusDate?: string; calendarMarks: CalendarMarks; onSetCalendarMark: (date: string, mark?: string) => void; onPremium: (featureId?: PremiumGuideFeatureId) => void; onEditTask: (task: Task) => void; onDeleteTask: (id: string) => void; onEditPlan: (plan: DeparturePlan) => void; onDeletePlan: (id: string) => void; onOpenMap: (plan: DeparturePlan) => void; behaviorEvents: BehaviorEvent[]; departureCheckIns: DepartureCheckIn[]; departurePreparationStatuses: Record<string, DeparturePreparationStatus> }) {
  const theme = getThemeTokens(designMode, chicPalette?.id ?? 'cool');
  const isDark = designMode === 'dark';
  const designPlanAccent = designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent;
  const designExternalAccent = designMode === 'chic' && chicPalette ? chicPalette.patternStripe : theme.colors.secondaryAccent;
  const categoryColors = Object.fromEntries(categories.map((category) => [category, designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent])) as Record<Category, string>;
  const chicAgendaStyle = designMode === 'chic' && chicPalette ? { backgroundColor: chicPalette.taskBackground, borderColor: chicPalette.border } : undefined;
  const [monthDate, setMonthDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(dateKey(now));
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'tasks' | 'plans'>('all');
  useEffect(() => {
    if (!focusDate) return;
    const date = dateForReminder(focusDate, '12:00');
    setMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedDate(normalizePlanDate(focusDate));
  }, [focusDate]);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const leading = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const taskDates = (task: Task) => Array.from(new Set([
    task.scheduledDate ?? dateKey(now),
    task.deadlineDate,
    task.remindDate,
    task.done && task.completedAt ? dateKey(task.completedAt) : undefined,
  ].filter((value): value is string => Boolean(value))));
  const selectedTasks = tasks.filter((task) => isRegularVisibleTask(task) && !task.done && taskDates(task).includes(selectedDate));
  const selectedCompletedTasks = tasks.filter((task) => isRegularVisibleTask(task) && task.done && taskDates(task).includes(selectedDate));
  const selectedPlans = plans.filter((item) => isPlanOnDate(item, selectedDate));
  const selectedExternalEvents = externalEvents.filter((event) => dateKey(new Date(event.startDate)) === selectedDate);
  const calendarPlanDisplayLimit = planTier === 'premium' ? 30 : 3;
  const visibleSelectedTasks = scheduleFilter === 'plans' ? [] : selectedTasks;
  const visibleSelectedCompletedTasks = scheduleFilter === 'plans' ? [] : selectedCompletedTasks;
  const selectedPlanEntries = scheduleFilter === 'tasks' ? [] : selectedPlans;
  const visibleSelectedPlans = selectedPlanEntries.slice(0, calendarPlanDisplayLimit);
  const hiddenSelectedPlanCount = Math.max(0, selectedPlanEntries.length - visibleSelectedPlans.length);
  const visibleSelectedExternalEvents = scheduleFilter === 'tasks' ? [] : selectedExternalEvents;
  const planDayState = useMemo(() => {
    const checkIns = new Set<string>();
    const departed = new Set<string>();
    departureCheckIns.forEach((record) => checkIns.add(`${record.planId}:${normalizePlanDate(record.date)}`));
    behaviorEvents.forEach((event) => {
      if (event.type === 'departure_started' && event.departurePlanId && event.departurePlanDate) {
        departed.add(`${event.departurePlanId}:${normalizePlanDate(event.departurePlanDate)}`);
      }
    });
    return { checkIns, departed };
  }, [behaviorEvents, departureCheckIns]);
  const getPlanStatus = (item: DeparturePlan) => {
    if (!isArrivalReversePlan(item) || planTier !== 'premium') return undefined;
    const key = item.id ? `${item.id}:${planDateKey(item)}` : undefined;
    const checkIn = Boolean(key && planDayState.checkIns.has(key));
    const departed = Boolean(key && planDayState.departed.has(key));
    const prepared = item.id ? departurePreparationStatuses[item.id] : undefined;
    return checkIn ? '出発済み' : departed ? '移動中' : prepared === 'prepared' ? '準備完了' : prepared === 'preparing' ? '準備中' : '未準備';
  };
  const getStatusPalette = (status: string) => status === '出発済み'
      ? { backgroundColor: isDark ? '#203A35' : '#DDF3E5', color: isDark ? '#7ED6C4' : '#27714A' }
    : status === '移動中'
      ? { backgroundColor: isDark ? '#26365F' : '#E8E0FA', color: isDark ? '#8EA6FF' : '#5A3E9B' }
      : status === '準備完了'
        ? { backgroundColor: isDark ? '#20334D' : '#E4F0FF', color: isDark ? '#8EA6FF' : '#356AA5' }
        : status === '準備中'
          ? { backgroundColor: isDark ? '#3A3323' : '#FFF0D6', color: isDark ? '#E8B878' : '#9A641E' }
          : { backgroundColor: isDark ? '#20293A' : '#F0EDF2', color: isDark ? '#9CA8BC' : '#6D6672' };
  const renderPlanAgenda = (item: DeparturePlan, index: number) => {
    const mode = getDeparturePlanMode(item);
    const status = getPlanStatus(item);
    const palette = status && designMode === 'chic' && chicPalette
      ? { backgroundColor: chicPalette.accentSoft, color: chicPalette.accentStrong }
      : status ? getStatusPalette(status) : undefined;
    const canUseReversePlan = isArrivalReversePlan(item) && planTier === 'premium';
    const endSuffix = item.endAt ? ` 〜 ${item.endAt}` : '';
    const scheduledTime = getPlanScheduledTime(item);
    const timeLabel = item.allDay ? '終日' : scheduledTime ? `${scheduledTime}${endSuffix}` : '終日';
    const meta = mode === 'calendar_only'
      ? timeLabel
      : mode === 'departure_reminder'
        ? `出発時刻 ・ ${timeLabel}`
        : canUseReversePlan
          ? `到着 ${item.arrival} ・ 出発 ${formatLiveTime(getDepartureMoments(item).leave)}`
          : '到着からの逆算 ・ Premium';
    return <Pressable key={item.id ?? `${item.title}-${index}`} style={[styles.scheduleAgendaItem, isDark && styles.scheduleAgendaItemDark, chicAgendaStyle]} onPress={() => onEditPlan(item)}>
      <View style={[styles.scheduleAgendaDot, { backgroundColor: designPlanAccent }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{item.title}</Text>
        <View style={styles.schedulePlanMetaRow}>
          <Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{meta}</Text>
          {status && palette && <View style={[styles.scheduleStatusBadge, { backgroundColor: palette.backgroundColor }]}><Text style={[styles.scheduleStatusBadgeText, { color: palette.color }]}>{status}</Text></View>}
        </View>
      </View>
      {designMode === 'chic' && chicPalette ? <DesignCalendarPlanActions plan={item} chicPalette={chicPalette} onEdit={onEditPlan} onDelete={onDeletePlan} onOpenMap={onOpenMap} /> : <CalendarPlanActions plan={item} isDark={isDark} onEdit={onEditPlan} onDelete={onDeletePlan} onOpenMap={onOpenMap} />}
    </Pressable>;
  };
  const moveMonth = (amount: number) => {
    const next = new Date(year, month + amount, 1);
    setMonthDate(next);
    setSelectedDate(dateKey(next));
  };
  const showingCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const returnToToday = () => {
    setMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(dateKey(now));
  };

  if (!hasPremiumAccess(planTier, 'long_range_calendar')) {
    const freeDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index);
      return { date, key: dateKey(date) };
    });
    const freeSelected = freeDates.some((item) => item.key === selectedDate) ? selectedDate : freeDates[0]!.key;
    const freeTasks = tasks.filter((task) => isRegularVisibleTask(task) && !task.done && taskDates(task).includes(freeSelected));
    const freeCompletedTasks = tasks.filter((task) => isRegularVisibleTask(task) && task.done && taskDates(task).includes(freeSelected));
    const freePlans = plans.filter((item) => isPlanOnDate(item, freeSelected));
    const visibleFreeTasks = scheduleFilter === 'plans' ? [] : freeTasks;
    const visibleFreeCompletedTasks = scheduleFilter === 'plans' ? [] : freeCompletedTasks;
    const freePlanEntries = scheduleFilter === 'tasks' ? [] : freePlans;
    const visibleFreePlans = freePlanEntries.slice(0, calendarPlanDisplayLimit);
    const hiddenFreePlanCount = Math.max(0, freePlanEntries.length - visibleFreePlans.length);
    return <>
      <View style={[styles.scheduleCalendarCard, styles.scheduleCalendarCardWide, designMode !== 'chic' && styles.scheduleCalendarCardMinimal, isDark && styles.darkSurface, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: designMode !== 'chic' ? 16 : theme.radius.large }]}>
        <View style={[styles.scheduleCalendarHeader, { borderBottomColor: theme.colors.border }]}><View><Text style={[styles.scheduleMonthTitle, isDark && styles.darkCalendarText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>これから7日間</Text><Text style={[styles.scheduleMonthCopy, isDark && styles.darkCalendarAccent, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>今日から6日後までの予定</Text></View><Pressable onPress={() => onPremium('month')}><Text style={[styles.scheduleAgendaEdit, { color: designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }, isDark && styles.darkCalendarAccent]}>月表示 Premium</Text></Pressable></View>
        <ScheduleFilterChips value={scheduleFilter} designMode={designMode} chicPalette={chicPalette} onChange={setScheduleFilter} compact />
        <View style={styles.scheduleGrid}>{freeDates.map(({ date, key }) => {
          const selected = key === freeSelected;
          const taskCount = scheduleFilter === 'plans' ? 0 : tasks.filter((task) => isRegularVisibleTask(task) && taskDates(task).includes(key)).length;
          const planCount = scheduleFilter === 'tasks' ? 0 : plans.filter((item) => isPlanOnDate(item, key)).length;
          const count = taskCount + planCount;
        return <Pressable key={key} style={[styles.scheduleDayCell, styles.scheduleWeekDayCell, isDark && styles.scheduleDayCellDark, selected && styles.scheduleDayCellSelected, selected && { backgroundColor: designMode === 'chic' && chicPalette ? chicPalette.accentSoft : theme.colors.softAccent, borderColor: designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }]} onPress={() => setSelectedDate(key)}><Text style={[styles.scheduleDayNumber, isDark && styles.darkBodyText, date.getDay() === 0 && styles.scheduleSundayNumber, date.getDay() === 6 && styles.scheduleSaturdayNumber, selected && styles.scheduleSelectedNumber, selected && isDark && styles.scheduleSelectedNumberDark, selected && { color: designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent }]}>{date.getMonth() + 1}/{date.getDate()}</Text>{calendarMarks[key] && <Text style={[styles.scheduleCalendarMark, { color: designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent }]}>{calendarMarks[key]}</Text>}{count > 0 && <Text style={[styles.scheduleMoreText, isDark && styles.darkMutedText, selected && styles.scheduleMoreTextSelected, selected && { color: designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.colors.primaryAccent }]}>{count}件</Text>}</Pressable>;
        })}</View>
      </View>
      <CalendarMarkPicker date={freeSelected} mark={calendarMarks[freeSelected]} onSet={onSetCalendarMark} designMode={designMode} chicPalette={chicPalette} />
      <View style={[styles.scheduleAgendaHeader, isDark && styles.darkPanel, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{formatJapaneseDateKey(freeSelected)} の予定</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{visibleFreeTasks.length + visibleFreeCompletedTasks.length + visibleFreePlans.length}件</Text></View>
      {visibleFreeTasks.map((task) => <Pressable key={task.id} style={[styles.scheduleAgendaItem, isDark && styles.scheduleAgendaItemDark, chicAgendaStyle]} onPress={() => onEditTask(task)}><View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} /><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{task.title}</Text><Text style={[styles.scheduleAgendaMeta, { color: designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.colors.secondaryText }, isDark && styles.darkAccentText]}>{task.category}</Text></View><Text style={[styles.scheduleAgendaEdit, { color: designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }, isDark && styles.darkAccentText]}>編集 ›</Text></Pressable>)}
      {visibleFreeCompletedTasks.map((task) => <View key={`free-completed-${task.id}`} style={[styles.scheduleAgendaItem, styles.scheduleCompletedAgendaItem, isDark && styles.scheduleCompletedAgendaItemDark, chicAgendaStyle]}><View style={[styles.scheduleAgendaDot, styles.scheduleCompletedDot]} /><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.scheduleAgendaTitle, styles.scheduleCompletedTitle, isDark && styles.scheduleCompletedTitleDark]}>✓ {task.title}</Text><Text style={[styles.scheduleAgendaMeta, styles.scheduleCompletedMeta, isDark && styles.scheduleCompletedMetaDark]}>完了したタスク ・ {task.completedAt ? formatLiveTime(new Date(task.completedAt)) : '記録あり'}</Text></View><Text style={[styles.scheduleCompletedLabel, isDark && styles.scheduleCompletedLabelDark]}>完了</Text></View>)}
      {visibleFreePlans.map(renderPlanAgenda)}
      {hiddenFreePlanCount > 0 && <Pressable style={[styles.departureEmpty, isDark && styles.darkEmptyCard]} onPress={() => onPremium('month')}><Text style={[styles.emptyCopy, isDark && styles.darkMutedText, isDark && styles.darkReadableCopy]}>無料版は1日3件まで表示できます。残り{hiddenFreePlanCount}件はPremiumで確認できます。</Text></Pressable>}
      {visibleFreeTasks.length === 0 && visibleFreeCompletedTasks.length === 0 && visibleFreePlans.length === 0 && <View style={[styles.departureEmpty, isDark && styles.darkEmptyCard]}><Text style={[styles.emptyCopy, isDark && styles.darkMutedText, isDark && styles.darkReadableCopy]}>この日はまだ空いています。</Text></View>}
    </>;
  }

  return <>
      <View style={[styles.scheduleCalendarCard, styles.scheduleMonthCalendarCardWide, designMode !== 'chic' && styles.scheduleCalendarCardMinimal, isDark && styles.darkSurface, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: designMode !== 'chic' ? 16 : theme.radius.large }]}>
        <View style={[styles.scheduleCalendarHeader, { borderBottomColor: theme.colors.border }]}>
          <Pressable style={[styles.scheduleMonthArrow, isDark && styles.scheduleMonthArrowDark]} onPress={() => moveMonth(-1)}><Text style={[styles.scheduleMonthArrowText, isDark && styles.scheduleMonthArrowTextDark]}>‹</Text></Pressable>
        <View><Text style={[styles.scheduleMonthTitle, isDark && styles.darkCalendarText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{year}年 {month + 1}月</Text><Text style={[styles.scheduleMonthCopy, isDark && styles.darkCalendarAccent, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>予定をまとめて見渡す</Text></View>
        <View style={styles.scheduleMonthNavigation}>
          {!showingCurrentMonth && <Pressable accessibilityRole="button" accessibilityLabel="今日に戻る" style={[styles.scheduleTodayButton, { backgroundColor: designMode === 'chic' && chicPalette ? chicPalette.cardTint : theme.colors.secondarySurface, borderColor: designMode === 'chic' && chicPalette ? chicPalette.border : theme.colors.border }]} onPress={returnToToday}><Text style={[styles.scheduleTodayButtonText, { color: designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent }]}>今日</Text></Pressable>}
          <Pressable style={[styles.scheduleMonthArrow, isDark && styles.scheduleMonthArrowDark]} onPress={() => moveMonth(1)}><Text style={[styles.scheduleMonthArrowText, isDark && styles.scheduleMonthArrowTextDark]}>›</Text></Pressable>
        </View>
      </View>
      <ScheduleFilterChips value={scheduleFilter} designMode={designMode} chicPalette={chicPalette} onChange={setScheduleFilter} compact />
      <View style={styles.scheduleWeekRow}>{['日','月','火','水','木','金','土'].map((label) => <Text key={label} style={[styles.scheduleWeekLabel, isDark && styles.darkCalendarAccent]}>{label}</Text>)}</View>
      <View style={styles.scheduleGrid}>{cells.map((date, index) => {
        if (!date) return <View key={`empty-${index}`} style={[styles.scheduleDayCell, styles.scheduleMonthDayCell, designMode === 'minimal' && styles.scheduleDayCellMinimal, isDark && styles.scheduleDayCellDark, { backgroundColor: designMode === 'chic' && chicPalette ? chicPalette.surfaceSubtle : theme.colors.secondarySurface, borderColor: designMode === 'chic' && chicPalette ? chicPalette.border : theme.colors.border }]} />;
        const key = dateKey(date);
        const dayTasks = scheduleFilter === 'plans' ? [] : tasks.filter((task) => isRegularVisibleTask(task) && !task.done && taskDates(task).includes(key));
        const dayCompletedTasks = scheduleFilter === 'plans' ? [] : tasks.filter((task) => isRegularVisibleTask(task) && task.done && taskDates(task).includes(key));
        const dayPlans = scheduleFilter === 'tasks' ? [] : plans.filter((item) => isPlanOnDate(item, key));
        const dayExternalEvents = scheduleFilter === 'tasks' ? [] : externalEvents.filter((event) => dateKey(new Date(event.startDate)) === key);
        // Rhythm内予定とAppleカレンダー予定は、月表示では同じ「予定」として扱う。
        // 予定を先頭に維持しながら、最大4本まで読めるようにする。
        const dayPlanCount = dayPlans.length + dayExternalEvents.length;
        const dayBars = [
          ...dayPlans.map((item) => ({ id: `plan-${item.id ?? item.title}`, kind: 'plan' as const, title: item.title })),
          ...dayExternalEvents.map((event) => ({ id: `external-${event.id}`, kind: 'plan' as const, title: event.title || 'カレンダー予定' })),
          ...dayTasks.map((task) => ({ id: `task-${task.id}`, kind: 'task' as const, title: task.title })),
          ...dayCompletedTasks.map((task) => ({ id: `completed-${task.id}`, kind: 'completed' as const, title: task.title })),
        ];
        const visibleBars = dayBars.slice(0, 4);
        const hiddenBarCount = Math.max(0, dayBars.length - visibleBars.length);
        const strengthForCount = (count: number) => count >= 4 ? 4 : Math.max(1, count);
        const bandStyleFor = (kind: (typeof visibleBars)[number]['kind']) => {
          const count = kind === 'plan' ? dayPlanCount : kind === 'task' ? dayTasks.length : dayCompletedTasks.length;
          const strength = strengthForCount(count);
          const intensity = [0, 0.14, 0.21, 0.29, 0.38][strength]!;
          const isChic = designMode === 'chic' && Boolean(chicPalette);
          if (kind === 'completed') {
            const neutral = isChic ? chicPalette!.textSecondary : theme.colors.secondaryText;
            return {
              backgroundColor: withCalendarBandAlpha(neutral, 0.08 + intensity * 0.45),
              borderColor: withCalendarBandAlpha(neutral, 0.18 + intensity * 0.48),
              color: neutral,
            };
          }
          const accent = kind === 'plan'
            ? (isChic ? chicPalette!.accent : theme.colors.primaryAccent)
            : (isChic ? chicPalette!.accentStrong : theme.colors.secondaryAccent);
          return {
            backgroundColor: withCalendarBandAlpha(accent, 0.10 + intensity),
            borderColor: withCalendarBandAlpha(accent, 0.24 + intensity * 0.78),
            color: isChic ? chicPalette!.accentStrong : accent,
          };
        };
        const selected = key === selectedDate;
        const today = key === dateKey(now);
        return <Pressable key={key} style={[styles.scheduleDayCell, styles.scheduleMonthDayCell, designMode === 'minimal' && styles.scheduleDayCellMinimal, isDark && styles.scheduleDayCellDark, today && styles.scheduleDayCellToday, selected && styles.scheduleDayCellSelected, selected && { backgroundColor: designMode === 'chic' && chicPalette ? chicPalette.accentSoft : theme.colors.softAccent, borderColor: designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }]} onPress={() => setSelectedDate(key)}>
          <Text style={[styles.scheduleDayNumber, isDark && styles.darkBodyText, date.getDay() === 0 && styles.scheduleSundayNumber, date.getDay() === 6 && styles.scheduleSaturdayNumber, today && styles.scheduleTodayNumber, selected && styles.scheduleSelectedNumber, selected && isDark && styles.scheduleSelectedNumberDark, selected && { color: designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent }]}>{date.getDate()}</Text>
          {calendarMarks[key] && <Text style={[styles.scheduleCalendarMark, styles.scheduleMonthCalendarMark, { color: designMode === 'chic' && chicPalette ? chicPalette.accentStrong : theme.colors.primaryAccent }]}>{calendarMarks[key]}</Text>}
          <View style={styles.scheduleEventStack}>
            {visibleBars.map((item) => {
              const bandStyle = bandStyleFor(item.kind);
              return <View key={item.id} style={[styles.scheduleEventBar, { backgroundColor: bandStyle.backgroundColor, borderColor: bandStyle.borderColor, borderWidth: 1 }, selected && styles.scheduleEventBarSelected]}><Text numberOfLines={1} style={[styles.scheduleEventBarText, { color: bandStyle.color }]}>{item.kind === 'completed' ? '✓ ' : ''}{item.title}</Text></View>;
            })}
            {hiddenBarCount > 0 && <Text style={[styles.scheduleMoreText, { color: designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.colors.secondaryText }]}>{`＋${hiddenBarCount}`}</Text>}
          </View>
        </Pressable>;
      })}</View>
      <View style={styles.scheduleLegend}><Text style={[styles.scheduleLegendText, isDark && styles.darkAccentText, designMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{'色付き帯：タスク'}</Text><Text style={[styles.scheduleLegendPlan, isDark && styles.darkAccentText, designMode === 'chic' && chicPalette && { color: chicPalette.accentStrong }]}>{'アクセント帯：出発予定'}</Text></View>
    </View>

    <CalendarMarkPicker date={selectedDate} mark={calendarMarks[selectedDate]} onSet={onSetCalendarMark} designMode={designMode} chicPalette={chicPalette} />
    <View style={[styles.scheduleAgendaHeader, isDark && styles.darkPanel, designMode === 'chic' && chicPalette && { backgroundColor: chicPalette.surfaceSubtle, borderColor: chicPalette.border }]}><Text style={[styles.sectionTitle, isDark && styles.darkBodyText, designMode === 'chic' && chicPalette && { color: chicPalette.textPrimary }]}>{formatJapaneseDateKey(selectedDate)} の予定</Text><Text style={[styles.sectionSub, isDark && styles.darkMutedText, designMode === 'chic' && chicPalette && { color: chicPalette.textSecondary }]}>{visibleSelectedTasks.length + visibleSelectedCompletedTasks.length + visibleSelectedPlans.length + visibleSelectedExternalEvents.length}件</Text></View>
    {visibleSelectedTasks.length === 0 && visibleSelectedCompletedTasks.length === 0 && visibleSelectedPlans.length === 0 && visibleSelectedExternalEvents.length === 0 ? <View style={[styles.departureEmpty, isDark && styles.darkEmptyCard]}><Text style={[styles.emptyCopy, isDark && styles.darkMutedText, isDark && styles.darkReadableCopy]}>この日はまだ空いています。</Text></View> : <>
      {visibleSelectedTasks.map((task) => {
        const overdue = Boolean(task.deadlineDate && getTargetDate(task) && getTargetDate(task)!.getTime() < now.getTime());
        return <Pressable key={task.id} style={[styles.scheduleAgendaItem, isDark && styles.scheduleAgendaItemDark, chicAgendaStyle, overdue && styles.scheduleAgendaDanger, overdue && isDark && styles.scheduleAgendaDangerDark]} onPress={() => onEditTask(task)}>
          <View style={[styles.scheduleAgendaDot, { backgroundColor: categoryColors[task.category] }]} />
          <View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{task.title}</Text><Text style={[styles.scheduleAgendaMeta, isDark && styles.darkAccentText]}>{task.category} ・ {task.deadlineDate ? `期限 ${task.deadlineTime ?? ''}` : task.repeatRule && task.repeatRule !== 'none' ? 'ルーティン' : `リマインド ${task.remindAt ?? ''}`}</Text></View>
          <View style={styles.scheduleAgendaActions}><Text style={[styles.scheduleAgendaEdit, { color: overdue ? theme.colors.danger : designMode === 'chic' && chicPalette ? chicPalette.accent : theme.colors.primaryAccent }, isDark && styles.darkAccentText]}>{overdue ? '期限超過' : '編集 ›'}</Text><Pressable onPress={(event) => { event.stopPropagation(); onDeleteTask(task.id); }}><Text style={styles.timelineTaskDelete}>削除</Text></Pressable></View>
        </Pressable>;
      })}
      {visibleSelectedCompletedTasks.map((task) => <View key={`completed-${task.id}`} style={[styles.scheduleAgendaItem, styles.scheduleCompletedAgendaItem, isDark && styles.scheduleCompletedAgendaItemDark, chicAgendaStyle]}><View style={[styles.scheduleAgendaDot, styles.scheduleCompletedDot]} /><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.scheduleAgendaTitle, styles.scheduleCompletedTitle, isDark && styles.scheduleCompletedTitleDark]}>✓ {task.title}</Text><Text style={[styles.scheduleAgendaMeta, styles.scheduleCompletedMeta, isDark && styles.scheduleCompletedMetaDark]}>完了したタスク ・ {task.completedAt ? formatLiveTime(new Date(task.completedAt)) : '記録あり'}</Text></View><Text style={[styles.scheduleCompletedLabel, isDark && styles.scheduleCompletedLabelDark]}>完了</Text></View>)}
      {visibleSelectedPlans.map(renderPlanAgenda)}
      {hiddenSelectedPlanCount > 0 && <View style={[styles.departureEmpty, isDark && styles.darkEmptyCard]}><Text style={[styles.emptyCopy, isDark && styles.darkMutedText, isDark && styles.darkReadableCopy]}>この日は{calendarPlanDisplayLimit}件まで表示しています。</Text></View>}
      {visibleSelectedExternalEvents.map((event) => <View key={`external-agenda-${event.id}`} style={[styles.scheduleAgendaItem, isDark && styles.scheduleAgendaItemDark, chicAgendaStyle]}><View style={[styles.scheduleAgendaDot, { backgroundColor: designExternalAccent }]} /><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.scheduleAgendaTitle, isDark && styles.darkBodyText]}>{event.title || 'カレンダー予定'}</Text><Text style={[styles.scheduleAgendaMeta, { color: designMode === 'chic' && chicPalette ? chicPalette.textSecondary : theme.colors.secondaryText }, isDark && styles.darkAccentText]}>{event.allDay ? '終日' : formatLiveTime(new Date(event.startDate))}</Text></View></View>)}
    </>}
  </>;
}
