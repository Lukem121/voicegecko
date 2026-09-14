use once_cell::sync::Lazy;
use parking_lot::Mutex;
use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use tauri::{AppHandle, Emitter, Manager};

use crate::speech::stt_log;

const ENGINE: &str = "gpu_whisper";
const SIDECAR_VERSION: &str = "whisper-sidecar-v3";
const VERSION_MARKER: &str = ".whisper-sidecar-version";
const FALLBACK_MODEL_IDS: &[&str] = &["small.en", "base.en", "large-v3-turbo"];

struct PersistentSidecar {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<std::process::ChildStdout>,
    model_path: PathBuf,
}

static SERVER: Lazy<Mutex<Option<PersistentSidecar>>> = Lazy::new(|| Mutex::new(None));

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
    if let Some(path) = crate::modules::model_manager::model_file_path(app, &model_id) {
        return Some(path);
    }
    for id in FALLBACK_MODEL_IDS {
        if let Some(path) = crate::modules::model_manager::model_file_path(app, id) {
            return Some(path);
        }
    }
    crate::modules::model_manager::legacy_whisper_model_path()
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
    sidecar_layout_valid(&sidecar_dir())
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
    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("resources/binaries/whisper-sidecar/win-x64"));
        candidates.push(resource_dir.join("binaries/whisper-sidecar/win-x64"));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("resources/binaries/whisper-sidecar/win-x64"));
            candidates.push(dir.join("whisper-sidecar/win-x64"));
        }
    }
    candidates.push(PathBuf::from(
        "apps/desktop/src-tauri/resources/binaries/whisper-sidecar/win-x64",
    ));
    candidates.push(PathBuf::from(
        "src-tauri/resources/binaries/whisper-sidecar/win-x64",
    ));
    candidates
}

fn collect_copy_jobs(
    src: &Path,
    dest: &Path,
    jobs: &mut Vec<(PathBuf, PathBuf, u64)>,
) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;

    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let dest_path = dest.join(entry.file_name());
        if path.is_dir() {
            collect_copy_jobs(&path, &dest_path, jobs)?;
        } else if path.is_file() {
            let size = path.metadata().map(|meta| meta.len()).unwrap_or(0);
            jobs.push((path, dest_path, size));
        }
    }

    Ok(())
}

fn copy_dir_with_progress(app: &AppHandle, src: &Path, dest: &Path) -> Result<(), String> {
    let mut jobs = Vec::new();
    collect_copy_jobs(src, dest, &mut jobs)?;
    let total: u64 = jobs.iter().map(|job| job.2).sum::<u64>().max(1);
    let mut copied = 0u64;
    let mut last_emitted = 0u8;

    crate::speech::download_events::emit_download_progress(app, "whisper_sidecar", 0, "downloading");

    for (src_path, dest_path, size) in jobs {
        if let Some(parent) = dest_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        if size > 4_000_000 {
            let mut input = fs::File::open(&src_path).map_err(|e| e.to_string())?;
            let mut output = fs::File::create(&dest_path).map_err(|e| e.to_string())?;
            let mut buffer = [0u8; 262_144];
            loop {
                let read = input.read(&mut buffer).map_err(|e| e.to_string())?;
                if read == 0 {
                    break;
                }
                output
                    .write_all(&buffer[..read])
                    .map_err(|e| e.to_string())?;
                copied += read as u64;
                let progress = ((copied as f64 / total as f64) * 100.0).floor() as u8;
                let progress = progress.min(99);
                if progress >= last_emitted.saturating_add(1) {
                    last_emitted = progress;
                    crate::speech::download_events::emit_download_progress(
                        app,
                        "whisper_sidecar",
                        progress,
                        "downloading",
                    );
                }
            }
            output.flush().map_err(|e| e.to_string())?;
        } else {
            fs::copy(&src_path, &dest_path).map_err(|e| e.to_string())?;
            copied += size;
            let progress = ((copied as f64 / total as f64) * 100.0).floor() as u8;
            let progress = progress.min(99);
            if progress >= last_emitted.saturating_add(1) {
                last_emitted = progress;
                crate::speech::download_events::emit_download_progress(
                    app,
                    "whisper_sidecar",
                    progress,
                    "downloading",
                );
            }
        }
    }

    crate::speech::download_events::emit_download_progress(app, "whisper_sidecar", 100, "complete");
    Ok(())
}

