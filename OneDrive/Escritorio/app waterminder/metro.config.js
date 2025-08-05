const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure platform-specific file resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.sourceExts.push('sql');

module.exports = config;