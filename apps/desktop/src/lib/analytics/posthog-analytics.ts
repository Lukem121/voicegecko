/**
 * PostHog Analytics Service for VoiceGecko Desktop
 *
 * This service provides a centralized way to track user events and behavior
 * throughout the application while respecting user privacy settings.
 */

import { log } from '@acme/observability';
import { usePostHog } from 'posthog-js/react';
import React from 'react';

import { useSettingsStore } from '~/stores/settings.store';

// =============================================================================
// CONSTANTS
// =============================================================================

const WORD_SPLIT_REGEX = /\s+/;

// =============================================================================
// EVENT TYPES & INTERFACES
// =============================================================================

interface BaseEventProperties {
  timestamp?: number;
  platform: 'desktop';
  app_version?: string;
}

// User Lifecycle Events
interface UserLifecycleEvents {
  user_signed_up: {
    method: 'email' | 'discord' | 'google';
    source?: string;
  };
  user_signed_in: {
    method: 'email' | 'discord' | 'google';
    returning_user: boolean;
  };
  user_signed_out: Record<string, never>;
  user_email_verified: Record<string, never>;
}

// Onboarding Events
interface OnboardingEvents {
  onboarding_started: Record<string, never>;
  onboarding_step_completed: {
    step_id: string;
    step_title: string;
    step_index: number;
    time_spent_seconds: number;
  };
  onboarding_step_skipped: {
    step_id: string;
    step_title: string;
    step_index: number;
  };
  onboarding_completed: {
    total_time_seconds: number;
    steps_completed: number;
    steps_skipped: number;
  };
  onboarding_abandoned: {
    last_step_id: string;
    steps_completed: number;
    time_spent_seconds: number;
  };
}

// Recording Events
interface RecordingEvents {
  recording_started: {
    trigger: 'gecko_bar' | 'main_ui' | 'keyboard_shortcut';
    device_name?: string;
    device_type?: string;
  };
  recording_stopped: {
    duration_seconds: number;
    trigger: 'user_action' | 'auto_stop';
    method: 'gecko_bar' | 'main_ui' | 'keyboard_shortcut';
  };
  recording_cancelled: {
    duration_seconds: number;
    reason: 'user_action' | 'error' | 'timeout';
  };
  recording_error: {
    error_type: string;
    error_message: string;
    duration_before_error?: number;
  };
}

// Transcription Events
interface TranscriptionEvents {
  transcription_started: {
    model_type: 'cloud' | 'local';
    model_name?: string;
    audio_duration_seconds: number;
    sample_rate: number;
    has_dictionary_words: boolean;
    dictionary_word_count: number;
  };
  transcription_completed: {
    model_type: 'cloud' | 'local';
    model_name?: string;
    audio_duration_seconds: number;
    processing_time_seconds: number;
    transcript_length: number;
    transcript_word_count: number;
    is_silent: boolean;
    confidence_score?: number;
  };
  transcription_failed: {
    model_type: 'cloud' | 'local';
    model_name?: string;
    error_type: string;
    error_message: string;
    audio_duration_seconds?: number;
    processing_time_seconds?: number;
  };
  transcription_copied: {
    transcript_length: number;
    method: 'button' | 'auto_paste';
  };
  transcription_deleted: {
    transcription_id: number;
    method: 'user_action' | 'bulk_action';
  };
  transcription_searched: {
    search_term_length: number;
    search_type: 'server_search' | 'fuzzy_search';
  };
}

// Dictionary Events
interface DictionaryEvents {
  dictionary_word_added: {
    word_length: number;
    total_words_count: number;
    method: 'manual' | 'auto_suggestion';
  };
  dictionary_word_updated: {
    old_word_length: number;
    new_word_length: number;
    total_words_count: number;
  };
  dictionary_word_deleted: {
    word_length: number;
    total_words_count: number;
  };
  dictionary_searched: {
    search_term_length: number;
    results_count: number;
    search_type: 'exact' | 'fuzzy';
  };
  dictionary_sort_changed: {
    sort_type: 'alphabetical' | 'newest' | 'oldest';
  };
}

