import { db } from '@acme/db/client';
import { sendResetPasswordEmail } from '@acme/email/send/reset-password';
import { sendVerificationEmail } from '@acme/email/send/verification';
import { stripeClient } from '@acme/payment/stripe';
import { onSubscriptionCancel } from '@acme/payment/subscription-handlers/on-subscription-cancel';
import { onSubscriptionComplete } from '@acme/payment/subscription-handlers/on-subscription-complete';
import { onSubscriptionDeleted } from '@acme/payment/subscription-handlers/on-subscription-deleted';
import { onSubscriptionUpdate } from '@acme/payment/subscription-handlers/on-subscription-update';
import { stripe } from '@better-auth/stripe';
import { tauri } from '@daveyplate/better-auth-tauri/plugin';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import {
  admin as adminPlugin,
  oAuthProxy,
  phoneNumber,
  twoFactor,
  username,
} from 'better-auth/plugins';

import { authEnv } from '../env';
import { handleAfterHook } from './middleware/handle-after-hook';
import { handleCreateAfterHook } from './middleware/handle-create-after-hook';
import { usernameValidator } from './schemas/username.schema';

export const serverAuth = betterAuth({
  appName: 'Voice Gecko',
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  secret: authEnv().AUTH_SECRET,
  advanced: {
    cookies: {
      session_token: {
        attributes: {
          sameSite: 'none',
          secure: true,
        },
      },
      session_data: {
        attributes: {
          sameSite: 'none',
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
            name: 'voice gecko pro',
            priceId: authEnv().STRIPE_PRICE_ID_PRO_MONTHLY,
            annualDiscountPriceId: authEnv().STRIPE_PRICE_ID_PRO_YEARLY,
          },
          {
            name: 'voice gecko team',
            priceId: authEnv().STRIPE_PRICE_ID_TEAM_MONTHLY,
            annualDiscountPriceId: authEnv().STRIPE_PRICE_ID_TEAM_YEARLY,
          },
        ],
        onSubscriptionComplete,
        onSubscriptionUpdate,
        onSubscriptionCancel,
        onSubscriptionDeleted,
        getCheckoutSessionParams: (_, request) => {
          const currency = request?.headers?.get('x-currency') ?? undefined;
          return {
            params: {
              allow_promotion_codes: true,
              currency,
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
    tauri({
      scheme: 'voicegecko',
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
    after: handleAfterHook,
  },
  databaseHooks: {
    user: {
      create: {
        after: handleCreateAfterHook,
      },
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendVerificationEmail,
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
    google: {
      clientId: authEnv().AUTH_GOOGLE_CLIENT_ID,
      clientSecret: authEnv().AUTH_GOOGLE_CLIENT_SECRET,
    },
  },
  trustedOrigins: [
    'voicegecko://',

    'http://localhost:3000', // Next.js app
    'http://localhost:1420', // Tauri desktop app
    'http://tauri.localhost', // Tauri desktop app

    'https://voicegecko.io',
    'https://www.voicegecko.io',
  ],
});

export type Auth = typeof serverAuth;
export type Session = typeof serverAuth.$Infer.Session;
