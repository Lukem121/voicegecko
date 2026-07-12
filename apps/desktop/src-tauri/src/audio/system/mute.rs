#[cfg(target_os = "windows")]
pub fn set_system_audio_mute(mute: bool) -> Result<(), String> {
    use windows::Win32::Media::Audio::{
        eConsole, eRender, Endpoints::IAudioEndpointVolume, IMMDeviceEnumerator, MMDeviceEnumerator,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_APARTMENTTHREADED,
    };

    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| format!("Failed to create device enumerator: {e}"))?;

        let device = enumerator
            .GetDefaultAudioEndpoint(eRender, eConsole)
            .map_err(|e| format!("Failed to get default audio endpoint: {e}"))?;

        let volume = device
            .Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None)
            .map_err(|e| format!("Failed to get volume interface: {e}"))?;

        volume
            .SetMute(mute, std::ptr::null())
            .map_err(|e| format!("Failed to set mute state: {e}"))?;
    }

    Ok(())
}

#[cfg(target_os = "macos")]
pub fn set_system_audio_mute(_mute: bool) -> Result<(), String> {
    Err("System audio muting not yet implemented for macOS".to_string())
}

#[cfg(target_os = "linux")]
pub fn set_system_audio_mute(_mute: bool) -> Result<(), String> {
    Err("System audio muting not yet implemented for Linux".to_string())
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
pub fn set_system_audio_mute(_mute: bool) -> Result<(), String> {
    Err("System audio muting not supported on this platform".to_string())
}

pub fn mute_system_audio() -> Result<(), String> {
    set_system_audio_mute(true)
}

pub fn unmute_system_audio() -> Result<(), String> {
    set_system_audio_mute(false)
}
