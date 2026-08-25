import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { ChicThemePalette, DesignMode, getThemeTokens } from '../theme';
import { PlanTier } from '../premiumAccess';
import { PremiumGuideFeatureId } from '../premiumGuide';
import { TravelAppCategory, TravelAppConfig, TravelAppSettings, getEnabledTravelApps, normalizeTravelAppSettings, openShortcutsSetup, openTravelApp, validateTravelAppUrl } from '../features/travel/travelApps';

type Props = {
  settings: TravelAppSettings;
  onChange: (settings: TravelAppSettings) => void;
  planTier: PlanTier;
  designMode: DesignMode;
  chicPalette?: ChicThemePalette;
  onPremium: (featureId?: PremiumGuideFeatureId) => void;
  readOnlyPreview?: boolean;
};

const EMPTY_DRAFT = { id: '', name: '', category: 'transit' as TravelAppCategory, launchMethod: 'shortcut' as TravelAppConfig['launchMethod'], shortcutName: '', launchUrl: '', destinationUrlTemplate: '', passDestinationToShortcut: false };

export function TravelAppsSettingsCard({ settings, onChange, planTier, designMode, chicPalette, onPremium, readOnlyPreview = false }: Props) {
  const normalized = useMemo(() => normalizeTravelAppSettings(settings), [settings]);
  const [editor, setEditor] = useState<TravelAppConfig | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const isPremium = planTier === 'premium';
  const isDark = designMode === 'dark';
  const base = getThemeTokens(designMode, chicPalette?.id ?? 'cool').colors;
  const colors = chicPalette && (designMode === 'chic' || designMode === 'photo')
    ? { surface: chicPalette.cardSurface, soft: chicPalette.cardTint, border: chicPalette.border, text: chicPalette.textPrimary, muted: chicPalette.textSecondary, accent: chicPalette.accent, onAccent: chicPalette.onAccent }
    : { surface: base.surface, soft: base.secondarySurface, border: base.border, text: base.primaryText, muted: base.secondaryText, accent: base.primaryAccent, onAccent: designMode === 'dark' ? base.screenBackground : '#FFFFFF' };
  const updateApp = (id: string, update: Partial<TravelAppConfig>) => onChange(normalizeTravelAppSettings({ ...normalized, apps: normalized.apps.map((app) => app.id === id ? { ...app, ...update } : app) }));
  const setDefault = (app: TravelAppConfig) => onChange({ ...normalized, defaultTaxiAppId: app.category === 'taxi' ? app.id : normalized.defaultTaxiAppId, defaultTransitAppId: app.category === 'transit' ? app.id : normalized.defaultTransitAppId, apps: normalized.apps.map((item) => item.id === app.id ? { ...item, enabled: true, isDefault: true } : item) });
  const startEditor = (app?: TravelAppConfig) => {
    if (app) {
      setEditor(app);
      setDraft({ id: app.id, name: app.name, category: app.category, launchMethod: app.launchMethod, shortcutName: app.shortcutName ?? '', launchUrl: app.launchUrl ?? '', destinationUrlTemplate: app.destinationUrlTemplate ?? '', passDestinationToShortcut: Boolean(app.passDestinationToShortcut) });
    } else {
      setEditor(null);
      setDraft(EMPTY_DRAFT);
    }
    setEditorOpen(true);
  };
  const saveDraft = () => {
    const name = draft.name.trim();
    if (!name) { Alert.alert('アプリ名を入力してください'); return; }
    if (draft.launchMethod === 'shortcut' && !draft.shortcutName.trim()) { Alert.alert('ショートカット名を入力してください'); return; }
    if (draft.launchMethod === 'custom_url' && (!draft.launchUrl.trim() || !validateTravelAppUrl(draft.launchUrl))) { Alert.alert('起動URLを確認してください', 'http(s) または安全なアプリURLを入力してください。'); return; }
    const id = editor?.id ?? `custom-${Date.now()}`;
    const app: TravelAppConfig = { id, name, category: draft.category, launchMethod: draft.launchMethod, enabled: editor?.enabled ?? false, supportsDestination: Boolean(draft.destinationUrlTemplate.trim()) || Boolean(editor?.supportsDestination), launchUrl: draft.launchUrl.trim() || undefined, destinationUrlTemplate: draft.destinationUrlTemplate.trim() || undefined, shortcutName: draft.shortcutName.trim() || undefined, passDestinationToShortcut: draft.passDestinationToShortcut, isPreset: false };
    const apps = editor ? normalized.apps.map((item) => item.id === editor.id ? app : item) : [...normalized.apps, app];
    onChange(normalizeTravelAppSettings({ ...normalized, apps }));
    setEditor(null);
    setEditorOpen(false);
  };
  const renderRow = (app: TravelAppConfig) => {
    const defaultId = app.category === 'taxi' ? normalized.defaultTaxiAppId : normalized.defaultTransitAppId;
    const configured = app.launchMethod !== 'shortcut' || Boolean(app.shortcutName);
    return <View key={app.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, marginTop: 8, backgroundColor: colors.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{app.name}</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>{app.launchMethod === 'official_url' ? '公式アプリを開く' : configured ? 'ショートカット設定済み' : 'ショートカット設定が必要'}</Text></View>
        <Switch value={app.enabled} disabled={readOnlyPreview} onValueChange={(value) => updateApp(app.id, { enabled: value })} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={app.enabled ? colors.onAccent : colors.muted} />
      </View>
      {!readOnlyPreview && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {app.launchMethod === 'shortcut' && <Pressable style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 }} onPress={() => startEditor(app)}><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800' }}>{configured ? '設定を編集' : '設定する'}</Text></Pressable>}
        <Pressable style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 }} onPress={() => setDefault(app)}><Text style={{ color: defaultId === app.id ? colors.accent : colors.muted, fontSize: 11, fontWeight: '800' }}>{defaultId === app.id ? '標準' : '標準にする'}</Text></Pressable>
        <Pressable style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 }} onPress={async () => { const result = await openTravelApp(app, app.supportsDestination ? '天神○○ビル' : undefined); if (!result.ok) Alert.alert('起動できませんでした', result.error); }}><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800' }}>起動テスト</Text></Pressable>
        {!app.isPreset && <Pressable style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 }} onPress={() => { onChange({ ...normalized, apps: normalized.apps.filter((item) => item.id !== app.id) }); }}><Text style={{ color: '#A55E66', fontSize: 11, fontWeight: '800' }}>削除</Text></Pressable>}
      </View>}
    </View>;
  };
  if (!isPremium) return <Pressable onPress={() => onPremium('travel_apps')} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, backgroundColor: colors.surface, marginBottom: 14 }}><Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>🔒 移動アプリ連携</Text><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>いつもの乗換・タクシーアプリを登録して、予定や遅れた時にRhythmからすぐ開けます。</Text><Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800', marginTop: 10 }}>Premiumで利用できます ›</Text></Pressable>;
  return <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, backgroundColor: colors.surface, marginBottom: 14 }}>
    <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>移動アプリ連携</Text>
    <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>予定や遅れた時に、登録したアプリをすぐ開けます。位置情報や経路検索は自動で行いません。</Text>
    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 16 }}>タクシー</Text>
    {normalized.apps.filter((app) => app.category === 'taxi').map(renderRow)}
    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 18 }}>乗換・交通</Text>
    {normalized.apps.filter((app) => app.category === 'transit').map(renderRow)}
    {!readOnlyPreview && <Pressable onPress={() => startEditor()} style={{ borderWidth: 1, borderColor: colors.accent, borderRadius: 11, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}><Text style={{ color: colors.accent, fontSize: 12, fontWeight: '900' }}>その他のアプリを追加 ›</Text></Pressable>}
    <Modal visible={editorOpen} transparent animationType="slide" onRequestClose={() => { setEditor(null); setEditorOpen(false); }}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }} onPress={() => { setEditor(null); setEditorOpen(false); }}><Pressable style={{ maxHeight: '84%', backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 }} onPress={(event) => event.stopPropagation()}><ScrollView keyboardShouldPersistTaps="handled"><Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{editor ? '移動アプリを編集' : '移動アプリを追加'}</Text><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>ショートカット名または起動URLを設定します。</Text><TextInput value={draft.name} onChangeText={(value) => setDraft((current) => ({ ...current, name: value }))} placeholder="アプリ名" placeholderTextColor={colors.muted} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, color: colors.text, marginTop: 14 }} /><TextInput value={draft.launchMethod === 'shortcut' ? draft.shortcutName : draft.launchUrl} onChangeText={(value) => setDraft((current) => draft.launchMethod === 'shortcut' ? { ...current, shortcutName: value } : { ...current, launchUrl: value })} placeholder={draft.launchMethod === 'shortcut' ? 'ショートカット名' : '起動URL'} placeholderTextColor={colors.muted} autoCapitalize="none" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, color: colors.text, marginTop: 10 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}><Pressable onPress={() => setDraft((current) => ({ ...current, launchMethod: 'shortcut' }))} style={{ flex: 1, borderWidth: 1, borderColor: draft.launchMethod === 'shortcut' ? colors.accent : colors.border, borderRadius: 10, padding: 10 }}><Text style={{ color: draft.launchMethod === 'shortcut' ? colors.accent : colors.muted, textAlign: 'center', fontSize: 11 }}>ショートカット</Text></Pressable><Pressable onPress={() => setDraft((current) => ({ ...current, launchMethod: 'custom_url' }))} style={{ flex: 1, borderWidth: 1, borderColor: draft.launchMethod === 'custom_url' ? colors.accent : colors.border, borderRadius: 10, padding: 10 }}><Text style={{ color: draft.launchMethod === 'custom_url' ? colors.accent : colors.muted, textAlign: 'center', fontSize: 11 }}>URL</Text></Pressable></View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}><Pressable onPress={() => setDraft((current) => ({ ...current, category: 'transit' }))} style={{ flex: 1, borderWidth: 1, borderColor: draft.category === 'transit' ? colors.accent : colors.border, borderRadius: 10, padding: 10 }}><Text style={{ color: draft.category === 'transit' ? colors.accent : colors.muted, textAlign: 'center', fontSize: 11 }}>乗換・地図</Text></Pressable><Pressable onPress={() => setDraft((current) => ({ ...current, category: 'taxi' }))} style={{ flex: 1, borderWidth: 1, borderColor: draft.category === 'taxi' ? colors.accent : colors.border, borderRadius: 10, padding: 10 }}><Text style={{ color: draft.category === 'taxi' ? colors.accent : colors.muted, textAlign: 'center', fontSize: 11 }}>タクシー</Text></Pressable></View>
      <TextInput value={draft.destinationUrlTemplate} onChangeText={(value) => setDraft((current) => ({ ...current, destinationUrlTemplate: value }))} placeholder="任意：目的地テンプレート（{destination}）" placeholderTextColor={colors.muted} autoCapitalize="none" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, color: colors.text, marginTop: 10 }} />
      {draft.launchMethod === 'shortcut' && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}><Text style={{ color: colors.muted, fontSize: 11, flex: 1 }}>目的地をショートカットへ渡す</Text><Switch value={draft.passDestinationToShortcut} onValueChange={(value) => setDraft((current) => ({ ...current, passDestinationToShortcut: value }))} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={draft.passDestinationToShortcut ? colors.onAccent : colors.muted} /></View>}
      {draft.launchMethod === 'shortcut' && <Pressable onPress={() => void openShortcutsSetup()} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, marginTop: 10 }}><Text style={{ color: colors.accent, textAlign: 'center', fontSize: 12, fontWeight: '800' }}>ショートカットアプリを開く</Text></Pressable>}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}><Pressable onPress={() => { setEditor(null); setEditorOpen(false); }} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted, fontWeight: '800' }}>キャンセル</Text></Pressable><Pressable onPress={saveDraft} style={{ flex: 1, minHeight: 46, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.onAccent, fontWeight: '900' }}>保存</Text></Pressable></View></ScrollView></Pressable></Pressable>
    </Modal>
  </View>;
}
