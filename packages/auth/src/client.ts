import {
  adminClient,
  apiKeyClient,
  phoneNumberClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { authEnv } from "../env";

export const authClient = createAuthClient({
  baseURL: authEnv().VOICEGECKO_API_URL,
  plugins: [
    usernameClient(),
    adminClient(),
    apiKeyClient(),
    twoFactorClient(),
    phoneNumberClient(),
  ],
});
