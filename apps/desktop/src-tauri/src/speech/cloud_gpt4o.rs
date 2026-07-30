use crate::dictation::types::EngineId;
use crate::speech::engine::{DictationEngine, EngineCapabilities, TranscriptionResult};
use crate::speech::stt_log;
use async_trait::async_trait;
use std::time::Instant;

const ENGINE: &str = "cloud_gpt4o";

pub struct Gpt4oEngine {
    mini: bool,
}

impl Gpt4oEngine {
    pub fn new(mini: bool) -> Self {
        Self { mini }
    }

    fn model_name(&self) -> &'static str {
        if self.mini {
            "gpt-4o-mini-transcribe"
        } else {
            "gpt-4o-transcribe"
        }
    }

    fn engine_label(&self) -> &'static str {
        if self.mini {
            "gpt4o_mini"
        } else {
            "gpt4o"
        }
    }
}

#[async_trait]
impl DictationEngine for Gpt4oEngine {
    fn id(&self) -> EngineId {
        if self.mini {
            EngineId::Gpt4oMiniTranscribe
        } else {
            EngineId::Gpt4oTranscribe
        }
    }

    fn display_name(&self) -> &str {
        if self.mini {
            "GPT-4o Mini Transcribe"
        } else {
            "GPT-4o Transcribe"
        }
    }

    fn capabilities(&self) -> EngineCapabilities {
        EngineCapabilities {
            supports_streaming: false,
            requires_network: true,
            requires_gpu: false,
        }
    }

    fn is_available(&self) -> bool {
        std::env::var("OPENAI_API_KEY")
            .map(|key| !key.trim().is_empty())
            .unwrap_or(false)
    }

    async fn transcribe_batch(
        &self,
        _app: &tauri::AppHandle,
        samples: &[f32],
        sample_rate: u32,
    ) -> Result<TranscriptionResult, String> {
        let api_key = std::env::var("OPENAI_API_KEY")
            .map_err(|_| "Cloud transcription is not configured".to_string())?;

        if api_key.trim().is_empty() {
            return Err("Cloud API key is empty".into());
        }

        let label = self.engine_label();
        let start = Instant::now();
        stt_log::info_fmt(
            ENGINE,
            format!(
                "[{label}] Starting batch transcription ({} samples @ {} Hz, model={})",
                samples.len(),
                sample_rate,
                self.model_name()
            ),
        );

        let text = transcribe_openai(
            samples,
            sample_rate,
            self.model_name(),
            &api_key,
            label,
            super::transcription_hint::get_session_hint(_app).as_deref(),
        )
            .await
            .map_err(|e| {
                stt_log::error_fmt(ENGINE, format!("[{label}] {e}"));
                e
            })?;

        let latency_ms = start.elapsed().as_millis() as u64;
        stt_log::info_fmt(
            ENGINE,
            format!("[{label}] Complete in {latency_ms} ms ({} chars)", text.len()),
        );

        Ok(TranscriptionResult {
            text,
            latency_ms,
            is_partial: false,
        })
    }
}

async fn transcribe_openai(
    samples: &[f32],
    sample_rate: u32,
    model: &str,
    api_key: &str,
    label: &str,
    prompt: Option<&str>,
) -> Result<String, String> {
    let wav_bytes = samples_to_wav_bytes(samples, sample_rate)?;
    stt_log::debug(
        ENGINE,
        &format!("[{label}] WAV payload size: {} bytes", wav_bytes.len()),
    );

    let client = reqwest::Client::new();
    let mut form = reqwest::multipart::Form::new()
        .text("model", model.to_string())
        .part(
            "file",
            reqwest::multipart::Part::bytes(wav_bytes)
                .file_name("audio.wav")
                .mime_str("audio/wav")
                .map_err(|e| e.to_string())?,
        );

    if let Some(hint) = prompt.filter(|p| !p.trim().is_empty()) {
        form = form.text("prompt", hint.to_string());
        stt_log::debug(
            ENGINE,
            &format!("[{label}] STT prompt: {} chars", hint.len()),
        );
    }

    let response = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .bearer_auth(api_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("[{label}] Network error: {e}"))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("[{label}] Failed to read response: {e}"))?;

    if !status.is_success() {
        return Err(format!("[{label}] OpenAI API HTTP {status}: {body}"));
    }

    let json: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| format!("[{label}] Invalid JSON: {e}"))?;

    json.get("text")
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("[{label}] Missing text field in response: {body}"))
}

fn samples_to_wav_bytes(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>, String> {
    let mut cursor = std::io::Cursor::new(Vec::new());
    {
        let spec = hound::WavSpec {
            channels: 1,
            sample_rate,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };
        let mut writer = hound::WavWriter::new(&mut cursor, spec).map_err(|e| e.to_string())?;
        for &s in samples {
            let v = (s.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
            writer.write_sample(v).map_err(|e| e.to_string())?;
        }
        writer.finalize().map_err(|e| e.to_string())?;
    }
    Ok(cursor.into_inner())
}
