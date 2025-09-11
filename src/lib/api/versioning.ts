// API Versioning Strategy for Mental Health Platform
// Supports multiple versioning strategies with backward compatibility

export type ApiVersion = 'v1' | 'v2' | 'v3';
export type VersioningStrategy = 'header' | 'path' | 'query' | 'subdomain';

export interface ApiVersionConfig {
  version: ApiVersion;
  isDefault: boolean;
  isDeprecated: boolean;
  deprecationDate?: string;
  sunsetDate?: string;
  supportedUntil?: string;
  description: string;
  changelog?: string[];
  breakingChanges?: string[];
  features: string[];
  endpoints: Record<string, EndpointVersion>;
}

export interface EndpointVersion {
  path: string;
  method: string;
  introduced: ApiVersion;
  deprecated?: ApiVersion;
  removed?: ApiVersion;
  changes: VersionChange[];
  parameters: ParameterDefinition[];
  responseSchema: ResponseSchema;
  security: SecurityRequirement[];
  rateLimit?: RateLimitConfig;
}

export interface VersionChange {
  version: ApiVersion;
  type: 'added' | 'modified' | 'deprecated' | 'removed';
  description: string;
  impact: 'breaking' | 'non-breaking';
  migration?: MigrationGuide;
}

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  introduced: ApiVersion;
  deprecated?: ApiVersion;
  description: string;
  example?: any;
  validation?: ValidationRule[];
}

export interface ResponseSchema {
  statusCode: number;
  schema: any; // JSON Schema
  examples: Record<string, any>;
  headers?: Record<string, string>;
}

export interface SecurityRequirement {
  type: 'bearer' | 'api_key' | 'oauth2' | 'basic';
  scope?: string[];
  introduced: ApiVersion;
}

export interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  burst?: number;
}

export interface MigrationGuide {
  title: string;
  description: string;
  steps: string[];
  codeExamples?: CodeExample[];
  estimatedTime?: string;
}

export interface CodeExample {
  language: string;
  before: string;
  after: string;
  description: string;
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value: any;
  message: string;
}

export interface ApiRequest {
  version: ApiVersion;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body?: any;
  user?: {
    id: string;
    role: string;
  };
}

export interface ApiResponse {
  status: number;
  data?: any;
  error?: ApiError;
  headers: Record<string, string>;
  deprecationWarning?: DeprecationWarning;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  version: ApiVersion;
  timestamp: string;
  traceId?: string;
}

export interface DeprecationWarning {
  version: ApiVersion;
  message: string;
  deprecationDate: string;
  sunsetDate?: string;
  migrationGuide?: string;
  replacement?: {
    version: ApiVersion;
    endpoint: string;
  };
}

