export type NormalizedCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropDisplayRect = { x: number; y: number; width: number; height: number };
export type ImageDisplayBounds = CropDisplayRect;
export const TOP_IMAGE_ASPECT = 2.5;

export function getContainBounds(sourceWidth: number, sourceHeight: number, containerWidth: number, containerHeight: number): ImageDisplayBounds {
  if (sourceWidth <= 0 || sourceHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) return { x: 0, y: 0, width: containerWidth, height: containerHeight };
  const sourceAspect = sourceWidth / sourceHeight;
  const containerAspect = containerWidth / containerHeight;
  if (sourceAspect > containerAspect) {
    const width = containerWidth;
    return { x: 0, y: (containerHeight - width / sourceAspect) / 2, width, height: width / sourceAspect };
  }
  const height = containerHeight;
  return { x: (containerWidth - height * sourceAspect) / 2, y: 0, width: height * sourceAspect, height };
}

export function getInitialCropRect(bounds: ImageDisplayBounds): CropDisplayRect {
  const width = Math.max(1, Math.min(bounds.width, bounds.height * TOP_IMAGE_ASPECT));
  return { x: bounds.x + (bounds.width - width) / 2, y: bounds.y + (bounds.height - width / TOP_IMAGE_ASPECT) / 2, width, height: width / TOP_IMAGE_ASPECT };
}

export function normalizedToDisplayRect(normalized: NormalizedCropRect | undefined, bounds: ImageDisplayBounds): CropDisplayRect {
  if (!normalized) return getInitialCropRect(bounds);
  return clampCropRect({ x: bounds.x + normalized.x * bounds.width, y: bounds.y + normalized.y * bounds.height, width: normalized.width * bounds.width, height: normalized.height * bounds.height }, bounds);
}

export function displayToNormalizedRect(rect: CropDisplayRect, bounds: ImageDisplayBounds): NormalizedCropRect {
  return { x: clamp01((rect.x - bounds.x) / Math.max(1, bounds.width)), y: clamp01((rect.y - bounds.y) / Math.max(1, bounds.height)), width: clamp01(rect.width / Math.max(1, bounds.width)), height: clamp01(rect.height / Math.max(1, bounds.height)) };
}

export function clampCropRect(rect: CropDisplayRect, bounds: ImageDisplayBounds, minWidth = 72): CropDisplayRect {
  const maxWidth = Math.min(bounds.width, bounds.height * TOP_IMAGE_ASPECT);
  const width = Math.min(maxWidth, Math.max(Math.min(minWidth, maxWidth), rect.width));
  const height = width / TOP_IMAGE_ASPECT;
  return { x: Math.min(bounds.x + bounds.width - width, Math.max(bounds.x, rect.x)), y: Math.min(bounds.y + bounds.height - height, Math.max(bounds.y, rect.y)), width, height };
}

export function cropRectToPixels(rect: NormalizedCropRect, sourceWidth: number, sourceHeight: number) {
  const x = Math.max(0, Math.min(sourceWidth - 1, Math.round(rect.x * sourceWidth)));
  const y = Math.max(0, Math.min(sourceHeight - 1, Math.round(rect.y * sourceHeight)));
  return { originX: x, originY: y, width: Math.max(1, Math.min(sourceWidth - x, Math.round(rect.width * sourceWidth))), height: Math.max(1, Math.min(sourceHeight - y, Math.round(rect.height * sourceHeight))) };
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
