import { Image } from 'react-native';
import { File, Paths } from 'expo-file-system';
import type { PhotoSampleId, PhotoThemePhotoTarget, PhotoThemeSettings } from '../../types';
import { isDisplayPhotoAvailable } from './persistentPhoto';
export const PHOTO_SAMPLES = [
  { id: 'flowers', label: '花', source: require('../../assets/photo-samples/flowers.jpg') },
  { id: 'sky', label: '空', source: require('../../assets/photo-samples/sky.jpg') },
  { id: 'sea', label: '海', source: require('../../assets/photo-samples/sea.jpg') },
  { id: 'cafe', label: 'カフェ', source: require('../../assets/photo-samples/cafe.jpg') },
  { id: 'cat', label: '猫', source: require('../../assets/photo-samples/cat.jpg') },
  { id: 'dog', label: '犬', source: require('../../assets/photo-samples/dog.jpg') },
  { id: 'texture', label: '質感', source: require('../../assets/photo-samples/texture.jpg') },
] as const;
export function samplePhotoUri(id: PhotoSampleId): string {
  const sample = PHOTO_SAMPLES.find(item => item.id === id);
  const uri = sample && Image.resolveAssetSource(sample.source)?.uri;
  if (!uri) throw new Error('同梱写真を読み込めません');
  return uri;
}
/** iOS ImageManipulator accepts readable local files, not Metro's HTTP asset URLs. */
export async function editableSamplePhotoUri(id: PhotoSampleId): Promise<string> {
  const uri = samplePhotoUri(id);
  if (!/^https?:\/\//i.test(uri)) return uri;
  const file = await File.downloadFileAsync(uri, new File(Paths.cache, `rhythm-sample-${id}.jpg`), { idempotent: true });
  return file.uri;
}
export function configuredPhotoUri(photo: PhotoThemeSettings, target: PhotoThemePhotoTarget) {
  return target === 'background' ? photo.imageUri : target === 'focus' ? photo.focusBackgroundUri : photo.topImageUris?.[target] ?? photo.topImageOriginalUris?.[target];
}
export function photoKind(photo: PhotoThemeSettings, target: PhotoThemePhotoTarget) { return PHOTO_SAMPLES.some(item => item.id === photo.samplePhotoIds?.[target]) ? 'sample' as const : 'personal' as const; }
export function visiblePhotoSettings(photo: PhotoThemeSettings, allowed: (kind: 'sample' | 'personal', target: PhotoThemePhotoTarget) => boolean): PhotoThemeSettings {
  const next = { ...photo, topImageUris: { ...photo.topImageUris }, topImageOriginalUris: { ...photo.topImageOriginalUris } };
  for (const target of ['background', 'focus', 'home', 'timeline', 'analysis', 'wish', 'settings'] as const) {
    if (allowed(photoKind(photo, target), target)) {
      if (target === 'background') { if (!isDisplayPhotoAvailable(photo.imageUri)) next.imageUri = undefined; }
      else if (target === 'focus') { if (!isDisplayPhotoAvailable(photo.focusBackgroundUri)) next.focusBackgroundUri = undefined; }
      else {
        if (!isDisplayPhotoAvailable(next.topImageUris[target])) delete next.topImageUris[target];
        if (!isDisplayPhotoAvailable(next.topImageOriginalUris[target])) delete next.topImageOriginalUris[target];
      }
      continue;
    }
    if (target === 'background') next.imageUri = undefined;
    else if (target === 'focus') next.focusBackgroundUri = undefined;
    else { delete next.topImageUris[target]; delete next.topImageOriginalUris[target]; }
  }
  return next;
}
/** Bundle locations can change between builds; persist stable IDs, not asset module numbers. */
export function restoreSamplePhotoUris(photo: PhotoThemeSettings): PhotoThemeSettings {
  let next = { ...photo };
  for (const [target, id] of Object.entries(photo.samplePhotoIds ?? {})) {
    if (!PHOTO_SAMPLES.some(item => item.id === id)) continue;
    const uri = samplePhotoUri(id as PhotoSampleId);
    if (target === 'background') next.imageUri = uri;
    else if (target === 'focus') next.focusBackgroundUri = uri;
    else {
      const slot = target as Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>;
      next.topImageOriginalUris = { ...next.topImageOriginalUris, [slot]: uri };
      if (!photo.topImageCropRects?.[slot]) next.topImageUris = { ...next.topImageUris, [slot]: uri };
    }
  }
  return next;
}
/** Detach references only. The existing startup scan owns safe file cleanup. */
export function withoutTopPhoto(photo: PhotoThemeSettings, target: PhotoThemePhotoTarget): PhotoThemeSettings {
  if (!['home', 'timeline', 'analysis', 'wish'].includes(target)) return photo;
  const slot = target as 'home' | 'timeline' | 'analysis' | 'wish';
  const next = { ...photo, topImageUris: { ...photo.topImageUris }, topImageOriginalUris: { ...photo.topImageOriginalUris }, topImageCropRects: { ...photo.topImageCropRects }, topImageAdjustments: { ...photo.topImageAdjustments }, samplePhotoIds: { ...photo.samplePhotoIds } };
  delete next.topImageUris[slot]; delete next.topImageOriginalUris[slot]; delete next.topImageCropRects[slot]; delete next.topImageAdjustments[slot]; delete next.samplePhotoIds[slot];
  return next;
}
