'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

/**
 * Test component to verify error boundaries are working correctly
 * This component can be temporarily added to any page to test error handling
 */
export function TestErrorBoundary() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Test error: This is a deliberate error to test the error boundary!');
  }

  return (
    <div className="p-4 border-2 border-dashed border-red-300 rounded-lg bg-red-50">
      <h3 className="text-lg font-semibold text-red-800 mb-2">Error Boundary Test Component</h3>
      <p className="text-sm text-red-600 mb-4">
        Click the button below to trigger an error and test the error boundary.
      </p>
      <Button
        onClick={() => setShouldThrow(true)}
        variant="danger"
        className="bg-red-600 hover:bg-red-700 text-white"
      >
        Trigger Test Error
      </Button>
      <p className="text-xs text-gray-500 mt-4">
        Note: This is a test component and should be removed before production deployment.
      </p>
    </div>
  );
}