/**
 * GTM Event Type Definitions
 *
 * Simple, strongly-typed definitions for all GTM events.
 * No builder functions - just clean TypeScript interfaces.
 */

// Base event structure
export type BaseGTMEvent = {
  event: string;
  timestamp?: string;
};

// User authentication events
export type SignupInitiatedEvent = BaseGTMEvent & {
  event: 'signup_initiated';
  form_location: string;
  method: 'email' | 'google' | 'github';
};

export type SignupCompletedEvent = BaseGTMEvent & {
  event: 'signup_completed';
  user_id: string;
  method: 'email' | 'google' | 'github';
  plan_type: 'free';
};

export type LoginEvent = BaseGTMEvent & {
  event: 'login';
  user_id: string;
  method: 'email' | 'google' | 'github';
};

// Download events
export type DownloadInitiatedEvent = BaseGTMEvent & {
  event: 'download_initiated';
  source: string;
  os_type: 'windows' | 'mac' | 'linux' | 'unknown';
};

export type DownloadCompletedEvent = BaseGTMEvent & {
  event: 'download_completed';
  source: string;
  os_type: 'windows' | 'mac' | 'linux' | 'unknown';
  file_name?: string;
};

// Subscription events
export type PurchaseEvent = BaseGTMEvent & {
  event: 'purchase';
  transaction_id: string;
  value: number;
  currency: string;
  user_id: string;
  email_address: string;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category: 'subscription';
    item_variant: 'monthly' | 'yearly';
    price: number;
    quantity: number;
  }>;
  plan_type: 'pro';
  billing_period: 'monthly' | 'yearly';
};

// Engagement events
export type PlanSelectedEvent = BaseGTMEvent & {
  event: 'plan_selected';
  plan_type: 'free' | 'pro';
  billing_period: 'monthly' | 'yearly';
  source: string;
};

// Google Ads events
export type BeginCheckoutEvent = BaseGTMEvent & {
  event: 'begin_checkout';
  plan_type: 'pro';
  billing_period: 'monthly' | 'yearly';
  value: number;
  currency: string;
};

export type GenerateLeadEvent = BaseGTMEvent & {
  event: 'generate_lead';
  user_id?: string;
  value: number;
  currency: string;
};

// Union type of all possible events
export type GTMEvent =
  | SignupInitiatedEvent
  | SignupCompletedEvent
  | LoginEvent
  | DownloadInitiatedEvent
  | DownloadCompletedEvent
  | PurchaseEvent
  | PlanSelectedEvent
  | BeginCheckoutEvent
  | GenerateLeadEvent;
