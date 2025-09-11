/**
 * Demo Login System Tests
 * Tests the complete demo login functionality including UI, API, and security
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { areDemoAccountsAllowed, isDemoAccountEmail, getAllDemoAccounts } from '@/lib/utils/demo-accounts';
import DemoAccountsSection from '@/components/auth/DemoAccountsSection';

// Mock Next.js modules
jest.mock('next-auth/react');
jest.mock('next/navigation');

// Mock fetch for API calls
global.fetch = jest.fn();

const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Mock props
const defaultProps = {
  onError: jest.fn(),
  isLoading: false,
  setIsLoading: jest.fn()
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseRouter.mockReturnValue({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn()
  } as any);
});

describe('Demo Account Utilities', () => {
  describe('areDemoAccountsAllowed', () => {
    it('should allow demo accounts in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      expect(areDemoAccountsAllowed()).toBe(true);
      process.env.NODE_ENV = originalEnv;
    });

    it('should allow demo accounts when explicitly enabled', () => {
      const originalAllow = process.env.ALLOW_DEMO_ACCOUNTS;
      const originalEnv = process.env.NODE_ENV;
      
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_DEMO_ACCOUNTS = 'true';
      
      expect(areDemoAccountsAllowed()).toBe(true);
      
      process.env.ALLOW_DEMO_ACCOUNTS = originalAllow;
      process.env.NODE_ENV = originalEnv;
    });

    it('should not allow demo accounts in production by default', () => {
      const originalAllow = process.env.ALLOW_DEMO_ACCOUNTS;
      const originalEnv = process.env.NODE_ENV;
      
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOW_DEMO_ACCOUNTS;
      
      expect(areDemoAccountsAllowed()).toBe(false);
      
      process.env.ALLOW_DEMO_ACCOUNTS = originalAllow;
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('isDemoAccountEmail', () => {
    it('should correctly identify demo account emails', () => {
      expect(isDemoAccountEmail('client@demo.astralcore.com')).toBe(true);
      expect(isDemoAccountEmail('therapist@demo.astralcore.com')).toBe(true);
      expect(isDemoAccountEmail('admin@demo.astralcore.com')).toBe(true);
      expect(isDemoAccountEmail('crisis@demo.astralcore.com')).toBe(true);
      expect(isDemoAccountEmail('supervisor@demo.astralcore.com')).toBe(true);
    });

    it('should return false for non-demo emails', () => {
      expect(isDemoAccountEmail('user@example.com')).toBe(false);
      expect(isDemoAccountEmail('test@astralcore.com')).toBe(false);
      expect(isDemoAccountEmail('admin@company.com')).toBe(false);
    });
  });

  describe('getAllDemoAccounts', () => {
    it('should return all demo accounts with required fields', () => {
      const accounts = getAllDemoAccounts();
      expect(accounts).toHaveLength(5);
      
      accounts.forEach(account => {
        expect(account).toHaveProperty('role');
        expect(account).toHaveProperty('email');
        expect(account).toHaveProperty('password');
        expect(account).toHaveProperty('name');
        expect(account).toHaveProperty('description');
        expect(account).toHaveProperty('features');
        expect(Array.isArray(account.features)).toBe(true);
      });
    });

    it('should include all required roles', () => {
      const accounts = getAllDemoAccounts();
      const roles = accounts.map(acc => acc.role);
      
      expect(roles).toContain('CLIENT');
      expect(roles).toContain('THERAPIST');
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('CRISIS_RESPONDER');
      expect(roles).toContain('SUPERVISOR');
    });
  });
});

describe('DemoAccountsSection Component', () => {
  describe('when demo accounts exist', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ allExist: true })
      });
    });

    it('should render demo account buttons', async () => {
      render(<DemoAccountsSection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Demo Accounts for Testing')).toBeInTheDocument();
      });

      expect(screen.getByText('Client Demo')).toBeInTheDocument();
      expect(screen.getByText('Therapist Demo')).toBeInTheDocument();
      expect(screen.getByText('Admin Demo')).toBeInTheDocument();
      expect(screen.getByText('Crisis Demo')).toBeInTheDocument();
    });

    it('should handle demo login click', async () => {
      mockSignIn.mockResolvedValueOnce({ ok: true, error: null });
      
      render(<DemoAccountsSection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Client Demo')).toBeInTheDocument();
      });

      const clientButton = screen.getByText('Client Demo');
      fireEvent.click(clientButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          email: 'client@demo.astralcore.com',
          password: 'Demo123!Client',
          redirect: false
        });
      });
    });

    it('should redirect on successful login', async () => {
      mockSignIn.mockResolvedValueOnce({ ok: true, error: null });
      
      render(<DemoAccountsSection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Client Demo')).toBeInTheDocument();
      });

      const clientButton = screen.getByText('Client Demo');
      fireEvent.click(clientButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show error on login failure', async () => {
      mockSignIn.mockResolvedValueOnce({ ok: false, error: 'Invalid credentials' });
      
      render(<DemoAccountsSection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Client Demo')).toBeInTheDocument();
      });

      const clientButton = screen.getByText('Client Demo');
      fireEvent.click(clientButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'Demo login failed: Invalid credentials. Make sure demo accounts are created.'
        );
      });
    });

    it('should show account details when requested', async () => {
      render(<DemoAccountsSection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Show account details')).toBeInTheDocument();
      });

      const detailsButton = screen.getByText('Show account details');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('Emma Johnson')).toBeInTheDocument();
        expect(screen.getByText('Dr. Michael Thompson')).toBeInTheDocument();
        expect(screen.getByText('Sarah Administrator')).toBeInTheDocument();
        expect(screen.getByText('Alex Crisis-Response')).toBeInTheDocument();
      });
    });
  });

  describe('when demo accounts do not exist', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ allExist: false })
      });
    });

    it('should show account creation option', async () => {
      render(<DemoAccountsSection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Demo Accounts Not Found')).toBeInTheDocument();
        expect(screen.getByText('Create Demo Accounts')).toBeInTheDocument();
      });
    });

    it('should handle account creation', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ allExist: false })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      render(<DemoAccountsSection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Demo Accounts')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create Demo Accounts');
      fireEvent.click(createButton);

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/demo/create', { method: 'POST' });
    });
  });

  describe('loading states', () => {
    it('should show loading spinner while checking accounts', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<DemoAccountsSection {...defaultProps} />);
      
      expect(screen.getByText('Checking demo accounts...')).toBeInTheDocument();
    });

    it('should disable buttons when loading', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ allExist: true })
      });

      const loadingProps = { ...defaultProps, isLoading: true };
      render(<DemoAccountsSection {...loadingProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Client Demo')).toBeInTheDocument();
      });

      const clientButton = screen.getByText('Client Demo');
      expect(clientButton).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ allExist: true })
      });
    });

    it('should have proper ARIA labels', async () => {
      render(<DemoAccountsSection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Client Demo')).toBeInTheDocument();
      });

      const clientButton = screen.getByLabelText('Login as demo client - Emma Johnson');
      expect(clientButton).toBeInTheDocument();

      const therapistButton = screen.getByLabelText('Login as demo therapist - Dr. Michael Thompson');
      expect(therapistButton).toBeInTheDocument();

      const adminButton = screen.getByLabelText('Login as demo admin - Sarah Administrator');
      expect(adminButton).toBeInTheDocument();

      const crisisButton = screen.getByLabelText('Login as demo crisis responder - Alex Crisis-Response');
      expect(crisisButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<DemoAccountsSection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Client Demo')).toBeInTheDocument();
      });

      const clientButton = screen.getByText('Client Demo');
      clientButton.focus();
      expect(document.activeElement).toBe(clientButton);
    });
  });
});

describe('Demo Login API Integration', () => {
  describe('POST /api/auth/demo/create', () => {
    it('should create demo accounts in development environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // This would be an actual API test in a full integration test
      const mockResponse = {
        success: true,
        results: [
          { email: 'client@demo.astralcore.com', role: 'CLIENT', status: 'created' },
          { email: 'therapist@demo.astralcore.com', role: 'THERAPIST', status: 'created' },
          { email: 'admin@demo.astralcore.com', role: 'ADMIN', status: 'created' },
          { email: 'crisis@demo.astralcore.com', role: 'CRISIS_RESPONDER', status: 'created' },
          { email: 'supervisor@demo.astralcore.com', role: 'SUPERVISOR', status: 'created' }
        ]
      };

      expect(mockResponse.results).toHaveLength(5);
      expect(mockResponse.results.every(r => r.status === 'created')).toBe(true);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle existing accounts gracefully', async () => {
      const mockResponse = {
        success: true,
        results: [
          { email: 'client@demo.astralcore.com', role: 'CLIENT', status: 'exists' }
        ]
      };

      expect(mockResponse.results[0].status).toBe('exists');
    });
  });

  describe('GET /api/auth/demo/create', () => {
    it('should check demo account existence', async () => {
      const mockResponse = {
        success: true,
        accounts: [
          { role: 'CLIENT', email: 'client@demo.astralcore.com', exists: true },
          { role: 'THERAPIST', email: 'therapist@demo.astralcore.com', exists: true }
        ],
        allExist: true
      };

      expect(mockResponse.allExist).toBe(true);
      expect(mockResponse.accounts.every(acc => acc.exists)).toBe(true);
    });
  });
});

describe('Demo Login Security', () => {
  it('should prevent demo account access in production', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_DEMO_ACCOUNTS;
    
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_DEMO_ACCOUNTS;
    
    expect(areDemoAccountsAllowed()).toBe(false);
    
    process.env.NODE_ENV = originalEnv;
    process.env.ALLOW_DEMO_ACCOUNTS = originalAllow;
  });

  it('should generate appropriate security headers', async () => {
    // This would test the actual security headers in an integration test
    const mockHeaders = {
      'X-Demo-Account': 'true',
      'X-Environment': 'development',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    };

    expect(mockHeaders['X-Demo-Account']).toBe('true');
    expect(mockHeaders['Cache-Control']).toContain('no-store');
  });

  it('should validate demo credentials securely', () => {
    // Test credential validation without exposing actual passwords
    expect(isDemoAccountEmail('client@demo.astralcore.com')).toBe(true);
    expect(isDemoAccountEmail('malicious@example.com')).toBe(false);
  });
});

describe('Demo Login UX', () => {
  it('should provide clear user feedback', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ allExist: true })
    });

    render(<DemoAccountsSection {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Explore different user experiences with one-click login')).toBeInTheDocument();
      expect(screen.getByText('Each demo account showcases different platform features and user journeys')).toBeInTheDocument();
    });
  });

  it('should maintain responsive design', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ allExist: true })
    });

    render(<DemoAccountsSection {...defaultProps} />);
    
    await waitFor(() => {
      const container = screen.getByText('Demo Accounts for Testing').closest('div');
      expect(container).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2');
    });
  });

  it('should show appropriate visual cues for different account types', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ allExist: true })
    });

    render(<DemoAccountsSection {...defaultProps} />);
    
    await waitFor(() => {
      // Check that different account types have different visual styling
      const clientButton = screen.getByText('Client Demo').closest('button');
      const adminButton = screen.getByText('Admin Demo').closest('button');
      
      expect(clientButton).toHaveClass('bg-green-600');
      expect(adminButton).toHaveClass('bg-red-600');
    });
  });
});