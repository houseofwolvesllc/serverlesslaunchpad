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
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-sm opacity-70">
                        Items per page:
                    </span>
                    <select
                        className="select select-bordered select-sm w-20"
                        value={pageSize.toString()}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value) {
                                onPageSizeChange(parseInt(value, 10) as PageSize);
                            }
                        }}
                        disabled={disabled}
                    >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size.toString()}>
                                {size}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2">
                    <button
                        className="btn btn-sm"
                        onClick={onPreviousPage}
                        disabled={disabled || !hasPrevious}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </button>
                    <button
                        className="btn btn-sm"
                        onClick={onNextPage}
                        disabled={disabled || !hasNext}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
