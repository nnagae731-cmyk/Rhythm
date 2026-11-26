import React, { useEffect, useState } from 'react';
import { getPlanScheduledTime, isArrivalReversePlan } from '../features/departure/departurePlanMode';
import { formatLiveTime } from '../features/schedule/dateTimeUtils';
import { getDepartureMoments } from '../features/schedule/scheduleConflict';
import { styles } from '../styles/appStyles';
import { AppNotice, AppNoticeCategory, DeparturePlan, Task } from '../types';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { type ModalPalette, popupSheetStyle } from './modalPalette';

export const APP_NOTICE_CATEGORY_LABELS: Record<AppNoticeCategory, string> = {
  feature: '新機能',
  update: 'アップデート',
  important: '重要なお知らせ',
};

export function formatNoticeDate(publishedAt: string) {
  const date = new Date(publishedAt);
  return Number.isNaN(date.getTime()) ? '' : `${date.getMonth() + 1}/${date.getDate()}`;
}

export function AppNoticeCenter({ visible, notices, readNoticeIds, palette, onRead, onNavigate, onClose }: { visible: boolean; notices: AppNotice[]; readNoticeIds: string[]; palette: ModalPalette; onRead: (noticeId: string) => void; onNavigate: (notice: AppNotice) => void; onClose: () => void }) {
  const [selectedNoticeId, setSelectedNoticeId] = useState<string>();
  const selectedNotice = notices.find((notice) => notice.id === selectedNoticeId);

  useEffect(() => {
    if (!visible) setSelectedNoticeId(undefined);
  }, [visible]);

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable style={[styles.modalSheet, popupSheetStyle(palette, '88%')]} onPress={(event) => event.stopPropagation()}>
        <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {selectedNotice ? <Pressable accessibilityRole="button" accessibilityLabel="お知らせ一覧へ戻る" onPress={() => setSelectedNoticeId(undefined)}><Text style={{ color: palette.primaryAccent, fontSize: 24, lineHeight: 26 }}>‹</Text></Pressable> : null}
            <Text style={[styles.modalTitle, { color: palette.primaryText, marginBottom: 0 }]}>お知らせ</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose}><Text style={{ color: palette.primaryAccent, fontWeight: '800' }}>閉じる</Text></Pressable>
        </View>
        {!selectedNotice ? <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
          {notices.length === 0 ? <Text style={{ color: palette.secondaryText, paddingVertical: 20 }}>現在のお知らせはありません。</Text> : notices.map((notice) => {
            const unread = !readNoticeIds.includes(notice.id);
            const categoryColor = notice.category === 'important' ? palette.warning : palette.primaryAccent;
            return <Pressable key={notice.id} accessibilityRole="button" onPress={() => { onRead(notice.id); setSelectedNoticeId(notice.id); }} style={{ padding: 13, marginTop: 8, borderRadius: palette.buttonRadius, borderWidth: 1, borderColor: unread ? categoryColor : palette.border, backgroundColor: palette.secondarySurface }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Text style={{ color: categoryColor, fontSize: 10, fontWeight: '900' }}>{APP_NOTICE_CATEGORY_LABELS[notice.category]}</Text>
                {unread ? <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, backgroundColor: categoryColor }}><Text style={{ color: palette.onAccent, fontSize: 9, fontWeight: '900' }}>NEW</Text></View> : null}
                <Text style={{ marginLeft: 'auto', color: palette.secondaryText, fontSize: 10 }}>{formatNoticeDate(notice.publishedAt)}</Text>
              </View>
              <Text numberOfLines={2} style={{ color: palette.primaryText, fontSize: 14, lineHeight: 20, fontWeight: '900', marginTop: 7 }}>{notice.title}</Text>
              <Text numberOfLines={3} style={{ color: palette.secondaryText, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{notice.body}</Text>
            </Pressable>;
          })}
        </ScrollView> : <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
          <Text style={{ color: selectedNotice.category === 'important' ? palette.warning : palette.primaryAccent, fontSize: 11, fontWeight: '900' }}>{APP_NOTICE_CATEGORY_LABELS[selectedNotice.category]} ・ {formatNoticeDate(selectedNotice.publishedAt)}</Text>
          <Text style={{ color: palette.primaryText, fontSize: 20, lineHeight: 28, fontWeight: '900', marginTop: 8 }}>{selectedNotice.title}</Text>
          <Text style={{ color: palette.secondaryText, fontSize: 14, lineHeight: 23, marginTop: 14 }}>{selectedNotice.body}</Text>
          {selectedNotice.targetScreen ? <Pressable accessibilityRole="button" onPress={() => onNavigate(selectedNotice)} style={{ minHeight: 46, borderRadius: palette.buttonRadius, backgroundColor: palette.primaryAccent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, marginTop: 20 }}><Text style={{ color: palette.onAccent, fontSize: 13, fontWeight: '900' }}>この機能を見る</Text></Pressable> : null}
        </ScrollView>}
      </Pressable>
    </Pressable>
  </Modal>;
}

