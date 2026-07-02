//! Phase 0 spike runner — latency + transcript output for benchmark corpus.

use clap::Parser;
use hound::{SampleFormat, WavReader};
use serde_json::json;
use std::path::PathBuf;
use std::time::Instant;

#[derive(Parser)]
#[command(name = "spike-runner")]
struct Args {
    #[arg(long, default_value = "../corpus")]
    corpus: PathBuf,

    #[arg(long)]
    engine: String,

    #[arg(long, default_value = "../results/spike-output.json")]
    output: PathBuf,
}

fn load_wav_f32(path: &PathBuf) -> Result<Vec<f32>, String> {
    let mut reader = WavReader::open(path).map_err(|e| e.to_string())?;
    let spec = reader.spec();
    if spec.sample_rate != 16_000 {
        return Err(format!("Expected 16kHz WAV, got {}", spec.sample_rate));
    }
    match spec.sample_format {
        SampleFormat::Float => reader
            .samples::<f32>()
            .map(|s| s.map_err(|e| e.to_string()))
            .collect(),
        SampleFormat::Int => {
            let max = (1i32 << (spec.bits_per_sample - 1)) as f32;
            reader
                .samples::<i32>()
                .map(|s| s.map(|v| v as f32 / max))
                .map(|s| s.map_err(|e| e.to_string()))
                .collect()
        }
    }
}

fn main() -> Result<(), String> {
    let args = Args::parse();
    let truth_path = args.corpus.join("ground_truth.json");
    let truth: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&truth_path).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;

    let mut results = serde_json::Map::new();

    if let Some(clips) = truth.get("clips").and_then(|c| c.as_array()) {
        for clip in clips {
            let clip_id = clip["clipId"].as_str().unwrap_or("unknown");
            let file = clip["file"].as_str().unwrap_or("");
            let wav_path = args.corpus.join(file);
            if !wav_path.exists() {
                results.insert(
                    clip_id.to_string(),
                    json!({ "error": "wav missing", "engine": args.engine }),
                );
                continue;
            }

            let start = Instant::now();
            let _samples = load_wav_f32(&wav_path)?;
            let elapsed_ms = start.elapsed().as_millis() as u64;

            // Placeholder until engine-specific spikes are linked
            results.insert(
                clip_id.to_string(),
                json!({
                    "text": "",
                    "engine": args.engine,
                    "latencyMs": elapsed_ms,
                    "note": "Wire engine spike binary here — WAV loaded successfully"
                }),
            );
        }
    }

    if let Some(parent) = args.output.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(
        &args.output,
        serde_json::to_string_pretty(&results).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    println!("Wrote {}", args.output.display());
    Ok(())
}
