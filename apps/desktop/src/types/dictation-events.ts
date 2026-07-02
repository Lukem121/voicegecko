/** v2 dictation events — must match Rust `dictation/types.rs` exactly */

export type InteractionModeId =
  | 'toggle_batch'
  | 'ptt_batch'
  | 'flow_stream'
  | 'hands_free'
  | 'accuracy_cloud'
  | 'capsule_compose';

export type EngineId =
  | 'moonshine_medium'
  | 'parakeet_tdt_v2'
  | 'gpt4o_transcribe'
  | 'gpt4o_mini_transcribe'
  | 'insanely_fast_whisper';

export type OutputTargetId =
  | 'paste_only'
  | 'box_only'
  | 'box_then_paste'
  | 'box_confirm_paste';

export type DictationEvent =
  | {
      type: 'sessionStarted';
      sessionId: string;
      mode: string;
      engineId: string;
      outputTarget: string;
    }
  | { type: 'recordingStarted'; sessionId: string }
  | {
      type: 'partialTranscript';
      sessionId: string;
      text: string;
      isFinal: boolean;
    }
  | {
      type: 'finalTranscript';
      sessionId: string;
      text: string;
      engineId: string;
      latencyMs: number;
    }
  | { type: 'formattingStarted'; sessionId: string }
  | { type: 'formattedText'; sessionId: string; text: string }
  | {
      type: 'injectionStarted';
      sessionId: string;
      target: string;
    }
  | { type: 'injectionComplete'; sessionId: string; pasted: boolean }
  | { type: 'sessionComplete'; sessionId: string; text: string }
  | {
      type: 'sessionError';
      sessionId: string;
      message: string;
      recoverable: boolean;
    }
  | { type: 'phaseChanged'; sessionId: string; phase: string };

export const DICTATION_EVENT_CHANNEL = 'dictation-event';

export type StartSessionRequest = {
  mode: InteractionModeId;
  engineId?: EngineId;
  outputTarget?: OutputTargetId;
  showLivePreview?: boolean;
};

export type SessionStatus = {
  sessionId: string;
  phase: string;
  mode: string;
  engineId: string;
  isRecording: boolean;
};
