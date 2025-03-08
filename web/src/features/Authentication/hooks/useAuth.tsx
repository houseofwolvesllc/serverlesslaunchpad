import { useContext } from 'react';
import { AuthenticationContext, AuthError, SignInStep, User } from '../../Authentication';
import * as amplify from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';

Amplify.configure({
    Auth: {
        Cognito: {
            identityPoolId: 'us-west-2:680b19b5-c13b-46b1-8343-8962fc545d69',
            userPoolId: 'us-west-2_mvWUwrMK9',
            userPoolClientId: '3j37olsjbth4d10v0s2nortqtv',
            loginWith: {
                email: true,
            },
            signUpVerificationMethod: 'code',
            userAttributes: {
                email: {
                    required: true,
                },
            },
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
});

export const useAuth = function () {
    const { setSignedInUser } = useContext(AuthenticationContext);

    async function authorize(): Promise<User> {
        try {
            await amplify.getCurrentUser();

            const authSession = await amplify.fetchAuthSession();
            const user = await authorizeSession(authSession);
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

    async function authorizeSession(authSession: amplify.AuthSession): Promise<User> {
        return new Promise((resolve) => {
            console.log('hola', authSession);
            setTimeout(
                () =>
                    resolve({
                        username: authSession.userSub || '',
                        email: authSession.tokens?.idToken?.payload?.email as string,
                        firstName: authSession.tokens?.idToken?.payload?.given_name as string,
                        lastName: authSession.tokens?.idToken?.payload?.family_name as string,
                        name: authSession.tokens?.idToken?.payload?.name as string,
                    }),
                250
            );
        });
    }

    async function unauthorizeSession(authSession: amplify.AuthSession): Promise<void> {
        return new Promise((resolve) => {
            console.log('sayonara', authSession);
            setTimeout(() => resolve(), 250);
        });
    }

    async function signUp(signUpMessage: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }): Promise<SignInStep | undefined> {
        try {
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
                    break;
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
            await amplify.signOut();

            const { nextStep } = await amplify.signIn({
                username: signInMessage.username,
                password: signInMessage.password,
            });

            switch (nextStep.signInStep) {
                case 'CONFIRM_SIGN_UP':
                    return SignInStep.CONFIRM_SIGNUP;
                case 'RESET_PASSWORD':
                    return SignInStep.RESET_PASSWORD;
                case 'DONE':
                    const authSession = await amplify.fetchAuthSession();
                    setSignedInUser(await authorizeSession(authSession));

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
        const authSession = await amplify.fetchAuthSession();

        if (authSession) {
            await unauthorizeSession(authSession);
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
    };
};
