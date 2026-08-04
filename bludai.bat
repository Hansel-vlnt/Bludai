@echo off
if not "%~1"=="start" goto usage

cd backend
call .venv\Scripts\activate.bat
cd ..
python backend\launcher.py

exit /b 0

:usage
echo Perintah tidak dikenali.
echo Silakan gunakan perintah: .\bludai start
exit /b 1
