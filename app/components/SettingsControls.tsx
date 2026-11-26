import React, { useState } from 'react';
import { styles } from '../styles/appStyles';
import { ChicCheckColor, DesignMode, chicCheckColorChoices, getChicCheckColor, getDesignCheckColorLabel } from '../theme';
import { Pressable, Text, View } from 'react-native';

export function CompactNumberSetting({ label, value, onChange, isDark = false }: { label: string; value: number; onChange: (value: number) => void; isDark?: boolean }) {
  return <View style={[styles.compactSetting, isDark && styles.compactSettingDark]}>
    <Text style={[styles.compactLabel, isDark && styles.compactLabelDark]}>{label}</Text>
    <View style={styles.compactControls}>
      <Pressable onPress={() => onChange(Math.max(0, value - 5))}><Text style={[styles.compactStep, isDark && styles.compactStepDark]}>−</Text></Pressable>
      <Text style={[styles.compactValue, isDark && styles.compactValueDark]}>{value}分</Text>
      <Pressable onPress={() => onChange(value + 5)}><Text style={[styles.compactStep, isDark && styles.compactStepDark]}>＋</Text></Pressable>
    </View>
  </View>;
}

export function ThemeColorSelector({ color, onChange, designMode, surfaceMode }: { color: ChicCheckColor; onChange: (color: ChicCheckColor) => void; designMode: DesignMode; surfaceMode?: DesignMode }) {
  const [expanded, setExpanded] = useState(false);
  const selected = getChicCheckColor(color);
  const selectedLabel = getDesignCheckColorLabel(color);
  const isDarkSurface = (surfaceMode ?? designMode) === 'dark';
  const textColor = isDarkSurface ? '#F4F7FC' : selected.textPrimary;
  return <View style={[styles.themeColorSelector, { borderColor: isDarkSurface ? '#40506A' : selected.border, backgroundColor: isDarkSurface ? '#181F2E' : selected.cardSurface }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`テーマカラー、現在${selectedLabel}`} accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={styles.themeColorSelectorHeader}>
      <View style={[styles.themeColorSelectorSwatch, { backgroundColor: selected.accent, borderColor: selected.border }]} />
      <Text style={[styles.themeColorSelectorLabel, { color: textColor }]} numberOfLines={1}>{selectedLabel}</Text>
      <Text style={[styles.themeColorSelectorChevron, { color: selected.accent }]}>{expanded ? '⌃' : '⌄'}</Text>
    </Pressable>
    {expanded && <View style={[styles.themeColorGrid, { borderTopColor: selected.border }]}>
      {chicCheckColorChoices.map((choice) => {
        const active = choice.id === color;
        return <Pressable key={choice.id} accessibilityRole="button" accessibilityLabel={getDesignCheckColorLabel(choice.id)} accessibilityState={{ selected: active }} onPress={() => { onChange(choice.id); setExpanded(false); }} style={[styles.themeColorGridItem, { backgroundColor: isDarkSurface ? '#20293A' : choice.cardSurface, borderColor: active ? choice.accent : choice.border }, active && { borderWidth: 2 }]}>
          <View style={[styles.themeColorGridSwatch, { backgroundColor: choice.accent, borderColor: choice.border }]} />
          <Text style={[styles.themeColorGridText, { color: isDarkSurface ? '#D7DEEA' : active ? choice.accent : choice.textSecondary }]} numberOfLines={1}>{getDesignCheckColorLabel(choice.id)}</Text>
        </Pressable>;
      })}
    </View>}
  </View>;
}
