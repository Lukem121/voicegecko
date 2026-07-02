//! Ring buffer for streaming audio chunks (Flow / hands-free modes).

use std::collections::VecDeque;

const DEFAULT_CAPACITY_SAMPLES: usize = 16000 * 30; // 30s @ 16kHz

pub struct AudioRingBuffer {
    buffer: VecDeque<f32>,
    capacity: usize,
    sample_rate: u32,
}

impl AudioRingBuffer {
    pub fn new(sample_rate: u32) -> Self {
        Self {
            buffer: VecDeque::with_capacity(DEFAULT_CAPACITY_SAMPLES),
            capacity: DEFAULT_CAPACITY_SAMPLES,
            sample_rate,
        }
    }

    pub fn push_chunk(&mut self, samples: &[f32]) {
        for &s in samples {
            if self.buffer.len() >= self.capacity {
                self.buffer.pop_front();
            }
            self.buffer.push_back(s);
        }
    }

    pub fn snapshot(&self) -> Vec<f32> {
        self.buffer.iter().copied().collect()
    }

    pub fn clear(&mut self) {
        self.buffer.clear();
    }

    pub fn drain_all(&mut self) -> Vec<f32> {
        self.buffer.drain(..).collect()
    }

    pub fn len(&self) -> usize {
        self.buffer.len()
    }

    pub fn is_empty(&self) -> bool {
        self.buffer.is_empty()
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}
