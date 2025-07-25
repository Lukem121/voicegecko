import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { authRouter } from "./router/auth.route";
import { dictionaryRouter } from "./router/dictionary.route";
import { stripeRouter } from "./router/stripe.route";
import { transcriptionRouter } from "./router/transcription.route";
import { usageRouter } from "./router/usage.route";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  transcription: transcriptionRouter,
  stripe: stripeRouter,
  usage: usageRouter,
  dictionary: dictionaryRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Inference helpers for input types
 * @example
 * type PostByIdInput = RouterInputs['post']['byId']
 *      ^? { id: number }
 **/
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 * @example
 * type AllPostsOutput = RouterOutputs['post']['all']
 *      ^? Post[]
 **/
export type RouterOutputs = inferRouterOutputs<AppRouter>;
