import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, Copy, AlertCircle } from 'lucide-react';

export interface ApiKeyRowProps {
    apiKey: any; // HAL object
    showCheckbox?: boolean; // Show selection checkbox
    selected?: boolean; // Is this row selected
    onToggleSelect?: () => void; // Toggle selection callback
}

/**
 * Individual API key table row
 *
 * Displays API key information:
 * - Label for identification
 * - Full API key with copy functionality
 * - Creation date (relative time)
 * - Expiration date with visual warnings
 * - Last used (relative time)
 * - Checkbox for bulk selection (when enabled)
 *
 * Expiration warnings:
 * - Red badge: Already expired
 * - Orange badge with icon: Expiring within 30 days
 * - Normal text: Not expiring soon or no expiration
 *
 * Delete operations are performed via bulk delete only.
 */
export function ApiKeyRow({ apiKey, showCheckbox, selected, onToggleSelect }: ApiKeyRowProps) {
    const [copied, setCopied] = useState(false);

    // Memoize date formatting
    const createdText = useMemo(
        () =>
            apiKey.dateCreated
                ? formatDistanceToNow(new Date(apiKey.dateCreated), { addSuffix: true })
                : 'Unknown',
        [apiKey.dateCreated]
    );

    const lastUsedText = useMemo(
        () =>
            apiKey.dateLastUsed
                ? formatDistanceToNow(new Date(apiKey.dateLastUsed), { addSuffix: true })
                : 'Never',
        [apiKey.dateLastUsed]
    );

    // Calculate expiration status
    const expirationInfo = useMemo(() => {
        if (!apiKey.dateExpires) {
            return { text: 'Never', variant: 'secondary' as const, warning: false };
        }

        const expiresDate = new Date(apiKey.dateExpires);
        const now = new Date();
        const daysUntilExpiry = Math.ceil(
            (expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry < 0) {
            return { text: 'Expired', variant: 'destructive' as const, warning: true };
        } else if (daysUntilExpiry <= 30) {
            return {
                text: `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
                variant: 'default' as const, // Will be styled with orange
                warning: true,
            };
        } else {
            return {
                text: formatDistanceToNow(expiresDate, { addSuffix: true }),
                variant: 'secondary' as const,
                warning: false,
            };
        }
    }, [apiKey.dateExpires]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(apiKey.apiKey || apiKey.keyPrefix);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <tr>
            {/* Checkbox column only shows if bulk delete is available */}
            {showCheckbox && (
                <td>
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={selected}
                        onChange={onToggleSelect}
                        aria-label={`Select ${apiKey.label || apiKey.keyPrefix}`}
                    />
                </td>
            )}
            <td>
                <span className="text-sm font-medium">
                    {apiKey.label || <span className="opacity-50">Unnamed</span>}
                </span>
            </td>
            <td>
                <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-base-200 px-2 py-1 text-xs font-mono break-all">
                        {apiKey.apiKey || apiKey.keyPrefix}
                    </code>
                    <div className="tooltip" data-tip={copied ? 'Copied!' : 'Copy full API key'}>
                        <button
                            className="btn btn-ghost btn-sm btn-square"
                            onClick={handleCopy}
                        >
                            {copied ? (
                                <Check className="h-3.5 w-3.5 text-success" />
                            ) : (
                                <Copy className="h-3.5 w-3.5" />
                            )}
                        </button>
                    </div>
                </div>
            </td>
            <td>
                <span className="text-sm opacity-70">{createdText}</span>
            </td>
            <td>
                {expirationInfo.warning ? (
                    <span
                        className={`badge ${
                            expirationInfo.variant === 'destructive'
                                ? 'badge-error'
                                : 'badge-warning'
                        } gap-1`}
                    >
                        {expirationInfo.variant === 'default' && (
                            <AlertCircle className="h-3 w-3" />
                        )}
                        {expirationInfo.text}
                    </span>
                ) : (
                    <span className="text-sm opacity-70">{expirationInfo.text}</span>
                )}
            </td>
            <td>
                <span className="text-sm opacity-70">{lastUsedText}</span>
            </td>
        </tr>
    );
}
