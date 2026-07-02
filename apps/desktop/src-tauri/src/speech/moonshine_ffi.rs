//! Moonshine C API via libloading — loaded when DLL + models are present.

use libloading::Library;
use parking_lot::Mutex;
use std::ffi::{CStr, CString};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use tauri::{AppHandle, Manager};

use crate::speech::stt_log;

const ENGINE: &str = "moonshine";

const MOONSHINE_HEADER_VERSION: i32 = 20_000;
const MOONSHINE_MODEL_ARCH_MEDIUM_STREAMING: u32 = 5;

type LoadTranscriberFn = unsafe extern "C" fn(
    *const i8,
    u32,
    *const std::ffi::c_void,
    u64,
    i32,
) -> i32;

type TranscribeBatchFn = unsafe extern "C" fn(
    i32,
    *mut f32,
    u64,
    i32,
    u32,
    *mut *mut std::ffi::c_void,
) -> i32;

type TranscribeAddAudioFn = unsafe extern "C" fn(
    i32,
    i32,
    *const f32,
    u64,
    i32,
    u32,
) -> i32;

type TranscribeStreamFn = unsafe extern "C" fn(
    i32,
    i32,
    u32,
    *mut *mut std::ffi::c_void,
) -> i32;

type CreateStreamFn = unsafe extern "C" fn(i32, u32) -> i32;
type StartStreamFn = unsafe extern "C" fn(i32, i32) -> i32;
type TranscriptToStringFn = unsafe extern "C" fn(*const std::ffi::c_void) -> *const i8;
type ErrorToStringFn = unsafe extern "C" fn(i32) -> *const i8;
type FreeTranscriberFn = unsafe extern "C" fn(i32);
type FreeStreamFn = unsafe extern "C" fn(i32, i32);

struct MoonshineApi {
    _lib: Library,
    load_transcriber: LoadTranscriberFn,
    transcribe_batch: TranscribeBatchFn,
    create_stream: CreateStreamFn,
    start_stream: StartStreamFn,
    add_audio: TranscribeAddAudioFn,
    transcribe_stream: TranscribeStreamFn,
    transcript_to_string: TranscriptToStringFn,
    error_to_string: ErrorToStringFn,
    free_transcriber: FreeTranscriberFn,
    free_stream: FreeStreamFn,
}

struct MoonshineSession {
    api: &'static MoonshineApi,
    transcriber: i32,
    stream: Option<i32>,
}

static API: OnceLock<Result<MoonshineApi, String>> = OnceLock::new();
static SESSION: Mutex<Option<MoonshineSession>> = Mutex::new(None);

fn moonshine_root() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("voicegecko")
        .join("moonshine")
}

pub fn dll_path() -> PathBuf {
    moonshine_root().join("moonshine.dll")
}

fn model_path() -> PathBuf {
    let root = moonshine_root();
    let catalog_path = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("voicegecko")
        .join("models")
        .join("moonshine-medium-streaming");

    let candidates = [
        root.join("models").join("medium-streaming"),
        root.join("medium-streaming"),
        catalog_path.clone(),
        root.clone(),
    ];
    for path in candidates {
        if path.join("encoder_model.ort").exists() {
            return path;
        }
    }
    catalog_path
}

pub fn is_available() -> bool {
    dll_path().exists() && model_path().join("encoder_model.ort").exists()
}

pub fn availability_status() -> String {
    if !dll_path().exists() {
        return format!("Moonshine DLL missing at {}", dll_path().display());
    }
    let models = model_path();
    if !models.join("encoder_model.ort").exists() {
        return format!(
            "Moonshine models missing (expected encoder_model.ort under {})",
            models.display()
        );
    }
    "ready".to_string()
}

/// Copy bundled moonshine.dll from app resources when present.
pub fn install_bundled_assets(app: &AppHandle) -> Result<bool, String> {
    if dll_path().exists() {
        return Ok(true);
    }

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(path) = app.path().resolve(
        "resources/binaries/moonshine/win-x64/moonshine.dll",
        tauri::path::BaseDirectory::Resource,
    ) {
        candidates.push(path);
    }
    candidates.push(PathBuf::from(
        "apps/desktop/src-tauri/resources/binaries/moonshine/win-x64/moonshine.dll",
    ));

    for src in candidates {
        if !src.is_file() {
            continue;
        }
        if let Some(parent) = dll_path().parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::copy(&src, dll_path()).map_err(|e| e.to_string())?;
        stt_log::info(
            ENGINE,
            &format!("Installed moonshine.dll from {}", src.display()),
        );
        return Ok(true);
    }

    Ok(false)
}

