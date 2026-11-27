import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, Image, InteractionManager } from 'react-native';
import type { RewardedFeatureId } from '../ads/rewardedAccess';
import { canUsePhotoKind, type PhotoKind } from './photoAccess';
import { editableSamplePhotoUri, samplePhotoUri } from './photoSamples';
import type { RewardedAccessState } from '../ads/rewardedAccessStorage';
import type { DesignMode } from '../../theme';
import type { PlanTier } from '../../premiumAccess';
import type { PhotoSampleId, PhotoThemePhotoTarget, PhotoThemeSettings } from '../../types';
import { deleteManagedPhotoUri, deleteTemporaryPhotoUri, isPersistedPhotoAvailable, persistPhotoUri } from './persistentPhoto';
import { cropRectToPixels, getInitialNormalizedCrop, type NormalizedCropRect } from './topImageCrop';

export type PhotoThemeDeps = {
  setDesignMode?: React.Dispatch<React.SetStateAction<DesignMode>>;
  photoTheme: PhotoThemeSettings;
  setPhotoTheme: React.Dispatch<React.SetStateAction<PhotoThemeSettings>>;
  planTier: PlanTier;
  hasDesignCustomizeAccess: boolean;
  rewardedAccess: RewardedAccessState;
  now: Date;
  openRewardedPrompt: (featureId: RewardedFeatureId, title: string, description: string, onCompleted?: () => void, photoKind?: PhotoKind, photoTarget?: PhotoThemePhotoTarget) => void;
};

