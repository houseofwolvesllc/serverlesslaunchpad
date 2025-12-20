export interface EnvironmentConfig {
  apiBaseUrl: string;
  cognito: {
    endpoint?: string; // Moto endpoint
    userPoolId: string;
    userPoolClientId: string;
    identityPoolId: string;
    region: string;
    // Amplify-specific authentication settings
    loginWith: { email: boolean };
    signUpVerificationMethod: "code" | "link";
    userAttributes: { email: { required: boolean } };
    allowGuestAccess: boolean;
    passwordFormat: {
      minLength: number;
      requireLowercase: boolean;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSpecialCharacters: boolean;
    };
    endpoints?: { cognito: string };
  };
  features: {
    mockAuth: boolean; // Enable mock authentication for testing
    debugMode: boolean;
    enableLogging: boolean;
    mfa: boolean;
    analytics: boolean;
    notifications: boolean;
  };
  api: {
    timeout: number;
  };
}

const configs: Record<string, EnvironmentConfig> = {
  development: {
    apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    cognito: {
      endpoint: import.meta.env.VITE_MOTO_URL || import.meta.env.VITE_LOCALSTACK_URL || 'http://localhost:5555',
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-west-2_local',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || 'local_client',
      identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID || 'us-west-2:local',
      region: import.meta.env.VITE_AWS_REGION || 'us-west-2',
      // Amplify-specific authentication settings
      loginWith: { email: true },
      signUpVerificationMethod: 'code',
      userAttributes: { email: { required: true } },
      allowGuestAccess: true,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
      // Add Moto endpoint if configured
      ...((import.meta.env.VITE_MOTO_URL || import.meta.env.VITE_LOCALSTACK_URL) && {
        endpoints: { cognito: import.meta.env.VITE_MOTO_URL || import.meta.env.VITE_LOCALSTACK_URL || 'http://localhost:5555' }
      }),
    },
    features: {
      mockAuth: import.meta.env.VITE_MOCK_AUTH === 'true',
      debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
      enableLogging: import.meta.env.VITE_ENABLE_LOGGING === 'true',
      mfa: import.meta.env.VITE_FEATURE_MFA === 'true',
      analytics: import.meta.env.VITE_FEATURE_ANALYTICS === 'true',
      notifications: import.meta.env.VITE_FEATURE_NOTIFICATIONS !== 'false' // default true
    },
    api: {
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10)
    }
  },
  staging: {
    apiBaseUrl: import.meta.env.VITE_API_URL || 'https://api-staging.serverlesslaunchpad.com',
    cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-west-2_stagingpool',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || 'staging_client',
      identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID || 'us-west-2:staging-id',
      region: 'us-west-2',
      // Amplify-specific authentication settings
      loginWith: { email: true },
      signUpVerificationMethod: 'code',
      userAttributes: { email: { required: true } },
      allowGuestAccess: true,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    },
    features: {
      mockAuth: false,
      debugMode: true,
      enableLogging: true,
      mfa: true,
      analytics: true,
      notifications: true
    },
    api: {
      timeout: 30000
    }
  },
  production: {
    apiBaseUrl: import.meta.env.VITE_API_URL || 'https://api.serverlesslaunchpad.com',
    cognito: {
      userPoolId: 'us-west-2_mvWUwrMK9',
      userPoolClientId: '3j37olsjbth4d10v0s2nortqtv',
      identityPoolId: 'us-west-2:680b19b5-c13b-46b1-8343-8962fc545d69',
      region: 'us-west-2',
      // Amplify-specific authentication settings
      loginWith: { email: true },
      signUpVerificationMethod: 'code',
      userAttributes: { email: { required: true } },
      allowGuestAccess: true,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    },
    features: {
      mockAuth: false,
      debugMode: false,
      enableLogging: false,
      mfa: true,
      analytics: true,
      notifications: true
    },
    api: {
      timeout: 30000
    }
  }
};

export function getConfig(): EnvironmentConfig {
  const env = import.meta.env.MODE || 'development';
  const config = configs[env] || configs.development;
  
  // Log configuration in development mode
  if ((env === 'development' || env === 'moto') && config.features.debugMode) {
    console.group('🔧 Environment Configuration');
    console.log('Environment:', env);
    console.log('API Base URL:', config.apiBaseUrl);
    console.log('Cognito Pool:', config.cognito.userPoolId);
    console.log('Features:', config.features);
    if (config.cognito.endpoint) {
      console.log('Moto Endpoint:', config.cognito.endpoint);
    }
    console.groupEnd();
  }
  
  return config;
}

export function isMoto(): boolean {
  const config = getConfig();
  return !!config.cognito.endpoint;
}

export function isDevelopment(): boolean {
  return import.meta.env.MODE === 'development';
}

export function isProduction(): boolean {
  return import.meta.env.MODE === 'production';
}

/**
 * Apply environment-specific patches for AWS Amplify v6 compatibility with local development
 * 
 * This function contains complex patching logic that's isolated from the main application code.
 * These patches are necessary because:
 * 
 * 1. AWS Amplify v6 removed native support for custom endpoints (unlike v5)
 * 2. We need to redirect AWS Cognito API calls to local Moto/LocalStack instances
 * 3. This enables full offline development without hitting real AWS services
 * 
 * The patches work by intercepting network requests at multiple layers:
 * - Environment variables for AWS SDK
 * - XMLHttpRequest patching for older AWS SDK versions
 * - Fetch API patching for modern implementations
 */
