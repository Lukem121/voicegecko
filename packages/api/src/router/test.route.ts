import { sendPaymentFailedEmail } from '@acme/email/send/payment-failed';
import { sendResetPasswordEmail } from '@acme/email/send/reset-password';
import { sendSubscriptionCancelledEmail } from '@acme/email/send/subscription-cancelled';
import { sendVerificationEmail } from '@acme/email/send/verification';
import { sendWelcomeEmail } from '@acme/email/send/welcome';
import { sendWelcomeProEmail } from '@acme/email/send/welcome-pro';

import type { TRPCRouterRecord } from '@trpc/server';
import { adminProcedure } from '../trpc';

/**
 * Maintainer-only email template smoke test.
 * Sends to the calling admin's email — never a hardcoded address.
 */
export const testRouter = {
  sendAllEmailTemplates: adminProcedure.mutation(async ({ ctx }) => {
    const testEmail = ctx.session.user.email;
    const testUser = {
      email: testEmail,
      name: ctx.session.user.name ?? 'Test User',
    };

    try {
      await Promise.all([
        sendPaymentFailedEmail({
          user: testUser,
          planName: 'Pro Plan',
          retryPaymentUrl: 'https://www.voicegecko.dev/billing/retry',
          accountUrl: 'https://www.voicegecko.dev/account',
        }),
        sendResetPasswordEmail({
          user: testUser,
          url: 'https://www.voicegecko.dev/reset-password?token=test-token',
        }),
        sendSubscriptionCancelledEmail({
          user: testUser,
          planName: 'Pro Plan',
          accessUntilDate: 'December 31, 2024',
          reactivateUrl: 'https://www.voicegecko.dev/billing/reactivate',
        }),
        sendVerificationEmail({
          user: testUser,
          url: 'https://www.voicegecko.dev/verify?token=test-verification-token',
        }),
        sendWelcomeProEmail({
          user: testUser,
          planName: 'Pro Plan',
        }),
        sendWelcomeEmail({
          user: testUser,
        }),
      ]);

      return {
        success: true,
        message: `All email templates sent successfully to ${testEmail}`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send one or more email templates',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),
} satisfies TRPCRouterRecord;
