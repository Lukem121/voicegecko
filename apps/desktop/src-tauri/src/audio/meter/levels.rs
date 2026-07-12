use crate::audio::capture::stream::SampleToF32;
use crate::audio::types::AudioLevel;

/// Lightweight RMS/peak metering safe for realtime callbacks (no FFT, no heap).
pub fn compute_levels(samples: &[f32]) -> AudioLevel {
    compute_levels_from_iter(samples.iter().copied())
}

pub fn compute_levels_from_native<T: SampleToF32>(samples: &[T]) -> AudioLevel {
    compute_levels_from_iter(samples.iter().map(|&s| s.to_f32_sample()))
}

fn compute_levels_from_iter(samples: impl Iterator<Item = f32> + Clone) -> AudioLevel {
    let mut count = 0usize;
    let mut sum_squares = 0.0f32;
    let mut peak = 0.0f32;
    let mut zero_crossings = 0usize;
    let mut prev: Option<f32> = None;

    for sample in samples {
        let abs_sample = sample.abs();
        sum_squares += abs_sample * abs_sample;
        peak = peak.max(abs_sample);

        if let Some(p) = prev {
            if (sample >= 0.0) != (p >= 0.0) {
                zero_crossings += 1;
            }
        }
        prev = Some(sample);
        count += 1;
    }

    if count == 0 {
        return AudioLevel::silent();
    }

    let rms = (sum_squares / count as f32).sqrt();
    let zero_crossing_rate = zero_crossings as f32 / count as f32;
    let is_silence = rms < 0.001;
    let is_voice_detected = rms > 0.003 && zero_crossing_rate > 0.01 && zero_crossing_rate < 0.4;

    AudioLevel {
        level: rms.min(1.0),
        peak: peak.min(1.0),
        frequency_bands: vec![rms; 10],
        dominant_frequency: 0.0,
        spectral_centroid: 0.0,
        spectral_rolloff: 0.0,
        zero_crossing_rate,
        is_voice_detected,
        is_silence,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn silent_buffer() {
        let level = compute_levels(&[0.0, 0.0, 0.0]);
        assert!(level.is_silence);
    }
}
