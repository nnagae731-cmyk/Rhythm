jest.mock('expo/metro-config', () => ({ getDefaultConfig: jest.fn(() => ({ resolver: { resolveRequest: jest.fn(() => 'default-resolver') } })) }));
test('SHA-256依存だけをブラウザshimへ解決し、他のMetro解決を変えない', () => {
  const fs = require('fs'); const config = require('../metro.config');
  const a = config.resolver.resolveRequest({}, '@noble/hashes/crypto', 'ios');
  const b = config.resolver.resolveRequest({}, '@noble/hashes/crypto.js', 'android');
  expect(a).toEqual(b); expect(a.type).toBe('sourceFile'); expect(a.filePath).toMatch(/crypto\.js$/);
  const source = fs.readFileSync(a.filePath, 'utf8');
  expect(source).toContain('globalThis.crypto'); expect(source).not.toContain('node:crypto');
  expect(config.resolver.resolveRequest({}, 'react-native', 'ios')).toBe('default-resolver');
});
