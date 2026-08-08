# Voice Gecko

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Instant voice-to-text dictation for desktop — free and open source.

Press a shortcut, speak, get text on your clipboard. Local speech models (Parakeet / Moonshine / Whisper). Transcripts stay on your device.

| | |
|---|---|
| **Download** | [voicegecko.dev/download](https://www.voicegecko.dev/download) · [GitHub Releases](https://github.com/Lukem121/voicegecko-releases/releases/latest) |
| **Website** | [voicegecko.dev](https://www.voicegecko.dev) |
| **Discord** | [Join](https://discord.gg/BFxNQCzZjB) |
| **Support the project** | [Optional $5.99/mo](https://www.voicegecko.dev/pricing) |
| **Security** | [SECURITY.md](SECURITY.md) |

## Download (recommended)

Most people should install a release build — no Node, Rust, or database setup.

1. Go to **[voicegecko.dev/download](https://www.voicegecko.dev/download)** (or the [latest GitHub release](https://github.com/Lukem121/voicegecko-releases/releases/latest))
2. Install the Windows `.msi` (macOS/Linux builds when available)
3. On first launch, speech models download once — then dictation works offline

Optional **Support** ($5.99/mo) funds development. Free and Support are the same product — no paywalled features.

## Privacy

- Dictation runs on-device
- Transcripts and dictionary words stay in local SQLite
- Account is optional (Support checkout / feedback only)

## Develop from source

```bash
git clone https://github.com/Lukem121/voicegecko.git
cd voicegecko
pnpm install
cp .env.example .env   # placeholders only — never commit real secrets
pnpm dev:web           # Next.js site
```

Desktop (Rust required):

```bash
cd apps/desktop && pnpm dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Prerequisites: Node 22.14+, PNPM 9.6+, Rust for desktop.

| Command | Description |
|---------|-------------|
| `pnpm build` | Build workspace |
| `pnpm lint` / `pnpm format` | Ultracite |
| `pnpm typecheck` | Typecheck |

## Monorepo

| Path | Role |
|------|------|
| `apps/desktop` | Tauri desktop app |
| `apps/web` | Next.js site, auth, billing, API |
| `packages/*` | api, auth, db, ui, email, payment, … |

Stack: React 19, Next.js 15, tRPC, Better Auth, Stripe, PostHog.

## Community

- [Contributing](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md)
- [Discord](https://discord.gg/BFxNQCzZjB)

## License

[MIT](LICENSE) © Social Freak Limited (trading as Voice Gecko)
