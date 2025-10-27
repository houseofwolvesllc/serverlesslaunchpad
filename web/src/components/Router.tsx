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
import { SessionsList } from '../features/sessions';
import { ApiKeysList } from '../features/api_keys';
import { NoMatch } from './no_match';

export const Router = () => {
    return (
        <Routes>
            <Route path="auth/signin" element={<SignInForm />} />
            <Route path="auth/signup" element={<SignUpForm />} />
            <Route path="auth/confirm-signup" element={<ConfirmSignUpForm />} />
            <Route path="auth/reset-password" element={<ResetPasswordForm />} />
            <Route path="auth/confirm-reset-password" element={<ConfirmResetPasswordForm />} />

            {/* Protected routes with Dashboard layout */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            >
                {/* Nested routes that render inside Dashboard's Outlet */}
                <Route index element={null} /> {/* Default: show welcome message */}
                <Route path="dashboard" element={null} />
                <Route path="account/sessions" element={<SessionsList />} />
                <Route path="account/api-keys" element={<ApiKeysList />} />
                <Route path="admin" element={<Admin />} />
            </Route>

            <Route path="*" element={<NoMatch />} />
        </Routes>
    );
};
