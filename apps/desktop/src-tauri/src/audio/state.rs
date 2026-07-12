use parking_lot::Mutex;
use rodio::Sink;
use std::sync::Arc;

use crate::audio::capture::{CaptureHandle, MonitorHandle};
use crate::audio::hub::StreamingAudioHub;
use crate::audio::pipeline::AudioPipelineConfig;
use crate::audio::types::PcmBuffer;

pub struct AudioState {
    pub sink: Arc<std::sync::Mutex<Option<Sink>>>,
    pub streaming_hub: Arc<StreamingAudioHub>,
    capture: Mutex<Option<CaptureHandle>>,
    monitor: Mutex<Option<MonitorHandle>>,
    last_pcm: Mutex<Option<PcmBuffer>>,
    pipeline_config: Mutex<AudioPipelineConfig>,
}

impl AudioState {
    pub fn new(sink: Option<Sink>, streaming_hub: Arc<StreamingAudioHub>) -> Self {
        Self {
            sink: Arc::new(std::sync::Mutex::new(sink)),
            streaming_hub,
            capture: Mutex::new(None),
            monitor: Mutex::new(None),
            last_pcm: Mutex::new(None),
            pipeline_config: Mutex::new(AudioPipelineConfig::default()),
        }
    }

    pub fn take_last_pcm(&self) -> Option<PcmBuffer> {
        self.last_pcm.lock().take()
    }

    pub fn store_pcm(&self, pcm: PcmBuffer) {
        *self.last_pcm.lock() = Some(pcm);
    }

    pub fn set_pipeline_config(&self, config: AudioPipelineConfig) {
        *self.pipeline_config.lock() = config;
    }

    pub fn pipeline_config(&self) -> AudioPipelineConfig {
        self.pipeline_config.lock().clone()
    }

    pub fn start_capture(&self, handle: CaptureHandle) -> Result<(), String> {
        let mut guard = self.capture.lock();
        if guard.is_some() {
            return Err("Recording already in progress".to_string());
        }
        *guard = Some(handle);
        Ok(())
    }

    pub fn stop_capture(&self) -> Result<Vec<f32>, String> {
        let handle = self
            .capture
            .lock()
            .take()
            .ok_or_else(|| "No recording in progress".to_string())?;
        handle.stop()
    }

    pub fn start_monitor(&self, handle: MonitorHandle) -> Result<(), String> {
        let mut guard = self.monitor.lock();
        if guard.is_some() {
            return Err("Microphone test already in progress".to_string());
        }
        *guard = Some(handle);
        Ok(())
    }

    pub fn stop_monitor(&self) -> Result<(), String> {
        let handle = self
            .monitor
            .lock()
            .take()
            .ok_or_else(|| "No microphone test in progress".to_string())?;
        handle.stop()
    }

    pub fn cancel_capture(&self) {
        if let Some(handle) = self.capture.lock().take() {
            let _ = handle.stop();
        }
        self.last_pcm.lock().take();
    }
}
