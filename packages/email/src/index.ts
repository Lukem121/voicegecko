// Re-export core functionality
export { sendEmail } from "./lib/send-email";

// Re-export email functions
export { sendVerificationEmail } from "./emails/verification";
export { sendResetPasswordEmail } from "./emails/reset-password";
