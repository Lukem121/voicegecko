import type { BetterAuthOptions } from "better-auth";
import { expo } from "@better-auth/expo";
import { tauri } from "@daveyplate/better-auth-tauri/plugin";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin as adminPlugin,
  oAuthProxy,
  phoneNumber,
  twoFactor,
  username,
} from "better-auth/plugins";

import { db } from "@acme/db/client";
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
} from "@acme/email/emails";

import { checkBannedMiddleware } from "./middleware/check-banned-middleware";
import { usernameValidator } from "./schemas/username.schema";

export function initAuth(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;

  discordClientId: string;
  discordClientSecret: string;
}) {
  const config = {
    appName: "Voice Gecko",
    account: {
      accountLinking: {
        enabled: true,
      },
    },
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // Cache duration: 5 minutes
      },
    },
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
      adminPlugin(),
      phoneNumber(),
      twoFactor(),
      username({
        usernameValidator,
      }),
    ],
    hooks: {
      after: checkBannedMiddleware,
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendVerificationEmail: sendVerificationEmail,
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: true,
      sendResetPassword: sendResetPasswordEmail,
    },
    socialProviders: {
      discord: {
        clientId: options.discordClientId,
        clientSecret: options.discordClientSecret,
        redirectURI: `${options.baseUrl}/api/auth/callback/discord`, // This was productionUrl but it was causing issues with the redirect URI in dev
        mapProfileToUser: (profile: {
          username: string;
          verified: boolean;
        }) => {
          return {
            username: profile.username,
            emailVerified: profile.verified,
          };
        },
      },
    },
    trustedOrigins: [
      "expo://",
      "voicegecko://",
      "http://localhost:1420", // Tauri desktop app
      "http://127.0.0.1:1420", // Alternative localhost format
    ],
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
