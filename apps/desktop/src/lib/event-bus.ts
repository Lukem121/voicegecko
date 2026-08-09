import { log } from '@acme/observability/log';

// Centralized event bus for cross-feature communication
// This provides a typed, decoupled way for different parts of the app to communicate

type EventMap = {
  // App lifecycle events
  'app:ready': undefined;
  'app:error': Error;

  // Settings events
  'settings:changed': { key: string; value: unknown };
  'settings:reset': undefined;

  // Model events
  'model:download:start': { modelId: string };
  'model:download:progress': { modelId: string; progress: number };
  'model:download:complete': { modelId: string };
  'model:download:error': { modelId: string; error: string };

  // Recording events
  'recording:started': undefined;
  'recording:stopped': undefined;
  'recording:error': Error;

  // Dictation events
  'dictation:complete': { text: string };
  'dictation:error': Error;
};

type EventListener<T> = (data: T) => void;

// Union type for all possible event listeners
type AnyEventListener = (data: unknown) => void;

class EventBus {
  private static instance: EventBus;
  private readonly listeners = new Map<keyof EventMap, Set<AnyEventListener>>();

  private constructor() {}

  static getInstance(): EventBus {
    EventBus.instance ??= new EventBus();
    return EventBus.instance;
  }

  on<K extends keyof EventMap>(
    event: K,
    listener: EventListener<EventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)?.add(listener as AnyEventListener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener as AnyEventListener);
    };
  }

  once<K extends keyof EventMap>(
    event: K,
    listener: EventListener<EventMap[K]>
  ): () => void {
    const unsubscribe = this.on(event, (data) => {
      unsubscribe();
      listener(data);
    });
    return unsubscribe;
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    log.info(`[EventBus] Emitting ${event}`, data);
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(data);
        } catch (error) {
          log.error(`[EventBus] Error in listener for ${event}:`, error);
        }
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = EventBus.getInstance();
