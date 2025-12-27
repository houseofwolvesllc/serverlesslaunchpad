/**
 * HalResourceRow - Renders a single row in a HAL collection table
 *
 * This component automatically renders table cells for each column using
 * the appropriate field renderer based on the column type.
 */

import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { type InferredColumn, type HalObject } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { getFieldRenderer, type FieldRenderer } from './field_renderers';

export interface HalResourceRowProps {
    item: HalObject;
    columns: InferredColumn[];
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
    onRowClick?: (item: HalObject) => void;
    customRenderers?: Record<string, FieldRenderer>;
    className?: string;
    getRowClassName?: (item: HalObject) => string;
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
    className = '',
    getRowClassName,
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

    const dynamicClassName = getRowClassName ? getRowClassName(item) : '';

    return (
        <TableRow
            className={`${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''} ${className} ${dynamicClassName}`}
            onClick={handleRowClick}
        >
            {/* Selection checkbox - shown if onToggleSelect is provided, disabled if not selectable */}
            {onToggleSelect && (
                <TableCell className="w-12" onClick={handleCheckboxClick}>
                    <Checkbox
                        checked={selected}
                        onCheckedChange={handleCheckboxChange}
                        disabled={!selectable}
                        aria-label="Select row"
                    />
                </TableCell>
            )}

            {/* Data cells */}
            {columns.map((column) => {
                const value = item[column.key];
                const renderer = getFieldRenderer(column, customRenderers);

                return (
                    <TableCell
                        key={column.key}
                        style={{ width: column.width }}
                        className="align-middle overflow-hidden"
                    >
                        {renderer(value, column, item)}
                    </TableCell>
                );
            })}
        </TableRow>
    );
}
