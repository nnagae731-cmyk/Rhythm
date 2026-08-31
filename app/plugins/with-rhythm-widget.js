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
    end
  end
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

function unquoteXcodeValue(value) {
  return String(value ?? '').replace(/^"|"$/g, '');
}

function findNativeTarget(project, targetName) {
  const targets = project.pbxNativeTargetSection();
  for (const key of Object.keys(targets)) {
    if (key.endsWith('_comment')) continue;
    const target = targets[key];
    if (target?.isa !== 'PBXNativeTarget') continue;
    if (unquoteXcodeValue(target.name) === targetName) return { uuid: key, ...target };
  }
  return null;
}

function getWidgetBuildConfigurations(project, configurationListId) {
  const lists = project.pbxXCConfigurationList?.() ?? {};
  const buildConfigurations = project.pbxXCBuildConfigurationSection?.() ?? {};
  const rawListId = typeof configurationListId === 'object'
    ? configurationListId.value
    : configurationListId;
  const listId = unquoteXcodeValue(rawListId);
  const configurationList = lists[listId] ?? lists[`"${listId}"`];
  if (!configurationList || !Array.isArray(configurationList.buildConfigurations)) return [];

  return configurationList.buildConfigurations
    .map((entry) => {
      const rawConfigurationId = typeof entry === 'object' ? entry.value : entry;
      const configurationId = unquoteXcodeValue(rawConfigurationId);
      return [configurationId, buildConfigurations[configurationId] ?? buildConfigurations[`"${configurationId}"`]];
    })
    .filter(([, configuration]) => configuration?.isa === 'XCBuildConfiguration');
}

function configureWidgetBuildConfigurations(project, target) {
  if (!target?.buildConfigurationList) return;

  // Resolve the list attached to this PBXNativeTarget directly. The generic
  // XcodeUtils helper can miss newly-created target lists when the project
  // parser retains quoted UUID keys; mutating a global configuration set would
  // also risk applying Widget settings to the app or Pods targets.
  const configurations = getWidgetBuildConfigurations(project, target.buildConfigurationList);
  configurations.forEach(([, configuration]) => {
    const buildSettings = configuration.buildSettings ?? (configuration.buildSettings = {});
    buildSettings.INFOPLIST_FILE = `${TARGET_NAME}/${TARGET_NAME}-Info.plist`;
    buildSettings.CODE_SIGN_ENTITLEMENTS = `${TARGET_NAME}/${TARGET_NAME}.entitlements`;
    buildSettings.DEVELOPMENT_TEAM = 'KV26KLUSL6';
    buildSettings.CODE_SIGN_STYLE = 'Automatic';
    buildSettings.PRODUCT_BUNDLE_IDENTIFIER = BUNDLE_IDENTIFIER;
    buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '15.1';
    buildSettings.APPLICATION_EXTENSION_API_ONLY = 'YES';
    buildSettings.TARGETED_DEVICE_FAMILY = '1';
    buildSettings.SWIFT_VERSION = '5.0';
    // Keep the Widget extension's Swift module distinct from the local
    // RhythmWidget Expo module pod imported by ExpoModulesProvider.
    buildSettings.PRODUCT_MODULE_NAME = 'RhythmWidgetExtension';
  });
}

function findWidgetSourceGroup(project) {
  const groups = project.getPBXObject('PBXGroup') ?? {};
  return Object.keys(groups)
    .filter((key) => !key.endsWith('_comment'))
    .map((uuid) => ({ uuid, group: groups[uuid] }))
    .find(({ group }) => (
      group?.isa === 'PBXGroup'
      && unquoteXcodeValue(group.name) === TARGET_NAME
      && unquoteXcodeValue(group.path) === TARGET_NAME
    ));
}

function ensureWidgetSourceGroup(project) {
  const existing = findWidgetSourceGroup(project);
  const groupEntry = existing ?? (() => {
    const created = project.addPbxGroup(TEMPLATE_FILES, TARGET_NAME, TARGET_NAME);
    return { uuid: created.uuid, group: created.pbxGroup };
  })();

  // addPbxGroup creates an orphan PBXGroup. Attach it to the project's main
  // group so its <group>-relative file references resolve under ios/RhythmWidget.
  const mainGroupUuid = project.getFirstProject()?.firstProject?.mainGroup;
  const groups = project.getPBXObject('PBXGroup') ?? {};
  const mainGroup = mainGroupUuid ? groups[mainGroupUuid] : null;
  if (mainGroup && Array.isArray(mainGroup.children) && !mainGroup.children.some((child) => child.value === groupEntry.uuid)) {
    project.addToPbxGroup(groupEntry.uuid, mainGroupUuid);
  }

  return groupEntry;
}

