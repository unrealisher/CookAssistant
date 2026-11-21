[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repositoryDirectory = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backupScript = Join-Path $PSScriptRoot "backup.ps1"
$buildScript = Join-Path $PSScriptRoot "build.ps1"
$startScript = Join-Path $PSScriptRoot "start.ps1"

$branch = (& git -C $repositoryDirectory branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "Could not determine the current Git branch."
}
if ($branch -ne "master") {
    throw "Update is allowed only from master; current branch is '$branch'."
}

$workingTree = @(& git -C $repositoryDirectory status --porcelain)
if ($LASTEXITCODE -ne 0) {
    throw "Could not inspect the Git working tree."
}
if ($workingTree.Count -gt 0) {
    throw "The working tree has local changes. Commit or move them before updating."
}

if (-not (Test-Path -LiteralPath $backupScript -PathType Leaf)) {
    throw "Database backup script was not found at scripts/backup.ps1. Update was cancelled."
}

Write-Host "Creating a database backup before updating code or applying migrations."
& $backupScript
if (-not $?) {
    throw "Database backup failed. Update was cancelled."
}

& git -C $repositoryDirectory pull --ff-only origin master
if ($LASTEXITCODE -ne 0) {
    throw "Could not fast-forward master from origin/master."
}

& $buildScript
if (-not $?) {
    throw "Build failed after updating the source. The server was not started."
}

& $startScript
if (-not $?) {
    throw "CookAssistant did not start successfully."
}
