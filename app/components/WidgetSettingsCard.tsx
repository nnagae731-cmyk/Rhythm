import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import {
  WidgetDisplayOption,
  WidgetSettings,
} from '../types';
import { ChicCheckColor, ChicPattern } from '../theme';
import {
  WIDGET_TYPE_OPTIONS,
} from '../features/widget/widgetSettings';

type WidgetSettingsCardProps = {
  settings: WidgetSettings;
  onChange: (settings: WidgetSettings) => void;
  onPickPhoto?: () => void;
  onRemoveAffirmationPhoto?: (index?: number) => void;
  colors: { surface: string; border: string; primaryText: string; secondaryText: string; primaryAccent: string; softAccent: string; screenBackground: string };
  styles: any;
  designPattern?: ChicPattern;
  designCheckColor?: ChicCheckColor;
  PatternDecor?: React.ComponentType<any>;
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

function WidgetTypePreview({ type, style, colors, designPattern, designCheckColor, PatternDecor }: { type: WidgetSettings['widgetType']; style: WidgetSettings['style']; colors: WidgetSettingsCardProps['colors']; designPattern?: ChicPattern; designCheckColor?: ChicCheckColor; PatternDecor?: React.ComponentType<any> }) {
  const title = WIDGET_TYPE_OPTIONS.find((option) => option.id === type)?.label ?? 'Widget';
  const line = (label: string, value: string) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ color: colors.secondaryText, fontSize: 10 }}>{label}</Text><Text style={{ color: colors.primaryText, fontSize: 11, fontWeight: '800', flexShrink: 1 }}>{value}</Text></View>;
  return <View style={{ marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground, overflow: 'hidden' }}>
    {style !== 'photo' && PatternDecor && designPattern && designPattern !== 'plain' && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.32 }}><PatternDecor pattern={designPattern} accent={colors.primaryAccent} warm={colors.softAccent} checkColor={designCheckColor} preview /></View>}
    <Text style={{ color: colors.primaryAccent, fontSize: 10, fontWeight: '800' }}>PREVIEW · {title}</Text>
    <View style={{ marginTop: 8, gap: 5 }}>
      {type === 'current' && <>{line('今はこれ', '資料をまとめる')}{line('残り時間', '25 min')}</>}
      {type === 'next' && <>{line('次の予定', '18:00  美容院')}{line('出発まで', '1時間42分')}</>}
      {type === 'combined' && <>{line('今はこれ', '資料をまとめる')}{line('次の予定', '18:00  美容院')}</>}
      {type === 'monthly' && <>{line('今月', '2026年6月')}{line('予定', '●  ●  ●  ●')}</>}
      {type === 'weekly' && <>{line('月', '09:00 会議')}{line('火', '10:30 資料提出')}{line('金', '18:00 美容院')}</>}
      {type === 'today' && <>{line('09:00', '会議')}{line('10:30', '資料提出')}{line('18:00', '美容院')}</>}
      {type === 'checklist' && <>{line('✓', '財布')}{line('□', '鍵')}{line('□', '充電器')}</>}
      {type === 'goal' && <>{line('叶えたいこと', 'アプリ完成')}{line('進捗', '60%')}</>}
      {type === 'voice' && <>{line('音声入力', '話して予定・タスクを追加')}</>}
      {type === 'affirmation' && <>{line('今日の言葉', '私は私のペースで進めばいい')}</>}
    </View>
  </View>;
}

