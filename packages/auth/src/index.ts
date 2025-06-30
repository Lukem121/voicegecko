import type { BetterAuthOptions } from "better-auth";
import { expo } from "@better-auth/expo";
import { tauri } from "@daveyplate/better-auth-tauri/plugin";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";

import { db } from "@acme/db/client";

export function initAuth(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;

  discordClientId: string;
  discordClientSecret: string;
}) {
  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [
      oAuthProxy({
        /**
         * Auto-inference blocked by https://github.com/better-auth/better-auth/pull/2891
         */
        currentURL: options.baseUrl,
        productionURL: options.productionUrl,
      }),
      expo(),
      tauri({
        scheme: "voicegecko", // Your app's deep link scheme
        callbackURL: "/", // Optional: Where to redirect after auth (default: "/")
        successText: "Authentication successful! You can close this window.", // Optional
        successURL: "/auth/success", // Optional: Custom success page URL that will receive a ?tauriRedirect search parameter
        debugLogs: true, // Optional: Enable debug logs
      }),
    ],
    socialProviders: {
      discord: {
        clientId: options.discordClientId,
        clientSecret: options.discordClientSecret,
        redirectURI: `${options.baseUrl}/api/auth/callback/discord`, // This was productionUrl but it was causing issues with the redirect URI in dev
      },
    },
    trustedOrigins: ["expo://", "voicegecko://"],
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
