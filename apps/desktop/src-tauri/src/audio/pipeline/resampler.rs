use rubato::{FftFixedIn, Resampler};

use crate::audio::hub::StreamingAudioHub;
use crate::audio::types::TARGET_SAMPLE_RATE;
use std::sync::Arc;

/// Worker-thread-only resampler (not shared with the CPAL callback).
pub struct MonoResampler {
    inner: FftFixedIn<f32>,
    input_channels: usize,
    chunk_size: usize,
    input_buffer: Vec<f32>,
}

impl MonoResampler {
    pub fn new(
        input_sample_rate: u32,
        input_channels: u16,
        chunk_size: usize,
    ) -> Result<Self, String> {
        let channels = input_channels.min(2) as usize;
        let resampler = FftFixedIn::<f32>::new(
            input_sample_rate as usize,
            TARGET_SAMPLE_RATE as usize,
            chunk_size,
            1,
            channels,
        )
        .map_err(|e| format!("Failed to create resampler: {e}"))?;

        Ok(Self {
            inner: resampler,
            input_channels: input_channels as usize,
            chunk_size,
            input_buffer: Vec::new(),
        })
    }

    pub fn push_interleaved(
        &mut self,
        samples: &[f32],
        output: &mut Vec<f32>,
        hub: Option<&Arc<StreamingAudioHub>>,
    ) {
        self.input_buffer.extend_from_slice(samples);

        let required = self.chunk_size * self.input_channels;

        while self.input_buffer.len() >= required {
            let chunk: Vec<f32> = self.input_buffer.drain(0..required).collect();
            let waves_in = interleaved_to_waves(&chunk, self.input_channels, self.chunk_size);

            match self.inner.process(&waves_in, None) {
                Ok(resampled) => append_mono(output, &resampled, hub),
                Err(e) => tracing::error!(error = %e, "resampler error during capture"),
            }
        }
    }

    pub fn flush(&mut self, output: &mut Vec<f32>, hub: Option<&Arc<StreamingAudioHub>>) {
        if !self.input_buffer.is_empty() {
            let remainder = self.input_buffer.len() % self.input_channels;
            if remainder > 0 {
                self.input_buffer
                    .extend(std::iter::repeat(0.0).take(self.input_channels - remainder));
            }

            while self.input_buffer.len() >= self.chunk_size * self.input_channels {
                let required = self.chunk_size * self.input_channels;
                let chunk: Vec<f32> = self.input_buffer.drain(0..required).collect();
                let waves_in =
                    interleaved_to_waves(&chunk, self.input_channels, self.chunk_size);
                match self.inner.process(&waves_in, None) {
                    Ok(resampled) => append_mono(output, &resampled, hub),
                    Err(e) => tracing::error!(error = %e, "resampler error during flush"),
                }
            }

            if !self.input_buffer.is_empty() {
                let frames = self.input_buffer.len() / self.input_channels;
                let waves_in =
                    interleaved_to_waves(&self.input_buffer, self.input_channels, frames);
                match self.inner.process_partial(Some(&waves_in), None) {
                    Ok(resampled) => append_mono(output, &resampled, hub),
                    Err(e) => tracing::error!(error = %e, "resampler partial flush error"),
                }
                self.input_buffer.clear();
            }
        }

        let no_input: Option<&[Vec<f32>]> = None;
        match self.inner.process_partial(no_input, None) {
            Ok(resampled) if resampled.first().is_some_and(|channel| !channel.is_empty()) => {
                append_mono(output, &resampled, hub);
            }
            Ok(_) => {}
            Err(e) => tracing::error!(error = %e, "resampler final flush error"),
        }
    }

    pub fn input_frames_next(&self) -> usize {
        self.inner.input_frames_next()
    }
}

fn interleaved_to_waves(chunk: &[f32], channels: usize, frames: usize) -> Vec<Vec<f32>> {
    if channels >= 2 {
        let mut left = Vec::with_capacity(frames);
        let mut right = Vec::with_capacity(frames);
        if channels == 2 {
            for pair in chunk.chunks_exact(2) {
                left.push(pair[0]);
                right.push(pair[1]);
            }
        } else {
            for frame in chunk.chunks_exact(channels) {
                left.push(frame[0]);
                right.push(frame.get(1).copied().unwrap_or(frame[0]));
            }
        }
        vec![left, right]
    } else {
        vec![chunk.to_vec()]
    }
}

fn append_mono(
    output: &mut Vec<f32>,
    resampled: &[Vec<f32>],
    hub: Option<&Arc<StreamingAudioHub>>,
) {
    let start = output.len();
    if resampled.len() > 1 {
        let left = &resampled[0];
        let right = &resampled[1];
        for i in 0..left.len() {
            output.push((left[i] + right[i]) / 2.0);
        }
    } else {
        output.extend_from_slice(&resampled[0]);
    }

    if let Some(h) = hub {
        h.push_resampled_mono(&output[start..]);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resampler_produces_16k_output() {
        let mut resampler = MonoResampler::new(48_000, 1, 1024).expect("resampler");
        let mut out = Vec::new();
        let input = vec![0.1f32; 2048];
        resampler.push_interleaved(&input, &mut out, None);
        resampler.flush(&mut out, None);
        assert!(!out.is_empty());
        let expected = (2048.0 * 16_000.0 / 48_000.0) as usize;
        assert!(
            out.len() >= expected.saturating_sub(50) && out.len() <= expected + 50,
            "expected ~{expected} samples, got {}",
            out.len()
        );
    }
}
