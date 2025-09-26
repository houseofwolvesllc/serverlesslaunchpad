import WebConfigurationLoader from './web_config_loader';

/**
 * AWS Amplify v6 + Moto Compatibility Shims
 *
 * This module provides shims to enable AWS Amplify v6 to work with Moto (AWS service emulator)
 * for local development. These shims are only applied when using a custom Cognito endpoint.
 *
 * Background:
 * - AWS Amplify v6 removed native support for custom endpoints (unlike v5)
 * - Moto doesn't implement all AWS Cognito API actions (e.g., revoke_token)
 * - These shims bridge the compatibility gap by intercepting and redirecting API calls
 *
 * Production Impact: NONE - only applies when custom endpoints are configured
 */

/**
 * Apply environment-specific shims for AWS Amplify v6 compatibility with local development
 *
 * This function contains complex shimming logic that's isolated from the main application code.
 * These shims are necessary because:
 *
 * 1. AWS Amplify v6 removed native support for custom endpoints (unlike v5)
 * 2. We need to redirect AWS Cognito API calls to local Moto/LocalStack instances
 * 3. This enables full offline development without hitting real AWS services
 *
 * The shims work by intercepting network requests at multiple layers:
 * - Environment variables for AWS SDK
 * - XMLHttpRequest shimming for older AWS SDK versions
 * - Fetch API shimming for modern implementations
 */
export async function applyShims(): Promise<void> {
    await addSupportForCustomEndpoints();
    await addSupportForRevokeToken();
}

/**
 * Shim AWS Amplify v6 to support custom endpoints for local development
 *
 * AWS Amplify v6 removed the ability to configure custom endpoints directly.
 * This shim intercepts AWS API calls and redirects them to Moto/LocalStack.
 *
 * Production impact: NONE - only applies when custom endpoint is configured
 */
async function addSupportForCustomEndpoints(): Promise<void> {
    const config = await WebConfigurationLoader.load();

    // Only apply shims if we have a custom endpoint (Moto/LocalStack)
    if (!config.development?.moto_url) {
        return;
    }

    console.log('🔧 Adding support for custom endpoints:', config.development.moto_url);

    try {
        // Method 1: Set AWS SDK environment variables for custom endpoint
        (globalThis as any).process = (globalThis as any).process || {};
        (globalThis as any).process.env = (globalThis as any).process.env || {};
        (globalThis as any).process.env.AWS_ENDPOINT_URL_COGNITO_IDP = config.development.moto_url;

        // Method 2: Shim XMLHttpRequest to intercept AWS API calls
        const originalXMLHttpRequest = XMLHttpRequest;
        const customEndpoint = config.development.moto_url;

        (globalThis as any).XMLHttpRequest = function () {
            const xhr = new originalXMLHttpRequest();
            const originalOpen = xhr.open;

            xhr.open = function (method: string, url: string, async?: boolean, user?: string | null, password?: string | null) {
                // Intercept Cognito API calls and redirect to Moto
                if (typeof url === 'string' && (url.includes('cognito-idp.') || url.includes('cognito-identity.'))) {
                    const customUrl = url
                        .replace(/https:\/\/cognito-idp\.[^.]+\.amazonaws\.com/, customEndpoint)
                        .replace(/https:\/\/cognito-identity\.[^.]+\.amazonaws\.com/, customEndpoint);
                    console.log(`🔄 Redirecting Cognito API call from ${url} to ${customUrl}`);
                    return originalOpen.call(this, method, customUrl, async ?? true, user, password);
                }
                return originalOpen.call(this, method, url, async ?? true, user, password);
            };

            return xhr;
        };

        // Copy static properties
        Object.setPrototypeOf((globalThis as any).XMLHttpRequest, originalXMLHttpRequest);
        Object.defineProperty((globalThis as any).XMLHttpRequest, 'prototype', {
            value: originalXMLHttpRequest.prototype,
            writable: false,
        });

        // Method 3: Shim fetch API as fallback
        const originalFetch = globalThis.fetch;
        globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

            if (url.includes('cognito-idp.') || url.includes('cognito-identity.')) {
                const customUrl = url
                    .replace(/https:\/\/cognito-idp\.[^.]+\.amazonaws\.com/, customEndpoint)
                    .replace(/https:\/\/cognito-identity\.[^.]+\.amazonaws\.com/, customEndpoint);
                console.log(`🔄 Redirecting fetch call from ${url} to ${customUrl}`);
                const newInput =
                    typeof input === 'string'
                        ? customUrl
                        : input instanceof URL
                          ? new URL(customUrl)
                          : { ...input, url: customUrl };
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
async function addSupportForRevokeToken(): Promise<void> {
    const config = await WebConfigurationLoader.load();

    // Only apply polyfill when using Moto
    if (!config.development?.moto_url) {
        return;
    }

    console.log('🔧 Adding support for revoke_token (Moto polyfill)');

    try {
        // Intercept fetch requests and handle revoke_token action
        const originalFetch = globalThis.fetch;
        globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

            // Check if this is a revoke_token request to Moto
            if (url.includes(config.development!.moto_url!) && init?.body) {
                try {
                    const body = typeof init.body === 'string' ? init.body : '';
                    if (body.includes('"X-Amz-Target":"AWSCognitoIdentityProviderService.RevokeToken"')) {
                        console.log('🔄 Intercepting revoke_token call - returning success for Moto compatibility');
                        // Return a mock success response that matches AWS Cognito's revoke_token response
                        return Promise.resolve(
                            new Response('{}', {
                                status: 200,
                                statusText: 'OK',
                                headers: {
                                    'Content-Type': 'application/x-amz-json-1.1',
                                    'x-amzn-RequestId': `moto-polyfill-${Date.now()}`,
                                },
                            })
                        );
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

// Auto-apply shims when this module is imported
applyShims().catch(error => {
    console.warn('⚠️ Failed to apply Moto shims:', error);
});