import React, { useId, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export function SurfaceFade({ color, horizontal = false, photo = false }: { color: string; horizontal?: boolean; photo?: boolean }) {
  const id = `surface-fade-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFillObject}>
    <Svg width="100%" height="100%" accessible={false}><Defs><LinearGradient id={id} x1="0%" y1="0%" x2={horizontal ? '100%' : '0%'} y2={horizontal ? '0%' : '100%'}>
      <Stop offset="0%" stopColor={color} stopOpacity={horizontal ? 0 : 0.98} />
      <Stop offset="82%" stopColor={color} stopOpacity={photo ? 0.94 : horizontal ? 0.82 : 0.18} />
      <Stop offset="100%" stopColor={color} stopOpacity={horizontal ? 1 : 0} />
    </LinearGradient></Defs><Rect width="100%" height="100%" fill={`url(#${id})`} /></Svg>
  </View>;
}

export function PhotoReadableBand({ enabled, children, testID }: { enabled?: boolean; children: React.ReactNode; testID: string }) {
  if (!enabled) return <>{children}</>;
  return <View testID={testID}><SurfaceFade color="#FFFFFF" photo />{children}</View>;
}

export function OverflowHintScroll({ children, surface }: { children: React.ReactNode; surface: string }) {
  const [width, setWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [offset, setOffset] = useState(0);
  const hasMore = width > 0 && contentWidth - width - offset > 2;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEventThrottle={16} onContentSizeChange={value => setContentWidth(value)} onScroll={event => setOffset(event.nativeEvent.contentOffset.x)} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>{children}</ScrollView>
    {hasMore && <View testID="scroll-continuation-fade" pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 24 }}><SurfaceFade color={surface} horizontal /></View>}
  </View>;
}
