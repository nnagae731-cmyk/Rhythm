import React from 'react';
import { Image, InteractionManager, Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import {
  WidgetDisplayOption,
  WidgetCustomization,
  WidgetSettings,
  WidgetType,
} from '../types';
import { ChicCheckColor, ChicPattern, getDesignPatternThemeTokens } from '../theme';
import { PlanTier } from '../premiumAccess';
import {
  getWidgetCustomization,
  WIDGET_TYPE_OPTIONS,
  WIDGET_FONT_DESIGN_OPTIONS,
  WIDGET_PHOTO_LAYOUT_OPTIONS,
} from '../features/widget/widgetSettings';
import { reactNativeFontFamily } from '../features/fontDesign';
import type { WidgetEntitlementOverride } from '../features/widget/widgetSettings';
import { deleteManagedPhotoUri } from '../features/photo/persistentPhoto';
import { getWidgetFloralAssetSource } from '../features/widget/widgetFloralAssets';

type WidgetSettingsCardProps = {
  settings: WidgetSettings;
  onChange: (settings: WidgetSettings) => void;
  onPickPhoto?: (widgetType?: WidgetType, override?: WidgetEntitlementOverride) => void;
  onUnlockWidgetPhoto?: (widgetType: WidgetType, override?: WidgetEntitlementOverride) => void;
  widgetPhotoUnlock?: { widgetType: WidgetType | null; expiresAt: string | null };
  onRemoveAffirmationPhoto?: (index?: number) => void;
  colors: { surface: string; border: string; primaryText: string; secondaryText: string; primaryAccent: string; softAccent: string; screenBackground: string };
  styles: any;
  designPattern?: ChicPattern;
  designCheckColor?: ChicCheckColor;
  PatternDecor?: React.ComponentType<any>;
  planTier?: PlanTier;
  designCustomizePurchased?: boolean;
  entitlementsResolved?: boolean;
  widgetEntitlementOverride?: WidgetEntitlementOverride;
  onWidgetEntitlementOverrideChange?: (override: WidgetEntitlementOverride) => void;
  onLockedWidget?: (access: 'design' | 'premium') => void;
  showSelectedPreview?: boolean;
};

const displayOptionsByType: Record<WidgetSettings['widgetType'], ReadonlyArray<{ key: WidgetDisplayOption; label: string }>> = {
  current: [
    { key: 'startTime', label: '開始時刻' },
    { key: 'remainingTime', label: '残り時間' },
    { key: 'status', label: '状態' },
  ],
  next: [
    { key: 'scheduleTime', label: '予定時刻' },
    { key: 'location', label: '場所' },
    { key: 'remainingToLeave', label: '出発まで' },
  ],
  combined: [
    { key: 'currentTask', label: '今はこれ' },
    { key: 'nextPlan', label: '次の予定' },
    { key: 'combinedRemainingToLeave', label: '出発まで' },
  ],
  monthly: [],
  weekly: [],
  today: [],
  checklist: [],
  goal: [],
  voice: [],
  affirmation: [],
};

type WidgetPreviewSize = 'small' | 'medium' | 'large';

function WidgetTypePreview({ type, style, fontDesign = 'default', photoUri, photoLayout = 'background', colors, designPattern, designCheckColor, PatternDecor, previewSize, renderMode = 'full' }: { type: WidgetSettings['widgetType']; style: WidgetSettings['style']; fontDesign?: WidgetSettings['fontDesign']; photoUri?: string; photoLayout?: WidgetSettings['photoLayout']; colors: WidgetSettingsCardProps['colors']; designPattern?: ChicPattern; designCheckColor?: ChicCheckColor; PatternDecor?: React.ComponentType<any>; previewSize?: WidgetPreviewSize; renderMode?: 'full' | 'thumbnail' }) {
  const thumbnail = renderMode === 'thumbnail';
  if (thumbnail) {
    const option = WIDGET_TYPE_OPTIONS.find((item) => item.id === type);
    return <View style={{ minHeight: 82, padding: 10, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><Text numberOfLines={1} style={{ flex: 1, color: colors.primaryText, fontSize: 12, fontWeight: '900' }}>{option?.label ?? 'ウィジェット'}</Text><View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1, borderColor: colors.primaryAccent, backgroundColor: colors.softAccent }} /></View>
      <View style={{ marginTop: 10, gap: 5 }}><View style={{ width: '72%', height: 5, borderRadius: 3, backgroundColor: colors.primaryText, opacity: 0.7 }} /><View style={{ width: '54%', height: 4, borderRadius: 2, backgroundColor: colors.secondaryText, opacity: 0.65 }} /><View style={{ width: '84%', height: 4, borderRadius: 2, backgroundColor: colors.primaryAccent, opacity: 0.72 }} /></View>
    </View>;
  }
  const fontFamily = reactNativeFontFamily(fontDesign ?? 'default');
  const line = (label: string, value: string) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><Text style={{ color: colors.secondaryText, fontSize: 10, fontFamily }}>{label}</Text><Text style={{ color: colors.primaryText, fontSize: 11, fontWeight: '800', flexShrink: 1, fontFamily }}>{value}</Text></View>;
  // Monthly is Large-only; keep the in-app sample a complete, current month
  // with a Sunday-first seven-column grid instead of the old fixed-date sample.
  const previewNow = new Date();
  const previewYear = previewNow.getFullYear();
  const previewMonth = previewNow.getMonth();
  const previewDay = previewNow.getDate();
  const previewMonthLabel = `${previewYear}年${previewMonth + 1}月`;
  const previewWeekday = ['日', '月', '火', '水', '木', '金', '土'][previewNow.getDay()];
  const daysInPreviewMonth = new Date(previewYear, previewMonth + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInPreviewMonth }, (_, index) => String(index + 1));
  const calendarLeadingEmptyCount = new Date(previewYear, previewMonth, 1).getDay();
  const calendarMarkedDays = new Set([0, 3, 7, 14].map((offset) => Math.min(daysInPreviewMonth, previewDay + offset)));
  const calendarWeekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const previewHeight = type === 'combined' || type === 'monthly' || type === 'weekly' || type === 'today' || type === 'goal' ? 164 : 136;
  const previewSizeStyle = previewSize
    ? { width: previewSize === 'small' ? '58%' as const : previewSize === 'large' ? '82%' as const : '100%' as const, alignSelf: 'center' as const, aspectRatio: previewSize === 'small' ? 1 : previewSize === 'large' ? 1.15 : 1.7 }
    : { height: previewHeight };
  const isCalendarType = type === 'monthly' || type === 'weekly' || type === 'today';
  const compact = previewSize === 'small';
  const photoTopHeight = compact ? 42 : previewSize === 'large' ? 78 : 58;
  const photoCardWidth = compact ? 54 : previewSize === 'large' ? 92 : 68;
  const photoCardHeight = compact ? 70 : previewSize === 'large' ? 116 : 88;
  const photoCircleSize = compact ? 50 : previewSize === 'large' ? 86 : 64;
  const photoSourceUri = photoUri;
  const floralPattern = designPattern === 'floral' ? 'vintageBloom' : designPattern === 'floralSoft' ? 'botanicalLine' : designPattern === 'floralSeasonal' || designPattern === 'floralDark' ? 'sheerFloral' : undefined;
  const floralAssetSource = floralPattern ? getWidgetFloralAssetSource(floralPattern, previewSize ?? 'medium') : undefined;
  const previewBackground = designPattern && floralPattern ? getDesignPatternThemeTokens(designPattern, 'cool').background : colors.screenBackground;
  return <View style={[{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: previewBackground, overflow: 'hidden' }, previewSizeStyle]}>
    {style === 'photo' && photoSourceUri && photoLayout === 'background' && <Image source={{ uri: photoSourceUri }} resizeMode="cover" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.72 }} />}
    {style === 'photo' && photoSourceUri && photoLayout === 'right' && <Image source={{ uri: photoSourceUri }} resizeMode="cover" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: compact ? '34%' : previewSize === 'large' ? '42%' : '38%', opacity: 0.9 }} />}
    {style === 'photo' && photoSourceUri && photoLayout === 'top' && <Image source={{ uri: photoSourceUri }} resizeMode="cover" style={{ position: 'absolute', left: 0, right: 0, top: isCalendarType ? undefined : 0, bottom: isCalendarType ? 0 : undefined, height: photoTopHeight, opacity: 0.9 }} />}
    {style === 'photo' && photoSourceUri && photoLayout === 'card' && <Image source={{ uri: photoSourceUri }} resizeMode="cover" style={{ position: 'absolute', right: 12, top: isCalendarType ? undefined : 14, bottom: isCalendarType ? 10 : undefined, width: photoCardWidth, height: photoCardHeight, borderRadius: 5, borderWidth: 3, borderColor: '#FFFFFF', transform: [{ rotate: '3deg' }], opacity: 0.95 }} />}
    {style === 'photo' && photoSourceUri && photoLayout === 'circle' && <Image source={{ uri: photoSourceUri }} resizeMode="cover" style={{ position: 'absolute', right: 12, top: isCalendarType ? undefined : 18, bottom: isCalendarType ? 12 : undefined, width: photoCircleSize, height: photoCircleSize, borderRadius: photoCircleSize / 2, borderWidth: 3, borderColor: '#FFFFFF', opacity: 0.95 }} />}
    {style === 'photo' && photoSourceUri && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: photoLayout === 'background' ? 'rgba(255,255,255,0.3)' : 'transparent' }} />}
    {floralAssetSource && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}><Image source={floralAssetSource} resizeMode="contain" style={{ width: '100%', height: '100%' }} /></View>}
    {style !== 'photo' && PatternDecor && designPattern && designPattern !== 'plain' && !floralPattern && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.32 }}><PatternDecor pattern={designPattern} accent={colors.primaryAccent} warm={colors.softAccent} checkColor={designCheckColor} preview /></View>}
    <View style={{ gap: 7 }}>
      {type === 'current' && <><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700', fontFamily }}>今はこれ</Text><Text style={{ color: colors.primaryText, fontSize: 16, fontWeight: '900', fontFamily }}>今日のタスクを確認</Text><Text style={{ color: colors.secondaryText, fontSize: 10, fontFamily }}>15:10開始</Text></>}
      {type === 'next' && <><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700', fontFamily }}>次の予定</Text><Text style={{ color: colors.primaryText, fontSize: 18, fontWeight: '900', fontFamily }}>18:00　予定</Text><Text style={{ color: colors.primaryAccent, fontSize: 11, fontWeight: '800', fontFamily }}>出発まで 1時間42分</Text></>}
      {type === 'combined' && <><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700', fontFamily }}>今はこれ</Text><Text style={{ color: colors.primaryText, fontSize: 14, fontWeight: '900', fontFamily }}>今日のタスクを確認</Text><View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginVertical: 1 }} /><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700', fontFamily }}>次の予定　18:00 予定</Text><Text style={{ color: colors.primaryAccent, fontSize: 10, fontWeight: '800', fontFamily }}>出発まで 1時間42分</Text></>}
      {type === 'monthly' && <><Text style={{ color: colors.primaryText, fontSize: 12, fontWeight: '900' }}>{previewMonthLabel}</Text><View style={{ flexDirection: 'row' }}>{calendarWeekdays.map((weekday) => <View key={weekday} style={{ width: '14.285%', alignItems: 'center' }}><Text style={{ color: colors.secondaryText, fontSize: 8, fontWeight: '700' }}>{weekday}</Text></View>)}</View><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{Array.from({ length: calendarLeadingEmptyCount }, (_, index) => <View key={`empty-${index}`} style={{ width: '14.285%', minHeight: 19 }} />)}{calendarDays.map((day) => { const dayNumber = Number(day); const highlighted = dayNumber === previewDay; return <View key={day} style={{ width: '14.285%', alignItems: 'center', paddingVertical: 1, borderRadius: 8, backgroundColor: highlighted ? colors.softAccent : 'transparent' }}><Text style={{ color: highlighted ? colors.primaryAccent : colors.secondaryText, fontSize: 8, fontWeight: highlighted ? '900' : '600' }}>{day}</Text>{calendarMarkedDays.has(dayNumber) && <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.primaryAccent, marginTop: 1 }} />}</View>; })}</View></>}
      {type === 'weekly' && <><Text style={{ color: colors.primaryText, fontSize: 12, fontWeight: '900' }}>今週の予定</Text>{line('月', '09:00 予定')}{line('火', '10:30 タスク')}{line('水', '15:00 予定')}{line('金', '18:00 予定')}</>}
      {type === 'today' && <><Text style={{ color: colors.primaryText, fontSize: 12, fontWeight: '900' }}>今日  {previewMonth + 1}月{previewDay}日（{previewWeekday}）</Text>{line('09:00', '予定')}{line('10:30', 'タスク')}{line('18:00', '予定')}</>}
      {type === 'checklist' && <><Text style={{ color: colors.primaryText, fontSize: 12, fontWeight: '900' }}>ToDoメモ</Text>{line('✓', '買い物')}{line('□', '片づけ')}{line('□', '明日の準備')}</>}
      {type === 'goal' && <><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>叶えたいこと</Text><Text style={{ color: colors.primaryText, fontSize: 17, fontWeight: '900' }}>今月の目標</Text><View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}><View style={{ width: '60%', height: '100%', borderRadius: 3, backgroundColor: colors.primaryAccent }} /></View><Text style={{ color: colors.primaryAccent, fontSize: 11, fontWeight: '800' }}>進捗 60%</Text></>}
      {type === 'voice' && <><View style={{ alignItems: 'center', gap: 4 }}><View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.softAccent, borderWidth: 1, borderColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryAccent, fontSize: 21 }}>♩</Text></View><Text style={{ color: colors.primaryText, fontSize: 14, fontWeight: '900' }}>音声入力</Text><Text style={{ color: colors.secondaryText, fontSize: 10 }}>タップして話す</Text></View></>}
      {type === 'affirmation' && <><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>今日の言葉</Text><Text style={{ color: colors.primaryText, fontSize: 15, lineHeight: 22, fontWeight: '800' }}>「私は私のペースで進めばいい」</Text></>}
    </View>
  </View>;
}

