[CmdletBinding()]
param(
  [ValidateSet("Weekly", "Minutes")]
  [string] $Frequency = "Weekly",
  [int] $EveryMinutes = 15,
  [string] $TaskName = "Codex App Gallery Credit-Free Auto Update"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($EveryMinutes -lt 5) {
  throw "Use an interval of at least 5 minutes."
}

if (
  $PSBoundParameters.ContainsKey("EveryMinutes") -and
  -not $PSBoundParameters.ContainsKey("Frequency")
) {
  Write-Warning "-EveryMinutes is ignored unless -Frequency Minutes is set. Installing a weekly schedule."
}

$runner = Resolve-Path (Join-Path $PSScriptRoot "sync-and-push-gallery.ps1")
$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
$argument = '-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $runner

$action = New-ScheduledTaskAction -Execute $powershell -Argument $argument
$scheduleDescription = ""
if ($Frequency -eq "Minutes") {
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
    -RepetitionDuration (New-TimeSpan -Days 3650)
  $scheduleDescription = "every $EveryMinutes minutes"
} else {
  $startAt = (Get-Date).AddMinutes(1)
  $trigger = New-ScheduledTaskTrigger -Weekly `
    -WeeksInterval 1 `
    -DaysOfWeek ($startAt.DayOfWeek) `
    -At $startAt
  $scheduleDescription = "weekly on $($startAt.DayOfWeek) at $($startAt.ToString('HH:mm'))"
}
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

Write-Host "Installed scheduled task '$TaskName' to run $scheduleDescription."
Write-Host "Logs will be written to work\credit-free-auto-update.log."
