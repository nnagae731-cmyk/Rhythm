import { styles } from '../styles/appStyles';
import { ChicThemePalette, DesignMode } from '../theme';
import { DeparturePlan } from '../types';
import { Pressable, ScrollView, Text, View } from 'react-native';

export function withCalendarBandAlpha(color: string, alpha: number) {
  const normalizedAlpha = Math.max(0, Math.min(1, alpha));
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const value = hex[1]!;
    return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${normalizedAlpha})`;
  }
  const rgb = color.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${normalizedAlpha})`;
  return color;
}

export function CalendarMarkPicker({ date, mark, onSet, designMode, chicPalette }: { date: string; mark?: string; onSet: (date: string, mark?: string) => void; designMode: DesignMode; chicPalette?: ChicThemePalette }) {
  const stickers = ['🌸', '💗', '☕', '⭐', '🎯', '📌'];
  const isDark = designMode === 'dark';
  const isChic = designMode === 'chic' && Boolean(chicPalette);
  return <View style={{ marginTop: 6, marginBottom: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
      <Text style={[styles.calendarMarkTitle, { fontSize: 14, fontWeight: '500' }, isDark && styles.darkMutedText, isChic && chicPalette && { color: chicPalette.textSecondary }]}>この日の目印</Text>
      {mark ? <Pressable accessibilityRole="button" accessibilityLabel="目印を外す" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => onSet(date, undefined)}><Text style={[styles.calendarMarkClearText, isDark && styles.darkMutedText, isChic && chicPalette && { color: chicPalette.textSecondary }]}>×</Text></Pressable> : null}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingVertical: 4 }}>
      {stickers.map((sticker) => <Pressable key={sticker} accessibilityRole="button" accessibilityLabel={sticker + 'を目印にする'} accessibilityState={{ selected: mark === sticker }} style={[styles.calendarMarkChoice, { backgroundColor: 'transparent', borderColor: 'transparent' }, mark === sticker && styles.calendarMarkChoiceActive, mark === sticker && isDark && styles.darkCalendarMarkChoiceActive, mark === sticker && isChic && chicPalette && { backgroundColor: chicPalette.accentSoft, borderColor: chicPalette.accent }, { width: 44, height: 44, borderRadius: 22 }]} onPress={() => onSet(date, mark === sticker ? undefined : sticker)}><Text style={[styles.calendarMarkChoiceText, isChic && chicPalette && { color: chicPalette.accentStrong }]}>{sticker}</Text></Pressable>)}
    </ScrollView>
  </View>;
}

export function DesignCalendarPlanActions({ plan, chicPalette, onEdit, onDelete, onOpenMap }: { plan: DeparturePlan; chicPalette: ChicThemePalette; onEdit: (plan: DeparturePlan) => void; onDelete: (id: string) => void; onOpenMap: (plan: DeparturePlan) => void }) {
  const buttonStyle = { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' as const, borderRadius: 10, borderWidth: 1, borderColor: chicPalette.border, backgroundColor: chicPalette.cardTint };
  return <View style={[styles.scheduleAgendaActions, { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }]}>
    {plan.destination?.trim() && <Pressable hitSlop={6} style={buttonStyle} onPress={(event) => { event.stopPropagation(); onOpenMap(plan); }}><Text style={{ color: chicPalette.accentStrong, fontSize: 10, fontWeight: '900' }}>地図</Text></Pressable>}
    <Pressable hitSlop={6} style={buttonStyle} onPress={(event) => { event.stopPropagation(); onEdit(plan); }}><Text style={{ color: chicPalette.textPrimary, fontSize: 10, fontWeight: '900' }}>編集</Text></Pressable>
    {plan.id && <Pressable hitSlop={6} style={[buttonStyle, { borderColor: chicPalette.danger, backgroundColor: chicPalette.accentSoft }]} onPress={(event) => { event.stopPropagation(); onDelete(plan.id!); }}><Text style={{ color: chicPalette.danger, fontSize: 10, fontWeight: '900' }}>削除</Text></Pressable>}
  </View>;
}