export function usePhotoTheme(deps: PhotoThemeDeps) {
  const { photoTheme, setPhotoTheme, setDesignMode, planTier, hasDesignCustomizeAccess, rewardedAccess, now, openRewardedPrompt } = deps;

  const [pendingTopPhoto, setPendingTopPhoto] = useState<{ target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>; originalUri: string; previewUri?: string; sourceWidth: number; sourceHeight: number; cropRect?: NormalizedCropRect; sampleId?: PhotoSampleId }>();

  const [topImageCropResumeToken, setTopImageCropResumeToken] = useState(0);

  const topImageAccessPurchaseResumeRef = React.useRef(false);

  const resumeTopImageAfterAccessFlow = React.useCallback(() => {
    if (!topImageAccessPurchaseResumeRef.current) return;
    topImageAccessPurchaseResumeRef.current = false;
    InteractionManager.runAfterInteractions(() => setTopImageCropResumeToken((current) => current + 1));
  }, []);

  const [topImageProcessing, setTopImageProcessing] = useState(false);

  const topImageProcessingRef = React.useRef(false);

  const topImageCropDismissActionRef = React.useRef<{ type: 'resume' | 'reselect'; target?: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'> }>({ type: 'resume' });

  const previousTopImageVisibleRef = React.useRef(false);

  useEffect(() => {
    const visible = Boolean(pendingTopPhoto);
    if (__DEV__ && visible && !previousTopImageVisibleRef.current) {
      console.log('[TopImage] crop-presented', { target: pendingTopPhoto?.target });
    }
    previousTopImageVisibleRef.current = visible;
  }, [pendingTopPhoto]);

  const canPickPhotoKind = React.useCallback((kind: PhotoKind, target: PhotoThemePhotoTarget) => planTier === 'premium' || hasDesignCustomizeAccess || canUsePhotoKind(rewardedAccess, kind, target, now), [planTier, hasDesignCustomizeAccess, rewardedAccess, now]);
  const accessRef = React.useRef(canPickPhotoKind);
  accessRef.current = canPickPhotoKind;
  const canOpenTopImagePicker = React.useCallback((target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>) => canPickPhotoKind('personal', target), [canPickPhotoKind]);
  const adjustRef = React.useRef<(target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>) => void>(() => {});
  const pickRef = React.useRef<(target: PhotoThemePhotoTarget, options?: { sampleId?: PhotoSampleId; restoreExisting?: boolean; bypassRewarded?: boolean }) => Promise<void>>(async () => {});

  const pickPhotoTheme = React.useCallback(async (target: PhotoThemePhotoTarget, options?: { bypassRewarded?: boolean; sampleId?: PhotoSampleId; restoreExisting?: boolean }) => {
    if (__DEV__) console.log('[TopImage] pick-start', { target });
    const kind: PhotoKind = options?.sampleId ? 'sample' : 'personal';
    if (!canPickPhotoKind(kind, target)) {
      openRewardedPrompt(target === 'background' ? 'photoBackground' : target === 'focus' ? 'photoFocus' : 'photoTop', kind === 'sample' ? 'サンプル写真を使う' : '自分の写真を使う', 'この枠は、広告1回でサンプルを期限なし、2回で自分の画像を3日間使えます。', () => { void pickRef.current(target, options); }, kind, target);
      return;
    }
    if (options?.restoreExisting) return; // Re-unlock restores the saved URI/crop through the display gate.
    if (options?.sampleId) {
      try {
        const sampleId = options.sampleId;
        const uri = samplePhotoUri(sampleId);
        setPhotoTheme(current => {
          const next = { ...current, samplePhotoIds: { ...current.samplePhotoIds, [target]: sampleId } };
          if (target === 'background') return { ...next, placement: 'background', imageUri: uri };
          if (target === 'focus') return { ...next, focusBackgroundUri: uri };
          const topImageCropRects = { ...current.topImageCropRects }; delete topImageCropRects[target];
          const topImageAdjustments = { ...current.topImageAdjustments }; delete topImageAdjustments[target];
          return { ...next, topImageUris: { ...current.topImageUris, [target]: uri }, topImageOriginalUris: { ...current.topImageOriginalUris, [target]: uri }, topImageCropRects, topImageAdjustments };
        });
        if (target === 'background') setDesignMode?.('photo');
      } catch { Alert.alert('写真を設定できませんでした', 'もう一度お試しください。'); }
      return;
    }
    const isTopImage = target !== 'background' && target !== 'focus';
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      if (isTopImage) setTopImageCropResumeToken((current) => current + 1);
      Alert.alert('写真へのアクセスを許可すると、背景やトップ画像に設定できます。');
      return;
    }
    const aspect: [number, number] = [4, 3];
    // iOS の標準トリミングは横長比率を指定しても正方形になることがあるため、
    // トップ画像だけはアプリ内の横長プレビューで位置を確定する。
    if (__DEV__ && isTopImage) console.log('[TopImage] picker-present', { target });
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, ...(isTopImage ? {} : { aspect }), quality: isTopImage ? 1 : 0.82 });
    if (__DEV__ && isTopImage) console.log('[TopImage] picker-dismissed', { target });
    if (__DEV__) console.log('[TopImage] picker-result', { target, canceled: result.canceled, width: result.canceled ? undefined : result.assets[0]?.width, height: result.canceled ? undefined : result.assets[0]?.height });
    const selectedAsset = result.canceled ? undefined : result.assets[0];
    if (!selectedAsset?.uri) {
      if (isTopImage) setTopImageCropResumeToken((current) => current + 1);
      return;
    }
    if (!accessRef.current('personal', target)) { Alert.alert('写真の利用期限が終了しました', '再解放してから選び直してください。写真は保持しています。'); return; }
    if (isTopImage) {
      // 調整を確定するまでは選択元をそのまま使い、不要な端末内コピーを作らない。
      const sourceWidth = selectedAsset.width || 1000;
      const sourceHeight = selectedAsset.height || 1000;
      let previewUri: string | undefined;
      const maxPreviewEdge = 1800;
      if (Math.max(sourceWidth, sourceHeight) > maxPreviewEdge) {
        try {
          if (__DEV__) console.log('[TopImage] crop-preview-start', { target, sourceWidth, sourceHeight, maxPreviewEdge });
          const scale = maxPreviewEdge / Math.max(sourceWidth, sourceHeight);
          const preview = await ImageManipulator.manipulateAsync(selectedAsset.uri, [{ resize: { width: Math.max(1, Math.round(sourceWidth * scale)) } }], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG });
          previewUri = preview.uri;
          if (__DEV__) console.log('[TopImage] crop-preview-complete', { target, width: Math.max(1, Math.round(sourceWidth * scale)), height: Math.max(1, Math.round(sourceHeight * scale)) });
        } catch (error) {
          if (__DEV__) console.log('[TopImage] error', { target, stage: 'crop-preview', message: error instanceof Error ? error.message : String(error) });
        }
      }
      if (pendingTopPhoto?.previewUri) deleteTemporaryPhotoUri(pendingTopPhoto.previewUri);
      const pending = { target: target as Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>, originalUri: selectedAsset.uri, previewUri, sourceWidth, sourceHeight };
      if (__DEV__) {
        console.log('[TopImage] crop-presentation-start', { target: pending.target });
        console.log('[TopImage] crop-modal-open', { target: pending.target, sourceWidth: pending.sourceWidth, sourceHeight: pending.sourceHeight, previewReady: Boolean(previewUri) });
      }
      setPendingTopPhoto(pending);
      return;
    }
    let persistentUri: string;
    try {
      persistentUri = persistPhotoUri(selectedAsset.uri, target);
      if (!isPersistedPhotoAvailable(persistentUri)) throw new Error('photo persistence unavailable');
    } catch (error) {
      console.warn('Could not persist selected Rhythm photo.', error);
      Alert.alert('写真を保存できませんでした', 'もう一度選び直してください。');
      return;
    }
    if (target === 'background') {
      setPhotoTheme((current) => {
        deleteManagedPhotoUri(current.imageUri, [persistentUri, current.focusBackgroundUri, ...Object.values(current.topImageUris ?? {}), ...Object.values(current.topImageOriginalUris ?? {})]);
        const samplePhotoIds = { ...current.samplePhotoIds }; delete samplePhotoIds.background;
        return { ...current, samplePhotoIds, placement: 'background', imageUri: persistentUri };
      });
      setDesignMode?.('photo');
    } else if (target === 'focus') {
      setPhotoTheme((current) => {
        deleteManagedPhotoUri(current.focusBackgroundUri, [persistentUri, current.imageUri, ...Object.values(current.topImageUris ?? {}), ...Object.values(current.topImageOriginalUris ?? {})]);
        const samplePhotoIds = { ...current.samplePhotoIds }; delete samplePhotoIds.focus;
        return { ...current, samplePhotoIds, focusBackgroundUri: persistentUri };
      });
    }
  }, [canPickPhotoKind, openRewardedPrompt, pendingTopPhoto, setPhotoTheme, setDesignMode]);
  pickRef.current = pickPhotoTheme;

  const adjustTopPhoto = React.useCallback(async (target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>) => {
    const sampleId = photoTheme.samplePhotoIds?.[target];
    if (!canPickPhotoKind(sampleId ? 'sample' : 'personal', target)) {
      openRewardedPrompt('photoTop', '写真を再調整する', '写真を解放すると、保存済みの写真を再調整できます。', () => adjustRef.current(target), sampleId ? 'sample' : 'personal', target); return;
    }
    let originalUri: string | undefined;
    try { originalUri = sampleId ? await editableSamplePhotoUri(sampleId) : photoTheme.topImageOriginalUris?.[target] ?? photoTheme.topImageUris?.[target]; }
    catch { Alert.alert('同梱写真を読み込めませんでした', 'もう一度お試しください。'); return; }
    if (!originalUri) return;
    Image.getSize(originalUri, (sourceWidth, sourceHeight) => setPendingTopPhoto({ target, originalUri, sourceWidth, sourceHeight, sampleId, cropRect: photoTheme.topImageCropRects?.[target] }), () => setPendingTopPhoto({ target, originalUri, sourceWidth: 1000, sourceHeight: 1000, sampleId, cropRect: photoTheme.topImageCropRects?.[target] }));
  }, [photoTheme, canPickPhotoKind, openRewardedPrompt]);
  adjustRef.current = adjustTopPhoto;

  const applyPendingTopPhoto = React.useCallback(async (cropOverride?: NormalizedCropRect) => {
    if (!pendingTopPhoto || topImageProcessingRef.current) return;
    if (!canPickPhotoKind(pendingTopPhoto.sampleId ? 'sample' : 'personal', pendingTopPhoto.target)) { Alert.alert('写真の利用期限が終了しました', '再解放してから調整してください。写真は保持しています。'); return; }
    const pending = pendingTopPhoto;
    let processingErrorMessage: string | undefined;
    topImageProcessingRef.current = true;
    setTopImageProcessing(true);
    try {
      if (__DEV__) console.log('[TopImage] apply-start', { target: pending.target, originalUri: Boolean(pending.originalUri), sourceWidth: pending.sourceWidth, sourceHeight: pending.sourceHeight });
      const normalized = cropOverride ?? pending.cropRect ?? getInitialNormalizedCrop(pending.sourceWidth, pending.sourceHeight);
      const crop = cropRectToPixels(normalized, pending.sourceWidth, pending.sourceHeight);
      if (__DEV__) console.log('[TopImage] manipulate-start', { target: pending.target, crop });
      const result = await ImageManipulator.manipulateAsync(pending.originalUri, [{ crop }, { resize: { width: 1000, height: 400 } }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
      if (!accessRef.current(pending.sampleId ? 'sample' : 'personal', pending.target)) throw new Error('photo access expired during crop');
      if (__DEV__) console.log('[TopImage] manipulate-complete', { target: pending.target, resultUri: Boolean(result.uri) });
      if (__DEV__) console.log('[TopImage] persist-original-start', { target: pending.target });
      const originalUri = pending.sampleId ? pending.originalUri : persistPhotoUri(pending.originalUri, `top-original-${pending.target}`);
      const originalAvailable = Boolean(pending.sampleId) || isPersistedPhotoAvailable(originalUri);
      if (__DEV__) console.log('[TopImage] persist-original-complete', { target: pending.target, exists: originalAvailable });
      if (!originalAvailable) throw new Error('top image original persistence unavailable');
      if (__DEV__) console.log('[TopImage] persist-display-start', { target: pending.target });
      const displayUri = persistPhotoUri(result.uri, `top-${pending.target}`);
      const displayAvailable = isPersistedPhotoAvailable(displayUri);
      if (__DEV__) console.log('[TopImage] persist-display-complete', { target: pending.target, exists: displayAvailable });
      if (!displayAvailable) throw new Error('top image display persistence unavailable');
      setPhotoTheme((current) => {
        if (__DEV__) console.log('[TopImage] state-before', { target: pending.target, hadDisplay: Boolean(current.topImageUris?.[pending.target]), hadOriginal: Boolean(current.topImageOriginalUris?.[pending.target]) });
        const previousDisplayUri = current.topImageUris?.[pending.target];
        const previousOriginalUri = current.topImageOriginalUris?.[pending.target];
        const topImageUris = { ...current.topImageUris, [pending.target]: displayUri };
        const topImageOriginalUris = { ...current.topImageOriginalUris, [pending.target]: originalUri };
        const retainedUris = [current.imageUri, current.focusBackgroundUri, ...Object.values(topImageUris), ...Object.values(topImageOriginalUris)];
        deleteManagedPhotoUri(previousDisplayUri, retainedUris);
        deleteManagedPhotoUri(previousOriginalUri, retainedUris);
        if (__DEV__) console.log('[TopImage] state-after', { target: pending.target, displayUri: Boolean(topImageUris[pending.target]), originalUri: Boolean(topImageOriginalUris[pending.target]), cropRect: true });
        const samplePhotoIds = { ...current.samplePhotoIds }; if (pending.sampleId) samplePhotoIds[pending.target] = pending.sampleId; else delete samplePhotoIds[pending.target];
        return { ...current, samplePhotoIds, topImageUris, topImageOriginalUris, topImageCropRects: { ...current.topImageCropRects, [pending.target]: normalized } };
      });
    } catch (error) {
      processingErrorMessage = error instanceof Error ? error.message : String(error);
      if (__DEV__) console.log('[TopImage] error', { target: pending.target, message: processingErrorMessage });
    } finally {
      topImageProcessingRef.current = false;
      setTopImageProcessing(false);
      if (pending.previewUri) deleteTemporaryPhotoUri(pending.previewUri);
      topImageCropDismissActionRef.current = { type: 'resume', target: pending.target };
      if (__DEV__) {
        console.log('[TopImage] crop-dismiss-start', { target: pending.target });
        console.log('[TopImage] modal-close', { target: pending.target });
      }
      setPendingTopPhoto(undefined);
      if (processingErrorMessage) {
        InteractionManager.runAfterInteractions(() => {
          Alert.alert('トップ画像を調整できませんでした', 'もう一度画像を選び直して試してください。');
        });
      }
    }
  }, [pendingTopPhoto, canPickPhotoKind]);

  return { pendingTopPhoto, setPendingTopPhoto, topImageCropResumeToken, setTopImageCropResumeToken, topImageProcessing, topImageAccessPurchaseResumeRef, topImageCropDismissActionRef, resumeTopImageAfterAccessFlow, canPickPhotoKind, canOpenTopImagePicker, pickPhotoTheme, adjustTopPhoto, applyPendingTopPhoto };
}