fn copy_model_tree(from: &Path, to: &Path) -> Result<(), String> {
    if !from.join("encoder_model.ort").is_file() {
        return Err(format!(
            "Source models missing encoder_model.ort at {}",
            from.display()
        ));
    }

    fs::create_dir_all(to).map_err(|e| e.to_string())?;

    for entry in fs::read_dir(from).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src = entry.path();
        let dest = to.join(entry.file_name());
        if src.is_file() {
            fs::copy(&src, &dest).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

fn known_model_source_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if let Some(local) = dirs::data_local_dir() {
        dirs.push(
            local
                .join("voicegecko")
                .join("models")
                .join("moonshine-medium-streaming"),
        );
        dirs.push(local.join("voicegecko").join("moonshine").join("models"));
        dirs.push(
            local
                .join("voicegecko")
                .join("moonshine")
                .join("models")
                .join("medium-streaming"),
        );
        dirs.push(
            local
                .join("voicegecko")
                .join("moonshine")
                .join("medium-streaming"),
        );
    }
    if let Some(home) = dirs::home_dir() {
        dirs.push(home.join(".moonshine").join("models").join("medium-streaming"));
        dirs.push(home.join(".cache").join("moonshine").join("medium-streaming"));
    }
    dirs
}

/// Copy Moonshine ORT models from known install locations into the canonical path.
pub fn bootstrap_models() -> Result<bool, String> {
    if is_available() {
        return Ok(true);
    }

    let dest = model_path();
    for src in known_model_source_dirs() {
        if !src.join("encoder_model.ort").is_file() {
            continue;
        }
        if src == dest {
            return Ok(true);
        }
        copy_model_tree(&src, &dest)?;
        stt_log::info(
            ENGINE,
            &format!("Copied Moonshine models from {} to {}", src.display(), dest.display()),
        );
        return Ok(true);
    }

    Ok(false)
}

fn load_api() -> Result<&'static MoonshineApi, String> {
    API.get_or_init(|| {
        let path = dll_path();
        if !path.exists() {
            let status = availability_status();
            stt_log::warn(ENGINE, &status);
            return Err(format!("Moonshine DLL not found at {}", path.display()));
        }

        stt_log::info(ENGINE, &format!("Loading Moonshine DLL from {}", path.display()));

        unsafe {
            let lib = Library::new(&path).map_err(|e| e.to_string())?;
            let load_transcriber = *lib
                .get::<LoadTranscriberFn>(b"moonshine_load_transcriber_from_files\0")
                .map_err(|e| e.to_string())?;
            let transcribe_batch = *lib
                .get::<TranscribeBatchFn>(b"moonshine_transcribe_without_streaming\0")
                .map_err(|e| e.to_string())?;
            let create_stream = *lib
                .get::<CreateStreamFn>(b"moonshine_create_stream\0")
                .map_err(|e| e.to_string())?;
            let start_stream = *lib
                .get::<StartStreamFn>(b"moonshine_start\0")
                .map_err(|e| e.to_string())?;
            let add_audio = *lib
                .get::<TranscribeAddAudioFn>(b"moonshine_transcribe_add_audio_to_stream\0")
                .map_err(|e| e.to_string())?;
            let transcribe_stream = *lib
                .get::<TranscribeStreamFn>(b"moonshine_transcribe_stream\0")
                .map_err(|e| e.to_string())?;
            let transcript_to_string = *lib
                .get::<TranscriptToStringFn>(b"moonshine_transcript_to_string\0")
                .map_err(|e| e.to_string())?;
            let error_to_string = *lib
                .get::<ErrorToStringFn>(b"moonshine_error_to_string\0")
                .map_err(|e| e.to_string())?;
            let free_transcriber = *lib
                .get::<FreeTranscriberFn>(b"moonshine_free_transcriber\0")
                .map_err(|e| e.to_string())?;
            let free_stream = *lib
                .get::<FreeStreamFn>(b"moonshine_free_stream\0")
                .map_err(|e| e.to_string())?;

            Ok(MoonshineApi {
                _lib: lib,
                load_transcriber,
                transcribe_batch,
                create_stream,
                start_stream,
                add_audio,
                transcribe_stream,
                transcript_to_string,
                error_to_string,
                free_transcriber,
                free_stream,
            })
        }
    })
    .as_ref()
    .map_err(|e| e.clone())
}

