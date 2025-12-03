Param(
  [switch]$BackendOnly = $false,
  [switch]$FrontendOnly = $false,
  [int]$FrontendPort = 3000
)

$ErrorActionPreference = "Stop"

# Resolve project root (this script lives in scripts/)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $root) { $root = (Get-Location).Path }
$projectRoot = Split-Path -Parent $root

Write-Host "Project root: $projectRoot"

function Ensure-Backend {
  $venvPy = Join-Path $projectRoot "backend\.venv\Scripts\python.exe"
  if (-not (Test-Path $venvPy)) {
    Write-Host "Creating Python venv in backend\.venv ..."
    & python -m venv (Join-Path $projectRoot "backend\.venv")
  }
  $venvPip = Join-Path $projectRoot "backend\.venv\Scripts\pip.exe"
  $installedFlag = Join-Path $projectRoot "backend\.venv\installed.flag"
  if (-not (Test-Path $installedFlag)) {
    Write-Host "Installing backend requirements ..."
    & $venvPip install --upgrade pip
    & $venvPip install -r (Join-Path $projectRoot "backend\requirements.txt")
    New-Item -ItemType File -Force -Path $installedFlag | Out-Null
  }
}

function Start-Backend {
  $venvPy = Join-Path $projectRoot "backend\.venv\Scripts\python.exe"
  $backendCmd = "$venvPy -m uvicorn backend.main:app --reload --port 8000"
  Write-Host "Starting backend: $backendCmd"
  Start-Process -FilePath "pwsh" -WorkingDirectory $projectRoot -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd `"$projectRoot`"; $backendCmd"
  )
}

function Ensure-Frontend {
  $nodeModules = Join-Path $projectRoot "node_modules"
  if (-not (Test-Path $nodeModules)) {
    Write-Host "Installing frontend dependencies (npm install) ..."
    Push-Location $projectRoot
    try {
      & npm install
    } finally {
      Pop-Location
    }
  }
}

function Start-Frontend([int]$Port) {
  Write-Host "Starting frontend vite dev server on port $Port ..."
  Start-Process -FilePath "pwsh" -WorkingDirectory $projectRoot -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd `"$projectRoot`"; npm run dev -- --port $Port"
  )
}

# Execution flow
if (-not $FrontendOnly) {
  Ensure-Backend
}

if (-not $BackendOnly) {
  Ensure-Frontend
}

if ($BackendOnly -and -not $FrontendOnly) {
  Start-Backend
} elseif ($FrontendOnly -and -not $BackendOnly) {
  Start-Frontend -Port $FrontendPort
} else {
  Start-Backend
  Start-Frontend -Port $FrontendPort
}

Write-Host ""
Write-Host "Backend: http://localhost:8000/api/v1/health"
Write-Host "Frontend: http://localhost:$FrontendPort/"
Write-Host "Tip: If frontend auto-switched ports, check the Vite output window."
