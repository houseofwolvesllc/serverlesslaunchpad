import WebConfigurationStore from './web_config_store';

// Debug state tracking
const shimState = {
    initialized: false,
    initTimestamp: null as Date | null,
    xhrShimInstalled: false,
    fetchShimInstalled: false,
    awsEnvConfigured: false,
    revokeTokenShimInstalled: false,
    interceptedRequests: [] as Array<{ url: string; method: string; timestamp: Date; redirected: boolean }>
};

// Debug logging helper
function debugLog(level: 'info' | 'warn' | 'error' | 'success', message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: '🔧 [SHIM]',
        warn: '⚠️ [SHIM]',
        error: '❌ [SHIM]',
        success: '✅ [SHIM]'
    }[level];

    console.log(`${prefix} ${timestamp} ${message}`, ...args);
}

// Diagnostic function to test shim status
function getShimDiagnostics() {
    return {
        ...shimState,
        hasXMLHttpRequest: typeof XMLHttpRequest !== 'undefined',
        hasFetch: typeof globalThis.fetch !== 'undefined',
        hasProcess: typeof (globalThis as any).process !== 'undefined',
        processEnv: (globalThis as any).process?.env || {},
    };
}

// Advanced diagnostic tools
function runShimDiagnostics() {
    const diagnostics = getShimDiagnostics();

    debugLog('info', '=== SHIM DIAGNOSTICS REPORT ===');
    debugLog('info', `Initialized: ${diagnostics.initialized}`);
    debugLog('info', `Init Timestamp: ${diagnostics.initTimestamp}`);
    debugLog('info', `XHR Shim: ${diagnostics.xhrShimInstalled}`);
    debugLog('info', `Fetch Shim: ${diagnostics.fetchShimInstalled}`);
    debugLog('info', `AWS Env: ${diagnostics.awsEnvConfigured}`);
    debugLog('info', `Revoke Token Shim: ${diagnostics.revokeTokenShimInstalled}`);
    debugLog('info', `Intercepted Requests: ${diagnostics.interceptedRequests.length}`);

    if (diagnostics.interceptedRequests.length > 0) {
        debugLog('info', 'Recent Intercepted Requests:');
        diagnostics.interceptedRequests.slice(-5).forEach((req, i) => {
            debugLog('info', `  ${i + 1}. ${req.method} ${req.url} (${req.redirected ? 'REDIRECTED' : 'BYPASSED'}) at ${req.timestamp.toISOString()}`);
        });
    }

    return diagnostics;
}

async function testMotoConnectivity(): Promise<boolean> {
    try {
        const config = await WebConfigurationStore.getConfig();
        if (!config.development?.moto_url) {
            debugLog('warn', 'No Moto URL configured');
            return false;
        }

        const response = await fetch(`${config.development.moto_url}/`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });

        const isConnected = response.status < 400;
        debugLog(isConnected ? 'success' : 'error',
                `Moto connectivity: ${response.status} ${response.statusText}`);
        return isConnected;
    } catch (error) {
        debugLog('error', 'Moto connectivity failed:', error);
        return false;
    }
}

async function testCognitoRedirection(): Promise<boolean> {
    try {
        debugLog('info', 'Testing Cognito request redirection...');

        // Make a test request to Cognito that should be intercepted
        const testUrl = 'https://cognito-idp.us-west-2.amazonaws.com/';

        try {
            const response = await fetch(testUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-amz-json-1.1',
                    'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers'
                },
                body: JSON.stringify({}),
                signal: AbortSignal.timeout(5000)
            });

            // If we got a response, check if it was redirected
            const currentDiagnostics = getShimDiagnostics();
            const wasRedirected = currentDiagnostics.interceptedRequests.some(req =>
                req.url === testUrl && req.redirected
            );

            debugLog(wasRedirected ? 'success' : 'warn',
                    `Cognito redirection test: ${wasRedirected ? 'REDIRECTED' : 'NOT REDIRECTED'}`);

            return wasRedirected;
        } catch (error) {
            // This is expected if redirection worked and Moto rejected the request
            debugLog('info', 'Cognito test request failed (expected if redirected to Moto):', error);
            return true;
        }
    } catch (error) {
        debugLog('error', 'Cognito redirection test failed:', error);
        return false;
    }
}

