/**
 * Loading Skeletons - Loading states for collections
 *
 * These components provide skeleton screens while data is loading.
 */

import { Card } from '@/components/ui/card';
import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export interface CollectionSkeletonProps {
    rows?: number;
    columns?: number;
    showActions?: boolean;
    className?: string;
}

/**
 * Skeleton for a single table row
 */
export function TableRowSkeleton({ columns = 3 }: { columns?: number }) {
    return (
        <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
                <TableCell key={i}>
                    <Skeleton className="h-4 w-full" />
                </TableCell>
            ))}
        </TableRow>
    );
}

/**
 * Skeleton for collection toolbar
 */
export function CollectionToolbarSkeleton() {
    return (
        <div className="flex items-center justify-between">
            <div></div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
            </div>
        </div>
    );
}

/**
 * Full collection skeleton with table
 *
 * @example
 * ```tsx
 * {loading ? (
 *   <CollectionSkeleton rows={5} columns={4} />
 * ) : (
 *   <HalCollectionList resource={data} />
 * )}
 * ```
 */
export function CollectionSkeleton({
    rows = 5,
    columns = 3,
    showActions = true,
    className = '',
}: CollectionSkeletonProps) {
    return (
        <div className={`space-y-4 ${className}`}>
            {/* Toolbar skeleton */}
            {showActions && <CollectionToolbarSkeleton />}

            {/* Table skeleton */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {Array.from({ length: columns }).map((_, i) => (
                                <TableHead key={i}>
                                    <Skeleton className="h-4 w-24" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: rows }).map((_, i) => (
                            <TableRowSkeleton key={i} columns={columns} />
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

/**
 * Card list skeleton (for list views)
 */
export function CardListSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
    return (
        <div className={`space-y-4 ${className}`}>
            {Array.from({ length: rows }).map((_, i) => (
                <Card key={i} className="p-6">
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                </Card>
            ))}
        </div>
    );
}

/**
 * Detail view skeleton
 */
export function DetailSkeleton({ className = '' }: { className?: string }) {
    return (
        <Card className={`p-6 ${className}`}>
            <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
        </Card>
    );
}
