/**
 * HalCollectionList - Generic collection component for HAL resources
 *
 * This component automatically renders a table with:
 * - Inferred columns from embedded items
 * - Selection and bulk operations
 * - Action toolbar with create/refresh/bulk operations
 * - Field renderers based on data type
 * - Empty and loading states
 * - Template categorization (navigation/form/action)
 * - Context-aware template execution
 *
 * Checkboxes are only shown when bulkOperations is provided and has items.
 *
 * This is the main component that drastically reduces feature code.
 */

import { useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, RefreshCw } from 'lucide-react';
import { useHalCollection, type ColumnConfig } from '@/hooks/use_hal_collection';
import { useSelection } from '@/hooks/use_selection';
import { HalResourceRow } from './hal_resource_row';
import { type FieldRenderer } from './field_renderers';
import { TemplateForm } from '@/components/hal_forms/template_form';
import { ConfirmationDialog } from '@/components/ui/confirmation_dialog';
import {
    type HalObject,
    type BulkOperation,
    categorizeTemplate,
    buildTemplateData,
    getConfirmationConfig,
    type TemplateExecutionContext,
} from '@houseofwolves/serverlesslaunchpad.web.commons';
import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { toast } from 'sonner';

export interface HalCollectionListProps {
    resource: HalObject | null | undefined;
    onRefresh?: () => void;
    onCreate?: () => void;
    onRowClick?: (item: HalObject) => void;
    /** Template execution handler (for categorized templates) */
    onTemplateExecute?: (template: HalTemplate, data: Record<string, any>) => Promise<void>;
    columnConfig?: ColumnConfig;
    customRenderers?: Record<string, FieldRenderer>;
    primaryKey?: string;
    emptyMessage?: string;
    emptyIcon?: React.ReactNode;
    showCreateButton?: boolean;
    showRefreshButton?: boolean;
    className?: string;
    selectableFilter?: (item: HalObject) => boolean;
    getRowClassName?: (item: HalObject) => string;
    /** Page title to display in the header row */
    title?: string;
    /** Bulk operations to show when items are selected. Checkboxes only appear when this has items. */
    bulkOperations?: BulkOperation[];
}

/**
 * Generic HAL collection list component
 *
 * @example
 * ```tsx
 * // Minimal usage - everything automatic
 * <HalCollectionList
 *   resource={data}
 *   onRefresh={refresh}
 * />
 *
 * // With customization
 * <HalCollectionList
 *   resource={data}
 *   onRefresh={refresh}
 *   onCreate={() => setCreateModalOpen(true)}
 *   bulkOperations={[
 *     { id: 'delete', label: 'Delete Selected', variant: 'destructive', handler: handleBulkDelete }
 *   ]}
 *   columnConfig={{
 *     dateLastUsed: { nullText: "Never" }
 *   }}
 *   customRenderers={{
 *     status: (value, col, item) => <CustomStatusBadge item={item} />
 *   }}
 * />
 * ```
 */
