import { Amplify } from 'aws-amplify';
import * as amplify from 'aws-amplify/auth';
import { authStore } from '$lib/stores/auth_store';
import { apiClient } from '$lib/services/api_client';
import { getEntryPoint, refreshCapabilities } from '$lib/services/entry_point_provider';
import { logger } from '$lib/logging/logger';
import { AuthError, SignInStep, type User } from './types';
import type { SignInParams, SignUpParams, ConfirmSignUpParams, ResetPasswordParams, ConfirmResetPasswordParams } from './types';
import WebConfigurationStore from '$lib/config/web_config_store';
import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';

/**
 * User response from API with HAL structure
 */
interface UserResponse extends HalObject {
    userId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
}

// Amplify configuration will be loaded asynchronously
let amplifyConfigured = false;

async function ensureAmplifyConfigured() {
    if (amplifyConfigured) return;

    const config = await WebConfigurationStore.getConfig();

    // Configure Amplify v6 with cognito-local endpoint for local development
    const amplifyConfig: any = {
        Auth: {
            Cognito: {
                region: config.aws.region,
                userPoolId: config.cognito.user_pool_id,
                userPoolClientId: config.cognito.client_id,
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
        },
    };

    // Use cognito-local endpoint if configured (local development)
    if (config.cognito.endpoint_url) {
        amplifyConfig.Auth.Cognito.endpoint = config.cognito.endpoint_url;
    } else if (config.cognito.identity_pool_id) {
        amplifyConfig.Auth.Cognito.identityPoolId = config.cognito.identity_pool_id;
    }

    logger.debug('Configuring Amplify', {
        context: 'AUTH',
        region: amplifyConfig.Auth.Cognito.region,
        userPoolId: amplifyConfig.Auth.Cognito.userPoolId,
        clientId: amplifyConfig.Auth.Cognito.userPoolClientId,
        endpoint: amplifyConfig.Auth.Cognito.endpoint || 'default (AWS)',
        timestamp: new Date().toISOString()
    });

    Amplify.configure(amplifyConfig);
    amplifyConfigured = true;

    logger.debug('Amplify configured successfully', { context: 'AUTH' });
}

async function federateSession(authSession: amplify.AuthSession): Promise<User> {
    try {
        const entryPoint = getEntryPoint();

        // Debug: Check what templates are available
        const root = await entryPoint.fetch();
        logger.debug('Entry point templates available', {
            templates: Object.keys(root._templates || {}),
            authenticated: root.authenticated,
            hasVerify: !!root._templates?.verify,
            hasFederate: !!root._templates?.federate
        });

        // Discover federation endpoint
        const federateHref = await entryPoint.getTemplateTarget('federate');
        if (!federateHref) {
            throw new Error('Session federation not available from API. Please contact support.');
        }

        logger.debug('Federating Cognito session to hypermedia API', {
            context: 'SESSION_FEDERATION',
            federateHref,
            hasIdToken: !!authSession.tokens?.idToken,
            hasAccessToken: !!authSession.tokens?.accessToken
        });

        const sessionKey = crypto.randomUUID().replace(/-/g, "").toLowerCase();
        const cognitoToken = authSession.tokens?.idToken?.toString();

        if (!cognitoToken) {
            throw new Error('No Cognito ID token available');
        }

        const payload = authSession.tokens?.idToken?.payload;
        const federateRequest = {
            sessionKey,
            email: payload?.email as string,
            firstName: (payload?.given_name as string) || "",
            lastName: (payload?.family_name as string) || "",
        };
        logger.debug('Federation request', { federateRequest });

        // Call the hypermedia API federate endpoint
        try {
            const response = await apiClient.request<UserResponse>(federateHref, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${cognitoToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(federateRequest),
            });

            logger.debug('Session federated with hypermedia API', {
                hasAccess: !!response._embedded?.access,
                hasSessionToken: !!response._embedded?.access?.sessionToken
            });

            // Refresh capabilities now that we're authenticated
            await refreshCapabilities();

            logger.debug('Capabilities refreshed after federation');

            // HAL response: properties are at root level with _links and _embedded
            return {
                username: response.userId || '',
                email: response.email || '',
                firstName: response.firstName || '',
                lastName: response.lastName || '',
                name: `${response.firstName || ''} ${response.lastName || ''}`,
                links: response._links,
                authContext: response._embedded?.access,
            };
        } catch (error) {
            logger.error('API federation failed', { error });
            throw new Error(`Failed to federate with hypermedia API: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    } catch (error) {
        logger.error('Authorization failed', {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : 'Unknown',
            errorStack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}

export async function authorize(): Promise<User> {
    try {
        await ensureAmplifyConfigured();
        await amplify.getCurrentUser();

        const authSession = await amplify.fetchAuthSession();
        const user = await federateSession(authSession);
        authStore.setUser(null); // Will be updated by federate_session
        return user;
    } catch (error) {
        if (error instanceof amplify.AuthError) {
            switch (error.name) {
                case 'UserUnAuthenticatedException':
                    throw new AuthError({ name: 'NotAuthenticated', message: 'User not authenticated' });
                default:
                    throw new AuthError(error);
            }
        }
        throw error;
    }
}

export async function verifySession(): Promise<User> {
    try {
        const entryPoint = getEntryPoint();

        // Discover verification endpoint
        const verifyHref = await entryPoint.getTemplateTarget('verify');
        if (!verifyHref) {
            throw new AuthError({
                name: 'VerifyNotAvailable',
                message: 'Session verification not available - please sign in again'
            });
        }

        logger.debug('Discovered verification endpoint', { verifyHref });

        const response = await apiClient.request<UserResponse>(verifyHref, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        logger.debug('Session verified with hypermedia API', {
            hasResponse: !!response,
            hasAccess: !!response._embedded?.access
        });

        // HAL response: properties are at root level with _links and _embedded
        const verifiedUser: User = {
            username: response.userId || '',
            email: response.email || '',
            firstName: response.firstName || '',
            lastName: response.lastName || '',
            name: `${response.firstName || ''} ${response.lastName || ''}`,
            links: response._links,
            authContext: response._embedded?.access,
        };

        return verifiedUser;

    } catch (error) {
        logger.error('Session verification failed', { error });

        if (error instanceof Error && error.name === 'ApiClientError') {
            throw new AuthError({
                name: 'SessionVerificationFailed',
                message: 'Session verification failed - please sign in again'
            });
        }

        if (error instanceof AuthError) {
            throw error;
        }

        throw new AuthError({
            name: 'SessionVerificationError',
            message: `Session verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}

async function revokeSession(sessionToken: string | undefined): Promise<void> {
    try {
        const entryPoint = getEntryPoint();

        logger.debug('Revoking hypermedia API session', {
            hasSessionToken: !!sessionToken
        });

        if (!sessionToken) {
            logger.warn('No session token available for revocation');
            return;
        }

        const revokeHref = await entryPoint.getTemplateTarget('revoke');
        if (!revokeHref) {
            logger.warn('Revoke endpoint not available from API - continuing with sign out');
            return;
        }

        try {
            logger.debug('Calling revoke endpoint with SessionToken', { revokeHref });

            await apiClient.request(revokeHref, {
                method: 'POST',
                headers: {
                    'Authorization': `SessionToken ${sessionToken}`,
                    'Content-Type': 'application/json',
                },
            });

            logger.debug('Session revoked with hypermedia API');

            await refreshCapabilities();

            logger.debug('Capabilities refreshed to unauthenticated state');
        } catch (error) {
            logger.warn('API revoke failed', { error });
        }
    } catch (error) {
        logger.error('Revoke session failed', { error });
    }
}

export async function signUp(params: SignUpParams): Promise<SignInStep | undefined> {
    try {
        await ensureAmplifyConfigured();
        const { nextStep } = await amplify.signUp({
            username: params.email,
            password: params.password,
            options: {
                userAttributes: {
                    email: params.email,
                    given_name: params.firstName,
                    family_name: params.lastName,
                    name: `${params.firstName} ${params.lastName}`,
                },
            },
        });

        switch (nextStep.signUpStep) {
            case 'CONFIRM_SIGN_UP':
                return SignInStep.CONFIRM_SIGNUP;
            case 'DONE':
                return SignInStep.SIGNIN;
            default:
                throw new Error(`Unexpected sign up step: ${nextStep.signUpStep}`);
        }
    } catch (error) {
        if (error instanceof amplify.AuthError) {
            switch (error.name) {
                case 'UserNotConfirmedException':
                    return SignInStep.CONFIRM_SIGNUP;
                case 'PasswordResetRequiredException':
                    return SignInStep.RESET_PASSWORD;
                default:
                    logger.error('Authentication error', { error });
                    throw new AuthError(error);
            }
        }

        logger.error('Unexpected error during sign up', { error });
        throw error;
    }
}

export async function confirmSignUp(params: ConfirmSignUpParams): Promise<SignInStep | undefined> {
    try {
        const { nextStep } = await amplify.confirmSignUp({
            username: params.email,
            confirmationCode: params.confirmationCode,
        });

        switch (nextStep.signUpStep) {
            case 'DONE':
                return SignInStep.SIGNIN;
        }
    } catch (error) {
        logger.error('Unexpected error during confirm sign up', { error });
        throw error;
    }
}

export async function resendConfirmationCode(email: string) {
    await amplify.resendSignUpCode({ username: email || '' });
}

export async function resetPassword(params: ResetPasswordParams) {
    const result = await amplify.resetPassword({ username: params.email });
    logger.debug('Password reset initiated', { hasResult: !!result });
}

export async function confirmResetPassword(params: ConfirmResetPasswordParams) {
    try {
        logger.debug('Confirming password reset');
        await amplify.confirmResetPassword({
            username: params.email || '',
            confirmationCode: params.confirmationCode,
            newPassword: params.newPassword,
        });
    } catch (error) {
        if (error instanceof amplify.AuthError) {
            throw new AuthError(error);
        }

        logger.error('Unexpected error during confirm reset password', { error });
        throw error;
    }
}

export async function signIn(params: SignInParams): Promise<SignInStep | undefined> {
    try {
        await ensureAmplifyConfigured();
        await amplify.signOut();

        const { nextStep } = await amplify.signIn({
            username: params.email,
            password: params.password,
            options: {
                authFlowType: 'USER_PASSWORD_AUTH'
            }
        });

        switch (nextStep.signInStep) {
            case 'CONFIRM_SIGN_UP':
                return SignInStep.CONFIRM_SIGNUP;
            case 'RESET_PASSWORD':
                return SignInStep.RESET_PASSWORD;
            case 'DONE':
                const authSession = await amplify.fetchAuthSession();
                const user = await federateSession(authSession);
                authStore.setUser(user);
                return SignInStep.COMPLETED;
            default:
                throw new Error(`Unexpected sign in step: ${nextStep.signInStep}`);
        }
    } catch (error) {
        if (error instanceof amplify.AuthError) {
            switch (error.name) {
                case 'UserNotConfirmedException':
                    return SignInStep.CONFIRM_SIGNUP;
                case 'PasswordResetRequiredException':
                    return SignInStep.RESET_PASSWORD;
                default:
                    throw new AuthError(error);
            }
        }

        logger.error('Unexpected error during sign in', { error });
        throw error;
    }
}

export async function signOut() {
    try {
        logger.debug('Sign out initiated');

        // Get current auth state
        const authState = await new Promise<any>((resolve) => {
            const unsubscribe = authStore.subscribe(value => {
                unsubscribe();
                resolve(value);
            });
        });

        const sessionId = authState.user?.authContext?.sessionId;
        logger.debug('Extracted sessionId', {
            hasSessionId: !!sessionId
        });

        if (sessionId) {
            await revokeSession(sessionId);
        } else {
            logger.warn('No sessionId found in user context, skipping revoke');
        }
    } catch (error) {
        logger.warn('Error during signout revoke', { error });
    }

    await amplify.signOut();
    authStore.signOut();
}
