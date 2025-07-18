import {
  adminClient,
  apiKeyClient,
  phoneNumberClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "~/env";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_VOICEGECKO_API_URL,
  plugins: [
    usernameClient(),
    adminClient(),
    apiKeyClient(),
    twoFactorClient(),
    phoneNumberClient(),
  ],
});
