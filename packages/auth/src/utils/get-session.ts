"use server";

import { cache } from "react";
import { headers } from "next/headers";

import type { Session } from "..";
import { serverAuth } from "..";

export const getServerSession = cache(async () => {
  const session = await serverAuth.api.getSession({
    headers: await headers(),
  });
  return session as Session | null;
});

export const getUserId = async () => {
  const session = await getServerSession();
  return session?.user.id;
};
