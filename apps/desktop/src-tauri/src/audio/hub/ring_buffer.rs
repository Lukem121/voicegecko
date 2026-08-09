use std::collections::VecDeque;

const DEFAULT_CAPACITY_SAMPLES: usize = 16_000 * 30;

pub struct AudioRingBuffer {
    buffer: VecDeque<f32>,
    capacity: usize,
    sample_rate: u32,
    /// Monotonic write position for cursor-based reads.
    total_written: u64,
}

impl AudioRingBuffer {
    pub fn new(sample_rate: u32) -> Self {
        Self {
            buffer: VecDeque::with_capacity(DEFAULT_CAPACITY_SAMPLES),
            capacity: DEFAULT_CAPACITY_SAMPLES,
            sample_rate,
            total_written: 0,
        }
    }

    pub fn push_chunk(&mut self, samples: &[f32]) {
        for &s in samples {
            if self.buffer.len() >= self.capacity {
                self.buffer.pop_front();
            }
            self.buffer.push_back(s);
            self.total_written += 1;
        }
    }

    pub fn snapshot(&self) -> Vec<f32> {
        self.buffer.iter().copied().collect()
    }

    /// Read samples written since `cursor`. Returns (samples, new_cursor).
    pub fn read_since(&self, cursor: u64) -> (Vec<f32>, u64) {
        let available = self.total_written.saturating_sub(cursor) as usize;
        if available == 0 || self.buffer.is_empty() {
            return (Vec::new(), self.total_written);
        }

        let take = available.min(self.buffer.len());
        let start = self.buffer.len() - take;
        let samples: Vec<f32> = self.buffer.iter().skip(start).copied().collect();
        (samples, self.total_written)
    }

    pub fn write_cursor(&self) -> u64 {
        self.total_written
    }

    pub fn clear(&mut self) {
        self.buffer.clear();
        self.total_written = 0;
    }

    pub fn len(&self) -> usize {
        self.buffer.len()
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn read_since_returns_new_samples() {
        let mut buf = AudioRingBuffer::new(16_000);
        buf.push_chunk(&[0.1, 0.2, 0.3]);
        let (samples, cursor) = buf.read_since(0);
        assert_eq!(samples.len(), 3);
        assert_eq!(cursor, 3);

        let (more, cursor2) = buf.read_since(cursor);
        assert!(more.is_empty());
        assert_eq!(cursor2, 3);

        buf.push_chunk(&[0.4]);
        let (delta, _) = buf.read_since(cursor);
        assert_eq!(delta, vec![0.4]);
    }
}
