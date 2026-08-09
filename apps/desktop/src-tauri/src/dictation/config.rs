use crate::dictation::types::{EngineId, InteractionMode, OutputTarget};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModeConfig {
    pub mode: InteractionMode,
    pub default_engine: EngineId,
    pub output_target: OutputTarget,
    pub show_live_preview: bool,
}

impl ModeConfig {
    pub fn for_mode(mode: InteractionMode) -> Self {
        match mode {
            InteractionMode::ToggleBatch => Self {
                mode,
                default_engine: EngineId::ParakeetTdtV2,
                output_target: OutputTarget::PasteOnly,
                show_live_preview: true,
            },
            InteractionMode::PttBatch => Self {
                mode,
                default_engine: EngineId::ParakeetTdtV2,
                output_target: OutputTarget::PasteOnly,
                show_live_preview: true,
            },
            InteractionMode::FlowStream => Self {
                mode,
                default_engine: EngineId::MoonshineMedium,
                output_target: OutputTarget::BoxThenPaste,
                show_live_preview: true,
            },
            InteractionMode::HandsFree => Self {
                mode,
                default_engine: EngineId::MoonshineMedium,
                output_target: OutputTarget::BoxThenPaste,
                show_live_preview: false,
            },
            InteractionMode::CapsuleCompose => Self {
                mode,
                default_engine: EngineId::ParakeetTdtV2,
                output_target: OutputTarget::BoxConfirmPaste,
                show_live_preview: true,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DictationSettingsV3 {
    pub version: u32,
    pub mode_configs: Vec<ModeConfig>,
    pub default_dictionary: Vec<String>,
    pub intent_enabled: bool,
    pub llm_server_url: Option<String>,
}

impl Default for DictationSettingsV3 {
    fn default() -> Self {
        Self {
            version: 3,
            mode_configs: vec![
                ModeConfig::for_mode(InteractionMode::ToggleBatch),
                ModeConfig::for_mode(InteractionMode::PttBatch),
                ModeConfig::for_mode(InteractionMode::FlowStream),
                ModeConfig::for_mode(InteractionMode::HandsFree),
                ModeConfig::for_mode(InteractionMode::CapsuleCompose),
            ],
            default_dictionary: vec![],
            intent_enabled: false,
            llm_server_url: Some("http://127.0.0.1:8080".to_string()),
        }
    }
}
