import { prisma } from '@/lib/db';
import { phiService } from '@/lib/security/phi-service';

interface CreateTreatmentPlanDto {
  patientId: string;
  therapistId: string;
  title: string;
  diagnosis: string[];
  goals: Record<string, unknown>[];
  objectives: Record<string, unknown>[];
  interventions: Record<string, unknown>[];
  frequency: string;
  duration: string;
  startDate: Date;
  reviewDate: Date;
}
import { audit } from '@/lib/security/audit';
import { notificationService } from './notification-service';
import { z } from 'zod';

// Schemas for validation
export const goalSchema = z.object({
  id: z.string(),
  description: z.string(),
  targetDate: z.string(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'MODIFIED', 'DISCONTINUED']),
  progress: z.number().min(0).max(100),
  notes: z.string().optional()
});

export const objectiveSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  description: z.string(),
  measurable: z.boolean(),
  criteria: z.string(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().optional(),
  timeline: z.string(),
  status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'REVISED'])
});

export const interventionSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  frequency: z.string(),
  duration: z.string(),
  techniques: z.array(z.string()),
  materials: z.array(z.string()).optional(),
  homework: z.string().optional(),
  effectiveness: z.number().min(0).max(10).optional(),
  notes: z.string().optional()
});

export const treatmentPlanSchema = z.object({
  title: z.string(),
  diagnosis: z.array(z.string()),
  goals: z.array(goalSchema),
  objectives: z.array(objectiveSchema),
  interventions: z.array(interventionSchema),
  frequency: z.string(),
  duration: z.string(),
  startDate: z.string(),
  reviewDate: z.string(),
  endDate: z.string().optional()
});

interface CreateTreatmentPlanDto {
  clientId: string;
  therapistId: string;
  title: string;
  diagnosis: string[];
  goals: z.infer<typeof goalSchema>[];
  objectives: z.infer<typeof objectiveSchema>[];
  interventions: z.infer<typeof interventionSchema>[];
  frequency: string;
  duration: string;
  startDate: Date;
  reviewDate: Date;
}

interface UpdateProgressDto {
  goalId?: string;
  objectiveId?: string;
  progress: number;
  notes?: string;
  evidenceData?: Record<string, unknown>;
}

// Note: ProgressTrackingData interface removed as it was unused

interface TreatmentOutcomes {
  goalsAchieved: number;
  goalsTotal: number;
  objectivesAchieved: number;
  objectivesTotal: number;
  overallSuccess: 'excellent' | 'good' | 'fair' | 'poor';
  symptomImprovement: number; // percentage
  functionalImprovement: number; // percentage
  clientSatisfaction: number; // 1-10 scale
  recommendedFollowUp?: string;
  recommendations?: string[];
}

// Note: ProgressEntry interface removed as it was unused

export class TreatmentPlanService {
  // Create a new treatment plan
  async createTreatmentPlan(data: CreateTreatmentPlanDto) {
    try {
      // Validate client-therapist relationship
      const clientProfile = await prisma.clientProfile.findFirst({
        where: {
          id: data.clientId,
          therapistId: data.therapistId
        }
      });

      if (!clientProfile) {
        throw new Error('Invalid client-therapist relationship');
      }

      // Encrypt sensitive data
      const encryptedDiagnosis = await Promise.all(
        data.diagnosis.map(d => phiService.encryptField(d))
      );

      // Create treatment plan
      const treatmentPlan = await prisma.treatmentPlan.create({
        data: {
          ...data,
          diagnosis: encryptedDiagnosis,
          status: 'ACTIVE',
          progress: {
            lastUpdated: new Date(),
            overallProgress: 0,
            goalsProgress: {},
            objectivesProgress: {}
          }
        },
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          therapist: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      // Send notification to client
      await notificationService.createNotification({
        userId: treatmentPlan.client.user.id,
        title: 'New Treatment Plan Created',
        message: `Your therapist has created a treatment plan: "${data.title}"`,
        type: 'SESSION',
        priority: 'HIGH',
        actionUrl: `/treatment-plans/${treatmentPlan.id}`
      });

      // Audit log
      await audit.logSuccess(
        'TREATMENT_PLAN_CREATED',
        'TreatmentPlan',
        treatmentPlan.id,
        { clientId: data.clientId },
        data.therapistId
      );

      return treatmentPlan;
    } catch (error) {
      console.error('Error creating treatment plan:', error);
      throw error;
    }
  }

  // Get treatment plan by ID
  async getTreatmentPlan(planId: string, userId: string) {
    try {
      const plan = await prisma.treatmentPlan.findUnique({
        where: { id: planId },
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          therapist: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!plan) {
        throw new Error('Treatment plan not found');
      }

      // Check access permissions
      const isTherapist = plan.therapist.user.id === userId;
      const isClient = plan.client.user.id === userId;

      if (!isTherapist && !isClient) {
        throw new Error('Access denied');
      }

      // Decrypt diagnosis
      const decryptedDiagnosis = await Promise.all(
        plan.diagnosis.map(d => phiService.decryptField(d))
      );

      return {
        ...plan,
        diagnosis: decryptedDiagnosis
      };
    } catch (error) {
      console.error('Error fetching treatment plan:', error);
      throw error;
    }
  }

  // Update treatment plan
  async updateTreatmentPlan(
    planId: string,
    therapistId: string,
    updates: Partial<CreateTreatmentPlanDto>
  ) {
    try {
      // Verify ownership
      const existingPlan = await prisma.treatmentPlan.findFirst({
        where: {
          id: planId,
          therapistId
        }
      });

      if (!existingPlan) {
        throw new Error('Treatment plan not found or access denied');
      }

      // Encrypt sensitive updates
      if (updates.diagnosis) {
        updates.diagnosis = await Promise.all(
          updates.diagnosis.map(d => phiService.encryptField(d))
        );
      }

      // Update plan
      const updatedPlan = await prisma.treatmentPlan.update({
        where: { id: planId },
        data: updates,
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Notify client of changes
      await notificationService.createNotification({
        userId: updatedPlan.client.user.id,
        title: 'Treatment Plan Updated',
        message: 'Your treatment plan has been updated by your therapist',
        type: 'SESSION',
        actionUrl: `/treatment-plans/${planId}`
      });

      // Audit log
      await audit.logSuccess(
        'TREATMENT_PLAN_UPDATED',
        'TreatmentPlan',
        planId,
        { changes: Object.keys(updates) },
        therapistId
      );

      return updatedPlan;
    } catch (error) {
      console.error('Error updating treatment plan:', error);
      throw error;
    }
  }

  // Update progress on goals/objectives
  async updateProgress(planId: string, userId: string, progressData: UpdateProgressDto) {
    try {
      const plan = await prisma.treatmentPlan.findUnique({
        where: { id: planId },
        include: {
          therapist: true,
          client: {
            include: {
              user: true
            }
          }
        }
      });

      if (!plan) {
        throw new Error('Treatment plan not found');
      }

      // Verify user is therapist or client
      const isTherapist = plan.therapistId === userId;
      const isClient = plan.client.userId === userId;

      if (!isTherapist && !isClient) {
        throw new Error('Access denied');
      }

      // Update progress object
      const currentProgress = (plan.progress as Record<string, unknown>) || {};

      if (progressData.goalId) {
        currentProgress.goalsProgress = currentProgress.goalsProgress || {};
        currentProgress.goalsProgress[progressData.goalId] = {
          progress: progressData.progress,
          lastUpdated: new Date(),
          notes: progressData.notes,
          updatedBy: userId
        };

        // Update goal in goals array
        const goals = plan.goals as Record<string, unknown>[];
        const goalIndex = goals.findIndex(g => g.id === progressData.goalId);
        if (goalIndex !== -1) {
          goals[goalIndex].progress = progressData.progress;
          goals[goalIndex].status = progressData.progress === 100 ? 'ACHIEVED' : 'IN_PROGRESS';
        }
      }

      if (progressData.objectiveId) {
        currentProgress.objectivesProgress = currentProgress.objectivesProgress || {};
        currentProgress.objectivesProgress[progressData.objectiveId] = {
          progress: progressData.progress,
          lastUpdated: new Date(),
          notes: progressData.notes,
          evidenceData: progressData.evidenceData,
          updatedBy: userId
        };

        // Update objective in objectives array
        const objectives = plan.objectives as z.infer<typeof objectiveSchema>[];
        const objIndex = objectives.findIndex(o => o.id === progressData.objectiveId);
        if (objIndex !== -1) {
          const objective = objectives[objIndex];
          if (objective) {
            objective.currentValue = progressData.progress;
            objective.status =
              progressData.progress >= (objective.targetValue || 100)
                ? 'COMPLETED'
                : 'ACTIVE';
          }
        }
      }

      // Calculate overall progress
      const goals = plan.goals as z.infer<typeof goalSchema>[];
      const totalProgress = goals.reduce((sum, goal) => sum + (goal.progress || 0), 0);
      currentProgress.overallProgress = Math.round(totalProgress / goals.length);
      currentProgress.lastUpdated = new Date();

      // Update plan
      const updatedPlan = await prisma.treatmentPlan.update({
        where: { id: planId },
        data: {
          progress: currentProgress,
          goals: plan.goals,
          objectives: plan.objectives
        }
      });

      // Send notification if milestone reached
      if (currentProgress.overallProgress >= 25 && currentProgress.overallProgress % 25 === 0) {
        await notificationService.createNotification({
          userId: plan.client.user.id,
          title: 'Treatment Progress Milestone',
          message: `You've reached ${currentProgress.overallProgress}% of your treatment goals!`,
          type: 'ACHIEVEMENT',
          priority: 'HIGH'
        });
      }

      // Audit log
      await audit.logSuccess(
        'TREATMENT_PROGRESS_UPDATED',
        'TreatmentPlan',
        planId,
        {
          progressType: progressData.goalId ? 'goal' : 'objective',
          progress: progressData.progress
        },
        userId
      );

      return updatedPlan;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }

  // Get all treatment plans for a client
  async getClientTreatmentPlans(clientId: string, userId: string) {
    try {
      // Verify access
      const client = await prisma.clientProfile.findUnique({
        where: { id: clientId },
        include: {
          user: true,
          therapist: {
            include: {
              user: true
            }
          }
        }
      });

      if (!client) {
        throw new Error('Client not found');
      }

      const isClient = client.userId === userId;
      const isTherapist = client.therapist.userId === userId;

      if (!isClient && !isTherapist) {
        throw new Error('Access denied');
      }

      const plans = await prisma.treatmentPlan.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        include: {
          therapist: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      // Decrypt diagnosis for each plan
      const decryptedPlans = await Promise.all(
        plans.map(async plan => ({
          ...plan,
          diagnosis: await Promise.all(plan.diagnosis.map(d => phiService.decryptField(d)))
        }))
      );

      return decryptedPlans;
    } catch (error) {
      console.error('Error fetching client treatment plans:', error);
      throw error;
    }
  }

  // Review treatment plan
  async reviewTreatmentPlan(
    planId: string,
    therapistId: string,
    reviewNotes: string,
    recommendations: string[]
  ) {
    try {
      const plan = await prisma.treatmentPlan.findFirst({
        where: {
          id: planId,
          therapistId
        },
        include: {
          client: {
            include: {
              user: true
            }
          }
        }
      });

      if (!plan) {
        throw new Error('Treatment plan not found or access denied');
      }

      // Create review record
      const review = {
        date: new Date(),
        notes: reviewNotes,
        recommendations,
        progress: plan.progress,
        nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      };

      // Update plan with review
      const updatedPlan = await prisma.treatmentPlan.update({
        where: { id: planId },
        data: {
          reviewDate: review.nextReviewDate,
          progress: {
            ...(plan.progress as Record<string, unknown>),
            lastReview: review
          }
        }
      });

      // Create progress report
      await prisma.progressReport.create({
        data: {
          clientId: plan.clientId,
          reportDate: new Date(),
          reportType: 'TREATMENT_REVIEW',
          content: {
            planId,
            review
          },
          recommendations
        }
      });

      // Notify client
      await notificationService.createNotification({
        userId: plan.client.user.id,
        title: 'Treatment Plan Reviewed',
        message: 'Your treatment plan has been reviewed. Check the recommendations.',
        type: 'SESSION',
        actionUrl: `/treatment-plans/${planId}/review`
      });

      // Audit log
      await audit.logSuccess(
        'TREATMENT_PLAN_REVIEWED',
        'TreatmentPlan',
        planId,
        { nextReviewDate: review.nextReviewDate },
        therapistId
      );

      return updatedPlan;
    } catch (error) {
      console.error('Error reviewing treatment plan:', error);
      throw error;
    }
  }

  // Complete/Close treatment plan
  async completeTreatmentPlan(
    planId: string,
    therapistId: string,
    completionNotes: string,
    outcomes: TreatmentOutcomes
  ) {
    try {
      const plan = await prisma.treatmentPlan.findFirst({
        where: {
          id: planId,
          therapistId
        },
        include: {
          client: {
            include: {
              user: true
            }
          }
        }
      });

      if (!plan) {
        throw new Error('Treatment plan not found or access denied');
      }

      // Update plan status
      const updatedPlan = await prisma.treatmentPlan.update({
        where: { id: planId },
        data: {
          status: 'COMPLETED',
          endDate: new Date(),
          progress: {
            ...(plan.progress as Record<string, unknown>),
            completionNotes,
            outcomes,
            completedAt: new Date()
          }
        }
      });

      // Create final progress report
      await prisma.progressReport.create({
        data: {
          clientId: plan.clientId,
          reportDate: new Date(),
          reportType: 'DISCHARGE_SUMMARY',
          content: {
            planId,
            completionNotes,
            outcomes,
            finalProgress: plan.progress
          },
          recommendations: outcomes.recommendations || []
        }
      });

      // Notify client
      await notificationService.createNotification({
        userId: plan.client.user.id,
        title: 'Treatment Plan Completed',
        message: 'Your treatment plan has been successfully completed!',
        type: 'ACHIEVEMENT',
        priority: 'HIGH',
        actionUrl: `/treatment-plans/${planId}/summary`
      });

      // Audit log
      await audit.logSuccess(
        'TREATMENT_PLAN_COMPLETED',
        'TreatmentPlan',
        planId,
        { outcomes },
        therapistId
      );

      return updatedPlan;
    } catch (error) {
      console.error('Error completing treatment plan:', error);
      throw error;
    }
  }

  // Generate treatment plan templates
  async getTemplates(condition?: string) {
    const templates = {
      anxiety: {
        title: 'Anxiety Management Treatment Plan',
        diagnosis: ['Generalized Anxiety Disorder', 'F41.1'],
        goals: [
          {
            id: 'g1',
            description: 'Reduce anxiety symptoms to manageable levels',
            targetDate: '3 months',
            priority: 'HIGH',
            status: 'NOT_STARTED',
            progress: 0
          },
          {
            id: 'g2',
            description: 'Develop effective coping strategies',
            targetDate: '6 weeks',
            priority: 'HIGH',
            status: 'NOT_STARTED',
            progress: 0
          }
        ],
        objectives: [
          {
            id: 'o1',
            goalId: 'g1',
            description: 'Reduce GAD-7 score by 50%',
            measurable: true,
            criteria: 'GAD-7 Assessment Score',
            targetValue: 7,
            currentValue: 15,
            unit: 'points',
            timeline: '12 weeks',
            status: 'PENDING'
          }
        ],
        interventions: [
          {
            id: 'i1',
            type: 'CBT',
            description: 'Cognitive Behavioral Therapy for anxiety',
            frequency: 'Weekly',
            duration: '50 minutes',
            techniques: ['Cognitive restructuring', 'Exposure therapy', 'Relaxation training']
          }
        ],
        frequency: 'Weekly',
        duration: '12 weeks'
      },
      depression: {
        title: 'Depression Treatment Plan',
        diagnosis: ['Major Depressive Disorder', 'F32.1'],
        goals: [
          {
            id: 'g1',
            description: 'Alleviate depressive symptoms',
            targetDate: '3 months',
            priority: 'HIGH',
            status: 'NOT_STARTED',
            progress: 0
          },
          {
            id: 'g2',
            description: 'Restore daily functioning',
            targetDate: '2 months',
            priority: 'HIGH',
            status: 'NOT_STARTED',
            progress: 0
          }
        ],
        objectives: [
          {
            id: 'o1',
            goalId: 'g1',
            description: 'Reduce PHQ-9 score to mild range',
            measurable: true,
            criteria: 'PHQ-9 Assessment Score',
            targetValue: 9,
            currentValue: 18,
            unit: 'points',
            timeline: '12 weeks',
            status: 'PENDING'
          }
        ],
        interventions: [
          {
            id: 'i1',
            type: 'CBT',
            description: 'Cognitive Behavioral Therapy for depression',
            frequency: 'Weekly',
            duration: '50 minutes',
            techniques: ['Behavioral activation', 'Cognitive restructuring', 'Problem-solving']
          }
        ],
        frequency: 'Weekly',
        duration: '16 weeks'
      },
      trauma: {
        title: 'Trauma Recovery Treatment Plan',
        diagnosis: ['Post-Traumatic Stress Disorder', 'F43.10'],
        goals: [
          {
            id: 'g1',
            description: 'Process and integrate traumatic experiences',
            targetDate: '6 months',
            priority: 'HIGH',
            status: 'NOT_STARTED',
            progress: 0
          },
          {
            id: 'g2',
            description: 'Reduce PTSD symptoms',
            targetDate: '4 months',
            priority: 'HIGH',
            status: 'NOT_STARTED',
            progress: 0
          }
        ],
        objectives: [
          {
            id: 'o1',
            goalId: 'g2',
            description: 'Reduce PCL-5 score by 60%',
            measurable: true,
            criteria: 'PCL-5 Assessment Score',
            targetValue: 20,
            currentValue: 50,
            unit: 'points',
            timeline: '16 weeks',
            status: 'PENDING'
          }
        ],
        interventions: [
          {
            id: 'i1',
            type: 'EMDR',
            description: 'Eye Movement Desensitization and Reprocessing',
            frequency: 'Weekly',
            duration: '90 minutes',
            techniques: ['Bilateral stimulation', 'Resource installation', 'Cognitive interweave']
          },
          {
            id: 'i2',
            type: 'CPT',
            description: 'Cognitive Processing Therapy',
            frequency: 'Weekly',
            duration: '50 minutes',
            techniques: ['Written accounts', 'Cognitive worksheets', 'Challenging stuck points']
          }
        ],
        frequency: 'Weekly',
        duration: '20 weeks'
      }
    };

    if (condition && templates[condition as keyof typeof templates]) {
      return templates[condition as keyof typeof templates];
    }

    return Object.keys(templates).map(key => ({
      condition: key,
      ...templates[key as keyof typeof templates]
    }));
  }

  // Calculate treatment effectiveness
  async calculateEffectiveness(planId: string) {
    try {
      const plan = await prisma.treatmentPlan.findUnique({
        where: { id: planId }
      });

      if (!plan) {
        throw new Error('Treatment plan not found');
      }

      const goals = plan.goals as z.infer<typeof goalSchema>[];
      const objectives = plan.objectives as z.infer<typeof objectiveSchema>[];
      const interventions = plan.interventions as z.infer<typeof interventionSchema>[];

      // Calculate metrics
      const goalsAchieved = goals.filter(g => g.status === 'ACHIEVED').length;
      const objectivesCompleted = objectives.filter(o => o.status === 'COMPLETED').length;
      const averageProgress = goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length;

      // Calculate intervention effectiveness
      const interventionScores = interventions.map(i => i.effectiveness || 5);
      const averageInterventionScore =
        interventionScores.length > 0
          ? interventionScores.reduce((a, b) => a + b, 0) / interventionScores.length
          : 0;

      // Calculate duration efficiency
      const plannedDuration =
        new Date(plan.reviewDate).getTime() - new Date(plan.startDate).getTime();
      const actualDuration = plan.endDate
        ? new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()
        : Date.now() - new Date(plan.startDate).getTime();
      const durationEfficiency = Math.min(100, (plannedDuration / actualDuration) * 100);

      return {
        goalsAchievementRate: (goalsAchieved / goals.length) * 100,
        objectivesCompletionRate: (objectivesCompleted / objectives.length) * 100,
        averageProgress,
        interventionEffectiveness: averageInterventionScore * 10,
        durationEfficiency,
        overallEffectiveness:
          (goalsAchieved / goals.length) * 40 +
          (objectivesCompleted / objectives.length) * 30 +
          averageInterventionScore * 2 +
          durationEfficiency * 0.1
      };
    } catch (error) {
      console.error('Error calculating effectiveness:', error);
      throw error;
    }
  }
}

export const treatmentPlanService = new TreatmentPlanService();
