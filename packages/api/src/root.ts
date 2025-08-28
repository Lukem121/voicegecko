import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

import { authRouter } from './router/auth.route';
import { contactRouter } from './router/contact.route';
import { dictationRouter } from './router/dictation.route';
import { dictionaryRouter } from './router/dictionary.route';
import { geolocationRouter } from './router/geolocation.route';
import { stripeRouter } from './router/stripe.route';
import { testRouter } from './router/test.route';
import { usageRouter } from './router/usage.route';
import { createTRPCRouter } from './trpc';

export const appRouter = createTRPCRouter({
  test: testRouter,
  auth: authRouter,
  contact: contactRouter,
  dictation: dictationRouter,
  stripe: stripeRouter,
  usage: usageRouter,
  dictionary: dictionaryRouter,
  geolocation: geolocationRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Inference helpers for input types
 * @example
 * type PostByIdInput = RouterInputs['post']['byId']
 *      ^? { id: number }
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 * @example
 * type AllPostsOutput = RouterOutputs['post']['all']
 *      ^? Post[]
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
