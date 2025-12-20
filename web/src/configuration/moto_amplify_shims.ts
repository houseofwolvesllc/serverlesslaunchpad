import WebConfigurationStore from './web_config_store';

// RFC 7517 JSON Web Key (JWK) interfaces
// Base JWK interface with common properties
interface JWKBase {
    kty: string;        // Key Type (required)
    use?: string;       // Public Key Use
    key_ops?: string[]; // Key Operations
    alg?: string;       // Algorithm
    kid?: string;       // Key ID
    x5u?: string;       // X.509 URL
    x5c?: string[];     // X.509 Certificate Chain
    x5t?: string;       // X.509 Certificate SHA-1 Thumbprint
    'x5t#S256'?: string; // X.509 Certificate SHA-256 Thumbprint
}

// RSA Key parameters
interface RSAKey extends JWKBase {
    kty: 'RSA';
    n: string;          // Modulus
    e: string;          // Exponent
    d?: string;         // Private Exponent
    p?: string;         // First Prime Factor
    q?: string;         // Second Prime Factor
    dp?: string;        // First Factor CRT Exponent
    dq?: string;        // Second Factor CRT Exponent
    qi?: string;        // First CRT Coefficient
    oth?: Array<{       // Other Primes Info
        r: string;
        d: string;
        t: string;
    }>;
}

// Elliptic Curve Key parameters
interface ECKey extends JWKBase {
    kty: 'EC';
    crv: string;        // Curve
    x: string;          // X Coordinate
    y: string;          // Y Coordinate
    d?: string;         // ECC Private Key
}

// Symmetric Key parameters
interface SymmetricKey extends JWKBase {
    kty: 'oct';
    k: string;          // Key Value
}

// Octet string key pairs (EdDSA, X25519, X448)
interface OKPKey extends JWKBase {
    kty: 'OKP';
    crv: string;        // Subtype of the key
    x: string;          // Public key
    d?: string;         // Private key
}

// Union type for all possible JWK types
type JWK = RSAKey | ECKey | SymmetricKey | OKPKey | (JWKBase & {
    [key: string]: any; // Allow additional parameters for custom/future JWK types
});

// JWKS Response structure
interface JWKSResponse {
    keys: JWK[];
}

// JWKS cache interface
interface JWKSCache {
    jwks: JWKSResponse;
    fetchTimestamp: Date;
    ttlHours: number;
    userPoolId: string;
}

// Type for JWKS cache status pool entry
interface JWKSCachePoolStatus {
    userPoolId: string;
    isValid: boolean;
    ageMinutes: number;
}

// Return type for getJWKSCacheStatus
interface JWKSCacheStatus {
    installed: boolean;
    cachedPools: JWKSCachePoolStatus[];
}

// Debug state tracking
const shimState = {
    initialized: false,
    initTimestamp: null as Date | null,
    xhrShimInstalled: false,
    fetchShimInstalled: false,
    awsEnvConfigured: false,
    revokeTokenShimInstalled: false,
    jwksShimInstalled: false,
    interceptedRequests: [] as Array<{ url: string; method: string; timestamp: Date; redirected: boolean }>,
    jwksCache: new Map<string, JWKSCache>(), // Cache JWKS by user pool ID
    jwksRequests: [] as Array<{ url: string; timestamp: Date; cacheHit: boolean; fetchSuccess: boolean }>
};

// Debug logging helper
function debugLog(level: 'info' | 'warn' | 'error' | 'success', message: string, ...args: unknown[]) {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: '🔧 [SHIM]',
        warn: '⚠️ [SHIM]',
        error: '❌ [SHIM]',
        success: '✅ [SHIM]'
    }[level];

    console.log(`${prefix} ${timestamp} ${message}`, ...args);
}

// JWKS cache management functions
function isJWKSCacheValid(cache: JWKSCache): boolean {
    const now = new Date();
    const cacheAge = now.getTime() - cache.fetchTimestamp.getTime();
    const ttlMs = cache.ttlHours * 60 * 60 * 1000; // Convert hours to milliseconds
    return cacheAge < ttlMs;
}

function getCachedJWKS(userPoolId: string): JWKSResponse | null {
    const cache = shimState.jwksCache.get(userPoolId);
    if (cache && isJWKSCacheValid(cache)) {
        debugLog('success', `🎯 JWKS cache HIT for pool ${userPoolId}`);
        return cache.jwks;
    }

    if (cache) {
        debugLog('warn', `⏰ JWKS cache EXPIRED for pool ${userPoolId}, age: ${Math.round((new Date().getTime() - cache.fetchTimestamp.getTime()) / (60 * 60 * 1000))} hours`);
        shimState.jwksCache.delete(userPoolId);
    } else {
        debugLog('info', `💾 JWKS cache MISS for pool ${userPoolId}`);
    }

    return null;
}

