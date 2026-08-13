import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { ChicPattern } from '../theme';
import { hasPremiumAccess, isWithinFreeHistory, PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { BehaviorEvent } from '../behaviorEvents';
import { DepartureCheckIn } from '../departureCheckIn';
import { FocusSession } from '../focusSession';
import { RecoveryRecord } from '../recovery';
import { CalendarMarks, DeparturePlan, MonthlyReview, Task, ThemeMode, WishMonthMap } from '../types';
import { normalizeMonthlyReview } from '../features/wish/wishUtils';

export function HistoryScreen({ tasks, wishMonths, calendarMarks, onSetCalendarMark, recoveryHistory, focusSessions, departureCheckIns, departurePlans, behaviorEvents, completionIcon, designMode, chicPattern, planTier, onPremium, onSaveTemplate, onRestore, onSaveDailyReview, onUpdateReview, onDeleteReview, styles, helpers, components }: { tasks: Task[]; wishMonths: WishMonthMap; calendarMarks: CalendarMarks; onSetCalendarMark: (date: string, mark?: string) => void; recoveryHistory: RecoveryRecord[]; focusSessions: FocusSession[]; departureCheckIns: DepartureCheckIn[]; departurePlans: DeparturePlan[]; behaviorEvents: BehaviorEvent[]; completionIcon: string; designMode: ThemeMode; chicPattern: ChicPattern; planTier: PlanTier; onPremium: (featureId?: PremiumGuideFeatureId) => void; onSaveTemplate: (task: Task) => void; onRestore: (id: string) => void; onSaveDailyReview: (monthKey: string, draft: MonthlyReview) => void; onUpdateReview: (monthKey: string, reviewKey: string, updates: Partial<MonthlyReview>) => void; onDeleteReview: (monthKey: string, reviewKey: string) => void; styles: any; helpers: any; components: any }) {
  const { dateKey, formatLiveTime } = helpers;
  const { AchievementVessel, CalendarMarkPicker } = components;
  const now = new Date();
  const isDark = designMode === 'dark';
  const [selectedKey, setSelectedKey] = useState(dateKey(now));
  const [historyMonthDate, setHistoryMonthDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [historySearch, setHistorySearch] = useState('');
  const year = historyMonthDate.getFullYear();
  const month = historyMonthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const premiumHistory = hasPremiumAccess(planTier, 'full_history');
  const [selectedReview, setSelectedReview] = useState<MonthlyReview | null>(null);
  const [selectedReviewPhotoIndex, setSelectedReviewPhotoIndex] = useState(0);
  const [editingReview, setEditingReview] = useState<{ monthKey: string; reviewKey: string; review: MonthlyReview } | null>(null);
  const [reviewEditNote, setReviewEditNote] = useState('');
  const [reviewEditMemo, setReviewEditMemo] = useState('');
  const [journalDraft, setJournalDraft] = useState<MonthlyReview>({ date: dateKey(now), photos: [], photo: '', shortNote: '', memo: '', satisfaction: 0 });
  const historyTasks = premiumHistory ? tasks : tasks.filter((task) => task.completedAt && isWithinFreeHistory(task.completedAt, now));
  const completedByDay = historyTasks.reduce<Record<string, Task[]>>((result, task) => {
    if (!task.completedAt) return result;
    const key = dateKey(task.completedAt);
    result[key] = [...(result[key] ?? []), task];
    return result;
  }, {});
  const selectedTasks = !premiumHistory ? historyTasks.filter((task) => task.done && task.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()) : historySearch.trim() ? historyTasks.filter((task) => task.done && task.completedAt && task.title.toLowerCase().includes(historySearch.trim().toLowerCase())).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()) : completedByDay[selectedKey] ?? [];
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const moveHistoryMonth = (amount: number) => {
    const next = new Date(year, month + amount, 1);
    setHistoryMonthDate(next);
    setSelectedKey(dateKey(next));
  };
  const calendarTasks = premiumHistory ? tasks : tasks.filter((task) => task.completedAt?.startsWith(monthPrefix));
  const calendarCompletedByDay = calendarTasks.reduce<Record<string, Task[]>>((result, task) => {
    if (!task.completedAt) return result;
    const key = dateKey(task.completedAt);
    result[key] = [...(result[key] ?? []), task];
    return result;
  }, {});
  const reviewEntries = Object.entries(wishMonths).flatMap(([monthKey, monthState]) => {
    const reviews = monthState.reviews?.length ? monthState.reviews : (monthState.review && (monthState.review.photo || monthState.review.date || monthState.review.shortNote || monthState.review.memo || monthState.review.satisfaction) ? [monthState.review] : []);
    return reviews.map((review) => ({ monthKey, review, reviewKey: review.id ?? `${review.date ?? ''}|${review.shortNote ?? ''}|${review.memo ?? ''}|${review.satisfaction ?? 0}` }));
  }).filter((entry) => premiumHistory || entry.monthKey === monthPrefix);
  const reviewsByDay = reviewEntries.reduce<Record<string, MonthlyReview[]>>((result, entry) => {
    if (!entry.review.date) return result;
    result[entry.review.date] = [...(result[entry.review.date] ?? []), entry.review];
    return result;
  }, {});
  const completedWishesByDay = Object.values(wishMonths).flatMap((monthState) => monthState.wishes)
    .filter((wish) => wish.completed && wish.completedAt)
    .reduce<Record<string, Array<{ id: string; title: string }>>>((result, wish) => {
      const key = dateKey(wish.completedAt!);
      result[key] = [...(result[key] ?? []), { id: wish.id, title: wish.title }];
      return result;
    }, {});
  const departurePlansByDay = departurePlans.reduce<Record<string, DeparturePlan[]>>((result, plan) => {
    result[plan.date] = [...(result[plan.date] ?? []), plan];
    return result;
  }, {});
  const activityDays = new Set<string>([
    ...Object.keys(calendarCompletedByDay).filter((key) => (calendarCompletedByDay[key]?.length ?? 0) > 0),
    ...focusSessions.map((session) => dateKey(session.completedAt)),
    ...departureCheckIns.filter((record) => record.onTime).map((record) => record.date),
    ...Object.keys(reviewsByDay),
    ...Object.keys(completedWishesByDay),
  ]);
  const hasSevenDayStreak = (key: string) => {
    const target = new Date(`${key}T12:00:00`);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(target);
      date.setDate(target.getDate() - index);
      return activityDays.has(dateKey(date));
    }).every(Boolean);
  };
  const autoMarkForDay = (key: string) => {
    if ((reviewsByDay[key] ?? []).some((review) => Boolean(review.photo))) return '📸';
    if (hasSevenDayStreak(key)) return '🎉';
    if (departureCheckIns.some((record) => record.date === key && record.onTime)) return '🚶';
    if (focusSessions.some((session) => dateKey(session.completedAt) === key)) return '🎯';
    if ((completedWishesByDay[key] ?? []).length > 0) return '🌟';
    if ((departurePlansByDay[key] ?? []).length > 0) return '↗';
    return undefined;
  };
  const selectedReviewEntry = selectedReview ? reviewEntries.find((entry) => entry.review === selectedReview) : undefined;
  const selectedDayReviewEntry = reviewEntries.find((entry) => entry.review.date === selectedKey);
  const monthEntries = Object.entries(calendarCompletedByDay).filter(([key]) => key.startsWith(monthPrefix));
  const monthlyCount = monthEntries.reduce((sum, [, items]) => sum + items.length, 0);
  const activeDays = monthEntries.length;
  const bestDayCount = monthEntries.reduce((best, [, items]) => Math.max(best, items.length), 0);
  const monthlyFocusSessions = focusSessions.filter((session) => session.completedAt.startsWith(monthPrefix));
  const monthlyFocusMinutes = monthlyFocusSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const visibleRecoveryHistory = premiumHistory ? recoveryHistory : recoveryHistory.filter((record) => isWithinFreeHistory(record.occurredAt, now));
  const visibleFocusSessions = premiumHistory ? focusSessions : focusSessions.filter((session) => isWithinFreeHistory(session.completedAt, now));
  const visibleDepartureCheckIns = departureCheckIns.filter((record) => record.date.startsWith(monthPrefix));
  const visibleNotificationEvents = (premiumHistory ? behaviorEvents : behaviorEvents.filter((event) => isWithinFreeHistory(event.occurredAt, now))).filter((event) => event.type === 'notification_action').slice(0, 8);
  const departureBehaviorDetails = Object.values(behaviorEvents
    .filter((event) => event.type === 'departure_preparation_started' || event.type === 'departure_started')
    .filter((event) => (event.departurePlanDate ?? dateKey(event.occurredAt)).startsWith(monthPrefix))
    .reduce<Record<string, { title: string; date?: string; preparation?: BehaviorEvent; departure?: BehaviorEvent }>>((result, event) => {
      const key = `${event.departurePlanId ?? event.departurePlanTitleSnapshot ?? 'plan'}:${event.departurePlanDate ?? dateKey(event.occurredAt)}`;
      const current = result[key] ?? { title: event.departurePlanTitleSnapshot ?? '出発予定', date: event.departurePlanDate };
      if (event.type === 'departure_preparation_started') current.preparation = event;
      if (event.type === 'departure_started') current.departure = event;
      result[key] = current;
      return result;
    }, {})).slice(0, 8);
  const selectedDayReview = reviewsByDay[selectedKey]?.[0];
  const selectedJournalPhotos = journalDraft.photos?.filter(Boolean) ?? (journalDraft.photo ? [journalDraft.photo] : []);
  const maxJournalPhotos = planTier === 'premium' ? 3 : 1;
  const loadJournalDraft = (key: string) => {
    const existing = reviewsByDay[key]?.[0];
    setJournalDraft(existing ? normalizeMonthlyReview(existing) : { id: undefined, date: key, photo: '', photos: [], shortNote: '', memo: '', satisfaction: 0 });
  };
  const chooseJournalPhoto = async () => {
    if (selectedJournalPhotos.length >= maxJournalPhotos) {
      if (planTier !== 'premium') onPremium('month');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.78 });
    const uri = result.canceled ? undefined : result.assets?.[0]?.uri;
    if (!uri) return;
    setJournalDraft((current) => {
      const photos = [...(current.photos?.filter(Boolean) ?? (current.photo ? [current.photo] : [])), uri];
      return { ...current, photo: photos[0] ?? '', photos };
    });
  };
  const saveJournal = () => {
    const photos = journalDraft.photos?.filter(Boolean) ?? (journalDraft.photo ? [journalDraft.photo] : []);
    onSaveDailyReview(selectedKey.slice(0, 7), { ...journalDraft, id: selectedDayReview?.id ?? journalDraft.id, date: selectedKey, photo: photos[0] ?? '', photos, shortNote: journalDraft.shortNote?.trim() ?? '', memo: journalDraft.memo?.trim() ?? '' });
  };

  return (
    <>
      <Text style={[styles.hero, designMode === 'dark' && styles.darkPanel, designMode === 'dark' && styles.darkBodyText]}>{premiumHistory ? (designMode !== 'chic' ? '今月の記録' : '今月の小さな達成') : '1か月を振り返ろう'}</Text>
      {premiumHistory ? <View style={[styles.historySearchBox, isDark && styles.darkPanel]}><Text style={[styles.taskSearchIcon, isDark && styles.darkAccentText]}>⌕</Text><TextInput value={historySearch} onChangeText={setHistorySearch} placeholder="過去に完了したタスクを検索" placeholderTextColor={isDark ? '#8F9BB0' : '#A29DAA'} style={[styles.taskSearchInput, isDark && styles.darkBodyText]} />{historySearch.length > 0 && <Pressable onPress={() => setHistorySearch('')}><Text style={[styles.historySearchClear, isDark && styles.darkAccentText]}>×</Text></Pressable>}</View> : <Pressable style={[styles.guideCard, isDark && styles.darkSurface]} onPress={() => onPremium('month')}><View><Text style={[styles.guideCardTitle, isDark && styles.darkBodyText]}>全期間の履歴と検索</Text><Text style={[styles.guideCardCopy, isDark && styles.darkMutedText]}>Premiumで月表示・詳細検索を利用できます</Text></View><Text style={[styles.guideCardArrow, isDark && styles.darkAccentText]}>›</Text></Pressable>}
      {premiumHistory && <AchievementVessel tasks={tasks} designMode={designMode} chicPattern={chicPattern} scope="month" />}
      {premiumHistory && <View style={styles.monthStats}>
        <View style={styles.monthStat}><Text style={styles.monthStatNumber}>{monthlyCount}</Text><Text style={styles.monthStatLabel}>今月の完了</Text></View>
        <View style={styles.monthStat}><Text style={styles.monthStatNumber}>{activeDays}</Text><Text style={styles.monthStatLabel}>活動した日</Text></View>
        <View style={styles.monthStat}><Text style={styles.monthStatNumber}>{bestDayCount}</Text><Text style={styles.monthStatLabel}>1日の最多</Text></View>
      </View>}
      <View style={[styles.calendarCard, designMode === 'minimal' && styles.calendarCardMinimal]}>
        <View style={styles.calendarHeader}>
          <View style={styles.historyMonthSwitcher}><Pressable onPress={() => moveHistoryMonth(-1)} style={styles.historyMonthArrow}><Text style={[styles.historyMonthArrowText, isDark && styles.darkAccentText]}>‹</Text></Pressable><Text style={[styles.calendarMonth, isDark && styles.darkBodyText]}>{year}年 {month + 1}月</Text><Pressable onPress={() => moveHistoryMonth(1)} style={styles.historyMonthArrow}><Text style={[styles.historyMonthArrowText, isDark && styles.darkAccentText]}>›</Text></Pressable></View>
          <Text style={[styles.calendarTotal, isDark && styles.darkAccentText]}>{monthlyCount}件完了</Text>
        </View>
        <View style={styles.weekRow}>
          {['日', '月', '火', '水', '木', '金', '土'].map((day) => <Text key={day} style={styles.weekLabel}>{day}</Text>)}
        </View>
        <View style={styles.calendarGrid}>
          {cells.map((day, index) => {
            if (day === null) return <View key={`blank-${index}`} style={styles.dayCell} />;
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const count = calendarCompletedByDay[key]?.length ?? 0;
            const dayReviews = reviewsByDay[key] ?? [];
            const dayMark = calendarMarks[key] ?? autoMarkForDay(key);
            const selected = key === selectedKey;
            return (
              <Pressable key={key} style={[styles.dayCell, selected && styles.daySelected]} onPress={() => { setSelectedKey(key); loadJournalDraft(key); setSelectedReview(null); }}>
                <Text style={[styles.dayNumber, isDark && styles.darkBodyText, selected && styles.dayNumberSelected]}>{day}</Text>
                {dayMark && <Text style={[styles.historyCalendarMark, isDark && styles.darkAccentText]}>{dayMark}</Text>}
                {count > 0 && <View style={styles.dayDone}><Text style={[styles.dayDoneText, isDark && styles.darkBodyText]}>{count}</Text></View>}
                {dayReviews.length > 0 && <Text style={[styles.reviewCalendarMarker, isDark && styles.darkAccentText]}>✦</Text>}
              </Pressable>
            );
          })}
        </View>
        <CalendarMarkPicker date={selectedKey} mark={calendarMarks[selectedKey]} onSet={onSetCalendarMark} designMode={designMode} />
        <View style={[styles.journalEditor, designMode === 'minimal' && styles.journalEditorMinimal, isDark && styles.darkPanel]}>
          <View style={styles.journalEditorHeader}>
            <View><Text style={[styles.journalEditorTitle, isDark && styles.darkBodyText]}>今日の記録</Text><Text style={[styles.journalEditorDate, isDark && styles.darkAccentText]}>{selectedKey.replaceAll('-', '.')}</Text></View>
            <Text style={[styles.journalEditorCount, isDark && styles.darkAccentText]}>写真 {selectedJournalPhotos.length} / {maxJournalPhotos}</Text>
          </View>
          <View style={styles.journalPhotoRow}>
            {selectedJournalPhotos.map((uri, index) => <View key={`${uri}-${index}`} style={styles.journalPhotoWrap}><Pressable onPress={() => { setSelectedReview({ ...journalDraft, photo: uri, photos: selectedJournalPhotos }); setSelectedReviewPhotoIndex(index); }}><Image source={{ uri }} style={styles.journalPhotoThumb} /></Pressable><Pressable style={styles.journalPhotoRemove} onPress={() => setJournalDraft((current) => { const photos = (current.photos?.filter(Boolean) ?? (current.photo ? [current.photo] : [])).filter((_, photoIndex) => photoIndex !== index); return { ...current, photo: photos[0] ?? '', photos }; })}><Text style={styles.journalPhotoRemoveText}>×</Text></Pressable></View>)}
            {selectedJournalPhotos.length < maxJournalPhotos && <Pressable style={styles.journalPhotoAdd} onPress={() => void chooseJournalPhoto()}><Text style={styles.journalPhotoAddIcon}>＋</Text><Text style={styles.journalPhotoAddText}>写真を追加</Text></Pressable>}
          </View>
          {planTier !== 'premium' && <Text style={[styles.journalPhotoHint, isDark && styles.darkAccentText]}>無料版は1枚まで。Premiumでは1日3枚まで残せます。</Text>}
          <TextInput value={journalDraft.shortNote ?? ''} onChangeText={(shortNote) => setJournalDraft((current) => ({ ...current, shortNote }))} placeholder="今日のひとこと" placeholderTextColor={isDark ? '#786C94' : '#A29DAA'} style={[styles.journalInput, isDark && styles.darkInput]} />
          <TextInput value={journalDraft.memo ?? ''} onChangeText={(memo) => setJournalDraft((current) => ({ ...current, memo }))} placeholder="今日のことを少し残す" placeholderTextColor={isDark ? '#786C94' : '#A29DAA'} multiline style={[styles.journalInput, styles.journalMemo, isDark && styles.darkInput]} />
          <View style={styles.journalSatisfactionRow}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} style={[styles.journalSatisfaction, journalDraft.satisfaction === value && styles.journalSatisfactionActive]} onPress={() => setJournalDraft((current) => ({ ...current, satisfaction: value }))}><Text style={[styles.journalSatisfactionText, journalDraft.satisfaction === value && styles.journalSatisfactionTextActive]}>{value}</Text></Pressable>)}<Text style={[styles.journalSatisfactionLabel, isDark && styles.darkAccentText]}>満足度</Text></View>
          <View style={styles.journalActions}><Pressable style={styles.journalSaveButton} onPress={saveJournal}><Text style={styles.journalSaveButtonText}>{selectedDayReviewEntry ? '更新する' : '保存する'}</Text></Pressable>{selectedDayReviewEntry && <Pressable style={styles.journalDeleteButton} onPress={() => { onDeleteReview(selectedDayReviewEntry.monthKey, selectedDayReviewEntry.reviewKey); loadJournalDraft(selectedKey); }}><Text style={styles.journalDeleteButtonText}>削除</Text></Pressable>}</View>
        </View>
        {(reviewsByDay[selectedKey] ?? []).length > 0 && <View style={styles.reviewDaySummary}><Text style={styles.reviewDaySummaryTitle}>この日の振り返り</Text>{(reviewsByDay[selectedKey] ?? []).map((review, index) => <Pressable key={review.id ?? `${selectedKey}-${index}`} style={styles.reviewDayRow} onPress={() => setSelectedReview(review)}><Text style={styles.reviewDayIcon}>✦</Text><View style={{ flex: 1 }}><Text style={styles.reviewDayText}>{review.shortNote || review.memo || '写真の記録'}</Text><Text style={styles.reviewDayHint}>タップして記録を見る</Text></View></Pressable>)}</View>}
        {(completedWishesByDay[selectedKey] ?? []).length > 0 && <View style={styles.reviewDaySummary}><Text style={styles.reviewDaySummaryTitle}>この日に叶ったこと</Text>{(completedWishesByDay[selectedKey] ?? []).map((wish) => <View key={wish.id} style={styles.reviewDayRow}><Text style={styles.reviewDayIcon}>🌟</Text><View style={{ flex: 1 }}><Text style={styles.reviewDayText}>{wish.title}</Text><Text style={styles.reviewDayHint}>叶えたいことを完了</Text></View></View>)}</View>}
        {(departurePlansByDay[selectedKey] ?? []).length > 0 && <View style={styles.reviewDaySummary}><Text style={styles.reviewDaySummaryTitle}>この日の出発予定</Text>{(departurePlansByDay[selectedKey] ?? []).map((plan) => <View key={plan.id ?? plan.title} style={styles.reviewDayRow}><Text style={styles.reviewDayIcon}>↗</Text><View style={{ flex: 1 }}><Text style={styles.reviewDayText}>{plan.title}</Text><Text style={styles.reviewDayHint}>{plan.arrival} 到着 ・ {plan.destination || '目的地未設定'}</Text></View></View>)}</View>}
      </View>

      <View style={styles.historyHeader}>
        <Text style={[styles.sectionTitle, designMode === 'dark' && styles.darkPanel, designMode === 'dark' && styles.darkBodyText]}>{premiumHistory ? (historySearch.trim() ? '検索結果' : selectedKey.replaceAll('-', '.')) : '最近の完了'}</Text>
        <Text style={styles.sectionSub}>{selectedTasks.length}件見つかりました</Text>
      </View>
      {selectedTasks.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyCopy}>この日の完了タスクはまだありません。</Text></View>
      ) : selectedTasks.map((task) => (
        <View key={task.id} style={styles.historyTask}>
          <View style={styles.historyIcon}><Text style={styles.historyIconText}>{completionIcon}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.taskTitle, isDark && styles.darkBodyText]}>{task.title}</Text>
            <Text style={[styles.taskMeta, isDark && styles.darkMutedText]}>{task.category} ・ {task.completedAt ? dateKey(task.completedAt).replaceAll('-', '.') : ''}</Text>
          </View>
          <View style={styles.historyTaskActions}><Pressable style={styles.historyTemplateButton} onPress={() => onSaveTemplate(task)}><Text style={styles.historyTemplateButtonText}>ひな型</Text><Text style={styles.historyTemplatePremium}>Premium</Text></Pressable><Pressable style={styles.restoreButton} onPress={() => onRestore(task.id)}><Text style={styles.restoreButtonText}>元に戻す</Text></Pressable></View>
        </View>
      ))}
      {visibleRecoveryHistory.length > 0 && <View style={styles.recoveryHistorySection}><View style={styles.historyHeader}><Text style={styles.sectionTitle}>立て直した記録</Text><Text style={styles.sectionSub}>{visibleRecoveryHistory.length}回</Text></View>{visibleRecoveryHistory.slice(0, 5).map((record) => <View key={record.id} style={styles.recoveryHistoryRow}><View style={styles.recoveryHistoryIcon}><Text style={styles.recoveryHistoryIconText}>↻</Text></View><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{record.planTitle}</Text><Text style={styles.taskMeta}>{record.action === 'leave_now' ? '今すぐ出発' : record.action === 'delay_arrival' ? '到着予定を変更' : record.action === 'contact' ? '遅れる連絡' : '予定を組み直し'} ・ 見込み {record.estimatedArrival}</Text></View></View>)}</View>}
      {visibleFocusSessions.length > 0 && <View style={styles.recoveryHistorySection}><View style={styles.historyHeader}><Text style={styles.sectionTitle}>集中した記録</Text><Text style={styles.sectionSub}>{premiumHistory ? `今月 ${monthlyFocusMinutes}分` : '直近7日'}</Text></View>{visibleFocusSessions.slice(0, 5).map((session) => <View key={session.id} style={styles.recoveryHistoryRow}><View style={[styles.recoveryHistoryIcon, styles.focusHistoryIcon]}><Text style={styles.focusHistoryIconText}>◉</Text></View><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{session.taskTitle}</Text><Text style={styles.taskMeta}>{session.durationMinutes}分 ・ {dateKey(session.completedAt).replaceAll('-', '.')}</Text></View></View>)}</View>}
      {(visibleDepartureCheckIns.length > 0 || departureBehaviorDetails.length > 0) && <View style={styles.recoveryHistorySection}><View style={styles.historyHeader}><Text style={[styles.sectionTitle, isDark && styles.darkAccentText]}>出発・行動の記録</Text><Text style={[styles.sectionSub, isDark && styles.darkAccentText]}>{visibleDepartureCheckIns.length + departureBehaviorDetails.length}件</Text></View>{visibleDepartureCheckIns.slice(0, 5).map((record) => <View key={`checkin-${record.id}`} style={styles.recoveryHistoryRow}><View style={styles.recoveryHistoryIcon}><Text style={styles.recoveryHistoryIconText}>➜</Text></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, isDark && styles.darkBodyText]}>{record.planTitle}</Text><Text style={[styles.taskMeta, isDark && styles.darkAccentText]}>{record.onTime ? '予定どおり出発' : '遅れて出発'} ・ {dateKey(record.departedAt).replaceAll('-', '.')} {formatLiveTime(new Date(record.departedAt))}</Text></View></View>)}{departureBehaviorDetails.map((detail) => <View key={`behavior-${detail.title}-${detail.date ?? ''}`} style={styles.recoveryHistoryRow}><View style={styles.recoveryHistoryIcon}><Text style={styles.recoveryHistoryIconText}>↗</Text></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, isDark && styles.darkBodyText]}>{detail.title}</Text><Text style={[styles.taskMeta, isDark && styles.darkAccentText]}>{detail.date ? `${detail.date.replaceAll('-', '.')} ・ ` : ''}{detail.preparation ? `準備 ${formatLiveTime(new Date(detail.preparation.occurredAt))}` : '準備記録なし'}{detail.departure ? ` ・ 出発 ${formatLiveTime(new Date(detail.departure.occurredAt))}` : ' ・ 出発記録なし'}</Text></View></View>)}</View>}
      {visibleNotificationEvents.length > 0 && <View style={styles.recoveryHistorySection}><View style={styles.historyHeader}><Text style={[styles.sectionTitle, isDark && styles.darkAccentText]}>通知に答えた記録</Text><Text style={[styles.sectionSub, isDark && styles.darkAccentText]}>{visibleNotificationEvents.length}件</Text></View>{visibleNotificationEvents.map((event) => <View key={event.id} style={styles.recoveryHistoryRow}><View style={[styles.recoveryHistoryIcon, styles.focusHistoryIcon]}><Text style={styles.focusHistoryIconText}>{event.notificationAction === 'completed' ? '✓' : '後'}</Text></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, isDark && styles.darkBodyText]}>{event.taskTitleSnapshot || event.departurePlanTitleSnapshot || '通知への回答'}</Text><Text style={[styles.taskMeta, isDark && styles.darkAccentText]}>{event.notificationAction === 'completed' ? '完了として回答' : 'あとで確認'} ・ {dateKey(event.occurredAt).replaceAll('-', '.')} {formatLiveTime(new Date(event.occurredAt))}</Text></View></View>)}</View>}
      <Modal visible={Boolean(selectedReview)} transparent animationType="fade" onRequestClose={() => setSelectedReview(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedReview(null)}>
          <Pressable style={styles.reviewPhotoModal} onPress={(event) => event.stopPropagation()}>
            {(() => {
              const photos = selectedReview?.photos?.filter(Boolean) ?? (selectedReview?.photo ? [selectedReview.photo] : []);
              const photo = photos[selectedReviewPhotoIndex] ?? photos[0];
              return photo ? <><Image source={{ uri: photo }} style={styles.reviewPhotoLarge} />{photos.length > 1 && <View style={styles.reviewPhotoPager}>{photos.map((uri, index) => <Pressable key={uri} style={[styles.reviewPhotoPagerDot, index === selectedReviewPhotoIndex && styles.reviewPhotoPagerDotActive]} onPress={() => setSelectedReviewPhotoIndex(index)}><Text style={styles.reviewPhotoPagerText}>{index + 1}</Text></Pressable>)}</View>}</> : <View style={styles.reviewPhotoLargeEmpty}><Text style={styles.reviewPhotoLargeEmptyText}>写真なし</Text></View>;
            })()}
            {selectedReview?.shortNote ? <Text style={styles.reviewPhotoModalNote}>{selectedReview.shortNote}</Text> : null}
            {selectedReview?.memo ? <Text style={styles.reviewPhotoModalMemo}>{selectedReview.memo}</Text> : null}
            <View style={styles.reviewPhotoModalActions}>
              <Pressable style={styles.reviewEditButton} onPress={() => { if (!selectedReviewEntry) return; setReviewEditNote(selectedReview?.shortNote ?? ''); setReviewEditMemo(selectedReview?.memo ?? ''); setEditingReview(selectedReviewEntry); setSelectedReview(null); }}><Text style={styles.reviewEditButtonText}>編集</Text></Pressable>
              <Pressable style={styles.reviewDeleteButton} onPress={() => { if (!selectedReviewEntry) return; onDeleteReview(selectedReviewEntry.monthKey, selectedReviewEntry.reviewKey); setSelectedReview(null); }}><Text style={styles.reviewDeleteButtonText}>削除</Text></Pressable>
            </View>
            <Pressable style={styles.reviewPhotoModalClose} onPress={() => setSelectedReview(null)}><Text style={styles.reviewPhotoModalCloseText}>閉じる</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={Boolean(editingReview)} transparent animationType="fade" onRequestClose={() => setEditingReview(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditingReview(null)}>
          <Pressable style={styles.reviewEditModal} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.reviewEditTitle}>振り返りを編集</Text>
            <TextInput value={reviewEditNote} onChangeText={setReviewEditNote} placeholder="一言" placeholderTextColor="#A29DAA" style={styles.reviewEditInput} />
            <TextInput value={reviewEditMemo} onChangeText={setReviewEditMemo} placeholder="振り返りメモ" placeholderTextColor="#A29DAA" multiline style={[styles.reviewEditInput, styles.reviewEditMemo]} />
            <View style={styles.reviewEditActions}>
              <Pressable style={styles.reviewEditCancel} onPress={() => setEditingReview(null)}><Text style={styles.reviewEditCancelText}>キャンセル</Text></Pressable>
              <Pressable style={styles.reviewEditSave} onPress={() => { if (editingReview) onUpdateReview(editingReview.monthKey, editingReview.reviewKey, { shortNote: reviewEditNote.trim(), memo: reviewEditMemo.trim() }); setEditingReview(null); }}><Text style={styles.reviewEditSaveText}>保存</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
