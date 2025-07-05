import {
  adminClient,
  apiKeyClient,
  phoneNumberClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [
    usernameClient(),
    adminClient(),
    apiKeyClient(),
    twoFactorClient(),
    phoneNumberClient(),
  ],
});
