/**
 * PostHog Constants
 *
 * Centralized constants for PostHog event tracking parameters and configuration.
 * This ensures consistency across the application and makes it easy to update
 * event names if needed.
 */

// Common sources for tracking
export const POSTHOG_SOURCES = {
  HEADER: 'header',
  FOOTER: 'footer',
  LANDING_PAGE: 'landing_page',
  HERO: 'hero',
  PRICING_PAGE: 'pricing_page',
  DOWNLOAD_PAGE: 'download_page',
  APP_DASHBOARD: 'app_dashboard',
  PLANS_PAGE: 'plans_page',
  BILLING_REMINDER: 'billing_reminder',
  EMAIL_CAMPAIGN: 'email_campaign',
  STICKY_CTA: 'sticky_cta',
  FINAL_CTA: 'final_cta',
  ORGANIC: 'organic',
} as const;

// Modal names for consistency
export const MODAL_NAMES = {
  SYSTEM_REQUIREMENTS: 'system_requirements',
  BILLING_PORTAL: 'billing_portal',
  PLATFORM_VOTE: 'platform_vote',
} as const;

// Section names for landing page tracking
export const SECTION_NAMES = {
  HERO: 'hero',
  SOCIAL_PROOF: 'social_proof',
  FEATURES: 'features',
  SPEED_COMPARISON: 'speed_comparison',
  AI_VOICE: 'ai_voice',
  GECKOBAR: 'geckobar',
  TRANSCRIPTION_FEATURES: 'dictation_features',
  TALK_TO_AI: 'talk_to_ai',
  APP_SCREENSHOT: 'app_screenshot',
  FINAL_CTA: 'final_cta',
} as const;
