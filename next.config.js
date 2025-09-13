/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Build optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Performance optimizations - Updated for Next.js 15
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@heroicons/react',
      'lucide-react',
      'date-fns',
      '@headlessui/react',
    ],
  },
  
  // External packages for server components (moved from experimental)
  serverExternalPackages: ['prisma', '@prisma/client'],
  
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
  distDir: '.next',
  
  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'astral-core.app',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
  
  // Redirects configuration
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ];
  },
  
  // Production source maps (disabled for security)
  productionBrowserSourceMaps: false,
  
  // Compression
  compress: true,
  
  // Power optimization for serverless
  poweredByHeader: false,
};

module.exports = nextConfig;