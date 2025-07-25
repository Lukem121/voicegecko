import { expo } from "@better-auth/expo";
import { stripe } from "@better-auth/stripe";
import { tauri } from "@daveyplate/better-auth-tauri/plugin";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
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
import { stripeClient } from "@acme/payment/stripe";
import {
  onSubscriptionCancel,
  onSubscriptionComplete,
  onSubscriptionDeleted,
  onSubscriptionUpdate,
} from "@acme/payment/subscription-handlers";

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
  advanced: {
    cookies: {
      session_token: {
        attributes: {
          sameSite: "none",
          secure: true,
        },
      },
      session_data: {
        attributes: {
          sameSite: "none",
          secure: true,
        },
      },
    },
  },
  plugins: [
    stripe({
      stripeClient,
      stripeWebhookSecret: authEnv().STRIPE_WEBHOOK_SECRET,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "voice gecko pro",
            priceId: authEnv().STRIPE_PRICE_ID_PRO_MONTHLY,
            annualDiscountPriceId: authEnv().STRIPE_PRICE_ID_PRO_YEARLY,
          },
          {
            name: "voice gecko team",
            priceId: authEnv().STRIPE_PRICE_ID_TEAM_MONTHLY,
            annualDiscountPriceId: authEnv().STRIPE_PRICE_ID_TEAM_YEARLY,
          },
        ],
        onSubscriptionComplete,
        onSubscriptionUpdate,
        onSubscriptionCancel,
        onSubscriptionDeleted,
        getCheckoutSessionParams: () => {
          return {
            params: {
              allow_promotion_codes: true,
            },
          };
        },
      },
    }),
    oAuthProxy({
      /**
       * Auto-inference blocked by https://github.com/better-auth/better-auth/pull/2891
       */
      currentURL: authEnv().NEXT_PUBLIC_VOICEGECKO_URL,
      productionURL: authEnv().NEXT_PUBLIC_VOICEGECKO_URL,
    }),
    expo(),
    tauri({
      scheme: "voicegecko",
      debugLogs: true,
    }),
    adminPlugin(),
    phoneNumber(),
    twoFactor(),
    username({
      usernameValidator,
    }),
    nextCookies(),
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

    "http://localhost:3000", // Next.js app
    "http://localhost:1420", // Tauri desktop app
    "http://tauri.localhost", // Tauri desktop app

    "https://voicegecko.io",
    "https://www.voicegecko.io",
  ],
});

export type Auth = typeof serverAuth;
export type Session = typeof serverAuth.$Infer.Session;