const MemoizedWidgetTypePreview = React.memo(WidgetTypePreview);

export function WidgetSettingsCard({ settings, onChange, onPickPhoto, onUnlockWidgetPhoto, widgetPhotoUnlock, onRemoveAffirmationPhoto, colors, styles, designPattern, designCheckColor, PatternDecor, planTier = 'free', designCustomizePurchased = false, entitlementsResolved = true, widgetEntitlementOverride = 'actual', onWidgetEntitlementOverrideChange, onLockedWidget, showSelectedPreview = false }: WidgetSettingsCardProps) {
  const { width: windowWidth } = useWindowDimensions();
  const galleryWidth = Math.min(windowWidth - 44, 560);
  const cardWidth = Math.max(210, Math.round(galleryWidth * 0.8));
  const effectivePlanTier: PlanTier = __DEV__ && widgetEntitlementOverride === 'premium' ? 'premium' : __DEV__ && (widgetEntitlementOverride === 'free' || widgetEntitlementOverride === 'design') ? 'free' : planTier;
  const effectiveDesignCustomizePurchased = __DEV__ && (widgetEntitlementOverride === 'design' || widgetEntitlementOverride === 'premium') ? true : __DEV__ && widgetEntitlementOverride === 'free' ? false : designCustomizePurchased;
  const [showAffirmationDetails, setShowAffirmationDetails] = React.useState(false);
  const [confirmRemoveAllPhotos, setConfirmRemoveAllPhotos] = React.useState(false);
  // The gallery preview is initialized from the saved type when this card is
  // mounted for a sheet open. Detail-modal visibility stays separate so that
  // opening the sheet does not also open an editor. After a gallery tap, the
  // working preview selection remains stable across prop updates.
  const [selectedWidgetType, setSelectedWidgetType] = React.useState<WidgetType | null>(null);
  const photoUnlockAfterDetailDismissRef = React.useRef<(() => void) | undefined>(undefined);
  const [previewWidgetType, setPreviewWidgetType] = React.useState<WidgetType>(settings.widgetType);
  const [selectedPreviewSize, setSelectedPreviewSize] = React.useState<WidgetPreviewSize>('medium');
  const update = (patch: Partial<WidgetSettings>) => onChange({ ...settings, ...patch });
  const canUseWidget = (access: 'free' | 'design' | 'premium') => access === 'free' || effectivePlanTier === 'premium' || (access === 'design' && effectiveDesignCustomizePurchased);
  const accessLabel = (access: 'free' | 'design' | 'premium') => access === 'free' ? '無料' : access === 'design' ? 'デザインカスタマイズ' : 'プレミアム';
  const selectedWidget = selectedWidgetType ? WIDGET_TYPE_OPTIONS.find((item) => item.id === selectedWidgetType) : undefined;
  const selectedAvailable = selectedWidget ? canUseWidget(selectedWidget.access) : false;
  const selectedCustomization = selectedWidgetType ? getWidgetCustomization(settings, selectedWidgetType) : undefined;
  const widgetPhotoUnlockActive = effectivePlanTier === 'free' && Boolean(widgetPhotoUnlock?.widgetType && widgetPhotoUnlock.expiresAt && new Date(widgetPhotoUnlock.expiresAt).getTime() > Date.now());
  const selectedPhotoUnlockActive = Boolean(selectedWidgetType && widgetPhotoUnlockActive && widgetPhotoUnlock?.widgetType === selectedWidgetType);
  const selectedPhotoUri = selectedCustomization?.photoUri;
  const selectedPreviewStyle: WidgetSettings['style'] = settings.style;
  const selectedPhotoCustomizationAllowed = effectivePlanTier === 'premium' || effectiveDesignCustomizePurchased || selectedPhotoUnlockActive;
  const remainingPhotoUnlockDays = widgetPhotoUnlock?.expiresAt ? Math.max(1, Math.ceil((new Date(widgetPhotoUnlock.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0;
  const selectedPreviewSizes = selectedWidget ? selectedWidget.sizes.split('/').map((value) => value.trim().toUpperCase()).filter((value): value is 'S' | 'M' | 'L' => value === 'S' || value === 'M' || value === 'L').map((value) => value === 'S' ? 'small' as const : value === 'M' ? 'medium' as const : 'large' as const) : [];
  // Keep all Widget kinds visible in the in-app catalogue. Entitlements
  // control the lock state and purchase route, not catalogue visibility.
  const visibleWidgetOptions = React.useMemo(() => WIDGET_TYPE_OPTIONS, []);
  const hasStoredWidgetPhotos = Boolean(settings.photoUri || WIDGET_TYPE_OPTIONS.some(({ id }) => {
    const customization = settings.widgetCustomizations?.[id];
    return customization?.photoUri || customization?.cutoutUri;
  }));
  const currentWidgetOption = React.useMemo(() => visibleWidgetOptions.find((item) => item.id === previewWidgetType), [previewWidgetType, visibleWidgetOptions]);
  const currentWidgetCustomization = React.useMemo(() => getWidgetCustomization(settings, previewWidgetType), [settings, previewWidgetType]);
  const currentPreviewPhotoUri = currentWidgetCustomization.photoUri;
  const currentPreviewStyle: WidgetSettings['style'] = settings.style;
  const currentPreviewSize: WidgetPreviewSize = currentWidgetOption?.sizes.includes('L') && !currentWidgetOption.sizes.includes('M') ? 'large' : 'medium';
  React.useEffect(() => {
    if (selectedPreviewSizes.length > 0 && !selectedPreviewSizes.includes(selectedPreviewSize)) setSelectedPreviewSize(selectedPreviewSizes[0] ?? 'medium');
  }, [selectedWidgetType, selectedPreviewSizes.join('|'), selectedPreviewSize]);
  const updateSelectedCustomization = (patch: Partial<WidgetCustomization>) => {
    if (!selectedWidgetType) return;
    const current = settings.widgetCustomizations?.[selectedWidgetType] ?? {};
    onChange({ ...settings, widgetCustomizations: { ...(settings.widgetCustomizations ?? {}), [selectedWidgetType]: { ...current, ...patch } } });
  };
  const removeSelectedPhoto = () => {
    if (!selectedWidgetType) return;
    const current = settings.widgetCustomizations?.[selectedWidgetType];
    const next = { ...(settings.widgetCustomizations ?? {}) };
    const retainedUris = [
      settings.photoUri === current?.photoUri ? undefined : settings.photoUri,
      ...Object.entries(settings.widgetCustomizations ?? {})
        .filter(([id]) => id !== selectedWidgetType)
        .map(([, customization]) => customization?.photoUri),
      ...(settings.affirmationPhotoUris ?? []),
    ];
    if (current) {
      if (current.photoUri) deleteManagedPhotoUri(current.photoUri, retainedUris);
      if (current.cutoutUri) deleteManagedPhotoUri(current.cutoutUri, retainedUris);
      const { photoUri: _photoUri, cutoutUri: _cutoutUri, ...remaining } = current;
      if (Object.keys(remaining).length > 0) next[selectedWidgetType] = remaining;
      else delete next[selectedWidgetType];
    }
    const legacyPhotoUri = settings.photoUri;
    if (legacyPhotoUri && legacyPhotoUri === current?.photoUri) deleteManagedPhotoUri(legacyPhotoUri, retainedUris);
    onChange({ ...settings, photoUri: legacyPhotoUri === current?.photoUri ? undefined : settings.photoUri, widgetCustomizations: next });
  };
  const removeAllWidgetPhotos = () => {
    const next = { ...(settings.widgetCustomizations ?? {}) };
    const removedUris = new Set<string>();
    if (settings.photoUri) removedUris.add(settings.photoUri);
    WIDGET_TYPE_OPTIONS.forEach(({ id }) => {
      const current = next[id];
      if (!current) return;
      if (current.photoUri) removedUris.add(current.photoUri);
      if (current.cutoutUri) removedUris.add(current.cutoutUri);
      const { photoUri: _photoUri, cutoutUri: _cutoutUri, ...remaining } = current;
      if (Object.keys(remaining).length > 0) next[id] = remaining;
      else delete next[id];
    });
    onChange({ ...settings, photoUri: undefined, widgetCustomizations: next });
    removedUris.forEach((uri) => deleteManagedPhotoUri(uri, settings.affirmationPhotoUris ?? []));
    setConfirmRemoveAllPhotos(false);
  };
  const requestSelectedWidgetPhotoUnlock = () => {
    const widgetType = selectedWidgetType;
    if (!widgetType || !onUnlockWidgetPhoto) return;
    // Wait for the detail Modal's native dismissal before asking the parent
    // Widget Sheet to close and present the rewarded flow.
    photoUnlockAfterDetailDismissRef.current = () => onUnlockWidgetPhoto(widgetType, __DEV__ ? widgetEntitlementOverride : undefined);
    setSelectedWidgetType(null);
    if (Platform.OS !== 'ios') InteractionManager.runAfterInteractions(() => {
      const pending = photoUnlockAfterDetailDismissRef.current;
      photoUnlockAfterDetailDismissRef.current = undefined;
      pending?.();
    });
  };
  return (
    <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.settingsTitle, { color: colors.primaryText }]}>ウィジェットギャラリー</Text>
      {!entitlementsResolved ? <Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 14 }}>利用状況を確認中…</Text> : <View style={{ marginTop: 14 }}>
        {__DEV__ && <View style={{ marginBottom: 12, padding: 10, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground }}><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '800' }}>開発用・ウィジェット権限確認</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>{([{ id: 'actual', label: '実際の購入状態' }, { id: 'free', label: '無料として確認' }, { id: 'design', label: 'デザインカスタマイズとして確認' }, { id: 'premium', label: 'プレミアムとして確認' }] as const).map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => onWidgetEntitlementOverrideChange?.(item.id)} style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: widgetEntitlementOverride === item.id ? colors.primaryAccent : colors.border, backgroundColor: widgetEntitlementOverride === item.id ? colors.softAccent : colors.surface }}><Text style={{ color: widgetEntitlementOverride === item.id ? colors.primaryAccent : colors.secondaryText, fontSize: 10, fontWeight: '800' }}>{item.label}</Text></Pressable>)}</View></View>}
        {showSelectedPreview && currentWidgetOption ? <View style={{ marginBottom: 14, padding: 10, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground }}><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '800' }}>選択中のプレビュー</Text><View style={{ marginTop: 8 }}><MemoizedWidgetTypePreview type={currentWidgetOption.id} style={currentPreviewStyle} fontDesign={settings.fontDesign} photoUri={currentPreviewPhotoUri} photoLayout={currentWidgetCustomization.photoLayout} colors={colors} designPattern={designPattern} designCheckColor={designCheckColor} PatternDecor={PatternDecor} previewSize={currentPreviewSize} /></View></View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}><Text style={{ color: colors.primaryText, fontSize: 14, fontWeight: '900' }}>ウィジェットギャラリー</Text><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '600' }}>全10種類</Text></View>
        <ScrollView horizontal nestedScrollEnabled directionalLockEnabled decelerationRate="fast" snapToInterval={cardWidth + 10} snapToAlignment="start" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingLeft: 2, paddingRight: 12 }} style={{ marginTop: 9 }}>
          {visibleWidgetOptions.map((option) => {
            const available = canUseWidget(option.access);
            const customization = getWidgetCustomization(settings, option.id);
            return <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={`${option.label}。${option.description}。対応サイズ ${option.sizes}。${accessLabel(option.access)}${available ? '' : '。ロック中'}`} onPress={() => { if (!available) { onLockedWidget?.(option.access === 'premium' ? 'premium' : 'design'); return; } setPreviewWidgetType(option.id); setSelectedWidgetType(option.id); }} style={{ width: cardWidth, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 15, padding: 10 }}>
              <MemoizedWidgetTypePreview type={option.id} style={settings.style} fontDesign={settings.fontDesign} photoUri={customization.photoUri} photoLayout={customization.photoLayout} colors={colors} designPattern={designPattern} designCheckColor={designCheckColor} PatternDecor={PatternDecor} previewSize="small" renderMode="thumbnail" />
              <View style={{ paddingHorizontal: 2, paddingTop: 10 }}>
                <Text style={{ color: colors.primaryText, fontSize: 15, lineHeight: 20, fontWeight: '900' }}>{option.label}</Text>
                <Text numberOfLines={2} style={{ color: colors.secondaryText, fontSize: 11, lineHeight: 16, marginTop: 3 }}>{option.description}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}><Text style={{ color: colors.primaryAccent, fontSize: 10, fontWeight: '800' }}>{option.sizes}</Text><View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: available ? colors.softAccent : colors.screenBackground, borderWidth: 1, borderColor: available ? colors.primaryAccent : colors.border }}><Text style={{ color: available ? colors.primaryAccent : colors.secondaryText, fontSize: 9, fontWeight: '800' }}>{available ? accessLabel(option.access) : `🔒 ${accessLabel(option.access)}`}</Text></View></View>
              </View>
            </Pressable>;
          })}
        </ScrollView>
        {hasStoredWidgetPhotos && <View style={{ marginTop: 14, padding: 10, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground }}>
          <Text style={{ color: colors.secondaryText, fontSize: 11, lineHeight: 16 }}>ウィジェット別の写真を、ロック中の種類も含めて削除できます。アファメーション用の写真は対象外です。</Text>
          {confirmRemoveAllPhotos && <Text style={{ color: colors.primaryText, fontSize: 11, lineHeight: 16, marginTop: 7 }}>全ウィジェットの写真を削除します。写真レイアウトとアファメーション用の写真は残ります。</Text>}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {confirmRemoveAllPhotos && <Pressable accessibilityRole="button" onPress={() => setConfirmRemoveAllPhotos(false)} style={{ flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 9 }}><Text style={{ color: colors.secondaryText, fontSize: 11, fontWeight: '800' }}>やめる</Text></Pressable>}
            <Pressable accessibilityRole="button" onPress={confirmRemoveAllPhotos ? removeAllWidgetPhotos : () => setConfirmRemoveAllPhotos(true)} style={{ flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 9 }}><Text style={{ color: colors.primaryText, fontSize: 11, fontWeight: '800' }}>{confirmRemoveAllPhotos ? 'すべて削除する' : 'ウィジェット別写真を削除'}</Text></Pressable>
          </View>
        </View>}
      </View>}

      <Modal visible={Boolean(selectedWidget)} transparent animationType="slide" onRequestClose={() => setSelectedWidgetType(null)} onDismiss={() => { const pending = photoUnlockAfterDetailDismissRef.current; photoUnlockAfterDetailDismissRef.current = undefined; pending?.(); }}>
        <Pressable onPress={() => setSelectedWidgetType(null)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 24, 34, 0.3)', paddingHorizontal: 12, paddingBottom: 12 }}>
          <Pressable onPress={(event) => event.stopPropagation()} style={{ height: '88%', maxHeight: '88%', flexShrink: 1, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18 }}>
            {selectedWidget && selectedWidgetType && selectedCustomization && <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: colors.primaryText, fontSize: 18, fontWeight: '900' }}>{selectedWidget.label}</Text><Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 3 }}>このウィジェットだけの写真とレイアウト</Text></View><Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={() => setSelectedWidgetType(null)} hitSlop={10}><Text style={{ color: colors.secondaryText, fontSize: 22 }}>×</Text></Pressable></View>
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
              {!selectedAvailable ? <View style={{ marginTop: 16, padding: 14, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground }}><Text style={{ color: colors.primaryText, fontSize: 13, fontWeight: '800' }}>このウィジェットは現在ロックされています</Text><Text style={{ color: colors.secondaryText, fontSize: 11, lineHeight: 17, marginTop: 5 }}>{selectedWidget.access === 'premium' ? 'プレミアムで利用できます。' : 'デザインカスタマイズで利用できます。'}</Text></View> : <>
              {selectedPreviewSizes.length > 1 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 }}><Text style={{ color: colors.secondaryText, fontSize: 11, fontWeight: '800' }}>見た目を確認</Text>{selectedPreviewSizes.map((size) => <Pressable key={size} onPress={() => setSelectedPreviewSize(size)} style={{ minWidth: 34, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: selectedPreviewSize === size ? colors.primaryAccent : colors.border, backgroundColor: selectedPreviewSize === size ? colors.softAccent : colors.surface, alignItems: 'center' }}><Text style={{ color: selectedPreviewSize === size ? colors.primaryAccent : colors.secondaryText, fontSize: 10, fontWeight: '800' }}>{size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}</Text></Pressable>)}</View>}
              <MemoizedWidgetTypePreview type={selectedWidget.id} style={selectedPreviewStyle} fontDesign={settings.fontDesign} photoUri={selectedPhotoUri} photoLayout={selectedCustomization.photoLayout} colors={colors} designPattern={designPattern} designCheckColor={designCheckColor} PatternDecor={PatternDecor} previewSize={selectedWidget.id === 'monthly' ? 'large' : selectedPreviewSize} />
              <Text style={{ color: colors.secondaryText, fontSize: 12, fontWeight: '800', marginTop: 14 }}>文字の種類</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
                {WIDGET_FONT_DESIGN_OPTIONS.map((option) => {
                  const selected = (settings.fontDesign ?? 'default') === option.id;
                  const available = effectivePlanTier !== 'free' || effectiveDesignCustomizePurchased;
                  return <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected, disabled: !available }} onPress={() => { if (!available) { onLockedWidget?.('design'); return; } update({ fontDesign: option.id }); }} style={{ minWidth: 64, paddingHorizontal: 9, minHeight: 36, borderRadius: 10, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primaryAccent : colors.border, backgroundColor: selected ? colors.softAccent : colors.surface, alignItems: 'center', justifyContent: 'center', opacity: available ? 1 : 0.55 }}><Text style={{ color: selected ? colors.primaryAccent : colors.secondaryText, fontSize: 11, fontWeight: '800', fontFamily: reactNativeFontFamily(option.id) }}>{option.label}</Text></Pressable>;
                })}
              </View>
              <Text style={{ color: colors.secondaryText, fontSize: 12, fontWeight: '800', marginTop: 14 }}>写真</Text>
              {effectivePlanTier === 'free' && !effectiveDesignCustomizePurchased && !selectedPhotoUnlockActive && <View style={{ marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: colors.screenBackground, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.secondaryText, fontSize: 10, lineHeight: 15 }}>{widgetPhotoUnlockActive ? '別のウィジェットで広告による写真利用中です。' : '広告を1回見ると、このウィジェットで写真を7日間使えます。'}</Text>{!widgetPhotoUnlockActive && onUnlockWidgetPhoto ? <Pressable accessibilityRole="button" onPress={requestSelectedWidgetPhotoUnlock} style={{ marginTop: 8, minHeight: 36, paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.softAccent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryAccent, fontSize: 11, fontWeight: '800' }}>広告を見て7日間使う</Text></Pressable> : null}</View>}
              {selectedPhotoUnlockActive && <Text style={{ color: colors.primaryAccent, fontSize: 10, fontWeight: '800', marginTop: 7 }}>広告で写真利用中・あと{remainingPhotoUnlockDays}日</Text>}
              {selectedPhotoUri ? <Image source={{ uri: selectedPhotoUri }} resizeMode="cover" style={{ width: '100%', height: 118, borderRadius: 12, marginTop: 8 }} /> : <Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 8 }}>このウィジェットには写真が設定されていません。</Text>}
              {selectedPhotoCustomizationAllowed && <>
                 <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}><Pressable onPress={() => onPickPhoto?.(selectedWidgetType, __DEV__ ? widgetEntitlementOverride : undefined)} style={{ flex: 1, minHeight: 42, borderRadius: 11, backgroundColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{selectedPhotoUri ? '写真を変更' : '写真を選ぶ'}</Text></Pressable>{selectedPhotoUri && <Pressable onPress={removeSelectedPhoto} style={{ minWidth: 72, minHeight: 42, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.secondaryText, fontSize: 11, fontWeight: '800' }}>削除</Text></Pressable>}</View>
                <Text style={{ color: colors.secondaryText, fontSize: 12, fontWeight: '800', marginTop: 14 }}>写真レイアウト</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}><View style={{ flexDirection: 'row', gap: 8 }}>{WIDGET_PHOTO_LAYOUT_OPTIONS.map((layout) => { const selected = (selectedCustomization.photoLayout ?? 'background') === layout.id; return <Pressable key={layout.id} onPress={() => updateSelectedCustomization({ photoLayout: layout.id })} style={{ width: 72, minHeight: 54, borderRadius: 10, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primaryAccent : colors.border, backgroundColor: selected ? colors.softAccent : colors.screenBackground, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: selected ? colors.primaryAccent : colors.secondaryText, fontSize: 11, fontWeight: '800' }}>{layout.label}</Text></Pressable>; })}</View></ScrollView>
              </>}
              <Text style={{ color: colors.secondaryText, fontSize: 10, lineHeight: 15, marginTop: 4 }}>写真とレイアウトはこのウィジェット専用に保存されます。</Text>
              </>}
              </ScrollView>
            </>}
          </Pressable>
        </Pressable>
      </Modal>

      {effectivePlanTier === 'premium' && entitlementsResolved && <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAffirmationDetails }} onPress={() => setShowAffirmationDetails((value) => !value)} style={{ marginTop: 14, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}><Text style={{ color: colors.primaryText, fontSize: 13, fontWeight: '800' }}>アファメーション設定</Text><Text style={{ color: colors.secondaryText, fontSize: 11, lineHeight: 16, marginTop: 3 }}>表示方法と背景を設定</Text></View><Text style={{ color: colors.primaryAccent, fontSize: 18, fontWeight: '700' }}>{showAffirmationDetails ? '⌃' : '⌄'}</Text>
      </Pressable>}
      {effectivePlanTier === 'premium' && entitlementsResolved && showAffirmationDetails && <View style={{ marginTop: 8, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground }}>
          <Text style={{ color: colors.primaryText, fontSize: 13, fontWeight: '800' }}>アファメーション表示</Text>
          <Text style={{ color: colors.secondaryText, fontSize: 11, lineHeight: 16, marginTop: 4 }}>既存のアファメーション文をウィジェットへ表示します。</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 9 }}>
            {(['fixed', 'automatic'] as const).map((mode) => {
              const selected = (settings.affirmationRotationMode ?? 'fixed') === mode;
              return <Pressable key={mode} onPress={() => update({ affirmationRotationMode: mode })} style={{ flex: 1, minHeight: 40, borderRadius: 10, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primaryAccent : colors.border, backgroundColor: selected ? colors.softAccent : colors.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: selected ? colors.primaryAccent : colors.secondaryText, fontSize: 12, fontWeight: '800' }}>{mode === 'fixed' ? '固定' : '自動切替'}</Text></Pressable>;
            })}
          </View>
          {(settings.affirmationRotationMode ?? 'fixed') === 'automatic' && <Text style={{ color: colors.secondaryText, fontSize: 10, lineHeight: 15, marginTop: 8 }}>朝・昼・夕方・夜に、既存のデザインと文言を順番に表示します。</Text>}
          <Text style={[styles.fieldLabel, { color: colors.secondaryText, marginTop: 12 }]}>自動切替で使う背景</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 7 }}>
            {(['floral', 'dot', 'check', 'photo'] as const).map((background) => {
              const selected = (settings.affirmationBackgrounds ?? ['floral', 'dot', 'check', 'photo']).includes(background);
              return <Pressable key={background} onPress={() => {
                const current = settings.affirmationBackgrounds ?? ['floral', 'dot', 'check', 'photo'];
                const next = selected ? current.filter((item) => item !== background) : [...current, background];
                update({ affirmationBackgrounds: next.length ? next : ['floral'] });
              }} style={{ paddingHorizontal: 10, minHeight: 32, borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.primaryAccent : colors.border, backgroundColor: selected ? colors.softAccent : colors.surface, justifyContent: 'center' }}><Text style={{ color: selected ? colors.primaryAccent : colors.secondaryText, fontSize: 11, fontWeight: '800' }}>{background === 'floral' ? '花柄' : background === 'dot' ? 'ドット' : background === 'check' ? 'チェック' : '写真'}</Text></Pressable>;
            })}
          </View>
          <Text style={{ color: colors.secondaryText, fontSize: 10, lineHeight: 15, marginTop: 8 }}>写真は「写真ウィジェット」の写真を共有します（最大3枚）。</Text>
          {onPickPhoto && <Pressable onPress={() => onPickPhoto()} style={{ marginTop: 8, minHeight: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryAccent, fontSize: 11, fontWeight: '800' }}>{(settings.affirmationPhotoUris?.length ?? 0) > 0 ? '写真を追加・変更' : '写真を追加'}</Text></Pressable>}
          {!!settings.affirmationPhotoUris?.length && onRemoveAffirmationPhoto && <View style={{ marginTop: 8, gap: 6 }}><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>選択済みの写真（タップで個別に削除）</Text>{settings.affirmationPhotoUris.map((uri, index) => <View key={`${uri}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Image source={{ uri }} style={{ width: 42, height: 32, borderRadius: 6 }} /><Text style={{ flex: 1, color: colors.secondaryText, fontSize: 10 }} numberOfLines={1}>写真{index + 1}</Text><Pressable onPress={() => onRemoveAffirmationPhoto(index)} hitSlop={8}><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>削除</Text></Pressable></View>)}</View>}
        </View>}

      <Text style={{ color: colors.secondaryText, fontSize: 10, lineHeight: 15, marginTop: 10 }}>表示項目や見た目の変更は、各ウィジェットを長押しして「ウィジェットを編集」から行えます。保存済みの設定値は以前のウィジェットや見た目確認との互換性のため保持しています。</Text>
    </View>
  );
}
