/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization for problematic pages during deployment
  experimental: {
    forceSwcTransforms: true,
  },
  
  // Skip ESLint during build if not available (fixes Vercel production builds)
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  
  // Disable static generation to focus on successful deployment
  trailingSlash: false,
  
  // Webpack config for better SSR handling
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve server-only modules on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  // Runtime configuration
  env: {
    CUSTOM_KEY: 'my-value',
  },
  
  // Disable image optimization for faster builds
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig;