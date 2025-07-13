# VoiceGecko Implementation Guide

## Project Overview

VoiceGecko is a desktop-first voice transcription application that uses a combination of OpenAI Whisper API and local Whisper models to provide flexible, accurate transcription services.

### Key Features

- **Hybrid Transcription**: Cloud (OpenAI) and local Whisper models
- **Smart Model Selection**: Automatic hardware detection for optimal performance
- **Usage Tracking**: Free tier (2,000 words/week) with subscription options
- **Local-First Storage**: Audio files never leave the device
- **Cross-Platform**: Desktop (Tauri), Web (Next.js), Mobile (React Native)

## Implementation Phases

### [Phase 1: Foundation Setup](./phase-1-foundation.md)

Set up the core infrastructure including database schema, environment configuration, and migrations.

### [Phase 2: Core Infrastructure](./phase-2-infrastructure.md)

Build the file storage system, Tauri audio module, and hardware detection capabilities.

### [Phase 3: API Layer](./phase-3-api-layer.md)

Implement tRPC routes for transcriptions, usage tracking, and OpenAI Whisper integration.

### [Phase 4: Recording & Processing](./phase-4-recording.md)

Create the recording UI, audio processing pipeline, and transcription queue system.

### [Phase 5: Local Processing & UI](./phase-5-local-processing.md)

Implement local Whisper model support and the transcription management UI.

### [Phase 6: Polish & Features](./phase-6-polish.md)

Add keyboard shortcuts, export functionality, and comprehensive error handling.

## Technical Architecture

See [Architecture Document](./architecture.md) for detailed system design.

## Getting Started

1. Start with [Phase 1: Foundation Setup](./phase-1-foundation.md)
2. Review the [Technical Specifications](./technical-specs.md)
3. Follow the phase guides in order (some phases can be parallelized)

## Development Timeline

- **Phase 1**: 2-3 days
- **Phase 2**: 3-4 days
- **Phase 3**: 3-4 days
- **Phase 4**: 4-5 days
- **Phase 5**: 4-5 days
- **Phase 6**: 3-4 days

Total estimated time: 3-4 weeks for MVP
