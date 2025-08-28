# Release Process

## Current Version: 0.0.22

## Overview

This document outlines the step-by-step process for creating a new release of Voice Gecko.

For details on the desktop updater and forced update policy, see `docs/UPDATER.md`.

## 🚀 Quick Release (Automated)

For a fully guided release process:

```bash
pnpm release
```

This interactive script will:

- Help you choose the version number
- Run pre-release validation
- Update all version files
- Commit changes and push to release branch

## 📋 Manual Release Process

## Pre-Release Checklist

### 1. Version Updates Required

Before creating a release, the following files must be updated with the new version number:

- [ ] `apps/desktop/package.json` (line 4)
- [ ] `apps/desktop/src-tauri/Cargo.toml` (line 3)
- [ ] `apps/desktop/src-tauri/tauri.conf.json` (line 3)
- [ ] `apps/web/package.json` (line 3) - **Note**: Currently synced at 0.0.8

### 2. Automated Version Update (Recommended)

```bash
# Check current version status
pnpm version:check

# Run pre-release validation
pnpm pre-release

# Interactive version bump (prompts for version choice)
pnpm version:bump

# Verify the update
pnpm version:check
```

**Or specify version directly:**

```bash
pnpm version:bump 0.0.8
```

### 2.5. Forced Update (Only if Breaking)

If this release includes breaking changes that require all users to update:

1. Publish desktop artifacts (GitHub Release) first.
2. Set `MIN_SUPPORTED_DESKTOP_VERSION` in the web environment to the new desktop version.
3. Deploy the web app. Older clients will receive HTTP 426 and auto-update on next API call.

To rollback a forced update, lower `MIN_SUPPORTED_DESKTOP_VERSION` and redeploy the web app.

### 3. Manual Version Update (Legacy)

If you prefer manual updates:

1. **Choose the new version number** (following semantic versioning):
   - Patch: `0.0.8` (bug fixes)
   - Minor: `0.1.0` (new features, backwards compatible)
   - Major: `1.0.0` (breaking changes)

2. **Update version in all files**:

   ```bash
   # Desktop app package.json
   # Change line 4: "version": "0.0.22" → "version": "0.0.22"

   # Tauri Cargo.toml
   # Change line 3: version = "0.0.22" → version = "0.0.22"

   # Tauri config
   # Change line 3: "version": "0.0.22" → "version": "0.0.22"

   # Web app package.json (sync with desktop)
   # Change line 3: "version": "0.0.22" → "version": "0.0.22"
   ```

3. **Verify all changes**:
   ```bash
   pnpm version:check
   ```

## GitHub Actions Release Process

### Self-Hosted Runner Setup

The release process uses a self-hosted GitHub Actions runner.

1. **Navigate to runner directory**:

   ```bash
   # TODO: Add the actual path to your runner directory
   cd path/to/github-actions-runner
   ```

2. **Start the runner** (if not already running):
   ```bash
   # TODO: Add the specific command you use to start the runner
   ./run.sh  # or ./run.cmd on Windows
   ```

### Trigger Release

1. **Commit version changes**:

   ```bash
   git add .
   git commit -m "chore: bump version to 0.0.8"
   ```

2. **Push to release branch**:

   ```bash
   git checkout release
   git merge main  # or merge your current branch
   git push origin release
   ```

3. **Monitor the workflow**:
   - Go to GitHub Actions tab
   - Watch the "publish" workflow execution
   - The workflow will build for the self-hosted platform

## Post-Release Tasks

- [ ] Verify the release was created on GitHub
- [ ] Test the installer/updater
- [ ] If breaking, confirm `MIN_SUPPORTED_DESKTOP_VERSION` is set correctly
- [ ] Update any deployment documentation if needed
- [ ] Announce the release (if applicable)

## Notes

- The GitHub workflow is configured in `.github/workflows/publish.yaml`
- Currently only builds for self-hosted platform
- Other platforms (macOS, Ubuntu, Windows) are commented out
- The workflow creates updater artifacts automatically

## Troubleshooting

### Common Issues

- **Version mismatch**: Ensure all 4 files have the same version
- **Runner not available**: Check if self-hosted runner is online
- **Build fails**: Check GitHub Actions logs for specific errors

### Quick Commands

```bash
# 🔍 Check version consistency
pnpm version:check

# 🚀 Full interactive release process
pnpm release

# 📦 Interactive version bump
pnpm version:bump

# ✅ Pre-release validation
pnpm pre-release

# 🔍 Find all version references (manual)
grep -r "0\.0\.7" . --exclude-dir=node_modules --exclude-dir=target --exclude=Cargo.lock
```

## 🛠️ Available Scripts

| Script             | Command              | Description                                          |
| ------------------ | -------------------- | ---------------------------------------------------- |
| **Version Check**  | `pnpm version:check` | Verify all files have consistent versions            |
| **Version Bump**   | `pnpm version:bump`  | Interactive version selection and update all 4 files |
| **Pre-release**    | `pnpm pre-release`   | Run linting, type checking, and build validation     |
| **Release Helper** | `pnpm release`       | Interactive guided release process                   |
