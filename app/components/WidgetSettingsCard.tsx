import React from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import {
  WidgetDisplayOption,
  WidgetCustomization,
  WidgetSettings,
  WidgetType,
} from '../types';
import { ChicCheckColor, ChicPattern } from '../theme';
import { PlanTier } from '../premiumAccess';
import {
  getWidgetCustomization,
  WIDGET_TYPE_OPTIONS,
  WIDGET_MONO_TEMPLATE_OPTIONS,
  WIDGET_PHOTO_LAYOUT_OPTIONS,
} from '../features/widget/widgetSettings';

type WidgetSettingsCardProps = {
  settings: WidgetSettings;
  onChange: (settings: WidgetSettings) => void;
  onPickPhoto?: (widgetType?: WidgetType) => void;
  onRemoveAffirmationPhoto?: (index?: number) => void;
  colors: { surface: string; border: string; primaryText: string; secondaryText: string; primaryAccent: string; softAccent: string; screenBackground: string };
  styles: any;
  designPattern?: ChicPattern;
  designCheckColor?: ChicCheckColor;
  PatternDecor?: React.ComponentType<any>;
  planTier?: PlanTier;
  designCustomizePurchased?: boolean;
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

const WIDGET_GALLERY_SECTIONS: ReadonlyArray<{ id: 'free' | 'design' | 'premium'; title: string; ids: ReadonlyArray<WidgetSettings['widgetType']> }> = [
  { id: 'free', title: 'Freeで使える', ids: ['current', 'next', 'voice'] },
  { id: 'design', title: 'Design Customizeで広がる', ids: ['combined', 'monthly', 'weekly', 'today', 'checklist'] },
  { id: 'premium', title: 'Premiumでもっと深く', ids: ['current', 'next', 'voice', 'combined', 'monthly', 'weekly', 'today', 'checklist', 'goal', 'affirmation'] },
];

function WidgetTypePreview({ type, style, photoUri, photoLayout = 'background', colors, designPattern, designCheckColor, PatternDecor }: { type: WidgetSettings['widgetType']; style: WidgetSettings['style']; photoUri?: string; photoLayout?: WidgetSettings['photoLayout']; colors: WidgetSettingsCardProps['colors']; designPattern?: ChicPattern; designCheckColor?: ChicCheckColor; PatternDecor?: React.ComponentType<any> }) {
  const line = (label: string, value: string) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><Text style={{ color: colors.secondaryText, fontSize: 10 }}>{label}</Text><Text style={{ color: colors.primaryText, fontSize: 11, fontWeight: '800', flexShrink: 1 }}>{value}</Text></View>;
  const calendarDays = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
  const previewHeight = type === 'combined' || type === 'monthly' || type === 'weekly' || type === 'today' || type === 'goal' ? 164 : 136;
  return <View style={{ height: previewHeight, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground, overflow: 'hidden' }}>
    {style === 'photo' && photoUri && photoLayout === 'background' && <Image source={{ uri: photoUri }} resizeMode="cover" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.72 }} />}
    {style === 'photo' && photoUri && photoLayout === 'right' && <Image source={{ uri: photoUri }} resizeMode="cover" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '38%', opacity: 0.9 }} />}
    {style === 'photo' && photoUri && photoLayout === 'top' && <Image source={{ uri: photoUri }} resizeMode="cover" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 58, opacity: 0.9 }} />}
    {style === 'photo' && photoUri && photoLayout === 'card' && <Image source={{ uri: photoUri }} resizeMode="cover" style={{ position: 'absolute', right: 12, top: 14, width: 68, height: 88, borderRadius: 5, borderWidth: 3, borderColor: '#FFFFFF', transform: [{ rotate: '3deg' }], opacity: 0.95 }} />}
    {style === 'photo' && photoUri && photoLayout === 'circle' && <Image source={{ uri: photoUri }} resizeMode="cover" style={{ position: 'absolute', right: 12, top: 18, width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: '#FFFFFF', opacity: 0.95 }} />}
    {style === 'photo' && photoUri && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: photoLayout === 'background' ? 'rgba(255,255,255,0.3)' : 'transparent' }} />}
    {style !== 'photo' && PatternDecor && designPattern && designPattern !== 'plain' && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.32 }}><PatternDecor pattern={designPattern} accent={colors.primaryAccent} warm={colors.softAccent} checkColor={designCheckColor} preview /></View>}
    <View style={{ gap: 7 }}>
      {type === 'current' && <><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>今はこれ</Text><Text style={{ color: colors.primaryText, fontSize: 16, fontWeight: '900' }}>資料をまとめる</Text><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: colors.secondaryText, fontSize: 10 }}>集中モード中</Text><Text style={{ color: colors.primaryAccent, fontSize: 13, fontWeight: '900' }}>25 min</Text></View></>}
      {type === 'next' && <><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>次の予定</Text><Text style={{ color: colors.primaryText, fontSize: 18, fontWeight: '900' }}>18:00　美容院</Text><Text style={{ color: colors.primaryAccent, fontSize: 11, fontWeight: '800' }}>出発まで 1時間42分</Text></>}
      {type === 'combined' && <><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>今はこれ</Text><Text style={{ color: colors.primaryText, fontSize: 14, fontWeight: '900' }}>資料をまとめる</Text><View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginVertical: 1 }} /><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>次の予定　18:00 美容院</Text><Text style={{ color: colors.primaryAccent, fontSize: 10, fontWeight: '800' }}>出発まで 1時間42分</Text></>}
      {type === 'monthly' && <><Text style={{ color: colors.primaryText, fontSize: 12, fontWeight: '900' }}>2026年6月</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>{calendarDays.map((day, index) => <View key={day} style={{ width: '11%', alignItems: 'center', paddingVertical: 2, borderRadius: 8, backgroundColor: index === 15 ? colors.softAccent : 'transparent' }}><Text style={{ color: index === 15 ? colors.primaryAccent : colors.secondaryText, fontSize: 9, fontWeight: index === 15 ? '900' : '600' }}>{day}</Text>{[2, 8, 15, 19].includes(index) && <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.primaryAccent, marginTop: 1 }} />}</View>)}</View></>}
      {type === 'weekly' && <><Text style={{ color: colors.primaryText, fontSize: 12, fontWeight: '900' }}>今週の予定</Text>{line('月', '09:00 会議')}{line('火', '10:30 資料提出')}{line('水', '15:00 打ち合わせ')}{line('金', '18:00 美容院')}</>}
      {type === 'today' && <><Text style={{ color: colors.primaryText, fontSize: 12, fontWeight: '900' }}>今日  6月24日（火）</Text>{line('09:00', '会議')}{line('10:30', '資料提出')}{line('18:00', '美容院')}</>}
      {type === 'checklist' && <><Text style={{ color: colors.primaryText, fontSize: 12, fontWeight: '900' }}>ToDoメモ</Text>{line('✓', '財布')}{line('□', '鍵')}{line('□', '充電器')}</>}
      {type === 'goal' && <><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>叶えたいこと</Text><Text style={{ color: colors.primaryText, fontSize: 17, fontWeight: '900' }}>アプリ完成</Text><View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}><View style={{ width: '60%', height: '100%', borderRadius: 3, backgroundColor: colors.primaryAccent }} /></View><Text style={{ color: colors.primaryAccent, fontSize: 11, fontWeight: '800' }}>進捗 60%</Text></>}
      {type === 'voice' && <><View style={{ alignItems: 'center', gap: 4 }}><View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.softAccent, borderWidth: 1, borderColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryAccent, fontSize: 21 }}>♩</Text></View><Text style={{ color: colors.primaryText, fontSize: 14, fontWeight: '900' }}>音声入力</Text><Text style={{ color: colors.secondaryText, fontSize: 10 }}>タップして話す</Text></View></>}
      {type === 'affirmation' && <><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>今日の言葉</Text><Text style={{ color: colors.primaryText, fontSize: 15, lineHeight: 22, fontWeight: '800' }}>「私は私のペースで進めばいい」</Text></>}
    </View>
  </View>;
}

