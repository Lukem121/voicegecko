import { z } from "zod/v4";

import { usernameSchema } from "./username.schema";

const email = z.email("Please enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters");

export const nameSchema = z
  .string()
  .min(2, { message: "Name must be at least 2 characters." })
  .max(50, { message: "Name must be at most 50 characters." });

export const SignUpSchema = z
  .object({
    email: email,
    username: usernameSchema,
    name: nameSchema,
    password: passwordSchema,
    passwordConfirmation: passwordSchema,
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Passwords do not match.",
  });

export const SignInSchema = z.object({
  email: email,
  password: passwordSchema,
});

export const ResetPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: passwordSchema,
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Passwords do not match.",
  });

export const ForgotPasswordSchema = z.object({
  email: email,
});
