export type DesignMode = 'minimal' | 'dark' | 'chic' | 'photo';

// Legacy floral/check ids remain accepted for saved settings. New Design choices
// continue to use the persisted `chic` key for backwards compatibility.
export type ChicPattern = 'plain' | 'floral' | 'floralSoft' | 'floralSeasonal' | 'floralDark' | 'dot' | 'checkLavenderSatin' | 'checkBeigeNoir' | 'checkMauveFrame';
export type ChicCheckColor = 'monochrome' | 'cool' | 'warm' | 'green';
/** Design palette ids include the legacy floral pattern ids so shared theme
 * helpers can resolve a single palette for every Design screen. */
export type DesignPaletteId = ChicCheckColor | 'floral' | 'floralSoft' | 'floralSeasonal' | 'floralDark';

export type ChicThemePalette = {
  id: DesignPaletteId;
  background: string;
  patternBase: string;
  patternStripe: string;
  surface: string;
  cardSurface: string;
  cardTint: string;
  // Existing callers use this alias for secondary card surfaces.
  surfaceSubtle: string;
  border: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  onAccent: string;
  success: string;
  warning: string;
  danger: string;
  focusBackground: string;
  focusSurface: string;
  calendarBackground: string;
  taskBackground: string;
  taskMeta: string;
  statusAccent: string;
  // Legacy aliases used by the existing pattern renderer.
  warm: string;
};

const designPalettes: Record<ChicCheckColor, ChicThemePalette> = {
  monochrome: {
    id: 'monochrome', background: '#F4F1EE', patternBase: '#F4F1EE', patternStripe: '#D8D3D6',
    surface: '#FFFFFF', cardSurface: '#FFFDFC', cardTint: '#F0ECEF', surfaceSubtle: '#F0ECEF',
    accent: '#343237', accentStrong: '#242126', accentSoft: '#E7E2E4', border: '#D7D1D5',
    textPrimary: '#2A272B', textSecondary: '#6F6A70', textMuted: '#9A949B', onAccent: '#FFFFFF',
    success: '#52685B', warning: '#8C7047', danger: '#A55E66', focusBackground: '#F4F1EE',
    focusSurface: '#FFFDFC', calendarBackground: '#F4F1EE', taskBackground: '#FFFDFC', taskMeta: '#9A949B',
    statusAccent: '#52685B', warm: '#D8D3D6',
  },
  cool: {
    id: 'cool', background: '#F4F3FA', patternBase: '#F4F3FA', patternStripe: '#D8D6EA',
    surface: '#FFFFFF', cardSurface: '#FCFBFF', cardTint: '#EEEBF7', surfaceSubtle: '#EEEBF7',
    accent: '#9C91C4', accentStrong: '#6D619C', accentSoft: '#E4E0F2', border: '#D5D1E6',
    textPrimary: '#2D2A35', textSecondary: '#6D6878', textMuted: '#9691A1', onAccent: '#FFFFFF',
    success: '#5E7D77', warning: '#8C744A', danger: '#A96874', focusBackground: '#F4F3FA',
    focusSurface: '#FCFBFF', calendarBackground: '#F4F3FA', taskBackground: '#FCFBFF', taskMeta: '#9691A1',
    statusAccent: '#5E7D77', warm: '#D8D6EA',
  },
  warm: {
    id: 'warm', background: '#FBF1F3', patternBase: '#FBF1F3', patternStripe: '#EBCFD7',
    surface: '#FFFFFF', cardSurface: '#FFF9FA', cardTint: '#F7E7EC', surfaceSubtle: '#F7E7EC',
    accent: '#B66E86', accentStrong: '#8E4F65', accentSoft: '#F3DDE3', border: '#E5C7D0',
    textPrimary: '#342A2E', textSecondary: '#765E66', textMuted: '#A38C94', onAccent: '#FFFFFF',
    success: '#5E7A67', warning: '#9B7246', danger: '#9E5367', focusBackground: '#FBF1F3',
    focusSurface: '#FFF9FA', calendarBackground: '#FBF1F3', taskBackground: '#FFF9FA', taskMeta: '#A38C94',
    statusAccent: '#5E7A67', warm: '#EBCFD7',
  },
  green: {
    id: 'green', background: '#F2F6F0', patternBase: '#F2F6F0', patternStripe: '#D3E0D4',
    surface: '#FFFFFF', cardSurface: '#FAFCF9', cardTint: '#E8F0E8', surfaceSubtle: '#E8F0E8',
    accent: '#758D7B', accentStrong: '#526A59', accentSoft: '#DDE9DE', border: '#CBD9CB',
    textPrimary: '#2C332E', textSecondary: '#667267', textMuted: '#929D94', onAccent: '#FFFFFF',
    success: '#56735E', warning: '#8C744A', danger: '#9D5E66', focusBackground: '#F2F6F0',
    focusSurface: '#FAFCF9', calendarBackground: '#F2F6F0', taskBackground: '#FAFCF9', taskMeta: '#929D94',
    statusAccent: '#56735E', warm: '#D3E0D4',
  },
};

