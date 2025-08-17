'use client';

import { log } from '@acme/observability/log';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';

// Types for the chat system
export type MascotMessage = {
  id: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'celebration' | 'guidance';
  duration?: number; // How long to show the message (ms) - ignored if persist is true
  showTyping?: boolean; // Whether to show typing animation
  priority?: 'low' | 'normal' | 'high'; // Message priority for queue management
  persist?: boolean; // If true, message stays until next message arrives
};

export type MascotAnimation = {
  type:
    | 'idle'
    | 'listening'
    | 'thinking'
    | 'celebrating'
    | 'welcoming'
    | 'processing'
    | 'dancing';
  intensity?: 'low' | 'medium' | 'high';
  duration?: number; // Auto-return to idle after this time
};

export type MascotState = {
  currentMessage: MascotMessage | null;
  messageQueue: MascotMessage[];
  isTyping: boolean;
  currentAnimation: MascotAnimation;
  isVisible: boolean;
};

export type MascotChatContextValue = {
  state: MascotState;
  // Message actions
  sendMessage: (message: Omit<MascotMessage, 'id'>) => void;
  clearMessage: () => void;
  clearQueue: () => void;
  // Animation actions
  setAnimation: (animation: MascotAnimation) => void;
  resetAnimation: () => void;
  // Visibility
  show: () => void;
  hide: () => void;
  // Convenience methods
  sayHello: (customMessage?: string, persist?: boolean) => void;
  celebrate: (message?: string, persist?: boolean) => void;
  showGuidance: (message: string, persist?: boolean) => void;
  showSuccess: (message: string, persist?: boolean) => void;
  showError: (message: string, persist?: boolean) => void;
};

// Action types for the reducer
type MascotAction =
  | { type: 'SEND_MESSAGE'; payload: MascotMessage }
  | { type: 'SHOW_NEXT_MESSAGE' }
  | { type: 'CLEAR_MESSAGE' }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_ANIMATION'; payload: MascotAnimation }
  | { type: 'RESET_ANIMATION' }
  | { type: 'SET_VISIBILITY'; payload: boolean };

// Initial state
const initialState: MascotState = {
  currentMessage: null,
  messageQueue: [],
  isTyping: false,
  currentAnimation: { type: 'idle' },
  isVisible: true,
};

// Reducer for managing mascot state
function mascotReducer(state: MascotState, action: MascotAction): MascotState {
  switch (action.type) {
    case 'SEND_MESSAGE': {
      const message = action.payload;

      // If no current message, show immediately
      if (!state.currentMessage) {
        return {
          ...state,
          currentMessage: message,
          isTyping: message.showTyping ?? true,
        };
      }

      // If current message is persistent or new message is high priority, replace immediately
      if (state.currentMessage.persist || message.priority === 'high') {
        return {
          ...state,
          currentMessage: message,
          isTyping: message.showTyping ?? true,
          // Keep existing queue as is
        };
      }

      // Otherwise, add to queue (sorted by priority)
      const newQueue = [...state.messageQueue, message].sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return (
          priorityOrder[b.priority ?? 'normal'] -
          priorityOrder[a.priority ?? 'normal']
        );
      });

      return {
        ...state,
        messageQueue: newQueue,
      };
    }

    case 'SHOW_NEXT_MESSAGE': {
      const [nextMessage, ...remainingQueue] = state.messageQueue;

      return {
        ...state,
        currentMessage: nextMessage || null,
        messageQueue: remainingQueue,
        isTyping: nextMessage ? (nextMessage.showTyping ?? true) : false,
      };
    }

    case 'CLEAR_MESSAGE': {
      return {
        ...state,
        currentMessage: null,
        isTyping: false,
      };
    }

    case 'CLEAR_QUEUE': {
      return {
        ...state,
        messageQueue: [],
      };
    }

    case 'SET_TYPING': {
      return {
        ...state,
        isTyping: action.payload,
      };
    }

    case 'SET_ANIMATION': {
      return {
        ...state,
        currentAnimation: action.payload,
      };
    }

    case 'RESET_ANIMATION': {
      return {
        ...state,
        currentAnimation: { type: 'idle' },
      };
    }

    case 'SET_VISIBILITY': {
      return {
        ...state,
        isVisible: action.payload,
      };
    }

    default:
      return state;
  }
}

// Create the context
const MascotChatContext = createContext<MascotChatContextValue | null>(null);

// Hook to use the mascot chat context
export function useMascotChat(): MascotChatContextValue {
  const context = useContext(MascotChatContext);
  if (!context) {
    throw new Error('useMascotChat must be used within a MascotChatProvider');
  }
  return context;
}

// Provider component
type MascotChatProviderProps = {
  children: React.ReactNode;
  defaultAnimation?: MascotAnimation;
  autoProcessQueue?: boolean; // Whether to automatically show queued messages
};

