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
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  appointmentId?: string;
}

const AppointmentScheduler: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTherapist, setSelectedTherapist] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const therapists = [
    { id: '1', name: 'Dr. Sarah Johnson', specialization: 'Anxiety, Depression' },
    { id: '2', name: 'Dr. Michael Chen', specialization: 'Family Therapy' },
    { id: '3', name: 'Dr. Emily Rodriguez', specialization: 'Crisis Intervention' }
  ];

  useEffect(() => {
    // Initialize with current date
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (selectedDate && selectedTherapist) {
      generateTimeSlots();
    }
  }, [selectedDate, selectedTherapist]);

  const generateTimeSlots = () => {
    const slots: TimeSlot[] = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        available: Math.random() > 0.3 // 70% chance of being available
      });
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:30`,
        available: Math.random() > 0.3
      });
    }
    
    setTimeSlots(slots);
  };

  const handleScheduleAppointment = async (time: string) => {
    setLoading(true);
    try {
      const newAppointment: Appointment = {
        id: Date.now().toString(),
        date: selectedDate,
        time,
        duration: 60,
        therapistId: selectedTherapist,
        therapistName: therapists.find(t => t.id === selectedTherapist)?.name || '',
        clientId: 'current-user',
        clientName: 'Current User',
        type: 'individual',
        status: 'scheduled'
      };

      setAppointments(prev => [...prev, newAppointment]);
      setTimeSlots(prev => prev.map(slot => 
        slot.time === time ? { ...slot, available: false, appointmentId: newAppointment.id } : slot
      ));

      console.log('Appointment scheduled:', newAppointment);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Schedule Appointment</h1>
        <p className="text-gray-600">Book your therapy session with available therapists</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Date and Therapist Selection */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Select Date & Therapist</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Therapist
                </label>
                <select
                  value={selectedTherapist}
                  onChange={(e) => setSelectedTherapist(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a therapist</option>
                  {therapists.map((therapist) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.name}
                    </option>
                  ))}
                </select>
                {selectedTherapist && (
                  <p className="text-sm text-gray-500 mt-1">
                    Specialization: {therapists.find(t => t.id === selectedTherapist)?.specialization}
                  </p>
                )}
              </div>

              {selectedDate && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600">
                    <strong>Selected Date:</strong><br />
                    {formatDate(selectedDate)}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Available Time Slots */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Available Time Slots</h2>
            
            {!selectedDate || !selectedTherapist ? (
              <div className="text-center py-8 text-gray-500">
                Please select a date and therapist to view available time slots.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && handleScheduleAppointment(slot.time)}
                    disabled={!slot.available || loading}
                    className={`p-3 text-sm font-medium rounded-lg border transition-colors ${
                      slot.available
                        ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                        : 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    {slot.time}
                    {slot.available ? '' : ' (Booked)'}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Recent Appointments */}
      {appointments.length > 0 && (
        <div className="mt-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Your Scheduled Appointments</h2>
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-blue-900">
                      {appointment.therapistName}
                    </p>
                    <p className="text-sm text-blue-700">
                      {formatDate(appointment.date)} at {appointment.time}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {appointment.status}
                    </span>
                    <Button size="sm" variant="outline">
                      Reschedule
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AppointmentScheduler;