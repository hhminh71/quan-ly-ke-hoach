@echo off
chcp 65001 > nul
title MO UNG DUNG QUAN LY KE HOACH - LOCALHOST
color 0b

echo =====================================================================
echo       DANG MO UNG DUNG QUAN LY KE HOACH VA NGAN SACH (CTIA)
echo =====================================================================
echo.

set "NODE_EXE=C:\Users\Admin\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe"
set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

:: 1. Kiem tra xem may chu Localhost:3000 da chay chua
netstat -ano | findstr ":3000" | findstr "LISTENING" > nul
if %errorlevel% equ 0 (
    echo [*] May chu Localhost da dang chay san tai port 3000.
) else (
    echo [*] Dang khoi dong may chu Localhost (Vite)...
    start /min "Vite Server" "%NODE_EXE%" "%PROJECT_DIR%\node_modules\vite\bin\vite.js" --host --port 3000
    timeout /t 2 /nobreak > nul
)

:: 2. Mo trinh duyet
echo [*] Dang mo trinh duyet toi dia chi: http://localhost:3000
start http://localhost:3000

echo.
echo =====================================================================
echo  UNG DUNG DA DUOC MO TRANH DUYET! BAN CO THE DONG CUA SO NAY.
echo =====================================================================
timeout /t 3 > nul
exit
