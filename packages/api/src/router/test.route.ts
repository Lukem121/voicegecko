import {
  sendPaymentFailedEmail,
  sendResetPasswordEmail,
  sendStudentDiscountEmail,
  sendSubscriptionCancelledEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendWelcomeProEmail,
} from '@acme/email';
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
          retryPaymentUrl: 'https://voicegecko.io/billing/retry',
          accountUrl: 'https://voicegecko.io/account',
        }),
        sendResetPasswordEmail({
          user: testUser,
          url: 'https://voicegecko.io/reset-password?token=test-token',
        }),
        sendStudentDiscountEmail({
          user: testUser,
          couponCode: 'STUDENT50',
          discountPercentage: '50',
          redemptionUrl: 'https://voicegecko.io/pricing?coupon=STUDENT50',
        }),
        sendSubscriptionCancelledEmail({
          user: testUser,
          planName: 'Pro Plan',
          accessUntilDate: 'December 31, 2024',
          reactivateUrl: 'https://voicegecko.io/billing/reactivate',
        }),
        sendVerificationEmail({
          user: testUser,
          url: 'https://voicegecko.io/verify?token=test-verification-token',
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
