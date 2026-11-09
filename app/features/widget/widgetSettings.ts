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
  RhythmFontDesign,
} from '../../types';
import { normalizeRhythmFontDesign } from '../fontDesign';

export type WidgetAccessTier = 'free' | 'design' | 'premium';

export type WidgetTypeOption = { id: WidgetType; label: string; description: string; sizes: string; access: WidgetAccessTier };

/** Development-only presentation override for validating Widget access states. */
export type WidgetEntitlementOverride = 'actual' | 'free' | 'design' | 'premium';

/** The complete user-facing Widget catalogue. Legacy types remain decodable below. */
export const WIDGET_TYPE_OPTIONS: ReadonlyArray<WidgetTypeOption> = [
  { id: 'current', label: '今やるTODO', description: 'いま取り組むタスクを表示', sizes: 'M / L', access: 'free' },
  { id: 'next', label: '次に控える予定', description: '直近の予定をひとつ表示', sizes: 'M', access: 'free' },
  { id: 'combined', label: 'TODOと次の予定', description: 'いまやることと次の予定をまとめて表示', sizes: 'M', access: 'design' },
  { id: 'monthly', label: '月間カレンダー', description: '予定のある日を月ごとに確認', sizes: 'L', access: 'design' },
  { id: 'weekly', label: '週間カレンダー', description: '今週の予定を一覧で確認', sizes: 'M / L', access: 'design' },
  { id: 'today', label: '今日の予定', description: '今日の予定を時刻順に一覧表示', sizes: 'M', access: 'design' },
  { id: 'checklist', label: 'TODOチェックリスト', description: '登録したTODOをチェックリストで確認', sizes: 'M', access: 'design' },
  { id: 'goal', label: '叶えたいこと', description: '目標と進捗を表示', sizes: 'M', access: 'premium' },
  { id: 'affirmation', label: 'アファメーション', description: '言葉と背景で気持ちを整える', sizes: 'M', access: 'premium' },
];

const WIDGET_ACCESS_TOTALS = WIDGET_TYPE_OPTIONS.reduce<Record<WidgetAccessTier, number>>((totals, option) => {
  totals[option.access] += 1;
  return totals;
}, { free: 0, design: 0, premium: 0 });

/** Counts derive from the user-facing catalogue so explanatory UI cannot drift. */
export const WIDGET_ACCESSIBLE_COUNTS = {
  free: WIDGET_ACCESS_TOTALS.free,
  design: WIDGET_ACCESS_TOTALS.free + WIDGET_ACCESS_TOTALS.design,
  premium: WIDGET_TYPE_OPTIONS.length,
} as const;

/** User-facing groups keep similar Widget choices together without changing
 * persisted WidgetType IDs or the native Widget Extension kinds. */
export const WIDGET_TYPE_GROUPS: ReadonlyArray<{ id: string; label: string; types: ReadonlyArray<WidgetType> }> = [
  { id: 'tasks', label: 'TODO', types: ['current', 'checklist'] },
  { id: 'schedule', label: '予定', types: ['next', 'today', 'weekly', 'monthly'] },
  { id: 'summary', label: 'まとめ', types: ['combined'] },
  { id: 'personal', label: 'その他', types: ['goal', 'affirmation'] },
];

export const WIDGET_STYLE_OPTIONS: ReadonlyArray<{ id: WidgetStyle; label: string; description: string }> = [
  { id: 'mono', label: 'シンプル', description: 'すっきり見やすく' },
  // Keep the persisted `color` id for compatibility while exposing the
  // product-facing Design name used by the app's existing Design mode.
  { id: 'color', label: 'デザイン', description: '柄とカラーで彩る' },
  { id: 'photo', label: '写真', description: '写真と組み合わせる' },
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
];

export const WIDGET_MONO_TEMPLATE_OPTIONS: ReadonlyArray<{ id: WidgetMonoTemplate; label: string }> = [
  { id: 'clean', label: 'プレーン' },
  { id: 'pinNote', label: 'ピンノート' },
  { id: 'ruledNote', label: '罫線ノート' },
  { id: 'looseLeaf', label: 'ルーズリーフ' },
];

export const WIDGET_FONT_DESIGN_OPTIONS: ReadonlyArray<{ id: RhythmFontDesign; label: string }> = [
  { id: 'default', label: '標準' },
  { id: 'rounded', label: '丸み' },
  { id: 'serif', label: 'セリフ' },
  { id: 'monospaced', label: '等幅' },
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
  fontDesign: 'default',
  displayOptions: DEFAULT_DISPLAY_OPTIONS,
  affirmationRotationMode: 'fixed',
  affirmationBackgrounds: ['floral', 'dot', 'check', 'photo'],
  affirmationPhotoUris: [],
};

// Voice was offered by previous releases. Keep the persisted ID decodable so
// existing state remains safe, while keeping it out of every new selection UI.
/**
 * IDs that may exist in persisted settings. `voice` stays here solely for
 * backward-compatible decoding and managed-photo cleanup; it is not part of
 * the selectable Widget catalogue.
 */
