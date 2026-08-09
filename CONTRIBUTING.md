# Contributing to Voice Gecko

Thanks for helping make Voice Gecko better. This project is **free and open source** under the [MIT License](LICENSE).

Please read the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to follow it.

## Ways to contribute

- **Bug reports** and **feature ideas** via [GitHub Issues](https://github.com/Lukem121/voicegecko/issues)
- **Pull requests** — docs, UI polish, accessibility, desktop UX, tests, refactors
- **Discussions** on [Discord](https://discord.gg/BFxNQCzZjB)
- **Optional Support** ($5.99/mo) at [voicegecko.dev/pricing](https://www.voicegecko.dev/pricing) if you want to fund development (same product as Free)

Good first areas: copy/docs, landing/pricing clarity, desktop settings UX, a11y, TypeScript cleanups, and issue triage.

## Prerequisites

- Node.js 22.14.0+
- PNPM 9.6.0+ (see `packageManager` in root `package.json`)
- Rust (for the desktop app)

## Getting started

```bash
# 1. Clone your fork
git clone https://github.com/<you>/voicegecko.git
cd voicegecko

# 2. Install
pnpm install

# 3. Env (placeholders only in git)
cp .env.example .env
# Edit .env with local values. Desktop: apps/desktop/.env.development.example

# 4. Run
pnpm dev          # monorepo apps
pnpm dev:web      # web only
```

Desktop:

```bash
cd apps/desktop
pnpm dev
```

On first launch the desktop app downloads local speech models (network required once). After models are present, dictation and history work offline from on-device SQLite. No OpenAI API key is required.

### Database note

Commands like `pnpm db:push` / migrations / generate are **maintainer-only** for the hosted product. Do not run them against production. Ask a maintainer if your change needs a schema update.

## Code quality

```bash
pnpm lint
pnpm format
pnpm typecheck
```

This repo uses [Ultracite](https://www.ultracite.ai/) (Biome) for lint/format. Tailwind class order is enforced — run format if you see “CSS classes should be sorted.”

Match existing patterns in the area you touch. Prefer focused PRs over large refactors unless agreed in an issue first.

## Pull requests

1. Fork and branch from `main`.
2. Keep the change focused; link related issues.
3. Run lint/typecheck for what you touched.
4. Fill out the PR template (summary + test plan).
5. Do **not** commit `.env`, keys, or signing material.

Product positioning reminder: Voice Gecko is fully free. Optional Support is a donation-style contribution — do not reintroduce paywalled feature gates.

## Security

See [SECURITY.md](SECURITY.md) for private vulnerability reporting. Do not open public issues for secrets or exploits.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
