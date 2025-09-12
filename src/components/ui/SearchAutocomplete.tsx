'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, ClockIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  icon?: React.ReactNode;
  metadata?: Record<string, any>;
}

interface SearchAutocompleteProps {
  placeholder?: string;
  data: SearchResult[];
  onSelect: (result: SearchResult) => void;
  onSearch?: (query: string) => void;
  recentSearches?: string[];
  trendingSearches?: string[];
  maxResults?: number;
  minChars?: number;
  debounceMs?: number;
  fuzzySearch?: boolean;
  showCategories?: boolean;
  className?: string;
  disabled?: boolean;
}

// Fuzzy search algorithm
const fuzzyMatch = (pattern: string, text: string): number => {
  pattern = pattern.toLowerCase();
  text = text.toLowerCase();
  
  if (pattern === text) return 1;
  if (text.includes(pattern)) return 0.8;
  
  let patternIdx = 0;
  let textIdx = 0;
  let score = 0;
  let consecutiveMatches = 0;
  
  while (patternIdx < pattern.length && textIdx < text.length) {
    if (pattern[patternIdx] === text[textIdx]) {
      score += 1 + (consecutiveMatches * 0.1);
      consecutiveMatches++;
      patternIdx++;
    } else {
      consecutiveMatches = 0;
    }
    textIdx++;
  }
  
  if (patternIdx === pattern.length) {
    return score / (pattern.length * 2);
  }
  
  return 0;
};

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  placeholder = 'Search...',
  data,
  onSelect,
  onSearch,
  recentSearches = [],
  trendingSearches = [],
  maxResults = 10,
  minChars = 1,
  debounceMs = 300,
  fuzzySearch = true,
  showCategories = true,
  className = '',
  disabled = false
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Filter and score results
  const searchResults = useMemo(() => {
    if (query.length < minChars) return [];
    
    const results = data.map(item => {
      let score = 0;
      
      if (fuzzySearch) {
        // Calculate fuzzy match scores
        const titleScore = fuzzyMatch(query, item.title) * 2; // Title has more weight
        const subtitleScore = item.subtitle ? fuzzyMatch(query, item.subtitle) : 0;
        const categoryScore = item.category ? fuzzyMatch(query, item.category) * 0.5 : 0;
        
        score = titleScore + subtitleScore + categoryScore;
      } else {
        // Simple includes search
        const lowerQuery = query.toLowerCase();
        if (item.title.toLowerCase().includes(lowerQuery)) score = 2;
        else if (item.subtitle?.toLowerCase().includes(lowerQuery)) score = 1;
        else if (item.category?.toLowerCase().includes(lowerQuery)) score = 0.5;
      }
      
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
    
    return results;
  }, [query, data, minChars, fuzzySearch, maxResults]);

  // Group results by category
  const groupedResults = useMemo(() => {
    if (!showCategories) return { '': searchResults };
    
    return searchResults.reduce((groups, result) => {
      const category = result.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(result);
      return groups;
    }, {} as Record<string, typeof searchResults>);
  }, [searchResults, showCategories]);

  // Handle input change with debouncing
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (value.length >= minChars) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        setIsSearching(false);
        onSearch?.(value);
      }, debounceMs);
    }
    
    setIsOpen(value.length > 0);
  }, [minChars, debounceMs, onSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && query.length >= minChars) {
        setIsOpen(true);
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleSelect(searchResults[selectedIndex]);
        } else if (query) {
          onSearch?.(query);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case 'Tab':
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          e.preventDefault();
          handleSelect(searchResults[selectedIndex]);
        }
        break;
    }
  }, [isOpen, query, minChars, searchResults, selectedIndex, onSearch]);

  // Handle result selection
  const handleSelect = useCallback((result: SearchResult) => {
    setQuery(result.title);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect(result);
    
    // Save to recent searches
    if (typeof window !== 'undefined') {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      const updated = [result.title, ...recent.filter((r: string) => r !== result.title)].slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  }, [onSelect]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 font-semibold">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  const showSuggestions = query.length === 0 && (recentSearches.length > 0 || trendingSearches.length > 0);
  const showResults = searchResults.length > 0;
  const showEmpty = query.length >= minChars && !isSearching && searchResults.length === 0;

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full pl-10 pr-10 py-2
            border border-gray-300 dark:border-gray-600
            rounded-lg
            bg-white dark:bg-gray-900
            text-gray-900 dark:text-gray-100
            placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          `}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-label="Search"
          autoComplete="off"
        />
        
        {/* Clear button */}
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            aria-label="Clear search"
          >
            <XMarkIcon className="h-4 w-4 text-gray-400" />
          </button>
        )}
        
        {/* Loading indicator */}
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="search-results"
          className="
            absolute z-50 w-full mt-2
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
            max-h-96 overflow-y-auto
          "
          role="listbox"
        >
          {/* Suggestions (when no query) */}
          {showSuggestions && (
            <div className="p-4 space-y-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    <ClockIcon className="h-4 w-4" />
                    Recent Searches
                  </div>
                  <div className="space-y-1">
                    {recentSearches.slice(0, 5).map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleInputChange(search)}
                        className="
                          w-full text-left px-3 py-2 rounded-md
                          hover:bg-gray-100 dark:hover:bg-gray-700
                          text-sm text-gray-700 dark:text-gray-300
                          transition-colors
                        "
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Trending Searches */}
              {trendingSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                    Trending
                  </div>
                  <div className="space-y-1">
                    {trendingSearches.slice(0, 5).map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleInputChange(search)}
                        className="
                          w-full text-left px-3 py-2 rounded-md
                          hover:bg-gray-100 dark:hover:bg-gray-700
                          text-sm text-gray-700 dark:text-gray-300
                          transition-colors
                        "
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Results */}
          {showResults && (
            <div className="py-2">
              {Object.entries(groupedResults).map(([category, results]) => (
                <div key={category}>
                  {showCategories && category && (
                    <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {category}
                    </div>
                  )}
                  {results.map((result, index) => {
                    const globalIndex = searchResults.indexOf(result);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`
                          w-full text-left px-4 py-3
                          flex items-start gap-3
                          transition-colors
                          ${isSelected 
                            ? 'bg-blue-50 dark:bg-blue-900/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }
                        `}
                        role="option"
                        aria-selected={isSelected}
                      >
                        {result.icon && (
                          <div className="flex-shrink-0 mt-0.5">
                            {result.icon}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {highlightMatch(result.title, query)}
                          </div>
                          {result.subtitle && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {highlightMatch(result.subtitle, query)}
                            </div>
                          )}
                        </div>
                        {fuzzySearch && (
                          <div className="flex-shrink-0 text-xs text-gray-400">
                            {Math.round(result.score * 100)}%
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {showEmpty && (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No results found for "{query}"
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Try adjusting your search terms
              </p>
            </div>
          )}
        </div>
      )}

      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isSearching && 'Searching...'}
        {!isSearching && searchResults.length > 0 && 
          `${searchResults.length} results found`
        }
      </div>
    </div>
  );
};

export default SearchAutocomplete;