use parking_lot::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};

use super::ring_buffer::AudioRingBuffer;

const SAMPLE_RATE: u32 = 16_000;

pub struct StreamingAudioHub {
    enabled: AtomicBool,
    buffer: Mutex<AudioRingBuffer>,
}

impl StreamingAudioHub {
    pub fn new() -> Self {
        Self {
            enabled: AtomicBool::new(false),
            buffer: Mutex::new(AudioRingBuffer::new(SAMPLE_RATE)),
        }
    }

    pub fn enable(&self) {
        self.buffer.lock().clear();
        self.enabled.store(true, Ordering::SeqCst);
    }

    pub fn disable(&self) {
        self.enabled.store(false, Ordering::SeqCst);
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled.load(Ordering::SeqCst)
    }

    pub fn push_resampled_mono(&self, samples: &[f32]) {
        if !self.is_enabled() || samples.is_empty() {
            return;
        }
        self.buffer.lock().push_chunk(samples);
    }

    pub fn snapshot(&self) -> Vec<f32> {
        self.buffer.lock().snapshot()
    }

    pub fn read_since(&self, cursor: u64) -> (Vec<f32>, u64) {
        self.buffer.lock().read_since(cursor)
    }

    pub fn write_cursor(&self) -> u64 {
        self.buffer.lock().write_cursor()
    }

    pub fn sample_count(&self) -> usize {
        self.buffer.lock().len()
    }
}

impl Default for StreamingAudioHub {
    fn default() -> Self {
        Self::new()
    }
}
