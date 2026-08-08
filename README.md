# Voice Gecko

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> Instant voice-to-text dictation for desktop and web — **free and open source**

Press a shortcut, speak, and get accurate text on your clipboard. Built for emails, coding, AI prompts, and brain dumps.

**Website:** [voicegecko.dev](https://www.voicegecko.dev)

## Free & open source

Voice Gecko is MIT-licensed and free to use with the **full product** — no word limits, no paywalled features.

Optional **Support** ($5.99/mo) is a voluntary contribution to fund development. Free and Support are the same product. [Pricing](https://www.voicegecko.dev/pricing)

## Key features

- **Instant dictation** — press a shortcut and speak
- **Clipboard integration** — text lands where you need it
- **Custom shortcuts** — personalize hotkeys
- **Smart dictionary** — custom words and technical terms
- **GeckoBar** — floating desktop overlay
- **Cross-platform** — desktop app and web

## Architecture

Monorepo with Turbo + PNPM:

| App / package | Role |
|---------------|------|
| `apps/desktop` | Tauri desktop app (React + Rust) |
| `apps/web` | Next.js site, auth, billing, API host |
| `@acme/api` | tRPC routes and business logic |
| `@acme/auth` | Better Auth |
| `@acme/db` | PostgreSQL + Drizzle |
| `@acme/ui` | Shared UI |
| `@acme/email` | Email templates |
| `@acme/payment` | Stripe / webhooks |
| `@acme/observability` | Logging |
| `@acme/notifications` | Discord notifications |

**Stack:** React 19, Next.js 15, TanStack Router, Tailwind, tRPC, Better Auth, Stripe, PostHog.

## Development

### Prerequisites

- Node.js 22.14.0+
- PNPM 9.6.0+
- Rust (desktop)

### Getting started

```bash
pnpm install
pnpm dev          # start workspace apps
pnpm dev:web      # web only
```

Desktop:

```bash
cd apps/desktop
pnpm dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all applications |
| `pnpm lint` | Lint (Ultracite) |
| `pnpm format` | Format (Ultracite) |
| `pnpm typecheck` | Typecheck workspace |
| `pnpm clean` | Clean `node_modules` and build artifacts |

### Environment & secrets

- Real secrets live in local `.env` files (gitignored) or CI secrets — **never commit them**.
- Desktop example: [`apps/desktop/.env.development.example`](apps/desktop/.env.development.example)
- Maintainer-only: Stripe live keys, Tauri signing keys, release `GITHUB_TOKEN`, production database URLs

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## Project structure

```
voicegecko/
├── apps/
│   ├── desktop/          # Tauri desktop application
│   └── web/              # Next.js web application
├── packages/
│   ├── api/
│   ├── auth/
│   ├── db/
│   ├── ui/
│   ├── email/
│   └── …                 # payment, observability, notifications, …
└── tooling/
```

## Contributing

We welcome issues and pull requests. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Social Freak Limited (trading as Voice Gecko)
