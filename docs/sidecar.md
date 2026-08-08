# Whisper Sidecar Build & Packaging

This app uses a .NET sidecar to run Whisper via Whisper.net as a separate process.

**Built outputs are gitignored** (`apps/desktop/src-tauri/resources/binaries/`, `*.pdb`). Ship source only; build before packaging or let the `publish` workflow do it.

Build steps (from repo root):

1. Install .NET 8 SDK.

2. Publish for each platform RID you ship:

- Windows x64:

```
 dotnet publish sidecar/whisper-sidecar/WhisperSidecar.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o apps/desktop/src-tauri/resources/binaries/whisper-sidecar/win-x64
```

- Linux x64:

```
 dotnet publish sidecar/whisper-sidecar/WhisperSidecar.csproj -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true -o apps/desktop/src-tauri/resources/binaries/whisper-sidecar/linux-x64
```

- macOS x64:

```
 dotnet publish sidecar/whisper-sidecar/WhisperSidecar.csproj -c Release -r osx-x64 --self-contained true -p:PublishSingleFile=true -o apps/desktop/src-tauri/resources/binaries/whisper-sidecar/osx-x64
```

- macOS arm64:

```
 dotnet publish sidecar/whisper-sidecar/WhisperSidecar.csproj -c Release -r osx-arm64 --self-contained true -p:PublishSingleFile=true -o apps/desktop/src-tauri/resources/binaries/whisper-sidecar/osx-arm64
```

Tauri bundle config already includes `resources/binaries/**/*`, so the sidecar ships in the app.

Runtime dependencies: Whisper.net.AllRuntimes packages native whisper.cpp builds as needed. See Whisper.net docs: https://github.com/sandrohanea/whisper.net
