import posthog from 'posthog-js';
import { PostHogProvider as PostHogProviderBase } from 'posthog-js/react';
import { env } from '~/env';

posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: '2025-05-24',
});

// Set global properties to identify web app events
posthog.register({
  platform: 'web',
  app_name: 'voicegecko-web',
  source: 'web-app',
});

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PostHogProviderBase client={posthog}>{children}</PostHogProviderBase>;
}
