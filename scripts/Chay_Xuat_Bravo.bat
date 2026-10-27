@echo off
chcp 65001 > nul
set "PYTHONIOENCODING=utf-8"
title CTIA - HE THONG DONG BO CHI PHI
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

echo [*] Trinh thuc thi Python : %PY_EXE%
echo [*] Duong dan kich ban    : %SCRIPT_PATH%
echo.

"%PY_EXE%" "%SCRIPT_PATH%" %*

echo.
echo =====================================================================
echo  NHAN PHIM BAT KY DE THOAT...
echo =====================================================================
pause > nul
