import { z } from 'zod';
import { phiService } from '@/lib/security/phi-service';
import { audit } from '@/lib/security/audit';
import type { CrisisSeverity } from '@prisma/client';

// Enhanced AI Therapy Assistant - Better than v5
export class AITherapyAssistant {
  private readonly ethicalBoundaries = {
    maxSessionDuration: 60 * 60 * 1000, // 1 hour
    minHumanCheckInterval: 15 * 60 * 1000, // 15 minutes
    crisisEscalationThreshold: 0.8,
    confidenceThreshold: 0.7
  };

  private readonly interventionStrategies = {
    CBT: ['thought-challenging', 'behavioral-activation', 'cognitive-restructuring'],
    DBT: ['distress-tolerance', 'emotion-regulation', 'interpersonal-effectiveness'],
    ACT: ['mindfulness', 'acceptance', 'values-clarification'],
    EMDR: ['bilateral-stimulation', 'resource-installation', 'future-templating']
  };

  async analyzeSession(
    userId: string,
    sessionData: {
      content: string;
      mood: number;
      anxiety: number;
      context?: string;
    }
  ): Promise<{
    insights: string[];
    recommendations: string[];
    riskLevel: CrisisSeverity;
    suggestedInterventions: string[];
    requiresHumanReview: boolean;
  }> {
    // Enhanced pattern recognition
    const patterns = this.detectPatterns(sessionData.content);
    const riskLevel = this.assessRisk(sessionData, patterns);
    const insights = this.generateInsights(patterns, sessionData);
    const recommendations = this.generateRecommendations(patterns, riskLevel);
    const interventions = this.selectInterventions(patterns, sessionData.mood);

    // Audit AI interaction
    await audit.logSuccess(
      'AI_ANALYSIS',
      'TherapySession',
      userId,
      {
        patternsDetected: patterns.length,
        riskLevel,
        interventionsSelected: interventions.length
      },
      userId
    );

    return {
      insights,
      recommendations,
      riskLevel,
      suggestedInterventions: interventions,
      requiresHumanReview: riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
    };
  }

