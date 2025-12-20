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
import { Admin } from '../features/admin';
import { NoMatch } from './no_match';

export const Router = () => {
    return (
        <Routes>
            <Route path="auth/signin" element={<SignInForm />} />
            <Route path="auth/signup" element={<SignUpForm />} />
            <Route path="auth/confirm-signup" element={<ConfirmSignUpForm />} />
            <Route path="auth/reset-password" element={<ResetPasswordForm />} />
            <Route path="auth/confirm-reset-password" element={<ConfirmResetPasswordForm />} />
            <Route
                index
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="admin"
                element={
                    <ProtectedRoute>
                        <Admin />
                    </ProtectedRoute>
                }
            />

            <Route path="*" element={<NoMatch />} />
        </Routes>
    );
};
