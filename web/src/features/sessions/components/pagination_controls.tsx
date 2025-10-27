import { Button, Group, Select, Stack, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { PAGE_SIZE_OPTIONS, PageSize, PaginationState } from '../types';

interface PaginationControlsProps {
    pagination: PaginationState;
    onNextPage: () => void;
    onPreviousPage: () => void;
    onPageSizeChange: (size: PageSize) => void;
    disabled?: boolean;
    itemLabel?: string;
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
    itemLabel = 'items',
}: PaginationControlsProps) {
    const { hasNext, hasPrevious, pageSize } = pagination;

    // Don't show pagination if there are no pages to navigate
    if (!hasNext && !hasPrevious) {
        return null;
    }

    return (
        <Stack gap="md">
            <Group justify="space-between" align="center">
                <Group gap="xs">
                    <Text size="sm" c="dimmed">
                        Items per page:
                    </Text>
                    <Select
                        value={pageSize.toString()}
                        onChange={(value) => {
                            if (value) {
                                onPageSizeChange(parseInt(value, 10) as PageSize);
                            }
                        }}
                        data={PAGE_SIZE_OPTIONS.map((size) => ({
                            value: size.toString(),
                            label: size.toString(),
                        }))}
                        disabled={disabled}
                        w={80}
                    />
                </Group>

                <Group gap="xs">
                    <Button
                        variant="default"
                        size="sm"
                        leftSection={<IconChevronLeft size={16} />}
                        onClick={onPreviousPage}
                        disabled={disabled || !hasPrevious}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        rightSection={<IconChevronRight size={16} />}
                        onClick={onNextPage}
                        disabled={disabled || !hasNext}
                    >
                        Next
                    </Button>
                </Group>
            </Group>
        </Stack>
    );
}
