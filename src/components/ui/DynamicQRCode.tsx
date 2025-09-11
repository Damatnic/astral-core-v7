/**
 * Dynamic QR Code Component
 * Lazy-loads QR code generation library only when needed
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface QRCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  className?: string;
}

const QRCodeSkeleton: React.FC<{ size?: number; className?: string }> = ({ 
  size = 200, 
  className = '' 
}) => (
  <div 
    className={`bg-gray-200 animate-pulse rounded ${className}`}
    style={{ width: size, height: size }}
  >
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
      Loading QR Code...
    </div>
  </div>
);

const DynamicQRCode: React.FC<QRCodeProps> = ({
  value,
  size = 200,
  level = 'M',
  includeMargin = true,
  className = ''
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const generateQR = async () => {
      try {
        // Dynamically import QR code library
        const QRCode = await import('qrcode');
        
        const dataUrl = await QRCode.toDataURL(value, {
          width: size,
          errorCorrectionLevel: level,
          margin: includeMargin ? 2 : 0,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        if (mounted) {
          setQrDataUrl(dataUrl);
          setLoading(false);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate QR code';
        if (mounted) {
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    generateQR();

    return () => {
      mounted = false;
    };
  }, [value, size, level, includeMargin]);

  if (loading) {
    return <QRCodeSkeleton size={size} className={className} />;
  }

  if (error) {
    return (
      <div 
        className={`bg-red-50 border border-red-200 rounded p-4 text-red-600 text-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <span>QR Code Error</span>
          <span className="text-xs mt-1">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={qrDataUrl!}
      alt={`QR Code for: ${value}`}
      width={size}
      height={size}
      className={`rounded ${className}`}
      priority={true}
      unoptimized={true}
    />
  );
};

export default DynamicQRCode;