import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, Copy, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
        <TableRow>
            {/* Checkbox column only shows if bulk delete is available */}
            {showCheckbox && (
                <TableCell>
                    <Checkbox
                        checked={selected}
                        onCheckedChange={onToggleSelect}
                        aria-label={`Select ${apiKey.label || apiKey.keyPrefix}`}
                    />
                </TableCell>
            )}
            <TableCell>
                <span className="text-sm font-medium">
                    {apiKey.label || <span className="text-muted-foreground">Unnamed</span>}
                </span>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-2 py-1 text-xs font-mono break-all">
                        {apiKey.apiKey || apiKey.keyPrefix}
                    </code>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleCopy}
                                >
                                    {copied ? (
                                        <Check className="h-3.5 w-3.5 text-green-600" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{copied ? 'Copied!' : 'Copy full API key'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </TableCell>
            <TableCell>
                <span className="text-sm text-muted-foreground">{createdText}</span>
            </TableCell>
            <TableCell>
                {expirationInfo.warning ? (
                    <Badge
                        variant={expirationInfo.variant}
                        className={cn(
                            expirationInfo.variant === 'default' &&
                                'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        )}
                    >
                        {expirationInfo.variant === 'default' && (
                            <AlertCircle className="mr-1 h-3 w-3" />
                        )}
                        {expirationInfo.text}
                    </Badge>
                ) : (
                    <span className="text-sm text-muted-foreground">{expirationInfo.text}</span>
                )}
            </TableCell>
            <TableCell>
                <span className="text-sm text-muted-foreground">{lastUsedText}</span>
            </TableCell>
        </TableRow>
    );
}
