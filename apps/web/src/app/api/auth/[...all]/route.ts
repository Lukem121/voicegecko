import type { NextRequest } from "next/server";

import { serverAuth } from "@acme/auth";

/**
 * Configure CORS headers for auth endpoints
 * Allows requests from Tauri desktop app and other origins
 */
const setCorsHeaders = (res: Response, req?: NextRequest) => {
  const origin = req?.headers.get("origin");

  // Allow requests from Tauri desktop app and localhost origins
  const allowedOrigins = [
    "http://localhost:1420", // Tauri desktop app
    "http://localhost:3000", // Next.js web app
    "https://voicegecko.io", // VoiceGecko.io web app
    "http://127.0.0.1:1420", // Alternative localhost format
    "http://127.0.0.1:3000", // Alternative localhost format
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }

  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, platform",
  );
};

export const OPTIONS = (req: NextRequest) => {
  const response = new Response(null, {
    status: 204,
  });
  setCorsHeaders(response, req);
  return response;
};

const createHandler = () => {
  return async (req: NextRequest) => {
    const response = await serverAuth.handler(req);
    setCorsHeaders(response, req);
    return response;
  };
};

export const GET = createHandler();
export const POST = createHandler();
