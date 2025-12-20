import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NoMatch = () => {
    const navigate = useNavigate();

    return (
        <div className="container max-w-2xl py-12">
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title text-4xl">404 - Page Not Found</h2>
                    <p className="text-lg opacity-70">
                        There's nothing here. The page you're looking for doesn't exist.
                    </p>
                    <div className="card-actions">
                        <button onClick={() => navigate('/')} className="btn btn-primary gap-2">
                            <Home className="w-4 h-4" />
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
