import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Lock } from 'lucide-react';
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
 * - Device details (browser and OS parsed from user agent)
 * - IP Address
 * - Last accessed (relative time)
 * - Created date
 * - Checkbox for bulk selection (when enabled)
 *
 * Current session:
 * - Highlighted with blue background
 * - Shows "Current" badge and lock icon
 * - Cannot be selected for deletion (checkbox disabled)
 *
 * Delete operations are performed via bulk delete only.
 */
export function SessionRow({ session, showCheckbox, selected, onToggleSelect }: SessionRowProps) {

    // Memoize user agent parsing to avoid unnecessary re-computation
    const deviceInfo = useMemo(() => parseUserAgent(session.userAgent), [session.userAgent]);
    const isCurrent = session.isCurrent || false;

    // Memoize date formatting to avoid unnecessary re-computation
    const lastAccessed = useMemo(
        () =>
            session.dateLastAccessed
                ? formatDistanceToNow(new Date(session.dateLastAccessed), { addSuffix: true })
                : 'Never',
        [session.dateLastAccessed]
    );

    const created = useMemo(() => new Date(session.dateCreated).toLocaleDateString(), [session.dateCreated]);

    return (
        <tr className={isCurrent ? 'bg-info/10' : ''}>
            {/* Checkbox column only shows if bulk delete is available */}
            {showCheckbox && (
                <td>
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={selected}
                        onChange={onToggleSelect}
                        disabled={isCurrent}
                        aria-label={`Select session from ${deviceInfo.browser}`}
                    />
                </td>
            )}
            <td>
                <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{deviceInfo.browser}</span>
                        <span className="text-xs opacity-70">{deviceInfo.os}</span>
                    </div>
                    {isCurrent && <Lock className="h-4 w-4 text-info" />}
                    {isCurrent && (
                        <span className="badge badge-primary badge-sm">
                            Current
                        </span>
                    )}
                </div>
            </td>
            <td>
                <span className="text-sm">{session.ipAddress}</span>
            </td>
            <td>
                <span className="text-sm">{lastAccessed}</span>
            </td>
            <td>
                <span className="text-sm">{created}</span>
            </td>
        </tr>
    );
}
