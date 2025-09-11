'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface MoodEntry {
  id: string;
  date: string;
  time: string;
  mood: number; // 1-10 scale
  emotions: string[];
  energy: number; // 1-10 scale
  stress: number; // 1-10 scale
  sleep: number; // hours
  notes?: string;
  triggers?: string[];
  activities?: string[];
  medications?: string[];
  weather?: string;
  location?: string;
}

interface MoodStats {
  averageMood: number;
  averageEnergy: number;
  averageStress: number;
  averageSleep: number;
  totalEntries: number;
  streak: number;
}

const MoodTracker: React.FC = () => {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<Partial<MoodEntry>>({
    date: new Date().toISOString().split('T')[0] || '',
    time: new Date().toTimeString().slice(0, 5) || '',
    mood: 5,
    emotions: [],
    energy: 5,
    stress: 5,
    sleep: 8,
    notes: '',
    triggers: [],
    activities: [],
    medications: [],
    weather: '',
    location: ''
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | '3months'>('week');
  const [stats, setStats] = useState<MoodStats>({
    averageMood: 0,
    averageEnergy: 0,
    averageStress: 0,
    averageSleep: 0,
    totalEntries: 0,
    streak: 0
  });

  const emotions = [
    'happy', 'sad', 'anxious', 'calm', 'angry', 'frustrated', 'excited', 
    'peaceful', 'worried', 'content', 'overwhelmed', 'hopeful', 'lonely', 
    'grateful', 'irritated', 'confident', 'fearful', 'relaxed'
  ];

  const commonTriggers = [
    'work stress', 'relationships', 'health issues', 'financial concerns',
    'family issues', 'sleep problems', 'social situations', 'weather',
    'medication changes', 'hormonal changes', 'major life events'
  ];

  const commonActivities = [
    'exercise', 'meditation', 'socializing', 'reading', 'music',
    'art/crafts', 'outdoor activities', 'therapy session', 'journaling',
    'cooking', 'gaming', 'watching movies', 'shopping', 'cleaning'
  ];

  useEffect(() => {
    // Load existing mood entries
    const mockEntries: MoodEntry[] = [
      {
        id: '1',
        date: '2024-01-15',
        time: '20:00',
        mood: 7,
        emotions: ['content', 'grateful'],
        energy: 6,
        stress: 4,
        sleep: 7,
        notes: 'Had a good day overall. Therapy session was helpful.',
        triggers: [],
        activities: ['therapy session', 'meditation'],
        medications: ['Sertraline 50mg'],
        weather: 'sunny',
        location: 'home'
      },
      {
        id: '2',
        date: '2024-01-14',
        time: '19:30',
        mood: 5,
        emotions: ['anxious', 'worried'],
        energy: 4,
        stress: 7,
        sleep: 6,
        notes: 'Work was stressful today. Presentation didn\'t go as planned.',
        triggers: ['work stress'],
        activities: ['exercise'],
        medications: ['Sertraline 50mg'],
        weather: 'rainy',
        location: 'office'
      },
      {
        id: '3',
        date: '2024-01-13',
        time: '21:15',
        mood: 8,
        emotions: ['happy', 'excited'],
        energy: 8,
        stress: 2,
        sleep: 8,
        notes: 'Great day with friends. Felt very supported.',
        triggers: [],
        activities: ['socializing', 'outdoor activities'],
        medications: ['Sertraline 50mg'],
        weather: 'cloudy',
        location: 'park'
      }
    ];

    setEntries(mockEntries);
    calculateStats(mockEntries);
  }, []);

  const calculateStats = (entriesData: MoodEntry[]) => {
    if (entriesData.length === 0) {
      setStats({
        averageMood: 0,
        averageEnergy: 0,
        averageStress: 0,
        averageSleep: 0,
        totalEntries: 0,
        streak: 0
      });
      return;
    }

    const avgMood = entriesData.reduce((sum, entry) => sum + entry.mood, 0) / entriesData.length;
    const avgEnergy = entriesData.reduce((sum, entry) => sum + entry.energy, 0) / entriesData.length;
    const avgStress = entriesData.reduce((sum, entry) => sum + entry.stress, 0) / entriesData.length;
    const avgSleep = entriesData.reduce((sum, entry) => sum + entry.sleep, 0) / entriesData.length;

    // Calculate streak (consecutive days with entries)
    const sortedDates = entriesData
      .map(entry => entry.date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < sortedDates.length; i++) {
      const entryDate = new Date(sortedDates[i]);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (entryDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    setStats({
      averageMood: Math.round(avgMood * 10) / 10,
      averageEnergy: Math.round(avgEnergy * 10) / 10,
      averageStress: Math.round(avgStress * 10) / 10,
      averageSleep: Math.round(avgSleep * 10) / 10,
      totalEntries: entriesData.length,
      streak
    });
  };

  const handleSaveEntry = () => {
    if (!currentEntry.mood || !currentEntry.energy || !currentEntry.stress || !currentEntry.sleep) {
      alert('Please fill in all required fields');
      return;
    }

    const newEntry: MoodEntry = {
      ...currentEntry as MoodEntry,
      id: Date.now().toString()
    };

    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    calculateStats(updatedEntries);

    // Reset form
    setCurrentEntry({
      date: new Date().toISOString().split('T')[0] || '',
      time: new Date().toTimeString().slice(0, 5) || '',
      mood: 5,
      emotions: [],
      energy: 5,
      stress: 5,
      sleep: 8,
      notes: '',
      triggers: [],
      activities: [],
      medications: [],
      weather: '',
      location: ''
    });
  };

  const getMoodColor = (mood: number) => {
    if (mood >= 8) return 'bg-green-100 text-green-800';
    if (mood >= 6) return 'bg-blue-100 text-blue-800';
    if (mood >= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 9) return '😄';
    if (mood >= 8) return '😊';
    if (mood >= 7) return '🙂';
    if (mood >= 6) return '😐';
    if (mood >= 5) return '😕';
    if (mood >= 4) return '😞';
    if (mood >= 3) return '😢';
    return '😭';
  };

  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    const now = new Date();
    const cutoffDate = new Date();

    switch (selectedPeriod) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
    }

    return entryDate >= cutoffDate;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const toggleArrayItem = (array: string[], item: string, setter: (value: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mood Tracker</h1>
        <p className="text-gray-600">Track your daily mood, energy, and well-being patterns</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Overview */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.averageMood}</p>
              <p className="text-sm text-gray-600">Avg Mood</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.averageEnergy}</p>
              <p className="text-sm text-gray-600">Avg Energy</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.averageStress}</p>
              <p className="text-sm text-gray-600">Avg Stress</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.averageSleep}h</p>
              <p className="text-sm text-gray-600">Avg Sleep</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.streak}</p>
              <p className="text-sm text-gray-600">Day Streak</p>
            </Card>
          </div>
        </div>

        {/* Mood Entry Form */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Log Today's Mood</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date & Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={currentEntry.date || ''}
                    onChange={(e) => setCurrentEntry(prev => ({ ...prev, date: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="time"
                    value={currentEntry.time || ''}
                    onChange={(e) => setCurrentEntry(prev => ({ ...prev, time: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mood (1-10) {getMoodEmoji(currentEntry.mood || 5)}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentEntry.mood || 5}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, mood: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">
                  {currentEntry.mood || 5}/10
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Energy Level (1-10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentEntry.energy || 5}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, energy: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">
                  {currentEntry.energy || 5}/10
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stress Level (1-10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentEntry.stress || 5}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, stress: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">
                  {currentEntry.stress || 5}/10
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sleep (hours)</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={currentEntry.sleep || 8}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, sleep: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emotions</label>
                <div className="flex flex-wrap gap-2">
                  {emotions.slice(0, 8).map(emotion => (
                    <button
                      key={emotion}
                      type="button"
                      onClick={() => toggleArrayItem(
                        currentEntry.emotions || [], 
                        emotion, 
                        (emotions) => setCurrentEntry(prev => ({ ...prev, emotions }))
                      )}
                      className={`px-2 py-1 text-xs rounded-full border ${
                        (currentEntry.emotions || []).includes(emotion)
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-gray-50 text-gray-700 border-gray-300'
                      }`}
                    >
                      {emotion}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={currentEntry.notes || ''}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="How are you feeling? What happened today?"
                />
              </div>

              <Button onClick={handleSaveEntry} className="w-full">
                Save Mood Entry
              </Button>
            </div>
          </Card>
        </div>

        {/* Recent Entries */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Recent Entries</h2>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="3months">Last 3 Months</option>
              </select>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No mood entries found for the selected period.
                </div>
              ) : (
                filteredEntries.map(entry => (
                  <div key={entry.id} className="border-l-4 border-blue-200 pl-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(entry.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">{entry.time}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getMoodColor(entry.mood)}`}>
                        Mood: {entry.mood}/10
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-gray-600">Energy: </span>
                        <span className="font-medium">{entry.energy}/10</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Stress: </span>
                        <span className="font-medium">{entry.stress}/10</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Sleep: </span>
                        <span className="font-medium">{entry.sleep}h</span>
                      </div>
                    </div>

                    {entry.emotions.length > 0 && (
                      <div className="mb-2">
                        <div className="flex flex-wrap gap-1">
                          {entry.emotions.map(emotion => (
                            <span key={emotion} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                              {emotion}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {entry.notes && (
                      <p className="text-sm text-gray-700 italic">"{entry.notes}"</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MoodTracker;