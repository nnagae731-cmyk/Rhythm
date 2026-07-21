import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChicPattern, DesignMode, getThemeTokens } from './theme';
import { SharedActionStatus, SharedAttendanceStatus, SharedEvent, SharedParticipantPrefs } from './types';
import { formatClock } from './features/tasks/taskUtils';
import { getDepartureMoments } from './features/departure/departureUtils';
import { sharedActionStatuses, sharedAttendanceStatuses, sharedDeparturePoints } from './features/shared/sharedUtils';

type SharedEventScreenProps = {
  visible: boolean;
  shareToken?: string;
  designMode: DesignMode;
  chicPattern: ChicPattern;
  sharedEvents: SharedEvent[];
  participantIdsByToken: Record<string, string>;
  participantPrefsByToken: Record<string, SharedParticipantPrefs>;
  onSaveSharedEvents: (updater: (current: SharedEvent[]) => SharedEvent[]) => void;
  onSaveParticipantIds: (updater: (current: Record<string, string>) => Record<string, string>) => void;
  onSaveParticipantPrefs: (updater: (current: Record<string, SharedParticipantPrefs>) => Record<string, SharedParticipantPrefs>) => void;
  onClose: () => void;
  onOpenMap: (query: string) => void;
  onShareCurrentEvent: (token: string) => void;
};

type DraftState = {
  displayName: string;
  attendanceStatus: SharedAttendanceStatus;
  departurePoint: 'current' | 'home' | 'custom';
  departurePointLabel: string;
  actionStatus: SharedActionStatus;
};

const emptyDraft: DraftState = {
  displayName: '',
  attendanceStatus: '参加',
  departurePoint: 'current',
  departurePointLabel: '',
  actionStatus: '未準備',
};

