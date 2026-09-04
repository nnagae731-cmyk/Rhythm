import {
  WidgetAccentColor,
  WidgetCustomization,
  WidgetCustomizations,
  WidgetDisplayOption,
  WidgetPhotoLayout,
  WidgetPhotoSource,
  WidgetSettings,
  WidgetStyle,
  WidgetType,
  WidgetMonoTemplate,
} from '../../types';

export type WidgetAccessTier = 'free' | 'design' | 'premium';

/** Development-only presentation override for validating Widget access states. */
export type WidgetEntitlementOverride = 'actual' | 'free' | 'design' | 'premium';

export const WIDGET_TYPE_OPTIONS: ReadonlyArray<{ id: WidgetType; label: string; description: string; sizes: string; access: WidgetAccessTier }> = [
  { id: 'current', label: '今はこれ', description: 'いま取り組むタスクを表示', sizes: 'M / L', access: 'free' },
  { id: 'next', label: '次の予定', description: '次に控えている予定を表示', sizes: 'M', access: 'free' },
  { id: 'combined', label: '今はこれ＋次の予定', description: 'タスクと予定をまとめて表示', sizes: 'M', access: 'design' },
  { id: 'monthly', label: '月間カレンダー', description: '予定のある日を月ごとに確認', sizes: 'M / L', access: 'design' },
  { id: 'weekly', label: '週間カレンダー', description: '今週の予定を一覧で確認', sizes: 'M / L', access: 'design' },
  { id: 'today', label: '今日の予定', description: '今日の予定を時刻順に表示', sizes: 'M', access: 'design' },
  { id: 'checklist', label: 'ToDoメモ', description: '持ち物やメモを確認', sizes: 'M', access: 'design' },
  { id: 'goal', label: '叶えたいこと', description: '目標と進捗を表示', sizes: 'M', access: 'premium' },
  { id: 'voice', label: '音声入力', description: 'ホーム画面から音声入力を開始', sizes: 'S / M', access: 'free' },
  { id: 'affirmation', label: 'アファメーション', description: '言葉と背景で気持ちを整える', sizes: 'M', access: 'premium' },
];

export const WIDGET_STYLE_OPTIONS: ReadonlyArray<{ id: WidgetStyle; label: string; description: string }> = [
  { id: 'mono', label: 'Mono', description: 'すっきり見やすく' },
  // Keep the persisted `color` id for compatibility while exposing the
  // product-facing Design name used by the app's existing Design mode.
  { id: 'color', label: 'Design', description: '既存の柄とカラーで彩る' },
  { id: 'photo', label: 'Photo', description: '写真と組み合わせる' },
];

// Legacy widget-only accent values are retained solely to decode existing
// WidgetSettings records. New snapshots and Live Activity payloads use the
// shared `chicCheckColor` palette instead.
export const WIDGET_ACCENT_OPTIONS: ReadonlyArray<{ id: WidgetAccentColor; label: string; hex: string }> = [
  { id: 'blue', label: 'Blue', hex: '#4F6FED' },
  { id: 'purple', label: 'Purple', hex: '#786EAF' },
  { id: 'pink', label: 'Pink', hex: '#9C5D79' },
  { id: 'green', label: 'Green', hex: '#5FAFA4' },
  { id: 'orange', label: 'Orange', hex: '#C58A4A' },
  { id: 'gray', label: 'Gray', hex: '#68748A' },
];

export const WIDGET_PHOTO_SOURCE_OPTIONS: ReadonlyArray<{ id: WidgetPhotoSource; label: string }> = [
  { id: 'widget', label: 'Widget専用写真' },
  { id: 'wish', label: '叶えたいことのトップ画像' },
];

export const WIDGET_PHOTO_LAYOUT_OPTIONS: ReadonlyArray<{ id: WidgetPhotoLayout; label: string }> = [
  { id: 'background', label: '背景' },
  { id: 'right', label: '右側' },
  { id: 'top', label: '上部' },
  { id: 'card', label: 'カード' },
  { id: 'circle', label: '丸型' },
  { id: 'cutout', label: '切り抜き' },
];

export const WIDGET_MONO_TEMPLATE_OPTIONS: ReadonlyArray<{ id: WidgetMonoTemplate; label: string }> = [
  { id: 'clean', label: 'Clean' },
  { id: 'pinNote', label: 'Pin Note' },
  { id: 'ruledNote', label: 'Ruled Note' },
];

const DEFAULT_DISPLAY_OPTIONS: Record<WidgetDisplayOption, boolean> = {
  startTime: true,
  remainingTime: true,
  status: true,
  scheduleTime: true,
  location: true,
  remainingToLeave: true,
  currentTask: true,
  nextPlan: true,
  combinedRemainingToLeave: true,
};

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  widgetType: 'combined',
  style: 'mono',
  accentColor: 'blue',
  photoSource: 'widget',
  photoLayout: 'background',
  monoTemplate: 'clean',
  displayOptions: DEFAULT_DISPLAY_OPTIONS,
  affirmationRotationMode: 'fixed',
  affirmationBackgrounds: ['floral', 'dot', 'check', 'photo'],
  affirmationPhotoUris: [],
};

