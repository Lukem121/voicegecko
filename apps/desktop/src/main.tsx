import { StrictMode, useEffect, useState } from "react";

import { authClient } from "~/lib/client";

import "@acme/ui/globals.css";
import "~/styles/fonts.css";

import { useBetterAuthTauri } from "@daveyplate/better-auth-tauri/react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import { AppLauncher } from "~/components/app-launcher";
import { useIsAuthenticated } from "~/hooks/auth";
import { usePushToTalk } from "~/hooks/use-push-to-talk";
import { shortcutManager } from "~/lib/shortcuts/manager";
// Import the generated route tree
import { routeTree } from "~/routeTree.gen";
import { TRPCReactProvider } from "~/trpc";
import { ThemeProvider } from "./providers/theme";

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    auth: {
      isAuthenticated: false,
      isLoading: true,
      user: null,
    },
  },
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const auth = useIsAuthenticated();
  const session = authClient.useSession();
  usePushToTalk();

  useBetterAuthTauri({
    authClient,
    scheme: "voicegecko",
    debugLogs: true,
    onRequest: (href) => {
      console.log("🔄 Auth request:", href);
    },
    onSuccess: (callbackURL) => {
      console.log("✅ Auth successful, callback URL:", callbackURL);
      session.refetch();
    },
    onError: (error) => {
      console.error("❌ Auth error:", error);
    },
  });

  useEffect(() => {
    void shortcutManager.initialize();
  }, []);

  useEffect(() => {
    console.log("Auth state changed", session.data, session.isPending);
    void router.invalidate();
  }, [session.data, session.isPending]);

  return <RouterProvider router={router} context={{ auth }} />;
}

function App() {
  const [isAppReady, setIsAppReady] = useState(false);

  // Show launcher/updater first, then main app
  if (!isAppReady) {
    return <AppLauncher onReady={() => setIsAppReady(true)} />;
  }

  return (
    <TRPCReactProvider>
      <InnerApp />
    </TRPCReactProvider>
  );
}

// Render the app
const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("Root not in body");

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
}
