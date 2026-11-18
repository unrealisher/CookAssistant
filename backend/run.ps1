$backendDirectory = $PSScriptRoot
$repositoryDirectory = Split-Path -Parent $backendDirectory

$pythonCandidates = @(
    (Join-Path $backendDirectory ".venv\Scripts\python.exe")
    (Join-Path $repositoryDirectory ".venv\Scripts\python.exe")
)
$pythonPath = $pythonCandidates |
    Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
    Select-Object -First 1

if (-not $pythonPath) {
    Write-Error "Python environment not found. Create backend\.venv and install dependencies as described in README.md."
    exit 1
}

Push-Location $backendDirectory
try {
    & $pythonPath -m uvicorn app.main:app --host 0.0.0.0 --port 8000
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
