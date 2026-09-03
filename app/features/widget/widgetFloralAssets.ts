import type { ImageSourcePropType } from 'react-native';

export type WidgetFloralPattern = 'vintageBloom' | 'botanicalLine' | 'sheerFloral';
export type WidgetFloralFamily = 'small' | 'medium' | 'large';

/** Filename contract shared by the Widget extension and config plugin. */
export const WIDGET_FLORAL_ASSET_FILENAMES: Record<WidgetFloralPattern, Record<WidgetFloralFamily, string>> = {
  vintageBloom: {
    small: 'widget-floral1-small.png',
    medium: 'widget-floral1-medium.png',
    large: 'widget-floral1-large.png',
  },
  botanicalLine: {
    small: 'widget-floral2-small.png',
    medium: 'widget-floral2-medium.png',
    large: 'widget-floral2-large.png',
  },
  sheerFloral: {
    small: 'widget-floral3-small.png',
    medium: 'widget-floral3-medium.png',
    large: 'widget-floral3-large.png',
  },
};

/** Static requires keep Metro's asset graph and the Native filename contract
 * pointed at the same production artwork. The PNGs are transparent overlays;
 * the selected palette remains responsible for the background below them.
 */
const WIDGET_FLORAL_ASSET_SOURCES: Record<WidgetFloralPattern, Record<WidgetFloralFamily, ImageSourcePropType>> = {
  vintageBloom: {
    small: require('../../assets/themes/floral/widget-floral1-small.png'),
    medium: require('../../assets/themes/floral/widget-floral1-medium.png'),
    large: require('../../assets/themes/floral/widget-floral1-large.png'),
  },
  botanicalLine: {
    small: require('../../assets/themes/floral/widget-floral2-small.png'),
    medium: require('../../assets/themes/floral/widget-floral2-medium.png'),
    large: require('../../assets/themes/floral/widget-floral2-large.png'),
  },
  sheerFloral: {
    small: require('../../assets/themes/floral/widget-floral3-small.png'),
    medium: require('../../assets/themes/floral/widget-floral3-medium.png'),
    large: require('../../assets/themes/floral/widget-floral3-large.png'),
  },
};

export function getWidgetFloralAssetSource(pattern: WidgetFloralPattern, family: WidgetFloralFamily): ImageSourcePropType {
  return WIDGET_FLORAL_ASSET_SOURCES[pattern][family];
}
