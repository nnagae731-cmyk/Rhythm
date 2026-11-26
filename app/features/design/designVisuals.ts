import { ChicPattern, ChicThemePalette, getDesignCheckThemeTokens, getDesignPatternThemeTokens, getThemeTokens } from '../../theme';

export function getChicPatternVisual(pattern: ChicPattern, palette: ChicThemePalette = getDesignCheckThemeTokens('cool')) {
  // Pattern controls the decoration only. UI accents always come from the
  // selected Design color so dots and cards do not fall back to pink/purple.
  if (pattern === 'dot') return { background: palette.background, accent: palette.accent, warm: palette.accentSoft };
  if (pattern === 'checkBeigeNoir' || pattern === 'checkMauveFrame' || pattern === 'checkLavenderSatin') return { background: palette.background, accent: palette.accent, warm: palette.patternStripe };
  if (pattern === 'floral' || pattern === 'floralSoft' || pattern === 'floralSeasonal' || pattern === 'floralDark') {
    const floralPalette = getDesignPatternThemeTokens(pattern, 'cool');
    return { background: floralPalette.background, accent: palette.accent, warm: palette.accentSoft };
  }
  return { background: palette.background, accent: palette.accent, warm: palette.accentSoft };
}

export function getNightSkyPalette(base: ChicThemePalette): ChicThemePalette {
  return {
    ...base,
    id: 'nightSky',
    background: '#101722', patternBase: '#101722', patternStripe: 'rgba(214,182,111,0.34)',
    surface: 'rgba(16,24,36,0.94)', cardSurface: 'rgba(18,28,42,0.92)', cardTint: 'rgba(214,182,111,0.16)', surfaceSubtle: 'rgba(24,35,50,0.92)',
    border: 'rgba(220,225,230,0.42)', accent: '#D6B66F', accentStrong: '#E4CA8B', accentSoft: 'rgba(214,182,111,0.22)',
    textPrimary: '#F4F2EC', textSecondary: '#D8D9D7', textMuted: '#AEB4B5', onAccent: '#101722',
    success: '#A8C9BB', warning: '#D6B66F', danger: '#E1A0A0', focusBackground: '#101722',
    focusSurface: 'rgba(18,28,42,0.94)', calendarBackground: '#101722', taskBackground: 'rgba(18,28,42,0.92)', taskMeta: '#AEB4B5',
    statusAccent: '#D6B66F', warm: 'rgba(214,182,111,0.34)',
  };
}

export function getNightSkyThemeTokens() {
  return getThemeTokens('chic', 'nightSky');
}
