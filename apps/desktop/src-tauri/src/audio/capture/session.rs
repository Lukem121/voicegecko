use cpal::traits::{DeviceTrait, StreamTrait};
use crossbeam_channel::{unbounded, Receiver, Sender};
use ringbuf::traits::{Consumer, Observer};
use sentry::Level;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

use crate::audio::capture::ring::{split_ring, DEFAULT_RING_CAPACITY, SampleConsumer, SampleProducer};
use crate::audio::capture::stream::build_ring_push_stream;
use crate::audio::devices::resolve_input_device;
use crate::audio::hub::StreamingAudioHub;
use crate::audio::pipeline::MonoResampler;
use crate::speech::vad::POST_ROLL_MS;

enum CaptureCommand {
    Stop,
}

pub struct CaptureHandle {
    thread: JoinHandle<Vec<f32>>,
    stop_tx: Sender<CaptureCommand>,
}

impl CaptureHandle {
    pub fn start(
        app: AppHandle,
        device: Option<String>,
        streaming_hub: Option<Arc<StreamingAudioHub>>,
    ) -> Result<Self, String> {
        let (stop_tx, stop_rx) = unbounded::<CaptureCommand>();

        let thread = thread::spawn(move || run_capture(app, device, streaming_hub, stop_rx));

        Ok(Self { thread, stop_tx })
    }

    pub fn stop(self) -> Result<Vec<f32>, String> {
        self.stop_tx
            .send(CaptureCommand::Stop)
            .map_err(|e| format!("Failed to signal capture stop: {e}"))?;

        self.thread
            .join()
            .map_err(|_| "Capture thread panicked".to_string())
    }
}

fn run_capture(
    app: AppHandle,
    device: Option<String>,
    streaming_hub: Option<Arc<StreamingAudioHub>>,
    stop_rx: Receiver<CaptureCommand>,
) -> Vec<f32> {
    let input_device = match resolve_input_device(device.as_deref()) {
        Ok(d) => d,
        Err(err_msg) => {
            let _ = app.emit("recording-error", err_msg.clone());
            sentry::capture_message(
                &format!("audio:capture: device acquisition failed: {err_msg}"),
                Level::Error,
            );
            return Vec::new();
        }
    };

    let config = match input_device.default_input_config() {
        Ok(cfg) => cfg,
        Err(e) => {
            let msg = format!("Failed to get default input config: {e}");
            let _ = app.emit("recording-error", msg.clone());
            sentry::capture_message(
                &format!("audio:capture: default_input_config failed: {e}"),
                Level::Error,
            );
            return Vec::new();
        }
    };

    let input_sample_rate = config.sample_rate().0;
    let input_channels = config.channels();
    let chunk_size = 1024;
    let stream_config: cpal::StreamConfig = config.clone().into();

    let (producer, consumer) = split_ring(DEFAULT_RING_CAPACITY);
    let worker_stop = Arc::new(AtomicBool::new(false));

    let worker_hub = streaming_hub.clone();
    let worker_stop_flag = worker_stop.clone();
    let worker_handle = spawn_capture_worker(
        consumer,
        worker_stop_flag,
        input_sample_rate,
        input_channels,
        chunk_size,
        worker_hub,
        app.clone(),
    );

    let app_err = app.clone();
    let err_fn = move |err: cpal::StreamError| {
        let _ = app_err.emit("recording-error", err.to_string());
        sentry::capture_message(
            &format!("audio:capture: stream error: {err}"),
            Level::Error,
        );
    };

    macro_rules! start_stream {
        ($t:ty) => {{
            let prod: SampleProducer = producer.clone();
            let app_level = app.clone();
            let mut last_emit = Instant::now();

            let stream = match build_ring_push_stream::<$t>(
                &input_device,
                &stream_config,
                prod,
                move |level| {
                    let now = Instant::now();
                    if now.duration_since(last_emit) >= Duration::from_millis(33) {
                        let _ = app_level.emit("audio-level", level);
                        last_emit = now;
                    }
                },
                err_fn,
            ) {
                Ok(s) => s,
                Err(e) => {
                    worker_stop.store(true, Ordering::SeqCst);
                    let _ = worker_handle.join();
                    let msg = format!("Failed to build input stream: {e}");
                    let _ = app.emit("recording-error", msg.clone());
                    sentry::capture_message(
                        &format!("audio:capture: build stream failed: {e}"),
                        Level::Error,
                    );
                    return Vec::new();
                }
            };

            if let Err(e) = stream.play() {
                worker_stop.store(true, Ordering::SeqCst);
                let _ = worker_handle.join();
                let msg = format!("Failed to start input stream: {e}");
                let _ = app.emit("recording-error", msg.clone());
                sentry::capture_message(&format!("audio:capture: play failed: {e}"), Level::Error);
                return Vec::new();
            }

            match stop_rx.recv() {
                Ok(CaptureCommand::Stop) => {
                    thread::sleep(Duration::from_millis(POST_ROLL_MS));
                }
                Err(_) => {}
            }

            drop(stream);
            worker_stop.store(true, Ordering::SeqCst);

            worker_handle.join().unwrap_or_default()
        }};
    }

    match config.sample_format() {
        cpal::SampleFormat::I16 => start_stream!(i16),
        cpal::SampleFormat::U16 => start_stream!(u16),
        cpal::SampleFormat::F32 => start_stream!(f32),
        other => {
            worker_stop.store(true, Ordering::SeqCst);
            let _ = worker_handle.join();
            let msg = format!("Unsupported input sample format: {other:?}");
            let _ = app.emit("recording-error", msg.clone());
            sentry::capture_message(&format!("audio:capture: {msg}"), Level::Error);
            Vec::new()
        }
    }
}

fn spawn_capture_worker(
    mut consumer: SampleConsumer,
    stop: Arc<AtomicBool>,
    input_sample_rate: u32,
    input_channels: u16,
    chunk_size: usize,
    hub: Option<Arc<StreamingAudioHub>>,
    app: AppHandle,
) -> JoinHandle<Vec<f32>> {
    thread::spawn(move || {
        let mut resampler =
            match MonoResampler::new(input_sample_rate, input_channels, chunk_size) {
                Ok(r) => r,
                Err(e) => {
                    let _ = app.emit("recording-error", e);
                    return Vec::new();
                }
            };

        let mut output = Vec::new();
        let mut scratch = vec![0.0f32; 4096];

        while !stop.load(Ordering::Acquire) || consumer.occupied_len() > 0 {
            let n = consumer.pop_slice(&mut scratch);
            if n > 0 {
                resampler.push_interleaved(&scratch[..n], &mut output, hub.as_ref());
            } else if !stop.load(Ordering::Acquire) {
                thread::sleep(Duration::from_micros(200));
            }
        }

        resampler.flush(&mut output, hub.as_ref());
        output
    })
}
