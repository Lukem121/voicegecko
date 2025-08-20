/**
 * GTM Constants
 *
 * Centralized constants for GTM event names, parameters, and configuration.
 * This ensures consistency across the application and makes it easy to update
 * event names if needed.
 */

// Common sources for tracking
export const SOURCES = {
  HEADER: 'header',
  FOOTER: 'footer',
  LANDING_PAGE: 'landing_page',
  PRICING_PAGE: 'pricing_page',
  DOWNLOAD_PAGE: 'download_page',
  APP_DASHBOARD: 'app_dashboard',
  PLANS_PAGE: 'plans_page',
  BILLING_REMINDER: 'billing_reminder',
  EMAIL_CAMPAIGN: 'email_campaign',
  ORGANIC: 'organic',
} as const;
