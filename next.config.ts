import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable experimental features for better code splitting
  experimental: {
    // Optimize CSS loading
    optimizeCss: true,
  },

  // Enable gzip compression
  compress: true,

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },

  // Fix Windows path issues
  webpack: (config) => {
    // Fix for Windows EISDIR error
    if (process.platform === 'win32') {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
      };
    }
    return config;
  },

};

export default nextConfig;
