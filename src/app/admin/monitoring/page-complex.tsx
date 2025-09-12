'use client';

import { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowUpIcon, ArrowDownIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    cache: HealthCheck;
    memory: HealthCheck;
  };
  performance: {
    responseTime: number;
    avgResponseTime?: number;
    dbQueryTime?: number;
  };
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: string;
  error?: string;
  metrics?: Record<string, any>;
}

interface WebVitals {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

export default function MonitoringDashboard() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [webVitals, setWebVitals] = useState<WebVitals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Fetch health status
  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    }
  };

  // Fetch web vitals
  const fetchWebVitals = async () => {
    try {
      const response = await fetch('/api/monitoring/performance');
      const data = await response.json();
      setWebVitals(data.webVitals);
    } catch (error) {
      console.error('Failed to fetch web vitals:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    Promise.all([fetchHealthStatus(), fetchWebVitals()]).then(() => {
      setIsLoading(false);
    });

    // Set up polling
    const interval = setInterval(() => {
      fetchHealthStatus();
      fetchWebVitals();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getWebVitalStatus = (metric: string, value: number) => {
    const thresholds: Record<string, { good: number; needsImprovement: number }> = {
      lcp: { good: 2500, needsImprovement: 4000 },
      fid: { good: 100, needsImprovement: 300 },
      cls: { good: 0.1, needsImprovement: 0.25 },
      fcp: { good: 1800, needsImprovement: 3000 },
      ttfb: { good: 600, needsImprovement: 1800 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Monitoring Dashboard</h1>
        <p className="text-gray-600 mt-2">Real-time health and performance monitoring</p>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Status</p>
                <p className={`text-2xl font-bold ${healthStatus?.status === 'healthy' ? 'text-green-600' : healthStatus?.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'}`}>
                  {healthStatus?.status?.toUpperCase() || 'Unknown'}
                </p>
              </div>
              {getStatusIcon(healthStatus?.status || '')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="text-2xl font-bold">
                  {healthStatus ? formatUptime(healthStatus.uptime) : 'N/A'}
                </p>
              </div>
              <ArrowUpIcon className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Response Time</p>
                <p className="text-2xl font-bold">
                  {healthStatus?.performance?.responseTime || 0}ms
                </p>
              </div>
              {(healthStatus?.performance?.responseTime || 0) < 100 ? (
                <ArrowDownIcon className="h-5 w-5 text-green-500" />
              ) : (
                <ArrowUpIcon className="h-5 w-5 text-yellow-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Environment</p>
                <p className="text-2xl font-bold capitalize">
                  {healthStatus?.environment || 'Unknown'}
                </p>
              </div>
              {healthStatus?.environment === 'production' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Health Checks */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Service Health Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {healthStatus?.checks && Object.entries(healthStatus.checks).map(([service, check]) => (
              <div key={service} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(check.status)}
                  <div>
                    <p className="font-semibold capitalize">{service}</p>
                    <p className="text-sm text-gray-600">
                      Response: {check.responseTime}ms
                      {check.details && ` • ${check.details}`}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(check.status)}`}>
                  {check.status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Web Vitals */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Web Vitals Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {webVitals && Object.entries(webVitals).map(([metric, value]) => {
              const status = getWebVitalStatus(metric, value as number);
              return (
                <div key={metric} className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-gray-600 uppercase">{metric}</p>
                  <p className={`text-2xl font-bold mt-2 ${
                    status === 'good' ? 'text-green-600' : 
                    status === 'needs-improvement' ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {metric === 'cls' ? (value as number).toFixed(3) : `${value}ms`}
                  </p>
                  <p className={`text-xs mt-1 ${
                    status === 'good' ? 'text-green-600' : 
                    status === 'needs-improvement' ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {status === 'good' ? 'Good' : status === 'needs-improvement' ? 'Needs Work' : 'Poor'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Service Metrics */}
      {healthStatus?.checks && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Database Metrics */}
          {healthStatus.checks.database?.metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Database Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Connections</span>
                    <span className="text-sm font-medium">{healthStatus.checks.database.metrics.connectionCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Query Count</span>
                    <span className="text-sm font-medium">{healthStatus.checks.database.metrics.queryCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Slow Query Threshold</span>
                    <span className="text-sm font-medium">{healthStatus.checks.database.metrics.slowQueryThreshold || 0}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cache Metrics */}
          {healthStatus.checks.cache?.metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cache Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Hit Rate</span>
                    <span className="text-sm font-medium">{(healthStatus.checks.cache.metrics.hitRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cache Size</span>
                    <span className="text-sm font-medium">{healthStatus.checks.cache.metrics.size || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Utilization</span>
                    <span className="text-sm font-medium">{(healthStatus.checks.cache.metrics.utilization * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Memory Metrics */}
          {healthStatus.checks.memory?.metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Memory Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Heap Used</span>
                    <span className="text-sm font-medium">{healthStatus.checks.memory.metrics.heapUsed || 0} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Heap Total</span>
                    <span className="text-sm font-medium">{healthStatus.checks.memory.metrics.heapTotal || 0} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Utilization</span>
                    <span className="text-sm font-medium">{healthStatus.checks.memory.metrics.utilization || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Refresh Controls */}
      <div className="mt-8 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Last updated: {healthStatus ? new Date(healthStatus.timestamp).toLocaleString() : 'Never'}
        </div>
        <div className="flex items-center space-x-4">
          <label className="text-sm text-gray-600">Refresh interval:</label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
          </select>
          <button
            onClick={() => {
              fetchHealthStatus();
              fetchWebVitals();
            }}
            className="px-4 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
          >
            Refresh Now
          </button>
        </div>
      </div>
    </div>
  );
}