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

    if config.enable_trim_silence {
        current = trim_silence(current);
    }

    normalize(current, config.target_rms)
}

fn frame_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt()
}

/// Trim leading silence and only strip long trailing dead air (never cut quiet syllables).
fn trim_silence(samples: Vec<f32>) -> Vec<f32> {
    const FRAME_MS: u32 = 20;
    const PRE_ROLL_MS: u32 = 200;
    const POST_ROLL_MS: u32 = 400;
    const MIN_SPEECH_MS: u32 = 300;
    const MIN_THRESHOLD: f32 = 0.008;
    const MAX_THRESHOLD: f32 = 0.03;
    const THRESHOLD_RATIO: f32 = 0.08;
    /// Only remove trailing audio when this much continuous silence is at the end.
    const TRIM_TAIL_SILENCE_MS: u32 = 450;

    let frame_size = (TARGET_SAMPLE_RATE as usize * FRAME_MS as usize) / 1000;
    if frame_size == 0 || samples.len() <= frame_size {
        return samples;
    }

    let frame_energies: Vec<f32> = samples
        .chunks(frame_size)
        .map(frame_rms)
        .collect();

    let max_rms = frame_energies.iter().copied().fold(0.0f32, f32::max);
    if max_rms < MIN_THRESHOLD {
        return samples;
    }

    let threshold = (max_rms * THRESHOLD_RATIO).clamp(MIN_THRESHOLD, MAX_THRESHOLD);
    let Some(first) = frame_energies.iter().position(|&energy| energy >= threshold) else {
        return samples;
    };
    let Some(last) = frame_energies.iter().rposition(|&energy| energy >= threshold) else {
        return samples;
    };

    // Include quiet trailing syllables that sit below the main threshold.
    let mut extended_last = last;
    while extended_last + 1 < frame_energies.len()
        && frame_energies[extended_last + 1] >= MIN_THRESHOLD
    {
        extended_last += 1;
    }

    let pre_roll = (TARGET_SAMPLE_RATE as usize * PRE_ROLL_MS as usize) / 1000;
    let post_roll = (TARGET_SAMPLE_RATE as usize * POST_ROLL_MS as usize) / 1000;
    let min_speech_samples = (TARGET_SAMPLE_RATE as usize * MIN_SPEECH_MS as usize) / 1000;
    let tail_silence_frames = (TRIM_TAIL_SILENCE_MS / FRAME_MS) as usize;

    let start = (first * frame_size).saturating_sub(pre_roll);
    let min_end = ((extended_last + 1) * frame_size + post_roll).min(samples.len());

    let mut end = samples.len();
    if frame_energies.len() >= tail_silence_frames {
        let mut silent_tail_frames = 0usize;
        for &energy in frame_energies.iter().rev() {
            if energy < MIN_THRESHOLD {
                silent_tail_frames += 1;
            } else {
                break;
            }
        }

        if silent_tail_frames >= tail_silence_frames {
            let speech_end_frame = frame_energies.len().saturating_sub(silent_tail_frames);
            end = (speech_end_frame * frame_size + post_roll).min(samples.len());
        }
    }

    end = end.max(min_end);

    if end <= start || end - start < min_speech_samples {
        return samples;
    }

    let trimmed = samples[start..end].to_vec();
    info!(
        original_samples = samples.len(),
        trimmed_samples = trimmed.len(),
        removed_ms = (samples.len().saturating_sub(trimmed.len()) as f32
            / TARGET_SAMPLE_RATE as f32
            * 1000.0) as u32,
        "trimmed silence from capture"
    );
    trimmed
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
            enable_trim_silence: false,
            high_pass_hz: 80.0,
            target_rms: 0.22,
        };
        let samples: Vec<f32> = (0..1600).map(|_| 0.5).collect();
        let out = process(samples, &config);
        let mean = out.iter().sum::<f32>() / out.len() as f32;
        assert!(mean.abs() < 0.05, "DC offset should be attenuated, mean={mean}");
    }

    #[test]
    fn normalize_targets_rms() {
        let samples = vec![0.1f32; 1600];
        let out = normalize(samples, 0.22);
        let rms = (out.iter().map(|&s| s * s).sum::<f32>() / out.len() as f32).sqrt();
        assert!(
            (rms - 0.22).abs() < 0.02,
            "RMS should be near target, got {rms}"
        );
    }

    #[test]
    fn trim_silence_removes_leading_and_trailing_gaps() {
        let sample_rate = TARGET_SAMPLE_RATE as usize;
        let silence = vec![0.0f32; sample_rate];
        let speech = vec![0.12f32; sample_rate / 2];
        let mut samples = silence.clone();
        samples.extend(speech);
        samples.extend(silence);

        let trimmed = trim_silence(samples);
        assert!(
            trimmed.len() < sample_rate * 2,
            "expected leading/trailing silence to be removed"
        );
        assert!(
            trimmed.len() >= sample_rate / 2,
            "speech body should remain"
        );
    }

    #[test]
    fn trim_silence_preserves_quiet_trailing_syllable() {
        let sample_rate = TARGET_SAMPLE_RATE as usize;
        let frame_size = (sample_rate * 20) / 1000;
        let loud = vec![0.12f32; sample_rate / 2];
        let quiet_tail = vec![0.01f32; frame_size * 3];
        let long_silence = vec![0.0f32; sample_rate];
        let loud_len = loud.len();
        let quiet_len = quiet_tail.len();
        let mut samples = loud;
        samples.extend(quiet_tail);
        samples.extend(long_silence);

        let trimmed = trim_silence(samples);
        assert!(
            trimmed.len() >= loud_len + quiet_len,
            "quiet trailing syllable should be kept"
        );
    }

    #[test]
    fn trim_silence_keeps_short_clips() {
        let samples = vec![0.05f32; 800];
        let trimmed = trim_silence(samples.clone());
        assert_eq!(trimmed.len(), samples.len());
    }
}
