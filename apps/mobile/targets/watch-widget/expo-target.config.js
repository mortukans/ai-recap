/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  // WidgetKit accessory widget for the watch face / Smart Stack: one tap → the watch app opens and
  // starts recording (deep link `airecap-watch://record`). Embedded in the AIRecapWatch target.
  type: 'watch-widget',
  name: 'AIRecapWatchWidget',
  displayName: 'AI Recap',
  deploymentTarget: '10.0',
  // Must be prefixed by the watch app's bundle id: lv.airecap.app.watchkitapp.recordwidget
  bundleIdentifier: '.watchkitapp.recordwidget',
  colors: { $accent: '#208AEF' },
});
