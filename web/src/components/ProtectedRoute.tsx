import { useAuth } from '../feature/Authentication';
import { Navigate, useLocation } from 'react-router-dom';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { signedInUser } = useAuth();
    const location = useLocation();

    if (!signedInUser) {
        return <Navigate to="/auth" replace state={{ from: location }} />;
    }

    return children;
};
