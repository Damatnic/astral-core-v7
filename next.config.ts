import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable experimental features for better code splitting
  experimental: {
    // Optimize CSS loading
    optimizeCss: true
  },

  // Enable gzip compression
  compress: true,

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif']
  },

  // Fix Windows path issues
  webpack: (config, { isServer }) => {
    // Fix for Windows EISDIR error
    if (process.platform === 'win32') {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/
      };
      
      // Disable symlink resolution that causes EISDIR errors
      config.resolve = {
        ...config.resolve,
        symlinks: false
      };
      
      // Add fallback for fs module
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false
        };
      }
    }
    
    // Disable webpack cache that causes issues
    config.cache = false;
    
    return config;
  }
};

export default nextConfig;
