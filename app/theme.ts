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
  focusBackground: string;
  focusSurface: string;
  calendarBackground: string;
  taskBackground: string;
  taskMeta: string;
  statusAccent: string;
  // Legacy aliases used by the existing check renderer and saved previews.
  warm: string;
};

export const chicCheckColorChoices: (ChicThemePalette & { id: ChicCheckColor; label: string })[] = [
  // Keep the persisted ids for backwards compatibility; the labels now describe
  // the four shared Design check palettes used on every screen.
  { id: 'monochrome', label: 'A  淡いピンク × ラベンダー', background: '#F4F1EE', patternBase: '#F4F1EE', patternStripe: '#D8D3D5', surface: '#FFFCFA', surfaceSubtle: '#F7F3F1', border: '#D8D3D5', accent: '#343237', accentSoft: '#E8E4E4', textPrimary: '#343237', textSecondary: '#6F6A70', textMuted: '#A6A1A8', focusBackground: '#F4F1EE', focusSurface: '#FFFCFA', calendarBackground: '#F4F1EE', taskBackground: '#FFFCFA', taskMeta: '#A6A1A8', statusAccent: '#343237', warm: '#D8D3D5' },
  { id: 'cool', label: 'B  淡いブルー × ブルーラベンダー', background: '#F4F3FA', patternBase: '#F4F3FA', patternStripe: '#DDE4F5', surface: '#FCFBFF', surfaceSubtle: '#EEF1FB', border: '#DDE4F5', accent: '#8C7CBD', accentSoft: '#C4D0DD', textPrimary: '#283149', textSecondary: '#68728B', textMuted: '#929BB0', focusBackground: '#F4F3FA', focusSurface: '#FCFBFF', calendarBackground: '#F4F3FA', taskBackground: '#FCFBFF', taskMeta: '#929BB0', statusAccent: '#8C7CBD', warm: '#DDE4F5' },
  { id: 'warm', label: 'C  淡いピーチ × コーラル', background: '#FBF1F3', patternBase: '#FBF1F3', patternStripe: '#EED6DE', surface: '#FFFDFD', surfaceSubtle: '#FFF0E8', border: '#EED6DE', accent: '#B66E86', accentSoft: '#D9AAB5', textPrimary: '#3B2B29', textSecondary: '#806B67', textMuted: '#A79590', focusBackground: '#FBF1F3', focusSurface: '#FFFDFD', calendarBackground: '#FBF1F3', taskBackground: '#FFFDFD', taskMeta: '#A79590', statusAccent: '#B66E86', warm: '#EED6DE' },
  { id: 'green', label: 'D  淡いミント × セージグリーン', background: '#F2F6F0', patternBase: '#F2F6F0', patternStripe: '#D9E7D9', surface: '#FCFFFC', surfaceSubtle: '#EAF6F1', border: '#D9E7D9', accent: '#758D7B', accentSoft: '#B9C8B8', textPrimary: '#263431', textSecondary: '#657B74', textMuted: '#92A59E', focusBackground: '#F2F6F0', focusSurface: '#FCFFFC', calendarBackground: '#F2F6F0', taskBackground: '#FCFFFC', taskMeta: '#92A59E', statusAccent: '#758D7B', warm: '#D9E7D9' },
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
