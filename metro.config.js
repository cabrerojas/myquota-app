const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Keep Metro out of local opencode tooling files under the app root.
config.resolver.blockList = [].concat(
  config.resolver.blockList ?? [],
  /\.opencode[\\/].*/,
);

module.exports = config;
