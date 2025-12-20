/**
 * HalResourceDetail - Renders a single HAL resource with inferred field types
 *
 * This component automatically displays a resource in a card-based layout with:
 * - Breadcrumb navigation (Home → Current page)
 * - Field display sections (Overview, Details)
 * - Template actions section
 * - Type-based field rendering
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, RefreshCw } from 'lucide-react';
import {
    extractResourceFields,
    humanizeLabel,
    type HalObject,
    type InferredColumn,
    type InferenceOptions,
} from '@houseofwolves/serverlesslaunchpad.web.commons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { getFieldRenderer, type FieldRenderer } from '../hal_collection/field_renderers';

export interface HalResourceDetailProps {
    resource: HalObject | null | undefined;
    fieldConfig?: InferenceOptions;
    customRenderers?: Record<string, FieldRenderer>;
    onRefresh?: () => void;
    onTemplateExecute?: (template: any, data: any) => Promise<void>;
    loading?: boolean;
    error?: Error | null;
}

/**
 * Renders a single HAL resource with inferred fields and sections
 *
 * @example
 * ```tsx
 * <HalResourceDetail
 *   resource={user}
 *   fieldConfig={{
 *     fieldTypeOverrides: { userId: FieldType.CODE },
 *     labelOverrides: { userId: 'User ID' }
 *   }}
 *   customRenderers={{
 *     avatar: (value) => <Avatar url={value} />
 *   }}
 *   onRefresh={refetch}
 *   onTemplateExecute={handleTemplateExecute}
 * />
 * ```
 */
export function HalResourceDetail({
    resource,
    fieldConfig = {},
    customRenderers,
    onRefresh,
    onTemplateExecute,
    loading = false,
    error = null,
}: HalResourceDetailProps) {
    const [executingTemplate, setExecutingTemplate] = useState<string | null>(null);

    // Extract and infer fields from resource
    const allFields = resource ? extractResourceFields(resource, fieldConfig) : [];

    // Separate fields into overview (primary identifiers) and details (everything else)
    const overviewFields = allFields.filter(field =>
        /^(name|title|label)$/i.test(field.key) && !field.hidden
    );

    const detailFields = allFields.filter(field =>
        !/^(name|title|label)$/i.test(field.key) && !field.hidden
    );

    // Extract page title from resource
    const getPageTitle = (): string => {
        if (!resource) return 'Resource';

        // Try common title fields
        const titleField = resource.title || resource.name || resource.label;
        if (titleField) return String(titleField);

        // Fall back to first non-empty field
        for (const field of overviewFields) {
            const value = resource[field.key];
            if (value) return String(value);
        }

        return 'Resource Details';
    };

    const pageTitle = getPageTitle();

    // Extract templates for actions
    const templates = resource?._templates || {};
    const templateEntries = Object.entries(templates).filter(([key]) => key !== 'default' && key !== 'self');

    // Handle template execution
    const handleTemplateClick = async (templateKey: string, template: any) => {
        if (!onTemplateExecute) return;

        setExecutingTemplate(templateKey);
        try {
            await onTemplateExecute(template, {});
        } finally {
            setExecutingTemplate(null);
        }
    };

    // Render a single field
    const renderField = (field: InferredColumn) => {
        if (!resource) return null;

        const value = resource[field.key];
        const renderer = getFieldRenderer(field, customRenderers);

        return (
            <div key={field.key} className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                    {field.label}
                </label>
                <div className="text-sm">
                    {renderer(value, field, resource)}
                </div>
            </div>
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                {/* Breadcrumb skeleton */}
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                </div>

                {/* Header skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                    </div>
                </div>

                {/* Content skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                        <Home className="h-4 w-4" />
                        Home
                    </Link>
                    <span>/</span>
                    <span className="text-foreground">Error</span>
                </nav>

                {/* Error alert */}
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Resource</AlertTitle>
                    <AlertDescription>
                        {error.message || 'Failed to load resource. Please try again.'}
                    </AlertDescription>
                </Alert>

                {onRefresh && (
                    <Button onClick={onRefresh} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                )}
            </div>
        );
    }

    // No resource state
    if (!resource) {
        return (
            <div className="space-y-6">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Resource</AlertTitle>
                    <AlertDescription>
                        No resource data available.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    Home
                </Link>
                <span>/</span>
                <span className="text-foreground">{pageTitle}</span>
            </nav>

            {/* Page Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
                    {resource._links?.self && (
                        <p className="text-muted-foreground">
                            {Array.isArray(resource._links.self)
                                ? resource._links.self[0]?.title
                                : resource._links.self.title}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {onRefresh && (
                        <Button variant="outline" onClick={onRefresh} size="sm">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    )}
                </div>
            </div>

            {/* Overview Section (Primary Fields) */}
            {overviewFields.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                        <CardDescription>Primary identifying information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {overviewFields.map(renderField)}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Details Section (All Other Fields) */}
            {detailFields.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                        <CardDescription>All resource fields</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {detailFields.map(renderField)}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions Section (Templates) */}
            {templateEntries.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>Available operations for this resource</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {templateEntries.map(([key, template]) => (
                                <Button
                                    key={key}
                                    variant="default"
                                    onClick={() => handleTemplateClick(key, template)}
                                    disabled={executingTemplate === key}
                                >
                                    {executingTemplate === key ? 'Executing...' : (template as any).title || humanizeLabel(key)}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
