import { StrictMode } from "react";
// import "../node_modules/@acme/ui/styles/globals.css"; // Hack for now

import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import { ThemeProvider } from "@acme/ui/theme";

// Import the generated route tree
import { routeTree } from "~/routeTree.gen";
import { TRPCReactProvider } from "~/trpc";

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("Root not in body");

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TRPCReactProvider>
          <RouterProvider router={router} />
        </TRPCReactProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}
