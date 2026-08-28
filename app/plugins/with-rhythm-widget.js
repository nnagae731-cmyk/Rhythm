const { withDangerousMod, withEntitlementsPlist, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const APP_GROUP = 'group.app.rhythm.daily';
const TARGET_NAME = 'RhythmWidget';
const BUNDLE_IDENTIFIER = 'app.rhythm.daily.widget';
const TEMPLATE_FILES = [
  'RhythmWidget.swift',
  'RhythmWidgetBundle.swift',
  'RhythmWidget-Info.plist',
  'RhythmWidget.entitlements',
];

function copyWidgetTemplate(iosRoot) {
  const templateRoot = path.join(__dirname, '..', 'widget');
  const destinationRoot = path.join(iosRoot, TARGET_NAME);
  fs.mkdirSync(destinationRoot, { recursive: true });
  TEMPLATE_FILES.forEach((file) => fs.copyFileSync(path.join(templateRoot, file), path.join(destinationRoot, file)));
}

function addWidgetTarget(project) {
  if (project.pbxTargetByName(TARGET_NAME)) return;

  const target = project.addTarget(TARGET_NAME, 'app_extension', TARGET_NAME, BUNDLE_IDENTIFIER);
  project.addPbxGroup(TEMPLATE_FILES, TARGET_NAME, TARGET_NAME);
  project.addBuildPhase(['RhythmWidget.swift', 'RhythmWidgetBundle.swift'], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
  project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
  project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
  project.updateBuildProperty('INFOPLIST_FILE', `${TARGET_NAME}/RhythmWidget-Info.plist`, null, TARGET_NAME);
  project.updateBuildProperty('CODE_SIGN_ENTITLEMENTS', `${TARGET_NAME}/RhythmWidget.entitlements`, null, TARGET_NAME);
  project.updateBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', BUNDLE_IDENTIFIER, null, TARGET_NAME);
  project.updateBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '15.1', null, TARGET_NAME);
  project.updateBuildProperty('SWIFT_VERSION', '5.0', null, TARGET_NAME);
  project.updateBuildProperty('APPLICATION_EXTENSION_API_ONLY', 'YES', null, TARGET_NAME);
  project.updateBuildProperty('TARGETED_DEVICE_FAMILY', '1', null, TARGET_NAME);
}

module.exports = function withRhythmWidget(config) {
  config = withEntitlementsPlist(config, (nextConfig) => {
    const existing = nextConfig.modResults['com.apple.security.application-groups'] ?? [];
    nextConfig.modResults['com.apple.security.application-groups'] = Array.from(new Set([...existing, APP_GROUP]));
    return nextConfig;
  });
  config = withDangerousMod(config, ['ios', async (nextConfig) => {
    copyWidgetTemplate(nextConfig.modRequest.platformProjectRoot);
    return nextConfig;
  }]);
  config = withXcodeProject(config, (nextConfig) => {
    addWidgetTarget(nextConfig.modResults);
    return nextConfig;
  });
  return config;
};
