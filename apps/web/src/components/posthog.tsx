'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';
import { authClient } from '~/lib/auth/client';
import { getAttributionForIdentify } from '~/lib/attribution';

export function PostHogUserIdentifier() {
  const session = authClient.useSession();

  useEffect(() => {
    if (session.data?.user) {
      const attribution = getAttributionForIdentify();
      posthog.identify(session.data.user.id, {
        email: session.data.user.email,
        name: session.data.user.name,
        username: session.data.user.username,
        email_verified: session.data.user.emailVerified,
        created_at: session.data.user.createdAt,
        ...attribution,
      });
    }
  }, [session.data?.user]);
  return null;
}
