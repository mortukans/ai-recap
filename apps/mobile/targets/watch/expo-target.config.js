/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'watch',
  name: 'AIRecapWatch',
  displayName: 'AI Recap',
  // Apple Watch SE (2023) ships with watchOS 10; 10.0 keeps every current watch in range.
  deploymentTarget: '10.0',
  // Leading dot → appended to the iOS app's bundle id: lv.airecap.app.watchkitapp
  bundleIdentifier: '.watchkitapp',
  frameworks: ['SwiftUI', 'WatchConnectivity'],
  colors: { $accent: '#208AEF' },
  // App Store / TestFlight uploads require a watch app icon (1024x1024, no alpha needed by Xcode).
  icon: '../../assets/images/icon.png',
});
