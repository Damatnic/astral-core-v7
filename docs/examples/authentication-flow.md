# Authentication Flow Examples

This document provides comprehensive examples for implementing authentication flows with the Astral Core v7 API.

## Table of Contents

1. [User Registration](#user-registration)
2. [User Login](#user-login)
3. [MFA Setup](#mfa-setup)
4. [MFA Verification](#mfa-verification)
5. [Session Management](#session-management)
6. [Error Handling](#error-handling)

## User Registration

### Basic Registration

```javascript
// Register a new user
const registerUser = async (userData) => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        name: userData.name,
        password: userData.password
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('Registration successful:', result.data);
      return {
        success: true,
        user: result.data,
        message: result.message
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Registration failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Usage example
const newUser = {
  email: 'john.doe@example.com',
  name: 'John Doe',
  password: 'SecureP@ssw0rd!'
};

registerUser(newUser).then(result => {
  if (result.success) {
    // Redirect to email verification page
    window.location.href = '/verify-email';
  } else {
    // Display error message
    showErrorMessage(result.error);
  }
});
```

### Registration with Validation

```javascript
// Client-side validation before registration
const validateRegistration = (userData) => {
  const errors = [];

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userData.email)) {
    errors.push('Please enter a valid email address');
  }

  // Name validation
  if (userData.name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  // Password validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  if (userData.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!passwordRegex.test(userData.password)) {
    errors.push('Password must contain uppercase, lowercase, number, and special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Enhanced registration with validation
const registerUserWithValidation = async (userData) => {
  const validation = validateRegistration(userData);
  
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors
    };
  }

  return await registerUser(userData);
};
```

## User Login

### Basic Login with NextAuth

```javascript
import { signIn, getSession } from 'next-auth/react';

// Login function
const loginUser = async (credentials) => {
  try {
    const result = await signIn('credentials', {
      email: credentials.email,
      password: credentials.password,
      redirect: false
    });

    if (result?.error) {
      return {
        success: false,
        error: result.error,
        needsMFA: result.error === 'MFA_REQUIRED'
      };
    }

    // Check if MFA is required
    const session = await getSession();
    if (session?.user?.mfaRequired) {
      return {
        success: false,
        needsMFA: true,
        tempToken: session.tempToken
      };
    }

    return {
      success: true,
      user: session?.user
    };
  } catch (error) {
    console.error('Login failed:', error);
    return {
      success: false,
      error: 'Login failed. Please try again.'
    };
  }
};

// Usage example
const handleLogin = async (formData) => {
  const result = await loginUser({
    email: formData.email,
    password: formData.password
  });

  if (result.success) {
    // Redirect to dashboard
    window.location.href = '/dashboard';
  } else if (result.needsMFA) {
    // Redirect to MFA verification
    window.location.href = '/auth/mfa-verify';
  } else {
    // Display error
    showErrorMessage(result.error);
  }
};
```

## MFA Setup

### TOTP (Authenticator App) Setup

```javascript
// Initialize TOTP setup
const setupTOTP = async () => {
  try {
    const response = await fetch('/api/auth/mfa/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        method: 'TOTP'
      })
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        secret: result.data.secret,
        qrCode: result.data.qrCode,
        backupCodes: result.data.backupCodes
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('TOTP setup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Verify TOTP setup
const verifyTOTPSetup = async (token) => {
  try {
    const response = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        method: 'TOTP',
        token: token
      })
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        mfaEnabled: result.mfaEnabled
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('TOTP verification failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Complete TOTP setup flow
const completeTOTPSetup = async () => {
  // Step 1: Initialize setup
  const setupResult = await setupTOTP();
  if (!setupResult.success) {
    showErrorMessage(setupResult.error);
    return;
  }

  // Step 2: Display QR code and backup codes
  displayQRCode(setupResult.qrCode);
  displayBackupCodes(setupResult.backupCodes);

  // Step 3: Wait for user to scan QR code and enter token
  const token = await getUserTOTPToken();

  // Step 4: Verify the token
  const verifyResult = await verifyTOTPSetup(token);
  if (verifyResult.success) {
    showSuccessMessage('MFA has been successfully enabled!');
    // Store backup codes securely
    saveBackupCodes(setupResult.backupCodes);
  } else {
    showErrorMessage(verifyResult.error);
  }
};
```

### SMS MFA Setup

```javascript
// Setup SMS MFA
const setupSMS = async (phoneNumber) => {
  try {
    const response = await fetch('/api/auth/mfa/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        method: 'SMS',
        phoneNumber: phoneNumber
      })
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: result.message,
        maskedPhone: result.data.phoneNumber
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('SMS setup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Verify SMS code
const verifySMSCode = async (code) => {
  try {
    const response = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        method: 'SMS',
        token: code
      })
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        mfaEnabled: result.mfaEnabled
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('SMS verification failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
```

## MFA Verification

### Login with MFA

```javascript
// Complete MFA verification during login
const completeMFALogin = async (mfaData) => {
  try {
    const response = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mfaData.tempToken}`
      },
      body: JSON.stringify({
        method: mfaData.method,
        token: mfaData.token
      })
    });

    const result = await response.json();

    if (response.ok) {
      // MFA verification successful, complete login
      const session = await getSession();
      return {
        success: true,
        user: session?.user
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('MFA verification failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Handle backup code usage
const useBackupCode = async (backupCode, tempToken) => {
  try {
    const response = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tempToken}`
      },
      body: JSON.stringify({
        method: 'BACKUP_CODE',
        token: backupCode
      })
    });

    const result = await response.json();

    if (response.ok) {
      // Show warning that backup code was used
      showWarningMessage('Backup code used. Consider generating new backup codes.');
      return {
        success: true,
        user: result.user
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Backup code verification failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
```

## Session Management

### Check Authentication Status

```javascript
// Check if user is authenticated
const checkAuthStatus = async () => {
  try {
    const session = await getSession();
    
    if (!session) {
      return {
        isAuthenticated: false,
        user: null
      };
    }

    // Check if session is expired
    if (session.expires && new Date(session.expires) < new Date()) {
      await signOut({ redirect: false });
      return {
        isAuthenticated: false,
        user: null,
        expired: true
      };
    }

    return {
      isAuthenticated: true,
      user: session.user,
      expiresAt: session.expires
    };
  } catch (error) {
    console.error('Error checking auth status:', error);
    return {
      isAuthenticated: false,
      user: null,
      error: error.message
    };
  }
};

// Refresh session if needed
const refreshSession = async () => {
  try {
    const session = await getSession();
    
    if (session) {
      // Force refresh the session
      await signIn('credentials', {
        redirect: false,
        token: session.accessToken
      });
      
      return await getSession();
    }
    
    return null;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return null;
  }
};
```

### Protected Route Helper

```javascript
// HOC for protecting routes
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const withAuth = (WrappedComponent) => {
  return function AuthenticatedComponent(props) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
      if (status === 'loading') return; // Still loading

      if (!session) {
        // Not authenticated
        router.push('/auth/login');
        return;
      }

      if (session.user?.mfaRequired && router.pathname !== '/auth/mfa-verify') {
        // MFA required
        router.push('/auth/mfa-verify');
        return;
      }
    }, [session, status, router]);

    if (status === 'loading') {
      return <div>Loading...</div>;
    }

    if (!session) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
};

// Usage
export default withAuth(DashboardComponent);
```

## Error Handling

### Comprehensive Error Handler

```javascript
// Error handler for authentication operations
const handleAuthError = (error, context) => {
  console.error(`Auth error in ${context}:`, error);

  switch (error.message) {
    case 'EMAIL_EXISTS':
      return {
        type: 'validation',
        message: 'An account with this email already exists.',
        field: 'email'
      };
    
    case 'INVALID_CREDENTIALS':
      return {
        type: 'authentication',
        message: 'Invalid email or password.',
        action: 'retry'
      };
    
    case 'MFA_REQUIRED':
      return {
        type: 'mfa',
        message: 'Multi-factor authentication required.',
        action: 'redirect',
        redirectTo: '/auth/mfa-verify'
      };
    
    case 'INVALID_MFA_TOKEN':
      return {
        type: 'mfa',
        message: 'Invalid MFA token. Please try again.',
        field: 'mfaToken'
      };
    
    case 'ACCOUNT_LOCKED':
      return {
        type: 'security',
        message: 'Account temporarily locked due to multiple failed attempts.',
        action: 'wait'
      };
    
    case 'RATE_LIMIT_EXCEEDED':
      return {
        type: 'rate_limit',
        message: 'Too many requests. Please try again later.',
        action: 'wait'
      };
    
    default:
      return {
        type: 'unknown',
        message: 'An unexpected error occurred. Please try again.',
        action: 'retry'
      };
  }
};

// Usage in components
const handleLoginSubmit = async (formData) => {
  try {
    const result = await loginUser(formData);
    
    if (!result.success) {
      const errorInfo = handleAuthError(new Error(result.error), 'login');
      displayErrorMessage(errorInfo.message, errorInfo.type);
      
      if (errorInfo.action === 'redirect') {
        router.push(errorInfo.redirectTo);
      }
    }
  } catch (error) {
    const errorInfo = handleAuthError(error, 'login');
    displayErrorMessage(errorInfo.message, errorInfo.type);
  }
};
```

### Retry Logic with Exponential Backoff

```javascript
// Retry helper with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Check if error is retryable
      if (error.message === 'RATE_LIMIT_EXCEEDED' || 
          error.status >= 500) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};

// Usage
const loginWithRetry = async (credentials) => {
  return await retryWithBackoff(() => loginUser(credentials));
};
```

## Security Best Practices

### Token Management

```javascript
// Secure token storage
const TokenManager = {
  setToken: (token) => {
    // Use secure, httpOnly cookie in production
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_token', token);
    }
  },

  getToken: () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('auth_token');
    }
    return null;
  },

  clearToken: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_token');
    }
  },

  isTokenExpired: (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }
};
```

### Input Sanitization

```javascript
// Input sanitization for authentication
const sanitizeAuthInput = (input) => {
  return {
    email: input.email?.toLowerCase().trim(),
    name: input.name?.trim().replace(/[<>]/g, ''),
    password: input.password // Don't modify password
  };
};

// Usage before sending requests
const sanitizedInput = sanitizeAuthInput(formData);
const result = await registerUser(sanitizedInput);
```

This completes the authentication flow examples. The patterns shown here provide comprehensive coverage of user authentication, MFA setup and verification, session management, and security best practices for the Astral Core v7 API.