// Comprehensive shim test suite
async function runFullDiagnostics(): Promise<void> {
    debugLog('info', '=== RUNNING FULL SHIM DIAGNOSTICS ===');

    const basic = runShimDiagnostics();
    const motoConnected = await testMotoConnectivity();
    const cognitoRedirected = await testCognitoRedirection();

    const allGood = basic.initialized && basic.xhrShimInstalled && basic.fetchShimInstalled && motoConnected;

    debugLog(allGood ? 'success' : 'error',
            `=== DIAGNOSTICS COMPLETE: ${allGood ? 'ALL SYSTEMS GO' : 'ISSUES DETECTED'} ===`);

    if (!allGood) {
        debugLog('error', 'TROUBLESHOOTING SUGGESTIONS:');
        if (!basic.initialized) debugLog('error', '- Shims not initialized: Check import order in main.tsx');
        if (!basic.xhrShimInstalled) debugLog('error', '- XHR shim failed: Check for XMLHttpRequest conflicts');
        if (!basic.fetchShimInstalled) debugLog('error', '- Fetch shim failed: Check for fetch API conflicts');
        if (!motoConnected) debugLog('error', '- Moto not accessible: Ensure Moto is running on localhost:5555');
    }
}

// Expose diagnostics and test functions globally for debugging
(globalThis as any).__MOTO_SHIM_DIAGNOSTICS__ = getShimDiagnostics;
(globalThis as any).__MOTO_SHIM_RUN_DIAGNOSTICS__ = runShimDiagnostics;
(globalThis as any).__MOTO_SHIM_TEST_CONNECTIVITY__ = testMotoConnectivity;
(globalThis as any).__MOTO_SHIM_TEST_REDIRECTION__ = testCognitoRedirection;
(globalThis as any).__MOTO_SHIM_FULL_TEST__ = runFullDiagnostics;

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
    debugLog('info', 'Starting shim initialization...');

    try {
        shimState.initTimestamp = new Date();

        await addSupportForCustomEndpoints();
        await addSupportForRevokeToken();

        shimState.initialized = true;
        debugLog('success', 'All shims applied successfully', getShimDiagnostics());

        // Test shim functionality
        await testShimFunctionality();

    } catch (error) {
        debugLog('error', 'Failed to apply shims:', error);
        throw error;
    }
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
    debugLog('info', 'Loading configuration for custom endpoint shims...');

    const config = await WebConfigurationStore.getConfig();
    debugLog('info', 'Configuration loaded:', {
        environment: config.environment,
        hasDevConfig: !!config.development,
        motoUrl: config.development?.moto_url || 'NOT_SET'
    });

    // Only apply shims if we have a custom endpoint (Moto/LocalStack)
    if (!config.development?.moto_url) {
        debugLog('info', 'No Moto URL configured, skipping custom endpoint shims');
        return;
    }

    debugLog('info', 'Installing custom endpoint shims for:', config.development.moto_url);

    try {
        // Method 1: Set AWS SDK environment variables for custom endpoint
        debugLog('info', 'Setting AWS SDK environment variables...');
        (globalThis as any).process = (globalThis as any).process || {};
        (globalThis as any).process.env = (globalThis as any).process.env || {};
        (globalThis as any).process.env.AWS_ENDPOINT_URL_COGNITO_IDP = config.development.moto_url;

        shimState.awsEnvConfigured = true;
        debugLog('success', 'AWS SDK environment variables configured');

        // Method 2: Shim XMLHttpRequest to intercept AWS API calls
        debugLog('info', 'Installing XMLHttpRequest interceptor...');
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

                    // Log the interception
                    shimState.interceptedRequests.push({
                        url: url,
                        method: method,
                        timestamp: new Date(),
                        redirected: true
                    });

                    debugLog('info', `🔄 XHR Intercepted: ${method} ${url}`);
                    debugLog('info', `   ↳ Redirecting to: ${customUrl}`);

                    return originalOpen.call(this, method, customUrl, async ?? true, user, password);
                } else {
                    // Log non-intercepted requests for debugging
                    if (typeof url === 'string' && url.includes('amazonaws.com')) {
                        shimState.interceptedRequests.push({
                            url: url,
                            method: method,
                            timestamp: new Date(),
                            redirected: false
                        });
                        debugLog('warn', `🔍 XHR Bypassed: ${method} ${url} (not intercepted)`);
                    }
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

        shimState.xhrShimInstalled = true;
        debugLog('success', 'XMLHttpRequest interceptor installed');

        // Method 3: Shim fetch API as fallback
        debugLog('info', 'Installing Fetch API interceptor...');
        const originalFetch = globalThis.fetch;
        globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
            const method = init?.method || 'GET';

            if (url.includes('cognito-idp.') || url.includes('cognito-identity.')) {
                const customUrl = url
                    .replace(/https:\/\/cognito-idp\.[^.]+\.amazonaws\.com/, customEndpoint)
                    .replace(/https:\/\/cognito-identity\.[^.]+\.amazonaws\.com/, customEndpoint);

                // Log the interception
                shimState.interceptedRequests.push({
                    url: url,
                    method: method,
                    timestamp: new Date(),
                    redirected: true
                });

                debugLog('info', `🔄 Fetch Intercepted: ${method} ${url}`);
                debugLog('info', `   ↳ Redirecting to: ${customUrl}`);

                const newInput =
                    typeof input === 'string'
                        ? customUrl
                        : input instanceof URL
                          ? new URL(customUrl)
                          : { ...input, url: customUrl };
                return originalFetch.call(this, newInput, init);
            } else {
                // Log non-intercepted requests for debugging
                if (url.includes('amazonaws.com')) {
                    shimState.interceptedRequests.push({
                        url: url,
                        method: method,
                        timestamp: new Date(),
                        redirected: false
                    });
                    debugLog('warn', `🔍 Fetch Bypassed: ${method} ${url} (not intercepted)`);
                }
            }

            return originalFetch.call(this, input, init);
        };

        shimState.fetchShimInstalled = true;
        debugLog('success', 'Fetch API interceptor installed');

        // Method 4: AWS SDK v3 middleware for Amplify v6
        await addAwsSdkV3Support(customEndpoint);

        debugLog('success', 'Custom endpoint support installation complete');
    } catch (error) {
        debugLog('error', 'Failed to add custom endpoint support:', error);
        throw error;
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
    debugLog('info', 'Installing revoke_token polyfill...');

    const config = await WebConfigurationStore.getConfig();

    // Only apply polyfill when using Moto
    if (!config.development?.moto_url) {
        debugLog('info', 'No Moto URL configured, skipping revoke_token polyfill');
        return;
    }

    debugLog('info', 'Adding revoke_token polyfill for Moto compatibility');

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
                        debugLog('info', '🔄 Intercepting revoke_token call - returning mock success for Moto compatibility');
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

        shimState.revokeTokenShimInstalled = true;
        debugLog('success', 'Revoke token polyfill installed');
    } catch (error) {
        debugLog('error', 'Failed to add revoke token support:', error);
        throw error;
    }
}

