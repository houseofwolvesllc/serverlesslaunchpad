import { Amplify } from 'aws-amplify';
import * as amplify from 'aws-amplify/auth';
import { useContext } from 'react';
import WebConfigurationStore from '../../../configuration/web_config_store';
import { apiClient } from '../../../services/api.client';
import { CookieService } from '../../../services/cookie.service';
import { AuthenticationContext, AuthError, SignInStep, User } from '../../authentication';

// Amplify configuration will be loaded asynchronously
let amplifyConfigured = false;

async function ensureAmplifyConfigured() {
    if (amplifyConfigured) return;

    const config = await WebConfigurationStore.getConfig();

    // Configure Amplify v6 with environment config and Moto-specific settings
    const amplifyConfig: any = {
        Auth: {
            Cognito: {
                region: config.aws.region,
                userPoolId: config.cognito.user_pool_id,
                userPoolClientId: config.cognito.client_id,
                identityPoolId: config.cognito.identity_pool_id,
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

    Amplify.configure(amplifyConfig);
    amplifyConfigured = true;
}

export const useAuth = function () {
    const { setSignedInUser } = useContext(AuthenticationContext);

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
            const config = await WebConfigurationStore.getConfig();
            if (config.features.debug_mode) {
                console.log('🔗 Federating Cognito session to hypermedia API', authSession);
                console.log('ID Token:', authSession.tokens?.idToken?.toString());
                console.log('Access Token:', authSession.tokens?.accessToken?.toString());
            }

            const sessionKey = crypto.randomUUID();
            const cognitoToken = authSession.tokens?.idToken?.toString();
            
            if (!cognitoToken) {
                throw new Error('No Cognito ID token available');
            }

            const payload = authSession.tokens?.idToken?.payload;
            const federateRequest = {
                sessionKey,
                email: payload?.email as string,
                firstName: payload?.given_name as string,
                lastName: payload?.family_name as string,
            };
            console.log('Federation request:', federateRequest);

            // Call the hypermedia API federate endpoint
            try {
                const response = await apiClient.request('/auth/federate', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${cognitoToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(federateRequest),
                });
                
                if (config.features.debug_mode) {
                    console.log('✅ Session federated with hypermedia API', response);
                }

                const { user, authContext, links } = response.data;
                
                return {
                    sessionKey,
                    username: user.userId || user.username || '',
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    name: user.name || `${user.firstName} ${user.lastName}`,
                    links: links,
                    authContext: authContext,
                };
            } catch (error) {
                console.error('❌ API federation failed:', error);
                throw new Error(`Failed to federate with hypermedia API: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Authorization failed:', error);
            throw error;
        }
    }

    async function verifySession(): Promise<User> {
        try {
            const config = await WebConfigurationStore.getConfig();

            // Check for session cookie first - fail fast if missing
            if (!CookieService.hasSessionCookie()) {
                throw new AuthError({
                    name: 'NoSessionCookie',
                    message: 'No session cookie found - user needs to authenticate'
                });
            }

            if (config.features.debug_mode) {
                console.log('🔍 Verifying existing session cookie');
            }

            // Call hypermedia API verify endpoint
            // The session cookie will be automatically sent via credentials: 'include'
            const response = await apiClient.request('/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (config.features.debug_mode) {
                console.log('✅ Session verified with hypermedia API', response);
            }

            // Extract user data from hypermedia response
            const { user, authContext, links } = response.data;

            // Create user object compatible with existing interface
            const verifiedUser: User = {
                username: user.userId || user.username || '',
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                name: user.name || `${user.firstName} ${user.lastName}`,
                // Store hypermedia links for future navigation
                links: links,
                authContext: authContext,
            };

            // Set user in context
            setSignedInUser(verifiedUser);
            return verifiedUser;

        } catch (error) {
            const currentConfig = await WebConfigurationStore.getConfig();
            if (currentConfig.features.debug_mode) {
                console.error('❌ Session verification failed:', error);
            }

            // Clean up any stale cookies on verification failure
            CookieService.removeSessionCookie();

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

    async function revokeSession(authSession: amplify.AuthSession): Promise<void> {
        try {
            const config = await WebConfigurationStore.getConfig();
            if (config.features.debug_mode) {
                console.log('🔓 Revoking hypermedia API session', authSession);
            }

            // Call the hypermedia API revoke endpoint
            // Session cookie will be automatically sent and cleared by server
            try {
                await apiClient.request('/auth/revoke', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (config.features.debug_mode) {
                    console.log('✅ Session revoked with hypermedia API');
                }
            } catch (error) {
                if (config.features.debug_mode) {
                    console.warn('⚠️ API revoke failed', error);
                }
                // Continue with local signout even if API fails
                // Clean up any remaining client-side cookie traces
                CookieService.removeSessionCookie();
            }
        } catch (error) {
            console.error('Unauthorized session failed:', error);
            // Always clean up any client-side cookie traces
            CookieService.removeSessionCookie();
            // Don't throw here, as we still want to complete local signout
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
                        console.error('Authentication error:', error);
                        throw new AuthError(error);
                }
            }

            console.error('Unexpected error:', error);
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
            console.error('Unexpected error:', error);
            throw error;
        }
    }

    async function resendConfirmationCode(confirmationEmail: string) {
        await amplify.resendSignUpCode({ username: confirmationEmail || '' });
    }

    async function resetPassword(username: string) {
        const result = await amplify.resetPassword({ username });
        console.log('result', result);
    }

    async function confirmResetPassword(confirmationEmail: string, confirmationCode: string, newPassword: string) {
        try {
            console.log('SUBMITTED');
            await amplify.confirmResetPassword({
                username: confirmationEmail || '',
                confirmationCode,
                newPassword,
            });
        } catch (error) {
            if (error instanceof amplify.AuthError) {
                throw new AuthError(error);
            }

            console.error('Unexpected error:', error);
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

            console.error('Unexpected error:', error);
        }
    }

    async function signOut() {
        try {
            const authSession = await amplify.fetchAuthSession();
            if (authSession) {
                await revokeSession(authSession);
            }
        } catch (error) {
            // User might not be signed in, continue with signout
        }

        await amplify.signOut();
        setSignedInUser(undefined);
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