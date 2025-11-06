import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NoMatch = () => {
    const navigate = useNavigate();

    return (
        <div className="container max-w-2xl py-12">
            <Card>
                <CardHeader>
                    <CardTitle className="text-4xl">404 - Page Not Found</CardTitle>
                    <CardDescription className="text-lg">
                        There's nothing here. The page you're looking for doesn't exist.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => navigate('/')} className="gap-2">
                        <Home className="w-4 h-4" />
                        Go Home
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
