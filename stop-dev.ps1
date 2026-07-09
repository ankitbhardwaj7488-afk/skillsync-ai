$ErrorActionPreference = "SilentlyContinue"

function Stop-Port {
  param([int]$Port)
  $rows = netstat -ano | Select-String ":$Port\s"
  foreach ($row in $rows) {
    $parts = ($row.Line -split "\s+") | Where-Object { $_ }
    if ($parts.Length -ge 5 -and $parts[3] -eq "LISTENING") {
      $processId = [int]$parts[4]
      if ($processId -gt 0) {
        taskkill /PID $processId /F /T *> $null 2>&1
      }
    }
  }
}

Stop-Port 8000
Stop-Port 5173
Write-Host "Stopped SkillSync dev servers on ports 8000 and 5173."
