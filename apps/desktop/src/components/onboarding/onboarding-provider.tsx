"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { useNavigate } from "@tanstack/react-router";

import type { MascotMessage } from "~/components/mascot";
import { useMascotChat } from "~/components/mascot";
import { useSettingsStore } from "~/stores/settings.store";

// Simplified types - removed complex lifecycle callbacks
export interface OnboardingStepConfig {
  id: string;
  title: string;
  description: string;
  route: string;
  canSkip?: boolean;
  autoAdvance?: boolean;
  dependencies?: string[];
  mascotAnimation?:
    | "idle"
    | "listening"
    | "thinking"
    | "celebrating"
    | "welcoming"
    | "processing"
    | "dancing";
}

export interface OnboardingEvent {
  type: string;
  stepId: string;
  data?: Record<string, any>;
  timestamp: number;
}

export interface OnboardingState {
  currentStepId: string | null;
  completedSteps: Set<string>;
  stepProgress: Record<string, number>;
  events: OnboardingEvent[];
  isInitialized: boolean;
  canProceed: boolean;
  skipAvailable: boolean;
}

export interface OnboardingContextValue {
  // State
  state: OnboardingState;
  steps: OnboardingStepConfig[];
  currentStep: OnboardingStepConfig | null;

  // Navigation
  goToStep: (stepId: string, assumeCompleted?: string) => Promise<void>;
  nextStep: (assumeCompleted?: string) => Promise<void>;
  previousStep: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;

  // Step management
  markStepCompleted: (stepId: string, progress?: number) => void;
  setStepProgress: (stepId: string, progress: number) => void;
  setCanProceed: (canProceed: boolean) => void;

  // Event system (simplified)
  emitEvent: (type: string, data?: Record<string, any>) => void;

  // Mascot integration
  sendMascotMessage: (message: Omit<MascotMessage, "id">) => void;
  triggerMascotAnimation: (animation: string) => void;

  // Utilities
  canAdvanceToStep: (stepId: string) => boolean;
  getStepIndex: (stepId: string) => number;
  getNextStepId: () => string | null;
  getPreviousStepId: () => string | null;
}

// Action types for the reducer
type OnboardingAction =
  | { type: "INITIALIZE"; payload: { steps: OnboardingStepConfig[] } }
  | { type: "SET_CURRENT_STEP"; payload: string }
  | {
      type: "MARK_STEP_COMPLETED";
      payload: { stepId: string; progress?: number };
    }
  | { type: "SET_STEP_PROGRESS"; payload: { stepId: string; progress: number } }
  | { type: "SET_CAN_PROCEED"; payload: boolean }
  | { type: "ADD_EVENT"; payload: OnboardingEvent }
  | { type: "RESET" };

// Initial state
const initialState: OnboardingState = {
  currentStepId: null,
  completedSteps: new Set(),
  stepProgress: {},
  events: [],
  isInitialized: false,
  canProceed: false,
  skipAvailable: true,
};

// Reducer for managing onboarding state
function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState {
  switch (action.type) {
    case "INITIALIZE":
      return {
        ...state,
        isInitialized: true,
        currentStepId: action.payload.steps[0]?.id || null,
      };

    case "SET_CURRENT_STEP":
      return {
        ...state,
        currentStepId: action.payload,
        canProceed: false,
      };

    case "MARK_STEP_COMPLETED": {
      const { stepId, progress = 100 } = action.payload;
      const newCompletedSteps = new Set(state.completedSteps);
      newCompletedSteps.add(stepId);

      return {
        ...state,
        completedSteps: newCompletedSteps,
        stepProgress: {
          ...state.stepProgress,
          [stepId]: progress,
        },
        canProceed: true,
      };
    }

    case "SET_STEP_PROGRESS": {
      const { stepId, progress } = action.payload;
      return {
        ...state,
        stepProgress: {
          ...state.stepProgress,
          [stepId]: progress,
        },
      };
    }

    case "SET_CAN_PROCEED":
      return {
        ...state,
        canProceed: action.payload,
      };

    case "ADD_EVENT":
      return {
        ...state,
        events: [...state.events, action.payload],
      };

    case "RESET":
      return {
        ...initialState,
        isInitialized: true,
      };

    default:
      return state;
  }
}

