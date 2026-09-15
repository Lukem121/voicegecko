#!/usr/bin/env node
/** biome-ignore-all lint/suspicious/noConsole: build script */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function sidecarRid() {
  if (process.platform === 'win32') {
    return 'win-x64';
  }
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? 'osx-arm64' : 'osx-x64';
  }
  return 'linux-x64';
}

function sidecarBinaryName() {
  return process.platform === 'win32' ? 'WhisperSidecar.exe' : 'WhisperSidecar';
}

function main() {
  const rid = sidecarRid();
  const outDir = path.join(
    repoRoot,
    'apps/desktop/src-tauri/resources/binaries/whisper-sidecar',
    rid
  );
  const exePath = path.join(outDir, sidecarBinaryName());

  if (fs.existsSync(exePath) && !process.env.FORCE_SIDECAR_REBUILD) {
    console.log(`Whisper sidecar already present at ${exePath}`);
    return;
  }

  const project = path.join(
    repoRoot,
    'sidecar/whisper-sidecar/WhisperSidecar.csproj'
  );
  console.log(`Publishing Whisper sidecar (${rid})…`);

  const result = spawnSync(
    'dotnet',
    [
      'publish',
      project,
      '-c',
      'Release',
      '-r',
      rid,
      '--self-contained',
      'true',
      '-p:PublishSingleFile=true',
      '-o',
      outDir,
    ],
    { cwd: repoRoot, stdio: 'inherit', shell: process.platform === 'win32' }
  );

  if (result.status !== 0) {
    throw new Error(
      'dotnet publish failed. Install the .NET 8 SDK, then rebuild. See docs/sidecar.md.'
    );
  }

  for (const file of fs.readdirSync(outDir)) {
    if (file.endsWith('.pdb')) {
      fs.unlinkSync(path.join(outDir, file));
    }
  }

  if (!fs.existsSync(exePath)) {
    throw new Error(`Whisper sidecar missing after publish: ${exePath}`);
  }

  console.log(`Whisper sidecar published to ${outDir}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
