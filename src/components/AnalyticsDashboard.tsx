'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

interface AnalyticsData {
  wellness?: {
    averageMoodScore: number;
    averageAnxietyLevel: number;
    averageStressLevel: number;
    totalEntries: number;
    moodTrend: 'improving' | 'declining' | 'stable';
    anxietyTrend: 'improving' | 'declining' | 'stable';
    stressTrend: 'improving' | 'declining' | 'stable';
  };
  therapy?: {
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    averageSessionDuration: number;
    treatmentPlansActive: number;
    averageGoalProgress: number;
  };
  crisis?: {
    totalInterventions: number;
    averageResponseTime: number;
    resolutionRate: number;
    escalationRate: number;
  };
  engagement?: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    messagesExchanged: number;
    journalEntriesCreated: number;
    retentionRate: number;
  };
  performance?: {
    apiResponseTimes: {
      average: number;
      p95: number;
      p99: number;
    };
    errorRate: number;
    uptime: number;
  };
  compliance?: {
    auditLogsGenerated: number;
    dataEncryptionStatus: number;
    securityScans: number;
    vulnerabilitiesFound: number;
  };
  role: string;
}

export default function AnalyticsDashboard() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    if (!session?.user) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/dashboard?days=${dateRange}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch analytics');
      }
    } catch (error) {
      toast.error('Error loading analytics');
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast.success('Analytics refreshed');
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <span className='text-green-500'>📈</span>;
      case 'declining':
        return <span className='text-red-500'>📉</span>;
      default:
        return <span className='text-blue-500'>➡️</span>;
    }
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className='text-center py-12'>
        <p className='text-gray-500 dark:text-gray-400'>No analytics data available</p>
        <Button onClick={fetchAnalytics} className='mt-4'>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
      <div className='max-w-7xl mx-auto px-4'>
        {/* Header */}
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Analytics Dashboard</h1>
          <div className='flex items-center gap-4'>
            <select
              value={dateRange}
              onChange={e => setDateRange(parseInt(e.target.value))}
              className='px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            <Button onClick={refreshData} disabled={refreshing} variant='secondary'>
              {refreshing ? 'Refreshing...' : '🔄 Refresh'}
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'>
          {/* Wellness Analytics */}
          {analytics.wellness && (
            <Card>
              <CardHeader>
                <CardTitle>Wellness Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Average Mood</span>
                    <div className='flex items-center gap-2'>
                      <span className='font-semibold'>
                        {analytics.wellness.averageMoodScore}/10
                      </span>
                      {getTrendIcon(analytics.wellness.moodTrend)}
                    </div>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Anxiety Level</span>
                    <div className='flex items-center gap-2'>
                      <span
                        className={`font-semibold ${getStatusColor(
                          10 - analytics.wellness.averageAnxietyLevel,
                          { good: 7, warning: 4 }
                        )}`}
                      >
                        {analytics.wellness.averageAnxietyLevel}/10
                      </span>
                      {getTrendIcon(analytics.wellness.anxietyTrend)}
                    </div>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Stress Level</span>
                    <div className='flex items-center gap-2'>
                      <span
                        className={`font-semibold ${getStatusColor(
                          10 - analytics.wellness.averageStressLevel,
                          { good: 7, warning: 4 }
                        )}`}
                      >
                        {analytics.wellness.averageStressLevel}/10
                      </span>
                      {getTrendIcon(analytics.wellness.stressTrend)}
                    </div>
                  </div>
                  <div className='pt-2 border-t'>
                    <span className='text-xs text-gray-500'>
                      {analytics.wellness.totalEntries} entries recorded
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Therapy Analytics */}
          {analytics.therapy && (
            <Card>
              <CardHeader>
                <CardTitle>Therapy Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Total Sessions</span>
                    <span className='font-semibold'>{analytics.therapy.totalSessions}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Completed</span>
                    <span className='font-semibold text-green-600'>
                      {analytics.therapy.completedSessions}
                    </span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Active Plans</span>
                    <span className='font-semibold'>{analytics.therapy.treatmentPlansActive}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Goal Progress</span>
                    <span className='font-semibold'>{analytics.therapy.averageGoalProgress}%</span>
                  </div>
                  <div className='pt-2 border-t'>
                    <div className='w-full bg-gray-200 rounded-full h-2'>
                      <div
                        className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                        style={{ width: `${analytics.therapy.averageGoalProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Crisis Analytics (Admin/Therapist only) */}
          {analytics.crisis && (
            <Card>
              <CardHeader>
                <CardTitle>Crisis Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Total Interventions
                    </span>
                    <span className='font-semibold'>{analytics.crisis.totalInterventions}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Avg Response Time
                    </span>
                    <span className='font-semibold'>{analytics.crisis.averageResponseTime}min</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Resolution Rate
                    </span>
                    <span
                      className={`font-semibold ${getStatusColor(analytics.crisis.resolutionRate, {
                        good: 80,
                        warning: 60
                      })}`}
                    >
                      {analytics.crisis.resolutionRate}%
                    </span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Escalation Rate
                    </span>
                    <span
                      className={`font-semibold ${
                        analytics.crisis.escalationRate < 20 ? 'text-green-600' : 'text-yellow-600'
                      }`}
                    >
                      {analytics.crisis.escalationRate}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Engagement (Admin only) */}
          {analytics.engagement && (
            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Daily Active Users
                    </span>
                    <span className='font-semibold'>{analytics.engagement.dailyActiveUsers}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Weekly Active Users
                    </span>
                    <span className='font-semibold'>{analytics.engagement.weeklyActiveUsers}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Messages Exchanged
                    </span>
                    <span className='font-semibold'>{analytics.engagement.messagesExchanged}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Retention Rate</span>
                    <span
                      className={`font-semibold ${getStatusColor(
                        analytics.engagement.retentionRate,
                        { good: 70, warning: 50 }
                      )}`}
                    >
                      {analytics.engagement.retentionRate}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics (Admin only) */}
          {analytics.performance && (
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Avg Response Time
                    </span>
                    <span
                      className={`font-semibold ${getStatusColor(
                        1000 - analytics.performance.apiResponseTimes.average,
                        { good: 900, warning: 700 }
                      )}`}
                    >
                      {analytics.performance.apiResponseTimes.average}ms
                    </span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Error Rate</span>
                    <span
                      className={`font-semibold ${
                        analytics.performance.errorRate < 1 ? 'text-green-600' : 'text-yellow-600'
                      }`}
                    >
                      {analytics.performance.errorRate}%
                    </span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Uptime</span>
                    <span className='font-semibold text-green-600'>
                      {analytics.performance.uptime}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compliance Metrics (Admin only) */}
          {analytics.compliance && (
            <Card>
              <CardHeader>
                <CardTitle>Compliance & Security</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Data Encryption
                    </span>
                    <span className='font-semibold text-green-600'>
                      {analytics.compliance.dataEncryptionStatus}%
                    </span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Audit Logs</span>
                    <span className='font-semibold'>{analytics.compliance.auditLogsGenerated}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Security Scans</span>
                    <span className='font-semibold'>{analytics.compliance.securityScans}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Vulnerabilities
                    </span>
                    <span
                      className={`font-semibold ${
                        analytics.compliance.vulnerabilitiesFound === 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {analytics.compliance.vulnerabilitiesFound}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Role-specific insights */}
        <div className='mt-8'>
          <Card>
            <CardHeader>
              <CardTitle>Insights & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-sm text-gray-600 dark:text-gray-400'>
                {analytics.role === 'CLIENT' && analytics.wellness && (
                  <div className='space-y-2'>
                    {analytics.wellness.moodTrend === 'improving' && (
                      <p className='text-green-700 dark:text-green-400'>
                        🎉 Your mood has been improving! Keep up the great work.
                      </p>
                    )}
                    {analytics.wellness.averageStressLevel > 7 && (
                      <p className='text-yellow-700 dark:text-yellow-400'>
                        ⚠️ Your stress levels are high. Consider discussing stress management with
                        your therapist.
                      </p>
                    )}
                    <p>Continue tracking your wellness data to identify patterns and progress.</p>
                  </div>
                )}

                {analytics.role === 'THERAPIST' && (
                  <div className='space-y-2'>
                    <p>Monitor your clients&apos; progress and engagement levels.</p>
                    <p>Review treatment plan effectiveness and adjust as needed.</p>
                    <p>Consider reaching out to clients who show declining trends.</p>
                  </div>
                )}

                {analytics.role === 'ADMIN' && (
                  <div className='space-y-2'>
                    <p>System performance is within acceptable parameters.</p>
                    <p>
                      Security compliance remains strong with{' '}
                      {analytics.compliance?.dataEncryptionStatus}% encryption coverage.
                    </p>
                    <p>Monitor user engagement trends to identify areas for improvement.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
