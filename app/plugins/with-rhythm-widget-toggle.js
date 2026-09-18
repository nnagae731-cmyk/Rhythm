const { withPodfile } = require('expo/config-plugins');

const MODULE_NAME = 'rhythm-widget';
const OFF_MARKER = '# @rhythm-widget-autolinking-off';
const LOCAL_MODULES_PATH = "File.expand_path('../modules', __dir__)";

function isWidgetEnabled() {
  const value = String(process.env.RHYTHM_ENABLE_WIDGET ?? '').trim().toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(value);
}

function configurePodfile(contents, enabled) {
  // This callback runs after Expo has generated the Podfile. Keep the local
  // module path explicit because EAS may execute CocoaPods from a different
  // working directory than the local CLI. The path is resolved from ios/Podfile
  // itself, so it always points at app/modules.
  const normalized = contents.replaceAll(OFF_MARKER, '');
  const moduleCall = /^([ \t]*)use_expo_modules![ \t]*(?:\(([^)\r\n]*)\))?/gm;

  return normalized.replace(moduleCall, (_match, indent, rawOptions = '') => {
    const options = rawOptions
      .replace(/exclude:\s*\[\s*['"]rhythm-widget['"]\s*\]\s*,?/g, '')
      .replace(/searchPaths:\s*\[\s*File\.expand_path\('\.\.\/modules',\s*__dir__\)\s*\]\s*,?/g, '')
      .trim()
      .replace(/,+\s*$/, '');
    const nextOptions = [
      `searchPaths: [${LOCAL_MODULES_PATH}]`,
      options,
      ...(enabled ? [] : [`exclude: ['${MODULE_NAME}']`]),
    ].filter(Boolean).join(', ');
    const marker = enabled ? '' : ` ${OFF_MARKER}`;
    return `${indent}use_expo_modules!(${nextOptions})${marker}`;
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