function ensureWidgetSourceFiles(project, target) {
  const sourceNames = ['RhythmWidget.swift', 'RhythmWidgetBundle.swift'];
  const { group } = ensureWidgetSourceGroup(project);
  const fileReferences = project.getPBXObject('PBXFileReference') ?? {};
  const buildFiles = project.pbxBuildFileSection();

  const sourceRefs = sourceNames.map((fileName) => {
    let child = (group.children ?? []).find((candidate) => unquoteXcodeValue(candidate.comment) === fileName);
    if (!child) {
      const refUuid = project.generateUuid();
      fileReferences[refUuid] = {
        isa: 'PBXFileReference',
        name: `"${fileName}"`,
        path: `"${fileName}"`,
        sourceTree: '"<group>"',
        fileEncoding: 4,
        lastKnownFileType: 'sourcecode.swift',
        includeInIndex: 0,
      };
      fileReferences[`${refUuid}_comment`] = fileName;
      child = { value: refUuid, comment: fileName };
      group.children = [...(group.children ?? []), child];
    }
    const ref = fileReferences[child.value];
    if (ref) {
      // Keep the path relative to the RhythmWidget PBXGroup. This is what
      // makes Xcode resolve ios/RhythmWidget/<source>.swift.
      ref.path = `"${fileName}"`;
      ref.name = `"${fileName}"`;
      ref.sourceTree = '"<group>"';
    }
    return { fileName, refUuid: child.value };
  });

  const phases = project.getPBXObject('PBXSourcesBuildPhase') ?? {};
  const targetPhases = target.buildPhases ?? [];
  let sourcePhase = targetPhases
    .map((entry) => phases[entry.value])
    .find((phase) => phase?.isa === 'PBXSourcesBuildPhase');
  if (!sourcePhase) {
    const created = project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    sourcePhase = phases[created.uuid] ?? created.buildPhase;
  }
  sourcePhase.files = Array.isArray(sourcePhase.files) ? sourcePhase.files : [];

  const sourceRefIds = new Set(sourceRefs.map((source) => source.refUuid));
  // Remove stale source entries for these two files (including the old
  // ios/RhythmWidget.swift references) before adding the group-owned refs.
  sourcePhase.files = sourcePhase.files.filter((entry) => {
    const buildFile = buildFiles[entry.value];
    return !buildFile || !sourceNames.includes(unquoteXcodeValue(buildFile.fileRef_comment)) || sourceRefIds.has(buildFile.fileRef);
  });

  for (const { fileName, refUuid } of sourceRefs) {
    let buildFileUuid = Object.keys(buildFiles).find((key) => (
      !key.endsWith('_comment') && buildFiles[key]?.isa === 'PBXBuildFile' && buildFiles[key].fileRef === refUuid
    ));
    if (!buildFileUuid) {
      buildFileUuid = project.generateUuid();
      buildFiles[buildFileUuid] = {
        isa: 'PBXBuildFile',
        fileRef: refUuid,
        fileRef_comment: fileName,
      };
      buildFiles[`${buildFileUuid}_comment`] = `"${fileName}" in Sources`;
    }
    if (!sourcePhase.files.some((entry) => entry.value === buildFileUuid)) {
      sourcePhase.files.push({ value: buildFileUuid, comment: `"${fileName}" in Sources` });
    }
  }

}

function addWidgetTarget(project) {
  const existingTarget = findNativeTarget(project, TARGET_NAME);
  if (!existingTarget) {
    project.addTarget(TARGET_NAME, 'app_extension', TARGET_NAME, BUNDLE_IDENTIFIER);
    const target = findNativeTarget(project, TARGET_NAME);
    if (!target) throw new Error(`Unable to resolve generated ${TARGET_NAME} PBXNativeTarget`);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
  }
  const target = findNativeTarget(project, TARGET_NAME);
  if (!target) throw new Error(`Unable to resolve ${TARGET_NAME} PBXNativeTarget`);
  ensureWidgetSourceFiles(project, target);
  // Apply values directly to the target's configuration list so the settings
  // are attached to the exact PBXNativeTarget used by archive.
  configureWidgetBuildConfigurations(project, target);
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
