# Serverless Launchpad

A full-stack serverless application boilerplate built with AWS services, implementing clean architecture principles and HAL-FORMS hypermedia patterns. Features multiple frontend implementations (Mantine, shadcn/ui, DaisyUI, Svelte) sharing a common API.

## Architecture

### Clean Architecture

The project follows clean architecture with dependency inversion:

-   **core** - Business logic and domain abstractions (interfaces)
-   **framework** - AWS service implementations (Cognito, DynamoDB, S3)
-   **types** - Shared TypeScript types with Zod validation

### HAL-FORMS and HATEOAS

The API implements HAL-FORMS for hypermedia-driven interactions:

-   Server-driven UI with forms controlled by API responses
-   Permission-based operations only shown if user has access
-   Self-validating forms with validation rules from API metadata
-   Discoverable API capabilities at runtime

## Quick Start

### Prerequisites

-   Node.js >= 22.20.0
-   npm >= 10.2.5
-   Docker (for local development with Moto)

### Development Setup

```bash
# Install dependencies
npm install

# Start local development environment (Moto + API + web frontends)
make dev-start

# Or start with a specific frontend
make dev-start web=mantine   # Mantine UI only
make dev-start web=shadcn    # shadcn/ui only
make dev-start web=daisyui   # DaisyUI only
make dev-start web=svelte    # Svelte only
make dev-start web=none      # API only (no frontend)
```

### Other Commands

```bash
make dev-stop      # Stop all services
make dev-restart   # Restart all services
make dev-reset     # Reset Moto data and restart
make dev-status    # Check status of all services
make help          # Show all available commands
```

### Testing

```bash
# Run all tests
npm test

# Run tests in a specific package
cd core && npm test
cd framework && npm test
cd api.hypermedia && npm test
```

## Project Structure

```
serverlesslaunchpad/
├── api.hypermedia/      # HTTP API with HAL-FORMS support
├── core/                # Business logic and interfaces
├── framework/           # AWS service implementations
├── types/               # Shared TypeScript types
├── infrastructure/      # CDK deployment code
├── web.mantine/         # React frontend with Mantine UI
├── web.shadcn/          # React frontend with shadcn/ui
├── web.daisyui/         # React frontend with DaisyUI
├── web.svelte/          # Svelte frontend
├── web.commons/         # Shared web utilities
├── web.commons.react/   # Shared React utilities
└── moto/                # Local AWS mock configuration
```
