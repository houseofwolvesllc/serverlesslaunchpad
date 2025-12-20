/**
 * HalResourceRow - Renders a single row in a HAL collection table
 *
 * This component automatically renders table cells for each column using
 * the appropriate field renderer based on the column type.
 */

import { type InferredColumn, type HalObject } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { getFieldRenderer, type FieldRenderer } from './field_renderers';
import { cn } from '@/lib/utils';

export interface HalResourceRowProps {
    item: HalObject;
    columns: InferredColumn[];
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
    onRowClick?: (item: HalObject) => void;
    customRenderers?: Record<string, FieldRenderer>;
}

/**
 * Renders a single resource row in a collection table
 *
 * @example
 * ```tsx
 * <HalResourceRow
 *   item={apiKey}
 *   columns={columns}
 *   selectable={true}
 *   selected={isSelected(apiKey.apiKeyId)}
 *   onToggleSelect={() => toggleSelection(apiKey.apiKeyId)}
 *   customRenderers={{
 *     status: (value) => <CustomStatusBadge status={value} />
 *   }}
 * />
 * ```
 */
export function HalResourceRow({
    item,
    columns,
    selectable = false,
    selected = false,
    onToggleSelect,
    onRowClick,
    customRenderers,
}: HalResourceRowProps) {
    const handleRowClick = () => {
        if (onRowClick) {
            onRowClick(item);
        }
    };

    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleCheckboxChange = () => {
        if (onToggleSelect) {
            onToggleSelect();
        }
    };

    return (
        <tr
            className={cn(onRowClick && 'cursor-pointer hover:bg-base-200')}
            onClick={handleRowClick}
        >
            {/* Selection checkbox */}
            {selectable && (
                <td className="w-12" onClick={handleCheckboxClick}>
                    <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selected}
                        onChange={handleCheckboxChange}
                        aria-label="Select row"
                    />
                </td>
            )}

            {/* Data cells */}
            {columns.map((column) => {
                const value = item[column.key];
                const renderer = getFieldRenderer(column, customRenderers);

                return (
                    <td
                        key={column.key}
                        style={{ width: column.width }}
                        className="align-middle"
                    >
                        {renderer(value, column, item)}
                    </td>
                );
            })}
        </tr>
    );
}
