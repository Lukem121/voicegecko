/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchStreamLink,
  loggerLink,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";

import type { AppRouter } from "@acme/api";

import { getToken } from "~/stores/auth";

const queryClient = new QueryClient();

export const { useTRPC, TRPCProvider } = createTRPCContext<AppRouter>();

export function TRPCReactProvider(props: React.PropsWithChildren) {
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            import.meta.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          async headers() {
            const headers = new Headers();
            headers.set("x-trpc-source", "tauri-desktop");

            // Get cached token from Tauri store
            const token = await getToken();
            if (token) {
              headers.set("Cookie", `better-auth.session_token=${token}`);
            }

            return headers;
          },
          // Enable credentials for cross-origin cookie support
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children as any}
      </TRPCProvider>
    </QueryClientProvider>
  );
}

const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL as string;
};
