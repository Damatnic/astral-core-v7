/**
 * Auth0 Provider Configuration for NextAuth.js
 * 
 * This file provides Auth0 integration alongside the existing credential-based authentication.
 * It allows the application to support both internal credentials and Auth0 OAuth flows.
 */

import Auth0Provider from 'next-auth/providers/auth0';
import { Profile } from 'next-auth';
import { isDemoAccountEmail } from '@/lib/utils/demo-accounts';
import { audit } from '@/lib/security/audit';

// Auth0 configuration interface
export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  issuer?: string;
  audience?: string;
}

// Auth0 profile interface extending NextAuth Profile
interface Auth0Profile extends Profile {
  nickname?: string;
  picture?: string;
  updated_at?: string;
  email_verified?: boolean;
  'https://astralcore.app/roles'?: string[];
  'https://astralcore.app/user_metadata'?: {
    role?: string;
    department?: string;
    license_number?: string;
  };
}

// Default Auth0 configuration from environment variables
export const getAuth0Config = (): Auth0Config => {
  const domain = process.env['AUTH0_DOMAIN'] || 'dev-ac3ajs327vs5vzhk.us.auth0.com';
  const clientId = process.env['AUTH0_CLIENT_ID'] || '7ivKaost2wsuV47x6dAyj11Eo7jpcctX';
  const clientSecret = process.env['AUTH0_CLIENT_SECRET'] || 'A7ABJwRg7n0otizVohWj15UN2zjEl5lbSW7sBlXPgvqsU0FPvyQmobUA0pQ8OiJo';
  
  return {
    domain,
    clientId,
    clientSecret,
    issuer: `https://${domain}`,
    audience: `https://${domain}/api/v2/`
  };
};

// Role mapping function for Auth0 users
const mapAuth0RoleToAppRole = (auth0Profile: Auth0Profile): 'ADMIN' | 'THERAPIST' | 'CLIENT' | 'CRISIS_RESPONDER' | 'SUPERVISOR' => {
  // Check custom claims first
  const customRoles = auth0Profile['https://astralcore.app/roles'];
  const userMetadata = auth0Profile['https://astralcore.app/user_metadata'];
  
  if (customRoles && customRoles.length > 0) {
    const role = customRoles[0]?.toUpperCase();
    if (role && ['ADMIN', 'THERAPIST', 'CLIENT', 'CRISIS_RESPONDER', 'SUPERVISOR'].includes(role)) {
      return role as 'ADMIN' | 'THERAPIST' | 'CLIENT' | 'CRISIS_RESPONDER' | 'SUPERVISOR';
    }
  }
  
  if (userMetadata?.role) {
    const role = userMetadata.role.toUpperCase();
    if (['ADMIN', 'THERAPIST', 'CLIENT', 'CRISIS_RESPONDER', 'SUPERVISOR'].includes(role)) {
      return role as 'ADMIN' | 'THERAPIST' | 'CLIENT' | 'CRISIS_RESPONDER' | 'SUPERVISOR';
    }
  }
  
  // Check email domain for role assignment
  if (auth0Profile.email) {
    if (auth0Profile.email.includes('admin') || auth0Profile.email.includes('administrator')) {
      return 'ADMIN';
    }
    if (auth0Profile.email.includes('therapist') || auth0Profile.email.includes('doctor') || auth0Profile.email.includes('dr.')) {
      return 'THERAPIST';
    }
    if (auth0Profile.email.includes('crisis') || auth0Profile.email.includes('emergency')) {
      return 'CRISIS_RESPONDER';
    }
    if (auth0Profile.email.includes('supervisor') || auth0Profile.email.includes('manager')) {
      return 'SUPERVISOR';
    }
  }
  
  // Default to CLIENT role
  return 'CLIENT';
};

