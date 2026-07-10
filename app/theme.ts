export type DesignMode = 'minimal' | 'chic';
export type ChicPattern = 'floral' | 'dot' | 'check';

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
