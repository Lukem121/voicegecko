use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use crossbeam_channel::{unbounded, Sender};
use rodio::{Decoder, Sink, Source};
use rubato::{FftFixedIn, Resampler};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufReader;
use std::sync::{Arc, Mutex};
use std::thread;
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

pub struct AudioState {
    pub sink: Arc<Mutex<Sink>>,
    pub recording_thread: Arc<Mutex<Option<(thread::JoinHandle<()>, Sender<AudioCommand>)>>>,
}

impl AudioState {
    pub fn new(sink: Sink) -> Self {
        Self {
            sink: Arc::new(Mutex::new(sink)),
            recording_thread: Arc::new(Mutex::new(None)),
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
    let (tx, rx) = unbounded();
    let app_handle = app.clone();

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

        let spec = hound::WavSpec {
            channels: 1, // mono
            sample_rate: TARGET_SAMPLE_RATE,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };

        let temp_dir = app.path().app_data_dir().unwrap();
        if !temp_dir.exists() {
            std::fs::create_dir_all(&temp_dir).unwrap();
        }
        let path = temp_dir.join("temp_recording.wav");

        let writer = Arc::new(Mutex::new(Some(
            hound::WavWriter::create(path, spec).unwrap(),
        )));

        let chunk_size = 1024;

        // Setup resampler
        let resampler = FftFixedIn::<f32>::new(
            input_sample_rate as usize,
            TARGET_SAMPLE_RATE as usize,
            chunk_size, // chunk size
            2,          // number of channels in internal processing
            input_channels as usize,
        )
        .unwrap();
        let resampler = Arc::new(Mutex::new(resampler));

        let audio_buffer = Arc::new(Mutex::new(Vec::new()));

        let writer_clone = writer.clone();
        let resampler_clone = resampler.clone();
        let audio_buffer_clone = audio_buffer.clone();
        let app_clone = app.clone();
        let err_fn = move |err: cpal::StreamError| {
            eprintln!("an error occurred on stream: {}", err);
            app_clone.emit("recording-error", err.to_string()).unwrap();
        };

        let stream = match config.sample_format() {
            cpal::SampleFormat::I16 => input_device
                .build_input_stream(
                    &config.into(),
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        let f32_samples: Vec<f32> =
                            data.iter().map(|s| *s as f32 / i16::MAX as f32).collect();
                        process_and_write_samples(
                            &writer_clone,
                            &mut resampler_clone.lock().unwrap(),
                            &mut audio_buffer_clone.lock().unwrap(),
                            &f32_samples,
                            input_channels,
                            chunk_size,
                        );
                    },
                    err_fn,
                    None,
                )
                .unwrap(),
            cpal::SampleFormat::F32 => input_device
                .build_input_stream(
                    &config.into(),
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        process_and_write_samples(
                            &writer_clone,
                            &mut resampler_clone.lock().unwrap(),
                            &mut audio_buffer_clone.lock().unwrap(),
                            data,
                            input_channels,
                            chunk_size,
                        );
                    },
                    err_fn,
                    None,
                )
                .unwrap(),
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
                    let required_len = resampler.input_frames_next() * input_channels as usize;
                    let missing = required_len - buffer.len();
                    buffer.extend_from_slice(&vec![0.0; missing]);

                    let waves_in = if input_channels == 2 {
                        let mut left = Vec::with_capacity(buffer.len() / 2);
                        let mut right = Vec::with_capacity(buffer.len() / 2);
                        for chunk in buffer.chunks_exact(2) {
                            left.push(chunk[0]);
                            right.push(chunk[1]);
                        }
                        vec![left, right]
                    } else {
                        vec![buffer.clone()]
                    };

                    let resampled_waves = resampler.process(&waves_in, None).unwrap();
                    write_resampled_waves(&writer, &resampled_waves);
                }

                // Finalize the writer
                if let Some(writer) = writer.lock().unwrap().take() {
                    writer.finalize().unwrap();
                }
            }
            Err(_) => {
                // Channel disconnected
            }
        }
    });

    *state.recording_thread.lock().unwrap() = Some((thread_handle, tx));

    app_handle
        .emit("recording-state-changed", "recording".to_string())
        .map_err(|e| e.to_string())
}

fn process_and_write_samples(
    writer: &Arc<Mutex<Option<hound::WavWriter<std::io::BufWriter<File>>>>>,
    resampler: &mut FftFixedIn<f32>,
    audio_buffer: &mut Vec<f32>,
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

        let waves_in = if channels == 2 {
            let mut left = Vec::with_capacity(chunk_size);
            let mut right = Vec::with_capacity(chunk_size);
            for chunk in chunk_to_process.chunks_exact(2) {
                left.push(chunk[0]);
                right.push(chunk[1]);
            }
            vec![left, right]
        } else {
            vec![chunk_to_process]
        };

        let resampled_waves = resampler.process(&waves_in, None).unwrap();
        write_resampled_waves(writer, &resampled_waves);
    }
}

fn write_resampled_waves(
    writer: &Arc<Mutex<Option<hound::WavWriter<std::io::BufWriter<File>>>>>,
    resampled_waves: &Vec<Vec<f32>>,
) {
    if let Some(writer) = writer.lock().unwrap().as_mut() {
        // Always write mono to the file
        if resampled_waves.len() > 1 {
            let left = &resampled_waves[0];
            let right = &resampled_waves[1];
            for i in 0..left.len() {
                let sample = (left[i] + right[i]) / 2.0;
                let amplitude = i16::MAX as f32;
                writer.write_sample((sample * amplitude) as i16).unwrap();
            }
        } else {
            for sample in resampled_waves[0].iter() {
                let amplitude = i16::MAX as f32;
                writer.write_sample((sample * amplitude) as i16).unwrap();
            }
        }
    }
}

#[tauri::command]
pub fn stop_recording(
    state: tauri::State<AudioState>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    if let Some((thread_handle, sender)) = state.recording_thread.lock().unwrap().take() {
        sender.send(AudioCommand::Stop).unwrap();
        thread_handle.join().unwrap();
    }

    app.emit("recording-state-changed", "idle".to_string())
        .map_err(|e| e.to_string())?;

    let temp_dir = app.path().app_data_dir().unwrap();
    let path = temp_dir.join("temp_recording.wav");

    Ok(path.to_string_lossy().to_string())
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
    state.sink.lock().unwrap().set_volume(volume);
    Ok(())
}
