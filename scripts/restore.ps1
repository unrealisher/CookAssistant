param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath
)

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

if (-not (Test-Path -LiteralPath $BackupPath -PathType Leaf)) {
    throw "Backup file not found: $BackupPath"
}

$resolvedBackupPath = (Resolve-Path -LiteralPath $BackupPath).Path
Push-Location $backendDirectory
try {
    & $pythonPath -m app.backup restore $resolvedBackupPath
    if ($LASTEXITCODE -ne 0) {
        throw "Database restore failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
