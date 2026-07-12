use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Manager};

use crate::speech::stt_log;

const ENGINE: &str = "gpu_whisper";
const SIDECAR_VERSION: &str = "whisper-sidecar-v2";
const VERSION_MARKER: &str = ".whisper-sidecar-version";

pub fn sidecar_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("voicegecko")
        .join("sidecars")
        .join("whisper")
}

pub fn sidecar_exe() -> PathBuf {
    sidecar_dir().join("WhisperSidecar.exe")
}

fn version_marker_path() -> PathBuf {
    sidecar_dir().join(VERSION_MARKER)
}

fn sidecar_version_matches() -> bool {
    fs::read_to_string(version_marker_path())
        .map(|contents| contents.trim() == SIDECAR_VERSION)
        .unwrap_or(false)
}

pub fn whisper_model_path() -> Option<PathBuf> {
    crate::modules::model_manager::legacy_whisper_model_path()
}

pub fn selected_model_id(app: &AppHandle) -> String {
    crate::modules::model_manager::get_gpu_whisper_model_id(app.clone()).unwrap_or_else(|_| {
        crate::modules::model_manager::DEFAULT_GPU_WHISPER_MODEL_ID.to_string()
    })
}

pub fn whisper_model_path_for_app(app: &AppHandle) -> Option<PathBuf> {
    let model_id = selected_model_id(app);
    crate::modules::model_manager::model_file_path(app, &model_id)
}

fn sidecar_layout_valid(dir: &Path) -> bool {
    let exe = dir.join("WhisperSidecar.exe");
    if !exe.is_file() {
        return false;
    }

    let native_whisper = dir.join("runtimes").join("win-x64").join("whisper.dll");
    if !native_whisper.is_file() {
        return false;
    }

    let managed_dll = dir.join("WhisperSidecar.dll");
    if managed_dll.is_file() {
        return true;
    }

    // Single-file self-contained publish embeds the runtime in the exe (~60MB+).
    exe.metadata()
        .map(|meta| meta.len() > 1_000_000)
        .unwrap_or(false)
}

pub fn is_sidecar_installed() -> bool {
    let dir = sidecar_dir();
    sidecar_layout_valid(&dir) && sidecar_version_matches()
}

pub fn is_ready() -> bool {
    is_sidecar_installed() && whisper_model_path().is_some()
}

pub fn is_ready_for_app(app: &AppHandle) -> bool {
    is_sidecar_installed() && whisper_model_path_for_app(app).is_some()
}

fn write_version_marker() -> Result<(), String> {
    if let Some(parent) = version_marker_path().parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(version_marker_path(), SIDECAR_VERSION).map_err(|e| e.to_string())
}

fn bundled_sidecar_dir_candidates(app: &AppHandle) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(path) = app.path().resolve(
        "resources/binaries/whisper-sidecar/win-x64",
        tauri::path::BaseDirectory::Resource,
    ) {
        candidates.push(path);
    }
    candidates.push(PathBuf::from(
        "apps/desktop/src-tauri/resources/binaries/whisper-sidecar/win-x64",
    ));
    candidates
}

