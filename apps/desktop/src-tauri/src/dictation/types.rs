use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InteractionMode {
    ToggleBatch,
    PttBatch,
}

impl InteractionMode {
    pub fn from_str_id(s: &str) -> Option<Self> {
        match s {
            "toggle_batch" => Some(Self::ToggleBatch),
            "ptt_batch" => Some(Self::PttBatch),
            // Removed modes and legacy cloud ids map to toggle
            "flow_stream" | "hands_free" | "capsule_compose" | "accuracy_cloud" => {
                Some(Self::ToggleBatch)
            }
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ToggleBatch => "toggle_batch",
            Self::PttBatch => "ptt_batch",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EngineId {
    InsanelyFastWhisper,
}

impl EngineId {
    pub fn from_str_id(s: &str) -> Option<Self> {
        match s {
            "insanely_fast_whisper"
            | "parakeet_tdt_v2"
            | "moonshine_medium"
            | "gpt4o_transcribe"
            | "gpt4o_mini_transcribe" => Some(Self::InsanelyFastWhisper),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        "insanely_fast_whisper"
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OutputTarget {
    PasteOnly,
    BoxOnly,
    BoxThenPaste,
    BoxConfirmPaste,
    ScoreOnly,
}

impl OutputTarget {
    pub fn from_str_id(s: &str) -> Option<Self> {
        match s {
            "paste_only" => Some(Self::PasteOnly),
            "box_only" => Some(Self::BoxOnly),
            "box_then_paste" => Some(Self::BoxThenPaste),
            "box_confirm_paste" => Some(Self::BoxConfirmPaste),
            "score_only" => Some(Self::ScoreOnly),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::PasteOnly => "paste_only",
            Self::BoxOnly => "box_only",
            Self::BoxThenPaste => "box_then_paste",
            Self::BoxConfirmPaste => "box_confirm_paste",
            Self::ScoreOnly => "score_only",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionPhase {
    Idle,
    Recording,
    Transcribing,
    Formatting,
    Injecting,
    Done,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum DictationEvent {
    SessionStarted {
        session_id: String,
        mode: String,
        engine_id: String,
        output_target: String,
    },
    RecordingStarted {
        session_id: String,
    },
    PartialTranscript {
        session_id: String,
        text: String,
        is_final: bool,
    },
    FinalTranscript {
        session_id: String,
        text: String,
        engine_id: String,
        latency_ms: u64,
    },
    FormattingStarted {
        session_id: String,
    },
    FormattedText {
        session_id: String,
        text: String,
    },
    InjectionStarted {
        session_id: String,
        target: String,
    },
    InjectionComplete {
        session_id: String,
        pasted: bool,
    },
    SessionComplete {
        session_id: String,
        text: String,
    },
    SessionError {
        session_id: String,
        message: String,
        recoverable: bool,
    },
    PhaseChanged {
        session_id: String,
        phase: String,
    },
}

impl DictationEvent {
    pub fn event_name() -> &'static str {
        "dictation-event"
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionRequest {
    pub mode: String,
    pub engine_id: Option<String>,
    pub output_target: Option<String>,
    pub show_live_preview: Option<bool>,
    pub audio_pipeline: Option<crate::audio::pipeline::AudioPipelineConfig>,
    pub dev_context: Option<String>,
    #[serde(default)]
    pub force_developer_profile: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionStatus {
    pub session_id: String,
    pub phase: String,
    pub mode: String,
    pub engine_id: String,
    pub is_recording: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperModelCompareResult {
    pub model_id: String,
    pub model_name: String,
    pub text: String,
    pub text_snippet: String,
    pub latency_ms: u64,
    pub available: bool,
    pub selected: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperAccuracyProgress {
    pub index: usize,
    pub total: usize,
    pub model_id: String,
    pub model_name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperModelCompareResponse {
    pub sample_id: String,
    pub sample_label: String,
    pub results: Vec<WhisperModelCompareResult>,
}
