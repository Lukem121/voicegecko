use futures_util::StreamExt;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Manager};

use crate::speech::download_events::emit_download_progress;

/// Headless CLI bundle — NOT the GUI demo `sherpa-onnx-non-streaming-asr-*.exe`.
const SHERPA_RELEASE_ARCHIVE_URL: &str = "https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.39/sherpa-onnx-v1.12.39-win-x64-shared-MD-Release-no-tts.tar.bz2";
const SIDECAR_VERSION: &str = "sherpa-onnx-v1.12.39-win-x64-cli";
const VERSION_MARKER: &str = ".sherpa-sidecar-version";

pub fn sidecar_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("voicegecko")
        .join("sidecars")
        .join("sherpa-onnx")
}

pub fn sherpa_offline_exe() -> PathBuf {
    sidecar_dir().join("sherpa-onnx-offline.exe")
}

fn version_marker_path() -> PathBuf {
    sidecar_dir().join(VERSION_MARKER)
}

fn sidecar_version_matches() -> bool {
    fs::read_to_string(version_marker_path())
        .map(|contents| contents.trim() == SIDECAR_VERSION)
        .unwrap_or(false)
}

pub fn is_sidecar_available() -> bool {
    sherpa_offline_exe().is_file() && sidecar_version_matches()
}

fn bundled_sidecar_dir(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .resolve(
            "resources/binaries/sherpa/win-x64",
            tauri::path::BaseDirectory::Resource,
        )
        .ok()
        .filter(|path| path.join("sherpa-onnx-offline.exe").is_file())
}

fn copy_bundled_sidecar(app: &AppHandle) -> Result<bool, String> {
    let Some(src_dir) = bundled_sidecar_dir(app) else {
        return Ok(false);
    };

    install_sidecar_files_from_dir(&src_dir)?;
    write_version_marker()?;
    Ok(true)
}

fn write_version_marker() -> Result<(), String> {
    if let Some(parent) = version_marker_path().parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(version_marker_path(), SIDECAR_VERSION).map_err(|e| e.to_string())
}

fn install_sidecar_files_from_dir(src_dir: &Path) -> Result<(), String> {
    let dest_dir = sidecar_dir();
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    for entry in fs::read_dir(src_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let file_name = entry.file_name();
        let dest = dest_dir.join(&file_name);
        fs::copy(&path, &dest).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn extract_sidecar_from_archive(archive_path: &Path) -> Result<(), String> {
    let dest_dir = sidecar_dir();
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let file = fs::File::open(archive_path).map_err(|e| e.to_string())?;
    let decompressor = bzip2::read::BzDecoder::new(file);
    let mut archive = tar::Archive::new(decompressor);

    for entry in archive.entries().map_err(|e| e.to_string())? {
        let mut entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path().map_err(|e| e.to_string())?;
        let Some(relative) = entry_path.to_str() else {
            continue;
        };

        if !relative.contains("/bin/") {
            continue;
        }

        let Some(file_name) = entry_path.file_name() else {
            continue;
        };

        if !entry.header().entry_type().is_file() {
            continue;
        }

        let dest = dest_dir.join(file_name);
        entry.unpack(&dest).map_err(|e| e.to_string())?;
    }

    if !sherpa_offline_exe().is_file() {
        return Err("Sherpa archive did not contain sherpa-onnx-offline.exe".into());
    }

    Ok(())
}

async fn download_sidecar_archive(app: &AppHandle) -> Result<(), String> {
    let dest_dir = sidecar_dir();
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let archive_path = dest_dir.join("sherpa-sidecar.tar.bz2.partial");
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(SHERPA_RELEASE_ARCHIVE_URL)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!(
            "Sherpa sidecar download failed: HTTP {}",
            response.status()
        ));
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut file = fs::File::create(&archive_path).map_err(|e| e.to_string())?;
    let mut downloaded = 0u64;
    let mut stream = response.bytes_stream();
    let mut last_progress = 0u8;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        let progress = if total_size > 0 {
            ((downloaded as f64 / total_size as f64) * 100.0) as u8
        } else {
            0
        };

        if progress >= last_progress.saturating_add(5) || progress == 100 {
            emit_download_progress(app, "sherpa_sidecar", progress, "downloading");
            last_progress = progress;
        }
    }

    file.flush().map_err(|e| e.to_string())?;
    drop(file);

    extract_sidecar_from_archive(&archive_path)?;
    let _ = fs::remove_file(&archive_path);
    write_version_marker()?;

    emit_download_progress(app, "sherpa_sidecar", 100, "complete");
    Ok(())
}

