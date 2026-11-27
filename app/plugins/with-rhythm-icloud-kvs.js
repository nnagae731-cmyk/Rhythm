const { withEntitlementsPlist } = require('expo/config-plugins');

// KVS only. The upstream CloudSettings plugin also enables CloudKit, which
// Rhythm does not use. Do not add CloudKit containers/services or push here.
module.exports = function withRhythmICloudKvs(config) {
  return withEntitlementsPlist(config, mod => {
    const key = 'com.apple.developer.ubiquity-kvstore-identifier';
    const identifier = '$(TeamIdentifierPrefix)$(CFBundleIdentifier)';
    if (mod.modResults[key] && mod.modResults[key] !== identifier) {
      throw new Error('Unexpected existing iCloud KVS identifier; review before changing containers.');
    }
    mod.modResults[key] = identifier;
    return mod;
  });
};
