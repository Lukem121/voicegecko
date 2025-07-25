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
    audio_buffer.extend_from_slice(samples);

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

    // Basic level calculation
    let mut sum_squares = 0.0;
    let mut peak = 0.0;
    let mut zero_crossings = 0;

    for i in 0..samples.len() {
        let abs_sample = samples[i].abs();
        sum_squares += abs_sample * abs_sample;
        if abs_sample > peak {
            peak = abs_sample;
        }

        // Count zero crossings
        if i > 0 && (samples[i] >= 0.0) != (samples[i - 1] >= 0.0) {
            zero_crossings += 1;
        }
    }

    let rms = (sum_squares / samples.len() as f32).sqrt();
    let zero_crossing_rate = zero_crossings as f32 / samples.len() as f32;

    // Determine if this is silence (below noise threshold)
    let is_silence = rms < 0.01;

    // Simple voice detection (based on RMS and ZCR)
    let is_voice_detected = rms > 0.02 && zero_crossing_rate > 0.02 && zero_crossing_rate < 0.3;

    // Calculate frequency spectrum analysis
    let (frequency_bands, dominant_frequency, spectral_centroid, spectral_rolloff) =
        analyze_frequency_spectrum(samples);

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

/// Apply conservative noise suppression focused on preserving speech intelligibility
fn denoise_audio(samples: Vec<f32>) -> Vec<f32> {
    println!(
        "[Audio Processing] Starting conservative audio processing on {} samples",
        samples.len()
    );

    // Step 1: Light high-pass filter to remove only very low frequency rumble
    println!("[Audio Processing] Step 1: Applying gentle high-pass filter (40Hz cutoff)");
    let high_pass_filtered = apply_gentle_high_pass_filter(samples);

    // Step 1.5: Remove electrical hum (50/60Hz and harmonics) - very conservative
    println!("[Audio Processing] Step 1.5: Removing electrical hum (50/60Hz and key harmonics)");
    let hum_filtered = remove_electrical_hum_conservative(high_pass_filtered);

    // Step 1.6: Apply gentle low-pass filter to remove high-frequency digital noise
    println!("[Audio Processing] Step 1.6: Removing high-frequency digital noise");
    let filtered_samples = apply_gentle_low_pass_filter(hum_filtered);

    // Step 2: Analyze audio to determine if denoising is needed
    println!("[Audio Processing] Step 2: Analyzing audio characteristics");
    let (needs_denoising, snr_estimate) = analyze_audio_quality(&filtered_samples);

    let processed_samples = if needs_denoising {
        println!("[Audio Processing] Step 3: Applying adaptive neural denoising");

        // For very noisy audio, apply light spectral subtraction first
        let pre_processed = if snr_estimate < 8.0 {
            println!("[Audio Processing] Step 3a: Applying light spectral subtraction for background noise");
            apply_light_spectral_subtraction(filtered_samples)
        } else {
            filtered_samples
        };

        apply_adaptive_denoising(pre_processed, snr_estimate)
    } else {
        println!("[Audio Processing] Step 3: Skipping denoising - audio quality is good");
        filtered_samples
    };

    // Step 3: Adaptive gain control for optimal volume
    println!("[Audio Processing] Step 4: Applying adaptive gain control");
    let normalized = apply_adaptive_gain_control(processed_samples);

    println!(
        "[Audio Processing] Conservative audio processing complete - {} samples processed",
        normalized.len()
    );
    normalized
}

/// Analyze audio characteristics to determine if denoising is beneficial
fn analyze_audio_quality(samples: &[f32]) -> (bool, f32) {
    if samples.is_empty() {
        return (false, 0.0);
    }

    // Calculate signal-to-noise ratio estimate
    let mut signal_energy = 0.0;
    let mut noise_energy = 0.0;
    let mut speech_segments = 0;
    let mut quiet_segments = 0;

    // Analyze in 20ms windows (320 samples at 16kHz)
    const WINDOW_SIZE: usize = 320;

    for window in samples.chunks(WINDOW_SIZE) {
        let rms = (window.iter().map(|&x| x * x).sum::<f32>() / window.len() as f32).sqrt();

        if rms > 0.02 {
            // Likely speech or significant audio
            signal_energy += rms;
            speech_segments += 1;
        } else if rms > 0.005 {
            // Quiet but not silent - likely background noise
            noise_energy += rms;
            quiet_segments += 1;
        }
    }

    // If we have very little speech, don't denoise
    if speech_segments < 5 {
        return (false, 0.0);
    }

    // Calculate estimated SNR
    let avg_signal = if speech_segments > 0 {
        signal_energy / speech_segments as f32
    } else {
        0.0
    };
    let avg_noise = if quiet_segments > 0 {
        noise_energy / quiet_segments as f32
    } else {
        0.001
    };

    let snr_estimate = 20.0 * (avg_signal / avg_noise).log10();

    // Apply denoising if SNR suggests noise (< 12dB) or if we detect consistent background noise
    println!("[Audio Processing] Estimated SNR: {:.1}dB", snr_estimate);

    // Also consider applying denoising if we have a lot of quiet segments (background noise)
    let noise_ratio = quiet_segments as f32 / (speech_segments + quiet_segments) as f32;
    let has_background_noise = noise_ratio > 0.3 && avg_noise > 0.008;

    println!(
        "[Audio Processing] Noise ratio: {:.2}, Has background noise: {}",
        noise_ratio, has_background_noise
    );

    let needs_denoising = snr_estimate < 12.0 || has_background_noise;
    (needs_denoising, snr_estimate)
}

