import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import('./src/env');

/** @type {import("next").NextConfig} */
const config = {
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    '@acme/api',
    '@acme/auth',
    '@acme/db',
    '@acme/ui',
    '@acme/validators',
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  /** Configure CORS headers for API routes */
  async headers() {
    const allowedOrigins = [
      'http://localhost:3000', // Next.js app local dev
      'http://localhost:1420', // Tauri desktop app
      'http://tauri.localhost', // Tauri desktop app
      'https://voicegecko.io', // Production web app
      'https://www.voicegecko.io', // Production web app with www
    ];

    // Create header configurations for each allowed origin
    const corsHeaders = allowedOrigins.map((origin) => ({
      source: '/api/:path*',
      has: [
        {
          type: 'header',
          key: 'origin',
          value: origin,
        },
      ],
      headers: [
        { key: 'Access-Control-Allow-Origin', value: origin },
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS',
        },
        {
          key: 'Access-Control-Allow-Headers',
          value:
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie, platform, x-trpc-source, trpc-accept, x-trpc-accept',
        },
        { key: 'Access-Control-Max-Age', value: '86400' },
      ],
    }));

    return corsHeaders;
  },
};

export default config;
