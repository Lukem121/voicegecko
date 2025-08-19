/**
 * Google Analytics 4 Enhanced Ecommerce Event Types
 * Based on GA4 Enhanced Ecommerce specification
 */

export type GTMItem = {
  /** Item ID */
  item_id: string;
  /** Item name */
  item_name: string;
  /** Item category */
  item_category?: string;
  /** Item category 2 */
  item_category2?: string;
  /** Item brand */
  item_brand?: string;
  /** Item variant */
  item_variant?: string;
  /** The currency, in 3-letter ISO 4217 format */
  currency: string;
  /** Item price */
  price: number;
  /** Item quantity */
  quantity: number;
};

export type GTMPurchaseEvent = {
  /** Event name. Always 'purchase' for conversion tracking */
  event: 'purchase';
  /** The currency, in 3-letter ISO 4217 format */
  currency: string;
  /** The value of a user's purchase */
  value: number;
  /** Unique identifier for the transaction */
  transaction_id: string;
  /** Array of purchased items */
  items: GTMItem[];
  /** User ID for attribution (optional but recommended) */
  user_id?: string;
  /** Enhanced Conversions user data (hashed) for Google Ads attribution */
  user_data?: {
    /** Hashed email address using SHA256 */
    email_address?: string;
    /** Hashed phone number using SHA256 */
    phone_number?: string;
    /** Address information for enhanced matching */
    address?: {
      /** Hashed first name using SHA256 */
      first_name?: string;
      /** Hashed last name using SHA256 */
      last_name?: string;
      /** Street address (not hashed) */
      street?: string;
      /** City (not hashed) */
      city?: string;
      /** State/region (not hashed) */
      region?: string;
      /** Postal code (not hashed) */
      postal_code?: string;
      /** Country code (not hashed) */
      country?: string;
    };
  };
  /** Additional custom parameters */
  custom_parameters?: Record<string, string | number | boolean>;
};

export type GTMSubscriptionEvent = {
  /** Event name for subscription events */
  event: 'subscription_cancel' | 'subscription_update' | 'subscription_delete';
  /** The currency, in 3-letter ISO 4217 format */
  currency?: string;
  /** The value of the subscription */
  value?: number;
  /** Unique identifier for the transaction/subscription */
  transaction_id: string;
  /** User ID for attribution */
  user_id?: string;
  /** Subscription status */
  subscription_status: string;
  /** Plan name */
  plan_name?: string;
  /** Additional custom parameters */
  custom_parameters?: Record<string, string | number | boolean>;
};

export type GTMEvent = GTMPurchaseEvent | GTMSubscriptionEvent;

export type GTMResponse = {
  success: boolean;
  error?: string;
};
