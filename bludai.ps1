[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [string]$Command = "start"
)

$RootDir = $PSScriptRoot
$PythonExe = Join-Path $RootDir "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
}

$Launcher = Join-Path $RootDir "backend\launcher.py"

if ($Command -eq "start") {
    & $PythonExe $Launcher
} elseif ($Command -eq "cli") {
    & $PythonExe -m bludai.cli cli
} else {
    Write-Host "Perintah tidak dikenali: $Command" -ForegroundColor Red
    Write-Host "Gunakan: .\bludai start  (untuk membuka launcher/Web UI)" -ForegroundColor Cyan
    Write-Host "         .\bludai cli    (untuk membuka CLI terminal)" -ForegroundColor Cyan
}
