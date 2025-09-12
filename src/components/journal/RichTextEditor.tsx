'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  NumberedListIcon,
  LinkIcon,
  PhotoIcon,
  FaceSmileIcon,
  CodeBracketIcon,
  ChevronDownIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon
} from '@heroicons/react/24/outline';

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoSave?: boolean;
  autoSaveDelay?: number;
  onAutoSave?: (content: string) => void;
  showWordCount?: boolean;
  showToolbar?: boolean;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  readOnly?: boolean;
  accessibilityLabel?: string;
}

interface HistoryState {
  content: string;
  selection: { start: number; end: number };
}

const EMOJI_SHORTCUTS: Record<string, string> = {
  ':)': '😊',
  ':D': '😃',
  ':(': '😢',
  ':p': '😛',
  ':o': '😮',
  ':|': '😐',
  '<3': '❤️',
  ':/': '😕',
  ':*': '😘'
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Start writing your thoughts...',
  maxLength,
  autoSave = false,
  autoSaveDelay = 3000,
  onAutoSave,
  showWordCount = true,
  showToolbar = true,
  minHeight = 200,
  maxHeight = 600,
  className = '',
  readOnly = false,
  accessibilityLabel = 'Rich text editor'
}) => {
  const [content, setContent] = useState(value);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedText, setSelectedText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const historyTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate word and character count
  useEffect(() => {
    const text = editorRef.current?.innerText || '';
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);
  }, [content]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && onAutoSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      setIsAutoSaving(false);
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        setIsAutoSaving(true);
        onAutoSave(content);
        setTimeout(() => setIsAutoSaving(false), 1000);
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, autoSave, autoSaveDelay, onAutoSave]);

  // Add to history for undo/redo
  const addToHistory = useCallback(() => {
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }

    historyTimeoutRef.current = setTimeout(() => {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      
      const newState: HistoryState = {
        content: editorRef.current?.innerHTML || '',
        selection: {
          start: range?.startOffset || 0,
          end: range?.endOffset || 0
        }
      };

      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(newState);
        // Limit history to 50 states
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        return newHistory;
      });
      
      setHistoryIndex(prev => Math.min(prev + 1, 49));
    }, 500);
  }, [historyIndex]);

  // Format text command
  const formatText = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      handleContentChange();
    }
  }, []);

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      onChange?.(newContent);
      addToHistory();
    }
  }, [onChange, addToHistory]);

  // Handle emoji shortcuts
  const handleInput = useCallback((e: React.FormEvent) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || '';
      const cursorPos = range.startOffset;
      
      // Check for emoji shortcuts
      Object.entries(EMOJI_SHORTCUTS).forEach(([shortcut, emoji]) => {
        const index = text.lastIndexOf(shortcut, cursorPos);
        if (index !== -1 && index + shortcut.length === cursorPos) {
          const before = text.substring(0, index);
          const after = text.substring(cursorPos);
          textNode.textContent = before + emoji + after;
          
          // Move cursor after emoji
          const newRange = document.createRange();
          newRange.setStart(textNode, index + emoji.length);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      });
    }

    handleContentChange();
  }, [handleContentChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Undo/Redo
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
      // Formatting shortcuts
      else if (e.key === 'b') {
        e.preventDefault();
        formatText('bold');
      } else if (e.key === 'i') {
        e.preventDefault();
        formatText('italic');
      } else if (e.key === 'u') {
        e.preventDefault();
        formatText('underline');
      }
    }

    // Tab for lists
    if (e.key === 'Tab') {
      e.preventDefault();
      formatText('insertText', '    ');
    }
  }, [formatText]);

  // Undo functionality
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      if (editorRef.current && prevState) {
        editorRef.current.innerHTML = prevState.content;
        setContent(prevState.content);
        setHistoryIndex(historyIndex - 1);
      }
    }
  }, [history, historyIndex]);

  // Redo functionality
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      if (editorRef.current && nextState) {
        editorRef.current.innerHTML = nextState.content;
        setContent(nextState.content);
        setHistoryIndex(historyIndex + 1);
      }
    }
  }, [history, historyIndex]);

  // Insert link
  const insertLink = useCallback(() => {
    if (linkUrl) {
      formatText('createLink', linkUrl);
      setShowLinkDialog(false);
      setLinkUrl('');
    }
  }, [linkUrl, formatText]);

  // Common emojis for picker
  const commonEmojis = ['😊', '😢', '😍', '🤔', '😌', '💪', '🙏', '❤️', '✨', '🌟', '🎯', '💭'];

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Toolbar */}
      {showToolbar && !readOnly && (
        <div 
          className="toolbar border-b border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800 rounded-t-lg"
          role="toolbar"
          aria-label="Text formatting tools"
        >
          <div className="flex flex-wrap items-center gap-1">
            {/* Text formatting */}
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={() => formatText('bold')}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Bold"
                title="Bold (Ctrl+B)"
                type="button"
              >
                <BoldIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => formatText('italic')}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Italic"
                title="Italic (Ctrl+I)"
                type="button"
              >
                <ItalicIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => formatText('underline')}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Underline"
                title="Underline (Ctrl+U)"
                type="button"
              >
                <UnderlineIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={() => formatText('insertUnorderedList')}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Bullet list"
                title="Bullet list"
                type="button"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => formatText('insertOrderedList')}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Numbered list"
                title="Numbered list"
                type="button"
              >
                <NumberedListIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Link and emoji */}
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={() => setShowLinkDialog(true)}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Insert link"
                title="Insert link"
                type="button"
              >
                <LinkIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Insert emoji"
                title="Insert emoji"
                type="button"
              >
                <FaceSmileIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Undo/Redo */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
                type="button"
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Redo"
                title="Redo (Ctrl+Y)"
                type="button"
              >
                <ArrowUturnRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute z-10 mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-6 gap-1">
                {commonEmojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      formatText('insertText', emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xl"
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Link Dialog */}
          {showLinkDialog && (
            <div className="absolute z-10 mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                <label htmlFor="link-url" className="block text-sm font-medium">
                  Enter URL:
                </label>
                <input
                  id="link-url"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={insertLink}
                    className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    type="button"
                  >
                    Insert
                  </button>
                  <button
                    onClick={() => {
                      setShowLinkDialog(false);
                      setLinkUrl('');
                    }}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        className={`
          editor-content p-4 
          bg-white dark:bg-gray-900 
          border border-gray-200 dark:border-gray-700 
          rounded-b-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          overflow-y-auto
        `}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`
        }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="textbox"
        aria-label={accessibilityLabel}
        aria-multiline="true"
        aria-describedby="word-count"
        suppressContentEditableWarning
      />

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
        {/* Word/Character count */}
        {showWordCount && (
          <div id="word-count" className="flex items-center gap-4">
            <span>{wordCount} words</span>
            {maxLength && (
              <span className={charCount > maxLength ? 'text-red-500' : ''}>
                {charCount}/{maxLength} characters
              </span>
            )}
          </div>
        )}

        {/* Auto-save indicator */}
        {autoSave && (
          <div className="flex items-center gap-2">
            {isAutoSaving && (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .editor-content:empty:before {
          content: attr(placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        
        .editor-content {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        .editor-content ul {
          list-style-type: disc;
          margin-left: 1.5rem;
        }
        
        .editor-content ol {
          list-style-type: decimal;
          margin-left: 1.5rem;
        }
        
        .editor-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;