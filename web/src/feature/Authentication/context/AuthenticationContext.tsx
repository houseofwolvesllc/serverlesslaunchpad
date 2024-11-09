import * as React from 'react';
import { SignInStep, User } from '../../Authentication';

interface AuthenticationContextType {
    signInStep: SignInStep;
    signedInUser: User | undefined;
    setSignInStep: (step: SignInStep) => void;
    signUp: (signUpMessage: {
        username: string;
        password: string;
        email: string;
        firstName: string;
        lastName: string;
    }) => Promise<void>;
    confirmSignUp: (confirmationCode: string) => Promise<void>;
    resendSignUpCode: () => Promise<void>;
    signIn: (signInMessage: { username: string; password: string }) => Promise<void>;
    signOut: () => void;
    resetPassword: (username: string) => Promise<void>;
    confirmResetPassword: (confirmationCode: string, newPassword: string) => Promise<void>;
}

export const AuthenticationContext = React.createContext<AuthenticationContextType>({
    signInStep: SignInStep.SIGNIN,
    signedInUser: undefined,
    setSignInStep: () => {},
    signUp: async () => {},
    confirmSignUp: async () => {},
    resendSignUpCode: async () => {},
    signIn: async () => {},
    signOut: () => {},
    resetPassword: async () => {},
    confirmResetPassword: async () => {},
});