fn moonshine_error(api: &MoonshineApi, code: i32) -> String {
    unsafe {
        let ptr = (api.error_to_string)(code);
        if ptr.is_null() {
            format!("Moonshine error code {code}")
        } else {
            CStr::from_ptr(ptr).to_string_lossy().into_owned()
        }
    }
}

fn transcript_text(api: &MoonshineApi, transcript: *mut std::ffi::c_void) -> String {
    if transcript.is_null() {
        return String::new();
    }
    unsafe {
        let ptr = (api.transcript_to_string)(transcript);
        if ptr.is_null() {
            String::new()
        } else {
            CStr::from_ptr(ptr).to_string_lossy().into_owned()
        }
    }
}

fn ensure_session() -> Result<(), String> {
    if SESSION.lock().is_some() {
        return Ok(());
    }

    let api = load_api()?;
    let model_dir = model_path();
    let c_path = CString::new(model_dir.to_string_lossy().into_owned())
        .map_err(|e| e.to_string())?;

    let handle = unsafe {
        (api.load_transcriber)(
            c_path.as_ptr(),
            MOONSHINE_MODEL_ARCH_MEDIUM_STREAMING,
            std::ptr::null(),
            0,
            MOONSHINE_HEADER_VERSION,
        )
    };

    if handle < 0 {
        let err = moonshine_error(api, handle);
        stt_log::error_fmt(ENGINE, &err);
        return Err(err);
    }

    stt_log::info(
        ENGINE,
        &format!("Moonshine session ready (models: {})", model_dir.display()),
    );

    *SESSION.lock() = Some(MoonshineSession {
        api,
        transcriber: handle,
        stream: None,
    });
    Ok(())
}

fn ensure_stream(session: &mut MoonshineSession) -> Result<i32, String> {
    if let Some(stream) = session.stream {
        return Ok(stream);
    }

    let stream = unsafe { (session.api.create_stream)(session.transcriber, 0) };
    if stream < 0 {
        return Err(moonshine_error(session.api, stream));
    }

    let start = unsafe { (session.api.start_stream)(session.transcriber, stream) };
    if start < 0 {
        return Err(moonshine_error(session.api, start));
    }

    session.stream = Some(stream);
    Ok(stream)
}

pub fn prewarm() -> Result<(), String> {
    ensure_session()
}

pub fn transcribe_stream_chunk(samples: &[f32], sample_rate: u32) -> Result<String, String> {
    ensure_session()?;
    let mut guard = SESSION.lock();
    let session = guard.as_mut().ok_or("Moonshine session not initialized")?;
    let stream = ensure_stream(session)?;

    let add = unsafe {
        (session.api.add_audio)(
            session.transcriber,
            stream,
            samples.as_ptr(),
            samples.len() as u64,
            sample_rate as i32,
            0,
        )
    };
    if add < 0 {
        return Err(moonshine_error(session.api, add));
    }

    let mut transcript: *mut std::ffi::c_void = std::ptr::null_mut();
    let code = unsafe {
        (session.api.transcribe_stream)(session.transcriber, stream, 0, &mut transcript)
    };
    if code < 0 {
        return Err(moonshine_error(session.api, code));
    }

    Ok(transcript_text(session.api, transcript))
}

pub fn transcribe_batch(samples: &[f32], sample_rate: u32) -> Result<String, String> {
    ensure_session()?;
    let guard = SESSION.lock();
    let session = guard.as_ref().ok_or("Moonshine session not initialized")?;

    let mut audio = samples.to_vec();
    let mut transcript: *mut std::ffi::c_void = std::ptr::null_mut();
    let code = unsafe {
        (session.api.transcribe_batch)(
            session.transcriber,
            audio.as_mut_ptr(),
            audio.len() as u64,
            sample_rate as i32,
            0,
            &mut transcript,
        )
    };
    if code < 0 {
        return Err(moonshine_error(session.api, code));
    }

    Ok(transcript_text(session.api, transcript))
}
