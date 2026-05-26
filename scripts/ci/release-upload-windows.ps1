param(
  [Parameter(Mandatory = $true)]
  [string]$TagSuffix,

  [Parameter(Mandatory = $true)]
  [string]$ReleaseNameSuffix,

  [Parameter(Mandatory = $true)]
  [string]$ReleaseNotes,

  [Parameter(Mandatory = $true)]
  [string]$BundleDir
)

$VERSION = (Get-Content "apps/desktop/package.json" | ConvertFrom-Json).version
$TAG_NAME = "app-v$VERSION$TagSuffix"
$RELEASE_TITLE = "App v$VERSION$ReleaseNameSuffix"

try {
  gh release create $TAG_NAME --repo "Lukem121/voicegecko-releases" --title $RELEASE_TITLE --notes $ReleaseNotes 2>$null
  Write-Host "Created release: $TAG_NAME"
}
catch {
  Write-Host "Release $TAG_NAME already exists or creation failed - continuing with upload"
}

Write-Host "Looking for artifacts in: $BundleDir"
if (-not (Test-Path $BundleDir)) {
  Write-Error "Bundle directory not found: $BundleDir"
  exit 1
}

$ARTIFACTS = Get-ChildItem -Path $BundleDir -Recurse -File | Where-Object { $_.Extension -in @('.msi', '.exe', '.sig') }
foreach ($artifact in $ARTIFACTS) {
  Write-Host "Uploading artifact: $($artifact.Name)"
  gh release upload $TAG_NAME $artifact.FullName --repo "Lukem121/voicegecko-releases" --clobber
}
