//! Lock-free SPSC ring between the CPAL callback (producer) and capture worker (consumer).

use ringbuf::{traits::*, HeapRb};
use std::sync::{Arc, Mutex};

/// ~10 seconds of stereo 48 kHz interleaved samples.
pub const DEFAULT_RING_CAPACITY: usize = 480_000 * 2 * 10;

pub type SampleProducer = Arc<Mutex<ringbuf::HeapProd<f32>>>;
pub type SampleConsumer = ringbuf::HeapCons<f32>;

pub fn split_ring(capacity: usize) -> (SampleProducer, SampleConsumer) {
    let rb = HeapRb::<f32>::new(capacity);
    let (prod, cons) = rb.split();
    (Arc::new(Mutex::new(prod)), cons)
}

/// Push interleaved f32 samples into the ring. Drops samples when the ring is full.
pub fn push_samples(producer: &SampleProducer, samples: &[f32]) {
    if let Ok(mut prod) = producer.lock() {
        for &sample in samples {
            let _ = prod.try_push(sample);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn push_and_pop_roundtrip() {
        let (prod, mut cons) = split_ring(16);
        push_samples(&prod, &[0.1, 0.2, 0.3]);
        let mut out = [0.0; 3];
        assert_eq!(cons.pop_slice(&mut out), 3);
        assert!((out[0] - 0.1).abs() < f32::EPSILON);
    }
}
