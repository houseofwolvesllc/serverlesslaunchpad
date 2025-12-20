/**
 * useHalResourceDetail Hook
 *
 * React hook for managing HAL resource detail view state and logic.
 * Provides organized data, derived state, and action handlers for rendering
 * resource detail pages in a framework-agnostic way.
 *
 * This hook extracts common business logic from HalResourceDetail components
 * across different UI frameworks (Mantine, shadcn, DaisyUI).
 */

import { useState, useMemo } from 'react';
import type {
    HalObject,
    HalTemplate,
    InferenceOptions,
    TemplateExecutionContext,
} from '@houseofwolves/serverlesslaunchpad.web.commons';
import {
    categorizeTemplate,
    buildTemplateData,
    getConfirmationConfig,
    type TemplateCategory,
    type ConfirmationConfig,
} from '@houseofwolves/serverlesslaunchpad.web.commons';
import {
    inferPageTitle,
    organizeFields,
    filterDisplayableTemplates,
    type OrganizedFields,
} from './resource_utils';

/**
 * Custom field renderer function type
 */
export type FieldRenderer = (value: any, field: any, resource: HalObject) => React.ReactNode;

/**
 * Template action handler result
 */
export interface TemplateActionResult {
    /** Category of the template action */
    category: TemplateCategory;
    /** Template to execute */
    template: HalTemplate;
    /** Execution context (for action templates) */
    context?: TemplateExecutionContext;
}

/**
 * Hook result interface
 */
export interface UseHalResourceDetailResult {
    /** Inferred page title from resource */
    pageTitle: string;
    /** Organized field sections */
    fields: OrganizedFields;
    /** Displayable template entries for actions */
    displayableTemplates: Array<[string, any]>;
    /** Currently executing template key */
    executingTemplate: string | null;
    /** Set executing template state */
    setExecutingTemplate: (key: string | null) => void;
    /** Handle template click with categorization */
    handleTemplateAction: (templateKey: string, template: HalTemplate) => TemplateActionResult;
    /** Get confirmation config for a template */
    getTemplateConfirmation: (template: HalTemplate, context: TemplateExecutionContext) => ConfirmationConfig;
    /** Execute a template with the given context */
    prepareTemplateExecution: (template: HalTemplate, context: TemplateExecutionContext) => {
        data: Record<string, any>;
        template: HalTemplate;
    };
}

/**
 * Hook parameters
 */
export interface UseHalResourceDetailParams {
    /** HAL resource to display */
    resource: HalObject | null | undefined;
    /** Optional field configuration for customization */
    fieldConfig?: InferenceOptions;
    /** Fallback title if none can be inferred */
    fallbackTitle?: string;
}