export function MascotChatProvider({
  children,
  defaultAnimation = { type: 'idle' },
  autoProcessQueue = true,
}: MascotChatProviderProps) {
  const [state, dispatch] = useReducer(mascotReducer, {
    ...initialState,
    currentAnimation: defaultAnimation,
  });

  // Generate unique IDs for messages
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Auto-process message queue
  useEffect(() => {
    if (!autoProcessQueue) {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    if (!state.currentMessage && state.messageQueue.length > 0) {
      // Show next message immediately if no current message
      dispatch({ type: 'SHOW_NEXT_MESSAGE' });
    } else if (state.currentMessage && !state.currentMessage.persist) {
      // Auto-clear current message after duration (only if not persistent)
      const duration = state.currentMessage.duration ?? 5000;
      timeoutId = setTimeout(() => {
        dispatch({ type: 'CLEAR_MESSAGE' });
      }, duration);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [state.currentMessage, state.messageQueue.length, autoProcessQueue]);

  // Auto-clear typing animation
  useEffect(() => {
    if (!state.isTyping) {
      return;
    }

    // If no current message, clear typing immediately
    if (!state.currentMessage) {
      dispatch({ type: 'SET_TYPING', payload: false });
      return;
    }

    const typingDuration = state.currentMessage.content?.length
      ? Math.min(2000, state.currentMessage.content.length * 50)
      : 1000;

    const timeoutId = setTimeout(() => {
      dispatch({ type: 'SET_TYPING', payload: false });
    }, typingDuration);

    return () => clearTimeout(timeoutId);
  }, [state.isTyping, state.currentMessage]);

  // Auto-reset animations
  useEffect(() => {
    if (state.currentAnimation.type === 'idle') {
      return;
    }

    const duration = state.currentAnimation.duration ?? 3000;
    const timeoutId = setTimeout(() => {
      dispatch({ type: 'RESET_ANIMATION' });
    }, duration);

    return () => clearTimeout(timeoutId);
  }, [state.currentAnimation]);

  // Action implementations
  const sendMessage = useCallback(
    (messageData: Omit<MascotMessage, 'id'>) => {
      // Validate message content
      if (!messageData.content || messageData.content.trim() === '') {
        log.warn(
          '[MascotChatProvider] Attempted to send empty message, ignoring'
        );
        return;
      }

      const message: MascotMessage = {
        ...messageData,
        id: generateMessageId(),
      };
      dispatch({ type: 'SEND_MESSAGE', payload: message });
    },
    [generateMessageId]
  );

  const clearMessage = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGE' });
  }, []);

  const clearQueue = useCallback(() => {
    dispatch({ type: 'CLEAR_QUEUE' });
  }, []);

  const setAnimation = useCallback((animation: MascotAnimation) => {
    dispatch({ type: 'SET_ANIMATION', payload: animation });
  }, []);

  const resetAnimation = useCallback(() => {
    dispatch({ type: 'RESET_ANIMATION' });
  }, []);

  const show = useCallback(() => {
    dispatch({ type: 'SET_VISIBILITY', payload: true });
  }, []);

  const hide = useCallback(() => {
    dispatch({ type: 'SET_VISIBILITY', payload: false });
  }, []);

  // Convenience methods
  const sayHello = useCallback(
    (customMessage?: string, persist?: boolean) => {
      sendMessage({
        content:
          customMessage ??
          "👋 Hi there! I'm your friendly VoiceGecko guide. Let's get started!",
        type: 'info',
        showTyping: true,
        duration: 4000,
        persist,
      });
      setAnimation({ type: 'welcoming', duration: 2000 });
    },
    [sendMessage, setAnimation]
  );

  const celebrate = useCallback(
    (message?: string, persist?: boolean) => {
      sendMessage({
        content: message ?? "🎉 Awesome work! You're doing great!",
        type: 'celebration',
        showTyping: true,
        duration: 3000,
        priority: 'high',
        persist,
      });
      setAnimation({ type: 'celebrating', intensity: 'high', duration: 3000 });
    },
    [sendMessage, setAnimation]
  );

  const showGuidance = useCallback(
    (message: string, persist?: boolean) => {
      sendMessage({
        content: message,
        type: 'guidance',
        showTyping: true,
        duration: 6000,
        persist,
      });
      setAnimation({ type: 'thinking', duration: 2000 });
    },
    [sendMessage, setAnimation]
  );

  const showSuccess = useCallback(
    (message: string, persist?: boolean) => {
      sendMessage({
        content: message,
        type: 'success',
        showTyping: true,
        duration: 4000,
        priority: 'high',
        persist,
      });
      setAnimation({
        type: 'celebrating',
        intensity: 'medium',
        duration: 2000,
      });
    },
    [sendMessage, setAnimation]
  );

  const showError = useCallback(
    (message: string, persist?: boolean) => {
      sendMessage({
        content: message,
        type: 'warning',
        showTyping: true,
        duration: 5000,
        priority: 'high',
        persist,
      });
      setAnimation({ type: 'thinking', intensity: 'low', duration: 1500 });
    },
    [sendMessage, setAnimation]
  );

  const contextValue: MascotChatContextValue = {
    state,
    sendMessage,
    clearMessage,
    clearQueue,
    setAnimation,
    resetAnimation,
    show,
    hide,
    sayHello,
    celebrate,
    showGuidance,
    showSuccess,
    showError,
  };

  return (
    <MascotChatContext.Provider value={contextValue}>
      {children}
    </MascotChatContext.Provider>
  );
}
