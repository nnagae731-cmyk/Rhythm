import { Directory, File, Paths } from 'expo-file-system';

const PHOTO_DIRECTORY_NAME = 'rhythm-photos';

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

/** Copies picker/manipulator output to the app documents directory before persisting its URI. */
export function persistPhotoUri(sourceUri: string, purpose: string): string {
  if (isManagedPhotoUri(sourceUri)) return sourceUri;
  const source = new File(sourceUri);
  const destination = new File(photoDirectory(), `${purpose}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionFor(sourceUri)}`);
  source.copy(destination);
  return destination.uri;
}

/** Deletes only Rhythm-owned copies. Picker, library and legacy URIs are never removed. */
export function deleteManagedPhotoUri(uri: string | undefined, retainedUris: Iterable<string | undefined> = []) {
  if (!uri || !isManagedPhotoUri(uri)) return;
  if ([...retainedUris].some((item) => item === uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Could not remove unused Rhythm photo.', error);
  }
}
