/**
 * HalResourceRow - Renders a single row in a HAL collection table
 *
 * This component automatically renders table cells for each column using
 * the appropriate field renderer based on the column type.
 */

import { Table, Checkbox } from '@mantine/core';
import { type InferredColumn, type HalObject } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { getFieldRenderer, type FieldRenderer } from './field_renderers';

export interface HalResourceRowProps {
    item: HalObject;
    columns: InferredColumn[];
    showCheckboxColumn?: boolean;
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
    showCheckboxColumn = false,
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
        if (onToggleSelect && selectable) {
            onToggleSelect();
        }
    };

    return (
        <Table.Tr
            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            onClick={handleRowClick}
        >
            {/* Selection checkbox - always show column if bulk operations enabled */}
            {showCheckboxColumn && (
                <Table.Td w={60} onClick={handleCheckboxClick}>
                    {selectable && (
                        <Checkbox
                            checked={selected}
                            onChange={handleCheckboxChange}
                            aria-label="Select row"
                        />
                    )}
                </Table.Td>
            )}

            {/* Data cells */}
            {columns.map((column) => {
                const value = item[column.key];
                const renderer = getFieldRenderer(column, customRenderers);

                return (
                    <Table.Td
                        key={column.key}
                        style={{ width: column.width, verticalAlign: 'middle', overflow: 'hidden' }}
                    >
                        {renderer(value, column, item)}
                    </Table.Td>
                );
            })}
        </Table.Tr>
    );
}
