$ErrorActionPreference = "Stop"
$repositoryDirectory = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $repositoryDirectory "backend"
$pythonCandidates = @(
    (Join-Path $backendDirectory ".venv\Scripts\python.exe")
    (Join-Path $repositoryDirectory ".venv\Scripts\python.exe")
)
$pythonPath = $pythonCandidates |
    Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
    Select-Object -First 1

if (-not $pythonPath) {
    throw "Python environment not found. Create backend\.venv and install dependencies as described in README.md."
}

Push-Location $backendDirectory
try {
    & $pythonPath -m app.backup verify-migrations
    if ($LASTEXITCODE -ne 0) {
        throw "Migration verification failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
