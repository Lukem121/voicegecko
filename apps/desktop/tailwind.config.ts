import type { Config } from "tailwindcss";
import tailwind from "tailwindcss/defaultTheme";

import baseConfig from "@acme/tailwind-config/web";

export default {
  // We need to append the path to the UI package to the content array so that
  // those classes are included correctly.
  content: [...baseConfig.content, "../../packages/ui/**/*.{ts,tsx}"],
  presets: [baseConfig as any],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...tailwind.fontFamily.sans],
        mono: ["var(--font-mono)", ...tailwind.fontFamily.mono],
      },
    },
  },
} satisfies Config;
