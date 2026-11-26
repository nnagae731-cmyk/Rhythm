import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import { styles } from '../styles/appStyles';

export function NotificationManagerCard({ designMode = 'minimal', chicPalette, readOnly = false }: { designMode?: DesignMode; chicPalette?: ChicThemePalette; readOnly?: boolean }) {
  const base = getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const colors = designMode === 'chic' && chicPalette
    ? { surface: chicPalette.cardSurface, border: chicPalette.border, text: chicPalette.textPrimary, muted: chicPalette.textSecondary, accent: chicPalette.accent, danger: chicPalette.danger }
    : { surface: base.surface, border: base.border, text: base.primaryText, muted: base.secondaryText, accent: base.primaryAccent, danger: base.danger };
  const [pending, setPending] = useState<Notifications.NotificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const generation = useRef(0);
  const stoppingRef = useRef(false);
  const refresh = useCallback(async () => {
    if (!mounted.current) return false;
    const request = ++generation.current;
    setLoading(true);
    try {
      const requests = await Notifications.getAllScheduledNotificationsAsync();
      if (mounted.current && request === generation.current) { setPending(requests); setError(''); }
      return true;
    } catch {
      if (mounted.current && request === generation.current) setError('予約通知を取得できませんでした。更新してもう一度お試しください。');
      return false;
    } finally {
      if (mounted.current && request === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    if (!readOnly) void refresh();
    return () => { mounted.current = false; generation.current += 1; };
  }, [readOnly, refresh]);

  const cancelCurrent = async () => {
    if (readOnly || stoppingRef.current) return;
    stoppingRef.current = true;
    setStopping(true);
    generation.current += 1;
    setLoading(false);
    try {
      // Take a fresh bounded snapshot. Do not cancel notifications registered
      // after this operation started (for example a newly resumed Focus).
      const requests = await Notifications.getAllScheduledNotificationsAsync();
      const results = await Promise.allSettled([...new Set(requests.map((item) => item.identifier))].map((id) => Notifications.cancelScheduledNotificationAsync(id)));
      const failed = results.some((result) => result.status === 'rejected');
      await refresh();
      if (failed && mounted.current) setError('一部の予約を取り消せませんでした。もう一度お試しください。');
    } catch {
      if (mounted.current) setError('予約を取り消せませんでした。予約状態を確認してから、もう一度お試しください。');
    } finally {
      stoppingRef.current = false;
      if (mounted.current) setStopping(false);
    }
  };
  const confirmCancel = () => Alert.alert('現在の予約通知を取り消しますか？', 'タスク・予定・集中・アファメーションなど、現在予約されている通知が対象です。通知設定はOFFになりません。操作や再起動で再予約される場合があります。', [
    { text: 'キャンセル', style: 'cancel' },
    { text: '予約を取り消す', style: 'destructive', onPress: () => { void cancelCurrent(); } },
  ]);
  if (readOnly) return <View style={[styles.notificationManagerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.notificationManagerHeader}><View><Text style={[styles.settingsTitle, { color: colors.text }]}>高度な通知</Text><Text style={[styles.switchCopy, { color: colors.muted }]}>段階的な通知を設定できます</Text></View><Text style={[styles.notificationRefreshText, { color: colors.accent }]}>Premium</Text></View>{[['09:00', 'そろそろ始められそう？'], ['09:05', 'もう一度確認しよう'], ['09:08', '今からできることを選ぶ']].map(([time, copy]) => <View key={time} style={styles.notificationPendingRow}><View style={[styles.notificationPendingDot, { backgroundColor: colors.accent }]} /><View style={{ flex: 1 }}><Text style={[styles.notificationPendingTitle, { color: colors.text }]}>{time}</Text><Text style={[styles.notificationPendingBody, { color: colors.muted }]}>{copy}</Text></View></View>)}</View>;
  return <View style={[styles.notificationManagerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.notificationManagerHeader}><View style={{ flex: 1 }}><Text style={[styles.settingsTitle, { color: colors.text }]}>通知管理</Text><Text style={[styles.switchCopy, { color: colors.muted }]}>{loading ? '確認中…' : error ? '予約状態を確認できていません' : `${pending.length}件の通知を予約中`}</Text></View><Pressable accessibilityRole="button" disabled={loading || stopping} style={[styles.notificationRefresh, { minHeight: 44, minWidth: 44, justifyContent: 'center' }]} onPress={() => { void refresh(); }}><Text style={[styles.notificationRefreshText, { color: colors.accent }]}>更新</Text></Pressable></View>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 8 }}>{error}</Text> : null}
    {pending.slice(0, 4).map((request) => <View key={request.identifier} style={styles.notificationPendingRow}><View style={[styles.notificationPendingDot, { backgroundColor: colors.accent }]} /><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={2} style={[styles.notificationPendingTitle, { color: colors.text }]}>{request.content.title ?? '通知'}</Text><Text numberOfLines={2} style={[styles.notificationPendingBody, { color: colors.muted }]}>{request.content.body ?? ''}</Text></View></View>)}
    {pending.length > 4 && <Text style={[styles.notificationMore, { color: colors.muted }]}>ほか{pending.length - 4}件</Text>}
    <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 }}>現在の予約だけを取り消します。通知機能をOFFにする操作ではありません。</Text>
    <Pressable accessibilityRole="button" disabled={loading || stopping || (pending.length === 0 && !error)} style={[styles.notificationStopButton, { borderColor: colors.danger, minHeight: 44 }, stopping && { opacity: 0.6 }]} onPress={confirmCancel}><Text style={[styles.notificationStopText, { color: colors.danger }]}>{stopping ? '予約を取り消し中…' : '現在の予約をすべて取り消す'}</Text></Pressable>
  </View>;
}
