import { Directory, File, Paths } from 'expo-file-system';
import type { PhotoThemeSettings, WidgetSettings, WishMonthMap } from '../../types';

const PHOTO_DIRECTORY_NAME = 'rhythm-photos';
// Images copied or selected during this process may still belong to an editor
// or an asynchronous save. Keep them until the next successful hydration.
const sessionProtectedPhotos = new Set<string>();

function isManagedPhotoUri(uri: string | undefined) {
  return Boolean(uri?.includes(`/${PHOTO_DIRECTORY_NAME}/`));
}

function extensionFor(uri: string) {
  const match = uri.match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
  return match?.[1]?.toLowerCase() ?? 'jpg';
}

function photoDirectory() {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY_NAME);
  if (!directory.exists) directory.create({ idempotent: true, intermediates: true });
  return directory;
}

function addUri(uris: Set<string>, uri: unknown) {
  if (typeof uri === 'string' && isManagedPhotoUri(uri)) uris.add(uri);
}

/** Collects every currently persisted Rhythm-owned image reference. */
export function collectReferencedManagedPhotoUris(input: { photoTheme?: PhotoThemeSettings; widgetSettings?: WidgetSettings; wishMonths?: WishMonthMap; [key: string]: unknown }) {
  const uris = new Set<string>();
  // Preserve unknown and legacy fields as well as the known photo settings.
  // A corrupt/cyclic value throws rather than allowing an incomplete scan.
  const seen = new WeakSet<object>();
  const visit = (value: unknown): void => {
    if (typeof value === 'string') { addUri(uris, value); return; }
    if (!value || typeof value !== 'object') return;
    if (seen.has(value)) throw new Error('Cannot safely inspect cyclic photo references');
    seen.add(value);
    Object.values(value).forEach(visit);
  };
  visit(input);
  const photoTheme = input.photoTheme;
  addUri(uris, photoTheme?.imageUri);
  addUri(uris, photoTheme?.focusBackgroundUri);
  Object.values(photoTheme?.topImageUris ?? {}).forEach((uri) => addUri(uris, uri));
  Object.values(photoTheme?.topImageOriginalUris ?? {}).forEach((uri) => addUri(uris, uri));

  const widgetSettings = input.widgetSettings;
  addUri(uris, widgetSettings?.photoUri);
  Object.values(widgetSettings?.widgetCustomizations ?? {}).forEach((customization) => {
    addUri(uris, customization?.photoUri);
    // Old saves may retain this field. Keep it until the compatibility
    // normalizer has safely moved it to the regular photo fallback.
    addUri(uris, customization?.cutoutUri);
  });
  (widgetSettings?.affirmationPhotoUris ?? []).forEach((uri) => addUri(uris, uri));

  Object.values(input.wishMonths ?? {}).forEach((month) => {
    const reviews = [...(month.reviews ?? []), month.review].filter(Boolean);
    reviews.forEach((review) => {
      addUri(uris, review.photo);
      (review.photos ?? []).forEach((uri) => addUri(uris, uri));
    });
    (month.reflectionCard?.photoIds ?? []).forEach((uri) => addUri(uris, uri));
  });
  return uris;
}

/**
 * Removes only files inside RhythmPace's own photo directory that are not in
 * the current persisted references. It is intentionally best-effort: a file
 * operation failure must never interrupt app state or Widget persistence.
 */
export function cleanupUnreferencedManagedPhotos(references: Iterable<string>) {
  try {
    const retained = new Set([...references, ...sessionProtectedPhotos]);
    // Comparing filenames as well handles old app-container prefixes. If any
    // path cannot be decoded, skip the whole cleanup rather than guess.
    const fileName = (uri: string) => decodeURIComponent(uri.split('/').pop() ?? '');
    const retainedNames = new Set([...retained].map(fileName));
    const directory = photoDirectory();
    directory.list().forEach((entry) => {
      if (!(entry instanceof File) || retained.has(entry.uri) || sessionProtectedPhotos.has(entry.uri) || retainedNames.has(fileName(entry.uri))) return;
      try {
        entry.delete();
      } catch (error) {
        console.warn('Could not remove an unused Rhythm photo.', error);
      }
    });
  } catch (error) {
    console.warn('Could not scan Rhythm-managed photos for cleanup.', error);
  }
}

/** Copies picker/manipulator output to the app documents directory before persisting its URI. */
export function persistPhotoUri(sourceUri: string, purpose: string): string {
  if (isManagedPhotoUri(sourceUri)) { sessionProtectedPhotos.add(sourceUri); return sourceUri; }
  const source = new File(sourceUri);
  const destination = new File(photoDirectory(), `${purpose}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionFor(sourceUri)}`);
  sessionProtectedPhotos.add(destination.uri);
  try { source.copy(destination); } catch (error) { sessionProtectedPhotos.delete(destination.uri); throw error; }
  return destination.uri;
}

/** DEV diagnostics only: confirms a managed URI is still present on disk. */
export function isPersistedPhotoAvailable(uri: string | undefined) {
  if (!uri) return false;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/** Removes only the temporary cache image created for the crop UI preview. */
export function deleteTemporaryPhotoUri(uri: string | undefined) {
  if (!uri || isManagedPhotoUri(uri) || (!uri.includes('/Caches/') && !uri.includes('/cache/'))) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Could not remove temporary crop preview.', error);
  }
}

/** Deletes only Rhythm-owned copies. Picker, library and legacy URIs are never removed. */
export function deleteManagedPhotoUri(uri: string | undefined, retainedUris: Iterable<string | undefined> = []) {
  // A caller-local list cannot prove that another feature or a pending save
  // does not reference this file. Defer deletion to the next startup scan.
  void uri;
  void retainedUris;
}