// API Version configurations for mental health platform
export const API_VERSIONS: Record<ApiVersion, ApiVersionConfig> = {
  v1: {
    version: 'v1',
    isDefault: false,
    isDeprecated: true,
    deprecationDate: '2024-01-01',
    sunsetDate: '2025-01-01',
    description: 'Initial API version with basic mental health features',
    changelog: [
      'Basic user authentication',
      'Simple mood tracking',
      'Basic journal entries',
      'Emergency contact management'
    ],
    features: [
      'User registration and authentication',
      'Basic mood tracking (1-10 scale)',
      'Simple journal entries',
      'Emergency contacts',
      'Basic wellness goals'
    ],
    endpoints: {
      'POST /auth/login': {
        path: '/auth/login',
        method: 'POST',
        introduced: 'v1',
        changes: [],
        parameters: [
          {
            name: 'email',
            type: 'string',
            required: true,
            introduced: 'v1',
            description: 'User email address',
            example: 'user@example.com'
          },
          {
            name: 'password',
            type: 'string',
            required: true,
            introduced: 'v1',
            description: 'User password',
            example: 'securePassword123'
          }
        ],
        responseSchema: {
          statusCode: 200,
          schema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: { type: 'object' }
            }
          },
          examples: {
            success: {
              token: 'jwt_token_here',
              user: { id: '123', email: 'user@example.com' }
            }
          }
        },
        security: []
      }
    }
  },
  
  v2: {
    version: 'v2',
    isDefault: true,
    isDeprecated: false,
    description: 'Enhanced API with advanced mental health features and HIPAA compliance',
    changelog: [
      'Enhanced authentication with MFA',
      'Advanced mood tracking with emotions',
      'Structured journal entries with prompts',
      'Therapy session management',
      'Crisis intervention features',
      'HIPAA compliance enhancements'
    ],
    breakingChanges: [
      'Authentication now requires MFA for new users',
      'Mood tracking scale changed from 1-10 to 1-100 with emotion categories',
      'Journal entries now require minimum 50 characters'
    ],
    features: [
      'Multi-factor authentication',
      'Advanced mood tracking with emotions and notes',
      'Structured journaling with prompts',
      'Therapy session scheduling and management',
      'Crisis intervention and safety planning',
      'Wellness goal tracking with progress analytics',
      'HIPAA-compliant data handling',
      'Real-time notifications'
    ],
    endpoints: {
      'POST /auth/login': {
        path: '/auth/login',
        method: 'POST',
        introduced: 'v1',
        changes: [
          {
            version: 'v2',
            type: 'modified',
            description: 'Added MFA support',
            impact: 'non-breaking',
            migration: {
              title: 'Migrate to MFA-enabled authentication',
              description: 'Update your authentication flow to handle MFA challenges',
              steps: [
                'Check for mfa_required in login response',
                'If MFA required, prompt user for MFA code',
                'Submit MFA code to /auth/mfa/verify endpoint'
              ],
              codeExamples: [
                {
                  language: 'javascript',
                  before: `
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { token } = await response.json();`,
                  after: `
const response = await fetch('/api/v2/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const data = await response.json();

if (data.mfa_required) {
  const mfaCode = await promptForMFA();
  const mfaResponse = await fetch('/api/v2/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ 
      session_token: data.session_token,
      mfa_code: mfaCode 
    })
  });
  const { token } = await mfaResponse.json();
} else {
  const { token } = data;
}`,
                  description: 'Handle MFA in authentication flow'
                }
              ],
              estimatedTime: '30 minutes'
            }
          }
        ],
        parameters: [
          {
            name: 'email',
            type: 'string',
            required: true,
            introduced: 'v1',
            description: 'User email address',
            example: 'user@example.com'
          },
          {
            name: 'password',
            type: 'string',
            required: true,
            introduced: 'v1',
            description: 'User password',
            example: 'securePassword123'
          },
          {
            name: 'remember_me',
            type: 'boolean',
            required: false,
            introduced: 'v2',
            description: 'Whether to remember the user session',
            example: true
          }
        ],
        responseSchema: {
          statusCode: 200,
          schema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: { type: 'object' },
              mfa_required: { type: 'boolean' },
              session_token: { type: 'string' }
            }
          },
          examples: {
            success_no_mfa: {
              token: 'jwt_token_here',
              user: { id: '123', email: 'user@example.com' },
              mfa_required: false
            },
            success_mfa_required: {
              session_token: 'temp_session_token',
              user: { id: '123', email: 'user@example.com' },
              mfa_required: true
            }
          }
        },
        security: []
      },
      
      'POST /wellness/mood': {
        path: '/wellness/mood',
        method: 'POST',
        introduced: 'v2',
        changes: [],
        parameters: [
          {
            name: 'mood_score',
            type: 'number',
            required: true,
            introduced: 'v2',
            description: 'Mood score from 1-100',
            example: 75,
            validation: [
              { type: 'min', value: 1, message: 'Mood score must be at least 1' },
              { type: 'max', value: 100, message: 'Mood score must be at most 100' }
            ]
          },
          {
            name: 'emotions',
            type: 'array',
            required: false,
            introduced: 'v2',
            description: 'Array of emotions',
            example: ['happy', 'grateful', 'energetic']
          },
          {
            name: 'note',
            type: 'string',
            required: false,
            introduced: 'v2',
            description: 'Optional note about the mood',
            example: 'Had a great therapy session today'
          },
          {
            name: 'triggers',
            type: 'array',
            required: false,
            introduced: 'v2',
            description: 'Mood triggers or influences',
            example: ['work_stress', 'family_support']
          }
        ],
        responseSchema: {
          statusCode: 201,
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              mood_score: { type: 'number' },
              emotions: { type: 'array' },
              created_at: { type: 'string' }
            }
          },
          examples: {
            success: {
              id: 'mood_123',
              mood_score: 75,
              emotions: ['happy', 'grateful'],
              created_at: '2024-01-15T10:30:00Z'
            }
          }
        },
        security: [
          { type: 'bearer', introduced: 'v2' }
        ],
        rateLimit: {
          requests: 10,
          window: 3600, // 1 hour
          burst: 3
        }
      }
    }
  },
  
  v3: {
    version: 'v3',
    isDefault: false,
    isDeprecated: false,
    description: 'Next-generation API with AI-powered insights and enhanced privacy',
    features: [
      'AI-powered mood analysis and insights',
      'Enhanced privacy with zero-knowledge architecture',
      'Real-time crisis detection',
      'Advanced therapy matching algorithms',
      'Personalized wellness recommendations',
      'Group therapy and community features',
      'Enhanced GDPR and CCPA compliance'
    ],
    endpoints: {}
  }
};

export class ApiVersionManager {
  private strategy: VersioningStrategy;
  private defaultVersion: ApiVersion;
  
