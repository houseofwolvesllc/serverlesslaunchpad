import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '@houseofwolves/serverlesslaunchpad.types/pagination';
import { PageSize, PaginationState } from '../types';

interface PaginationControlsProps {
    pagination: PaginationState;
    onNextPage: () => void;
    onPreviousPage: () => void;
    onPageSizeChange: (size: PageSize) => void;
    disabled?: boolean;
}

/**
 * Pagination controls for cursor-based pagination
 *
 * Provides Previous/Next navigation and page size selection.
 * Does not show total count or page numbers as that requires offset pagination.
 */
export function PaginationControls({
    pagination,
    onNextPage,
    onPreviousPage,
    onPageSizeChange,
    disabled = false,
}: PaginationControlsProps) {
    const { hasNext, hasPrevious, pageSize } = pagination;

    // Don't show pagination if there are no pages to navigate
    if (!hasNext && !hasPrevious) {
        return null;
    }

    return (
        <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        Items per page:
                    </span>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => {
                            if (value) {
                                onPageSizeChange(parseInt(value, 10) as PageSize);
                            }
                        }}
                        disabled={disabled}
                    >
                        <SelectTrigger className="w-[80px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <SelectItem key={size} value={size.toString()}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onPreviousPage}
                        disabled={disabled || !hasPrevious}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onNextPage}
                        disabled={disabled || !hasNext}
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
