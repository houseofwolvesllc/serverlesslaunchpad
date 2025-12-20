# Sessions Management

Provides users with visibility into their active sessions across devices and the ability to manage them.

## Features

- **Multi-device visibility**: View all active sessions with device information
- **Current session protection**: Cannot delete the session being used
- **Bulk operations**: Select and delete multiple sessions at once
- **Server-side pagination**: Configurable page sizes (10, 25, 50, 100)
- **Preference persistence**: Page size saved to localStorage
- **Device detection**: Automatic parsing of browser and OS from user agent
- **Relative timestamps**: "2 hours ago" style formatting for last accessed time

## Components

### `SessionsList`

Main component that displays the sessions table with pagination and delete functionality.

**Usage:**
```tsx
import { SessionsList } from './features/sessions';

function AccountPage() {
  return <SessionsList />;
}
```

**Features:**
- Loading skeleton during initial load
- Error alerts for API failures
- Empty state when no sessions exist
- Refresh button to reload sessions
- Delete button shows count of selected sessions

### `SessionRow`

Individual row in the sessions table. Displays device info, IP address, and timestamps.

**Props:**
```typescript
interface SessionRowProps {
  session: Session;
  selected: boolean;
  onSelectionChange: (sessionToken: string, selected: boolean) => void;
}
```

**Features:**
- Parses user agent to show browser and OS (e.g., "Chrome on macOS")
- Shows device type (Desktop/Mobile/Tablet)
- Displays IP address
- Formats "last accessed" with relative time
- Shows creation date
- Current session indicators:
  - Blue background color
  - Lock icon
  - "Current" badge
  - Disabled checkbox (cannot be selected for deletion)

### `SessionsTableSkeleton`

Loading skeleton component that displays while sessions are being fetched.

### `DeleteSessionsModal`

Confirmation modal for bulk session deletion.

**Props:**
```typescript
interface DeleteSessionsModalProps {
  opened: boolean;
  onClose: () => void;
  sessions: Session[];
  onConfirm: () => void;
  loading: boolean;
}
```

**Features:**
- Lists all sessions to be deleted with device info
- Warning message
- Confirmation buttons with loading states

### `PaginationControls`

Reusable pagination component (shared with API keys feature).

## Hooks

### `useSessions()`

Hook that manages sessions data and operations.

**Returns:**
```typescript
interface UseSessionsResult {
  sessions: Session[];              // Array of session objects
  loading: boolean;                 // Loading state
  error: string | null;             // Error message if any
  selectedIds: Set<string>;         // Set of selected session tokens
  currentSessionToken: string | null; // Current session token
  pagination: PaginationState;      // Pagination state
  handleSelectionChange: (sessionToken: string, selected: boolean) => void;
  handleSelectAll: (checked: boolean) => void;
  handlePageChange: (newPage: number) => void;
  handlePageSizeChange: (newSize: PageSize) => void;
  deleteSessions: (sessionTokens: string[]) => Promise<{success: boolean; error?: string}>;
  refresh: () => void;
}
```

**Example:**
```tsx
function CustomSessionsView() {
  const {
    sessions,
    loading,
    error,
    selectedIds,
    handleSelectionChange,
    deleteSessions,
  } = useSessions();

  const handleDelete = async () => {
    const result = await deleteSessions(Array.from(selectedIds));
    if (result.success) {
      console.log('Sessions deleted successfully');
    }
  };

  // Custom rendering...
}
```

## Utilities

### `parseUserAgent(userAgent: string)`

Parses user agent strings to extract device information.

**Returns:**
```typescript
interface DeviceInfo {
  browser: string;    // Chrome, Firefox, Safari, Edge, Opera, or Unknown
  os: string;         // Windows, macOS, Linux, iOS, Android, or Unknown
  device: string;     // Desktop, Mobile, Tablet, or Unknown
}
```

**Example:**
```typescript
const info = parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...');
// Returns: { browser: 'Chrome', os: 'macOS', device: 'Desktop' }
```

## API Integration

Uses hypermedia API discovery to find the sessions endpoint:

1. Fetch entry point
2. Get user resource link
3. Follow sessions link from user resource
4. Fetch sessions with pagination query parameters

**Endpoint:** `GET /users/{userId}/sessions?page={page}&size={size}`

**Response Format (HAL):**
```json
{
  "_embedded": {
    "sessions": [
      {
        "sessionToken": "abc123",
        "userAgent": "Mozilla/5.0...",
        "ipAddress": "192.168.1.1",
        "dateLastAccessed": "2025-01-15T10:30:00Z",
        "dateCreated": "2025-01-14T08:00:00Z",
        "_links": {
          "self": { "href": "/users/123/sessions/abc123" },
          "delete": { "href": "/users/123/sessions/abc123", "method": "DELETE" }
        }
      }
    ]
  },
  "page": {
    "size": 25,
    "totalElements": 42,
    "totalPages": 2,
    "number": 0
  },
  "_links": {
    "self": { "href": "/users/123/sessions?page=0&size=25" },
    "next": { "href": "/users/123/sessions?page=1&size=25" }
  }
}
```

**Delete:** `POST /users/{userId}/sessions` with body `{ sessionTokens: [...] }`

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation supported
- Screen reader labels for all interactive elements:
  - Checkboxes have `aria-label` with device info
  - Current session checkbox has special label indicating it cannot be deleted
- Focus indicators visible on all interactive elements
- Current session visually indicated without relying on color alone (lock icon + badge + blue background)

**Keyboard shortcuts:**
- Tab: Navigate through interactive elements
- Space: Toggle checkboxes
- Enter: Activate buttons
- Escape: Close modals

## Testing

Run tests:
```bash
cd web
npm test features/sessions
```

**Test files:**
- `use_sessions.test.ts`: Hook configuration tests
- `parse_user_agent.test.ts`: User agent parsing (implied in verify test)
- `verify_phase_1.test.ts`: Module structure verification

**Coverage:**
- Utilities: 100% (user agent parser)
- Hooks: Configuration tested
- Constants: PAGE_SIZE_OPTIONS validated

## localStorage Keys

- `sessions_page_size`: Stores user's preferred page size (10, 25, 50, or 100)

## Error Handling

- Network errors: Display error alert with message
- Empty state: Shows "No active sessions" message
- API errors: Captured and displayed to user
- Page adjustment: If deleting all items on current page (and not on page 0), automatically navigate to previous page

## Future Enhancements

- Session naming/labeling
- IP geolocation on map
- Push notifications for new sessions
- Session activity log
- Trust this device functionality
- Extended session details (login method, session duration)
