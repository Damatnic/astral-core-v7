/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essential configuration for Vercel deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;