// Navigation Events
interface NavigationEvents {
  page_viewed: {
    page_name: string;
    page_path: string;
    previous_page?: string;
    time_since_last_navigation?: number;
  };
  sidebar_navigation: {
    section: 'main' | 'smart_features' | 'secondary';
    item_title: string;
    item_url: string;
  };
}

// Settings Events
interface SettingsEvents {
  settings_changed: {
    category:
      | 'audio'
      | 'general'
      | 'privacy'
      | 'personalization'
      | 'models'
      | 'shortcuts';
    setting_key: string;
    old_value: unknown;
    new_value: unknown;
  };
  audio_device_changed: {
    device_name: string;
    device_type: string;
  };
  notification_sound_tested: {
    sound_name: string;
    volume: number;
  };
  model_tier_changed: {
    old_tier: string;
    new_tier: string;
  };
  model_download_started: {
    model_id: string;
    model_name: string;
    model_size: string;
    tier: string;
  };
  model_download_completed: {
    model_id: string;
    model_name: string;
    download_time_seconds: number;
    success: boolean;
  };
}

// Gecko Bar Events
interface GeckoBarEvents {
  gecko_bar_interaction: {
    action:
      | 'click'
      | 'hover'
      | 'recording_start'
      | 'recording_stop'
      | 'recording_cancel';
    state: 'collapsed' | 'expanded' | 'recording' | 'processing';
  };
  gecko_bar_visibility_changed: {
    visible: boolean;
    trigger: 'settings' | 'fullscreen' | 'manual';
  };
}

// Performance Events
interface PerformanceEvents {
  app_startup: {
    startup_time_seconds: number;
    initialization_steps: string[];
    models_synchronized: boolean;
    auto_update_available: boolean;
  };
  app_shutdown: {
    session_duration_seconds: number;
    recordings_count: number;
    transcriptions_count: number;
  };
  feature_first_use: {
    feature_name: string;
    time_to_first_use_seconds: number;
  };
  error_occurred: {
    error_type: string;
    error_message: string;
    component: string;
    stack_trace?: string;
    user_action?: string;
  };
}

// Business Intelligence Events
interface BusinessEvents {
  usage_limit_approached: {
    limit_type: 'transcription' | 'storage';
    current_usage: number;
    limit_value: number;
    percentage_used: number;
  };
  usage_limit_exceeded: {
    limit_type: 'transcription' | 'storage';
    attempted_action: string;
  };
  upgrade_prompt_shown: {
    trigger: 'usage_limit' | 'feature_gate' | 'manual' | 'usage_page';
    plan_suggested: string;
  };
  feedback_submitted: {
    type: 'transcription_quality' | 'bug_report' | 'feature_request';
    rating?: number;
    has_text: boolean;
  };
  usage_stats_viewed: {
    total_words: number;
    total_time_saved: number;
    current_plan: 'unlimited' | 'limited';
  };
}

// Combined event types
type AllEvents = UserLifecycleEvents &
  OnboardingEvents &
  RecordingEvents &
  TranscriptionEvents &
  DictionaryEvents &
  NavigationEvents &
  SettingsEvents &
  GeckoBarEvents &
  PerformanceEvents &
  BusinessEvents;

type EventName = keyof AllEvents;
type EventProperties<T extends EventName> = AllEvents[T] & BaseEventProperties;

// =============================================================================
// ANALYTICS SERVICE CLASS
// =============================================================================

class PostHogAnalyticsService {
  private posthog: ReturnType<typeof usePostHog> | null = null;
  private isInitialized = false;
  private queuedEvents: {
    event: EventName;
    properties: Record<string, unknown>;
  }[] = [];

  /**
   * Initialize the analytics service with PostHog instance
   */
  init(posthogInstance: ReturnType<typeof usePostHog>) {
    this.posthog = posthogInstance;
    this.isInitialized = true;

    // Process any queued events
    for (const { event, properties } of this.queuedEvents) {
      this.track(event, properties);
    }
    this.queuedEvents = [];
  }

  /**
   * Check if analytics are enabled based on user privacy settings
   */
  private isAnalyticsEnabled(): boolean {
    const settings = useSettingsStore.getState().settings;
    return settings.privacy.usageAnalytics;
  }

