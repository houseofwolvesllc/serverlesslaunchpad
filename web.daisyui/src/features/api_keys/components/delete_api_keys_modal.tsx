import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ApiKey } from '../types';

export interface DeleteApiKeysModalProps {
    opened: boolean;
    onClose: () => void;
    apiKeys: ApiKey[];
    onConfirm: () => void;
    loading: boolean;
}

/**
 * Confirmation modal for deleting API keys
 *
 * Displays:
 * - Count of API keys to be deleted
 * - List of API key names/prefixes
 * - Warning message
 * - Confirm/cancel actions
 */
export function DeleteApiKeysModal({ opened, onClose, apiKeys, onConfirm, loading }: DeleteApiKeysModalProps) {
    const modalRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (opened && modalRef.current) {
            modalRef.current.showModal();
        } else if (!opened && modalRef.current) {
            modalRef.current.close();
        }
    }, [opened]);

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    return (
        <dialog ref={modalRef} className="modal" onClose={handleClose}>
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">Delete Selected API Keys?</h3>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-error" />
                        <span className="text-sm">
                            You are about to delete {apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''}.
                        </span>
                    </div>

                    <p className="text-sm opacity-70">
                        This action cannot be undone. Applications using these keys will immediately lose access.
                    </p>

                    {apiKeys.length > 0 && (
                        <ul className="list-disc list-inside text-sm space-y-2">
                            {apiKeys.map((apiKey) => (
                                <li key={apiKey.apiKeyId}>
                                    <span className="font-medium">
                                        {apiKey.label || 'Unnamed'}
                                    </span>
                                    <div className="text-xs opacity-70 break-all ml-5">
                                        {apiKey.apiKey}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="modal-action">
                        <button className="btn btn-ghost" onClick={handleClose} disabled={loading}>
                            Cancel
                        </button>
                        <button className="btn btn-error" onClick={onConfirm} disabled={loading}>
                            {loading && <span className="loading loading-spinner loading-sm"></span>}
                            Delete {apiKeys.length} Key{apiKeys.length !== 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            </div>
        </dialog>
    );
}
