# HAL Resource Detail Hook

This module provides a reusable React hook (`useHalResourceDetail`) and utility functions for managing HAL resource detail views. It extracts common business logic from HalResourceDetail components across different UI frameworks (Mantine, shadcn/ui, DaisyUI).

## Overview

The `useHalResourceDetail` hook encapsulates all the business logic needed to render a single HAL resource in a detail view, including:

- **Page title inference** from resource metadata
- **Field organization** into overview and details sections
- **Template filtering** to show only displayable actions
- **Template categorization** for appropriate UX patterns
- **Execution state management** for loading indicators

## Files

### `use_hal_resource_detail.ts`
Main React hook that provides organized data and state management for resource detail views.

**Exports:**
- `useHalResourceDetail(params)` - Primary hook
- `UseHalResourceDetailResult` - Hook return type
- `UseHalResourceDetailParams` - Hook parameter type
- `FieldRenderer` - Custom field renderer function type
- `TemplateActionResult` - Template action handler result type

### `resource_utils.ts`
Pure utility functions for processing HAL resources (framework-agnostic).

**Exports:**
- `inferPageTitle(resource, overviewFields?, fallback?)` - Infer page title from resource
- `organizeFields(resource, fieldConfig?)` - Organize fields into overview/details
- `filterDisplayableTemplates(templates?)` - Filter templates for detail view
- `OrganizedFields` - Field organization result type

### `index.ts`
Module barrel export file.

## Usage

### Basic Usage

```tsx
import { useHalResourceDetail } from '@houseofwolves/serverlesslaunchpad.web.commons.react';

function UserDetail({ userId }) {
  const { data: user } = useHalResource(`/users/${userId}`);

  const {
    pageTitle,
    fields,
    displayableTemplates,
    handleTemplateAction,
    executingTemplate
  } = useHalResourceDetail({ resource: user });

  return (
    <div>
      <h1>{pageTitle}</h1>

      {/* Overview Section */}
      {fields.overview.length > 0 && (
        <section>
          <h2>Overview</h2>
          {fields.overview.map(field => (
            <Field key={field.key} field={field} value={user[field.key]} />
          ))}
        </section>
      )}

      {/* Details Section */}
      {fields.details.length > 0 && (
        <section>
          <h2>Details</h2>
          {fields.details.map(field => (
            <Field key={field.key} field={field} value={user[field.key]} />
          ))}
        </section>
      )}

      {/* Action Buttons */}
      <div>
        {displayableTemplates.map(([key, template]) => (
          <Button
            key={key}
            onClick={() => {
              const result = handleTemplateAction(key, template);
              if (result.category === 'form') {
                openFormModal(template);
              } else if (result.category === 'action') {
                openConfirmDialog(template, result.context);
              }
            }}
            loading={executingTemplate === key}
          >
            {template.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

### With Field Customization

```tsx
const {
  pageTitle,
  fields,
  displayableTemplates
} = useHalResourceDetail({
  resource: user,
  fieldConfig: {
    hideFields: ['_internal', 'metadata'],
    labelOverrides: {
      userId: 'User ID',
      createdAt: 'Created'
    },
    fieldTypeOverrides: {
      userId: FieldType.CODE
    }
  },
  fallbackTitle: 'User Details'
});
```

### Handling Template Actions

```tsx
const {
  handleTemplateAction,
  prepareTemplateExecution,
  getTemplateConfirmation
} = useHalResourceDetail({ resource: user });

function onTemplateClick(key, template) {
  const result = handleTemplateAction(key, template);

  switch (result.category) {
    case 'navigation':
      // Execute immediately, navigate to result
      const { data } = prepareTemplateExecution(template, result.context);
      await executeTemplate(template, data);
      break;

    case 'form':
      // Show form modal
      setFormState({ open: true, template });
      break;

    case 'action':
      // Show confirmation dialog
      const config = getTemplateConfirmation(template, result.context);
      setConfirmState({
        open: true,
        template,
        context: result.context,
        ...config
      });
      break;
  }
}
```

## Hook API

### `useHalResourceDetail(params)`

**Parameters:**
- `resource: HalObject | null | undefined` - HAL resource to display
- `fieldConfig?: InferenceOptions` - Optional field configuration for customization
- `fallbackTitle?: string` - Fallback title if none can be inferred (default: "Resource Details")

**Returns:**
```typescript
{
  // Derived State
  pageTitle: string;                          // Inferred page title
  fields: OrganizedFields;                    // Organized field sections
  displayableTemplates: Array<[string, any]>; // Filtered template entries

  // Execution State
  executingTemplate: string | null;           // Currently executing template key
  setExecutingTemplate: (key) => void;        // Set executing template

  // Action Handlers
  handleTemplateAction: (key, template) => TemplateActionResult;
  getTemplateConfirmation: (template, context) => ConfirmationConfig;
  prepareTemplateExecution: (template, context) => { data, template };
}
```

## Utility Functions

### `inferPageTitle(resource, overviewFields?, fallback?)`

Determines the best title for a resource detail page using priority:
1. Self link title (`_links.self.title`)
2. Common title fields (title, name, label)
3. First non-empty overview field value
4. Fallback default

**Example:**
```typescript
import { inferPageTitle } from '@houseofwolves/serverlesslaunchpad.web.commons.react';

