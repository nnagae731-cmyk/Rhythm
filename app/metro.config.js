const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
const resolve = config.resolver.resolveRequest;
// noble 1.x's browser map points at crypto.js, absent from its exports map.
// Resolve ONLY this alias to the browser global shim, never Node's crypto.
const cryptoShim = path.join(path.dirname(require.resolve('@noble/hashes/sha2')), 'crypto.js');
config.resolver.resolveRequest = (context, name, platform) => {
  if (name === '@noble/hashes/crypto' || name === '@noble/hashes/crypto.js') return { type: 'sourceFile', filePath: cryptoShim };
  return resolve ? resolve(context, name, platform) : context.resolveRequest(context, name, platform);
};
module.exports = config;
