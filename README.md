# VoiceGecko

> Instant voice-to-text dictation for desktop and web

VoiceGecko transforms how you interact with technology through voice. Press a shortcut, speak, and instantly get accurate text on your clipboard—perfect for emails, coding, AI prompts, or brain dumps.

## What We Do

VoiceGecko provides instant, accurate voice-to-text dictation that works everywhere. Whether you're writing emails, taking notes, or coding, just speak and watch your words appear exactly where you need them.

**Key Features:**

- 🎯 **Instant Dictation** - Press a shortcut and speak
- 📋 **Clipboard Integration** - Text appears directly on your clipboard
- ⌨️ **Custom Shortcuts** - Personalized hotkeys for quick access
- 📖 **Smart Dictionary** - Custom words and technical terms
- 🖥️ **GeckoBar** - Floating desktop overlay for quick access
- 🌐 **Cross-Platform** - Desktop app and web interface

## Architecture

This is a monorepo built with modern tools for speed and reliability:

### Applications

- **Desktop App** - Tauri-based native app with React frontend
- **Web App** - Next.js application with full authentication and usage tracking

### Tech Stack

- **Frontend**: React 19, TanStack Router, Tailwind CSS
- **Backend**: tRPC, Drizzle ORM, Better Auth
- **Desktop**: Tauri (Rust + TypeScript)
- **Web**: Next.js 15
- **Database**: PostgreSQL with Drizzle
- **Payments**: Stripe integration
- **Analytics**: PostHog
- **Monorepo**: Turbo + PNPM

### Packages

- `@acme/api` - tRPC API routes and business logic
- `@acme/auth` - Authentication with Better Auth
- `@acme/db` - Database schema and client
- `@acme/ui` - Shared React components and design system
- `@acme/email` - Email templates and sending
- `@acme/payment` - Stripe integration and webhooks
- `@acme/observability` - Logging and monitoring
- `@acme/notifications` - Discord and other notifications

## Development

### Prerequisites

- Node.js 22.14.0+
- PNPM 9.6.0+
- Rust (for desktop app)

### Getting Started

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Web app only
pnpm dev:web

# Database operations
pnpm db:push
pnpm db:studio
```

### Scripts

- `pnpm build` - Build all applications
- `pnpm lint` - Run linting with Ultracite
- `pnpm format` - Format code with Ultracite
- `pnpm typecheck` - Type checking across workspace
- `pnpm clean` - Clean node_modules and build artifacts

### Desktop Development

```bash
cd apps/desktop

# Development mode
pnpm dev

# Build for production
pnpm build
```

## Project Structure

```
voicegecko/
├── apps/
│   ├── desktop/          # Tauri desktop application
│   └── web/              # Next.js web application
├── packages/
│   ├── api/              # tRPC API and business logic
│   ├── auth/             # Authentication system
│   ├── db/               # Database schema and client
│   ├── ui/               # Shared components
│   ├── email/            # Email system
│   └── [+6 more]/        # Additional shared packages
└── tooling/              # Development and build tools
```

---

**Company**: Social Freak Limited (trading as Voice Gecko)  
**Website**: [voicegecko.dev](https://www.voicegecko.dev)
