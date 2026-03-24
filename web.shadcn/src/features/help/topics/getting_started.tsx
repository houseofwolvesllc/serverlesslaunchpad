/**
 * Getting Started Help Topic Content
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const GettingStartedContent = () => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    This section is a placeholder. Content will be added as the application evolves.
                </p>
            </CardContent>
        </Card>
    );
};
