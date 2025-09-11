'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface TherapyNote {
  id: string;
  clientId: string;
  clientName: string;
  sessionDate: string;
  sessionTime: string;
  duration: number;
  sessionType: 'individual' | 'group' | 'family' | 'crisis';
  mood: 'excellent' | 'good' | 'neutral' | 'poor' | 'crisis';
  goals: string[];
  progress: string;
  interventions: string[];
  homework: string[];
  nextSteps: string;
  riskAssessment: 'low' | 'medium' | 'high' | 'crisis';
  medications: string[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isConfidential: boolean;
}

interface TherapyGoal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  priority: 'low' | 'medium' | 'high';
}

const TherapyNotes: React.FC = () => {
  const [notes, setNotes] = useState<TherapyNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<TherapyNote | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [newNote, setNewNote] = useState<Partial<TherapyNote>>({
    clientId: '',
    sessionDate: new Date().toISOString().split('T')[0],
    sessionTime: new Date().toTimeString().slice(0, 5),
    duration: 60,
    sessionType: 'individual',
    mood: 'neutral',
    goals: [],
    progress: '',
    interventions: [],
    homework: [],
    nextSteps: '',
    riskAssessment: 'low',
    medications: [],
    tags: [],
    isConfidential: false
  });

  const clients = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
    { id: '3', name: 'Michael Johnson' },
    { id: '4', name: 'Sarah Wilson' }
  ];

  useEffect(() => {
    // Load existing therapy notes
    const mockNotes: TherapyNote[] = [
      {
        id: '1',
        clientId: '1',
        clientName: 'John Doe',
        sessionDate: '2024-01-15',
        sessionTime: '10:00',
        duration: 60,
        sessionType: 'individual',
        mood: 'good',
        goals: ['Reduce anxiety symptoms', 'Improve sleep quality'],
        progress: 'Client showed significant improvement in managing anxiety triggers. Sleep has improved from 4-5 hours to 6-7 hours per night.',
        interventions: ['Cognitive Behavioral Therapy', 'Breathing exercises', 'Sleep hygiene education'],
        homework: ['Practice daily breathing exercises', 'Keep sleep diary', 'Challenge negative thoughts worksheet'],
        nextSteps: 'Continue CBT techniques, introduce progressive muscle relaxation',
        riskAssessment: 'low',
        medications: ['Sertraline 50mg'],
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
        tags: ['anxiety', 'sleep', 'CBT'],
        isConfidential: false
      },
      {
        id: '2',
        clientId: '2',
        clientName: 'Jane Smith',
        sessionDate: '2024-01-14',
        sessionTime: '14:30',
        duration: 90,
        sessionType: 'family',
        mood: 'neutral',
        goals: ['Improve family communication', 'Resolve conflict patterns'],
        progress: 'Family members are showing willingness to listen to each other. Mother-daughter relationship showing signs of improvement.',
        interventions: ['Family Systems Therapy', 'Communication skills training', 'Conflict resolution techniques'],
        homework: ['Weekly family meetings', 'Practice active listening', 'Use I-statements when expressing feelings'],
        nextSteps: 'Focus on boundary setting and individual needs within family system',
        riskAssessment: 'medium',
        medications: [],
        createdAt: '2024-01-14T14:30:00Z',
        updatedAt: '2024-01-14T16:00:00Z',
        tags: ['family therapy', 'communication', 'conflict resolution'],
        isConfidential: true
      }
    ];

    setNotes(mockNotes);
  }, []);

  const handleSaveNote = () => {
    if (!newNote.clientId || !newNote.progress) {
      alert('Please fill in required fields (Client and Progress)');
      return;
    }

    const note: TherapyNote = {
      ...newNote as TherapyNote,
      id: Date.now().toString(),
      clientName: clients.find(c => c.id === newNote.clientId)?.name || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (selectedNote && isEditing) {
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...note, id: selectedNote.id } : n));
    } else {
      setNotes(prev => [...prev, note]);
    }

    // Reset form
    setNewNote({
      clientId: '',
      sessionDate: new Date().toISOString().split('T')[0],
      sessionTime: new Date().toTimeString().slice(0, 5),
      duration: 60,
      sessionType: 'individual',
      mood: 'neutral',
      goals: [],
      progress: '',
      interventions: [],
      homework: [],
      nextSteps: '',
      riskAssessment: 'low',
      medications: [],
      tags: [],
      isConfidential: false
    });
    setSelectedNote(null);
    setIsEditing(false);
  };

  const handleEditNote = (note: TherapyNote) => {
    setNewNote(note);
    setSelectedNote(note);
    setIsEditing(true);
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      setNotes(prev => prev.filter(n => n.id !== noteId));
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'crisis': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'neutral': return 'bg-gray-100 text-gray-800';
      case 'poor': return 'bg-orange-100 text-orange-800';
      case 'crisis': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.progress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesClient = !filterClient || note.clientId === filterClient;
    return matchesSearch && matchesClient;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Therapy Notes</h1>
        <p className="text-gray-600">Document and track client sessions and progress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notes List */}
        <div className="lg:col-span-2">
          {/* Search and Filters */}
          <div className="mb-6">
            <Card className="p-4">
              <div className="flex flex-wrap gap-4">
                <input
                  type="text"
                  placeholder="Search notes, clients, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Clients</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
            </Card>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            {filteredNotes.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No therapy notes found.</p>
              </Card>
            ) : (
              filteredNotes.map((note) => (
                <Card key={note.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {note.clientName}
                        {note.isConfidential && <span className="ml-2 text-red-500">🔒</span>}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(note.sessionDate).toLocaleDateString()} at {note.sessionTime}
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {note.sessionType}
                        </span>
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getMoodColor(note.mood)}`}>
                        {note.mood}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(note.riskAssessment)}`}>
                        {note.riskAssessment} risk
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Progress:</h4>
                      <p className="text-gray-700 text-sm">{note.progress}</p>
                    </div>

                    {note.goals.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Goals:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-700">
                          {note.goals.map((goal, idx) => (
                            <li key={idx}>{goal}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {note.interventions.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Interventions:</h4>
                        <div className="flex flex-wrap gap-1">
                          {note.interventions.map((intervention, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                              {intervention}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t">
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditNote(note)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteNote(note.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Note Form */}
        <div>
          <Card className="p-6 sticky top-6">
            <h2 className="text-lg font-semibold mb-4">
              {isEditing ? 'Edit Note' : 'New Session Note'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select
                  value={newNote.clientId || ''}
                  onChange={(e) => setNewNote(prev => ({ ...prev, clientId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newNote.sessionDate || ''}
                    onChange={(e) => setNewNote(prev => ({ ...prev, sessionDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={newNote.sessionTime || ''}
                    onChange={(e) => setNewNote(prev => ({ ...prev, sessionTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
                <select
                  value={newNote.sessionType || 'individual'}
                  onChange={(e) => setNewNote(prev => ({ ...prev, sessionType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="individual">Individual</option>
                  <option value="group">Group</option>
                  <option value="family">Family</option>
                  <option value="crisis">Crisis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Mood</label>
                <select
                  value={newNote.mood || 'neutral'}
                  onChange={(e) => setNewNote(prev => ({ ...prev, mood: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="neutral">Neutral</option>
                  <option value="poor">Poor</option>
                  <option value="crisis">Crisis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Progress Notes *</label>
                <textarea
                  value={newNote.progress || ''}
                  onChange={(e) => setNewNote(prev => ({ ...prev, progress: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Document client progress, observations, and key discussion points..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Steps</label>
                <textarea
                  value={newNote.nextSteps || ''}
                  onChange={(e) => setNewNote(prev => ({ ...prev, nextSteps: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Plan for next session..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Risk Assessment</label>
                <select
                  value={newNote.riskAssessment || 'low'}
                  onChange={(e) => setNewNote(prev => ({ ...prev, riskAssessment: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="crisis">Crisis</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="confidential"
                  checked={newNote.isConfidential || false}
                  onChange={(e) => setNewNote(prev => ({ ...prev, isConfidential: e.target.checked }))}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="confidential" className="text-sm text-gray-700">
                  Mark as confidential
                </label>
              </div>

              <div className="flex space-x-3">
                <Button onClick={handleSaveNote} className="flex-1">
                  {isEditing ? 'Update Note' : 'Save Note'}
                </Button>
                {isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedNote(null);
                      setNewNote({
                        clientId: '',
                        sessionDate: new Date().toISOString().split('T')[0],
                        sessionTime: new Date().toTimeString().slice(0, 5),
                        duration: 60,
                        sessionType: 'individual',
                        mood: 'neutral',
                        goals: [],
                        progress: '',
                        interventions: [],
                        homework: [],
                        nextSteps: '',
                        riskAssessment: 'low',
                        medications: [],
                        tags: [],
                        isConfidential: false
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
      </div>
    </div>
  );
};

export default TherapyNotes;