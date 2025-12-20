import { useState } from 'react';
import { AlertCircle, Check, Copy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Props for ApiKeyDisplay component
 */
interface ApiKeyDisplayProps {
    /** Full API key to display (shown only once) */
    apiKey: string;
    /** Label for the API key */
    label?: string;
    /** Created date */
    dateCreated?: string;
    /** Callback when user closes the display */
    onClose: () => void;
}

/**
 * API Key Display Component
 *
 * Displays a newly created API key with copy functionality.
 * The full API key is also accessible from the list view at any time.
 *
 * Features:
 * - Success message about key creation
 * - Copy to clipboard with visual feedback
 * - Display of key metadata (label, created date)
 * - Manual close action
 *
 * @example
 * ```tsx
 * <ApiKeyDisplay
 *   apiKey="7vAHfS9Lm3kQwT4uB8pN6xZc2gY1jR5oMtWqDfKp8h"
 *   label="Production API Key"
 *   dateCreated="2025-10-27T00:00:00Z"
 *   onClose={handleClose}
 * />
 * ```
 */
export function ApiKeyDisplay({
    apiKey,
    label,
    dateCreated,
    onClose,
}: ApiKeyDisplayProps) {
    const [copied, setCopied] = useState(false);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Silently fail - clipboard API may not be available
        }
    };

    return (
        <div className="flex flex-col space-y-4">
            {/* Security Warning */}
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>API Key Created Successfully</AlertTitle>
                <AlertDescription>
                    Your API key has been created. You can copy it now or access it anytime from
                    the API keys list. Keep your API keys secure and never share them publicly.
                </AlertDescription>
            </Alert>

            {/* API Key Display with Copy */}
            <div>
                <p className="text-sm font-medium mb-2">API Key</p>
                <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted p-3 text-sm font-mono break-all">
                        {apiKey}
                    </code>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={handleCopy}>
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{copied ? 'Copied!' : 'Copy to clipboard'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-col space-y-2">
                {label && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Label:</span>
                        <span className="text-sm">{label}</span>
                    </div>
                )}
                {dateCreated && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Created:</span>
                        <span className="text-sm">{formatDate(dateCreated)}</span>
                    </div>
                )}
            </div>

            {/* Close Button */}
            <div className="flex justify-end mt-4">
                <Button onClick={onClose}>Close</Button>
            </div>
        </div>
    );
}
