export type DesignMode = 'minimal' | 'dark' | 'chic' | 'photo';
// floralSoft/floralSeasonal/floralDark remain accepted for old saved settings;
// they are no longer offered as new choices and normalize to the supported
// plain Design background.
export type ChicPattern = 'plain' | 'floral' | 'floralSoft' | 'floralSeasonal' | 'floralDark' | 'dot' | 'checkLavenderSatin' | 'checkBeigeNoir' | 'checkMauveFrame';
export type ChicCheckColor = 'monochrome' | 'cool' | 'warm' | 'green';
export type ChicThemePalette = {
  id: ChicCheckColor;
  background: string;
  patternBase: string;
  patternStripe: string;
  surface: string;
  surfaceSubtle: string;
  border: string;
  accent: string;
  accentSoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Legacy aliases used by the existing check renderer and saved previews.
  warm: string;
};

export const chicCheckColorChoices: (ChicThemePalette & { id: ChicCheckColor; label: string })[] = [
  // Keep the persisted ids for backwards compatibility; the labels now describe
  // the four shared Design check palettes used on every screen.
  { id: 'monochrome', label: 'A  淡いピンク × ラベンダー', background: '#FFF7FA', patternBase: '#FFF7FA', patternStripe: '#E9DDF0', surface: '#FFFDFD', surfaceSubtle: '#FCEEF4', border: '#E8CAD8', accent: '#D66A91', accentSoft: '#F5D5E0', textPrimary: '#3A2B38', textSecondary: '#766675', textMuted: '#9C8F9D', warm: '#E9DDF0' },
  { id: 'cool', label: 'B  淡いブルー × ブルーラベンダー', background: '#F6F8FE', patternBase: '#F6F8FE', patternStripe: '#DDE4F5', surface: '#FFFFFF', surfaceSubtle: '#EEF1FB', border: '#C9D5ED', accent: '#6B86C8', accentSoft: '#DCE4F7', textPrimary: '#283149', textSecondary: '#68728B', textMuted: '#929BB0', warm: '#DDE4F5' },
  { id: 'warm', label: 'C  淡いピーチ × コーラル', background: '#FFF9F4', patternBase: '#FFF9F4', patternStripe: '#F7E1D6', surface: '#FFFEFC', surfaceSubtle: '#FFF0E8', border: '#EACCC1', accent: '#D97F6D', accentSoft: '#F9DDD3', textPrimary: '#3B2B29', textSecondary: '#806B67', textMuted: '#A79590', warm: '#F7E1D6' },
  { id: 'green', label: 'D  淡いミント × セージグリーン', background: '#F5FBF8', patternBase: '#F5FBF8', patternStripe: '#D9EEE7', surface: '#FCFFFD', surfaceSubtle: '#EAF6F1', border: '#C5DED4', accent: '#6FA995', accentSoft: '#D8EEE6', textPrimary: '#263431', textSecondary: '#657B74', textMuted: '#92A59E', warm: '#D9EEE7' },
];

export function normalizeChicCheckColor(color: unknown): ChicCheckColor {
  return color === 'monochrome' || color === 'cool' || color === 'warm' || color === 'green' ? color : 'cool';
}

export function getChicCheckColor(color: ChicCheckColor) {
  return chicCheckColorChoices.find((item) => item.id === color) ?? chicCheckColorChoices[1]!;
}

export function getChicThemePalette(color: ChicCheckColor): ChicThemePalette {
  return getChicCheckColor(color);
}

export type ThemeTokens = {
  colors: {
    screenBackground: string; surface: string; secondarySurface: string;
    primaryText: string; secondaryText: string; primaryAccent: string;
    secondaryAccent: string; softAccent: string; border: string;
    success: string; warning: string; danger: string;
  };
  radius: { large: number; small: number; button: number; chip: number; modal: number };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  shadow: { color: string; opacity: number; radius: number; y: number };
  typography: { hero: number; section: number; card: number; body: number; button: number; meta: number; decorative: number };
};

const shared = {
  spacing: { xs: 4, sm: 8, md: 14, lg: 22, xl: 30 },
  typography: { hero: 28, section: 22, card: 17, body: 14, button: 15, meta: 11, decorative: 9 },
};

export function getThemeTokens(mode: DesignMode, checkColor: ChicCheckColor = 'cool'): ThemeTokens {
  if (mode === 'dark') return {
    ...shared,
    colors: { screenBackground: '#101522', surface: '#181F2E', secondarySurface: '#20293A', primaryText: '#F4F7FC', secondaryText: '#8F9BB0', primaryAccent: '#8EA6FF', secondaryAccent: '#7ED6C4', softAccent: '#26365F', border: '#303B50', success: '#7ED6C4', warning: '#E8B878', danger: '#FF8F9C' },
    radius: { large: 16, small: 10, button: 12, chip: 10, modal: 18 },
    shadow: { color: '#000000', opacity: 0.26, radius: 14, y: 5 },
  };
  if (mode === 'minimal') return {
    ...shared,
    colors: { screenBackground: '#F7F7F5', surface: '#FFFFFF', secondarySurface: '#EEF2F8', primaryText: '#182235', secondaryText: '#68748A', primaryAccent: '#4F6FED', secondaryAccent: '#5FAFA4', softAccent: '#E8EEFF', border: '#DCE2EC', success: '#4F9A83', warning: '#C58A4A', danger: '#C65E67' },
    radius: { large: 16, small: 10, button: 12, chip: 10, modal: 18 },
    shadow: { color: '#1B2B4A', opacity: 0.08, radius: 12, y: 4 },
  };
  if (mode === 'photo') return {
    ...shared,
    colors: { screenBackground: '#F7F1EF', surface: '#FFFCFA', secondarySurface: '#F8ECEB', primaryText: '#2C252B', secondaryText: '#76666D', primaryAccent: '#9C5D79', secondaryAccent: '#786EAF', softAccent: '#F1DDE4', border: '#E7D5D9', success: '#5B8D79', warning: '#B9824D', danger: '#BB5D6D' },
    radius: { large: 18, small: 10, button: 12, chip: 999, modal: 22 },
    shadow: { color: '#76505E', opacity: 0.12, radius: 16, y: 6 },
  };
  const palette = getChicThemePalette(checkColor);
  return {
    ...shared,
    colors: { screenBackground: palette.background, surface: palette.surface, secondarySurface: palette.surfaceSubtle, primaryText: palette.textPrimary, secondaryText: palette.textSecondary, primaryAccent: palette.accent, secondaryAccent: palette.patternStripe, softAccent: palette.accentSoft, border: palette.border, success: palette.accent, warning: palette.textSecondary, danger: palette.accent },
    radius: { large: 26, small: 18, button: 18, chip: 999, modal: 28 },
    shadow: { color: palette.accent, opacity: 0.12, radius: 18, y: 7 },
  };
}

export function normalizeChicPattern(pattern: unknown): ChicPattern {
  if (pattern === 'plain' || pattern === 'dot' || pattern === 'checkLavenderSatin' || pattern === 'checkBeigeNoir' || pattern === 'checkMauveFrame') return pattern;
  if (pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark') return 'plain';
  if (pattern === 'check') return 'checkLavenderSatin';
  return 'plain';
}
