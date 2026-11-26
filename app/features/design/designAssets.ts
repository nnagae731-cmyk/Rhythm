import type { ChicPattern } from '../../theme';

export type FloralPatternId = 'floral' | 'floralSoft' | 'floralSeasonal' | 'floralDark';

// Keep the template id, display name, and bundled image together. These are
// static require() values so React Native can cache and reuse the same image
// in the app background, settings swatches, and the design preview. Preview
// thumbnails are kept separate so the settings sheet never decodes the full
// screen background assets.
export const designFloralAssets: Record<FloralPatternId, { source: number; label: string; previewSource?: number; thumbnailSource?: number }> = {
  floral: { source: require('../../assets/themes/floral/vintage-bloom.jpg'), thumbnailSource: require('../../assets/themes/floral/vintage-bloom-preview.jpg'), label: '花柄1' },
  floralSoft: { source: require('../../assets/themes/floral/botanical-line.jpg'), previewSource: require('../../assets/themes/floral/floral-soft-preview.png'), thumbnailSource: require('../../assets/themes/floral/floral-soft-thumbnail.jpg'), label: '花柄2' },
  floralSeasonal: { source: require('../../assets/themes/floral/sheer-floral.jpg'), thumbnailSource: require('../../assets/themes/floral/sheer-floral-preview.jpg'), label: '花柄3' },
  // Legacy id kept for saved-data compatibility. It uses the same formal name
  // as the third floral preview and is not shown as a separate option.
  floralDark: { source: require('../../assets/themes/floral/sheer-floral.jpg'), thumbnailSource: require('../../assets/themes/floral/sheer-floral-preview.jpg'), label: '花柄3' },
};

export type ImageDesignPattern = 'stationery' | 'botanicalBackground' | 'ocean' | 'nightSky';

export type UserFacingDesignPattern = Exclude<ChicPattern, 'floralDark'>;

export type DesignPatternFeature = 'chic_floral' | 'chic_dot' | 'chic_heart' | 'chic_check_lavender_satin' | 'chic_check_beige_noir' | 'chic_check_mauve_frame';

// Single source of truth for patterns that users can choose in Design. Legacy
// persisted ids stay accepted by ChicPattern, but are intentionally omitted
// from user-facing pickers.
export const designPatternChoices: readonly { id: UserFacingDesignPattern; label: string; feature?: DesignPatternFeature }[] = [
  { id: 'plain', label: 'プレーン' },
  { id: 'floral', label: designFloralAssets.floral.label, feature: 'chic_floral' },
  { id: 'floralSoft', label: designFloralAssets.floralSoft.label, feature: 'chic_floral' },
  { id: 'floralSeasonal', label: designFloralAssets.floralSeasonal.label, feature: 'chic_floral' },
  { id: 'dot', label: 'ドット', feature: 'chic_dot' },
  { id: 'heart', label: 'ハート', feature: 'chic_heart' },
  { id: 'checkLavenderSatin', label: 'ギンガム1', feature: 'chic_check_lavender_satin' },
  { id: 'checkBeigeNoir', label: 'ギンガム2', feature: 'chic_check_beige_noir' },
  { id: 'checkMauveFrame', label: 'ギンガム3', feature: 'chic_check_mauve_frame' },
  { id: 'stationery', label: 'ステーショナリー', feature: 'chic_floral' },
  { id: 'botanicalBackground', label: 'ボタニカル', feature: 'chic_floral' },
  { id: 'ocean', label: 'オーシャン', feature: 'chic_floral' },
  { id: 'nightSky', label: 'ナイトスカイ', feature: 'chic_floral' },
];

// These are completed background illustrations supplied for the app's Design
// mode. They are deliberately kept outside the palette/decor renderer so the
// pixels are never tinted or overlaid by the selected nine-color theme. The
// smaller previewSource is used only by settings/preview swatches so opening
// those surfaces does not decode every full-screen original at once.
export const designBackgroundAssets: Record<ImageDesignPattern, { source: number; previewSource: number; background: string; width: number; height: number }> = {
  stationery: { source: require('../../assets/themes/design-backgrounds/design-stationery-background.jpg'), previewSource: require('../../assets/themes/design-backgrounds/design-stationery-preview.jpg'), background: '#F8F7F2', width: 590, height: 1280 },
  botanicalBackground: { source: require('../../assets/themes/design-backgrounds/design-botanical-background.jpg'), previewSource: require('../../assets/themes/design-backgrounds/design-botanical-preview.jpg'), background: '#F8F8F4', width: 590, height: 1280 },
  ocean: { source: require('../../assets/themes/design-backgrounds/design-ocean-background.jpg'), previewSource: require('../../assets/themes/design-backgrounds/design-ocean-preview.jpg'), background: '#EAF8FA', width: 589, height: 1280 },
  nightSky: { source: require('../../assets/themes/design-backgrounds/design-night-sky-background.jpg'), previewSource: require('../../assets/themes/design-backgrounds/design-night-sky-preview.jpg'), background: '#101722', width: 589, height: 1280 },
};

export function isImageDesignPattern(pattern: ChicPattern): pattern is ImageDesignPattern {
  return pattern === 'stationery' || pattern === 'botanicalBackground' || pattern === 'ocean' || pattern === 'nightSky';
}
