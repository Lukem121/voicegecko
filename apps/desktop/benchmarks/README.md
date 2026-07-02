# VoiceGecko v2 Benchmark Harness

Evaluate STT engines against a local corpus before and after engine changes.

## Layout

```
benchmarks/
├── corpus/
│   ├── ground_truth.json    # Manual transcripts per clip
│   └── README.md
├── results/                 # JSON reports (gitignored)
├── spike/                   # Phase 0 spike binaries
└── scripts/
    └── compute_wer.py
```

## Running

From repo root (after spikes are built):

```bash
cd apps/desktop/benchmarks/spike
cargo run --release -- --help
```

Record new clips with the desktop app (Engine Lab → save audio) or place 16kHz mono WAV files in `corpus/`.

## Engines

| Engine ID | Spike binary | Notes |
|-----------|--------------|-------|
| `whisper_sidecar_legacy` | via Tauri | Baseline |
| `parakeet_tdt_v2` | `spike/parakeet` | Requires model download |
| `moonshine_medium` | `spike/moonshine-ffi` | Requires moonshine.dll |
| `gpt4o_transcribe` | env `OPENAI_API_KEY` | Cloud ceiling |

## WER

```bash
python scripts/compute_wer.py --truth corpus/ground_truth.json --hyp results/latest.json
```
