import { Linking } from 'react-native';

export type TravelAppCategory = 'taxi' | 'transit';
export type TravelLaunchMethod = 'official_url' | 'shortcut' | 'custom_url';

export type TravelAppConfig = {
  id: string;
  presetId?: string;
  name: string;
  category: TravelAppCategory;
  launchMethod: TravelLaunchMethod;
  enabled: boolean;
  isDefault?: boolean;
  supportsDestination?: boolean;
  launchUrl?: string;
  destinationUrlTemplate?: string;
  shortcutName?: string;
  passDestinationToShortcut?: boolean;
  isPreset?: boolean;
  isOfficialIntegration?: boolean;
  isCustom?: boolean;
};

export type TravelAppSettings = {
  apps: TravelAppConfig[];
  defaultTaxiAppId?: string;
  defaultTransitAppId?: string;
};

const PRESET_APPS: TravelAppConfig[] = [
  { id: 'uber', presetId: 'uber', name: 'Uber', category: 'taxi', launchMethod: 'official_url', enabled: false, supportsDestination: true, launchUrl: 'uber://', destinationUrlTemplate: 'uber://riderequest?pickup=my_location&dropoff[nickname]={destination}&dropoff[formatted_address]={destination}', isPreset: true, isOfficialIntegration: true },
  { id: 'apple_maps', presetId: 'apple_maps', name: 'Appleマップ', category: 'transit', launchMethod: 'official_url', enabled: true, isDefault: true, supportsDestination: true, launchUrl: 'http://maps.apple.com/', destinationUrlTemplate: 'http://maps.apple.com/?daddr={destination}&dirflg=r', isPreset: true, isOfficialIntegration: true },
  { id: 'google_maps', presetId: 'google_maps', name: 'Googleマップ', category: 'transit', launchMethod: 'official_url', enabled: false, supportsDestination: true, launchUrl: 'https://www.google.com/maps/', destinationUrlTemplate: 'https://www.google.com/maps/dir/?api=1&destination={destination}&travelmode=transit', isPreset: true, isOfficialIntegration: true },
];

// These IDs were part of the development preset list. Keep recognizing them
// during migration so old saved entries do not reappear as custom apps.
const LEGACY_PRESET_IDS = new Set(['go', 'sride', 'didi', 'yahoo_transit', 'transfer_navitime', 'jorudan']);

export const DEFAULT_TRAVEL_APP_SETTINGS: TravelAppSettings = {
  apps: PRESET_APPS.map((app) => ({ ...app })),
  defaultTaxiAppId: undefined,
  defaultTransitAppId: 'apple_maps',
};

const clonePreset = (app: TravelAppConfig): TravelAppConfig => ({ ...app });

export function normalizeTravelAppSettings(input?: Partial<TravelAppSettings> | null): TravelAppSettings {
  const savedApps = Array.isArray(input?.apps) ? input!.apps : [];
  const byId = new Map(savedApps.filter((item): item is TravelAppConfig => Boolean(item && typeof item.id === 'string')).map((item) => [item.id, item]));
  const presets = PRESET_APPS.map((preset) => {
    const saved = byId.get(preset.id);
    return saved ? { ...preset, ...saved, isPreset: true } : clonePreset(preset);
  });
  const customs: TravelAppConfig[] = savedApps.filter((item) => typeof item?.id === 'string' && !LEGACY_PRESET_IDS.has(item.id) && !PRESET_APPS.some((preset) => preset.id === item.id)).map((item) => ({
    ...item,
    name: String(item.name ?? '').trim() || '移動アプリ',
    category: (item.category === 'taxi' ? 'taxi' : 'transit') as TravelAppCategory,
    launchMethod: (item.launchMethod === 'shortcut' || item.launchMethod === 'custom_url' ? item.launchMethod : 'official_url') as TravelLaunchMethod,
    enabled: Boolean(item.enabled),
    isPreset: false,
    isCustom: true,
  }));
  const apps = [...presets, ...customs];
  const defaultTaxi = input?.defaultTaxiAppId && apps.some((app) => app.id === input.defaultTaxiAppId && app.category === 'taxi' && app.enabled) ? input.defaultTaxiAppId : undefined;
  const defaultTransit = input?.defaultTransitAppId && apps.some((app) => app.id === input.defaultTransitAppId && app.category === 'transit' && app.enabled) ? input.defaultTransitAppId : (apps.find((app) => app.id === 'apple_maps')?.enabled ? 'apple_maps' : undefined);
  return { apps, defaultTaxiAppId: defaultTaxi, defaultTransitAppId: defaultTransit };
}

export function getEnabledTravelApps(settings: TravelAppSettings, category: TravelAppCategory): TravelAppConfig[] {
  return settings.apps.filter((app) => app.category === category && app.enabled);
}

export function getDefaultTravelApp(settings: TravelAppSettings, category: TravelAppCategory): TravelAppConfig | undefined {
  const id = category === 'taxi' ? settings.defaultTaxiAppId : settings.defaultTransitAppId;
  return getEnabledTravelApps(settings, category).find((app) => app.id === id) ?? getEnabledTravelApps(settings, category)[0];
}

export function validateTravelAppUrl(url: string): boolean {
  const value = url.trim();
  if (!value || /\s/u.test(value) || /^(javascript|data|file|content):/iu.test(value)) return false;
  return /^(https?):\/\//iu.test(value) || /^[a-z][a-z0-9+.-]*:/iu.test(value);
}

function shortcutUrl(app: TravelAppConfig, destination?: string): string | undefined {
  const name = app.shortcutName?.trim();
  if (!name) return undefined;
  const base = `shortcuts://run-shortcut?name=${encodeURIComponent(name)}`;
  if (destination && app.passDestinationToShortcut) return `${base}&input=text&text=${encodeURIComponent(destination)}`;
  return base;
}

export function buildTravelAppLaunchUrl(app: TravelAppConfig, destination?: string): string | undefined {
  const cleanDestination = destination?.trim();
  if (app.launchMethod === 'shortcut') return shortcutUrl(app, cleanDestination);
  const raw = cleanDestination && app.destinationUrlTemplate ? app.destinationUrlTemplate : app.launchUrl;
  if (!raw) return undefined;
  return raw.replaceAll('{destination}', encodeURIComponent(cleanDestination ?? ''));
}

export async function openTravelApp(app: TravelAppConfig, destination?: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const url = buildTravelAppLaunchUrl(app, destination);
  if (!url || !validateTravelAppUrl(url)) return { ok: false, error: 'このアプリの起動設定を確認してください。' };
  try {
    await Linking.openURL(url);
    return { ok: true, url };
  } catch {
    return { ok: false, url, error: '移動アプリを開けませんでした。設定を確認してください。' };
  }
}

export async function openShortcutsSetup(): Promise<boolean> {
  try {
    await Linking.openURL('shortcuts://');
    return true;
  } catch {
    try {
      await Linking.openURL('shortcuts://create-shortcut');
      return true;
    } catch {
      return false;
    }
  }
}