function formatStamp(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getMonth() + 1}/${date.getDate()} ${formatClock(date.getHours() * 60 + date.getMinutes())}`;
}

function estimateArrivalAt(event: SharedEvent, actionStatus: SharedActionStatus, now: Date) {
  const sameDayEstimate = getDepartureMoments({
    id: event.eventId,
    title: event.title,
    date: event.date,
    arrival: event.arrival,
    travelMinutes: event.travelMinutes,
    preparationMinutes: event.preparationMinutes,
    bufferMinutes: event.bufferMinutes,
  });
  if (actionStatus === '参加できない') return undefined;
  if (actionStatus === '到着した') return now.toISOString();
  if (actionStatus === '今から出る' || actionStatus === '移動中') {
    return new Date(now.getTime() + (event.travelMinutes + event.bufferMinutes) * 60_000).toISOString();
  }
  if (actionStatus === '少し遅れそう') {
    return new Date(now.getTime() + (event.travelMinutes + event.bufferMinutes + 10) * 60_000).toISOString();
  }
  return sameDayEstimate.arrival.toISOString();
}

async function probeCurrentLocationOnce() {
  const geolocation = (globalThis as any)?.navigator?.geolocation;
  if (!geolocation?.getCurrentPosition) return false;
  return new Promise<boolean>((resolve) => {
    geolocation.getCurrentPosition(() => resolve(true), () => resolve(false), { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 });
  });
}

function participantLabel(status: SharedAttendanceStatus) {
  return status === '参加' ? '参加' : '不参加';
}

export function SharedEventScreen({
  visible,
  shareToken,
  designMode,
  chicPattern,
  sharedEvents,
  participantIdsByToken,
  participantPrefsByToken,
  onSaveSharedEvents,
  onSaveParticipantIds,
  onSaveParticipantPrefs,
  onClose,
  onOpenMap,
  onShareCurrentEvent,
}: SharedEventScreenProps) {
  const theme = getThemeTokens(designMode);
  const event = shareToken ? sharedEvents.find((item) => item.shareToken === shareToken) : undefined;
  const localParticipantId = shareToken ? participantIdsByToken[shareToken] : undefined;
  const localParticipant = event?.participants.find((participant) => participant.participantId === localParticipantId);
  const localPrefs = shareToken ? participantPrefsByToken[shareToken] : undefined;
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!event) {
      setDraft(emptyDraft);
      return;
    }
    if (localParticipant) {
      setDraft({
        displayName: localParticipant.displayName,
        attendanceStatus: localParticipant.attendanceStatus,
        departurePoint: localPrefs?.departurePoint ?? 'current',
        departurePointLabel: localPrefs?.departurePointLabel ?? '',
        actionStatus: localParticipant.actionStatus,
      });
      return;
    }
    setDraft((current) => ({
      ...current,
      displayName: '',
      attendanceStatus: '参加',
      departurePoint: localPrefs?.departurePoint ?? 'current',
      departurePointLabel: localPrefs?.departurePointLabel ?? '',
      actionStatus: '未準備',
    }));
  }, [event, localParticipant, localPrefs]);

  const canSave = Boolean(draft.displayName.trim());
  const departureLabel = draft.departurePoint === 'custom' ? draft.departurePointLabel.trim() || '指定した場所' : draft.departurePoint === 'home' ? '自宅' : '現在地';
  const arrivalEstimate = event ? estimateArrivalAt(event, draft.actionStatus, new Date()) : undefined;
  const moments = event ? getDepartureMoments({
    id: event.eventId,
    title: event.title,
    date: event.date,
    arrival: event.arrival,
    travelMinutes: event.travelMinutes,
    preparationMinutes: event.preparationMinutes,
    bufferMinutes: event.bufferMinutes,
  }) : undefined;

  const saveParticipant = () => {
    if (!event) return;
    const displayName = draft.displayName.trim();
    if (!displayName) {
      Alert.alert('表示名を入力してください');
      return;
    }
    const participantId = localParticipantId ?? `participant-${event.shareToken}-${Math.random().toString(36).slice(2, 10)}`;
    const updatedAt = new Date().toISOString();
    const updatedParticipant = {
      participantId,
      sharedEventId: event.eventId,
      displayName,
      attendanceStatus: draft.attendanceStatus,
      actionStatus: draft.actionStatus,
      estimatedArrivalAt: draft.attendanceStatus === '不参加' ? undefined : estimateArrivalAt(event, draft.actionStatus, new Date()),
      lastUpdatedAt: updatedAt,
    };
    onSaveSharedEvents((current) => current.map((item) => {
      if (item.shareToken !== event.shareToken) return item;
      const participants = [...item.participants];
      const index = participants.findIndex((participant) => participant.participantId === participantId);
      if (index === -1) participants.push(updatedParticipant);
      else participants[index] = updatedParticipant;
      return { ...item, ownerDisplayName: localParticipantId === participantId ? displayName : item.ownerDisplayName, participants, updatedAt };
    }));
    onSaveParticipantIds((current) => ({ ...current, [event.shareToken]: participantId }));
    onSaveParticipantPrefs((current) => ({ ...current, [event.shareToken]: { departurePoint: draft.departurePoint, departurePointLabel: draft.departurePoint === 'custom' ? draft.departurePointLabel.trim() || undefined : undefined } }));
    setStatusMessage('参加情報を保存しました');
  };

  const updateActionStatus = async (actionStatus: SharedActionStatus) => {
    if (!event || !localParticipantId) {
      setDraft((current) => ({ ...current, actionStatus }));
      setStatusMessage('表示名を保存してから更新できます');
      return;
    }
    const updatedAt = new Date().toISOString();
    let usedCurrentLocation = false;
    if ((actionStatus === '今から出る' || actionStatus === '移動中') && draft.departurePoint === 'current') {
      usedCurrentLocation = await probeCurrentLocationOnce();
    }
    const estimatedArrivalAt = draft.attendanceStatus === '不参加' ? undefined : estimateArrivalAt(event, actionStatus, new Date());
    onSaveSharedEvents((current) => current.map((item) => {
      if (item.shareToken !== event.shareToken) return item;
      return {
        ...item,
        participants: item.participants.map((participant) => participant.participantId === localParticipantId ? {
          ...participant,
          actionStatus,
          estimatedArrivalAt,
          lastUpdatedAt: updatedAt,
        } : participant),
        updatedAt,
      };
    }));
    setDraft((current) => ({ ...current, actionStatus }));
    setStatusMessage(usedCurrentLocation ? `${actionStatus} に更新しました（現在地を使いました）` : `${actionStatus} に更新しました`);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.screenBackground, borderColor: theme.colors.border, borderRadius: theme.radius.modal }]}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.badge, { color: theme.colors.primaryAccent }]}>共有予定</Text>
                <Text style={[styles.title, { color: theme.colors.primaryText }]}>{event?.title ?? '共有予定'}</Text>
                <Text style={[styles.subtitle, { color: theme.colors.secondaryText }]}>{event ? `${event.date.replaceAll('-', '.')} · ${event.arrival}到着` : 'リンクを確認しています'}</Text>
              </View>
              <View style={styles.headerActions}>
                {event && <Pressable style={[styles.shareButton, { borderColor: theme.colors.primaryAccent }]} onPress={() => onShareCurrentEvent(event.shareToken)}><Text style={[styles.shareButtonText, { color: theme.colors.primaryAccent }]}>共有</Text></Pressable>}
                <Pressable style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>閉じる</Text></Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
              {!event ? (
                <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.cardTitle, { color: theme.colors.primaryText }]}>この共有リンクは見つかりませんでした</Text>
                  <Text style={[styles.cardCopy, { color: theme.colors.secondaryText }]}>期限切れ、削除済み、または読み込みに失敗した可能性があります。</Text>
                </View>
              ) : (
                <>
                  <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.sectionLabel, { color: theme.colors.primaryAccent }]}>予定の内容</Text>
                    <Text style={[styles.cardTitle, { color: theme.colors.primaryText }]}>{event.destination || '目的地未設定'}</Text>
                    <Text style={[styles.cardCopy, { color: theme.colors.secondaryText }]}>{event.date.replaceAll('-', '.')} · 到着 {event.arrival} · 準備 {formatClock(event.preparationMinutes)}</Text>
                    <Text style={[styles.cardCopy, { color: theme.colors.secondaryText, marginTop: 4 }]}>移動 {event.travelMinutes}分 · 余裕 {event.bufferMinutes}分</Text>
                    <Pressable style={[styles.mapButton, { borderColor: theme.colors.primaryAccent }]} onPress={() => onOpenMap(event.destination || event.title)}>
                      <Text style={[styles.mapButtonText, { color: theme.colors.primaryAccent }]}>地図アプリで目的地を開く</Text>
                    </Pressable>
                  </View>

                  <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.sectionLabel, { color: theme.colors.primaryAccent }]}>作成者</Text>
                    <Text style={[styles.cardTitle, { color: theme.colors.primaryText }]}>{event.ownerDisplayName}</Text>
                    <Text style={[styles.cardCopy, { color: theme.colors.secondaryText }]}>最終更新 {formatStamp(event.updatedAt)}</Text>
                  </View>

                  <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.sectionLabel, { color: theme.colors.primaryAccent }]}>あなたの参加設定</Text>
                    <TextInput
                      value={draft.displayName}
                      onChangeText={(displayName) => setDraft((current) => ({ ...current, displayName }))}
                      placeholder="表示名"
                      placeholderTextColor={theme.colors.secondaryText}
                      style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.primaryText }]}
                    />
                    <View style={styles.choiceRow}>
                      {sharedAttendanceStatuses.map((status) => (
                        <Pressable
                          key={status}
                          style={[styles.choiceButton, draft.attendanceStatus === status && { backgroundColor: theme.colors.primaryAccent }]}
                          onPress={() => setDraft((current) => ({ ...current, attendanceStatus: status }))}
                        >
                          <Text style={[styles.choiceText, draft.attendanceStatus === status && styles.choiceTextActive]}>{status}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={[styles.subLabel, { color: theme.colors.secondaryText }]}>出発地点</Text>
                    <View style={styles.choiceRow}>
                      {sharedDeparturePoints.map((point) => (
                        <Pressable
                          key={point.id}
                          style={[styles.choiceButton, draft.departurePoint === point.id && { backgroundColor: theme.colors.primaryAccent }]}
                          onPress={() => setDraft((current) => ({ ...current, departurePoint: point.id }))}
                        >
                          <Text style={[styles.choiceText, draft.departurePoint === point.id && styles.choiceTextActive]}>{point.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={[styles.cardCopy, { color: theme.colors.secondaryText }]}>出発地点は端末内だけに保存: {departureLabel}</Text>
                    {draft.departurePoint === 'custom' && (
                      <TextInput
                        value={draft.departurePointLabel}
                        onChangeText={(departurePointLabel) => setDraft((current) => ({ ...current, departurePointLabel }))}
                        placeholder="指定した場所"
                        placeholderTextColor={theme.colors.secondaryText}
                        style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.primaryText, marginTop: 10 }]}
                      />
                    )}
                    <Text style={[styles.subLabel, { color: theme.colors.secondaryText }]}>行動状態</Text>
                    <View style={styles.statusWrap}>
                      {sharedActionStatuses.map((status) => (
                        <Pressable key={status} style={[styles.statusButton, draft.actionStatus === status && { borderColor: theme.colors.primaryAccent, backgroundColor: theme.colors.softAccent }]} onPress={() => void updateActionStatus(status)}>
                          <Text style={[styles.statusText, draft.actionStatus === status && { color: theme.colors.primaryAccent }]}>{status}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable style={[styles.primaryButton, !canSave && styles.primaryButtonDisabled, { backgroundColor: theme.colors.primaryAccent }]} onPress={saveParticipant} disabled={!canSave}>
                      <Text style={styles.primaryButtonText}>参加情報を保存</Text>
                    </Pressable>
                    {!!statusMessage && <Text style={[styles.statusMessage, { color: theme.colors.secondaryText }]}>{statusMessage}</Text>}
                  </View>

                  <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.sectionLabel, { color: theme.colors.primaryAccent }]}>参加者一覧</Text>
                    {event.participants.map((participant) => {
                      const isCurrent = participant.participantId === localParticipantId;
                      return (
                        <View key={participant.participantId} style={[styles.participantRow, isCurrent && { borderColor: theme.colors.primaryAccent, backgroundColor: theme.colors.softAccent }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.participantName, { color: theme.colors.primaryText }]}>{participant.displayName}{isCurrent ? '（あなた）' : ''}</Text>
                            <Text style={[styles.participantMeta, { color: theme.colors.secondaryText }]}>{participantLabel(participant.attendanceStatus)} · {participant.actionStatus}</Text>
                            <Text style={[styles.participantMeta, { color: theme.colors.secondaryText }]}>到着見込み {participant.estimatedArrivalAt ? formatStamp(participant.estimatedArrivalAt) : '—'} · 最終更新 {formatStamp(participant.lastUpdatedAt)}</Text>
                          </View>
                          {isCurrent && <Text style={[styles.currentTag, { color: theme.colors.primaryAccent }]}>現在</Text>}
                        </View>
                      );
                    })}
                  </View>

                  <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.sectionLabel, { color: theme.colors.primaryAccent }]}>共有の見え方</Text>
                    <Text style={[styles.cardCopy, { color: theme.colors.secondaryText }]}>表示名、参加状態、行動状態、到着見込み、最終更新時刻だけを共有しています。</Text>
                    <Text style={[styles.cardCopy, { color: theme.colors.secondaryText, marginTop: 6 }]}>出発地点や現在地は端末内だけで扱い、リンクには含めません。</Text>
                    {moments && <Text style={[styles.cardCopy, { color: theme.colors.secondaryText, marginTop: 6 }]}>準備 {formatClock(Math.floor((moments.leave.getTime() - moments.prepare.getTime()) / 60_000))} · 出発 {formatClock(Math.floor((moments.arrival.getTime() - moments.leave.getTime()) / 60_000))}</Text>}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(18, 16, 28, 0.35)', justifyContent: 'flex-end' },
  sheet: { minHeight: '82%', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  handle: { width: 50, height: 5, borderRadius: 999, alignSelf: 'center', backgroundColor: '#D6D1DF', marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  headerActions: { gap: 8, alignItems: 'flex-end' },
  badge: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  subtitle: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  shareButton: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  shareButtonText: { fontSize: 11, fontWeight: '900' },
  closeButton: { borderWidth: 1, borderColor: '#D8D1DF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FFFFFF' },
  closeText: { color: '#4A4452', fontSize: 11, fontWeight: '900' },
  scroll: { paddingBottom: 24, gap: 12 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  cardTitle: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
  cardCopy: { fontSize: 11, lineHeight: 17 },
  mapButton: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 4 },
  mapButtonText: { fontSize: 11, fontWeight: '900' },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontWeight: '800', backgroundColor: '#FFFFFF' },
  choiceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  choiceButton: { borderWidth: 1, borderColor: '#D8D1DF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  choiceText: { color: '#4A4452', fontSize: 11, fontWeight: '800' },
  choiceTextActive: { color: '#FFFFFF' },
  subLabel: { fontSize: 10, fontWeight: '900', marginTop: 4 },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { borderWidth: 1, borderColor: '#D8D1DF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  statusText: { color: '#4A4452', fontSize: 10, fontWeight: '800' },
  primaryButton: { borderRadius: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  statusMessage: { fontSize: 11, fontWeight: '700' },
  participantRow: { borderWidth: 1, borderColor: '#E4DFEA', borderRadius: 16, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  participantName: { fontSize: 14, fontWeight: '900' },
  participantMeta: { fontSize: 10, fontWeight: '700', marginTop: 3, lineHeight: 15 },
  currentTag: { fontSize: 9, fontWeight: '900' },
});
