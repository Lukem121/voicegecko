import {
  adminClient,
  apiKeyClient,
  phoneNumberClient,
  twoFactorClient,
  usernameClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_PUBLIC_VOICEGECKO_URL,
  plugins: [
    usernameClient(),
    adminClient(),
    apiKeyClient(),
    twoFactorClient(),
    phoneNumberClient(),
  ],
});