export function TomorrowPrepModal({ visible, step, todayTasks, tomorrowTasks, tomorrowPlans, palette, onStepChange, onMoveTomorrow, onLater, onCompleteTask, onEditTask, onEditPlan, onClose }: { visible: boolean; step: 0 | 1 | 2 | 3; todayTasks: Task[]; tomorrowTasks: Task[]; tomorrowPlans: DeparturePlan[]; palette: ModalPalette; onStepChange: (step: 0 | 1 | 2 | 3) => void; onMoveTomorrow: (taskId: string) => void; onLater: (taskId: string) => void; onCompleteTask: (taskId: string) => void; onEditTask: (task: Task) => void; onEditPlan: (plan: DeparturePlan) => void; onClose: () => void }) {
  const buttonStyle = { minHeight: 38, borderRadius: palette.buttonRadius, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.secondarySurface, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 10, flex: 1 };
  const timeLabel = (plan: DeparturePlan) => {
    const scheduled = getPlanScheduledTime(plan);
    if (!scheduled) return '終日';
    if (!isArrivalReversePlan(plan)) return `予定 ${scheduled}`;
    const moments = getDepartureMoments(plan);
    return `予定 ${scheduled}  準備 ${formatLiveTime(moments.prepare)}  出発 ${formatLiveTime(moments.leave)}`;
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable style={[styles.modalSheet, popupSheetStyle(palette, '86%')]} onPress={(event) => event.stopPropagation()}>
        <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={[styles.modalTitle, { color: palette.primaryText }]}>{step === 0 ? '明日の準備をしておきますか？' : '明日の準備'}</Text><Pressable onPress={onClose}><Text style={{ color: palette.primaryAccent, fontWeight: '800' }}>閉じる</Text></Pressable></View>
        {step === 0 && <>
          <Text style={[styles.emptyCopy, { color: palette.secondaryText }]}>今日残っていることと、明日の予定を少し整理できます。</Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: palette.primaryAccent, borderRadius: palette.buttonRadius }]} onPress={() => onStepChange(1)}><Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>準備する</Text></Pressable>
          <Pressable style={{ minHeight: 46, borderRadius: palette.buttonRadius, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.secondarySurface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 }} onPress={onClose}><Text style={{ color: palette.secondaryText, fontSize: 13, fontWeight: '900' }}>今日はしない</Text></Pressable>
        </>}
        {step === 1 && <>
          <Text style={[styles.emptyCopy, { color: palette.secondaryText }]}>今日の未完了Taskを少し整理できます。</Text>
          <ScrollView style={{ marginTop: 8 }}><Text style={{ color: palette.primaryText, fontWeight: '900', marginBottom: 6 }}>今日の未完了Task</Text>{todayTasks.length === 0 ? <Text style={{ color: palette.secondaryText }}>残っているTaskはありません。</Text> : todayTasks.map((task) => <View key={task.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border }}><Text style={{ color: palette.primaryText, fontWeight: '800' }}>{task.title}</Text><View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}><Pressable style={buttonStyle} onPress={() => onMoveTomorrow(task.id)}><Text style={{ color: palette.primaryText, fontSize: 12 }}>明日に移す</Text></Pressable><Pressable style={buttonStyle} onPress={() => onLater(task.id)}><Text style={{ color: palette.primaryText, fontSize: 12 }}>あとで</Text></Pressable><Pressable style={buttonStyle} onPress={() => onCompleteTask(task.id)}><Text style={{ color: palette.primaryText, fontSize: 12 }}>完了</Text></Pressable><Pressable style={buttonStyle} onPress={() => onEditTask(task)}><Text style={{ color: palette.primaryAccent, fontSize: 12 }}>編集</Text></Pressable></View></View>)}</ScrollView>
          <Pressable style={[styles.primaryButton, { backgroundColor: palette.primaryAccent, borderRadius: palette.buttonRadius }]} onPress={() => onStepChange(2)}><Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>明日の内容を見る</Text></Pressable>
        </>}
        {step === 2 && <>
          <Text style={[styles.emptyCopy, { color: palette.secondaryText }]}>明日の予定とTaskを時系列で確認します。</Text>
          <ScrollView style={{ marginTop: 8 }}><Text style={{ color: palette.primaryText, fontWeight: '900', marginBottom: 6 }}>予定</Text>{tomorrowPlans.length === 0 ? <Text style={{ color: palette.secondaryText }}>明日の予定はありません。</Text> : tomorrowPlans.map((plan) => <Pressable key={plan.id} onPress={() => onEditPlan(plan)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border }}><Text style={{ color: palette.primaryText, fontWeight: '800' }}>{plan.title}</Text><Text style={{ color: palette.secondaryText, fontSize: 12, marginTop: 3 }}>{timeLabel(plan)}</Text></Pressable>)}<Text style={{ color: palette.primaryText, fontWeight: '900', marginTop: 12, marginBottom: 6 }}>Task / Routine</Text>{tomorrowTasks.length === 0 ? <Text style={{ color: palette.secondaryText }}>明日のTaskはありません。</Text> : tomorrowTasks.map((task) => <Pressable key={task.id} onPress={() => onEditTask(task)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border }}><Text style={{ color: palette.primaryText }}>{task.title}</Text>{task.scheduledTime ? <Text style={{ color: palette.secondaryText, fontSize: 12, marginTop: 2 }}>{task.scheduledTime}</Text> : null}</Pressable>)}</ScrollView>
          <Pressable style={[styles.primaryButton, { backgroundColor: palette.primaryAccent, borderRadius: palette.buttonRadius }]} onPress={() => onStepChange(3)}><Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>次へ</Text></Pressable>
        </>}
        {step === 3 && <><Text style={[styles.modalTitle, { color: palette.primaryText, fontSize: 20 }]}>明日の準備ができました</Text><Text style={[styles.emptyCopy, { color: palette.secondaryText }]}>明日も自分のペースで進めよう。</Text><Pressable style={[styles.primaryButton, { backgroundColor: palette.primaryAccent, borderRadius: palette.buttonRadius }]} onPress={onClose}><Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>閉じる</Text></Pressable></>}
      </Pressable>
    </Pressable>
  </Modal>;
}

// Stable local notices. Their IDs are intentionally independent from the
// persisted read state so a future push/remote source can reuse the same UI.
export const INITIAL_APP_NOTICES: AppNotice[] = [];
