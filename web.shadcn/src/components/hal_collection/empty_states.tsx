/**
 * Empty States - Reusable empty state components for collections
 *
 * These components provide consistent empty states for different scenarios.
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Search, AlertCircle } from 'lucide-react';

export interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

/**
 * Generic empty state component
 */
export function EmptyState({ icon, title, message, action, className = '' }: EmptyStateProps) {
    return (
        <Card className={`p-12 ${className}`}>
            <div className="flex flex-col items-center justify-center text-center">
                {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md">{message}</p>
                {action && (
                    <Button onClick={action.onClick}>
                        <Plus className="mr-2 h-4 w-4" />
                        {action.label}
                    </Button>
                )}
            </div>
        </Card>
    );
}

/**
 * Empty collection state
 */
export function EmptyCollection({
    itemName = 'item',
    onCreateClick,
    createLabel,
}: {
    itemName?: string;
    onCreateClick?: () => void;
    createLabel?: string;
}) {
    return (
        <EmptyState
            icon={<Search className="h-12 w-12" />}
            title={`No ${itemName}s`}
            message={`You haven't created any ${itemName}s yet. Get started by creating your first one.`}
            action={
                onCreateClick
                    ? {
                          label: createLabel || `Create ${itemName}`,
                          onClick: onCreateClick,
                      }
                    : undefined
            }
        />
    );
}

/**
 * Empty search results state
 */
export function EmptySearchResults({ query }: { query?: string }) {
    return (
        <EmptyState
            icon={<Search className="h-12 w-12" />}
            title="No results found"
            message={
                query
                    ? `No items match your search "${query}". Try adjusting your search terms.`
                    : 'No items match your current filters. Try adjusting your search criteria.'
            }
        />
    );
}

/**
 * Error state for failed loads
 */
export function ErrorState({
    error,
    onRetry,
}: {
    error?: string | Error;
    onRetry?: () => void;
}) {
    const errorMessage =
        typeof error === 'string' ? error : error?.message || 'An unexpected error occurred';

    return (
        <EmptyState
            icon={<AlertCircle className="h-12 w-12 text-destructive" />}
            title="Error loading data"
            message={errorMessage}
            action={
                onRetry
                    ? {
                          label: 'Try again',
                          onClick: onRetry,
                      }
                    : undefined
            }
        />
    );
}