  /**
   * Get common properties that should be included with every event
   */
  private getCommonProperties(): BaseEventProperties {
    return {
      timestamp: Date.now(),
      platform: 'desktop' as const,
    };
  }

  /**
   * Track an event with PostHog
   */
  track<T extends EventName>(
    event: T,
    properties?: Omit<EventProperties<T>, keyof BaseEventProperties>
  ) {
    // Don't track if analytics are disabled
    if (!this.isAnalyticsEnabled()) {
      log.info(`[Analytics] Skipped tracking "${event}" - analytics disabled`);
      return;
    }

    const finalProperties = {
      ...this.getCommonProperties(),
      ...properties,
    };

    if (!(this.isInitialized && this.posthog)) {
      // Queue the event for later processing
      this.queuedEvents.push({ event, properties: finalProperties });
      log.info(`[Analytics] Queued event "${event}" - PostHog not initialized`);
      return;
    }

    try {
      this.posthog.capture(event, finalProperties);
      log.info(`[Analytics] Tracked event "${event}"`, finalProperties);
    } catch (error) {
      log.error(`[Analytics] Failed to track event "${event}":`, error);
    }
  }

  /**
   * Identify a user with PostHog
   */
  identify(userId: string, properties?: Record<string, unknown>) {
    if (!(this.isAnalyticsEnabled() && this.posthog)) {
      return;
    }

    try {
      this.posthog.identify(userId, properties);
      log.info(`[Analytics] Identified user "${userId}"`, properties);
    } catch (error) {
      log.error(`[Analytics] Failed to identify user "${userId}":`, error);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, unknown>) {
    if (!(this.isAnalyticsEnabled() && this.posthog)) {
      return;
    }

    try {
      this.posthog.setPersonProperties(properties);
      log.info('[Analytics] Set user properties', properties);
    } catch (error) {
      log.error('[Analytics] Failed to set user properties:', error);
    }
  }

  /**
   * Reset analytics (on sign out)
   */
  reset() {
    if (!this.posthog) {
      return;
    }

    try {
      this.posthog.reset();
      log.info('[Analytics] Reset analytics');
    } catch (error) {
      log.error('[Analytics] Failed to reset analytics:', error);
    }
  }

  /**
   * Track page view with automatic previous page detection
   */
  trackPageView(pageName: string, pagePath: string) {
    // Simple previous page tracking (could be enhanced with a proper navigation store)
    const previousPage = sessionStorage.getItem('currentPage');
    sessionStorage.setItem('currentPage', pageName);

    const timeSinceLastNavigation = previousPage
      ? Date.now() -
        Number.parseInt(sessionStorage.getItem('lastNavigationTime') || '0', 10)
      : undefined;

    sessionStorage.setItem('lastNavigationTime', Date.now().toString());

    this.track('page_viewed', {
      page_name: pageName,
      page_path: pagePath,
      previous_page: previousPage || undefined,
      time_since_last_navigation: timeSinceLastNavigation,
    });
  }

  /**
   * Track feature first use with automatic timing
   */
  trackFeatureFirstUse(featureName: string) {
    const storageKey = `feature_first_use_${featureName}`;
    const hasUsedBefore = localStorage.getItem(storageKey);

    if (!hasUsedBefore) {
      const appStartTime = Number.parseInt(
        sessionStorage.getItem('appStartTime') || '0',
        10
      );
      const timeToFirstUse = appStartTime
        ? (Date.now() - appStartTime) / 1000
        : 0;

      this.track('feature_first_use', {
        feature_name: featureName,
        time_to_first_use_seconds: timeToFirstUse,
      });

      localStorage.setItem(storageKey, Date.now().toString());
    }
  }

  /**
   * Track timing events with automatic duration calculation
   */
  startTiming(eventKey: string) {
    sessionStorage.setItem(`timing_${eventKey}`, Date.now().toString());
  }

  endTiming(eventKey: string): number {
    const startTime = Number.parseInt(
      sessionStorage.getItem(`timing_${eventKey}`) || '0',
      10
    );
    sessionStorage.removeItem(`timing_${eventKey}`);
    return startTime ? (Date.now() - startTime) / 1000 : 0;
  }
}

// =============================================================================
// SINGLETON INSTANCE & REACT HOOKS
// =============================================================================

// Create singleton instance
export const analytics = new PostHogAnalyticsService();

/**
 * React hook to initialize analytics with PostHog
 * Should be called once in the app root
 */
export function useAnalyticsInit() {
  const posthog = usePostHog();

  React.useEffect(() => {
    if (posthog) {
      analytics.init(posthog);
    }
  }, [posthog]);
}

/**
 * React hook for tracking events in components
 */
export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    identify: analytics.identify.bind(analytics),
    setUserProperties: analytics.setUserProperties.bind(analytics),
    reset: analytics.reset.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackFeatureFirstUse: analytics.trackFeatureFirstUse.bind(analytics),
    startTiming: analytics.startTiming.bind(analytics),
    endTiming: analytics.endTiming.bind(analytics),
  };
}

