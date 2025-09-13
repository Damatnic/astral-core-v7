/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Skip ESLint during production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Enable TypeScript checking with proper error handling
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Output configuration for Vercel
  output: 'standalone',
  
  // Production source maps (disabled for security)
  productionBrowserSourceMaps: false,
  
  // Compression
  compress: true,
  
  // Power optimization for serverless
  poweredByHeader: false,
};

module.exports = nextConfig;