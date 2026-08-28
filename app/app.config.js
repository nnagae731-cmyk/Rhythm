const WIDGET_PLUGIN = './plugins/with-rhythm-widget';
const TOGGLE_PLUGIN = './plugins/with-rhythm-widget-toggle';

function isWidgetEnabled() {
  const value = String(process.env.RHYTHM_ENABLE_WIDGET ?? '').trim().toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(value);
}

module.exports = ({ config }) => {
  const baseConfig = config ?? {};
  const existingPlugins = Array.isArray(baseConfig.plugins) ? baseConfig.plugins : [];
  const plugins = existingPlugins.filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== WIDGET_PLUGIN && name !== TOGGLE_PLUGIN;
  });

  if (isWidgetEnabled()) plugins.push(WIDGET_PLUGIN);
  plugins.push(TOGGLE_PLUGIN);

  return {
    ...baseConfig,
    plugins,
  };
};
