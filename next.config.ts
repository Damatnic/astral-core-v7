import type { NextConfig } from 'next';

// Enable bundle analyzer when ANALYZE=true
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env['ANALYZE'] === 'true'
});

const nextConfig: NextConfig = {
  // Enable experimental features for better code splitting
  experimental: {
    // Optimize CSS loading - disabled due to missing critters dependency
    // optimizeCss: true
    optimizePackageImports: [
      '@stripe/stripe-js', 
      '@stripe/react-stripe-js', 
      'lucide-react',
      '@heroicons/react',
      '@headlessui/react',
      'react-hot-toast',
      'zustand'
    ],
    // Optimize for better tree shaking
    optimizeServerReact: true
  },

  // External packages for server components
  serverExternalPackages: ['@prisma/client'],

  // Enable gzip compression
  compress: true,

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.astral-core.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      }
    ]
  },

  // Power bundle optimization
  poweredByHeader: false,

  // CORS configuration and caching headers for optimal performance
  async headers() {
    return [
      {
        // API routes - Private data with no cache for sensitive endpoints
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://app.astral-core.com' 
              : 'http://localhost:3000'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, stripe-signature'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      },
      {
        // API routes - Payment endpoints with no cache
        source: '/api/payments/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://app.astral-core.com' 
              : 'http://localhost:3000'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, stripe-signature'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      },
      {
        // API routes - General data with short cache
        source: '/api/(files|notifications|analytics)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=60, s-maxage=0, must-revalidate'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://app.astral-core.com' 
              : 'http://localhost:3000'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, If-None-Match, If-Modified-Since'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Vary',
            value: 'Authorization, Accept-Encoding'
          }
        ]
      },
      {
        // API routes - User profile data with medium cache
        source: '/api/user/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=300, s-maxage=0, must-revalidate'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://app.astral-core.com' 
              : 'http://localhost:3000'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, If-None-Match, If-Modified-Since'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Vary',
            value: 'Authorization, Accept-Encoding'
          }
        ]
      },
      {
        // Static assets - Long cache with immutable for hashed files
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, s-maxage=31536000, immutable'
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding'
          }
        ]
      },
      {
        // Images - Long cache with revalidation
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400'
          },
          {
            key: 'Vary',
            value: 'Accept, Accept-Encoding'
          }
        ]
      },
      {
        // Fonts - Very long cache
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, s-maxage=31536000, immutable'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          }
        ]
      },
      {
        // Favicon and manifest - Medium cache
        source: '/(favicon.ico|manifest.json|robots.txt)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600'
          }
        ]
      },
      {
        // Service Worker - No cache to ensure updates
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          }
        ]
      },
      {
        // HTML pages - Short cache with revalidation
        source: '/((?!api|_next|images|fonts).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, must-revalidate'
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding, Cookie'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  },

  // Fix Windows path issues and optimize for production
  webpack: (config, { isServer, dev }) => {
    // Fix for Windows EISDIR error
    if (process.platform === 'win32') {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
        poll: 1000
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
          fs: false,
          net: false,
          tls: false
        };
      }
    }
    
    // Bundle optimization for production
    if (!dev) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        providedExports: true,
        innerGraph: true,
      };
      
      // Advanced chunk splitting for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 30,
        maxAsyncRequests: 30,
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          default: false,
          vendors: false,
          
          // React and Next.js framework
          framework: {
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            priority: 40,
            enforce: true,
          },
          
          // Large third-party libraries
          stripe: {
            chunks: 'all',
            test: /[\\/]node_modules[\\/]@stripe[\\/]/,
            name: 'stripe',
            priority: 35,
            enforce: true,
          },
          
          prisma: {
            chunks: 'all',
            test: /[\\/]node_modules[\\/]@prisma[\\/]/,
            name: 'prisma',
            priority: 35,
            enforce: true,
          },
          
          // Auth libraries
          auth: {
            chunks: 'all',
            test: /[\\/]node_modules[\\/](next-auth|jsonwebtoken|bcryptjs)[\\/]/,
            name: 'auth',
            priority: 32,
            enforce: true,
          },
          
          // State management
          state: {
            chunks: 'all',
            test: /[\\/]node_modules[\\/](zustand|react-hot-toast)[\\/]/,
            name: 'state',
            priority: 30,
            enforce: true,
          },
          
          // UI libraries
          ui: {
            chunks: 'all',
            test: /[\\/]node_modules[\\/](lucide-react|@heroicons|@headlessui)[\\/]/,
            name: 'ui',
            priority: 25,
            enforce: true,
          },
          
          // Utility libraries
          utils: {
            chunks: 'all',
            test: /[\\/]node_modules[\\/](date-fns|clsx|zod)[\\/]/,
            name: 'utils',
            priority: 22,
            enforce: true,
          },
          
          // Component-specific chunks
          dashboards: {
            chunks: 'all',
            test: /[\\/]src[\\/]components[\\/]dashboards[\\/]/,
            name: 'dashboards',
            priority: 15,
            minChunks: 1,
            enforce: true,
          },
          
          billing: {
            chunks: 'all',
            test: /[\\/]src[\\/]components[\\/]billing[\\/]/,
            name: 'billing',
            priority: 15,
            minChunks: 1,
            enforce: true,
          },
          
          analytics: {
            chunks: 'all',
            test: /[\\/]src[\\/]components[\\/](AnalyticsDashboard|performance)[\\/]/,
            name: 'analytics',
            priority: 15,
            minChunks: 1,
            enforce: true,
          },
          
          // Other vendor libraries
          vendor: {
            chunks: 'all',
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 20,
            enforce: true,
          },
          
          // Common components
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            enforce: true,
          },
        },
      };
      
      // Minimize JavaScript and CSS
      config.optimization.minimize = true;
    }
    
    // Add specific ignore patterns for problematic files
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /node_modules|\.git|\.next/
    };
    
    // Disable webpack cache that causes issues on Windows
    config.cache = false;
    
    return config;
  }
};

export default withBundleAnalyzer(nextConfig);
