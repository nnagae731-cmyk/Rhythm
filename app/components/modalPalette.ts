import type { DimensionValue } from 'react-native';

export type ModalPalette = {
  screenBackground: string;
  surface: string;
  secondarySurface: string;
  border: string;
  primaryText: string;
  secondaryText: string;
  primaryAccent: string;
  accentSoft: string;
  warning: string;
  onAccent: string;
  modalRadius: number;
  buttonRadius: number;
  shadow: { color: string; opacity: number; radius: number; y: number };
};

export function popupSheetStyle(palette: ModalPalette, maxHeight?: DimensionValue) {
  return {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderTopWidth: 1,
    borderTopLeftRadius: palette.modalRadius,
    borderTopRightRadius: palette.modalRadius,
    shadowColor: palette.shadow.color,
    shadowOpacity: palette.shadow.opacity,
    shadowRadius: palette.shadow.radius,
    shadowOffset: { width: 0, height: palette.shadow.y },
    elevation: 6,
    ...(maxHeight === undefined ? {} : { maxHeight }),
  };
}