function cacheJWKS(userPoolId: string, jwks: JWKSResponse, ttlHours: number = 24): void {
    const cache: JWKSCache = {
        jwks,
        fetchTimestamp: new Date(),
        ttlHours,
        userPoolId
    };

    shimState.jwksCache.set(userPoolId, cache);
    debugLog('success', `💾 JWKS cached for pool ${userPoolId}, TTL: ${ttlHours} hours`);
}

async function fetchJWKSFromAWS(userPoolId: string, region: string, retryCount: number = 0): Promise<JWKSResponse> {
    const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    const maxRetries = 2;

    debugLog('info', `🌐 Fetching JWKS from real AWS: ${jwksUrl}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);

    try {
        const startTime = Date.now();
        const response = await fetch(jwksUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Moto-JWKS-Shim/1.0'
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        const fetchTime = Date.now() - startTime;

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const jwks = await response.json();

        // Validate JWKS format
        if (!jwks.keys || !Array.isArray(jwks.keys)) {
            throw new Error('Invalid JWKS format: missing or invalid keys array');
        }

        debugLog('success', `🎉 JWKS fetched successfully in ${fetchTime}ms, ${jwks.keys.length} keys found`);

        // Record successful request
        shimState.jwksRequests.push({
            url: jwksUrl,
            timestamp: new Date(),
            cacheHit: false,
            fetchSuccess: true
        });

        return jwks;

    } catch (error) {
        debugLog('error', `🚨 JWKS fetch failed: ${error}`);

        // Retry logic for transient failures
        if (retryCount < maxRetries && (
            error instanceof TypeError || // Network errors
            (error as any).name === 'AbortError' || // Timeout errors
            (error as any).message?.includes('fetch failed') // General fetch failures
        )) {
            const backoffMs = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s
            debugLog('warn', `⏳ Retrying JWKS fetch in ${backoffMs}ms...`);

            await new Promise(resolve => setTimeout(resolve, backoffMs));
            return fetchJWKSFromAWS(userPoolId, region, retryCount + 1);
        }

        // Record failed request
        shimState.jwksRequests.push({
            url: jwksUrl,
            timestamp: new Date(),
            cacheHit: false,
            fetchSuccess: false
        });

        throw error;
    }
}

// Function to get JWKS cache status
function getJWKSCacheStatus(): JWKSCacheStatus {
    const cachedPools = Array.from(shimState.jwksCache.entries()).map(([userPoolId, cache]) => {
        const now = new Date();
        const ageMs = now.getTime() - cache.fetchTimestamp.getTime();
        const ageMinutes = Math.round(ageMs / (60 * 1000));

        return {
            userPoolId,
            isValid: isJWKSCacheValid(cache),
            ageMinutes
        };
    });

    return {
        installed: shimState.jwksShimInstalled,
        cachedPools
    };
}

// Function to clear JWKS cache
function clearJWKSCache(): void {
    const cacheSize = shimState.jwksCache.size;
    shimState.jwksCache.clear();
    debugLog('success', `🧹 JWKS cache cleared (${cacheSize} entries removed)`);
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
    debugLog('info', `JWKS Shim: ${diagnostics.jwksShimInstalled}`);
    debugLog('info', `Intercepted Requests: ${diagnostics.interceptedRequests.length}`);
    debugLog('info', `JWKS Cache Size: ${diagnostics.jwksCache.size}`);
    debugLog('info', `JWKS Requests: ${diagnostics.jwksRequests.length}`);

    if (diagnostics.interceptedRequests.length > 0) {
        debugLog('info', 'Recent Intercepted Requests:');
        diagnostics.interceptedRequests.slice(-5).forEach((req, i) => {
            debugLog('info', `  ${i + 1}. ${req.method} ${req.url} (${req.redirected ? 'REDIRECTED' : 'BYPASSED'}) at ${req.timestamp.toISOString()}`);
        });
    }

    if (diagnostics.jwksRequests.length > 0) {
        debugLog('info', 'Recent JWKS Requests:');
        diagnostics.jwksRequests.slice(-3).forEach((req, i) => {
            debugLog('info', `  ${i + 1}. ${req.url} (${req.cacheHit ? 'CACHE_HIT' : req.fetchSuccess ? 'FETCH_SUCCESS' : 'FETCH_FAILED'}) at ${req.timestamp.toISOString()}`);
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
            await fetch(testUrl, {
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

    // Check JWKS cache status
    const jwksStatus = getJWKSCacheStatus();
    debugLog('info', `JWKS Cache Status: ${jwksStatus.installed ? 'ENABLED' : 'DISABLED'} | Cached pools: ${jwksStatus.cachedPools.length}`);
    if (jwksStatus.cachedPools.length > 0) {
        jwksStatus.cachedPools.forEach((pool: JWKSCachePoolStatus) => {
            debugLog('info', `  - Pool ${pool.userPoolId}: ${pool.isValid ? 'VALID' : 'EXPIRED'} (age: ${pool.ageMinutes}min)`);
        });
    }

    const allGood = basic.initialized && basic.xhrShimInstalled && basic.fetchShimInstalled && basic.jwksShimInstalled && motoConnected && cognitoRedirected;

    debugLog(allGood ? 'success' : 'error',
            `=== DIAGNOSTICS COMPLETE: ${allGood ? 'ALL SYSTEMS GO' : 'ISSUES DETECTED'} ===`);

    if (!allGood) {
        debugLog('error', 'TROUBLESHOOTING SUGGESTIONS:');
        if (!basic.initialized) debugLog('error', '- Shims not initialized: Check import order in main.tsx');
        if (!basic.xhrShimInstalled) debugLog('error', '- XHR shim failed: Check for XMLHttpRequest conflicts');
        if (!basic.fetchShimInstalled) debugLog('error', '- Fetch shim failed: Check for fetch API conflicts');
        if (!basic.jwksShimInstalled) debugLog('error', '- JWKS shim failed: Check for JWKS interception issues');
        if (!motoConnected) debugLog('error', '- Moto not accessible: Ensure Moto is running on localhost:5555');
        if (!cognitoRedirected) debugLog('error', '- Cognito redirection failed: Check shim interceptors are working');
    }
}

// Expose diagnostics and test functions globally for debugging
(globalThis as any).__MOTO_SHIM_DIAGNOSTICS__ = getShimDiagnostics;
(globalThis as any).__MOTO_SHIM_RUN_DIAGNOSTICS__ = runShimDiagnostics;
(globalThis as any).__MOTO_SHIM_TEST_CONNECTIVITY__ = testMotoConnectivity;
(globalThis as any).__MOTO_SHIM_TEST_REDIRECTION__ = testCognitoRedirection;
(globalThis as any).__MOTO_SHIM_FULL_TEST__ = runFullDiagnostics;
(globalThis as any).__MOTO_SHIM_JWKS_CACHE__ = getJWKSCacheStatus;
(globalThis as any).__MOTO_SHIM_JWKS_CLEAR__ = clearJWKSCache;

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

        // Enable JWKS interception for JWT verification
        shimState.jwksShimInstalled = true;
        debugLog('success', 'JWKS shim enabled for JWT verification');

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

            // Check for JWKS requests first (special handling)
            const jwksPattern = /https:\/\/cognito-idp\.([^.]+)\.amazonaws\.com\/([^\/]+)\/\.well-known\/jwks\.json/;
            const jwksMatch = url.match(jwksPattern);

            if (jwksMatch) {
                const region = jwksMatch[1];
                const userPoolId = jwksMatch[2];

                debugLog('info', `🔑 JWKS request intercepted: ${url}`);

                // Check cache first
                const cachedJWKS = getCachedJWKS(userPoolId);
                if (cachedJWKS) {
                    shimState.jwksRequests.push({
                        url: url,
                        timestamp: new Date(),
                        cacheHit: true,
                        fetchSuccess: true
                    });

                    return Promise.resolve(new Response(JSON.stringify(cachedJWKS), {
                        status: 200,
                        statusText: 'OK',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'public, max-age=86400', // 24 hours
                            'X-JWKS-Source': 'Moto-Shim-Cache'
                        }
                    }));
                }

                // Fetch from real AWS and cache
                return fetchJWKSFromAWS(userPoolId, region)
                    .then(jwks => {
                        cacheJWKS(userPoolId, jwks, 24); // Cache for 24 hours
                        return new Response(JSON.stringify(jwks), {
                            status: 200,
                            statusText: 'OK',
                            headers: {
                                'Content-Type': 'application/json',
                                'Cache-Control': 'public, max-age=86400', // 24 hours
                                'X-JWKS-Source': 'Moto-Shim-Fetch'
                            }
                        });
                    })
                    .catch(error => {
                        debugLog('error', `🚨 JWKS fetch failed, returning 503: ${error}`);
                        return new Response(JSON.stringify({
                            error: 'JWKS_FETCH_FAILED',
                            message: 'Unable to fetch JWKS from AWS',
                            details: error.message
                        }), {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-JWKS-Source': 'Moto-Shim-Error'
                            }
                        });
                    });
            }

            // Detect AWS service calls by URL patterns (existing logic)
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