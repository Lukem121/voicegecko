use serde::{Deserialize, Serialize};

pub const TARGET_SAMPLE_RATE: u32 = 16_000;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AudioDevice {
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum SoundVariant {
    Start,
    End,
}

/// Internal PCM buffer passed between capture and dictation (stays in Rust).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PcmBuffer {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub channels: u16,
}

impl PcmBuffer {
    pub fn mono_16k(samples: Vec<f32>) -> Self {
        Self {
            samples,
            sample_rate: TARGET_SAMPLE_RATE,
            channels: 1,
        }
    }

    pub fn duration_secs(&self) -> f32 {
        if self.sample_rate == 0 {
            return 0.0;
        }
        self.samples.len() as f32 / self.sample_rate as f32
    }
}

/// Metadata returned to the frontend on stop — no raw PCM.
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AudioStopMetadata {
    pub duration_secs: f32,
    pub sample_rate: u32,
    pub sample_count: usize,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AudioLevel {
    pub level: f32,
    pub peak: f32,
    pub frequency_bands: Vec<f32>,
    pub dominant_frequency: f32,
    pub spectral_centroid: f32,
    pub spectral_rolloff: f32,
    pub zero_crossing_rate: f32,
    pub is_voice_detected: bool,
    pub is_silence: bool,
}

impl AudioLevel {
    pub fn silent() -> Self {
        Self {
            level: 0.0,
            peak: 0.0,
            frequency_bands: vec![0.0; 10],
            dominant_frequency: 0.0,
            spectral_centroid: 0.0,
            spectral_rolloff: 0.0,
            zero_crossing_rate: 0.0,
            is_voice_detected: false,
            is_silence: true,
        }
    }
}

/// Legacy alias kept for dictation session APIs during migration.
pub type AudioData = PcmBuffer;