export function applyAmplifyPatches(): void {
  addSupportForCustomEndpoints();
  addSupportForRevokeToken();
}

/**
 * Patch AWS Amplify v6 to support custom endpoints for local development
 * 
 * AWS Amplify v6 removed the ability to configure custom endpoints directly.
 * This patch intercepts AWS API calls and redirects them to Moto/LocalStack.
 * 
 * Production impact: NONE - only applies when custom endpoint is configured
 */
function addSupportForCustomEndpoints(): void {
  const config = getConfig();
  
  // Only apply patches if we have a custom endpoint (Moto/LocalStack)
  if (!config.cognito.endpoint) {
    return;
  }

  console.log('🔧 Adding support for custom endpoints:', config.cognito.endpoint);
  
  try {
    // Method 1: Set AWS SDK environment variables for custom endpoint
    (globalThis as any).process = (globalThis as any).process || {};
    (globalThis as any).process.env = (globalThis as any).process.env || {};
    (globalThis as any).process.env.AWS_ENDPOINT_URL_COGNITO_IDP = config.cognito.endpoint;
    
    // Method 2: Patch XMLHttpRequest to intercept AWS API calls
    const originalXMLHttpRequest = XMLHttpRequest;
    const customEndpoint = config.cognito.endpoint;
    
    (globalThis as any).XMLHttpRequest = function() {
      const xhr = new originalXMLHttpRequest();
      const originalOpen = xhr.open;
      
      xhr.open = function(method: string, url: string, ...args: any[]) {
        // Intercept Cognito API calls and redirect to Moto
        if (typeof url === 'string' && (url.includes('cognito-idp.') || url.includes('cognito-identity.'))) {
          const customUrl = url
            .replace(/https:\/\/cognito-idp\.[^.]+\.amazonaws\.com/, customEndpoint)
            .replace(/https:\/\/cognito-identity\.[^.]+\.amazonaws\.com/, customEndpoint);
          console.log(`🔄 Redirecting Cognito API call from ${url} to ${customUrl}`);
          return originalOpen.call(this, method, customUrl, ...args);
        }
        return originalOpen.call(this, method, url, ...args);
      };
      
      return xhr;
    };
    
    // Copy static properties
    Object.setPrototypeOf((globalThis as any).XMLHttpRequest, originalXMLHttpRequest);
    Object.defineProperty((globalThis as any).XMLHttpRequest, 'prototype', {
      value: originalXMLHttpRequest.prototype,
      writable: false
    });
    
    // Method 3: Patch fetch API as fallback
    const originalFetch = globalThis.fetch;
    globalThis.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      
      if (url.includes('cognito-idp.') || url.includes('cognito-identity.')) {
        const customUrl = url
          .replace(/https:\/\/cognito-idp\.[^.]+\.amazonaws\.com/, customEndpoint)
          .replace(/https:\/\/cognito-identity\.[^.]+\.amazonaws\.com/, customEndpoint);
        console.log(`🔄 Redirecting fetch call from ${url} to ${customUrl}`);
        const newInput = typeof input === 'string' ? customUrl : 
                        input instanceof URL ? new URL(customUrl) :
                        { ...input, url: customUrl };
        return originalFetch.call(this, newInput, init);
      }
      
      return originalFetch.call(this, input, init);
    };
    
    console.log('✅ Custom endpoint support added successfully');
    
  } catch (error) {
    console.warn('⚠️ Failed to add custom endpoint support:', error);
  }
}

/**
 * Polyfill Moto's missing revoke_token implementation
 * 
 * Moto (AWS service emulator) doesn't implement the revoke_token action that
 * AWS Amplify v6 calls during signOut(). This polyfill intercepts those calls
 * and returns a success response to prevent 500 errors.
 * 
 * This maintains the proper production authentication flow while enabling
 * seamless local development with Moto.
 * 
 * Production impact: NONE - only applies when using Moto endpoints
 */
function addSupportForRevokeToken(): void {
  const config = getConfig();
  
  // Only apply polyfill when using Moto
  if (!config.cognito.endpoint) {
    return;
  }

  console.log('🔧 Adding support for revoke_token (Moto polyfill)');
  
  try {
    // Intercept fetch requests and handle revoke_token action
    const originalFetch = globalThis.fetch;
    globalThis.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      
      // Check if this is a revoke_token request to Moto
      if (url.includes(config.cognito.endpoint!) && init?.body) {
        try {
          const body = typeof init.body === 'string' ? init.body : '';
          if (body.includes('"X-Amz-Target":"AWSCognitoIdentityProviderService.RevokeToken"')) {
            console.log('🔄 Intercepting revoke_token call - returning success for Moto compatibility');
            // Return a mock success response that matches AWS Cognito's revoke_token response
            return Promise.resolve(new Response('{}', {
              status: 200,
              statusText: 'OK',
              headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'x-amzn-RequestId': `moto-polyfill-${Date.now()}`
              }
            }));
          }
        } catch (e) {
          // If we can't parse the body, continue with original request
        }
      }
      
      // For all other requests, use the original fetch
      return originalFetch.call(this, input, init);
    };
    
    console.log('✅ Revoke token support added successfully');
    
  } catch (error) {
    console.warn('⚠️ Failed to add revoke token support:', error);
  }
}

// Auto-apply patches when this module is imported
applyAmplifyPatches();