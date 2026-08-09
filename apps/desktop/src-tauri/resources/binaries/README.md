# Bundled binaries (not in git)

Sidecar builds and native runtimes land here during local packaging or CI.
They are gitignored — see [docs/sidecar.md](../../../../docs/sidecar.md).

```bash
# From repo root (Windows x64 example)
dotnet publish sidecar/whisper-sidecar/WhisperSidecar.csproj \
  -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true \
  -o apps/desktop/src-tauri/resources/binaries/whisper-sidecar/win-x64
```

Speech models (`ggml-*.bin`) are also gitignored; the app can download them on first run, and the release workflow fetches a default model before packaging.
