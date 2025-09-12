'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaceSmileIcon, FaceFrownIcon } from '@heroicons/react/24/outline';

interface Mood {
  id: string;
  label: string;
  value: number;
  emoji: string;
  color: string;
  description: string;
}

const moods: Mood[] = [
  { id: 'very-sad', label: 'Very Sad', value: 1, emoji: '😢', color: 'bg-red-500', description: 'Feeling very down or depressed' },
  { id: 'sad', label: 'Sad', value: 2, emoji: '😔', color: 'bg-orange-500', description: 'Feeling sad or unhappy' },
  { id: 'neutral', label: 'Neutral', value: 3, emoji: '😐', color: 'bg-yellow-500', description: 'Feeling neither good nor bad' },
  { id: 'happy', label: 'Happy', value: 4, emoji: '😊', color: 'bg-blue-500', description: 'Feeling good and positive' },
  { id: 'very-happy', label: 'Very Happy', value: 5, emoji: '😄', color: 'bg-green-500', description: 'Feeling great and joyful' }
];

interface KeyboardMoodTrackerProps {
  onMoodSelect: (mood: Mood) => void;
  selectedMood?: string;
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const KeyboardMoodTracker: React.FC<KeyboardMoodTrackerProps> = ({
  onMoodSelect,
  selectedMood,
  showLabels = true,
  size = 'medium',
  className = ''
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const moodRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const sizeClasses = {
    small: 'h-12 w-12 text-2xl',
    medium: 'h-16 w-16 text-3xl',
    large: 'h-20 w-20 text-4xl'
  };

  useEffect(() => {
    // Focus the selected mood or first mood on mount
    const selectedIndex = selectedMood 
      ? moods.findIndex(m => m.id === selectedMood)
      : 0;
    if (selectedIndex >= 0) {
      setFocusedIndex(selectedIndex);
    }
  }, [selectedMood]);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;
    let handled = false;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.min(currentIndex + 1, moods.length - 1);
        handled = true;
        break;
      
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        handled = true;
        break;
      
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        handled = true;
        break;
      
      case 'End':
        e.preventDefault();
        newIndex = moods.length - 1;
        handled = true;
        break;
      
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleMoodSelect(moods[currentIndex]);
        handled = true;
        break;
      
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        e.preventDefault();
        const numIndex = parseInt(e.key) - 1;
        if (numIndex >= 0 && numIndex < moods.length) {
          newIndex = numIndex;
          handleMoodSelect(moods[numIndex]);
          handled = true;
        }
        break;
    }

    if (handled && newIndex !== currentIndex) {
      setFocusedIndex(newIndex);
      moodRefs.current[newIndex]?.focus();
      
      // Announce the focused mood
      const mood = moods[newIndex];
      setAnnouncement(`${mood.label}, ${mood.description}. Press Enter to select.`);
    }
  };

  const handleMoodSelect = (mood: Mood) => {
    onMoodSelect(mood);
    setAnnouncement(`Selected ${mood.label}`);
  };

  const handleMouseEnter = (index: number) => {
    setFocusedIndex(index);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          How are you feeling?
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Use arrow keys or numbers 1-5
        </span>
      </div>

      <div 
        className="flex items-center justify-center gap-2 sm:gap-4"
        role="group"
        aria-label="Mood selection"
      >
        {moods.map((mood, index) => (
          <div key={mood.id} className="flex flex-col items-center space-y-2">
            <button
              ref={el => moodRefs.current[index] = el}
              type="button"
              onClick={() => handleMoodSelect(mood)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onMouseEnter={() => handleMouseEnter(index)}
              onFocus={() => setFocusedIndex(index)}
              className={`
                ${sizeClasses[size]}
                rounded-full
                transition-all duration-200
                transform hover:scale-110 focus:scale-110
                ${selectedMood === mood.id 
                  ? `ring-4 ring-offset-2 ${mood.color} ring-opacity-50` 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }
                ${focusedIndex === index 
                  ? 'ring-2 ring-blue-500 ring-offset-2' 
                  : ''
                }
                focus:outline-none
                relative
              `}
              aria-label={`${mood.label}: ${mood.description}`}
              aria-pressed={selectedMood === mood.id}
              aria-describedby={`mood-desc-${mood.id}`}
              tabIndex={focusedIndex === index ? 0 : -1}
            >
              <span className="text-4xl" role="img" aria-hidden="true">
                {mood.emoji}
              </span>
              
              {/* Keyboard shortcut indicator */}
              <span className="absolute -top-2 -right-2 text-xs bg-gray-200 dark:bg-gray-700 rounded-full h-5 w-5 flex items-center justify-center font-mono">
                {index + 1}
              </span>
            </button>
            
            {showLabels && (
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {mood.label}
                </p>
                <p 
                  id={`mood-desc-${mood.id}`}
                  className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block"
                >
                  {mood.description}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Visual feedback for selected mood */}
      {selectedMood && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Current mood: <strong>{moods.find(m => m.id === selectedMood)?.label}</strong>
          </p>
        </div>
      )}

      {/* Screen reader announcements */}
      <div 
        className="sr-only" 
        role="status" 
        aria-live="assertive" 
        aria-atomic="true"
      >
        {announcement}
      </div>

      {/* Keyboard navigation help */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
          Keyboard shortcuts
        </summary>
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
          <dl className="space-y-1">
            <div className="flex">
              <dt className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-2">←/→</dt>
              <dd className="text-gray-600 dark:text-gray-400">Navigate moods</dd>
            </div>
            <div className="flex">
              <dt className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-2">1-5</dt>
              <dd className="text-gray-600 dark:text-gray-400">Quick select mood</dd>
            </div>
            <div className="flex">
              <dt className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-2">Enter</dt>
              <dd className="text-gray-600 dark:text-gray-400">Select focused mood</dd>
            </div>
            <div className="flex">
              <dt className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-2">Home/End</dt>
              <dd className="text-gray-600 dark:text-gray-400">Jump to first/last</dd>
            </div>
          </dl>
        </div>
      </details>
    </div>
  );
};

export default KeyboardMoodTracker;