# Coffee With Bro — PowerShell Development Launcher
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not found in PATH. Please install Node.js."
    exit 1
}

node "$PSScriptRoot\scripts\start-both.js"