const floralPalettes: Record<'floral' | 'floralSoft' | 'floralSeasonal' | 'floralDark', ChicThemePalette> = {
  floral: {
    id: 'floral', background: '#F8F1EC', patternBase: '#F8F1EC', patternStripe: '#E4D1CB',
    surface: '#FFFDFB', cardSurface: 'rgba(255, 252, 249, 0.92)', cardTint: '#F8EDEF', surfaceSubtle: '#F8EDEF',
    border: '#E4D1CB', accent: '#B78382', accentStrong: '#8F6266', accentSoft: '#EAD6D8',
    textPrimary: '#4A3F3D', textSecondary: '#806F6B', textMuted: '#A0918D', onAccent: '#FFFFFF',
    success: '#607D6D', warning: '#92734F', danger: '#A86370', focusBackground: '#F8F1EC',
    focusSurface: '#FFFDFB', calendarBackground: '#F8F1EC', taskBackground: '#FFFDFB', taskMeta: '#806F6B',
    statusAccent: '#B78382', warm: '#E4D1CB',
  },
  floralSoft: {
    id: 'floralSoft', background: '#FBFAF7', patternBase: '#FBFAF7', patternStripe: '#DED7CE',
    surface: '#FFFFFF', cardSurface: 'rgba(255, 255, 255, 0.94)', cardTint: '#F3F0EB', surfaceSubtle: '#F3F0EB',
    border: '#DED7CE', accent: '#9A8877', accentStrong: '#756556', accentSoft: '#E9E2D9',
    textPrimary: '#443E39', textSecondary: '#79716A', textMuted: '#9B9289', onAccent: '#FFFFFF',
    success: '#607A67', warning: '#92744E', danger: '#A86468', focusBackground: '#FBFAF7',
    focusSurface: '#FFFFFF', calendarBackground: '#FBFAF7', taskBackground: '#FFFFFF', taskMeta: '#79716A',
    statusAccent: '#9A8877', warm: '#DED7CE',
  },
  floralSeasonal: {
    id: 'floralSeasonal', background: '#FCF3F5', patternBase: '#FCF3F5', patternStripe: '#E8CBD6',
    surface: '#FFFDFD', cardSurface: 'rgba(255, 253, 253, 0.90)', cardTint: '#F9E9EF', surfaceSubtle: '#F9E9EF',
    border: '#E8CBD6', accent: '#C17E99', accentStrong: '#9C5E79', accentSoft: '#F0D5DF',
    textPrimary: '#493A42', textSecondary: '#866E7B', textMuted: '#A88F9A', onAccent: '#FFFFFF',
    success: '#637C70', warning: '#96734E', danger: '#A75E73', focusBackground: '#FCF3F5',
    focusSurface: '#FFFDFD', calendarBackground: '#FCF3F5', taskBackground: '#FFFDFD', taskMeta: '#866E7B',
    statusAccent: '#C17E99', warm: '#E8CBD6',
  },
  // Keep the legacy id readable for saved settings; it shares the Sheer Floral
  // palette rather than introducing a fourth floral design.
  floralDark: {
    id: 'floralDark', background: '#FCF3F5', patternBase: '#FCF3F5', patternStripe: '#E8CBD6',
    surface: '#FFFDFD', cardSurface: 'rgba(255, 253, 253, 0.90)', cardTint: '#F9E9EF', surfaceSubtle: '#F9E9EF',
    border: '#E8CBD6', accent: '#C17E99', accentStrong: '#9C5E79', accentSoft: '#F0D5DF',
    textPrimary: '#493A42', textSecondary: '#866E7B', textMuted: '#A88F9A', onAccent: '#FFFFFF',
    success: '#637C70', warning: '#96734E', danger: '#A75E73', focusBackground: '#FCF3F5',
    focusSurface: '#FFFDFD', calendarBackground: '#FCF3F5', taskBackground: '#FFFDFD', taskMeta: '#866E7B',
    statusAccent: '#C17E99', warm: '#E8CBD6',
  },
};