// Create the context
const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// Hook to use the onboarding context
export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}

// Provider component
interface OnboardingProviderProps {
  children: React.ReactNode;
  steps: OnboardingStepConfig[];
  initialStepId?: string;
}

export function OnboardingProvider({
  children,
  steps,
  initialStepId,
}: OnboardingProviderProps) {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const navigate = useNavigate();
  const { updateOnboardingCompleted } = useSettingsStore();
  const mascotChat = useMascotChat();

  // Initialize only once
  const isInitializedRef = React.useRef(false);
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    dispatch({ type: "INITIALIZE", payload: { steps } });

    if (initialStepId && steps.find((s) => s.id === initialStepId)) {
      dispatch({ type: "SET_CURRENT_STEP", payload: initialStepId });
    }
  }, [steps, initialStepId]);

  // Get current step configuration
  const currentStep = state.currentStepId
    ? steps.find((step) => step.id === state.currentStepId) || null
    : null;

  // Helper functions with stable references
  const getStepIndex = useCallback(
    (stepId: string) => steps.findIndex((step) => step.id === stepId),
    [steps],
  );

  const canAdvanceToStep = useCallback(
    (stepId: string, assumeCompleted?: string) => {
      const step = steps.find((s) => s.id === stepId);
      if (!step) {
        return false;
      }
      // Allow free navigation - no dependency requirements
      return true;
    },
    [steps],
  );

  const getNextStepId = useCallback(
    (assumeCompleted?: string) => {
      if (!state.currentStepId) {
        return null;
      }

      const currentIndex = getStepIndex(state.currentStepId);

      if (currentIndex === -1 || currentIndex >= steps.length - 1) {
        return null;
      }

      for (let i = currentIndex + 1; i < steps.length; i++) {
        const nextStep = steps[i];
        if (nextStep && canAdvanceToStep(nextStep.id, assumeCompleted)) {
          return nextStep.id;
        }
      }

      return null;
    },
    [state.currentStepId, getStepIndex, canAdvanceToStep, steps],
  );

  const getPreviousStepId = useCallback(() => {
    if (!state.currentStepId) return null;

    const currentIndex = getStepIndex(state.currentStepId);
    if (currentIndex <= 0) return null;

    const prevStep = steps[currentIndex - 1];
    return prevStep ? prevStep.id : null;
  }, [state.currentStepId, getStepIndex, steps]);

  // Event system (simplified)
  const emitEvent = useCallback(
    (type: string, data?: Record<string, any>) => {
      const event: OnboardingEvent = {
        type,
        stepId: state.currentStepId || "",
        data,
        timestamp: Date.now(),
      };

      dispatch({ type: "ADD_EVENT", payload: event });
    },
    [state.currentStepId],
  );

  // Navigation actions
  const goToStep = useCallback(
    async (stepId: string, assumeCompleted?: string) => {
      const step = steps.find((s) => s.id === stepId);
      if (!step) {
        console.error(`Step ${stepId} not found`);
        return;
      }

      if (!canAdvanceToStep(stepId, assumeCompleted)) {
        console.error(
          `Cannot advance to step ${stepId} - dependencies not met`,
        );
        return;
      }

      await navigate({ to: step.route });
      dispatch({ type: "SET_CURRENT_STEP", payload: stepId });
      emitEvent("step_changed", { from: state.currentStepId, to: stepId });
    },
    [steps, canAdvanceToStep, navigate, state.currentStepId, emitEvent],
  );

  const nextStep = useCallback(
    async (assumeCompleted?: string) => {
      const nextStepId = getNextStepId(assumeCompleted);

      if (nextStepId) {
        await goToStep(nextStepId, assumeCompleted);
      } else {
        // No more steps - complete onboarding
        await completeOnboarding();
      }
    },
    [getNextStepId, goToStep],
  );

  const previousStep = useCallback(async () => {
    const prevStepId = getPreviousStepId();
    if (prevStepId) {
      await goToStep(prevStepId);
    }
  }, [getPreviousStepId, goToStep]);

  const skipOnboarding = useCallback(async () => {
    await updateOnboardingCompleted(true);
    emitEvent("onboarding_skipped");
    await navigate({ to: "/" });
  }, [updateOnboardingCompleted, emitEvent, navigate]);

  const completeOnboarding = useCallback(async () => {
    await updateOnboardingCompleted(true);
    emitEvent("onboarding_completed");

    mascotChat.celebrate(
      "🎉 Congratulations! You've completed the onboarding! Welcome to VoiceGecko!",
    );

    setTimeout(async () => {
      await navigate({ to: "/" });
    }, 2000);
  }, [updateOnboardingCompleted, emitEvent, mascotChat, navigate]);

  // Step management
  const markStepCompleted = useCallback(
    (stepId: string, progress = 100) => {
      dispatch({ type: "MARK_STEP_COMPLETED", payload: { stepId, progress } });
      emitEvent("step_completed", { stepId, progress });

      // Auto-advance if enabled
      const step = steps.find((s) => s.id === stepId);

      if (step?.autoAdvance && stepId === state.currentStepId) {
        setTimeout(() => {
          nextStep(stepId); // Pass the completed stepId as assumeCompleted
        }, 1500);
      }
    },
    [steps, state.currentStepId, emitEvent, nextStep],
  );

  const setStepProgress = useCallback(
    (stepId: string, progress: number) => {
      dispatch({ type: "SET_STEP_PROGRESS", payload: { stepId, progress } });
      emitEvent("step_progress", { stepId, progress });
    },
    [emitEvent],
  );

  const setCanProceed = useCallback((canProceed: boolean) => {
    dispatch({ type: "SET_CAN_PROCEED", payload: canProceed });
  }, []);

  // Mascot integration
  const sendMascotMessage = useCallback(
    (message: Omit<MascotMessage, "id">) => {
      mascotChat.sendMessage(message);
    },
    [mascotChat],
  );

  const triggerMascotAnimation = useCallback(
    (animation: string) => {
      const validAnimations = [
        "idle",
        "listening",
        "thinking",
        "celebrating",
        "welcoming",
        "processing",
        "dancing",
      ];
      if (validAnimations.includes(animation)) {
        mascotChat.setAnimation({
          type: animation as any,
          duration: 3000,
        });
      }
    },
    [mascotChat],
  );

  // Update mascot animation when step changes (simplified)
  const prevStepIdRef = React.useRef<string | null>(null);
  const lastSetAnimationRef = React.useRef<string | null>(null);

  useEffect(() => {
    // If tutorial is completed, show dancing animation only once
    if (
      state.completedSteps.has("tutorial") &&
      lastSetAnimationRef.current !== "dancing-tutorial-complete"
    ) {
      lastSetAnimationRef.current = "dancing-tutorial-complete";
      mascotChat.setAnimation({
        type: "dancing",
        duration: 3000,
      });
      return;
    }

    // Otherwise, use step-based animation
    if (
      currentStep?.mascotAnimation &&
      prevStepIdRef.current !== currentStep.id
    ) {
      prevStepIdRef.current = currentStep.id;
      mascotChat.setAnimation({
        type: currentStep.mascotAnimation,
        duration: 3000,
      });
    }
  }, [
    currentStep?.id,
    currentStep?.mascotAnimation,
    mascotChat,
    state.completedSteps,
  ]);

  // Build context value with stable reference
  const contextValue = React.useMemo<OnboardingContextValue>(
    () => ({
      state,
      steps,
      currentStep,
      goToStep,
      nextStep,
      previousStep,
      skipOnboarding,
      completeOnboarding,
      markStepCompleted,
      setStepProgress,
      setCanProceed,
      emitEvent,
      sendMascotMessage,
      triggerMascotAnimation,
      canAdvanceToStep,
      getStepIndex,
      getNextStepId,
      getPreviousStepId,
    }),
    [
      state,
      steps,
      currentStep,
      goToStep,
      nextStep,
      previousStep,
      skipOnboarding,
      completeOnboarding,
      markStepCompleted,
      setStepProgress,
      setCanProceed,
      emitEvent,
      sendMascotMessage,
      triggerMascotAnimation,
      canAdvanceToStep,
      getStepIndex,
      getNextStepId,
      getPreviousStepId,
    ],
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}
