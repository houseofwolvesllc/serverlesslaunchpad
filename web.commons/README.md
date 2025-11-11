# web.commons

Framework-agnostic shared utilities, services, and logic for all Serverless Launchpad web frontend projects.

## Overview

This package contains pure TypeScript code (no React or framework dependencies) that can be shared across:
- `web.shadcn` (React + shadcn/ui)
- `web.mantine` (React + Mantine)
- `web.daisyui` (React + DaisyUI)
- `web.svelte` (Svelte)

## Architecture Principle

**web.commons is framework-agnostic** - it contains only pure TypeScript/JavaScript logic with no UI framework dependencies. This allows the Svelte project to use it without pulling in React as a dependency.

React-specific wrappers (hooks) are created in each React project as thin adapters around the pure functions provided here.

## What's Included

### Services (Phase 2+)
- API Client with HAL support
- Entry Point discovery service
- Link Navigator for HAL link traversal

### HAL-FORMS Client (Phase 2+)
- Template execution and validation
- HAL-FORMS specification compliance

### Collection Inference (Phase 3+)
- Convention-based column detection
- Field type inference
- Label humanization
- Data extraction utilities

### Configuration (Phase 2+)
- Web configuration store
- Configuration schema validation

### Logging (Phase 2+)
- Structured logging utilities

## Usage

### In React Projects (web.shadcn, web.mantine, web.daisyui)

```typescript
// Import pure logic
import { inferColumnsFromItems, extractEmbeddedItems } from '@houseofwolves/serverlesslaunchpad.web.commons/collection';

// Create React hook wrapper (in your project)
export function useHalCollection(resource: HalObject) {
  return useMemo(() => ({
    items: extractEmbeddedItems(resource),
    columns: inferColumnsFromItems(extractEmbeddedItems(resource))
  }), [resource]);
}
```

### In Svelte Project (web.svelte)

```typescript
// Import pure logic directly
import { inferColumnsFromItems, extractEmbeddedItems } from '@houseofwolves/serverlesslaunchpad.web.commons/collection';

// Use with Svelte reactive primitives
$: items = extractEmbeddedItems(resource);
$: columns = inferColumnsFromItems(items);
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run build:watch

# Test
npm test

# Test watch mode
npm run test:watch

# Lint
npm run lint
```

## Package Structure

```
web.commons/
├── src/
│   ├── services/          # API clients, entry point, link navigator
│   ├── lib/               # HAL-FORMS client
│   ├── collection/        # Collection inference logic
│   ├── configuration/     # Config store and schema
│   ├── logging/           # Logging utilities
│   └── index.ts           # Barrel exports
├── dist/                  # Build output
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Key Design Decisions

1. **No React Dependency**: Keeps package usable by Svelte without React bloat
2. **Pure Functions**: All logic is side-effect free where possible
3. **Convention Over Configuration**: Smart defaults based on naming patterns
4. **Type Safety**: Full TypeScript support with exported type definitions
5. **Framework Adapters**: Each framework creates its own thin reactive wrapper

## Version

1.0.0 - Initial release

## License

Proprietary - House of Wolves LLC