// Create Auth0 provider configuration
export const createAuth0Provider = (config?: Partial<Auth0Config>) => {
  const auth0Config = { ...getAuth0Config(), ...config };
  
  return Auth0Provider({
    clientId: auth0Config.clientId,
    clientSecret: auth0Config.clientSecret,
    issuer: auth0Config.issuer,
    
    authorization: {
      params: {
        scope: 'openid email profile',
        prompt: 'consent',
      },
    },
    
    checks: ['pkce', 'state'],
    
    profile: async (profile: Auth0Profile) => {
      try {
        const role = mapAuth0RoleToAppRole(profile);
        
        // Check if this is a demo account trying to authenticate via Auth0
        const isDemoAccount = isDemoAccountEmail(profile.email || '');
        
        if (isDemoAccount) {
          await audit.logWarning(
            'AUTH0_LOGIN',
            'User',
            'Demo account attempting Auth0 authentication',
            undefined,
            {
              email: profile.email,
              auth0_sub: profile.sub,
              environment: process.env['NODE_ENV']
            }
          );
        }
        
        await audit.logSuccess(
          'AUTH0_LOGIN',
          'User',
          profile.sub || 'unknown',
          {
            method: 'auth0',
            email: profile.email,
            role,
            auth0_sub: profile.sub,
            email_verified: profile.email_verified,
            isDemoAccount
          },
          profile.sub
        );
        
        return {
          id: profile.sub || '',
          name: profile.name || profile.nickname || '',
          email: profile.email || '',
          image: profile.picture || '',
          role,
          emailVerified: profile.email_verified ? new Date() : null,
          auth0Sub: profile.sub,
        };
      } catch (error) {
        await audit.logFailure(
          'AUTH0_LOGIN',
          'User',
          'Error processing Auth0 profile',
          profile.sub,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            auth0_sub: profile.sub,
            email: profile.email
          }
        );
        
        throw new Error('Failed to process Auth0 profile');
      }
    },
    
    userinfo: {
      // Request additional user information from Auth0
      url: `https://${auth0Config.domain}/userinfo`,
    },
    
    // Configure token endpoint for PKCE
    token: {
      url: `https://${auth0Config.domain}/oauth/token`,
    },
    
    // Configure authorization endpoint
    authorization: {
      url: `https://${auth0Config.domain}/authorize`,
      params: {
        scope: 'openid email profile',
        ...(auth0Config.audience && { audience: auth0Config.audience }),
        prompt: 'consent',
        response_type: 'code',
      },
    },
  });
};

// Auth0 logout URL helper
export const getAuth0LogoutUrl = (returnTo?: string): string => {
  const config = getAuth0Config();
  const baseUrl = process.env['NEXTAUTH_URL'] || process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
  const logoutUrl = new URL(`https://${config.domain}/v2/logout`);
  
  logoutUrl.searchParams.set('client_id', config.clientId);
  logoutUrl.searchParams.set('returnTo', returnTo || baseUrl);
  
  return logoutUrl.toString();
};

// Auth0 management API helper
export const getAuth0ManagementToken = async (): Promise<string> => {
  const config = getAuth0Config();
  
  const response = await fetch(`https://${config.domain}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      audience: `https://${config.domain}/api/v2/`,
      grant_type: 'client_credentials',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to get Auth0 management token');
  }
  
  const data = await response.json();
  return data.access_token;
};

// Auth0 user management helpers
export const updateAuth0UserMetadata = async (userId: string, metadata: Record<string, any>): Promise<void> => {
  const token = await getAuth0ManagementToken();
  const config = getAuth0Config();
  
  const response = await fetch(`https://${config.domain}/api/v2/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_metadata: metadata,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update Auth0 user metadata');
  }
};

// Auth0 demo account configuration for testing
export const setupAuth0DemoAccounts = async (): Promise<void> => {
  console.log('🔧 Setting up Auth0 demo accounts...');
  
  // This would typically involve creating test users in Auth0
  // For production, demo accounts should be properly configured in Auth0 dashboard
  console.log('⚠️ Demo accounts should be configured in Auth0 dashboard');
  console.log('📋 Required demo accounts:');
  console.log('  - client@demo.astralcore.com (CLIENT role)');
  console.log('  - therapist@demo.astralcore.com (THERAPIST role)');
  console.log('  - admin@demo.astralcore.com (ADMIN role)');
  console.log('  - crisis@demo.astralcore.com (CRISIS_RESPONDER role)');
  console.log('  - supervisor@demo.astralcore.com (SUPERVISOR role)');
};

// Export default configuration
export default createAuth0Provider();

// Health check for Auth0 configuration
export const checkAuth0Health = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  domain: string;
  clientId: string;
  issuerAccessible: boolean;
  managementApiAccessible: boolean;
  errors: string[];
}> => {
  const config = getAuth0Config();
  const errors: string[] = [];
  let issuerAccessible = false;
  let managementApiAccessible = false;
  
  try {
    // Test issuer accessibility
    const issuerResponse = await fetch(`${config.issuer}/.well-known/openid_configuration`);
    issuerAccessible = issuerResponse.ok;
    
    if (!issuerAccessible) {
      errors.push(`Auth0 issuer not accessible: ${config.issuer}`);
    }
  } catch (error) {
    errors.push(`Failed to check Auth0 issuer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  try {
    // Test management API accessibility
    await getAuth0ManagementToken();
    managementApiAccessible = true;
  } catch (error) {
    managementApiAccessible = false;
    errors.push(`Auth0 management API not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  const status = (issuerAccessible && managementApiAccessible && errors.length === 0) ? 'healthy' : 'unhealthy';
  
  return {
    status,
    domain: config.domain,
    clientId: config.clientId,
    issuerAccessible,
    managementApiAccessible,
    errors,
  };
};