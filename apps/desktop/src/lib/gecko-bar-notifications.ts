import { invoke } from "@tauri-apps/api/core";

export interface GeckoBarNotification {
  message: string;
  duration?: number; // milliseconds
  priority?: "high" | "normal";
}

/**
 * Send a notification to the gecko bar
 */
export async function sendGeckoBarNotification(
  notification: GeckoBarNotification,
): Promise<void> {
  try {
    await invoke("send_gecko_bar_notification", {
      message: notification.message,
      duration: notification.duration,
      priority: notification.priority,
    });
  } catch (error) {
    console.error(
      "[GeckoBarNotifications] Failed to send notification:",
      error,
    );
  }
}

/**
 * Show a usage limit notification in the gecko bar
 */
export function showUsageLimitNotification(): Promise<void> {
  return sendGeckoBarNotification({
    message: "Usage limit reached",
    duration: 3000, // 3 seconds
    priority: "high",
  });
}
