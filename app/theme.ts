export type DesignMode = 'minimal' | 'dark' | 'chic' | 'photo';

// Legacy floral/check ids remain accepted for saved settings. New Design choices
// continue to use the persisted `chic` key for backwards compatibility.
export type ChicPattern = 'plain' | 'floral' | 'floralSoft' | 'floralSeasonal' | 'floralDark' | 'dot' | 'checkLavenderSatin' | 'checkBeigeNoir' | 'checkMauveFrame';
export type ChicCheckColor = 'monochrome' | 'cool' | 'warm' | 'green' | 'orange' | 'yellow' | 'blue' | 'lightBlue' | 'pink';
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

// The Design UI always follows the selected color, independently of the
// decorative pattern rendered behind it. Keep this smaller public shape for
// components that only need shared UI tokens while retaining the legacy
// palette fields above for compatibility with existing callers.
export type ChicThemeTokens = Pick<ChicThemePalette,
  'background' | 'surface' | 'surfaceSubtle' | 'accent' | 'accentSoft' |
  'textPrimary' | 'textSecondary' | 'border' | 'onAccent'>;

export type PremiumFeatureCardTheme = {
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  accent: string;
  onAccent: string;
  border: string;
  showPatternDecor: boolean;
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
    accent: '#8278B8', accentStrong: '#625A96', accentSoft: '#E4E0F2', border: '#D5D1E6',
    textPrimary: '#2D2A35', textSecondary: '#6D6878', textMuted: '#9691A1', onAccent: '#FFFFFF',
    success: '#5E7D77', warning: '#8C744A', danger: '#A96874', focusBackground: '#F4F3FA',
    focusSurface: '#FCFBFF', calendarBackground: '#F4F3FA', taskBackground: '#FCFBFF', taskMeta: '#9691A1',
    statusAccent: '#5E7D77', warm: '#D8D6EA',
  },
  warm: {
    id: 'warm', background: '#FCF0F0', patternBase: '#FCF0F0', patternStripe: '#E9C4C4',
    surface: '#FFFFFF', cardSurface: '#FFF9F9', cardTint: '#F8E3E3', surfaceSubtle: '#F8E3E3',
    accent: '#B85D5D', accentStrong: '#8E4141', accentSoft: '#F3D7D7', border: '#E4C1C1',
    textPrimary: '#342829', textSecondary: '#76595A', textMuted: '#A38989', onAccent: '#FFFFFF',
    success: '#5E7A67', warning: '#9B7246', danger: '#9E5367', focusBackground: '#FCF0F0',
    focusSurface: '#FFF9F9', calendarBackground: '#FCF0F0', taskBackground: '#FFF9F9', taskMeta: '#A38989',
    statusAccent: '#5E7A67', warm: '#E9C4C4',
  },
  green: {
    id: 'green', background: '#F0F7F2', patternBase: '#F0F7F2', patternStripe: '#C9DDCE',
    surface: '#FFFFFF', cardSurface: '#FAFCFA', cardTint: '#E5F0E7', surfaceSubtle: '#E5F0E7',
    accent: '#5F8A6D', accentStrong: '#426B50', accentSoft: '#D8E8DC', border: '#C5D9C9',
    textPrimary: '#29352D', textSecondary: '#617366', textMuted: '#8D9D91', onAccent: '#FFFFFF',
    success: '#4F795D', warning: '#8C744A', danger: '#9D5E66', focusBackground: '#F0F7F2',
    focusSurface: '#FAFCFA', calendarBackground: '#F0F7F2', taskBackground: '#FAFCFA', taskMeta: '#8D9D91',
    statusAccent: '#4F795D', warm: '#C9DDCE',
  },
  orange: {
    id: 'orange', background: '#FCF1E7', patternBase: '#FCF1E7', patternStripe: '#EAC8AA',
    surface: '#FFFFFF', cardSurface: '#FFFBF7', cardTint: '#F8E7D5', surfaceSubtle: '#F8E7D5',
    accent: '#B8774C', accentStrong: '#8E5935', accentSoft: '#F3D7BD', border: '#E4C5A8',
    textPrimary: '#3B3028', textSecondary: '#78675A', textMuted: '#A18F82', onAccent: '#FFFFFF',
    success: '#5D7A64', warning: '#9B7246', danger: '#A45E5E', focusBackground: '#FCF1E7',
    focusSurface: '#FFFBF7', calendarBackground: '#FCF1E7', taskBackground: '#FFFBF7', taskMeta: '#A18F82',
    statusAccent: '#5D7A64', warm: '#EAC8AA',
  },
  yellow: {
    id: 'yellow', background: '#FFF9D9', patternBase: '#FFF9D9', patternStripe: '#F0DE82',
    surface: '#FFFFFF', cardSurface: '#FFFDF1', cardTint: '#F8F0C8', surfaceSubtle: '#F8F0C8',
    accent: '#A48616', accentStrong: '#75600B', accentSoft: '#F3E8A8', border: '#E4D68A',
    textPrimary: '#3B3520', textSecondary: '#746A43', textMuted: '#9C9164', onAccent: '#FFFFFF',
    success: '#5E7A62', warning: '#9A721B', danger: '#A45E5E', focusBackground: '#FFF9D9',
    focusSurface: '#FFFDF1', calendarBackground: '#FFF9D9', taskBackground: '#FFFDF1', taskMeta: '#9C9164',
    statusAccent: '#5E7A62', warm: '#F0DE82',
  },
  blue: {
    id: 'blue', background: '#EEF3FC', patternBase: '#EEF3FC', patternStripe: '#C4D4ED',
    surface: '#FFFFFF', cardSurface: '#F9FBFF', cardTint: '#E5EDFA', surfaceSubtle: '#E5EDFA',
    accent: '#5577AE', accentStrong: '#3C5D91', accentSoft: '#D9E5F7', border: '#C2D1E8',
    textPrimary: '#283348', textSecondary: '#5F6E86', textMuted: '#8D9AB0', onAccent: '#FFFFFF',
    success: '#527B6A', warning: '#8C744A', danger: '#A45E6A', focusBackground: '#EEF3FC',
    focusSurface: '#F9FBFF', calendarBackground: '#EEF3FC', taskBackground: '#F9FBFF', taskMeta: '#8D9AB0',
    statusAccent: '#527B6A', warm: '#C4D4ED',
  },
  lightBlue: {
    id: 'lightBlue', background: '#EAF9FE', patternBase: '#EAF9FE', patternStripe: '#BCE7F2',
    surface: '#FFFFFF', cardSurface: '#F7FDFF', cardTint: '#DDF3F8', surfaceSubtle: '#DDF3F8',
    accent: '#3F91AA', accentStrong: '#2D7188', accentSoft: '#CDEDF4', border: '#B7DCE5',
    textPrimary: '#24383E', textSecondary: '#58757D', textMuted: '#849BA1', onAccent: '#FFFFFF',
    success: '#4E806D', warning: '#8C744A', danger: '#A45E6A', focusBackground: '#EAF9FE',
    focusSurface: '#F7FDFF', calendarBackground: '#EAF9FE', taskBackground: '#F7FDFF', taskMeta: '#849BA1',
    statusAccent: '#4E806D', warm: '#BCE7F2',
  },
  pink: {
    id: 'pink', background: '#FCF0F5', patternBase: '#FCF0F5', patternStripe: '#E8C4D3',
    surface: '#FFFFFF', cardSurface: '#FFF9FC', cardTint: '#F7E3EC', surfaceSubtle: '#F7E3EC',
    accent: '#A65E79', accentStrong: '#7D415A', accentSoft: '#F0D6E1', border: '#E3C2D1',
    textPrimary: '#392A32', textSecondary: '#765C68', textMuted: '#A18B96', onAccent: '#FFFFFF',
    success: '#5E7A67', warning: '#9B7246', danger: '#9E5367', focusBackground: '#FCF0F5',
    focusSurface: '#FFF9FC', calendarBackground: '#FCF0F5', taskBackground: '#FFF9FC', taskMeta: '#A18B96',
    statusAccent: '#5E7A67', warm: '#E8C4D3',
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
  { ...designPalettes.warm, label: '赤系' },
  { ...designPalettes.green, label: '緑系' },
  { ...designPalettes.orange, label: 'オレンジ' },
  { ...designPalettes.yellow, label: '黄色' },
  { ...designPalettes.blue, label: '青' },
  { ...designPalettes.lightBlue, label: '水色' },
  { ...designPalettes.pink, label: 'ピンク' },
] as (Omit<ChicThemePalette, 'id'> & { id: ChicCheckColor; label: string })[];