// =============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON PATTERNS
// =============================================================================

/**
 * Track recording session from start to finish
 */
export class RecordingSessionTracker {
  private startTime: number;
  private trigger: 'gecko_bar' | 'main_ui' | 'keyboard_shortcut';

  constructor(trigger: 'gecko_bar' | 'main_ui' | 'keyboard_shortcut') {
    this.startTime = Date.now();
    this.trigger = trigger;
  }

  trackStart(deviceName?: string, deviceType?: string) {
    analytics.track('recording_started', {
      trigger: this.trigger,
      device_name: deviceName,
      device_type: deviceType,
    });
  }

  trackStop(method: 'gecko_bar' | 'main_ui' | 'keyboard_shortcut') {
    const duration = (Date.now() - this.startTime) / 1000;
    analytics.track('recording_stopped', {
      duration_seconds: duration,
      trigger: 'user_action',
      method,
    });
  }

  trackCancel(reason: 'user_action' | 'error' | 'timeout') {
    const duration = (Date.now() - this.startTime) / 1000;
    analytics.track('recording_cancelled', {
      duration_seconds: duration,
      reason,
    });
  }

  trackError(errorType: string, errorMessage: string) {
    const duration = (Date.now() - this.startTime) / 1000;
    analytics.track('recording_error', {
      error_type: errorType,
      error_message: errorMessage,
      duration_before_error: duration,
    });
  }
}

/**
 * Track transcription processing from start to finish
 */
export class TranscriptionTracker {
  private startTime: number;
  private modelType: 'cloud' | 'local';
  private modelName?: string;
  private audioDuration: number;

  constructor(
    modelType: 'cloud' | 'local',
    audioDuration: number,
    modelName?: string
  ) {
    this.startTime = Date.now();
    this.modelType = modelType;
    this.modelName = modelName;
    this.audioDuration = audioDuration;
  }

  trackStart(
    hasDictionaryWords: boolean,
    dictionaryWordCount: number,
    sampleRate: number
  ) {
    analytics.track('transcription_started', {
      model_type: this.modelType,
      model_name: this.modelName,
      audio_duration_seconds: this.audioDuration,
      sample_rate: sampleRate,
      has_dictionary_words: hasDictionaryWords,
      dictionary_word_count: dictionaryWordCount,
    });
  }

  trackCompleted(
    transcript: string,
    isSilent: boolean,
    confidenceScore?: number
  ) {
    const processingTime = (Date.now() - this.startTime) / 1000;
    const wordCount = transcript.trim().split(WORD_SPLIT_REGEX).length;

    analytics.track('transcription_completed', {
      model_type: this.modelType,
      model_name: this.modelName,
      audio_duration_seconds: this.audioDuration,
      processing_time_seconds: processingTime,
      transcript_length: transcript.length,
      transcript_word_count: wordCount,
      is_silent: isSilent,
      confidence_score: confidenceScore,
    });
  }

  trackFailed(errorType: string, errorMessage: string) {
    const processingTime = (Date.now() - this.startTime) / 1000;
    analytics.track('transcription_failed', {
      model_type: this.modelType,
      model_name: this.modelName,
      error_type: errorType,
      error_message: errorMessage,
      audio_duration_seconds: this.audioDuration,
      processing_time_seconds: processingTime,
    });
  }
}

export default analytics;
