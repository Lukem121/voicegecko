// Desktop client policy, tracked in Git
// Update these via PRs to keep a clear audit trail.

export const DESKTOP_POLICY = {
  // Minimal required desktop client version. Clients below this should be forced to upgrade.
  MIN_SUPPORTED_DESKTOP_VERSION: '2.0.0',

  // Optional: version we recommend upgrading to, shown in UI if you want.
  RECOMMENDED_DESKTOP_VERSION: undefined as string | undefined,
} as const;

export function resolveMinSupportedVersion(
  envOverride?: string | null
): string {
  return envOverride && envOverride.length > 0
    ? envOverride
    : DESKTOP_POLICY.MIN_SUPPORTED_DESKTOP_VERSION;
}
