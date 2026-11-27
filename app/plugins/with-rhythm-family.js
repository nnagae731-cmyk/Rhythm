const { withEntitlementsPlist, withInfoPlist, withAppDelegate, withPodfileProperties } = require('expo/config-plugins');
const CONTAINER = 'iCloud.app.rhythm.daily.family';
const marker = '// RhythmFamily CloudKit invitation bridge';
function familyEntitlements(existing) {
  return {
    ...existing,
    'com.apple.developer.icloud-container-identifiers': [...new Set([...(existing['com.apple.developer.icloud-container-identifiers'] ?? []), CONTAINER])],
    'com.apple.developer.icloud-services': [...new Set([...(existing['com.apple.developer.icloud-services'] ?? []), 'CloudKit'])],
    'aps-environment': existing['aps-environment'] ?? 'development',
  };
}
function familyInfo(existing) {
  if (existing.UIApplicationSceneManifest) throw Error('RhythmFamily: scene-based lifecycle needs a SceneDelegate invitation bridge.');
  return { ...existing, CKSharingSupported: true, UIBackgroundModes: [...new Set([...(existing.UIBackgroundModes ?? []), 'remote-notification'])] };
}
function patchDelegate(source) {
  if (source.includes(marker)) return source;
  if (source.includes('userDidAcceptCloudKitShareWith')) throw Error('Existing CloudKit invitation handler: merge explicitly.');
  const declaration = /((?:public\s+)?class\s+AppDelegate\s*:\s*ExpoAppDelegate\s*\{)/;
  if (!declaration.test(source)) throw Error('RhythmFamily requires the Expo SDK 54 Swift AppDelegate; review manually.');
  return 'import CloudKit\nimport RhythmFamily\n' + source.replace(declaration, `$1
  ${marker}
  public func application(_ application: UIApplication, userDidAcceptCloudKitShareWith metadata: CKShare.Metadata) {
    RhythmFamilyInvitationBridge.accept(metadata)
  }
`);
}
function withRhythmFamily(config) {
  config = withEntitlementsPlist(config, mod => {
    mod.modResults = familyEntitlements(mod.modResults);
    return mod;
  });
  config = withInfoPlist(config, mod => {
    mod.modResults = familyInfo(mod.modResults);
    return mod;
  });
  config = withPodfileProperties(config, mod => {
    const target = Number.parseFloat(mod.modResults['ios.deploymentTarget'] ?? '17.0');
    mod.modResults['ios.deploymentTarget'] = String(Math.max(17, target));
    return mod;
  });
  return withAppDelegate(config, mod => {
    if (mod.modResults.language !== 'swift') throw Error('RhythmFamily requires Swift AppDelegate.');
    mod.modResults.contents = patchDelegate(mod.modResults.contents);
    return mod;
  });
}
module.exports = withRhythmFamily;
module.exports.patchDelegate = patchDelegate;
module.exports.CONTAINER = CONTAINER;
module.exports.familyEntitlements = familyEntitlements;
module.exports.familyInfo = familyInfo;
