# VoiceGecko Quick Start Guide

## Prerequisites

- Node.js 18+ and pnpm
- Rust and Cargo (for Tauri)
- PostgreSQL 14+
- FFmpeg (for audio processing)
- Discord OAuth app credentials

## Environment Setup

1. **Clone and install dependencies**

```bash
git clone <repo>
cd voicegecko
pnpm install
```

2. **Set up environment variables**

```bash
# Copy example env file
cp .env.example .env

# Add your credentials
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

3. **Database setup**

```bash
# Run migrations
pnpm db:push

# Verify with Drizzle Studio
pnpm db:studio
```

## Development Commands

### Start all services

```bash
# Terminal 1: API Server
cd packages/api
pnpm dev

# Terminal 2: Desktop App
cd apps/desktop
pnpm dev

# Terminal 3: Web App (optional)
cd apps/web
pnpm dev
```

### Common Tasks

**Add a new tRPC route:**

1. Create router in `packages/api/src/router/`
2. Add to root router in `packages/api/src/root.ts`
3. Types auto-generate for frontend

**Add a new database table:**

1. Define schema in `packages/db/src/schema/tables/`
2. Export from `packages/db/src/schema/index.ts`
3. Run `pnpm db:generate` and `pnpm db:push`

**Add a Tauri command:**

1. Create function in `apps/desktop/src-tauri/src/modules/`
2. Add `#[command]` attribute
3. Register in `main.rs` invoke_handler

## Project Structure Quick Reference

```
voicegecko/
├── apps/
│   ├── desktop/          # Tauri desktop app
│   │   ├── src/         # React frontend
│   │   └── src-tauri/   # Rust backend
│   ├── web/             # Next.js web app
│   └── mobile/          # React Native app
├── packages/
│   ├── api/            # tRPC API
│   ├── db/             # Database schema
│   ├── auth/           # Auth utilities
│   ├── ui/             # Shared components
│   └── validators/     # Shared validators
└── tasks/              # Documentation
```

## Key Files to Know

- `apps/desktop/src/routes/` - Desktop app pages
- `packages/api/src/router/` - API endpoints
- `packages/db/src/schema/` - Database tables
- `apps/desktop/src-tauri/src/modules/` - Tauri commands
- `packages/ui/src/components/` - Reusable UI

## Testing Flows

### Test Recording

1. Start desktop app
2. Click microphone button
3. Speak for 10+ seconds
4. Click stop
5. Check transcription appears

### Test Local Model

1. Go to Settings
2. Download "whisper-tiny" model
3. Create new recording
4. Verify it uses local model

### Test Export

1. Go to Transcriptions
2. Select multiple items
3. Click Export
4. Choose format and download

## Troubleshooting

**"OpenAI API key not found"**

- Check `.env` file has `OPENAI_API_KEY`
- Restart API server after adding

**"Cannot find audio device"**

- Check microphone permissions
- Try different audio device in settings

**"Database connection failed"**

- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`

**"Model download failed"**

- Check internet connection
- Verify disk space available
- Try smaller model first

## Useful Links

- [Phase 1: Foundation](./phase-1-foundation.md) - Start here
- [Architecture Overview](./architecture.md) - System design
- [Technical Specs](./technical-specs.md) - Detailed requirements
- [API Documentation](http://localhost:3000/api/docs) - When running

## Quick Wins

1. **Skip model downloads initially** - Use OpenAI API only
2. **Use mock data** - `pnpm db:seed` for test data
3. **Desktop-first** - Ignore web/mobile initially
4. **English only** - Don't worry about i18n yet

## Getting Help

- Check existing code patterns
- Read phase documentation
- Search codebase for similar features
- Ask in team chat with context

Happy coding! 🚀
