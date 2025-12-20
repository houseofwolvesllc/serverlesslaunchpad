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