/**
 * React hook for managing HAL resource detail view
 *
 * Extracts and organizes all business logic for rendering a single HAL resource
 * in a detail view. Provides organized fields, template actions, and state management
 * without any UI framework dependencies.
 *
 * @param params - Hook parameters
 * @returns Hook result with organized data and handlers
 *
 * @example
 * ```tsx
 * // Basic usage in any UI framework
 * function UserDetail({ userId }) {
 *   const { data: user } = useHalResource(`/users/${userId}`);
 *   const {
 *     pageTitle,
 *     fields,
 *     displayableTemplates,
 *     handleTemplateAction,
 *     executingTemplate
 *   } = useHalResourceDetail({ resource: user });
 *
 *   return (
 *     <div>
 *       <h1>{pageTitle}</h1>
 *
 *       {fields.overview.length > 0 && (
 *         <section>
 *           <h2>Overview</h2>
 *           {fields.overview.map(field => (
 *             <Field key={field.key} field={field} value={user[field.key]} />
 *           ))}
 *         </section>
 *       )}
 *
 *       {fields.details.length > 0 && (
 *         <section>
 *           <h2>Details</h2>
 *           {fields.details.map(field => (
 *             <Field key={field.key} field={field} value={user[field.key]} />
 *           ))}
 *         </section>
 *       )}
 *
 *       <div>
 *         {displayableTemplates.map(([key, template]) => (
 *           <Button
 *             key={key}
 *             onClick={() => {
 *               const result = handleTemplateAction(key, template);
 *               if (result.category === 'form') {
 *                 openFormModal(template);
 *               } else if (result.category === 'action') {
 *                 openConfirmDialog(template, result.context);
 *               }
 *             }}
 *             loading={executingTemplate === key}
 *           >
 *             {template.title}
 *           </Button>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With field customization
 * const {
 *   pageTitle,
 *   fields,
 *   displayableTemplates
 * } = useHalResourceDetail({
 *   resource: user,
 *   fieldConfig: {
 *     hideFields: ['_internal', 'metadata'],
 *     labelOverrides: { userId: 'User ID', createdAt: 'Created' },
 *     fieldTypeOverrides: { userId: FieldType.CODE }
 *   },
 *   fallbackTitle: 'User Details'
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Handling template actions
 * const { handleTemplateAction, prepareTemplateExecution } = useHalResourceDetail({
 *   resource: user
 * });
 *
 * // On template button click
 * function onTemplateClick(key, template) {
 *   const result = handleTemplateAction(key, template);
 *
 *   switch (result.category) {
 *     case 'navigation':
 *       // Execute immediately, navigate to result
 *       const { data } = prepareTemplateExecution(template, result.context);
 *       await executeTemplate(template, data);
 *       break;
 *
 *     case 'form':
 *       // Show form modal
 *       setFormState({ open: true, template });
 *       break;
 *
 *     case 'action':
 *       // Show confirmation dialog
 *       setConfirmState({ open: true, template, context: result.context });
 *       break;
 *   }
 * }
 * ```
 */
export function useHalResourceDetail({
    resource,
    fieldConfig = {},
    fallbackTitle = 'Resource Details',
}: UseHalResourceDetailParams): UseHalResourceDetailResult {
    // Track which template is currently executing
    const [executingTemplate, setExecutingTemplate] = useState<string | null>(null);

    // Organize fields into overview and details sections
    const fields = useMemo(
        () => organizeFields(resource, fieldConfig),
        [resource, fieldConfig]
    );

    // Infer page title from resource
    const pageTitle = useMemo(
        () => inferPageTitle(resource, fields.overview, fallbackTitle),
        [resource, fields.overview, fallbackTitle]
    );

    // Filter templates to displayable actions
    const displayableTemplates = useMemo(
        () => filterDisplayableTemplates(resource?._templates),
        [resource?._templates]
    );

    /**
     * Handle template action and determine how to process it
     *
     * Categorizes the template and prepares the execution context based on the category.
     *
     * @param templateKey - Key of the template in _templates object
     * @param template - The HAL template to execute
     * @returns Template action result with category and context
     */
    const handleTemplateAction = (
        templateKey: string,
        template: HalTemplate
    ): TemplateActionResult => {
        const category = categorizeTemplate(templateKey, template);

        // Prepare execution context for non-form templates
        const context: TemplateExecutionContext = {
            template,
            resource,
        };

        return {
            category,
            template,
            context: category !== 'form' ? context : undefined,
        };
    };

    /**
     * Get confirmation configuration for a template
     *
     * @param template - Template to get confirmation config for
     * @param context - Execution context
     * @returns Confirmation configuration
     */
    const getTemplateConfirmation = (
        template: HalTemplate,
        context: TemplateExecutionContext
    ): ConfirmationConfig => {
        return getConfirmationConfig(template, context);
    };

    /**
     * Prepare template execution by building template data
     *
     * @param template - Template to execute
     * @param context - Execution context with template, resource, and optional formData
     * @returns Object with template data ready for execution
     */
    const prepareTemplateExecution = (
        template: HalTemplate,
        context: TemplateExecutionContext
    ) => {
        const data = buildTemplateData(context);
        return { data, template };
    };

    return {
        pageTitle,
        fields,
        displayableTemplates,
        executingTemplate,
        setExecutingTemplate,
        handleTemplateAction,
        getTemplateConfirmation,
        prepareTemplateExecution,
    };
}
