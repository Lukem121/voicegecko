import { LazyStore } from "@tauri-apps/plugin-store";

export const authStore = new LazyStore("session");

// Enhanced auth store utilities
export const getToken = async (): Promise<string | null> => {
  const token = await authStore.get<string>("token");
  console.log(
    "🔑 Retrieved token from store:",
    token ? `${token.substring(0, 20)}...` : "null",
  );
  return token ?? null;
};

export const setToken = async (token: string): Promise<void> => {
  await authStore.set("token", token);
  console.log(
    "💾 Token cached in store:",
    token ? `${token.substring(0, 20)}...` : "null",
  );
};

export const deleteToken = async (): Promise<void> => {
  await authStore.delete("token");
  console.log("🗑️ Token removed from store");
};

// Additional utilities for session metadata
export const getSessionMetadata = async () => {
  return await authStore.get<{
    userId?: string;
    expiresAt?: string;
    lastSync?: string;
  }>("metadata");
};

export const setSessionMetadata = async (metadata: {
  userId?: string;
  expiresAt?: string;
  lastSync?: string;
}) => {
  await authStore.set("metadata", {
    ...metadata,
    lastSync: new Date().toISOString(),
  });
  console.log("📝 Session metadata updated:", metadata);
};

export const clearSession = async (): Promise<void> => {
  await Promise.all([authStore.delete("token"), authStore.delete("metadata")]);
  console.log("🧹 Session cleared from store");
};
