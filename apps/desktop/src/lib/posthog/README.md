# PostHog Analytics System Documentation

This document provides a comprehensive overview of the PostHog analytics implementation in VoiceGecko Desktop. It covers architecture, usage patterns, event types, and maintenance guidelines.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup & Configuration](#setup--configuration)
- [Event Types & Tracking](#event-types--tracking)
- [Implementation Patterns](#implementation-patterns)
- [Privacy & Settings](#privacy--settings)
- [Troubleshooting](#troubleshooting)
- [Extending the System](#extending-the-system)
- [Best Practices](#best-practices)

## 🔍 Overview

Our PostHog analytics system provides comprehensive tracking of user behavior, product usage, and technical performance across VoiceGecko Desktop. The implementation follows privacy-first principles and is fully integrated with our settings system.

### Key Features

- ✅ **Privacy-First**: Respects user privacy settings (`usageAnalytics` toggle)
- ✅ **Type-Safe**: Full TypeScript coverage with event type definitions
- ✅ **Comprehensive**: Tracks 40+ different event types across all major features
- ✅ **Reliable**: Event queuing system handles initialization timing
- ✅ **Performance**: Lightweight with minimal impact on app performance

## 🏗️ Architecture

### File Structure

```
apps/desktop/src/lib/
├── posthog/
│   ├── posthog-provider.tsx     # React Provider wrapper
│   └── README.md                # This documentation
├── analytics/
│   └── posthog-analytics.ts     # Main analytics service
└── components/analytics/
    └── page-tracker.tsx         # Navigation tracking component
```

### Core Components

1. **PostHog Provider** (`posthog-provider.tsx`)
   - Wraps the app with PostHog React provider
   - Handles initialization with API key and configuration

2. **Analytics Service** (`posthog-analytics.ts`)
   - Centralized analytics service with type-safe event tracking
   - Manages user identification, privacy settings, and event queuing
   - Provides specialized tracking utilities

3. **Page Tracker** (`page-tracker.tsx`)
   - Automatic page view tracking using TanStack Router
   - Placed inside router context for proper navigation tracking

## ⚙️ Setup & Configuration

### Environment Variables

PostHog is configured through environment variables in the provider:

```typescript
// posthog-provider.tsx
<PostHogProvider
  apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
  options={{
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    // ... other config
  }}
>
```

### Initialization Flow

1. **App Startup**: PostHog provider wraps the entire app
2. **Analytics Init**: `useAnalyticsInit()` hook initializes the service
3. **User Identification**: When user signs in, `analytics.identify()` is called
4. **Event Tracking**: Events are tracked throughout the app lifecycle

### Privacy Integration

Analytics respect the user's privacy settings:

```typescript
// Controlled by: Settings > Privacy > Usage Analytics
settings.privacy.usageAnalytics: boolean
```

When disabled, all tracking calls are skipped with console logging.

## 📊 Event Types & Tracking

### Event Categories

Our analytics system tracks 10 major categories of events:

#### 1. **User Lifecycle Events**

- `user_signed_up` - User registration
- `user_signed_in` - Authentication success
- `user_signed_out` - User logout
- `user_email_verified` - Email verification completion

#### 2. **Onboarding Events**

- `onboarding_started` - User begins onboarding
- `onboarding_step_completed` - Individual step completion
- `onboarding_completed` - Full onboarding completion
- `onboarding_abandoned` - User exits onboarding early

#### 3. **Recording Events**

- `recording_started` - Audio recording begins
- `recording_stopped` - Recording ends normally
- `recording_cancelled` - User cancels recording
- `recording_error` - Recording failure

#### 4. **Dictation Events**

- `dictation_started` - Dictation processing begins
- `dictation_completed` - Dictation success
- `dictation_failed` - Dictation error
- `dictation_copied` - User copies dictation
- `dictation_deleted` - User deletes dictation
- `dictation_searched` - User searches dictations

#### 5. **Dictionary Events**

- `dictionary_word_added` - New word added to dictionary
- `dictionary_word_updated` - Dictionary word modified
- `dictionary_word_deleted` - Word removed from dictionary
- `dictionary_searched` - Dictionary search performed

#### 6. **Navigation Events**

- `page_viewed` - Page navigation (automatic)
- `sidebar_navigation` - Sidebar item clicked

#### 7. **Settings Events**

- `settings_changed` - Any setting modification
- `audio_device_changed` - Audio device selection
- `model_tier_changed` - Dictation model change
- `notification_sound_tested` - Sound test playback

#### 8. **Gecko Bar Events**

- `gecko_bar_interaction` - User interacts with floating bar
- `gecko_bar_visibility_changed` - Show/hide state changes
- `gecko_bar_action` - Recording controls usage

#### 9. **Window/System Events**

- `app_window_action` - Window show/hide from tray
- `app_startup` - Application initialization
- `app_shutdown` - Application closure

#### 10. **Business Intelligence Events**

- `usage_limit_approached` - Near usage limits
- `usage_limit_exceeded` - Usage limits hit
- `upgrade_prompt_shown` - Upgrade CTA displayed
- `feedback_submitted` - User feedback sent
- `usage_stats_viewed` - User checks usage statistics

### Event Properties

Each event includes:

- **Base Properties**: `timestamp`, `platform` ("desktop")
- **Event-Specific Properties**: Defined per event type
- **User Context**: Automatically attached when available

## 🛠️ Implementation Patterns

### Basic Event Tracking

```typescript
import { analytics } from "~/lib/analytics/posthog-analytics";

// Simple event tracking
analytics.track("user_signed_in", {
  method: "email",
  returning_user: true,
});

// Feature first-use tracking
analytics.trackFeatureFirstUse("dictation_search");

// User identification
analytics.identify(userId, {
  email: user.email,
  name: user.name,
  // ... other properties
});
```

### Session-Based Tracking

For complex workflows, we use specialized tracker classes:

```typescript
// Recording session tracking
const recorder = new RecordingSessionTracker("manual", audioDuration);
recorder.trackStarted();
// ... recording process
recorder.trackCompleted(duration);

// Dictation tracking
const dictation = new DictationTracker("cloud", audioDuration, "whisper-1");
dictation.trackStarted();
// ... dictation process
dictation.trackCompleted(transcript, isSilent);
```

### Settings Integration

Settings changes are automatically tracked:

```typescript
// In settings store
analytics.track("settings_changed", {
  category: "audio",
  setting_key: "selectedDevice",
  old_value: oldDevice?.name,
  new_value: newDevice?.name,
});
```

### Error Tracking

Technical and business errors are tracked with context:

```typescript
analytics.track("error_occurred", {
  error_type: "connectivity_issue",
  error_message: error.message,
  component: "ConnectivityManager",
  user_action: "connectivity_check",
});
```

## 🔒 Privacy & Settings

### Privacy Controls

Users can disable analytics via Settings > Privacy > Usage Analytics:

```typescript
// Settings store
privacy: {
  usageAnalytics: true, // Default: enabled
  crashReports: true    // Separate from PostHog
}
```

### Privacy-Safe Implementation

- **No PII**: No personally identifiable information in events
- **User Control**: Complete opt-out capability
- **Transparent**: Clear logging when analytics are disabled
- **Minimal Data**: Only essential data for product improvement

### Data Retention

PostHog manages data retention according to their policies. We don't store analytics data locally.

## 🐛 Troubleshooting

### Common Issues

#### Analytics Disabled

**Symptoms**: Console shows "Skipped tracking - analytics disabled"
**Solution**: Check `Settings > Privacy > Usage Analytics` is enabled

#### Events Not Appearing

**Symptoms**: No events in PostHog dashboard
**Causes**:

1. Environment variables not set correctly
2. Network connectivity issues
3. PostHog service down
4. Event queuing before initialization

#### Router Context Errors

**Symptoms**: `useRouterState` hook errors
**Solution**: Ensure `PageTracker` is inside `RouterProvider` context (should be in `__root.tsx`)

#### Environment Variable Issues

**Symptoms**: `process is not defined` errors
**Solution**: Use `import.meta.env` for Vite, avoid Node.js `process.env`

### Debug Mode

Enable debug logging by checking console for `[Analytics]` prefixed logs.

## 🚀 Extending the System

### Adding New Events

1. **Define Event Type** in `posthog-analytics.ts`:

```typescript
interface NewFeatureEvents {
  new_feature_used: {
    feature_name: string;
    context?: string;
  };
}
```

2. **Add to Combined Types**:

```typescript
type AllEvents = UserLifecycleEvents &
  // ... existing events
  NewFeatureEvents;
```

3. **Implement Tracking**:

```typescript
analytics.track("new_feature_used", {
  feature_name: "awesome_feature",
  context: "main_ui",
});
```

### Adding Specialized Trackers

For complex workflows, create specialized tracker classes:

```typescript
export class NewWorkflowTracker {
  private startTime: number;

  constructor(private workflowType: string) {
    this.startTime = Date.now();
  }

  trackCompleted() {
    const duration = (Date.now() - this.startTime) / 1000;
    analytics.track("workflow_completed", {
      workflow_type: this.workflowType,
      duration_seconds: duration,
    });
  }
}
```

### Modifying Privacy Settings

To add new privacy controls:

1. Update `PrivacySettings` interface in settings types
2. Add to default settings and loading functions
3. Update `isAnalyticsEnabled()` method if needed

## ✅ Best Practices

### Do's

- ✅ **Use Type-Safe Events**: Always use defined event types
- ✅ **Include Context**: Provide meaningful event properties
- ✅ **Track User Intent**: Focus on user actions and outcomes
- ✅ **Respect Privacy**: Check settings before tracking
- ✅ **Handle Errors**: Gracefully handle analytics failures
- ✅ **Use Feature First Use**: Track adoption with `trackFeatureFirstUse()`

### Don'ts

- ❌ **No PII**: Never track personal information
- ❌ **Avoid Spam**: Don't track every UI interaction
- ❌ **No Blocking**: Analytics should never block app functionality
- ❌ **Avoid Duplication**: Don't track the same event multiple times
- ❌ **No Sensitive Data**: Keep API keys and secrets out of events

### Performance Considerations

- Events are queued if PostHog isn't initialized yet
- Analytics calls are non-blocking
- Failed analytics calls don't affect app functionality
- Use `trackFeatureFirstUse()` to avoid duplicate tracking

## 📈 Analytics Goals

Our analytics system helps answer:

### Product Questions

- Which features are most/least used?
- Where do users get stuck in onboarding?
- What settings do users prefer?
- How do users discover features?

### Technical Questions

- What errors occur most frequently?
- How is app performance in the wild?
- Which devices/configurations have issues?
- Are there connectivity patterns?

### Business Questions

- When do users hit usage limits?
- What triggers upgrade consideration?
- How engaged are different user segments?
- What drives user retention?

## 🔄 Maintenance

### Regular Tasks

1. **Review Event Types**: Quarterly review of tracked events
2. **Update Documentation**: Keep this doc current with changes
3. **Check Privacy Compliance**: Ensure no PII is tracked
4. **Monitor Performance**: Verify analytics don't impact app speed

### Version Updates

When updating PostHog:

1. Check for breaking changes in PostHog React SDK
2. Test event tracking still works
3. Verify privacy controls still function
4. Update dependencies in `package.json`

---

## 📞 Support

For questions about this analytics implementation:

1. Check this documentation first
2. Review the TypeScript definitions in `posthog-analytics.ts`
3. Check PostHog documentation for SDK-specific issues
4. Test with `[Analytics]` console logs for debugging

---

_Last Updated: January 2025_
_Implementation Version: 1.0_