export const PERSISTED_WIDGET_TYPE_IDS: ReadonlyArray<WidgetType> = [...WIDGET_TYPE_OPTIONS.map((item) => item.id), 'voice'];
const widgetTypeIds = new Set<WidgetType>(PERSISTED_WIDGET_TYPE_IDS);
const widgetStyleIds = new Set<WidgetStyle>(WIDGET_STYLE_OPTIONS.map((item) => item.id));
const accentIds = new Set<WidgetAccentColor>(WIDGET_ACCENT_OPTIONS.map((item) => item.id));
const photoSourceIds = new Set<WidgetPhotoSource>(WIDGET_PHOTO_SOURCE_OPTIONS.map((item) => item.id));
const photoLayoutIds = new Set<WidgetPhotoLayout>(WIDGET_PHOTO_LAYOUT_OPTIONS.map((item) => item.id));
// Keep all legacy Mono treatments readable so existing saved settings and the
// native AppIntent edit sheet resolve to the same renderer cases.
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
  const fontDesign = normalizeRhythmFontDesign(source.fontDesign);
  const legacyPhotoUri = typeof source.photoUri === 'string' && source.photoUri.trim() ? source.photoUri : undefined;
  const rawCustomizations = isRecord(source.widgetCustomizations) ? source.widgetCustomizations : {};
  const widgetCustomizations: WidgetCustomizations = {};
  PERSISTED_WIDGET_TYPE_IDS.forEach((id) => {
    const raw = isRecord(rawCustomizations[id]) ? rawCustomizations[id] : undefined;
    if (!raw) return;
    const customPhotoUri = typeof raw.photoUri === 'string' && raw.photoUri.trim() ? raw.photoUri : undefined;
    const customCutoutUri = typeof raw.cutoutUri === 'string' && raw.cutoutUri.trim() ? raw.cutoutUri : undefined;
    const customPhotoLayout = photoLayoutIds.has(raw.photoLayout as WidgetPhotoLayout) ? raw.photoLayout as WidgetPhotoLayout : undefined;
    const customMonoTemplate = monoTemplateIds.has(raw.monoTemplate as WidgetMonoTemplate) ? raw.monoTemplate as WidgetMonoTemplate : undefined;
    // Background removal is retired. Older cutout-only saves remain visible by
    // using their file as the normal photo, but the legacy key is never saved
    // back out by normalized settings.
    const photoUri = customPhotoUri ?? customCutoutUri;
    if (photoUri || customPhotoLayout || customMonoTemplate) widgetCustomizations[id] = { photoUri, photoLayout: customPhotoLayout, monoTemplate: customMonoTemplate };
  });
  // Migrate the old shared Widget photo exactly once. The old setting was
  // visible to every Widget, so preserve that behavior by creating an
  // explicit per-Widget reference before clearing the legacy field. From this
  // point on, deleting one Widget's photo cannot be undone by a shared
  // fallback, while the same managed file remains retained by other Widgets.
  if (legacyPhotoUri) {
    PERSISTED_WIDGET_TYPE_IDS.forEach((id) => {
      const current = widgetCustomizations[id];
      if (!current?.photoUri) widgetCustomizations[id] = { ...(current ?? {}), photoUri: legacyPhotoUri };
    });
  }
  const affirmationRotationMode = source.affirmationRotationMode === 'automatic' ? 'automatic' : 'fixed';
  const allowedBackgrounds = new Set(['floral', 'dot', 'check', 'photo']);
  const affirmationBackgrounds = Array.isArray(source.affirmationBackgrounds)
    ? source.affirmationBackgrounds.filter((item): item is 'floral' | 'dot' | 'check' | 'photo' => typeof item === 'string' && allowedBackgrounds.has(item)).slice(0, 4)
    : DEFAULT_WIDGET_SETTINGS.affirmationBackgrounds;
  const affirmationPhotoUris = Array.isArray(source.affirmationPhotoUris)
    ? source.affirmationPhotoUris.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 3)
    : [];
  // `photoUri` remains part of the persisted type for backward compatibility,
  // but normalized state no longer uses the legacy shared reference.
  return { widgetType, style, accentColor, photoUri: undefined, photoSource, photoLayout, monoTemplate, fontDesign, widgetCustomizations, displayOptions, affirmationRotationMode, affirmationBackgrounds, affirmationPhotoUris };
}

/** Resolves only the formal per-Widget photo configuration. */
export function getWidgetCustomization(settings: WidgetSettings, widgetType: WidgetType): WidgetCustomization {
  const customization = settings.widgetCustomizations?.[widgetType];
  const storedLayout = customization?.photoLayout ?? settings.photoLayout;
  // Older persisted records may contain the removed cutout layout. Keep the
  // field decodable, but expose it to the current UI as a normal photo.
  const photoLayout = storedLayout === 'cutout' ? 'background' : storedLayout;
  return {
    photoUri: customization?.photoUri,
    photoLayout,
    monoTemplate: customization?.monoTemplate ?? settings.monoTemplate,
  };
}
