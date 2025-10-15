# Development Guide

## Project Structure

This is a monorepo using:

- **pnpm workspaces** for package management
- **Turbo** for build orchestration
- **Tauri** for desktop app
- **Next.js** for web app

## Quick Start

```bash
# Install dependencies
pnpm install

# Development mode (all apps)
pnpm dev

# Web app only
pnpm dev:web

# Desktop app only
cd apps/desktop && pnpm dev
```

## Key Applications

### Desktop App (`apps/desktop/`)

- **Framework**: Tauri + React + TypeScript
- **Router**: TanStack Router
- **Version**: Currently 0.0.26
- **Updater**: See `docs/UPDATER.md` for architecture and release playbook

### Web App (`apps/web/`)

- **Framework**: Next.js + React + TypeScript
- **Version**: Currently 0.0.26 (needs sync with desktop)
- **Forced update enforcement**: TRPC route enforces `MIN_SUPPORTED_DESKTOP_VERSION` via HTTP 426

## Common Tasks

### Building

```bash
# Build all apps
pnpm build

# Build specific app
turbo build -F @acme/desktop
turbo build -F @acme/web
```

### Linting & Formatting

```bash
# Lint all packages
pnpm lint

# Format all packages
pnpm format:fix

# Type checking
pnpm typecheck
```

### Database Operations

```bash
# Push database schema
pnpm db:push

# Open database studio
pnpm db:studio
```

## Architecture Notes

- Uses TanStack Router for desktop app routing
- Authentication handled via Better Auth
- Database operations through tRPC
- Shared packages in `packages/` directory

## Development Tips

- Use `pnpm dev` to start all apps simultaneously
- Desktop app hot-reloads with Tauri
- Web app uses Next.js fast refresh
- Check `turbo.json` for build pipeline configuration
