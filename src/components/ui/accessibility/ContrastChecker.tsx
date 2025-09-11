/**
 * ContrastChecker Component
 * Validates and displays color contrast ratios for WCAG compliance
 */

import React, { useMemo } from 'react';
import { clsx } from 'clsx';
import { 
  getContrastRatio, 
  meetsContrastRequirement, 
  getAccessibleColorSuggestions,
  COLOR_CONTRAST 
} from '@/utils/accessibility';

interface ContrastCheckerProps {
  /**
   * Foreground color (text color) in hex format
   */
  foreground: string;
  /**
   * Background color in hex format
   */
  background: string;
  /**
   * Whether this is large text (18pt+ or 14pt+ bold)
   */
  isLargeText?: boolean;
  /**
   * WCAG level to check against
   */
  level?: 'AA' | 'AAA';
  /**
   * Whether to show suggestions for improvement
   */
  showSuggestions?: boolean;
  /**
   * Additional class names
   */
  className?: string;
}

export function ContrastChecker({
  foreground,
  background,
  isLargeText = false,
  level = 'AA',
  showSuggestions = false,
  className
}: ContrastCheckerProps) {
  const contrastData = useMemo(() => {
    const ratio = getContrastRatio(foreground, background);
    const passes = meetsContrastRequirement(foreground, background, level, isLargeText);
    const suggestions = showSuggestions && !passes 
      ? getAccessibleColorSuggestions(foreground, background, level)
      : [];

    return {
      ratio: Math.round(ratio * 100) / 100,
      passes,
      suggestions,
      requiredRatio: level === 'AAA' 
        ? (isLargeText ? 4.5 : 7)
        : (isLargeText ? COLOR_CONTRAST.LARGE_TEXT : COLOR_CONTRAST.NORMAL_TEXT)
    };
  }, [foreground, background, isLargeText, level, showSuggestions]);

  return (
    <div className={clsx('p-3 rounded-md border', className)}>
      {/* Contrast ratio display */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          Contrast Ratio: {contrastData.ratio}:1
        </span>
        <div className={clsx(
          'px-2 py-1 rounded text-xs font-medium',
          contrastData.passes 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        )}>
          {contrastData.passes ? 'PASS' : 'FAIL'} {level}
        </div>
      </div>

      {/* Preview */}
      <div 
        className="p-3 rounded border mb-2"
        style={{ 
          backgroundColor: background, 
          color: foreground,
          border: `1px solid ${foreground}20`
        }}
      >
        <p className={clsx('m-0', isLargeText ? 'text-lg font-bold' : 'text-sm')}>
          Sample text with current colors
        </p>
      </div>

      {/* Requirements */}
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        Required ratio: {contrastData.requiredRatio}:1 for {level} compliance
        {isLargeText && ' (large text)'}
      </div>

      {/* Suggestions */}
      {contrastData.suggestions.length > 0 && (
        <div className="border-t pt-2">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Accessible alternatives:
          </p>
          <div className="flex flex-wrap gap-1">
            {contrastData.suggestions.slice(0, 3).map((color, index) => (
              <div
                key={index}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs"
              >
                <div
                  className="w-3 h-3 rounded border border-gray-300"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="font-mono">{color}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Quick contrast checker badge for design system colors
 */
export function ContrastBadge({
  foreground,
  background,
  isLargeText = false,
  level = 'AA',
  className
}: Omit<ContrastCheckerProps, 'showSuggestions'>) {
  const passes = meetsContrastRequirement(foreground, background, level, isLargeText);
  const ratio = getContrastRatio(foreground, background);

  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
      passes 
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      className
    )}>
      {Math.round(ratio * 10) / 10}:1 {passes ? '✓' : '✗'}
    </span>
  );
}

/**
 * Mental health color palette validator
 */
export function MentalHealthColorValidator() {
  const mentalHealthPalette = [
    { name: 'Primary Blue', color: '#4A90E2', background: '#FFFFFF' },
    { name: 'Success Green', color: '#27AE60', background: '#FFFFFF' },
    { name: 'Warning Orange', color: '#F39C12', background: '#FFFFFF' },
    { name: 'Background', color: '#2C3E50', background: '#F8F9FA' },
    { name: 'Crisis Orange', color: '#E67E22', background: '#FFFFFF' }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Mental Health Color Palette Validation</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {mentalHealthPalette.map((item) => (
          <div key={item.name} className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">{item.name}</h4>
            <ContrastChecker
              foreground={item.color}
              background={item.background}
              showSuggestions={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Live contrast checker with color inputs
 */
export function LiveContrastChecker() {
  const [foreground, setForeground] = React.useState('#000000');
  const [background, setBackground] = React.useState('#ffffff');
  const [isLargeText, setIsLargeText] = React.useState(false);

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Live Contrast Checker</h3>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            Foreground Color (Text)
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={foreground}
              onChange={(e) => setForeground(e.target.value)}
              className="w-12 h-10 border rounded"
            />
            <input
              type="text"
              value={foreground}
              onChange={(e) => setForeground(e.target.value)}
              className="flex-1 px-3 py-2 border rounded font-mono text-sm"
              placeholder="#000000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Background Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="w-12 h-10 border rounded"
            />
            <input
              type="text"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="flex-1 px-3 py-2 border rounded font-mono text-sm"
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isLargeText}
            onChange={(e) => setIsLargeText(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Large text (18pt+ or 14pt+ bold)</span>
        </label>
      </div>

      <ContrastChecker
        foreground={foreground}
        background={background}
        isLargeText={isLargeText}
        showSuggestions={true}
      />
    </div>
  );
}

export default ContrastChecker;