/**
 * Error Monitor Component
 * Real-time error tracking and analysis dashboard
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bug, AlertCircle, TrendingDown, Filter, Download } from '@/components/ui/Icons';
import { useErrorMonitoring, ErrorEvent, ErrorPattern } from '@/lib/performance/error-monitoring';

interface ErrorCardProps {
  error: ErrorEvent;
  isExpanded: boolean;
  onToggle: () => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ error, isExpanded, onToggle }) => {
  const severityColors = {
    low: 'border-blue-200 bg-blue-50',
    medium: 'border-yellow-200 bg-yellow-50',
    high: 'border-orange-200 bg-orange-50',
    critical: 'border-red-200 bg-red-50'
  };

  const severityTextColors = {
    low: 'text-blue-800',
    medium: 'text-yellow-800',
    high: 'text-orange-800',
    critical: 'text-red-800'
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFileLocation = (filename?: string, lineno?: number, colno?: number) => {
    if (!filename) return 'Unknown location';
    const parts = filename.split('/');
    const file = parts[parts.length - 1] || filename;
    return `${file}${lineno ? `:${lineno}` : ''}${colno ? `:${colno}` : ''}`;
  };

  return (
    <div className={`border rounded-lg ${severityColors[error.severity]} transition-all`}>
      <div className='p-4 cursor-pointer hover:bg-white hover:bg-opacity-50' onClick={onToggle}>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <div className='flex items-center space-x-3 mb-2'>
              <span
                className={`px-2 py-1 rounded text-xs font-medium uppercase ${severityColors[error.severity]} border`}
              >
                {error.severity}
              </span>
              <span className='px-2 py-1 rounded text-xs bg-gray-100 text-gray-700'>
                {error.type}
              </span>
              <span className='text-xs text-gray-500'>{formatTime(error.timestamp)}</span>
            </div>

            <h3 className={`font-medium text-sm mb-1 ${severityTextColors[error.severity]}`}>
              {error.message}
            </h3>

            <p className='text-xs text-gray-600'>
              {formatFileLocation(error.filename, error.lineno, error.colno)}
            </p>
          </div>

          <div className='flex items-center space-x-2'>
            {error.userId && (
              <span className='text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded'>
                User: {error.userId.substring(0, 8)}...
              </span>
            )}
            <AlertTriangle className='w-4 h-4 text-gray-400' />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className='border-t border-opacity-50 p-4 space-y-4'>
          {error.stack && (
            <div>
              <h4 className='font-medium text-sm text-gray-900 mb-2'>Stack Trace</h4>
              <pre className='text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto'>
                {error.stack}
              </pre>
            </div>
          )}

          {error.context && Object.keys(error.context).length > 0 && (
            <div>
              <h4 className='font-medium text-sm text-gray-900 mb-2'>Context</h4>
              <pre className='text-xs bg-gray-100 p-3 rounded overflow-x-auto'>
                {JSON.stringify(error.context, null, 2)}
              </pre>
            </div>
          )}

          <div className='grid grid-cols-2 gap-4 text-xs'>
            <div>
              <span className='font-medium text-gray-700'>URL:</span>
              <p className='text-gray-600 break-all'>{error.url}</p>
            </div>
            <div>
              <span className='font-medium text-gray-700'>Session:</span>
              <p className='text-gray-600 font-mono'>{error.sessionId}</p>
            </div>
            <div>
              <span className='font-medium text-gray-700'>User Agent:</span>
              <p className='text-gray-600 break-all'>{error.userAgent}</p>
            </div>
            <div>
              <span className='font-medium text-gray-700'>Error ID:</span>
              <p className='text-gray-600 font-mono'>{error.id}</p>
            </div>
          </div>

          {error.performanceImpact && (
            <div>
              <h4 className='font-medium text-sm text-gray-900 mb-2'>Performance Impact</h4>
              <div className='grid grid-cols-2 gap-4 text-xs'>
                <div>
                  <span className='font-medium'>Before Error:</span>
                  {error.performanceImpact.beforeError.memoryUsage && (
                    <p>
                      Memory:{' '}
                      {Math.round(
                        error.performanceImpact.beforeError.memoryUsage.usedJSHeapSize / 1024 / 1024
                      )}
                      MB
                    </p>
                  )}
                  <p>Resources: {error.performanceImpact.beforeError.resourceCount}</p>
                </div>
                <div>
                  <span className='font-medium'>After Error:</span>
                  {error.performanceImpact.afterError.memoryUsage && (
                    <p>
                      Memory:{' '}
                      {Math.round(
                        error.performanceImpact.afterError.memoryUsage.usedJSHeapSize / 1024 / 1024
                      )}
                      MB
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface PatternCardProps {
  pattern: ErrorPattern;
}

const PatternCard: React.FC<PatternCardProps> = ({ pattern }) => {
  const severityColors = {
    low: 'border-blue-200 bg-blue-50',
    medium: 'border-yellow-200 bg-yellow-50',
    high: 'border-orange-200 bg-orange-50',
    critical: 'border-red-200 bg-red-50'
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={`p-4 border rounded-lg ${severityColors[pattern.severity]}`}>
      <div className='flex items-start justify-between mb-3'>
        <div>
          <span
            className={`px-2 py-1 rounded text-xs font-medium uppercase ${severityColors[pattern.severity]} border`}
          >
            {pattern.severity}
          </span>
          <h3 className='font-medium text-sm text-gray-900 mt-2'>{pattern.pattern}</h3>
        </div>
        <div className='text-right'>
          <div className='text-2xl font-bold text-gray-900'>{pattern.count}</div>
          <div className='text-xs text-gray-500'>occurrences</div>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4 text-xs text-gray-600'>
        <div>
          <span className='font-medium'>First seen:</span>
          <p>{formatTime(pattern.firstOccurrence)}</p>
        </div>
        <div>
          <span className='font-medium'>Last seen:</span>
          <p>{formatTime(pattern.lastOccurrence)}</p>
        </div>
        <div>
          <span className='font-medium'>Affected users:</span>
          <p>{pattern.affectedUsers.size} users</p>
        </div>
        <div>
          <span className='font-medium'>Frequency:</span>
          <p>
            {(
              pattern.count /
              Math.max(1, (Date.now() - pattern.firstOccurrence) / (24 * 60 * 60 * 1000))
            ).toFixed(1)}
            /day
          </p>
        </div>
      </div>
    </div>
  );
};

interface ErrorMonitorProps {
  showPatterns?: boolean;
  maxErrors?: number;
  refreshInterval?: number;
}

const ErrorMonitor: React.FC<ErrorMonitorProps> = ({ showPatterns = true, maxErrors = 50 }) => {
  const { errors, patterns, stats, subscribe, exportData } = useErrorMonitoring();
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setIsLive(true);
      setTimeout(() => setIsLive(false), 2000);
    });

    return unsubscribe;
  }, [subscribe]);

  const toggleErrorExpansion = (errorId: string) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(errorId)) {
      newExpanded.delete(errorId);
    } else {
      newExpanded.add(errorId);
    }
    setExpandedErrors(newExpanded);
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${new Date().toISOString().split('T')[0] || ''}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredErrors = errors
    .filter(error => severityFilter === 'all' || error.severity === severityFilter)
    .filter(error => typeFilter === 'all' || error.type === typeFilter)
    .slice(-maxErrors);

  const severityOptions = ['all', ...Object.keys(stats.bySeverity)];
  const typeOptions = ['all', ...Object.keys(stats.byType)];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className='w-4 h-4 text-red-600' />;
      case 'high':
        return <AlertTriangle className='w-4 h-4 text-orange-600' />;
      case 'medium':
        return <AlertTriangle className='w-4 h-4 text-yellow-600' />;
      default:
        return <Bug className='w-4 h-4 text-blue-600' />;
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900 flex items-center space-x-3'>
            <Bug className='w-6 h-6' />
            <span>Error Monitor</span>
            {isLive && (
              <span className='inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800'>
                <div className='w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse' />
                New Error
              </span>
            )}
          </h2>
          <p className='text-gray-600 mt-1'>Real-time error tracking and analysis</p>
        </div>

        <div className='flex items-center space-x-2'>
          <button
            onClick={handleExport}
            className='px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center space-x-2'
          >
            <Download className='w-4 h-4' />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='p-4 bg-white rounded-lg border'>
          <div className='flex items-center space-x-2 mb-2'>
            <AlertTriangle className='w-4 h-4 text-gray-500' />
            <span className='text-sm font-medium text-gray-700'>Total Errors</span>
          </div>
          <div className='text-2xl font-bold text-gray-900'>{stats.total}</div>
          <div className='text-xs text-gray-500'>{stats.last24Hours} in last 24h</div>
        </div>

        {Object.entries(stats.bySeverity).map(([severity, count]) => (
          <div key={severity} className='p-4 bg-white rounded-lg border'>
            <div className='flex items-center space-x-2 mb-2'>
              {getSeverityIcon(severity)}
              <span className='text-sm font-medium text-gray-700 capitalize'>{severity}</span>
            </div>
            <div className='text-2xl font-bold text-gray-900'>{count}</div>
            <div className='text-xs text-gray-500'>
              {((count / Math.max(1, stats.total)) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className='flex items-center space-x-4 p-4 bg-gray-50 rounded-lg'>
        <Filter className='w-4 h-4 text-gray-500' />
        <div className='flex items-center space-x-2'>
          <label className='text-sm font-medium text-gray-700'>Severity:</label>
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className='text-sm border border-gray-300 rounded px-2 py-1'
          >
            {severityOptions.map(option => (
              <option key={option} value={option}>
                {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className='flex items-center space-x-2'>
          <label className='text-sm font-medium text-gray-700'>Type:</label>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className='text-sm border border-gray-300 rounded px-2 py-1'
          >
            {typeOptions.map(option => (
              <option key={option} value={option}>
                {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className='text-sm text-gray-500 ml-auto'>
          Showing {filteredErrors.length} of {errors.length} errors
        </div>
      </div>

      {/* Error Patterns */}
      {showPatterns && patterns.length > 0 && (
        <div className='space-y-4'>
          <h3 className='text-lg font-semibold text-gray-900'>Error Patterns</h3>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {patterns.slice(0, 6).map((pattern, index) => (
              <PatternCard key={index} pattern={pattern} />
            ))}
          </div>
        </div>
      )}

      {/* Error List */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900'>Recent Errors</h3>
          <TrendingDown className='w-5 h-5 text-gray-400' />
        </div>

        {filteredErrors.length === 0 ? (
          <div className='text-center py-12 bg-white rounded-lg border'>
            <Bug className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>No Errors Found</h3>
            <p className='text-gray-500'>
              {errors.length === 0
                ? 'No errors have been recorded yet.'
                : 'No errors match the current filters.'}
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {filteredErrors.map(error => (
              <ErrorCard
                key={error.id}
                error={error}
                isExpanded={expandedErrors.has(error.id)}
                onToggle={() => toggleErrorExpansion(error.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorMonitor;
