// Re-export core functionality
export { sendEmail } from "./lib/send-email";
export { sendVerificationEmail } from "./send/verification";
export { sendResetPasswordEmail } from "./send/reset-password";
export { sendWelcomeEmail } from "./send/welcome";
export { sendWelcomeProEmail } from "./send/welcome-pro";
export { sendPaymentFailedEmail } from "./send/payment-failed";
export { sendSubscriptionCancelledEmail } from "./send/subscription-cancelled";
export { sendStudentDiscountEmail } from "./send/student-discount";
