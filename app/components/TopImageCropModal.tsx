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
};

export function TopImageCropModal({ visible, uri, sourceWidth, sourceHeight, initialRect, styles, onCancel, onReselect, onUse }: Props) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const bounds = useMemo<ImageDisplayBounds>(() => getContainBounds(sourceWidth, sourceHeight, layout.width, layout.height), [sourceWidth, sourceHeight, layout]);
  const [rect, setRect] = useState<CropDisplayRect>(() => getInitialCropRect(bounds));
  const rectRef = useRef(rect);
  const gestureRef = useRef<{ mode: 'move' | 'resize'; start: CropDisplayRect; startX: number; startY: number } | undefined>(undefined);
  useEffect(() => {
    const next = normalizedToDisplayRect(initialRect, bounds);
    rectRef.current = next;
    setRect(next);
  }, [initialRect, bounds.x, bounds.y, bounds.width, bounds.height]);
  const updateRect = (next: CropDisplayRect) => { const safe = clampCropRect(next, bounds); rectRef.current = safe; setRect(safe); };
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const localX = event.nativeEvent.locationX;
      const localY = event.nativeEvent.locationY;
      const current = rectRef.current;
      const inside = localX >= current.x && localX <= current.x + current.width && localY >= current.y && localY <= current.y + current.height;
      if (!inside) {
        gestureRef.current = undefined;
        return;
      }
      const nearCorner = localX > current.x + current.width - 34 && localY > current.y + current.height - 34;
      gestureRef.current = { mode: nearCorner ? 'resize' : 'move', start: current, startX: event.nativeEvent.pageX, startY: event.nativeEvent.pageY };
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
    onPanResponderRelease: () => { gestureRef.current = undefined; },
    onPanResponderTerminate: () => { gestureRef.current = undefined; },
  }), [bounds]);
  const reset = () => updateRect(getInitialCropRect(bounds));
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
    <View style={styles.topImageCropBackdrop}>
      <View style={styles.topImageCropSheet}>
        <View style={styles.topImageCropHeader}><Pressable onPress={onCancel}><Text style={styles.topImageCropCancel}>キャンセル</Text></Pressable><Text style={styles.topImageCropTitle}>トップ画像の範囲を選択</Text><View style={styles.topImageCropHeaderSpacer} /></View>
        <Text style={styles.topImageCropCopy}>元画像から、トップに表示したい範囲を選んでください。</Text>
        <View style={styles.topImageCropCanvas} onLayout={(event) => setLayout({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })} {...panResponder.panHandlers}>
          {uri && <Image source={{ uri }} resizeMode="contain" style={styles.topImageCropImage} />}
          {layout.width > 0 && <><View pointerEvents="none" style={[styles.topImageCropMask, { left: 0, top: 0, width: layout.width, height: rect.y }]} /><View pointerEvents="none" style={[styles.topImageCropMask, { left: 0, top: rect.y + rect.height, width: layout.width, height: Math.max(0, layout.height - rect.y - rect.height) }]} /><View pointerEvents="none" style={[styles.topImageCropMask, { left: 0, top: rect.y, width: Math.max(0, rect.x), height: rect.height }]} /><View pointerEvents="none" style={[styles.topImageCropMask, { left: rect.x + rect.width, top: rect.y, width: Math.max(0, layout.width - rect.x - rect.width), height: rect.height }]} /><View pointerEvents="none" style={[styles.topImageCropFrame, rect]}><View style={styles.topImageCropHandle} /></View></>}
        </View>
        <View style={styles.topImageCropActions}><Pressable onPress={reset} style={styles.topImageCropSecondary}><Text style={styles.topImageCropSecondaryText}>リセット</Text></Pressable><Pressable onPress={onReselect} style={styles.topImageCropSecondary}><Text style={styles.topImageCropSecondaryText}>選び直す</Text></Pressable><Pressable onPress={() => onUse(displayToNormalizedRect(rectRef.current, bounds))} style={styles.topImageCropPrimary}><Text style={styles.topImageCropPrimaryText}>この範囲を使用</Text></Pressable></View>
      </View>
    </View>
  </Modal>;
}
