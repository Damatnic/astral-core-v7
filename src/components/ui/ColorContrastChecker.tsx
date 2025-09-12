'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  EyeIcon,
  InformationCircleIcon,
  SwatchIcon
} from '@heroicons/react/24/outline';

interface ContrastResult {
  ratio: number;
  aa: {
    normal: boolean;
    large: boolean;
  };
  aaa: {
    normal: boolean;
    large: boolean;
  };
}

interface ColorContrastCheckerProps {
  foreground?: string;
  background?: string;
  onColorChange?: (fg: string, bg: string) => void;
  showPreview?: boolean;
  showRecommendations?: boolean;
  className?: string;
}

// Convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Calculate relative luminance
const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

// Calculate contrast ratio
const getContrastRatio = (fg: string, bg: string): number => {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  
  if (!fgRgb || !bgRgb) return 0;
  
  const l1 = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const l2 = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

// Adjust color brightness
const adjustBrightness = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const adjust = (c: number) => Math.min(255, Math.max(0, c + (c * percent / 100)));
  
  const r = Math.round(adjust(rgb.r)).toString(16).padStart(2, '0');
  const g = Math.round(adjust(rgb.g)).toString(16).padStart(2, '0');
  const b = Math.round(adjust(rgb.b)).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
};

export const ColorContrastChecker: React.FC<ColorContrastCheckerProps> = ({
  foreground: initialFg = '#000000',
  background: initialBg = '#FFFFFF',
  onColorChange,
  showPreview = true,
  showRecommendations = true,
  className = ''
}) => {
  const [foreground, setForeground] = useState(initialFg);
  const [background, setBackground] = useState(initialBg);
  const [contrastResult, setContrastResult] = useState<ContrastResult | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // Calculate contrast
  useEffect(() => {
    const ratio = getContrastRatio(foreground, background);
    
    const result: ContrastResult = {
      ratio,
      aa: {
        normal: ratio >= 4.5,
        large: ratio >= 3
      },
      aaa: {
        normal: ratio >= 7,
        large: ratio >= 4.5
      }
    };
    
    setContrastResult(result);
    
    // Generate recommendations
    const recs: string[] = [];
    
    if (!result.aa.normal) {
      const needed = 4.5 - ratio;
      recs.push(`Increase contrast by at least ${needed.toFixed(1)} to meet WCAG AA`);
      
      // Suggest color adjustments
      const darkerFg = adjustBrightness(foreground, -20);
      const lighterBg = adjustBrightness(background, 20);
      
      if (getContrastRatio(darkerFg, background) >= 4.5) {
        recs.push(`Try darker text: ${darkerFg}`);
      }
      if (getContrastRatio(foreground, lighterBg) >= 4.5) {
        recs.push(`Try lighter background: ${lighterBg}`);
      }
    }
    
    if (result.aa.normal && !result.aaa.normal) {
      recs.push('Consider improving to WCAG AAA for better accessibility');
    }
    
    setRecommendations(recs);
    
    // Notify parent
    onColorChange?.(foreground, background);
  }, [foreground, background, onColorChange]);

  // Swap colors
  const swapColors = () => {
    setForeground(background);
    setBackground(foreground);
  };

  // Get pass/fail indicator
  const getIndicator = (passes: boolean) => {
    return passes ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-500" />
    );
  };

  const getScoreColor = () => {
    if (!contrastResult) return 'text-gray-500';
    if (contrastResult.aaa.normal) return 'text-green-600 dark:text-green-400';
    if (contrastResult.aa.normal) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={`color-contrast-checker ${className}`}>
      {/* Color Inputs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Foreground (Text)
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={foreground}
              onChange={(e) => setForeground(e.target.value)}
              className="h-10 w-16 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              aria-label="Foreground color"
            />
            <input
              type="text"
              value={foreground}
              onChange={(e) => setForeground(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="#000000"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Background
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="h-10 w-16 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              aria-label="Background color"
            />
            <input
              type="text"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="#FFFFFF"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={swapColors}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Swap colors"
        >
          ⇄ Swap Colors
        </button>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preview
          </h3>
          <div 
            className="p-6 rounded-lg border-2 border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: background }}
          >
            <p 
              style={{ color: foreground }}
              className="text-base mb-2"
            >
              Regular Text (14px+): The quick brown fox jumps over the lazy dog.
            </p>
            <p 
              style={{ color: foreground }}
              className="text-lg font-bold"
            >
              Large Text (18px+ or 14px+ bold): The quick brown fox jumps over the lazy dog.
            </p>
          </div>
        </div>
      )}

      {/* Contrast Ratio */}
      {contrastResult && (
        <div className="space-y-4">
          <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className={`text-4xl font-bold ${getScoreColor()}`}>
              {contrastResult.ratio.toFixed(2)}:1
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Contrast Ratio
            </p>
          </div>

          {/* WCAG Compliance */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              WCAG Compliance
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* AA Standards */}
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Level AA
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Normal Text (4.5:1)
                    </span>
                    {getIndicator(contrastResult.aa.normal)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Large Text (3:1)
                    </span>
                    {getIndicator(contrastResult.aa.large)}
                  </div>
                </div>
              </div>

              {/* AAA Standards */}
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Level AAA
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Normal Text (7:1)
                    </span>
                    {getIndicator(contrastResult.aaa.normal)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Large Text (4.5:1)
                    </span>
                    {getIndicator(contrastResult.aaa.large)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {showRecommendations && recommendations.length > 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">
                    Recommendations
                  </p>
                  <ul className="text-sm text-yellow-600 dark:text-yellow-500 space-y-1">
                    {recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>• Normal text: Less than 18pt (24px) or less than 14pt (19px) bold</p>
            <p>• Large text: At least 18pt (24px) or at least 14pt (19px) bold</p>
            <p>• WCAG AA is the minimum recommended standard</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorContrastChecker;