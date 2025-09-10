import { create } from 'zustand';
import type { CrisisAssessmentInput, CrisisIntervention } from '@/lib/types/crisis';

interface CrisisState {
  isInCrisis: boolean;
  currentIntervention: CrisisIntervention | null;
  assessmentInProgress: boolean;
  resources: any;
  
  // Actions
  setInCrisis: (inCrisis: boolean) => void;
  setCurrentIntervention: (intervention: CrisisIntervention | null) => void;
  setAssessmentInProgress: (inProgress: boolean) => void;
  
  // Async actions
  performAssessment: (assessment: CrisisAssessmentInput) => Promise<any>;
  fetchResources: () => Promise<void>;
  endIntervention: () => void;
}

export const useCrisisStore = create<CrisisState>((set, get) => ({
  isInCrisis: false,
  currentIntervention: null,
  assessmentInProgress: false,
  resources: null,
  
  setInCrisis: (inCrisis) => set({ isInCrisis: inCrisis }),
  
  setCurrentIntervention: (intervention) => set({ 
    currentIntervention: intervention,
    isInCrisis: !!intervention 
  }),
  
  setAssessmentInProgress: (inProgress) => set({ 
    assessmentInProgress: inProgress 
  }),
  
  performAssessment: async (assessment) => {
    set({ assessmentInProgress: true });
    
    try {
      const response = await fetch('/api/crisis/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessment),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        const intervention: CrisisIntervention = {
          id: result.interventionId,
          userId: '', // Will be set by the API
          severity: result.severity,
          interventionType: 'CHAT', // Default, will be set by API
          status: 'ACTIVE',
          startTime: new Date(),
          followUpRequired: result.severity !== 'LOW',
          followUpDate: result.followUpDate ? new Date(result.followUpDate) : undefined,
        };
        
        set({ 
          currentIntervention: intervention,
          isInCrisis: result.severity !== 'LOW',
          assessmentInProgress: false,
          resources: result.resources,
        });
        
        return result;
      } else {
        throw new Error(result.error || 'Assessment failed');
      }
    } catch (error) {
      set({ assessmentInProgress: false });
      throw error;
    }
  },
  
  fetchResources: async () => {
    try {
      const response = await fetch('/api/crisis/assess');
      if (response.ok) {
        const data = await response.json();
        set({ resources: data.resources });
      }
    } catch (error) {
      console.error('Failed to fetch crisis resources:', error);
    }
  },
  
  endIntervention: () => set({ 
    currentIntervention: null,
    isInCrisis: false,
    assessmentInProgress: false,
  }),
}));