export function WidgetSettingsCard({ settings, onChange, onPickPhoto, onRemoveAffirmationPhoto, colors, styles, designPattern, designCheckColor, PatternDecor, planTier = 'free', designCustomizePurchased = false }: WidgetSettingsCardProps) {
  const { width: windowWidth } = useWindowDimensions();
  const galleryWidth = Math.min(windowWidth - 44, 560);
  const cardWidth = Math.max(210, Math.round(galleryWidth * 0.8));
  const [showAffirmationDetails, setShowAffirmationDetails] = React.useState(false);
  const [selectedWidgetType, setSelectedWidgetType] = React.useState<WidgetType | null>(null);
  const update = (patch: Partial<WidgetSettings>) => onChange({ ...settings, ...patch });
  const canUseWidget = (access: 'free' | 'design' | 'premium') => access === 'free' || planTier === 'premium' || (access === 'design' && designCustomizePurchased);
  const accessLabel = (access: 'free' | 'design' | 'premium') => access === 'free' ? 'Free' : access === 'design' ? 'Design' : 'Premium';
  const selectedWidget = selectedWidgetType ? WIDGET_TYPE_OPTIONS.find((item) => item.id === selectedWidgetType) : undefined;
  const selectedCustomization = selectedWidgetType ? getWidgetCustomization(settings, selectedWidgetType) : undefined;
  const selectedOwnCustomization = selectedWidgetType ? settings.widgetCustomizations?.[selectedWidgetType] : undefined;
  const updateSelectedCustomization = (patch: Partial<WidgetCustomization>) => {
    if (!selectedWidgetType) return;
    const current = settings.widgetCustomizations?.[selectedWidgetType] ?? {};
    onChange({ ...settings, widgetCustomizations: { ...(settings.widgetCustomizations ?? {}), [selectedWidgetType]: { ...current, ...patch } } });
  };
  const removeSelectedPhoto = () => {
    if (!selectedWidgetType) return;
    const current = settings.widgetCustomizations?.[selectedWidgetType];
    const next = { ...(settings.widgetCustomizations ?? {}) };
    if (current) {
      const { photoUri: _photoUri, ...remaining } = current;
      if (Object.keys(remaining).length > 0) next[selectedWidgetType] = remaining;
      else delete next[selectedWidgetType];
    }
    onChange({ ...settings, widgetCustomizations: next });
  };
  return (
    <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.settingsTitle, { color: colors.primaryText }]}>Widgetギャラリー</Text>
      {WIDGET_GALLERY_SECTIONS.map((section) => <View key={section.id} style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}><Text style={{ color: colors.primaryText, fontSize: 14, fontWeight: '900' }}>{section.title}</Text>{section.id === 'premium' && <Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '600' }}>Premiumなら10種類すべて利用できます</Text>}</View>
        <ScrollView horizontal nestedScrollEnabled directionalLockEnabled decelerationRate="fast" snapToInterval={cardWidth + 10} snapToAlignment="start" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingLeft: 2, paddingRight: 12 }} style={{ marginTop: 9 }}>
          {section.ids.map((id) => {
            const option = WIDGET_TYPE_OPTIONS.find((item) => item.id === id);
            if (!option) return null;
            const available = canUseWidget(option.access);
            const customization = getWidgetCustomization(settings, option.id);
            return <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={`${option.label}。${option.description}。対応サイズ ${option.sizes}。${accessLabel(option.access)}${available ? '' : '。ロック中'}。タップして写真設定`} onPress={() => setSelectedWidgetType(option.id)} style={{ width: cardWidth, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 15, padding: 10 }}>
              <WidgetTypePreview type={option.id} style={settings.style} photoUri={customization.photoUri} photoLayout={customization.photoLayout} colors={colors} designPattern={designPattern} designCheckColor={designCheckColor} PatternDecor={PatternDecor} />
              <View style={{ paddingHorizontal: 2, paddingTop: 10 }}>
                <Text style={{ color: colors.primaryText, fontSize: 15, lineHeight: 20, fontWeight: '900' }}>{option.label}</Text>
                <Text numberOfLines={2} style={{ color: colors.secondaryText, fontSize: 11, lineHeight: 16, marginTop: 3 }}>{option.description}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}><Text style={{ color: colors.primaryAccent, fontSize: 10, fontWeight: '800' }}>{option.sizes}</Text><View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: available ? colors.softAccent : colors.screenBackground, borderWidth: 1, borderColor: available ? colors.primaryAccent : colors.border }}><Text style={{ color: available ? colors.primaryAccent : colors.secondaryText, fontSize: 9, fontWeight: '800' }}>{available ? accessLabel(option.access) : `🔒 ${accessLabel(option.access)}`}</Text></View></View>
              </View>
            </Pressable>;
          })}
        </ScrollView>
      </View>)}

      <Modal visible={Boolean(selectedWidget)} transparent animationType="slide" onRequestClose={() => setSelectedWidgetType(null)}>
        <Pressable onPress={() => setSelectedWidgetType(null)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 24, 34, 0.3)', paddingHorizontal: 12, paddingBottom: 12 }}>
          <Pressable onPress={(event) => event.stopPropagation()} style={{ maxHeight: '88%', borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18 }}>
            {selectedWidget && selectedWidgetType && selectedCustomization && <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: colors.primaryText, fontSize: 18, fontWeight: '900' }}>{selectedWidget.label}</Text><Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 3 }}>このWidgetだけの写真とレイアウト</Text></View><Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={() => setSelectedWidgetType(null)} hitSlop={10}><Text style={{ color: colors.secondaryText, fontSize: 22 }}>×</Text></Pressable></View>
              <WidgetTypePreview type={selectedWidget.id} style="photo" photoUri={selectedCustomization.photoUri} photoLayout={selectedCustomization.photoLayout} colors={colors} designPattern={designPattern} designCheckColor={designCheckColor} PatternDecor={PatternDecor} />
              <Text style={{ color: colors.secondaryText, fontSize: 12, fontWeight: '800', marginTop: 14 }}>写真</Text>
              {selectedCustomization.photoUri ? <Image source={{ uri: selectedCustomization.photoUri }} resizeMode="cover" style={{ width: '100%', height: 118, borderRadius: 12, marginTop: 8 }} /> : <Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 8 }}>このWidgetには写真が設定されていません。</Text>}
              {selectedCustomization.photoUri && !selectedOwnCustomization?.photoUri && <Text style={{ color: colors.secondaryText, fontSize: 10, marginTop: 6 }}>共通のWidget写真を使用中です。写真を選ぶとこのWidget専用に設定できます。</Text>}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}><Pressable onPress={() => onPickPhoto?.(selectedWidgetType)} style={{ flex: 1, minHeight: 42, borderRadius: 11, backgroundColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{selectedCustomization.photoUri ? '写真を変更' : '写真を選ぶ'}</Text></Pressable>{selectedOwnCustomization?.photoUri && <Pressable onPress={removeSelectedPhoto} style={{ minWidth: 72, minHeight: 42, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.secondaryText, fontSize: 11, fontWeight: '800' }}>削除</Text></Pressable>}</View>
              <Text style={{ color: colors.secondaryText, fontSize: 12, fontWeight: '800', marginTop: 14 }}>写真レイアウト</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}><View style={{ flexDirection: 'row', gap: 8 }}>{WIDGET_PHOTO_LAYOUT_OPTIONS.map((layout) => { const selected = (selectedCustomization.photoLayout ?? 'background') === layout.id; return <Pressable key={layout.id} onPress={() => updateSelectedCustomization({ photoLayout: layout.id })} style={{ width: 72, minHeight: 54, borderRadius: 10, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primaryAccent : colors.border, backgroundColor: selected ? colors.softAccent : colors.screenBackground, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: selected ? colors.primaryAccent : colors.secondaryText, fontSize: 11, fontWeight: '800' }}>{layout.label}</Text><Text style={{ color: colors.secondaryText, fontSize: 9, marginTop: 3 }}>{layout.id}</Text></Pressable>; })}</View></ScrollView>
              <Text style={{ color: colors.secondaryText, fontSize: 10, lineHeight: 15, marginTop: 4 }}>この設定はアプリ内Previewに保存されます。Native Widgetへの反映は次の対応で行います。</Text>
            </>}
          </Pressable>
        </Pressable>
      </Modal>

      <View style={{ marginTop: 12, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground }}>
        <Text style={{ color: colors.primaryText, fontSize: 13, fontWeight: '800' }}>Monoの表示</Text>
        <Text style={{ color: colors.secondaryText, fontSize: 10, lineHeight: 15, marginTop: 3 }}>白ベースのWidgetに紙面の雰囲気を加えます。</Text>
        <View style={{ flexDirection: 'row', gap: 7, marginTop: 8 }}>
          {WIDGET_MONO_TEMPLATE_OPTIONS.map((template) => {
            const selected = (settings.monoTemplate ?? 'clean') === template.id;
            return <Pressable key={template.id} onPress={() => update({ monoTemplate: template.id })} style={{ flex: 1, minHeight: 36, borderRadius: 9, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primaryAccent : colors.border, backgroundColor: selected ? colors.softAccent : colors.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: selected ? colors.primaryAccent : colors.secondaryText, fontSize: 10, fontWeight: '800' }}>{template.label}</Text></Pressable>;
          })}
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAffirmationDetails }} onPress={() => setShowAffirmationDetails((value) => !value)} style={{ marginTop: 14, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}><Text style={{ color: colors.primaryText, fontSize: 13, fontWeight: '800' }}>アファメーション設定</Text><Text style={{ color: colors.secondaryText, fontSize: 11, lineHeight: 16, marginTop: 3 }}>表示方法と背景を設定</Text></View><Text style={{ color: colors.primaryAccent, fontSize: 18, fontWeight: '700' }}>{showAffirmationDetails ? '⌃' : '⌄'}</Text>
      </Pressable>
      {showAffirmationDetails && <View style={{ marginTop: 8, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground }}>
          <Text style={{ color: colors.primaryText, fontSize: 13, fontWeight: '800' }}>アファメーション表示</Text>
          <Text style={{ color: colors.secondaryText, fontSize: 11, lineHeight: 16, marginTop: 4 }}>既存のアファメーション文をWidgetへ表示します。</Text>
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
          <Text style={{ color: colors.secondaryText, fontSize: 10, lineHeight: 15, marginTop: 8 }}>写真は「Photo Widget」の写真を共有します（最大3枚）。</Text>
          {onPickPhoto && <Pressable onPress={() => onPickPhoto()} style={{ marginTop: 8, minHeight: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryAccent, fontSize: 11, fontWeight: '800' }}>{(settings.affirmationPhotoUris?.length ?? 0) > 0 ? '写真を追加・変更' : '写真を追加'}</Text></Pressable>}
          {!!settings.affirmationPhotoUris?.length && onRemoveAffirmationPhoto && <View style={{ marginTop: 8, gap: 6 }}><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>選択済みの写真（タップで個別に削除）</Text>{settings.affirmationPhotoUris.map((uri, index) => <View key={`${uri}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Image source={{ uri }} style={{ width: 42, height: 32, borderRadius: 6 }} /><Text style={{ flex: 1, color: colors.secondaryText, fontSize: 10 }} numberOfLines={1}>写真{index + 1}</Text><Pressable onPress={() => onRemoveAffirmationPhoto(index)} hitSlop={8}><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>削除</Text></Pressable></View>)}</View>}
        </View>}

      <Text style={{ color: colors.secondaryText, fontSize: 10, lineHeight: 15, marginTop: 10 }}>表示項目や見た目の変更は、各Widgetを長押しして「ウィジェットを編集」から行えます。保存済みの設定値は古いWidgetやPreviewとの互換性のため保持しています。</Text>
    </View>
  );
}
