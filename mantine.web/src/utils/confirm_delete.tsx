import { modals } from '@mantine/modals';
import { Text } from '@mantine/core';

/**
 * Options for the delete confirmation modal
 */
interface ConfirmDeleteOptions {
    /** Title of the confirmation modal */
    title: string;

    /** Main message explaining what will be deleted */
    message: string;

    /** Optional count of items being deleted (for bulk operations) */
    count?: number;

    /** Callback to execute if user confirms */
    onConfirm: () => void | Promise<void>;

    /** Optional callback if user cancels */
    onCancel?: () => void;
}

/**
 * Show a confirmation modal before destructive delete operations
 *
 * Uses Mantine's modal system to show a consistent confirmation dialog
 * with appropriate styling and warnings for destructive operations.
 *
 * @param options - Configuration for the confirmation modal
 *
 * @example
 * ```typescript
 * // Single item delete
 * confirmDelete({
 *   title: 'Delete API Key',
 *   message: `Are you sure you want to delete "${apiKey.label}"?`,
 *   onConfirm: () => executeDelete(apiKey)
 * });
 *
 * // Bulk delete
 * confirmDelete({
 *   title: 'Delete API Keys',
 *   message: 'Are you sure you want to delete the selected API keys?',
 *   count: selected.length,
 *   onConfirm: async () => {
 *     await bulkDelete(selected);
 *     clearSelection();
 *   }
 * });
 * ```
 */
export function confirmDelete({
    title,
    message,
    count,
    onConfirm,
    onCancel
}: ConfirmDeleteOptions) {
    modals.openConfirmModal({
        title,
        children: (
            <>
                <Text size="sm">{message}</Text>
                {count && count > 1 && (
                    <Text size="sm" mt="md" fw={600}>
                        {count} {count === 1 ? 'item' : 'items'} will be deleted.
                    </Text>
                )}
                <Text
                    size="sm"
                    mt="md"
                    c="red.6"
                    fw={500}
                >
                    This action cannot be undone.
                </Text>
            </>
        ),
        labels: {
            confirm: count && count > 1 ? `Delete ${count} Items` : 'Delete',
            cancel: 'Cancel'
        },
        confirmProps: {
            color: 'red'
        },
        onConfirm,
        onCancel
    });
}
