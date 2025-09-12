'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  CheckIcon, 
  MinusIcon,
  TrashIcon,
  ArchiveBoxIcon,
  TagIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'warning';
  action: (selectedIds: Set<string>) => void | Promise<void>;
}

interface SelectableItem {
  id: string;
  disabled?: boolean;
  [key: string]: any;
}

interface BulkActionSelectorProps<T extends SelectableItem> {
  items: T[];
  actions: BulkAction[];
  onSelectionChange?: (selectedIds: Set<string>) => void;
  renderItem: (item: T, isSelected: boolean, onToggle: () => void) => React.ReactNode;
  maxSelection?: number;
  showFloatingBar?: boolean;
  className?: string;
  keyboardShortcuts?: boolean;
}

export function BulkActionSelector<T extends SelectableItem>({
  items,
  actions,
  onSelectionChange,
  renderItem,
  maxSelection,
  showFloatingBar = true,
  className = '',
  keyboardShortcuts = true
}: BulkActionSelectorProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedAction, setProcessedAction] = useState<string | null>(null);

  const selectableItems = items.filter(item => !item.disabled);
  const allSelectableIds = new Set(selectableItems.map(item => item.id));
  const isAllSelected = selectableItems.length > 0 && 
    selectableItems.every(item => selectedIds.has(item.id));
  const isIndeterminate = selectedIds.size > 0 && !isAllSelected;

  // Toggle single item selection
  const toggleSelection = useCallback((id: string, index?: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (maxSelection && next.size >= maxSelection) {
          return prev;
        }
        next.add(id);
      }
      onSelectionChange?.(next);
      return next;
    });
    
    if (index !== undefined) {
      setLastSelectedIndex(index);
    }
  }, [maxSelection, onSelectionChange]);

  // Toggle selection with shift key support
  const handleToggleWithShift = useCallback((id: string, index: number, shiftKey: boolean) => {
    if (!shiftKey || lastSelectedIndex === null) {
      toggleSelection(id, index);
      return;
    }

    // Shift selection
    const start = Math.min(lastSelectedIndex, index);
    const end = Math.max(lastSelectedIndex, index);
    
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        const item = items[i];
        if (item && !item.disabled) {
          if (maxSelection && next.size >= maxSelection && !next.has(item.id)) {
            break;
          }
          next.add(item.id);
        }
      }
      onSelectionChange?.(next);
      return next;
    });
  }, [items, lastSelectedIndex, maxSelection, toggleSelection, onSelectionChange]);

  // Select all
  const selectAll = useCallback(() => {
    const toSelect = maxSelection 
      ? new Set(Array.from(allSelectableIds).slice(0, maxSelection))
      : allSelectableIds;
    setSelectedIds(toSelect);
    onSelectionChange?.(toSelect);
  }, [allSelectableIds, maxSelection, onSelectionChange]);

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    onSelectionChange?.(new Set());
  }, [onSelectionChange]);

  // Toggle all
  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [isAllSelected, selectAll, deselectAll]);

  // Execute bulk action
  const executeAction = useCallback(async (action: BulkAction) => {
    if (selectedIds.size === 0) return;
    
    setIsProcessing(true);
    setProcessedAction(action.id);
    
    try {
      await action.action(selectedIds);
      
      // Clear selection after successful action
      deselectAll();
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessedAction(null), 2000);
    }
  }, [selectedIds, deselectAll]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!keyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }
      // Escape: Deselect all
      else if (e.key === 'Escape') {
        deselectAll();
      }
      // Delete: Execute delete action if available
      else if (e.key === 'Delete' && selectedIds.size > 0) {
        const deleteAction = actions.find(a => a.id === 'delete' || a.label.toLowerCase().includes('delete'));
        if (deleteAction) {
          e.preventDefault();
          executeAction(deleteAction);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcuts, selectAll, deselectAll, selectedIds, actions, executeAction]);

  return (
    <div className={className}>
      {/* Select All Checkbox */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="relative flex items-center">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={input => {
                if (input) {
                  input.indeterminate = isIndeterminate;
                }
              }}
              onChange={toggleAll}
              className="
                h-5 w-5 rounded border-gray-300 dark:border-gray-600
                text-blue-500 focus:ring-2 focus:ring-blue-500
                dark:bg-gray-800
              "
              aria-label={isAllSelected ? 'Deselect all' : 'Select all'}
            />
            {isIndeterminate && (
              <MinusIcon className="absolute h-3 w-3 text-white pointer-events-none left-1" />
            )}
          </label>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedIds.size === 0 
              ? 'Select items'
              : `${selectedIds.size} selected`
            }
            {maxSelection && ` (max ${maxSelection})`}
          </span>
        </div>

        {/* Inline Actions (for desktop) */}
        {selectedIds.size > 0 && !showFloatingBar && (
          <div className="hidden md:flex items-center gap-2">
            {actions.map(action => (
              <button
                key={action.id}
                onClick={() => executeAction(action)}
                disabled={isProcessing}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
                  transition-colors
                  ${action.variant === 'danger' 
                    ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                    : action.variant === 'warning'
                    ? 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {processedAction === action.id ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  action.icon
                )}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="relative">
            {renderItem(
              item,
              selectedIds.has(item.id),
              () => handleToggleWithShift(item.id, index, false)
            )}
          </div>
        ))}
      </div>

      {/* Floating Action Bar */}
      {showFloatingBar && selectedIds.size > 0 && (
        <div className="
          fixed bottom-6 left-1/2 -translate-x-1/2 z-40
          bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-xl
          p-2
          animate-slide-up
        ">
          <div className="flex items-center gap-2">
            <span className="px-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedIds.size} selected
            </span>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
            
            {actions.map(action => (
              <button
                key={action.id}
                onClick={() => executeAction(action)}
                disabled={isProcessing}
                className={`
                  p-2 rounded-md transition-colors
                  ${action.variant === 'danger' 
                    ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                    : action.variant === 'warning'
                    ? 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title={action.label}
                aria-label={action.label}
              >
                {processedAction === action.id ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="h-5 w-5">{action.icon}</span>
                )}
              </button>
            ))}
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
            
            <button
              onClick={deselectAll}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              aria-label="Clear selection"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Example usage with checkbox items
interface CheckboxListItem {
  id: string;
  title: string;
  subtitle?: string;
  disabled?: boolean;
}

export const BulkCheckboxList: React.FC<{
  items: CheckboxListItem[];
  onBulkAction: (action: string, ids: Set<string>) => void;
}> = ({ items, onBulkAction }) => {
  const actions: BulkAction[] = [
    {
      id: 'delete',
      label: 'Delete',
      icon: <TrashIcon className="h-5 w-5" />,
      variant: 'danger',
      action: (ids) => onBulkAction('delete', ids)
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: <ArchiveBoxIcon className="h-5 w-5" />,
      action: (ids) => onBulkAction('archive', ids)
    },
    {
      id: 'export',
      label: 'Export',
      icon: <ArrowDownTrayIcon className="h-5 w-5" />,
      action: (ids) => onBulkAction('export', ids)
    }
  ];

  return (
    <BulkActionSelector
      items={items}
      actions={actions}
      renderItem={(item, isSelected, onToggle) => (
        <label 
          className={`
            flex items-center gap-3 p-4 rounded-lg cursor-pointer
            ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
            ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : 'bg-white dark:bg-gray-900'}
            transition-all
          `}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            disabled={item.disabled}
            className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {item.title}
            </div>
            {item.subtitle && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {item.subtitle}
              </div>
            )}
          </div>
        </label>
      )}
    />
  );
};

export default BulkActionSelector;