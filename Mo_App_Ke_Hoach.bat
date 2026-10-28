@echo off
chcp 65001 > nul
title UNG DUNG QUAN LY KE HOACH
color 0b

echo =====================================================================
echo       HE THONG QUAN LY KE HOACH VA NGAN SACH (CTIA)
echo =====================================================================
echo.

set "NODE_EXE=C:\Users\Admin\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe"
set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

:: 1. Kiem tra xem may chu port 3000 da chay chua
netstat -ano | findstr ":3000" | findstr "LISTENING" > nul
if %errorlevel% equ 0 (
    echo [*] May chu dang chay san sang tai cong 3000.
) else (
    echo [*] Dang khoi dong may chu Web App...
    start /min "Vite Server" "%NODE_EXE%" "%PROJECT_DIR%\node_modules\vite\bin\vite.js" --host --port 3000
    ping 127.0.0.1 -n 3 > nul
)

:: 2. Lay dia chi IP Wi-Fi / LAN
set "LAN_IP=192.168.68.121"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "ipv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        echo %%b | findstr "192.168." > nul
        if not errorlevel 1 set "LAN_IP=%%b"
    )
)

echo.
echo =====================================================================
echo   CAC DIA CHI TRUY CAP UNG DUNG:
echo.
echo   [1] Tren may tinh nay (Localhost):
echo       -^> http://localhost:3000
echo.
echo   [2] Tren Dien thoai / iPad / May khac (Cung mang Wi-Fi):
echo       -^> http://%LAN_IP%:3000
echo =====================================================================
echo.

:: 3. Tu dong mo trinh duyet tren may tinh nay
echo [*] Dang mo trinh duyet Web App...
start http://localhost:3000

echo.
echo Ban co the thu nho hoac dong cua so nay.
ping 127.0.0.1 -n 6 > nul
exit