const widgetTypeIds = new Set<WidgetType>(WIDGET_TYPE_OPTIONS.map((item) => item.id));
const widgetStyleIds = new Set<WidgetStyle>(WIDGET_STYLE_OPTIONS.map((item) => item.id));
const accentIds = new Set<WidgetAccentColor>(WIDGET_ACCENT_OPTIONS.map((item) => item.id));
const photoSourceIds = new Set<WidgetPhotoSource>(WIDGET_PHOTO_SOURCE_OPTIONS.map((item) => item.id));
const photoLayoutIds = new Set<WidgetPhotoLayout>(WIDGET_PHOTO_LAYOUT_OPTIONS.map((item) => item.id));
const monoTemplateIds = new Set<WidgetMonoTemplate>(WIDGET_MONO_TEMPLATE_OPTIONS.map((item) => item.id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeWidgetSettings(value: unknown): WidgetSettings {
  const source = isRecord(value) ? value : {};
  const rawDisplayOptions = isRecord(source.displayOptions) ? source.displayOptions : {};
  const displayOptions = { ...DEFAULT_DISPLAY_OPTIONS };
  (Object.keys(DEFAULT_DISPLAY_OPTIONS) as WidgetDisplayOption[]).forEach((key) => {
    if (typeof rawDisplayOptions[key] === 'boolean') displayOptions[key] = rawDisplayOptions[key] as boolean;
  });
  const widgetType = widgetTypeIds.has(source.widgetType as WidgetType) ? source.widgetType as WidgetType : DEFAULT_WIDGET_SETTINGS.widgetType;
  const style = widgetStyleIds.has(source.style as WidgetStyle) ? source.style as WidgetStyle : DEFAULT_WIDGET_SETTINGS.style;
  const accentColor = accentIds.has(source.accentColor as WidgetAccentColor) ? source.accentColor as WidgetAccentColor : DEFAULT_WIDGET_SETTINGS.accentColor;
  const photoSource = photoSourceIds.has(source.photoSource as WidgetPhotoSource) ? source.photoSource as WidgetPhotoSource : DEFAULT_WIDGET_SETTINGS.photoSource;
  const photoLayout = photoLayoutIds.has(source.photoLayout as WidgetPhotoLayout) ? source.photoLayout as WidgetPhotoLayout : DEFAULT_WIDGET_SETTINGS.photoLayout;
  const monoTemplate = monoTemplateIds.has(source.monoTemplate as WidgetMonoTemplate) ? source.monoTemplate as WidgetMonoTemplate : DEFAULT_WIDGET_SETTINGS.monoTemplate;
  const photoUri = typeof source.photoUri === 'string' && source.photoUri.trim() ? source.photoUri : undefined;
  const rawCustomizations = isRecord(source.widgetCustomizations) ? source.widgetCustomizations : {};
  const widgetCustomizations: WidgetCustomizations = {};
  WIDGET_TYPE_OPTIONS.forEach(({ id }) => {
    const raw = isRecord(rawCustomizations[id]) ? rawCustomizations[id] : undefined;
    if (!raw) return;
    const customPhotoUri = typeof raw.photoUri === 'string' && raw.photoUri.trim() ? raw.photoUri : undefined;
    const customCutoutUri = typeof raw.cutoutUri === 'string' && raw.cutoutUri.trim() ? raw.cutoutUri : undefined;
    const customPhotoLayout = photoLayoutIds.has(raw.photoLayout as WidgetPhotoLayout) ? raw.photoLayout as WidgetPhotoLayout : undefined;
    const customMonoTemplate = monoTemplateIds.has(raw.monoTemplate as WidgetMonoTemplate) ? raw.monoTemplate as WidgetMonoTemplate : undefined;
    if (customPhotoUri || customCutoutUri || customPhotoLayout || customMonoTemplate) widgetCustomizations[id] = { photoUri: customPhotoUri, cutoutUri: customCutoutUri, photoLayout: customPhotoLayout, monoTemplate: customMonoTemplate };
  });
  const affirmationRotationMode = source.affirmationRotationMode === 'automatic' ? 'automatic' : 'fixed';
  const allowedBackgrounds = new Set(['floral', 'dot', 'check', 'photo']);
  const affirmationBackgrounds = Array.isArray(source.affirmationBackgrounds)
    ? source.affirmationBackgrounds.filter((item): item is 'floral' | 'dot' | 'check' | 'photo' => typeof item === 'string' && allowedBackgrounds.has(item)).slice(0, 4)
    : DEFAULT_WIDGET_SETTINGS.affirmationBackgrounds;
  const affirmationPhotoUris = Array.isArray(source.affirmationPhotoUris)
    ? source.affirmationPhotoUris.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 3)
    : [];
  return { widgetType, style, accentColor, photoUri, photoSource, photoLayout, monoTemplate, widgetCustomizations, displayOptions, affirmationRotationMode, affirmationBackgrounds, affirmationPhotoUris };
}

/** Resolves a widget's new per-kind photo first, while retaining the legacy shared photo fallback. */
export function getWidgetCustomization(settings: WidgetSettings, widgetType: WidgetType): WidgetCustomization {
  const customization = settings.widgetCustomizations?.[widgetType];
  return {
    photoUri: customization?.photoUri ?? settings.photoUri,
    cutoutUri: customization?.cutoutUri,
    photoLayout: customization?.photoLayout ?? settings.photoLayout,
    monoTemplate: customization?.monoTemplate ?? settings.monoTemplate,
  };
}
