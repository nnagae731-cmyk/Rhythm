import { styles } from '../styles/appStyles';
import { ChicPattern, ChicThemePalette, DesignMode, getDesignCheckThemeTokens } from '../theme';
import { TimeTab } from '../types';
import { Pressable, Text, View } from 'react-native';

export function TimeTabButton({ tab, active, designMode, chicPattern, chicPalette, themeAccent, secondaryText, onPress }: { tab: TimeTab; active: boolean; designMode: DesignMode; chicPattern: ChicPattern; chicPalette?: ChicThemePalette; themeAccent: string; secondaryText: string; onPress: () => void }) {
  const palette: ChicThemePalette = chicPalette ?? getDesignCheckThemeTokens('cool');
  const label = tab === 'departure' ? '出発' : tab === 'deadline' ? 'スケジュール' : tab === 'calendar' ? '予定表' : '集中';
  const isDark = designMode === 'dark';
  if (designMode === 'chic') return <Pressable style={[styles.timeTab, styles.timeTabChicPattern, { flex: tab === 'deadline' ? 1.65 : 1, minWidth: 0, backgroundColor: palette.background, borderColor: active ? palette.accent : palette.border }, active && { borderWidth: 2 }]} onPress={onPress}><View style={[styles.timeTabGlassLabel, { width: '100%', backgroundColor: active ? palette.accentSoft : palette.cardSurface, borderColor: palette.border }]}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.timeTabText, { flexShrink: 1, color: active ? palette.accentStrong : palette.textSecondary }]}>{label}</Text>{active && <Text style={[styles.timeTabMarker, { color: palette.accent }]}>●</Text>}</View></Pressable>;
     return <Pressable style={[styles.timeTab, styles.timeTabMinimal, { flex: tab === 'deadline' ? 1.65 : 1, minWidth: 0 }, isDark && styles.darkSurface, active && styles.timeTabActive, active && { backgroundColor: isDark ? '#26365F' : themeAccent, borderColor: isDark ? '#6F8DFF' : themeAccent }]} onPress={onPress}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.timeTabText, { flexShrink: 1, color: isDark ? '#F4F7FC' : secondaryText }, active && styles.timeTabTextActive, active && styles.timeTabTextActiveMinimal]}>{label}</Text></Pressable>;
}
