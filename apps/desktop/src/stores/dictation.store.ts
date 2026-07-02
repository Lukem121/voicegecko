import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  DictationEvent,
  EngineId,
  InteractionModeId,
  SessionStatus,
  StartSessionRequest,
} from '~/types/dictation-events';
import { DICTATION_EVENT_CHANNEL } from '~/types/dictation-events';

type DictationStoreState = {
  session: SessionStatus | null;
  partialText: string;
  finalText: string;
  formattedText: string;
  phase: string;
  error: string | null;
  lastEngineId: string | null;
  lastLatencyMs: number | null;
  outputTarget: string | null;
  confirmText: string | null;

  startSession: (request: StartSessionRequest) => Promise<SessionStatus>;
  cancelSession: () => Promise<void>;
  handleEvent: (event: DictationEvent) => void;
  clearConfirmText: () => void;
  confirmPaste: (text: string) => Promise<void>;
  reset: () => void;
};

export const useDictationStore = create<DictationStoreState>()(
  devtools(
    (set, get) => ({
      session: null,
      partialText: '',
      finalText: '',
      formattedText: '',
      phase: 'idle',
      error: null,
      lastEngineId: null,
      lastLatencyMs: null,
      outputTarget: null,
      confirmText: null,

      startSession: async (request) => {
        const status = await invoke<SessionStatus>('start_dictation_session', {
          request,
        });
        set({
          session: status,
          phase: status.phase,
          partialText: '',
          finalText: '',
          formattedText: '',
          error: null,
          lastEngineId: status.engineId,
        });
        return status;
      },

      cancelSession: async () => {
        await invoke('cancel_dictation_session');
        get().reset();
      },

      handleEvent: (event) => {
        switch (event.type) {
          case 'sessionStarted':
            set({
              phase: 'recording',
              lastEngineId: event.engineId,
              outputTarget: event.outputTarget,
              confirmText: null,
            });
            break;
          case 'partialTranscript':
            set({ partialText: event.text, phase: 'transcribing' });
            break;
          case 'finalTranscript':
            set({
              finalText: event.text,
              lastEngineId: event.engineId,
              lastLatencyMs: event.latencyMs,
              phase: 'transcribing',
            });
            break;
          case 'formattedText':
            set({ formattedText: event.text, phase: 'formatting' });
            break;
          case 'sessionComplete': {
            const needsConfirm = get().outputTarget === 'box_confirm_paste';
            set({
              finalText: event.text,
              formattedText: event.text,
              phase: needsConfirm ? 'confirm' : 'done',
              confirmText: needsConfirm ? event.text : null,
              session: needsConfirm ? get().session : null,
            });
            if (!needsConfirm) {
              set({ session: null, outputTarget: null });
            }
            break;
          }
          case 'sessionError':
            set({ error: event.message, phase: 'error', session: null });
            break;
          case 'phaseChanged':
            set({ phase: event.phase });
            break;
          default:
            break;
        }
      },

      clearConfirmText: () => {
        set({ confirmText: null, phase: 'idle', outputTarget: null, session: null });
      },

      confirmPaste: async (text: string) => {
        const session = get().session;
        if (!session) {
          return;
        }
        await invoke('confirm_dictation_paste', {
          sessionId: session.sessionId,
          text,
        });
        set({ confirmText: null, phase: 'done', session: null, outputTarget: null });
      },

      reset: () => {
        set({
          session: null,
          partialText: '',
          finalText: '',
          formattedText: '',
          phase: 'idle',
          error: null,
          outputTarget: null,
          confirmText: null,
        });
      },
    }),
    { name: 'dictation-store' }
  )
);

let dictationListenerInitialized = false;

export async function initializeDictationEvents(): Promise<void> {
  if (dictationListenerInitialized) {
    return;
  }
  dictationListenerInitialized = true;

  await listen<DictationEvent>(DICTATION_EVENT_CHANNEL, (event) => {
    useDictationStore.getState().handleEvent(event.payload);
  });
}

export async function listEngines(): Promise<
  Array<[string, string, boolean]>
> {
  return invoke('list_dictation_engines');
}

export function modeForShortcutId(shortcutId: string): InteractionModeId {
  switch (shortcutId) {
    case 'toggle-recording':
      return 'toggle_batch';
    case 'push-to-talk':
      return 'ptt_batch';
    case 'flow-stream':
      return 'flow_stream';
    case 'hands-free':
      return 'hands_free';
    case 'accuracy-cloud':
      return 'accuracy_cloud';
    case 'capsule-compose':
      return 'capsule_compose';
    default:
      return 'toggle_batch';
  }
}

export type { EngineId, InteractionModeId };
