'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import clsx from 'clsx';

const cn = clsx;

interface OptimizedImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape' | number;
  showLoadingPlaceholder?: boolean;
  loadingClassName?: string;
  errorClassName?: string;
  containerClassName?: string;
}

/**
 * Optimized Image Component
 * Provides automatic lazy loading, responsive sizing, WebP/AVIF format support,
 * loading states, error handling, and proper accessibility
 */
export default function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  aspectRatio,
  showLoadingPlaceholder = true,
  loadingClassName,
  errorClassName,
  containerClassName,
  className,
  fill,
  sizes,
  priority = false,
  ...props
}: OptimizedImageProps) {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState(src);

  const handleImageLoad = () => {
    setImageStatus('loaded');
  };

  const handleImageError = () => {
    setImageStatus('error');
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setImageStatus('loading');
    }
  };

  // Calculate aspect ratio style
  const getAspectRatioStyle = () => {
    if (!aspectRatio || fill) return {};
    
    let ratio: number;
    switch (aspectRatio) {
      case 'square':
        ratio = 1;
        break;
      case 'video':
        ratio = 16 / 9;
        break;
      case 'portrait':
        ratio = 3 / 4;
        break;
      case 'landscape':
        ratio = 4 / 3;
        break;
      default:
        ratio = typeof aspectRatio === 'number' ? aspectRatio : 1;
    }
    
    return {
      aspectRatio: ratio.toString()
    };
  };

  // Default sizes for responsive images
  const defaultSizes = sizes || fill 
    ? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
    : undefined;

  const containerStyle = {
    ...getAspectRatioStyle(),
    position: fill ? 'relative' as const : undefined
  };

  return (
    <div 
      className={cn(
        'relative overflow-hidden',
        fill && 'w-full h-full',
        containerClassName
      )}
      style={containerStyle}
    >
      {/* Loading placeholder */}
      {showLoadingPlaceholder && imageStatus === 'loading' && (
        <div
          className={cn(
            'absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center',
            'dark:bg-gray-700',
            loadingClassName
          )}
          aria-label="Loading image"
        >
          <div className="w-8 h-8 text-gray-400 dark:text-gray-500">
            <svg
              className="animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Error state */}
      {imageStatus === 'error' && !fallbackSrc && (
        <div
          className={cn(
            'absolute inset-0 bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center',
            'text-gray-500 dark:text-gray-400',
            errorClassName
          )}
          role="img"
          aria-label={alt}
        >
          <div className="w-12 h-12 mb-2">
            <svg
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-sm">Failed to load image</span>
        </div>
      )}

      {/* Optimized Image */}
      <Image
        src={imageSrc}
        alt={alt}
        fill={fill || false}
        sizes={defaultSizes}
        priority={priority}
        quality={85}
        className={cn(
          'transition-opacity duration-300',
          imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{
          objectFit: 'cover',
          objectPosition: 'center'
        }}
        {...props}
      />
    </div>
  );
}

// Preset variants for common use cases
export const ProfileImage = ({ src, alt, size = 40, ...props }: { 
  src: string; 
  alt: string; 
  size?: number; 
} & Omit<OptimizedImageProps, 'width' | 'height' | 'aspectRatio'>) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={size}
    height={size}
    aspectRatio="square"
    className="rounded-full"
    priority={false}
    {...props}
  />
);

export const ThumbnailImage = ({ src, alt, ...props }: { 
  src: string; 
  alt: string; 
} & Omit<OptimizedImageProps, 'aspectRatio'>) => (
  <OptimizedImage
    src={src}
    alt={alt}
    aspectRatio="square"
    className="rounded-lg"
    priority={false}
    {...props}
  />
);

export const HeroImage = ({ src, alt, ...props }: { 
  src: string; 
  alt: string; 
} & Omit<OptimizedImageProps, 'aspectRatio' | 'priority'>) => (
  <OptimizedImage
    src={src}
    alt={alt}
    aspectRatio="video"
    priority={true}
    {...props}
  />
);