use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureFlags {
    pub moonshine_flow: bool,
    pub engine_lab: bool,
    pub gpu_whisper: bool,
    pub local_llm_polish: bool,
    pub require_auth: bool,
}

impl Default for FeatureFlags {
    fn default() -> Self {
        Self {
            moonshine_flow: true,
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

pub fn is_engine_enabled(engine_id: &str) -> bool {
    let flags = get_feature_flags();
    match engine_id {
        "moonshine_medium" => flags.moonshine_flow,
        "insanely_fast_whisper" => flags.gpu_whisper,
        _ => true,
    }
}
