import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Monitor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { Session } from '../types';
import { parseUserAgent } from '../utils/parse_user_agent';

interface SessionRowProps {
    session: Session;
    showCheckbox?: boolean; // Show selection checkbox
    selected?: boolean; // Is this row selected
    onToggleSelect?: () => void; // Toggle selection callback
}

/**
 * Individual session table row
 *
 * Displays session information:
 * - Device & Browser (with Monitor icon, browser name, OS • device type)
 * - IP Address
 * - Last accessed (relative time)
 * - Checkbox for bulk selection (when enabled)
 *
 * Current session:
 * - Shows "Current Session" badge in emerald color
 * - Cannot be selected for deletion (checkbox disabled)
 *
 * Delete operations are performed via bulk delete only.
 */
export function SessionRow({ session, showCheckbox, selected, onToggleSelect }: SessionRowProps) {

    // Memoize user agent parsing to avoid unnecessary re-computation
    const device_info = useMemo(() => parseUserAgent(session.userAgent), [session.userAgent]);
    const is_current = session.isCurrent || false;

    // Memoize date formatting to avoid unnecessary re-computation
    const last_accessed = useMemo(
        () =>
            session.dateLastAccessed
                ? formatDistanceToNow(new Date(session.dateLastAccessed), { addSuffix: true })
                : 'Never',
        [session.dateLastAccessed]
    );

    return (
        <TableRow>
            {/* Checkbox column only shows if bulk delete is available */}
            {showCheckbox && (
                <TableCell>
                    <Checkbox
                        checked={selected}
                        onCheckedChange={onToggleSelect}
                        disabled={is_current}
                        aria-label={`Select session from ${device_info.browser}`}
                    />
                </TableCell>
            )}
            <TableCell>
                <div className="flex items-center justify-between">
                    <div className="flex flex-col space-y-1">
                        <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{device_info.browser}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {device_info.os} • {device_info.device}
                        </span>
                    </div>
                    {is_current && (
                        <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 ml-2">
                            Current Session
                        </Badge>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <span className="text-sm">{session.ipAddress}</span>
            </TableCell>
            <TableCell>
                <span className="text-sm">{last_accessed}</span>
            </TableCell>
        </TableRow>
    );
}
