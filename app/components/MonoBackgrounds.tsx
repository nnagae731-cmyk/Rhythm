import React from 'react';
import { StyleSheet, View } from 'react-native';

export function MonoLooseLeafBackground({ dark }: { dark: boolean }) {
  const backgroundColor = dark ? '#171B24' : '#F7F5EF';
  const lineColor = dark ? 'rgba(190,200,220,0.10)' : 'rgba(120,110,90,0.12)';
  const marginColor = dark ? 'rgba(220,150,160,0.18)' : 'rgba(190,120,125,0.18)';
  const holeColor = dark ? '#10141C' : '#E8E3D9';
  return <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor }]}>
    {Array.from({ length: 28 }, (_, index) => <View key={`line-${index}`} style={{ position: 'absolute', left: 0, right: 0, top: 28 + index * 30, height: 1, backgroundColor: lineColor }} />)}
    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 42, width: 1, backgroundColor: marginColor }} />
    {Array.from({ length: 14 }, (_, index) => <View key={`hole-${index}`} style={{ position: 'absolute', left: 10, top: 17 + index * 48, width: 12, height: 12, borderRadius: 6, backgroundColor: holeColor, borderWidth: 1, borderColor: lineColor }} />)}
  </View>;
}

export function MonoChicBackground({ dark }: { dark: boolean }) {
  const backgroundColor = dark ? '#101722' : '#F1F0EB';
  const panelColors = dark
    ? ['rgba(31, 48, 70, 0.72)', 'rgba(18, 31, 50, 0.58)', 'rgba(47, 62, 78, 0.32)']
    : ['rgba(221, 219, 211, 0.62)', 'rgba(246, 245, 240, 0.72)', 'rgba(205, 202, 191, 0.26)'];
  const lineColor = dark ? 'rgba(222, 187, 112, 0.52)' : 'rgba(125, 104, 58, 0.42)';
  const dotColor = dark ? 'rgba(222, 187, 112, 0.48)' : 'rgba(125, 104, 58, 0.34)';
  const dots = [
    { left: '67%', top: '13%' }, { left: '72%', top: '13%' }, { left: '77%', top: '13%' },
    { left: '67%', top: '18%' }, { left: '72%', top: '18%' }, { left: '77%', top: '18%' },
    { left: '67%', top: '23%' }, { left: '72%', top: '23%' }, { left: '77%', top: '23%' },
    { left: '67%', top: '28%' }, { left: '72%', top: '28%' }, { left: '77%', top: '28%' },
    { left: '67%', top: '33%' }, { left: '72%', top: '33%' }, { left: '77%', top: '33%' },
    { left: '83%', top: '78%' }, { left: '88%', top: '78%' }, { left: '93%', top: '78%' },
    { left: '83%', top: '83%' }, { left: '88%', top: '83%' }, { left: '93%', top: '83%' },
  ];
  return <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor }]}>
    <View style={{ position: 'absolute', width: '145%', height: '43%', left: '-35%' as any, top: '7%' as any, backgroundColor: panelColors[0], transform: [{ rotate: '-27deg' }] }} />
    <View style={{ position: 'absolute', width: '125%', height: '36%', left: '24%' as any, top: '37%' as any, backgroundColor: panelColors[1], transform: [{ rotate: '-27deg' }] }} />
    <View style={{ position: 'absolute', width: '120%', height: '22%', left: '-20%' as any, bottom: '1%' as any, backgroundColor: panelColors[2], transform: [{ rotate: '-27deg' }] }} />
    <View style={{ position: 'absolute', width: '130%', height: 1, left: '-12%' as any, top: '21%' as any, backgroundColor: lineColor, transform: [{ rotate: '-45deg' }] }} />
    <View style={{ position: 'absolute', width: '120%', height: 1, left: '10%' as any, top: '67%' as any, backgroundColor: lineColor, transform: [{ rotate: '-45deg' }] }} />
    {dots.map((dot, index) => <View key={`chic-dot-${index}`} style={{ position: 'absolute', left: dot.left as any, top: dot.top as any, width: 4, height: 4, borderRadius: 2, backgroundColor: dotColor }} />)}
  </View>;
}
