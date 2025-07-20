import { toNextJsHandler } from "better-auth/next-js";

import { serverAuth } from "@acme/auth";

/**
 * Create auth handlers
 */
export const { POST, GET } = toNextJsHandler(serverAuth);
