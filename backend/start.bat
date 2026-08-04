@echo off
echo Mengaktifkan Virtual Environment...
call .venv\Scripts\activate.bat
python -m bludai.cli
pause
