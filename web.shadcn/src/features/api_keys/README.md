# API Keys Management

Provides users with the ability to manage API keys for programmatic access to the platform.

## Features

- **API key visibility**: View all API keys with usage information
- **Expiration warnings**: Visual indicators for keys expiring within 30 days
- **Bulk operations**: Select and delete multiple keys at once
- **Server-side pagination**: Configurable page sizes (10, 25, 50, 100)
- **Preference persistence**: Page size saved to localStorage
- **Usage tracking**: Display when each key was last used
- **Security information**: Show key prefix for identification

## Components

### `ApiKeysList`

Main component that displays the API keys table with pagination and delete functionality.

**Usage:**
```tsx
import { ApiKeysList } from './features/api_keys';

function ApiKeysPage() {
  return <ApiKeysList />;
}
```

**Features:**
- Loading skeleton during initial load
- Error alerts for API failures
- Empty state when no API keys exist
- Refresh button to reload keys
- Delete button shows count of selected keys
- Warning message about immediate access loss

### `ApiKeyRow`

Individual row in the API keys table. Displays key info, last used, and expiration.

**Props:**
```typescript
interface ApiKeyRowProps {
  apiKey: ApiKey;
  selected: boolean;
  onSelectionChange: (apiKeyId: string, selected: boolean) => void;
}
```

**Features:**
- Displays key name (or "Unnamed" if no name provided)
- Shows key prefix in code block for easy identification
- Last used time with relative formatting ("2 hours ago", "Never")
- Expiration status with color-coded badges:
  - **Red badge**: Key is expired
  - **Orange badge with warning icon**: Expiring within 30 days (shows days remaining)
  - **Plain text**: Normal expiration or never-expiring keys

### `ApiKeysTableSkeleton`

Loading skeleton component that displays while API keys are being fetched.

### `DeleteApiKeysModal`

Confirmation modal for bulk API key deletion with security warning.

**Props:**
```typescript
interface DeleteApiKeysModalProps {
  opened: boolean;
  onClose: () => void;
  apiKeys: ApiKey[];
  onConfirm: () => void;
  loading: boolean;
}
```

**Features:**
- Lists all keys to be deleted with names and prefixes
- Warning about immediate access loss for applications using these keys
- Confirmation buttons with loading states
- Cannot be closed while deletion is in progress

## Hooks

### `useApiKeys()`

Hook that manages API keys data and operations.

**Returns:**
```typescript
interface UseApiKeysResult {
  apiKeys: ApiKey[];                // Array of API key objects
  loading: boolean;                 // Loading state
  error: string | null;             // Error message if any
  selectedIds: Set<string>;         // Set of selected API key IDs
  pagination: PaginationState;      // Pagination state
  handleSelectionChange: (apiKeyId: string, selected: boolean) => void;
  handleSelectAll: (checked: boolean) => void;
  handlePageChange: (newPage: number) => void;
  handlePageSizeChange: (newSize: PageSize) => void;
  deleteApiKeys: (apiKeyIds: string[]) => Promise<{success: boolean; error?: string}>;
  refresh: () => void;
}
```

**Example:**
```tsx
function CustomApiKeysView() {
  const {
    apiKeys,
    loading,
    error,
    selectedIds,
    handleSelectionChange,
    deleteApiKeys,
  } = useApiKeys();

  const handleDelete = async () => {
    const result = await deleteApiKeys(Array.from(selectedIds));
    if (result.success) {
      console.log('API keys deleted successfully');
    }
  };

  // Custom rendering...
}
```

## Utilities

### `formatExpiration(dateExpires?: string)`

Calculates expiration status and formats display label for API keys.

**Returns:**
```typescript
interface ExpirationInfo {
  isExpiring: boolean;              // True if expiring within 30 days
  isExpired: boolean;               // True if already expired
  daysUntilExpiration: number | null; // Days until expiration (null if never expires)
  label: string;                    // Display text
}
```

**Logic:**
- Never-expiring keys (undefined `dateExpires`): `{ isExpiring: false, isExpired: false, label: "Never" }`
- Expired keys: `{ isExpired: true, label: "Expired" }`
- Expiring today: `{ isExpiring: true, daysUntilExpiration: 0, label: "Today" }`
- Expiring tomorrow: `{ isExpiring: true, daysUntilExpiration: 1, label: "Tomorrow" }`
- Expiring 2-30 days: `{ isExpiring: true, daysUntilExpiration: X, label: "X days" }`
- Expiring >30 days: `{ isExpiring: false, label: "Jan 15, 2025" }` (formatted date)

