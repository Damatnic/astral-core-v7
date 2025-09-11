'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface Appointment {
  id: string;
  date: string;
  time: string;
  duration: number;
  therapistId: string;
  therapistName: string;
  clientId: string;
  clientName: string;
  type: 'individual' | 'group' | 'family' | 'crisis';
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  notes?: string;
  sessionNotes?: string;
  rating?: number;
  feedback?: string;
}

const AppointmentHistory: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    // Load appointment history
    const mockAppointments: Appointment[] = [
      {
        id: '1',
        date: '2024-01-15',
        time: '10:00',
        duration: 60,
        therapistId: '1',
        therapistName: 'Dr. Sarah Johnson',
        clientId: 'current-user',
        clientName: 'Current User',
        type: 'individual',
        status: 'completed',
        sessionNotes: 'Good progress on anxiety management techniques. Client showed improvement in coping strategies.',
        rating: 5,
        feedback: 'Very helpful session. Felt much better afterwards.'
      },
      {
        id: '2',
        date: '2024-01-08',
        time: '14:30',
        duration: 60,
        therapistId: '2',
        therapistName: 'Dr. Michael Chen',
        clientId: 'current-user',
        clientName: 'Current User',
        type: 'family',
        status: 'completed',
        sessionNotes: 'Family dynamics discussion. Made progress on communication patterns.',
        rating: 4
      },
      {
        id: '3',
        date: '2024-01-01',
        time: '11:00',
        duration: 60,
        therapistId: '1',
        therapistName: 'Dr. Sarah Johnson',
        clientId: 'current-user',
        clientName: 'Current User',
        type: 'individual',
        status: 'cancelled',
        notes: 'Client requested to reschedule due to illness'
      },
      {
        id: '4',
        date: '2023-12-25',
        time: '09:00',
        duration: 60,
        therapistId: '3',
        therapistName: 'Dr. Emily Rodriguez',
        clientId: 'current-user',
        clientName: 'Current User',
        type: 'crisis',
        status: 'completed',
        sessionNotes: 'Crisis intervention session. Client stabilized and safety plan reviewed.',
        rating: 5,
        feedback: 'Dr. Rodriguez was incredibly supportive during a difficult time.'
      }
    ];

    setAppointments(mockAppointments);
    setFilteredAppointments(mockAppointments);
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [statusFilter, dateRange, appointments]);

  const filterAppointments = () => {
    let filtered = [...appointments];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter);
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (dateRange) {
        case '30days':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          cutoffDate.setDate(now.getDate() - 90);
          break;
        case '1year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(appointment => 
        new Date(appointment.date) >= cutoffDate
      );
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setFilteredAppointments(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'no-show':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-sm ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment History</h1>
        <p className="text-gray-600">View your past and upcoming therapy sessions</p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Date Range:</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="1year">Last Year</option>
              </select>
            </div>

            <div className="text-sm text-gray-500">
              Showing {filteredAppointments.length} of {appointments.length} appointments
            </div>
          </div>
        </Card>
      </div>

      {/* Appointment List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No appointments found matching your criteria.</p>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => (
            <Card key={appointment.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {appointment.therapistName}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                      {appointment.status.replace('-', ' ')}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      {appointment.type}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Date:</strong> {formatDate(appointment.date)} at {appointment.time}
                    </p>
                    <p>
                      <strong>Duration:</strong> {appointment.duration} minutes
                    </p>
                    {appointment.notes && (
                      <p>
                        <strong>Notes:</strong> {appointment.notes}
                      </p>
                    )}
                  </div>

                  {appointment.sessionNotes && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">Session Notes:</p>
                      <p className="text-sm text-blue-800">{appointment.sessionNotes}</p>
                    </div>
                  )}

                  {appointment.rating && (
                    <div className="mt-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Rating:</span>
                        <div className="flex">
                          {renderStars(appointment.rating)}
                        </div>
                      </div>
                      {appointment.feedback && (
                        <p className="text-sm text-gray-600 mt-1 italic">"{appointment.feedback}"</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedAppointment(appointment)}
                  >
                    View Details
                  </Button>
                  {appointment.status === 'scheduled' && (
                    <Button size="sm" variant="outline">
                      Reschedule
                    </Button>
                  )}
                  {appointment.status === 'completed' && !appointment.rating && (
                    <Button size="sm" variant="outline">
                      Leave Review
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Summary Statistics */}
      <div className="mt-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {appointments.filter(a => a.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-600">Completed Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length}
              </p>
              <p className="text-sm text-gray-600">Upcoming Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {appointments.filter(a => a.status === 'cancelled').length}
              </p>
              <p className="text-sm text-gray-600">Cancelled Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {appointments.filter(a => a.rating).reduce((acc, a) => acc + (a.rating || 0), 0) / 
                 Math.max(appointments.filter(a => a.rating).length, 1) || 0}
              </p>
              <p className="text-sm text-gray-600">Average Rating</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AppointmentHistory;