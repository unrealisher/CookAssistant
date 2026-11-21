[CmdletBinding()]
param(
    [string]$ListenAddress = "0.0.0.0",
    [ValidateRange(1, 65535)]
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$repositoryDirectory = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendDirectory = Join-Path $repositoryDirectory "backend"
$venvPython = Join-Path $backendDirectory ".venv\Scripts\python.exe"
$frontendIndex = Join-Path $repositoryDirectory "frontend\dist\index.html"

if (-not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
    throw "Python environment not found. Run scripts/build.ps1 first."
}
if (-not (Test-Path -LiteralPath $frontendIndex -PathType Leaf)) {
    throw "Production frontend was not found. Run scripts/build.ps1 first."
}

Write-Host "Starting CookAssistant on ${ListenAddress}:$Port. Press Ctrl+C to stop."
Write-Host "For phone access, open http://<this-computer's-home-Wi-Fi-IP>:$Port on the same private Wi-Fi network."
Write-Host "Do not publish this port or add an internet-facing port forward."

Push-Location $backendDirectory
try {
    & $venvPython -m uvicorn app.main:app --host $ListenAddress --port $Port
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1073741510) {
        throw "CookAssistant server stopped with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
