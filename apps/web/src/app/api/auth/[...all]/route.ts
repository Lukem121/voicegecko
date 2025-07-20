import { toNextJsHandler } from "better-auth/next-js";

import { serverAuth } from "@acme/auth";

/**
 * Create auth handlers
 */
export const { POST, GET } = toNextJsHandler(serverAuth);

/**
 * Handle OPTIONS preflight requests
 */
export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
