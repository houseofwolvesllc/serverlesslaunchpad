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
    return (
        <AlertDialog open={opened} onOpenChange={(open) => !open && !loading && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Selected API Keys?</AlertDialogTitle>
                    <AlertDialogDescription>
                        <div className="flex flex-col space-y-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                <span className="text-sm">
                                    You are about to delete {apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''}.
                                </span>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                This action cannot be undone. Applications using these keys will immediately lose access.
                            </p>

                            {apiKeys.length > 0 && (
                                <ul className="list-disc list-inside text-sm space-y-2">
                                    {apiKeys.map((apiKey) => (
                                        <li key={apiKey.apiKeyId}>
                                            <span className="font-medium">
                                                {apiKey.label || 'Unnamed'}
                                            </span>
                                            <div className="text-xs text-muted-foreground break-all ml-5">
                                                {apiKey.apiKey}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {loading && <span className="mr-2">...</span>}
                        Delete {apiKeys.length} Key{apiKeys.length !== 1 ? 's' : ''}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
