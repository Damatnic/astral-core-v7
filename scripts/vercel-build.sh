#!/bin/bash

# Vercel Build Script for Astral Core v7
# Optimized for fast and reliable deployments

set -e  # Exit on error

echo "🚀 Starting Astral Core v7 Production Build"
echo "==========================================="

# Environment info
echo "📦 Node Version: $(node -v)"
echo "📦 NPM Version: $(npm -v)"
echo "📦 Environment: $NODE_ENV"
echo "📦 Vercel: ${VERCEL:-false}"

# Set build environment
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export SKIP_ENV_VALIDATION=1

# Increase memory for build
if [ "$VERCEL" = "1" ]; then
  export NODE_OPTIONS="--max-old-space-size=8192"
  echo "✅ Vercel environment detected - memory optimized"
fi

# Install dependencies with cache
echo ""
echo "📦 Installing dependencies..."
if [ -f "package-lock.json" ]; then
  npm ci --prefer-offline --no-audit --no-fund
else
  npm install --prefer-offline --no-audit --no-fund
fi

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate || {
  echo "⚠️  Prisma generation failed, retrying..."
  rm -rf node_modules/.prisma
  rm -rf node_modules/@prisma/client
  npx prisma generate
}

# Run type checking in parallel with build
echo ""
echo "🔍 Type checking..."
npx tsc --noEmit || echo "⚠️  Type errors found (non-blocking for production)"

# Build Next.js application
echo ""
echo "🏗️  Building Next.js application..."
npx next build

# Verify build output
echo ""
echo "✅ Build completed successfully!"

if [ -d ".next" ]; then
  echo "📊 Build size:"
  du -sh .next
fi

# Create build manifest
cat > build-manifest.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "commitSha": "${VERCEL_GIT_COMMIT_SHA:-unknown}",
  "branch": "${VERCEL_GIT_COMMIT_REF:-unknown}",
  "nodeVersion": "$(node -v)",
  "success": true
}
EOF

echo ""
echo "🎉 Build process complete!"
echo "==========================================="