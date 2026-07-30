[CmdletBinding()]
param(
  [int] $EveryMinutes = 15,
  [string] $TaskName = "Codex App Gallery Credit-Free Auto Update"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($EveryMinutes -lt 5) {
  throw "Use an interval of at least 5 minutes."
}

$runner = Resolve-Path (Join-Path $PSScriptRoot "sync-and-push-gallery.ps1")
$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
$argument = '-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $runner

$action = New-ScheduledTaskAction -Execute $powershell -Argument $argument
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration ([TimeSpan]::MaxValue)
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Syncs Codex App Gallery source apps and pushes to GitHub Pages without using Codex scheduled-task credits." `
  -Force | Out-Null

Write-Host "Installed scheduled task '$TaskName' to run every $EveryMinutes minutes."
Write-Host "Logs will be written to work\credit-free-auto-update.log."
