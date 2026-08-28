const { withDangerousMod, withEntitlementsPlist, withPodfile, withXcodeProject } = require('expo/config-plugins');
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

const RESOURCE_BUNDLE_SIGNING_MARKER = '# @rhythm-widget-resource-bundle-signing';

function configureResourceBundleSigning(podfile) {
  if (podfile.includes(RESOURCE_BUNDLE_SIGNING_MARKER)) return podfile;

  const resourceBundleSigning = `
  ${RESOURCE_BUNDLE_SIGNING_MARKER}
  puts '[RhythmWidget Signing Debug] scanning Pods project targets for resource bundles'
  resource_bundle_target_count = 0
  installer.pods_project.targets.each do |target|
    target_product_type = target.respond_to?(:product_type) ? target.product_type.to_s : ''
    target_product_name = target.respond_to?(:product_name) ? target.product_name.to_s : ''
    target_symbol_type = target.respond_to?(:symbol_type) ? target.symbol_type.to_s : ''
    is_resource_bundle = target_product_type == 'com.apple.product-type.bundle' ||
      target_product_name.end_with?('.bundle') ||
      target.name.to_s.end_with?('.bundle') ||
      target_symbol_type == 'bundle'
    next unless is_resource_bundle
    resource_bundle_target_count += 1

    target.build_configurations.each do |build_config|
      build_config.build_settings['DEVELOPMENT_TEAM'] = 'KV26KLUSL6'
      build_config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
      build_config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
      build_config.build_settings['EXPANDED_CODE_SIGN_IDENTITY'] = ''
      puts "[RhythmWidget Signing Debug] applied target=#{target.name} configuration=#{build_config.name} product_type=#{target_product_type} product_name=#{target_product_name} DEVELOPMENT_TEAM=#{build_config.build_settings['DEVELOPMENT_TEAM']} CODE_SIGNING_ALLOWED=#{build_config.build_settings['CODE_SIGNING_ALLOWED']} CODE_SIGNING_REQUIRED=#{build_config.build_settings['CODE_SIGNING_REQUIRED']}"
    end
  end
  puts "[RhythmWidget Signing Debug] resource_bundle_target_count=#{resource_bundle_target_count}"
`;
  const postInstall = 'post_install do |installer|';
  if (podfile.includes(postInstall)) {
    return podfile.replace(postInstall, `${postInstall}${resourceBundleSigning}`);
  }
  return `${podfile.trimEnd()}\n\npost_install do |installer|${resourceBundleSigning}end\n`;
}

function patchGeneratedPodfile(iosRoot) {
  const podfilePath = path.join(iosRoot, 'Podfile');
  if (!fs.existsSync(podfilePath)) return;
  const podfile = fs.readFileSync(podfilePath, 'utf8');
  const patched = configureResourceBundleSigning(podfile);
  if (patched !== podfile) fs.writeFileSync(podfilePath, patched);
}

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
    // Run after the generated Podfile has been finalized. This keeps the
    // resource-bundle signing workaround effective even when another Expo
    // mod writes the Podfile after withPodfile callbacks are evaluated.
    patchGeneratedPodfile(nextConfig.modRequest.platformProjectRoot);
    return nextConfig;
  }]);
  config = withPodfile(config, (nextConfig) => {
    nextConfig.modResults.contents = configureResourceBundleSigning(nextConfig.modResults.contents);
    return nextConfig;
  });
  config = withXcodeProject(config, (nextConfig) => {
    addWidgetTarget(nextConfig.modResults);
    return nextConfig;
  });
  return config;
};
