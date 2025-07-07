import { expo } from "@better-auth/expo";
import { tauri } from "@daveyplate/better-auth-tauri/plugin";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin as adminPlugin,
  createAuthMiddleware,
  oAuthProxy,
  phoneNumber,
  twoFactor,
  username,
} from "better-auth/plugins";

import { db } from "@acme/db/client";
import { sendResetPasswordEmail, sendVerificationEmail } from "@acme/email";

import { authEnv } from "../env";
import { checkBannedMiddleware } from "./middleware/check-banned-middleware";
import { usernameValidator } from "./schemas/username.schema";

export const serverAuth = betterAuth({
  appName: "Voice Gecko",
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: authEnv().AUTH_SECRET,
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
      currentURL: authEnv().VOICEGECKO_API_URL,
      productionURL: authEnv().VOICEGECKO_API_URL,
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
    before: createAuthMiddleware(async (ctx) => {
      const allowedEmails = [
        "lukeask@hotmail.co.uk",
        "pepperglazedluke@gmail.com",
      ];

      if (ctx.path !== "/sign-up/email" && ctx.path !== "/sign-in/discord") {
        return;
      }

      const email = ctx.body?.email;
      if (!email) {
        throw new Error("Email is required");
      }

      // Extract base email (remove + extension if present)
      const [localPart, domain] = email.split("@");
      const baseLocalPart = localPart.split("+")[0];
      const baseEmail = `${baseLocalPart}@${domain}`;

      if (!allowedEmails.includes(baseEmail)) {
        throw new Error("Email must be in the allowed list");
      }
    }),
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
      clientId: authEnv().AUTH_DISCORD_ID,
      clientSecret: authEnv().AUTH_DISCORD_SECRET,
      mapProfileToUser: (profile: { username: string; verified: boolean }) => {
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
});

export type Auth = typeof serverAuth;
export type Session = typeof serverAuth.$Infer.Session;
