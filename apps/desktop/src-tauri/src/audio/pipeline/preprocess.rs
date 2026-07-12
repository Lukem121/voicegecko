use nnnoiseless::DenoiseState;
use tracing::{debug, info};

use super::config::AudioPipelineConfig;
use crate::audio::types::TARGET_SAMPLE_RATE;

pub fn process(samples: Vec<f32>, config: &AudioPipelineConfig) -> Vec<f32> {
    if samples.is_empty() {
        return samples;
    }

    let mut current = samples;

    if config.enable_high_pass {
        current = apply_high_pass(current, config.high_pass_hz);
    }

    if config.enable_denoise {
        current = apply_noise_reduction(current);
    }

    normalize(current, config.target_rms)
}

fn normalize(samples: Vec<f32>, target_rms: f32) -> Vec<f32> {
    if samples.is_empty() {
        return samples;
    }

    const MAX_GAIN: f32 = 2.0;
    const MIN_GAIN: f32 = 0.5;
    const PEAK_LIMIT: f32 = 0.85;

    let rms = (samples.iter().map(|&s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
    let gain = if rms > 0.001 {
        (target_rms / rms).clamp(MIN_GAIN, MAX_GAIN)
    } else {
        1.0
    };

    debug!(rms, gain, "audio normalize");

    samples
        .into_iter()
        .map(|s| (s * gain).clamp(-PEAK_LIMIT, PEAK_LIMIT))
        .collect()
}

fn apply_high_pass(samples: Vec<f32>, cutoff_hz: f32) -> Vec<f32> {
    let sample_rate = TARGET_SAMPLE_RATE as f32;
    let omega = 2.0 * std::f32::consts::PI * cutoff_hz / sample_rate;
    let cos_omega = omega.cos();
    let sin_omega = omega.sin();
    let alpha = sin_omega / std::f32::consts::SQRT_2;

    let b0 = (1.0 + cos_omega) / 2.0;
    let b1 = -(1.0 + cos_omega);
    let b2 = (1.0 + cos_omega) / 2.0;
    let a0 = 1.0 + alpha;
    let a1 = -2.0 * cos_omega;
    let a2 = 1.0 - alpha;

    apply_biquad(
        samples,
        b0 / a0,
        b1 / a0,
        b2 / a0,
        a1 / a0,
        a2 / a0,
    )
}

fn apply_biquad(samples: Vec<f32>, b0: f32, b1: f32, b2: f32, a1: f32, a2: f32) -> Vec<f32> {
    let mut filtered = Vec::with_capacity(samples.len());
    let mut x1 = 0.0;
    let mut x2 = 0.0;
    let mut y1 = 0.0;
    let mut y2 = 0.0;

    for &sample in &samples {
        let output = b0 * sample + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1;
        x1 = sample;
        y2 = y1;
        y1 = output;
        filtered.push(output);
    }

    filtered
}

fn apply_noise_reduction(samples: Vec<f32>) -> Vec<f32> {
    const FRAME_SIZE: usize = 480;
    const BLEND_FACTOR: f32 = 0.25;

    let rms = (samples.iter().map(|&s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
    let peak = samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);

    if rms > 0.04 || peak > 0.25 {
        info!(rms, peak, "skipping denoise — strong signal");
        return samples;
    }

    let mut denoise_state = DenoiseState::new();
    let mut denoised_samples = Vec::with_capacity(samples.len());

    for chunk in samples.chunks_exact(FRAME_SIZE) {
        let mut frame = [0.0; FRAME_SIZE];
        frame.copy_from_slice(chunk);
        let mut output = [0.0; FRAME_SIZE];
        denoise_state.process_frame(&mut output, &frame);
        for i in 0..FRAME_SIZE {
            denoised_samples.push(output[i] * BLEND_FACTOR + frame[i] * (1.0 - BLEND_FACTOR));
        }
    }

    let remainder = samples.len() % FRAME_SIZE;
    if remainder > 0 {
        let mut last_frame = [0.0; FRAME_SIZE];
        last_frame[..remainder].copy_from_slice(&samples[samples.len() - remainder..]);
        let mut output = [0.0; FRAME_SIZE];
        denoise_state.process_frame(&mut output, &last_frame);
        for i in 0..remainder {
            denoised_samples
                .push(output[i] * BLEND_FACTOR + last_frame[i] * (1.0 - BLEND_FACTOR));
        }
    }

    denoised_samples
}

pub fn save_debug_wav(samples: &[f32], path: &std::path::Path) -> Result<(), String> {
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: TARGET_SAMPLE_RATE,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    };
    let mut writer = hound::WavWriter::create(path, spec)
        .map_err(|e| format!("Failed to create debug WAV: {e}"))?;
    for &sample in samples {
        writer
            .write_sample(sample)
            .map_err(|e| format!("Failed to write debug WAV: {e}"))?;
    }
    writer
        .finalize()
        .map_err(|e| format!("Failed to finalize debug WAV: {e}"))?;
    Ok(())
}

pub fn debug_saves_enabled() -> bool {
    std::env::var("VOICEGECKO_AUDIO_DEBUG")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_preserves_length() {
        let input = vec![0.1, -0.1, 0.05, -0.05];
        let out = normalize(input.clone(), 0.16);
        assert_eq!(out.len(), input.len());
    }

    #[test]
    fn process_empty_returns_empty() {
        let out = process(vec![], &AudioPipelineConfig::default());
        assert!(out.is_empty());
    }

    #[test]
    fn high_pass_attenuates_dc_offset() {
        let config = AudioPipelineConfig {
            enable_denoise: false,
            enable_high_pass: true,
            high_pass_hz: 80.0,
            target_rms: 0.16,
        };
        let samples: Vec<f32> = (0..1600).map(|_| 0.5).collect();
        let out = process(samples, &config);
        let mean = out.iter().sum::<f32>() / out.len() as f32;
        assert!(mean.abs() < 0.05, "DC offset should be attenuated, mean={mean}");
    }

    #[test]
    fn normalize_targets_rms() {
        let samples = vec![0.1f32; 1600];
        let out = normalize(samples, 0.16);
        let rms = (out.iter().map(|&s| s * s).sum::<f32>() / out.len() as f32).sqrt();
        assert!(
            (rms - 0.16).abs() < 0.02,
            "RMS should be near target, got {rms}"
        );
    }
}
