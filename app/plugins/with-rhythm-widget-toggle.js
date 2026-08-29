const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MODULE_NAME = 'rhythm-widget';
const OFF_MARKER = '# @rhythm-widget-autolinking-off';

function isWidgetEnabled() {
  const value = String(process.env.RHYTHM_ENABLE_WIDGET ?? '').trim().toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(value);
}

function configurePodfile(contents, enabled) {
  // Prebuild normally starts from a clean generated Podfile, but normalize a
  // previous toggle marker as well so switching profiles is deterministic.
  let next = contents
    .replaceAll(OFF_MARKER, '')
    .replace(/use_expo_modules!\(exclude:\s*\[\s*['"]rhythm-widget['"]\s*\]\)/g, 'use_expo_modules!');

  if (enabled) return next;

  // Expo's iOS autolinking manager accepts `exclude` on use_expo_modules!.
  // Apply it to every generated app target so neither the Pod nor the modules
  // provider can include the local Widget module in an OFF build.
  next = next.replace(/^(\s*)use_expo_modules!\s*$/gm, `$1use_expo_modules!(exclude: ['${MODULE_NAME}']) ${OFF_MARKER}`);
  return next;
}

module.exports = function withRhythmWidgetToggle(config) {
  const enabled = isWidgetEnabled();
  return withDangerousMod(config, ['ios', async (nextConfig) => {
    const podfilePath = path.join(nextConfig.modRequest.platformProjectRoot, 'Podfile');
    if (!fs.existsSync(podfilePath)) return nextConfig;

    const contents = fs.readFileSync(podfilePath, 'utf8');
    const configured = configurePodfile(contents, enabled);
    if (configured !== contents) fs.writeFileSync(podfilePath, configured);
    return nextConfig;
  }]);
};
