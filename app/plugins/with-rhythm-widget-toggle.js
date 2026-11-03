const { withPodfile } = require('expo/config-plugins');

const MODULE_NAME = 'rhythm-widget';
const OFF_MARKER = '# @rhythm-widget-autolinking-off';

function isWidgetEnabled() {
  const value = String(process.env.RHYTHM_ENABLE_WIDGET ?? '').trim().toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(value);
}

function configurePodfile(contents, enabled) {
  // Expo SDK 54 discovers local Expo Modules through package.json's
  // expo.autolinking.nativeModulesDir. Keep this Podfile patch limited to the
  // development-widget opt-out so the standard local-module path is used by
  // both local prebuild and EAS.
  const normalized = contents.replaceAll(OFF_MARKER, '');
  const moduleCall = /^([ \t]*)use_expo_modules![ \t]*(?:\(([^)\r\n]*)\))?/gm;

  return normalized.replace(moduleCall, (_match, indent, rawOptions = '') => {
    const options = rawOptions
      .replace(/exclude:\s*\[\s*['"]rhythm-widget['"]\s*\]\s*,?/g, '')
      .trim()
      .replace(/,+\s*$/, '');
    const nextOptions = [
      options,
      ...(enabled ? [] : [`exclude: ['${MODULE_NAME}']`]),
    ].filter(Boolean).join(', ');
    const marker = enabled ? '' : ` ${OFF_MARKER}`;
    return `${indent}use_expo_modules!${nextOptions ? `(${nextOptions})` : ''}${marker}`;
  });
}

module.exports = function withRhythmWidgetToggle(config) {
  const enabled = isWidgetEnabled();
  return withPodfile(config, (nextConfig) => {
    const contents = nextConfig.modResults?.contents;
    if (typeof contents !== 'string') return nextConfig;

    const configured = configurePodfile(contents, enabled);
    if (configured !== contents) nextConfig.modResults.contents = configured;
    return nextConfig;
  });
};
