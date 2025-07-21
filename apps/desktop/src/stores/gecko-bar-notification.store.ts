import { create } from "zustand";

interface GeckoBarNotification {
  message: string;
  duration?: number; // Duration in milliseconds
  priority?: "high" | "normal"; // High priority messages override any current message
}

interface GeckoBarNotificationStore {
  notification: GeckoBarNotification | null;
  showNotification: (notification: GeckoBarNotification) => void;
  clearNotification: () => void;
}

export const useGeckoBarNotificationStore = create<GeckoBarNotificationStore>(
  (set) => ({
    notification: null,

    showNotification: (notification) => {
      set({ notification });

      // Auto-clear after duration if specified
      if (notification.duration) {
        setTimeout(() => {
          set((state) => {
            // Only clear if it's still the same notification
            if (state.notification === notification) {
              return { notification: null };
            }
            return state;
          });
        }, notification.duration);
      }
    },

    clearNotification: () => {
      set({ notification: null });
    },
  }),
);
