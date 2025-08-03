// URL configuration constants
export const APP_ROUTES = {
  HOME: "/",
  AUTH: {
    SIGN_IN: "/sign-in",
    SIGN_UP: "/sign-up",
    FORGOT_PASSWORD: "/forgot-password",
    RESET_PASSWORD: "/reset-password",
    VERIFY_EMAIL: "/verify-email",
    ERROR: "/authentication-error",
  },
  SETTINGS: {
    ROOT: "/settings/profile",
    ACCOUNT: "/settings/account",
    SECURITY: "/settings/security",
    APPEARANCE: "/settings/appearance",
  },
  LEGAL: {
    TERMS: "/legal/terms",
    PRIVACY: "/legal/privacy",
  },
} as const;

// Type-safe URL parameter builder
export function buildUrl(
  base: string,
  params?: Record<string, string | number>,
): string {
  if (!params) {
    return base;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.append(key, String(value));
  }

  return `${base}?${searchParams.toString()}`;
}

// Type-safe dynamic route builder
export function buildDynamicRoute(
  pattern: string,
  params: Record<string, string | number>,
): string {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`[${key}]`, String(value)),
    pattern,
  );
}

// Query parameters (buildUrl)
// buildUrl('/services', { page: 1, limit: 10 });
// Result: /services?page=1&limit=10

// Path parameters (buildDynamicRoute)
// buildDynamicRoute('/services/[type]/[id]', { type: 'twitter', id: '123' });
// Result: /services/twitter/123
