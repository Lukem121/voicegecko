param(
  [Parameter(Mandatory = $true)]
  [string]$TargetDir
)

if (-not $env:SENTRY_AUTH_TOKEN -or -not $env:SENTRY_ORG -or -not $env:SENTRY_PROJECT) {
  Write-Error "Sentry env vars missing: ensure SENTRY_AUTH_TOKEN (secret), SENTRY_ORG (var), and SENTRY_PROJECT (var) are set"
  exit 1
}

$sentryCliDir = "$env:LOCALAPPDATA\voicegecko-ci\sentry-cli"
$sentryCli = "$sentryCliDir\sentry-cli.exe"

if (-not (Test-Path $sentryCli)) {
  New-Item -ItemType Directory -Force -Path $sentryCliDir | Out-Null
  Invoke-WebRequest -Uri "https://github.com/getsentry/sentry-cli/releases/latest/download/sentry-cli-Windows-x86_64.exe" -OutFile $sentryCli
}

& $sentryCli --version

if (-not (Test-Path $TargetDir)) {
  Write-Error "Sentry target directory not found: $TargetDir"
  exit 1
}

& $sentryCli upload-dif --include-sources --wait $TargetDir
