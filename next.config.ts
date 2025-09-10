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

};

export default nextConfig;
