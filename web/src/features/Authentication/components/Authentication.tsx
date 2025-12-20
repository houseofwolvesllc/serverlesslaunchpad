import { ResetPasswordForm } from './ResetPasswordForm';
import { ConfirmSignUpForm } from './ConfirmSignUpForm';
import { ConfirmResetPasswordForm } from './ConfirmResetPasswordForm';
import { Amplify } from 'aws-amplify';
import { SignInStep, SignInForm, SignUpForm, useAuth } from '../../Authentication';

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

export function Authentication() {
    const auth = useAuth();

    switch (auth.signInStep) {
        case SignInStep.SIGNUP:
            return <SignUpForm />;
        case SignInStep.RESET_PASSWORD:
            return <ResetPasswordForm />;
        case SignInStep.CONFIRM_SIGNUP:
            return <ConfirmSignUpForm />;
        case SignInStep.CONFIRM_RESET_PASSWORD:
            return <ConfirmResetPasswordForm />;
        case SignInStep.SIGNIN:
        default:
            return <SignInForm />;
    }
}
/*
done todo: already signed in, redirect to dashboard
done: login, confirm sign up, redirect to dashboard
done todo: signup, redirect to confirm sign up
done todo: confirm sign up, redirect to signin 
done: reset password, redirect to confirm reset password
done: logout, redirect to sign in
done: input args remove aws amp dependencies
done: check for duplicate code

questions
should validation be in the contact functions as well as the useForm definitions?
*/