**Example:**
```typescript
const info = formatExpiration('2025-01-20T00:00:00Z'); // 5 days from now
// Returns: { isExpiring: true, isExpired: false, daysUntilExpiration: 5, label: "5 days" }
```

## API Integration

Uses hypermedia API discovery to find the API keys endpoint:

1. Fetch entry point
2. Get user resource link
3. Follow apiKeys link from user resource
4. Fetch API keys with pagination query parameters

**Endpoint:** `GET /users/{userId}/api-keys?page={page}&size={size}`

**Response Format (HAL):**
```json
{
  "_embedded": {
    "apiKeys": [
      {
        "apiKeyId": "key_abc123",
        "keyPrefix": "sk_live_",
        "name": "Production API Key",
        "dateCreated": "2025-01-01T00:00:00Z",
        "dateExpires": "2025-12-31T23:59:59Z",
        "dateLastUsed": "2025-01-15T10:30:00Z",
        "_links": {
          "self": { "href": "/users/123/api-keys/key_abc123" },
          "delete": { "href": "/users/123/api-keys/key_abc123", "method": "DELETE" }
        }
      }
    ]
  },
  "page": {
    "size": 25,
    "totalElements": 15,
    "totalPages": 1,
    "number": 0
  },
  "_links": {
    "self": { "href": "/users/123/api-keys?page=0&size=25" }
  }
}
```

**Delete:** `POST /users/{userId}/api-keys` with body `{ apiKeyIds: [...] }`

## Expiration Logic

The expiration warning system uses a 30-day threshold:

- **Never**: Keys with no `dateExpires` field
- **Expired**: Keys where `dateExpires` is in the past
- **Expiring Soon**: Keys where `dateExpires` is within the next 30 days
- **Normal**: Keys where `dateExpires` is more than 30 days away

Color coding:
- Red badge: Expired
- Orange badge with warning icon: Expiring soon (1-30 days)
- Plain gray text: Normal or never-expiring

Special labels:
- "Today" for keys expiring on the current date
- "Tomorrow" for keys expiring the next day
- "X days" for keys expiring in 2-30 days
- Formatted date string for keys expiring beyond 30 days

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation supported
- Screen reader labels for all interactive elements:
  - Checkboxes have `aria-label` with key name or prefix
  - Warning icons have text alternatives
- Focus indicators visible on all interactive elements
- Expiration status communicated without relying on color alone (icons + text labels)

**Keyboard shortcuts:**
- Tab: Navigate through interactive elements
- Space: Toggle checkboxes
- Enter: Activate buttons
- Escape: Close modals

## Testing

Run tests:
```bash
cd web
npm test features/api_keys
```

**Test files:**
- `use_api_keys.test.ts`: Hook configuration tests
- `format_expiration.test.ts`: Expiration logic tests (7 test cases)
- `verify_phase_3.test.ts`: Module structure verification

**Coverage:**
- Utilities: 100% (expiration formatter)
- Hooks: Configuration tested
- Constants: PAGE_SIZE_OPTIONS validated

**Test cases for formatExpiration:**
- Never-expiring keys (undefined expiration)
- Expired keys detection
- Keys expiring today
- Keys expiring tomorrow
- Keys expiring within 30 days
- Keys expiring after 30 days
- Edge case: exactly 30 days

## localStorage Keys

- `api_keys_page_size`: Stores user's preferred page size (10, 25, 50, or 100)

## Error Handling

- Network errors: Display error alert with message
- Empty state: Shows "No API keys" message
- API errors: Captured and displayed to user
- Page adjustment: If deleting all items on current page (and not on page 0), automatically navigate to previous page
- Deletion warnings: Clear message about immediate access loss for applications

## Security Considerations

- API keys are never displayed in full (only prefix shown)
- Deletion requires explicit confirmation
- Warning message alerts users about immediate impact on applications
- Current session protection prevents accidental lockout (sessions feature)

## Future Enhancements

- API key creation flow
- Key rotation functionality
- Scoped permissions per key
- Usage statistics and analytics
- Rate limiting configuration
- Automatic expiration reminders via email
- Key usage audit log
- IP restriction rules
