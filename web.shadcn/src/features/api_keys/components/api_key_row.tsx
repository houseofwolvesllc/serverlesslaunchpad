import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

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
 * - Creation date (formatted date)
 * - Last used (formatted date or "Never")
 * - Checkbox for bulk selection (when enabled)
 *
 * Delete operations are performed via bulk delete only.
 */
export function ApiKeyRow({ apiKey, showCheckbox, selected, onToggleSelect }: ApiKeyRowProps) {
    const [copied, set_copied] = useState(false);

    // Memoize date formatting
    const created_text = useMemo(
        () =>
            apiKey.dateCreated
                ? new Date(apiKey.dateCreated).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                  })
                : 'Unknown',
        [apiKey.dateCreated]
    );

    const last_used_text = useMemo(
        () =>
            apiKey.dateLastUsed
                ? new Date(apiKey.dateLastUsed).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                  })
                : 'Never',
        [apiKey.dateLastUsed]
    );

    const handle_copy = async () => {
        try {
            await navigator.clipboard.writeText(apiKey.apiKey);
            set_copied(true);
            setTimeout(() => set_copied(false), 2000);
        } catch (err) {
            // Silently fail - clipboard API may not be available
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
                        aria-label={`Select ${apiKey.label || 'API key'}`}
                    />
                </TableCell>
            )}
            <TableCell>
                <span className="font-medium">
                    {apiKey.label || <span className="text-muted-foreground">Unnamed</span>}
                </span>
            </TableCell>
            <TableCell className="min-w-[400px]">
                <div className="flex items-center gap-2 w-full">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 break-all">
                        {apiKey.apiKey}
                    </code>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={handle_copy}
                        title={copied ? 'Copied!' : 'Copy API key'}
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </TableCell>
            <TableCell>
                <span className="text-muted-foreground">{created_text}</span>
            </TableCell>
            <TableCell>
                <span className="text-muted-foreground">
                    {last_used_text === 'Never' ? (
                        <span className="text-xs">{last_used_text}</span>
                    ) : (
                        last_used_text
                    )}
                </span>
            </TableCell>
        </TableRow>
    );
}
