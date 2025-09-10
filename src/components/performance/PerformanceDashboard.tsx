/**
 * Performance Dashboard Component
 * Comprehensive monitoring dashboard for all performance metrics
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Activity, AlertTriangle, TrendingUp, Database, Globe, Cpu, BarChart3, RefreshCw } from 'lucide-react';
import { usePerformanceMetrics } from '@/lib/performance/metrics';
import { useWebVitals } from '@/lib/performance/web-vitals';
import { useErrorMonitoring } from '@/lib/performance/error-monitoring';
import { useDatabaseMonitoring } from '@/lib/performance/db-monitoring';

interface DashboardProps {
  refreshInterval?: number;
  showAdvanced?: boolean;
  compact?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  severity?: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  trend = 'neutral',
  severity = 'good',
  icon,
  subtitle
}) => {
  const severityColors = {
    good: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50'
  };

  const trendColors = {
    up: 'text-red-500',
    down: 'text-green-500',
    neutral: 'text-gray-500'
  };

  return (
    <div className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${severityColors[severity]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
        </div>
        {trend !== 'neutral' && (
          <TrendingUp className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''} ${trendColors[trend]}`} />
        )}
      </div>
      
      <div className="flex items-baseline space-x-1">
        <span className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
};

interface ChartProps {
  data: Array<{ name: string; value: number }>;
  title: string;
  height?: number;
}

const SimpleBarChart: React.FC<ChartProps> = ({ data, title, height = 200 }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-2" style={{ height }}>
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-600 w-20 truncate">
              {item.name}
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-900 w-12 text-right">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PerformanceDashboard: React.FC<DashboardProps> = ({
  refreshInterval = 30000,
  showAdvanced = true,
  compact = false
}) => {
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const performanceMetrics = usePerformanceMetrics();
  const webVitals = useWebVitals();
  const errorMonitoring = useErrorMonitoring();
  const dbMonitoring = useDatabaseMonitoring();

  const handleRefresh = () => {
    setLastRefresh(Date.now());
  };

  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(handleRefresh, refreshInterval);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const webVitalsScore = webVitals.score;
  const errorStats = errorMonitoring.stats;
  const dbStats = dbMonitoring.stats;
  const memoryUsage = performanceMetrics.getLatestMemoryUsage();
  const apiSummary = performanceMetrics.getApiPerformanceSummary();

  const vitalsData = [
    { name: 'FCP', value: Math.round(webVitals.vitals.fcp?.value || 0) },
    { name: 'LCP', value: Math.round(webVitals.vitals.lcp?.value || 0) },
    { name: 'FID', value: Math.round(webVitals.vitals.fid?.value || 0) },
    { name: 'CLS', value: Math.round((webVitals.vitals.cls?.value || 0) * 1000) }
  ].filter(item => item.value > 0);

  const errorDistribution = Object.entries(errorStats.bySeverity)
    .map(([severity, count]) => ({ name: severity, value: count }))
    .filter(item => item.value > 0);

  const queryDistribution = Object.entries(dbStats.queryDistribution)
    .map(([operation, count]) => ({ name: operation, value: count }))
    .filter(item => item.value > 0);

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Performance Overview</h2>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Web Vitals"
            value={webVitalsScore.overall}
            unit={`/100 (${webVitalsScore.grade})`}
            severity={webVitalsScore.overall >= 90 ? 'good' : webVitalsScore.overall >= 70 ? 'warning' : 'critical'}
            icon={<Globe className="w-4 h-4" />}
          />
          
          <MetricCard
            title="API Response"
            value={Math.round(apiSummary.averageResponseTime)}
            unit="ms"
            severity={apiSummary.averageResponseTime <= 200 ? 'good' : apiSummary.averageResponseTime <= 500 ? 'warning' : 'critical'}
            icon={<Activity className="w-4 h-4" />}
          />
          
          <MetricCard
            title="Errors (24h)"
            value={errorStats.last24Hours}
            severity={errorStats.last24Hours === 0 ? 'good' : errorStats.last24Hours <= 5 ? 'warning' : 'critical'}
            icon={<AlertTriangle className="w-4 h-4" />}
          />
          
          <MetricCard
            title="DB Queries"
            value={Math.round(dbStats.averageDuration)}
            unit="ms avg"
            severity={dbStats.averageDuration <= 100 ? 'good' : dbStats.averageDuration <= 500 ? 'warning' : 'critical'}
            icon={<Database className="w-4 h-4" />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-sm text-gray-500">
            Last updated: {new Date(lastRefresh).toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Web Vitals Score"
          value={webVitalsScore.overall}
          unit={`/100 (${webVitalsScore.grade})`}
          severity={webVitalsScore.overall >= 90 ? 'good' : webVitalsScore.overall >= 70 ? 'warning' : 'critical'}
          icon={<Globe className="w-5 h-5" />}
          subtitle={`${Object.keys(webVitals.vitals).length} metrics tracked`}
        />
        
        <MetricCard
          title="API Performance"
          value={Math.round(apiSummary.averageResponseTime)}
          unit="ms avg"
          severity={apiSummary.averageResponseTime <= 200 ? 'good' : apiSummary.averageResponseTime <= 500 ? 'warning' : 'critical'}
          icon={<Activity className="w-5 h-5" />}
          subtitle={`${apiSummary.totalRequests} total requests`}
        />
        
        <MetricCard
          title="Error Rate"
          value={errorStats.last24Hours}
          unit="errors (24h)"
          severity={errorStats.last24Hours === 0 ? 'good' : errorStats.last24Hours <= 5 ? 'warning' : 'critical'}
          icon={<AlertTriangle className="w-5 h-5" />}
          subtitle={`${errorStats.total} total errors`}
        />
        
        <MetricCard
          title="Database"
          value={Math.round(dbStats.averageDuration)}
          unit="ms avg"
          severity={dbStats.averageDuration <= 100 ? 'good' : dbStats.averageDuration <= 500 ? 'warning' : 'critical'}
          icon={<Database className="w-5 h-5" />}
          subtitle={`${dbStats.totalQueries} total queries`}
        />
      </div>

      {/* Memory Usage */}
      {memoryUsage && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Cpu className="w-5 h-5" />
            <span>Memory Usage</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatBytes(memoryUsage.usedJSHeapSize)}
              </div>
              <div className="text-sm text-gray-500">Used Heap</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatBytes(memoryUsage.totalJSHeapSize)}
              </div>
              <div className="text-sm text-gray-500">Total Heap</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {formatBytes(memoryUsage.jsHeapSizeLimit)}
              </div>
              <div className="text-sm text-gray-500">Heap Limit</div>
            </div>
          </div>
          
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ 
                width: `${(memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {vitalsData.length > 0 && (
          <SimpleBarChart
            data={vitalsData}
            title="Core Web Vitals (ms)"
          />
        )}
        
        {errorDistribution.length > 0 && (
          <SimpleBarChart
            data={errorDistribution}
            title="Error Distribution by Severity"
          />
        )}
        
        {queryDistribution.length > 0 && (
          <SimpleBarChart
            data={queryDistribution}
            title="Database Query Distribution"
          />
        )}
      </div>

      {/* Advanced Metrics */}
      {showAdvanced && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Advanced Metrics</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Web Vitals Details */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Web Vitals Details</h3>
              <div className="space-y-3">
                {Object.entries(webVitalsScore.details).map(([metric, data]) => (
                  <div key={metric} className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">{metric.toUpperCase()}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{data.score}/100</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        data.rating === 'good' ? 'bg-green-100 text-green-800' :
                        data.rating === 'needs-improvement' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {data.rating}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Database Performance Trends */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Performance Trends</h3>
              <div className="space-y-2">
                {dbStats.performanceTrends.slice(-10).map((trend, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{trend.timeframe}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{trend.averageDuration}ms</span>
                      <span className="text-gray-500">({trend.queryCount} queries)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* API Performance */}
          {apiSummary.slowestEndpoints.length > 0 && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Slowest API Endpoints</h3>
              <div className="space-y-3">
                {apiSummary.slowestEndpoints.map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">{endpoint.endpoint}</span>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600">Avg: {Math.round(endpoint.averageTime)}ms</span>
                      <span className="text-red-600">Max: {Math.round(endpoint.slowestTime)}ms</span>
                      <span className="text-blue-600">{endpoint.requests} requests</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cache Hit Rate */}
          {dbStats.cacheHitRate > 0 && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cache Performance</h3>
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">Cache Hit Rate</span>
                <span className={`text-2xl font-bold ${
                  dbStats.cacheHitRate >= 0.8 ? 'text-green-600' :
                  dbStats.cacheHitRate >= 0.6 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {(dbStats.cacheHitRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    dbStats.cacheHitRate >= 0.8 ? 'bg-green-500' :
                    dbStats.cacheHitRate >= 0.6 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${dbStats.cacheHitRate * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;