/// Remove electrical hum conservatively - only target clear electrical interference
fn remove_electrical_hum_conservative(samples: Vec<f32>) -> Vec<f32> {
    // Only target the most problematic electrical frequencies with gentle filtering
    let mut filtered = samples;

    // Apply very narrow notch filters only for clear electrical interference
    // Using higher Q factor (narrower notch) to minimize impact on speech
    let electrical_frequencies = [
        50.0,  // European mains frequency
        60.0,  // American mains frequency
        120.0, // First harmonic of 60Hz (most common and annoying)
    ];

    for freq in electrical_frequencies {
        filtered = apply_gentle_notch_filter(filtered, freq, 16000.0);
    }

    filtered
}

/// Apply a very gentle notch filter to remove specific electrical frequencies
fn apply_gentle_notch_filter(samples: Vec<f32>, frequency: f32, sample_rate: f32) -> Vec<f32> {
    // Much gentler notch filter with higher Q factor (narrower, less impact)
    let omega = 2.0 * std::f32::consts::PI * frequency / sample_rate;
    let cos_omega = omega.cos();
    let q = 50.0; // Much higher Q = much narrower notch (was 30.0 in aggressive version)
    let alpha = omega.sin() / (2.0 * q);

    // Notch filter coefficients
    let b0 = 1.0;
    let b1 = -2.0 * cos_omega;
    let b2 = 1.0;
    let a0 = 1.0 + alpha;
    let a1 = -2.0 * cos_omega;
    let a2 = 1.0 - alpha;

    // Normalize
    let b0 = b0 / a0;
    let b1 = b1 / a0;
    let b2 = b2 / a0;
    let a1 = a1 / a0;
    let a2 = a2 / a0;

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

/// Apply gentle low-pass filter to remove high-frequency digital noise
fn apply_gentle_low_pass_filter(samples: Vec<f32>) -> Vec<f32> {
    // Butterworth low-pass filter at 7.5kHz (speech rarely goes above this)
    // This removes high-frequency digital noise while preserving speech clarity
    let cutoff = 7500.0;
    let sample_rate = 16000.0;

    let omega = 2.0 * std::f32::consts::PI * cutoff / sample_rate;
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

/// Apply gentle high-pass filter to remove only very low frequency rumble
fn apply_gentle_high_pass_filter(samples: Vec<f32>) -> Vec<f32> {
    // Butterworth high-pass filter at 40Hz (much gentler than the old 80Hz)
    let cutoff = 40.0;
    let sample_rate = 16000.0;

    let omega = 2.0 * std::f32::consts::PI * cutoff / sample_rate;
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

/// Apply adaptive single-pass neural denoising based on audio characteristics
fn apply_adaptive_denoising(samples: Vec<f32>, snr_estimate: f32) -> Vec<f32> {
    const FRAME_SIZE: usize = 480; // nnnoiseless requires exactly 480 samples per frame

    let mut denoise_state = DenoiseState::new();
    let mut denoised_samples = Vec::with_capacity(samples.len());

    // Process complete frames
    for chunk in samples.chunks_exact(FRAME_SIZE) {
        let mut frame = [0.0; FRAME_SIZE];
        frame.copy_from_slice(chunk);

        // Apply single-pass denoising (no double processing)
        let mut output = [0.0; FRAME_SIZE];
        denoise_state.process_frame(&mut output, &frame);

        // Adaptive blending based on SNR - more aggressive for noisier audio
        // Lower SNR = more denoising, Higher SNR = more preservation
        let blend_factor = if snr_estimate < 5.0 {
            0.85 // Very noisy - aggressive denoising
        } else if snr_estimate < 8.0 {
            0.75 // Moderately noisy
        } else if snr_estimate < 12.0 {
            0.65 // Slightly noisy
        } else {
            0.5 // Clean but still processing - very conservative
        };

        // println!(
        //     "[Audio Processing] Using adaptive blend factor: {:.2} (SNR: {:.1}dB)",
        //     blend_factor, snr_estimate
        // );

        for i in 0..FRAME_SIZE {
            let blended = output[i] * blend_factor + frame[i] * (1.0 - blend_factor);
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

        // Apply same adaptive blending for remainder samples
        let blend_factor = if snr_estimate < 5.0 {
            0.85
        } else if snr_estimate < 8.0 {
            0.75
        } else if snr_estimate < 12.0 {
            0.65
        } else {
            0.5
        };

        for i in 0..remainder {
            let blended = output[i] * blend_factor + last_frame[i] * (1.0 - blend_factor);
            denoised_samples.push(blended);
        }
    }

    denoised_samples
}

/// Adaptive gain control that preserves dynamics while ensuring good volume
fn apply_adaptive_gain_control(samples: Vec<f32>) -> Vec<f32> {
    if samples.is_empty() {
        return samples;
    }

    // Calculate both peak and RMS levels for better gain decisions
    let peak = samples
        .iter()
        .map(|&s| s.abs())
        .fold(0.0f32, |a, b| a.max(b));
    let rms = (samples.iter().map(|&s| s * s).sum::<f32>() / samples.len() as f32).sqrt();

    // Calculate crest factor (peak-to-RMS ratio) to understand dynamics
    let crest_factor = if rms > 0.001 { peak / rms } else { 1.0 };

    println!(
        "[Audio Processing] Peak: {:.3}, RMS: {:.3}, Crest Factor: {:.1}",
        peak, rms, crest_factor
    );

    // Determine target levels based on content analysis
    let (target_rms, max_peak) = if rms < 0.05 {
        // Very quiet audio - likely needs significant boost
        (0.15, 0.7)
    } else if rms < 0.15 {
        // Moderately quiet - gentle boost
        (0.25, 0.8)
    } else if rms > 0.4 {
        // Already loud - just prevent clipping
        (rms.min(0.35), 0.9)
    } else {
        // Good level - minor adjustment
        (rms * 1.1, 0.85)
    };

    // Calculate gain based on RMS but limited by peak
    let rms_gain = if rms > 0.001 { target_rms / rms } else { 1.0 };
    let peak_gain = if peak > 0.001 { max_peak / peak } else { 1.0 };

    // Use the more conservative gain to avoid clipping
    let final_gain = rms_gain.min(peak_gain).min(4.0); // Cap at 4x gain for safety

    println!("[Audio Processing] Applying gain: {:.2}x", final_gain);

    // Apply gain with soft limiting to prevent harsh clipping
    samples
        .into_iter()
        .map(|s| {
            let amplified = s * final_gain;
            // Soft limiting using tanh for smooth saturation
            if amplified.abs() > 0.9 {
                amplified.signum() * (amplified.abs() * 0.9).tanh()
            } else {
                amplified
            }
        })
        .collect()
}

/// Apply light spectral subtraction to reduce consistent background noise
fn apply_light_spectral_subtraction(samples: Vec<f32>) -> Vec<f32> {
    const FFT_SIZE: usize = 512;
    const OVERLAP: usize = FFT_SIZE / 2;
    const ALPHA: f32 = 2.0; // Over-subtraction factor
    const BETA: f32 = 0.001; // Spectral floor

    if samples.len() < FFT_SIZE {
        return samples;
    }

    let mut output = vec![0.0; samples.len()];
    let mut planner = FftPlanner::new();
    let fft = planner.plan_fft_forward(FFT_SIZE);
    let ifft = planner.plan_fft_inverse(FFT_SIZE);

    // Estimate noise spectrum from first 0.5 seconds
    let noise_frames = (8000.0 / OVERLAP as f32) as usize; // ~0.5s at 16kHz
    let mut noise_spectrum = vec![0.0; FFT_SIZE / 2];
    let mut noise_count = 0;

    // Collect noise spectrum estimate
    for i in (0..samples.len() - FFT_SIZE).step_by(OVERLAP) {
        if noise_count >= noise_frames {
            break;
        }

        let window = &samples[i..i + FFT_SIZE];
        let mut fft_input: Vec<Complex<f32>> =
            window.iter().map(|&x| Complex::new(x, 0.0)).collect();
        fft.process(&mut fft_input);

        for (j, &complex_val) in fft_input[..FFT_SIZE / 2].iter().enumerate() {
            noise_spectrum[j] += complex_val.norm().powi(2);
        }
        noise_count += 1;
    }

    // Average the noise spectrum
    if noise_count > 0 {
        for val in noise_spectrum.iter_mut() {
            *val /= noise_count as f32;
        }
    }

    // Process audio in overlapping frames
    for i in (0..samples.len() - FFT_SIZE).step_by(OVERLAP) {
        let window = &samples[i..i + FFT_SIZE];

        // Forward FFT
        let mut fft_input: Vec<Complex<f32>> =
            window.iter().map(|&x| Complex::new(x, 0.0)).collect();
        fft.process(&mut fft_input);

        // Spectral subtraction
        for j in 0..FFT_SIZE / 2 {
            let magnitude = fft_input[j].norm();
            let phase = fft_input[j].arg();

            // Subtract noise with over-subtraction and spectral floor
            let clean_mag = (magnitude.powi(2) - ALPHA * noise_spectrum[j])
                .max(BETA * magnitude.powi(2))
                .sqrt();

            fft_input[j] = Complex::from_polar(clean_mag, phase);
            if j > 0 && j < FFT_SIZE / 2 - 1 {
                fft_input[FFT_SIZE - j] = fft_input[j].conj();
            }
        }

        // Inverse FFT
        ifft.process(&mut fft_input);

        // Overlap-add to output
        for (j, &complex_val) in fft_input.iter().enumerate() {
            if i + j < output.len() {
                output[i + j] += complex_val.re / FFT_SIZE as f32;
            }
        }
    }

    output
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
