import { AuthenticationContext } from '../features/authentication/context/authentication_context';
import { Navigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { signedInUser, initialized } = useContext(AuthenticationContext);
    const location = useLocation();

    if (!initialized) {
        return null;
    }

    if (!signedInUser) {
        return <Navigate to="/auth/signin" state={{ from: location }} />;
    }

    return children;
};