fn remove_stale_sidecar() -> Result<(), String> {
    let dir = sidecar_dir();
    if !dir.exists() {
        return Ok(());
    }

    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() {
            fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// Install sherpa-onnx-offline CLI from bundled resources or GitHub release.
pub async fn ensure_sidecar_installed(app: &AppHandle) -> Result<(), String> {
    if is_sidecar_available() {
        return Ok(());
    }

    if sherpa_offline_exe().exists() && !sidecar_version_matches() {
        remove_stale_sidecar()?;
    }

    if copy_bundled_sidecar(app)? {
        return Ok(());
    }

    download_sidecar_archive(app).await
}

struct ParakeetModelPaths {
    encoder: PathBuf,
    decoder: PathBuf,
    joiner: PathBuf,
    tokens: PathBuf,
}

fn resolve_model_file(model_dir: &Path, base: &str) -> Option<PathBuf> {
    for name in [
        format!("{base}.int8.onnx"),
        format!("{base}.onnx"),
        base.to_string(),
    ] {
        let path = model_dir.join(&name);
        if path.is_file() {
            return Some(path);
        }
    }
    None
}

fn resolve_parakeet_model_paths(model_dir: &Path) -> Result<ParakeetModelPaths, String> {
    let encoder = resolve_model_file(model_dir, "encoder")
        .ok_or_else(|| "Parakeet encoder.onnx not found".to_string())?;
    let decoder = resolve_model_file(model_dir, "decoder")
        .ok_or_else(|| "Parakeet decoder.onnx not found".to_string())?;
    let joiner = resolve_model_file(model_dir, "joiner")
        .ok_or_else(|| "Parakeet joiner.onnx not found".to_string())?;
    let tokens = model_dir.join("tokens.txt");
    if !tokens.is_file() {
        return Err("Parakeet tokens.txt not found".into());
    }

    Ok(ParakeetModelPaths {
        encoder,
        decoder,
        joiner,
        tokens,
    })
}

fn parse_transcript(stdout: &str) -> Result<String, String> {
    let trimmed = stdout.trim();
    if trimmed.is_empty() {
        return Err("Sherpa returned empty transcript".into());
    }

    if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
        if let Some(text) = value.get("text").and_then(|v| v.as_str()) {
            return Ok(text.trim().to_string());
        }
    }

    Ok(trimmed.to_string())
}

fn configure_hidden_command(exe: &Path, sidecar_workdir: &Path) -> Command {
    let mut command = Command::new(exe);
    command
        .current_dir(sidecar_workdir)
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

pub fn transcribe_wav_file(model_dir: &Path, wav_path: &Path) -> Result<String, String> {
    if !is_sidecar_available() {
        return Err("sherpa-onnx-offline sidecar not installed".into());
    }

    let models = resolve_parakeet_model_paths(model_dir)?;
    let exe = sherpa_offline_exe();
    let sidecar_workdir = sidecar_dir();

    let output = configure_hidden_command(&exe, &sidecar_workdir)
        .arg(format!("--encoder={}", models.encoder.display()))
        .arg(format!("--decoder={}", models.decoder.display()))
        .arg(format!("--joiner={}", models.joiner.display()))
        .arg(format!("--tokens={}", models.tokens.display()))
        .arg("--model-type=nemo_transducer")
        .arg("--num-threads=2")
        .arg("--decoding-method=greedy_search")
        .arg(wav_path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(format!(
            "Sherpa sidecar failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    parse_transcript(&String::from_utf8_lossy(&output.stdout))
}

pub fn write_temp_wav(samples: &[f32], sample_rate: u32) -> Result<PathBuf, String> {
    let dir = std::env::temp_dir().join("voicegecko-parakeet");
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
