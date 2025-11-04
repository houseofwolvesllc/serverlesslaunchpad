# Serverless Launchpad

A full-stack serverless application built with AWS services, implementing clean architecture principles and HAL-FORMS hypermedia patterns.

## Architecture

### HAL-FORMS and HATEOAS

This project implements HAL-FORMS for true hypermedia-driven API interactions:

- **API**: Returns `_templates` in HAL+JSON responses describing available operations
- **Web**: Generates forms dynamically from API templates
- **XHTML**: Provides browser-accessible HTML forms via content negotiation
- **Self-Documenting**: API describes its own interface
- **Version-Resilient**: API changes don't require web deployments

**Benefits**:
- Server-driven UI - forms controlled by API
- Permission-based - operations only show if user has access
- Self-validating - validation rules from API metadata
- Discoverable - clients learn API capabilities at runtime

See individual package `CLAUDE.md` files for detailed documentation:
- `api.hypermedia/CLAUDE.md` - API HAL-FORMS implementation
- `mantine.web/CLAUDE.md` - Mantine web HAL-FORMS client patterns

## Quick Start

### Development Setup

```bash
# Install dependencies
npm install

# Start local services (Moto mock AWS)
make dev-start

# Run web app (Mantine UI)
cd mantine.web && npm run local

# Run API locally
cd api.hypermedia && npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run specific package tests
cd api.hypermedia && npm test
cd mantine.web && npm test
```

## Project Structure

This is a monorepo with the following packages:

- **api.hypermedia** - HTTP API layer with HAL-FORMS support
- **framework** - AWS service implementations
- **mantine.web** - React SPA with Mantine UI and HAL-FORMS client
- **infrastructure** - CDK deployment code

## Documentation

Each package has detailed documentation in its `CLAUDE.md` file explaining architecture, patterns, and best practices.