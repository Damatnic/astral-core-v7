/**
 * Performance Monitoring Dashboard
 * Real-time performance metrics and system health overview
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useCache } from '@/lib/caching/cache-strategies';

// Types for performance data
interface WebVitalsData {
  name: string;
  value: number;
  timestamp: string;
  url: string;
}

interface SystemHealth {
  database: { status: 'healthy' | 'unhealthy'; responseTime: number };
  server: { status: 'healthy' | 'unhealthy'; uptime: number };
  errors: { count: number; lastError?: string };
}

interface PerformanceStats {
  webVitals: {
    averages: Record<string, number>;
    p95: Record<string, number>;
    trends: Array<{ timestamp: string; [key: string]: any }>;
  };
  errors: Array<{
    severity: string;
    count: number;
    type: string;
  }>;
  cache: {
    hitRate: number;
    size: number;
    utilization: number;
  };
}

const PerformanceDashboard: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const cache = useCache();

  // Fetch performance data
  const fetchPerformanceData = async () => {
    try {
      const [statsResponse, healthResponse] = await Promise.all([
        fetch(`/api/monitoring/performance?timeframe=${timeframe}`),
        fetch('/api/monitoring/health')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealth(healthData);
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchPerformanceData();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchPerformanceData, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeframe, autoRefresh]);

  // Web Vitals component
  const WebVitalsCard: React.FC<{ vitals: Record<string, number>; label: string }> = ({ vitals, label }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{label}</h3>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(vitals).map(([metric, value]) => {
          const getMetricColor = (metric: string, value: number) => {
            const thresholds = {
              lcp: { good: 2500, poor: 4000 },
              fid: { good: 100, poor: 300 },
              cls: { good: 0.1, poor: 0.25 },
              fcp: { good: 1800, poor: 3000 },
              ttfb: { good: 600, poor: 1500 }
            };

            const threshold = thresholds[metric.toLowerCase() as keyof typeof thresholds];
            if (!threshold) return 'text-gray-600';

            if (value <= threshold.good) return 'text-green-600';
            if (value <= threshold.poor) return 'text-yellow-600';
            return 'text-red-600';
          };

          return (
            <div key={metric} className="text-center">
              <div className={`text-2xl font-bold ${getMetricColor(metric, value)}`}>
                {metric.toLowerCase() === 'cls' 
                  ? value.toFixed(3) 
                  : Math.round(value)}
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                {metric}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // System Health component
  const SystemHealthCard: React.FC<{ health: SystemHealth }> = ({ health }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Database</span>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              health.database.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-500">
              {health.database.responseTime}ms
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Server</span>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              health.server.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-500">
              {Math.round(health.server.uptime / 3600)}h uptime
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Errors (24h)</span>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              health.errors.count === 0 ? 'bg-green-500' : 
              health.errors.count < 10 ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-500">
              {health.errors.count} errors
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Cache Performance component
  const CachePerformanceCard: React.FC<{ cache: PerformanceStats['cache'] }> = ({ cache }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cache Performance</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Hit Rate</span>
          <span className={`text-lg font-semibold ${
            cache.hitRate > 80 ? 'text-green-600' : 
            cache.hitRate > 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {cache.hitRate.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Cache Size</span>
          <span className="text-lg font-semibold text-gray-900">
            {cache.size} entries
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Utilization</span>
          <span className="text-lg font-semibold text-gray-900">
            {cache.utilization.toFixed(1)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full" 
            style={{ width: `${Math.min(cache.utilization, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );

  // Error Summary component
  const ErrorSummaryCard: React.FC<{ errors: PerformanceStats['errors'] }> = ({ errors }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Summary</h3>
      <div className="space-y-3">
        {errors.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No errors in selected timeframe
          </div>
        ) : (
          errors.map((error, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  error.severity === 'CRITICAL' ? 'bg-red-500' :
                  error.severity === 'ERROR' ? 'bg-orange-500' :
                  error.severity === 'WARNING' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}></div>
                <span className="text-sm text-gray-600">{error.type}</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {error.count}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
            <p className="text-gray-600">Real-time system performance and health monitoring</p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-4">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-md ${
                autoRefresh 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
            
            <button
              onClick={fetchPerformanceData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats && (
            <>
              <WebVitalsCard vitals={stats.webVitals.averages} label="Web Vitals (Avg)" />
              <WebVitalsCard vitals={stats.webVitals.p95} label="Web Vitals (95th %ile)" />
            </>
          )}
          
          {health && <SystemHealthCard health={health} />}
          
          {stats && <CachePerformanceCard cache={stats.cache} />}
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stats && <ErrorSummaryCard errors={stats.errors} />}
          
          {/* Performance Trends could go here */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => cache.delete('*')}
                className="w-full text-left px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Clear All Caches
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full text-left px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Hard Refresh Page
              </button>
              <a
                href="/api/monitoring/export"
                className="block w-full text-left px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Export Performance Data
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;