import { sendPaymentFailedEmail } from '@acme/email/send/payment-failed';
import { sendResetPasswordEmail } from '@acme/email/send/reset-password';
import { sendStudentDiscountEmail } from '@acme/email/send/student-discount';
import { sendSubscriptionCancelledEmail } from '@acme/email/send/subscription-cancelled';
import { sendVerificationEmail } from '@acme/email/send/verification';
import { sendWelcomeEmail } from '@acme/email/send/welcome';
import { sendWelcomeProEmail } from '@acme/email/send/welcome-pro';

import type { TRPCRouterRecord } from '@trpc/server';
import { protectedProcedure } from '../trpc';

export const testRouter = {
  sendAllEmailTemplates: protectedProcedure.mutation(async () => {
    const testEmail = 'lukeask@hotmail.co.uk';
    const testUser = {
      email: testEmail,
      name: 'Test User',
    };

    try {
      // Send all email templates for testing
      await Promise.all([
        sendPaymentFailedEmail({
          user: testUser,
          planName: 'Pro Plan',
          retryPaymentUrl: 'https://www.voicegecko.io/billing/retry',
          accountUrl: 'https://www.voicegecko.io/account',
        }),
        sendResetPasswordEmail({
          user: testUser,
          url: 'https://www.voicegecko.io/reset-password?token=test-token',
        }),
        sendStudentDiscountEmail({
          user: testUser,
          couponCode: 'STUDENT50',
          discountPercentage: '50',
          redemptionUrl: 'https://www.voicegecko.io/pricing?coupon=STUDENT50',
        }),
        sendSubscriptionCancelledEmail({
          user: testUser,
          planName: 'Pro Plan',
          accessUntilDate: 'December 31, 2024',
          reactivateUrl: 'https://www.voicegecko.io/billing/reactivate',
        }),
        sendVerificationEmail({
          user: testUser,
          url: 'https://www.voicegecko.io/verify?token=test-verification-token',
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
