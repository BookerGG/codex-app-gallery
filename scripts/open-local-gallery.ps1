[CmdletBinding()]
param(
  [int] $Port = 30730,
  [switch] $SkipSync
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Find-Tool {
  param(
    [string] $Preferred,
    [string] $CommandName
  )

  if ($Preferred -and (Test-Path -LiteralPath $Preferred)) {
    return $Preferred
  }

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  throw "Could not find $CommandName. Install it or use the Codex bundled runtime."
}

function Set-ProcessPath {
  param([string[]] $Prepend)

  $envVars = [Environment]::GetEnvironmentVariables("Process")
  $pathValues = @()
  foreach ($key in @($envVars.Keys)) {
    if ([string]::Equals([string] $key, "Path", [StringComparison]::OrdinalIgnoreCase)) {
      $pathValues += [string] $envVars[$key]
      [Environment]::SetEnvironmentVariable([string] $key, $null, "Process")
    }
  }

  $basePath = $pathValues | Where-Object { $_ } | Select-Object -First 1
  $prefix = $Prepend | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
  $nextPathParts = @()
  $nextPathParts += $prefix
  if ($basePath) {
    $nextPathParts += $basePath
  }
  [Environment]::SetEnvironmentVariable("Path", ($nextPathParts -join ";"), "Process")
}

$runtimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies"
$nodeBin = Join-Path $runtimeRoot "node\bin"
$fallbackBin = Join-Path $runtimeRoot "bin\fallback"
$gitMingwBin = Join-Path $runtimeRoot "native\git\mingw64\bin"
$gitCmdBin = Join-Path $runtimeRoot "native\git\cmd"
Set-ProcessPath @($nodeBin, $fallbackBin, $gitMingwBin, $gitCmdBin)
$env:GIT_EXEC_PATH = $gitMingwBin
$env:GIT_SSL_BACKEND = "openssl"

$pnpm = Find-Tool (Join-Path $fallbackBin "pnpm.cmd") "pnpm"

Push-Location $projectRoot
try {
  Write-Host ""
  Write-Host "Codex App Gallery local server"
  Write-Host "URL: http://127.0.0.1:$Port/"
  Write-Host ""

  if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
    Write-Host "Installing dependencies..."
    & $pnpm install
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm install failed with exit code $LASTEXITCODE."
    }
  }

  if (-not $SkipSync) {
    Write-Host "Syncing Codex apps..."
    & $pnpm run sync:apps
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm run sync:apps failed with exit code $LASTEXITCODE."
    }
  }

  Write-Host ""
  Write-Host "Starting server. Close this window to stop the local gallery."
  & $pnpm run dev -- --port $Port --hostname 127.0.0.1
  if ($LASTEXITCODE -ne 0) {
    throw "Local gallery server exited with code $LASTEXITCODE."
  }
} catch {
  Write-Host ""
  Write-Host "Could not open the local gallery:"
  Write-Host $_.Exception.Message
  Write-Host ""
  Read-Host "Press Enter to close"
  exit 1
} finally {
  Pop-Location
}
