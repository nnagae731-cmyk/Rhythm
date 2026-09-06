const WIDGET_PLUGIN = './plugins/with-rhythm-widget';
const TOGGLE_PLUGIN = './plugins/with-rhythm-widget-toggle';
const GOOGLE_ADS_PLUGIN = 'react-native-google-mobile-ads';
const staticConfig = require('./app.json').expo;

function isWidgetEnabled() {
  const value = String(process.env.RHYTHM_ENABLE_WIDGET ?? '').trim().toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(value);
}

const adsEnvironment = process.env.RHYTHM_ADS_ENV
  || process.env.EXPO_PUBLIC_RHYTHM_ADS_ENV
  || (process.env.EAS_BUILD_PROFILE === 'production' ? 'production' : 'development');
const isProductionAds = adsEnvironment === 'production';
const iosAppId = process.env.RHYTHM_ADMOB_IOS_APP_ID || process.env.EXPO_PUBLIC_RHYTHM_ADMOB_IOS_APP_ID;
const androidAppId = process.env.RHYTHM_ADMOB_ANDROID_APP_ID || process.env.EXPO_PUBLIC_RHYTHM_ADMOB_ANDROID_APP_ID;
const rewardedUnitId = process.env.EXPO_PUBLIC_RHYTHM_REWARDED_AD_UNIT_ID;

if (isProductionAds && (!iosAppId || !rewardedUnitId)) {
  throw new Error('Production AdMob is not configured. Set RHYTHM_ADMOB_IOS_APP_ID and EXPO_PUBLIC_RHYTHM_REWARDED_AD_UNIT_ID before building the production profile.');
}

function adsPluginConfig() {
  if (!isProductionAds) {
    return {
      iosAppId: 'ca-app-pub-3940256099942544~1458002511',
      androidAppId: 'ca-app-pub-3940256099942544~3347511713',
    };
  }
  return {
    iosAppId,
    ...(androidAppId ? { androidAppId } : {}),
  };
}

module.exports = ({ config }) => {
  const baseConfig = config ?? staticConfig;
  const existingPlugins = Array.isArray(baseConfig.plugins) ? baseConfig.plugins : [];
  const plugins = [];
  let hasAdsPlugin = false;
  existingPlugins.forEach((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    if (name === WIDGET_PLUGIN || name === TOGGLE_PLUGIN) return;
    if (name === GOOGLE_ADS_PLUGIN) {
      if (!hasAdsPlugin) {
        plugins.push([GOOGLE_ADS_PLUGIN, adsPluginConfig()]);
        hasAdsPlugin = true;
      }
      return;
    }
    plugins.push(plugin);
  });
  if (!hasAdsPlugin) plugins.push([GOOGLE_ADS_PLUGIN, adsPluginConfig()]);
  if (isWidgetEnabled()) plugins.push(WIDGET_PLUGIN);
  plugins.push(TOGGLE_PLUGIN);

  return {
    ...baseConfig,
    plugins,
  };
};
