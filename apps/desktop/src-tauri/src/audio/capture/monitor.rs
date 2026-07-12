use cpal::traits::{DeviceTrait, StreamTrait};
use crossbeam_channel::{unbounded, Receiver, Sender};
use sentry::Level;
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

use crate::audio::capture::stream::build_meter_stream;
use crate::audio::devices::resolve_input_device;
use crate::audio::meter::compute_levels_from_native;

enum MonitorCommand {
    Stop,
}

pub struct MonitorHandle {
    thread: JoinHandle<()>,
    stop_tx: Sender<MonitorCommand>,
}

impl MonitorHandle {
    pub fn start(app: AppHandle, device: Option<String>) -> Result<Self, String> {
        let (stop_tx, stop_rx) = unbounded();

        let thread = thread::spawn(move || run_monitor(app, device, stop_rx));

        Ok(Self { thread, stop_tx })
    }

    pub fn stop(self) -> Result<(), String> {
        self.stop_tx
            .send(MonitorCommand::Stop)
            .map_err(|e| format!("Failed to signal mic test stop: {e}"))?;
        self.thread
            .join()
            .map_err(|_| "Mic test thread panicked".to_string())
    }
}

fn run_monitor(app: AppHandle, device: Option<String>, stop_rx: Receiver<MonitorCommand>) {
    let input_device = match resolve_input_device(device.as_deref()) {
        Ok(d) => d,
        Err(err_msg) => {
            let _ = app.emit("microphone-test-error", err_msg.clone());
            sentry::capture_message(
                &format!("audio:mic_test: device acquisition failed: {err_msg}"),
                Level::Error,
            );
            return;
        }
    };

    let config = match input_device.default_input_config() {
        Ok(cfg) => cfg,
        Err(e) => {
            let msg = format!("Failed to get default input config: {e}");
            let _ = app.emit("microphone-test-error", msg.clone());
            return;
        }
    };

    let stream_config: cpal::StreamConfig = config.clone().into();
    let last_level_emit = Arc::new(Mutex::new(Instant::now()));
    let app_err = app.clone();

    let err_fn = move |err: cpal::StreamError| {
        let _ = app_err.emit("microphone-test-error", err.to_string());
        sentry::capture_message(
            &format!("audio:mic_test: stream error: {err}"),
            Level::Error,
        );
    };

    macro_rules! start_monitor {
        ($t:ty) => {{
            let app_cb = app.clone();
            let last_emit_cb = last_level_emit.clone();

            let stream = match build_meter_stream::<$t>(
                &input_device,
                &stream_config,
                move |data: &[$t]| {
                    let now = Instant::now();
                    let mut last_emit = last_emit_cb.lock().unwrap();
                    if now.duration_since(*last_emit) >= Duration::from_millis(33) {
                        let level = compute_levels_from_native(data);
                        let _ = app_cb.emit("microphone-test-level", level);
                        *last_emit = now;
                    }
                },
                err_fn,
            ) {
                Ok(s) => s,
                Err(e) => {
                    let msg = format!("Failed to build mic test stream: {e}");
                    let _ = app.emit("microphone-test-error", msg);
                    return;
                }
            };

            if let Err(e) = stream.play() {
                let _ = app.emit("microphone-test-error", e.to_string());
                return;
            }

            match stop_rx.recv() {
                Ok(MonitorCommand::Stop) => drop(stream),
                Err(_) => {}
            }

            let _ = app.emit("microphone-test-stopped", ());
        }};
    }

    match config.sample_format() {
        cpal::SampleFormat::I16 => start_monitor!(i16),
        cpal::SampleFormat::U16 => start_monitor!(u16),
        cpal::SampleFormat::F32 => start_monitor!(f32),
        other => {
            let msg = format!("Unsupported input sample format for mic test: {other:?}");
            let _ = app.emit("microphone-test-error", msg);
        }
    }
}
