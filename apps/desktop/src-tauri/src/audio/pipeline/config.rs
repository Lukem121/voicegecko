use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioPipelineConfig {
    pub enable_denoise: bool,
    pub enable_high_pass: bool,
    #[serde(default = "default_enable_trim_silence")]
    pub enable_trim_silence: bool,
    #[serde(default = "default_high_pass_hz")]
    pub high_pass_hz: f32,
    #[serde(default = "default_target_rms")]
    pub target_rms: f32,
}

fn default_enable_trim_silence() -> bool {
    true
}

fn default_high_pass_hz() -> f32 {
    80.0
}

fn default_target_rms() -> f32 {
    0.22
}

impl Default for AudioPipelineConfig {
    fn default() -> Self {
        Self {
            // Parakeet/Moonshine handle noise well — denoise off by default.
            enable_denoise: false,
            enable_high_pass: true,
            enable_trim_silence: true,
            high_pass_hz: 80.0,
            target_rms: 0.22,
        }
    }
}
