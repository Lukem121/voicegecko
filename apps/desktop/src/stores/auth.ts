import { LazyStore } from "@tauri-apps/plugin-store";

// TODO update to v2 https://v2.tauri.app/plugin/store/

export const authStore = new LazyStore("session");
// Turn these into 1 liners

export const getToken = () => authStore.get<string>("token");

export const setToken = (token: string) => authStore.set("token", token);

export const deleteToken = () => authStore.delete("token");
