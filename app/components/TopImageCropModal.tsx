import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, PanResponder, Pressable, Text, View } from 'react-native';
import { CropDisplayRect, displayToNormalizedRect, getContainBounds, getInitialCropRect, ImageDisplayBounds, NormalizedCropRect, normalizedToDisplayRect, clampCropRect } from '../features/photo/topImageCrop';

type Props = {
  visible: boolean;
  uri?: string;
  sourceWidth: number;
  sourceHeight: number;
  initialRect?: NormalizedCropRect;
  styles: any;
  onCancel: () => void;
  onReselect: () => void;
  onUse: (rect: NormalizedCropRect) => void;
  onDismiss?: () => void;
  processing?: boolean;
};

export function TopImageCropModal({ visible, uri, sourceWidth, sourceHeight, initialRect, styles, onCancel, onReselect, onUse, onDismiss, processing = false }: Props) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const bounds = useMemo<ImageDisplayBounds>(() => getContainBounds(sourceWidth, sourceHeight, layout.width, layout.height), [sourceWidth, sourceHeight, layout]);
  const [rect, setRect] = useState<CropDisplayRect>(() => getInitialCropRect(bounds));
  const rectRef = useRef(rect);
  const gestureRef = useRef<{ mode: 'move' | 'resize'; start: CropDisplayRect; startX: number; startY: number } | undefined>(undefined);
  useEffect(() => {
    if (__DEV__ && visible) console.log('[TopImage] crop-render', { sourceWidth, sourceHeight, hasUri: Boolean(uri), processing });
  }, [processing, sourceHeight, sourceWidth, uri, visible]);
  useEffect(() => {
    const next = normalizedToDisplayRect(initialRect, bounds);
    rectRef.current = next;
    setRect(next);
  }, [initialRect, bounds.x, bounds.y, bounds.width, bounds.height]);
  const updateRect = React.useCallback((next: CropDisplayRect) => { const safe = clampCropRect(next, bounds); rectRef.current = safe; setRect(safe); }, [bounds]);
  const createGestureResponder = (mode: 'move' | 'resize') => PanResponder.create({
    onStartShouldSetPanResponder: (event) => {
      if (mode !== 'move') return true;
      const nearResizeHandle = event.nativeEvent.locationX >= rectRef.current.width - 40 && event.nativeEvent.locationY >= rectRef.current.height - 40;
      return !nearResizeHandle;
    },
    onMoveShouldSetPanResponder: () => Boolean(gestureRef.current),
    onPanResponderGrant: (event) => {
      if (__DEV__) console.log('[TopImage] crop-rect-touch', { mode });
      const current = rectRef.current;
      gestureRef.current = { mode, start: current, startX: event.nativeEvent.pageX, startY: event.nativeEvent.pageY };
    },
    onPanResponderMove: (event) => {
      const gesture = gestureRef.current;
      if (!gesture) return;
      const dx = event.nativeEvent.pageX - gesture.startX;
      const dy = event.nativeEvent.pageY - gesture.startY;
      if (gesture.mode === 'move') updateRect({ ...gesture.start, x: gesture.start.x + dx, y: gesture.start.y + dy });
      else {
        const width = gesture.start.width + dx;
        updateRect({ ...gesture.start, width, height: width / 2.5 });
      }
    },
    onPanResponderRelease: () => { if (__DEV__) console.log('[TopImage] crop-touch-end', { area: mode, cancelled: false }); gestureRef.current = undefined; },
    onPanResponderTerminate: () => { if (__DEV__) console.log('[TopImage] crop-touch-end', { area: mode, cancelled: true }); gestureRef.current = undefined; },
  });
  const movePanResponder = useMemo(() => createGestureResponder('move'), [updateRect]);
  const resizePanResponder = useMemo(() => createGestureResponder('resize'), [updateRect]);
  const reset = () => updateRect(getInitialCropRect(bounds));
  const safeCancel = () => { if (!processing) { if (__DEV__) console.log('[TopImage] cancel-button-press'); onCancel(); } };
  const safeReselect = () => { if (!processing) onReselect(); };
  const safeUse = () => { if (!processing) { if (__DEV__) console.log('[TopImage] use-button-press'); onUse(displayToNormalizedRect(rectRef.current, bounds)); } };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={safeCancel} onDismiss={onDismiss}>
    <View onTouchStart={() => { if (__DEV__) console.log('[TopImage] root-touch'); }} style={styles.topImageCropBackdrop}>
      <Pressable pointerEvents="auto" onPress={safeCancel} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <View onTouchStart={() => { if (__DEV__) console.log('[TopImage] sheet-touch'); }} style={styles.topImageCropSheet}>
        <View style={styles.topImageCropHeader}><Pressable disabled={processing} onPress={safeCancel}><Text style={styles.topImageCropCancel}>キャンセル</Text></Pressable><Text style={styles.topImageCropTitle}>トップ画像の範囲を選択</Text><View style={styles.topImageCropHeaderSpacer} /></View>
        <Text style={styles.topImageCropCopy}>元画像から、トップに表示したい範囲を選んでください。</Text>
        <View onTouchStart={() => { if (__DEV__) { console.log('[TopImage] crop-area-touch'); console.log('[TopImage] crop-touch-start', { area: 'crop' }); } }} onTouchEnd={() => { if (__DEV__) console.log('[TopImage] crop-touch-end', { area: 'crop', cancelled: false }); }} onLayout={(event) => { const next = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height }; if (__DEV__) console.log('[TopImage] crop-layout', next); setLayout((current) => current.width === next.width && current.height === next.height ? current : next); }} style={styles.topImageCropCanvas}>
          {uri && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}><Image source={{ uri }} resizeMode="contain" style={styles.topImageCropImage} /></View>}
          {layout.width > 0 && <><View pointerEvents="none" style={[styles.topImageCropMask, { left: 0, top: 0, width: layout.width, height: rect.y }]} /><View pointerEvents="none" style={[styles.topImageCropMask, { left: 0, top: rect.y + rect.height, width: layout.width, height: Math.max(0, layout.height - rect.y - rect.height) }]} /><View pointerEvents="none" style={[styles.topImageCropMask, { left: 0, top: rect.y, width: Math.max(0, rect.x), height: rect.height }]} /><View pointerEvents="none" style={[styles.topImageCropMask, { left: rect.x + rect.width, top: rect.y, width: Math.max(0, layout.width - rect.x - rect.width), height: rect.height }]} /><View style={[styles.topImageCropFrame, rect]} {...movePanResponder.panHandlers}><View pointerEvents="none" style={{ ...styles.topImageCropFrame, left: 0, top: 0, right: 0, bottom: 0, borderWidth: 0, backgroundColor: 'transparent' }} /><View style={styles.topImageCropHandle} {...resizePanResponder.panHandlers} /></View></>}
        </View>
        <View style={styles.topImageCropActions}><Pressable disabled={processing} onPress={reset} style={styles.topImageCropSecondary}><Text style={styles.topImageCropSecondaryText}>リセット</Text></Pressable><Pressable disabled={processing} onPress={safeReselect} style={styles.topImageCropSecondary}><Text style={styles.topImageCropSecondaryText}>選び直す</Text></Pressable><Pressable disabled={processing} onPress={safeUse} style={[styles.topImageCropPrimary, processing && { opacity: 0.55 }]}><Text style={styles.topImageCropPrimaryText}>{processing ? '保存中…' : 'この範囲を使用'}</Text></Pressable></View>
      </View>
    </View>
  </Modal>;
}
