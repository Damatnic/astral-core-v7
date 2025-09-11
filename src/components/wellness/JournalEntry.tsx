'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  mood: 'very-sad' | 'sad' | 'neutral' | 'happy' | 'very-happy';
  tags: string[];
  isPrivate: boolean;
  gratitude?: string[];
  goals?: string[];
  challenges?: string[];
  achievements?: string[];
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

interface JournalPrompt {
  id: string;
  category: string;
  prompt: string;
  description: string;
}

const JournalEntry: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<Partial<JournalEntry>>({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    mood: 'neutral',
    tags: [],
    isPrivate: false,
    gratitude: [],
    goals: [],
    challenges: [],
    achievements: []
  });
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterMood, setFilterMood] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);

  const journalPrompts: JournalPrompt[] = [
    {
      id: '1',
      category: 'Daily Reflection',
      prompt: 'What are three things that went well today, and why?',
      description: 'Focus on positive experiences and learning'
    },
    {
      id: '2',
      category: 'Emotional Processing',
      prompt: 'How are you feeling right now? What might be contributing to these feelings?',
      description: 'Explore and understand your emotions'
    },
    {
      id: '3',
      category: 'Gratitude',
      prompt: 'List five things you\'re grateful for today, big or small.',
      description: 'Practice gratitude and positive thinking'
    },
    {
      id: '4',
      category: 'Goal Setting',
      prompt: 'What is one small step you can take tomorrow toward a goal that matters to you?',
      description: 'Focus on actionable progress'
    },
    {
      id: '5',
      category: 'Self-Compassion',
      prompt: 'If your best friend was going through what you\'re experiencing, what would you tell them?',
      description: 'Practice self-kindness and perspective'
    },
    {
      id: '6',
      category: 'Mindfulness',
      prompt: 'Describe your current environment using all five senses. What do you notice?',
      description: 'Practice present-moment awareness'
    },
    {
      id: '7',
      category: 'Challenge & Growth',
      prompt: 'What challenge are you facing right now, and what might it be teaching you?',
      description: 'Find learning opportunities in difficulties'
    },
    {
      id: '8',
      category: 'Relationships',
      prompt: 'Write about a meaningful connection you had with someone today.',
      description: 'Reflect on social connections and support'
    }
  ];

  useEffect(() => {
    // Load existing journal entries
    const mockEntries: JournalEntry[] = [
      {
        id: '1',
        title: 'A Good Day Despite Challenges',
        content: 'Today started rough with anxiety about the upcoming presentation, but I managed to work through it using the breathing techniques Dr. Johnson taught me. I realized that my fear was mostly about what others might think, not about my actual ability to present.\n\nThe presentation went better than expected! My colleagues were supportive and asked thoughtful questions. I felt proud of myself for pushing through the anxiety.\n\nIn the evening, I had a nice call with mom. She reminded me how far I\'ve come in managing my anxiety over the past year. Sometimes it takes someone else to help you see your progress.',
        date: '2024-01-15',
        mood: 'happy',
        tags: ['anxiety', 'work', 'progress', 'family'],
        isPrivate: false,
        gratitude: ['Supportive colleagues', 'Mom\'s encouragement', 'Learning coping skills'],
        goals: ['Continue practicing breathing techniques', 'Prepare better for next presentation'],
        challenges: ['Morning anxiety', 'Perfectionist tendencies'],
        achievements: ['Successful presentation', 'Used coping strategies effectively'],
        wordCount: 156,
        createdAt: '2024-01-15T20:30:00Z',
        updatedAt: '2024-01-15T20:45:00Z'
      },
      {
        id: '2',
        title: 'Reflecting on Therapy Session',
        content: 'Had my weekly session with Dr. Johnson today. We talked about my tendency to catastrophize situations and how it affects my daily life. She introduced me to the concept of "probability thinking" - asking myself what\'s the most likely outcome versus the worst-case scenario I always imagine.\n\nWe also discussed my relationship with my brother. I realized I\'ve been avoiding difficult conversations with him because I\'m afraid of conflict. But avoiding these talks is creating more distance between us.\n\nHomework for this week: Practice probability thinking when I notice catastrophic thoughts, and plan to have one honest conversation with my brother.',
        date: '2024-01-12',
        mood: 'neutral',
        tags: ['therapy', 'catastrophizing', 'family', 'communication'],
        isPrivate: true,
        gratitude: ['Helpful therapy session', 'New coping strategy'],
        goals: ['Practice probability thinking', 'Talk to brother'],
        challenges: ['Catastrophic thinking patterns', 'Avoiding conflict'],
        achievements: ['Recognized thinking patterns', 'Committed to change'],
        wordCount: 134,
        createdAt: '2024-01-12T15:30:00Z',
        updatedAt: '2024-01-12T15:45:00Z'
      },
      {
        id: '3',
        title: 'Weekend Self-Care',
        content: 'Spent the weekend focusing on self-care. Saturday morning yoga felt amazing - I\'m getting stronger and more flexible. The instructor reminded us to be patient with ourselves, which I needed to hear.\n\nTried a new recipe for dinner and it turned out great! Cooking is becoming a meditative activity for me. There\'s something soothing about following a recipe step by step.\n\nSunday was quieter. Read for a few hours, took a walk in the park, and called my friend Sarah. She\'s going through a tough time, but I was able to offer support. It felt good to be there for someone else.',
        date: '2024-01-14',
        mood: 'very-happy',
        tags: ['self-care', 'yoga', 'cooking', 'friendship'],
        isPrivate: false,
        gratitude: ['Yoga practice', 'Successful cooking', 'Good friendship'],
        goals: ['Continue regular yoga', 'Try more new recipes'],
        challenges: ['Making time for self-care'],
        achievements: ['Consistent weekend routine', 'Supported a friend'],
        wordCount: 121,
        createdAt: '2024-01-14T21:00:00Z',
        updatedAt: '2024-01-14T21:15:00Z'
      }
    ];

    setEntries(mockEntries);
  }, []);

  const handleSaveEntry = () => {
    if (!currentEntry.title || !currentEntry.content) {
      alert('Please add a title and content for your journal entry');
      return;
    }

    const wordCount = currentEntry.content?.split(/\s+/).length || 0;
    
    const entry: JournalEntry = {
      ...currentEntry as JournalEntry,
      id: selectedEntry?.id || Date.now().toString(),
      wordCount,
      createdAt: selectedEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (selectedEntry && isEditing) {
      setEntries(prev => prev.map(e => e.id === selectedEntry.id ? entry : e));
    } else {
      setEntries(prev => [entry, ...prev]);
    }

    // Reset form
    setCurrentEntry({
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0],
      mood: 'neutral',
      tags: [],
      isPrivate: false,
      gratitude: [],
      goals: [],
      challenges: [],
      achievements: []
    });
    setSelectedEntry(null);
    setIsEditing(false);
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setSelectedEntry(entry);
    setIsEditing(true);
  };

  const handleDeleteEntry = (entryId: string) => {
    if (confirm('Are you sure you want to delete this journal entry?')) {
      setEntries(prev => prev.filter(e => e.id !== entryId));
    }
  };

  const handleUsePrompt = (prompt: JournalPrompt) => {
    setCurrentEntry(prev => ({
      ...prev,
      title: prompt.category,
      content: `${prompt.prompt}\n\n`
    }));
    setShowPrompts(false);
  };

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case 'very-happy': return '😄';
      case 'happy': return '😊';
      case 'neutral': return '😐';
      case 'sad': return '😔';
      case 'very-sad': return '😢';
      default: return '😐';
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'very-happy': return 'bg-green-100 text-green-800';
      case 'happy': return 'bg-blue-100 text-blue-800';
      case 'neutral': return 'bg-gray-100 text-gray-800';
      case 'sad': return 'bg-yellow-100 text-yellow-800';
      case 'very-sad': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTag = !filterTag || entry.tags.includes(filterTag);
    const matchesMood = !filterMood || entry.mood === filterMood;
    return matchesSearch && matchesTag && matchesMood;
  });

  const allTags = Array.from(new Set(entries.flatMap(entry => entry.tags)));

  const addArrayItem = (field: 'gratitude' | 'goals' | 'challenges' | 'achievements', value: string) => {
    if (value.trim()) {
      const currentArray = currentEntry[field] || [];
      setCurrentEntry(prev => ({
        ...prev,
        [field]: [...currentArray, value.trim()]
      }));
    }
  };

  const removeArrayItem = (field: 'gratitude' | 'goals' | 'challenges' | 'achievements', index: number) => {
    const currentArray = currentEntry[field] || [];
    setCurrentEntry(prev => ({
      ...prev,
      [field]: currentArray.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Journal</h1>
        <p className="text-gray-600">Reflect on your thoughts, feelings, and experiences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journal Entry Form */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {isEditing ? 'Edit Entry' : 'New Journal Entry'}
              </h2>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowPrompts(!showPrompts)}
              >
                Prompts
              </Button>
            </div>

            {showPrompts && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg max-h-40 overflow-y-auto">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Writing Prompts</h3>
                <div className="space-y-2">
                  {journalPrompts.map(prompt => (
                    <button
                      key={prompt.id}
                      onClick={() => handleUsePrompt(prompt)}
                      className="text-left w-full p-2 text-xs bg-white rounded border hover:bg-blue-50"
                    >
                      <div className="font-medium text-blue-800">{prompt.category}</div>
                      <div className="text-blue-600">{prompt.prompt}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={currentEntry.title || ''}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What's on your mind?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={currentEntry.date || ''}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  How are you feeling? {getMoodEmoji(currentEntry.mood || 'neutral')}
                </label>
                <select
                  value={currentEntry.mood || 'neutral'}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, mood: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="very-sad">Very Sad 😢</option>
                  <option value="sad">Sad 😔</option>
                  <option value="neutral">Neutral 😐</option>
                  <option value="happy">Happy 😊</option>
                  <option value="very-happy">Very Happy 😄</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content ({currentEntry.content?.split(/\s+/).length || 0} words)
                </label>
                <textarea
                  value={currentEntry.content || ''}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, content: e.target.value }))}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Write about your thoughts, feelings, experiences, or whatever comes to mind..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={(currentEntry.tags || []).join(', ')}
                  onChange={(e) => setCurrentEntry(prev => ({ 
                    ...prev, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="anxiety, work, family, progress..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="private"
                  checked={currentEntry.isPrivate || false}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, isPrivate: e.target.checked }))}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="private" className="text-sm text-gray-700">
                  Keep this entry private 🔒
                </label>
              </div>

              <div className="flex space-x-3">
                <Button onClick={handleSaveEntry} className="flex-1">
                  {isEditing ? 'Update Entry' : 'Save Entry'}
                </Button>
                {isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedEntry(null);
                      setCurrentEntry({
                        title: '',
                        content: '',
                        date: new Date().toISOString().split('T')[0],
                        mood: 'neutral',
                        tags: [],
                        isPrivate: false,
                        gratitude: [],
                        goals: [],
                        challenges: [],
                        achievements: []
                      });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Journal Entries List */}
        <div className="lg:col-span-2">
          {/* Filters */}
          <div className="mb-6">
            <Card className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                <select
                  value={filterMood}
                  onChange={(e) => setFilterMood(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Moods</option>
                  <option value="very-happy">Very Happy</option>
                  <option value="happy">Happy</option>
                  <option value="neutral">Neutral</option>
                  <option value="sad">Sad</option>
                  <option value="very-sad">Very Sad</option>
                </select>
              </div>
            </Card>
          </div>

          {/* Entries */}
          <div className="space-y-4">
            {filteredEntries.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No journal entries found. Start writing!</p>
              </Card>
            ) : (
              filteredEntries.map(entry => (
                <Card key={entry.id} className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getMoodEmoji(entry.mood)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {entry.title}
                          {entry.isPrivate && <span className="ml-2 text-red-500">🔒</span>}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(entry.date).toLocaleDateString()} • {entry.wordCount} words
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getMoodColor(entry.mood)}`}>
                        {entry.mood.replace('-', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed">
                      {entry.content.length > 200 ? 
                        `${entry.content.substring(0, 200)}...` : 
                        entry.content
                      }
                    </p>
                  </div>

                  {entry.tags.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {entry.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t">
                    <p className="text-xs text-gray-500">
                      Last updated: {new Date(entry.updatedAt).toLocaleString()}
                    </p>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditEntry(entry)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteEntry(entry.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Journal Stats */}
          <div className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Journal Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{entries.length}</p>
                  <p className="text-sm text-gray-600">Total Entries</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(entries.reduce((sum, entry) => sum + entry.wordCount, 0) / Math.max(entries.length, 1))}
                  </p>
                  <p className="text-sm text-gray-600">Avg Words</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{allTags.length}</p>
                  <p className="text-sm text-gray-600">Unique Tags</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {entries.filter(e => e.date === new Date().toISOString().split('T')[0]).length}
                  </p>
                  <p className="text-sm text-gray-600">Today's Entries</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalEntry;