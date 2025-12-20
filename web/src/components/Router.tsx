import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Dashboard } from '../features/Dashboard';
import { Authentication } from '../features/Authentication';
import { Admin } from '../features/Admin';
import { NoMatch } from './NoMatch';

export const Router = () => {
    return (
        <>
            <Routes>
                <Route path="auth" element={<Authentication />} />
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
        </>
    );
};
