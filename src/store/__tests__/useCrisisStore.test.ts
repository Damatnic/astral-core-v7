/**
 * Crisis Store Unit Tests
 * Tests crisis management state and actions
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useCrisisStore } from '../useCrisisStore';
import { setupTestEnvironment, mockFetch } from '../../../tests/utils/test-helpers';
import { mockCrisisAssessment } from '../../../tests/utils/test-fixtures';

// Mock dependencies
global.fetch = jest.fn();

describe('useCrisisStore', () => {
  beforeEach(() => {
    setupTestEnvironment();
    jest.clearAllMocks();
    
    // Reset store state
    useCrisisStore.setState({
      isInCrisis: false,
      currentIntervention: null,
      assessmentInProgress: false,
      resources: null
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    test('should have correct initial state', () => {
      const { result } = renderHook(() => useCrisisStore());

      expect(result.current.isInCrisis).toBe(false);
      expect(result.current.currentIntervention).toBeNull();
      expect(result.current.assessmentInProgress).toBe(false);
      expect(result.current.resources).toBeNull();
    });
  });

  describe('Basic Actions', () => {
    test('should set crisis state', () => {
      const { result } = renderHook(() => useCrisisStore());

      act(() => {
        result.current.setInCrisis(true);
      });

      expect(result.current.isInCrisis).toBe(true);
    });

    test('should set current intervention', () => {
      const { result } = renderHook(() => useCrisisStore());
      
      const intervention = {
        id: 'crisis_123',
        userId: 'user_123',
        severity: 'MODERATE' as const,
        interventionType: 'CHAT' as const,
        status: 'ACTIVE' as const,
        startTime: new Date(),
        followUpRequired: true
      };

      act(() => {
        result.current.setCurrentIntervention(intervention);
      });

      expect(result.current.currentIntervention).toEqual(intervention);
      expect(result.current.isInCrisis).toBe(true);
    });

    test('should clear intervention and crisis state', () => {
      const { result } = renderHook(() => useCrisisStore());

      // First set intervention
      act(() => {
        result.current.setCurrentIntervention({
          id: 'crisis_123',
          userId: 'user_123',
          severity: 'MODERATE',
          interventionType: 'CHAT',
          status: 'ACTIVE',
          startTime: new Date(),
          followUpRequired: true
        });
      });

      // Then clear it
      act(() => {
        result.current.setCurrentIntervention(null);
      });

      expect(result.current.currentIntervention).toBeNull();
      expect(result.current.isInCrisis).toBe(false);
    });

    test('should set assessment progress', () => {
      const { result } = renderHook(() => useCrisisStore());

      act(() => {
        result.current.setAssessmentInProgress(true);
      });

      expect(result.current.assessmentInProgress).toBe(true);
    });

    test('should end intervention', () => {
      const { result } = renderHook(() => useCrisisStore());

      // Set up initial crisis state
      act(() => {
        result.current.setInCrisis(true);
        result.current.setAssessmentInProgress(true);
        result.current.setCurrentIntervention({
          id: 'crisis_123',
          userId: 'user_123',
          severity: 'HIGH',
          interventionType: 'VIDEO',
          status: 'ACTIVE',
          startTime: new Date(),
          followUpRequired: true
        });
      });

      // End intervention
      act(() => {
        result.current.endIntervention();
      });

      expect(result.current.currentIntervention).toBeNull();
      expect(result.current.isInCrisis).toBe(false);
      expect(result.current.assessmentInProgress).toBe(false);
    });
  });

  describe('performAssessment', () => {
    test('should perform successful crisis assessment', async () => {
      const { result } = renderHook(() => useCrisisStore());

      const assessmentInput = mockCrisisAssessment.input;
      const apiResponse = {
        success: true,
        interventionId: 'crisis_123',
        severity: 'MODERATE',
        followUpDate: '2024-01-02T10:00:00Z',
        resources: mockCrisisAssessment.result.resources
      };

      mockFetch(apiResponse, 200);

      await act(async () => {
        const result_assessment = await result.current.performAssessment(assessmentInput);
        expect(result_assessment).toEqual(apiResponse);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/crisis/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessmentInput)
      });

      expect(result.current.assessmentInProgress).toBe(false);
      expect(result.current.isInCrisis).toBe(true); // MODERATE severity
      expect(result.current.currentIntervention).toEqual({
        id: 'crisis_123',
        userId: '',
        severity: 'MODERATE',
        interventionType: 'CHAT',
        status: 'ACTIVE',
        startTime: expect.any(Date),
        followUpRequired: true,
        followUpDate: new Date('2024-01-02T10:00:00Z')
      });
      expect(result.current.resources).toEqual(apiResponse.resources);
    });

    test('should handle low severity assessment', async () => {
      const { result } = renderHook(() => useCrisisStore());

      const assessmentInput = mockCrisisAssessment.input;
      const apiResponse = {
        success: true,
        interventionId: 'crisis_123',
        severity: 'LOW',
        resources: []
      };

      mockFetch(apiResponse, 200);

      await act(async () => {
        await result.current.performAssessment(assessmentInput);
      });

      expect(result.current.isInCrisis).toBe(false); // LOW severity
      expect(result.current.currentIntervention?.followUpRequired).toBe(false);
    });

    test('should handle assessment API error', async () => {
      const { result } = renderHook(() => useCrisisStore());

      const assessmentInput = mockCrisisAssessment.input;
      const apiResponse = {
        success: false,
        error: 'Assessment failed'
      };

      mockFetch(apiResponse, 400);

      await act(async () => {
        await expect(result.current.performAssessment(assessmentInput))
          .rejects.toThrow('Assessment failed');
      });

      expect(result.current.assessmentInProgress).toBe(false);
      expect(result.current.isInCrisis).toBe(false);
      expect(result.current.currentIntervention).toBeNull();
    });

    test('should handle network error during assessment', async () => {
      const { result } = renderHook(() => useCrisisStore());

      const assessmentInput = mockCrisisAssessment.input;
      
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await expect(result.current.performAssessment(assessmentInput))
          .rejects.toThrow('Network error');
      });

      expect(result.current.assessmentInProgress).toBe(false);
    });

    test('should set assessment in progress during API call', async () => {
      const { result } = renderHook(() => useCrisisStore());

      const assessmentInput = mockCrisisAssessment.input;
      
      // Mock a delayed response
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => 
          resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              interventionId: 'crisis_123',
              severity: 'LOW'
            })
          }), 100)
        )
      );

      // Start assessment
      const assessmentPromise = act(async () => {
        return result.current.performAssessment(assessmentInput);
      });

      // Check that assessment is in progress
      expect(result.current.assessmentInProgress).toBe(true);

      // Wait for completion
      await assessmentPromise;

      expect(result.current.assessmentInProgress).toBe(false);
    });
  });

  describe('fetchResources', () => {
    test('should fetch crisis resources successfully', async () => {
      const { result } = renderHook(() => useCrisisStore());

      const resourcesResponse = {
        resources: mockCrisisAssessment.result.resources
      };

      mockFetch(resourcesResponse, 200);

      await act(async () => {
        await result.current.fetchResources();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/crisis/assess');
      expect(result.current.resources).toEqual(resourcesResponse.resources);
    });

    test('should handle error when fetching resources', async () => {
      const { result } = renderHook(() => useCrisisStore());

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await act(async () => {
        await result.current.fetchResources();
      });

      // Should not throw error, but should not update resources
      expect(result.current.resources).toBeNull();
      
      consoleSpy.mockRestore();
    });

    test('should handle non-OK response when fetching resources', async () => {
      const { result } = renderHook(() => useCrisisStore());

      mockFetch({}, 500);

      await act(async () => {
        await result.current.fetchResources();
      });

      expect(result.current.resources).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete crisis workflow', async () => {
      const { result } = renderHook(() => useCrisisStore());

      // Step 1: Start assessment
      act(() => {
        result.current.setAssessmentInProgress(true);
      });

      expect(result.current.assessmentInProgress).toBe(true);

      // Step 2: Perform assessment
      const assessmentInput = mockCrisisAssessment.input;
      const apiResponse = {
        success: true,
        interventionId: 'crisis_123',
        severity: 'HIGH',
        followUpDate: '2024-01-02T10:00:00Z',
        resources: mockCrisisAssessment.result.resources
      };

      mockFetch(apiResponse, 200);

      await act(async () => {
        await result.current.performAssessment(assessmentInput);
      });

      expect(result.current.isInCrisis).toBe(true);
      expect(result.current.currentIntervention?.severity).toBe('HIGH');
      expect(result.current.resources).toEqual(apiResponse.resources);

      // Step 3: End intervention
      act(() => {
        result.current.endIntervention();
      });

      expect(result.current.isInCrisis).toBe(false);
      expect(result.current.currentIntervention).toBeNull();
      expect(result.current.assessmentInProgress).toBe(false);
    });

    test('should handle multiple assessments', async () => {
      const { result } = renderHook(() => useCrisisStore());

      // First assessment - moderate
      const firstAssessment = mockCrisisAssessment.input;
      const firstResponse = {
        success: true,
        interventionId: 'crisis_123',
        severity: 'MODERATE',
        resources: []
      };

      mockFetch(firstResponse, 200);

      await act(async () => {
        await result.current.performAssessment(firstAssessment);
      });

      expect(result.current.currentIntervention?.severity).toBe('MODERATE');

      // Second assessment - high
      const secondResponse = {
        success: true,
        interventionId: 'crisis_456',
        severity: 'HIGH',
        resources: mockCrisisAssessment.result.resources
      };

      mockFetch(secondResponse, 200);

      await act(async () => {
        await result.current.performAssessment(firstAssessment);
      });

      expect(result.current.currentIntervention?.severity).toBe('HIGH');
      expect(result.current.currentIntervention?.id).toBe('crisis_456');
    });
  });

  describe('State Persistence', () => {
    test('should maintain state across re-renders', () => {
      const { result, rerender } = renderHook(() => useCrisisStore());

      // Set some state
      act(() => {
        result.current.setInCrisis(true);
        result.current.setAssessmentInProgress(true);
      });

      // Re-render
      rerender();

      // State should persist
      expect(result.current.isInCrisis).toBe(true);
      expect(result.current.assessmentInProgress).toBe(true);
    });
  });
});