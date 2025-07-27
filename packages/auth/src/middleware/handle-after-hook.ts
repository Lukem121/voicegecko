import { createAuthMiddleware } from "better-auth/plugins";

import { sendWelcomeEmail } from "@acme/email";
import { DiscordAdapter } from "@acme/notifications";

import { isObjectWithBody } from "../utils/is-object-with-body";

const discordAdapter = new DiscordAdapter();

interface BannedUserError {
  code: "BANNED_USER";
  message: string;
}
function isBannedUserError(value: unknown): value is BannedUserError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    value.code === "BANNED_USER" &&
    typeof value.message === "string"
  );
}

export const handleAfterHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path.startsWith("/callback")) {
    const returned = ctx.context.returned;
    if (
      returned &&
      isObjectWithBody(returned) &&
      isBannedUserError(returned.body)
    ) {
      throw ctx.redirect("/authentication-error?error=USER_BANNED");
    }
  }
});
