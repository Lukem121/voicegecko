import { emit } from '@tauri-apps/api/event';
import { create } from 'zustand';
import { queryClient, trpc } from '~/trpc';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  // Add other user properties as needed
};

export type AuthSession = {
  user: AuthUser;
  // Add other session properties as needed
};

type AuthState = {
  // Core state
  isAuthenticated: boolean;
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  user: null,
  session: null,
  isLoading: true,
  error: null,

  // Actions
  setSession: (session) => {
    const wasAuthenticated = get().isAuthenticated;
    const willBeAuthenticated = !!session?.user;

    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session?.user,
      error: null,
    });

    // Emit event to other windows when auth state changes
    if (wasAuthenticated !== willBeAuthenticated) {
      emit('auth-state-changed', {
        isAuthenticated: willBeAuthenticated,
        hasUser: !!session?.user,
      }).catch(() => {
        // Silent fail - not critical if event doesn't send
      });
    }
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  signOut: async () => {
    set({ isLoading: true });

    try {
      // Clear auth store state
      set({
        isAuthenticated: false,
        user: null,
        session: null,
        error: null,
      });

      // Emit sign out event to other windows
      emit('auth-state-changed', {
        isAuthenticated: false,
        hasUser: false,
      }).catch(() => {
        // Silent fail - not critical if event doesn't send
      });

      // Invalidate TanStack Query cache
      const sessionQueryKey = trpc.auth.getSession.queryKey();
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    } catch (error) {
      get().setError(
        error instanceof Error ? error.message : 'Sign out failed'
      );
    } finally {
      set({ isLoading: false });
    }
  },

  initialize: async () => {
    await get().checkAuthStatus();

    // Emit initial auth state for other windows
    const state = get();
    if (state.isAuthenticated) {
      emit('auth-state-changed', {
        isAuthenticated: state.isAuthenticated,
        hasUser: !!state.user,
      }).catch(() => {
        // Silent fail - not critical if event doesn't send
      });
    }
  },

  checkAuthStatus: async () => {
    set({ isLoading: true, error: null });

    try {
      // First check cached session data
      const sessionQueryKey = trpc.auth.getSession.queryKey();
      const cachedSession =
        queryClient.getQueryData<AuthSession>(sessionQueryKey);

      if (cachedSession) {
        get().setSession(cachedSession);
      } else {
        // Fetch fresh session data
        const freshSession = await queryClient.fetchQuery({
          ...trpc.auth.getSession.queryOptions(),
          staleTime: 0, // Force fresh fetch
        });

        get().setSession(freshSession as AuthSession);
      }
    } catch (error) {
      // Set unauthenticated state on error
      set({
        isAuthenticated: false,
        user: null,
        session: null,
        error:
          error instanceof Error
            ? error.message
            : 'Authentication check failed',
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Selector helpers for common use cases
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);

// Subscribe to TanStack Query session changes and sync with auth store
let isSubscribed = false;

export const subscribeToSessionChanges = () => {
  if (isSubscribed) {
    return;
  }

  const sessionQueryKey = trpc.auth.getSession.queryKey();

  queryClient.getQueryCache().subscribe((event) => {
    if (
      event?.query?.queryKey &&
      JSON.stringify(event.query.queryKey) ===
        JSON.stringify(sessionQueryKey) &&
      event.type === 'updated'
    ) {
      const sessionData = event.query.state.data as AuthSession;
      useAuthStore.getState().setSession(sessionData);
    }
  });

  isSubscribed = true;
};
