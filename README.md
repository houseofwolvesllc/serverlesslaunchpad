# Serverless Launchpad

A full-stack serverless application boilerplate built with AWS services, implementing clean architecture principles and HAL-FORMS hypermedia patterns. Features multiple frontend implementations (Mantine, shadcn/ui, DaisyUI, Svelte) sharing a common hypermedia API.

## Architecture

### Clean Architecture

The project follows clean architecture with strict dependency inversion:

- **core** - Business logic and domain abstractions with zero external dependencies
- **framework** - AWS service implementations (Cognito, DynamoDB, Secrets Manager)
- **types** - Shared TypeScript types with Zod validation and HAL definitions
- **api.hypermedia** - HTTP API layer with HAL-FORMS support, content negotiation, and XHTML rendering
- **infrastructure** - AWS CDK deployment code

### Frontend Implementations

Four frontend implementations share common utilities through `web.commons` and `web.commons.react`:

- **web.mantine** - React + Mantine UI
- **web.shadcn** - React + shadcn/ui + Tailwind CSS
- **web.daisyui** - React + DaisyUI + Tailwind CSS
- **web.svelte** - SvelteKit

### HAL-FORMS and HATEOAS

The API implements HAL-FORMS for hypermedia-driven interactions:

- Server-driven UI with forms and operations described by API responses
- Permission-aware templates only shown if the user has access
- Content negotiation: HAL+JSON, XHTML with HTML forms, and plain JSON
- Self-validating forms with constraints from API metadata
- Browser-accessible XHTML responses without JavaScript

### Local Development Stack

Local development uses Docker containers to mock AWS services:

- **PostgreSQL** (Aurora Serverless v2 locally) - Primary data store
- **Moto** - AWS service mocking (S3, DynamoDB, Secrets Manager)
- **Cognito-Local** - Local AWS Cognito emulation for authentication

## Quick Start

### Prerequisites

- Node.js >= 22.20.0
- npm >= 10.2.5
- Docker (for local development)

### Development Setup

```bash
# Install dependencies
npm install

# Start full local stack (Docker services + API + all web frontends)
make local-start

# Or start with a specific frontend
make local-start web=mantine   # Mantine UI only
make local-start web=shadcn    # shadcn/ui only
make local-start web=daisyui   # DaisyUI only
make local-start web=svelte    # Svelte only
make local-start web=none      # API only (no frontend)
```

### Tunneled Environments

Run local dev servers against remote AWS environments instead of Docker/Moto:

```bash
make local-start env=dev       # Local servers → AWS development
make local-start env=staging   # Local servers → AWS staging
make local-start env=prod      # Local servers → AWS production (with safety prompt)
```

### Default Local Ports

| Service    | Port |
|------------|------|
| PostgreSQL | 5432 |
| API        | 3001 |
| Mantine    | 5173 |
| shadcn     | 5174 |
| DaisyUI    | 5175 |
| Svelte     | 5176 |
| Moto       | 5555 |
| Cognito    | 9230 |

### Other Commands

```bash
make local-stop                # Stop all services (Docker + dev servers)
make local-restart             # Restart all services
make local-reset               # Reset local data and restart
make local-status              # Check status of all services
make local-ports               # Show configured port mappings
make moto-logs                 # View Moto init script logs
make cognito-logs              # View Cognito-Local container logs
make test-local                # Run tests against local services
make moto-health               # Check Moto health
make moto-services             # List Moto services (user pools, buckets, secrets)
make clean                     # Clean up all containers and data
make help                      # Show all available commands
```

> **Note:** In the monorepo, `local-start` delegates to internal `dev-*` targets that handle the multi-frontend setup. Scaffolded projects collapse these into the unified `local-*` commands shown above.

### Testing

```bash
# Run all tests
npm test

# Run tests in a specific package
cd core && npm test
cd framework && npm test
cd api.hypermedia && npm test

# Run a single test file
cd core && npx vitest run path/to/test.test.ts
```

## Creating a New Project

The `create-project` scaffolding script generates a standalone project from this monorepo template. It copies the packages you need, selects a single frontend framework, and rewrites all naming and configuration to match your project.

### Usage

```bash
npm run create-project
```

### What It Prompts For

| Prompt | Description | Example |
|--------|-------------|---------|
| **Output path** | Where to create the new project | `../my-awesome-project` |
| **Project name** | Scoped npm package name | `@acme/my-awesome-project` |
| **Display name** | Human-readable project name | `My Awesome Project` |
| **Resource prefix** | Short prefix for AWS resources (2-8 chars) | `myapp` |
| **Config domain** | Domain for secrets/config naming | `myawesomeproject.acme.com` |
| **Author** | Package author (defaults to git user) | `Jane Doe` |
| **Web framework** | Which frontend to include | `mantine`, `shadcn`, `daisyui`, or `svelte` |
| **Base port** | Starting port for local Docker services (5 sequential) | `6000` |

### What It Does

1. **Copies core packages** - `api.hypermedia`, `core`, `framework`, `infrastructure`, `types`, `moto`, plus root config files
2. **Copies your chosen frontend** - Renames `web.<framework>` to `web/`
3. **Merges shared web utilities** - Copies `web.commons` and `web.commons.react` into `web/src/commons/`
4. **Updates package.json files** - Rewrites package names, scopes, and workspace references
5. **Generates project.config.json** - Central config with your scope, prefix, and domain
6. **Transforms imports** - Rewrites all `@houseofwolves/serverlesslaunchpad` references to your scope
7. **Configures ports** - Generates `.env` with your port allocations and updates all references
8. **Applies branding** - Replaces display names, author, and org references across all files
9. **Processes Makefile** - Strips multi-frontend scaffolding and uncomments single-frontend configuration

### Port Allocation

The base port allocates 5 sequential ports:

| Offset | Service    |
|--------|------------|
| +0     | PostgreSQL |
| +1     | API        |
| +2     | Web        |
| +3     | Moto       |
| +4     | Cognito    |

For example, base port `6000` gives you PostgreSQL on 6000, API on 6001, Web on 6002, Moto on 6003, and Cognito on 6004.

### After Scaffolding

```bash
cd ../my-awesome-project
npm install
make local-start
```

## Project Structure

```
serverlesslaunchpad/
├── api.hypermedia/      # HTTP API with HAL-FORMS and XHTML support
├── core/                # Business logic and domain abstractions
├── framework/           # AWS service implementations
├── types/               # Shared TypeScript types and HAL definitions
├── infrastructure/      # AWS CDK deployment code
├── web.mantine/         # React frontend (Mantine UI)
├── web.shadcn/          # React frontend (shadcn/ui)
├── web.daisyui/         # React frontend (DaisyUI)
├── web.svelte/          # Svelte frontend
├── web.commons/         # Shared web utilities
├── web.commons.react/   # Shared React utilities
├── moto/                # Local AWS mock configuration and init scripts
├── scripts/             # Scaffolding and build scripts
└── .claude/             # Project specs and management
```

## License

Copyright © 2023-2026 House of Wolves LLC. Licensed under the [Apache License 2.0](LICENSE).
