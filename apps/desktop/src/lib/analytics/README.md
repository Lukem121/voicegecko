# Analytics Implementation

This directory contains the main analytics service implementation for VoiceGecko Desktop.

## 📁 Files

- **`posthog-analytics.ts`** - Core analytics service with type-safe event tracking

## 🔗 Related Documentation

For comprehensive documentation about our PostHog analytics system, see:
**[PostHog Documentation](../posthog/README.md)**

## 🚀 Quick Usage

```typescript
import { analytics } from "~/lib/analytics/posthog-analytics";

// Track events
analytics.track("user_signed_in", { method: "email" });

// Track feature first use
analytics.trackFeatureFirstUse("transcription_search");

// Identify users
analytics.identify(userId, { email: user.email });
```

## 🏗️ Architecture

The analytics service provides:

- **Type-Safe Events**: Full TypeScript coverage for all event types
- **Privacy Controls**: Respects user privacy settings
- **Event Queuing**: Handles initialization timing gracefully
- **Specialized Trackers**: For complex workflows (recordings, transcriptions)

## 📊 Event Categories

We track 40+ events across 10 categories:

- User Lifecycle (sign-up, sign-in, etc.)
- Onboarding Flow
- Recording Sessions
- Transcription Processing
- Dictionary Management
- Navigation Patterns
- Settings Changes
- Gecko Bar Interactions
- System/Window Management
- Business Intelligence

For detailed event specifications, see the main documentation.
