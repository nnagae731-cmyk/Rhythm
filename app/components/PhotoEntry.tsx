import React, { useEffect, useRef, useState } from 'react';
import { Image, InteractionManager, Modal, Platform, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import type { PhotoThemePhotoTarget, PhotoThemeSettings } from '../types';

const targets = [
  { id: 'home', label: 'ホームのトップ画' }, { id: 'timeline', label: '予定のトップ画' },
  { id: 'analysis', label: '分析のトップ画' }, { id: 'wish', label: '叶えたいことのトップ画' },
  { id: 'focus', label: '集中タイマーの背景' }, { id: 'background', label: '全体の背景' },
] as const;

export function CameraBadge({ color }: { color: string }) {
  return <Svg width={17} height={17} viewBox="0 0 24 24" accessible={false}><Path d="M4 7h4l2-3h4l2 3h4v13H4z" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" /><Circle cx="12" cy="13" r="3.5" fill="none" stroke={color} strokeWidth={1.8} /></Svg>;
}

export function PhotoEntryButton({ label, onPress, designMode, chicPalette, overlay = false, iconOnly = false }: { label: string; onPress?: () => void; designMode: DesignMode; chicPalette?: ChicThemePalette; overlay?: boolean; iconOnly?: boolean }) {
  const colors = getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const palette = designMode === 'chic' ? chicPalette : undefined;
  if (!onPress) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[{ minHeight: 44, minWidth: 44, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: palette?.border ?? colors.border, backgroundColor: palette?.cardSurface ?? colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, overlay && { position: 'absolute', right: 8, bottom: 8 }, iconOnly && { width: 44, paddingHorizontal: 0 }, iconOnly && !overlay && { borderWidth: 0, backgroundColor: 'transparent' }]}><CameraBadge color={iconOnly && !overlay ? palette?.textSecondary ?? colors.secondaryText : palette?.accent ?? colors.primaryAccent} />{!iconOnly && <Text style={{ color: palette?.accentStrong ?? colors.primaryAccent, fontSize: 12, lineHeight: 18, fontWeight: '700' }}>{label}</Text>}</Pressable>;
}

export function PhotoTopEntry({ uri, onPress, label, designMode, chicPalette, style, imageStyle, hint = false }: { hint?: boolean; uri?: string; onPress: () => void; label: string; designMode: DesignMode; chicPalette?: ChicThemePalette; style?: StyleProp<ViewStyle>; imageStyle?: StyleProp<ImageStyle> }) {
  const colors = getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const palette = designMode === 'chic' ? chicPalette : undefined;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}を${uri ? '変更' : '設定'}`} onPress={onPress} onLongPress={onPress} style={uri ? style : { minHeight: 44, width: 44, marginRight: 22, alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center' }}>
    {uri ? <><Image source={{ uri }} resizeMode="contain" style={imageStyle} /><View pointerEvents="none" style={{ position: 'absolute', right: 8, bottom: 8, width: 32, height: 28, borderRadius: 10, backgroundColor: palette?.cardSurface ?? colors.surface, alignItems: 'center', justifyContent: 'center' }}><CameraBadge color={palette?.accent ?? colors.primaryAccent} /></View></> : <CameraBadge color={palette?.textSecondary ?? colors.secondaryText} />}
    {hint && <Text testID="photo-entry-hint" style={{ position: 'absolute', right: uri ? 48 : 42, bottom: uri ? 8 : 12, fontSize: 11, lineHeight: 18, color: palette?.textSecondary ?? colors.secondaryText, backgroundColor: palette?.cardSurface ?? colors.surface, paddingHorizontal: 6, borderRadius: 6 }}>写真を設定</Text>}
  </Pressable>;
}

// This is only an entry/target chooser. The caller owns the unchanged access,
// Rewarded, native picker and crop flows. Never pass a bypass flag from here.
export function PhotoEntrySheet({ visible, initialTarget, photoTheme, designMode, chicPalette, onClose, onPick, onAdjust, canChooseWithoutReward }: { visible: boolean; initialTarget: PhotoThemePhotoTarget; photoTheme: PhotoThemeSettings; designMode: DesignMode; chicPalette?: ChicThemePalette; onClose: () => void; onPick: (target: PhotoThemePhotoTarget) => void; canChooseWithoutReward: (target: PhotoThemePhotoTarget) => boolean; onAdjust: (target: Exclude<PhotoThemePhotoTarget, 'background' | 'focus'>) => void }) {
  const [target, setTarget] = useState(initialTarget);
  const afterDismiss = useRef<(() => void) | undefined>(undefined);
  const presenting = useRef(false);
  useEffect(() => { if (visible) { setTarget(initialTarget); presenting.current = false; } }, [visible, initialTarget]);
  const colors = getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const palette = designMode === 'chic' ? chicPalette : undefined;
  const accent = palette?.accent ?? colors.primaryAccent;
  const finishDismiss = () => { const next = afterDismiss.current; afterDismiss.current = undefined; next?.(); };
  const present = (action: () => void) => {
    if (presenting.current) return;
    presenting.current = true;
    afterDismiss.current = action;
    onClose();
    if (Platform.OS !== 'ios') InteractionManager.runAfterInteractions(finishDismiss);
  };
  const uri = target === 'background' ? photoTheme.imageUri : target === 'focus' ? photoTheme.focusBackgroundUri : photoTheme.topImageUris?.[target] ?? photoTheme.topImageOriginalUris?.[target];
  const needsAccess = !canChooseWithoutReward(target);
  const topTarget = target !== 'background' && target !== 'focus' ? target : undefined;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={finishDismiss}>
    <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,20,28,0.3)' }} onPress={onClose}>
      <Pressable testID="photo-entry-sheet" onPress={event => event.stopPropagation()} style={{ padding: 18, paddingBottom: 26, maxHeight: '76%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: palette?.border ?? colors.border, backgroundColor: palette?.cardSurface ?? colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text accessibilityRole="header" style={{ color: palette?.textPrimary ?? colors.primaryText, fontSize: 18, fontWeight: '800' }}>写真を添える</Text><Pressable accessibilityRole="button" accessibilityLabel="写真の適用先を閉じる" onPress={onClose} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: accent, fontSize: 24 }}>×</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled"><Text style={{ color: palette?.textSecondary ?? colors.secondaryText, fontSize: 13, lineHeight: 20, marginBottom: 10 }}>{needsAccess ? 'この写真枠は、広告視聴または購入後に利用できます。写真を選ぶ前に、従来の解放案内へ進みます。' : '適用先を選んで、好きな一枚を。解放済みの枠を利用できます。'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{targets.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: target === item.id }} onPress={() => setTarget(item.id)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 11, borderWidth: target === item.id ? 2 : 1, borderColor: target === item.id ? accent : palette?.border ?? colors.border, backgroundColor: target === item.id ? palette?.accentSoft ?? colors.softAccent : palette?.cardSurface ?? colors.surface }}><Text style={{ color: target === item.id ? accent : palette?.textSecondary ?? colors.secondaryText, fontSize: 13, lineHeight: 20, fontWeight: '700' }}>{item.label}</Text></Pressable>)}</View>
          {uri && <Image accessibilityLabel="選択中の適用先の写真" source={{ uri }} resizeMode="contain" style={{ width: '100%', height: 100, borderRadius: 12, marginTop: 14 }} />}
          <Pressable accessibilityRole="button" accessibilityLabel="この適用先の写真を選ぶ" onPress={() => present(() => onPick(target))} style={{ minHeight: 46, borderRadius: 12, marginTop: 16, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: accent }}><Text style={{ color: palette?.onAccent ?? (designMode === 'dark' ? colors.screenBackground : colors.surface), fontSize: 14, fontWeight: '800' }}>{needsAccess ? '広告・購入の案内へ' : uri ? '写真を変更する' : '写真を選ぶ'}</Text></Pressable>
          {uri && topTarget && <Pressable accessibilityRole="button" onPress={() => present(() => onAdjust(topTarget))} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 4 }}><Text style={{ color: accent, fontSize: 13, fontWeight: '700' }}>今の写真を再調整する</Text></Pressable>}
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}
