# Contributing to Voice Gecko

Thanks for helping make Voice Gecko better. This project is free and open source under the [MIT License](LICENSE).

## Prerequisites

- Node.js 22.14.0+
- PNPM 9.6.0+
- Rust (for the desktop app)

## Getting started

```bash
pnpm install
pnpm dev          # monorepo apps
pnpm dev:web      # web only
```

Desktop:

```bash
cd apps/desktop
pnpm dev
```

Copy env examples as needed (never commit real secrets):

- Root `.env` (gitignored) — see package env schemas under `apps/web`, `packages/api`, `packages/auth`, etc.
- `apps/desktop/.env.development.example` → `apps/desktop/.env.development`

Database commands (migrations / `db:push` / generate) are **maintainer-only** for the hosted product. Do not run them against production. Ask a maintainer if your change needs a schema update.

## Code quality

```bash
pnpm lint
pnpm format
pnpm typecheck
```

This repo uses [Ultracite](https://www.ultracite.ai/) (Biome) for lint/format. Tailwind class order is enforced — run format if you see “CSS classes should be sorted.”

## Pull requests

1. Fork and create a branch from `main`.
2. Keep changes focused and match existing patterns.
3. Run lint/typecheck before opening a PR.
4. Describe **why** the change exists, not only what changed.

## Optional Support

Voice Gecko is free with no feature gates. If you want to fund development, optional Support is available at [voicegecko.dev/pricing](https://www.voicegecko.dev/pricing) ($5.99/mo). Same product either way.

## Security

See [SECURITY.md](SECURITY.md) for private vulnerability reporting.