  private detectPatterns(content: string): string[] {
    const patterns: string[] = [];

    // Enhanced pattern detection with NLP-like analysis
    const cognitiveDistortions = [
      { pattern: /always|never|every|none/gi, type: 'all-or-nothing' },
      { pattern: /should|must|have to/gi, type: 'should-statements' },
      { pattern: /my fault|blame myself/gi, type: 'self-blame' },
      { pattern: /catastrophe|disaster|terrible/gi, type: 'catastrophizing' },
      { pattern: /mind reading|they think/gi, type: 'mind-reading' }
    ];

    cognitiveDistortions.forEach(({ pattern, type }) => {
      if (pattern.test(content)) {
        patterns.push(type);
      }
    });

    // Emotional patterns
    const emotions = {
      depression: /sad|depressed|hopeless|worthless|empty/gi,
      anxiety: /anxious|worried|panic|nervous|scared/gi,
      anger: /angry|furious|rage|hate|frustrated/gi,
      joy: /happy|joyful|excited|grateful|content/gi
    };

    Object.entries(emotions).forEach(([emotion, pattern]) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 2) {
        patterns.push(`high-${emotion}`);
      }
    });

    return patterns;
  }

  private assessRisk(
    sessionData: { mood: number; anxiety: number; content: string },
    patterns: string[]
  ): CrisisSeverity {
    let riskScore = 0;

    // Crisis keywords detection
    const crisisKeywords = {
      emergency: /suicide|kill myself|end it all|not worth living/gi,
      critical: /self-harm|hurt myself|plan to|method|means/gi,
      high: /hopeless|can't go on|give up|no point/gi
    };

    if (crisisKeywords.emergency.test(sessionData.content)) {
      return 'EMERGENCY';
    }
    if (crisisKeywords.critical.test(sessionData.content)) {
      return 'CRITICAL';
    }
    if (crisisKeywords.high.test(sessionData.content)) {
      riskScore += 0.5;
    }

    // Mood and anxiety factors
    if (sessionData.mood <= 2) riskScore += 0.3;
    if (sessionData.anxiety >= 8) riskScore += 0.3;

    // Pattern-based risk
    if (patterns.includes('high-depression')) riskScore += 0.2;
    if (patterns.includes('catastrophizing')) riskScore += 0.1;

    if (riskScore >= 0.8) return 'HIGH';
    if (riskScore >= 0.5) return 'MODERATE';
    return 'LOW';
  }

  private generateInsights(patterns: string[], sessionData: any): string[] {
    const insights: string[] = [];

    if (patterns.includes('all-or-nothing')) {
      insights.push(
        'You may be experiencing all-or-nothing thinking, which can amplify negative feelings.'
      );
    }

    if (patterns.includes('should-statements')) {
      insights.push('Notice the "should" statements - these often create unnecessary pressure.');
    }

    if (patterns.includes('high-anxiety')) {
      insights.push(
        'Your anxiety levels appear elevated. This is affecting your thought patterns.'
      );
    }

    if (sessionData.mood <= 3 && sessionData.anxiety >= 7) {
      insights.push(
        'The combination of low mood and high anxiety suggests you may benefit from grounding techniques.'
      );
    }

    return insights;
  }

  private generateRecommendations(patterns: string[], riskLevel: CrisisSeverity): string[] {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      recommendations.push(
        'Please consider reaching out to your therapist or crisis support immediately.'
      );
      recommendations.push('Use your safety plan if you have one.');
    }

    // Pattern-based recommendations
    if (patterns.includes('all-or-nothing')) {
      recommendations.push('Try to identify the gray areas in your situation.');
    }

    if (patterns.includes('high-anxiety')) {
      recommendations.push('Practice deep breathing: 4-7-8 technique.');
      recommendations.push('Try progressive muscle relaxation.');
    }

    if (patterns.includes('high-depression')) {
      recommendations.push('Consider behavioral activation: schedule one pleasant activity today.');
      recommendations.push('Reach out to a supportive friend or family member.');
    }

    return recommendations;
  }

  private selectInterventions(patterns: string[], mood: number): string[] {
    const interventions: string[] = [];

    // Mood-based primary intervention
    if (mood <= 3) {
      interventions.push(...this.interventionStrategies.CBT.slice(0, 2));
    } else if (mood <= 5) {
      interventions.push(...this.interventionStrategies.ACT.slice(0, 2));
    }

    // Pattern-based additional interventions
    if (patterns.includes('high-anxiety')) {
      interventions.push(...this.interventionStrategies.DBT.slice(0, 1));
    }

    // Limit to avoid overwhelming
    return interventions.slice(0, 3);
  }

  async generateTherapeuticResponse(
    userId: string,
    message: string,
    context?: any
  ): Promise<{
    response: string;
    suggestedFollowUp: string[];
    resources: string[];
  }> {
    // This would integrate with an LLM in production
    // For now, returning template-based responses

    const sentiment = this.analyzeSentiment(message);
    let response = '';
    const followUp: string[] = [];
    const resources: string[] = [];

    if (sentiment === 'negative') {
      response =
        "I hear that you're going through a difficult time. Your feelings are valid, and it's okay to feel this way. Can you tell me more about what's contributing to these feelings?";
      followUp.push('What has helped you cope in similar situations before?');
      followUp.push('What small step could you take today to care for yourself?');
      resources.push('Coping strategies guide', 'Mood tracking worksheet');
    } else if (sentiment === 'positive') {
      response =
        "It's wonderful to hear positive momentum in your journey. What specific changes or practices have been most helpful for you?";
      followUp.push('How can you maintain this positive trajectory?');
      followUp.push('What did you learn from this experience?');
      resources.push('Gratitude journal template', 'Progress celebration worksheet');
    } else {
      response =
        "Thank you for sharing. I'd like to understand more about your experience. What aspects would you like to explore further?";
      followUp.push('What brings you here today?');
      followUp.push('What would a positive outcome look like for you?');
      resources.push('Self-assessment questionnaire', 'Goal-setting worksheet');
    }

    return { response, suggestedFollowUp: followUp, resources };
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = /happy|good|great|better|improved|grateful|excited|hopeful/gi;
    const negativeWords = /sad|bad|worse|angry|frustrated|hopeless|anxious|worried/gi;

    const positiveCount = (text.match(positiveWords) || []).length;
    const negativeCount = (text.match(negativeWords) || []).length;

    if (positiveCount > negativeCount * 1.5) return 'positive';
    if (negativeCount > positiveCount * 1.5) return 'negative';
    return 'neutral';
  }
}

export const aiTherapyAssistant = new AITherapyAssistant();
