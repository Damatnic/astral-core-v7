# Crisis Management API Examples

This document provides comprehensive examples for implementing crisis assessment and intervention features using the Astral Core v7 API.

## Table of Contents

1. [Crisis Assessment](#crisis-assessment)
2. [Emergency Response](#emergency-response)
3. [Risk Level Management](#risk-level-management)
4. [Resource Integration](#resource-integration)
5. [Follow-up Tracking](#follow-up-tracking)
6. [Admin Notifications](#admin-notifications)

## Crisis Assessment

### Basic Crisis Assessment

```javascript
// Perform a crisis assessment
const performCrisisAssessment = async assessmentData => {
  try {
    const response = await fetch('/api/crisis/assess', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        suicidalIdeation: assessmentData.suicidalIdeation,
        homicidalIdeation: assessmentData.homicidalIdeation,
        hasPlan: assessmentData.hasPlan,
        hasMeans: assessmentData.hasMeans,
        immediateRisk: assessmentData.immediateRisk,
        selfHarmRisk: assessmentData.selfHarmRisk,
        substanceUse: assessmentData.substanceUse,
        symptoms: assessmentData.symptoms,
        triggerEvent: assessmentData.triggerEvent
      })
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        assessment: result
      };
    } else {
      // Even on error, crisis resources are provided
      return {
        success: false,
        error: result.error,
        resources: result.resources // Emergency resources always available
      };
    }
  } catch (error) {
    console.error('Crisis assessment failed:', error);
    // Always provide emergency resources on error
    return {
      success: false,
      error: 'Assessment failed, but help is available',
      resources: await getEmergencyResources()
    };
  }
};

// Example usage for different risk levels
const examples = {
  lowRisk: {
    suicidalIdeation: false,
    homicidalIdeation: false,
    hasPlan: false,
    hasMeans: false,
    immediateRisk: false,
    selfHarmRisk: false,
    substanceUse: false,
    symptoms: ['mild_sadness'],
    triggerEvent: 'Minor work stress'
  },

  moderateRisk: {
    suicidalIdeation: false,
    homicidalIdeation: false,
    hasPlan: false,
    hasMeans: false,
    immediateRisk: false,
    selfHarmRisk: true,
    substanceUse: false,
    symptoms: ['depression', 'anxiety', 'sleep_disturbance'],
    triggerEvent: 'Relationship problems'
  },

  highRisk: {
    suicidalIdeation: true,
    homicidalIdeation: false,
    hasPlan: false,
    hasMeans: false,
    immediateRisk: false,
    selfHarmRisk: true,
    substanceUse: false,
    symptoms: ['hopelessness', 'isolation', 'severe_depression'],
    triggerEvent: 'Job loss and financial stress'
  },

  criticalRisk: {
    suicidalIdeation: true,
    homicidalIdeation: false,
    hasPlan: true,
    hasMeans: false,
    immediateRisk: false,
    selfHarmRisk: true,
    substanceUse: true,
    symptoms: ['active_ideation', 'plan_formulation', 'substance_impairment'],
    triggerEvent: 'Multiple life stressors'
  },

  emergencyRisk: {
    suicidalIdeation: true,
    homicidalIdeation: false,
    hasPlan: true,
    hasMeans: true,
    immediateRisk: true,
    selfHarmRisk: true,
    substanceUse: true,
    symptoms: ['active_ideation', 'plan_formulation', 'means_available', 'intent'],
    triggerEvent: 'Acute crisis situation'
  }
};
```

### Interactive Assessment Form

```javascript
// React component for crisis assessment
import { useState, useEffect } from 'react';

const CrisisAssessmentForm = ({ onComplete, onEmergency }) => {
  const [assessment, setAssessment] = useState({
    suicidalIdeation: null,
    homicidalIdeation: null,
    hasPlan: null,
    hasMeans: null,
    immediateRisk: null,
    selfHarmRisk: null,
    substanceUse: null,
    symptoms: [],
    triggerEvent: ''
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [emergencyDetected, setEmergencyDetected] = useState(false);

  // Monitor for emergency conditions in real-time
  useEffect(() => {
    const isEmergency =
      assessment.immediateRisk ||
      (assessment.suicidalIdeation && assessment.hasPlan && assessment.hasMeans);

    if (isEmergency && !emergencyDetected) {
      setEmergencyDetected(true);
      onEmergency?.(assessment);
    }
  }, [assessment, emergencyDetected, onEmergency]);

  const questions = [
    {
      key: 'suicidalIdeation',
      question: 'Are you having thoughts of suicide or self-harm?',
      type: 'boolean',
      critical: true
    },
    {
      key: 'immediateRisk',
      question: 'Are you in immediate danger of harming yourself or others?',
      type: 'boolean',
      critical: true,
      emergency: true
    },
    {
      key: 'hasPlan',
      question: 'Do you have a plan for how you would harm yourself?',
      type: 'boolean',
      conditional: data => data.suicidalIdeation,
      critical: true
    },
    {
      key: 'hasMeans',
      question: 'Do you have access to the means to carry out this plan?',
      type: 'boolean',
      conditional: data => data.hasPlan,
      critical: true
    },
    {
      key: 'homicidalIdeation',
      question: 'Are you having thoughts of harming others?',
      type: 'boolean',
      critical: true
    },
    {
      key: 'selfHarmRisk',
      question: 'Are you at risk of self-harm behaviors (cutting, burning, etc.)?',
      type: 'boolean'
    },
    {
      key: 'substanceUse',
      question: 'Have you used alcohol or drugs that might affect your judgment?',
      type: 'boolean'
    },
    {
      key: 'symptoms',
      question: 'What symptoms are you experiencing? (Select all that apply)',
      type: 'multiselect',
      options: [
        'hopelessness',
        'despair',
        'severe_depression',
        'anxiety',
        'panic',
        'anger',
        'irritability',
        'isolation',
        'loneliness',
        'sleep_disturbance',
        'appetite_changes',
        'concentration_problems',
        'racing_thoughts',
        'hearing_voices',
        'paranoia'
      ]
    },
    {
      key: 'triggerEvent',
      question: 'What event or situation triggered these feelings?',
      type: 'textarea'
    }
  ];

  const handleAnswer = (key, value) => {
    setAssessment(prev => ({
      ...prev,
      [key]: value
    }));

    // Auto-advance for critical questions
    const question = questions[currentStep];
    if (question.emergency && value === true) {
      // Immediately trigger emergency response
      setEmergencyDetected(true);
      onEmergency?.(assessment);
      return;
    }

    // Move to next applicable question
    nextQuestion();
  };

  const nextQuestion = () => {
    const nextIndex = currentStep + 1;
    if (nextIndex < questions.length) {
      const nextQuestion = questions[nextIndex];

      // Skip conditional questions if condition not met
      if (nextQuestion.conditional && !nextQuestion.conditional(assessment)) {
        setCurrentStep(nextIndex);
        nextQuestion();
        return;
      }

      setCurrentStep(nextIndex);
    } else {
      // Assessment complete
      submitAssessment();
    }
  };

  const submitAssessment = async () => {
    try {
      const result = await performCrisisAssessment(assessment);
      onComplete?.(result);
    } catch (error) {
      console.error('Assessment submission failed:', error);
      onComplete?.({
        success: false,
        error: error.message,
        resources: await getEmergencyResources()
      });
    }
  };

  if (emergencyDetected) {
    return <EmergencyResponse assessment={assessment} />;
  }

  const question = questions[currentStep];
  if (!question) return null;

  return (
    <div className='crisis-assessment-form'>
      <div className='progress-bar'>
        <div className='progress' style={{ width: `${(currentStep / questions.length) * 100}%` }} />
      </div>

      <div className='question-container'>
        <h2>{question.question}</h2>

        {question.type === 'boolean' && (
          <div className='button-group'>
            <button
              onClick={() => handleAnswer(question.key, true)}
              className={question.critical ? 'critical-yes' : 'yes'}
            >
              Yes
            </button>
            <button onClick={() => handleAnswer(question.key, false)} className='no'>
              No
            </button>
          </div>
        )}

        {question.type === 'multiselect' && (
          <div className='checkbox-group'>
            {question.options.map(option => (
              <label key={option}>
                <input
                  type='checkbox'
                  checked={assessment.symptoms.includes(option)}
                  onChange={e => {
                    const symptoms = e.target.checked
                      ? [...assessment.symptoms, option]
                      : assessment.symptoms.filter(s => s !== option);
                    handleAnswer('symptoms', symptoms);
                  }}
                />
                {option.replace(/_/g, ' ').toUpperCase()}
              </label>
            ))}
            <button onClick={nextQuestion}>Continue</button>
          </div>
        )}

        {question.type === 'textarea' && (
          <div className='textarea-group'>
            <textarea
              value={assessment.triggerEvent}
              onChange={e =>
                setAssessment(prev => ({
                  ...prev,
                  triggerEvent: e.target.value
                }))
              }
              placeholder='Describe what happened...'
              rows={4}
            />
            <button
              onClick={() => {
                handleAnswer('triggerEvent', assessment.triggerEvent);
              }}
            >
              Complete Assessment
            </button>
          </div>
        )}
      </div>

      <div className='crisis-resources-footer'>
        <p>
          If this is an emergency, call <strong>911</strong> or <strong>988</strong> immediately
        </p>
      </div>
    </div>
  );
};
```

## Emergency Response

### Emergency Response Component

```javascript
// Emergency response with immediate actions
const EmergencyResponse = ({ assessment }) => {
  const [actionsTaken, setActionsTaken] = useState({
    emergencyContacted: false,
    crisisLineContacted: false,
    locationShared: false,
    supportPersonNotified: false
  });

  useEffect(() => {
    // Auto-trigger emergency protocols
    handleEmergencyProtocol();
  }, []);

  const handleEmergencyProtocol = async () => {
    // Log emergency assessment immediately
    try {
      await performCrisisAssessment({
        ...assessment,
        immediateRisk: true
      });
    } catch (error) {
      console.error('Emergency logging failed:', error);
    }

    // Attempt to get user's location for emergency services
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          // Store location for emergency services
          localStorage.setItem('emergency_location', JSON.stringify(location));
          setActionsTaken(prev => ({ ...prev, locationShared: true }));
        },
        error => {
          console.error('Location access denied:', error);
        }
      );
    }
  };

  const call911 = () => {
    if (typeof window !== 'undefined') {
      window.location.href = 'tel:911';
      setActionsTaken(prev => ({ ...prev, emergencyContacted: true }));
    }
  };

  const callCrisisLine = () => {
    if (typeof window !== 'undefined') {
      window.location.href = 'tel:988';
      setActionsTaken(prev => ({ ...prev, crisisLineContacted: true }));
    }
  };

  const textCrisisLine = () => {
    if (typeof window !== 'undefined') {
      window.location.href = 'sms:741741&body=HOME';
    }
  };

  return (
    <div className='emergency-response'>
      <div className='emergency-header'>
        <h1>🚨 IMMEDIATE HELP NEEDED</h1>
        <p>Based on your responses, you need immediate professional help.</p>
      </div>

      <div className='emergency-actions'>
        <div className='primary-actions'>
          <button
            onClick={call911}
            className='emergency-button call-911'
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              fontSize: '1.2rem',
              padding: '1rem 2rem'
            }}
          >
            📞 CALL 911 NOW
            <small>Emergency Services</small>
          </button>

          <button
            onClick={callCrisisLine}
            className='emergency-button crisis-line'
            style={{
              backgroundColor: '#7c3aed',
              color: 'white',
              fontSize: '1.1rem',
              padding: '1rem 2rem'
            }}
          >
            📞 CALL 988
            <small>Suicide Prevention Lifeline</small>
          </button>
        </div>

        <div className='secondary-actions'>
          <button onClick={textCrisisLine} className='text-button'>
            💬 TEXT 741741
            <small>Crisis Text Line</small>
          </button>

          <button
            onClick={() => window.open('https://findtreatment.gov', '_blank')}
            className='resource-button'
          >
            🏥 FIND NEARBY HELP
            <small>Treatment Locator</small>
          </button>
        </div>
      </div>

      <div className='safety-checklist'>
        <h3>Immediate Safety Steps:</h3>
        <ul>
          <li>✓ Stay on this page - help is coming</li>
          <li>✓ Do not leave yourself alone</li>
          <li>✓ Remove any means of self-harm</li>
          <li>✓ Call emergency services or crisis line</li>
          <li>✓ Contact a trusted person</li>
        </ul>
      </div>

      <div className='resources-always-available'>
        <h3>24/7 Resources Always Available:</h3>
        <div className='resource-list'>
          <div className='resource'>
            <strong>988 - Suicide & Crisis Lifeline</strong>
            <p>24/7 crisis support and suicide prevention</p>
          </div>
          <div className='resource'>
            <strong>741741 - Crisis Text Line</strong>
            <p>Text HOME for crisis counseling</p>
          </div>
          <div className='resource'>
            <strong>911 - Emergency Services</strong>
            <p>Immediate emergency response</p>
          </div>
          <div className='resource'>
            <strong>1-800-273-8255 - Veterans Crisis Line</strong>
            <p>Press 1 for veteran-specific support</p>
          </div>
        </div>
      </div>

      <div className='emergency-footer'>
        <p>
          <strong>Remember: This crisis is temporary. Help is available. You matter.</strong>
        </p>
      </div>
    </div>
  );
};
```

### Crisis Response Automation

```javascript
// Automated crisis response system
const CrisisResponseSystem = {
  async handleCrisisLevel(assessment, severity) {
    const actions = [];

    switch (severity) {
      case 'EMERGENCY':
        actions.push(
          this.triggerEmergencyAlert(assessment),
          this.notifyEmergencyContacts(assessment),
          this.logCriticalIncident(assessment),
          this.scheduleImmediateFollowUp(assessment)
        );
        break;

      case 'CRITICAL':
        actions.push(
          this.notifyCrisisTeam(assessment),
          this.scheduleCrisisIntervention(assessment),
          this.provideImmediateResources(assessment),
          this.scheduleFollowUp(assessment, 2) // 2 hours
        );
        break;

      case 'HIGH':
        actions.push(
          this.notifyTherapist(assessment),
          this.scheduleUrgentAppointment(assessment),
          this.provideResources(assessment),
          this.scheduleFollowUp(assessment, 24) // 24 hours
        );
        break;

      case 'MODERATE':
        actions.push(
          this.flagForReview(assessment),
          this.provideSelfHelpResources(assessment),
          this.scheduleFollowUp(assessment, 72) // 3 days
        );
        break;
    }

    try {
      await Promise.all(actions);
      return { success: true };
    } catch (error) {
      console.error('Crisis response failed:', error);
      // Fallback to manual intervention
      await this.escalateToManual(assessment, error);
      return { success: false, escalated: true };
    }
  },

  async triggerEmergencyAlert(assessment) {
    // Send immediate alerts to crisis response team
    const alertData = {
      userId: assessment.userId,
      severity: 'EMERGENCY',
      location: assessment.location,
      timestamp: new Date().toISOString(),
      assessment: assessment
    };

    // Multiple alert channels
    await Promise.all([
      this.sendSMSAlert(alertData),
      this.sendEmailAlert(alertData),
      this.logToEmergencySystem(alertData),
      this.notifyOnCallCounselor(alertData)
    ]);
  },

  async notifyEmergencyContacts(assessment) {
    try {
      const user = await getUserProfile(assessment.userId);
      const emergencyContacts = user.emergencyContact;

      if (emergencyContacts) {
        const message =
          `${user.firstName} ${user.lastName} has been assessed as being in crisis. ` +
          `They have been provided with immediate resources and professional help has been notified. ` +
          `Crisis resources: 988 (Suicide Lifeline), 741741 (Crisis Text), 911 (Emergency).`;

        // Send notifications to emergency contacts
        await this.sendEmergencyContactNotification(emergencyContacts, message);
      }
    } catch (error) {
      console.error('Failed to notify emergency contacts:', error);
    }
  },

  async scheduleImmediateFollowUp(assessment) {
    // Schedule follow-up within 1 hour
    const followUpTime = new Date(Date.now() + 60 * 60 * 1000);

    await scheduleTask({
      type: 'crisis_followup',
      userId: assessment.userId,
      scheduledFor: followUpTime,
      priority: 'URGENT',
      data: {
        interventionId: assessment.interventionId,
        initialSeverity: 'EMERGENCY'
      }
    });
  }
};
```

## Risk Level Management

### Dynamic Risk Calculation

```javascript
// Advanced risk calculation algorithm
const CrisisRiskCalculator = {
  calculateRisk(assessment) {
    let riskScore = 0;
    const riskFactors = [];

    // Primary risk factors (high weight)
    if (assessment.suicidalIdeation) {
      riskScore += 25;
      riskFactors.push('suicidal_ideation');
    }

    if (assessment.hasPlan) {
      riskScore += 20;
      riskFactors.push('has_plan');
    }

    if (assessment.hasMeans) {
      riskScore += 15;
      riskFactors.push('has_means');
    }

    if (assessment.immediateRisk) {
      riskScore += 40;
      riskFactors.push('immediate_risk');
    }

    if (assessment.homicidalIdeation) {
      riskScore += 30;
      riskFactors.push('homicidal_ideation');
    }

    // Secondary risk factors (medium weight)
    if (assessment.selfHarmRisk) {
      riskScore += 10;
      riskFactors.push('self_harm_risk');
    }

    if (assessment.substanceUse) {
      riskScore += 8;
      riskFactors.push('substance_use');
    }

    // Symptom-based risk factors
    const highRiskSymptoms = [
      'hopelessness',
      'active_ideation',
      'plan_formulation',
      'means_available',
      'intent',
      'severe_depression'
    ];

    const mediumRiskSymptoms = ['despair', 'isolation', 'hearing_voices', 'paranoia'];

    assessment.symptoms.forEach(symptom => {
      if (highRiskSymptoms.includes(symptom)) {
        riskScore += 5;
        riskFactors.push(`symptom_${symptom}`);
      } else if (mediumRiskSymptoms.includes(symptom)) {
        riskScore += 3;
        riskFactors.push(`symptom_${symptom}`);
      }
    });

    // Historical risk factors (if available)
    if (assessment.previousAttempts) {
      riskScore += 15;
      riskFactors.push('previous_attempts');
    }

    if (assessment.chronicMentalIllness) {
      riskScore += 5;
      riskFactors.push('chronic_mental_illness');
    }

    // Protective factors (reduce risk)
    if (assessment.strongSocialSupport) {
      riskScore -= 10;
      riskFactors.push('strong_social_support');
    }

    if (assessment.religiousBeliefs) {
      riskScore -= 5;
      riskFactors.push('religious_beliefs');
    }

    if (assessment.reasonsForLiving) {
      riskScore -= 8;
      riskFactors.push('reasons_for_living');
    }

    // Determine severity level
    let severity;
    if (riskScore >= 80 || assessment.immediateRisk) {
      severity = 'EMERGENCY';
    } else if (riskScore >= 60) {
      severity = 'CRITICAL';
    } else if (riskScore >= 35) {
      severity = 'HIGH';
    } else if (riskScore >= 15) {
      severity = 'MODERATE';
    } else {
      severity = 'LOW';
    }

    return {
      severity,
      riskScore,
      riskFactors,
      interventionType: this.determineInterventionType(severity),
      recommendations: this.generateRecommendations(severity, riskFactors)
    };
  },

  determineInterventionType(severity) {
    const interventions = {
      EMERGENCY: 'EMERGENCY_DISPATCH',
      CRITICAL: 'CALL',
      HIGH: 'VIDEO',
      MODERATE: 'CHAT',
      LOW: 'REFERRAL'
    };

    return interventions[severity];
  },

  generateRecommendations(severity, riskFactors) {
    const recommendations = [];

    switch (severity) {
      case 'EMERGENCY':
        recommendations.push(
          'Call 911 immediately',
          'Go to the nearest emergency room',
          'Call 988 for immediate crisis support',
          'Do not leave the person alone',
          'Remove any lethal means'
        );
        break;

      case 'CRITICAL':
        recommendations.push(
          'Call 988 or the suicide prevention lifeline',
          'Contact your therapist or psychiatrist immediately',
          'Go to an emergency room if symptoms worsen',
          'Remove any means of self-harm',
          'Stay with trusted friends or family'
        );
        break;

      case 'HIGH':
        recommendations.push(
          'Schedule an urgent appointment with your therapist',
          'Call the crisis line if you need immediate support',
          'Create a safety plan',
          'Stay with supportive people',
          'Consider intensive outpatient treatment'
        );
        break;

      case 'MODERATE':
        recommendations.push(
          'Schedule an appointment with your therapist',
          'Practice coping strategies',
          'Reach out to your support network',
          'Use wellness tracking to monitor symptoms',
          'Consider support group participation'
        );
        break;

      case 'LOW':
        recommendations.push(
          'Continue regular therapy sessions',
          'Maintain wellness tracking',
          'Practice self-care strategies',
          'Build your support network',
          'Monitor for changes in symptoms'
        );
        break;
    }

    // Add specific recommendations based on risk factors
    if (riskFactors.includes('substance_use')) {
      recommendations.push('Avoid alcohol and drugs');
      recommendations.push('Consider substance abuse treatment');
    }

    if (riskFactors.includes('isolation')) {
      recommendations.push('Increase social contact');
      recommendations.push('Join a support group');
    }

    return recommendations;
  }
};
```

## Resource Integration

### Crisis Resources Management

```javascript
// Crisis resources provider
const CrisisResourcesProvider = {
  async getResources(userLocation = null, language = 'en') {
    const baseResources = {
      US: {
        suicide: '988',
        suicideAlt: '1-800-273-8255',
        crisis: '741741',
        emergency: '911'
      },
      resources: [
        {
          name: 'National Suicide Prevention Lifeline',
          number: '988',
          description: '24/7 crisis support',
          text: false,
          website: 'https://suicidepreventionlifeline.org',
          languages: ['en', 'es']
        },
        {
          name: 'Crisis Text Line',
          number: '741741',
          description: 'Text HOME to connect with a crisis counselor',
          text: true,
          website: 'https://crisistextline.org',
          languages: ['en', 'es']
        },
        {
          name: 'Veterans Crisis Line',
          number: '1-800-273-8255',
          description: 'Press 1 for veterans',
          text: false,
          website: 'https://veteranscrisisline.net',
          languages: ['en', 'es']
        },
        {
          name: 'LGBTQ National Hotline',
          number: '1-888-843-4564',
          description: 'Support for LGBTQ+ individuals',
          text: false,
          website: 'https://lgbtqnationalhotline.org',
          languages: ['en', 'es']
        },
        {
          name: 'National Domestic Violence Hotline',
          number: '1-800-799-7233',
          description: '24/7 support for domestic violence',
          text: true,
          website: 'https://thehotline.org',
          languages: ['en', 'es']
        }
      ]
    };

    // Add location-specific resources if available
    if (userLocation) {
      const localResources = await this.getLocalResources(userLocation);
      baseResources.localResources = localResources;
    }

    // Filter by language if specified
    if (language !== 'en') {
      baseResources.resources = baseResources.resources.filter(resource =>
        resource.languages.includes(language)
      );
    }

    return baseResources;
  },

  async getLocalResources(location) {
    try {
      // Mock implementation - in production, this would query a database
      // or external API for local crisis resources
      const response = await fetch(`/api/resources/local?lat=${location.lat}&lng=${location.lng}`);

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch local resources:', error);
    }

    return [
      {
        name: 'Local Emergency Services',
        number: '911',
        description: 'Local police, fire, and medical emergency services',
        type: 'emergency'
      }
    ];
  },

  createResourceWidget(resources) {
    return {
      template: `
        <div class="crisis-resources-widget">
          <h3>🆘 Immediate Help Available</h3>
          <div class="emergency-numbers">
            <div class="resource-item emergency">
              <button onclick="window.location.href='tel:911'">
                <strong>911</strong>
                <span>Emergency Services</span>
              </button>
            </div>
            <div class="resource-item crisis">
              <button onclick="window.location.href='tel:988'">
                <strong>988</strong>
                <span>Suicide Prevention</span>
              </button>
            </div>
            <div class="resource-item text">
              <button onclick="window.location.href='sms:741741&body=HOME'">
                <strong>741741</strong>
                <span>Crisis Text Line</span>
              </button>
            </div>
          </div>
          <div class="additional-resources">
            ${resources.resources
              .map(
                resource => `
              <div class="resource-item">
                <strong>${resource.name}</strong>
                <p>${resource.description}</p>
                <div class="resource-actions">
                  <button onclick="window.location.href='tel:${resource.number}'">
                    📞 Call
                  </button>
                  ${
                    resource.website
                      ? `
                    <button onclick="window.open('${resource.website}', '_blank')">
                      🌐 Website
                    </button>
                  `
                      : ''
                  }
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `,
      styles: `
        .crisis-resources-widget {
          background: #fef2f2;
          border: 2px solid #fca5a5;
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
        }
        .emergency-numbers {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .resource-item button {
          background: #dc2626;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 6px;
          cursor: pointer;
          text-align: center;
          width: 100%;
        }
        .resource-item.crisis button {
          background: #7c3aed;
        }
        .resource-item.text button {
          background: #059669;
        }
      `
    };
  }
};
```

## Follow-up Tracking

### Intervention Follow-up System

```javascript
// Crisis intervention follow-up management
const CrisisFollowUpSystem = {
  async scheduleFollowUp(interventionId, severity, initialAssessment) {
    const followUpSchedule = {
      EMERGENCY: [
        { hours: 1, type: 'IMMEDIATE_CHECK' },
        { hours: 6, type: 'SAFETY_CHECK' },
        { hours: 24, type: 'STATUS_ASSESSMENT' },
        { days: 3, type: 'PROFESSIONAL_REVIEW' },
        { days: 7, type: 'OUTCOME_EVALUATION' }
      ],
      CRITICAL: [
        { hours: 2, type: 'SAFETY_CHECK' },
        { hours: 12, type: 'STATUS_ASSESSMENT' },
        { days: 1, type: 'PROFESSIONAL_CONTACT' },
        { days: 3, type: 'FOLLOW_UP_ASSESSMENT' },
        { days: 14, type: 'OUTCOME_EVALUATION' }
      ],
      HIGH: [
        { hours: 24, type: 'STATUS_CHECK' },
        { days: 3, type: 'FOLLOW_UP_ASSESSMENT' },
        { days: 7, type: 'PROFESSIONAL_REVIEW' },
        { days: 30, type: 'OUTCOME_EVALUATION' }
      ],
      MODERATE: [
        { days: 3, type: 'STATUS_CHECK' },
        { days: 7, type: 'FOLLOW_UP_ASSESSMENT' },
        { days: 30, type: 'OUTCOME_EVALUATION' }
      ],
      LOW: [
        { days: 7, type: 'STATUS_CHECK' },
        { days: 30, type: 'OUTCOME_EVALUATION' }
      ]
    };

    const schedule = followUpSchedule[severity] || followUpSchedule['LOW'];

    for (const followUp of schedule) {
      const scheduledTime = this.calculateFollowUpTime(followUp);

      await this.createFollowUpTask({
        interventionId,
        type: followUp.type,
        scheduledFor: scheduledTime,
        severity,
        userId: initialAssessment.userId,
        metadata: {
          initialSeverity: severity,
          triggerEvent: initialAssessment.triggerEvent,
          riskFactors: initialAssessment.riskFactors
        }
      });
    }
  },

  calculateFollowUpTime(followUp) {
    const now = new Date();

    if (followUp.hours) {
      return new Date(now.getTime() + followUp.hours * 60 * 60 * 1000);
    } else if (followUp.days) {
      return new Date(now.getTime() + followUp.days * 24 * 60 * 60 * 1000);
    }

    return now;
  },

  async executeFollowUp(followUpTask) {
    switch (followUpTask.type) {
      case 'IMMEDIATE_CHECK':
        return await this.performImmediateCheck(followUpTask);

      case 'SAFETY_CHECK':
        return await this.performSafetyCheck(followUpTask);

      case 'STATUS_ASSESSMENT':
        return await this.performStatusAssessment(followUpTask);

      case 'PROFESSIONAL_REVIEW':
        return await this.scheduleProfessionalReview(followUpTask);

      case 'OUTCOME_EVALUATION':
        return await this.performOutcomeEvaluation(followUpTask);

      default:
        console.warn('Unknown follow-up type:', followUpTask.type);
        return { success: false, error: 'Unknown follow-up type' };
    }
  },

  async performImmediateCheck(task) {
    // Send immediate check-in notification
    const notification = {
      userId: task.userId,
      title: 'Crisis Support Check-In',
      message: "How are you feeling right now? We want to make sure you're safe.",
      type: 'CRISIS',
      priority: 'URGENT',
      actionUrl: '/crisis/checkin',
      metadata: {
        followUpType: 'IMMEDIATE_CHECK',
        interventionId: task.interventionId
      }
    };

    await this.sendNotification(notification);

    // If no response within 30 minutes, escalate
    setTimeout(
      async () => {
        const response = await this.checkForResponse(task.userId, task.interventionId);
        if (!response) {
          await this.escalateNoResponse(task);
        }
      },
      30 * 60 * 1000
    ); // 30 minutes

    return { success: true, type: 'IMMEDIATE_CHECK' };
  },

  async performSafetyCheck(task) {
    // Create a safety assessment form
    const safetyAssessment = {
      questions: [
        {
          id: 'current_safety',
          question: 'Are you currently safe?',
          type: 'boolean',
          required: true
        },
        {
          id: 'suicide_thoughts',
          question: 'Are you still having thoughts of suicide?',
          type: 'scale',
          scale: { min: 1, max: 10, labels: { 1: 'None', 10: 'Constant' } },
          required: true
        },
        {
          id: 'support_accessed',
          question: 'Have you contacted any of the resources we provided?',
          type: 'multiselect',
          options: ['Crisis Line', 'Emergency Services', 'Family/Friends', 'Therapist', 'None']
        },
        {
          id: 'next_steps',
          question: 'What support do you need right now?',
          type: 'textarea',
          required: false
        }
      ]
    };

    // Send assessment notification
    await this.sendAssessmentNotification(task.userId, safetyAssessment, 'SAFETY_CHECK');

    return { success: true, type: 'SAFETY_CHECK' };
  }
};
```

This comprehensive crisis management documentation provides detailed examples for implementing crisis assessment, emergency response protocols, risk level management, resource integration, and follow-up tracking systems. The examples demonstrate real-world implementation patterns for mental health crisis intervention using the Astral Core v7 API.
