import { create } from 'zustand';

type GeckoBarNotification = {
  message: string;
  duration?: number; // Duration in milliseconds
  priority?: 'high' | 'normal'; // High priority messages override any current message
};

type GeckoBarNotificationStore = {
  notification: GeckoBarNotification | null;
  showNotification: (notification: GeckoBarNotification) => void;
  clearNotification: () => void;
};

export const useGeckoBarNotificationStore = create<GeckoBarNotificationStore>(
  (set, get) => ({
    notification: null,

    showNotification: (notification) => {
      set({ notification });

      // Auto-clear after duration if specified
      const duration = notification.duration ?? 3000; // Default 3 seconds
      setTimeout(() => {
        const current = get().notification;
        // Only clear if it's still the same notification (avoid clearing newer ones)
        if (current === notification) {
          set({ notification: null });
        }
      }, duration);
    },

    clearNotification: () => {
      set({ notification: null });
    },
  })
);
