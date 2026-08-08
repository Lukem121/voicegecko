# Voice Gecko

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Code of Conduct](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

> Instant voice-to-text dictation for desktop and web — **free and open source**

Press a shortcut, speak, and get accurate text on your clipboard. Built for emails, coding, AI prompts, and brain dumps.

| | |
|---|---|
| **Website** | [voicegecko.dev](https://www.voicegecko.dev) |
| **Discord** | [Join the community](https://discord.gg/BFxNQCzZjB) |
| **Support the project** | [Optional $5.99/mo](https://www.voicegecko.dev/pricing) |
| **Security** | [SECURITY.md](SECURITY.md) |

## Free & open source

Voice Gecko is MIT-licensed and free to use with the **full product** — no word limits, no paywalled features.

Optional **Support** ($5.99/mo) is a voluntary contribution to fund development. Free and Support are the same product.

## Privacy & local-first

- **Dictation runs on your device** — Parakeet / Moonshine / local Whisper (no cloud STT).
- **Transcripts and dictionary words** stay in on-device SQLite. They are not synced to Voice Gecko servers.
- **Optional account** is only for Support checkout and feedback — not required to dictate.
- **First run:** speech models download over the network once. After that, dictation works offline (Privacy / Air-gap mode can skip update checks).

```
git clone https://github.com/Lukem121/voicegecko.git
cd voicegecko
pnpm install
cp .env.example .env   # fill placeholders — never commit real secrets
pnpm dev:web
```

### Desktop app (contributors)

```bash
cd apps/desktop
pnpm dev
```

Requires Rust + a network connection on first launch so speech models can download. No `OPENAI_API_KEY` is required.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide.

## Key features

- **Instant dictation** — press a shortcut and speak (local STT)
- **Clipboard integration** — text lands where you need it
- **Custom shortcuts** — personalize hotkeys
- **Smart dictionary** — custom words on device
- **GeckoBar** — floating desktop overlay
- **Local history** — transcripts stay on your machine
- **Cross-platform** — desktop app and marketing/Support web

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

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all applications |
| `pnpm lint` | Lint (Ultracite) |
| `pnpm format` | Format (Ultracite) |
| `pnpm typecheck` | Typecheck workspace |
| `pnpm clean` | Clean `node_modules` and build artifacts |

### Environment & secrets

- Copy [`.env.example`](.env.example) → `.env` (gitignored)
- Desktop: [`apps/desktop/.env.development.example`](apps/desktop/.env.development.example)
- Maintainer-only: Stripe live keys, Tauri signing keys, release `GITHUB_TOKEN`, production database URLs

Before this repo went public we scanned git history with gitleaks (see [SECURITY.md](SECURITY.md)).

## Project structure

```
voicegecko/
├── apps/
│   ├── desktop/          # Tauri desktop application
│   └── web/              # Next.js web application
├── packages/             # api, auth, db, ui, email, payment, …
├── .github/              # CI, issue/PR templates, funding
└── tooling/
```

## Community

- [Contributing guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
- [Discord](https://discord.gg/BFxNQCzZjB)
- Issues: bugs and features welcome — use the templates when you open one

## License

[MIT](LICENSE) © Social Freak Limited (trading as Voice Gecko)
