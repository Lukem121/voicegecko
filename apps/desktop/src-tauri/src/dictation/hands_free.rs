use crate::audio_v2::StreamingAudioHub;
use crate::dictation::session::DictationSessionManager;
use crate::speech::vad::SileroVad;
use parking_lot::Mutex;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::AppHandle;

const POLL_MS: u64 = 200;
const ANALYSIS_WINDOW: usize = 4_800; // 300ms @ 16kHz
const MIN_SEGMENT_SAMPLES: usize = 8_000; // 0.5s

pub struct HandsFreeController {
    loop_running: Mutex<Option<Arc<AtomicBool>>>,
    segment_start: Arc<AtomicUsize>,
    hub: Mutex<Option<Arc<StreamingAudioHub>>>,
}

fn extract_segment(vad: &SileroVad, snapshot: &[f32], start: usize) -> Vec<f32> {
    let pre = vad.pre_roll_samples(16_000);
    let padded_start = start.saturating_sub(pre);
    snapshot[padded_start..].to_vec()
}

impl HandsFreeController {
    pub fn new() -> Self {
        Self {
            loop_running: Mutex::new(None),
            segment_start: Arc::new(AtomicUsize::new(0)),
            hub: Mutex::new(None),
        }
    }

    pub fn start(
        &self,
        app: AppHandle,
        hub: Arc<StreamingAudioHub>,
        manager: Arc<DictationSessionManager>,
    ) {
        if self.loop_running.lock().is_some() {
            return;
        }

        let loop_flag = Arc::new(AtomicBool::new(true));
        *self.loop_running.lock() = Some(loop_flag.clone());
        *self.hub.lock() = Some(hub.clone());
        self.segment_start.store(0, Ordering::SeqCst);

        let segment_start = self.segment_start.clone();

        tauri::async_runtime::spawn(async move {
            let vad = SileroVad::shared();
            let in_speech = AtomicBool::new(false);
            let silence_started: Mutex<Option<Instant>> = Mutex::new(None);

            while hub.is_enabled() && loop_flag.load(Ordering::SeqCst) {
                tokio::time::sleep(Duration::from_millis(POLL_MS)).await;

                let snapshot = hub.snapshot();
                if snapshot.len() < ANALYSIS_WINDOW {
                    continue;
                }

                let window = &snapshot[snapshot.len().saturating_sub(ANALYSIS_WINDOW)..];
                let speech = vad.is_speech(window, 16_000);

                if speech {
                    in_speech.store(true, Ordering::SeqCst);
                    *silence_started.lock() = None;
                    continue;
                }

                if !in_speech.load(Ordering::SeqCst) {
                    continue;
                }

                let mut silence_guard = silence_started.lock();
                if silence_guard.is_none() {
                    *silence_guard = Some(Instant::now());
                    continue;
                }

                let silence_ms = silence_guard.unwrap().elapsed().as_millis() as u32;
                if !vad.segment_end(silence_ms) {
                    continue;
                }

                drop(silence_guard);
                in_speech.store(false, Ordering::SeqCst);

                let start = segment_start.load(Ordering::SeqCst);
                if snapshot.len() <= start {
                    segment_start.store(snapshot.len(), Ordering::SeqCst);
                    continue;
                }

                let segment = extract_segment(&vad, &snapshot, start);
                if segment.len() < MIN_SEGMENT_SAMPLES {
                    segment_start.store(snapshot.len(), Ordering::SeqCst);
                    continue;
                }

                segment_start.store(snapshot.len(), Ordering::SeqCst);

                let app_clone = app.clone();
                let manager_clone = manager.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = manager_clone.transcribe_segment(app_clone, segment).await;
                });
            }
        });
    }

    pub fn stop(&self) -> Option<Vec<f32>> {
        if let Some(flag) = self.loop_running.lock().take() {
            flag.store(false, Ordering::SeqCst);
        }

        let hub = self.hub.lock().take()?;
        let start = self.segment_start.load(Ordering::SeqCst);
        let snapshot = hub.snapshot();

        if snapshot.len() > start && snapshot.len() - start >= MIN_SEGMENT_SAMPLES {
            Some(extract_segment(SileroVad::shared(), &snapshot, start))
        } else {
            None
        }
    }
}

impl Default for HandsFreeController {
    fn default() -> Self {
        Self::new()
    }
}
