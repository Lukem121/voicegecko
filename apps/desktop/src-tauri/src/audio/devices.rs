use cpal::traits::{DeviceTrait, HostTrait};
use crate::audio::types::AudioDevice;

pub fn list_devices() -> Result<Vec<AudioDevice>, String> {
    let host = cpal::default_host();
    let devices = host.input_devices().map_err(|e| e.to_string())?;

    Ok(devices
        .filter_map(|device| {
            device
                .name()
                .ok()
                .map(|name| AudioDevice { name })
        })
        .collect())
}

pub fn validate_device(device_name: Option<&str>) -> Result<(), String> {
    let host = cpal::default_host();
    match device_name {
        Some(name) => {
            let exists = host
                .input_devices()
                .map_err(|e| e.to_string())?
                .filter_map(|d| d.name().ok())
                .any(|n| n == name);
            if exists {
                Ok(())
            } else {
                Err(format!("Audio device '{name}' not found"))
            }
        }
        None => {
            if host.default_input_device().is_some() {
                Ok(())
            } else {
                Err("No default audio input device found".to_string())
            }
        }
    }
}

pub fn resolve_input_device(
    device_name: Option<&str>,
) -> Result<cpal::Device, String> {
    let host = cpal::default_host();
    match device_name {
        Some(name) => host
            .input_devices()
            .map_err(|e| e.to_string())?
            .find(|d| d.name().map(|n| n == name).unwrap_or(false))
            .ok_or_else(|| format!("Audio device '{name}' not found during spawn")),
        None => host
            .default_input_device()
            .ok_or_else(|| "No default input device".to_string()),
    }
}