fn remove_stale_sidecar() -> Result<(), String> {
    let dir = sidecar_dir();
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn install_sidecar_from_dir(app: &AppHandle, src_dir: &Path) -> Result<(), String> {
    if !sidecar_layout_valid(src_dir) {
        return Err(format!(
            "Bundled WhisperSidecar layout is incomplete at {}",
            src_dir.display()
        ));
    }

    remove_stale_sidecar()?;
    copy_dir_with_progress(app, src_dir, &sidecar_dir())?;
    write_version_marker()?;
    stt_log::info(
        ENGINE,
        &format!("Installed WhisperSidecar bundle from {}", src_dir.display()),
    );
    Ok(())
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
    if is_sidecar_installed() && sidecar_version_matches() {
        return Ok(());
    }

    let bundled = bundled_sidecar_dir_candidates(app)
        .into_iter()
        .find(|dir| sidecar_layout_valid(dir));

    if let Some(src_dir) = bundled {
        install_sidecar_from_dir(app, &src_dir)?;
        return Ok(());
    }

    if is_sidecar_installed() {
        stt_log::warn(
            ENGINE,
            "Using existing WhisperSidecar; bundled copy was not found to upgrade",
        );
        return Ok(());
    }

    Err("Whisper is not installed yet. Restart the app or open Settings → Speed & accuracy.".into())
}

pub fn invalidate_server() {
    let mut guard = SERVER.lock();
    if let Some(mut server) = guard.take() {
        let _ = server.child.kill();
        let _ = server.child.wait();
        stt_log::info(ENGINE, "Stopped persistent WhisperSidecar");
    }
}

fn child_alive(child: &mut Child) -> bool {
    match child.try_wait() {
        Ok(None) => true,
        _ => false,
    }
}

fn start_server(model_path: &Path) -> Result<PersistentSidecar, String> {
    if !is_sidecar_installed() {
        return Err("WhisperSidecar not installed".into());
    }

    let exe = sidecar_exe();
    let mut command = configure_hidden_command(&exe, &sidecar_dir());
    command
        .stdin(Stdio::piped())
        .stderr(Stdio::inherit())
        .arg("--server")
        .arg("--model")
        .arg(model_path)
        .arg("--language")
        .arg("en");

    stt_log::info_fmt(
        ENGINE,
        format!("Starting persistent WhisperSidecar with {}", model_path.display()),
    );

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to launch WhisperSidecar server: {e}"))?;
    let stdin = child
        .stdin
        .take()
        .ok_or("WhisperSidecar stdin not piped")?;
    let stdout = child
        .stdout
        .take()
        .ok_or("WhisperSidecar stdout not piped")?;
    let mut stdout = BufReader::new(stdout);

    let mut ready_line = String::new();
    stdout
        .read_line(&mut ready_line)
        .map_err(|e| format!("Failed to read WhisperSidecar handshake: {e}"))?;
    let ready: serde_json::Value = serde_json::from_str(ready_line.trim())
        .map_err(|e| format!("Invalid WhisperSidecar handshake: {e}"))?;
    if let Some(error) = ready.get("error").and_then(|v| v.as_str()) {
        let _ = child.kill();
        return Err(format!("WhisperSidecar server failed: {error}"));
    }
    if ready.get("ready").and_then(|v| v.as_bool()) != Some(true) {
        let _ = child.kill();
        return Err("WhisperSidecar server did not become ready".into());
    }

    Ok(PersistentSidecar {
        child,
        stdin,
        stdout,
        model_path: model_path.to_path_buf(),
    })
}

fn transcribe_via_server(
    model_path: &Path,
    wav_path: &Path,
    prompt: Option<&str>,
) -> Result<String, String> {
    let mut guard = SERVER.lock();
    let restart = match guard.as_mut() {
        Some(server) => {
            server.model_path != model_path || !child_alive(&mut server.child)
        }
        None => true,
    };
    if restart {
        if let Some(mut server) = guard.take() {
            let _ = server.child.kill();
            let _ = server.child.wait();
        }
        *guard = Some(start_server(model_path)?);
    }

    let server = guard
        .as_mut()
        .ok_or("WhisperSidecar server is not running")?;
    let payload = serde_json::json!({
        "path": wav_path.to_string_lossy(),
        "prompt": prompt.unwrap_or(""),
    });
    writeln!(server.stdin, "{payload}").map_err(|e| format!("Failed to write Whisper request: {e}"))?;
    server
        .stdin
        .flush()
        .map_err(|e| format!("Failed to flush Whisper request: {e}"))?;

    let mut response = String::new();
    server
        .stdout
        .read_line(&mut response)
        .map_err(|e| format!("Failed to read Whisper response: {e}"))?;
    parse_sidecar_json(&response)
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

pub fn transcribe_wav_file(
    model_path: &Path,
    wav_path: &Path,
    prompt: Option<&str>,
) -> Result<String, String> {
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

    let mut command = configure_hidden_command(&exe, &sidecar_dir());
    command
        .arg("--model")
        .arg(model_path)
        .arg("--input")
        .arg(wav_path)
        .arg("--language")
        .arg("en");

    if let Some(hint) = prompt.filter(|p| !p.trim().is_empty()) {
        command.arg("--prompt").arg(hint);
        stt_log::debug(ENGINE, &format!("Whisper prompt: {}", summarize_text(hint, 120)));
    }

    let output = command
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

pub fn transcribe_samples(
    app: &AppHandle,
    samples: &[f32],
    sample_rate: u32,
    prompt: Option<&str>,
) -> Result<String, String> {
    let model_path = whisper_model_path_for_app(app).ok_or("Whisper ggml model not found")?;
    let wav = write_temp_wav(samples, sample_rate)?;
    let result = transcribe_via_server(&model_path, &wav, prompt).or_else(|err| {
        stt_log::warn(ENGINE, &format!("Persistent sidecar failed, retrying one-shot: {err}"));
        invalidate_server();
        transcribe_wav_file(&model_path, &wav, prompt)
    });
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
    score_models_on_samples(app, samples, sample_rate, &[])
}

pub fn score_models_on_samples(
    app: &AppHandle,
    samples: &[f32],
    sample_rate: u32,
    model_ids: &[String],
) -> Result<crate::dictation::types::WhisperModelCompareResponse, String> {
    use crate::dictation::types::{WhisperAccuracyProgress, WhisperModelCompareResult};
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

    invalidate_server();

    let ready: Vec<_> = catalog
        .into_iter()
        .filter(|entry| {
            entry.status == ModelStatus::Downloaded
                && model_manager::model_file_path(app, &entry.id).is_some()
        })
        .collect();

    let targets: Vec<_> = if model_ids.is_empty() {
        ready
    } else {
        model_ids
            .iter()
            .filter_map(|id| ready.iter().find(|entry| entry.id == *id).cloned())
            .collect()
    };

    if targets.is_empty() {
        return Err(
            "No downloaded models selected — download a model or tick at least one above".into(),
        );
    }

    stt_log::info_fmt(
        ENGINE,
        format!(
            "Scoring {} Whisper model(s) on {:.1}s clip",
            targets.len(),
            samples.len() as f64 / sample_rate as f64
        ),
    );

    let wav = write_temp_wav(samples, sample_rate)?;
    let total = targets.len();
    let mut results = Vec::with_capacity(targets.len());
    let prompt = super::transcription_hint::get_session_hint(app);

    for (index, entry) in targets.into_iter().enumerate() {
        let _ = app.emit(
            "whisper-accuracy-progress",
            WhisperAccuracyProgress {
                index: index + 1,
                total,
                model_id: entry.id.clone(),
                model_name: entry.name.clone(),
            },
        );

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
        match transcribe_wav_file(&model_path, &wav, prompt.as_deref()) {
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
