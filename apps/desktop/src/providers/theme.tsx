import type { ReactNode } from "react";

import { ThemeProvider as Provider } from "@acme/ui/components/theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <Provider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </Provider>
  );
}
