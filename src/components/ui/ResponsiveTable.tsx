'use client';

import React, { useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
  mobileLabel?: string; // Short label for mobile
  priority?: 'high' | 'medium' | 'low'; // Show/hide on mobile
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  striped?: boolean;
  compact?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  className = '',
  emptyMessage = 'No data available',
  loading = false,
  striped = true,
  compact = false
}: ResponsiveTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(current => 
        current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc'
      );
      if (sortDirection === 'desc') {
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  const toggleRowExpansion = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getValue = (item: T, key: string): any => {
    if (key.includes('.')) {
      return key.split('.').reduce((obj, k) => obj?.[k], item as any);
    }
    return item[key];
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key as string}
                  scope="col"
                  className={`
                    ${compact ? 'px-3 py-2' : 'px-6 py-3'}
                    text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider
                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                    ${column.className || ''}
                  `}
                  onClick={column.sortable ? () => handleSort(column.key as string) : undefined}
                  aria-sort={
                    sortColumn === column.key
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="ml-2 flex-none">
                        {sortColumn === column.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                          )
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedData.map((item, index) => {
              const key = keyExtractor(item);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={`
                    ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}
                    ${striped && index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                    transition-colors duration-150
                  `}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(item);
                    }
                  } : undefined}
                  role={onRowClick ? 'button' : undefined}
                  aria-label={onRowClick ? `View details for row ${index + 1}` : undefined}
                >
                  {columns.map(column => (
                    <td
                      key={column.key as string}
                      className={`
                        ${compact ? 'px-3 py-2' : 'px-6 py-4'}
                        whitespace-nowrap text-sm text-gray-900 dark:text-gray-100
                        ${column.className || ''}
                      `}
                    >
                      {column.render 
                        ? column.render(getValue(item, column.key as string), item)
                        : getValue(item, column.key as string)
                      }
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {sortedData.map((item) => {
          const key = keyExtractor(item);
          const isExpanded = expandedRows.has(key);
          const highPriorityColumns = columns.filter(c => c.priority !== 'low');
          const lowPriorityColumns = columns.filter(c => c.priority === 'low');

          return (
            <div
              key={key}
              className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden"
            >
              <button
                onClick={() => {
                  toggleRowExpansion(key);
                  if (onRowClick && !isExpanded) {
                    onRowClick(item);
                  }
                }}
                className="w-full px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details`}
              >
                <div className="space-y-2">
                  {highPriorityColumns.map(column => {
                    const value = getValue(item, column.key as string);
                    const displayValue = column.render ? column.render(value, item) : value;
                    
                    return (
                      <div key={column.key as string} className="flex justify-between items-start">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {column.mobileLabel || column.label}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-gray-100 font-medium text-right">
                          {displayValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {lowPriorityColumns.length > 0 && (
                  <div className="mt-3 flex items-center justify-center text-gray-400">
                    {isExpanded ? (
                      <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                )}
              </button>

              {isExpanded && lowPriorityColumns.length > 0 && (
                <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 mt-2 pt-3 space-y-2">
                  {lowPriorityColumns.map(column => {
                    const value = getValue(item, column.key as string);
                    const displayValue = column.render ? column.render(value, item) : value;
                    
                    return (
                      <div key={column.key as string} className="flex justify-between items-start">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {column.mobileLabel || column.label}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 text-right">
                          {displayValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ResponsiveTable;