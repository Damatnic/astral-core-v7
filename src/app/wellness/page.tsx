'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import type { WellnessDataInput } from '../../lib/types/wellness';

// Force dynamic rendering to avoid SSR issues with stores
export const dynamic = 'force-dynamic';

const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Very Bad' },
  { value: 2, emoji: '😔', label: 'Bad' },
  { value: 3, emoji: '😕', label: 'Poor' },
  { value: 4, emoji: '😐', label: 'Below Average' },
  { value: 5, emoji: '🙂', label: 'Average' },
  { value: 6, emoji: '😊', label: 'Good' },
  { value: 7, emoji: '😄', label: 'Very Good' },
  { value: 8, emoji: '😁', label: 'Great' },
  { value: 9, emoji: '🤗', label: 'Excellent' },
  { value: 10, emoji: '🤩', label: 'Perfect' }
];

export default function WellnessPage() {
  const router = useRouter();
  
  // Client-only store state
  const [storeState, setStoreState] = useState({
    todayData: null as any,
    submitWellnessData: async (_: any) => false,
    isLoading: false,
    error: null as string | null,
    fetchTodayData: async () => {}
  });
  
  // Load store dynamically on client
  useEffect(() => {
    const loadStore = async () => {
      try {
        const { useWellnessStore } = await import('@/store/useWellnessStoreClient');
        const store = useWellnessStore();
        setStoreState({
          todayData: store.todayData,
          submitWellnessData: store.submitWellnessData,
          isLoading: store.isLoading,
          error: store.error,
          fetchTodayData: store.fetchTodayData
        });
        // Initial data fetch
        store.fetchTodayData();
      } catch (error) {
        console.error('Failed to load wellness store:', error);
      }
    };
    
    loadStore();
  }, []);
  
  const { todayData, submitWellnessData, isLoading, error } = storeState;

  const [formData, setFormData] = useState<WellnessDataInput>({
    moodScore: 5,
    anxietyLevel: 5,
    stressLevel: 5,
    sleepHours: 7,
    sleepQuality: 5,
    exercise: false,
    exerciseMinutes: 0,
    meditation: false,
    meditationMinutes: 0,
    socialContact: false,
    medications: [],
    symptoms: [],
    triggers: [],
    copingStrategies: [],
    notes: ''
  });

  useEffect(() => {
    if (todayData) {
      setFormData(todayData);
    }
  }, [todayData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const success = await submitWellnessData(formData);
      if (success) {
        router.push('/dashboard');
      }
    } catch {
      // Error handling is managed by the store
    }
  };

  const handleSliderChange = (field: keyof WellnessDataInput, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field: keyof WellnessDataInput, checked: boolean) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  return (
    <ErrorBoundary
      fallback={
        <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
          <div className='sm:mx-auto sm:w-full sm:max-w-md'>
            <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
              <div className='text-center'>
                <h3 className='text-lg font-medium text-gray-900'>Wellness Check-In Error</h3>
                <p className='mt-2 text-sm text-gray-600'>
                  Unable to load the wellness check-in form. Your wellness data is safe and will be available once the issue is resolved.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700'
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
        <div className='max-w-4xl mx-auto px-4'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-8'>
          Daily Wellness Check-In
        </h1>

        {error && (
          <div className='mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg'>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Mood Score */}
          <Card>
            <CardHeader>
              <CardTitle>How are you feeling today?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='flex justify-between items-center'>
                  <span className='text-4xl'>{MOOD_OPTIONS[formData.moodScore - 1]?.emoji}</span>
                  <span className='text-lg font-semibold'>
                    {MOOD_OPTIONS[formData.moodScore - 1]?.label}
                  </span>
                </div>
                <input
                  type='range'
                  min='1'
                  max='10'
                  value={formData.moodScore}
                  onChange={e => handleSliderChange('moodScore', parseInt(e.target.value))}
                  className='w-full'
                />
                <div className='flex justify-between text-sm text-gray-500'>
                  <span>Very Bad</span>
                  <span>Perfect</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anxiety and Stress */}
          <Card>
            <CardHeader>
              <CardTitle>Anxiety & Stress Levels</CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2'>
                  Anxiety Level: {formData.anxietyLevel}/10
                </label>
                <input
                  type='range'
                  min='1'
                  max='10'
                  value={formData.anxietyLevel}
                  onChange={e => handleSliderChange('anxietyLevel', parseInt(e.target.value))}
                  className='w-full'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2'>
                  Stress Level: {formData.stressLevel}/10
                </label>
                <input
                  type='range'
                  min='1'
                  max='10'
                  value={formData.stressLevel}
                  onChange={e => handleSliderChange('stressLevel', parseInt(e.target.value))}
                  className='w-full'
                />
              </div>
            </CardContent>
          </Card>

          {/* Sleep */}
          <Card>
            <CardHeader>
              <CardTitle>Sleep</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2'>
                  Hours of sleep: {formData.sleepHours}
                </label>
                <input
                  type='range'
                  min='0'
                  max='12'
                  step='0.5'
                  value={formData.sleepHours || 0}
                  onChange={e => handleSliderChange('sleepHours', parseFloat(e.target.value))}
                  className='w-full'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2'>
                  Sleep Quality: {formData.sleepQuality}/10
                </label>
                <input
                  type='range'
                  min='1'
                  max='10'
                  value={formData.sleepQuality || 5}
                  onChange={e => handleSliderChange('sleepQuality', parseInt(e.target.value))}
                  className='w-full'
                />
              </div>
            </CardContent>
          </Card>

          {/* Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Activities</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between'>
                <label className='flex items-center space-x-3'>
                  <input
                    type='checkbox'
                    checked={formData.exercise}
                    onChange={e => handleCheckboxChange('exercise', e.target.checked)}
                    className='h-5 w-5 text-blue-600 rounded'
                  />
                  <span className='text-gray-700 dark:text-gray-200'>Exercise</span>
                </label>
                {formData.exercise && (
                  <input
                    type='number'
                    value={formData.exerciseMinutes || 0}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        exerciseMinutes: parseInt(e.target.value) || 0
                      }))
                    }
                    placeholder='Minutes'
                    className='w-24 px-2 py-1 border rounded'
                  />
                )}
              </div>

              <div className='flex items-center justify-between'>
                <label className='flex items-center space-x-3'>
                  <input
                    type='checkbox'
                    checked={formData.meditation}
                    onChange={e => handleCheckboxChange('meditation', e.target.checked)}
                    className='h-5 w-5 text-blue-600 rounded'
                  />
                  <span className='text-gray-700 dark:text-gray-200'>Meditation</span>
                </label>
                {formData.meditation && (
                  <input
                    type='number'
                    value={formData.meditationMinutes || 0}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        meditationMinutes: parseInt(e.target.value) || 0
                      }))
                    }
                    placeholder='Minutes'
                    className='w-24 px-2 py-1 border rounded'
                  />
                )}
              </div>

              <label className='flex items-center space-x-3'>
                <input
                  type='checkbox'
                  checked={formData.socialContact}
                  onChange={e => handleCheckboxChange('socialContact', e.target.checked)}
                  className='h-5 w-5 text-blue-600 rounded'
                />
                <span className='text-gray-700 dark:text-gray-200'>Social Contact</span>
              </label>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                placeholder="Any thoughts or feelings you'd like to record..."
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className='flex justify-between'>
            <Button type='button' variant='ghost' onClick={() => router.push('/dashboard')}>
              Cancel
            </Button>
            <Button type='submit' isLoading={isLoading} disabled={isLoading}>
              {todayData ? 'Update' : 'Submit'} Wellness Data
            </Button>
          </div>
        </form>
        </div>
      </div>
    </ErrorBoundary>
  );
}