  constructor(strategy: VersioningStrategy = 'header', defaultVersion: ApiVersion = 'v2') {
    this.strategy = strategy;
    this.defaultVersion = defaultVersion;
  }
  
  // Extract version from request
  public extractVersion(request: ApiRequest): ApiVersion {
    switch (this.strategy) {
      case 'header':
        return this.extractFromHeader(request.headers);
      case 'path':
        return this.extractFromPath(request.endpoint);
      case 'query':
        return this.extractFromQuery(request.query);
      case 'subdomain':
        return this.extractFromSubdomain(request.headers);
      default:
        return this.defaultVersion;
    }
  }
  
  private extractFromHeader(headers: Record<string, string>): ApiVersion {
    const versionHeader = headers['api-version'] || headers['x-api-version'];
    return this.validateVersion(versionHeader);
  }
  
  private extractFromPath(endpoint: string): ApiVersion {
    const pathMatch = endpoint.match(/^\/api\/(v\d+)\//);
    return this.validateVersion(pathMatch?.[1]);
  }
  
  private extractFromQuery(query: Record<string, any>): ApiVersion {
    return this.validateVersion(query.version || query.v);
  }
  
  private extractFromSubdomain(headers: Record<string, string>): ApiVersion {
    const host = headers.host || '';
    const subdomainMatch = host.match(/^(v\d+)\./);
    return this.validateVersion(subdomainMatch?.[1]);
  }
  
  private validateVersion(version: string | undefined): ApiVersion {
    if (version && Object.keys(API_VERSIONS).includes(version)) {
      return version as ApiVersion;
    }
    return this.defaultVersion;
  }
  
  // Version compatibility checks
  public isVersionSupported(version: ApiVersion): boolean {
    const config = API_VERSIONS[version];
    if (!config) return false;
    
    if (config.sunsetDate) {
      const sunsetDate = new Date(config.sunsetDate);
      return new Date() < sunsetDate;
    }
    
    return true;
  }
  
  public isVersionDeprecated(version: ApiVersion): boolean {
    const config = API_VERSIONS[version];
    return config?.isDeprecated || false;
  }
  
  public getDeprecationWarning(version: ApiVersion): DeprecationWarning | null {
    const config = API_VERSIONS[version];
    if (!config?.isDeprecated) return null;
    
    return {
      version,
      message: `API version ${version} is deprecated and will be sunset on ${config.sunsetDate}`,
      deprecationDate: config.deprecationDate || '',
      sunsetDate: config.sunsetDate,
      migrationGuide: `/docs/migration/${version}-to-${this.getRecommendedVersion(version)}`,
      replacement: {
        version: this.getRecommendedVersion(version),
        endpoint: 'Updated endpoint path'
      }
    };
  }
  
  private getRecommendedVersion(currentVersion: ApiVersion): ApiVersion {
    // Return the latest non-deprecated version
    const versions = Object.values(API_VERSIONS)
      .filter(config => !config.isDeprecated)
      .sort((a, b) => b.version.localeCompare(a.version));
    
    return versions[0]?.version || this.defaultVersion;
  }
  
  // Endpoint validation
  public validateEndpoint(version: ApiVersion, endpoint: string, method: string): boolean {
    const config = API_VERSIONS[version];
    if (!config) return false;
    
    const endpointKey = `${method} ${endpoint}`;
    const endpointConfig = config.endpoints[endpointKey];
    
    if (!endpointConfig) return false;
    
    // Check if endpoint is removed in this version
    if (endpointConfig.removed && version >= endpointConfig.removed) {
      return false;
    }
    
    // Check if endpoint is introduced in this version
    return version >= endpointConfig.introduced;
  }
  
  // Request transformation for backward compatibility
  public transformRequest(request: ApiRequest): ApiRequest {
    const version = this.extractVersion(request);
    const endpointKey = `${request.method} ${request.endpoint}`;
    const config = API_VERSIONS[version]?.endpoints[endpointKey];
    
    if (!config) return request;
    
    // Apply version-specific transformations
    const transformedRequest = { ...request };
    
    // Transform parameters based on version changes
    if (transformedRequest.body) {
      transformedRequest.body = this.transformParameters(
        transformedRequest.body,
        config.parameters,
        version
      );
    }
    
    if (transformedRequest.query) {
      transformedRequest.query = this.transformParameters(
        transformedRequest.query,
        config.parameters,
        version
      );
    }
    
    return transformedRequest;
  }
  
  private transformParameters(
    data: Record<string, any>,
    parameters: ParameterDefinition[],
    version: ApiVersion
  ): Record<string, any> {
    const transformed = { ...data };
    
    for (const param of parameters) {
      // Skip parameters not introduced in this version
      if (version < param.introduced) {
        delete transformed[param.name];
        continue;
      }
      
      // Handle deprecated parameters
      if (param.deprecated && version >= param.deprecated) {
        // Migration logic could be implemented here
        console.warn(`Parameter ${param.name} is deprecated in version ${version}`);
      }
    }
    
    return transformed;
  }
  
  // Response transformation
  public transformResponse(response: ApiResponse, version: ApiVersion): ApiResponse {
    const transformedResponse = { ...response };
    
    // Add deprecation warnings
    if (this.isVersionDeprecated(version)) {
      transformedResponse.deprecationWarning = this.getDeprecationWarning(version) || undefined;
      transformedResponse.headers['X-API-Deprecated'] = 'true';
      transformedResponse.headers['X-API-Sunset-Date'] = API_VERSIONS[version].sunsetDate || '';
    }
    
    // Add version information
    transformedResponse.headers['X-API-Version'] = version;
    transformedResponse.headers['X-API-Version-Supported'] = Object.keys(API_VERSIONS).join(',');
    
    return transformedResponse;
  }
  
  // Documentation generation
  public generateApiDoc(version: ApiVersion): any {
    const config = API_VERSIONS[version];
    if (!config) return null;
    
    return {
      openapi: '3.0.0',
      info: {
        title: 'Astral Core Mental Health API',
        version: version,
        description: config.description,
        contact: {
          name: 'API Support',
          email: 'api-support@astralcore.health'
        },
        license: {
          name: 'Proprietary',
          url: 'https://astralcore.health/license'
        }
      },
      servers: [
        {
          url: `https://api.astralcore.health/${version}`,
          description: `${version} server`
        }
      ],
      paths: this.generatePathsDoc(config.endpoints),
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        }
      }
    };
  }
  
  private generatePathsDoc(endpoints: Record<string, EndpointVersion>): any {
    const paths: any = {};
    
    for (const [key, endpoint] of Object.entries(endpoints)) {
      const [method, path] = key.split(' ');
      
      if (!paths[path]) {
        paths[path] = {};
      }
      
      paths[path][method.toLowerCase()] = {
        summary: `${method} ${path}`,
        description: endpoint.changes.length > 0 
          ? `Changes: ${endpoint.changes.map(c => c.description).join(', ')}`
          : 'No recent changes',
        parameters: endpoint.parameters.map(param => ({
          name: param.name,
          in: method === 'GET' ? 'query' : 'body',
          required: param.required,
          description: param.description,
          schema: {
            type: param.type,
            example: param.example
          }
        })),
        responses: {
          [endpoint.responseSchema.statusCode]: {
            description: 'Success',
            content: {
              'application/json': {
                schema: endpoint.responseSchema.schema,
                examples: endpoint.responseSchema.examples
              }
            }
          }
        },
        security: endpoint.security.map(sec => ({ [sec.type]: sec.scope || [] }))
      };
    }
    
    return paths;
  }
  
  // Migration helpers
  public getMigrationGuide(fromVersion: ApiVersion, toVersion: ApiVersion): MigrationGuide | null {
    const fromConfig = API_VERSIONS[fromVersion];
    const toConfig = API_VERSIONS[toVersion];
    
    if (!fromConfig || !toConfig) return null;
    
    const breakingChanges = toConfig.breakingChanges || [];
    const newFeatures = toConfig.features.filter(
      feature => !fromConfig.features.includes(feature)
    );
    
    return {
      title: `Migrate from ${fromVersion} to ${toVersion}`,
      description: `This guide helps you upgrade from API ${fromVersion} to ${toVersion}`,
      steps: [
        'Review breaking changes below',
        'Update your API version headers or URLs',
        'Test authentication flow changes',
        'Update request/response handling',
        'Deploy and monitor for issues'
      ],
      codeExamples: [],
      estimatedTime: breakingChanges.length > 0 ? '2-4 hours' : '30-60 minutes'
    };
  }
  
  // Rate limiting
  public getRateLimitForEndpoint(version: ApiVersion, endpoint: string, method: string): RateLimitConfig | null {
    const config = API_VERSIONS[version];
    const endpointKey = `${method} ${endpoint}`;
    return config?.endpoints[endpointKey]?.rateLimit || null;
  }
  
  // Health check
  public getVersionHealth(): Record<ApiVersion, { status: 'healthy' | 'deprecated' | 'sunset'; details: string }> {
    const health: any = {};
    
    for (const [version, config] of Object.entries(API_VERSIONS)) {
      if (config.sunsetDate && new Date() > new Date(config.sunsetDate)) {
        health[version] = {
          status: 'sunset',
          details: `Version sunset on ${config.sunsetDate}`
        };
      } else if (config.isDeprecated) {
        health[version] = {
          status: 'deprecated',
          details: `Deprecated since ${config.deprecationDate}, sunset on ${config.sunsetDate}`
        };
      } else {
        health[version] = {
          status: 'healthy',
          details: 'Active and supported'
        };
      }
    }
    
    return health;
  }
}