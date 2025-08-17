/// <reference types="vite/client" />

type ViteTypeOptions = {
  strictImportMetaEnv: unknown;
};

type ImportMetaEnv = {
  readonly VITE_PUBLIC_VOICEGECKO_URL: string;
  readonly VITE_PUBLIC_POSTHOG_KEY: string;
  readonly VITE_PUBLIC_POSTHOG_HOST: string;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};
