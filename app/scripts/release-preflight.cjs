#!/usr/bin/env node
'use strict';

// Read-only local checks. No EAS commands, HTTP requests, builds or account writes.
const fs = require('node:fs');
const path = require('node:path');

function evaluateReleaseConfig(app, eas) {
  const checks = [];
  const add = (id, ok, detail) => checks.push({ id, ok: Boolean(ok), detail });
  const production = eas.build?.production;
  const env = production?.env ?? {};
  add('production-profile', production, 'productionプロファイルが存在する');
  add('store-build', production && production.developmentClient !== true
    && (!production.distribution || production.distribution === 'store'), 'Development Client / internal配布を提出用と混同しない');
  add('bundle-id', app.ios?.bundleIdentifier === 'app.rhythm.daily', '既存のBundle IDを維持する');
  add('version', /^\d+\.\d+\.\d+$/.test(app.version ?? ''), 'versionの形式が有効（公開版の番号の承認は別）');
  add('build-number', /^\d+$/.test(app.ios?.buildNumber ?? ''), 'buildNumberの形式が有効（ASC上の未使用確認は別）');
  add('no-forced-premium', env.EXPO_PUBLIC_RHYTHM_PLAN !== 'premium', 'productionでPremium権限を一律付与しない');
  add('widget-enabled', !['false', 'off', '0', 'no'].includes(String(env.RHYTHM_ENABLE_WIDGET ?? '').trim().toLowerCase()), 'productionでWidgetを無効化しない');
  const plugins = (app.plugins ?? []).map(p => Array.isArray(p) ? p[0] : p);
  add('widget-plugin', plugins.includes('./plugins/with-rhythm-widget'), '既存Widget pluginがある');
  add('app-group', app.ios?.entitlements?.['com.apple.security.application-groups']?.includes('group.app.rhythm.daily'), '本体のApp Groupが一致する');
  add('live-activity', app.ios?.infoPlist?.NSSupportsLiveActivities === true, 'Live ActivityのInfo.plist設定がある');
  add('production-ads', env.RHYTHM_ADS_ENV === 'production' && env.EXPO_PUBLIC_RHYTHM_ADS_ENV === 'production', 'productionの広告環境が明示されている');
  for (const key of ['EXPO_PUBLIC_RHYTHM_BANNER_AD_UNIT_ID', 'EXPO_PUBLIC_RHYTHM_REWARDED_AD_UNIT_ID']) {
    const value = env[key] ?? '';
    add(key, /^ca-app-pub-\d+\/\d+$/.test(value) && !value.includes('3940256099942544'), `${key}に本番形式のIDがある（AdMobでの有効性は別）`);
  }
  return checks;
}

function evaluateMetadata(metadata) {
  const checks = [];
  for (const [key, limit] of [['name', 30], ['subtitle', 30], ['promotionalText', 170], ['description', 4000]]) {
    const value = metadata[key];
    const length = typeof value === 'string' ? Array.from(value).length : 0;
    checks.push({ id: `metadata-${key}`, ok: length > 0 && length <= limit, detail: `${key}: ${length}/${limit}文字` });
  }
  const keywords = metadata.keywords ?? '';
  const keywordBytes = Buffer.byteLength(keywords, 'utf8');
  // Conservative local check: stay within 100 UTF-8 bytes as well as 100 characters.
  checks.push({ id: 'metadata-keywords', ok: keywords.length > 0 && keywordBytes <= 100, detail: `keywords: ${keywordBytes}/100 UTF-8 bytes（保守的な検査）` });
  for (const key of ['supportUrl', 'privacyUrl']) {
    let ok = false;
    try { const url = new URL(metadata[key]); ok = url.protocol === 'https:' && !url.username && !url.password; } catch { /* Report as failed below. */ }
    checks.push({ id: `metadata-${key}`, ok, detail: `${key}は認証情報を含まないHTTPS URL（HTTP到達性は別）` });
  }
  return checks;
}

function inspectLocalFiles(root = path.resolve(__dirname, '../..')) {
  const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
  const app = JSON.parse(read('app/app.json')).expo;
  const eas = JSON.parse(read('app/eas.json'));
  const metadata = JSON.parse(read('docs/release/app-store-ja.json'));
  const checks = [...evaluateReleaseConfig(app, eas), ...evaluateMetadata(metadata)];
  const add = (id, ok, detail) => checks.push({ id, ok: Boolean(ok), detail });
  const iconPath = path.resolve(root, 'app', app.icon);
  const icon = fs.readFileSync(iconPath);
  add('app-icon', icon.length >= 24 && icon.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && icon.readUInt32BE(16) === 1024 && icon.readUInt32BE(20) === 1024, 'アイコンは1024×1024 PNG（透過・見た目・Archiveの確認は別）');
  const legal = read('app/features/legal/legalLinks.ts');
  const legalUrl = name => new RegExp(`${name}\\s*=\\s*['"]([^'"]+)['"]`).exec(legal)?.[1];
  add('support-url-matches', metadata.supportUrl === legalUrl('SUPPORT_URL'), '掲載下書きとアプリのサポートURLが一致する');
  add('privacy-url-matches', metadata.privacyUrl === legalUrl('PRIVACY_POLICY_URL'), '掲載下書きとアプリのプライバシーURLが一致する');
  const extension = read('app/widget/RhythmWidget.entitlements');
  add('extension-app-group', extension.includes('<string>group.app.rhythm.daily</string>'), 'ExtensionのApp Groupが一致する');
  for (const file of ['app/widget/RhythmWidget.swift', 'app/widget/RhythmLiveActivity.swift',
    'app/widget/RhythmLiveActivityAttributes.swift', 'app/modules/rhythm-widget/ios/RhythmWidgetModule.swift',
    'app/modules/rhythm-widget/ios/RhythmLiveActivityAttributes.swift', 'app/widget/PrivacyInfo.xcprivacy']) {
    add(`file-${file}`, fs.existsSync(path.join(root, file)), `${file}が存在する（コンパイル・SDK全体の申告は別）`);
  }
  return checks;
}

if (require.main === module) {
  console.log('RhythmPace LOCAL release preflight — 審査提出・公開を許可する判定ではありません。');
  try {
    const checks = inspectLocalFiles();
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.id}: ${check.detail}`);
    const failed = checks.filter(check => !check.ok).length;
    console.log(`LOCAL: ${checks.length - failed} PASS / ${failed} FAIL`);
    console.log('未確認: EAS側の最終環境変数・ASC・実機・署名・Xcode/SDK・広告同意・プライバシー・公開URL更新。docs/release/RELEASE_CHECKLIST.mdを参照。');
    process.exitCode = failed ? 1 : 0;
  } catch {
    console.error('FAIL: 必要なローカルファイルを読み取れません。作業ディレクトリとリリース準備ファイルを確認してください。');
    process.exitCode = 1;
  }
}

module.exports = { evaluateReleaseConfig, evaluateMetadata, inspectLocalFiles };
