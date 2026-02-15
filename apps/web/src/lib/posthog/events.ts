/**
 * PostHog Event Type Definitions
 *
 * Simple, strongly-typed definitions for all PostHog events.
 * No builder functions - just clean TypeScript interfaces.
 */

// Base event structure
export type BasePostHogEvent = {
  event: string;
  timestamp?: string;
  platform?: 'web' | 'desktop';
  app_name?: string;
  source?: string;
  user_id?: string;
};

// User authentication events
export type SignupInitiatedEvent = BasePostHogEvent & {
  event: 'signup_initiated';
  form_location: string;
  method: 'email' | 'google' | 'discord';
};

export type SignupCompletedEvent = BasePostHogEvent & {
  event: 'signup_completed';
  method: 'email' | 'google' | 'discord';
  plan_type: 'free';
};

export type LoginInitiatedEvent = BasePostHogEvent & {
  event: 'login_initiated';
  form_location: string;
  method: 'email' | 'google' | 'discord';
};

export type LoginCompletedEvent = BasePostHogEvent & {
  event: 'login_completed';
  method: 'email' | 'google' | 'discord';
};

// Download events
export type DownloadInitiatedEvent = BasePostHogEvent & {
  event: 'download_initiated';
  os_type: 'windows' | 'mac' | 'linux' | 'unknown';
  cta_location: string;
};

export type DownloadCompletedEvent = BasePostHogEvent & {
  event: 'download_completed';
  os_type: 'windows' | 'mac' | 'linux' | 'unknown';
  file_name?: string;
};

// Subscription events
export type PurchaseEvent = BasePostHogEvent & {
  event: 'purchase';
  transaction_id: string;
  value: number;
  currency: string;
  plan_type: 'pro';
  billing_period: 'monthly' | 'yearly';
};

export type BeginCheckoutEvent = BasePostHogEvent & {
  event: 'begin_checkout';
  plan_type: 'pro';
  billing_period: 'monthly' | 'yearly';
  value: number;
  currency: string;
};

export type PlanSelectedEvent = BasePostHogEvent & {
  event: 'plan_selected';
  plan_type: 'free' | 'pro' | 'team';
  billing_period: 'monthly' | 'yearly';
};

// Platform voting
export type PlatformVoteEvent = BasePostHogEvent & {
  event: 'platform_vote_cast';
  platform: string;
};

// Landing page interactions
export type HeroCTAClickedEvent = BasePostHogEvent & {
  event: 'hero_cta_clicked';
  cta_text: string;
  cta_location: 'hero' | 'sticky' | 'final';
};

export type SectionViewedEvent = BasePostHogEvent & {
  event: 'section_viewed';
  section_name: string;
};

// Navigation events
export type NavigationClickEvent = BasePostHogEvent & {
  event: 'navigation_click';
  link_text: string;
  link_url: string;
  location: 'header' | 'footer';
};

// Modal and dialog events
export type ModalOpenedEvent = BasePostHogEvent & {
  event: 'modal_opened';
  modal_name: string;
  trigger_location?: string;
};

export type ModalClosedEvent = BasePostHogEvent & {
  event: 'modal_closed';
  modal_name: string;
  close_method: 'x_button' | 'overlay' | 'escape' | 'success';
};

// Settings and preferences
export type BillingToggleEvent = BasePostHogEvent & {
  event: 'billing_toggle_changed';
  new_period: 'monthly' | 'yearly';
  previous_period: 'monthly' | 'yearly';
  location: 'pricing' | 'plans';
};

// Feature interactions
export type SystemRequirementsViewedEvent = BasePostHogEvent & {
  event: 'system_requirements_viewed';
  platform: string;
};

export type StudentDiscountInitiatedEvent = BasePostHogEvent & {
  event: 'student_discount_initiated';
};

// Error events
export type ErrorOccurredEvent = BasePostHogEvent & {
  event: 'error_occurred';
  error_type: string;
  error_message: string;
  page: string;
};

// Social proof interactions
export type SocialProofViewedEvent = BasePostHogEvent & {
  event: 'social_proof_viewed';
  proof_type: string;
};

// General lead events
export type GenerateLeadEvent = BasePostHogEvent & {
  event: 'generate_lead';
  value: number;
  currency: string;
};

// Union type of all possible events
export type PostHogEvent =
  | SignupInitiatedEvent
  | SignupCompletedEvent
  | LoginInitiatedEvent
  | LoginCompletedEvent
  | DownloadInitiatedEvent
  | DownloadCompletedEvent
  | PurchaseEvent
  | BeginCheckoutEvent
  | PlanSelectedEvent
  | PlatformVoteEvent
  | HeroCTAClickedEvent
  | SectionViewedEvent
  | NavigationClickEvent
  | ModalOpenedEvent
  | ModalClosedEvent
  | BillingToggleEvent
  | SystemRequirementsViewedEvent
  | StudentDiscountInitiatedEvent
  | ErrorOccurredEvent
  | SocialProofViewedEvent
  | GenerateLeadEvent
  // Video interactions
  | VideoPlayClickedEvent
  | VideoStartedEvent
  | VideoPausedEvent
  | VideoEndedEvent
  | VideoErrorEvent;

// Video events
export type VideoPlayClickedEvent = BasePostHogEvent & {
  event: 'video_play_clicked';
  video_id?: string;
  video_url?: string;
  source?: string;
};

export type VideoStartedEvent = BasePostHogEvent & {
  event: 'video_started';
  video_id?: string;
  video_url?: string;
  current_time?: number;
  source?: string;
};

export type VideoPausedEvent = BasePostHogEvent & {
  event: 'video_paused';
  video_id?: string;
  video_url?: string;
  current_time?: number;
  source?: string;
};

export type VideoEndedEvent = BasePostHogEvent & {
  event: 'video_ended';
  video_id?: string;
  video_url?: string;
  duration?: number;
  source?: string;
};

export type VideoErrorEvent = BasePostHogEvent & {
  event: 'video_error';
  video_id?: string;
  video_url?: string;
  error_message?: string;
  source?: string;
};
