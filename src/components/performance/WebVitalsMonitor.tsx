/**
 * Web Vitals Monitor Component
 * Real-time monitoring and insights for Core Web Vitals
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  MousePointer,
  Eye,
  Gauge
} from '@/components/ui/Icons';
import { useWebVitals, WebVitalsInsight } from '@/lib/performance/web-vitals';

interface VitalCardProps {
  name: string;
  value: number;
  threshold: { good: number; needsImprovement: number };
  unit: string;
  description: string;
  icon: React.ReactNode;
}

const VitalCard: React.FC<VitalCardProps> = ({
  name,
  value,
  threshold,
  unit,
  description,
  icon
}) => {
  const getRating = () => {
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  };

  const rating = getRating();
  const percentage = Math.min(100, (value / (threshold.needsImprovement * 2)) * 100);

  const ratingColors = {
    good: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      badge: 'bg-green-100 text-green-800',
      progress: 'bg-green-500'
    },
    'needs-improvement': {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      badge: 'bg-yellow-100 text-yellow-800',
      progress: 'bg-yellow-500'
    },
    poor: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      badge: 'bg-red-100 text-red-800',
      progress: 'bg-red-500'
    }
  };

  const colors = ratingColors[rating];

  return (
    <div className={`p-6 rounded-lg border-2 transition-all hover:shadow-md ${colors.bg}`}>
      <div className='flex items-start justify-between mb-4'>
        <div className='flex items-center space-x-3'>
          <div className={`p-2 rounded-lg ${colors.badge}`}>{icon}</div>
          <div>
            <h3 className={`font-semibold text-lg ${colors.text}`}>{name}</h3>
            <p className='text-sm text-gray-600'>{description}</p>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
          {rating.replace('-', ' ')}
        </div>
      </div>

      <div className='space-y-3'>
        <div className='flex items-baseline space-x-2'>
          <span className={`text-3xl font-bold ${colors.text}`}>
            {value < 1000 ? Math.round(value) : (value / 1000).toFixed(1)}
          </span>
          <span className='text-sm text-gray-500'>{unit}</span>
        </div>

        <div className='space-y-1'>
          <div className='flex justify-between text-xs text-gray-500'>
            <span>Good</span>
            <span>Poor</span>
          </div>

          <div className='w-full bg-gray-200 rounded-full h-2'>
            <div
              className={`h-2 rounded-full transition-all duration-500 ${colors.progress}`}
              style={{ width: `${Math.max(2, Math.min(98, percentage))}%` }}
            />
          </div>

          <div className='flex justify-between text-xs text-gray-400'>
            <span>
              &lt;{threshold.good}
              {unit.replace('ms', '')}
            </span>
            <span>
              &gt;{threshold.needsImprovement}
              {unit.replace('ms', '')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface InsightCardProps {
  insight: WebVitalsInsight;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const impactColors = {
    low: 'border-blue-200 bg-blue-50',
    medium: 'border-yellow-200 bg-yellow-50',
    high: 'border-red-200 bg-red-50'
  };

  const impactIcons = {
    low: <CheckCircle className='w-4 h-4 text-blue-600' />,
    medium: <AlertCircle className='w-4 h-4 text-yellow-600' />,
    high: <AlertCircle className='w-4 h-4 text-red-600' />
  };

  return (
    <div className={`p-4 rounded-lg border ${impactColors[insight.impact]}`}>
      <div className='flex items-start space-x-3'>
        <div className='flex-shrink-0 mt-0.5'>{impactIcons[insight.impact]}</div>

        <div className='flex-1'>
          <div className='flex items-center justify-between mb-2'>
            <h4 className='font-medium text-gray-900'>{insight.metric} Performance Issue</h4>
            <span className='text-xs px-2 py-1 rounded-full bg-white border'>
              Impact: {insight.impact}/100
            </span>
          </div>

          <p className='text-sm text-gray-700 mb-3'>
            Current value: <strong>{Math.round(insight.value)}</strong>
            {insight.metric.includes('CLS') ? '' : 'ms'}
          </p>

          <div className='bg-white rounded-md p-3 border'>
            <p className='text-sm font-medium text-gray-900 mb-1'>Recommendation:</p>
            <p className='text-sm text-gray-600'>{insight.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface WebVitalsMonitorProps {
  showInsights?: boolean;
  showThresholds?: boolean;
  compact?: boolean;
}

const WebVitalsMonitor: React.FC<WebVitalsMonitorProps> = ({
  showInsights = true,
  showThresholds = true,
  compact = false
}) => {
  const { vitals, score, insights, subscribe } = useWebVitals();
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setIsLive(true);
      setTimeout(() => setIsLive(false), 2000);
    });

    return unsubscribe;
  }, [subscribe]);

  const vitalsConfig = [
    {
      name: 'FCP',
      fullName: 'First Contentful Paint',
      value: vitals.fcp?.value || 0,
      threshold: { good: 1800, needsImprovement: 3000 },
      unit: 'ms',
      description: 'Time when first content appears',
      icon: <Eye className='w-4 h-4' />
    },
    {
      name: 'LCP',
      fullName: 'Largest Contentful Paint',
      value: vitals.lcp?.value || 0,
      threshold: { good: 2500, needsImprovement: 4000 },
      unit: 'ms',
      description: 'Time when largest content loads',
      icon: <Globe className='w-4 h-4' />
    },
    {
      name: 'FID',
      fullName: 'First Input Delay',
      value: vitals.fid?.value || 0,
      threshold: { good: 100, needsImprovement: 300 },
      unit: 'ms',
      description: 'Time to first interaction',
      icon: <MousePointer className='w-4 h-4' />
    },
    {
      name: 'CLS',
      fullName: 'Cumulative Layout Shift',
      value: vitals.cls?.value || 0,
      threshold: { good: 0.1, needsImprovement: 0.25 },
      unit: '',
      description: 'Visual stability score',
      icon: <TrendingUp className='w-4 h-4' />
    }
  ].filter(vital => vital.value > 0);

  if (compact) {
    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 flex items-center space-x-2'>
            <Gauge className='w-5 h-5' />
            <span>Web Vitals</span>
            {isLive && (
              <span className='inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800'>
                <div className='w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse' />
                Live
              </span>
            )}
          </h3>

          <div className='text-right'>
            <div className='text-2xl font-bold text-gray-900'>{score.overall}/100</div>
            <div
              className={`text-sm font-medium ${
                score.grade === 'A'
                  ? 'text-green-600'
                  : score.grade === 'B'
                    ? 'text-blue-600'
                    : score.grade === 'C'
                      ? 'text-yellow-600'
                      : 'text-red-600'
              }`}
            >
              Grade {score.grade}
            </div>
          </div>
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          {vitalsConfig.map(vital => (
            <div key={vital.name} className='p-3 bg-white rounded-lg border'>
              <div className='flex items-center justify-between mb-2'>
                <span className='font-medium text-sm text-gray-700'>{vital.name}</span>
                {vital.icon}
              </div>
              <div className='text-lg font-bold text-gray-900'>
                {vital.value < 1000 ? Math.round(vital.value) : (vital.value / 1000).toFixed(1)}
                <span className='text-xs text-gray-500 ml-1'>{vital.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900 flex items-center space-x-3'>
            <Gauge className='w-6 h-6' />
            <span>Web Vitals Monitor</span>
            {isLive && (
              <span className='inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800'>
                <div className='w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse' />
                Live Updates
              </span>
            )}
          </h2>
          <p className='text-gray-600 mt-1'>
            Real-time Core Web Vitals monitoring and performance insights
          </p>
        </div>

        <div className='text-right'>
          <div className='text-4xl font-bold text-gray-900'>{score.overall}</div>
          <div className='text-sm text-gray-500'>/ 100</div>
          <div
            className={`text-lg font-semibold mt-1 ${
              score.grade === 'A'
                ? 'text-green-600'
                : score.grade === 'B'
                  ? 'text-blue-600'
                  : score.grade === 'C'
                    ? 'text-yellow-600'
                    : 'text-red-600'
            }`}
          >
            Grade {score.grade}
          </div>
        </div>
      </div>

      {/* Vital Cards */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {vitalsConfig.map(vital => (
          <VitalCard
            key={vital.name}
            name={vital.fullName}
            value={vital.value}
            threshold={vital.threshold}
            unit={vital.unit}
            description={vital.description}
            icon={vital.icon}
          />
        ))}
      </div>

      {/* Thresholds Reference */}
      {showThresholds && (
        <div className='bg-white p-6 rounded-lg border'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Performance Thresholds</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <h4 className='font-medium text-gray-700 mb-3'>Timing Metrics</h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span>First Contentful Paint (FCP)</span>
                  <span className='text-gray-500'>&lt;1.8s good, &lt;3s fair</span>
                </div>
                <div className='flex justify-between'>
                  <span>Largest Contentful Paint (LCP)</span>
                  <span className='text-gray-500'>&lt;2.5s good, &lt;4s fair</span>
                </div>
                <div className='flex justify-between'>
                  <span>First Input Delay (FID)</span>
                  <span className='text-gray-500'>&lt;100ms good, &lt;300ms fair</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className='font-medium text-gray-700 mb-3'>User Experience</h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span>Cumulative Layout Shift (CLS)</span>
                  <span className='text-gray-500'>&lt;0.1 good, &lt;0.25 fair</span>
                </div>
                <div className='flex justify-between'>
                  <span>Time to First Byte (TTFB)</span>
                  <span className='text-gray-500'>&lt;800ms good, &lt;1.8s fair</span>
                </div>
                <div className='flex justify-between'>
                  <span>Interaction to Next Paint (INP)</span>
                  <span className='text-gray-500'>&lt;200ms good, &lt;500ms fair</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {showInsights && insights.length > 0 && (
        <div className='space-y-4'>
          <h3 className='text-lg font-semibold text-gray-900'>Performance Insights</h3>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* No Data State */}
      {vitalsConfig.length === 0 && (
        <div className='text-center py-12'>
          <Clock className='w-12 h-12 text-gray-400 mx-auto mb-4' />
          <h3 className='text-lg font-medium text-gray-900 mb-2'>Collecting Web Vitals Data</h3>
          <p className='text-gray-500'>
            Performance metrics will appear here as users interact with your application.
          </p>
        </div>
      )}
    </div>
  );
};

export default WebVitalsMonitor;