// Keep the persisted choice ids stable while presenting readable Japanese labels.
export function getDesignCheckColorLabel(color: ChicCheckColor): string {
  switch (color) {
    case 'monochrome': return '\u30e2\u30ce\u30c8\u30fc\u30f3';
    case 'cool': return '\u5bd2\u8272\u7cfb';
    case 'warm': return '\u8d64\u7cfb';
    case 'green': return '\u7dd1\u7cfb';
    case 'orange': return '\u30aa\u30ec\u30f3\u30b8';
    case 'yellow': return '\u9ec4\u8272';
    case 'blue': return '\u9752';
    case 'lightBlue': return '\u6c34\u8272';
    case 'pink': return '\u30d4\u30f3\u30af';
  }
}

export function normalizeChicCheckColor(color: unknown): ChicCheckColor {
  return color === 'monochrome' || color === 'cool' || color === 'warm' || color === 'green' || color === 'orange' || color === 'yellow' || color === 'blue' || color === 'lightBlue' || color === 'pink' ? color : 'cool';
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

/** Shared colors for Premium upsell cards. This keeps the gate readable in
 * Mono Light/Dark and follows the selected Design palette without hard-coded
 * black or gold surfaces. */
export function getPremiumFeatureCardTheme(mode: DesignMode, chicPalette?: ChicThemePalette, chicPattern: ChicPattern = 'plain'): PremiumFeatureCardTheme {
  if (mode === 'chic' && chicPalette) {
    return {
      background: chicPalette.background,
      surface: chicPalette.cardSurface,
      text: chicPalette.textPrimary,
      mutedText: chicPalette.textSecondary,
      accent: chicPalette.accent,
      onAccent: chicPalette.onAccent,
      border: chicPalette.border,
      showPatternDecor: chicPattern !== 'plain',
    };
  }
  const tokens = getThemeTokens(mode, 'cool');
  return {
    background: tokens.colors.screenBackground,
    surface: tokens.colors.surface,
    text: tokens.colors.primaryText,
    mutedText: tokens.colors.secondaryText,
    accent: tokens.colors.primaryAccent,
    onAccent: mode === 'dark' ? tokens.colors.screenBackground : '#FFFFFF',
    border: tokens.colors.border,
    showPatternDecor: false,
  };
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
