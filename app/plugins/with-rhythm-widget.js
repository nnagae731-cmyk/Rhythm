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

function declareEasAppExtension(config) {
  const eas = config.extra?.eas ?? {};
  const build = eas.build ?? {};
  const experimental = build.experimental ?? {};
  const ios = experimental.ios ?? {};
  const appExtensions = Array.isArray(ios.appExtensions) ? ios.appExtensions : [];
  const extension = {
    targetName: TARGET_NAME,
    bundleIdentifier: BUNDLE_IDENTIFIER,
    entitlements: {
      'com.apple.security.application-groups': [APP_GROUP],
    },
  };
  const existingIndex = appExtensions.findIndex((item) => item?.targetName === TARGET_NAME);
  const nextAppExtensions = [...appExtensions];
  if (existingIndex >= 0) {
    nextAppExtensions[existingIndex] = { ...nextAppExtensions[existingIndex], ...extension };
  } else {
    nextAppExtensions.push(extension);
  }

  return {
    ...config,
    extra: {
      ...config.extra,
      eas: {
        ...eas,
        build: {
          ...build,
          experimental: {
            ...experimental,
            ios: {
              ...ios,
              appExtensions: nextAppExtensions,
            },
          },
        },
      },
    },
  };
}

function configureResourceBundleSigning(podfile) {
  if (podfile.includes(RESOURCE_BUNDLE_SIGNING_MARKER)) return podfile;

  const resourceBundleSigning = `
  ${RESOURCE_BUNDLE_SIGNING_MARKER}
  puts '[RhythmWidget Signing Debug] scanning CocoaPods resource bundle targets'
  resource_bundle_targets = []

  # CocoaPods exposes generated resource bundles through installation results.
  # These targets are not always discoverable by product_type on pods_project.targets.
  if installer.respond_to?(:target_installation_results)
    installer.target_installation_results.pod_target_installation_results.each do |pod_name, target_installation_result|
      next unless target_installation_result.respond_to?(:resource_bundle_targets)
      target_installation_result.resource_bundle_targets.each do |target|
        resource_bundle_targets << [target, "pod=#{pod_name}"] if target
      end
    end
  end

  # Keep a project scan as a compatibility fallback for CocoaPods versions that
  # do not expose resource_bundle_targets in their installation result.
  installer.pods_project.targets.each do |target|
    target_product_type = target.respond_to?(:product_type) ? target.product_type.to_s : ''
    target_product_name = target.respond_to?(:product_name) ? target.product_name.to_s : ''
    target_symbol_type = target.respond_to?(:symbol_type) ? target.symbol_type.to_s : ''
    is_resource_bundle = target_product_type == 'com.apple.product-type.bundle' ||
      target_product_name.end_with?('.bundle') ||
      target.name.to_s.end_with?('.bundle') ||
      target_symbol_type == 'bundle'
    resource_bundle_targets << [target, 'pods_project'] if is_resource_bundle
  end

  seen_resource_bundle_targets = {}
  resource_bundle_targets.each do |target, source|
    target_key = target.respond_to?(:uuid) ? target.uuid.to_s : target.object_id.to_s
    next if seen_resource_bundle_targets[target_key]
    seen_resource_bundle_targets[target_key] = true

    target_product_type = target.respond_to?(:product_type) ? target.product_type.to_s : ''
    target_product_name = target.respond_to?(:product_name) ? target.product_name.to_s : ''
    target.build_configurations.each do |build_config|
      build_config.build_settings['DEVELOPMENT_TEAM'] = 'KV26KLUSL6'
      build_config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
      build_config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
      build_config.build_settings['EXPANDED_CODE_SIGN_IDENTITY'] = ''
      puts "[RhythmWidget Signing Debug] applied source=#{source} target=#{target.name} configuration=#{build_config.name} product_type=#{target_product_type} product_name=#{target_product_name} DEVELOPMENT_TEAM=#{build_config.build_settings['DEVELOPMENT_TEAM']} CODE_SIGNING_ALLOWED=#{build_config.build_settings['CODE_SIGNING_ALLOWED']} CODE_SIGNING_REQUIRED=#{build_config.build_settings['CODE_SIGNING_REQUIRED']}"
    end
  end
  puts "[RhythmWidget Signing Debug] resource_bundle_target_count=#{seen_resource_bundle_targets.length}"
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
  const existingTarget = project.pbxTargetByName(TARGET_NAME);
  const target = existingTarget ?? project.addTarget(TARGET_NAME, 'app_extension', TARGET_NAME, BUNDLE_IDENTIFIER);
  if (!existingTarget) {
    project.addPbxGroup(TEMPLATE_FILES, TARGET_NAME, TARGET_NAME);
    project.addBuildPhase(['RhythmWidget.swift', 'RhythmWidgetBundle.swift'], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
  }
  project.updateBuildProperty('INFOPLIST_FILE', `${TARGET_NAME}/RhythmWidget-Info.plist`, null, TARGET_NAME);
  project.updateBuildProperty('CODE_SIGN_ENTITLEMENTS', `${TARGET_NAME}/RhythmWidget.entitlements`, null, TARGET_NAME);
  project.updateBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', BUNDLE_IDENTIFIER, null, TARGET_NAME);
  project.updateBuildProperty('DEVELOPMENT_TEAM', 'KV26KLUSL6', null, TARGET_NAME);
  project.updateBuildProperty('CODE_SIGN_STYLE', 'Automatic', null, TARGET_NAME);
  project.updateBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '15.1', null, TARGET_NAME);
  project.updateBuildProperty('SWIFT_VERSION', '5.0', null, TARGET_NAME);
  project.updateBuildProperty('APPLICATION_EXTENSION_API_ONLY', 'YES', null, TARGET_NAME);
  project.updateBuildProperty('TARGETED_DEVICE_FAMILY', '1', null, TARGET_NAME);
}

module.exports = function withRhythmWidget(config) {
  config = declareEasAppExtension(config);
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
