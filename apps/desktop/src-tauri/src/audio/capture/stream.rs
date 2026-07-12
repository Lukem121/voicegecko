use cpal::traits::DeviceTrait;
use cpal::{Sample, Stream};
use std::marker::PhantomData;

use ringbuf::traits::Producer;

use super::ring::SampleProducer;
use crate::audio::meter::compute_levels_from_native;

pub trait SampleToF32: Sample + cpal::SizedSample {
    fn to_f32_sample(self) -> f32;
}

impl SampleToF32 for i16 {
    fn to_f32_sample(self) -> f32 {
        self as f32 / 32768.0
    }
}

impl SampleToF32 for u16 {
    fn to_f32_sample(self) -> f32 {
        (self as f32 / 65535.0) * 2.0 - 1.0
    }
}

impl SampleToF32 for f32 {
    fn to_f32_sample(self) -> f32 {
        self
    }
}

/// CPAL callback: convert samples and push to ring only (no resampling, no IPC).
pub fn build_ring_push_stream<T>(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    producer: SampleProducer,
    mut emit_level: impl FnMut(crate::audio::types::AudioLevel) + Send + 'static,
    on_error: impl FnMut(cpal::StreamError) + Send + 'static,
) -> Result<Stream, cpal::BuildStreamError>
where
    T: SampleToF32,
{
    device.build_input_stream(
        config,
        move |data: &[T], _: &cpal::InputCallbackInfo| {
            if let Ok(mut prod) = producer.lock() {
                for &s in data {
                    let _ = prod.try_push(s.to_f32_sample());
                }
            }

            let level = compute_levels_from_native(data);
            emit_level(level);
        },
        on_error,
        None,
    )
}

/// Mic-test stream: meter only, no ring buffer.
pub fn build_meter_stream<T>(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    mut on_samples: impl FnMut(&[T]) + Send + 'static,
    on_error: impl FnMut(cpal::StreamError) + Send + 'static,
) -> Result<Stream, cpal::BuildStreamError>
where
    T: SampleToF32,
{
    let _marker = PhantomData::<T>;

    device.build_input_stream(
        config,
        move |data: &[T], _: &cpal::InputCallbackInfo| {
            on_samples(data);
        },
        on_error,
        None,
    )
}