const resource = {
  _links: { self: { href: '/users/123', title: 'John Doe' } },
  userId: '123',
  email: 'john@example.com'
};

inferPageTitle(resource); // Returns: "John Doe"
```

### `organizeFields(resource, fieldConfig?)`

Separates resource fields into overview and details sections:
- **Overview:** Primary identifiers (name, title, label) that aren't hidden
- **Details:** All other non-hidden fields

**Example:**
```typescript
import { organizeFields } from '@houseofwolves/serverlesslaunchpad.web.commons.react';

const resource = {
  userId: '123',
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: '2024-01-01T00:00:00Z'
};

const { overview, details } = organizeFields(resource);
// overview: [{ key: 'name', label: 'Name', ... }]
// details: [{ key: 'userId', ... }, { key: 'email', ... }, { key: 'createdAt', ... }]
```

### `filterDisplayableTemplates(templates?)`

Filters templates to only show displayable actions in detail view by removing:
- Navigation templates (self, default)
- Delete operations (belong in list views)

**Example:**
```typescript
import { filterDisplayableTemplates } from '@houseofwolves/serverlesslaunchpad.web.commons.react';

const templates = {
  self: { method: 'GET', target: '/users/123' },
  default: { method: 'GET', target: '/users/123' },
  update: { method: 'PUT', target: '/users/123', properties: [...] },
  delete: { method: 'DELETE', target: '/users/123' }
};

const displayable = filterDisplayableTemplates(templates);
// Returns: [['update', { method: 'PUT', ... }]]
```

## Type Definitions

### `OrganizedFields`
```typescript
interface OrganizedFields {
  overview: InferredColumn[];  // Primary identifying fields
  details: InferredColumn[];   // All other non-hidden fields
}
```

### `TemplateActionResult`
```typescript
interface TemplateActionResult {
  category: TemplateCategory;              // 'navigation' | 'form' | 'action'
  template: HalTemplate;                   // Template to execute
  context?: TemplateExecutionContext;      // Execution context (if not form)
}
```

### `FieldRenderer`
```typescript
type FieldRenderer = (
  value: any,
  field: InferredColumn,
  resource: HalObject
) => React.ReactNode;
```

## Design Principles

1. **Framework-Agnostic**: Core business logic has no UI framework dependencies
2. **Reusable**: Works across Mantine, shadcn/ui, DaisyUI, and any future UI frameworks
3. **Type-Safe**: Full TypeScript support with comprehensive type definitions
4. **Well-Documented**: Complete JSDoc documentation on all exports
5. **Uses Existing Commons**: Leverages utilities from web.commons package
6. **Separation of Concerns**: Pure utilities separate from React hooks

## Integration

The hook integrates seamlessly with existing web.commons utilities:

- `extractResourceFields` - From web.commons for field inference
- `categorizeTemplate` - From web.commons for template categorization
- `buildTemplateData` - From web.commons for template execution
- `getConfirmationConfig` - From web.commons for confirmation dialogs

## Migration Path

Existing HalResourceDetail components can migrate to this hook by:

1. Import the hook: `import { useHalResourceDetail } from '@houseofwolves/serverlesslaunchpad.web.commons.react'`
2. Replace local state and logic with hook results
3. Keep only UI-specific rendering code in the component
4. Use the hook's handlers for template actions

**Before:**
```tsx
// 400+ lines of business logic + UI rendering
export function HalResourceDetail({ resource, ... }) {
  const [executingTemplate, setExecutingTemplate] = useState(null);
  // ... 300 lines of business logic ...
  // ... 100 lines of UI rendering ...
}
```

**After:**
```tsx
// Hook handles business logic, component focuses on UI
export function HalResourceDetail({ resource, ... }) {
  const {
    pageTitle,
    fields,
    displayableTemplates,
    handleTemplateAction,
    executingTemplate
  } = useHalResourceDetail({ resource, fieldConfig });

  // ... 100 lines of UI rendering ...
}
```

## Testing

The utilities can be tested independently from React:

```typescript
import { inferPageTitle, organizeFields, filterDisplayableTemplates } from './resource_utils';

describe('resource_utils', () => {
  test('inferPageTitle uses self link title first', () => {
    const resource = {
      _links: { self: { title: 'Test User' } },
      name: 'Other Name'
    };
    expect(inferPageTitle(resource)).toBe('Test User');
  });

  // ... more tests ...
});
```

The hook can be tested with React Testing Library:

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useHalResourceDetail } from './use_hal_resource_detail';

describe('useHalResourceDetail', () => {
  test('organizes fields correctly', () => {
    const resource = {
      name: 'John',
      email: 'john@example.com'
    };

    const { result } = renderHook(() =>
      useHalResourceDetail({ resource })
    );

    expect(result.current.fields.overview).toHaveLength(1);
    expect(result.current.fields.details).toHaveLength(1);
  });

  // ... more tests ...
});
```

## Dependencies

- `@houseofwolves/serverlesslaunchpad.web.commons` - Core utilities (extractResourceFields, categorizeTemplate, etc.)
- `@houseofwolves/serverlesslaunchpad.types` - HAL types (HalObject, HalTemplate, etc.)
- `react` - React hooks (useState, useMemo)

## License

Internal package for Serverless Launchpad project.
