'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ImageValidation {
  src: string;
  alt: string | null;
  element: HTMLImageElement;
  isDecorative: boolean;
  issues: string[];
  suggestions: string[];
}

interface AltTextValidatorProps {
  checkOnMount?: boolean;
  autoFix?: boolean;
  showInlineWarnings?: boolean;
  reportToConsole?: boolean;
  onValidationComplete?: (results: ImageValidation[]) => void;
  className?: string;
}

const DECORATIVE_PATTERNS = [
  'spacer', 'divider', 'decoration', 'background', 'pattern',
  'icon-', 'bullet', 'arrow', 'separator'
];

const UNHELPFUL_ALT_TEXTS = [
  'image', 'photo', 'picture', 'img', 'graphic', 'icon',
  'untitled', 'unnamed', 'screenshot', 'screen shot'
];

export const AltTextValidator: React.FC<AltTextValidatorProps> = ({
  checkOnMount = true,
  autoFix = false,
  showInlineWarnings = true,
  reportToConsole = false,
  onValidationComplete,
  className = ''
}) => {
  const [validationResults, setValidationResults] = useState<ImageValidation[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const isDecorativeImage = (img: HTMLImageElement): boolean => {
    // Check if image has role="presentation" or aria-hidden="true"
    if (img.getAttribute('role') === 'presentation' || 
        img.getAttribute('aria-hidden') === 'true') {
      return true;
    }

    // Check filename patterns
    const src = img.src.toLowerCase();
    return DECORATIVE_PATTERNS.some(pattern => src.includes(pattern));
  };

  const generateAltTextSuggestion = (img: HTMLImageElement): string => {
    // Extract context from surrounding elements
    const parent = img.parentElement;
    const figure = img.closest('figure');
    const figcaption = figure?.querySelector('figcaption');
    
    if (figcaption?.textContent) {
      return figcaption.textContent.trim();
    }

    // Check for nearby headings or captions
    const nearbyHeading = parent?.querySelector('h1, h2, h3, h4, h5, h6');
    if (nearbyHeading?.textContent) {
      return `Image related to: ${nearbyHeading.textContent.trim()}`;
    }

    // Extract from filename
    const filename = img.src.split('/').pop()?.split('.')[0];
    if (filename) {
      // Convert filename to readable text
      const readable = filename
        .replace(/[-_]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .trim();
      
      if (readable && !UNHELPFUL_ALT_TEXTS.includes(readable)) {
        return readable;
      }
    }

    return 'Descriptive text needed for this image';
  };

  const validateAltText = useCallback((img: HTMLImageElement): ImageValidation => {
    const alt = img.alt;
    const issues: string[] = [];
    const suggestions: string[] = [];
    const isDecorative = isDecorativeImage(img);

    if (isDecorative) {
      if (alt && alt.length > 0) {
        issues.push('Decorative image should have empty alt text (alt="")');
        suggestions.push('Set alt="" for decorative images');
      }
    } else {
      // Non-decorative images need meaningful alt text
      if (!alt) {
        issues.push('Missing alt text');
        suggestions.push(generateAltTextSuggestion(img));
      } else if (alt.length === 0) {
        issues.push('Empty alt text on meaningful image');
        suggestions.push(generateAltTextSuggestion(img));
      } else {
        // Check for unhelpful alt text
        const altLower = alt.toLowerCase();
        
        if (UNHELPFUL_ALT_TEXTS.some(unhelpful => altLower === unhelpful)) {
          issues.push('Alt text is not descriptive');
          suggestions.push(`Replace "${alt}" with descriptive text`);
        }
        
        if (altLower.startsWith('image of') || altLower.startsWith('picture of')) {
          issues.push('Alt text should not start with "image of" or "picture of"');
          suggestions.push(alt.replace(/^(image|picture) of /i, ''));
        }
        
        if (alt.length > 125) {
          issues.push('Alt text is too long (should be under 125 characters)');
          suggestions.push('Consider using longdesc or aria-describedby for detailed descriptions');
        }
        
        if (alt.length < 4 && !['logo', 'icon'].includes(altLower)) {
          issues.push('Alt text might be too short');
          suggestions.push('Provide more descriptive text');
        }
      }
    }

    return {
      src: img.src,
      alt,
      element: img,
      isDecorative,
      issues,
      suggestions
    };
  }, []);

  const validateAllImages = useCallback(() => {
    setIsValidating(true);
    
    // Find all images in the document
    const images = Array.from(document.querySelectorAll('img'));
    const results = images.map(img => validateAltText(img));
    
    setValidationResults(results);
    setIsValidating(false);
    
    if (reportToConsole) {
      const issueCount = results.filter(r => r.issues.length > 0).length;
      if (issueCount > 0) {
        console.group('🖼️ Alt Text Validation Report');
        console.log(`Found ${issueCount} images with issues out of ${results.length} total images`);
        results.forEach(result => {
          if (result.issues.length > 0) {
            console.group(`Image: ${result.src.split('/').pop()}`);
            console.log('Issues:', result.issues);
            console.log('Suggestions:', result.suggestions);
            console.groupEnd();
          }
        });
        console.groupEnd();
      } else {
        console.log('✅ All images have proper alt text');
      }
    }
    
    onValidationComplete?.(results);
    
    // Apply inline warnings if enabled
    if (showInlineWarnings) {
      results.forEach(result => {
        if (result.issues.length > 0) {
          result.element.style.outline = '2px solid #ef4444';
          result.element.style.outlineOffset = '2px';
          result.element.title = `Alt text issues: ${result.issues.join('; ')}`;
        } else {
          result.element.style.outline = '';
          result.element.title = '';
        }
      });
    }
    
    // Auto-fix if enabled
    if (autoFix) {
      results.forEach(result => {
        if (result.issues.length > 0 && result.suggestions.length > 0) {
          if (result.isDecorative) {
            result.element.alt = '';
          } else if (!result.alt || result.alt.length === 0) {
            result.element.alt = result.suggestions[0];
            console.log(`Auto-fixed: Set alt="${result.suggestions[0]}" for ${result.src}`);
          }
        }
      });
    }
  }, [validateAltText, reportToConsole, onValidationComplete, showInlineWarnings, autoFix]);

  // Validate on mount if requested
  useEffect(() => {
    if (checkOnMount) {
      // Wait for images to load
      const timeout = setTimeout(() => {
        validateAllImages();
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [checkOnMount, validateAllImages]);

  // Monitor for new images
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      const hasNewImages = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => 
          node.nodeName === 'IMG' || 
          (node as Element).querySelector?.('img')
        );
      });
      
      if (hasNewImages) {
        validateAllImages();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, [validateAllImages]);

  const issueCount = validationResults.filter(r => r.issues.length > 0).length;
  const totalImages = validationResults.length;

  return (
    <>
      {/* Validation Status Bar */}
      <div 
        className={`
          fixed bottom-4 right-4 z-50
          ${className}
        `}
        role="status"
        aria-live="polite"
      >
        <button
          onClick={() => setShowReport(!showReport)}
          className={`
            px-4 py-2 rounded-lg shadow-lg
            flex items-center gap-2
            transition-all duration-200
            ${issueCount > 0 
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
              : 'bg-green-500 hover:bg-green-600 text-white'
            }
          `}
          aria-label={`Alt text validation: ${issueCount} issues found. Click to ${showReport ? 'hide' : 'show'} report`}
          aria-expanded={showReport}
        >
          {issueCount > 0 ? (
            <>
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>{issueCount} alt text {issueCount === 1 ? 'issue' : 'issues'}</span>
            </>
          ) : totalImages > 0 ? (
            <>
              <CheckCircleIcon className="h-5 w-5" />
              <span>Alt text OK</span>
            </>
          ) : (
            <>
              <InformationCircleIcon className="h-5 w-5" />
              <span>No images</span>
            </>
          )}
        </button>
      </div>

      {/* Detailed Report */}
      {showReport && validationResults.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowReport(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold">Alt Text Validation Report</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {issueCount} issues found in {totalImages} images
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {validationResults.filter(r => r.issues.length > 0).map((result, index) => (
                <div 
                  key={index}
                  className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex gap-4">
                    <img 
                      src={result.src} 
                      alt={result.alt || ''}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {result.src.split('/').pop()}
                      </p>
                      
                      {result.alt !== null && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Current alt: "{result.alt}"
                        </p>
                      )}
                      
                      <div className="space-y-1">
                        {result.issues.map((issue, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{issue}</span>
                          </div>
                        ))}
                      </div>
                      
                      {result.suggestions.length > 0 && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                            Suggestions:
                          </p>
                          {result.suggestions.map((suggestion, i) => (
                            <p key={i} className="text-sm text-blue-700 dark:text-blue-400">
                              {suggestion}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <button
                onClick={validateAllImages}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Re-validate
              </button>
              <button
                onClick={() => setShowReport(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AltTextValidator;