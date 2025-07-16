import { StrictMode, useEffect, useState } from "react";

import { authClient } from "~/lib/client";

import "@acme/ui/globals.css";
import "~/styles/fonts.css";

import { useBetterAuthTauri } from "@daveyplate/better-auth-tauri/react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import { AppLauncher } from "~/components/app-launcher";
import { FullscreenDetector } from "~/components/fullscreen-detector";
import { GeckoBarApp } from "~/components/gecko-bar/gecko-bar-app";
import { useIsAuthenticated } from "~/hooks/auth";
import { useGeckoBarSettings } from "~/hooks/use-gecko-bar-settings";
import { shortcutManager } from "~/lib/shortcuts/manager";
import { isGeckoBarWindow } from "~/lib/window-detection";
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
  const { config: geckoBarConfig } = useGeckoBarSettings();

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
    console.log("Auth state changed", session.data, session.isPending);
    void router.invalidate();
  }, [session.data, session.isPending]);

  return (
    <>
      <FullscreenDetector
        enabled={
          geckoBarConfig.enabled && (geckoBarConfig.hideOnFullscreen ?? true)
        }
        geckoBarEnabled={geckoBarConfig.enabled}
      />
      <RouterProvider router={router} context={{ auth }} />
    </>
  );
}

function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isGeckoBar, setIsGeckoBar] = useState<boolean | null>(null);

  useEffect(() => {
    // Detect which window we're in
    async function detectWindow() {
      const geckoBarWindow = await isGeckoBarWindow();
      setIsGeckoBar(geckoBarWindow);
      console.log("Window detected:", geckoBarWindow ? "gecko-bar" : "main");
    }

    void detectWindow();
  }, []);

  useEffect(() => {
    if (isAppReady && !isGeckoBar) {
      void shortcutManager.initialize();
    }
  }, [isAppReady, isGeckoBar]);

  // Don't render anything until we know which window we're in
  if (isGeckoBar === null) {
    return <div>Loading...</div>;
  }

  // If this is the gecko bar window, render the gecko bar app directly
  if (isGeckoBar) {
    return (
      <TRPCReactProvider>
        <GeckoBarApp />
      </TRPCReactProvider>
    );
  }

  // Otherwise, this is the main window
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
