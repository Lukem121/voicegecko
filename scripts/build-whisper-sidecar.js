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

function nativeLibraryName() {
  if (process.platform === 'win32') {
    return 'whisper.dll';
  }
  if (process.platform === 'darwin') {
    return 'libwhisper.dylib';
  }
  return 'libwhisper.so';
}

function findFile(dir, fileName) {
  if (!fs.existsSync(dir)) {
    return null;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === fileName) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const nested = findFile(fullPath, fileName);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function sidecarIsComplete(outDir, exePath) {
  return fs.existsSync(exePath) && Boolean(findFile(outDir, nativeLibraryName()));
}

function main() {
  const rid = sidecarRid();
  const outDir = path.join(
    repoRoot,
    'apps/desktop/src-tauri/resources/binaries/whisper-sidecar',
    rid
  );
  const exePath = path.join(outDir, sidecarBinaryName());

  if (sidecarIsComplete(outDir, exePath) && !process.env.FORCE_SIDECAR_REBUILD) {
    console.log(`Whisper sidecar already present at ${exePath}`);
    return;
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

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
      '-p:PublishSingleFile=false',
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

  pruneOtherRuntimeRids(outDir, rid);

  if (!sidecarIsComplete(outDir, exePath)) {
    throw new Error(
      `Whisper sidecar publish is incomplete. Expected ${sidecarBinaryName()} and ${nativeLibraryName()} under ${outDir}`
    );
  }

  console.log(`Whisper sidecar published to ${outDir}`);
}

function pruneOtherRuntimeRids(outDir, rid) {
  const runtimesDir = path.join(outDir, 'runtimes');
  if (!fs.existsSync(runtimesDir)) {
    return;
  }

  const keep = new Set([rid, path.join('vulkan', rid)]);
  for (const entry of fs.readdirSync(runtimesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const relative = entry.name;
    if (relative === 'vulkan') {
      const vulkanDir = path.join(runtimesDir, 'vulkan');
      for (const vulkanEntry of fs.readdirSync(vulkanDir, {
        withFileTypes: true,
      })) {
        if (vulkanEntry.isDirectory() && vulkanEntry.name !== rid) {
          fs.rmSync(path.join(vulkanDir, vulkanEntry.name), {
            recursive: true,
            force: true,
          });
        }
      }
      continue;
    }

    if (!keep.has(relative)) {
      fs.rmSync(path.join(runtimesDir, relative), {
        recursive: true,
        force: true,
      });
    }
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
