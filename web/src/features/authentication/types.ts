// Enhanced User interface to support hypermedia API response
export interface User {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
    // Hypermedia-specific properties (HAL)
    links?: Record<string, { href: string; title?: string }>;
    // Access context from _embedded.access in HAL response
    authContext?: {
        type: 'session' | 'apiKey' | 'unknown';
        description?: string;
        ipAddress: string;
        userAgent: string;
        sessionToken?: string;
        dateLastAccessed?: string;
        dateExpires?: string;
    };
}

export class AuthError extends Error {
    public code?: string;
    public name: string;

    constructor(params: { name?: string; message: string; code?: string } | Error) {
        if (params instanceof Error) {
            super(params.message);
            this.name = params.name || 'AuthError';
            this.code = (params as any).code;
        } else {
            super(params.message);
            this.name = params.name || 'AuthError';
            this.code = params.code;
        }
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
