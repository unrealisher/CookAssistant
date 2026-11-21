[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repositoryDirectory = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$frontendDirectory = Join-Path $repositoryDirectory "frontend"
$backendDirectory = Join-Path $repositoryDirectory "backend"
$venvPython = Join-Path $backendDirectory ".venv\Scripts\python.exe"

function Assert-Command {
    param([Parameter(Mandatory)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found. Install the project prerequisites from README.md."
    }
}

Assert-Command "node"
Assert-Command "pnpm"

$nodeVersion = (& node --version 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch "^v?(?<major>\d+)") {
    throw "Could not determine the installed Node.js version."
}
if ([int]$Matches.major -lt 24) {
    throw "Node.js 24 or newer is required; found $nodeVersion."
}

$pnpmVersion = (& pnpm --version 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $pnpmVersion -notmatch "^(?<major>\d+)") {
    throw "Could not determine the installed pnpm version."
}
if ([int]$Matches.major -lt 11) {
    throw "pnpm 11 or newer is required; found $pnpmVersion."
}

if (-not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
    Assert-Command "py"
    & py -3.12 -m venv (Join-Path $backendDirectory ".venv")
    if ($LASTEXITCODE -ne 0) {
        throw "Could not create backend/.venv with Python 3.12."
    }
}

$pythonVersion = (& $venvPython --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $pythonVersion -notmatch "Python (?<major>\d+)\.(?<minor>\d+)") {
    throw "Could not determine the backend Python version."
}
if ([int]$Matches.major -lt 3 -or ([int]$Matches.major -eq 3 -and [int]$Matches.minor -lt 12)) {
    throw "Python 3.12 or newer is required; found $pythonVersion."
}

& $venvPython -m pip install -e $backendDirectory
if ($LASTEXITCODE -ne 0) {
    throw "Could not install backend dependencies."
}

Push-Location $frontendDirectory
try {
    & pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
        throw "Could not install frontend dependencies."
    }

    & pnpm build
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed."
    }
}
finally {
    Pop-Location
}

Write-Host "CookAssistant is built. Start it with scripts/start.ps1."
