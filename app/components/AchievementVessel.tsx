import { dateKey } from '../features/schedule/dateTimeUtils';
import { styles } from '../styles/appStyles';
import { ChicPattern, ChicThemePalette, getDesignCheckThemeTokens, getThemeTokens } from '../theme';
import { Task, ThemeMode } from '../types';
import { Text, View } from 'react-native';

export function AchievementVessel({ tasks, designMode, chicPattern = 'plain', chicPalette, scope = 'month', targetDate, targetMonth, compact = false }: { tasks: Task[]; designMode: ThemeMode; chicPattern?: ChicPattern; chicPalette?: ChicThemePalette; scope?: 'today' | 'month'; targetDate?: string; targetMonth?: string; compact?: boolean }) {
  const now = new Date();
  const completed = tasks.filter((task) => {
    if (!task.done || !task.completedAt) return false;
    const completedDate = new Date(task.completedAt);
    return targetDate ? dateKey(completedDate) === targetDate : scope === 'today' ? dateKey(completedDate) === dateKey(now) : dateKey(completedDate).startsWith(targetMonth ?? dateKey(now).slice(0, 7));
  }).flatMap((task) => task.subtasks?.length ? task.subtasks.filter((item) => item.done).map((item) => ({ ...task, id: `${task.id}:${item.id}`, title: item.title })) : [task]);
  const visible = completed.slice(-18);
  if (designMode !== 'chic') {
    const monoTheme = getThemeTokens(designMode);
    return <View style={[styles.minimalAchievement, compact && styles.minimalAchievementCompact, { backgroundColor: monoTheme.colors.surface, borderColor: monoTheme.colors.border, borderWidth: 1 }]}><View><Text style={[styles.minimalAchievementLabel, { color: monoTheme.colors.secondaryText }]}>{targetDate ? 'この日の達成グラフ' : scope === 'today' ? '今日の達成グラフ' : '今月の達成グラフ'}</Text><Text style={[styles.minimalAchievementNumber, compact && styles.minimalAchievementNumberCompact, { color: monoTheme.colors.primaryText }]}>{String(completed.length).padStart(2, '0')}</Text><Text style={[styles.taskMeta, { color: monoTheme.colors.secondaryText }]}>{completed.length}件完了</Text></View><View style={styles.minimalAchievementBars}>{Array.from({ length: 10 }, (_, item) => <View key={item} style={[styles.minimalAchievementBar, { backgroundColor: item < Math.min(10, completed.length) ? monoTheme.colors.primaryAccent : monoTheme.colors.secondarySurface }]} />)}</View></View>;
  }
  const vesselPalette = chicPalette ?? getDesignCheckThemeTokens('cool');
  return <View style={[styles.vesselScene, compact && styles.vesselSceneCompact, styles.vesselSceneChic, { backgroundColor: vesselPalette.cardTint, borderColor: vesselPalette.border }]}>
    <View style={[styles.vesselLabel, styles.vesselLabelChic, { backgroundColor: vesselPalette.cardSurface }]}><Text style={[styles.vesselLabelTop, { color: vesselPalette.textSecondary }]}>{targetDate ? 'この日の達成の瓶' : scope === 'today' ? '今日の達成の瓶' : '今月の達成の瓶'}</Text><Text style={[styles.vesselLabelTitle, compact && styles.vesselLabelTitleCompact, { color: vesselPalette.textPrimary }]}>{completed.length}個のできた！</Text></View>
    <View style={[styles.jarLid, designMode === 'chic' && { backgroundColor: vesselPalette.accent }]} />
    <View style={[styles.jarBody, compact && styles.jarBodyCompact, designMode === 'chic' && { borderColor: vesselPalette.border, backgroundColor: vesselPalette.cardSurface }]}>
      {visible.map((task, index) => <View key={task.id} style={[styles.jarTreasure, designMode === 'chic' && { backgroundColor: vesselPalette.cardSurface }, { left: 13 + (index % 6) * 39, bottom: 10 + Math.floor(index / 6) * 35, transform: [{ rotate: `${(index % 5) * 8 - 16}deg` }] }]}><Text style={[styles.jarTreasureText, designMode === 'chic' && { color: vesselPalette.accent }]}>{designMode === 'chic' ? (index % 3 === 0 ? '✿' : index % 3 === 1 ? '★' : '●') : (index % 2 ? '★' : '🍪')}</Text></View>)}
      {visible.length === 0 && <Text style={styles.jarEmptyText}>最初のひとつを待っています</Text>}
    </View>
    {!compact && <Text style={[styles.vesselCaption, designMode === 'chic' && { color: vesselPalette.textSecondary }]}>{designMode === 'chic' ? '終わるたび、瓶に小さな花が増えます' : '相棒の宝物が少しずつ増えていくよ'}</Text>}
  </View>;
}
