/**
 * Generic Confirmation Dialog Component
 *
 * Reusable confirmation dialog for action templates that require user confirmation.
 * Supports both destructive and non-destructive variants.
 *
 * Use this for:
 * - Delete operations (destructive variant)
 * - Bulk operations
 * - Any action requiring confirmation
 *
 * Features:
 * - Destructive variant styling (red for DELETE operations)
 * - Loading state during execution
 * - Keyboard shortcuts (Enter to confirm, Escape to cancel)
 * - Accessible (ARIA labels, focus management)
 */

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface ConfirmationDialogProps {
    /** Whether the dialog is open */
    open: boolean;

    /** Callback when open state changes */
    onOpenChange: (open: boolean) => void;

    /** Dialog title */
    title: string;

    /** Confirmation message */
    message: string;

    /** Confirm button label (default: "Confirm") */
    confirmLabel?: string;

    /** Cancel button label (default: "Cancel") */
    cancelLabel?: string;

    /** Visual variant (default: "default") */
    variant?: 'default' | 'destructive';

    /** Callback when user confirms */
    onConfirm: () => Promise<void> | void;

    /** Loading state (disables buttons during execution) */
    loading?: boolean;
}

/**
 * Generic confirmation dialog for actions requiring user confirmation
 *
 * @example
 * ```typescript
 * const [open, setOpen] = useState(false);
 * const [loading, setLoading] = useState(false);
 *
 * const handleConfirm = async () => {
 *   setLoading(true);
 *   try {
 *     await executeTemplate(template, data);
 *     setOpen(false);
 *     toast.success('Action completed');
 *   } finally {
 *     setLoading(false);
 *   }
 * };
 *
 * <ConfirmationDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete Sessions"
 *   message="Are you sure you want to delete 3 items? This action cannot be undone."
 *   confirmLabel="Delete"
 *   variant="destructive"
 *   onConfirm={handleConfirm}
 *   loading={loading}
 * />
 * ```
 */
export function ConfirmationDialog({
    open,
    onOpenChange,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    loading = false,
}: ConfirmationDialogProps) {
    const handleConfirm = async () => {
        await onConfirm();
    };

    const handleCancel = () => {
        if (!loading) {
            onOpenChange(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{message}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel} disabled={loading}>
                        {cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={loading}
                        className={
                            variant === 'destructive'
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                : undefined
                        }
                    >
                        {loading ? 'Loading...' : confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
