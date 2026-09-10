// Metro config for the pnpm monorepo: watch the workspace root and resolve hoisted node_modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so changes in packages/* and modules/* trigger reloads.
config.watchFolders = [workspaceRoot];

// Resolve modules from both the app and the hoisted root store.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Drizzle bundles migrations as imported .sql files.
config.resolver.sourceExts.push('sql');

module.exports = config;
