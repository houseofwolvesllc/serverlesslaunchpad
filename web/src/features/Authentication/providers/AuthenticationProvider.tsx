import { useNavigate, useLocation } from 'react-router-dom';
import { AuthenticationContext } from '../../Authentication';
import { useEffect, useState } from 'react';
import { LoadingOverlay } from '@mantine/core';

import * as amplify from 'aws-amplify/auth';
import { AmplifyErrorParams } from '@aws-amplify/core/internals/utils';

// placeholder for now
export interface User {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
}

export class AuthError extends amplify.AuthError {
    constructor(params: AmplifyErrorParams) {
        super(params);
        Object.setPrototypeOf(this, AuthError.prototype);
    }
}

export enum SignInStep {
    SIGNUP = 'signup',
    CONFIRM_SIGNUP = 'confirm_signup',
    SIGNIN = 'signin',
    COMPLETED = 'completed',
    RESET_PASSWORD = 'reset_password',
    CONFIRM_RESET_PASSWORD = 'confirm_reset_password',
}

export function passwordPolicyValidator(password: string) {
    return password.length < 8 ? 'Password should include at least 8 characters' : null;
}

export const AuthenticationProvider = ({ children }: { children: React.ReactNode }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [signedInUser, setSignedInUser] = useState<User | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [authSession, setAuthSession] = useState<amplify.AuthSession | undefined>();
    const [signInStep, setSignInStep] = useState<SignInStep>(SignInStep.SIGNIN);
    const [confirmationUsername, setConfirmationUsername] = useState<string | undefined>();

    useEffect(() => {
        console.log('AUTHPROVIDER USEEFFECT');
        const fetchCurrentUser = async () => {
            try {
                setIsLoading(true);
                const authSession = await amplify.fetchAuthSession();
                setAuthSession(authSession);

                const user = await authorizeSession(authSession);
                setSignedInUser(user);

                setSignInStep(SignInStep.COMPLETED);

                const origin = location.state?.from?.pathname || '/dashboard';
                navigate(origin);
            } catch (error) {
                if (error instanceof amplify.AuthError) {
                    switch (error.name) {
                        case 'UserUnAuthenticatedException':
                            setSignInStep(SignInStep.SIGNIN);
                            return;
                    }
                }

                console.error('Error fetching current user:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCurrentUser();

        return () => {
            console.log('cognitoUser effect cleanup');
            setSignedInUser(undefined);
        };
    }, []);

    // placeholder for now
    const authorizeSession = async (authSession: amplify.AuthSession): Promise<User> =>
        new Promise((resolve) => {
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

    const unauthorizeSession = async (authSession: amplify.AuthSession): Promise<void> =>
        new Promise((resolve) => {
            console.log('sayonara', authSession);
            setTimeout(() => resolve(), 250);
        });

    const signUp = async (signUpMessage: {
        username: string;
        password: string;
        email: string;
        firstName: string;
        lastName: string;
    }) => {
        try {
            setIsLoading(true);

            const { nextStep } = await amplify.signUp({
                username: signUpMessage.username,
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
                    setConfirmationUsername(signUpMessage.username);
                    setSignInStep(SignInStep.CONFIRM_SIGNUP);
                    break;
                case 'DONE':
                    setSignInStep(SignInStep.SIGNIN);
                    break;
                default:
                    throw new Error(`Unexpected sign in step: ${nextStep.signUpStep}`);
            }
        } catch (error) {
            if (error instanceof amplify.AuthError) {
                switch (error.name) {
                    case 'UserNotConfirmedException':
                        setSignInStep(SignInStep.CONFIRM_SIGNUP);
                        return;
                    case 'PasswordResetRequiredException':
                        setSignInStep(SignInStep.RESET_PASSWORD);
                        return;
                    default:
                        console.error('Authentication error:', error);
                        throw new AuthError(error);
                }
            }

            console.error('Unexpected error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const confirmSignUp = async (confirmationCode: string) => {
        try {
            setIsLoading(true);

            const { nextStep } = await amplify.confirmSignUp({
                username: confirmationUsername || '',
                confirmationCode,
            });

            switch (nextStep.signUpStep) {
                case 'DONE':
                    setSignInStep(SignInStep.SIGNIN);
                    break;
            }
        } catch (error) {
            console.error('Unexpected error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const resendSignUpCode = async () => {
        await amplify.resendSignUpCode({ username: confirmationUsername || '' });
    };

    const signIn = async (signInMessage: { username: string; password: string }) => {
        try {
            setIsLoading(true);
            const { nextStep } = await amplify.signIn({
                username: signInMessage.username,
                password: signInMessage.password,
            });

            switch (nextStep.signInStep) {
                case 'CONFIRM_SIGN_UP':
                    setConfirmationUsername(signInMessage.username);
                    setSignInStep(SignInStep.CONFIRM_SIGNUP);
                    break;
                case 'RESET_PASSWORD':
                    setSignInStep(SignInStep.RESET_PASSWORD);
                    break;
                case 'DONE':
                    setSignInStep(SignInStep.COMPLETED);

                    const authSession = await amplify.fetchAuthSession();
                    setAuthSession(authSession);
                    setSignedInUser(await authorizeSession(authSession));

                    const origin = location.state?.from?.pathname || '/dashboard';
                    navigate(origin);
                    break;
                default:
                    console.log('Unexpected sign in step:', nextStep.signInStep);
            }
        } catch (error) {
            if (error instanceof amplify.AuthError) {
                switch (error.name) {
                    case 'UserNotConfirmedException':
                        setSignInStep(SignInStep.CONFIRM_SIGNUP);
                        break;
                    case 'PasswordResetRequiredException':
                        setSignInStep(SignInStep.RESET_PASSWORD);
                        break;
                    default:
                        console.error('Authentication error:', error);
                        throw new AuthError(error);
                }
            }

            console.error('Unexpected error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        if (authSession) {
            await unauthorizeSession(authSession);
        }

        await amplify.signOut();
        setSignedInUser(undefined);
        setSignInStep(SignInStep.SIGNIN);
    };

    const resetPassword = async (username: string) => {
        setConfirmationUsername(username);
        await amplify.resetPassword({ username });
    };

    const confirmResetPassword = async (confirmationCode: string, newPassword: string) => {
        await amplify.confirmResetPassword({
            confirmationCode,
            newPassword,
            username: confirmationUsername || '',
        });
        setSignInStep(SignInStep.SIGNIN);
    };

    const value = {
        signInStep,
        signedInUser: signedInUser,
        setSignInStep: setSignInStep,
        signUp: signUp,
        confirmSignUp: confirmSignUp,
        resendSignUpCode: resendSignUpCode,
        signIn: signIn,
        signOut: signOut,
        resetPassword: resetPassword,
        confirmResetPassword: confirmResetPassword,
    };

    return (
        <AuthenticationContext.Provider value={value}>
            <LoadingOverlay visible={isLoading} />
            {children}
        </AuthenticationContext.Provider>
    );
};
