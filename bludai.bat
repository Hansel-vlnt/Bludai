@echo off
setlocal
set "ROOT_DIR=%~dp0"
set "PYTHON_EXE=%ROOT_DIR%backend\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=python"

if "%~1"=="" goto run_start
if "%~1"=="start" goto run_start
if "%~1"=="cli" goto run_cli

echo Perintah tidak dikenali: %~1
echo Gunakan: .\bludai start (untuk Web UI/launcher)
echo          .\bludai cli   (untuk Terminal CLI)
exit /b 1

:run_start
"%PYTHON_EXE%" "%ROOT_DIR%backend\launcher.py"
exit /b %ERRORLEVEL%

:run_cli
"%PYTHON_EXE%" -m bludai.cli cli
exit /b %ERRORLEVEL%
