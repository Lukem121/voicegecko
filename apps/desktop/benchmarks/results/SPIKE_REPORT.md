# Phase 0 spike results — fill after running spikes on hardware.

## Moonshine FFI

- Status: PENDING
- First partial latency: —
- PASS (<300ms): —

## Parakeet TDT v2

- Status: PENDING
- 5s clip latency: —
- PASS (<1s): —

## LLM polish (Qwen2.5-3B via llama-server)

- Status: PENDING
- p50 latency: —
- PASS (<400ms): —

## GPT-4o Transcribe

- Status: PENDING
- Requires: `OPENAI_API_KEY`

## Decision

- Toggle default engine: `parakeet_tdt_v2`
- Flow engine: `moonshine_medium` when DLL present, else `parakeet_tdt_v2` stream fallback
