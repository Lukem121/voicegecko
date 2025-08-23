# Desktop Updater and Forced Update Policy

## Overview

- Single channel (stable). No rollout percentages.
- Optional updates:
  - Checked on app launch and every 12 hours while the app is running.
  - No background download; download+install only when the user initiates it from the UI.
- Forced updates (breaking changes):
  - The web API responds with HTTP 426 when the client is below `MIN_SUPPORTED_DESKTOP_VERSION`.
  - The desktop app immediately downloads, installs, and relaunches.

## Components (where things live)

- Desktop
  - `apps/desktop/src/lib/app-lifecycle.ts`
    - `checkForUpdatesOnce()`: one-time check at launch; does not auto-install.
    - `schedulePeriodicChecks(intervalMs)`: schedules periodic checks (we use 12h).
    - `forceUpdateNow()`: downloads + installs and relaunches (used on 426).
  - `apps/desktop/src/trpc.tsx`
    - Adds `x-client-version` on each request.
    - On HTTP 426, calls `appLifecycle.forceUpdateNow()`.
  - `apps/desktop/src-tauri/src/modules/updater.rs`
    - Configures the Tauri updater endpoint (localhost in debug, production in release).
- Web
  - `apps/web/src/app/api/trpc/[trpc]/route.ts`
    - Enforces minimum version: if `x-client-version` < `MIN_SUPPORTED_DESKTOP_VERSION`, returns 426.
  - `apps/web/src/app/api/updater/[target]/[version]/route.ts`
    - Builds the Tauri updater JSON from GitHub Releases and serves platform assets.

## Update flows

### Optional update (non-breaking)

1. Desktop checks at launch via `checkForUpdatesOnce()` and again every 12 hours via `schedulePeriodicChecks(...)`.
2. If an update is available, the app continues startup; UI can surface an unobtrusive prompt/toast and a Settings row with an Install button.
3. When the user clicks Install, the app downloads, installs, and relaunches.

Notes:

- We intentionally do not background-download updates in the MVP.

### Forced update (breaking)

1. Web sets `MIN_SUPPORTED_DESKTOP_VERSION` to the minimum acceptable SemVer.
2. Desktop sends `x-client-version` to TRPC; the server replies with 426 if outdated.
3. Desktop immediately calls `forceUpdateNow()` to download, install, and relaunch.

## SemVer

- Desktop versions follow SemVer (MAJOR.MINOR.PATCH).
- `MIN_SUPPORTED_DESKTOP_VERSION` must be a SemVer string (e.g., `0.0.18`).

## Release playbook

### Non‑breaking release

- Build and publish desktop artifacts (GitHub Release) as usual.
- Deploy the web app (no change to `MIN_SUPPORTED_DESKTOP_VERSION`).
- Users see an update available on next launch or within 12 hours.

### Breaking release (force update)

- Build and publish desktop artifacts.
- Set `MIN_SUPPORTED_DESKTOP_VERSION` to the new desktop version in the web environment.
- Deploy the web app. Older clients will receive 426 and auto-update on their next API call.

### Rollback forced update

- Lower `MIN_SUPPORTED_DESKTOP_VERSION` to an earlier version and redeploy the web app.

## Local testing

- Optional update: publish a GitHub Release and run the desktop; it should detect availability.
- Forced update: set `MIN_SUPPORTED_DESKTOP_VERSION` above the desktop’s current version locally and hit any TRPC endpoint; desktop should auto-update.

## Troubleshooting

- No update found: verify GitHub Release contains the correct platform artifacts (with signatures if required) and that the updater endpoint is reachable.
- Not receiving 426: ensure desktop sends `x-client-version`, and the env `MIN_SUPPORTED_DESKTOP_VERSION` is set to a higher value than the client.
- Update loops: confirm the new version installs successfully and the version number increments.

