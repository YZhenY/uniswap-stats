module.exports = function override(config, env) {
  // Add fallbacks for Node.js polyfills
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "path": require.resolve("path-browserify"),
    "os": require.resolve("os-browserify/browser"),
    "url": require.resolve("url/"),
    "util": require.resolve("util/"),
    "fs": false,
    "net": false,
    "tls": false,
    "dns": false,
    "child_process": false,
    "crypto": false
  };
  
  // Add TypeScript compiler options
  if (config.module) {
    const tsRule = config.module.rules.find(
      rule => rule.test && rule.test.toString().includes('tsx')
    );
    
    if (tsRule && tsRule.use) {
      const tsLoader = tsRule.use.find(
        use => use.loader && use.loader.includes('ts-loader')
      );
      
      if (tsLoader) {
        tsLoader.options = tsLoader.options || {};
        tsLoader.options.compilerOptions = {
          ...tsLoader.options.compilerOptions,
          target: 'es2015',
          downlevelIteration: true
        };
      }
    }
  }

  return config;
};
