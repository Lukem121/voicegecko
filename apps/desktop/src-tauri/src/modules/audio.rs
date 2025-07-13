use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use crossbeam_channel::{unbounded, Sender};
use rodio::{Decoder, Sink};
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

pub struct AudioState {
    pub sink: Arc<Mutex<Sink>>,
    pub recording_thread: Arc<Mutex<Option<(thread::JoinHandle<()>, Sender<AudioCommand>)>>>,
}

impl AudioState {
    pub fn new() -> Self {
        let (_stream, stream_handle) = rodio::OutputStream::try_default().unwrap();
        let sink = Sink::try_new(&stream_handle).unwrap();
        // Leak the stream handle to keep it alive for sound playback
        std::mem::forget(stream_handle);
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
        let spec = hound::WavSpec {
            channels: config.channels() as u16,
            sample_rate: config.sample_rate().0,
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

        let writer_clone = writer.clone();
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
                        if let Some(writer) = writer_clone.lock().unwrap().as_mut() {
                            for &sample in data.iter() {
                                writer.write_sample(sample).unwrap();
                            }
                        }
                    },
                    err_fn,
                    None,
                )
                .unwrap(),
            cpal::SampleFormat::F32 => input_device
                .build_input_stream(
                    &config.into(),
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        if let Some(writer) = writer_clone.lock().unwrap().as_mut() {
                            for &sample in data.iter() {
                                let amplitude = i16::MAX as f32;
                                writer.write_sample((sample * amplitude) as i16).unwrap();
                            }
                        }
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

#[tauri::command]
pub fn stop_recording(
    state: tauri::State<AudioState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    if let Some((thread_handle, sender)) = state.recording_thread.lock().unwrap().take() {
        sender.send(AudioCommand::Stop).unwrap();
        thread_handle.join().unwrap();
    }

    app.emit("recording-state-changed", "idle".to_string())
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn play_notification_sound(
    state: tauri::State<AudioState>,
    app: tauri::AppHandle,
    sound_name: String,
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
    state.sink.lock().unwrap().append(source);
    Ok(())
}
