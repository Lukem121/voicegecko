use rodio::{Decoder, Sink, Source};
use std::fs::File;
use std::io::BufReader;
use std::sync::{Arc, Mutex};
use tauri::Manager;

use crate::audio::types::SoundVariant;

pub fn play(
    sink: &Arc<Mutex<Option<Sink>>>,
    app: &tauri::AppHandle,
    sound_name: String,
    variant: SoundVariant,
) -> Result<(), String> {
    let sound_path = app
        .path()
        .resolve(
            format!("resources/sounds/notification/{sound_name}"),
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| e.to_string())?;

    let file = BufReader::new(
        File::open(&sound_path)
            .map_err(|e| format!("Failed to open sound file at {sound_path:?}: {e}"))?,
    );

    let source = Decoder::new(file).map_err(|e| e.to_string())?;

    let modified_source = match variant {
        SoundVariant::Start => source.speed(1.0).convert_samples::<f32>(),
        SoundVariant::End => source.speed(0.85).convert_samples::<f32>(),
    };

    if let Some(ref mut s) = *sink.lock().map_err(|e| e.to_string())? {
        s.append(modified_source);
    }

    Ok(())
}

pub fn set_volume(sink: &Arc<Mutex<Option<Sink>>>, volume: f32) -> Result<(), String> {
    if !(0.0..=1.0).contains(&volume) {
        return Err(format!("Volume must be between 0.0 and 1.0, got {volume}"));
    }
    if let Some(ref mut s) = *sink.lock().map_err(|e| e.to_string())? {
        s.set_volume(volume);
    }
    Ok(())
}