export function WidgetSettingsCard({ settings, onChange, onPickPhoto, onRemoveAffirmationPhoto, colors, styles, designPattern, designCheckColor, PatternDecor }: WidgetSettingsCardProps) {
  const update = (patch: Partial<WidgetSettings>) => onChange({ ...settings, ...patch });
  return (
    <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.settingsTitle, { color: colors.primaryText }]}>使えるWidget</Text>
      <Text style={{ color: colors.secondaryText, fontSize: 11, lineHeight: 16, marginTop: 5 }}>ここはWidgetの種類を選ぶ画面ではなく、使えるWidgetと追加方法を確認する場所です。見た目はホーム画面の「ウィジェットを編集」からWidgetごとに設定できます。</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, marginTop: 12 }}>
        {WIDGET_TYPE_OPTIONS.map((option) => <View key={option.id} accessible accessibilityLabel={`${option.label}。${option.description}。対応サイズ ${option.sizes}`} style={{ width: '48%', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10 }}><Text numberOfLines={1} style={{ color: colors.primaryText, fontSize: 13, fontWeight: '800' }}>{option.label}</Text><Text numberOfLines={2} style={{ color: colors.secondaryText, fontSize: 11, lineHeight: 15, marginTop: 3 }}>{option.description}</Text><Text style={{ color: colors.primaryAccent, fontSize: 10, marginTop: 5, fontWeight: '700' }}>{option.sizes}</Text><WidgetTypePreview type={option.id} style={settings.style} colors={colors} designPattern={designPattern} designCheckColor={designCheckColor} PatternDecor={PatternDecor} /></View>)}
      </View>

      <>
        <View style={{ marginTop: 14, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground }}>
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
          {onPickPhoto && <Pressable onPress={onPickPhoto} style={{ marginTop: 8, minHeight: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryAccent, fontSize: 11, fontWeight: '800' }}>{(settings.affirmationPhotoUris?.length ?? 0) > 0 ? '写真を追加・変更' : '写真を追加'}</Text></Pressable>}
          {!!settings.affirmationPhotoUris?.length && onRemoveAffirmationPhoto && <View style={{ marginTop: 8, gap: 6 }}><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>選択済みの写真（タップで個別に削除）</Text>{settings.affirmationPhotoUris.map((uri, index) => <View key={`${uri}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Image source={{ uri }} style={{ width: 42, height: 32, borderRadius: 6 }} /><Text style={{ flex: 1, color: colors.secondaryText, fontSize: 10 }} numberOfLines={1}>写真{index + 1}</Text><Pressable onPress={() => onRemoveAffirmationPhoto(index)} hitSlop={8}><Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700' }}>削除</Text></Pressable></View>)}</View>}
        </View>
      </>

      <View style={{ marginTop: 14, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.screenBackground }}>
        <Text style={{ color: colors.primaryText, fontSize: 13, fontWeight: '800' }}>Widget用写真</Text>
        <Text style={{ color: colors.secondaryText, fontSize: 11, lineHeight: 16, marginTop: 4 }}>通常WidgetとアファメーションWidgetで使う写真をこの端末から管理します。</Text>
        {settings.photoUri ? <Image source={{ uri: settings.photoUri }} style={{ width: '100%', height: 92, borderRadius: 10, marginTop: 9 }} resizeMode="cover" /> : <Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 9 }}>写真はまだ選択されていません。</Text>}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {onPickPhoto && <Pressable onPress={onPickPhoto} style={{ flex: 1, minHeight: 42, borderRadius: 10, backgroundColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{settings.photoUri ? '写真を変更' : '写真を追加'}</Text></Pressable>}
          {settings.photoUri && <Pressable onPress={() => update({ photoUri: undefined })} style={{ minWidth: 68, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.secondaryText, fontSize: 11, fontWeight: '800' }}>削除</Text></Pressable>}
        </View>
        {!!settings.affirmationPhotoUris?.length && <Text style={{ color: colors.secondaryText, fontSize: 10, lineHeight: 15, marginTop: 8 }}>アファメーション用に{settings.affirmationPhotoUris.length}枚を選択中（最大3枚）。</Text>}
        {!!settings.affirmationPhotoUris?.length && onRemoveAffirmationPhoto && <Text style={{ color: colors.secondaryText, fontSize: 10, lineHeight: 15, marginTop: 8 }}>上の一覧から写真ごとに削除できます。</Text>}
      </View>
      <Text style={{ color: colors.secondaryText, fontSize: 10, lineHeight: 15, marginTop: 10 }}>表示項目や見た目の変更は、各Widgetを長押しして「ウィジェットを編集」から行えます。保存済みの設定値は古いWidgetやPreviewとの互換性のため保持しています。</Text>
    </View>
  );
}
