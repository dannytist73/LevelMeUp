# M15: the daily studio's Windows scheduled task (plan 2026-10-20-m15-daily-studio.md). Runs `npm run studio -- run`
# once a day while Danny is signed in to Windows; a start missed while the PC was off or asleep runs as soon as it is
# back. Needs the owner's yes (it is a standing task on his PC). Remove it with: .\schedule.ps1 -Remove
param(
  [string]$At = '9:00AM',
  [switch]$Remove
)
$name = 'LevelMeUp daily studio'
if ($Remove) {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false
  Write-Output "Removed the task '$name'."
  return
}
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$node = (Get-Command node).Source
$action = New-ScheduledTaskAction -Execute $node -Argument "`"$repo\scripts\studio\run.ts`" run" -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Daily -At $At
# A missed start runs when the PC is back; it may run on battery; three hours at most (research, writing, pictures).
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 3) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
  -Description 'LevelMeUp: research, write and draw the day''s article on this PC (npm run studio -- run). Log: %USERPROFILE%\.levelmeup\studio\studio.log' -Force | Out-Null
Write-Output "Scheduled '$name' daily at $At (from $repo)."
