export type DesignMode = 'minimal' | 'chic';
export type ChicPattern = 'floral' | 'dot' | 'checkLavenderSatin' | 'checkBeigeNoir' | 'checkMauveFrame';
export type ChicCheckColor = 'monochrome' | 'cool' | 'warm' | 'green';

export const chicCheckColorChoices: { id: ChicCheckColor; label: string; accent: string; warm: string; background: string }[] = [
  { id: 'monochrome', label: 'モノトーン', accent: '#343237', warm: '#A6A1A8', background: '#F4F1EE' },
  { id: 'cool', label: '寒色系', accent: '#9C91C4', warm: '#C4D0DD', background: '#F4F3FA' },
  { id: 'warm', label: '暖色系', accent: '#B66E86', warm: '#D9AAB5', background: '#FBF1F3' },
  { id: 'green', label: '緑系', accent: '#758D7B', warm: '#B9C8B8', background: '#F2F6F0' },
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
  if (mode === 'minimal') return {
    ...shared,
    colors: { screenBackground: '#F4F4F2', surface: '#FFFFFF', secondarySurface: '#ECECEA', primaryText: '#171715', secondaryText: '#777772', primaryAccent: '#1D1D1B', secondaryAccent: '#555550', softAccent: '#E5E5E1', border: '#CFCFCA', success: '#446552', warning: '#80633E', danger: '#9A4646' },
    radius: { large: 4, small: 2, button: 4, chip: 4, modal: 8 },
    shadow: { color: '#000000', opacity: 0, radius: 0, y: 0 },
  };
  return {
    ...shared,
    colors: { screenBackground: '#FFF9F6', surface: '#FFFFFF', secondarySurface: '#FFF3F5', primaryText: '#392F34', secondaryText: '#8B7B82', primaryAccent: '#D986A1', secondaryAccent: '#A997C8', softAccent: '#F4D8E2', border: '#F0DFE5', success: '#65907B', warning: '#C29358', danger: '#C86B77' },
    radius: { large: 26, small: 18, button: 18, chip: 999, modal: 28 },
    shadow: { color: '#D986A1', opacity: 0.12, radius: 18, y: 7 },
  };
}

export function normalizeChicPattern(pattern: unknown): ChicPattern {
  if (pattern === 'floral' || pattern === 'dot' || pattern === 'checkLavenderSatin' || pattern === 'checkBeigeNoir' || pattern === 'checkMauveFrame') {
    return pattern;
  }
  if (pattern === 'check') return 'checkLavenderSatin';
  return 'checkLavenderSatin';
}
