'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { logError } from '../../lib/logger';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// Force dynamic rendering to avoid SSR issues with stores
export const dynamic = 'force-dynamic';

interface JournalEntry {
  id: string;
  title?: string;
  content: string;
  mood?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  anxious: '😰',
  angry: '😠',
  neutral: '😐',
  excited: '🤩',
  tired: '😴',
  grateful: '🙏'
};

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mood: '',
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch('/api/journal/entries');
      if (response.ok) {
        const data = await response.json();
        setEntries(data.data?.items || []);
      }
    } catch (error) {
      logError('Error fetching journal entries', error, 'JournalPage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingEntry
        ? `/api/journal/entries?id=${editingEntry.id}`
        : '/api/journal/entries';

      const method = editingEntry ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchEntries();
        resetForm();
      }
    } catch (error) {
      logError('Error saving journal entry', error, 'JournalPage');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(`/api/journal/entries?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchEntries();
      }
    } catch (error) {
      logError('Error deleting journal entry', error, 'JournalPage');
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title || '',
      content: entry.content,
      mood: entry.mood || '',
      tags: entry.tags
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      mood: '',
      tags: []
    });
    setEditingEntry(null);
    setShowForm(false);
    setTagInput('');
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  return (
    <ErrorBoundary
      fallback={
        <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
          <div className='sm:mx-auto sm:w-full sm:max-w-md'>
            <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
              <div className='text-center'>
                <h3 className='text-lg font-medium text-gray-900'>Journal Error</h3>
                <p className='mt-2 text-sm text-gray-600'>
                  Unable to load your journal. Your entries are safe and will be available once the issue is resolved.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700'
                >
                  Reload Journal
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
        <div className='max-w-6xl mx-auto px-4'>
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>My Journal</h1>
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? 'secondary' : 'primary'}
          >
            {showForm ? 'Cancel' : 'New Entry'}
          </Button>
        </div>

        {showForm && (
          <Card className='mb-8'>
            <CardHeader>
              <CardTitle>{editingEntry ? 'Edit Entry' : 'New Journal Entry'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className='space-y-4'>
                <Input
                  label='Title (Optional)'
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder='Give your entry a title...'
                />

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2'>
                    How are you feeling?
                  </label>
                  <div className='flex gap-2 flex-wrap'>
                    {Object.entries(MOOD_EMOJIS).map(([mood, emoji]) => (
                      <button
                        key={mood}
                        type='button'
                        onClick={() => setFormData(prev => ({ ...prev, mood }))}
                        className={`px-3 py-2 rounded-lg border-2 transition-colors ${
                          formData.mood === mood
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className='text-2xl mr-2'>{emoji}</span>
                        <span className='capitalize'>{mood}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2'>
                    Content
                  </label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={8}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    placeholder='Write your thoughts...'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2'>
                    Tags
                  </label>
                  <div className='flex gap-2 mb-2 flex-wrap'>
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className='px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm flex items-center gap-1'
                      >
                        {tag}
                        <button
                          type='button'
                          onClick={() => removeTag(tag)}
                          className='text-blue-500 hover:text-blue-700'
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder='Add a tag...'
                      className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700'
                    />
                    <Button type='button' onClick={addTag} variant='secondary'>
                      Add Tag
                    </Button>
                  </div>
                </div>

                <div className='flex justify-end gap-2'>
                  <Button type='button' variant='ghost' onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type='submit'>{editingEntry ? 'Update' : 'Save'} Entry</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className='text-center py-12'>
            <p className='text-gray-500'>Loading entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className='text-center py-12'>
              <p className='text-gray-500 dark:text-gray-400 mb-4'>No journal entries yet</p>
              <Button onClick={() => setShowForm(true)}>Write Your First Entry</Button>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-4'>
            {entries.map(entry => (
              <Card key={entry.id}>
                <CardContent className='p-6'>
                  <div className='flex justify-between items-start mb-4'>
                    <div>
                      {entry.title && (
                        <h3 className='text-xl font-semibold text-gray-900 dark:text-white mb-1'>
                          {entry.title}
                        </h3>
                      )}
                      <div className='flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400'>
                        <span>{format(new Date(entry.createdAt), 'PPP')}</span>
                        {entry.mood && (
                          <span className='flex items-center gap-1'>
                            <span className='text-lg'>{MOOD_EMOJIS[entry.mood]}</span>
                            <span className='capitalize'>{entry.mood}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className='flex gap-2'>
                      <Button size='sm' variant='ghost' onClick={() => handleEdit(entry)}>
                        Edit
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleDelete(entry.id)}
                        className='text-red-600 hover:text-red-700'
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <p className='text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4'>
                    {entry.content}
                  </p>

                  {entry.tags.length > 0 && (
                    <div className='flex gap-2 flex-wrap'>
                      {entry.tags.map(tag => (
                        <span
                          key={tag}
                          className='px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-sm'
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
