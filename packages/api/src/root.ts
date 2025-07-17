import { authRouter } from "./router/auth.route";
import { transcriptionRouter } from "./router/transcription.route";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  transcription: transcriptionRouter,
});

export type AppRouter = typeof appRouter;
