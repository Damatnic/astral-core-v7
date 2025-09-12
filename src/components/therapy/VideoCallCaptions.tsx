'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MicrophoneIcon, XMarkIcon, Cog6ToothIcon, LanguageIcon } from '@heroicons/react/24/outline';

interface Caption {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  confidence?: number;
  isFinal: boolean;
}

interface VideoCallCaptionsProps {
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  language?: string;
  fontSize?: 'small' | 'medium' | 'large';
  position?: 'top' | 'bottom' | 'floating';
  maxLines?: number;
  showSpeakerLabels?: boolean;
  autoScroll?: boolean;
  onLanguageChange?: (language: string) => void;
  className?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' }
];

export const VideoCallCaptions: React.FC<VideoCallCaptionsProps> = ({
  enabled: initialEnabled = false,
  onToggle,
  language = 'en-US',
  fontSize = 'medium',
  position = 'bottom',
  maxLines = 3,
  showSpeakerLabels = true,
  autoScroll = true,
  onLanguageChange,
  className = ''
}) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localPosition, setLocalPosition] = useState(position);
  const [recognition, setRecognition] = useState<any>(null);
  const captionsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = language;
      
      recognitionInstance.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        const isFinal = event.results[current].isFinal;
        const confidence = event.results[current][0].confidence;
        
        const caption: Caption = {
          id: `caption-${Date.now()}`,
          speaker: 'You', // In production, detect speaker
          text: transcript,
          timestamp: Date.now(),
          confidence,
          isFinal
        };
        
        if (isFinal) {
          setCaptions(prev => [...prev.slice(-9), caption]);
          setCurrentCaption(null);
        } else {
          setCurrentCaption(caption);
        }
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Restart recognition after no speech detected
          setTimeout(() => {
            if (enabled) {
              recognitionInstance.start();
            }
          }, 1000);
        }
      };
      
      recognitionInstance.onend = () => {
        // Restart if still enabled
        if (enabled) {
          setTimeout(() => {
            recognitionInstance.start();
          }, 100);
        }
      };
      
      setRecognition(recognitionInstance);
    }
  }, [language]);

  // Start/stop recognition based on enabled state
  useEffect(() => {
    if (recognition) {
      if (enabled) {
        try {
          recognition.start();
        } catch (e) {
          // Already started
        }
      } else {
        try {
          recognition.stop();
        } catch (e) {
          // Already stopped
        }
      }
    }
  }, [enabled, recognition]);

  // Auto-scroll to latest caption
  useEffect(() => {
    if (autoScroll && captionsRef.current) {
      captionsRef.current.scrollTop = captionsRef.current.scrollHeight;
    }
  }, [captions, currentCaption, autoScroll]);

  // Handle click outside settings
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettings]);

  const handleToggle = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    onToggle?.(newEnabled);
  };

  const handleLanguageChange = (newLanguage: string) => {
    if (recognition) {
      recognition.lang = newLanguage;
    }
    onLanguageChange?.(newLanguage);
  };

  const getFontSizeClass = () => {
    switch (localFontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  const getPositionStyles = () => {
    switch (localPosition) {
      case 'top':
        return 'top-4 left-1/2 -translate-x-1/2';
      case 'floating':
        return 'bottom-20 right-4';
      default:
        return 'bottom-4 left-1/2 -translate-x-1/2';
    }
  };

  const displayCaptions = [...captions.slice(-maxLines)];
  if (currentCaption) {
    displayCaptions.push(currentCaption);
  }

  return (
    <>
      {/* Caption Toggle Button */}
      <button
        onClick={handleToggle}
        className={`
          fixed bottom-4 left-4 z-40
          px-4 py-2 rounded-lg shadow-lg
          bg-white dark:bg-gray-800 
          hover:bg-gray-50 dark:hover:bg-gray-700
          transition-all duration-200
          flex items-center space-x-2
          ${enabled ? 'ring-2 ring-blue-500' : ''}
          ${className}
        `}
        aria-label={enabled ? 'Disable captions' : 'Enable captions'}
        aria-pressed={enabled}
      >
        <MicrophoneIcon className={`h-5 w-5 ${enabled ? 'text-blue-500' : 'text-gray-500'}`} />
        <span className="text-sm font-medium">
          {enabled ? 'Captions On' : 'Captions Off'}
        </span>
      </button>

      {/* Captions Display */}
      {enabled && (
        <div
          className={`
            fixed z-40 max-w-2xl
            ${getPositionStyles()}
            ${localPosition === 'floating' ? 'w-96' : 'w-full px-4'}
          `}
          role="region"
          aria-label="Live captions"
          aria-live="polite"
          aria-atomic="false"
        >
          <div
            ref={captionsRef}
            className={`
              bg-black/80 backdrop-blur-sm rounded-lg p-4
              max-h-32 overflow-y-auto scrollbar-thin
              ${getFontSizeClass()}
            `}
          >
            {displayCaptions.length === 0 ? (
              <div className="text-gray-400 italic">
                Waiting for speech...
              </div>
            ) : (
              <div className="space-y-2">
                {displayCaptions.map((caption) => (
                  <div
                    key={caption.id}
                    className={`
                      text-white
                      ${!caption.isFinal ? 'opacity-70 italic' : ''}
                    `}
                  >
                    {showSpeakerLabels && (
                      <span className="font-semibold text-blue-400">
                        {caption.speaker}:{' '}
                      </span>
                    )}
                    <span>{caption.text}</span>
                    {caption.confidence && caption.confidence < 0.8 && (
                      <span 
                        className="ml-1 text-xs text-yellow-400" 
                        title="Low confidence"
                        aria-label="Low confidence transcription"
                      >
                        ⚠
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Caption Settings */}
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="
                p-2 rounded-lg
                bg-black/60 hover:bg-black/80
                text-white/80 hover:text-white
                transition-colors
              "
              aria-label="Caption settings"
              aria-expanded={showSettings}
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div
              ref={settingsRef}
              className="
                absolute bottom-full mb-2 right-0
                bg-white dark:bg-gray-800 rounded-lg shadow-xl
                p-4 w-80
              "
              role="dialog"
              aria-label="Caption settings"
            >
              <div className="space-y-4">
                {/* Font Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Font Size
                  </label>
                  <div className="flex space-x-2">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setLocalFontSize(size)}
                        className={`
                          flex-1 px-3 py-1 rounded-md text-sm capitalize
                          ${localFontSize === size
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }
                          transition-colors
                        `}
                        aria-pressed={localFontSize === size}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Position
                  </label>
                  <div className="flex space-x-2">
                    {(['top', 'bottom', 'floating'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setLocalPosition(pos)}
                        className={`
                          flex-1 px-3 py-1 rounded-md text-sm capitalize
                          ${localPosition === pos
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }
                          transition-colors
                        `}
                        aria-pressed={localPosition === pos}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label 
                    htmlFor="caption-language"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Language
                  </label>
                  <select
                    id="caption-language"
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="
                      w-full px-3 py-2 rounded-md
                      bg-gray-100 dark:bg-gray-700
                      text-gray-900 dark:text-gray-100
                      border border-gray-300 dark:border-gray-600
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    "
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setShowSettings(false)}
                  className="
                    w-full px-4 py-2 rounded-md
                    bg-gray-200 dark:bg-gray-700
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-300 dark:hover:bg-gray-600
                    transition-colors
                  "
                >
                  Close Settings
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {enabled && (
        <div className="sr-only" aria-live="polite">
          Press Alt+C to toggle captions. Press Alt+S to open caption settings.
        </div>
      )}
    </>
  );
};

export default VideoCallCaptions;