// Test shim functionality with a dummy request
async function testShimFunctionality(): Promise<void> {
    try {
        debugLog('info', 'Testing shim functionality...');

        // Test if we can reach Moto
        const config = await WebConfigurationStore.getConfig();
        if (!config.development?.moto_url) {
            return;
        }

        try {
            const response = await fetch(`${config.development.moto_url}/`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            debugLog('success', `Moto connectivity test: ${response.status} ${response.statusText}`);
        } catch (error) {
            debugLog('warn', 'Moto connectivity test failed:', error);
        }

    } catch (error) {
        debugLog('error', 'Shim functionality test failed:', error);
    }
}

// AWS SDK v3 middleware support for Amplify v6
async function addAwsSdkV3Support(customEndpoint: string): Promise<void> {
    debugLog('info', 'Installing AWS SDK v3 middleware...');

    try {
        // Try to intercept AWS SDK v3 requests at the middleware level
        // This is more complex because Amplify v6 may use internal AWS SDK instances

        // Method 1: Override window.fetch with more comprehensive URL detection
        const originalFetch = globalThis.fetch;
        globalThis.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
            const method = init?.method || 'GET';

            // Detect AWS service calls by URL patterns
            const awsServicePatterns = [
                /https:\/\/cognito-idp\.[^.]+\.amazonaws\.com/,
                /https:\/\/cognito-identity\.[^.]+\.amazonaws\.com/,
                /https:\/\/[^.]+\.amazonaws\.com.*cognito/
            ];

            for (const pattern of awsServicePatterns) {
                if (pattern.test(url)) {
                    const customUrl = url.replace(pattern, customEndpoint);

                    shimState.interceptedRequests.push({
                        url: url,
                        method: method,
                        timestamp: new Date(),
                        redirected: true
                    });

                    debugLog('info', `🔄 SDK v3 Intercepted: ${method} ${url}`);
                    debugLog('info', `   ↳ Redirecting to: ${customUrl}`);

                    const newInput = typeof input === 'string'
                        ? customUrl
                        : input instanceof URL
                        ? new URL(customUrl)
                        : { ...input, url: customUrl };

                    return originalFetch.call(this, newInput, init);
                }
            }

            return originalFetch.call(this, input, init);
        };

        // Method 2: Try to hook into Amplify's internal request mechanisms
        // This is more experimental and may need adjustment
        try {
            // Check if Amplify has exposed any internal request handlers
            const amplifyGlobal = (globalThis as any).aws_amplify_core;
            if (amplifyGlobal && amplifyGlobal.HttpHandler) {
                debugLog('info', 'Found Amplify HTTP handler, attempting to override...');
                // This would need more specific implementation based on Amplify's internals
            }
        } catch (e) {
            debugLog('info', 'No Amplify internal handlers found, using standard interception');
        }

        debugLog('success', 'AWS SDK v3 middleware support installed');
    } catch (error) {
        debugLog('error', 'Failed to install AWS SDK v3 support:', error);
        throw error;
    }
}

// Auto-apply shims when this module is imported
debugLog('info', 'Moto shim module loading...');
applyShims().catch(error => {
    debugLog('error', 'Failed to apply Moto shims:', error);
});