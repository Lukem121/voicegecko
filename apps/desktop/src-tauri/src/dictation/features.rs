use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureFlags {
    #[serde(default)]
    pub moonshine_flow: bool,
    #[serde(default)]
    pub engine_lab: bool,
    #[serde(default = "default_true")]
    pub gpu_whisper: bool,
    #[serde(default)]
    pub local_llm_polish: bool,
    #[serde(default)]
    pub require_auth: bool,
}

fn default_true() -> bool {
    true
}

impl Default for FeatureFlags {
    fn default() -> Self {
        Self {
            moonshine_flow: false,
            engine_lab: true,
            gpu_whisper: true,
            local_llm_polish: false,
            require_auth: false,
        }
    }
}

static FLAGS: OnceLock<RwLock<FeatureFlags>> = OnceLock::new();

fn flags_store() -> &'static RwLock<FeatureFlags> {
    FLAGS.get_or_init(|| RwLock::new(FeatureFlags::default()))
}

pub fn get_feature_flags() -> FeatureFlags {
    flags_store().read().clone()
}

pub fn set_feature_flags(flags: FeatureFlags) {
    *flags_store().write() = flags;
}

pub fn is_engine_enabled(_engine_id: &str) -> bool {
    true
}
