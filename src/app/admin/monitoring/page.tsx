'use client';

import { useState, useEffect } from 'react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
}

export default function MonitoringDashboardSimple() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    }
  };

  useEffect(() => {
    fetchHealthStatus().then(() => {
      setIsLoading(false);
    });

    const interval = setInterval(() => {
      fetchHealthStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ container: 'mx-auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>System Monitoring Dashboard</h1>
        <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Real-time health and performance monitoring</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>System Status</p>
              <p style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: healthStatus?.status === 'healthy' ? '#059669' : healthStatus?.status === 'degraded' ? '#d97706' : '#dc2626'
              }}>
                {healthStatus?.status?.toUpperCase() || 'Unknown'}
              </p>
            </div>
            <div style={{ 
              width: '1.25rem', 
              height: '1.25rem', 
              borderRadius: '50%',
              backgroundColor: healthStatus?.status === 'healthy' ? '#10b981' : healthStatus?.status === 'degraded' ? '#f59e0b' : '#ef4444'
            }} />
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Environment</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Production</p>
            </div>
            <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', backgroundColor: '#10b981' }} />
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Last Updated</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {healthStatus ? new Date(healthStatus.timestamp).toLocaleTimeString() : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>System Health</h2>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {JSON.stringify(healthStatus, null, 2)}
          </pre>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Auto-refresh: Every 30 seconds
        </div>
        <button
          onClick={fetchHealthStatus}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
}