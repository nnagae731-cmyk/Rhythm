import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { TravelAppCategory, TravelAppConfig, TravelAppSettings, getDefaultTravelApp, getEnabledTravelApps, openTravelApp } from '../features/travel/travelApps';

type Props = {
  settings?: TravelAppSettings;
  category: TravelAppCategory;
  destination?: string;
  planTier: PlanTier;
  designMode: DesignMode;
  chicPalette?: ChicThemePalette;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  onOpenSettings?: () => void;
  readOnly?: boolean;
};

export function TravelAppLaunchActions({ settings, category, destination, planTier, designMode, chicPalette, onPremium, onOpenSettings, readOnly = false }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const enabled = useMemo(() => settings ? getEnabledTravelApps(settings, category) : [], [settings, category]);
  const base = getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const colors = chicPalette && (designMode === 'chic' || designMode === 'photo')
    ? { surface: chicPalette.cardSurface, soft: chicPalette.cardTint, border: chicPalette.border, text: chicPalette.textPrimary, muted: chicPalette.textSecondary, accent: chicPalette.accent, onAccent: chicPalette.onAccent }
    : { surface: base.surface, soft: base.secondarySurface, border: base.border, text: base.primaryText, muted: base.secondaryText, accent: base.primaryAccent, onAccent: designMode === 'dark' ? base.screenBackground : '#FFFFFF' };
  const title = category === 'taxi' ? 'タクシーを開く' : '乗換を調べる';
  const launch = async (app: TravelAppConfig) => {
    setPickerOpen(false);
    const result = await openTravelApp(app, app.supportsDestination ? destination : undefined);
    if (!result.ok) Alert.alert('移動アプリを開けませんでした', result.error ?? '設定を確認してください。');
  };
  const press = () => {
    if (readOnly) return;
    if (planTier !== 'premium') { onPremium('travel_apps'); return; }
    if (enabled.length === 0) { Alert.alert('移動アプリを設定してください', '設定からアプリを登録すると、ここからすぐ開けます。', [{ text: '閉じる' }, ...(onOpenSettings ? [{ text: '設定を開く', onPress: onOpenSettings }] : [])]); return; }
    if (enabled.length === 1) { void launch(enabled[0]!); return; }
    setPickerOpen(true);
  };
  if (readOnly) return <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}><View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingVertical: 9, alignItems: 'center', backgroundColor: colors.soft }}><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '900' }}>{title}</Text></View></View>;
  return <>
    <Pressable accessibilityRole="button" onPress={press} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: colors.soft, marginRight: 7, marginTop: 7 }}><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '900' }}>{title}</Text></Pressable>
    <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}><Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }} onPress={() => setPickerOpen(false)}><Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 }} onPress={(event) => event.stopPropagation()}><Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{title}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 5 }}>開くアプリを選択してください</Text>{enabled.map((app) => <Pressable key={app.id} onPress={() => void launch(app)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, marginTop: 10 }}><Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{app.name}</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>{getDefaultTravelApp(settings!, category)?.id === app.id ? '標準アプリ' : '登録済み'}</Text></Pressable>)}<Pressable onPress={() => setPickerOpen(false)} style={{ alignItems: 'center', paddingVertical: 15 }}><Text style={{ color: colors.accent, fontWeight: '800' }}>閉じる</Text></Pressable></Pressable></Pressable></Modal>
  </>;
}
