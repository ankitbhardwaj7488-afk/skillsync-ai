$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$BackendLog = Join-Path $Root "backend-server.log"
$FrontendLog = Join-Path $Root "frontend-server.log"

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

Set-Location $Root

if (!(Test-Path (Join-Path $Backend ".env"))) {
  Copy-Item (Join-Path $Backend ".env.example") (Join-Path $Backend ".env")
  Write-Host "Created backend\.env from backend\.env.example. Add OAuth secrets before social login."
}

if (!(Test-Path (Join-Path $Frontend ".env"))) {
  "VITE_API_URL=http://localhost:8000/api/v1" | Set-Content (Join-Path $Frontend ".env")
}

Stop-Port 8000
Stop-Port 5173
Remove-Item $BackendLog, $FrontendLog -ErrorAction SilentlyContinue

python -m alembic -c backend/alembic.ini upgrade head

$backendCommand = "cd /d `"$Backend`" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > `"$BackendLog`" 2>&1"
$frontendCommand = "cd /d `"$Frontend`" && npm run dev -- --host localhost --port 5173 > `"$FrontendLog`" 2>&1"

Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $backendCommand -WindowStyle Hidden
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $frontendCommand -WindowStyle Hidden

Start-Sleep -Seconds 4

$backendReady = $false
$frontendReady = $false
try {
  $backendReady = (Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200
} catch {}
try {
  $frontendReady = (Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200
} catch {}

Write-Host ""
Write-Host "SkillSync dev servers"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:8000"
Write-Host "Docs:     http://localhost:8000/docs"
Write-Host "Health:   http://localhost:8000/health"
Write-Host ""
Write-Host "Backend log:  $BackendLog"
Write-Host "Frontend log: $FrontendLog"
Write-Host ""

if (!$backendReady -or !$frontendReady) {
  Write-Host "One or more servers did not become ready yet. Wait a few seconds or check the log files above."
  exit 1
}
