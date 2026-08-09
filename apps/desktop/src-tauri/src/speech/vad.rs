//! VAD for hands-free segmentation. Loads Silero ONNX from the v2 models directory
//! when present; otherwise falls back to tuned energy RMS.

use ort::session::Session;
use ort::value::Tensor;
use parking_lot::Mutex;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

const CHUNK_SAMPLES: usize = 512;
const STATE_DIM: usize = 2 * 1 * 128;
const CONTEXT_SAMPLES_16K: usize = 64;

pub fn v2_models_dir() -> Option<PathBuf> {
    dirs::data_local_dir().map(|d| d.join("voicegecko").join("models"))
}

pub fn silero_vad_model_path() -> Option<PathBuf> {
    v2_models_dir().map(|d| d.join("silero_vad.onnx"))
}

fn resolve_silero_path() -> Option<PathBuf> {
    if let Some(path) = silero_vad_model_path() {
        if path.exists() {
            return Some(path);
        }
    }
    None
}

struct OnnxVad {
    session: Mutex<Session>,
    state: Mutex<Vec<f32>>,
    context: Mutex<Vec<f32>>,
    sample_rate: i64,
    threshold: f32,
}

impl OnnxVad {
    fn from_path(path: &Path, threshold: f32) -> Result<Self, String> {
        let session = Session::builder()
            .map_err(|e| e.to_string())?
            .commit_from_file(path)
            .map_err(|e| format!("Failed to load Silero VAD: {e}"))?;

        Ok(Self {
            session: Mutex::new(session),
            state: Mutex::new(vec![0.0; STATE_DIM]),
            context: Mutex::new(vec![0.0; CONTEXT_SAMPLES_16K]),
            sample_rate: 16_000,
            threshold,
        })
    }

    fn infer_probability(&self, audio_frame: &[f32]) -> Result<f32, String> {
        let mut frame = audio_frame.to_vec();
        if frame.len() < CHUNK_SAMPLES {
            frame.resize(CHUNK_SAMPLES, 0.0);
        } else if frame.len() > CHUNK_SAMPLES {
            frame.truncate(CHUNK_SAMPLES);
        }

        let mut input_with_context = {
            let context = self.context.lock();
            let mut combined = Vec::with_capacity(context.len() + frame.len());
            combined.extend_from_slice(&context);
            combined.extend_from_slice(&frame);
            combined
        };

        let input_len = input_with_context.len() as i64;
        let input_data = std::mem::take(&mut input_with_context);
        let state_data = self.state.lock().clone();

        let mut session = self.session.lock();
        let outputs = session
            .run(ort::inputs![
                "input" => Tensor::from_array(([1_i64, input_len], input_data))
                    .map_err(|e| e.to_string())?,
                "state" => Tensor::from_array(([2_i64, 1_i64, 128_i64], state_data))
                    .map_err(|e| e.to_string())?,
                "sr" => Tensor::from_array(([1_i64], vec![self.sample_rate]))
                    .map_err(|e| e.to_string())?,
            ])
            .map_err(|e| e.to_string())?;

        let (_, state_data) = outputs["stateN"]
            .try_extract_tensor::<f32>()
            .map_err(|e| e.to_string())?;
        *self.state.lock() = state_data.to_vec();

        {
            let mut context = self.context.lock();
            if frame.len() >= CONTEXT_SAMPLES_16K {
                context.copy_from_slice(&frame[frame.len() - CONTEXT_SAMPLES_16K..]);
            } else {
                context.fill(0.0);
                let offset = CONTEXT_SAMPLES_16K - frame.len();
                context[offset..].copy_from_slice(&frame);
            }
        }

        let (_, prob_data) = outputs["output"]
            .try_extract_tensor::<f32>()
            .map_err(|e| e.to_string())?;

        Ok(prob_data.first().copied().unwrap_or(0.0))
    }

    fn is_speech(&self, samples: &[f32]) -> bool {
        if samples.is_empty() {
            return false;
        }

        let tail_start = samples.len().saturating_sub(CHUNK_SAMPLES);
        let chunk = &samples[tail_start..];
        self.infer_probability(chunk)
            .map(|p| p >= self.threshold)
            .unwrap_or(false)
    }
}

pub const POST_ROLL_MS: u64 = 400;

pub struct SileroVad {
    threshold: f32,
    energy_threshold: f32,
    min_speech_duration_ms: u32,
    min_silence_ms: u32,
    pre_roll_ms: u32,
    post_roll_ms: u32,
    onnx: Option<OnnxVad>,
}

static SHARED_VAD: OnceLock<SileroVad> = OnceLock::new();

impl SileroVad {
    pub fn new(threshold: f32) -> Self {
        Self {
            threshold,
            energy_threshold: 0.015,
            min_speech_duration_ms: 250,
            min_silence_ms: 400,
            pre_roll_ms: 200,
            post_roll_ms: POST_ROLL_MS as u32,
            onnx: None,
        }
    }

    pub fn try_load() -> Self {
        if let Some(path) = resolve_silero_path() {
            if let Ok(onnx) = OnnxVad::from_path(&path, 0.5) {
                return Self {
                    threshold: 0.5,
                    energy_threshold: 0.015,
                    min_speech_duration_ms: 250,
                    min_silence_ms: 400,
                    pre_roll_ms: 200,
                    post_roll_ms: POST_ROLL_MS as u32,
                    onnx: Some(onnx),
                };
            }
        }
        Self::default()
    }

    pub fn shared() -> &'static SileroVad {
        SHARED_VAD.get_or_init(SileroVad::try_load)
    }

    pub fn uses_onnx(&self) -> bool {
        self.onnx.is_some()
    }

    pub fn is_speech(&self, samples: &[f32], _sample_rate: u32) -> bool {
        if samples.is_empty() {
            return false;
        }

        if let Some(onnx) = &self.onnx {
            return onnx.is_speech(samples);
        }

        let rms = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
        rms >= self.energy_threshold
    }

    pub fn segment_end(&self, silence_duration_ms: u32) -> bool {
        silence_duration_ms >= self.min_silence_ms
    }

    pub fn pre_roll_samples(&self, sample_rate: u32) -> usize {
        (sample_rate as u64 * self.pre_roll_ms as u64 / 1000) as usize
    }

    pub fn post_roll_samples(&self, sample_rate: u32) -> usize {
        (sample_rate as u64 * self.post_roll_ms as u64 / 1000) as usize
    }

    #[cfg(test)]
    pub fn post_roll_ms_value(&self) -> u32 {
        self.post_roll_ms
    }

    #[allow(dead_code)]
    pub fn min_speech_samples(&self, sample_rate: u32) -> usize {
        (sample_rate as u64 * self.min_speech_duration_ms as u64 / 1000) as usize
    }
}

impl Default for SileroVad {
    fn default() -> Self {
        Self::new(0.015)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn post_roll_samples_at_16k() {
        let vad = SileroVad::new(0.015);
        assert_eq!(vad.post_roll_samples(16_000), 6_400); // 400ms @ 16kHz
    }
}
