import path from 'path';
import { merge } from 'lodash-es';
import { createTmpDirRoot } from './modules/utils-server.js';

// Ensure the Temp directory root exists
createTmpDirRoot();

// Helper function to resolve paths correctly on Windows
const resolvePath = (relativePath) => {
  const resolvedPath = path.resolve(new URL('.', import.meta.url).pathname, relativePath);
  // Remove the doubled drive letter on Windows
  return resolvedPath.replace(/^([A-Z]):\\([A-Z]):/, '$1:');
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable cacheTag
  experimental: {
    dynamicIO: true,
  },

  // Modify Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add Webpack aliases
    const newAliases = {
      '@': resolvePath('./'),
      '@api': resolvePath('./app/api'),
      '@components': resolvePath('./components'),
      '@handlers': resolvePath('./modules/handlers'),
      '@modules': resolvePath('./modules'),
    };

    config.resolve.alias = merge(config.resolve.alias, newAliases);

    console.log('newAliases', newAliases);

    return config;
  },
};

export default nextConfig;
