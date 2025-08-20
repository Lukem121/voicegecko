/**
 * Robust Redirection System
 *
 * This utility provides a centralized way to handle user intent preservation
 * across authentication, payment, and navigation flows.
 */

export type UserIntent = {
  /** The original URL the user was trying to access */
  originalUrl: string;
  /** The type of action that triggered the redirect */
  intentType: 'auth' | 'payment' | 'billing' | 'upgrade' | 'general';
  /** Additional context about the user's journey */
  context?: {
    /** Where the user came from (desktop app, web, direct link) */
    source?: 'desktop' | 'web' | 'direct' | 'external';
    /** The specific feature they were trying to access */
    feature?: string;
    /** Any additional metadata */
    metadata?: Record<string, unknown>;
  };
  /** Timestamp when intent was stored */
  timestamp: number;
  /** Optional fallback URL if original intent cannot be fulfilled */
  fallbackUrl?: string;
};

// Storage keys
const INTENT_STORAGE_KEY = 'voicegecko_user_intent';
const INTENT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// Pre-compiled regex for domain cleaning
const WWW_PREFIX_REGEX = /^www\./;

/**
 * Stores user intent for later retrieval
 */
export function storeUserIntent(intent: Omit<UserIntent, 'timestamp'>): void {
  try {
    const fullIntent: UserIntent = {
      ...intent,
      timestamp: Date.now(),
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(INTENT_STORAGE_KEY, JSON.stringify(fullIntent));
    }
  } catch {
    // Silently fail - user intent storage is not critical
  }
}

/**
 * Retrieves stored user intent
 */
export function retrieveUserIntent(): UserIntent | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const stored = localStorage.getItem(INTENT_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const intent: UserIntent = JSON.parse(stored);

    // Check if intent has expired
    if (Date.now() - intent.timestamp > INTENT_EXPIRY_MS) {
      clearUserIntent();
      return null;
    }

    return intent;
  } catch {
    clearUserIntent();
    return null;
  }
}

/**
 * Clears stored user intent
 */
export function clearUserIntent(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(INTENT_STORAGE_KEY);
    }
  } catch {
    // Silently fail - clearing user intent is not critical
  }
}

/**
 * Creates a redirect URL with preserved intent
 */
export function createRedirectUrl(
  targetUrl: string,
  intent: Omit<UserIntent, 'timestamp'>
): string {
  // Store the intent
  storeUserIntent(intent);

  // For authentication flows, we can also include the original URL in the redirect parameter
  // as a backup for immediate server-side redirects
  const url = new URL(
    targetUrl,
    typeof window !== 'undefined' ? window.location.origin : ''
  );
  url.searchParams.set('redirect', intent.originalUrl);

  return url.toString();
}

/**
 * Resolves where to redirect the user after a successful flow
 */
export function resolveRedirectDestination(fallbackUrl = '/app'): string {
  // First check for stored intent
  const storedIntent = retrieveUserIntent();
  if (storedIntent) {
    clearUserIntent();

    // Validate the stored URL is safe to redirect to
    if (isValidRedirectUrl(storedIntent.originalUrl)) {
      return storedIntent.originalUrl;
    }

    // If original URL is invalid, try fallback
    if (
      storedIntent.fallbackUrl &&
      isValidRedirectUrl(storedIntent.fallbackUrl)
    ) {
      return storedIntent.fallbackUrl;
    }
  }

  // Check URL parameters as backup
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    if (redirectParam && isValidRedirectUrl(redirectParam)) {
      return redirectParam;
    }
  }

  return fallbackUrl;
}

/**
 * Validates if a URL is safe for redirect
 */
export function isValidRedirectUrl(url: string): boolean {
  try {
    // Allow relative paths
    if (url.startsWith('/')) {
      return true;
    }

    // For absolute URLs, check if they're from allowed domains
    const parsedUrl = new URL(url);
    const allowedDomains = [
      'voicegecko.io',
      'www.voicegecko.io',
      'localhost',
      '127.0.0.1',
    ];

    // Allow custom schemes for desktop app
    if (parsedUrl.protocol === 'voicegecko:') {
      return true;
    }

    // Check domain
    const hostname = parsedUrl.hostname.replace(WWW_PREFIX_REGEX, '');
    return allowedDomains.some(
      (domain) => domain === hostname || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Creates success/cancel URLs for payment flows that preserve user intent
 */
export function createPaymentUrls(
  baseSuccessUrl: string,
  baseCancelUrl: string,
  preserveIntent = true
): { successUrl: string; cancelUrl: string } {
  const currentIntent = retrieveUserIntent();

  if (!preserveIntent) {
    return {
      successUrl: baseSuccessUrl,
      cancelUrl: baseCancelUrl,
    };
  }

  if (!currentIntent) {
    return {
      successUrl: baseSuccessUrl,
      cancelUrl: baseCancelUrl,
    };
  }

  // Create enhanced intent for post-payment flow
  const postPaymentIntent: Omit<UserIntent, 'timestamp'> = {
    ...currentIntent,
    intentType: 'payment',
    context: {
      ...currentIntent.context,
      postPaymentFlow: true,
    },
  };

  // Store enhanced intent and create URLs
  storeUserIntent(postPaymentIntent);

  return {
    successUrl: `${baseSuccessUrl}?intent_preserved=true`,
    cancelUrl: `${baseCancelUrl}?intent_preserved=true`,
  };
}

/**
 * Utility for desktop app to create cross-platform redirect URLs
 */
export function createCrossPlatformUrl(
  webUrl: string,
  desktopContext: {
    feature?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  } = {}
): string {
  const intent: Omit<UserIntent, 'timestamp'> = {
    originalUrl: `voicegecko://${desktopContext.feature || 'app'}`,
    intentType: 'general',
    context: {
      source: 'desktop',
      ...desktopContext,
    },
    fallbackUrl: '/app',
  };

  return createRedirectUrl(webUrl, intent);
}
