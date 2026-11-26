const path = require('path');
const { evaluateReleaseConfig, evaluateMetadata, inspectLocalFiles } = require('../scripts/release-preflight.cjs');
const app = require('../app.json').expo;
const eas = require('../eas.json');
const metadata = require('../../docs/release/app-store-ja.json');
const clone = value => JSON.parse(JSON.stringify(value));

test('公開前のLOCAL設定・掲載文・Nativeファイルを実ファイルから検査する', () => {
  const checks = inspectLocalFiles(path.resolve(__dirname, '../..'));
  expect(checks.length).toBeGreaterThan(20);
  expect(checks.filter(c => !c.ok)).toEqual([]);
});

test('提出用設定へのDevelopment Client・テスト広告・権限固定・Widget無効化の混入を検出する', () => {
  const next = clone(eas);
  next.build.production.developmentClient = true;
  next.build.production.distribution = 'internal';
  next.build.production.env.EXPO_PUBLIC_RHYTHM_PLAN = 'premium';
  next.build.production.env.RHYTHM_ENABLE_WIDGET = 'false';
  next.build.production.env.EXPO_PUBLIC_RHYTHM_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1712485313';
  const failed = evaluateReleaseConfig(app, next).filter(c => !c.ok).map(c => c.id);
  expect(failed).toEqual(expect.arrayContaining(['store-build', 'no-forced-premium', 'widget-enabled', 'EXPO_PUBLIC_RHYTHM_REWARDED_AD_UNIT_ID']));
  expect(failed).toHaveLength(4);
});

test('App Group・Live Activity・必須プロファイルの欠落を検出する', () => {
  const next = clone(app);
  next.ios.entitlements['com.apple.security.application-groups'] = ['group.wrong'];
  next.ios.infoPlist.NSSupportsLiveActivities = false;
  const failed = evaluateReleaseConfig(next, { build: {} }).filter(c => !c.ok).map(c => c.id);
  expect(failed).toEqual(expect.arrayContaining(['production-profile', 'store-build', 'app-group', 'live-activity']));
});

test('掲載文の長さ・空欄・認証情報付きURLを検出し、元の下書きを変更しない', () => {
  const next = clone(metadata);
  next.name = '長'.repeat(31); next.description = ''; next.keywords = '字'.repeat(34);
  next.supportUrl = 'https://user:secret@example.com';
  const failed = evaluateMetadata(next).filter(c => !c.ok).map(c => c.id);
  expect(failed).toEqual(['metadata-name', 'metadata-description', 'metadata-keywords', 'metadata-supportUrl']);
  expect(evaluateMetadata(metadata).every(c => c.ok)).toBe(true);
});

test('ローカルのサポートFAQは本番Widget全種類と、データ復元の範囲を案内する', () => {
  const fs = require('fs');
  const { WIDGET_TYPE_OPTIONS } = require('../features/widget/widgetSettings');
  const html = fs.readFileSync(path.resolve(__dirname, '../../support-site/support.html'), 'utf8');
  for (const option of WIDGET_TYPE_OPTIONS) expect(html).toContain(`「${option.label}」`);
  expect(html).toContain(`${WIDGET_TYPE_OPTIONS.length}種類`);
  expect(html).toContain('購入の復元は利用権限を復元するもの');
  expect(html).not.toContain('現在は「今はこれ」「次の予定」「今はこれ＋次の予定」');
});
