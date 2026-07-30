[CmdletBinding()]
param(
  [string] $RemoteName = "github",
  [string] $RemoteUrl = "https://github.com/BookerGG/codex-app-gallery.git",
  [string] $Branch = "main",
  [switch] $InitialForcePush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$logPath = Join-Path $projectRoot "work\credit-free-auto-update.log"
New-Item -ItemType Directory -Path (Split-Path $logPath -Parent) -Force | Out-Null

function Write-Log {
  param([string] $Message)
  $line = "{0} {1}" -f (Get-Date -Format o), $Message
  Add-Content -LiteralPath $logPath -Value $line
  Write-Host $line
}

function Find-Tool {
  param(
    [string] $Preferred,
    [string] $CommandName
  )

  if (Test-Path -LiteralPath $Preferred) {
    return $Preferred
  }

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  throw "Could not find $CommandName. Install it or update this script's bundled path."
}

$runtimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies"
$localGhBin = Join-Path $projectRoot "work\tools\gh\bin"
$nodeBin = Join-Path $runtimeRoot "node\bin"
$fallbackBin = Join-Path $runtimeRoot "bin\fallback"
$gitMingwBin = Join-Path $runtimeRoot "native\git\mingw64\bin"
$gitCmdBin = Join-Path $runtimeRoot "native\git\cmd"
$env:PATH = @($localGhBin, $nodeBin, $fallbackBin, $gitMingwBin, $gitCmdBin, $env:PATH) -join ";"
$env:GIT_EXEC_PATH = $gitMingwBin
$env:GIT_SSL_BACKEND = "openssl"

$pnpm = Find-Tool (Join-Path $fallbackBin "pnpm.cmd") "pnpm"
$git = Find-Tool (Join-Path $gitCmdBin "git.exe") "git"
$gitCommonArgs = @("-c", "http.sslBackend=openssl", "--git-dir=work\deploy-source.git", "--work-tree=.")

function Get-GitAuthArgs {
  $gh = Get-Command "gh" -ErrorAction SilentlyContinue
  if (-not $gh) {
    return @()
  }

  $token = (& $gh.Source auth token 2>$null).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $token) {
    return @()
  }

  $basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$token"))
  return @("-c", "http.extraHeader=Authorization: Basic $basic")
}

function Invoke-ProjectGit {
  & $git @gitCommonArgs @args
  if ($LASTEXITCODE -ne 0) {
    throw "git $args failed with exit code $LASTEXITCODE"
  }
}

Push-Location $projectRoot
try {
  Write-Log "Starting credit-free gallery sync."

  & $pnpm run sync:apps
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm run sync:apps failed with exit code $LASTEXITCODE"
  }

  $status = @(Invoke-ProjectGit status --short)
  if ($status.Count -eq 0) {
    if (-not $InitialForcePush) {
      Write-Log "No source changes after sync."
      exit 0
    }

    Write-Log "No source changes after sync; proceeding with initial push of current HEAD."
  } else {
    Write-Log "Detected source changes; running validation."
    & $pnpm test
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm test failed with exit code $LASTEXITCODE"
    }

    Invoke-ProjectGit add -A
    & $git @gitCommonArgs diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
      if (-not $InitialForcePush) {
        Write-Log "No staged changes after validation."
        exit 0
      }

      Write-Log "No staged changes after validation; proceeding with initial push of current HEAD."
    } else {
      Invoke-ProjectGit config user.name "Codex"
      Invoke-ProjectGit config user.email "codex@openai.com"
      Invoke-ProjectGit commit -m "Auto-sync Codex apps"
    }
  }

  $head = (& $git @gitCommonArgs rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "Could not read committed HEAD."
  }

  $remoteNames = @(Invoke-ProjectGit remote)
  if ($remoteNames -contains $RemoteName) {
    Invoke-ProjectGit remote set-url $RemoteName $RemoteUrl
  } else {
    Invoke-ProjectGit remote add $RemoteName $RemoteUrl
  }

  $gitAuthArgs = @(Get-GitAuthArgs)
  if ($gitAuthArgs.Count -gt 0) {
    Write-Log "Using GitHub CLI credentials for git network operations."
  }

  if ($InitialForcePush) {
    Write-Log "Initial force-with-lease push requested."
    & $git @gitAuthArgs @gitCommonArgs fetch $RemoteName $Branch
    if ($LASTEXITCODE -ne 0) {
      throw "Could not fetch $RemoteName/$Branch before force-with-lease push."
    }
    $expected = (& $git @gitCommonArgs rev-parse FETCH_HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $expected) {
      throw "Could not resolve fetched $RemoteName/$Branch."
    }
    & $git @gitAuthArgs @gitCommonArgs push "--force-with-lease=refs/heads/${Branch}:$expected" $RemoteName "${Branch}:${Branch}"
  } else {
    & $git @gitAuthArgs @gitCommonArgs push $RemoteName "${Branch}:${Branch}"
  }

  if ($LASTEXITCODE -ne 0) {
    throw "git push failed with exit code $LASTEXITCODE. Run gh auth login or sign into Git Credential Manager for GitHub."
  }

  Write-Log "Pushed $head to $RemoteName/$Branch. GitHub Pages will deploy without using Codex credits."
} catch {
  Write-Log "FAILED: $($_.Exception.Message)"
  throw
} finally {
  Pop-Location
}
