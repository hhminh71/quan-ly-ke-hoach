@echo off
chcp 65001 > nul
set "PYTHONIOENCODING=utf-8"
title DONG BO DU LIEU BRAVO DAILY VAO APP
color 0a

echo =====================================================================
echo    CAP NHAT DU LIEU EXCEL BRAVO DAILY VAO WEB APP & GOOGLE SHEET
echo =====================================================================
echo.

set "PY_EXE="
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PY_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
) else if exist "C:\Users\Admin\AppData\Local\Programs\Python\Python312\python.exe" (
    set "PY_EXE=C:\Users\Admin\AppData\Local\Programs\Python\Python312\python.exe"
) else (
    set "PY_EXE=python"
)

set "SCRIPT_PATH=%~dp0scripts\sync_bravo_to_sheets.py"
if not exist "%SCRIPT_PATH%" (
    set "SCRIPT_PATH=I:\My Drive\APP\Projects\quan-ly-ke-hoach\scripts\sync_bravo_to_sheets.py"
)

"%PY_EXE%" "%SCRIPT_PATH%"

pause > nul
