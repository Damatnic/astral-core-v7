/**
 * Database Performance Monitor Component
 * Real-time database query performance tracking and insights
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Database, TrendingUp, Clock, AlertTriangle, Activity, BarChart3, Zap } from '@/components/ui/Icons';
import {
  useDatabaseMonitoring,
  QueryMetric,
  DatabaseInsight
} from '@/lib/performance/db-monitoring';

interface QueryCardProps {
  query: QueryMetric;
  isExpanded: boolean;
  onToggle: () => void;
}

const QueryCard: React.FC<QueryCardProps> = ({ query, isExpanded, onToggle }) => {
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'SELECT':
        return 'bg-blue-100 text-blue-800';
      case 'INSERT':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'UPSERT':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDurationSeverity = (duration: number) => {
    if (duration > 5000) return 'text-red-600';
    if (duration > 1000) return 'text-orange-600';
    if (duration > 500) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className='border rounded-lg bg-white hover:shadow-md transition-all'>
      <div className='p-4 cursor-pointer' onClick={onToggle}>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <div className='flex items-center space-x-3 mb-2'>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${getOperationColor(query.operation)}`}
              >
                {query.operation}
              </span>
              {query.table && (
                <span className='px-2 py-1 rounded text-xs bg-gray-100 text-gray-700'>
                  {query.table}
                </span>
              )}
              {query.cacheHit !== undefined && (
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    query.cacheHit ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {query.cacheHit ? 'Cached' : 'DB Hit'}
                </span>
              )}
            </div>

            <h3 className='font-medium text-sm text-gray-900 mb-1 truncate'>{query.query}</h3>

            <div className='flex items-center space-x-4 text-xs text-gray-600'>
              <span>
                <Clock className='w-3 h-3 inline mr-1' />
                {new Date(query.timestamp).toLocaleTimeString()}
              </span>
              {query.rows > 0 && <span>{query.rows} rows</span>}
              {query.endpoint && <span className='truncate'>{query.endpoint}</span>}
            </div>
          </div>

          <div className='text-right'>
            <div className={`text-lg font-bold ${getDurationSeverity(query.duration)}`}>
              {formatDuration(query.duration)}
            </div>
            {!query.success && (
              <div className='flex items-center text-red-600 text-xs'>
                <AlertTriangle className='w-3 h-3 mr-1' />
                Error
              </div>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className='border-t p-4 space-y-4'>
          <div>
            <h4 className='font-medium text-sm text-gray-900 mb-2'>Full Query</h4>
            <pre className='text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto'>
              {query.query}
            </pre>
          </div>

          {query.errorMessage && (
            <div>
              <h4 className='font-medium text-sm text-red-900 mb-2'>Error Details</h4>
              <div className='text-xs bg-red-50 text-red-700 p-3 rounded'>{query.errorMessage}</div>
            </div>
          )}

          {query.executionPlan && (
            <div>
              <h4 className='font-medium text-sm text-gray-900 mb-2'>Execution Plan</h4>
              <pre className='text-xs bg-gray-100 p-3 rounded overflow-x-auto'>
                {JSON.stringify(query.executionPlan, null, 2)}
              </pre>
            </div>
          )}

          <div className='grid grid-cols-2 gap-4 text-xs'>
            <div>
              <span className='font-medium text-gray-700'>Query ID:</span>
              <p className='text-gray-600 font-mono'>{query.id}</p>
            </div>
            <div>
              <span className='font-medium text-gray-700'>Duration:</span>
              <p className='text-gray-600'>{formatDuration(query.duration)}</p>
            </div>
            <div>
              <span className='font-medium text-gray-700'>Rows Affected:</span>
              <p className='text-gray-600'>{query.rows}</p>
            </div>
            {query.userId && (
              <div>
                <span className='font-medium text-gray-700'>User ID:</span>
                <p className='text-gray-600'>{query.userId}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface InsightCardProps {
  insight: DatabaseInsight;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const severityColors = {
    low: 'border-blue-200 bg-blue-50',
    medium: 'border-yellow-200 bg-yellow-50',
    high: 'border-orange-200 bg-orange-50',
    critical: 'border-red-200 bg-red-50'
  };

  const typeIcons = {
    'slow-query': <Clock className='w-4 h-4' />,
    'frequent-query': <TrendingUp className='w-4 h-4' />,
    'n-plus-one': <AlertTriangle className='w-4 h-4' />,
    'full-table-scan': <Database className='w-4 h-4' />,
    'cache-miss': <Zap className='w-4 h-4' />
  };

  return (
    <div className={`p-4 border rounded-lg ${severityColors[insight.severity]}`}>
      <div className='flex items-start space-x-3'>
        <div className='flex-shrink-0 mt-0.5'>{typeIcons[insight.type]}</div>

        <div className='flex-1'>
          <div className='flex items-center justify-between mb-2'>
            <h4 className='font-medium text-gray-900'>
              {insight.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h4>
            <div className='flex items-center space-x-2'>
              <span
                className={`px-2 py-1 rounded text-xs font-medium uppercase ${severityColors[insight.severity]} border`}
              >
                {insight.severity}
              </span>
              <span className='text-xs px-2 py-1 rounded bg-white border'>
                Impact: {insight.impact}/100
              </span>
            </div>
          </div>

          <p className='text-sm text-gray-700 mb-3'>{insight.message}</p>

          <div className='bg-white rounded-md p-3 border'>
            <p className='text-sm font-medium text-gray-900 mb-1'>Recommendation:</p>
            <p className='text-sm text-gray-600'>{insight.recommendation}</p>
          </div>

          {insight.queries.length > 0 && (
            <div className='mt-3'>
              <p className='text-xs font-medium text-gray-700 mb-1'>
                Sample Queries ({insight.queries.length}):
              </p>
              <div className='text-xs text-gray-600 space-y-1'>
                {insight.queries.slice(0, 2).map((query, index) => (
                  <div key={index} className='truncate bg-gray-50 p-2 rounded'>
                    {query.query}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface DatabaseMonitorProps {
  showInsights?: boolean;
  maxQueries?: number;
  showSlowQueriesOnly?: boolean;
}

const DatabaseMonitor: React.FC<DatabaseMonitorProps> = ({
  showInsights = true,
  maxQueries = 50,
  showSlowQueriesOnly = false
}) => {
  const { queries, slowQueries, stats, insights, subscribe } = useDatabaseMonitoring();
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setIsLive(true);
      setTimeout(() => setIsLive(false), 2000);
    });

    return unsubscribe;
  }, [subscribe]);

  const toggleQueryExpansion = (queryId: string) => {
    const newExpanded = new Set(expandedQueries);
    if (newExpanded.has(queryId)) {
      newExpanded.delete(queryId);
    } else {
      newExpanded.add(queryId);
    }
    setExpandedQueries(newExpanded);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const displayQueries = showSlowQueriesOnly ? slowQueries : queries;
  const filteredQueries = displayQueries
    .filter(query => operationFilter === 'all' || query.operation === operationFilter)
    .slice(-maxQueries);

  const operationOptions = [
    'all',
    ...Object.keys(stats.queryDistribution).filter(
      op => stats.queryDistribution[op as keyof typeof stats.queryDistribution] > 0
    )
  ];

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900 flex items-center space-x-3'>
            <Database className='w-6 h-6' />
            <span>Database Monitor</span>
            {isLive && (
              <span className='inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800'>
                <div className='w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse' />
                Query Executed
              </span>
            )}
          </h2>
          <p className='text-gray-600 mt-1'>Real-time database query performance monitoring</p>
        </div>

        <div className='flex items-center space-x-2'>
          <label className='flex items-center space-x-2'>
            <input
              type='checkbox'
              checked={showSlowQueriesOnly}
              disabled
              className='rounded border-gray-300'
            />
            <span className='text-sm text-gray-600'>Slow queries only</span>
          </label>
        </div>
      </div>

      {/* Statistics */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='p-4 bg-white rounded-lg border'>
          <div className='flex items-center space-x-2 mb-2'>
            <Database className='w-4 h-4 text-blue-500' />
            <span className='text-sm font-medium text-gray-700'>Total Queries</span>
          </div>
          <div className='text-2xl font-bold text-gray-900'>{stats.totalQueries}</div>
        </div>

        <div className='p-4 bg-white rounded-lg border'>
          <div className='flex items-center space-x-2 mb-2'>
            <Clock className='w-4 h-4 text-green-500' />
            <span className='text-sm font-medium text-gray-700'>Avg Duration</span>
          </div>
          <div className='text-2xl font-bold text-gray-900'>
            {formatDuration(stats.averageDuration)}
          </div>
        </div>

        <div className='p-4 bg-white rounded-lg border'>
          <div className='flex items-center space-x-2 mb-2'>
            <AlertTriangle className='w-4 h-4 text-red-500' />
            <span className='text-sm font-medium text-gray-700'>Slow Queries</span>
          </div>
          <div className='text-2xl font-bold text-gray-900'>{slowQueries.length}</div>
          <div className='text-xs text-gray-500'>&gt;1s duration</div>
        </div>

        <div className='p-4 bg-white rounded-lg border'>
          <div className='flex items-center space-x-2 mb-2'>
            <Zap className='w-4 h-4 text-purple-500' />
            <span className='text-sm font-medium text-gray-700'>Cache Hit Rate</span>
          </div>
          <div className='text-2xl font-bold text-gray-900'>
            {stats.cacheHitRate > 0 ? `${(stats.cacheHitRate * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Query Distribution Chart */}
      <div className='bg-white p-6 rounded-lg border'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
          <BarChart3 className='w-5 h-5' />
          <span>Query Distribution</span>
        </h3>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {Object.entries(stats.queryDistribution).map(([operation, count]) => {
            if (count === 0) return null;
            const percentage = (count / stats.totalQueries) * 100;
            return (
              <div key={operation} className='text-center'>
                <div className='text-2xl font-bold text-gray-900'>{count}</div>
                <div className='text-sm text-gray-600'>{operation}</div>
                <div className='text-xs text-gray-500'>{percentage.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Trends */}
      {stats.performanceTrends.length > 0 && (
        <div className='bg-white p-6 rounded-lg border'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
            <Activity className='w-5 h-5' />
            <span>Performance Trends (Last 24 Hours)</span>
          </h3>
          <div className='space-y-2'>
            {stats.performanceTrends.slice(-10).map((trend, index) => (
              <div key={index} className='flex items-center justify-between text-sm'>
                <span className='text-gray-600'>{trend.timeframe}</span>
                <div className='flex items-center space-x-4'>
                  <span className='font-medium'>{trend.averageDuration}ms avg</span>
                  <span className='text-gray-500'>{trend.queryCount} queries</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Statistics */}
      {stats.tableStats.size > 0 && (
        <div className='bg-white p-6 rounded-lg border'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Table Performance</h3>
          <div className='space-y-3'>
            {Array.from(stats.tableStats.entries())
              .sort(([, a], [, b]) => b.averageDuration - a.averageDuration)
              .slice(0, 10)
              .map(([table, tableStats]) => (
                <div key={table} className='flex items-center justify-between'>
                  <span className='font-medium text-gray-700'>{table}</span>
                  <div className='flex items-center space-x-4 text-sm'>
                    <span className='text-gray-600'>{tableStats.queries} queries</span>
                    <span className='text-blue-600'>
                      {formatDuration(tableStats.averageDuration)} avg
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {showInsights && insights.length > 0 && (
        <div className='space-y-4'>
          <h3 className='text-lg font-semibold text-gray-900'>Database Insights</h3>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Query Filter */}
      <div className='flex items-center space-x-4 p-4 bg-gray-50 rounded-lg'>
        <div className='flex items-center space-x-2'>
          <label className='text-sm font-medium text-gray-700'>Operation:</label>
          <select
            value={operationFilter}
            onChange={e => setOperationFilter(e.target.value)}
            className='text-sm border border-gray-300 rounded px-2 py-1'
          >
            {operationOptions.map(option => (
              <option key={option} value={option}>
                {option === 'all' ? 'All' : option}
              </option>
            ))}
          </select>
        </div>

        <div className='text-sm text-gray-500 ml-auto'>
          Showing {filteredQueries.length} queries
        </div>
      </div>

      {/* Query List */}
      <div className='space-y-4'>
        <h3 className='text-lg font-semibold text-gray-900'>
          {showSlowQueriesOnly ? 'Slow Queries' : 'Recent Queries'}
        </h3>

        {filteredQueries.length === 0 ? (
          <div className='text-center py-12 bg-white rounded-lg border'>
            <Database className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>No Queries Found</h3>
            <p className='text-gray-500'>
              {queries.length === 0
                ? 'No database queries have been recorded yet.'
                : 'No queries match the current filters.'}
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {filteredQueries.map(query => (
              <QueryCard
                key={query.id}
                query={query}
                isExpanded={expandedQueries.has(query.id)}
                onToggle={() => toggleQueryExpansion(query.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseMonitor;
