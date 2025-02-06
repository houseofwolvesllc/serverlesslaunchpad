import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Dashboard } from '../features/Dashboard';
import {
    ConfirmSignUpForm,
    ConfirmResetPasswordForm,
    ResetPasswordForm,
    SignInForm,
    SignUpForm,
} from '../features/Authentication';
import { Admin } from '../features/Admin';
import { NoMatch } from './NoMatch';

export const Router = () => {
    return (
        <Routes>
            <Route path="auth/signup" element={<SignUpForm />} />
            <Route path="auth/confirm-signup" element={<ConfirmSignUpForm />} />
            <Route path="auth/reset-password" element={<ResetPasswordForm />} />
            <Route path="auth/confirm-reset-password" element={<ConfirmResetPasswordForm />} />
            <Route path="auth/signin" element={<SignInForm />} />
            <Route
                index
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