export const chicCheckColorChoices = [
  { ...designPalettes.monochrome, label: 'モノトーン' },
  { ...designPalettes.cool, label: '寒色系' },
  { ...designPalettes.warm, label: '暖色系' },
  { ...designPalettes.green, label: '緑系' },
] as (Omit<ChicThemePalette, 'id'> & { id: ChicCheckColor; label: string })[];

// Keep the persisted choice ids stable while presenting readable Japanese labels.
export function getDesignCheckColorLabel(color: ChicCheckColor): string {
  switch (color) {
    case 'monochrome': return '\u30e2\u30ce\u30c8\u30fc\u30f3';
    case 'cool': return '\u5bd2\u8272\u7cfb';
    case 'warm': return '\u6696\u8272\u7cfb';
    case 'green': return '\u7dd1\u7cfb';
  }
}

export function normalizeChicCheckColor(color: unknown): ChicCheckColor {
  return color === 'monochrome' || color === 'cool' || color === 'warm' || color === 'green' ? color : 'cool';
}

export function getChicCheckColor(color: ChicCheckColor) {
  return chicCheckColorChoices.find((item) => item.id === color) ?? chicCheckColorChoices[1]!;
}

/** Shared Design tokens. The legacy function name remains for saved-data compatibility. */
export function getDesignCheckThemeTokens(checkColor: ChicCheckColor): ChicThemePalette {
  return designPalettes[normalizeChicCheckColor(checkColor)];
}

/** Resolve the Design palette for either a check color or one of the three
 * floral backgrounds. The persisted pattern ids are intentionally preserved. */
export function getDesignPatternThemeTokens(pattern: ChicPattern, checkColor: ChicCheckColor): ChicThemePalette {
  if (pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark') {
    return floralPalettes[pattern];
  }
  return getDesignCheckThemeTokens(checkColor);
}

export function getChicThemePalette(color: ChicCheckColor): ChicThemePalette {
  return getDesignCheckThemeTokens(color);
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

export function getThemeTokens(mode: DesignMode, checkColor: DesignPaletteId = 'cool'): ThemeTokens {
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
  const palette = checkColor === 'floral' || checkColor === 'floralSoft' || checkColor === 'floralSeasonal' || checkColor === 'floralDark'
    ? floralPalettes[checkColor]
    : getDesignCheckThemeTokens(checkColor);
  return {
    ...shared,
    colors: { screenBackground: palette.background, surface: palette.cardSurface, secondarySurface: palette.cardTint, primaryText: palette.textPrimary, secondaryText: palette.textSecondary, primaryAccent: palette.accent, secondaryAccent: palette.patternStripe, softAccent: palette.accentSoft, border: palette.border, success: palette.success, warning: palette.warning, danger: palette.danger },
    radius: { large: 26, small: 18, button: 18, chip: 999, modal: 28 },
    shadow: { color: palette.accent, opacity: 0.12, radius: 18, y: 7 },
  };
}

export function normalizeChicPattern(pattern: unknown): ChicPattern {
  if (pattern === 'plain' || pattern === 'dot' || pattern === 'checkLavenderSatin' || pattern === 'checkBeigeNoir' || pattern === 'checkMauveFrame') return pattern;
  if (pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark') return pattern;
  if (pattern === 'check') return 'checkLavenderSatin';
  return 'plain';
}
