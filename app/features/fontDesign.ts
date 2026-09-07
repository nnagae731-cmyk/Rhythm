import { Platform } from 'react-native';
import { RhythmFontDesign } from '../types';

export const RHYTHM_FONT_DESIGN_OPTIONS: ReadonlyArray<{ id: RhythmFontDesign; label: string }> = [
  { id: 'default', label: '標準' },
  { id: 'rounded', label: 'まる文字' },
  { id: 'serif', label: '上品' },
  { id: 'monospaced', label: 'タイプライター' },
];

export const DEFAULT_RHYTHM_FONT_DESIGN: RhythmFontDesign = 'default';

export function normalizeRhythmFontDesign(value: unknown): RhythmFontDesign {
  return value === 'rounded' || value === 'serif' || value === 'monospaced' ? value : DEFAULT_RHYTHM_FONT_DESIGN;
}

/** Best-effort system font names for the in-app Widget preview. Native Swift uses Font.Design. */
export function reactNativeFontFamily(design: RhythmFontDesign) {
  if (design === 'rounded') return Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif-rounded';
  if (design === 'serif') return Platform.OS === 'ios' ? 'Georgia' : 'serif';
  if (design === 'monospaced') return Platform.OS === 'ios' ? 'Menlo' : 'monospace';
  return undefined;
}

// Keep weights conservative for named system faces. Heavy weights can cause
// React Native to fall back to the default face on iOS, hiding the selection.
export function reactNativeFontWeight(design: RhythmFontDesign): '400' | '500' | '700' {
  if (design === 'rounded') return '500';
  if (design === 'serif' || design === 'monospaced') return '400';
  return '700';
}
