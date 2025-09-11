
import React, { useState, useCallback } from 'react';
import { PhoneIcon, ChatBubbleLeftRightIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

interface CrisisInterventionFlowProps {
  onEmergencyCall: () => void;
  onCrisisChat: () => void;
  onVideoSupport: () => void;
  onSelfHelp: () => void;
}

export function CrisisInterventionFlow({
  onEmergencyCall,
  onCrisisChat,
  onVideoSupport,
  onSelfHelp
}: CrisisInterventionFlowProps) {
  const [currentStep, setCurrentStep] = useState<'assessment' | 'resources' | 'immediate'>('assessment');
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high' | 'emergency' | null>(null);

  const handleUrgencySelection = useCallback((level: 'low' | 'medium' | 'high' | 'emergency') => {
    setUrgencyLevel(level);
    
    if (level === 'emergency') {
      setCurrentStep('immediate');
    } else {
      setCurrentStep('resources');
    }
  }, []);

  const AssessmentStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          You're not alone. Help is here.
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Let's find the right support for how you're feeling right now.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          How urgent is your need for support right now?
        </p>

        <button
          onClick={() => handleUrgencySelection('emergency')}
          className="w-full p-4 text-left bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-red-600 dark:text-red-400 text-2xl">🚨</div>
            <div>
              <div className="font-semibold text-red-900 dark:text-red-100">I need help immediately</div>
              <div className="text-sm text-red-700 dark:text-red-300">I'm in crisis and need emergency support</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleUrgencySelection('high')}
          className="w-full p-4 text-left bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-orange-600 dark:text-orange-400 text-2xl">⚠️</div>
            <div>
              <div className="font-semibold text-orange-900 dark:text-orange-100">I need support soon</div>
              <div className="text-sm text-orange-700 dark:text-orange-300">I'm struggling and need to talk to someone</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleUrgencySelection('medium')}
          className="w-full p-4 text-left bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-yellow-600 dark:text-yellow-400 text-2xl">💭</div>
            <div>
              <div className="font-semibold text-yellow-900 dark:text-yellow-100">I could use some help</div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">I'm having a difficult time but not in immediate danger</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleUrgencySelection('low')}
          className="w-full p-4 text-left bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-blue-600 dark:text-blue-400 text-2xl">🌱</div>
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100">I'm looking for resources</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">I want to learn coping strategies and self-help tools</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const ImmediateStep = () => (
    <div className="space-y-6">
      <div className="text-center bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
        <div className="text-4xl mb-2">🤝</div>
        <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
          Immediate Support Available
        </h2>
        <p className="text-red-700 dark:text-red-300">
          You deserve support right now. These resources are available 24/7.
        </p>
      </div>

      <div className="grid gap-3">
        <button
          onClick={onEmergencyCall}
          className="flex items-center gap-4 p-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <PhoneIcon className="h-6 w-6" />
          <div className="text-left">
            <div className="font-semibold">Call 988 - Suicide & Crisis Lifeline</div>
            <div className="text-sm opacity-90">Free, confidential, 24/7 crisis support</div>
          </div>
        </button>

        <button
          onClick={onCrisisChat}
          className="flex items-center gap-4 p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
          <div className="text-left">
            <div className="font-semibold">Crisis Text Line</div>
            <div className="text-sm opacity-90">Text HOME to 741741 for immediate support</div>
          </div>
        </button>

        <button
          onClick={onVideoSupport}
          className="flex items-center gap-4 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <VideoCameraIcon className="h-6 w-6" />
          <div className="text-left">
            <div className="font-semibold">Emergency Therapist Connect</div>
            <div className="text-sm opacity-90">Connect with a crisis counselor via video</div>
          </div>
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          If you're in immediate physical danger, please call 911 or go to your nearest emergency room.
        </p>
      </div>
    </div>
  );

  const ResourcesStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Support Options for You
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {urgencyLevel === 'high' 
            ? 'We understand you need support soon. Here are your immediate options.'
            : urgencyLevel === 'medium'
            ? 'You\'re taking a positive step by seeking help. Here are supportive resources.'
            : 'Here are resources to help you build coping strategies and find support.'}
        </p>
      </div>

      <div className="grid gap-4">
        <button
          onClick={onCrisisChat}
          className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div className="text-left">
            <div className="font-semibold text-blue-900 dark:text-blue-100">Chat with someone now</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Anonymous, confidential text support</div>
          </div>
        </button>

        <button
          onClick={onVideoSupport}
          className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <VideoCameraIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div className="text-left">
            <div className="font-semibold text-green-900 dark:text-green-100">Schedule therapist session</div>
            <div className="text-sm text-green-700 dark:text-green-300">Video or phone appointment within 24 hours</div>
          </div>
        </button>

        <button
          onClick={onSelfHelp}
          className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        >
          <div className="text-2xl">🧘</div>
          <div className="text-left">
            <div className="font-semibold text-purple-900 dark:text-purple-100">Self-help resources</div>
            <div className="text-sm text-purple-700 dark:text-purple-300">Breathing exercises, coping strategies, and tools</div>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto p-6">
      {currentStep === 'assessment' && <AssessmentStep />}
      {currentStep === 'immediate' && <ImmediateStep />}
      {currentStep === 'resources' && <ResourcesStep />}
      
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Your privacy is protected. All interactions are confidential.
        </p>
      </div>
    </div>
  );
}

export default CrisisInterventionFlow;