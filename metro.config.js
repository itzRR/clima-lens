const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package exports for react-leaflet and other ESM packages
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'import', 'react-native'];
config.resolver.sourceExts.push('mjs', 'cjs');

module.exports = config;
