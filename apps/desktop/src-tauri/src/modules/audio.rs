use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use crossbeam_channel::{unbounded, Sender};
use nnnoiseless::DenoiseState;
use rodio::{Decoder, Sink, Source};
use rubato::{FftFixedIn, Resampler};
use rustfft::{num_complex::Complex, FftPlanner};
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::BufReader;
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

    app.emit("recording-state-changed", "idle".to_string())
        .map_err(|e| e.to_string())?;

    let samples = state
        .recorded_audio
        .lock()
        .unwrap()
        .take()
        .ok_or_else(|| "No audio data recorded".to_string())?;

    // Save the original audio for comparison
    if let Err(e) = save_audio_sample(&app, &samples, "original") {
        eprintln!("Failed to save original audio: {}", e);
    }

    // Apply noise suppression to the recorded audio
    let denoised_samples = denoise_audio(samples);

    // Save the denoised audio for comparison
    if let Err(e) = save_audio_sample(&app, &denoised_samples, "denoised") {
        eprintln!("Failed to save denoised audio: {}", e);
    }

    Ok(AudioData {
        samples: denoised_samples,
        sample_rate: 16000, // We always resample to 16kHz
        channels: 1,        // We always convert to mono
    })
}

/// Save audio samples as a WAV file for debugging/comparison
fn save_audio_sample(app: &tauri::AppHandle, samples: &[f32], suffix: &str) -> Result<(), String> {
    // Get app data directory
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Create audio_samples directory if it doesn't exist
    let audio_samples_dir = app_data_dir.join("audio_samples");
    if !audio_samples_dir.exists() {
        fs::create_dir_all(&audio_samples_dir)
            .map_err(|e| format!("Failed to create audio samples directory: {}", e))?;
    }

    // Generate timestamp for unique filename
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Failed to get timestamp: {}", e))?
        .as_millis();

    let filename = format!("audio_{}_{}.wav", timestamp, suffix);
    let file_path = audio_samples_dir.join(&filename);

    // Create WAV file
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = hound::WavWriter::create(&file_path, spec)
        .map_err(|e| format!("Failed to create WAV file: {}", e))?;

    // Convert f32 samples to i16 and write
    for &sample in samples {
        let amplitude = (sample * 32767.0).clamp(-32768.0, 32767.0) as i16;
        writer
            .write_sample(amplitude)
            .map_err(|e| format!("Failed to write sample: {}", e))?;
    }

    writer
        .finalize()
        .map_err(|e| format!("Failed to finalize WAV file: {}", e))?;

    println!("Saved {} audio to: {}", suffix, file_path.display());

    Ok(())
}

/// Apply noise suppression to audio samples using nnnoiseless
fn denoise_audio(samples: Vec<f32>) -> Vec<f32> {
    // First, remove electrical hum (50/60Hz and harmonics)
    let dehum_samples = remove_electrical_hum(samples);

    // Apply high-pass filter to remove low-frequency rumble
    let filtered_samples = apply_high_pass_filter(dehum_samples);

    const FRAME_SIZE: usize = 480; // nnnoiseless requires exactly 480 samples per frame

    let mut denoise_state = DenoiseState::new();
    let mut denoised_samples = Vec::with_capacity(filtered_samples.len());

    // Process complete frames
    for chunk in filtered_samples.chunks_exact(FRAME_SIZE) {
        let mut frame = [0.0; FRAME_SIZE];
        frame.copy_from_slice(chunk);

        // Apply denoising
        let mut output = [0.0; FRAME_SIZE];
        denoise_state.process_frame(&mut output, &frame);

        // Collect denoised samples
        denoised_samples.extend_from_slice(&output);
    }

    // Handle remaining samples (if any) by padding with zeros
    let remainder = filtered_samples.len() % FRAME_SIZE;
    if remainder > 0 {
        let mut last_frame = [0.0; FRAME_SIZE];
        let last_chunk = &filtered_samples[filtered_samples.len() - remainder..];
        last_frame[..remainder].copy_from_slice(last_chunk);

        // Apply denoising to padded frame
        let mut output = [0.0; FRAME_SIZE];
        denoise_state.process_frame(&mut output, &last_frame);

        // Only keep the non-padded samples
        denoised_samples.extend_from_slice(&output[..remainder]);
    }

    // Run through denoising a second time for more aggressive noise removal
    let mut second_pass = Vec::with_capacity(denoised_samples.len());
    let mut denoise_state_2 = DenoiseState::new();

    for chunk in denoised_samples.chunks_exact(FRAME_SIZE) {
        let mut frame = [0.0; FRAME_SIZE];
        frame.copy_from_slice(chunk);

        let mut output = [0.0; FRAME_SIZE];
        denoise_state_2.process_frame(&mut output, &frame);

        second_pass.extend_from_slice(&output);
    }

    // Handle remainder for second pass
    let remainder = denoised_samples.len() % FRAME_SIZE;
    if remainder > 0 {
        let mut last_frame = [0.0; FRAME_SIZE];
        let last_chunk = &denoised_samples[denoised_samples.len() - remainder..];
        last_frame[..remainder].copy_from_slice(last_chunk);

        let mut output = [0.0; FRAME_SIZE];
        denoise_state_2.process_frame(&mut output, &last_frame);

        second_pass.extend_from_slice(&output[..remainder]);
    }

    // Apply simple normalization to boost volume
    normalize_audio(second_pass)
}

/// Remove electrical hum at 50/60Hz and harmonics
fn remove_electrical_hum(samples: Vec<f32>) -> Vec<f32> {
    // Apply notch filters at common electrical frequencies
    let mut filtered = samples;

    // 50Hz (European) and 60Hz (American) mains frequency and their harmonics
    let hum_frequencies = [50.0, 60.0, 100.0, 120.0, 150.0, 180.0];

    for freq in hum_frequencies {
        filtered = apply_notch_filter(filtered, freq, 16000.0);
    }

    filtered
}

/// Apply a notch filter to remove a specific frequency
fn apply_notch_filter(samples: Vec<f32>, frequency: f32, sample_rate: f32) -> Vec<f32> {
    // Notch filter coefficients
    let omega = 2.0 * std::f32::consts::PI * frequency / sample_rate;
    let cos_omega = omega.cos();
    let q = 30.0; // Quality factor - higher = narrower notch
    let alpha = omega.sin() / (2.0 * q);

    // Normalized coefficients
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

/// Apply high-pass filter to remove low-frequency rumble
fn apply_high_pass_filter(samples: Vec<f32>) -> Vec<f32> {
    // Butterworth high-pass filter at 80Hz
    let cutoff = 80.0;
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

/// Simple normalization to ensure good volume levels
fn normalize_audio(samples: Vec<f32>) -> Vec<f32> {
    if samples.is_empty() {
        return samples;
    }

    // Find the peak absolute value
    let peak = samples
        .iter()
        .map(|&s| s.abs())
        .fold(0.0f32, |a, b| a.max(b));

    if peak < 0.1 {
        // If audio is very quiet, apply more aggressive normalization
        let target = 0.5;
        let gain = target / peak.max(0.001);
        samples
            .into_iter()
            .map(|s| (s * gain).clamp(-1.0, 1.0))
            .collect()
    } else {
        // Otherwise just ensure we're using full dynamic range
        let target = 0.9;
        let gain = target / peak;
        samples.into_iter().map(|s| s * gain).collect()
    }
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
