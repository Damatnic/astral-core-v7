# Image Optimization Guide

This guide covers the comprehensive image optimization implementation in Astral Core v7.

## Overview

The application now includes:
- ✅ Next.js Image component optimization
- ✅ WebP and AVIF format support with fallbacks
- ✅ Automatic lazy loading
- ✅ Responsive image sizing
- ✅ Loading states and error handling
- ✅ Image compression utilities

## Components

### OptimizedImage Component

Located at `src/components/ui/OptimizedImage.tsx`, this component provides:

- **Automatic format optimization**: Serves WebP/AVIF when supported
- **Lazy loading**: Images load only when entering viewport
- **Responsive sizing**: Adapts to different screen sizes
- **Loading states**: Shows skeleton while loading
- **Error handling**: Fallback images and error states
- **Accessibility**: Proper alt text and ARIA labels

#### Usage Examples

```tsx
import OptimizedImage, { ProfileImage, ThumbnailImage, HeroImage } from '@/components/ui/OptimizedImage';

// Basic usage
<OptimizedImage
  src="/images/sample.jpg"
  alt="Sample image"
  width={400}
  height={300}
  aspectRatio="landscape"
/>

// Profile image (circular, optimized for avatars)
<ProfileImage
  src="/images/avatar.jpg"
  alt="User avatar"
  size={64}
/>

// Thumbnail (square aspect ratio)
<ThumbnailImage
  src="/images/thumbnail.jpg"
  alt="Thumbnail"
  width={200}
  height={200}
/>

// Hero image (16:9 aspect ratio, priority loading)
<HeroImage
  src="/images/hero.jpg"
  alt="Hero banner"
  fill
  containerClassName="h-96"
/>

// Responsive image with custom sizes
<OptimizedImage
  src="/images/responsive.jpg"
  alt="Responsive image"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | required | Image source URL |
| `alt` | `string` | required | Alternative text for accessibility |
| `aspectRatio` | `'square' \| 'video' \| 'portrait' \| 'landscape' \| number` | - | Maintains aspect ratio |
| `fallbackSrc` | `string` | - | Fallback image if primary fails |
| `showLoadingPlaceholder` | `boolean` | `true` | Show loading skeleton |
| `priority` | `boolean` | `false` | Disable lazy loading for above-fold images |

## Next.js Configuration

The `next.config.ts` includes optimized image settings:

```typescript
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
    }
  ]
}
```

## Image Compression Script

Run the image optimization script:

```bash
npm run optimize:images
```

This script:
- Compresses existing images
- Generates WebP and AVIF versions
- Resizes oversized images
- Reports file size savings

### Manual Compression

The script supports both Sharp (Node.js) and ImageMagick:

```bash
# Install Sharp for better performance
npm install sharp

# Or install ImageMagick as fallback
# Windows: Download from https://imagemagick.org/
# macOS: brew install imagemagick
# Linux: apt-get install imagemagick
```

## Performance Benefits

### Before Optimization
- Large PNG/JPEG files
- No lazy loading
- No responsive sizing
- No format optimization

### After Optimization
- **File size reduction**: 30-70% smaller with WebP/AVIF
- **Faster loading**: Lazy loading and proper sizing
- **Better UX**: Loading states and error handling
- **Responsive**: Adapts to screen size and device capabilities

## Best Practices

### 1. Image Formats
- **AVIF**: Best compression, modern browsers
- **WebP**: Good compression, wide support
- **JPEG**: Fallback for photos
- **PNG**: Fallback for graphics with transparency

### 2. Sizing Guidelines
- **Thumbnails**: 64x64 to 256x256px
- **Profile images**: 40x40 to 128x128px
- **Content images**: Max 1200px width
- **Hero images**: Max 1920px width

### 3. Loading Strategy
- Use `priority={true}` for above-fold images
- Use `lazy loading` (default) for below-fold images
- Provide proper `sizes` attribute for responsive images

### 4. Accessibility
- Always provide meaningful `alt` text
- Use empty `alt=""` for decorative images
- Consider users with slow connections

## Migration Guide

### Replacing img tags

❌ **Before:**
```tsx
<img 
  src="/images/sample.jpg" 
  alt="Sample" 
  className="w-32 h-32 object-cover rounded"
/>
```

✅ **After:**
```tsx
<OptimizedImage
  src="/images/sample.jpg"
  alt="Sample"
  width={128}
  height={128}
  className="object-cover rounded"
/>
```

### Dynamic Images

❌ **Before:**
```tsx
<img 
  src={user.avatar} 
  alt={user.name}
  className="w-10 h-10 rounded-full"
/>
```

✅ **After:**
```tsx
<ProfileImage
  src={user.avatar}
  alt={user.name}
  size={40}
  fallbackSrc="/images/default-avatar.png"
/>
```

## Testing

### Performance Testing
1. Check Network tab in DevTools
2. Verify WebP/AVIF delivery
3. Test lazy loading behavior
4. Measure Core Web Vitals

### Browser Testing
- Test in Chrome (AVIF + WebP support)
- Test in Safari (WebP support)
- Test in older browsers (fallback behavior)

### Accessibility Testing
- Screen reader compatibility
- Keyboard navigation
- Alt text accuracy

## Troubleshooting

### Common Issues

1. **Images not loading**
   - Check file permissions
   - Verify file paths
   - Check Next.js configuration

2. **Large bundle size**
   - Use dynamic imports for image processing libraries
   - Optimize image sizes before upload

3. **Slow loading**
   - Enable CDN
   - Optimize image compression
   - Use appropriate image sizes

### Debug Mode

Enable debug mode in development:

```tsx
<OptimizedImage
  src="/debug-image.jpg"
  alt="Debug"
  onLoad={() => console.log('Image loaded')}
  onError={(e) => console.error('Image error:', e)}
/>
```

## Monitoring

Track image performance metrics:
- **Largest Contentful Paint (LCP)**
- **Cumulative Layout Shift (CLS)**
- **Image load times**
- **Format adoption rates**

## Future Enhancements

Planned improvements:
- [ ] Progressive JPEG support
- [ ] Client-side image resizing
- [ ] Automatic blur placeholder generation
- [ ] Advanced compression algorithms
- [ ] Edge optimization with CDN integration