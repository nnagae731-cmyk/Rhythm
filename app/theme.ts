export type DesignMode = 'minimal' | 'dark' | 'chic' | 'photo';
export type ChicPattern = 'plain' | 'floral' | 'floralSoft' | 'floralSeasonal' | 'floralDark' | 'dot' | 'checkLavenderSatin' | 'checkBeigeNoir' | 'checkMauveFrame';
export type ChicCheckColor = 'monochrome' | 'cool' | 'warm' | 'green';

export const chicCheckColorChoices: { id: ChicCheckColor; label: string; accent: string; warm: string; background: string }[] = [
  // Keep the persisted ids for backwards compatibility; the labels now describe
  // the four shared Design check palettes used on every screen.
  { id: 'monochrome', label: 'A  淡いピンク × ラベンダー', accent: '#B8A8CF', warm: '#E8C5D4', background: '#FFF7FA' },
  { id: 'cool', label: 'B  淡いブルー × ブルーラベンダー', accent: '#A8B9E1', warm: '#D0DBF0', background: '#F5F8FE' },
  { id: 'warm', label: 'C  淡いピーチ × コーラル', accent: '#D99A8A', warm: '#F1C9B5', background: '#FFF8F3' },
  { id: 'green', label: 'D  淡いミント × セージグリーン', accent: '#9CB8A4', warm: '#D2E5D6', background: '#F5FBF6' },
];

export function normalizeChicCheckColor(color: unknown): ChicCheckColor {
  return color === 'monochrome' || color === 'cool' || color === 'warm' || color === 'green' ? color : 'cool';
}

export function getChicCheckColor(color: ChicCheckColor) {
  return chicCheckColorChoices.find((item) => item.id === color) ?? chicCheckColorChoices[1]!;
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

export function getThemeTokens(mode: DesignMode): ThemeTokens {
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
  return {
    ...shared,
    colors: { screenBackground: '#FFF9F6', surface: '#FFFFFF', secondarySurface: '#FFF3F5', primaryText: '#392F34', secondaryText: '#8B7B82', primaryAccent: '#D986A1', secondaryAccent: '#A997C8', softAccent: '#F4D8E2', border: '#F0DFE5', success: '#65907B', warning: '#C29358', danger: '#C86B77' },
    radius: { large: 26, small: 18, button: 18, chip: 999, modal: 28 },
    shadow: { color: '#D986A1', opacity: 0.12, radius: 18, y: 7 },
  };
}

export function normalizeChicPattern(pattern: unknown): ChicPattern {
  if (pattern === 'plain' || pattern === 'dot' || pattern === 'checkLavenderSatin' || pattern === 'checkBeigeNoir' || pattern === 'checkMauveFrame') return pattern;
  if (pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark') return 'plain';
  if (pattern === 'check') return 'checkLavenderSatin';
  return 'plain';
}
