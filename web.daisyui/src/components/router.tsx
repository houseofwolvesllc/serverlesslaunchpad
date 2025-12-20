import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './protected_route';
import { Dashboard } from '../features/dashboard';
import {
    ConfirmSignUpForm,
    ConfirmResetPasswordForm,
    ResetPasswordForm,
    SignInForm,
    SignUpForm,
} from '../features/authentication';
import { NoMatch } from './no_match';
import { NavigationHistoryProvider } from '@houseofwolves/serverlesslaunchpad.web.commons.react';

export const Router = () => {
    return (
        <NavigationHistoryProvider>
            <Routes>
                {/* Public routes - HARDCODED (Cognito/web-owned) */}
                <Route path="auth/signin" element={<SignInForm />} />
                <Route path="auth/signup" element={<SignUpForm />} />
                <Route path="auth/confirm-signup" element={<ConfirmSignUpForm />} />
                <Route path="auth/reset-password" element={<ResetPasswordForm />} />
                <Route path="auth/confirm-reset-password" element={<ConfirmResetPasswordForm />} />

                {/* Protected routes - Dashboard handles dynamic child routes */}
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Fallback for truly unknown routes */}
                <Route path="*" element={<NoMatch />} />
            </Routes>
        </NavigationHistoryProvider>
    );
};