fn copy_dir_recursive(src: &Path, dest: &Path) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;

    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let dest_path = dest.join(entry.file_name());

        if path.is_dir() {
            copy_dir_recursive(&path, &dest_path)?;
        } else if path.is_file() {
            fs::copy(&path, &dest_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

fn remove_stale_sidecar() -> Result<(), String> {
    let dir = sidecar_dir();
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn install_sidecar_from_dir(src_dir: &Path) -> Result<(), String> {
    if !sidecar_layout_valid(src_dir) {
        return Err(format!(
            "Bundled WhisperSidecar layout is incomplete at {}",
            src_dir.display()
        ));
    }

    remove_stale_sidecar()?;
    copy_dir_recursive(src_dir, &sidecar_dir())?;
    write_version_marker()?;
    stt_log::info(
        ENGINE,
        &format!("Installed WhisperSidecar bundle from {}", src_dir.display()),
    );
    Ok(())
}

fn copy_bundled_sidecar(app: &AppHandle) -> Result<bool, String> {
    for src_dir in bundled_sidecar_dir_candidates(app) {
        if !src_dir.is_dir() || !src_dir.join("WhisperSidecar.exe").is_file() {
            continue;
        }
        install_sidecar_from_dir(&src_dir)?;
        return Ok(true);
    }
    Ok(false)
}

pub fn ensure_whisper_model(app: &AppHandle) -> Result<Option<PathBuf>, String> {
    if let Some(path) = whisper_model_path_for_app(app) {
        return Ok(Some(path));
    }

    stt_log::info(ENGINE, "Whisper model missing — running model sync");
    let _ = crate::modules::model_manager::synchronize_models(app.clone());
    Ok(whisper_model_path_for_app(app))
}

pub async fn ensure_sidecar_installed(app: &AppHandle) -> Result<(), String> {
    if is_sidecar_installed() {
        return Ok(());
    }

    if sidecar_dir().exists() {
        stt_log::warn(ENGINE, "Removing incomplete WhisperSidecar install");
        remove_stale_sidecar()?;
    }

    if copy_bundled_sidecar(app)? {
        return Ok(());
    }

    Err("GPU Whisper is not installed yet. Restart the app or use Engine Lab to set it up.".into())
}

fn configure_hidden_command(exe: &Path, workdir: &Path) -> Command {
    let mut command = Command::new(exe);
    command
        .current_dir(workdir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    command
}

pub fn write_temp_wav(samples: &[f32], sample_rate: u32) -> Result<PathBuf, String> {
    let dir = std::env::temp_dir().join("voicegecko-whisper");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("clip_{}.wav", uuid::Uuid::new_v4()));

    let spec = hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::create(&path, spec).map_err(|e| e.to_string())?;
    for &s in samples {
        let v = (s.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
        writer.write_sample(v).map_err(|e| e.to_string())?;
    }
    writer.finalize().map_err(|e| e.to_string())?;
    Ok(path)
}

fn parse_sidecar_json(stdout: &str) -> Result<String, String> {
    let trimmed = stdout.trim();
    if trimmed.is_empty() {
        return Err("Whisper sidecar returned empty output".into());
    }

    let value: serde_json::Value =
        serde_json::from_str(trimmed).map_err(|e| format!("Invalid sidecar JSON: {e}"))?;

    if let Some(error) = value.get("error").and_then(|v| v.as_str()) {
        return Err(format!("Whisper sidecar error: {error}"));
    }

    value
        .get("text")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "Whisper sidecar returned empty transcript".into())
}

pub fn transcribe_wav_file(model_path: &Path, wav_path: &Path) -> Result<String, String> {
    if !is_sidecar_installed() {
        return Err("WhisperSidecar not installed".into());
    }

    let exe = sidecar_exe();
    stt_log::info_fmt(
        ENGINE,
        format!(
            "Transcribing {} with model {}",
            wav_path.display(),
            model_path.display()
        ),
    );

    let output = configure_hidden_command(&exe, &sidecar_dir())
        .arg("--model")
        .arg(model_path)
        .arg("--input")
        .arg(wav_path)
        .arg("--language")
        .arg("en")
        .output()
        .map_err(|e| format!("Failed to launch WhisperSidecar: {e}"))?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    if !stderr.trim().is_empty() {
        stt_log::debug(ENGINE, &stderr);
    }

    if !output.status.success() {
        return Err(format!(
            "WhisperSidecar failed (status {:?}): {}",
            output.status.code(),
            stderr.trim()
        ));
    }

    parse_sidecar_json(&String::from_utf8_lossy(&output.stdout))
}

pub fn transcribe_samples(app: &AppHandle, samples: &[f32], sample_rate: u32) -> Result<String, String> {
    let model_path = whisper_model_path_for_app(app).ok_or("Whisper ggml model not found")?;
    let wav = write_temp_wav(samples, sample_rate)?;
    let result = transcribe_wav_file(&model_path, &wav);
    let _ = fs::remove_file(&wav);
    result
}

fn summarize_text(text: &str, max_chars: usize) -> String {
    let trimmed = text.trim();
    if trimmed.chars().count() <= max_chars {
        return trimmed.to_string();
    }
    trimmed.chars().take(max_chars).collect::<String>() + "…"
}

pub fn compare_ready_models_on_samples(
    app: &AppHandle,
    samples: &[f32],
    sample_rate: u32,
) -> Result<crate::dictation::types::WhisperModelCompareResponse, String> {
    use crate::dictation::types::WhisperModelCompareResult;
    use crate::modules::model_manager::{self, ModelStatus};
    use std::time::Instant;

    if samples.is_empty() {
        return Err("Audio samples are empty".into());
    }
    if !is_sidecar_installed() {
        return Err("WhisperSidecar not installed — restart the app or run optional bootstrap".into());
    }

    let catalog =
        model_manager::list_gpu_whisper_models(app.clone()).map_err(|e| e.to_string())?;
    let selected_id =
        model_manager::get_gpu_whisper_model_id(app.clone()).map_err(|e| e.to_string())?;

    let ready: Vec<_> = catalog
        .into_iter()
        .filter(|entry| {
            entry.status == ModelStatus::Downloaded
                && model_manager::model_file_path(app, &entry.id).is_some()
        })
        .collect();

    if ready.is_empty() {
        return Err(
            "No Whisper models ready — download at least one model above, then try again".into(),
        );
    }

    stt_log::info_fmt(
        ENGINE,
        format!(
            "Comparing {} ready Whisper model(s) on {:.1}s clip",
            ready.len(),
            samples.len() as f64 / sample_rate as f64
        ),
    );

    let wav = write_temp_wav(samples, sample_rate)?;
    let mut results = Vec::with_capacity(ready.len());

    for entry in ready {
        let Some(model_path) = model_manager::model_file_path(app, &entry.id) else {
            results.push(WhisperModelCompareResult {
                model_id: entry.id.clone(),
                model_name: entry.name.clone(),
                text: String::new(),
                text_snippet: "Model file missing".into(),
                latency_ms: 0,
                available: false,
                selected: entry.id == selected_id,
            });
            continue;
        };

        let start = Instant::now();
        match transcribe_wav_file(&model_path, &wav) {
            Ok(text) => {
                let snippet = summarize_text(&text, 160);
                results.push(WhisperModelCompareResult {
                    model_id: entry.id.clone(),
                    model_name: entry.name.clone(),
                    text_snippet: snippet,
                    text: text.clone(),
                    latency_ms: start.elapsed().as_millis() as u64,
                    available: true,
                    selected: entry.id == selected_id,
                });
            }
            Err(err) => {
                stt_log::error_fmt(ENGINE, &err);
                results.push(WhisperModelCompareResult {
                    model_id: entry.id.clone(),
                    model_name: entry.name.clone(),
                    text: String::new(),
                    text_snippet: summarize_text(&err, 160),
                    latency_ms: start.elapsed().as_millis() as u64,
                    available: false,
                    selected: entry.id == selected_id,
                });
            }
        }
    }

    let _ = fs::remove_file(&wav);

    results.sort_by(|left, right| {
        right
            .selected
            .cmp(&left.selected)
            .then_with(|| left.model_name.cmp(&right.model_name))
    });

    Ok(crate::dictation::types::WhisperModelCompareResponse {
        sample_id: "last_dictation".into(),
        sample_label: format!(
            "Last dictation ({:.1}s @ {} Hz)",
            samples.len() as f64 / sample_rate as f64,
            sample_rate
        ),
        results,
    })
}