export function HalCollectionList({
    resource,
    onRefresh,
    onCreate,
    onRowClick,
    onTemplateExecute,
    columnConfig = {},
    customRenderers,
    primaryKey = 'id',
    emptyMessage = 'No items found',
    emptyIcon,
    showCreateButton = true,
    showRefreshButton = true,
    className = '',
    selectableFilter,
    getRowClassName,
    title,
    bulkOperations = [],
}: HalCollectionListProps) {
    const { items, columns, templates, isEmpty } = useHalCollection(resource, { columnConfig });

    // State for confirmation dialog
    const [confirmationState, setConfirmationState] = useState<{
        open: boolean;
        template: HalTemplate | null;
        context: TemplateExecutionContext | null;
    }>({ open: false, template: null, context: null });

    // State for form dialog
    const [formState, setFormState] = useState<{
        open: boolean;
        template: HalTemplate | null;
        templateKey: string | null;
    }>({ open: false, template: null, templateKey: null });

    // Loading state for template execution
    const [executingTemplate, setExecutingTemplate] = useState<string | null>(null);

    // Detect primary key from first item if not provided
    const detectedPrimaryKey =
        items.length > 0
            ? Object.keys(items[0]).find((key) => key.toLowerCase().endsWith('id')) || primaryKey
            : primaryKey;

    const {
        selected,
        toggleSelection,
        toggleAll,
        clearSelection,
        isSelected,
        allSelected,
        hasSelection,
        count: selectedCount,
    } = useSelection(items, detectedPrimaryKey, selectableFilter);

    // Get templates from resource
    const createTemplate = templates?.default || templates?.create;

    // Checkboxes are shown only when bulk operations are defined
    const showCheckboxes = bulkOperations.length > 0;

    // Handle template execution with context
    const executeTemplate = async (template: HalTemplate, context: TemplateExecutionContext) => {
        try {
            const data = buildTemplateData(context);

            if (onTemplateExecute) {
                await onTemplateExecute(template, data);
            }

            // Clear selections after successful bulk operation
            if (context.selections && context.selections.length > 0) {
                clearSelection();
            }

            // Refresh the list
            if (onRefresh) {
                await onRefresh();
            }

            toast.success(template.title || 'Action completed');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Operation failed';
            toast.error(message);
            throw error;
        }
    };

    // Handle create action
    const handleCreate = () => {
        if (onCreate) {
            // Legacy onCreate handler
            onCreate();
        } else if (createTemplate && onTemplateExecute) {
            // Use template categorization
            const category = categorizeTemplate('create', createTemplate);

            if (category === 'form') {
                // Show form dialog
                setFormState({
                    open: true,
                    template: createTemplate,
                    templateKey: 'create',
                });
            }
        }
    };

    // Handle confirmation dialog confirm
    const handleConfirmAction = async () => {
        if (!confirmationState.template || !confirmationState.context) return;

        const templateKey = Object.keys(templates || {}).find(
            key => templates?.[key] === confirmationState.template
        );

        setExecutingTemplate(templateKey || 'action');

        try {
            await executeTemplate(confirmationState.template, confirmationState.context);
            setConfirmationState({ open: false, template: null, context: null });
        } finally {
            setExecutingTemplate(null);
        }
    };

    // Handle form dialog submit
    const handleFormSubmit = async (formData: Record<string, any>) => {
        if (!formState.template) return;

        setExecutingTemplate(formState.templateKey || 'form');

        try {
            const context: TemplateExecutionContext = {
                template: formState.template,
                formData,
                resource,
            };

            await executeTemplate(formState.template, context);
            setFormState({ open: false, template: null, templateKey: null });
        } finally {
            setExecutingTemplate(null);
        }
    };

    // Handle refresh action
    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        }
    };

    // Handle select all checkbox
    const handleSelectAll = () => {
        toggleAll();
    };

    // Empty state
    if (isEmpty) {
        return (
            <div className={`space-y-4 ${className}`}>
                {/* Page title */}
                {title && (
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                    </div>
                )}

                {/* Action toolbar */}
                <div className="flex items-center justify-end gap-2">
                    {showCreateButton && createTemplate && (
                        <Button variant="outline" size="sm" onClick={handleCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {createTemplate.title || 'Create'}
                        </Button>
                    )}
                    {showRefreshButton && (
                        <Button variant="outline" size="sm" onClick={handleRefresh}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    )}
                </div>

                {/* Empty state card */}
                <Card className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        {emptyIcon && <div className="mb-4 text-muted-foreground">{emptyIcon}</div>}
                        <h3 className="text-lg font-semibold mb-2">No Items</h3>
                        <p className="text-sm text-muted-foreground mb-6">{emptyMessage}</p>
                        {showCreateButton && createTemplate && (
                            <Button onClick={handleCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                {createTemplate.title || 'Create First Item'}
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Page title */}
            {title && (
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                </div>
            )}

            {/* Action toolbar */}
            <div className="flex items-center justify-between">
                {hasSelection ? (
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
                        </span>
                        <Button variant="ghost" size="sm" onClick={clearSelection}>
                            Clear
                        </Button>
                    </div>
                ) : (
                    <div />
                )}

                <div className="flex items-center gap-2">
                    {hasSelection && bulkOperations.map((op) => (
                        <Button
                            key={op.id}
                            variant={op.variant === 'destructive' ? 'destructive' : (op.variant || 'outline')}
                            size="sm"
                            onClick={() => op.handler(Array.from(selected), clearSelection)}
                            disabled={op.disabled?.(Array.from(selected))}
                        >
                            {op.icon ? <span className="mr-2">{op.icon as ReactNode}</span> : null}
                            {op.label}
                        </Button>
                    ))}
                    {showCreateButton && createTemplate && (
                        <Button variant="outline" size="sm" onClick={handleCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {createTemplate.title || 'Create'}
                        </Button>
                    )}
                    {showRefreshButton && (
                        <Button variant="outline" size="sm" onClick={handleRefresh}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {/* Select all checkbox */}
                            {showCheckboxes && (
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={allSelected}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                            )}

                            {/* Column headers */}
                            {columns.map((col) => (
                                <TableHead key={col.key} style={{ width: col.width }} className="whitespace-nowrap">
                                    {col.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => {
                            const itemId = item[detectedPrimaryKey];
                            const itemSelectable = showCheckboxes && (!selectableFilter || selectableFilter(item));

                            return (
                                <HalResourceRow
                                    key={itemId || Math.random()}
                                    item={item}
                                    columns={columns}
                                    selectable={itemSelectable}
                                    selected={isSelected(itemId)}
                                    onToggleSelect={showCheckboxes ? () => toggleSelection(itemId) : undefined}
                                    onRowClick={onRowClick}
                                    customRenderers={customRenderers}
                                    getRowClassName={getRowClassName}
                                />
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>

            {/* Confirmation Dialog for actions */}
            {confirmationState.template && confirmationState.context && (
                <ConfirmationDialog
                    open={confirmationState.open}
                    onOpenChange={(open) => {
                        if (!open) {
                            setConfirmationState({ open: false, template: null, context: null });
                        }
                    }}
                    {...getConfirmationConfig(confirmationState.template, confirmationState.context)}
                    onConfirm={handleConfirmAction}
                    loading={executingTemplate !== null}
                />
            )}

            {/* Form Dialog for create/update */}
            {formState.template && (
                <Dialog open={formState.open} onOpenChange={(open) => {
                    if (!open) {
                        setFormState({ open: false, template: null, templateKey: null });
                    }
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{formState.template.title || 'Form'}</DialogTitle>
                            <DialogDescription>
                                Fill out the form below and submit.
                            </DialogDescription>
                        </DialogHeader>
                        <TemplateForm
                            template={formState.template}
                            onSubmit={handleFormSubmit}
                            onCancel={() => setFormState({ open: false, template: null, templateKey: null })}
                            loading={executingTemplate !== null}
                            hideTitle={true}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
