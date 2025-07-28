use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use crossbeam_channel::{unbounded, Sender};
use nnnoiseless::DenoiseState;
use rodio::{Decoder, Sink, Source};
use rubato::{FftFixedIn, Resampler};
use rustfft::{num_complex::Complex, FftPlanner};
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{BufReader, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AudioDevice {
    pub name: String,
}

pub enum AudioCommand {
    Stop,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum SoundVariant {
    Start,
    End,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AudioData {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub channels: u16,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AudioLevel {
    pub level: f32,                // RMS level (0.0 to 1.0)
    pub peak: f32,                 // Peak level (0.0 to 1.0)
    pub frequency_bands: Vec<f32>, // 10 frequency bands for visualization
    pub dominant_frequency: f32,   // Dominant frequency in Hz
    pub spectral_centroid: f32,    // Spectral centroid (brightness)
    pub spectral_rolloff: f32,     // Spectral rolloff (95% energy point)
    pub zero_crossing_rate: f32,   // Zero crossing rate (roughness)
    pub is_voice_detected: bool,   // Voice activity detection
    pub is_silence: bool,          // Silence detection
}

pub struct AudioState {
    pub sink: Arc<Mutex<Sink>>,
    pub recording_thread: Arc<Mutex<Option<(thread::JoinHandle<()>, Sender<AudioCommand>)>>>,
    pub recorded_audio: Arc<Mutex<Option<Vec<f32>>>>,
}

impl AudioState {
    pub fn new(sink: Sink) -> Self {
        Self {
            sink: Arc::new(Mutex::new(sink)),
            recording_thread: Arc::new(Mutex::new(None)),
            recorded_audio: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioDevice>, String> {
    let host = cpal::default_host();
    let devices = host.input_devices().map_err(|e| e.to_string())?;

    let device_list = devices
        .map(|device| {
            let name = device
                .name()
                .unwrap_or_else(|_| "Unknown Device".to_string());
            AudioDevice { name }
        })
        .collect::<Vec<AudioDevice>>();

    Ok(device_list)
}

#[tauri::command]
pub fn start_recording(
    state: tauri::State<AudioState>,
    app: tauri::AppHandle,
    device: Option<String>,
) -> Result<(), String> {
    // Validate device exists before spawning thread
    let host = cpal::default_host();
    if let Some(ref device_name) = device {
        let devices = host.input_devices().map_err(|e| e.to_string())?;
        let device_exists = devices
            .filter_map(|d| d.name().ok())
            .any(|name| name == *device_name);
        if !device_exists {
            return Err(format!("Audio device '{}' not found", device_name));
        }
    } else {
        // Check if default device exists
        if host.default_input_device().is_none() {
            return Err("No default audio input device found".to_string());
        }
    }

    let (tx, rx) = unbounded();
    let app_handle = app.clone();
    let recorded_audio = state.recorded_audio.clone();

    let thread_handle = thread::spawn(move || {
        let host = cpal::default_host();
        let input_device = if let Some(name) = device {
            host.input_devices()
                .unwrap()
                .find(|d| d.name().map(|n| n == name).unwrap_or(false))
                .unwrap()
        } else {
            host.default_input_device().unwrap()
        };

        let config = input_device.default_input_config().unwrap();
        let input_sample_rate = config.sample_rate().0;
        let input_channels = config.channels();

        const TARGET_SAMPLE_RATE: u32 = 16000;

        let chunk_size = 1024;

        // Limit channels to 2 for resampler (we convert to mono anyway)
        let resampler_channels = input_channels.min(2) as usize;

        // Setup resampler
        let resampler = FftFixedIn::<f32>::new(
            input_sample_rate as usize,
            TARGET_SAMPLE_RATE as usize,
            chunk_size,         // chunk size
            resampler_channels, // Max 2 channels for resampler
            resampler_channels,
        )
        .unwrap();
        let resampler = Arc::new(Mutex::new(resampler));

        let audio_buffer = Arc::new(Mutex::new(Vec::new()));
        let output_samples = Arc::new(Mutex::new(Vec::new()));
        let last_level_emit = Arc::new(Mutex::new(Instant::now()));

        let resampler_clone = resampler.clone();
        let audio_buffer_clone = audio_buffer.clone();
        let output_samples_clone = output_samples.clone();
        let last_level_emit_clone = last_level_emit.clone();
        let app_clone = app.clone();
        let app_clone_for_err = app.clone();
        let err_fn = move |err: cpal::StreamError| {
            eprintln!("an error occurred on stream: {}", err);
            app_clone_for_err
                .emit("recording-error", err.to_string())
                .unwrap();
        };

        let stream = match config.sample_format() {
            cpal::SampleFormat::I16 => {
                let resampler_i16 = resampler_clone.clone();
                let audio_buffer_i16 = audio_buffer_clone.clone();
                let output_samples_i16 = output_samples_clone.clone();
                let last_level_emit_i16 = last_level_emit_clone.clone();
                let app_i16 = app_clone.clone();

                input_device
                    .build_input_stream(
                        &config.into(),
                        move |data: &[i16], _: &cpal::InputCallbackInfo| {
                            let f32_samples: Vec<f32> =
                                data.iter().map(|s| *s as f32 / 32768.0).collect();

                            // Emit audio level events (throttled to ~30 FPS)
                            let now = Instant::now();
                            let mut last_emit = last_level_emit_i16.lock().unwrap();
                            if now.duration_since(*last_emit) >= Duration::from_millis(33) {
                                let level = calculate_audio_level(&f32_samples);
                                if let Err(e) = app_i16.emit("audio-level", level) {
                                    eprintln!("Failed to emit audio level: {}", e);
                                }
                                *last_emit = now;
                            }

                            process_samples_to_buffer(
                                &mut resampler_i16.lock().unwrap(),
                                &mut audio_buffer_i16.lock().unwrap(),
                                &mut output_samples_i16.lock().unwrap(),
                                &f32_samples,
                                input_channels,
                                chunk_size,
                            );
                        },
                        err_fn,
                        None,
                    )
                    .unwrap()
            }
            cpal::SampleFormat::F32 => {
                let resampler_f32 = resampler_clone.clone();
                let audio_buffer_f32 = audio_buffer_clone.clone();
                let output_samples_f32 = output_samples_clone.clone();
                let last_level_emit_f32 = last_level_emit_clone.clone();
                let app_f32 = app_clone.clone();

                input_device
                    .build_input_stream(
                        &config.into(),
                        move |data: &[f32], _: &cpal::InputCallbackInfo| {
                            // Emit audio level events (throttled to ~30 FPS)
                            let now = Instant::now();
                            let mut last_emit = last_level_emit_f32.lock().unwrap();
                            if now.duration_since(*last_emit) >= Duration::from_millis(33) {
                                let level = calculate_audio_level(data);
                                if let Err(e) = app_f32.emit("audio-level", level) {
                                    eprintln!("Failed to emit audio level: {}", e);
                                }
                                *last_emit = now;
                            }

                            process_samples_to_buffer(
                                &mut resampler_f32.lock().unwrap(),
                                &mut audio_buffer_f32.lock().unwrap(),
                                &mut output_samples_f32.lock().unwrap(),
                                data,
                                input_channels,
                                chunk_size,
                            );
                        },
                        err_fn,
                        None,
                    )
                    .unwrap()
            }
            sample_format => panic!("Unsupported sample format '{sample_format}'"),
        };

        stream.play().unwrap();

        // Block until a stop message is received
        match rx.recv() {
            Ok(AudioCommand::Stop) => {
                // Stream is dropped here, which stops the recording
                drop(stream);

                // Flush any remaining audio in the buffer
                let mut buffer = audio_buffer.lock().unwrap();
                if !buffer.is_empty() {
                    let mut resampler = resampler.lock().unwrap();
                    let required_len = resampler.input_frames_next() * resampler_channels;
                    let missing = required_len.saturating_sub(buffer.len());
                    if missing > 0 {
                        buffer.extend_from_slice(&vec![0.0; missing]);
                    }

                    let waves_in = if resampler_channels == 2 {
                        let mut left = Vec::with_capacity(buffer.len() / 2);
                        let mut right = Vec::with_capacity(buffer.len() / 2);

                        if input_channels == 2 {
                            for chunk in buffer.chunks_exact(2) {
                                left.push(chunk[0]);
                                right.push(chunk[1]);
                            }
                        } else if input_channels > 2 {
                            // Multi-channel: take first 2 channels
                            for chunk in buffer.chunks_exact(input_channels as usize) {
                                left.push(chunk[0]);
                                right.push(chunk.get(1).copied().unwrap_or(chunk[0]));
                            }
                        }
                        vec![left, right]
                    } else {
                        vec![buffer.clone()]
                    };

                    let resampled_waves = resampler.process(&waves_in, None).unwrap();
                    collect_resampled_samples(
                        &mut output_samples.lock().unwrap(),
                        &resampled_waves,
                    );
                }

                // Store the recorded audio
                *recorded_audio.lock().unwrap() = Some(output_samples.lock().unwrap().clone());
            }
            Err(_) => {
                // Channel disconnected
            }
        }
    });

    *state.recording_thread.lock().unwrap() = Some((thread_handle, tx));
    *state.recorded_audio.lock().unwrap() = None; // Clear any previous recording

    app_handle
        .emit("recording-state-changed", "recording".to_string())
        .map_err(|e| e.to_string())
}

fn process_samples_to_buffer(
    resampler: &mut FftFixedIn<f32>,
    audio_buffer: &mut Vec<f32>,
    output_samples: &mut Vec<f32>,
    samples: &[f32],
    channels: u16,
    chunk_size: usize,
) {
    // Apply automatic gain for quiet microphones to recorded audio too
    let gained_samples = apply_automatic_input_gain(samples);
    audio_buffer.extend_from_slice(&gained_samples);

    let required_samples = chunk_size * channels as usize;

    while audio_buffer.len() >= required_samples {
        let chunk_to_process = audio_buffer
            .drain(0..required_samples)
            .collect::<Vec<f32>>();

        let waves_in = if channels >= 2 {
            // Handle stereo or multi-channel by taking first 2 channels
            let mut left = Vec::with_capacity(chunk_size);
            let mut right = Vec::with_capacity(chunk_size);

            if channels == 2 {
                // Stereo: simple case
                for chunk in chunk_to_process.chunks_exact(2) {
                    left.push(chunk[0]);
                    right.push(chunk[1]);
                }
            } else {
                // Multi-channel: take first 2 channels, ignore the rest
                for chunk in chunk_to_process.chunks_exact(channels as usize) {
                    left.push(chunk[0]);
                    right.push(chunk.get(1).copied().unwrap_or(chunk[0])); // Duplicate mono if only 1 channel somehow
                }
            }
            vec![left, right]
        } else {
            // Mono
            vec![chunk_to_process]
        };

        let resampled_waves = resampler.process(&waves_in, None).unwrap();
        collect_resampled_samples(output_samples, &resampled_waves);
    }
}

fn collect_resampled_samples(output_samples: &mut Vec<f32>, resampled_waves: &Vec<Vec<f32>>) {
    // Always output mono samples
    if resampled_waves.len() > 1 {
        let left = &resampled_waves[0];
        let right = &resampled_waves[1];
        for i in 0..left.len() {
            let sample = (left[i] + right[i]) / 2.0;
            output_samples.push(sample);
        }
    } else {
        output_samples.extend_from_slice(&resampled_waves[0]);
    }
}

/// Apply automatic gain for quiet microphones during recording
/// This helps with microphones that are naturally quiet or far from the user
fn apply_automatic_input_gain(samples: &[f32]) -> Vec<f32> {
    if samples.is_empty() {
        return samples.to_vec();
    }

    // Calculate current RMS to determine if input is quiet
    let rms = (samples.iter().map(|&s| s * s).sum::<f32>() / samples.len() as f32).sqrt();

    // Target RMS for comfortable input levels (higher than our preprocessing target)
    const TARGET_INPUT_RMS: f32 = 0.05; // Target for input level
    const MIN_GAIN: f32 = 1.0; // Never reduce gain
    const MAX_GAIN: f32 = 4.0; // Maximum boost for safety
    const NOISE_FLOOR: f32 = 0.0005; // Don't boost if below noise floor

    // Only boost if we have actual signal above noise floor
    if rms < NOISE_FLOOR {
        return samples.to_vec();
    }

    // Calculate gain needed to reach target input level
    let gain = if rms > 0.001 {
        (TARGET_INPUT_RMS / rms).clamp(MIN_GAIN, MAX_GAIN)
    } else {
        MIN_GAIN
    };

    // Only apply gain if it's beneficial (> 1.2x)
    if gain < 1.2 {
        return samples.to_vec();
    }

    // Apply gain with soft limiting to prevent harsh artifacts
    samples
        .iter()
        .map(|&s| {
            let amplified = s * gain;
            // Soft limiting to prevent clipping
            if amplified.abs() > 0.8 {
                amplified.signum() * (amplified.abs() * 0.8).tanh()
            } else {
                amplified
            }
        })
        .collect()
}

fn calculate_audio_level(samples: &[f32]) -> AudioLevel {
    if samples.is_empty() {
        return AudioLevel {
            level: 0.0,
            peak: 0.0,
            frequency_bands: vec![0.0; 10],
            dominant_frequency: 0.0,
            spectral_centroid: 0.0,
            spectral_rolloff: 0.0,
            zero_crossing_rate: 0.0,
            is_voice_detected: false,
            is_silence: true,
        };
    }

    // Apply automatic gain for quiet microphones before analysis
    let gained_samples = apply_automatic_input_gain(samples);

    // Basic level calculation on gained samples
    let mut sum_squares = 0.0;
    let mut peak = 0.0;
    let mut zero_crossings = 0;

    for i in 0..gained_samples.len() {
        let abs_sample = gained_samples[i].abs();
        sum_squares += abs_sample * abs_sample;
        if abs_sample > peak {
            peak = abs_sample;
        }

        // Count zero crossings
        if i > 0 && (gained_samples[i] >= 0.0) != (gained_samples[i - 1] >= 0.0) {
            zero_crossings += 1;
        }
    }

    let rms = (sum_squares / gained_samples.len() as f32).sqrt();
    let zero_crossing_rate = zero_crossings as f32 / gained_samples.len() as f32;

    // More adaptive silence detection - very lenient for quiet microphones
    let is_silence = rms < 0.001; // Much lower threshold

    // More lenient voice detection - optimized for quiet microphones
    let is_voice_detected = rms > 0.003 && zero_crossing_rate > 0.01 && zero_crossing_rate < 0.4;

    // Calculate frequency spectrum analysis on gained samples
    let (frequency_bands, dominant_frequency, spectral_centroid, spectral_rolloff) =
        analyze_frequency_spectrum(&gained_samples);

    AudioLevel {
        level: rms.min(1.0),
        peak: peak.min(1.0),
        frequency_bands,
        dominant_frequency,
        spectral_centroid,
        spectral_rolloff,
        zero_crossing_rate,
        is_voice_detected,
        is_silence,
    }
}

fn analyze_frequency_spectrum(samples: &[f32]) -> (Vec<f32>, f32, f32, f32) {
    const FFT_SIZE: usize = 512;
    const NUM_BANDS: usize = 10;
    const SAMPLE_RATE: f32 = 16000.0; // We resample to 16kHz

    if samples.len() < FFT_SIZE {
        return (vec![0.0; NUM_BANDS], 0.0, 0.0, 0.0);
    }

    // Take the last FFT_SIZE samples for analysis
    let start_idx = samples.len().saturating_sub(FFT_SIZE);
    let chunk = &samples[start_idx..start_idx + FFT_SIZE];

    // Apply Hamming window
    let windowed: Vec<f32> = chunk
        .iter()
        .enumerate()
        .map(|(i, &sample)| {
            let window_val =
                0.54 - 0.46 * (2.0 * std::f32::consts::PI * i as f32 / (FFT_SIZE - 1) as f32).cos();
            sample * window_val
        })
        .collect();

    // Convert to complex numbers for FFT
    let mut fft_input: Vec<Complex<f32>> = windowed.iter().map(|&x| Complex::new(x, 0.0)).collect();

    // Perform FFT
    let mut planner = FftPlanner::new();
    let fft = planner.plan_fft_forward(FFT_SIZE);
    fft.process(&mut fft_input);

    // Calculate magnitude spectrum (only first half due to symmetry)
    let magnitude_spectrum: Vec<f32> = fft_input[..FFT_SIZE / 2].iter().map(|c| c.norm()).collect();

    // Divide spectrum into frequency bands
    let mut frequency_bands = vec![0.0; NUM_BANDS];
    let band_size = magnitude_spectrum.len() / NUM_BANDS;

    for (band_idx, band) in frequency_bands.iter_mut().enumerate() {
        let start = band_idx * band_size;
        let end = ((band_idx + 1) * band_size).min(magnitude_spectrum.len());

        if start < end {
            let band_sum: f32 = magnitude_spectrum[start..end].iter().sum();
            *band = (band_sum / (end - start) as f32).min(1.0);
        }
    }

    // Find dominant frequency
    let mut max_magnitude = 0.0;
    let mut max_bin = 0;
    for (i, &magnitude) in magnitude_spectrum.iter().enumerate() {
        if magnitude > max_magnitude {
            max_magnitude = magnitude;
            max_bin = i;
        }
    }
    let dominant_frequency = (max_bin as f32 * SAMPLE_RATE) / (FFT_SIZE as f32);

    // Calculate spectral centroid (brightness)
    let mut weighted_sum = 0.0;
    let mut magnitude_sum = 0.0;
    for (i, &magnitude) in magnitude_spectrum.iter().enumerate() {
        let frequency = (i as f32 * SAMPLE_RATE) / (FFT_SIZE as f32);
        weighted_sum += frequency * magnitude;
        magnitude_sum += magnitude;
    }
    let spectral_centroid = if magnitude_sum > 0.0 {
        weighted_sum / magnitude_sum
    } else {
        0.0
    };

    // Calculate spectral rolloff (95% energy point)
    let total_energy: f32 = magnitude_spectrum.iter().map(|x| x * x).sum();
    let threshold = 0.95 * total_energy;
    let mut cumulative_energy = 0.0;
    let mut rolloff_bin = 0;

    for (i, &magnitude) in magnitude_spectrum.iter().enumerate() {
        cumulative_energy += magnitude * magnitude;
        if cumulative_energy >= threshold {
            rolloff_bin = i;
            break;
        }
    }
    let spectral_rolloff = (rolloff_bin as f32 * SAMPLE_RATE) / (FFT_SIZE as f32);

    (
        frequency_bands,
        dominant_frequency,
        spectral_centroid,
        spectral_rolloff,
    )
}

#[tauri::command]
pub fn stop_recording(
    state: tauri::State<AudioState>,
    app: tauri::AppHandle,
) -> Result<AudioData, String> {
    if let Some((thread_handle, sender)) = state.recording_thread.lock().unwrap().take() {
        sender.send(AudioCommand::Stop).unwrap();
        thread_handle.join().unwrap();
    }

    // Don't emit idle state here - let frontend manage the state transition
    // to avoid UI gap between recording stop and processing start

    let samples = state
        .recorded_audio
        .lock()
        .unwrap()
        .take()
        .ok_or_else(|| "No audio data recorded".to_string())?;

    // Generate timestamp for debug files
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Save pre-processed (raw) audio for debugging
    if let Err(e) = save_audio_debug(&samples, &format!("raw_audio_{}.wav", timestamp), &app) {
        println!("[Audio Debug] Failed to save raw audio: {}", e);
    }

    // Apply noise suppression to the recorded audio
    let denoised_samples = denoise_audio(samples);

    // Save post-processed audio for debugging
    if let Err(e) = save_audio_debug(
        &denoised_samples,
        &format!("processed_audio_{}.wav", timestamp),
        &app,
    ) {
        println!("[Audio Debug] Failed to save processed audio: {}", e);
    }

    Ok(AudioData {
        samples: denoised_samples,
        sample_rate: 16000, // We always resample to 16kHz
        channels: 1,        // We always convert to mono
    })
}

/// Apply Whisper-optimized audio processing: EQ -> Noise Reduction -> Normalization
///
/// This pipeline is specifically tuned for OpenAI's Whisper transcription service:
/// - Preserves natural speech characteristics that Whisper expects
/// - Uses conservative noise reduction to avoid artifacts
/// - Normalizes to -16dB RMS for optimal transcription accuracy
/// - Note: Quiet microphones are automatically boosted during recording, before this processing
fn denoise_audio(samples: Vec<f32>) -> Vec<f32> {
    println!(
        "[Audio Processing] Starting Whisper-optimized audio processing on {} samples (quiet microphones already boosted during recording)",
        samples.len()
    );

    // Stage 1: Simple EQ - Combined filtering
    println!("[Audio Processing] Stage 1: Applying simple EQ (80Hz high-pass, 8kHz low-pass)");
    let eq_filtered = apply_simple_eq(samples);

    // Stage 2: Simple Noise Reduction - Direct neural denoising
    println!("[Audio Processing] Stage 2: Applying noise reduction");
    let denoised = apply_simple_noise_reduction(eq_filtered);

    // Stage 3: Simple Normalization - RMS-based with peak limiting
    println!("[Audio Processing] Stage 3: Applying normalization");
    let normalized = apply_simple_normalization(denoised);

    println!(
        "[Audio Processing] Whisper-optimized audio processing complete - {} samples processed",
        normalized.len()
    );
    normalized
}

/// Simple EQ: High-pass filter (80Hz) followed by low-pass filter (8kHz)
fn apply_simple_eq(samples: Vec<f32>) -> Vec<f32> {
    // Apply high-pass filter at 80Hz to remove low-frequency rumble
    let high_passed = apply_simple_high_pass_filter(samples, 80.0);

    // Apply low-pass filter at 8kHz to remove high-frequency noise
    apply_simple_low_pass_filter(high_passed, 8000.0)
}

/// Simple high-pass filter with configurable cutoff frequency
fn apply_simple_high_pass_filter(samples: Vec<f32>, cutoff_hz: f32) -> Vec<f32> {
    let sample_rate = 16000.0;
    let omega = 2.0 * std::f32::consts::PI * cutoff_hz / sample_rate;
    let cos_omega = omega.cos();
    let sin_omega = omega.sin();
    let alpha = sin_omega / std::f32::consts::SQRT_2;

    // High-pass filter coefficients
    let b0 = (1.0 + cos_omega) / 2.0;
    let b1 = -(1.0 + cos_omega);
    let b2 = (1.0 + cos_omega) / 2.0;
    let a0 = 1.0 + alpha;
    let a1 = -2.0 * cos_omega;
    let a2 = 1.0 - alpha;

    // Normalize
    let b0 = b0 / a0;
    let b1 = b1 / a0;
    let b2 = b2 / a0;
    let a1 = a1 / a0;
    let a2 = a2 / a0;

    apply_biquad_filter(samples, b0, b1, b2, a1, a2)
}

/// Simple low-pass filter with configurable cutoff frequency
fn apply_simple_low_pass_filter(samples: Vec<f32>, cutoff_hz: f32) -> Vec<f32> {
    let sample_rate = 16000.0;
    let omega = 2.0 * std::f32::consts::PI * cutoff_hz / sample_rate;
    let cos_omega = omega.cos();
    let sin_omega = omega.sin();
    let alpha = sin_omega / std::f32::consts::SQRT_2;

    // Low-pass filter coefficients
    let b0 = (1.0 - cos_omega) / 2.0;
    let b1 = 1.0 - cos_omega;
    let b2 = (1.0 - cos_omega) / 2.0;
    let a0 = 1.0 + alpha;
    let a1 = -2.0 * cos_omega;
    let a2 = 1.0 - alpha;

    // Normalize
    let b0 = b0 / a0;
    let b1 = b1 / a0;
    let b2 = b2 / a0;
    let a1 = a1 / a0;
    let a2 = a2 / a0;

    apply_biquad_filter(samples, b0, b1, b2, a1, a2)
}

/// Helper function to apply biquad filter coefficients
fn apply_biquad_filter(samples: Vec<f32>, b0: f32, b1: f32, b2: f32, a1: f32, a2: f32) -> Vec<f32> {
    let mut filtered = Vec::with_capacity(samples.len());
    let mut x1 = 0.0;
    let mut x2 = 0.0;
    let mut y1 = 0.0;
    let mut y2 = 0.0;

    for &sample in samples.iter() {
        let output = b0 * sample + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

        x2 = x1;
        x1 = sample;
        y2 = y1;
        y1 = output;

        filtered.push(output);
    }

    filtered
}

/// Simple noise reduction optimized for Whisper transcription
fn apply_simple_noise_reduction(samples: Vec<f32>) -> Vec<f32> {
    const FRAME_SIZE: usize = 480; // nnnoiseless requires exactly 480 samples per frame
    const BLEND_FACTOR: f32 = 0.35; // Much more conservative - 35% denoised, 65% original

    // Check if audio is already clean enough to skip noise reduction
    let rms = (samples.iter().map(|&s| s * s).sum::<f32>() / samples.len() as f32).sqrt();

    // If audio is already at a good level with low noise, skip denoising to preserve naturalness
    if rms > 0.08 {
        println!(
            "[Audio Processing] Audio is clean enough (RMS: {:.3}), skipping noise reduction",
            rms
        );
        return samples;
    }

    println!(
        "[Audio Processing] Applying light noise reduction (RMS: {:.3}, blend: {}%)",
        rms,
        (BLEND_FACTOR * 100.0) as u32
    );

    let mut denoise_state = DenoiseState::new();
    let mut denoised_samples = Vec::with_capacity(samples.len());

    // Process complete frames
    for chunk in samples.chunks_exact(FRAME_SIZE) {
        let mut frame = [0.0; FRAME_SIZE];
        frame.copy_from_slice(chunk);

        // Apply neural denoising
        let mut output = [0.0; FRAME_SIZE];
        denoise_state.process_frame(&mut output, &frame);

        // Simple fixed blending to preserve naturalness
        for i in 0..FRAME_SIZE {
            let blended = output[i] * BLEND_FACTOR + frame[i] * (1.0 - BLEND_FACTOR);
            denoised_samples.push(blended);
        }
    }

    // Handle remaining samples (if any) by padding with zeros
    let remainder = samples.len() % FRAME_SIZE;
    if remainder > 0 {
        let mut last_frame = [0.0; FRAME_SIZE];
        let last_chunk = &samples[samples.len() - remainder..];
        last_frame[..remainder].copy_from_slice(last_chunk);

        // Apply denoising to padded frame
        let mut output = [0.0; FRAME_SIZE];
        denoise_state.process_frame(&mut output, &last_frame);

        // Apply same fixed blending for remainder samples
        for i in 0..remainder {
            let blended = output[i] * BLEND_FACTOR + last_frame[i] * (1.0 - BLEND_FACTOR);
            denoised_samples.push(blended);
        }
    }

    denoised_samples
}

/// Simple normalization optimized for Whisper transcription
/// More conservative since we already boost quiet inputs during recording
fn apply_simple_normalization(samples: Vec<f32>) -> Vec<f32> {
    if samples.is_empty() {
        return samples;
    }

    const TARGET_RMS: f32 = 0.16; // Target RMS level (-16dB) - optimal for Whisper
    const MAX_GAIN: f32 = 2.0; // More conservative since we gain during recording
    const MIN_GAIN: f32 = 0.5; // Allow reduction if too loud
    const PEAK_LIMIT: f32 = 0.85; // Conservative peak limiting to prevent artifacts

    // Calculate current RMS level
    let rms = (samples.iter().map(|&s| s * s).sum::<f32>() / samples.len() as f32).sqrt();

    // Calculate gain needed to reach target RMS
    let gain = if rms > 0.001 {
        (TARGET_RMS / rms).clamp(MIN_GAIN, MAX_GAIN)
    } else {
        1.0
    };

    println!("[Audio Processing] RMS: {:.3}, Gain: {:.2}x", rms, gain);

    // Apply gain with simple peak limiting
    samples
        .into_iter()
        .map(|s| {
            let amplified = s * gain;
            // Simple hard limiting
            amplified.clamp(-PEAK_LIMIT, PEAK_LIMIT)
        })
        .collect()
}

#[tauri::command]
pub fn cancel_recording(
    state: tauri::State<AudioState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // Stop the recording thread
    if let Some((thread_handle, sender)) = state.recording_thread.lock().unwrap().take() {
        sender.send(AudioCommand::Stop).unwrap();
        thread_handle.join().unwrap();
    }

    // Emit state change to idle
    app.emit("recording-state-changed", "idle".to_string())
        .map_err(|e| e.to_string())?;

    // Discard the recorded audio data without returning it
    state.recorded_audio.lock().unwrap().take();

    Ok(())
}

#[tauri::command]
pub fn play_notification_sound(
    state: tauri::State<AudioState>,
    app: tauri::AppHandle,
    sound_name: String,
    variant: SoundVariant,
) -> Result<(), String> {
    let sound_path = app
        .path()
        .resolve(
            format!("resources/sounds/notification/{}", sound_name),
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| e.to_string())?;

    let file = BufReader::new(
        File::open(&sound_path)
            .map_err(|e| format!("Failed to open sound file at {:?}: {}", sound_path, e))?,
    );

    let source = Decoder::new(file).map_err(|e| e.to_string())?;

    let modified_source = match variant {
        SoundVariant::Start => source.speed(1.0).convert_samples::<f32>(),
        SoundVariant::End => source.speed(0.85).convert_samples::<f32>(),
    };

    state.sink.lock().unwrap().append(modified_source);
    Ok(())
}

#[tauri::command]
pub fn set_volume(state: tauri::State<AudioState>, volume: f32) -> Result<(), String> {
    if volume < 0.0 || volume > 1.0 {
        return Err(format!(
            "Volume must be between 0.0 and 1.0, got {}",
            volume
        ));
    }
    state.sink.lock().unwrap().set_volume(volume);
    Ok(())
}

/// Mute or unmute system audio (platform-specific)
#[cfg(target_os = "windows")]
pub fn set_system_audio_mute(mute: bool) -> Result<(), String> {
    use windows::Win32::Media::Audio::{
        eConsole, eRender, Endpoints::IAudioEndpointVolume, IMMDeviceEnumerator, MMDeviceEnumerator,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_APARTMENTTHREADED,
    };

    unsafe {
        // Initialize COM
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

        // Create device enumerator
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| format!("Failed to create device enumerator: {}", e))?;

        // Get default audio endpoint
        let device = enumerator
            .GetDefaultAudioEndpoint(eRender, eConsole)
            .map_err(|e| format!("Failed to get default audio endpoint: {}", e))?;

        // Get volume interface
        let volume = device
            .Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None)
            .map_err(|e| format!("Failed to get volume interface: {}", e))?;

        // Set mute state
        volume
            .SetMute(mute, std::ptr::null())
            .map_err(|e| format!("Failed to set mute state: {}", e))?;
    }

    Ok(())
}

#[cfg(target_os = "macos")]
pub fn set_system_audio_mute(mute: bool) -> Result<(), String> {
    // macOS implementation would use Core Audio
    // For now, we'll return an error indicating it's not implemented
    Err("System audio muting not yet implemented for macOS".to_string())
}

#[cfg(target_os = "linux")]
pub fn set_system_audio_mute(mute: bool) -> Result<(), String> {
    // Linux implementation would use ALSA or PulseAudio
    // For now, we'll return an error indicating it's not implemented
    Err("System audio muting not yet implemented for Linux".to_string())
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
pub fn set_system_audio_mute(_mute: bool) -> Result<(), String> {
    Err("System audio muting not supported on this platform".to_string())
}

#[tauri::command]
pub fn mute_system_audio() -> Result<(), String> {
    set_system_audio_mute(true)
}

#[tauri::command]
pub fn unmute_system_audio() -> Result<(), String> {
    set_system_audio_mute(false)
}

/// Save audio samples as a WAV file for debugging purposes
fn save_audio_debug(samples: &[f32], filename: &str, app: &tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let debug_dir = app_data_dir.join("audio_debug");

    // Create debug directory if it doesn't exist
    if !debug_dir.exists() {
        fs::create_dir_all(&debug_dir)
            .map_err(|e| format!("Failed to create debug directory: {}", e))?;
    }

    let file_path = debug_dir.join(filename);
    let mut file =
        File::create(&file_path).map_err(|e| format!("Failed to create debug file: {}", e))?;

    // Write simple WAV header (44 bytes)
    let sample_rate = 16000u32;
    let num_channels = 1u16;
    let bits_per_sample = 32u16; // 32-bit float
    let byte_rate = sample_rate * num_channels as u32 * (bits_per_sample as u32 / 8);
    let block_align = num_channels * (bits_per_sample / 8);
    let data_size = samples.len() as u32 * (bits_per_sample as u32 / 8);
    let file_size = 36 + data_size;

    // RIFF header
    file.write_all(b"RIFF").map_err(|e| e.to_string())?;
    file.write_all(&file_size.to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(b"WAVE").map_err(|e| e.to_string())?;

    // fmt chunk
    file.write_all(b"fmt ").map_err(|e| e.to_string())?;
    file.write_all(&16u32.to_le_bytes())
        .map_err(|e| e.to_string())?; // chunk size
    file.write_all(&3u16.to_le_bytes())
        .map_err(|e| e.to_string())?; // IEEE float format
    file.write_all(&num_channels.to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(&sample_rate.to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(&byte_rate.to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(&block_align.to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(&bits_per_sample.to_le_bytes())
        .map_err(|e| e.to_string())?;

    // data chunk
    file.write_all(b"data").map_err(|e| e.to_string())?;
    file.write_all(&data_size.to_le_bytes())
        .map_err(|e| e.to_string())?;

    // Write audio data as 32-bit float
    for &sample in samples {
        file.write_all(&sample.to_le_bytes())
            .map_err(|e| e.to_string())?;
    }

    println!(
        "[Audio Debug] Saved {} samples to: {:?}",
        samples.len(),
        file_path
    );
    Ok(())
}
