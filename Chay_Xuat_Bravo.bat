@echo off
chcp 65001 > nul
title TU DONG XUAT BRAVO 10 - CTIA
color 0b

echo =====================================================================
echo    HE THONG TU DONG XUAT BAO CAO BRAVO 10 VAO GOOGLE DRIVE - CTIA
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

set "SCRIPT_PATH=%~dp0scripts\auto_export_bravo.py"
if not exist "%SCRIPT_PATH%" (
    set "SCRIPT_PATH=%~dp0auto_export_bravo.py"
)
if not exist "%SCRIPT_PATH%" (
    set "SCRIPT_PATH=I:\My Drive\APP\Projects\quan-ly-ke-hoach\scripts\auto_export_bravo.py"
)

echo [*] Python: %PY_EXE%
echo [*] Script: %SCRIPT_PATH%
echo.

"%PY_EXE%" "%SCRIPT_PATH%"

echo.
echo =====================================================================
echo  NHAN PHIM BAT KY DE THOAT...
echo =====================================================================
pause > nul
