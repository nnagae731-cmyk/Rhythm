const withWidget = require('../plugins/with-rhythm-widget');
const configureApp = require('../app.config');

async function applyPodProperties(properties) {
  const config = withWidget({ name: 'QA', slug: 'qa' });
  return (await config.mods.ios.podfileProperties({
    ...config,
    modResults: { ...properties },
    modRequest: { platform: 'ios', modName: 'podfileProperties' },
  })).modResults;
}

test('Widget enabled sets the CocoaPods deployment target required by its podspec', async () => {
  const properties = await applyPodProperties({});
  expect(properties['ios.deploymentTarget']).toBe('17.0');
  const fs = require('fs');
  const path = require('path');
  const spec = fs.readFileSync(path.join(__dirname, '../modules/rhythm-widget/ios/RhythmWidget.podspec'), 'utf8');
  expect(spec).toContain(":ios => '17.0'");
});

test('Pod properties update preserves other settings and is idempotent', async () => {
  const properties = await applyPodProperties({ 'ios.deploymentTarget': '15.1', 'expo.jsEngine': 'hermes', 'ios.useFrameworks': 'static' });
  expect(properties).toEqual({ 'ios.deploymentTarget': '17.0', 'expo.jsEngine': 'hermes', 'ios.useFrameworks': 'static' });
  expect(await applyPodProperties(properties)).toEqual(properties);
});

test('Widget opt-out does not apply the Widget deployment target plugin', () => {
  const previous = process.env.RHYTHM_ENABLE_WIDGET;
  try {
    process.env.RHYTHM_ENABLE_WIDGET = 'false';
    expect(configureApp({}).plugins).not.toContain('./plugins/with-rhythm-widget');
    process.env.RHYTHM_ENABLE_WIDGET = 'true';
    expect(configureApp({}).plugins).toContain('./plugins/with-rhythm-widget');
  } finally {
    if (previous === undefined) delete process.env.RHYTHM_ENABLE_WIDGET;
    else process.env.RHYTHM_ENABLE_WIDGET = previous;
  }
});
