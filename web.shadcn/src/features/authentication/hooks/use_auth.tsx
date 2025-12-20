import { Amplify } from 'aws-amplify';
import * as amplify from 'aws-amplify/auth';
import { useContext } from 'react';
import WebConfigurationStore from '../../../configuration/web_config_store';
import { apiClient } from '../../../services/api.client';
import { getEntryPoint, refreshCapabilities, clearEntryPoint, initializeEntryPoint } from '../../../services/entry_point_provider';
import { AuthenticationContext, AuthError, SignInStep, User } from '../../authentication';
import { logger } from '../../../logging/logger';

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
        // Don't configure identity pool for cognito-local (it doesn't support Cognito Identity)
    } else {
        // Only use identity pool in production with real AWS Cognito
        if (config.cognito.identity_pool_id) {
            amplifyConfig.Auth.Cognito.identityPoolId = config.cognito.identity_pool_id;
        }
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

export const useAuth = function () {
    const { signedInUser, setSignedInUser } = useContext(AuthenticationContext);

    async function authorize(): Promise<User> {
        try {
            await ensureAmplifyConfigured();
            await amplify.getCurrentUser();

            const authSession = await amplify.fetchAuthSession();
            const user = await federateSession(authSession);
            setSignedInUser(user);
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

    async function federateSession(authSession: amplify.AuthSession): Promise<User> {
        try {
            // Ensure entry point is initialized (may have been cleared on logout)
            await initializeEntryPoint();
            const entryPoint = getEntryPoint();

            // Debug: Check what templates are available
            const root = await entryPoint.fetch();
            logger.debug('Entry point templates available', {
                templates: Object.keys(root._templates || {}),
                authenticated: root.authenticated,
                hasVerify: !!root._templates?.verify,
                hasFederate: !!root._templates?.federate
            });

            // Discover federation endpoint (now in templates for POST operations)
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

            // Call the hypermedia API federate endpoint using discovered URL
            try {
                const response = await apiClient.request(federateHref, {
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
                const responseData = response as any;
                return {
                    username: responseData.userId || '',
                    email: responseData.email,
                    firstName: responseData.firstName,
                    lastName: responseData.lastName,
                    name: `${responseData.firstName} ${responseData.lastName}`,
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

    async function verifySession(): Promise<User> {
        try {
            const entryPoint = getEntryPoint();

            // Discover verification endpoint (now in templates for POST operations)
            const verifyHref = await entryPoint.getTemplateTarget('verify');
            if (!verifyHref) {
                throw new AuthError({
                    name: 'VerifyNotAvailable',
                    message: 'Session verification not available - please sign in again'
                });
            }

            logger.debug('Discovered verification endpoint', { verifyHref });

            const response = await apiClient.request(verifyHref, {
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
            // Create user object compatible with existing interface
            const responseData = response as any;
            const verifiedUser: User = {
                username: responseData.userId || '',
                email: responseData.email,
                firstName: responseData.firstName,
                lastName: responseData.lastName,
                name: `${responseData.firstName} ${responseData.lastName}`,
                // Store hypermedia links for future navigation
                links: response._links,
                authContext: response._embedded?.access,
            };

            // Set user in context
            setSignedInUser(verifiedUser);
            return verifiedUser;

        } catch (error) {
            logger.error('Session verification failed', { error });

            // Handle API client errors
            if (error instanceof Error && error.name === 'ApiClientError') {
                throw new AuthError({
                    name: 'SessionVerificationFailed',
                    message: 'Session verification failed - please sign in again'
                });
            }

            // Re-throw auth errors as-is
            if (error instanceof AuthError) {
                throw error;
            }

            // Wrap other errors
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

            // Session revocation requires SessionToken in Authorization header
            // API keys cannot be revoked through this endpoint
            if (!sessionToken) {
                logger.warn('No session token available for revocation');
                return;
            }

            // Discover revoke endpoint (now in templates for POST operations)
            const revokeHref = await entryPoint.getTemplateTarget('revoke');
            if (!revokeHref) {
                logger.warn('Revoke endpoint not available from API - continuing with sign out');
                return;
            }

            // Call the hypermedia API revoke endpoint with SessionToken
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

                // Refresh capabilities back to unauthenticated state
                await refreshCapabilities();

                logger.debug('Capabilities refreshed to unauthenticated state');
            } catch (error) {
                logger.warn('API revoke failed', { error });
                // Note: We don't rethrow here - revoke is best-effort during sign out
                // The user will still be signed out locally even if API revoke fails
            }
        } catch (error) {
            logger.error('Revoke session failed', { error });
            // Don't throw - sign out should continue even if revoke fails
        }
    }

    async function signUp(signUpMessage: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }): Promise<SignInStep | undefined> {
        try {
            await ensureAmplifyConfigured();
            const { nextStep } = await amplify.signUp({
                username: signUpMessage.email,
                password: signUpMessage.password,
                options: {
                    userAttributes: {
                        email: signUpMessage.email,
                        given_name: signUpMessage.firstName,
                        family_name: signUpMessage.lastName,
                        name: `${signUpMessage.firstName} ${signUpMessage.lastName}`,
                    },
                },
            });

            switch (nextStep.signUpStep) {
                case 'CONFIRM_SIGN_UP':
                    return SignInStep.CONFIRM_SIGNUP;
                case 'DONE':
                    return SignInStep.SIGNIN;
                default:
                    throw new Error(`Unexpected sign in step: ${nextStep.signUpStep}`);
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

    async function confirmSignUp({
        confirmationEmail,
        confirmationCode,
    }: {
        confirmationEmail: string;
        confirmationCode: string;
    }): Promise<SignInStep | undefined> {
        try {
            const { nextStep } = await amplify.confirmSignUp({
                username: confirmationEmail,
                confirmationCode,
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

    async function resendConfirmationCode(confirmationEmail: string) {
        await amplify.resendSignUpCode({ username: confirmationEmail || '' });
    }

    async function resetPassword(username: string) {
        const result = await amplify.resetPassword({ username });
        logger.debug('Password reset initiated', { hasResult: !!result });
    }

    async function confirmResetPassword(confirmationEmail: string, confirmationCode: string, newPassword: string) {
        try {
            logger.debug('Confirming password reset');
            await amplify.confirmResetPassword({
                username: confirmationEmail || '',
                confirmationCode,
                newPassword,
            });
        } catch (error) {
            if (error instanceof amplify.AuthError) {
                throw new AuthError(error);
            }

            logger.error('Unexpected error during confirm reset password', { error });
            throw error;
        }
    }

    async function signIn(signInMessage: { username: string; password: string }): Promise<SignInStep | undefined> {
        try {
            await ensureAmplifyConfigured();
            // Clear any existing session before signing in
            // Note: Moto compatibility handled by revoke_token polyfill in moto_amplify_shims.ts
            await amplify.signOut();

            const { nextStep } = await amplify.signIn({
                username: signInMessage.username,
                password: signInMessage.password,
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
                    setSignedInUser(await federateSession(authSession));
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
        }
    }

    async function signOut() {
        try {
            logger.debug('Sign out initiated', {
                hasSignedInUser: !!signedInUser,
                hasAuthContext: !!signedInUser?.authContext
            });

            // Get sessionId from current user context
            const sessionId = signedInUser?.authContext?.sessionId;
            logger.debug('Extracted sessionId', {
                hasSessionId: !!sessionId
            });

            if (sessionId) {
                await revokeSession(sessionId);
            } else {
                logger.warn('No sessionId found in user context, skipping revoke');
            }
        } catch (error) {
            // User might not be signed in, continue with signout
            logger.warn('Error during signout revoke', { error });
        }

        await amplify.signOut();
        setSignedInUser(undefined);
        clearEntryPoint(); // Clear cached capabilities for clean slate on next login
    }

    return {
        signUp,
        confirmSignUp,
        resendConfirmationCode,
        resetPassword,
        confirmResetPassword,
        signIn,
        signOut,
        authorize,
        verifySession,
    };
};