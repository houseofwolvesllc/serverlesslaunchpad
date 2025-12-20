import { useState, createContext, useContext, ReactNode, useEffect, useRef } from 'react';

/**
 * Options for the delete confirmation dialog
 */
interface ConfirmDeleteOptions {
    /** Title of the confirmation dialog */
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

interface ConfirmDeleteState {
    isOpen: boolean;
    options: ConfirmDeleteOptions | null;
}

interface ConfirmDeleteContextType {
    confirmDelete: (options: ConfirmDeleteOptions) => void;
}

const ConfirmDeleteContext = createContext<ConfirmDeleteContextType | null>(null);

/**
 * Provider component for the confirm delete functionality
 * Must wrap your app to use confirmDelete
 */
export function ConfirmDeleteProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ConfirmDeleteState>({
        isOpen: false,
        options: null,
    });
    const modalRef = useRef<HTMLDialogElement>(null);

    const confirmDelete = (options: ConfirmDeleteOptions) => {
        setState({ isOpen: true, options });
    };

    useEffect(() => {
        if (state.isOpen && modalRef.current) {
            modalRef.current.showModal();
        } else if (!state.isOpen && modalRef.current) {
            modalRef.current.close();
        }
    }, [state.isOpen]);

    const handleConfirm = async () => {
        if (state.options?.onConfirm) {
            await state.options.onConfirm();
        }
        setState({ isOpen: false, options: null });
    };

    const handleCancel = () => {
        if (state.options?.onCancel) {
            state.options.onCancel();
        }
        setState({ isOpen: false, options: null });
    };

    const count = state.options?.count;
    const confirmButtonText = count && count > 1 ? `Delete ${count} Items` : 'Delete';

    return (
        <ConfirmDeleteContext.Provider value={{ confirmDelete }}>
            {children}
            <dialog ref={modalRef} className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">{state.options?.title}</h3>
                    <div className="space-y-2">
                        <p>{state.options?.message}</p>
                        {count && count > 1 && (
                            <p className="font-semibold">
                                {count} {count === 1 ? 'item' : 'items'} will be deleted.
                            </p>
                        )}
                        <p className="text-error font-medium">
                            This action cannot be undone.
                        </p>
                    </div>
                    <div className="modal-action">
                        <button onClick={handleCancel} className="btn btn-ghost">
                            Cancel
                        </button>
                        <button onClick={handleConfirm} className="btn btn-error">
                            {confirmButtonText}
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop" onClick={handleCancel}>
                    <button>close</button>
                </form>
            </dialog>
        </ConfirmDeleteContext.Provider>
    );
}

/**
 * Hook to access the confirmDelete function
 * Must be used within a ConfirmDeleteProvider
 */
export function useConfirmDelete() {
    const context = useContext(ConfirmDeleteContext);
    if (!context) {
        throw new Error('useConfirmDelete must be used within ConfirmDeleteProvider');
    }
    return context;
}

/**
 * Show a confirmation dialog before destructive delete operations
 *
 * This is a convenience function that uses the ConfirmDeleteProvider.
 * For the function to work, wrap your app with <ConfirmDeleteProvider>.
 *
 * @param options - Configuration for the confirmation dialog
 *
 * @example
 * ```typescript
 * // In your app root:
 * <ConfirmDeleteProvider>
 *   <App />
 * </ConfirmDeleteProvider>
 *
 * // In your component:
 * const { confirmDelete } = useConfirmDelete();
 *
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
// Standalone function for backwards compatibility - not recommended
// Use useConfirmDelete() hook instead
export const confirmDelete = (_options: ConfirmDeleteOptions) => {
    throw new Error(
        'confirmDelete() requires ConfirmDeleteProvider. Use useConfirmDelete() hook instead.'
    );
};
